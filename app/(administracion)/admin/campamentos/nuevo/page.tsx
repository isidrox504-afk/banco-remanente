"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Iglesia = {
  id: number;
  nombre: string;
};

export default function NuevoCampamentoPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaLimitePago, setFechaLimitePago] = useState("");

  const [iglesias, setIglesias] = useState<Iglesia[]>([]);
  const [preciosIglesia, setPreciosIglesia] = useState<
    Record<number, string>
  >({});

  const [cargandoIglesias, setCargandoIglesias] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargarIglesias() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("iglesias")
          .select("id, nombre")
          .eq("estado", "ACTIVO")
          .order("nombre");

        if (error) {
          setError("No se pudieron cargar las iglesias activas.");
          return;
        }

        setIglesias((data || []) as Iglesia[]);
      } catch {
        setError("Ocurrió un error al cargar las iglesias.");
      } finally {
        setCargandoIglesias(false);
      }
    }

    cargarIglesias();
  }, []);

  function cambiarPrecioIglesia(iglesiaId: number, valor: string) {
    setPreciosIglesia((actuales) => ({
      ...actuales,
      [iglesiaId]: valor,
    }));
  }

  async function guardarCampamento(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    const precioGeneral = Number(precio);

    if (!nombre.trim()) {
      setError("El nombre del campamento es obligatorio.");
      return;
    }

    if (
      !precio ||
      !Number.isFinite(precioGeneral) ||
      precioGeneral <= 0
    ) {
      setError("Ingresa un precio de inscripción válido.");
      return;
    }

    if (
      fechaInicio &&
      fechaLimitePago &&
      fechaLimitePago > fechaInicio
    ) {
      setError(
        "La fecha límite de pago no puede ser posterior al inicio del campamento."
      );
      return;
    }

    const preciosEspeciales: {
      iglesia_id: number;
      precio: number;
    }[] = [];

    for (const iglesia of iglesias) {
      const valor = (preciosIglesia[iglesia.id] || "").trim();

      if (!valor) {
        continue;
      }

      const precioEspecial = Number(valor);

      if (!Number.isFinite(precioEspecial) || precioEspecial < 0) {
        setError(
          `El precio de ${iglesia.nombre} debe ser un número válido mayor o igual a cero.`
        );
        return;
      }

      preciosEspeciales.push({
        iglesia_id: iglesia.id,
        precio: precioEspecial,
      });
    }

    setGuardando(true);

    try {
      const response = await fetch("/api/campamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          precio_inscripcion: precioGeneral,
          fecha_inicio: fechaInicio || null,
          fecha_limite_pago: fechaLimitePago || null,
          precios_iglesia: preciosEspeciales,
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error || "No se pudo crear el campamento."
        );
        return;
      }

      router.push("/admin/campamentos");
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
          href="/admin/campamentos"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver a campamentos
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Nuevo campamento
        </h1>

        <p className="mt-2 text-slate-500">
          Configura el campamento y los precios de inscripción por iglesia.
        </p>
      </div>

      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={guardarCampamento} className="space-y-6">
          <div>
            <label
              htmlFor="nombre"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Nombre del campamento *
            </label>

            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Campamento Remanente 2027"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="precio"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Precio general de inscripción *
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                L
              </span>

              <input
                id="precio"
                type="number"
                min="0.01"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="2500.00"
                required
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Este precio se utilizará para las iglesias que no tengan un precio especial.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Precios especiales por iglesia
            </h2>

            <p className="mt-1 mb-5 text-sm text-slate-500">
              Completa únicamente las iglesias que tendrán un precio diferente.
              Deja el campo vacío para utilizar el precio general.
            </p>

            {cargandoIglesias ? (
              <p className="text-sm text-slate-500">
                Cargando iglesias...
              </p>
            ) : iglesias.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay iglesias activas disponibles.
              </p>
            ) : (
              <div className="space-y-4">
                {iglesias.map((iglesia) => (
                  <div
                    key={iglesia.id}
                    className="grid gap-2 sm:grid-cols-[1fr_180px] sm:items-center"
                  >
                    <label
                      htmlFor={`iglesia-${iglesia.id}`}
                      className="text-sm font-medium text-slate-700"
                    >
                      {iglesia.nombre}
                    </label>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                        L
                      </span>

                      <input
                        id={`iglesia-${iglesia.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={preciosIglesia[iglesia.id] ?? ""}
                        onChange={(e) =>
                          cambiarPrecioIglesia(
                            iglesia.id,
                            e.target.value
                          )
                        }
                        placeholder={precio || "Precio general"}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="fechaInicio"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Fecha del campamento
              </label>

              <input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="fechaLimitePago"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Fecha límite de pago
              </label>

              <input
                id="fechaLimitePago"
                type="date"
                value={fechaLimitePago}
                onChange={(e) => setFechaLimitePago(e.target.value)}
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
              href="/admin/campamentos"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando || cargandoIglesias}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Crear campamento"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}