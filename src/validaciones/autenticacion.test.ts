import { describe, expect, it } from "vitest";
import { esquemaInicioSesion, esquemaRegistro } from "./autenticacion";

function primerMensaje(resultado: { success: boolean; error?: { issues: { message: string }[] } }) {
  return resultado.error?.issues[0]?.message;
}

describe("esquemaRegistro", () => {
  it("normaliza el email: recorta espacios y lo pasa a minúsculas", () => {
    const datos = esquemaRegistro.parse({ email: "  Sofia@Ejemplo.COM ", contrasena: "12345678" });

    expect(datos.email).toBe("sofia@ejemplo.com");
  });

  it.each([
    ["", "Ingresá tu email."],
    ["   ", "Ingresá tu email."],
    ["sofia@", "Ingresá un email válido."],
    ["sofia.ejemplo.com", "Ingresá un email válido."],
  ])("rechaza el email %j con el mensaje %j", (email, mensaje) => {
    expect(primerMensaje(esquemaRegistro.safeParse({ email, contrasena: "12345678" }))).toBe(mensaje);
  });

  it("exige al menos 8 caracteres de contraseña", () => {
    const resultado = esquemaRegistro.safeParse({ email: "a@b.com", contrasena: "1234567" });

    expect(primerMensaje(resultado)).toBe("La contraseña tiene que tener al menos 8 caracteres.");
  });

  it("acepta hasta 72 bytes de contraseña y rechaza más", () => {
    expect(esquemaRegistro.safeParse({ email: "a@b.com", contrasena: "a".repeat(72) }).success).toBe(true);
    expect(esquemaRegistro.safeParse({ email: "a@b.com", contrasena: "a".repeat(73) }).success).toBe(false);
  });

  it("cuenta bytes y no caracteres: 40 letras con tilde ocupan 80 bytes", () => {
    const resultado = esquemaRegistro.safeParse({ email: "a@b.com", contrasena: "á".repeat(40) });

    expect(primerMensaje(resultado)).toBe("La contraseña es demasiado larga.");
  });
});

describe("esquemaInicioSesion", () => {
  it("no aplica las reglas de largo del registro: una contraseña corta pasa", () => {
    expect(esquemaInicioSesion.safeParse({ email: "a@b.com", contrasena: "123" }).success).toBe(true);
  });

  it("exige que haya contraseña", () => {
    const resultado = esquemaInicioSesion.safeParse({ email: "a@b.com", contrasena: "" });

    expect(primerMensaje(resultado)).toBe("Ingresá tu contraseña.");
  });
});
