import { ErrorCotizacionNoDisponible, ErrorValidacion } from "@/errores";
import { obtenerTasas } from "@/integraciones/apiCotizaciones";
import { formatearRangoFechas } from "@/lib/formatos";
import { redondearADiezDecimales, redondearADosDecimales } from "@/lib/numeros";
import * as repositorio from "@/repositorios/cotizaciones";
import type { CotizacionGuardada } from "@/tipos/cotizacion";
import { esquemaConversion } from "@/validaciones/cotizaciones";
import { validar } from "@/validaciones/validar";

export type TasasDelDia = {
  monedaBase: string;
  // Unidades de cada moneda por una unidad de la moneda base.
  tasas: Record<string, number>;
  fecha: string;
  fuente: string;
  // true si la API no respondió y se usó la última cotización guardada, que no es de hoy.
  desactualizada: boolean;
};

export type Conversion = {
  montoOriginal: number;
  monedaOriginal: string;
  montoConvertido: number;
  monedaBase: string;
  // Unidades de moneda base por una unidad de moneda original (1 si son la misma moneda).
  cotizacion: number;
  fechaCotizacion: string;
  fuente: string | null;
  // Para mostrarle a la persona cuando la cotización no es la de hoy.
  aviso: string | null;
};

function fechaDeHoyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function desdeGuardada(guardada: CotizacionGuardada, desactualizada: boolean): TasasDelDia {
  return {
    monedaBase: guardada.monedaBase,
    tasas: guardada.tasas,
    fecha: guardada.fecha,
    fuente: guardada.fuente,
    desactualizada,
  };
}

// Caché diaria por usuario y moneda base: la API actualiza una vez por día, así que si la guardada ya es de hoy no
// se vuelve a consultar. Si la API falla se usa la última guardada, avisando; si no hay ninguna, se informa.
export async function obtenerTasasDelDia(monedaBase: string): Promise<TasasDelDia> {
  const guardada = await repositorio.obtenerUltimaCotizacion(monedaBase);
  if (guardada?.fecha === fechaDeHoyUtc()) return desdeGuardada(guardada, false);

  try {
    const tasas = await obtenerTasas(monedaBase);
    try {
      await repositorio.guardarCotizacion({
        monedaBase,
        fecha: tasas.fecha,
        tasas: tasas.tasas,
        fuente: tasas.fuente,
      });
    } catch (error) {
      // No poder guardar la caché no impide convertir con las tasas que ya se tienen.
      console.warn("No se pudo guardar la cotización en la caché", error);
    }
    return { monedaBase, tasas: tasas.tasas, fecha: tasas.fecha, fuente: tasas.fuente, desactualizada: false };
  } catch (error) {
    if (!(error instanceof ErrorCotizacionNoDisponible) || !guardada) throw error;
    console.warn("La API de cotizaciones no respondió: se usa la última cotización guardada", error.cause);
    return desdeGuardada(guardada, true);
  }
}

// Reciben unknown y validan acá: el servicio no confía en quien lo llama (por ejemplo, las tools del bot).
// monto_convertido = monto_original × cotización guardada, así cada número se puede verificar con los datos del gasto.
export async function convertir(datos: unknown): Promise<Conversion> {
  const { monto, monedaOriginal, monedaBase } = validar(esquemaConversion, datos);

  if (monedaOriginal === monedaBase) {
    return {
      montoOriginal: monto,
      monedaOriginal,
      montoConvertido: monto,
      monedaBase,
      cotizacion: 1,
      fechaCotizacion: fechaDeHoyUtc(),
      fuente: null,
      aviso: null,
    };
  }

  const del = await obtenerTasasDelDia(monedaBase);
  const tasa = del.tasas[monedaOriginal];
  if (tasa === undefined) {
    throw new ErrorValidacion(undefined, [
      { campo: "monedaOriginal", mensaje: `No tengo cotización para ${monedaOriginal}.` },
    ]);
  }

  const cotizacion = redondearADiezDecimales(1 / tasa);
  return {
    montoOriginal: monto,
    monedaOriginal,
    montoConvertido: redondearADosDecimales(monto * cotizacion),
    monedaBase,
    cotizacion,
    fechaCotizacion: del.fecha,
    fuente: del.fuente,
    aviso: del.desactualizada
      ? `Usé la cotización del ${formatearRangoFechas(del.fecha, del.fecha)} porque no pude consultar la de hoy.`
      : null,
  };
}
