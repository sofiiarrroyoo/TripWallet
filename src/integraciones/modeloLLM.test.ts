import { afterEach, describe, expect, it, vi } from "vitest";
import { obtenerModelo, obtenerNombreModelo } from "./modeloLLM";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("obtenerNombreModelo", () => {
  it("usa una versión con fecha de gpt-5.4-mini si no hay variable de entorno", () => {
    vi.stubEnv("OPENAI_MODELO", "");

    expect(obtenerNombreModelo()).toBe("gpt-5.4-mini-2026-03-17");
  });

  it("deja cambiar de modelo con OPENAI_MODELO, sin espacios sobrantes", () => {
    vi.stubEnv("OPENAI_MODELO", " gpt-4.1-mini ");

    expect(obtenerNombreModelo()).toBe("gpt-4.1-mini");
  });
});

describe("obtenerModelo", () => {
  it("crea el modelo con el nombre configurado", () => {
    vi.stubEnv("OPENAI_MODELO", "gpt-4.1-mini");

    expect(obtenerModelo()).toMatchObject({ modelId: "gpt-4.1-mini" });
  });
});
