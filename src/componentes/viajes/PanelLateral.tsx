import type { PanelViaje } from "@/tipos/panel";
import { DonaCategorias } from "./DonaCategorias";
import { PanelColapsable } from "./PanelEstadisticas";
import { TarjetasPanel } from "./TarjetasPanel";
import { UltimosGastos } from "./UltimosGastos";

// Estadísticas del viaje: columna al costado del chat en escritorio, hoja que se abre desde la barra en celular.
export function PanelLateral({ panel }: { panel: PanelViaje }) {
  return (
    <PanelColapsable>
      <div className="grid items-start gap-6 @3xl:grid-cols-2">
        <div className="@3xl:col-span-2">
          <TarjetasPanel panel={panel} />
        </div>
        <DonaCategorias panel={panel} />
        <UltimosGastos panel={panel} />
      </div>
    </PanelColapsable>
  );
}
