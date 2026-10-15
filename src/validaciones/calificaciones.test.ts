import { describe, expect, it } from "vitest";
import { esquemaCalificar } from "./calificaciones";

describe("esquemaCalificar", () => {
  it.each([1, -1])("acepta %i", (valor) => {
    expect(esquemaCalificar.parse({ valor })).toEqual({ valor });
  });

  it.each([0, 2, -2, 0.5, "1", null, undefined])("rechaza %j", (valor) => {
    expect(esquemaCalificar.safeParse({ valor }).success).toBe(false);
  });

  it("rechaza un cuerpo sin valor", () => {
    expect(esquemaCalificar.safeParse({}).success).toBe(false);
  });
});
