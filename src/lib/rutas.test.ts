import { describe, expect, it } from "vitest";
import { redireccionPara } from "./rutas";

describe("redireccionPara", () => {
  it.each([
    ["/", false, "/ingresar"],
    ["/", true, "/viajes"],
    ["/ingresar", false, null],
    ["/registro", false, null],
    ["/ingresar", true, "/viajes"],
    ["/registro", true, "/viajes"],
    ["/viajes", false, "/ingresar"],
    ["/viajes/abc-123", false, "/ingresar"],
    ["/viajes", true, null],
    ["/pagina-nueva-que-nadie-registro", false, "/ingresar"],
  ])("ruta %s con usuario=%s → %s", (ruta, hayUsuario, esperado) => {
    expect(redireccionPara(ruta, hayUsuario)).toBe(esperado);
  });

  it("nunca redirige la API: los endpoints responden 401 por su cuenta", () => {
    expect(redireccionPara("/api/viajes", false)).toBeNull();
    expect(redireccionPara("/api/auth/sesion", true)).toBeNull();
  });

  it("no confunde rutas que solo empiezan igual", () => {
    expect(redireccionPara("/ingresarx", false)).toBe("/ingresar");
    expect(redireccionPara("/apis", false)).toBe("/ingresar");
  });
});
