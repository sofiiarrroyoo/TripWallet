import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/tipos/supabase";
import { obtenerConfiguracionSupabase } from "./configuracion";
import { opcionesCookies } from "./opcionesCookies";

export type SesionActualizada = { respuesta: NextResponse; hayUsuario: boolean };

// Versión del cliente para el proxy: lee las cookies del pedido y escribe las renovadas en la respuesta.
// Las páginas no pueden escribir cookies, así que si el token vence, el único lugar donde se renueva es acá.
export async function actualizarSesion(request: NextRequest): Promise<SesionActualizada> {
  const { url, clavePublica } = obtenerConfiguracionSupabase();
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, clavePublica, {
    cookieOptions: opcionesCookies,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesNuevas, headers) {
        // Se escriben en el pedido (para que las páginas de este mismo pedido vean el token nuevo)
        // y en la respuesta (para que el navegador lo guarde).
        for (const { name, value } of cookiesNuevas) request.cookies.set(name, value);
        respuesta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesNuevas) respuesta.cookies.set(name, value, options);
        // Headers anti-caché que manda la librería: una respuesta con cookies de sesión no se puede cachear
        // en un CDN, porque se le serviría a otro usuario.
        for (const [nombre, valor] of Object.entries(headers ?? {})) respuesta.headers.set(nombre, valor);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { respuesta, hayUsuario: data !== null };
}
