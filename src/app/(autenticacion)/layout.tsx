import { EjemploChat } from "@/componentes/autenticacion/EjemploChat";

export default function LayoutAutenticacion({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-12">
      <div className="flex flex-col px-5 pt-7 pb-12 sm:px-8 lg:col-span-5 lg:px-10 lg:pb-16">
        <p className="text-lg font-semibold tracking-tight">TripWallet</p>

        <main className="flex w-full max-w-md flex-1 flex-col justify-center gap-8 pt-12 lg:pt-16">
          <div className="flex flex-col gap-4">
            <h1 className="text-[clamp(2.5rem,10vw,3.25rem)] leading-[0.95] font-semibold text-balance tracking-[-0.04em] lg:text-[clamp(2.75rem,4.2vw,4rem)]">
              Gastos de viaje, en tu moneda
            </h1>
            <p className="text-lg">
              Contale tus gastos al chat como hablás y mirá cuánto llevás gastado, en la moneda que elijas.
            </p>
          </div>
          {children}
        </main>
      </div>

      <aside
        aria-label="Cómo funciona TripWallet"
        className="lg:col-span-7 lg:pt-[12vh]"
      >
        <div className="escenario corte-diagonal flex h-full min-h-[34rem] flex-col justify-start bg-escenario px-4 pt-20 pb-12 sm:px-8 lg:px-14 lg:pt-32">
          <EjemploChat />
        </div>
      </aside>
    </div>
  );
}
