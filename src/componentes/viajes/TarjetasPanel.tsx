import type { ReactNode } from "react";
import { cn } from "cn";
import { formatearMonto, formatearPorcentaje } from "@/lib/formatos";
import type { PanelViaje } from "@/tipos/panel";
import { BarraProgreso } from "./BarraProgreso";

function Tarjeta({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-foreground/10", className)}>
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="flex flex-col gap-2">{children}</dd>
    </div>
  );
}

const MONTO = "text-2xl font-semibold tracking-tight";

// Gastado, cuánto queda del presupuesto y promedio por día. Los números vienen calculados por el servicio.
export function TarjetasPanel({ panel }: { panel: PanelViaje }) {
  const { presupuesto, monedaBase } = panel;
  const excedido = presupuesto !== null && presupuesto.restante < 0;

  return (
    <dl className="@container grid grid-cols-1 gap-3 @md:grid-cols-2">
      <Tarjeta etiqueta="Gastado" className="@md:col-span-2 bg-primary text-primary-foreground ring-0 [&_dt]:text-primary-foreground/80">
        <p className="text-4xl font-semibold tracking-tight">{formatearMonto(panel.gastado, monedaBase)}</p>
        <p className="text-sm text-primary-foreground/80">
          {panel.cantidadGastos === 1 ? "1 gasto registrado" : `${panel.cantidadGastos} gastos registrados`}
        </p>
      </Tarjeta>

      <Tarjeta etiqueta={excedido ? "Te pasaste" : "Te queda"}>
        {presupuesto ? (
          <>
            <p className={cn(MONTO, excedido && "text-destructive")}>
              {formatearMonto(Math.abs(presupuesto.restante), monedaBase)}
            </p>
            <BarraProgreso porcentaje={presupuesto.porcentajeGastado} excedido={excedido} />
            <p className="text-sm text-muted-foreground">
              {formatearPorcentaje(presupuesto.porcentajeGastado)} de {formatearMonto(presupuesto.total, monedaBase)}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Este viaje no tiene presupuesto.</p>
        )}
      </Tarjeta>

      <Tarjeta etiqueta="Promedio por día">
        <p className={MONTO}>{formatearMonto(panel.promedioPorDia, monedaBase)}</p>
        <p className="text-sm text-muted-foreground">
          En {panel.diasPromedio === 1 ? "1 día" : `${panel.diasPromedio} días`}
        </p>
      </Tarjeta>
    </dl>
  );
}
