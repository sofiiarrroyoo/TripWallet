import { describe, expect, it } from "vitest";
import { estadoContador } from "./contadorCaracteres";

describe("estadoContador", () => {
  it("no se muestra lejos del límite", () => {
    expect(estadoContador("a".repeat(799))).toMatchObject({ visible: false, excedido: false, aviso: "" });
  });

  it("aparece desde los 800 caracteres, avisando que quedan menos de 200", () => {
    expect(estadoContador("a".repeat(800))).toMatchObject({
      visible: true,
      excedido: false,
      aviso: "Te quedan menos de 200 caracteres.",
    });
  });

  it("avisa de nuevo cuando quedan menos de 100", () => {
    expect(estadoContador("a".repeat(900)).aviso).toBe("Te quedan menos de 100 caracteres.");
    expect(estadoContador("a".repeat(850)).aviso).toBe("Te quedan menos de 200 caracteres.");
  });

  it("acepta justo 1000 caracteres y marca excedido con 1001", () => {
    expect(estadoContador("a".repeat(1000))).toMatchObject({ excedido: false, caracteres: 1000 });
    expect(estadoContador("a".repeat(1001))).toMatchObject({
      excedido: true,
      aviso: "Superaste el límite de 1000 caracteres.",
    });
  });

  it("cuenta el texto recortado, como el servidor", () => {
    expect(estadoContador(`  ${"a".repeat(1000)}  \n`)).toMatchObject({ caracteres: 1000, excedido: false });
  });
});
