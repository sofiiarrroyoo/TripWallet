import { formatearMonto, formatearPorcentaje } from "@/lib/formatos";
import { redondearAUnDecimal, sumarMontos } from "@/lib/numeros";
import type { PanelViaje } from "@/tipos/panel";
import { SeccionPlegable } from "./SeccionPlegable";

// Cuántas categorías se muestran por separado; el resto se junta en "Otras" para que cada color se distinga.
const CATEGORIAS_VISIBLES = 5;
const COLORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "#e0a95a", "#9aa5a2"];
// Con r = 100 / (2π) el perímetro mide 100: cada porcentaje es directamente el largo del arco.
const RADIO = 15.9155;

type Porcion = { nombre: string; total: number; porcentaje: number; color: string; desplazamiento: number };

function armarPorciones(panel: PanelViaje): Porcion[] {
  const visibles = panel.porCategoria.slice(0, CATEGORIAS_VISIBLES);
  const resto = panel.porCategoria.slice(CATEGORIAS_VISIBLES);
  const grupos = [
    ...visibles.map(({ categoria, total }) => ({ nombre: categoria, total })),
    ...(resto.length > 0 ? [{ nombre: "Otras", total: sumarMontos(resto.map((c) => c.total)) }] : []),
  ];
  let acumulado = 0;
  return grupos.map((grupo, indice) => {
    const porcentaje = panel.gastado > 0 ? (grupo.total / panel.gastado) * 100 : 0;
    const porcion = { ...grupo, porcentaje, color: COLORES[indice % COLORES.length], desplazamiento: -acumulado };
    acumulado += porcentaje;
    return porcion;
  });
}

// Dona hecha con SVG, sin librería de gráficos. El dibujo es decorativo (aria-hidden): cada dato está escrito en la lista.
export function DonaCategorias({ panel }: { panel: PanelViaje }) {
  const porciones = armarPorciones(panel);
  return (
    <SeccionPlegable titulo="Gastos por categoría">
      {porciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">Cuando registres gastos, vas a ver acá en qué se va la plata.</p>
      ) : (
        <>
          <svg aria-hidden viewBox="0 0 42 42" className="mx-auto size-40 -rotate-90">
            <circle cx="21" cy="21" r={RADIO} fill="none" stroke="var(--muted)" strokeWidth="5" />
            {porciones.map((porcion) => (
                <circle
                  key={porcion.nombre}
                  cx="21"
                  cy="21"
                  r={RADIO}
                  fill="none"
                  stroke={porcion.color}
                  strokeWidth="5"
                  strokeDasharray={`${porcion.porcentaje} ${100 - porcion.porcentaje}`}
                  strokeDashoffset={porcion.desplazamiento}
                />
            ))}
          </svg>

          <ul className="flex flex-col gap-2 text-sm">
            {porciones.map((porcion) => (
              <li key={porcion.nombre} className="flex items-center gap-2">
                <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: porcion.color }} />
                <span className="min-w-0 flex-1 truncate">{porcion.nombre}</span>
                <span className="font-medium">{formatearMonto(porcion.total, panel.monedaBase)}</span>
                <span className="w-14 text-right text-muted-foreground">
                  {formatearPorcentaje(redondearAUnDecimal(porcion.porcentaje))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </SeccionPlegable>
  );
}
