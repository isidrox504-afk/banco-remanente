import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccionesIglesia from "./AccionesIglesia";

export default async function DetalleIglesiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  // ============================================================
  // IGLESIA
  // ============================================================

  const { data: iglesia, error } = await supabase
    .from("iglesias")
    .select(`
      id,
      nombre,
      estado,
      fecha_registro
    `)
    .eq("id", id)
    .single();

  if (error || !iglesia) {
    notFound();
  }

  // ============================================================
  // CAMPISTAS DE LA IGLESIA
  // ============================================================

  const { data: campistas } = await supabase
    .from("campistas")
    .select(`
      id,
      identidad,
      nombre,
      genero,
      fecha_nacimiento,
      estado
    `)
    .eq("iglesia_id", iglesia.id)
    .order("nombre", {
      ascending: true,
    });

  const totalCampistas = campistas?.length || 0;

  const activos =
    campistas?.filter(
      (campista) => campista.estado === "ACTIVO"
    ).length || 0;

  const inactivos =
    campistas?.filter(
      (campista) => campista.estado === "INACTIVO"
    ).length || 0;

  return (
    <>
      {/* CABECERA */}
      <div className="mb-8">
        <Link
          href="/admin/iglesias"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver a iglesias
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {iglesia.nombre}
            </h1>

            <p className="mt-2 text-slate-500">
              Información general de la iglesia participante.
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${
              iglesia.estado === "ACTIVO"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {iglesia.estado}
          </span>
        </div>
      </div>

      {/* INFORMACIÓN */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Información
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Datos generales de la iglesia.
            </p>
          </div>

          <Link
            href={`/admin/iglesias/${iglesia.id}/editar`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Editar
          </Link>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Dato
            titulo="Nombre"
            valor={iglesia.nombre}
          />

          <Dato
            titulo="Estado"
            valor={iglesia.estado}
          />

          <Dato
            titulo="Fecha de registro"
            valor={new Date(
              iglesia.fecha_registro
            ).toLocaleDateString("es-HN")}
          />
        </div>
      </div>

      {/* RESUMEN DE CAMPISTAS */}
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <Tarjeta
          titulo="Campistas"
          valor={String(totalCampistas)}
          descripcion="Total registrados"
        />

        <Tarjeta
          titulo="Activos"
          valor={String(activos)}
          descripcion="Campistas activos"
        />

        <Tarjeta
          titulo="Inactivos"
          valor={String(inactivos)}
          descripcion="Campistas inactivos"
        />
      </div>

      {/* CAMPISTAS */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Campistas de esta iglesia
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Personas registradas que pertenecen a esta iglesia.
          </p>
        </div>

        {campistas && campistas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Nombre
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Identidad
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
                {campistas.map((campista) => {
                  const edad = calcularEdad(
                    campista.fecha_nacimiento
                  );

                  return (
                    <tr
                      key={campista.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {campista.nombre}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {campista.identidad}
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
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-slate-900">
              No hay campistas registrados
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Todavía no hay campistas asociados a esta iglesia.
            </p>
          </div>
        )}
      </div>

      {/* ADMINISTRACIÓN */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Administración
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Puedes desactivar la iglesia para que deje de aparecer
          en nuevos registros. Una iglesia solamente puede
          eliminarse si no tiene campistas asociados.
        </p>

        <div className="mt-6 max-w-sm">
          <AccionesIglesia
            id={iglesia.id}
            estadoActual={iglesia.estado}
          />
        </div>
      </div>
    </>
  );
}

// ============================================================
// COMPONENTES
// ============================================================

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

// ============================================================
// UTILIDADES
// ============================================================

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