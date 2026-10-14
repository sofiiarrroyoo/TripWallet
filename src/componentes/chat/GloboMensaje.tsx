import { cn } from "cn";

type Props = { rol: "user" | "assistant"; texto: string };

export function GloboMensaje({ rol, texto }: Props) {
  const esUsuario = rol === "user";

  return (
    <div
      className={cn(
        "flex animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none",
        esUsuario ? "justify-end" : "justify-start",
      )}
    >
      <p
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-base break-words whitespace-pre-wrap sm:max-w-[75%]",
          esUsuario ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-globo-asistente",
        )}
      >
        <span className="sr-only">{esUsuario ? "Vos: " : "Asistente: "}</span>
        {texto}
      </p>
    </div>
  );
}
