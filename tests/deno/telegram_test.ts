import { responder } from "../../supabase/functions/telegram/index.ts";
const assert = (c: unknown, m = "fallo") => { if (!c) throw new Error(m); };
const CAT = [{ id: "policia-nacional-escala-basica", nombre: "Policía Nacional, Escala Básica", plazas: 2704 }, { id: "age-auxiliar-administrativo-c2", nombre: "Auxiliar Administrativo del Estado" }];
Deno.test("start lista oposiciones y activa", () => { const r = responder("/start", null, CAT); assert(r.texto.includes("/seguir policia-nacional-escala-basica") && r.guardar?.activo); });
Deno.test("seguir valida el id y acumula sin duplicar", () => {
  assert(!responder("/seguir inventada", null, CAT).guardar);
  const r = responder("/seguir policia-nacional-escala-basica", { chat_id: 1, oposiciones: ["policia-nacional-escala-basica"], pregunta_diaria: false, activo: true }, CAT);
  assert(r.guardar?.oposiciones?.length === 1 && r.texto.includes("utm_source=telegram"));
});
Deno.test("pregunta alterna, baja lo desactiva todo", () => {
  assert(responder("/pregunta", null, CAT).guardar?.pregunta_diaria === true);
  const b = responder("/baja", { chat_id: 1, oposiciones: ["x"], pregunta_diaria: true, activo: true }, CAT);
  assert(b.guardar?.activo === false && b.guardar?.oposiciones?.length === 0);
});
Deno.test("comando desconocido → ayuda; @bot se ignora", () => { assert(responder("hola", null, CAT).texto.startsWith("Comandos")); assert(responder("/oposiciones@TestLeyBot", null, CAT).texto.includes("Auxiliar")); });
