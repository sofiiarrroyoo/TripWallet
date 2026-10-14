"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { Input } from "@/componentes/ui/input";
import type { Moneda } from "@/tipos/moneda";
import { filtrarMonedas, textoDeMoneda } from "./filtrarMonedas";

type Props = {
  id: string;
  ref?: Ref<HTMLInputElement>;
  monedas: Moneda[];
  // Código de la moneda elegida, o "" si todavía no se eligió ninguna de la lista.
  valor: string;
  onCambio: (codigo: string) => void;
  invalido: boolean;
  descripcionId?: string;
};

// Combobox según el patrón de WAI-ARIA: el foco queda siempre en el input y la opción activa se indica con
// aria-activedescendant, así el lector de pantalla la anuncia mientras se navega con las flechas.
export function BuscadorMonedas({ id, ref, monedas, valor, onCambio, invalido, descripcionId }: Props) {
  const idLista = `${id}-opciones`;
  const seleccionada = monedas.find((moneda) => moneda.codigo === valor);
  const [texto, setTexto] = useState(seleccionada ? textoDeMoneda(seleccionada) : "");
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const refLista = useRef<HTMLUListElement>(null);

  // Si el input muestra la moneda ya elegida, se ofrece la lista completa en vez de filtrar por ese texto.
  const mostrandoSeleccion = seleccionada !== undefined && texto === textoDeMoneda(seleccionada);
  const opciones = useMemo(
    () => filtrarMonedas(monedas, mostrandoSeleccion ? "" : texto),
    [monedas, mostrandoSeleccion, texto],
  );
  const opcionActiva = abierto ? opciones[indiceActivo] : undefined;

  useEffect(() => {
    if (indiceActivo >= 0) refLista.current?.children[indiceActivo]?.scrollIntoView({ block: "nearest" });
  }, [indiceActivo]);

  function idOpcion(moneda: Moneda): string {
    return `${id}-opcion-${moneda.codigo}`;
  }

  function abrir() {
    setAbierto(true);
    setIndiceActivo(Math.max(0, opciones.findIndex((moneda) => moneda.codigo === valor)));
  }

  function elegir(moneda: Moneda) {
    onCambio(moneda.codigo);
    setTexto(textoDeMoneda(moneda));
    setAbierto(false);
    setIndiceActivo(-1);
  }

  function escribir(nuevoTexto: string) {
    setTexto(nuevoTexto);
    setAbierto(true);
    setIndiceActivo(nuevoTexto.trim() ? 0 : -1);
    if (valor) onCambio("");
  }

  function manejarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        if (!abierto) abrir();
        else setIndiceActivo((indice) => Math.min(indice + 1, opciones.length - 1));
        break;
      case "ArrowUp":
        evento.preventDefault();
        if (abierto) setIndiceActivo((indice) => Math.max(indice - 1, 0));
        break;
      case "Enter":
        // Con la lista abierta, Enter elige la opción en vez de enviar el formulario.
        if (opcionActiva) {
          evento.preventDefault();
          elegir(opcionActiva);
        }
        break;
      case "Escape":
        if (abierto) {
          evento.preventDefault();
          setAbierto(false);
        }
        break;
    }
  }

  return (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-activedescendant={opcionActiva ? idOpcion(opcionActiva) : undefined}
        aria-invalid={invalido}
        aria-describedby={descripcionId}
        placeholder="Buscá por nombre o código, ej. peso o ARS"
        value={texto}
        onChange={(evento) => escribir(evento.target.value)}
        onKeyDown={manejarTecla}
        onClick={() => !abierto && abrir()}
        onBlur={() => setAbierto(false)}
        className="h-11 pr-10 text-base md:text-base"
      />
      <ChevronsUpDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />

      {abierto && (
        <div className="absolute z-20 mt-1 w-full rounded-md bg-popover p-1 shadow-lg ring-1 ring-foreground/10 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
          <ul ref={refLista} id={idLista} role="listbox" aria-label="Monedas" className="max-h-72 overflow-y-auto">
            {opciones.map((moneda, indice) => (
              <li
                key={moneda.codigo}
                id={idOpcion(moneda)}
                role="option"
                aria-selected={moneda.codigo === valor}
                data-activa={indice === indiceActivo}
                // mousedown cambia el foco antes del click: se cancela para que el input no se cierre.
                onMouseDown={(evento) => evento.preventDefault()}
                onMouseMove={() => setIndiceActivo(indice)}
                onClick={() => elegir(moneda)}
                className="flex cursor-pointer items-baseline gap-3 rounded-sm px-3 py-2.5 data-[activa=true]:bg-muted"
              >
                <span className="w-10 shrink-0 font-medium">{moneda.codigo}</span>
                <span className="flex-1">{moneda.nombre}</span>
                {moneda.codigo === valor && <Check aria-hidden className="size-4 shrink-0 self-center" />}
              </li>
            ))}
          </ul>
          {opciones.length === 0 && (
            <p className="px-3 py-2.5 text-muted-foreground">No encontramos esa moneda. Probá con otro nombre o código.</p>
          )}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {abierto && !mostrandoSeleccion
          ? opciones.length === 0
            ? "No hay monedas que coincidan."
            : `${opciones.length} ${opciones.length === 1 ? "moneda coincide" : "monedas coinciden"}.`
          : ""}
      </p>
    </div>
  );
}
