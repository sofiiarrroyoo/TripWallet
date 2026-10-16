import type { PanelViaje } from "@/tipos/panel";
import { DonaCategorias } from "./DonaCategorias";
import { TarjetasPanel } from "./TarjetasPanel";
import { UltimosGastos } from "./UltimosGastos";

// Panel de la vista de escritorio: en el celular solo se ve el chat.
export function PanelLateral({ panel }: { panel: PanelViaje }) {
  return (
    <aside
      aria-label="Resumen del viaje"
      className="hidden w-[24rem] shrink-0 flex-col gap-6 overflow-y-auto border-l bg-secondary/60 p-6 lg:flex"
    >
      <TarjetasPanel panel={panel} />
      <DonaCategorias panel={panel} />
      <UltimosGastos panel={panel} />
    </aside>
  );
}
