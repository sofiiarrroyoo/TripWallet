import { NextResponse, type NextRequest } from "next/server";
import { redireccionPara } from "@/lib/rutas";
// Excepción a "app → servicios → repositorios": renovar la sesión es infraestructura de HTTP (cookies del pedido
// y de la respuesta), no lógica de negocio, así que el proxy usa directo el cliente de Supabase.
import { actualizarSesion } from "@/repositorios/supabase/actualizarSesion";

export async function proxy(request: NextRequest) {
  const { respuesta, hayUsuario } = await actualizarSesion(request);

  const destino = redireccionPara(request.nextUrl.pathname, hayUsuario);
  if (!destino) return respuesta;

  const redireccion = NextResponse.redirect(new URL(destino, request.url));
  // Si se renovó el token, la redirección tiene que llevar las cookies nuevas.
  for (const cookie of respuesta.cookies.getAll()) redireccion.cookies.set(cookie);
  return redireccion;
}

export const config = {
  // Todo menos archivos estáticos: la API también pasa, para renovar la sesión, pero nunca se redirige.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
