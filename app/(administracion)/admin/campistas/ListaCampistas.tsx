"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Iglesia = {
  id: number;
  nombre: string;
};

type Campista = {
  id: number;
  identidad: string;
  nombre: string;
  telefono: string | null;
  genero: string | null;
  fecha_nacimiento: string | null;
  estado: string;
  fecha_registro: string;
  iglesia_id: number | null;

  iglesias:
    | Iglesia
    | Iglesia[]
    | null;
};

export default function ListaCampistas({
  campistas,
}: {
  campistas: Campista[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [genero, setGenero] = useState("TODOS");
  const [iglesiaId, setIglesiaId] = useState("TODAS");

  // ==========================================================
  // CATÁLOGO DE IGLESIAS EXISTENTES
  // ==========================================================

  const iglesias = useMemo(() => {
    const mapa = new Map<number, Iglesia>();

    campistas.forEach((campista) => {
      const iglesia = obtenerIglesia(campista.iglesias);

      if (iglesia) {
        mapa.set(iglesia.id, iglesia);
      }
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );
  }, [campistas]);

  // ==========================================================
  // FILTROS
  // ==========================================================

  const campistasFiltrados = useMemo(() => {
    const texto = normalizar(busqueda);

    return campistas.filter((campista) => {
      const iglesia = obtenerIglesia(campista.iglesias);

      // Buscar por nombre o identidad
      const coincideBusqueda =
        texto === "" ||
        normalizar(campista.nombre).includes(texto) ||
        normalizar(campista.identidad).includes(texto);

      // Estado
      const coincideEstado =
        estado === "TODOS" ||
        campista.estado === estado;

      // Género
      const coincideGenero =
        genero === "TODOS" ||
        campista.genero === genero;

      // Iglesia
      const coincideIglesia =
        iglesiaId === "TODAS" ||
        String(iglesia?.id || "") === iglesiaId;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideGenero &&
        coincideIglesia
      );
    });
  }, [
    campistas,
    busqueda,
    estado,
    genero,
    iglesiaId,
  ]);

  const hayFiltros =
    busqueda !== "" ||
    estado !== "TODOS" ||
    genero !== "TODOS" ||
    iglesiaId !== "TODAS";

  function limpiarFiltros() {
    setBusqueda("");
    setEstado("TODOS");
    setGenero("TODOS");
    setIglesiaId("TODAS");
  }

  return (
    <>
      {/* FILTROS */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          {/* BUSCADOR */}
          <div className="lg:col-span-2">
            <label
              htmlFor="busqueda"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Buscar campista
            </label>

            <div className="relative">
              <input
                id="busqueda"
                type="text"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                placeholder="Nombre o número de identidad..."
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 hover:text-slate-700"
                  title="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* ESTADO */}
          <div>
            <label
              htmlFor="estado"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Estado
            </label>

            <select
              id="estado"
              value={estado}
              onChange={(e) =>
                setEstado(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="TODOS">
                Todos
              </option>

              <option value="ACTIVO">
                Activos
              </option>

              <option value="INACTIVO">
                Inactivos
              </option>
            </select>
          </div>

          {/* GÉNERO */}
          <div>
            <label
              htmlFor="genero"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Género
            </label>

            <select
              id="genero"
              value={genero}
              onChange={(e) =>
                setGenero(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="TODOS">
                Todos
              </option>

              <option value="MASCULINO">
                Masculino
              </option>

              <option value="FEMENINO">
                Femenino
              </option>
            </select>
          </div>
        </div>

        {/* SEGUNDA FILA */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-sm">
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
              <option value="TODAS">
                Todas las iglesias
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

          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* RESULTADOS */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            Mostrando{" "}
            <span className="font-semibold text-slate-900">
              {campistasFiltrados.length}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-900">
              {campistas.length}
            </span>{" "}
            campistas
          </p>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {campistasFiltrados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Nombre
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Identidad
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Iglesia
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Género
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Edad
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {campistasFiltrados.map((campista) => {
                  const iglesia = obtenerIglesia(
                    campista.iglesias
                  );

                  const edad = calcularEdad(
                    campista.fecha_nacimiento
                  );

                  return (
                    <tr
                      key={campista.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {campista.nombre}
                        </p>

                        {campista.telefono && (
                          <p className="mt-1 text-xs text-slate-400">
                            {campista.telefono}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {campista.identidad}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {iglesia?.nombre || "Sin iglesia"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatearGenero(
                          campista.genero
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {edad !== null
                          ? `${edad} años`
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            campista.estado === "ACTIVO"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {campista.estado}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/campistas/${campista.id}`}
                          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">
              No encontramos campistas
            </p>

            <p className="mt-2 text-sm text-slate-500">
              No hay campistas que coincidan con los filtros seleccionados.
            </p>

            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function obtenerIglesia(
  relacion: Iglesia | Iglesia[] | null
): Iglesia | null {
  if (!relacion) {
    return null;
  }

  if (Array.isArray(relacion)) {
    return relacion[0] || null;
  }

  return relacion;
}

function normalizar(valor: string) {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function calcularEdad(fecha: string | null) {
  if (!fecha) {
    return null;
  }

  const nacimiento = new Date(`${fecha}T00:00:00`);
  const hoy = new Date();

  let edad =
    hoy.getFullYear() - nacimiento.getFullYear();

  const diferenciaMes =
    hoy.getMonth() - nacimiento.getMonth();

  if (
    diferenciaMes < 0 ||
    (diferenciaMes === 0 &&
      hoy.getDate() < nacimiento.getDate())
  ) {
    edad--;
  }

  return edad;
}

function formatearGenero(genero: string | null) {
  if (genero === "MASCULINO") {
    return "Masculino";
  }

  if (genero === "FEMENINO") {
    return "Femenino";
  }

  return "No registrado";
}