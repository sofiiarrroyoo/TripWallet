# TripWallet

Copiloto de gastos de viaje multimoneda con IA. Le contás tus gastos como hablás ("pagué 15 lucas chilenas la cena"), los convierte a la moneda de tu viaje y te dice cómo venís contra el presupuesto.

- **App en producción:** https://tripwallet-sofia.vercel.app
- **Cuenta demo** (con viajes y gastos cargados): `coquito@gmail.com` / `Argentina2`

## Definición del producto

- **Problema:** al viajar, los gastos se mezclan en varias monedas y medios de pago, se pierde la cuenta de cuánto se lleva gastado y las apps de gastos obligan a completar formularios.
- **Público:** personas de Argentina y la región que viajan solas o en pareja, sobre todo al exterior, y quieren controlar sus gastos sin planillas.
- **Propuesta de valor:** registrás gastos como hablás, los ves al instante en tu moneda y consultás cómo vas sin sacar cuentas.

## Qué se puede hacer

| User story | Estado |
| --- | --- |
| **US1** Cuenta personal: registro, ingreso y cierre de sesión con email y contraseña; cada persona ve solo sus datos (RLS) | Hecha |
| **US2** Crear un viaje con nombre, destino, moneda base (buscador de monedas), fechas y presupuesto opcional | Hecha |
| **US3** Chat con historial guardado, streaming, cancelar respuesta, reintentar si falla y contador de caracteres | Hecha |
| **US4** Registrar un gasto en lenguaje natural: el bot extrae los datos, pregunta si algo es ambiguo, convierte la moneda y muestra una tarjeta con opción de deshacer | Hecha |
| **US5** Consultar gastos por categoría, por día o total, y cómo voy contra el presupuesto, con totales calculados por código | Hecha |

Cosas que conviene probar en el chat:

- `Pagué 15 lucas chilenas la cena` (convierte a la moneda base y cita cotización y fuente).
- `Gasté 3000 pesos en el taxi` (es ambiguo: pregunta qué pesos, con botones).
- `¿Cuánto llevo gastado en comida?`, `¿Y ayer?`, `¿Cuánto me queda del presupuesto?`.
- `Compré un souvenir por 20 dólares` (si no hay una categoría que encaje, propone crear una y espera tu confirmación).

### Extras implementados

- Streaming de las respuestas.
- Límite de 30 mensajes por hora por usuario.
- Tests con Vitest (más de 500, sobre servicios, validaciones, tools y flujo del chat).
- Tool calling nativo y few-shot en los prompts.
- Accesibilidad: etiquetas ARIA, `aria-live` en el chat, navegación por teclado y foco visible.
- Cada mensaje del bot guarda las tools que llamó, el modelo y los tokens usados.

## Arquitectura

Monolito web en capas, con Next.js 16 (App Router) y TypeScript.

```
src/
├── app/            páginas (Server Components) y route handlers (api/**/route.ts)
├── componentes/    componentes de React
├── servicios/      lógica de negocio
├── repositorios/   acceso a datos con supabase-js
├── integraciones/  API de cotizaciones y cliente del modelo
├── ia/             prompt del sistema, few-shot y definición de las tools
├── validaciones/   schemas de Zod
├── errores/        errores propios
└── tipos/          tipos generados de Supabase y compartidos
supabase/migrations/  SQL versionado
```

Las dependencias van en un solo sentido: `app → servicios → repositorios / integraciones`.

Decisiones principales:

- **Los números los calcula el código, no el modelo.** Totales, conversiones y porcentajes se calculan en TypeScript (sumas en centavos enteros para evitar errores de coma flotante). El modelo solo interpreta el pedido y redacta la respuesta.
- **Las tools del modelo llaman a servicios** y no tienen lógica propia. El `viaje_id` lo inyecta siempre el servidor; el modelo nunca lo elige.
- **Todo se valida con Zod en el servidor:** entradas, argumentos de las tools, respuestas de la API de cotizaciones y resultados guardados.
- **Seguridad en la base:** RLS en todas las tablas, y `supabase-js` siempre corre con la sesión de la persona. La clave secreta de Supabase no se usa. La sesión viaja en cookies `httpOnly` y el navegador nunca habla directo con Supabase.
- **Cotizaciones:** [open.er-api.com](https://open.er-api.com) con timeout, reintentos con backoff, caché diaria en la base y, si la API falla, última cotización guardada con aviso. Si no hay ninguna, no se guarda el gasto.
- **Historial en el servidor:** el modelo recibe los últimos 20 mensajes más el contexto del viaje (moneda base, presupuesto, categorías, fecha de hoy y zona horaria). El servidor guarda cada mensaje antes de llamar al modelo.
- **Gastos de viajes cerrados:** un trigger en la base los bloquea, además de la validación en los servicios.

Tools del bot: `registrar_gasto`, `consultar_gastos`, `convertir_moneda`, `eliminar_gasto`, `crear_categoria` y `pedir_datos`.

## Correrlo en local

Requisitos: Node 22 o superior, una cuenta de Supabase, una API key de OpenAI.

```bash
npm install
cp .env.example .env.local
```

Completá `.env.local`:

| Variable | Para qué |
| --- | --- |
| `OPENAI_API_KEY` | Key de OpenAI (la usa solo el servidor) |
| `OPENAI_MODELO` | Opcional. Modelo del chat; por defecto `gpt-5.4-mini-2026-03-17` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable de Supabase |

Aplicá las migraciones a tu proyecto de Supabase y levantá la app:

```bash
npx supabase link --project-ref <ref-de-tu-proyecto>
npx supabase db push
npm run dev
```

Se abre en http://localhost:3000. En Supabase, desactivá la confirmación de email (Authentication → Providers → Email) para poder registrarte sin confirmar.

Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm run test`, `npm run test:watch`.

## Limitaciones conocidas

- Una persona que llame directo a la API de Supabase con su propia sesión podría guardar mensajes con rol de asistente o un `monto_convertido` inventado. Solo afecta sus propios datos (RLS); bloquearlo exigiría escribir con la clave secreta, que se descartó a propósito.
- El límite de 30 mensajes por hora no es transaccional: dos pedidos exactamente simultáneos pueden pasarlo por uno o dos mensajes.
- Si se cancela una respuesta, lo que el bot alcanzó a escribir se guarda al cerrarse el stream; en un despliegue serverless podría no completarse si la función se corta al desconectarse el navegador.
- Por chat solo se puede eliminar el último gasto cargado.
- Los montos se guardan con 2 decimales: monedas con 3 (por ejemplo el dinar kuwaití) pierden el último.
- Las respuestas del bot se muestran como texto plano, sin Markdown.
- El registro avisa si un email ya tiene cuenta (sin confirmación de email es inevitable; se priorizó un mensaje útil).

## Ideas futuras

La base de datos y parte de la lógica ya están preparadas (tablas `calificaciones`, `presupuestos_viaje` y `resumenes_viaje`, y las funciones `cerrar_viaje` y `reabrir_viaje`), pero estas historias no llegaron a implementarse.

### Estimar el presupuesto antes de viajar

Como viajero que está planificando un viaje, quiero que el bot me haga algunas preguntas y me arme un presupuesto estimado por categoría, para saber cuánta plata llevar y después controlar si me ajusto a lo planeado.

- El bot pregunta solo lo que no sabe (personas, auto, cocina o comidas afuera, nivel de gasto, actividades, compras), con opciones para tocar.
- Aclara que no incluye vuelo ni hospedaje y que es una estimación orientativa.
- Cada categoría muestra el monto y los supuestos; los totales los calcula el sistema a partir de costos diarios.
- Se estima en la moneda del destino y se muestra en la moneda base con la cotización usada.
- Puedo editar los montos antes de aceptar; al aceptar queda como presupuesto por categoría del viaje.

### Cerrar un viaje y ver su resumen

Como viajero, quiero cerrar un viaje terminado y ver un resumen de lo que gasté, para entender en qué se me fue la plata.

- Al cerrar se calculan y guardan total, total por categoría, promedio por día, comparación con el presupuesto y gastos más grandes.
- Si hubo presupuesto previo, se ve lo planificado contra lo real por categoría.
- Se guarda la foto de cotizaciones del día de cierre y el bot genera un resumen breve.
- El viaje cerrado queda en solo lectura y se puede reabrir.

### Calificar las respuestas

Como viajero, quiero marcar si una respuesta del bot me sirvió o no, para ayudar a mejorar el asistente.

- Cada respuesta del bot tiene pulgar arriba y abajo.
- La calificación se guarda y se puede cambiar.
- Solo se pueden calificar respuestas de los propios viajes.

### Otras ideas

- Comparar viajes cerrados en la moneda que se elija, con gasto promedio por día.
- Panel de debug con las tools llamadas, sus parámetros y los tokens por respuesta.
- Tests end-to-end con Cypress.
- Reintentar solo el resumen del modelo de un viaje cerrado, sin reabrirlo.
