// Un color por categoría, de la que más se gastó a la que menos. Lo comparten la dona del panel y las barras del
// resumen del cierre para que cada categoría tenga el mismo color en los dos. A partir de la sexta va el gris ("Otras").
const COLORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "#e0a95a", "#9aa5a2"];

export const CANTIDAD_CATEGORIAS_CON_COLOR = COLORES.length - 1;

export function colorDeCategoria(posicion: number): string {
  return COLORES[Math.min(posicion, COLORES.length - 1)];
}
