import { AuthApiError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorCredencialesInvalidas,
  ErrorEmailYaRegistrado,
  ErrorLimiteExcedido,
  ErrorValidacion,
} from "@/errores";
import { cerrarSesion, iniciarSesion, obtenerUsuarioActual, registrarUsuario } from "./autenticacion";
import { crearClienteSupabase } from "./supabase/clienteServidor";

vi.mock("./supabase/clienteServidor", () => ({ crearClienteSupabase: vi.fn() }));

const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getClaims: vi.fn(),
};

const credenciales = { email: "sofia@ejemplo.com", contrasena: "12345678" };
const usuarioSupabase = { id: "id-1", email: "sofia@ejemplo.com" };

function errorDeSupabase(code: string, status = 400) {
  return new AuthApiError("mensaje interno de supabase", status, code);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(crearClienteSupabase).mockResolvedValue(
    { auth } as unknown as Awaited<ReturnType<typeof crearClienteSupabase>>,
  );
});

describe("registrarUsuario", () => {
  it("devuelve el usuario cuando Supabase crea la cuenta con sesión", async () => {
    auth.signUp.mockResolvedValue({ data: { user: usuarioSupabase, session: {} }, error: null });

    await expect(registrarUsuario(credenciales)).resolves.toEqual({ id: "id-1", email: "sofia@ejemplo.com" });
    expect(auth.signUp).toHaveBeenCalledWith({ email: "sofia@ejemplo.com", password: "12345678" });
  });

  it.each(["user_already_exists", "email_exists"])("traduce %s a ErrorEmailYaRegistrado", async (code) => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: errorDeSupabase(code, 422) });

    await expect(registrarUsuario(credenciales)).rejects.toBeInstanceOf(ErrorEmailYaRegistrado);
  });

  it("traduce weak_password a ErrorValidacion sobre el campo contraseña", async () => {
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: errorDeSupabase("weak_password", 422) });

    const error = await registrarUsuario(credenciales).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles[0]?.campo).toBe("contrasena");
  });

  it("falla si Supabase no devuelve sesión (confirmación de email activada)", async () => {
    auth.signUp.mockResolvedValue({ data: { user: usuarioSupabase, session: null }, error: null });

    await expect(registrarUsuario(credenciales)).rejects.toThrow(/confirmación de email/);
  });
});

describe("iniciarSesion", () => {
  it("traduce invalid_credentials a ErrorCredencialesInvalidas", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: errorDeSupabase("invalid_credentials") });

    await expect(iniciarSesion(credenciales)).rejects.toBeInstanceOf(ErrorCredencialesInvalidas);
  });

  it("traduce el rate limit de Supabase a ErrorLimiteExcedido con un mensaje propio", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: errorDeSupabase("over_request_rate_limit", 429) });

    const error = await iniciarSesion(credenciales).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorLimiteExcedido);
    expect((error as ErrorLimiteExcedido).message).toMatch(/demasiados intentos/i);
  });

  it("deja pasar sin traducir un error de Supabase que no conoce", async () => {
    const desconocido = errorDeSupabase("unexpected_failure", 500);
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: desconocido });

    await expect(iniciarSesion(credenciales)).rejects.toBe(desconocido);
  });
});

describe("cerrarSesion", () => {
  it("cierra solo la sesión de este dispositivo", async () => {
    auth.signOut.mockResolvedValue({ error: null });

    await cerrarSesion();

    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

describe("obtenerUsuarioActual", () => {
  it("arma el usuario a partir de los claims verificados del token", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "id-1", email: "sofia@ejemplo.com" } }, error: null });

    await expect(obtenerUsuarioActual()).resolves.toEqual({ id: "id-1", email: "sofia@ejemplo.com" });
  });

  it("devuelve null si no hay sesión o el token no es válido", async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: null });

    await expect(obtenerUsuarioActual()).resolves.toBeNull();
  });
});
