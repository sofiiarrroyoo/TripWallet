import type { AvanceDePresupuesto, GastoDelViaje, TotalPorCategoria } from "./resumen";

// Lo que muestra el panel lateral de la página del viaje.
export type PanelViaje = {
  monedaBase: string;
  gastado: number;
  cantidadGastos: number;
  presupuesto: AvanceDePresupuesto | null;
  // Cuántos días se usaron para el promedio.
  diasPromedio: number;
  promedioPorDia: number;
  porCategoria: TotalPorCategoria[];
  ultimosGastos: GastoDelViaje[];
};
