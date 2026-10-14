import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAutenticacion } from "@/componentes/autenticacion/FormularioAutenticacion";
import { RUTA_REGISTRO } from "@/lib/rutas";

export const metadata: Metadata = { title: "Ingresar" };

export default function PaginaIngresar() {
  return (
    <section aria-labelledby="titulo-formulario" className="flex flex-col gap-6">
      <h2 id="titulo-formulario" className="text-2xl font-semibold tracking-tight">
        Ingresá a tu cuenta
      </h2>
      <FormularioAutenticacion modo="ingreso" />
      <p>
        ¿No tenés cuenta?{" "}
        <Link href={RUTA_REGISTRO} className="font-medium underline underline-offset-4">
          Creá una
        </Link>
      </p>
    </section>
  );
}
