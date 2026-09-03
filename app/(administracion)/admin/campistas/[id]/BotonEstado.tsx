"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: number;
  estadoActual: string;
};

export default function BotonEstado({
  id,
  estadoActual,
}: Props) {
  const router = useRouter();

  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const estaActivo = estadoActual === "ACTIVO";

  async function cambiarEstado() {
    const nuevoEstado = estaActivo ? "INACTIVO" : "ACTIVO";

    const mensaje = estaActivo
      ? "¿Estás seguro de que deseas desactivar este campista?"
      : "¿Deseas activar nuevamente este campista?";

    const confirmado = window.confirm(mensaje);

    if (!confirmado) {
      return;
    }

    setProcesando(true);
    setError("");

    try {
      const response = await fetch(`/api/campistas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: nuevoEstado,
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo cambiar el estado del campista."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={cambiarEstado}
        disabled={procesando}
        className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          estaActivo
            ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {procesando
          ? "Procesando..."
          : estaActivo
            ? "Desactivar campista"
            : "Activar campista"}
      </button>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </>
  );
}