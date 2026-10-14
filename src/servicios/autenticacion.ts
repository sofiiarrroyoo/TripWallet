import { ErrorNoAutenticado } from "@/errores";
import * as repositorio from "@/repositorios/autenticacion";
import type { Usuario } from "@/tipos/usuario";
import { esquemaInicioSesion, esquemaRegistro } from "@/validaciones/autenticacion";
import { validar } from "@/validaciones/validar";

// Reciben unknown y validan acá: el servicio no confía en quien lo llama.
export async function registrar(datos: unknown): Promise<Usuario> {
  return repositorio.registrarUsuario(validar(esquemaRegistro, datos));
}

export async function iniciarSesion(datos: unknown): Promise<Usuario> {
  return repositorio.iniciarSesion(validar(esquemaInicioSesion, datos));
}

export async function cerrarSesion(): Promise<void> {
  await repositorio.cerrarSesion();
}

export async function obtenerUsuarioActual(): Promise<Usuario | null> {
  return repositorio.obtenerUsuarioActual();
}

export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await repositorio.obtenerUsuarioActual();
  if (!usuario) throw new ErrorNoAutenticado();
  return usuario;
}
