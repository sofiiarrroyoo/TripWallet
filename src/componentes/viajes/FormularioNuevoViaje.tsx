"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { z } from "zod";
import { erroresPorCampo } from "@/componentes/formularios/erroresPorCampo";
import { MensajeErrorCampo } from "@/componentes/formularios/MensajeErrorCampo";
import { Alert, AlertDescription } from "@/componentes/ui/alert";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import type { DetalleValidacion } from "@/errores";
import { llamarApi, type ErrorApi } from "@/lib/llamarApi";
import { rutaViaje } from "@/lib/rutas";
import type { Moneda } from "@/tipos/moneda";
import { esquemaCrearViaje } from "@/validaciones/viajes";
import { detallesDeValidacion } from "@/validaciones/validar";
import { BuscadorMonedas } from "./BuscadorMonedas";
import { leerMonto } from "./leerMonto";

const CAMPOS = ["nombre", "destino", "monedaBase", "fechaInicio", "fechaFin", "presupuestoTotal"] as const;
type Campo = (typeof CAMPOS)[number];

const esquemaRespuesta = z.object({ viaje: z.object({ id: z.string() }) });

const VALORES_INICIALES: Record<Campo, string> = {
  nombre: "",
  destino: "",
  monedaBase: "",
  fechaInicio: "",
  fechaFin: "",
  presupuestoTotal: "",
};

function idError(campo: Campo): string {
  return `${campo}-error`;
}

// Junta en aria-describedby la ayuda del campo y su error, si los hay.
function descripcion(campo: Campo, error: string | undefined, idAyuda?: string): string | undefined {
  return [idAyuda, error && idError(campo)].filter(Boolean).join(" ") || undefined;
}

export function FormularioNuevoViaje({ monedas }: { monedas: Moneda[] }) {
  const router = useRouter();
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<ErrorApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cambiar(campo: Campo, valor: string) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  }

  function mostrarErrores(detalles: DetalleValidacion[]) {
    const { campos, otros } = erroresPorCampo(detalles, CAMPOS);
    // Igual que en el login: se pintan los errores antes de mover el foco al primer campo con error.
    flushSync(() => {
      setErrores(campos);
      setErrorGeneral(otros.length > 0 ? { codigo: "VALIDACION", mensaje: otros.join(" ") } : null);
    });
    const primerCampoConError = CAMPOS.find((campo) => campos[campo]);
    // Cada input tiene como id el nombre de su campo.
    if (primerCampoConError) document.getElementById(primerCampoConError)?.focus();
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setErrorGeneral(null);

    const presupuesto = leerMonto(valores.presupuestoTotal);
    if (presupuesto.tipo === "invalido") {
      mostrarErrores([
        { campo: "presupuestoTotal", mensaje: "Escribí solo el número, sin puntos de miles (ej. 1500 o 1500,50)." },
      ]);
      return;
    }

    const validacion = esquemaCrearViaje.safeParse({
      ...valores,
      presupuestoTotal: presupuesto.tipo === "valido" ? presupuesto.monto : null,
    });
    if (!validacion.success) {
      mostrarErrores(detallesDeValidacion(validacion.error));
      return;
    }

    setEnviando(true);
    const resultado = await llamarApi("/api/viajes", esquemaRespuesta, { metodo: "POST", cuerpo: validacion.data });

    if (resultado.ok) {
      // enviando queda en true: el formulario sigue bloqueado mientras se navega al viaje nuevo.
      router.push(rutaViaje(resultado.datos.viaje.id));
      return;
    }

    setEnviando(false);
    if (resultado.error.detalles?.length) mostrarErrores(resultado.error.detalles);
    else setErrorGeneral(resultado.error);
  }

  // post: si el JavaScript no llegara a cargar, el envío nativo del formulario no deja los datos en la URL.
  return (
    <form method="post" noValidate onSubmit={enviar} className="grid gap-x-6 gap-y-4 md:grid-cols-2">
      {errorGeneral && (
        <Alert
          variant="destructive"
          className="md:col-span-2 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none"
        >
          <CircleAlert aria-hidden />
          <AlertDescription>
            <p>{errorGeneral.mensaje}</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="nombre">Nombre del viaje</Label>
        <Input
          id="nombre"
          name="nombre"
          autoComplete="off"
          maxLength={100}
          placeholder="Ej. Vacaciones en Chile"
          value={valores.nombre}
          onChange={(evento) => cambiar("nombre", evento.target.value)}
          aria-invalid={Boolean(errores.nombre)}
          aria-describedby={descripcion("nombre", errores.nombre)}
          className="h-11 text-base md:text-base"
        />
        <MensajeErrorCampo id={idError("nombre")} mensaje={errores.nombre} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="destino">Destino</Label>
        <Input
          id="destino"
          name="destino"
          autoComplete="off"
          maxLength={100}
          placeholder="Ej. Santiago, Chile"
          value={valores.destino}
          onChange={(evento) => cambiar("destino", evento.target.value)}
          aria-invalid={Boolean(errores.destino)}
          aria-describedby={descripcion("destino", errores.destino)}
          className="h-11 text-base md:text-base"
        />
        <MensajeErrorCampo id={idError("destino")} mensaje={errores.destino} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="monedaBase">Moneda base</Label>
        <BuscadorMonedas
          id="monedaBase"
          monedas={monedas}
          valor={valores.monedaBase}
          onCambio={(codigo) => cambiar("monedaBase", codigo)}
          invalido={Boolean(errores.monedaBase)}
          descripcionId={descripcion("monedaBase", errores.monedaBase, "monedaBase-ayuda")}
        />
        <p id="monedaBase-ayuda" className="text-sm text-muted-foreground">
          Todos los gastos se convierten a esta moneda. No se puede cambiar después.
        </p>
        <MensajeErrorCampo id={idError("monedaBase")} mensaje={errores.monedaBase} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="presupuestoTotal">Presupuesto total (opcional)</Label>
        <div className="relative">
          <Input
            id="presupuestoTotal"
            name="presupuestoTotal"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ej. 1500000"
            value={valores.presupuestoTotal}
            onChange={(evento) => cambiar("presupuestoTotal", evento.target.value)}
            aria-invalid={Boolean(errores.presupuestoTotal)}
            aria-describedby={descripcion("presupuestoTotal", errores.presupuestoTotal, "presupuestoTotal-ayuda")}
            className="h-11 pr-16 text-base md:text-base"
          />
          {valores.monedaBase && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
            >
              {valores.monedaBase}
            </span>
          )}
        </div>
        <p id="presupuestoTotal-ayuda" className="text-sm text-muted-foreground">
          {valores.monedaBase
            ? `En ${valores.monedaBase}. Si lo cargás, te aviso cuánto te queda mientras viajás.`
            : "En la moneda base. Si lo cargás, te aviso cuánto te queda mientras viajás."}
        </p>
        <MensajeErrorCampo id={idError("presupuestoTotal")} mensaje={errores.presupuestoTotal} />
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2 md:col-span-2">
        <legend className="sr-only">Fechas del viaje</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fechaInicio">Desde</Label>
            <Input
              id="fechaInicio"
              name="fechaInicio"
              type="date"
              value={valores.fechaInicio}
              onChange={(evento) => cambiar("fechaInicio", evento.target.value)}
              aria-invalid={Boolean(errores.fechaInicio)}
              aria-describedby={descripcion("fechaInicio", errores.fechaInicio)}
              className="h-11 text-base md:text-base"
            />
            <MensajeErrorCampo id={idError("fechaInicio")} mensaje={errores.fechaInicio} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fechaFin">Hasta</Label>
            <Input
              id="fechaFin"
              name="fechaFin"
              type="date"
              min={valores.fechaInicio || undefined}
              value={valores.fechaFin}
              onChange={(evento) => cambiar("fechaFin", evento.target.value)}
              aria-invalid={Boolean(errores.fechaFin)}
              aria-describedby={descripcion("fechaFin", errores.fechaFin)}
              className="h-11 text-base md:text-base"
            />
            <MensajeErrorCampo id={idError("fechaFin")} mensaje={errores.fechaFin} />
          </div>
        </div>
      </fieldset>

      <Button type="submit" disabled={enviando} className="h-11 self-start px-6 text-base md:col-span-2">
        {enviando && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
        {enviando ? "Creando viaje…" : "Crear viaje"}
      </Button>
    </form>
  );
}
