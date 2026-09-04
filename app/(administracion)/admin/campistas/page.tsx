import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { APP_CONFIG } from "@/lib/config/app";
import ListaCampistas from "./ListaCampistas";

export default async function CampistasPage() {
  const supabase = await createClient();

  const { data: campistas, error } = await supabase
    .from("campistas")
    .select(`
      id,
      codigo_campista,
      identidad,
      nombre,
      telefono,
      genero,
      fecha_nacimiento,
      estado,
      fecha_registro,
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
    .order("nombre", { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar los campistas: {error.message}
      </div>
    );
  }

  const campistasProcesados = (campistas || []).map(
    (campista: any) => {
      /*
       * Un campista puede tener varias inscripciones.
       *
       * Buscamos la inscripción más reciente
       * que no esté cancelada.
       */
      const inscripciones = Array.isArray(
        campista.inscripciones
      )
        ? campista.inscripciones
        : [];

      /*
       * Ordenamos de la más reciente
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
       * Tomamos la inscripción más reciente
       * que no esté cancelada.
       */
      const inscripcionActual =
        inscripcionesOrdenadas.find(
          (inscripcion) =>
            inscripcion.estado !== "CANCELADO"
        ) || null;

      /*
       * Si no tiene inscripción,
       * devolvemos valores vacíos.
       */
      if (!inscripcionActual) {
        return {
          ...campista,

          campamento: null,
          meta: 0,
          total_ahorrado: 0,
          falta_por_pagar: 0,
          estado_pago: "SIN_INSCRIPCION",
        };
      }

      /*
       * Solamente contamos aportes activos.
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
          (total: number, aporte: any) =>
            total + Number(aporte.monto || 0),
          0
        );

      const meta = Number(
        inscripcionActual.meta || 0
      );

      const faltaPorPagar = Math.max(
        meta - totalAhorrado,
        0
      );

      /*
       * Calculamos el estado real
       * comparando ahorro contra meta.
       */
      const estadoPago =
        meta > 0 && totalAhorrado >= meta
          ? "COMPLETO"
          : "PENDIENTE";

      /*
       * Normalizamos la relación con campamentos.
       */
      const campamento =
        Array.isArray(
          inscripcionActual.campamentos
        )
          ? inscripcionActual.campamentos[0]
              ?.nombre || null
          : inscripcionActual.campamentos
              ?.nombre || null;

      return {
        ...campista,

        campamento,
        meta,
        total_ahorrado: totalAhorrado,
        falta_por_pagar: faltaPorPagar,
        estado_pago: estadoPago,
      };
    }
  );

  return (
    <>
      {/* CABECERA */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Campistas
          </h1>

          <p className="mt-2 text-slate-500">
            Administra los campistas registrados en{" "}
            {APP_CONFIG.nombreCorto} y consulta el
            estado de sus pagos.
          </p>
        </div>

        <Link
          href="/admin/campistas/nuevo"
          className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          + Registrar campista
        </Link>
      </div>

      {/* LISTADO */}
      <ListaCampistas
        campistas={campistasProcesados}
      />
    </>
  );
}