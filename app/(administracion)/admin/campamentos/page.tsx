import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CampamentosPage() {
  const supabase = await createClient();

  const { data: campamentos, error } = await supabase
    .from("campamentos")
    .select(`
      id,
      nombre,
      precio_inscripcion,
      fecha_inicio,
      fecha_limite_pago,
      estado,
      fecha_registro
    `)
    .order("fecha_registro", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar los campamentos: {error.message}
      </div>
    );
  }

  return (
    <>
      {/* CABECERA */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Campamentos
          </h1>

          <p className="mt-2 text-slate-500">
            Administra los campamentos y sus precios de inscripción.
          </p>
        </div>

        <Link
          href="/admin/campamentos/nuevo"
          className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          + Nuevo campamento
        </Link>
      </div>

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {campamentos && campamentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Campamento
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Inscripción
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Límite de pago
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
                {campamentos.map((campamento) => (
                  <tr
                    key={campamento.id}
                    className="transition hover:bg-slate-50"
                  >
                    {/* NOMBRE */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {campamento.nombre}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        ID #{campamento.id}
                      </p>
                    </td>

                    {/* PRECIO */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">
                      {formatearMoneda(
                        Number(campamento.precio_inscripcion)
                      )}
                    </td>

                    {/* FECHA CAMPAMENTO */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {formatearFecha(campamento.fecha_inicio)}
                    </td>

                    {/* FECHA LIMITE */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {formatearFecha(
                        campamento.fecha_limite_pago
                      )}
                    </td>

                    {/* ESTADO */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          campamento.estado === "ACTIVO"
                            ? "bg-emerald-50 text-emerald-700"
                            : campamento.estado === "FINALIZADO"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {campamento.estado}
                      </span>
                    </td>

                    {/* ACCIÓN */}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/campamentos/${campamento.id}`}
                        className="inline-flex rounded-lg px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* SIN CAMPAMENTOS */
          <div className="px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">
              Todavía no hay campamentos
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Crea el primer campamento para comenzar.
            </p>

            <Link
              href="/admin/campamentos/nuevo"
              className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Crear campamento
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// UTILIDADES
// ============================================================

function formatearMoneda(valor: number) {
  return `L ${valor.toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatearFecha(fecha: string | null) {
  if (!fecha) {
    return "-";
  }

  return new Date(
    `${fecha}T00:00:00`
  ).toLocaleDateString("es-HN");
}