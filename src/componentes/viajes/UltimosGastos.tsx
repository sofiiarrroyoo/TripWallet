import { formatearFechaCorta, formatearMonto } from "@/lib/formatos";
import type { PanelViaje } from "@/tipos/panel";
import { SeccionPlegable } from "./SeccionPlegable";

export function UltimosGastos({ panel }: { panel: PanelViaje }) {
  return (
    <SeccionPlegable titulo="Últimos gastos">
      {panel.ultimosGastos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay gastos registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {panel.ultimosGastos.map((gasto) => (
            <li key={gasto.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{gasto.descripcion}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {gasto.categoria} · {formatearFechaCorta(gasto.fechaGasto)}
                </span>
              </div>
              <span className="text-sm font-medium">{formatearMonto(gasto.montoConvertido, panel.monedaBase)}</span>
            </li>
          ))}
        </ul>
      )}
    </SeccionPlegable>
  );
}
