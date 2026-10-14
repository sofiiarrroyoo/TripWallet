import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mis viajes" };

export default function PaginaViajes() {
  return (
    <section
      aria-labelledby="titulo-viajes"
      className="flex max-w-2xl flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 animation-duration-500 motion-reduce:animate-none"
    >
      <h1
        id="titulo-viajes"
        className="text-[clamp(2.25rem,6vw,4rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance"
      >
        Todavía no tenés viajes
      </h1>
      <p className="text-lg">
        Creá tu primer viaje con su moneda y su presupuesto, y empezá a contarle tus gastos al chat.
      </p>
    </section>
  );
}
