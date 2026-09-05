import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ==========================================================
// EVITAR CACHE
// ==========================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // ========================================================
    // BODY
    // ========================================================

    const body = await request.json();

    const codigoCampista =
      body.codigo_campista
        ?.trim()
        .toUpperCase();

    const pin =
      body.pin?.trim();

    // ========================================================
    // VALIDACIONES
    // ========================================================

    if (
      !codigoCampista ||
      !pin
    ) {
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

    if (
      !/^\d{6}$/.test(pin)
    ) {
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

    // ========================================================
    // CONSULTA SEGURA MEDIANTE RPC
    // ========================================================

    const {
      data,
      error,
    } = await supabase.rpc(
      "consultar_ahorro_campista",
      {
        p_codigo_campista:
          codigoCampista,

        p_pin:
          pin,
      }
    );

    // ========================================================
    // ERROR SUPABASE
    // ========================================================

    if (error) {
      console.error(
        "Error consultando ahorro:",
        error
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

    // ========================================================
    // SIN RESPUESTA
    // ========================================================

    if (!data) {
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

    // ========================================================
    // CREDENCIALES INCORRECTAS
    // ========================================================

    if (
      data.ok === false &&
      data.codigo ===
        "CREDENCIALES_INVALIDAS"
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

    // ========================================================
    // CAMPISTA INACTIVO
    // ========================================================

    if (
      data.ok === false &&
      data.codigo ===
        "CAMPISTA_INACTIVO"
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

    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json({
      campista:
        data.campista,

      inscripcion:
        data.inscripcion,

      aportes:
        data.aportes || [],
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