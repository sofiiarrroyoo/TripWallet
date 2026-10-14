import { z } from "zod";
import { ErrorNoEncontrado, ErrorValidacion } from "@/errores";
import * as repositorio from "@/repositorios/viajes";
import type { Viaje } from "@/tipos/viaje";
import { esquemaCrearViaje } from "@/validaciones/viajes";
import { validar } from "@/validaciones/validar";
import { esMonedaSoportada } from "./monedas";

export async function listarViajes(): Promise<Viaje[]> {
  return repositorio.listarViajes();
}

// Un id con formato inválido se trata igual que uno inexistente: así la base nunca recibe un uuid mal formado.
export async function obtenerViaje(id: string): Promise<Viaje> {
  if (!z.uuid().safeParse(id).success) throw new ErrorNoEncontrado("VIAJE");
  const viaje = await repositorio.obtenerViaje(id);
  if (!viaje) throw new ErrorNoEncontrado("VIAJE");
  return viaje;
}

export async function crearViaje(datos: unknown): Promise<Viaje> {
  const viaje = validar(esquemaCrearViaje, datos);
  if (!(await esMonedaSoportada(viaje.monedaBase))) {
    throw new ErrorValidacion(undefined, [
      { campo: "monedaBase", mensaje: "Elegí una moneda de la lista." },
    ]);
  }
  return repositorio.crearViaje(viaje);
}
