"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditarIglesiaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = params.id;

  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarIglesia() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("iglesias")
        .select(`
          id,
          nombre,
          estado
        `)
        .eq("id", id)
        .single();

      if (error || !data) {
        setError("No se pudo cargar la iglesia.");
        setCargando(false);
        return;
      }

      setNombre(data.nombre);
      setCargando(false);
    }

    if (id) {
      cargarIglesia();
    }
  }, [id]);

  async function guardarCambios(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch(
        `/api/iglesias/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
          }),
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo actualizar la iglesia."
        );
        return;
      }

      router.push(`/admin/iglesias/${id}`);
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
          Cargando iglesia...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href={`/admin/iglesias/${id}`}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver a la iglesia
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Editar iglesia
        </h1>

        <p className="mt-2 text-slate-500">
          Actualiza el nombre de la iglesia participante.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <form
          onSubmit={guardarCambios}
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
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Link
              href={`/admin/iglesias/${id}`}
              className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}