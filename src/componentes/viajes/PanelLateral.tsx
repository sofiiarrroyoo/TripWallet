import type { ReactNode } from "react";
import type { PanelViaje } from "@/tipos/panel";
import { DonaCategorias } from "./DonaCategorias";
import { ContenedorPanel } from "./PanelEstadisticas";
import { TarjetasPanel } from "./TarjetasPanel";
import { UltimosGastos } from "./UltimosGastos";

// Estadísticas del viaje: columna al costado del chat en escritorio y, en celular, una hoja que se abre desde la barra.
export function PanelLateral({ panel, resumen }: { panel: PanelViaje; resumen?: ReactNode }) {
  return (
    <ContenedorPanel>
      <div className="grid items-start gap-6 @3xl:grid-cols-2">
        {resumen && <div className="@3xl:col-span-2">{resumen}</div>}
        <div className="@3xl:col-span-2">
          <TarjetasPanel panel={panel} />
        </div>
        <DonaCategorias panel={panel} />
        <UltimosGastos panel={panel} />
      </div>
    </ContenedorPanel>
  );
}
