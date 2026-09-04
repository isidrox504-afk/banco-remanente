import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const body = await request.json();

    const codigoCampista = body.codigo_campista
      ?.trim()
      .toUpperCase();

    const pin = body.pin?.trim();

    // ============================================================
    // VALIDACIONES
    // ============================================================

    if (!codigoCampista || !pin) {
      return NextResponse.json(
        {
          error:
            "El código de campista y el PIN son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        {
          error:
            "El PIN debe contener 6 dígitos.",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // BUSCAR CAMPISTA
    // ============================================================

    const {
      data: campista,
      error: errorCampista,
    } = await supabase
      .from("campistas")
      .select(`
        id,
        nombre,
        codigo_campista,
        pin_consulta,
        estado
      `)
      .eq(
        "codigo_campista",
        codigoCampista
      )
      .maybeSingle();

    if (errorCampista) {
      console.error(
        "Error buscando campista:",
        errorCampista
      );

      return NextResponse.json(
        {
          error:
            "No se pudo realizar la consulta.",
        },
        {
          status: 500,
        }
      );
    }

    // ============================================================
    // CAMPISTA NO ENCONTRADO
    // ============================================================

    if (!campista) {
      return NextResponse.json(
        {
          error:
            "Código de campista o PIN incorrectos.",
        },
        {
          status: 401,
        }
      );
    }

    // ============================================================
    // VALIDAR ESTADO
    // ============================================================

    if (
      campista.estado !==
      "ACTIVO"
    ) {
      return NextResponse.json(
        {
          error:
            "Este campista no se encuentra activo.",
        },
        {
          status: 403,
        }
      );
    }

    // ============================================================
    // VALIDAR PIN
    // ============================================================

    if (
      String(
        campista.pin_consulta
      ) !== pin
    ) {
      return NextResponse.json(
        {
          error:
            "Código de campista o PIN incorrectos.",
        },
        {
          status: 401,
        }
      );
    }

    // ============================================================
    // OBTENER INSCRIPCIÓN MÁS RECIENTE
    // ============================================================

    const {
      data: inscripcion,
      error: errorInscripcion,
    } = await supabase
      .from("inscripciones")
      .select(`
        id,
        meta,
        estado,
        fecha_inscripcion,
        campamentos (
          id,
          nombre,
          precio_inscripcion,
          fecha_inicio,
          fecha_limite_pago,
          estado
        )
      `)
      .eq(
        "campista_id",
        campista.id
      )
      .neq(
        "estado",
        "CANCELADO"
      )
      .order(
        "fecha_inscripcion",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (errorInscripcion) {
      console.error(
        "Error obteniendo inscripción:",
        errorInscripcion
      );

      return NextResponse.json(
        {
          error:
            "No se pudo obtener la inscripción.",
        },
        {
          status: 500,
        }
      );
    }

    // ============================================================
    // SIN INSCRIPCIÓN
    // ============================================================

    if (!inscripcion) {
      return NextResponse.json({
        campista: {
          nombre:
            campista.nombre,

          codigo_campista:
            campista.codigo_campista,
        },

        inscripcion: null,

        aportes: [],
      });
    }

    // ============================================================
    // OBTENER APORTES ACTIVOS
    // ============================================================

    const {
      data: aportes,
      error: errorAportes,
    } = await supabase
      .from("aportes")
      .select(`
        id,
        monto,
        fecha_aporte,
        metodo_pago,
        referencia
      `)
      .eq(
        "inscripcion_id",
        inscripcion.id
      )
      .eq(
        "estado",
        "ACTIVO"
      )
      .order(
        "fecha_aporte",
        {
          ascending: false,
        }
      );

    if (errorAportes) {
      console.error(
        "Error obteniendo aportes:",
        errorAportes
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron obtener los aportes.",
        },
        {
          status: 500,
        }
      );
    }

    // ============================================================
    // CALCULAR AHORRO
    // ============================================================

    const totalAhorrado =
      aportes?.reduce(
        (
          total,
          aporte
        ) =>
          total +
          Number(
            aporte.monto
          ),
        0
      ) || 0;

    const meta =
      Number(
        inscripcion.meta
      );

    const pendiente =
      Math.max(
        meta -
          totalAhorrado,
        0
      );

    const porcentaje =
      meta > 0
        ? Math.min(
            Math.round(
              (totalAhorrado /
                meta) *
                100
            ),
            100
          )
        : 0;

    // ============================================================
    // NORMALIZAR RELACIÓN CAMPAMENTO
    // ============================================================

    const relacionCampamento =
      inscripcion.campamentos;

    const campamento =
      Array.isArray(
        relacionCampamento
      )
        ? relacionCampamento[0]
        : relacionCampamento;

    // ============================================================
    // RESPUESTA
    // ============================================================

    return NextResponse.json({
      campista: {
        nombre:
          campista.nombre,

        codigo_campista:
          campista.codigo_campista,
      },

      inscripcion: {
        id:
          inscripcion.id,

        meta,

        estado:
          inscripcion.estado,

        campamento:
          campamento
            ? {
                nombre:
                  campamento.nombre,

                fecha_inicio:
                  campamento.fecha_inicio,

                fecha_limite_pago:
                  campamento.fecha_limite_pago,
              }
            : null,

        total_ahorrado:
          totalAhorrado,

        pendiente,

        porcentaje,
      },

      aportes:
        aportes || [],
    });
  } catch (error) {
    console.error(
      "Error general en consulta:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al consultar el ahorro.",
      },
      {
        status: 500,
      }
    );
  }
}