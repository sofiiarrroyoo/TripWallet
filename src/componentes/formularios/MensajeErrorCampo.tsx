export function MensajeErrorCampo({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p
      id={id}
      className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none"
    >
      {mensaje}
    </p>
  );
}
