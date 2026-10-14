import { exigirUsuario } from "@/servicios/autenticacion";
import { crearViaje, listarViajes } from "@/servicios/viajes";
import { leerCuerpoJson } from "../_utilidades/leerCuerpoJson";
import { respuestaError } from "../_utilidades/respuestaError";

// El proxy no redirige la API: sin sesión, cada endpoint responde 401 en vez de devolver una lista vacía del RLS.
export async function GET() {
  try {
    await exigirUsuario();
    return Response.json({ viajes: await listarViajes() });
  } catch (error) {
    return respuestaError(error);
  }
}

export async function POST(request: Request) {
  try {
    await exigirUsuario();
    const viaje = await crearViaje(await leerCuerpoJson(request));
    return Response.json({ viaje }, { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}
