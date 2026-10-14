import { ErrorValidacion } from "@/errores";

// Exigir application/json también protege contra CSRF: un formulario de otro sitio solo puede mandar
// text/plain, form-urlencoded o multipart sin pasar por el preflight de CORS, que el navegador bloquea.
export async function leerCuerpoJson(request: Request): Promise<unknown> {
  const tipoContenido = request.headers.get("content-type") ?? "";
  if (!tipoContenido.toLowerCase().startsWith("application/json")) {
    throw new ErrorValidacion("El pedido tiene que enviarse como JSON.");
  }

  try {
    return await request.json();
  } catch {
    throw new ErrorValidacion("El cuerpo del pedido no es un JSON válido.");
  }
}
