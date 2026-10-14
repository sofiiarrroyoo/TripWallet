import type { AuthError, User } from "@supabase/supabase-js";
import {
  ErrorCredencialesInvalidas,
  ErrorEmailYaRegistrado,
  ErrorLimiteExcedido,
  ErrorValidacion,
} from "@/errores";
import type { Usuario } from "@/tipos/usuario";
import type { DatosInicioSesion, DatosRegistro } from "@/validaciones/autenticacion";
import { crearClienteSupabase } from "./supabase/clienteServidor";

// Supabase no informa cuánto esperar ante su propio rate limit; un minuto es un valor prudente.
const SEGUNDOS_ESPERA_LIMITE_AUTH = 60;

function traducirErrorAuth(error: AuthError): Error {
  switch (error.code) {
    case "invalid_credentials":
      return new ErrorCredencialesInvalidas();
    case "user_already_exists":
    case "email_exists":
      return new ErrorEmailYaRegistrado();
    case "weak_password":
      return new ErrorValidacion("La contraseña es demasiado débil.", [
        { campo: "contrasena", mensaje: "Probá con una contraseña más larga o menos común." },
      ]);
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return new ErrorLimiteExcedido(
        SEGUNDOS_ESPERA_LIMITE_AUTH,
        "Hubo demasiados intentos seguidos. Esperá un minuto y volvé a intentar.",
      );
    default:
      return error;
  }
}

function aUsuario(usuario: User): Usuario {
  return { id: usuario.id, email: usuario.email ?? "" };
}

export async function registrarUsuario({ email, contrasena }: DatosRegistro): Promise<Usuario> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password: contrasena });
  if (error) throw traducirErrorAuth(error);

  // Con la confirmación de email activada, Supabase no devuelve sesión (ni error si el email ya existe).
  if (!data.user || !data.session) {
    throw new Error("Supabase no devolvió sesión al registrar: revisar que la confirmación de email esté desactivada.");
  }
  return aUsuario(data.user);
}

export async function iniciarSesion({ email, contrasena }: DatosInicioSesion): Promise<Usuario> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: contrasena });
  if (error) throw traducirErrorAuth(error);
  return aUsuario(data.user);
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteSupabase();
  // local: cierra la sesión de este dispositivo, no las del usuario en otros.
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}

// getClaims verifica la firma del token; getSession solo leería la cookie sin verificarla.
export async function obtenerUsuarioActual(): Promise<Usuario | null> {
  const supabase = await crearClienteSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data) return null;
  return { id: data.claims.sub, email: data.claims.email ?? "" };
}
