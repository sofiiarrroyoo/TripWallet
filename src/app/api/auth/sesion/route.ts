import { cerrarSesion, iniciarSesion } from "@/servicios/autenticacion";
import { leerCuerpoJson } from "../../_utilidades/leerCuerpoJson";
import { respuestaError } from "../../_utilidades/respuestaError";

export async function POST(request: Request) {
  try {
    const usuario = await iniciarSesion(await leerCuerpoJson(request));
    return Response.json({ usuario });
  } catch (error) {
    return respuestaError(error);
  }
}

export async function DELETE() {
  try {
    await cerrarSesion();
    return new Response(null, { status: 204 });
  } catch (error) {
    return respuestaError(error);
  }
}
