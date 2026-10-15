import { cn } from "cn";

type Props = {
  // Puede superar 100 (se pasó del presupuesto): la barra se llena y cambia de color.
  porcentaje: number;
  excedido?: boolean;
};

// Una barra de HTML y CSS, sin librería de gráficos. Es solo decorativa (aria-hidden): el dato siempre está también
// escrito al lado, así que no depende de verla.
export function BarraProgreso({ porcentaje, excedido = false }: Props) {
  const ancho = Math.max(0, Math.min(100, porcentaje));

  return (
    <div aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-background">
      <div
        className={cn("h-full rounded-full", excedido ? "bg-destructive" : "bg-foreground")}
        style={{ width: `${ancho}%` }}
      />
    </div>
  );
}
