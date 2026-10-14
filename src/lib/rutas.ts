export const RUTA_INGRESAR = "/ingresar";
export const RUTA_REGISTRO = "/registro";
export const RUTA_INICIO_PRIVADO = "/viajes";
export const RUTA_NUEVO_VIAJE = "/viajes/nuevo";

export function rutaViaje(id: string): string {
  return `/viajes/${encodeURIComponent(id)}`;
}

const RUTAS_DE_AUTENTICACION = [RUTA_INGRESAR, RUTA_REGISTRO];

function coincide(ruta: string, base: string): boolean {
  return ruta === base || ruta.startsWith(`${base}/`);
}

// Las páginas son privadas por defecto: una página nueva queda protegida aunque nadie se acuerde de agregarla.
// Devuelve a dónde redirigir, o null si la página se puede mostrar.
export function redireccionPara(ruta: string, hayUsuario: boolean): string | null {
  if (coincide(ruta, "/api")) return null;
  if (ruta === "/") return hayUsuario ? RUTA_INICIO_PRIVADO : RUTA_INGRESAR;

  const esDeAutenticacion = RUTAS_DE_AUTENTICACION.some((base) => coincide(ruta, base));
  if (esDeAutenticacion) return hayUsuario ? RUTA_INICIO_PRIVADO : null;

  return hayUsuario ? null : RUTA_INGRESAR;
}
