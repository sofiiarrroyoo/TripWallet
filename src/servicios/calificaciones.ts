import { z } from "zod";
import { ErrorNoEncontrado } from "@/errores";
import * as repositorio from "@/repositorios/calificaciones";
import * as repositorioMensajes from "@/repositorios/mensajes";
import { esquemaCalificar } from "@/validaciones/calificaciones";
import { validar } from "@/validaciones/validar";
import { obtenerViaje } from "./viajes";

// Solo se califican las respuestas del bot de un viaje propio. Si el mensaje no existe, es del usuario o es de otro
// viaje, responde "no encontrado": no confirma que exista. Calificar de nuevo cambia el valor anterior.
// Se puede calificar también en un viaje cerrado: es una opinión sobre la respuesta, no modifica gastos.
export async function calificarRespuesta(viajeId: string, mensajeId: string, datos: unknown): Promise<void> {
  const { valor } = validar(esquemaCalificar, datos);
  if (!z.uuid().safeParse(mensajeId).success) throw new ErrorNoEncontrado("MENSAJE");

  const viaje = await obtenerViaje(viajeId);
  const mensaje = await repositorioMensajes.obtenerMensaje(viaje.id, mensajeId);
  if (!mensaje || mensaje.rol !== "assistant") throw new ErrorNoEncontrado("MENSAJE");

  await repositorio.guardarCalificacion(mensaje.id, valor);
}
