import { MAXIMO_CARACTERES_MENSAJE } from "@/validaciones/chat";

// El contador aparece cerca del límite, no desde el primer carácter.
export const UMBRAL_CONTADOR = 800;

export type EstadoContador = {
  caracteres: number;
  visible: boolean;
  excedido: boolean;
  // Texto para lectores de pantalla. Cambia solo al cruzar un umbral, así no se lee con cada tecla.
  aviso: string;
};

// Se cuenta el texto recortado, igual que hace el servidor.
export function estadoContador(texto: string): EstadoContador {
  const caracteres = texto.trim().length;
  const restantes = MAXIMO_CARACTERES_MENSAJE - caracteres;
  const excedido = restantes < 0;

  let aviso = "";
  if (excedido) aviso = `Superaste el límite de ${MAXIMO_CARACTERES_MENSAJE} caracteres.`;
  else if (restantes <= 100) aviso = "Te quedan menos de 100 caracteres.";
  else if (restantes <= 200) aviso = "Te quedan menos de 200 caracteres.";

  return { caracteres, visible: caracteres >= UMBRAL_CONTADOR, excedido, aviso };
}
