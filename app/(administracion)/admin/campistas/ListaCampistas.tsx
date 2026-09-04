"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Iglesia = {
  id: number;
  nombre: string;
};

type EstadoPago =
  | "COMPLETO"
  | "PENDIENTE"
  | "SIN_INSCRIPCION";

type Campista = {
  id: number;

  codigo_campista: string;

  identidad: string | null;

  nombre: string;
  telefono: string | null;
  genero: string | null;
  fecha_nacimiento: string | null;
  estado: string;
  fecha_registro: string;
  iglesia_id: number | null;

  iglesias: Iglesia | Iglesia[] | null;

  campamento: string | null;

  meta: number;
  total_ahorrado: number;
  falta_por_pagar: number;

  estado_pago: EstadoPago;
};

export default function ListaCampistas({
  campistas,
}: {
  campistas: Campista[];
}) {
  // ==========================================================
  // FILTROS
  // ==========================================================

  const [busqueda, setBusqueda] = useState("");

  const [estado, setEstado] =
    useState("TODOS");

  const [genero, setGenero] =
    useState("TODOS");

  const [iglesiaId, setIglesiaId] =
    useState("TODAS");

  const [estadoPago, setEstadoPago] =
    useState("TODOS");

  // ==========================================================
  // CATÁLOGO DE IGLESIAS
  // ==========================================================

  const iglesias = useMemo(() => {
    const mapa =
      new Map<number, Iglesia>();

    campistas.forEach(
      (campista) => {
        const iglesia =
          obtenerIglesia(
            campista.iglesias
          );

        if (iglesia) {
          mapa.set(
            iglesia.id,
            iglesia
          );
        }
      }
    );

    return Array.from(
      mapa.values()
    ).sort((a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        "es"
      )
    );
  }, [campistas]);

  // ==========================================================
  // FILTRAR CAMPISTAS
  // ==========================================================

  const campistasFiltrados =
    useMemo(() => {
      const texto =
        normalizar(busqueda);

      return campistas.filter(
        (campista) => {
          const iglesia =
            obtenerIglesia(
              campista.iglesias
            );

          // ----------------------------------------------
          // BÚSQUEDA
          // ----------------------------------------------

          const id =
            String(
              campista.id
            );

          const codigo =
            campista.codigo_campista ||
            "";

          const identidad =
            campista.identidad ||
            "";

          const coincideBusqueda =
            texto === "" ||
            normalizar(
              campista.nombre
            ).includes(texto) ||
            normalizar(
              codigo
            ).includes(texto) ||
            normalizar(
              identidad
            ).includes(texto) ||
            normalizar(
              id
            ).includes(texto);

          // ----------------------------------------------
          // ESTADO CAMPISTA
          // ----------------------------------------------

          const coincideEstado =
            estado === "TODOS" ||
            campista.estado ===
              estado;

          // ----------------------------------------------
          // GÉNERO
          // ----------------------------------------------

          const coincideGenero =
            genero === "TODOS" ||
            campista.genero ===
              genero;

          // ----------------------------------------------
          // IGLESIA
          // ----------------------------------------------

          const coincideIglesia =
            iglesiaId === "TODAS" ||
            String(
              iglesia?.id || ""
            ) === iglesiaId;

          // ----------------------------------------------
          // ESTADO DE PAGO
          // ----------------------------------------------

          const coincideEstadoPago =
            estadoPago === "TODOS" ||
            campista.estado_pago ===
              estadoPago;

          return (
            coincideBusqueda &&
            coincideEstado &&
            coincideGenero &&
            coincideIglesia &&
            coincideEstadoPago
          );
        }
      );
    }, [
      campistas,
      busqueda,
      estado,
      genero,
      iglesiaId,
      estadoPago,
    ]);

  // ==========================================================
  // RESUMEN DE PAGOS
  // ==========================================================

  const resumen = useMemo(() => {
    const completos =
      campistas.filter(
        (campista) =>
          campista.estado_pago ===
          "COMPLETO"
      ).length;

    const pendientes =
      campistas.filter(
        (campista) =>
          campista.estado_pago ===
          "PENDIENTE"
      ).length;

    const sinInscripcion =
      campistas.filter(
        (campista) =>
          campista.estado_pago ===
          "SIN_INSCRIPCION"
      ).length;

    return {
      completos,
      pendientes,
      sinInscripcion,
    };
  }, [campistas]);

  // ==========================================================
  // SABER SI HAY FILTROS
  // ==========================================================

  const hayFiltros =
    busqueda !== "" ||
    estado !== "TODOS" ||
    genero !== "TODOS" ||
    iglesiaId !== "TODAS" ||
    estadoPago !== "TODOS";

  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  function limpiarFiltros() {
    setBusqueda("");
    setEstado("TODOS");
    setGenero("TODOS");
    setIglesiaId("TODAS");
    setEstadoPago("TODOS");
  }

  return (
    <>
      {/* ======================================================
          RESUMEN
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {/* COMPLETOS */}
        <button
          type="button"
          onClick={() =>
            setEstadoPago(
              "COMPLETO"
            )
          }
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <p className="text-sm font-semibold text-emerald-700">
            Pagaron completo
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-800">
            {resumen.completos}
          </p>

          <p className="mt-1 text-xs text-emerald-600">
            Campistas
          </p>
        </button>

        {/* PENDIENTES */}
        <button
          type="button"
          onClick={() =>
            setEstadoPago(
              "PENDIENTE"
            )
          }
          className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-300 hover:bg-amber-100"
        >
          <p className="text-sm font-semibold text-amber-700">
            Pendientes de pago
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-800">
            {resumen.pendientes}
          </p>

          <p className="mt-1 text-xs text-amber-600">
            Campistas
          </p>
        </button>

        {/* SIN INSCRIPCIÓN */}
        <button
          type="button"
          onClick={() =>
            setEstadoPago(
              "SIN_INSCRIPCION"
            )
          }
          className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-slate-100"
        >
          <p className="text-sm font-semibold text-slate-600">
            Sin inscripción
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-800">
            {
              resumen.sinInscripcion
            }
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Campistas
          </p>
        </button>
      </div>

      {/* ======================================================
          FILTROS
      ====================================================== */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {/* BUSCADOR */}
          <div className="md:col-span-2">
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
                  setBusqueda(
                    e.target.value
                  )
                }
                placeholder="ID, código, nombre o identidad..."
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              {busqueda && (
                <button
                  type="button"
                  onClick={() =>
                    setBusqueda("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 hover:text-slate-700"
                  title="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Puedes buscar por ID,
              código CAM, nombre o
              identidad.
            </p>
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
                setEstado(
                  e.target.value
                )
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
                setGenero(
                  e.target.value
                )
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

          {/* ESTADO DE PAGO */}
          <div>
            <label
              htmlFor="estadoPago"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Estado de pago
            </label>

            <select
              id="estadoPago"
              value={estadoPago}
              onChange={(e) =>
                setEstadoPago(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="TODOS">
                Todos
              </option>

              <option value="PENDIENTE">
                Pendientes
              </option>

              <option value="COMPLETO">
                Pagaron completo
              </option>

              <option value="SIN_INSCRIPCION">
                Sin inscripción
              </option>
            </select>
          </div>
        </div>

        {/* SEGUNDA FILA */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {/* IGLESIA */}
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
                setIglesiaId(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="TODAS">
                Todas las iglesias
              </option>

              {iglesias.map(
                (iglesia) => (
                  <option
                    key={
                      iglesia.id
                    }
                    value={
                      iglesia.id
                    }
                  >
                    {
                      iglesia.nombre
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* LIMPIAR */}
          {hayFiltros && (
            <button
              type="button"
              onClick={
                limpiarFiltros
              }
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
              {
                campistasFiltrados.length
              }
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-900">
              {
                campistas.length
              }
            </span>{" "}
            campistas
          </p>
        </div>
      </div>

      {/* ======================================================
          TABLA
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {campistasFiltrados.length >
        0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {/* ID */}
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ID
                  </th>

                  {/* CÓDIGO */}
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Código
                  </th>

                  {/* CAMPISTA */}
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Campista
                  </th>

                  {/* IGLESIA */}
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Iglesia
                  </th>

                  {/* CAMPAMENTO */}
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Campamento
                  </th>

                  {/* ESTADO PAGO */}
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado pago
                  </th>

                  {/* AHORRADO */}
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ahorrado
                  </th>

                  {/* FALTA */}
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Falta por pagar
                  </th>

                  {/* ACCIÓN */}
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {campistasFiltrados.map(
                  (campista) => {
                    const iglesia =
                      obtenerIglesia(
                        campista.iglesias
                      );

                    return (
                      <tr
                        key={
                          campista.id
                        }
                        className="transition hover:bg-slate-50"
                      >
                        {/* ============================== */}
                        {/* ID */}
                        {/* ============================== */}

                        <td className="whitespace-nowrap px-4 py-4">
                          <span className="text-sm font-bold text-slate-600">
                            #
                            {
                              campista.id
                            }
                          </span>
                        </td>

                        {/* ============================== */}
                        {/* CÓDIGO CAMPISTA */}
                        {/* ============================== */}

                        <td className="whitespace-nowrap px-4 py-4">
                          <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-slate-700">
                            {campista.codigo_campista ||
                              "—"}
                          </span>
                        </td>

                        {/* ============================== */}
                        {/* CAMPISTA */}
                        {/* ============================== */}

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {
                              campista.nombre
                            }
                          </p>

                          {campista.identidad ? (
                            <p className="mt-1 text-xs text-slate-400">
                              Identidad:{" "}
                              {
                                campista.identidad
                              }
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-slate-400">
                              Sin identidad
                              registrada
                            </p>
                          )}
                        </td>

                        {/* ============================== */}
                        {/* IGLESIA */}
                        {/* ============================== */}

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {iglesia?.nombre ||
                            "Sin iglesia"}
                        </td>

                        {/* ============================== */}
                        {/* CAMPAMENTO */}
                        {/* ============================== */}

                        <td className="px-5 py-4">
                          {campista.campamento ? (
                            <p className="text-sm font-medium text-slate-700">
                              {
                                campista.campamento
                              }
                            </p>
                          ) : (
                            <span className="text-sm text-slate-400">
                              —
                            </span>
                          )}
                        </td>

                        {/* ============================== */}
                        {/* ESTADO PAGO */}
                        {/* ============================== */}

                        <td className="px-5 py-4">
                          <EstadoPagoBadge
                            estado={
                              campista.estado_pago
                            }
                          />
                        </td>

                        {/* ============================== */}
                        {/* AHORRADO */}
                        {/* ============================== */}

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          {campista.estado_pago ===
                          "SIN_INSCRIPCION" ? (
                            <span className="text-sm text-slate-400">
                              —
                            </span>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-slate-900">
                                {formatearMoneda(
                                  campista.total_ahorrado
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                de{" "}
                                {formatearMoneda(
                                  campista.meta
                                )}
                              </p>
                            </>
                          )}
                        </td>

                        {/* ============================== */}
                        {/* FALTA POR PAGAR */}
                        {/* ============================== */}

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          {campista.estado_pago ===
                          "SIN_INSCRIPCION" ? (
                            <span className="text-sm text-slate-400">
                              —
                            </span>
                          ) : campista.estado_pago ===
                            "COMPLETO" ? (
                            <span className="text-sm font-bold text-emerald-700">
                              L 0.00
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-amber-700">
                              {formatearMoneda(
                                campista.falta_por_pagar
                              )}
                            </span>
                          )}
                        </td>

                        {/* ============================== */}
                        {/* ACCIÓN */}
                        {/* ============================== */}

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/campistas/${campista.id}`}
                            className="inline-flex rounded-lg px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ==================================================
             SIN RESULTADOS
          ================================================== */

          <div className="px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">
              No encontramos
              campistas
            </p>

            <p className="mt-2 text-sm text-slate-500">
              No hay campistas que
              coincidan con los
              filtros seleccionados.
            </p>

            {hayFiltros && (
              <button
                type="button"
                onClick={
                  limpiarFiltros
                }
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

// ==========================================================
// BADGE ESTADO DE PAGO
// ==========================================================

function EstadoPagoBadge({
  estado,
}: {
  estado: EstadoPago;
}) {
  if (
    estado === "COMPLETO"
  ) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        ✓ Pagado completo
      </span>
    );
  }

  if (
    estado === "PENDIENTE"
  ) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        Pendiente
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      Sin inscripción
    </span>
  );
}

// ==========================================================
// IGLESIA
// ==========================================================

function obtenerIglesia(
  relacion:
    | Iglesia
    | Iglesia[]
    | null
): Iglesia | null {
  if (!relacion) {
    return null;
  }

  if (
    Array.isArray(relacion)
  ) {
    return (
      relacion[0] ||
      null
    );
  }

  return relacion;
}

// ==========================================================
// NORMALIZAR TEXTO
// ==========================================================

function normalizar(
  valor:
    | string
    | number
    | null
    | undefined
) {
  return String(
    valor ?? ""
  )
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim();
}

// ==========================================================
// MONEDA
// ==========================================================

function formatearMoneda(
  valor: number
) {
  return `L ${Number(
    valor || 0
  ).toLocaleString(
    "es-HN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}