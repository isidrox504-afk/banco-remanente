import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { APP_CONFIG } from "@/lib/config/app";
import ListaCampistas from "./ListaCampistas";

// ==========================================================
// EVITAR CACHE DEL LISTADO
// ==========================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function CampistasPage() {
  const supabase = await createClient();

  // ==========================================================
  // CONSULTAR CAMPISTAS
  // ==========================================================

  const {
    data: campistas,
    error,
  } = await supabase
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

    // IMPORTANTE:
    // Los campistas nuevos aparecerán primero.
    .order("id", {
      ascending: false,
    });

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    console.error(
      "Error cargando campistas:",
      error
    );

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar los campistas:{" "}
        {error.message}
      </div>
    );
  }

  // ==========================================================
  // PROCESAR CAMPISTAS
  // ==========================================================

  const campistasProcesados =
    (campistas || []).map(
      (campista: any) => {
        // ====================================================
        // INSCRIPCIONES
        // ====================================================

        const inscripciones =
          Array.isArray(
            campista.inscripciones
          )
            ? campista.inscripciones
            : [];

        // ====================================================
        // ORDENAR INSCRIPCIONES
        // MÁS RECIENTE PRIMERO
        // ====================================================

        const inscripcionesOrdenadas =
          [...inscripciones].sort(
            (a, b) => {
              const fechaA =
                new Date(
                  a.fecha_inscripcion ||
                    0
                ).getTime();

              const fechaB =
                new Date(
                  b.fecha_inscripcion ||
                    0
                ).getTime();

              return fechaB - fechaA;
            }
          );

        // ====================================================
        // INSCRIPCIÓN ACTUAL
        // ====================================================

        const inscripcionActual =
          inscripcionesOrdenadas.find(
            (inscripcion) =>
              inscripcion.estado !==
              "CANCELADO"
          ) || null;

        // ====================================================
        // SIN INSCRIPCIÓN
        // ====================================================

        if (!inscripcionActual) {
          return {
            id: campista.id,

            codigo_campista:
              campista.codigo_campista,

            identidad:
              campista.identidad,

            nombre:
              campista.nombre,

            telefono:
              campista.telefono,

            genero:
              campista.genero,

            fecha_nacimiento:
              campista.fecha_nacimiento,

            estado:
              campista.estado,

            fecha_registro:
              campista.fecha_registro,

            iglesia_id:
              campista.iglesia_id,

            iglesias:
              campista.iglesias,

            campamento: null,

            meta: 0,

            total_ahorrado: 0,

            falta_por_pagar: 0,

            estado_pago:
              "SIN_INSCRIPCION" as const,
          };
        }

        // ====================================================
        // APORTES ACTIVOS
        // ====================================================

        const aportes =
          Array.isArray(
            inscripcionActual.aportes
          )
            ? inscripcionActual.aportes
            : [];

        const totalAhorrado =
          aportes
            .filter(
              (aporte: any) =>
                aporte.estado ===
                "ACTIVO"
            )
            .reduce(
              (
                total: number,
                aporte: any
              ) =>
                total +
                Number(
                  aporte.monto || 0
                ),
              0
            );

        // ====================================================
        // META
        // ====================================================

        const meta = Number(
          inscripcionActual.meta || 0
        );

        // ====================================================
        // FALTA POR PAGAR
        // ====================================================

        const faltaPorPagar =
          Math.max(
            meta - totalAhorrado,
            0
          );

        // ====================================================
        // ESTADO DE PAGO
        // ====================================================

        const estadoPago:
          | "COMPLETO"
          | "PENDIENTE" =
          meta > 0 &&
          totalAhorrado >= meta
            ? "COMPLETO"
            : "PENDIENTE";

        // ====================================================
        // CAMPAMENTO
        // ====================================================

        const campamento =
          Array.isArray(
            inscripcionActual.campamentos
          )
            ? inscripcionActual
                .campamentos[0]
                ?.nombre || null
            : inscripcionActual
                .campamentos?.nombre ||
              null;

        // ====================================================
        // RESPUESTA PARA LA TABLA
        // ====================================================

        return {
          id: campista.id,

          codigo_campista:
            campista.codigo_campista,

          identidad:
            campista.identidad,

          nombre:
            campista.nombre,

          telefono:
            campista.telefono,

          genero:
            campista.genero,

          fecha_nacimiento:
            campista.fecha_nacimiento,

          estado:
            campista.estado,

          fecha_registro:
            campista.fecha_registro,

          iglesia_id:
            campista.iglesia_id,

          iglesias:
            campista.iglesias,

          campamento,

          meta,

          total_ahorrado:
            totalAhorrado,

          falta_por_pagar:
            faltaPorPagar,

          estado_pago:
            estadoPago,
        };
      }
    );

  // ==========================================================
  // PÁGINA
  // ==========================================================

  return (
    <>
      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Campistas
          </h1>

          <p className="mt-2 text-slate-500">
            Administra los campistas
            registrados en{" "}
            {APP_CONFIG.nombreCorto} y
            consulta el estado de sus
            pagos.
          </p>
        </div>

        <Link
          href="/admin/campistas/nuevo"
          className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          + Registrar campista
        </Link>
      </div>

      {/* ======================================================
          LISTADO
      ====================================================== */}

      <ListaCampistas
        campistas={
          campistasProcesados
        }
      />
    </>
  );
}