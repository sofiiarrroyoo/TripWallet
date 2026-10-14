import { ErrorCotizacionNoDisponible } from "@/errores";
import { obtenerTasas } from "@/integraciones/apiCotizaciones";
import type { ListaMonedas, Moneda } from "@/tipos/moneda";
import { CODIGOS_ISO_4217 } from "./monedasRespaldo";

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

function aMonedasOrdenadas(codigos: readonly string[]): Moneda[] {
  return codigos
    .map((codigo) => ({ codigo, nombre: nombreDeMoneda(codigo) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// Si la API no responde se usa la lista ISO 4217 del proyecto, para que se pueda crear el viaje igual.
export async function listarMonedas(): Promise<ListaMonedas> {
  try {
    const { tasas } = await obtenerTasas(MONEDA_REFERENCIA, { revalidarCadaSegundos: SEGUNDOS_EN_UN_DIA });
    return { monedas: aMonedasOrdenadas(Object.keys(tasas)), fuente: "api" };
  } catch (error) {
    if (!(error instanceof ErrorCotizacionNoDisponible)) throw error;
    console.warn("Lista de monedas de respaldo: la API de cotizaciones no respondió.", error.cause);
    return { monedas: aMonedasOrdenadas(CODIGOS_ISO_4217), fuente: "respaldo" };
  }
}

export async function esMonedaSoportada(codigo: string): Promise<boolean> {
  const { monedas } = await listarMonedas();
  return monedas.some((moneda) => moneda.codigo === codigo);
}
