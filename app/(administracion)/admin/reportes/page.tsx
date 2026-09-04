import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  buscar?: string;
  genero?: string;
  iglesia?: string;
  estado?: string;
  edadMin?: string;
  edadMax?: string;
}>;

function calcularEdad(fechaNacimiento: string | null) {
  if (!fechaNacimiento) {
    return null;
  }

  const nacimiento = new Date(
    `${fechaNacimiento}T00:00:00`
  );

  const hoy = new Date();

  let edad =
    hoy.getFullYear() - nacimiento.getFullYear();

  const mes =
    hoy.getMonth() - nacimiento.getMonth();

  if (
    mes < 0 ||
    (mes === 0 &&
      hoy.getDate() < nacimiento.getDate())
  ) {
    edad--;
  }

  return edad;
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const supabase = await createClient();

  const buscar = params.buscar?.trim() || "";
  const genero = params.genero || "";
  const iglesia = params.iglesia || "";
  const estado = params.estado || "";

  const edadMin = params.edadMin
    ? Number(params.edadMin)
    : null;

  const edadMax = params.edadMax
    ? Number(params.edadMax)
    : null;

  /*
   * Cargar iglesias para el filtro.
   */
  const { data: iglesias } = await supabase
    .from("iglesias")
    .select(`
      id,
      nombre,
      estado
    `)
    .order("nombre");

  /*
   * Cargar campistas.
   */
  let query = supabase
    .from("campistas")
    .select(`
      id,
      identidad,
      nombre,
      telefono,
      genero,
      fecha_nacimiento,
      estado,
      iglesia_id,
      iglesias (
        id,
        nombre
      )
    `)
    .order("nombre");

  if (genero) {
    query = query.eq("genero", genero);
  }

  if (iglesia) {
    query = query.eq(
      "iglesia_id",
      Number(iglesia)
    );
  }

  if (estado) {
    query = query.eq("estado", estado);
  }

  const { data, error } = await query;

  let campistas = data || [];

  /*
   * Filtro por nombre o identidad.
   */
  if (buscar) {
    const valor = buscar.toLowerCase();

    campistas = campistas.filter(
      (campista) =>
        campista.nombre
          ?.toLowerCase()
          .includes(valor) ||
        campista.identidad
          ?.toLowerCase()
          .includes(valor)
    );
  }

  /*
   * Calcular edad y aplicar filtros.
   */
  const resultados = campistas
    .map((campista) => ({
      ...campista,
      edad: calcularEdad(
        campista.fecha_nacimiento
      ),
    }))
    .filter((campista) => {
      if (
        edadMin !== null &&
        (
          campista.edad === null ||
          campista.edad < edadMin
        )
      ) {
        return false;
      }

      if (
        edadMax !== null &&
        (
          campista.edad === null ||
          campista.edad > edadMax
        )
      ) {
        return false;
      }

      return true;
    });

  /*
   * Resumen.
   */
  const total = resultados.length;

  const hombres = resultados.filter(
    (campista) =>
      campista.genero === "MASCULINO"
  ).length;

  const mujeres = resultados.filter(
    (campista) =>
      campista.genero === "FEMENINO"
  ).length;

  const edadesValidas = resultados
    .map((campista) => campista.edad)
    .filter(
      (edad): edad is number =>
        edad !== null
    );

  const edadPromedio =
    edadesValidas.length > 0
      ? Math.round(
          edadesValidas.reduce(
            (totalEdad, edad) =>
              totalEdad + edad,
            0
          ) / edadesValidas.length
        )
      : 0;

  /*
   * Construir URL del PDF
   * con los mismos filtros actuales.
   */
  const pdfParams = new URLSearchParams();

  if (buscar) {
    pdfParams.set("buscar", buscar);
  }

  if (genero) {
    pdfParams.set("genero", genero);
  }

  if (iglesia) {
    pdfParams.set("iglesia", iglesia);
  }

  if (estado) {
    pdfParams.set("estado", estado);
  }

  if (params.edadMin) {
    pdfParams.set(
      "edadMin",
      params.edadMin
    );
  }

  if (params.edadMax) {
    pdfParams.set(
      "edadMax",
      params.edadMax
    );
  }

  const pdfUrl =
    pdfParams.toString().length > 0
      ? `/api/reportes/campistas/pdf?${pdfParams.toString()}`
      : "/api/reportes/campistas/pdf";

  return (
    <>
      {/* ENCABEZADO */}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
          Administración
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Reportería de campistas
        </h1>

        <p className="mt-2 text-slate-500">
          Consulta, filtra y genera reportes
          de los campistas registrados.
        </p>
      </div>

      {/* RESUMEN */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* TOTAL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Campistas
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {total}
          </p>
        </div>

        {/* MASCULINO */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Masculino
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {hombres}
          </p>
        </div>

        {/* FEMENINO */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Femenino
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {mujeres}
          </p>
        </div>

        {/* EDAD PROMEDIO */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Edad promedio
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {edadPromedio}
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-slate-900">
          Filtros
        </h2>

        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* BUSCAR */}
          <div>
            <label
              htmlFor="buscar"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Nombre o identidad
            </label>

            <input
              id="buscar"
              type="text"
              name="buscar"
              defaultValue={buscar}
              placeholder="Buscar campista..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* GENERO */}
          <div>
            <label
              htmlFor="genero"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Género
            </label>

            <select
              id="genero"
              name="genero"
              defaultValue={genero}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">
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

          {/* IGLESIA */}
          <div>
            <label
              htmlFor="iglesia"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Iglesia
            </label>

            <select
              id="iglesia"
              name="iglesia"
              defaultValue={iglesia}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">
                Todas las iglesias
              </option>

              {(iglesias || []).map(
                (iglesiaItem) => (
                  <option
                    key={iglesiaItem.id}
                    value={iglesiaItem.id}
                  >
                    {iglesiaItem.nombre}
                  </option>
                )
              )}
            </select>
          </div>

          {/* EDAD MIN */}
          <div>
            <label
              htmlFor="edadMin"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Edad mínima
            </label>

            <input
              id="edadMin"
              type="number"
              min="0"
              max="120"
              name="edadMin"
              defaultValue={
                params.edadMin || ""
              }
              placeholder="Ej. 15"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* EDAD MAX */}
          <div>
            <label
              htmlFor="edadMax"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Edad máxima
            </label>

            <input
              id="edadMax"
              type="number"
              min="0"
              max="120"
              name="edadMax"
              defaultValue={
                params.edadMax || ""
              }
              placeholder="Ej. 30"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
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
              name="estado"
              defaultValue={estado}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">
                Todos
              </option>

              <option value="ACTIVO">
                Activo
              </option>

              <option value="INACTIVO">
                Inactivo
              </option>
            </select>
          </div>

          {/* BOTONES */}
          <div className="flex flex-wrap items-end gap-3 md:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Buscar
            </button>

            <Link
              href="/admin/reportes"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar filtros
            </Link>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Generar PDF
            </a>
          </div>
        </form>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          No se pudo cargar el reporte.
        </div>
      )}

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-bold text-slate-900">
              Resultados
            </h2>

            <span className="text-sm text-slate-500">
              {total} campista
              {total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {resultados.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700">
              No se encontraron campistas
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Cambia los filtros e intenta
              nuevamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Identidad
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Nombre
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Edad
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Género
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Iglesia
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {resultados.map(
                  (campista) => {
                    const iglesiaRelacion =
                      Array.isArray(
                        campista.iglesias
                      )
                        ? campista
                            .iglesias[0]
                        : campista.iglesias;

                    return (
                      <tr
                        key={campista.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {campista.identidad}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                          {campista.nombre}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {campista.edad ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {campista.genero || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {iglesiaRelacion?.nombre ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              campista.estado ===
                              "ACTIVO"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {campista.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}