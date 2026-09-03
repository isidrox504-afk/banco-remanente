import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BotonEstado from "./BotonEstado";

export default async function DetalleCampistaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: campista, error: errorCampista } = await supabase
    .from("campistas")
    .select(`
      id,
      identidad,
      nombre,
      telefono,
      genero,
      fecha_nacimiento,
      estado,
      fecha_registro,
      fecha_actualizacion,
      iglesias (
        id,
        nombre
      )
    `)
    .eq("id", id)
    .single();

  if (errorCampista || !campista) {
    notFound();
  }

  const { data: inscripcion } = await supabase
    .from("inscripciones")
    .select(`
      id,
      meta,
      estado,
      fecha_inscripcion,
      campamentos (
        id,
        nombre,
        precio_inscripcion
      )
    `)
    .eq("campista_id", campista.id)
    .neq("estado", "CANCELADO")
    .order("fecha_inscripcion", { ascending: false })
    .limit(1)
    .maybeSingle();

  let aportes: Array<{
    id: number;
    monto: number | string;
    fecha_aporte: string;
    metodo_pago: string | null;
    referencia: string | null;
    observacion: string | null;
    estado: string;
  }> = [];

  let totalAhorrado = 0;
  let pendiente = 0;
  let porcentaje = 0;

  if (inscripcion) {
    const { data: aportesData } = await supabase
      .from("aportes")
      .select(`
        id,
        monto,
        fecha_aporte,
        metodo_pago,
        referencia,
        observacion,
        estado
      `)
      .eq("inscripcion_id", inscripcion.id)
      .eq("estado", "ACTIVO")
      .order("fecha_aporte", { ascending: false });

    aportes = aportesData || [];

    totalAhorrado = aportes.reduce(
      (total, aporte) => total + Number(aporte.monto),
      0
    );

    const meta = Number(inscripcion.meta);

    pendiente = Math.max(meta - totalAhorrado, 0);

    porcentaje =
      meta > 0
        ? Math.min(
            Math.round((totalAhorrado / meta) * 100),
            100
          )
        : 0;
  }

  const relacionCampamento = inscripcion?.campamentos;

  const campamento = Array.isArray(relacionCampamento)
    ? relacionCampamento[0]
    : relacionCampamento;

  const relacionIglesia = campista.iglesias;

  const iglesia = Array.isArray(relacionIglesia)
    ? relacionIglesia[0]
    : relacionIglesia;

  const edad = calcularEdad(campista.fecha_nacimiento);

  return (
    <>
      <div className="mb-8">
        <Link
          href="/admin/campistas"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver a campistas
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {campista.nombre}
            </h1>

            <p className="mt-2 text-slate-500">
              Información general y estado del ahorro.
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${
              campista.estado === "ACTIVO"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {campista.estado}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Datos personales
              </h2>

              <Link
                href={`/admin/campistas/${campista.id}/editar`}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Editar
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Dato
                titulo="Número de identidad"
                valor={campista.identidad}
              />

              <Dato
                titulo="Nombre completo"
                valor={campista.nombre}
              />

              <Dato
                titulo="Teléfono"
                valor={campista.telefono || "No registrado"}
              />

              <Dato
                titulo="Iglesia"
                valor={iglesia?.nombre || "No registrada"}
              />

              <Dato
                titulo="Género"
                valor={formatearGenero(campista.genero)}
              />

              <Dato
                titulo="Fecha de nacimiento"
                valor={
                  campista.fecha_nacimiento
                    ? formatearFechaNacimiento(
                        campista.fecha_nacimiento
                      )
                    : "No registrada"
                }
              />

              <Dato
                titulo="Edad"
                valor={
                  edad !== null
                    ? `${edad} años`
                    : "No disponible"
                }
              />

              <Dato
                titulo="Fecha de registro"
                valor={new Date(
                  campista.fecha_registro
                ).toLocaleDateString("es-HN")}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Ahorro
                </h2>

                {inscripcion && campamento && (
                  <p className="mt-1 text-sm text-slate-500">
                    {campamento.nombre}
                  </p>
                )}
              </div>

              {inscripcion && (
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    inscripcion.estado === "COMPLETO"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {inscripcion.estado}
                </span>
              )}
            </div>

            {!inscripcion ? (
              <div className="mt-6 rounded-xl bg-slate-50 px-6 py-10 text-center">
                <p className="text-sm text-slate-500">
                  Este campista todavía no tiene una inscripción asociada.
                </p>

                <Link
                  href={`/admin/campistas/${campista.id}/inscribir`}
                  className="mt-5 inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Inscribir a campamento
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <Resumen
                    titulo="Meta"
                    valor={formatearMoneda(
                      Number(inscripcion.meta)
                    )}
                  />

                  <Resumen
                    titulo="Ahorrado"
                    valor={formatearMoneda(totalAhorrado)}
                  />

                  <Resumen
                    titulo="Pendiente"
                    valor={formatearMoneda(pendiente)}
                  />
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-600">
                      Progreso
                    </p>

                    <p className="text-sm font-bold text-slate-900">
                      {porcentaje}%
                    </p>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  {inscripcion.estado !== "COMPLETO" ? (
                    <Link
                      href={`/admin/campistas/${campista.id}/aporte`}
                      className="inline-block rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      + Registrar aporte
                    </Link>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      Meta de ahorro completada.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {inscripcion && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Historial de aportes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Movimientos registrados para esta inscripción.
              </p>

              {aportes.length === 0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  Todavía no hay aportes registrados.
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 text-left text-xs font-semibold uppercase text-slate-400">
                          Fecha
                        </th>

                        <th className="pb-3 text-left text-xs font-semibold uppercase text-slate-400">
                          Método
                        </th>

                        <th className="pb-3 text-left text-xs font-semibold uppercase text-slate-400">
                          Referencia
                        </th>

                        <th className="pb-3 text-right text-xs font-semibold uppercase text-slate-400">
                          Monto
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {aportes.map((aporte) => (
                        <tr key={aporte.id}>
                          <td className="py-4 text-sm text-slate-600">
                            {new Date(
                              aporte.fecha_aporte
                            ).toLocaleDateString("es-HN")}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {formatearMetodo(
                              aporte.metodo_pago
                            )}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {aporte.referencia || "-"}
                          </td>

                          <td className="py-4 text-right text-sm font-semibold text-slate-900">
                            {formatearMoneda(
                              Number(aporte.monto)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Seguridad de consulta
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              El campista utiliza su identidad y un PIN para consultar su ahorro.
            </p>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                PIN
              </p>

              <p className="mt-2 text-2xl font-bold tracking-[0.25em] text-slate-900">
                ••••••
              </p>
            </div>

            <Link
              href={`/admin/campistas/${campista.id}/pin`}
              className="mt-5 block w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Generar nuevo PIN
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Estado
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Puedes desactivar al campista sin eliminar su historial.
            </p>

            <BotonEstado
              id={campista.id}
              estadoActual={campista.estado}
            />
          </div>
        </div>
      </div>
    </>
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

function Resumen({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {valor}
      </p>
    </div>
  );
}

function calcularEdad(fecha: string | null) {
  if (!fecha) return null;

  const nacimiento = new Date(`${fecha}T00:00:00`);
  const hoy = new Date();

  let edad = hoy.getFullYear() - nacimiento.getFullYear();

  const mes = hoy.getMonth() - nacimiento.getMonth();

  if (
    mes < 0 ||
    (mes === 0 && hoy.getDate() < nacimiento.getDate())
  ) {
    edad--;
  }

  return edad;
}

function formatearFechaNacimiento(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString(
    "es-HN"
  );
}

function formatearGenero(genero: string | null) {
  if (genero === "MASCULINO") return "Masculino";
  if (genero === "FEMENINO") return "Femenino";

  return "No registrado";
}

function formatearMoneda(valor: number) {
  return `L ${valor.toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatearMetodo(metodo: string | null) {
  if (!metodo) return "-";

  const metodos: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    DEPOSITO: "Depósito",
    OTRO: "Otro",
  };

  return metodos[metodo] || metodo;
}