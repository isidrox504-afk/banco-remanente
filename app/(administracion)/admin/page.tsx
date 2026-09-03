import { createClient } from "@/lib/supabase/server";

type AporteReciente = {
  id: number;
  monto: number | string;
  fecha_aporte: string;
  metodo_pago: string | null;
  inscripciones:
    | {
        campistas:
          | {
              nombre: string;
            }
          | {
              nombre: string;
            }[]
          | null;

        campamentos:
          | {
              nombre: string;
            }
          | {
              nombre: string;
            }[]
          | null;
      }
    | {
        campistas:
          | {
              nombre: string;
            }
          | {
              nombre: string;
            }[]
          | null;

        campamentos:
          | {
              nombre: string;
            }
          | {
              nombre: string;
            }[]
          | null;
      }[]
    | null;
};

type CampistaDashboard = {
  id: number;
  genero: string | null;
  fecha_nacimiento: string | null;
  estado: string;
};

export default async function AdminPage() {
  const supabase = await createClient();

  // ============================================================
  // CAMPISTAS
  // ============================================================

  const { data: campistasData } = await supabase
    .from("campistas")
    .select(`
      id,
      genero,
      fecha_nacimiento,
      estado
    `);

  const campistas =
    (campistasData as CampistaDashboard[]) || [];

  const totalCampistas = campistas.length;

  const campistasActivos = campistas.filter(
    (campista) => campista.estado === "ACTIVO"
  );

  const hombres = campistasActivos.filter(
    (campista) => campista.genero === "MASCULINO"
  ).length;

  const mujeres = campistasActivos.filter(
    (campista) => campista.genero === "FEMENINO"
  ).length;

  const edades = campistasActivos
    .filter((campista) => campista.fecha_nacimiento)
    .map((campista) =>
      calcularEdad(campista.fecha_nacimiento!)
    )
    .filter((edad): edad is number => edad !== null);

  const edadPromedio =
    edades.length > 0
      ? edades.reduce((total, edad) => total + edad, 0) /
        edades.length
      : null;

  // ============================================================
  // CAMPAMENTOS ACTIVOS
  // ============================================================

  const {
    count: campamentosActivos,
  } = await supabase
    .from("campamentos")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("estado", "ACTIVO");

  // ============================================================
  // INSCRIPCIONES
  // ============================================================

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select(`
      id,
      meta,
      estado
    `)
    .neq("estado", "CANCELADO");

  // ============================================================
  // APORTES ACTIVOS
  // ============================================================

  const { data: aportes } = await supabase
    .from("aportes")
    .select(`
      id,
      inscripcion_id,
      monto,
      estado
    `)
    .eq("estado", "ACTIVO");

  const totalAhorrado =
    aportes?.reduce(
      (total, aporte) => total + Number(aporte.monto),
      0
    ) || 0;

  // ============================================================
  // COMPLETADOS / AHORRANDO
  // ============================================================

  let completados = 0;
  let ahorrando = 0;

  if (inscripciones) {
    for (const inscripcion of inscripciones) {
      const aportesInscripcion =
        aportes?.filter(
          (aporte) =>
            aporte.inscripcion_id === inscripcion.id
        ) || [];

      const totalInscripcion =
        aportesInscripcion.reduce(
          (total, aporte) =>
            total + Number(aporte.monto),
          0
        );

      const meta = Number(inscripcion.meta);

      if (
        inscripcion.estado === "COMPLETO" ||
        totalInscripcion >= meta
      ) {
        completados++;
      } else {
        ahorrando++;
      }
    }
  }

  // ============================================================
  // ÚLTIMOS APORTES
  // ============================================================

  const { data: aportesRecientesData } = await supabase
    .from("aportes")
    .select(`
      id,
      monto,
      fecha_aporte,
      metodo_pago,
      inscripciones (
        campistas (
          nombre
        ),
        campamentos (
          nombre
        )
      )
    `)
    .eq("estado", "ACTIVO")
    .order("fecha_aporte", {
      ascending: false,
    })
    .limit(5);

  const aportesRecientes =
    (aportesRecientesData as AporteReciente[]) || [];

  return (
    <>
      {/* CABECERA */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Dashboard
        </h1>

        <p className="mt-2 text-slate-500">
          Resumen general del Banco de Campistas.
        </p>
      </div>

      {/* PRIMERA FILA */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          titulo="Campistas"
          valor={String(totalCampistas)}
          descripcion="Campistas registrados"
        />

        <Tarjeta
          titulo="Total ahorrado"
          valor={formatearMoneda(totalAhorrado)}
          descripcion="Aportes activos recibidos"
        />

        <Tarjeta
          titulo="Edad promedio"
          valor={
            edadPromedio !== null
              ? `${edadPromedio.toFixed(1)} años`
              : "-"
          }
          descripcion="Campistas activos con fecha registrada"
        />

        <Tarjeta
          titulo="Campamentos activos"
          valor={String(campamentosActivos || 0)}
          descripcion="Disponibles para inscripción"
        />
      </div>

      {/* SEGUNDA FILA */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          titulo="Hombres"
          valor={String(hombres)}
          descripcion="Campistas activos"
        />

        <Tarjeta
          titulo="Mujeres"
          valor={String(mujeres)}
          descripcion="Campistas activas"
        />

        <Tarjeta
          titulo="Meta completada"
          valor={String(completados)}
          descripcion="Inscripciones completadas"
        />

        <Tarjeta
          titulo="Ahorrando"
          valor={String(ahorrando)}
          descripcion="Inscripciones en proceso"
        />
      </div>

      {/* RESUMEN DEMOGRÁFICO */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Distribución de campistas
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Información demográfica de los campistas activos.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Distribucion
            titulo="Hombres"
            cantidad={hombres}
            total={campistasActivos.length}
          />

          <Distribucion
            titulo="Mujeres"
            cantidad={mujeres}
            total={campistasActivos.length}
          />
        </div>
      </div>

      {/* ACTIVIDAD RECIENTE */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Actividad reciente
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Últimos aportes registrados.
          </p>
        </div>

        {aportesRecientes.length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            Todavía no hay movimientos registrados.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Fecha
                  </th>

                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Campista
                  </th>

                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Campamento
                  </th>

                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Método
                  </th>

                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Monto
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {aportesRecientes.map((aporte) => {
                  const relacionInscripcion =
                    aporte.inscripciones;

                  const inscripcion = Array.isArray(
                    relacionInscripcion
                  )
                    ? relacionInscripcion[0]
                    : relacionInscripcion;

                  const relacionCampista =
                    inscripcion?.campistas;

                  const campista = Array.isArray(
                    relacionCampista
                  )
                    ? relacionCampista[0]
                    : relacionCampista;

                  const relacionCampamento =
                    inscripcion?.campamentos;

                  const campamento = Array.isArray(
                    relacionCampamento
                  )
                    ? relacionCampamento[0]
                    : relacionCampamento;

                  return (
                    <tr key={aporte.id}>
                      <td className="py-4 text-sm text-slate-600">
                        {new Date(
                          aporte.fecha_aporte
                        ).toLocaleDateString("es-HN")}
                      </td>

                      <td className="py-4 text-sm font-medium text-slate-900">
                        {campista?.nombre || "-"}
                      </td>

                      <td className="py-4 text-sm text-slate-600">
                        {campamento?.nombre || "-"}
                      </td>

                      <td className="py-4 text-sm text-slate-600">
                        {formatearMetodo(
                          aporte.metodo_pago
                        )}
                      </td>

                      <td className="py-4 text-right text-sm font-semibold text-slate-900">
                        {formatearMoneda(
                          Number(aporte.monto)
                        )}
                      </td>
                    </tr>
                  );
                })}
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

function Distribucion({
  titulo,
  cantidad,
  total,
}: {
  titulo: string;
  cantidad: number;
  total: number;
}) {
  const porcentaje =
    total > 0
      ? Math.round((cantidad / total) * 100)
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
          {titulo}
        </p>

        <p className="text-sm font-medium text-slate-500">
          {cantidad} · {porcentaje}%
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{
            width: `${porcentaje}%`,
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// UTILIDADES
// ============================================================

function calcularEdad(fecha: string) {
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

function formatearMoneda(valor: number) {
  return `L ${valor.toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatearMetodo(metodo: string | null) {
  if (!metodo) {
    return "-";
  }

  const metodos: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    DEPOSITO: "Depósito",
    OTRO: "Otro",
  };

  return metodos[metodo] || metodo;
}