import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  buscar?: string;
  genero?: string;
  iglesia?: string;
  estado?: string;
  estadoPago?: string;
  edadMin?: string;
  edadMax?: string;
}>;

type EstadoPago =
  | "COMPLETO"
  | "PENDIENTE"
  | "SIN_INSCRIPCION";

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

function obtenerRelacion<T>(
  relacion: T | T[] | null
): T | null {
  if (!relacion) {
    return null;
  }

  if (Array.isArray(relacion)) {
    return relacion[0] || null;
  }

  return relacion;
}

function formatearMoneda(valor: number) {
  return `L ${Number(valor || 0).toLocaleString(
    "es-HN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
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
  const estadoPago = params.estadoPago || "";

  const edadMin = params.edadMin
    ? Number(params.edadMin)
    : null;

  const edadMax = params.edadMax
    ? Number(params.edadMax)
    : null;

  /*
   * CARGAR IGLESIAS
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
   * CARGAR CAMPISTAS
   *
   * Ahora también traemos:
   * - inscripciones
   * - campamento
   * - aportes
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
      ),
      inscripciones (
        id,
        meta,
        estado,
        fecha_inscripcion,
        campamento_id,
        campamentos (
          id,
          nombre
        ),
        aportes (
          id,
          monto,
          estado
        )
      )
    `)
    .order("nombre");

  /*
   * FILTROS QUE PUEDEN HACERSE
   * DIRECTAMENTE EN SUPABASE.
   */
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

  /*
   * PROCESAR CAMPISTAS
   */
  let resultados = (data || []).map(
    (campista: any) => {
      const inscripciones = Array.isArray(
        campista.inscripciones
      )
        ? campista.inscripciones
        : [];

      /*
       * Ordenamos de la inscripción más nueva
       * a la más antigua.
       */
      const inscripcionesOrdenadas = [
        ...inscripciones,
      ].sort((a, b) => {
        const fechaA = new Date(
          a.fecha_inscripcion || 0
        ).getTime();

        const fechaB = new Date(
          b.fecha_inscripcion || 0
        ).getTime();

        return fechaB - fechaA;
      });

      /*
       * Tomamos la inscripción actual:
       * la más reciente que no esté cancelada.
       */
      const inscripcionActual =
        inscripcionesOrdenadas.find(
          (inscripcion) =>
            inscripcion.estado !== "CANCELADO"
        ) || null;

      const edad = calcularEdad(
        campista.fecha_nacimiento
      );

      /*
       * SIN INSCRIPCIÓN
       */
      if (!inscripcionActual) {
        return {
          ...campista,
          edad,
          campamento: null,
          meta: 0,
          total_ahorrado: 0,
          falta_por_pagar: 0,
          estado_pago:
            "SIN_INSCRIPCION" as EstadoPago,
        };
      }

      /*
       * APORTES ACTIVOS
       */
      const aportes = Array.isArray(
        inscripcionActual.aportes
      )
        ? inscripcionActual.aportes
        : [];

      const totalAhorrado = aportes
        .filter(
          (aporte: any) =>
            aporte.estado === "ACTIVO"
        )
        .reduce(
          (
            total: number,
            aporte: any
          ) =>
            total +
            Number(aporte.monto || 0),
          0
        );

      const meta = Number(
        inscripcionActual.meta || 0
      );

      const faltaPorPagar = Math.max(
        meta - totalAhorrado,
        0
      );

      const estadoPago: EstadoPago =
        meta > 0 &&
        totalAhorrado >= meta
          ? "COMPLETO"
          : "PENDIENTE";

      const campamentoRelacion =
        obtenerRelacion(
          inscripcionActual.campamentos
        ) as {
          id: number;
          nombre: string;
        } | null;

      return {
        ...campista,
        edad,
        campamento:
          campamentoRelacion?.nombre ||
          null,
        meta,
        total_ahorrado: totalAhorrado,
        falta_por_pagar:
          faltaPorPagar,
        estado_pago: estadoPago,
      };
    }
  );

  /*
   * FILTRO POR NOMBRE O IDENTIDAD
   */
  if (buscar) {
    const valor =
      buscar.toLowerCase();

    resultados = resultados.filter(
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
   * FILTROS POR EDAD
   */
  resultados = resultados.filter(
    (campista) => {
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
    }
  );

  /*
   * FILTRO POR ESTADO DE PAGO
   */
  if (estadoPago) {
    resultados = resultados.filter(
      (campista) =>
        campista.estado_pago ===
        estadoPago
    );
  }

  /*
   * RESUMEN
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

  const completos = resultados.filter(
    (campista) =>
      campista.estado_pago ===
      "COMPLETO"
  ).length;

  const pendientes = resultados.filter(
    (campista) =>
      campista.estado_pago ===
      "PENDIENTE"
  ).length;

  const sinInscripcion =
    resultados.filter(
      (campista) =>
        campista.estado_pago ===
        "SIN_INSCRIPCION"
    ).length;

  /*
   * CONSTRUIR URL DEL PDF
   *
   * MUY IMPORTANTE:
   * TODOS los filtros actuales se envían.
   */
  const pdfParams =
    new URLSearchParams();

  if (buscar) {
    pdfParams.set(
      "buscar",
      buscar
    );
  }

  if (genero) {
    pdfParams.set(
      "genero",
      genero
    );
  }

  if (iglesia) {
    pdfParams.set(
      "iglesia",
      iglesia
    );
  }

  if (estado) {
    pdfParams.set(
      "estado",
      estado
    );
  }

  if (estadoPago) {
    pdfParams.set(
      "estadoPago",
      estadoPago
    );
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Campistas
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {total}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">
            Pagaron completo
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-800">
            {completos}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">
            Pendientes
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-800">
            {pendientes}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-600">
            Sin inscripción
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-800">
            {sinInscripcion}
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

          {/* ESTADO CAMPISTA */}
          <div>
            <label
              htmlFor="estado"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Estado del campista
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
              name="estadoPago"
              defaultValue={estadoPago}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">
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
                    Campista
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Iglesia
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Campamento
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Estado pago
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Ahorrado
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Falta por pagar
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {resultados.map(
                  (campista) => {
                    const iglesiaRelacion =
                      obtenerRelacion(
                        campista.iglesias
                      ) as {
                        id: number;
                        nombre: string;
                      } | null;

                    return (
                      <tr
                        key={campista.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {campista.nombre}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {campista.identidad}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {iglesiaRelacion?.nombre ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {campista.campamento ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          {campista.estado_pago ===
                          "COMPLETO" ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Pagado completo
                            </span>
                          ) : campista.estado_pago ===
                            "PENDIENTE" ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              Pendiente
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              Sin inscripción
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-700">
                          {campista.estado_pago ===
                          "SIN_INSCRIPCION"
                            ? "—"
                            : formatearMoneda(
                                campista.total_ahorrado
                              )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          {campista.estado_pago ===
                          "SIN_INSCRIPCION" ? (
                            <span className="text-slate-400">
                              —
                            </span>
                          ) : campista.estado_pago ===
                            "COMPLETO" ? (
                            <span className="font-semibold text-emerald-700">
                              L 0.00
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-700">
                              {formatearMoneda(
                                campista.falta_por_pagar
                              )}
                            </span>
                          )}
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

      {/* RESUMEN DEMOGRÁFICO PEQUEÑO */}
      <div className="mt-6 text-sm text-slate-500">
        Masculino:{" "}
        <span className="font-semibold text-slate-700">
          {hombres}
        </span>
        {" · "}
        Femenino:{" "}
        <span className="font-semibold text-slate-700">
          {mujeres}
        </span>
      </div>
    </>
  );
}