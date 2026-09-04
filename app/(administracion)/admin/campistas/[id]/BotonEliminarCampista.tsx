"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: number;
  nombre: string;
  codigoCampista: string;
};

export default function BotonEliminarCampista({
  id,
  nombre,
  codigoCampista,
}: Props) {
  const router = useRouter();

  const [mostrarConfirmacion, setMostrarConfirmacion] =
    useState(false);

  const [confirmacion, setConfirmacion] =
    useState("");

  const [eliminando, setEliminando] =
    useState(false);

  const [error, setError] =
    useState("");

  const puedeEliminar =
    confirmacion.trim().toUpperCase() ===
    "ELIMINAR";

  async function eliminarCampista() {
    if (!puedeEliminar) {
      return;
    }

    setError("");
    setEliminando(true);

    try {
      const response = await fetch(
        `/api/campistas/${id}`,
        {
          method: "DELETE",
        }
      );

      const resultado =
        await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo eliminar el campista."
        );
        return;
      }

      router.push("/admin/campistas");
      router.refresh();
    } catch {
      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setConfirmacion("");
          setMostrarConfirmacion(true);
        }}
        className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
      >
        Eliminar campista
      </button>

      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">
              ⚠️
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Eliminar campista
            </h2>

            <p className="mt-3 leading-6 text-slate-600">
              ¿Estás seguro de que deseas
              eliminar permanentemente a{" "}
              <span className="font-semibold text-slate-900">
                {nombre}
              </span>
              ?
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                {nombre}
              </p>

              <p className="mt-1 font-mono text-sm text-slate-500">
                {codigoCampista}
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-800">
                Esta acción eliminará:
              </p>

              <ul className="mt-3 space-y-2 text-sm text-red-700">
                <li>
                  • Los datos del campista
                </li>

                <li>
                  • Todas sus inscripciones
                </li>

                <li>
                  • Todo su historial de aportes
                </li>

                <li>
                  • Su código y acceso de consulta
                </li>
              </ul>

              <p className="mt-4 text-sm font-bold text-red-800">
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-700">
                Escribe{" "}
                <span className="font-bold text-red-600">
                  ELIMINAR
                </span>{" "}
                para confirmar
              </label>

              <input
                type="text"
                value={confirmacion}
                onChange={(e) =>
                  setConfirmacion(
                    e.target.value
                  )
                }
                disabled={eliminando}
                autoComplete="off"
                placeholder="ELIMINAR"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => {
                  setMostrarConfirmacion(false);
                  setConfirmacion("");
                  setError("");
                }}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  !puedeEliminar ||
                  eliminando
                }
                onClick={eliminarCampista}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {eliminando
                  ? "Eliminando..."
                  : "Sí, eliminar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}