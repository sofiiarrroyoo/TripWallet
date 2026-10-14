import { ErrorCotizacionNoDisponible } from "@/errores";
import { obtenerTasas } from "@/integraciones/apiCotizaciones";
import type { Moneda } from "@/tipos/moneda";

// La lista de monedas soportadas son las claves de las tasas: da igual contra qué moneda se pidan.
const MONEDA_REFERENCIA = "USD";
// La API actualiza una vez por día; Next reutiliza la respuesta en su caché del servidor hasta entonces.
const SEGUNDOS_EN_UN_DIA = 86_400;

const nombresDeMonedas = new Intl.DisplayNames(["es"], { type: "currency" });

function nombreDeMoneda(codigo: string): string {
  const nombre = nombresDeMonedas.of(codigo);
  if (!nombre || nombre === codigo) return codigo;
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export async function listarMonedas(): Promise<Moneda[]> {
  try {
    const { tasas } = await obtenerTasas(MONEDA_REFERENCIA, { revalidarCadaSegundos: SEGUNDOS_EN_UN_DIA });
    return Object.keys(tasas)
      .map((codigo) => ({ codigo, nombre: nombreDeMoneda(codigo) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  } catch (error) {
    if (!(error instanceof ErrorCotizacionNoDisponible)) throw error;
    throw new ErrorCotizacionNoDisponible(
      "No pudimos cargar la lista de monedas. Probá de nuevo en unos minutos.",
      { cause: error },
    );
  }
}

export async function esMonedaSoportada(codigo: string): Promise<boolean> {
  const monedas = await listarMonedas();
  return monedas.some((moneda) => moneda.codigo === codigo);
}
