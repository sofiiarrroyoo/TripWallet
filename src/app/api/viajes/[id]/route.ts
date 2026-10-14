import { exigirUsuario } from "@/servicios/autenticacion";
import { obtenerViaje } from "@/servicios/viajes";
import { respuestaError } from "../../_utilidades/respuestaError";

// Un viaje de otro usuario responde 404 igual que uno inexistente: el RLS no lo devuelve.
export async function GET(_request: Request, contexto: RouteContext<"/api/viajes/[id]">) {
  try {
    await exigirUsuario();
    const { id } = await contexto.params;
    return Response.json({ viaje: await obtenerViaje(id) });
  } catch (error) {
    return respuestaError(error);
  }
}
