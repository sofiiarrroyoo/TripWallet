"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type KeyboardEvent, type Ref } from "react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { MensajeErrorCampo } from "@/componentes/formularios/MensajeErrorCampo";

type Props = {
  ref: Ref<HTMLInputElement>;
  valor: string;
  onCambio: (valor: string) => void;
  autoComplete: "new-password" | "current-password";
  error?: string;
  ayuda?: string;
};

export function CampoContrasena({ ref, valor, onCambio, autoComplete, error, ayuda }: Props) {
  const [visible, setVisible] = useState(false);
  const [bloqMayus, setBloqMayus] = useState(false);

  function detectarBloqMayus(evento: KeyboardEvent<HTMLInputElement>) {
    setBloqMayus(evento.getModifierState("CapsLock"));
  }

  const descripcion = [error && "contrasena-error", ayuda && !error && "contrasena-ayuda"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="contrasena">Contraseña</Label>
      <div className="relative">
        <Input
          ref={ref}
          id="contrasena"
          name="contrasena"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={valor}
          onChange={(evento) => onCambio(evento.target.value)}
          onKeyDown={detectarBloqMayus}
          onKeyUp={detectarBloqMayus}
          onBlur={() => setBloqMayus(false)}
          aria-invalid={Boolean(error)}
          aria-describedby={descripcion || undefined}
          className="h-11 pr-12 text-base md:text-base"
        />
        <span className="absolute inset-y-0 right-1 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={() => setVisible((anterior) => !anterior)}
            aria-label="Mostrar contraseña"
            aria-pressed={visible}
            aria-controls="contrasena"
          >
            {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </span>
      </div>
      {ayuda && !error && (
        <p id="contrasena-ayuda" className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      <MensajeErrorCampo id="contrasena-error" mensaje={error} />
      {bloqMayus && <p className="text-sm">Bloq Mayús está activado.</p>}
      {/* Región siempre presente: los lectores de pantalla solo anuncian cambios en regiones que ya existían. */}
      <p aria-live="polite" className="sr-only">
        {bloqMayus ? "Bloq Mayús está activado." : ""}
      </p>
    </div>
  );
}
