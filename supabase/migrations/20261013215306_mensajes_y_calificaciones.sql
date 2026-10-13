-- Mensajes del chat de cada viaje

create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.viajes (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rol text not null check (rol in ('user', 'assistant')),
  contenido text not null,
  -- Cada elemento: nombre de la tool, argumentos y resultado. Permite rearmar las tarjetas del chat y el panel de debug.
  llamadas_tools jsonb not null default '[]' check (jsonb_typeof(llamadas_tools) = 'array'),
  tokens_entrada integer check (tokens_entrada >= 0),
  tokens_salida integer check (tokens_salida >= 0),
  modelo text check (char_length(modelo) between 1 and 100),
  creado_en timestamptz not null default now(),
  check (
    (rol = 'user' and char_length(btrim(contenido)) between 1 and 1000 and modelo is null)
    or (rol = 'assistant' and char_length(contenido) <= 20000)
  )
);

create index mensajes_viaje_creado_idx on public.mensajes (viaje_id, creado_en);
-- Para el rate limiting: mensajes del usuario en la última hora.
create index mensajes_usuario_creado_idx on public.mensajes (usuario_id, creado_en);

alter table public.mensajes enable row level security;

create policy "mensajes: el dueño los ve"
  on public.mensajes for select to authenticated
  using (usuario_id = (select auth.uid()));

-- Sin restricción de viaje abierto: en un viaje cerrado se puede seguir consultando por chat
-- (y la respuesta a "cerrá el viaje" se guarda cuando el viaje ya quedó cerrado).
create policy "mensajes: el dueño los crea en sus viajes"
  on public.mensajes for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (select 1 from public.viajes v where v.id = viaje_id and v.usuario_id = (select auth.uid()))
  );

-- Sin políticas de update ni delete: el historial es inmutable y el rate limiting, que cuenta mensajes,
-- no se puede saltear borrándolos.

revoke all on public.mensajes from anon;

-- Calificaciones (pulgar arriba / abajo) de las respuestas del bot

create table public.calificaciones (
  id uuid primary key default gen_random_uuid(),
  mensaje_id uuid not null unique references public.mensajes (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  valor smallint not null check (valor in (-1, 1)),
  creado_en timestamptz not null default now()
);

alter table public.calificaciones enable row level security;

create policy "calificaciones: el dueño las ve"
  on public.calificaciones for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "calificaciones: el dueño califica respuestas del bot en sus viajes"
  on public.calificaciones for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1
      from public.mensajes m
      join public.viajes v on v.id = m.viaje_id
      where m.id = mensaje_id and m.rol = 'assistant' and v.usuario_id = (select auth.uid())
    )
  );

create policy "calificaciones: el dueño las cambia"
  on public.calificaciones for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

revoke update on public.calificaciones from authenticated;
grant update (valor) on public.calificaciones to authenticated;

revoke all on public.calificaciones from anon;
