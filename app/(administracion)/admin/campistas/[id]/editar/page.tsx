"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Iglesia = {
  id: number;
  nombre: string;
};

type Campista = {
  id: number;
  identidad: string;
  nombre: string;
  telefono: string | null;
  iglesia_id: number | null;
  genero: string | null;
  fecha_nacimiento: string | null;
  estado: string;
};

export default function EditarCampistaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = params.id;

  const [identidad, setIdentidad] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [iglesiaId, setIglesiaId] = useState("");
  const [genero, setGenero] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const [iglesias, setIglesias] = useState<Iglesia[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      const supabase = createClient();

      const [
        resultadoCampista,
        resultadoIglesias,
      ] = await Promise.all([
        supabase
          .from("campistas")
          .select(`
            id,
            identidad,
            nombre,
            telefono,
            iglesia_id,
            genero,
            fecha_nacimiento,
            estado
          `)
          .eq("id", id)
          .single<Campista>(),

        supabase
          .from("iglesias")
          .select(`
            id,
            nombre
          `)
          .eq("estado", "ACTIVO")
          .order("nombre", { ascending: true }),
      ]);

      if (
        resultadoCampista.error ||
        !resultadoCampista.data
      ) {
        setError(
          "No se pudo cargar la información del campista."
        );
        setCargando(false);
        return;
      }

      if (resultadoIglesias.error) {
        setError(
          "No se pudo cargar el catálogo de iglesias."
        );
        setCargando(false);
        return;
      }

      const campista = resultadoCampista.data;

      setIdentidad(campista.identidad);
      setNombre(campista.nombre);
      setTelefono(campista.telefono || "");

      setIglesiaId(
        campista.iglesia_id
          ? String(campista.iglesia_id)
          : ""
      );

      setGenero(campista.genero || "");

      setFechaNacimiento(
        campista.fecha_nacimiento || ""
      );

      setIglesias(resultadoIglesias.data || []);

      setCargando(false);
    }

    if (id) {
      cargarDatos();
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

    if (!genero) {
      setError("Selecciona el género.");
      return;
    }

    if (!fechaNacimiento) {
      setError(
        "Ingresa la fecha de nacimiento."
      );
      return;
    }

    if (
      new Date(`${fechaNacimiento}T00:00:00`) >
      new Date()
    ) {
      setError(
        "La fecha de nacimiento no puede ser futura."
      );
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch(
        `/api/campistas/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            telefono: telefono.trim(),
            iglesia_id: iglesiaId
              ? Number(iglesiaId)
              : null,
            genero,
            fecha_nacimiento: fechaNacimiento,
          }),
        }
      );

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo actualizar el campista."
        );
        return;
      }

      router.push(`/admin/campistas/${id}`);
      router.refresh();
    } catch {
      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">
          Cargando información del campista...
        </p>
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
          Editar campista
        </h1>

        <p className="mt-2 text-slate-500">
          Actualiza la información personal del campista.
        </p>
      </div>

      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <form
          onSubmit={guardarCambios}
          className="space-y-6"
        >
          {/* IDENTIDAD */}
          <div>
            <label
              htmlFor="identidad"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Número de identidad
            </label>

            <input
              id="identidad"
              type="text"
              value={identidad}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
            />

            <p className="mt-2 text-xs text-slate-400">
              La identidad no se puede modificar desde esta pantalla.
            </p>
          </div>

          {/* NOMBRE */}
          <div>
            <label
              htmlFor="nombre"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Nombre completo *
            </label>

            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* GÉNERO + FECHA NACIMIENTO */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="genero"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Género *
              </label>

              <select
                id="genero"
                value={genero}
                onChange={(e) =>
                  setGenero(e.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
              <label
                htmlFor="fechaNacimiento"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Fecha de nacimiento *
              </label>

              <input
                id="fechaNacimiento"
                type="date"
                value={fechaNacimiento}
                onChange={(e) =>
                  setFechaNacimiento(e.target.value)
                }
                required
                max={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* TELÉFONO + IGLESIA */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="telefono"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Teléfono
              </label>

              <input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) =>
                  setTelefono(e.target.value)
                }
                placeholder="9999-9999"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="iglesia"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Iglesia
              </label>

              <select
                id="iglesia"
                value={iglesiaId}
                onChange={(e) =>
                  setIglesiaId(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">
                  Sin iglesia asignada
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

          {/* ERROR */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* BOTONES */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Link
              href={`/admin/campistas/${id}`}
              className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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