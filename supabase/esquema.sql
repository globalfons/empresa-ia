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
