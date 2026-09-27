"use client";

import { useState } from "react";
import { APP_CONFIG } from "@/lib/config/app";

interface Props {
  nombre: string;
  telefono: string | null;
  codigoCampista: string | null;
  pin: string | null;
}

export default function ReenviarCredencialesWhatsApp({
  nombre,
  telefono,
  codigoCampista,
  pin,
}: Props) {
  const [mensaje, setMensaje] = useState("");

  function normalizarTelefono(numero: string) {
    const limpio = numero.replace(/\D/g, "");

    if (limpio.length === 8) {
      return `504${limpio}`;
    }

    if (limpio.startsWith("504")) {
      return limpio;
    }

    return limpio;
  }

  function enviarWhatsApp() {
    if (!telefono) {
      setMensaje(
        "Este campista no tiene un número de teléfono registrado."
      );
      return;
    }

    if (!codigoCampista) {
      setMensaje(
        "Este campista no tiene un código de campista registrado."
      );
      return;
    }

    if (!pin) {
      setMensaje(
        "No se encontró el PIN de consulta de este campista."
      );
      return;
    }

    const telefonoNormalizado =
      normalizarTelefono(telefono);

    if (
      !telefonoNormalizado ||
      telefonoNormalizado.length < 11
    ) {
      setMensaje(
        "El número de teléfono registrado no es válido."
      );
      return;
    }

    const urlConsulta =
      `${window.location.origin}/consulta?codigo=${encodeURIComponent(
        codigoCampista
      )}`;

    const texto = `Hola, ${nombre} 👋

Te compartimos nuevamente tus credenciales de ${APP_CONFIG.nombre}.

🔐 Código de campista: ${codigoCampista}
🔑 PIN de consulta: ${pin}

Puedes consultar tu ahorro aquí:
${urlConsulta}

Guarda estos datos para futuras consultas. 🙌`;

    const urlWhatsApp =
      `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(
        texto
      )}`;

    window.open(
      urlWhatsApp,
      "_blank",
      "noopener,noreferrer"
    );

    setMensaje(
      "WhatsApp se abrió con las credenciales preparadas."
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={enviarWhatsApp}
        className="w-full rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-700"
      >
        📱 Reenviar credenciales por WhatsApp
      </button>

      {mensaje && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-600">
          {mensaje}
        </div>
      )}
    </div>
  );
}