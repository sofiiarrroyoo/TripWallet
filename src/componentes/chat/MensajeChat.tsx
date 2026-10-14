import type { UIMessage } from "ai";
import { GloboMensaje } from "./GloboMensaje";
import { OpcionesRespuesta } from "./OpcionesRespuesta";
import { TarjetaGasto } from "./TarjetaGasto";
import { gastosRegistradosDe, preguntaPendienteDe, textoVisible } from "./mensajesUI";

type Props = {
  mensaje: UIMessage;
  viajeId: string;
  viajeCerrado: boolean;
  gastosEliminados: ReadonlySet<string>;
  onGastoEliminado: (gastoId: string) => void;
  // Solo la pregunta más reciente se puede contestar tocando una opción.
  opcionesActivas: boolean;
  onElegirOpcion: (opcion: string) => void;
};

// Un mensaje del chat: los de la persona son un globo; los del asistente pueden traer tarjetas de gastos
// registrados, texto y las opciones de una pregunta.
export function MensajeChat({
  mensaje,
  viajeId,
  viajeCerrado,
  gastosEliminados,
  onGastoEliminado,
  opcionesActivas,
  onElegirOpcion,
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
      {pregunta && opcionesActivas && <OpcionesRespuesta opciones={pregunta.opciones} onElegir={onElegirOpcion} />}
    </>
  );
}
