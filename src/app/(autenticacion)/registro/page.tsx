import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAutenticacion } from "@/componentes/autenticacion/FormularioAutenticacion";
import { RUTA_INGRESAR } from "@/lib/rutas";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
  return (
    <section aria-labelledby="titulo-formulario" className="flex flex-col gap-6">
      <h2 id="titulo-formulario" className="text-2xl font-semibold tracking-tight">
        Creá tu cuenta
      </h2>
      <FormularioAutenticacion modo="registro" />
      <p>
        ¿Ya tenés cuenta?{" "}
        <Link href={RUTA_INGRESAR} className="font-medium underline underline-offset-4">
          Ingresá
        </Link>
      </p>
    </section>
  );
}
