import type { UIMessage } from "ai";
import { cn } from "cn";
import { type EstadoLlamada, depuracionDe, textoJson } from "./depuracion";

const ESTILO_ESTADO: Record<EstadoLlamada, string> = {
  completada: "bg-primary text-primary-foreground",
  "con error": "bg-destructive/10 text-destructive",
  "en curso": "bg-muted text-foreground",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium tabular-nums">{valor}</dd>
    </div>
  );
}

function Bloque({ titulo, valor }: { titulo: string; valor: unknown }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      {/* tabIndex: para poder desplazar con el teclado un JSON largo que no entra en el ancho. */}
      <pre
        tabIndex={0}
        aria-label={titulo}
        className="max-h-60 overflow-auto rounded-md bg-background p-2 font-mono text-xs break-words whitespace-pre-wrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {textoJson(valor)}
      </pre>
    </div>
  );
}

const numero = (valor: number | null) => (valor === null ? "—" : valor.toLocaleString("es-AR"));

type Props = { mensaje: UIMessage };

// El panel de debug de una respuesta del bot: modelo, tokens y las tools que llamó con sus parámetros y resultados.
// Solo muestra lo que ya se guarda en el mensaje; no consulta nada.
export function DepuracionRespuesta({ mensaje }: Props) {
  const { llamadas, modelo, tokensEntrada, tokensSalida, tokensTotales } = depuracionDe(mensaje);

  return (
    <section
      aria-label="Datos de depuración de esta respuesta"
      className="flex max-w-[85%] flex-col gap-3 rounded-xl border border-dashed border-border bg-muted p-3 sm:max-w-[75%]"
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Dato etiqueta="Modelo" valor={modelo ?? "—"} />
        <Dato etiqueta="Tokens de entrada" valor={numero(tokensEntrada)} />
        <Dato etiqueta="Tokens de salida" valor={numero(tokensSalida)} />
        <Dato etiqueta="Total" valor={numero(tokensTotales)} />
      </dl>

      {llamadas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta respuesta no usó ninguna tool.</p>
      ) : (
        <ul aria-label="Tools llamadas" className="flex flex-col gap-2">
          {llamadas.map((llamada) => (
            <li key={llamada.id}>
              <details className="rounded-md bg-background/60 p-2">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <span className="font-mono text-sm font-medium">{llamada.nombre}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", ESTILO_ESTADO[llamada.estado])}>
                    {llamada.estado}
                  </span>
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  <Bloque titulo="Parámetros" valor={llamada.argumentos} />
                  <Bloque titulo="Resultado" valor={llamada.resultado} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
