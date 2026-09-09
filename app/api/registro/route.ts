import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function generarPin(): string {
  const array =
    new Uint32Array(1);

  crypto.getRandomValues(
    array
  );

  const numero =
    (array[0] % 900000) +
    100000;

  return numero.toString();
}

// ============================================================
// CATÁLOGOS PÚBLICOS
// ============================================================

export async function GET() {
  try {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "obtener_catalogos_registro_publico"
      );

    if (error) {
      console.error(
        "Error cargando catálogos públicos:",
        error
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron cargar los datos del registro.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      iglesias:
        data?.iglesias ||
        [],

      campamentos:
        data?.campamentos ||
        [],
    });
  } catch (error) {
    console.error(
      "Error GET /api/registro:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al cargar el registro.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// REGISTRO PÚBLICO
// ============================================================

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const body =
      await request.json();

    const identidad =
      body.identidad
        ?.trim() || null;

    const nombre =
      body.nombre
        ?.trim();

    const telefono =
      body.telefono
        ?.trim() || null;

    const genero =
      body.genero
        ?.trim()
        ?.toUpperCase();

    const fechaNacimiento =
      body.fecha_nacimiento
        ?.trim();

    const iglesiaId =
      body.iglesia_id
        ? Number(
            body.iglesia_id
          )
        : null;

    const campamentoId =
      body.campamento_id
        ? Number(
            body.campamento_id
          )
        : null;

    // ========================================================
    // VALIDACIONES
    // ========================================================

    if (!nombre) {
      return NextResponse.json(
        {
          error:
            "El nombre es obligatorio.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !genero ||
      ![
        "MASCULINO",
        "FEMENINO",
      ].includes(
        genero
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Selecciona un género válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !fechaNacimiento
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha de nacimiento es obligatoria.",
        },
        {
          status: 400,
        }
      );
    }

    const fecha =
      new Date(
        `${fechaNacimiento}T00:00:00`
      );

    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha de nacimiento no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fecha >
      new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha de nacimiento no puede ser futura.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      iglesiaId !== null &&
      (
        !Number.isInteger(
          iglesiaId
        ) ||
        iglesiaId <= 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La iglesia seleccionada no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    if (
    campamentoId === null ||
    !Number.isInteger(
        campamentoId
    ) ||
    campamentoId <= 0
    ) {
    return NextResponse.json(
        {
        error:
            "Debes seleccionar un campamento.",
        },
        {
        status: 400,
        }
    );
    }

    // ========================================================
    // PIN
    // ========================================================

    const pin =
      generarPin();

    // ========================================================
    // REGISTRO MEDIANTE RPC CONTROLADO
    // ========================================================

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "registrar_campista_publico",
        {
          p_identidad:
            identidad,

          p_nombre:
            nombre,

          p_telefono:
            telefono,

          p_iglesia_id:
            iglesiaId,

          p_genero:
            genero,

          p_fecha_nacimiento:
            fechaNacimiento,

          p_pin:
            pin,

          p_campamento_id:
            campamentoId,
        }
      );

    if (error) {
      console.error(
        "Error RPC registro público:",
        error
      );

      const mensaje =
        error.message ||
        "";

      if (
        mensaje.includes(
          "Ya existe un campista"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Ya existe un campista con ese número de identidad.",
          },
          {
            status: 409,
          }
        );
      }

      if (
        mensaje.includes(
          "iglesia"
        ) ||
        mensaje.includes(
          "campamento"
        ) ||
        mensaje.includes(
          "género"
        ) ||
        mensaje.includes(
          "fecha"
        )
      ) {
        return NextResponse.json(
          {
            error:
              mensaje,
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "No se pudo completar el registro.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      campista: {
        id:
          data.id,

        nombre:
          data.nombre,

        codigo_campista:
          data.codigo_campista,
      },

      codigo_campista:
        data.codigo_campista,

      pin:
        data.pin,

      inscrito:
        data.inscrito,

      campamento:
        data.campamento,

      meta:
        data.meta,
    });
  } catch (error) {
    console.error(
      "Error POST /api/registro:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al registrar al campista.",
      },
      {
        status: 500,
      }
    );
  }
}