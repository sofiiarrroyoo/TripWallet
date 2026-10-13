-- Viajes

create table public.viajes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 100),
  destino text not null check (char_length(btrim(destino)) between 1 and 100),
  moneda_base char(3) not null check (moneda_base ~ '^[A-Z]{3}$'),
  fecha_inicio date not null,
  fecha_fin date not null,
  -- Si el viaje tiene presupuesto por categoría, manda ese y este se ignora (regla en el servicio de presupuestos).
  presupuesto_total numeric(14, 2) check (presupuesto_total > 0),
  estado text not null default 'abierto' check (estado in ('abierto', 'cerrado')),
  creado_en timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);

create index viajes_usuario_id_idx on public.viajes (usuario_id);

alter table public.viajes enable row level security;

-- (select auth.uid()) en lugar de auth.uid(): Postgres lo evalúa una vez por consulta y no una vez por fila.
create policy "viajes: el dueño los ve"
  on public.viajes for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "viajes: el dueño los crea abiertos"
  on public.viajes for insert to authenticated
  with check (usuario_id = (select auth.uid()) and estado = 'abierto');

create policy "viajes: el dueño modifica los abiertos"
  on public.viajes for update to authenticated
  using (usuario_id = (select auth.uid()) and estado = 'abierto')
  with check (usuario_id = (select auth.uid()));

-- Las políticas no pueden comparar valor viejo contra nuevo, así que las columnas que no se pueden cambiar
-- se protegen con permisos: estado solo cambia con cerrar_viaje / reabrir_viaje y la moneda base es fija
-- (los gastos ya guardados están convertidos a ella).
revoke update on public.viajes from authenticated;
grant update (nombre, destino, fecha_inicio, fecha_fin, presupuesto_total) on public.viajes to authenticated;

revoke all on public.viajes from anon;

-- Categorías (usuario_id null = categoría por defecto, visible para todos)

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid default auth.uid() references auth.users (id) on delete cascade,
  -- Sin espacios al inicio, al final ni repetidos: el servicio normaliza el nombre antes de guardar.
  nombre text not null check (char_length(nombre) between 1 and 50 and nombre ~ '^\S+( \S+)*$'),
  creado_en timestamptz not null default now()
);

-- nulls not distinct: también impide duplicados entre las categorías por defecto (usuario_id null).
create unique index categorias_usuario_nombre_unico
  on public.categorias (usuario_id, lower(nombre)) nulls not distinct;

alter table public.categorias enable row level security;

create policy "categorias: se ven las por defecto y las propias"
  on public.categorias for select to authenticated
  using (usuario_id is null or usuario_id = (select auth.uid()));

create policy "categorias: el usuario crea las propias"
  on public.categorias for insert to authenticated
  with check (usuario_id = (select auth.uid()));

revoke all on public.categorias from anon;

insert into public.categorias (usuario_id, nombre) values
  (null, 'Comida y bebida'),
  (null, 'Transporte'),
  (null, 'Alojamiento'),
  (null, 'Actividades y entretenimiento'),
  (null, 'Compras'),
  (null, 'Salud y farmacia'),
  (null, 'Comunicación'),
  (null, 'Otros');
