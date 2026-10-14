import type { LlamadaTool } from "@/validaciones/mensajes";

export type RolMensaje = "user" | "assistant";

export type Mensaje = {
  id: string;
  viajeId: string;
  rol: RolMensaje;
  contenido: string;
  llamadasTools: LlamadaTool[];
  tokensEntrada: number | null;
  tokensSalida: number | null;
  modelo: string | null;
  creadoEn: string;
};
