-- Gastos

create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.viajes (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  monto_original numeric(14, 2) not null check (monto_original > 0),
  moneda_original char(3) not null check (moneda_original ~ '^[A-Z]{3}$'),
  -- >= 0 y no > 0: un monto chico en una moneda muy devaluada puede redondear a 0.00 en la moneda base.
  monto_convertido numeric(14, 2) not null check (monto_convertido >= 0),
  -- Unidades de moneda base por unidad de moneda original (1 si son la misma).
  cotizacion numeric(20, 10) not null check (cotizacion > 0),
  fecha_cotizacion date not null,
  categoria_id uuid not null references public.categorias (id),
  descripcion text not null check (char_length(btrim(descripcion)) between 1 and 200),
  fecha_gasto date not null,
  creado_en timestamptz not null default now()
);

create index gastos_viaje_fecha_idx on public.gastos (viaje_id, fecha_gasto);
create index gastos_categoria_id_idx on public.gastos (categoria_id);

alter table public.gastos enable row level security;

create policy "gastos: el dueño los ve"
  on public.gastos for select to authenticated
  using (usuario_id = (select auth.uid()));

-- Además del dueño, se valida contra las tablas relacionadas: el viaje tiene que ser propio y estar abierto,
-- y la categoría tiene que ser una por defecto o propia.
create policy "gastos: el dueño los crea en viajes abiertos"
  on public.gastos for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.viajes v
      where v.id = viaje_id and v.usuario_id = (select auth.uid()) and v.estado = 'abierto'
    )
    and exists (
      select 1 from public.categorias c
      where c.id = categoria_id and (c.usuario_id is null or c.usuario_id = (select auth.uid()))
    )
  );

create policy "gastos: el dueño los borra en viajes abiertos"
  on public.gastos for delete to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.viajes v
      where v.id = viaje_id and v.usuario_id = (select auth.uid()) and v.estado = 'abierto'
    )
  );

revoke all on public.gastos from anon;

-- Presupuesto por categoría (montos en la moneda base del viaje)

create table public.presupuestos_viaje (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.viajes (id) on delete cascade,
  categoria_id uuid not null references public.categorias (id),
  monto_estimado numeric(14, 2) not null check (monto_estimado > 0),
  supuestos text check (char_length(supuestos) <= 1000),
  creado_en timestamptz not null default now(),
  unique (viaje_id, categoria_id)
);

create index presupuestos_viaje_categoria_id_idx on public.presupuestos_viaje (categoria_id);

alter table public.presupuestos_viaje enable row level security;

create policy "presupuestos: el dueño del viaje los ve"
  on public.presupuestos_viaje for select to authenticated
  using (
    exists (select 1 from public.viajes v where v.id = viaje_id and v.usuario_id = (select auth.uid()))
  );

create policy "presupuestos: el dueño los crea en viajes abiertos"
  on public.presupuestos_viaje for insert to authenticated
  with check (
    exists (
      select 1 from public.viajes v
      where v.id = viaje_id and v.usuario_id = (select auth.uid()) and v.estado = 'abierto'
    )
    and exists (
      select 1 from public.categorias c
      where c.id = categoria_id and (c.usuario_id is null or c.usuario_id = (select auth.uid()))
    )
  );

create policy "presupuestos: el dueño los modifica en viajes abiertos"
  on public.presupuestos_viaje for update to authenticated
  using (
    exists (
      select 1 from public.viajes v
      where v.id = viaje_id and v.usuario_id = (select auth.uid()) and v.estado = 'abierto'
    )
  );

create policy "presupuestos: el dueño los borra en viajes abiertos"
  on public.presupuestos_viaje for delete to authenticated
  using (
    exists (
      select 1 from public.viajes v
      where v.id = viaje_id and v.usuario_id = (select auth.uid()) and v.estado = 'abierto'
    )
  );

-- Solo se editan el monto y los supuestos; mover un presupuesto a otro viaje o categoría no tiene sentido.
revoke update on public.presupuestos_viaje from authenticated;
grant update (monto_estimado, supuestos) on public.presupuestos_viaje to authenticated;

revoke all on public.presupuestos_viaje from anon;
