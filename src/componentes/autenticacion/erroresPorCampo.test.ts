import { describe, expect, it } from "vitest";
import { erroresPorCampo } from "./erroresPorCampo";

const CAMPOS = ["email", "contrasena"] as const;

describe("erroresPorCampo", () => {
  it("asigna cada mensaje a su campo", () => {
    expect(
      erroresPorCampo(
        [
          { campo: "email", mensaje: "Ingresá un email válido." },
          { campo: "contrasena", mensaje: "Ingresá tu contraseña." },
        ],
        CAMPOS,
      ),
    ).toEqual({
      campos: { email: "Ingresá un email válido.", contrasena: "Ingresá tu contraseña." },
      otros: [],
    });
  });

  it("se queda con el primer mensaje de cada campo", () => {
    const { campos } = erroresPorCampo(
      [
        { campo: "email", mensaje: "Ingresá tu email." },
        { campo: "email", mensaje: "Ingresá un email válido." },
      ],
      CAMPOS,
    );

    expect(campos).toEqual({ email: "Ingresá tu email." });
  });

  it("separa los mensajes de campos que el formulario no tiene", () => {
    expect(erroresPorCampo([{ campo: "", mensaje: "Faltan datos." }], CAMPOS)).toEqual({
      campos: {},
      otros: ["Faltan datos."],
    });
  });
});
