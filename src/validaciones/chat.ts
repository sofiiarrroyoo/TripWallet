import { z } from "zod";

export const MAXIMO_CARACTERES_MENSAJE = 1000;

function esZonaHorariaValida(zonaHoraria: string): boolean {
  try {
    new Intl.DateTimeFormat("es", { timeZone: zonaHoraria });
    return true;
  } catch {
    return false;
  }
}

const zonaHoraria = z
  .string("Falta la zona horaria.")
  .refine(esZonaHorariaValida, "La zona horaria no es válida.");

const texto = z
  .string("Escribí un mensaje.")
  .trim()
  .min(1, "Escribí un mensaje.")
  .max(MAXIMO_CARACTERES_MENSAJE, `El mensaje puede tener hasta ${MAXIMO_CARACTERES_MENSAJE} caracteres.`);

// "enviar" es un mensaje nuevo; "reintentar" vuelve a pedir la respuesta del último mensaje, que quedó sin
// contestar. El navegador nunca manda el historial ni el viaje: el servidor los saca de la base.
export const esquemaPedidoChat = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("enviar"), texto, zonaHoraria }),
  z.object({ accion: z.literal("reintentar"), zonaHoraria }),
]);

export type PedidoChat = z.infer<typeof esquemaPedidoChat>;
