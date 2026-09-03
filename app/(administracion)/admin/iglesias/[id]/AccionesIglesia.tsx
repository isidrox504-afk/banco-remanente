"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccionesIglesia({
  id,
  estadoActual,
}: {
  id: number;
  estadoActual: string;
}) {
  const router = useRouter();

  const [procesandoEstado, setProcesandoEstado] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  const estaActiva = estadoActual === "ACTIVO";

  async function cambiarEstado() {
    const nuevoEstado = estaActiva
      ? "INACTIVO"
      : "ACTIVO";

    const confirmado = window.confirm(
      estaActiva
        ? "¿Deseas desactivar esta iglesia?"
        : "¿Deseas activar nuevamente esta iglesia?"
    );

    if (!confirmado) {
      return;
    }

    setProcesandoEstado(true);
    setError("");

    try {
      const response = await fetch(
        `/api/iglesias/${id}`,
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
            "No se pudo cambiar el estado de la iglesia."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setProcesandoEstado(false);
    }
  }

  async function eliminarIglesia() {
    const confirmado = window.confirm(
      "¿Estás seguro de que deseas eliminar esta iglesia? Esta acción no se puede deshacer."
    );

    if (!confirmado) {
      return;
    }

    setEliminando(true);
    setError("");

    try {
      const response = await fetch(
        `/api/iglesias/${id}`,
        {
          method: "DELETE",
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo eliminar la iglesia."
        );
        return;
      }

      router.push("/admin/iglesias");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={cambiarEstado}
        disabled={procesandoEstado || eliminando}
        className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          estaActiva
            ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {procesandoEstado
          ? "Procesando..."
          : estaActiva
            ? "Desactivar iglesia"
            : "Activar iglesia"}
      </button>

      <button
        type="button"
        onClick={eliminarIglesia}
        disabled={procesandoEstado || eliminando}
        className="w-full rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {eliminando
          ? "Eliminando..."
          : "Eliminar iglesia"}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}