"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import type { DetalleValidacion } from "@/errores";
import { Alert, AlertDescription } from "@/componentes/ui/alert";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { llamarApi, sinDatos, type ErrorApi } from "@/lib/llamarApi";
import { RUTA_INGRESAR, RUTA_INICIO_PRIVADO } from "@/lib/rutas";
import { esquemaInicioSesion, esquemaRegistro } from "@/validaciones/autenticacion";
import { detallesDeValidacion } from "@/validaciones/validar";
import { CampoContrasena } from "./CampoContrasena";
import { MensajeErrorCampo } from "./MensajeErrorCampo";
import { CAMPOS, erroresPorCampo, type Campo, type ErroresCampos } from "./erroresPorCampo";

export type ModoAutenticacion = "registro" | "ingreso";

const CONFIGURACION = {
  registro: {
    esquema: esquemaRegistro,
    ruta: "/api/auth/registro",
    textoBoton: "Crear cuenta",
    textoEnviando: "Creando cuenta…",
    autocompletarContrasena: "new-password",
    ayudaContrasena: "Mínimo 8 caracteres.",
  },
  ingreso: {
    esquema: esquemaInicioSesion,
    ruta: "/api/auth/sesion",
    textoBoton: "Ingresar",
    textoEnviando: "Ingresando…",
    autocompletarContrasena: "current-password",
    ayudaContrasena: undefined,
  },
} as const;

export function FormularioAutenticacion({ modo }: { modo: ModoAutenticacion }) {
  const configuracion = CONFIGURACION[modo];
  const router = useRouter();
  const [valores, setValores] = useState<Record<Campo, string>>({ email: "", contrasena: "" });
  const [errores, setErrores] = useState<ErroresCampos>({});
  const [errorGeneral, setErrorGeneral] = useState<ErrorApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const refEmail = useRef<HTMLInputElement>(null);
  const refContrasena = useRef<HTMLInputElement>(null);

  function cambiar(campo: Campo, valor: string) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  }

  function mostrarErrores(detalles: DetalleValidacion[]) {
    const { campos, otros } = erroresPorCampo(detalles);
    // flushSync pinta los errores antes de mover el foco: así el lector de pantalla lee el campo ya marcado
    // como inválido y con su mensaje.
    flushSync(() => {
      setErrores(campos);
      setErrorGeneral(otros.length > 0 ? { codigo: "VALIDACION", mensaje: otros.join(" ") } : null);
    });
    const primerCampoConError = CAMPOS.find((campo) => campos[campo]);
    const referencias = { email: refEmail, contrasena: refContrasena };
    if (primerCampoConError) referencias[primerCampoConError].current?.focus();
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setErrorGeneral(null);

    const validacion = configuracion.esquema.safeParse(valores);
    if (!validacion.success) {
      mostrarErrores(detallesDeValidacion(validacion.error));
      return;
    }

    setEnviando(true);
    const resultado = await llamarApi(configuracion.ruta, sinDatos, {
      metodo: "POST",
      cuerpo: validacion.data,
    });

    if (resultado.ok) {
      // enviando queda en true a propósito: el formulario sigue bloqueado mientras se navega.
      router.replace(RUTA_INICIO_PRIVADO);
      router.refresh();
      return;
    }

    setEnviando(false);
    if (resultado.error.detalles?.length) mostrarErrores(resultado.error.detalles);
    else setErrorGeneral(resultado.error);
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-6">
      {errorGeneral && <AlertaError error={errorGeneral} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          ref={refEmail}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={valores.email}
          onChange={(evento) => cambiar("email", evento.target.value)}
          aria-invalid={Boolean(errores.email)}
          aria-describedby={errores.email ? "email-error" : undefined}
          className="h-11 text-base md:text-base"
        />
        <MensajeErrorCampo id="email-error" mensaje={errores.email} />
      </div>

      <CampoContrasena
        ref={refContrasena}
        valor={valores.contrasena}
        onCambio={(valor) => cambiar("contrasena", valor)}
        autoComplete={configuracion.autocompletarContrasena}
        error={errores.contrasena}
        ayuda={configuracion.ayudaContrasena}
      />

      <Button type="submit" disabled={enviando} className="h-11 text-base">
        {enviando && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
        {enviando ? configuracion.textoEnviando : configuracion.textoBoton}
      </Button>
    </form>
  );
}

function AlertaError({ error }: { error: ErrorApi }) {
  return (
    <Alert
      variant="destructive"
      className="animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none"
    >
      <CircleAlert aria-hidden />
      <AlertDescription>
        <p>
          {error.mensaje}
          {error.codigo === "EMAIL_YA_REGISTRADO" && (
            <>
              {" "}
              <Link href={RUTA_INGRESAR}>Ir a ingresar</Link>
            </>
          )}
        </p>
      </AlertDescription>
    </Alert>
  );
}
