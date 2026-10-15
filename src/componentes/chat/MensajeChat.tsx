import type { UIMessage } from "ai";
import type { ValorCalificacion } from "@/validaciones/calificaciones";
import { CalificarRespuesta } from "./CalificarRespuesta";
import { DepuracionRespuesta } from "./DepuracionRespuesta";
import { GloboMensaje } from "./GloboMensaje";
import { OpcionesRespuesta } from "./OpcionesRespuesta";
import { TarjetaGasto } from "./TarjetaGasto";
import { esRespuestaCalificable, gastosRegistradosDe, preguntaPendienteDe, textoVisible } from "./mensajesUI";

type Props = {
  mensaje: UIMessage;
  viajeId: string;
  viajeCerrado: boolean;
  gastosEliminados: ReadonlySet<string>;
  onGastoEliminado: (gastoId: string) => void;
  // Solo la pregunta más reciente se puede contestar tocando una opción.
  opcionesActivas: boolean;
  onElegirOpcion: (opcion: string) => void;
  // La calificación que la persona ya le dio a esta respuesta, si le dio una.
  calificacionInicial: ValorCalificacion | null;
  // False mientras el bot todavía está escribiendo esta respuesta.
  calificable: boolean;
  // El modo debug: muestra bajo cada respuesta del bot las tools que llamó y los tokens que consumió.
  mostrarDepuracion: boolean;
};

// Un mensaje del chat: los de la persona son un globo; los del asistente pueden traer tarjetas de gastos
// registrados, texto, los pulgares para calificar y las opciones de una pregunta.
export function MensajeChat({
  mensaje,
  viajeId,
  viajeCerrado,
  gastosEliminados,
  onGastoEliminado,
  opcionesActivas,
  onElegirOpcion,
  calificacionInicial,
  calificable,
  mostrarDepuracion,
}: Props) {
  if (mensaje.role === "user") return <GloboMensaje rol="user" texto={textoVisible(mensaje)} />;

  const texto = textoVisible(mensaje);
  const pregunta = preguntaPendienteDe(mensaje);

  return (
    <>
      {gastosRegistradosDe(mensaje).map((gasto) => (
        <TarjetaGasto
          key={gasto.id}
          viajeId={viajeId}
          gasto={gasto}
          eliminado={gastosEliminados.has(gasto.id)}
          puedeDeshacer={!viajeCerrado}
          onEliminado={onGastoEliminado}
        />
      ))}
      {texto && <GloboMensaje rol="assistant" texto={texto} />}
      {esRespuestaCalificable(mensaje) && (
        <CalificarRespuesta
          viajeId={viajeId}
          mensajeId={mensaje.id}
          calificacionInicial={calificacionInicial}
          habilitado={calificable}
        />
      )}
      {mostrarDepuracion && <DepuracionRespuesta mensaje={mensaje} />}
      {pregunta && opcionesActivas && <OpcionesRespuesta opciones={pregunta.opciones} onElegir={onElegirOpcion} />}
    </>
  );
}
