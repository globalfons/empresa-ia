-- TestLey — esquema de base de datos para Supabase.
-- Pegar entero en: Supabase → SQL Editor → New query → Run.

-- Perfiles públicos (solo alias; nunca el email)
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null unique check (char_length(alias) between 3 and 24),
  en_ranking boolean not null default true,
  creado timestamptz not null default now()
);

-- Progreso por usuario y ley
create table if not exists public.progreso (
  user_id uuid not null references auth.users(id) on delete cascade,
  ley text not null check (ley ~ '^[a-z0-9-]{3,40}$'),
  datos jsonb not null default '{}'::jsonb,
  nota numeric(4,1) not null default 0 check (nota between 0 and 10),
  dominadas int not null default 0 check (dominadas >= 0),
  respuestas int not null default 0 check (respuestas >= 0),
  actualizado timestamptz not null default now(),
  primary key (user_id, ley)
);

alter table public.perfiles enable row level security;
alter table public.progreso enable row level security;

-- Cada usuario solo lee y escribe lo suyo
drop policy if exists "perfil propio" on public.perfiles;
create policy "perfil propio" on public.perfiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "progreso propio" on public.progreso;
create policy "progreso propio" on public.progreso for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crear el perfil automáticamente al registrarse (alias del formulario; si está cogido, se le añade un sufijo)
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; candidato text; n int := 0;
begin
  base := left(coalesce(nullif(trim(new.raw_user_meta_data->>'alias'), ''), 'opositor'), 20);
  if char_length(base) < 3 then base := 'opositor'; end if;
  candidato := base;
  while exists (select 1 from public.perfiles where alias = candidato) loop
    n := n + 1; candidato := base || '_' || n;
  end loop;
  insert into public.perfiles (id, alias) values (new.id, candidato) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse after insert on auth.users
  for each row execute function public.crear_perfil();

-- Ranking público: solo alias y cifras de quien ha aceptado aparecer
create or replace function public.ranking(p_ley text)
returns table (posicion bigint, alias text, nota numeric, dominadas int, respuestas int, es_yo boolean)
language sql stable security definer set search_path = public as $$
  select row_number() over (order by g.nota desc, g.dominadas desc, g.actualizado asc) as posicion,
         p.alias, g.nota, g.dominadas, g.respuestas, (g.user_id = auth.uid()) as es_yo
  from public.progreso g join public.perfiles p on p.id = g.user_id
  where g.ley = p_ley and p.en_ranking and g.respuestas >= 20
  order by 1
  limit 100;
$$;
grant execute on function public.ranking(text) to anon, authenticated;

-- Permisos de acceso desde la web (las políticas RLS de arriba limitan cada fila a su dueño)
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.perfiles, public.progreso to authenticated;

-- ============ v2 (tutor IA) — se puede ejecutar varias veces sin problema ============
-- Contador diario de consultas al tutor. Sin políticas RLS para usuarios: solo la función del servidor
-- (clave de servicio) puede leerlo y escribirlo, así nadie puede reiniciar su propio límite.
create table if not exists public.tutor_uso (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  n int not null default 0,
  primary key (user_id, dia)
);
alter table public.tutor_uso enable row level security;
revoke all on public.tutor_uso from anon, authenticated;

-- ============ v3 (notificaciones) — se puede ejecutar varias veces sin problema ============
-- Preferencias de cada usuario (las edita él mismo desde su panel)
create table if not exists public.notif_preferencias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_activo boolean not null default false,
  tipos text[] not null default array['convocatoria','listas','fecha_examen','modificacion','aprobados'],
  frecuencia text not null default 'inmediata' check (frecuencia in ('inmediata','diaria','semanal')),
  actualizado timestamptz not null default now()
);
alter table public.notif_preferencias enable row level security;
drop policy if exists "preferencias propias" on public.notif_preferencias;
create policy "preferencias propias" on public.notif_preferencias for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.notif_preferencias to authenticated;

-- Eventos: publicaciones oficiales que pueden generar avisos (los crea el servicio a partir de datos/novedades.json)
create table if not exists public.notif_eventos (
  id bigserial primary key,
  clave text not null unique,              -- oposición + identificador oficial
  tipo text not null, oposicion text not null, titulo text not null, url text not null, fecha date,
  datos jsonb not null default '{}'::jsonb, creado timestamptz not null default now()
);
-- Cola de envíos: una fila por usuario, evento y canal. Si no hay proveedor, queda en 'sin_proveedor' para enviarse después.
create table if not exists public.notif_cola (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  evento_id bigint not null references public.notif_eventos(id) on delete cascade,
  canal text not null default 'email', plantilla text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','enviado','fallido','sin_proveedor','omitido')),
  intentos int not null default 0, ultimo_error text, programado timestamptz not null default now(), enviado timestamptz,
  unique (user_id, evento_id, canal)
);
-- Registro del servicio
create table if not exists public.notif_log (
  id bigserial primary key, t timestamptz not null default now(), nivel text not null default 'info', mensaje text not null, datos jsonb
);
alter table public.notif_eventos enable row level security;
alter table public.notif_cola enable row level security;
alter table public.notif_log enable row level security;
-- Cada usuario puede ver su historial de avisos; solo el servicio (clave de servicio) escribe.
drop policy if exists "mis avisos" on public.notif_cola;
create policy "mis avisos" on public.notif_cola for select using (auth.uid() = user_id);
grant select on public.notif_cola to authenticated;
revoke all on public.notif_eventos, public.notif_log from anon, authenticated;

-- ============ v4 (Growth OS) — se puede ejecutar varias veces sin problema ============
-- Bus de eventos de producto. Los navegadores solo pueden escribir por registrar_evento() (validada y con límite);
-- nadie puede leer la tabla salvo el servicio y los administradores (a través de funciones agregadas).
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  type text not null, ts timestamptz not null default now(), source text not null default 'web',
  entity_type text not null default '', entity_id text not null default '',
  payload jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid, idempotency_key text unique,
  anon_id text, user_id uuid references auth.users(id) on delete set null,
  procesado boolean not null default false
);
create index if not exists eventos_tipo_ts on public.eventos (type, ts);
create index if not exists eventos_anon_ts on public.eventos (anon_id, ts);
create index if not exists eventos_user_ts on public.eventos (user_id, ts);
alter table public.eventos enable row level security;
revoke all on public.eventos from anon, authenticated;

create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
create or replace function public.es_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.es_admin() to authenticated;
create or replace function public._servicio_o_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.role(), '') = 'service_role' or public.es_admin();
$$;

-- Tipos que puede emitir un navegador (los de suscripción, referidos y afiliados solo los escribe el servidor)
create or replace function public.registrar_evento(p_tipo text, p_payload jsonb default '{}'::jsonb, p_anon text default null,
  p_meta jsonb default '{}'::jsonb, p_clave text default null, p_entidad text default '', p_entidad_id text default '')
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if p_tipo not in ('PAGE_VIEW','LANDING_VISIT','SEARCH','OPPOSITION_VIEW','TEST_STARTED','TEST_COMPLETED','SIMULATION_STARTED','SIMULATION_COMPLETED',
                    'PAYWALL_REACHED','FREE_LIMIT_REACHED','ONBOARDING_COMPLETED','CHECKOUT_STARTED','USER_REGISTERED','USER_ACTIVATED','EXPERIMENT_EXPOSURE')
    then raise exception 'tipo no permitido'; end if;
  if p_tipo in ('USER_REGISTERED','USER_ACTIVATED') and uid is null then raise exception 'requiere sesión'; end if;
  if p_anon is null or p_anon !~ '^[a-z0-9]{16,40}$' then raise exception 'anon_id inválido'; end if;
  if octet_length(coalesce(p_payload,'{}')::text) > 2048 or octet_length(coalesce(p_meta,'{}')::text) > 4096 then raise exception 'evento demasiado grande'; end if;
  select count(*) into n from public.eventos where anon_id = p_anon and ts > now() - interval '1 hour';
  if n >= 300 then return false; end if;   -- límite de frecuencia por dispositivo
  insert into public.eventos (type, source, entity_type, entity_id, payload, metadata, anon_id, user_id, idempotency_key)
  values (p_tipo, 'web', left(coalesce(p_entidad,''),40), left(coalesce(p_entidad_id,''),120), coalesce(p_payload,'{}'), coalesce(p_meta,'{}'), p_anon, uid,
          case when p_clave is null then null else 'web:' || coalesce(uid::text, p_anon) || ':' || left(p_clave, 120) end)
  on conflict (idempotency_key) do nothing;
  return true;
end $$;
grant execute on function public.registrar_evento(text, jsonb, text, jsonb, text, text, text) to anon, authenticated;

-- Suscripciones (las escribe solo el webhook firmado de Lemon Squeezy: supabase/functions/lemon-webhook)
create table if not exists public.suscripciones (
  id text primary key, user_id uuid references auth.users(id) on delete set null, email text not null,
  status text not null, product_id text, variant_id text, customer_id text, order_id text,
  importe_cent int, renews_at timestamptz, ends_at timestamptz, trial_ends_at timestamptz,
  atribucion jsonb not null default '{}'::jsonb, creado timestamptz not null default now(), actualizado timestamptz not null default now()
);
create index if not exists suscripciones_email on public.suscripciones (lower(email));
alter table public.suscripciones enable row level security;
drop policy if exists "mis suscripciones" on public.suscripciones;
create policy "mis suscripciones" on public.suscripciones for select using (auth.uid() = user_id);
grant select on public.suscripciones to authenticated;

-- Entitlement centralizado: el servidor decide si el usuario es premium (nunca solo el navegador)
create or replace function public.mi_plan() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('plan', 'premium', 'status', s.status, 'renews_at', s.renews_at, 'ends_at', s.ends_at)
    from public.suscripciones s
    where (s.user_id = auth.uid() or lower(s.email) = (select lower(email) from auth.users where id = auth.uid() and email_confirmed_at is not null))
      and (s.status in ('active','on_trial','past_due') or (s.status = 'cancelled' and s.ends_at > now()))
    order by s.actualizado desc limit 1), jsonb_build_object('plan', 'free'));
$$;
grant execute on function public.mi_plan() to authenticated;

-- Referidos (con antifraude)
create table if not exists public.referidores (user_id uuid primary key references auth.users(id) on delete cascade, codigo text not null unique, creado timestamptz not null default now());
create table if not exists public.referidos (
  id bigserial primary key, codigo text not null, referrer uuid not null references auth.users(id) on delete cascade,
  referred uuid not null unique references auth.users(id) on delete cascade,
  estado text not null default 'registrado' check (estado in ('registrado','activado','convertido','rechazado','revision')),
  motivo text, recompensa text not null default 'pendiente', creado timestamptz not null default now(), activado timestamptz, convertido timestamptz
);
alter table public.referidores enable row level security;
alter table public.referidos enable row level security;
revoke all on public.referidores, public.referidos from anon, authenticated;
create or replace function public.mi_codigo_referido() returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'requiere sesión'; end if;
  select codigo into c from public.referidores where user_id = auth.uid();
  if c is null then
    loop
      c := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      begin insert into public.referidores (user_id, codigo) values (auth.uid(), c); exit; exception when unique_violation then end;
    end loop;
  end if;
  return c;
end $$;
create or replace function public.registrar_referido(p_codigo text, p_anon text default null) returns text language plpgsql security definer set search_path = public as $$
declare r uuid; alta timestamptz; est text := 'registrado'; mot text;
begin
  if auth.uid() is null then raise exception 'requiere sesión'; end if;
  select user_id into r from public.referidores where codigo = lower(p_codigo);
  if r is null then return 'codigo_desconocido'; end if;
  if r = auth.uid() then return 'autorreferido'; end if;                                  -- self-referral
  select created_at into alta from auth.users where id = auth.uid();
  if alta < now() - interval '48 hours' then return 'cuenta_antigua'; end if;             -- solo cuentas nuevas
  if p_anon is not null and exists (select 1 from public.eventos where user_id = r and anon_id = p_anon) then
    est := 'rechazado'; mot := 'mismo dispositivo que quien refiere';                       -- múltiples cuentas
  elsif (select count(*) from public.referidos where referrer = r and creado > now() - interval '1 day') >= 20 then
    est := 'revision'; mot := 'volumen anómalo';                                            -- abuso
  end if;
  insert into public.referidos (codigo, referrer, referred, estado, motivo) values (lower(p_codigo), r, auth.uid(), est, mot) on conflict (referred) do nothing;
  return est;
end $$;
create or replace function public.mis_referidos() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('codigo', (select codigo from public.referidores where user_id = auth.uid()),
    'registrados', count(*) filter (where estado in ('registrado','activado','convertido')), 'convertidos', count(*) filter (where estado = 'convertido'))
  from public.referidos where referrer = auth.uid();
$$;
grant execute on function public.mi_codigo_referido(), public.registrar_referido(text, text), public.mis_referidos() to authenticated;

-- Afiliados (academias, preparadores, creadores). Alta y comisión las gestiona el administrador.
create table if not exists public.afiliados (
  codigo text primary key check (codigo ~ '^[a-z0-9-]{3,30}$'), nombre text not null, email text,
  comision_pct numeric(5,2) not null default 20 check (comision_pct between 0 and 100),
  estado text not null default 'activo' check (estado in ('activo','pausado')), creado timestamptz not null default now()
);
create table if not exists public.afiliado_conversiones (
  id bigserial primary key, codigo text not null references public.afiliados(codigo), order_id text not null unique, subscription_id text,
  importe_cent int not null, comision_cent int not null, estado text not null default 'pendiente' check (estado in ('pendiente','pagada','anulada')),
  creado timestamptz not null default now()
);
alter table public.afiliados enable row level security;
alter table public.afiliado_conversiones enable row level security;
revoke all on public.afiliados, public.afiliado_conversiones from anon, authenticated;

-- Consentimiento para comunicaciones comerciales (reactivación, newsletter). Los avisos oficiales solo requieren email_activo.
alter table public.notif_preferencias add column if not exists marketing boolean not null default false;

-- Telegram: chats que han pedido avisos al bot (solo el servicio)
create table if not exists public.telegram_suscriptores (
  chat_id bigint primary key, oposiciones text[] not null default '{}', pregunta_diaria boolean not null default false,
  activo boolean not null default true, creado timestamptz not null default now(), actualizado timestamptz not null default now()
);
alter table public.telegram_suscriptores enable row level security;
revoke all on public.telegram_suscriptores from anon, authenticated;

-- Retención: usuarios cuya última actividad fue hace exactamente p_dias días (un aviso por umbral). Solo servicio.
create or replace function public.detectar_inactivos(p_dias int) returns table (user_id uuid, email text, ultima date, premium boolean, marketing boolean)
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'solo servicio'; end if;
  return query
  with act as (
    select u.id, u.email, greatest(max(p.actualizado), max(e.ts), u.created_at)::date as ultima
    from auth.users u left join public.progreso p on p.user_id = u.id left join public.eventos e on e.user_id = u.id
    group by u.id, u.email, u.created_at)
  select a.id, a.email::text, a.ultima,
         exists (select 1 from public.suscripciones s where (s.user_id = a.id or lower(s.email) = lower(a.email)) and s.status in ('active','on_trial','past_due')),
         coalesce((select np.marketing and np.email_activo from public.notif_preferencias np where np.user_id = a.id), false)
  from act a where a.ultima = current_date - p_dias;
  insert into public.eventos (type, source, entity_type, entity_id, payload, user_id, idempotency_key)
  select 'USER_INACTIVE', 'retencion', 'usuario', a.id::text, jsonb_build_object('dias', p_dias), a.id, 'inactivo:' || a.id || ':' || p_dias || ':' || a.ultima
  from (select u.id, greatest(max(p.actualizado), max(e.ts), u.created_at)::date as ultima from auth.users u
        left join public.progreso p on p.user_id = u.id left join public.eventos e on e.user_id = u.id group by u.id, u.created_at) a
  where a.ultima = current_date - p_dias
  on conflict (idempotency_key) do nothing;
end $$;

-- Pesos del lead scoring (sincronizados con crecimiento/reglas.json → lead_scoring)
create table if not exists public.lead_pesos (tipo text primary key, puntos int not null);
insert into public.lead_pesos values ('LANDING_VISIT',1),('OPPOSITION_VIEW',2),('TEST_STARTED',3),('TEST_COMPLETED',5),('USER_REGISTERED',8),
  ('ONBOARDING_COMPLETED',10),('SESIONES_MULTIPLES',15),('PAYWALL_REACHED',30),('CHECKOUT_STARTED',30) on conflict (tipo) do update set puntos = excluded.puntos;
alter table public.lead_pesos enable row level security;
revoke all on public.lead_pesos from anon, authenticated;

create or replace function public.admin_leads(p_limite int default 50) returns table (anon_id text, user_id uuid, puntos bigint, ultimo timestamptz, premium_intencion boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public._servicio_o_admin() then raise exception 'solo administradores'; end if;
  return query
  with ev as (select e.anon_id, max(e.user_id::text)::uuid as user_id, e.type, count(*) as n, max(e.ts) as ultimo,
                     count(distinct e.ts::date) as dias from public.eventos e where e.ts > now() - interval '30 days' and e.anon_id is not null group by e.anon_id, e.type),
       pt as (select ev.anon_id, max(ev.user_id::text)::uuid as user_id,
                     sum(coalesce(lp.puntos, 0) * least(ev.n, 5)) + case when max(ev.dias) >= 3 then (select puntos from public.lead_pesos where tipo = 'SESIONES_MULTIPLES') else 0 end as puntos,
                     max(ev.ultimo) as ultimo, bool_or(ev.type in ('PAYWALL_REACHED','CHECKOUT_STARTED')) as intencion
              from ev left join public.lead_pesos lp on lp.tipo = ev.type group by ev.anon_id)
  select pt.anon_id, pt.user_id, pt.puntos::bigint, pt.ultimo, pt.intencion from pt order by pt.puntos desc limit p_limite;
end $$;

-- Métricas de negocio agregadas (sin datos personales) para /admin/growth/ y el Growth Analyst
create or replace function public.admin_metricas(p_dias int default 30) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare desde timestamptz := now() - make_interval(days => p_dias); r jsonb;
begin
  if not public._servicio_o_admin() then raise exception 'solo administradores'; end if;
  with e as (select * from public.eventos where ts >= desde),
  emb as (select
    count(distinct anon_id) filter (where type in ('LANDING_VISIT','PAGE_VIEW')) as visitas,
    count(distinct user_id) filter (where type = 'USER_REGISTERED') as registros,
    count(distinct user_id) filter (where type = 'USER_ACTIVATED') as activados,
    count(distinct coalesce(user_id::text, anon_id)) filter (where type = 'PAYWALL_REACHED') as muro_pago,
    count(distinct coalesce(user_id::text, anon_id)) filter (where type = 'CHECKOUT_STARTED') as checkout,
    count(*) filter (where type = 'SUBSCRIPTION_STARTED') as premium,
    count(*) filter (where type = 'SUBSCRIPTION_CANCELLED') as cancelaciones,
    count(*) filter (where type in ('TEST_COMPLETED','SIMULATION_COMPLETED')) as tests
    from e)
  select jsonb_build_object(
    'periodo_dias', p_dias,
    'embudo', (select to_jsonb(emb) from emb),
    'suscripciones_activas', (select count(*) from public.suscripciones where status in ('active','on_trial','past_due')),
    'mrr_eur', (select round(coalesce(sum(importe_cent), 0) / 100.0, 2) from public.suscripciones where status in ('active','past_due')),
    'ltv_eur', (select case when count(*) filter (where status in ('cancelled','expired')) >= 20
                  then round(avg(importe_cent) / 100.0 / greatest(0.01, count(*) filter (where status in ('cancelled','expired'))::numeric / count(*)), 2) end from public.suscripciones),
    'retencion_semanal', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where vuelve) / count(*), 1) end from (
        select a.uid, exists (select 1 from public.eventos b where b.user_id = a.uid and b.ts >= now() - interval '7 days') as vuelve
        from (select distinct user_id as uid from public.eventos where user_id is not null and ts between now() - interval '14 days' and now() - interval '7 days') a) x),
    'por_canal', (select coalesce(jsonb_object_agg(canal, jsonb_build_object('registros', reg, 'premium', prem)), '{}') from (
        select coalesce(metadata #>> '{attr,first,utm_source}', metadata #>> '{attr,first,ref}', 'directo') as canal,
               count(*) filter (where type = 'USER_REGISTERED') as reg, count(*) filter (where type = 'SUBSCRIPTION_STARTED') as prem
        from e where type in ('USER_REGISTERED','SUBSCRIPTION_STARTED') group by 1) c),
    -- Conversión por campaña y por pieza de contenido (last touch: utm_campaign / utm_content que pone el Growth OS en cada enlace)
    'por_campana', (select coalesce(jsonb_agg(x), '[]') from (select metadata #>> '{attr,last,utm_campaign}' as campana,
        count(distinct anon_id) filter (where type = 'LANDING_VISIT') as visitas, count(*) filter (where type = 'USER_REGISTERED') as registros,
        count(*) filter (where type = 'SUBSCRIPTION_STARTED') as premium
        from e where metadata #>> '{attr,last,utm_campaign}' is not null group by 1 order by 3 desc, 2 desc limit 20) x),
    'por_contenido', (select coalesce(jsonb_agg(x), '[]') from (select metadata #>> '{attr,last,utm_content}' as contenido,
        count(distinct anon_id) filter (where type = 'LANDING_VISIT') as visitas, count(*) filter (where type = 'USER_REGISTERED') as registros,
        count(*) filter (where type = 'SUBSCRIPTION_STARTED') as premium
        from e where metadata #>> '{attr,last,utm_content}' is not null group by 1 order by 3 desc, 2 desc limit 20) x),
    'top_landings', (select coalesce(jsonb_agg(x), '[]') from (select metadata #>> '{attr,first,landing}' as landing, count(distinct anon_id) as visitas from e
        where type = 'LANDING_VISIT' group by 1 order by 2 desc limit 10) x),
    'top_oposiciones', (select coalesce(jsonb_agg(x), '[]') from (select entity_id as oposicion, count(distinct anon_id) as visitas from e
        where type = 'OPPOSITION_VIEW' group by 1 order by 2 desc limit 10) x),
    'busquedas_sin_resultado', (select coalesce(jsonb_agg(x), '[]') from (select lower(payload->>'q') as q, count(*) as n from e
        where type = 'SEARCH' and (payload->>'resultados')::int = 0 group by 1 order by 2 desc limit 10) x),
    'experimentos', (select coalesce(jsonb_agg(x), '[]') from (select payload->>'exp' as exp, payload->>'var' as var, count(distinct anon_id) as expuestos,
        count(distinct anon_id) filter (where exists (select 1 from e r where r.anon_id = e.anon_id and r.type = 'USER_REGISTERED')) as registros
        from e where type = 'EXPERIMENT_EXPOSURE' group by 1, 2) x),
    'afiliados', (select coalesce(jsonb_agg(x), '[]') from (select a.codigo, a.nombre,
        (select count(distinct anon_id) from e where type = 'LANDING_VISIT' and metadata #>> '{attr,first,ref}' = a.codigo) as clics,
        (select count(*) from e where type = 'USER_REGISTERED' and metadata #>> '{attr,first,ref}' = a.codigo) as registros,
        (select count(*) from e where type = 'USER_ACTIVATED' and metadata #>> '{attr,first,ref}' = a.codigo) as activados,
        (select count(*) from public.afiliado_conversiones c where c.codigo = a.codigo) as premium,
        (select coalesce(sum(importe_cent), 0) / 100.0 from public.afiliado_conversiones c where c.codigo = a.codigo and c.estado <> 'anulada') as ingresos_eur,
        (select coalesce(sum(comision_cent), 0) / 100.0 from public.afiliado_conversiones c where c.codigo = a.codigo and c.estado <> 'anulada') as comision_eur
        from public.afiliados a) x),
    'referidos', (select jsonb_build_object('total', count(*), 'convertidos', count(*) filter (where estado = 'convertido'),
        'rechazados', count(*) filter (where estado in ('rechazado','revision'))) from public.referidos)
  ) into r;
  return r;
end $$;
grant execute on function public.admin_metricas(int), public.admin_leads(int) to authenticated;
