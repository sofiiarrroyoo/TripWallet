export type EstadoViaje = "abierto" | "cerrado";

export type Viaje = {
  id: string;
  nombre: string;
  destino: string;
  monedaBase: string;
  fechaInicio: string;
  fechaFin: string;
  presupuestoTotal: number | null;
  estado: EstadoViaje;
  creadoEn: string;
};
