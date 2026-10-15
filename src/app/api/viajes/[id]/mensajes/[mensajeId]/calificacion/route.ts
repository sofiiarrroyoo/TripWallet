import { exigirUsuario } from "@/servicios/autenticacion";
import { calificarRespuesta } from "@/servicios/calificaciones";
import { leerCuerpoJson } from "../../../../../_utilidades/leerCuerpoJson";
import { respuestaError } from "../../../../../_utilidades/respuestaError";

// Lo usan los botones de pulgar de cada respuesta del bot. PUT porque es idempotente: calificar de nuevo
// reemplaza la calificación anterior.
export async function PUT(
  request: Request,
  contexto: RouteContext<"/api/viajes/[id]/mensajes/[mensajeId]/calificacion">,
) {
  try {
    await exigirUsuario();
    const { id, mensajeId } = await contexto.params;
    await calificarRespuesta(id, mensajeId, await leerCuerpoJson(request));
    return new Response(null, { status: 204 });
  } catch (error) {
    return respuestaError(error);
  }
}
