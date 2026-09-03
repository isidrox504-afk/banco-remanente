"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function RegenerarPinPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [pinGenerado, setPinGenerado] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  async function generarNuevoPin() {
    setError("");
    setGenerando(true);

    try {
      const response = await fetch(`/api/campistas/${id}/pin`, {
        method: "POST",
      });

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error || "No se pudo generar el nuevo PIN."
        );
        return;
      }

      setPinGenerado(resultado.pin);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGenerando(false);
    }
  }

  if (pinGenerado) {
    return (
      <div className="max-w-xl">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            PIN actualizado
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Nuevo PIN generado
          </h1>

          <p className="mt-3 text-slate-500">
            El PIN anterior dejó de ser válido.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-500">
              Nuevo PIN
            </p>

            <p className="mt-3 text-4xl font-bold tracking-[0.25em] text-slate-900">
              {pinGenerado}
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Entrégale este nuevo PIN al campista.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(pinGenerado)
                  .catch(() => {});
              }}
              className="w-full rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Copiar PIN
            </button>

            <Link
              href={`/admin/campistas/${id}`}
              className="block w-full rounded-xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Volver al campista
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href={`/admin/campistas/${id}`}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver al campista
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Generar nuevo PIN
        </h1>

        <p className="mt-2 text-slate-500">
          Usa esta opción si el campista olvidó su PIN de consulta.
        </p>
      </div>

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800">
            Importante
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-700">
            Al generar un nuevo PIN, el PIN anterior dejará de funcionar.
            Deberás entregar el nuevo PIN al campista.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/admin/campistas/${id}`}
            className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="button"
            disabled={generando}
            onClick={generarNuevoPin}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generando
              ? "Generando..."
              : "Generar nuevo PIN"}
          </button>
        </div>
      </div>
    </>
  );
}