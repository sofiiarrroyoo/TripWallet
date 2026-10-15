import { exigirUsuario } from "@/servicios/autenticacion";
import {
  cerrarViaje,
  obtenerResumenViaje,
  reabrirViaje,
} from "@/servicios/cierreViaje";
import { respuestaError } from "../../../_utilidades/respuestaError";

// Cerrar puede tardar: incluye una llamada al modelo para el resumen (con un límite de 20 s) y la consulta de cotizaciones.
export const maxDuration = 60;

// El cierre es un recurso del viaje: POST lo crea (cierra el viaje), DELETE lo borra (reabre el viaje) y GET lo lee.
// No pasan por el chat ni por el modelo como intermediario: los botones de la pantalla llaman directo acá.
export async function POST(
  _request: Request,
  contexto: RouteContext<"/api/viajes/[id]/cierre">,
) {
  try {
    await exigirUsuario();
    const { id } = await contexto.params;
    return Response.json({ resumen: await cerrarViaje(id) }, { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}

export async function DELETE(
  _request: Request,
  contexto: RouteContext<"/api/viajes/[id]/cierre">,
) {
  try {
    await exigirUsuario();
    const { id } = await contexto.params;
    await reabrirViaje(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return respuestaError(error);
  }
}

// null si el viaje está abierto.
export async function GET(
  _request: Request,
  contexto: RouteContext<"/api/viajes/[id]/cierre">,
) {
  try {
    await exigirUsuario();
    const { id } = await contexto.params;
    return Response.json({ resumen: await obtenerResumenViaje(id) });
  } catch (error) {
    return respuestaError(error);
  }
}
