import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function calcularEdad(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;

  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);

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

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const buscar =
      searchParams.get("buscar")?.trim() || "";

    if (buscar.length < 2) {
      return NextResponse.json({
        campistas: [],
      });
    }

    // ========================================================
    // 1. BUSCAR CAMPISTAS SOLO POR NOMBRE
    // ========================================================

    const {
      data: campistas,
      error: errorCampistas,
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
            nombre,
            fecha_inicio
          )
        )
      `)
      .ilike("nombre", `%${buscar}%`)
      .eq("estado", "ACTIVO")
      .order("nombre")
      .limit(15);

    if (errorCampistas) {
      return NextResponse.json(
        {
          error: errorCampistas.message,
        },
        { status: 500 }
      );
    }

    if (!campistas || campistas.length === 0) {
      return NextResponse.json({
        campistas: [],
      });
    }

    // ========================================================
    // 2. DETERMINAR INSCRIPCIÓN ACTIVA DE CADA CAMPISTA
    // ========================================================

    const campistasConInscripcion = campistas.map(
      (campista) => {
        const inscripciones = Array.isArray(
          campista.inscripciones
        )
          ? [...campista.inscripciones]
          : [];

        /*
         * Ordenamos por fecha de inscripción descendente
         * para tomar primero la más reciente.
         */
        inscripciones.sort((a: any, b: any) => {
          const fechaA = new Date(
            a.fecha_inscripcion
          ).getTime();

          const fechaB = new Date(
            b.fecha_inscripcion
          ).getTime();

          return fechaB - fechaA;
        });

        const inscripcionActiva =
          inscripciones.find(
            (inscripcion: any) =>
              inscripcion.estado === "AHORRANDO" ||
              inscripcion.estado === "ACTIVO"
          ) || null;

        return {
          campista,
          inscripcionActiva,
        };
      }
    );

    // ========================================================
    // 3. OBTENER TODOS LOS IDS DE INSCRIPCIONES ACTIVAS
    // ========================================================

    const idsInscripciones =
      campistasConInscripcion
        .map(
          ({ inscripcionActiva }) =>
            inscripcionActiva?.id
        )
        .filter(
          (id): id is number =>
            typeof id === "number"
        );

    // ========================================================
    // 4. BUSCAR TODOS LOS APORTES EN UNA SOLA CONSULTA
    // ========================================================

    let aportes:
      | {
          inscripcion_id: number;
          monto: number;
        }[]
      = [];

    if (idsInscripciones.length > 0) {
      const {
        data: dataAportes,
        error: errorAportes,
      } = await supabase
        .from("aportes")
        .select(`
          inscripcion_id,
          monto
        `)
        .in(
          "inscripcion_id",
          idsInscripciones
        )
        .eq("estado", "ACTIVO");

      if (errorAportes) {
        return NextResponse.json(
          {
            error: errorAportes.message,
          },
          { status: 500 }
        );
      }

      aportes =
        (dataAportes || []).map((aporte) => ({
          inscripcion_id:
            Number(aporte.inscripcion_id),
          monto: Number(aporte.monto),
        }));
    }

    // ========================================================
    // 5. AGRUPAR APORTES POR INSCRIPCIÓN
    // ========================================================

    const totalesPorInscripcion = new Map<
      number,
      number
    >();

    for (const aporte of aportes) {
      const totalActual =
        totalesPorInscripcion.get(
          aporte.inscripcion_id
        ) || 0;

      totalesPorInscripcion.set(
        aporte.inscripcion_id,
        totalActual + aporte.monto
      );
    }

    // ========================================================
    // 6. CONSTRUIR RESPUESTA
    // ========================================================

    const resultados =
      campistasConInscripcion.map(
        ({
          campista,
          inscripcionActiva,
        }) => {
          const totalAhorrado =
            inscripcionActiva
              ? totalesPorInscripcion.get(
                  inscripcionActiva.id
                ) || 0
              : 0;

          const meta = inscripcionActiva
            ? Number(
                inscripcionActiva.meta
              )
            : 0;

          const pendiente = Math.max(
            meta - totalAhorrado,
            0
          );

          const iglesia =
            Array.isArray(
              campista.iglesias
            )
              ? campista.iglesias[0]
                  ?.nombre || null
              : (
                  campista.iglesias as any
                )?.nombre || null;

          const campamento =
            inscripcionActiva
              ? Array.isArray(
                  inscripcionActiva.campamentos
                )
                ? inscripcionActiva
                    .campamentos[0]
                    ?.nombre || null
                : (
                    inscripcionActiva.campamentos as any
                  )?.nombre || null
              : null;

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

            edad: calcularEdad(
              campista.fecha_nacimiento
            ),

            estado:
              campista.estado,

            iglesia,

            inscripcion:
              inscripcionActiva
                ? {
                    id:
                      inscripcionActiva.id,

                    estado:
                      inscripcionActiva.estado,

                    meta,

                    total_ahorrado:
                      totalAhorrado,

                    pendiente,

                    campamento,
                  }
                : null,
          };
        }
      );

    return NextResponse.json({
      campistas: resultados,
    });
  } catch (error) {
    console.error(
      "Error buscando campistas para aportes:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al buscar campistas.",
      },
      { status: 500 }
    );
  }
}