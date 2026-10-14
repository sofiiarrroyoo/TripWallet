import { ErrorCategoriaDuplicada, ErrorNoEncontrado } from "@/errores";
import { normalizarParaBuscar } from "@/lib/texto";
import * as repositorio from "@/repositorios/categorias";
import type { Categoria } from "@/tipos/categoria";
import { esquemaCrearCategoria, nombreCategoria } from "@/validaciones/categorias";
import { validar } from "@/validaciones/validar";

export async function listarCategorias(): Promise<Categoria[]> {
  return repositorio.listarCategorias();
}

function buscarPorNombre(categorias: Categoria[], nombre: string): Categoria | undefined {
  const buscada = normalizarParaBuscar(nombre);
  return categorias.find((categoria) => normalizarParaBuscar(categoria.nombre) === buscada);
}

// Sin distinguir mayúsculas ni tildes: "comunicacion" encuentra "Comunicación".
export async function obtenerCategoriaPorNombre(nombre: unknown): Promise<Categoria> {
  const nombreNormalizado = validar(nombreCategoria, nombre);
  const categoria = buscarPorNombre(await repositorio.listarCategorias(), nombreNormalizado);
  if (!categoria) throw new ErrorNoEncontrado("CATEGORIA");
  return categoria;
}

// Se compara contra las por defecto y las propias antes de crear, para no tener "Comida" y "Comidas" ni dos
// "Compras". La base solo atrapa duplicados entre las propias; este chequeo es el que mira las por defecto.
export async function crearCategoria(datos: unknown): Promise<Categoria> {
  const { nombre } = validar(esquemaCrearCategoria, datos);

  const existente = buscarPorNombre(await repositorio.listarCategorias(), nombre);
  if (existente) throw new ErrorCategoriaDuplicada(existente.nombre);

  return repositorio.crearCategoria(nombre);
}
