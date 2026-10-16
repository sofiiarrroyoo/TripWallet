import { CircleAlert } from "lucide-react";
import { formatearMonto, formatearPorcentaje, formatearRangoFechas } from "@/lib/formatos";
import type { ResumenViaje } from "@/tipos/cierre";
import { BarraProgreso } from "./BarraProgreso";
import { partesDeResumen } from "./textoResumen";

type Props = { resumen: ResumenViaje | null };

function Estadistica({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 p-4">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="text-xl font-semibold tracking-tight tabular-nums">{valor}</dd>
      {detalle && <dd className="text-sm text-muted-foreground">{detalle}</dd>}
    </div>
  );
}

// El resumen de un viaje cerrado. Todos los números salen de las estadísticas calculadas y guardadas al cerrar; el
// texto del modelo es solo la redacción. Las barras son decorativas: cada dato está también escrito.
export function ResumenDelViaje({ resumen }: Props) {
  if (!resumen) {
    return (
      <p role="status" className="rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 p-4">
        No encontramos el resumen de este viaje. Probá reabrirlo y cerrarlo de nuevo.
      </p>
    );
  }

  const { estadisticas, cotizacionesCierre } = resumen;
  const monto = (valor: number) => formatearMonto(valor, estadisticas.monedaBase);
  const redaccion = resumen.resumen ? partesDeResumen(resumen.resumen) : null;
  const { presupuesto } = estadisticas;

  return (
    <section aria-labelledby="titulo-resumen" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 id="titulo-resumen" className="text-2xl font-semibold tracking-tight">
          Resumen del viaje
        </h2>
        {redaccion ? (
          <>
            <p className="text-lg font-medium text-balance">{redaccion.titular}</p>
            {redaccion.puntos.length > 0 && (
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                {redaccion.puntos.map((punto) => (
                  <li key={punto}>{punto}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="flex items-start gap-2 rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 p-4">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            No pudimos generar el texto del resumen, pero los números están acá abajo.
          </p>
        )}
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Estadistica etiqueta="Total gastado" valor={monto(estadisticas.total)} />
        <Estadistica
          etiqueta="Gastos registrados"
          valor={String(estadisticas.cantidadGastos)}
        />
        <Estadistica
          etiqueta="Promedio por día"
          valor={monto(estadisticas.promedioPorDia)}
          detalle={`En ${estadisticas.diasDelViaje} ${estadisticas.diasDelViaje === 1 ? "día" : "días"} de viaje`}
        />
      </dl>

      {presupuesto && (
        <section aria-labelledby="titulo-planificado" className="flex flex-col gap-4">
          <h3 id="titulo-planificado" className="text-xl font-semibold tracking-tight">
            Planificado contra real
          </h3>
          <div className="flex flex-col gap-2 rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 p-4">
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span>
                Gastaste <strong className="tabular-nums">{monto(presupuesto.gastado)}</strong> de{" "}
                <strong className="tabular-nums">{monto(presupuesto.total)}</strong> presupuestados
              </span>
              <span className="tabular-nums">{formatearPorcentaje(presupuesto.porcentajeGastado)}</span>
            </p>
            <BarraProgreso porcentaje={presupuesto.porcentajeGastado} excedido={presupuesto.restante < 0} />
            <p className="text-sm">
              {presupuesto.restante >= 0
                ? `Te quedaron ${monto(presupuesto.restante)} del presupuesto.`
                : `Te pasaste ${monto(-presupuesto.restante)} del presupuesto.`}
            </p>
          </div>

          {presupuesto.porCategoria.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <caption className="sr-only">Presupuesto y gasto real por categoría</caption>
                <thead>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Categoría
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Planificado
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Real
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Diferencia
                    </th>
                    <th scope="col" className="py-2 pl-3 font-medium">
                      Avance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {presupuesto.porCategoria.map((fila) => (
                    <tr key={fila.categoria} className="border-b border-border align-middle">
                      <th scope="row" className="py-3 pr-3 font-medium">
                        {fila.categoria}
                      </th>
                      <td className="px-3 py-3 text-right tabular-nums">{monto(fila.presupuesto)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{monto(fila.gastado)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {fila.restante >= 0 ? `Quedan ${monto(fila.restante)}` : `Pasaste ${monto(-fila.restante)}`}
                      </td>
                      <td className="min-w-28 py-3 pl-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm tabular-nums">{formatearPorcentaje(fila.porcentajeGastado)}</span>
                          <BarraProgreso porcentaje={fila.porcentajeGastado} excedido={fila.restante < 0} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="titulo-categorias" className="flex flex-col gap-4">
        <h3 id="titulo-categorias" className="text-xl font-semibold tracking-tight">
          En qué se fue la plata
        </h3>
        <ul className="flex flex-col gap-4">
          {estadisticas.porCategoria.map((categoria) => (
            <li key={categoria.categoria} className="flex flex-col gap-1.5">
              <p className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-medium">{categoria.categoria}</span>
                <span className="tabular-nums">
                  {monto(categoria.total)} · {formatearPorcentaje(categoria.porcentajeDelTotal)}
                </span>
              </p>
              <BarraProgreso porcentaje={categoria.porcentajeDelTotal} />
              <p className="text-sm text-muted-foreground">
                {categoria.cantidad} {categoria.cantidad === 1 ? "gasto" : "gastos"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {estadisticas.gastosMasGrandes.length > 0 && (
        <section aria-labelledby="titulo-mayores" className="flex flex-col gap-4">
          <h3 id="titulo-mayores" className="text-xl font-semibold tracking-tight">
            Los gastos más grandes
          </h3>
          <ol className="flex flex-col gap-2">
            {estadisticas.gastosMasGrandes.map((gasto) => (
              <li
                key={gasto.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 px-4 py-3"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{gasto.descripcion}</span>
                  <span className="text-sm text-muted-foreground">
                    {gasto.categoria} · {formatearRangoFechas(gasto.fechaGasto, gasto.fechaGasto)}
                  </span>
                </span>
                <span className="flex flex-col items-end tabular-nums">
                  <span className="font-semibold">{monto(gasto.montoConvertido)}</span>
                  {gasto.monedaOriginal !== estadisticas.monedaBase && (
                    <span className="text-sm text-muted-foreground">
                      {formatearMonto(gasto.montoOriginal, gasto.monedaOriginal)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        Cotizaciones guardadas al cerrar el viaje: {formatearRangoFechas(cotizacionesCierre.fecha, cotizacionesCierre.fecha)}
        . Fuente: {cotizacionesCierre.fuente}.
        {cotizacionesCierre.desactualizada && " No se pudo consultar la cotización de hoy y se usó la última guardada."}
      </p>
    </section>
  );
}
