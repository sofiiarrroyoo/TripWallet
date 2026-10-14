import { Button } from "@/componentes/ui/button";

type Props = {
  opciones: string[];
  onElegir: (opcion: string) => void;
};

// Las opciones de una pregunta del bot. Tocar una envía su texto como un mensaje más; la persona también puede
// contestar escribiendo.
export function OpcionesRespuesta({ opciones, onElegir }: Props) {
  return (
    <div
      role="group"
      aria-label="Opciones de respuesta"
      className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
    >
      {opciones.map((opcion) => (
        <Button
          key={opcion}
          type="button"
          variant="outline"
          onClick={() => onElegir(opcion)}
          className="h-10 rounded-full px-4 text-base"
        >
          {opcion}
        </Button>
      ))}
    </div>
  );
}
