import { z } from "zod";
import { ErrorNoEncontrado, ErrorValidacion, ErrorViajeCerrado } from "@/errores";
import * as repositorio from "@/repositorios/gastos";
import type { GastoRegistrado } from "@/tipos/gasto";
import { esquemaRegistrarGasto } from "@/validaciones/gastos";
import { validar } from "@/validaciones/validar";
import { obtenerCategoriaPorNombre } from "./categorias";
import { convertir } from "./cotizaciones";
import { obtenerViaje } from "./viajes";

// Recibe lo que propone el bot y se encarga de todo lo demás: valida, comprueba que el viaje sea del usuario y esté
// abierto, resuelve la categoría, convierte a la moneda base con la cotización del día y guarda. Los números los
// calcula el código; el bot no interviene.
// `hoy` es la fecha de hoy (AAAA-MM-DD) en la zona horaria de la persona: es la fecha por defecto del gasto.
export async function registrarGasto(viajeId: string, datos: unknown, hoy: string): Promise<GastoRegistrado> {
  const gasto = validar(esquemaRegistrarGasto, datos);

  const fechaGasto = gasto.fecha ?? hoy;
  if (fechaGasto > hoy) {
    throw new ErrorValidacion(undefined, [{ campo: "fecha", mensaje: "La fecha del gasto no puede ser futura." }]);
  }

  const viaje = await obtenerViaje(viajeId);
  if (viaje.estado === "cerrado") throw new ErrorViajeCerrado();

  const categoria = await obtenerCategoriaPorNombre(gasto.categoria);
  const conversion = await convertir({
    monto: gasto.monto,
    monedaOriginal: gasto.moneda,
    monedaBase: viaje.monedaBase,
  });

  const guardado = await repositorio.crearGasto({
    viajeId: viaje.id,
    montoOriginal: conversion.montoOriginal,
    monedaOriginal: conversion.monedaOriginal,
    montoConvertido: conversion.montoConvertido,
    cotizacion: conversion.cotizacion,
    fechaCotizacion: conversion.fechaCotizacion,
    categoriaId: categoria.id,
    descripcion: gasto.descripcion,
    fechaGasto,
  });

  return {
    id: guardado.id,
    descripcion: guardado.descripcion,
    categoria: categoria.nombre,
    fechaGasto: guardado.fechaGasto,
    montoOriginal: guardado.montoOriginal,
    monedaOriginal: guardado.monedaOriginal,
    montoConvertido: guardado.montoConvertido,
    monedaBase: viaje.monedaBase,
    cotizacion: guardado.cotizacion,
    fechaCotizacion: guardado.fechaCotizacion,
    fuente: conversion.fuente,
    aviso: conversion.aviso,
  };
}

// Lo que el bot necesita para confirmar qué se borró.
export type GastoEliminado = Pick<
  GastoRegistrado,
  "id" | "descripcion" | "fechaGasto" | "montoOriginal" | "monedaOriginal" | "montoConvertido" | "monedaBase"
>;

// "Borrá el último gasto". El bot no conoce los ids de los gastos anteriores (su historial es solo texto), así que
// desde el chat solo se puede borrar el más reciente; el resto se deshace con el botón de la tarjeta.
export async function eliminarUltimoGasto(viajeId: string): Promise<GastoEliminado> {
  const viaje = await obtenerViaje(viajeId);
  if (viaje.estado === "cerrado") throw new ErrorViajeCerrado();

  const ultimo = await repositorio.obtenerUltimoGasto(viaje.id);
  if (!ultimo) throw new ErrorNoEncontrado("GASTO");

  const borrado = await repositorio.eliminarGasto(viaje.id, ultimo.id);
  if (!borrado) throw new ErrorNoEncontrado("GASTO");

  return {
    id: ultimo.id,
    descripcion: ultimo.descripcion,
    fechaGasto: ultimo.fechaGasto,
    montoOriginal: ultimo.montoOriginal,
    monedaOriginal: ultimo.monedaOriginal,
    montoConvertido: ultimo.montoConvertido,
    monedaBase: viaje.monedaBase,
  };
}

// La base no distingue "el gasto no existe" de "el viaje está cerrado" al borrar (el RLS esconde la fila), así que
// el estado del viaje se comprueba acá.
export async function eliminarGasto(viajeId: string, gastoId: string): Promise<void> {
  if (!z.uuid().safeParse(gastoId).success) throw new ErrorNoEncontrado("GASTO");

  const viaje = await obtenerViaje(viajeId);
  if (viaje.estado === "cerrado") throw new ErrorViajeCerrado();

  const borrado = await repositorio.eliminarGasto(viaje.id, gastoId);
  if (!borrado) throw new ErrorNoEncontrado("GASTO");
}
