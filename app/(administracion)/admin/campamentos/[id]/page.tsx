import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BotonEstadoCampamento from "./BotonEstadoCampamento";

type Inscripcion = {
  id: number;
  meta: number | string;
  estado: string;
  campistas:
    | {
        id: number;
        identidad: string;
        nombre: string;
        telefono: string | null;
      }
    | {
        id: number;
        identidad: string;
        nombre: string;
        telefono: string | null;
      }[]
    | null;
};

type Aporte = {
  id: number;
  inscripcion_id: number;
  monto: number | string;
};

export default async function DetalleCampamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  // ============================================================
  // CAMPAMENTO
  // ============================================================

  const { data: campamento, error: errorCampamento } =
    await supabase
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
      .eq("id", id)
      .single();

  if (errorCampamento || !campamento) {
    notFound();
  }

  // ============================================================
  // INSCRIPCIONES
  // ============================================================

  const { data: inscripcionesData } = await supabase
    .from("inscripciones")
    .select(`
      id,
      meta,
      estado,
      campistas (
        id,
        identidad,
        nombre,
        telefono
      )
    `)
    .eq("campamento_id", campamento.id)
    .neq("estado", "CANCELADO")
    .order("fecha_inscripcion", {
      ascending: false,
    });

  const inscripciones: Inscripcion[] =
    (inscripcionesData as Inscripcion[]) || [];

  // ============================================================
  // APORTES
  // ============================================================

  const idsInscripciones = inscripciones.map(
    (inscripcion) => inscripcion.id
  );

  let aportes: Aporte[] = [];

  if (idsInscripciones.length > 0) {
    const { data: aportesData } = await supabase
      .from("aportes")
      .select(`
        id,
        inscripcion_id,
        monto
      `)
      .in("inscripcion_id", idsInscripciones)
      .eq("estado", "ACTIVO");

    aportes = (aportesData as Aporte[]) || [];
  }

  // ============================================================
  // CALCULOS
  // ============================================================

  const inscritos = inscripciones.length;

  let completaron = 0;
  let ahorrando = 0;
  let totalRecaudado = 0;
  let totalMetas = 0;

  const filas = inscripciones.map((inscripcion) => {
    const meta = Number(inscripcion.meta);

    const aportesInscripcion = aportes.filter(
      (aporte) =>
        aporte.inscripcion_id === inscripcion.id
    );

    const totalAhorrado = aportesInscripcion.reduce(
      (total, aporte) =>
        total + Number(aporte.monto),
      0
    );

    const pendiente = Math.max(
      meta - totalAhorrado,
      0
    );

    const porcentaje =
      meta > 0
        ? Math.min(
            Math.round(
              (totalAhorrado / meta) * 100
            ),
            100
          )
        : 0;

    const completo =
      totalAhorrado >= meta ||
      inscripcion.estado === "COMPLETO";

    if (completo) {
      completaron++;
    } else {
      ahorrando++;
    }

    totalRecaudado += totalAhorrado;
    totalMetas += meta;

    const relacionCampista = inscripcion.campistas;

    const campista = Array.isArray(relacionCampista)
      ? relacionCampista[0]
      : relacionCampista;

    return {
      inscripcionId: inscripcion.id,
      campista,
      meta,
      totalAhorrado,
      pendiente,
      porcentaje,
      completo,
    };
  });

  const porcentajeGeneral =
    totalMetas > 0
      ? Math.min(
          Math.round(
            (totalRecaudado / totalMetas) * 100
          ),
          100
        )
      : 0;

  return (
    <>
      {/* CABECERA */}

      <div className="mb-8">
        <Link
          href="/admin/campamentos"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver a campamentos
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {campamento.nombre}
            </h1>

            <p className="mt-2 text-slate-500">
              Resumen general y progreso de los campistas.
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${
              campamento.estado === "ACTIVO"
                ? "bg-emerald-50 text-emerald-700"
                : campamento.estado === "FINALIZADO"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {campamento.estado}
          </span>
        </div>
      </div>

      {/* INFORMACIÓN DEL CAMPAMENTO */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Información del campamento
          </h2>

          <Link
            href={`/admin/campamentos/${campamento.id}/editar`}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Editar
          </Link>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Dato
            titulo="Precio inscripción"
            valor={formatearMoneda(
              Number(campamento.precio_inscripcion)
            )}
          />

          <Dato
            titulo="Fecha del campamento"
            valor={formatearFecha(
              campamento.fecha_inicio
            )}
          />

          <Dato
            titulo="Fecha límite de pago"
            valor={formatearFecha(
              campamento.fecha_limite_pago
            )}
          />

          <Dato
            titulo="Estado"
            valor={campamento.estado}
          />
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
            Estado del campamento
        </h2>

        <p className="mt-2 mb-5 text-sm text-slate-500">
            Finalizar un campamento evita que aparezca en nuevas
            inscripciones, pero conserva todos los campistas y aportes.
        </p>

        <div className="max-w-sm">
            <BotonEstadoCampamento
            id={campamento.id}
            estadoActual={campamento.estado}
            />
        </div>
    </div>

      {/* RESUMEN */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          titulo="Inscritos"
          valor={String(inscritos)}
          descripcion="Campistas inscritos"
        />

        <Tarjeta
          titulo="Completaron"
          valor={String(completaron)}
          descripcion="Alcanzaron su meta"
        />

        <Tarjeta
          titulo="Ahorrando"
          valor={String(ahorrando)}
          descripcion="Continúan ahorrando"
        />

        <Tarjeta
          titulo="Total recaudado"
          valor={formatearMoneda(totalRecaudado)}
          descripcion="Aportes activos recibidos"
        />
      </div>

      {/* PROGRESO GENERAL */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Progreso general
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Avance total de las metas de ahorro.
            </p>
          </div>

          <p className="text-2xl font-bold text-slate-900">
            {porcentajeGeneral}%
          </p>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{
              width: `${porcentajeGeneral}%`,
            }}
          />
        </div>

        <div className="mt-3 flex justify-between text-sm text-slate-500">
          <span>
            {formatearMoneda(totalRecaudado)} recaudado
          </span>

          <span>
            Meta total: {formatearMoneda(totalMetas)}
          </span>
        </div>
      </div>

      {/* CAMPISTAS */}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Campistas inscritos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Progreso individual de los campistas.
          </p>
        </div>

        {filas.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-slate-900">
              Todavía no hay campistas inscritos
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Las inscripciones aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Campista
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                    Meta
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                    Ahorrado
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                    Pendiente
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500">
                    Progreso
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filas.map((fila) => (
                  <tr
                    key={fila.inscripcionId}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {fila.campista?.nombre ||
                          "Campista"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {fila.campista?.identidad}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-slate-600">
                      {formatearMoneda(fila.meta)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-emerald-700">
                      {formatearMoneda(
                        fila.totalAhorrado
                      )}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-slate-600">
                      {formatearMoneda(
                        fila.pendiente
                      )}
                    </td>

                    <td className="min-w-[180px] px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{
                              width: `${fila.porcentaje}%`,
                            }}
                          />
                        </div>

                        <span className="w-10 text-right text-xs font-semibold text-slate-600">
                          {fila.porcentaje}%
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {fila.campista && (
                        <Link
                          href={`/admin/campistas/${fila.campista.id}`}
                          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Ver
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// COMPONENTES
// ============================================================

function Tarjeta({
  titulo,
  valor,
  descripcion,
}: {
  titulo: string;
  valor: string;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-bold text-slate-900">
        {valor}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>

      <p className="mt-2 text-sm font-medium text-slate-900">
        {valor}
      </p>
    </div>
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
    return "No definida";
  }

  return new Date(
    `${fecha}T00:00:00`
  ).toLocaleDateString("es-HN");
}