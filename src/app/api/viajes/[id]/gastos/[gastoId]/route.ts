import { exigirUsuario } from "@/servicios/autenticacion";
import { eliminarGasto } from "@/servicios/gastos";
import { respuestaError } from "../../../../_utilidades/respuestaError";

// Lo usa el botón "Deshacer" de la tarjeta del chat: no pasa por el modelo.
export async function DELETE(_request: Request, contexto: RouteContext<"/api/viajes/[id]/gastos/[gastoId]">) {
  try {
    await exigirUsuario();
    const { id, gastoId } = await contexto.params;
    await eliminarGasto(id, gastoId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return respuestaError(error);
  }
}
