import { tool } from "ai";
import { z } from "zod";
import { type DetalleValidacion, ErrorApp, ErrorValidacion } from "@/errores";
import { crearCategoria, listarCategorias } from "@/servicios/categorias";
import { convertir } from "@/servicios/cotizaciones";
import { eliminarUltimoGasto, registrarGasto } from "@/servicios/gastos";
import { esquemaPedirDatos } from "@/validaciones/pedirDatos";

// Lo pone el servidor, no el modelo: la tool no tiene forma de trabajar sobre otro viaje.
const esquemaContexto = z.object({
  viajeId: z.string(),
  monedaBase: z.string(),
  // Fecha de hoy (AAAA-MM-DD) en la zona horaria de la persona.
  hoy: z.string(),
});

export type ContextoTools = z.infer<typeof esquemaContexto>;

export type ResultadoFallido = {
  ok: false;
  codigo: string;
  mensaje: string;
  detalles?: DetalleValidacion[];
  // Cuando la categoría no existe: las que sí se pueden usar.
  categoriasDisponibles?: string[];
};

// Las tools no lanzan: devuelven un resultado que describe la falla, para que el bot se la explique a la persona.
async function ejecutar<Datos extends object>(
  accion: () => Promise<Datos>,
): Promise<({ ok: true } & Datos) | ResultadoFallido> {
  try {
    return { ok: true, ...(await accion()) };
  } catch (error) {
    if (error instanceof ErrorApp) {
      const detalles = error instanceof ErrorValidacion && error.detalles.length > 0 ? error.detalles : undefined;
      return { ok: false, codigo: error.codigo, mensaje: error.message, ...(detalles && { detalles }) };
    }
    console.error("Error inesperado en una tool del chat", error);
    return { ok: false, codigo: "ERROR_INTERNO", mensaje: "No pude completar la acción por un problema interno." };
  }
}

async function nombresDeCategorias(): Promise<string[] | undefined> {
  try {
    return (await listarCategorias()).map((categoria) => categoria.nombre);
  } catch {
    return undefined;
  }
}

export const tools = {
  registrar_gasto: tool({
    description:
      "Registra un gasto del viaje cuando ya tenés todos los datos: monto, moneda, categoría y descripción " +
      "(y la fecha, si no fue hoy). Si falta o es ambiguo algún dato, no la llames: preguntá con pedir_datos. " +
      "El sistema convierte el monto a la moneda base del viaje; vos no calculás nada.",
    inputSchema: z.object({
      monto: z.number().describe('Monto como número, sin símbolos (ej. 15000 para "15 lucas").'),
      moneda: z.string().describe("Código de 3 letras de la moneda en que se pagó (ej. CLP, ARS, USD)."),
      categoria: z.string().describe("Nombre exacto de una de las categorías disponibles."),
      descripcion: z.string().describe('Descripción corta del gasto (ej. "Cena").'),
      fecha: z.string().optional().describe("Fecha del gasto en formato AAAA-MM-DD. Omitila si fue hoy."),
    }),
    contextSchema: esquemaContexto,
    execute: async (entrada, { context }) => {
      const resultado = await ejecutar(async () => ({
        gasto: await registrarGasto(context.viajeId, entrada, context.hoy),
      }));
      if (resultado.ok || resultado.codigo !== "CATEGORIA_NO_ENCONTRADO") return resultado;
      return { ...resultado, categoriasDisponibles: await nombresDeCategorias() };
    },
  }),

  convertir_moneda: tool({
    description:
      "Convierte un monto entre dos monedas con la cotización del día, solo para informar (no registra nada). " +
      "Si no se indica la moneda de destino, convierte a la moneda base del viaje. El resultado trae la " +
      "cotización, su fuente y su fecha: citalas al responder.",
    inputSchema: z.object({
      monto: z.number().describe("Monto a convertir, como número."),
      monedaOrigen: z.string().describe("Código de 3 letras de la moneda del monto (ej. USD)."),
      monedaDestino: z.string().optional().describe("Código de 3 letras de la moneda a la que convertir."),
    }),
    contextSchema: esquemaContexto,
    execute: ({ monto, monedaOrigen, monedaDestino }, { context }) =>
      ejecutar(async () => ({
        conversion: await convertir({
          monto,
          monedaOriginal: monedaOrigen,
          monedaBase: monedaDestino ?? context.monedaBase,
        }),
      })),
  }),

  eliminar_gasto: tool({
    description:
      "Elimina el último gasto registrado en el viaje. Usala solo si la persona pide borrar o deshacer el último " +
      "gasto; no hay forma de borrar otros desde el chat.",
    inputSchema: z.object({}),
    contextSchema: esquemaContexto,
    execute: (_entrada, { context }) =>
      ejecutar(async () => ({ gasto: await eliminarUltimoGasto(context.viajeId) })),
  }),

  crear_categoria: tool({
    description:
      "Crea una categoría propia. Llamala solo después de que la persona aceptó crearla (por ejemplo, eligió " +
      '"Sí, crearla" en una pregunta hecha con pedir_datos), nunca en el mismo turno en que la proponés.',
    inputSchema: z.object({ nombre: z.string().describe('Nombre de la nueva categoría (ej. "Souvenirs").') }),
    execute: ({ nombre }) => ejecutar(async () => ({ categoria: await crearCategoria({ nombre }) })),
  }),

  pedir_datos: tool({
    description:
      "Le hace una pregunta a la persona y le muestra opciones para tocar. Usala cuando falta un dato o algo es " +
      'ambiguo (ej. "pesos" sin aclarar cuáles, una categoría dudosa, confirmar la creación de una categoría). ' +
      "Escribí la pregunta solo acá, sin repetirla como texto. Después de llamarla no escribas nada más: esperá la respuesta.",
    inputSchema: esquemaPedirDatos,
    // La interfaz muestra la pregunta y las opciones a partir de los argumentos; no hay nada para ejecutar.
    execute: async () => ({ ok: true as const }),
  }),
};

// Las tools que necesitan saber en qué viaje trabajan.
export function contextoDeTools(contexto: ContextoTools) {
  return { registrar_gasto: contexto, convertir_moneda: contexto, eliminar_gasto: contexto };
}
