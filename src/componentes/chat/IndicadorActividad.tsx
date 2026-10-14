// Es solo visual: el lector de pantalla recibe la misma información por la región de estado del chat.
export function IndicadorActividad({ etiqueta }: { etiqueta: string }) {
  return (
    <div
      aria-hidden
      className="flex justify-start animate-in fade-in duration-200 motion-reduce:animate-none"
    >
      <div className="flex items-center gap-3 rounded-2xl rounded-bl-md bg-globo-asistente px-4 py-3">
        <span className="flex gap-1 text-muted-foreground">
          {[0, 150, 300].map((demora) => (
            <span
              key={demora}
              className="size-1.5 animate-bounce rounded-full bg-current motion-reduce:animate-none"
              style={{ animationDelay: `${demora}ms` }}
            />
          ))}
        </span>
        <span>{etiqueta}</span>
      </div>
    </div>
  );
}
