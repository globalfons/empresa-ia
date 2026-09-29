"""Proveedores de canal intercambiables. Ninguno finge estar conectado:
sin credencial → MOCK (tests) o SinProveedor (el trabajo espera en estado «sin_proveedor»).

- Telegram: Bot API oficial (https://api.telegram.org/bot<token>/sendMessage). Credenciales: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID.
- Email: reutiliza el servicio de notificaciones existente (supabase/functions/notificar, adaptador EMAIL_PROVIDER). Credenciales: NOTIF_URL, NOTIF_CRON_SECRET.
- Redes sociales (X, Instagram, TikTok, YouTube, Facebook): sin API conectada → publicación MANUAL desde el calendario (el contenido queda aprobado y listo para copiar).
- Vídeo: interfaz VideoProvider. Solo existe el MOCK; los adaptadores reales (p. ej. Fal, Runway) se añadirán cuando haya cuenta y se haya verificado su API.
- Ads: interfaz AdsProvider. Sin API: importación manual del gasto (crecimiento/privado/ads_gasto.csv) para calcular el CAC.
- Reddit: NO se publica ni se envían DMs. Solo una cola de oportunidades con borrador para revisión humana.
"""
import json, os, csv, urllib.request, urllib.parse
from . import nucleo as N
from .jobs import SinProveedor

MOCK = os.environ.get("TL_CANALES_MOCK") == "1"   # tests: registra lo que se enviaría sin llamar a nada
ENVIADOS = []  # solo en modo MOCK

# ---------------- Telegram ----------------
class Telegram:
    nombre = "telegram"
    def enviar(self, texto, chat_id=None):
        if MOCK: ENVIADOS.append(("telegram", chat_id, texto)); return {"provider": "mock-telegram", "ok": True}
        token, canal = N.secreto("TELEGRAM_BOT_TOKEN"), chat_id or N.secreto("TELEGRAM_CHANNEL_ID")
        if not token or not canal: raise SinProveedor("telegram", "TELEGRAM_BOT_TOKEN y TELEGRAM_CHANNEL_ID")
        body = urllib.parse.urlencode({"chat_id": canal, "text": texto, "disable_web_page_preview": "false"}).encode()
        r = json.load(urllib.request.urlopen(urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=body), timeout=30))
        if not r.get("ok"): raise RuntimeError("Telegram: " + str(r.get("description", ""))[:200])
        return {"provider": "telegram", "ok": True, "message_id": r["result"]["message_id"]}
    def avisar_seguidores(self, oposicion, texto):
        """Solo a los chats que pidieron seguir esa oposición en el bot (/seguir). Máx. 25 mensajes/s (límite de Telegram: 30)."""
        if MOCK: ENVIADOS.append(("telegram-seguidores", oposicion, texto)); return {"provider": "mock-telegram", "enviados": 0}
        url, key = N.config().get("supabaseUrl"), N.secreto("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key: raise SinProveedor("telegram", "SUPABASE_SERVICE_ROLE_KEY (para leer los suscriptores del bot)")
        req = urllib.request.Request(f"{url}/rest/v1/telegram_suscriptores?activo=eq.true&oposiciones=cs.{{{urllib.parse.quote(oposicion)}}}&select=chat_id",
                                     headers={"apikey": key, "Authorization": "Bearer " + key})
        chats = [x["chat_id"] for x in json.load(urllib.request.urlopen(req, timeout=30))]
        import time
        for i, chat in enumerate(chats):
            self.enviar(texto, chat)
            if i % 25 == 24: time.sleep(1)
        return {"provider": "telegram", "enviados": len(chats)}

# ---------------- Email (servicio de notificaciones existente) ----------------
class Email:
    nombre = "email"
    def llamar(self, cuerpo):
        if MOCK: ENVIADOS.append(("email", None, cuerpo)); return {"provider": "mock-email", "ok": True, "encolados": 0}
        url, sec = N.secreto("NOTIF_URL"), N.secreto("NOTIF_CRON_SECRET")
        if not url or not sec: raise SinProveedor("email", "NOTIF_URL y NOTIF_CRON_SECRET (función notificar desplegada)")
        req = urllib.request.Request(url, data=json.dumps(cuerpo).encode(), headers={"content-type": "application/json", "x-cron-secret": sec})
        r = json.load(urllib.request.urlopen(req, timeout=60))
        return dict(r, provider="notificar")
    def difusion(self, contenido, segmento):
        """Newsletter/aviso segmentado: la función notificar elige destinatarios (consentimiento, preferencias, segmento) y encola."""
        asunto, _, cuerpo = contenido["body"].partition("\n\n")
        return self.llamar({"accion": "difusion", "clave": contenido["id"], "asunto": asunto.replace("Asunto: ", "")[:150], "texto": cuerpo, "segmento": segmento})
    def reactivacion(self, dias):
        return self.llamar({"accion": "reactivacion", "dias": dias})

# ---------------- Redes sociales: publicación manual ----------------
class Manual:
    """Sin API conectada. El contenido aprobado se muestra en el calendario para publicarlo a mano; no se marca como publicado."""
    def __init__(self, canal): self.nombre = canal
    def publicar(self, contenido):
        return {"provider": "manual", "ok": False, "_status": "done", "manual": True}

# ---------------- Vídeo ----------------
class VideoProvider:
    """Interfaz: guion → voz → vídeo → subtítulos → miniatura. Cada paso devuelve una URL o ruta del recurso generado."""
    nombre = "video"
    def voz(self, guion): raise NotImplementedError
    def video(self, guion, voz): raise NotImplementedError
    def subtitulos(self, guion): raise NotImplementedError
    def miniatura(self, titulo): raise NotImplementedError

class VideoMock(VideoProvider):
    nombre = "mock-video"
    def voz(self, guion): return "mock://voz.mp3"
    def video(self, guion, voz): return "mock://video.mp4"
    def subtitulos(self, guion): return "\n".join(l for l in guion.splitlines() if l and not l.startswith("["))
    def miniatura(self, titulo): return "mock://miniatura.png"

def video_provider():
    nombre = os.environ.get("VIDEO_PROVIDER", "")
    if MOCK or nombre == "mock": return VideoMock()
    # Adaptadores reales pendientes de alta de cuenta y verificación de su API (no se inventan endpoints).
    raise SinProveedor("video", f"VIDEO_PROVIDER{'=' + nombre if nombre else ''} + VIDEO_PROVIDER_KEY (adaptador no implementado todavía)")

# ---------------- Ads ----------------
class AdsManual:
    """Gasto importado a mano (CSV: fecha,canal,campana,gasto_eur,clics,impresiones). Sirve para el CAC hasta conectar APIs de Ads."""
    nombre = "ads-manual"
    def gasto(self):
        p = os.path.join(N.PRIV, "ads_gasto.csv")
        if not os.path.exists(p): return []
        return [dict(r, gasto_eur=float(r.get("gasto_eur") or 0), clics=int(r.get("clics") or 0)) for r in csv.DictReader(open(p))]

# ---------------- Reddit: solo oportunidades con revisión humana ----------------
def oportunidad_reddit(comunidad, url, contexto, borrador):
    """Registra una oportunidad (detectada por una persona o por una integración autorizada). Nunca publica."""
    fila = {"id": N.nuevo_id(), "t": N.iso(), "comunidad": comunidad, "url": url, "contexto": contexto[:1000], "borrador": borrador[:2000], "estado": "HUMAN_REVIEW"}
    N.anadir("reddit_oportunidades.jsonl", fila)
    return fila

PUBLICADORES = {"telegram": Telegram()}
for c in ("x", "instagram", "facebook", "tiktok", "youtube_short", "youtube_descripcion", "anuncio"): PUBLICADORES[c] = Manual(c)
