import { createUIMessageStreamResponse } from "ai";
import { exigirUsuario } from "@/servicios/autenticacion";
import { responderMensaje } from "@/servicios/chat";
import { leerCuerpoJson } from "../../../_utilidades/leerCuerpoJson";
import { respuestaError } from "../../../_utilidades/respuestaError";

// Igual que el timeout total de la llamada al modelo.
export const maxDuration = 60;

// El viaje sale de la URL y lo verifica el servicio: el modelo nunca decide en qué viaje se trabaja.
// Los errores previos al stream (validación, límite, viaje ajeno) responden JSON con su status; una vez
// que empieza el stream, los errores viajan dentro del stream.
export async function POST(request: Request, contexto: RouteContext<"/api/viajes/[id]/chat">) {
  try {
    await exigirUsuario();
    const { id } = await contexto.params;
    const stream = await responderMensaje(id, await leerCuerpoJson(request), request.signal);
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    return respuestaError(error);
  }
}
