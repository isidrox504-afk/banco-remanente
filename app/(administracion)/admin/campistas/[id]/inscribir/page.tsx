"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Campamento = {
  id: number;
  nombre: string;
  precio_inscripcion: number | string;
};

export default function InscribirCampistaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const campistaId = params.id;

  const [campamentos, setCampamentos] = useState<Campamento[]>([]);
  const [campamentoId, setCampamentoId] = useState("");
  const [meta, setMeta] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarCampamentos() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("campamentos")
        .select(`
          id,
          nombre,
          precio_inscripcion
        `)
        .eq("estado", "ACTIVO")
        .order("fecha_registro", { ascending: false });

      if (error) {
        setError("No se pudieron cargar los campamentos.");
        setCargando(false);
        return;
      }

      setCampamentos(data || []);
      setCargando(false);
    }

    cargarCampamentos();
  }, []);

  function cambiarCampamento(id: string) {
    setCampamentoId(id);

    const campamento = campamentos.find(
      (item) => item.id === Number(id)
    );

    if (campamento) {
      setMeta(String(campamento.precio_inscripcion));
    } else {
      setMeta("");
    }
  }

  async function guardarInscripcion(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (!campamentoId) {
      setError("Selecciona un campamento.");
      return;
    }

    if (!meta || Number(meta) <= 0) {
      setError("Ingresa una meta válida.");
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch("/api/inscripciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campista_id: Number(campistaId),
          campamento_id: Number(campamentoId),
          meta: Number(meta),
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo registrar la inscripción."
        );
        return;
      }

      router.push(`/admin/campistas/${campistaId}`);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">
          Cargando campamentos...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href={`/admin/campistas/${campistaId}`}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver al campista
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Inscribir a campamento
        </h1>

        <p className="mt-2 text-slate-500">
          Selecciona el campamento al que ahorrará este campista.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {campamentos.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-800">
              No hay campamentos activos
            </p>

            <p className="mt-2 text-sm text-amber-700">
              Primero debes crear o activar un campamento.
            </p>

            <Link
              href="/admin/campamentos/nuevo"
              className="mt-4 inline-block text-sm font-semibold text-amber-800 underline"
            >
              Crear campamento
            </Link>
          </div>
        ) : (
          <form onSubmit={guardarInscripcion} className="space-y-6">
            <div>
              <label
                htmlFor="campamento"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Campamento *
              </label>

              <select
                id="campamento"
                value={campamentoId}
                onChange={(e) =>
                  cambiarCampamento(e.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">
                  Selecciona un campamento
                </option>

                {campamentos.map((campamento) => (
                  <option
                    key={campamento.id}
                    value={campamento.id}
                  >
                    {campamento.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="meta"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Meta de ahorro *
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                  L
                </span>

                <input
                  id="meta"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={meta}
                  onChange={(e) => setMeta(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Se llena automáticamente con el precio del campamento,
                pero puedes ajustarlo si existe una beca o descuento.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                href={`/admin/campistas/${campistaId}`}
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
                  ? "Inscribiendo..."
                  : "Inscribir campista"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}