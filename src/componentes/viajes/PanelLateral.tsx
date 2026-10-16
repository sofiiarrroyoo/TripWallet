import type { PanelViaje } from "@/tipos/panel";
import { DonaCategorias } from "./DonaCategorias";
import { TarjetasPanel } from "./TarjetasPanel";
import { UltimosGastos } from "./UltimosGastos";

// Panel de la vista de escritorio: en el celular solo se ve el chat.
export function PanelLateral({ panel }: { panel: PanelViaje }) {
  return (
    <aside
      aria-label="Resumen del viaje"
      className="@container hidden min-w-[26rem] flex-[9] overflow-y-auto border-l bg-secondary/60 p-6 lg:block"
    >
      <div className="grid items-start gap-6 @3xl:grid-cols-2">
        <div className="@3xl:col-span-2">
          <TarjetasPanel panel={panel} />
        </div>
        <DonaCategorias panel={panel} />
        <UltimosGastos panel={panel} />
      </div>
    </aside>
  );
}
