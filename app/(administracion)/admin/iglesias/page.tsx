import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function IglesiasPage() {
  const supabase = await createClient();

  const { data: iglesias, error } = await supabase
    .from("iglesias")
    .select(`
      id,
      nombre,
      estado,
      fecha_registro
    `)
    .order("nombre", { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar las iglesias: {error.message}
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Iglesias
          </h1>

          <p className="mt-2 text-slate-500">
            Administra las iglesias participantes del Banco de Campistas.
          </p>
        </div>

        <Link
          href="/admin/iglesias/nueva"
          className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          + Registrar iglesia
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {iglesias && iglesias.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Iglesia
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha registro
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {iglesias.map((iglesia) => (
                  <tr
                    key={iglesia.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {iglesia.nombre}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          iglesia.estado === "ACTIVO"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {iglesia.estado}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(
                        iglesia.fecha_registro
                      ).toLocaleDateString("es-HN")}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/iglesias/${iglesia.id}`}
                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
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
          <div className="px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">
              Todavía no hay iglesias registradas
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Registra la primera iglesia participante.
            </p>

            <Link
              href="/admin/iglesias/nueva"
              className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Registrar iglesia
            </Link>
          </div>
        )}
      </div>
    </>
  );
}