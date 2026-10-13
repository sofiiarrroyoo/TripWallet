import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/tipos/supabase";
import { obtenerConfiguracionSupabase } from "./configuracion";
import { opcionesCookies } from "./opcionesCookies";

// Un cliente nuevo por pedido: lleva la sesión de ese usuario, y con ella la base aplica el RLS.
export async function crearClienteSupabase() {
  const almacenCookies = await cookies();
  const { url, clavePublica } = obtenerConfiguracionSupabase();

  return createServerClient<Database>(url, clavePublica, {
    cookieOptions: opcionesCookies,
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesNuevas) {
        try {
          for (const { name, value, options } of cookiesNuevas) {
            almacenCookies.set(name, value, options);
          }
        } catch {
          // Los Server Components no pueden escribir cookies; ahí la sesión la renueva el proxy.
        }
      },
    },
  });
}

export type ClienteSupabase = Awaited<ReturnType<typeof crearClienteSupabase>>;
