import { registrar } from "@/servicios/autenticacion";
import { leerCuerpoJson } from "../../_utilidades/leerCuerpoJson";
import { respuestaError } from "../../_utilidades/respuestaError";

export async function POST(request: Request) {
  try {
    const usuario = await registrar(await leerCuerpoJson(request));
    return Response.json({ usuario }, { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}
