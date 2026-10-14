import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorNoAutenticado, ErrorValidacion } from "@/errores";
import * as repositorio from "@/repositorios/autenticacion";
import { exigirUsuario, iniciarSesion, registrar } from "./autenticacion";

vi.mock("@/repositorios/autenticacion");

const usuario = { id: "id-1", email: "sofia@ejemplo.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registrar", () => {
  it("valida y normaliza los datos antes de pasarlos al repositorio", async () => {
    vi.mocked(repositorio.registrarUsuario).mockResolvedValue(usuario);

    await registrar({ email: " Sofia@Ejemplo.com ", contrasena: "12345678" });

    expect(repositorio.registrarUsuario).toHaveBeenCalledWith({
      email: "sofia@ejemplo.com",
      contrasena: "12345678",
    });
  });

  it("no llama al repositorio si los datos son inválidos", async () => {
    await expect(registrar({ email: "sofia@", contrasena: "corta" })).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repositorio.registrarUsuario).not.toHaveBeenCalled();
  });
});

describe("iniciarSesion", () => {
  it("rechaza un cuerpo que no es un objeto sin llamar al repositorio", async () => {
    await expect(iniciarSesion("no soy un objeto")).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repositorio.iniciarSesion).not.toHaveBeenCalled();
  });
});

describe("exigirUsuario", () => {
  it("devuelve el usuario si hay sesión", async () => {
    vi.mocked(repositorio.obtenerUsuarioActual).mockResolvedValue(usuario);

    await expect(exigirUsuario()).resolves.toEqual(usuario);
  });

  it("lanza ErrorNoAutenticado si no hay sesión", async () => {
    vi.mocked(repositorio.obtenerUsuarioActual).mockResolvedValue(null);

    await expect(exigirUsuario()).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });
});
