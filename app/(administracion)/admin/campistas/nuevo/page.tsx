"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Iglesia = {
  id: number;
  nombre: string;
};

export default function NuevoCampistaPage() {
  const [identidad, setIdentidad] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const [iglesiaId, setIglesiaId] = useState("");
  const [genero, setGenero] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const [iglesias, setIglesias] = useState<Iglesia[]>([]);

  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cargandoIglesias, setCargandoIglesias] = useState(true);

  const [pinGenerado, setPinGenerado] = useState("");
  const [campistaRegistrado, setCampistaRegistrado] = useState("");

  useEffect(() => {
    async function cargarIglesias() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("iglesias")
        .select("id, nombre")
        .eq("estado", "ACTIVO")
        .order("nombre", { ascending: true });

      if (error) {
        setError("No se pudo cargar el catálogo de iglesias.");
        setCargandoIglesias(false);
        return;
      }

      setIglesias(data || []);
      setCargandoIglesias(false);
    }

    cargarIglesias();
  }, []);

  async function guardarCampista(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (!identidad.trim() || !nombre.trim()) {
      setError("Identidad y nombre son obligatorios.");
      return;
    }

    if (!genero) {
      setError("Selecciona el género.");
      return;
    }

    if (!fechaNacimiento) {
      setError("Ingresa la fecha de nacimiento.");
      return;
    }

    if (new Date(fechaNacimiento) > new Date()) {
      setError("La fecha de nacimiento no puede ser futura.");
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch("/api/campistas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identidad: identidad.trim(),
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          iglesia_id: iglesiaId
            ? Number(iglesiaId)
            : null,
          genero,
          fecha_nacimiento: fechaNacimiento,
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo registrar el campista."
        );
        return;
      }

      setPinGenerado(resultado.pin);
      setCampistaRegistrado(resultado.campista.nombre);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  if (pinGenerado) {
    return (
      <div className="max-w-xl">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Campista registrado
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Registro exitoso
          </h1>

          <p className="mt-3 text-slate-500">
            {campistaRegistrado} fue registrado correctamente.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-500">
              PIN de consulta
            </p>

            <p className="mt-3 text-4xl font-bold tracking-[0.25em] text-slate-900">
              {pinGenerado}
            </p>

            <p className="mt-4 text-sm text-slate-500">
              Entrega este PIN al campista. Lo usará junto
              con su identidad para consultar su ahorro.
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
              className="w-full rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Copiar PIN
            </button>

            <Link
              href="/admin/campistas"
              className="block w-full rounded-xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Finalizar
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
          href="/admin/campistas"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver a campistas
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Registrar campista
        </h1>

        <p className="mt-2 text-slate-500">
          Ingresa los datos personales del campista.
        </p>
      </div>

      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={guardarCampista} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Número de identidad *
            </label>

            <input
              type="text"
              value={identidad}
              onChange={(e) => setIdentidad(e.target.value)}
              placeholder="0801-2000-00000"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Nombre completo *
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Género *
              </label>

              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">
                  Selecciona una opción
                </option>

                <option value="MASCULINO">
                  Masculino
                </option>

                <option value="FEMENINO">
                  Femenino
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Fecha de nacimiento *
              </label>

              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) =>
                  setFechaNacimiento(e.target.value)
                }
                required
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Teléfono
              </label>

              <input
                type="tel"
                value={telefono}
                onChange={(e) =>
                  setTelefono(e.target.value)
                }
                placeholder="9999-9999"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Iglesia
              </label>

              <select
                value={iglesiaId}
                onChange={(e) =>
                  setIglesiaId(e.target.value)
                }
                disabled={cargandoIglesias}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              >
                <option value="">
                  {cargandoIglesias
                    ? "Cargando iglesias..."
                    : "Selecciona una iglesia"}
                </option>

                {iglesias.map((iglesia) => (
                  <option
                    key={iglesia.id}
                    value={iglesia.id}
                  >
                    {iglesia.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            El sistema generará automáticamente un PIN de consulta de 6 dígitos.
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/admin/campistas"
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
                ? "Registrando..."
                : "Registrar campista"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}