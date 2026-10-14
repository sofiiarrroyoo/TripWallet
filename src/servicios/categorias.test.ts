import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCategoriaDuplicada, ErrorNoEncontrado, ErrorValidacion } from "@/errores";
import * as repositorio from "@/repositorios/categorias";
import type { Categoria } from "@/tipos/categoria";
import { crearCategoria, listarCategorias, obtenerCategoriaPorNombre } from "./categorias";

vi.mock("@/repositorios/categorias");

const categorias: Categoria[] = [
  { id: "c-1", nombre: "Comida y bebida", esPorDefecto: true },
  { id: "c-2", nombre: "Comunicación", esPorDefecto: true },
  { id: "c-3", nombre: "Compras", esPorDefecto: true },
  { id: "c-4", nombre: "Souvenirs", esPorDefecto: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repositorio.listarCategorias).mockResolvedValue(categorias);
  vi.mocked(repositorio.crearCategoria).mockImplementation(async (nombre) => ({
    id: "c-nueva",
    nombre,
    esPorDefecto: false,
  }));
});

describe("listarCategorias", () => {
  it("devuelve las por defecto y las propias", async () => {
    await expect(listarCategorias()).resolves.toEqual(categorias);
  });
});

describe("obtenerCategoriaPorNombre", () => {
  it.each([
    ["Comida y bebida", "c-1"],
    ["COMIDA Y BEBIDA", "c-1"],
    ["  comida   y bebida ", "c-1"],
    ["comunicacion", "c-2"],
    ["souvenirs", "c-4"],
  ])("encuentra %j sin importar mayúsculas, tildes ni espacios", async (nombre, id) => {
    await expect(obtenerCategoriaPorNombre(nombre)).resolves.toMatchObject({ id });
  });

  it("lanza ErrorNoEncontrado si no existe", async () => {
    await expect(obtenerCategoriaPorNombre("Mascotas")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("no encuentra una categoría por una parte de su nombre", async () => {
    await expect(obtenerCategoriaPorNombre("Comida")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("rechaza un nombre vacío sin consultar la base", async () => {
    await expect(obtenerCategoriaPorNombre("   ")).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repositorio.listarCategorias).not.toHaveBeenCalled();
  });
});

describe("crearCategoria", () => {
  it("normaliza el nombre y crea la categoría", async () => {
    const creada = await crearCategoria({ nombre: "  Mascotas \t y  veterinaria " });

    expect(repositorio.crearCategoria).toHaveBeenCalledWith("Mascotas y veterinaria");
    expect(creada).toEqual({ id: "c-nueva", nombre: "Mascotas y veterinaria", esPorDefecto: false });
  });

  it.each(["compras", "COMPRAS", "Comunicacion", "souvenirs"])(
    "no crea %j porque ya existe una igual, sea por defecto o propia",
    async (nombre) => {
      const error = await crearCategoria({ nombre }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorCategoriaDuplicada);
      expect(repositorio.crearCategoria).not.toHaveBeenCalled();
    },
  );

  it("el error nombra la categoría que ya existe, con su escritura original", async () => {
    const error = await crearCategoria({ nombre: "comunicacion" }).catch((e: unknown) => e);

    expect((error as ErrorCategoriaDuplicada).nombre).toBe("Comunicación");
    expect((error as ErrorCategoriaDuplicada).message).toBe('Ya existe una categoría llamada "Comunicación".');
  });

  it.each([{}, { nombre: "" }, { nombre: "a".repeat(51) }, "Mascotas"])(
    "rechaza datos inválidos (%j) sin consultar la base",
    async (datos) => {
      await expect(crearCategoria(datos)).rejects.toBeInstanceOf(ErrorValidacion);
      expect(repositorio.listarCategorias).not.toHaveBeenCalled();
    },
  );
});
