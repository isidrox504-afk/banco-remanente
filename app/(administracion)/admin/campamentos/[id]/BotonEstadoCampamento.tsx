"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BotonEstadoCampamento({
  id,
  estadoActual,
}: {
  id: number;
  estadoActual: string;
}) {
  const router = useRouter();

  const [procesando, setProcesando] =
    useState(false);

  const [error, setError] = useState("");

  const activo = estadoActual === "ACTIVO";

  async function cambiarEstado() {
    const nuevoEstado = activo
      ? "FINALIZADO"
      : "ACTIVO";

    const confirmado = window.confirm(
      activo
        ? "¿Deseas finalizar este campamento? Ya no aparecerá para nuevas inscripciones."
        : "¿Deseas reactivar este campamento?"
    );

    if (!confirmado) return;

    setProcesando(true);
    setError("");

    try {
      const response = await fetch(
        `/api/campamentos/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            estado: nuevoEstado,
          }),
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo cambiar el estado."
        );
        return;
      }

      router.refresh();
    } catch {
      setError(
        "No se pudo conectar con el servidor."
      );
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
        className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 ${
          activo
            ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {procesando
          ? "Procesando..."
          : activo
            ? "Finalizar campamento"
            : "Reactivar campamento"}
      </button>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </>
  );
}