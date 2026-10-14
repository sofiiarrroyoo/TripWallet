import { redirect } from "next/navigation";
import { RUTA_INICIO_PRIVADO } from "@/lib/rutas";

// El proxy ya redirige "/" según haya sesión; esto queda como respaldo.
export default function Inicio() {
  redirect(RUTA_INICIO_PRIVADO);
}
