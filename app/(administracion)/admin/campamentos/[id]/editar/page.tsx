"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Campamento = {
  id: number;
  nombre: string;
  precio_inscripcion: number | string;
  fecha_inicio: string | null;
  fecha_limite_pago: string | null;
  estado: string;
};

export default function EditarCampamentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = params.id;

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaLimitePago, setFechaLimitePago] =
    useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarCampamento() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("campamentos")
        .select(`
          id,
          nombre,
          precio_inscripcion,
          fecha_inicio,
          fecha_limite_pago,
          estado
        `)
        .eq("id", id)
        .single<Campamento>();

      if (error || !data) {
        setError("No se pudo cargar el campamento.");
        setCargando(false);
        return;
      }

      setNombre(data.nombre);
      setPrecio(String(data.precio_inscripcion));
      setFechaInicio(data.fecha_inicio || "");
      setFechaLimitePago(
        data.fecha_limite_pago || ""
      );

      setCargando(false);
    }

    if (id) {
      cargarCampamento();
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

    if (!precio || Number(precio) <= 0) {
      setError(
        "Ingresa un precio de inscripción válido."
      );
      return;
    }

    if (
      fechaInicio &&
      fechaLimitePago &&
      fechaLimitePago > fechaInicio
    ) {
      setError(
        "La fecha límite de pago no puede ser posterior a la fecha del campamento."
      );
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch(
        `/api/campamentos/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            precio_inscripcion: Number(precio),
            fecha_inicio: fechaInicio || null,
            fecha_limite_pago:
              fechaLimitePago || null,
          }),
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo actualizar el campamento."
        );
        return;
      }

      router.push(`/admin/campamentos/${id}`);
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
          Cargando campamento...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href={`/admin/campamentos/${id}`}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver al campamento
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Editar campamento
        </h1>

        <p className="mt-2 text-slate-500">
          Actualiza la configuración del campamento.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <form
          onSubmit={guardarCambios}
          className="space-y-6"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Nombre del campamento *
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Precio de inscripción *
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                L
              </span>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={precio}
                onChange={(e) =>
                  setPrecio(e.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Cambiar este precio no modifica automáticamente
              las metas de las personas que ya están inscritas.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Fecha del campamento
              </label>

              <input
                type="date"
                value={fechaInicio}
                onChange={(e) =>
                  setFechaInicio(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Fecha límite de pago
              </label>

              <input
                type="date"
                value={fechaLimitePago}
                onChange={(e) =>
                  setFechaLimitePago(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Link
              href={`/admin/campamentos/${id}`}
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
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}