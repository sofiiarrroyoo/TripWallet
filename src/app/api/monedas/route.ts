import { exigirUsuario } from "@/servicios/autenticacion";
import { listarMonedas } from "@/servicios/monedas";
import { respuestaError } from "../_utilidades/respuestaError";

export async function GET() {
  try {
    await exigirUsuario();
    return Response.json({ monedas: await listarMonedas() });
  } catch (error) {
    return respuestaError(error);
  }
}
