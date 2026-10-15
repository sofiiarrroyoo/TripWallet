import { z } from "zod";

// Lo que acompaña a cada respuesta del bot y no es parte de su contenido: qué modelo la generó y cuántos tokens
// consumió. Llega por el stream mientras el bot responde y, al recargar la página, sale de la base. Lo lee el panel
// de debug. Los tokens son null si la respuesta se canceló (el proveedor no informa el uso).
export const esquemaMetadataMensaje = z.object({
  modelo: z.string().nullish(),
  tokensEntrada: z.number().nullish(),
  tokensSalida: z.number().nullish(),
});

export type MetadataMensaje = z.infer<typeof esquemaMetadataMensaje>;
