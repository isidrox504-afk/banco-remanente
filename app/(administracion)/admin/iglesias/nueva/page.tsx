"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NuevaIglesiaPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardarIglesia(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (!nombre.trim()) {
      setError("El nombre de la iglesia es obligatorio.");
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch("/api/iglesias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo registrar la iglesia."
        );
        return;
      }

      router.push("/admin/iglesias");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href="/admin/iglesias"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver a iglesias
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Registrar iglesia
        </h1>

        <p className="mt-2 text-slate-500">
          Agrega una nueva iglesia participante al catálogo.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <form
          onSubmit={guardarIglesia}
          className="space-y-6"
        >
          <div>
            <label
              htmlFor="nombre"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Nombre de la iglesia *
            </label>

            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              placeholder="Ej. Iglesia Remanente de Jehová"
              required
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/admin/iglesias"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando
                ? "Guardando..."
                : "Registrar iglesia"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}