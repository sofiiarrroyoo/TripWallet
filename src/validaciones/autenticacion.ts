import { z } from "zod";

// bcrypt (con el que Supabase guarda las contraseñas) ignora lo que pasa de 72 bytes, no de 72 caracteres:
// una letra con tilde ocupa 2 bytes.
const MAXIMO_BYTES_CONTRASENA = 72;

const email = z
  .string()
  .trim()
  .min(1, "Ingresá tu email.")
  .toLowerCase()
  .pipe(z.email("Ingresá un email válido."));

export const esquemaRegistro = z.object({
  email,
  contrasena: z
    .string()
    .min(8, "La contraseña tiene que tener al menos 8 caracteres.")
    .refine(
      (contrasena) => new TextEncoder().encode(contrasena).length <= MAXIMO_BYTES_CONTRASENA,
      "La contraseña es demasiado larga.",
    ),
});

// En el login solo se exige que haya algo: si las reglas de contraseña cambian, las cuentas viejas tienen que
// poder entrar igual, y quien decide si es correcta es Supabase.
export const esquemaInicioSesion = z.object({
  email,
  contrasena: z.string().min(1, "Ingresá tu contraseña."),
});

export type DatosRegistro = z.infer<typeof esquemaRegistro>;
export type DatosInicioSesion = z.infer<typeof esquemaInicioSesion>;
