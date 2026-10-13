-- Caché diaria de cotizaciones, por usuario (una compartida permitiría que cualquiera cargue tasas falsas para todos)

create table public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  moneda_base char(3) not null check (moneda_base ~ '^[A-Z]{3}$'),
  -- Fecha de actualización informada por la API, no la de la consulta.
  fecha date not null,
  tasas jsonb not null check (jsonb_typeof(tasas) = 'object'),
  fuente text not null check (char_length(fuente) between 1 and 200),
  obtenida_en timestamptz not null default now(),
  unique (usuario_id, moneda_base, fecha)
);

alter table public.cotizaciones enable row level security;

create policy "cotizaciones: el dueño las ve"
  on public.cotizaciones for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "cotizaciones: el dueño las crea"
  on public.cotizaciones for insert to authenticated
  with check (usuario_id = (select auth.uid()));

revoke all on public.cotizaciones from anon;

-- Resumen de un viaje cerrado (existe solo mientras el viaje está cerrado)

create table public.resumenes_viaje (
  viaje_id uuid primary key references public.viajes (id) on delete cascade,
  estadisticas jsonb not null check (jsonb_typeof(estadisticas) = 'object'),
  -- Foto en base USD con la fecha real de la cotización usada; habilita comparar viajes (US9).
  cotizaciones_cierre jsonb not null check (jsonb_typeof(cotizaciones_cierre) = 'object'),
  -- Null si el LLM falló o tardó demasiado: el viaje se cierra igual.
  resumen text check (char_length(resumen) <= 5000),
  creado_en timestamptz not null default now()
);

alter table public.resumenes_viaje enable row level security;

create policy "resumenes: el dueño del viaje los ve"
  on public.resumenes_viaje for select to authenticated
  using (
    exists (select 1 from public.viajes v where v.id = viaje_id and v.usuario_id = (select auth.uid()))
  );

-- Sin políticas de escritura: solo lo escriben cerrar_viaje y reabrir_viaje.
revoke insert, update, delete on public.resumenes_viaje from authenticated;
revoke all on public.resumenes_viaje from anon;

-- Cerrar y reabrir viaje
-- security definer: corren con los permisos del dueño de la función para poder cambiar viajes.estado y escribir
-- resumenes_viaje, que el usuario no puede tocar directo. Por eso validan ellas mismas que el viaje sea de auth.uid().
-- search_path vacío obliga a nombrar todo con su esquema y evita que otro objeto con el mismo nombre las engañe.
-- Los errores se lanzan con un código en el mensaje para que el repositorio los traduzca a errores propios.

create function public.cerrar_viaje(
  p_viaje_id uuid,
  p_gastos_ids uuid[],
  p_estadisticas jsonb,
  p_cotizaciones_cierre jsonb,
  p_resumen text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_gastos_actuales uuid[];
  v_gastos_usados uuid[];
begin
  -- for update bloquea la fila del viaje hasta el fin de la transacción: dos cierres simultáneos no se pisan.
  select estado into v_estado
  from public.viajes
  where id = p_viaje_id and usuario_id = auth.uid()
  for update;

  if not found then
    raise exception 'VIAJE_NO_ENCONTRADO';
  end if;

  if v_estado <> 'abierto' then
    raise exception 'VIAJE_CERRADO';
  end if;

  select coalesce(array_agg(id order by id), '{}') into v_gastos_actuales
  from public.gastos
  where viaje_id = p_viaje_id;

  if cardinality(v_gastos_actuales) = 0 then
    raise exception 'VIAJE_SIN_GASTOS';
  end if;

  -- Las estadísticas se calcularon en el servicio antes de este bloqueo; si entretanto se agregó o borró
  -- un gasto, ya no corresponden y el servicio tiene que recalcular.
  select coalesce(array_agg(distinct id order by id), '{}') into v_gastos_usados
  from unnest(p_gastos_ids) as id;

  if v_gastos_actuales is distinct from v_gastos_usados then
    raise exception 'GASTOS_MODIFICADOS';
  end if;

  update public.viajes set estado = 'cerrado' where id = p_viaje_id;

  insert into public.resumenes_viaje (viaje_id, estadisticas, cotizaciones_cierre, resumen)
  values (p_viaje_id, p_estadisticas, p_cotizaciones_cierre, p_resumen);
end;
$$;

create function public.reabrir_viaje(p_viaje_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
begin
  select estado into v_estado
  from public.viajes
  where id = p_viaje_id and usuario_id = auth.uid()
  for update;

  if not found then
    raise exception 'VIAJE_NO_ENCONTRADO';
  end if;

  if v_estado <> 'cerrado' then
    raise exception 'VIAJE_ABIERTO';
  end if;

  delete from public.resumenes_viaje where viaje_id = p_viaje_id;
  update public.viajes set estado = 'abierto' where id = p_viaje_id;
end;
$$;

-- Las políticas de gastos leen el estado del viaje sin esperar el bloqueo de cerrar_viaje, así que un gasto que
-- se está guardando en el mismo instante del cierre podría colarse. for share espera a que termine un cierre en
-- curso y después vuelve a leer la fila: si el viaje quedó cerrado, rechaza la operación.
create function public.validar_viaje_abierto_para_gasto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viaje_id uuid;
  v_estado text;
begin
  foreach v_viaje_id in array array[old.viaje_id, new.viaje_id] loop
    continue when v_viaje_id is null;

    select estado into v_estado
    from public.viajes
    where id = v_viaje_id
    for share;

    -- Si el viaje no existe es porque se está borrando en cascada (o la clave foránea va a fallar): se deja pasar.
    if found and v_estado <> 'abierto' then
      raise exception 'VIAJE_CERRADO';
    end if;
  end loop;

  return coalesce(new, old);
end;
$$;

create trigger gastos_validar_viaje_abierto
  before insert or update or delete on public.gastos
  for each row execute function public.validar_viaje_abierto_para_gasto();

revoke execute on function public.validar_viaje_abierto_para_gasto() from public, anon, authenticated;

revoke execute on function public.cerrar_viaje(uuid, uuid[], jsonb, jsonb, text) from public, anon;
revoke execute on function public.reabrir_viaje(uuid) from public, anon;
grant execute on function public.cerrar_viaje(uuid, uuid[], jsonb, jsonb, text) to authenticated;
grant execute on function public.reabrir_viaje(uuid) to authenticated;
