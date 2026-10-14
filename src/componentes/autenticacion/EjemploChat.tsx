// Fragmento ilustrativo del chat para las pantallas de autenticación. Es inert: no recibe foco ni lo leen los
// lectores de pantalla (leen el figcaption), porque sus mensajes no existen.
export function EjemploChat() {
  return (
    <figure className="flex flex-col gap-4">
      <div
        inert
        data-ui
        className="flex w-full max-w-xl flex-col gap-4 rounded-md bg-background p-4 text-[0.9375rem] sm:p-5 animate-in fade-in slide-in-from-bottom-4 animation-duration-700 delay-500 fill-mode-both motion-reduce:animate-none"
      >
        <p className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
          pagué 15 lucas chilenas la cena
        </p>

        <div className="flex max-w-[92%] flex-col gap-3 self-start rounded-2xl rounded-bl-md bg-globo-asistente p-3 sm:p-4">
          <p className="px-1">Listo, lo registré en Comida y bebida.</p>
          <TarjetaGastoEjemplo />
        </div>

        <div className="rounded-full border border-input px-4 py-2.5 text-muted-foreground">
          Contale un gasto…
        </div>
      </div>

      <figcaption className="text-sm text-escenario-foreground">
        Ejemplo de conversación. Montos y cotización ilustrativos.
        <span className="sr-only">
          {" "}
          Escribís “pagué 15 lucas chilenas la cena” y TripWallet lo registra como 15.000 pesos chilenos,
          convertidos a tu moneda con la cotización del día.
        </span>
      </figcaption>
    </figure>
  );
}

function TarjetaGastoEjemplo() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-background p-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-medium">Cena</p>
        <p className="text-muted-foreground">Comida y bebida · hoy</p>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">ARS 21.750</p>
        <p className="text-muted-foreground tabular-nums">de CLP 15.000</p>
      </div>

      <div className="flex items-end justify-between gap-4">
        <p className="text-sm text-muted-foreground tabular-nums">
          1 CLP = 1,45 ARS · cotización de hoy
          <br />
          Fuente: open.er-api.com
        </p>
        <span className="rounded-full border border-input bg-background px-3 py-1.5 text-sm font-medium">
          Deshacer
        </span>
      </div>
    </div>
  );
}
