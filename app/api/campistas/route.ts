import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generarPin(): string {
  const array = new Uint32Array(1);

  crypto.getRandomValues(array);

  const numero =
    (array[0] % 900000) + 100000;

  return numero.toString();
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    /*
     * La identidad ahora es OPCIONAL.
     *
     * Si viene vacía guardamos NULL,
     * nunca una cadena vacía.
     */
    const identidad =
      body.identidad?.trim() ||
      null;

    const nombre =
      body.nombre?.trim();

    const telefono =
      body.telefono?.trim() ||
      null;

    const genero =
      body.genero?.trim() ||
      null;

    const fechaNacimiento =
      body.fecha_nacimiento?.trim() ||
      null;

    const iglesiaId =
      body.iglesia_id
        ? Number(
            body.iglesia_id
          )
        : null;

    /*
     * NOMBRE OBLIGATORIO
     */
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

    /*
     * VALIDAR GÉNERO
     */
    if (
      genero &&
      ![
        "MASCULINO",
        "FEMENINO",
      ].includes(genero)
    ) {
      return NextResponse.json(
        {
          error:
            "El género seleccionado no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * VALIDAR FECHA
     */
    if (
      fechaNacimiento &&
      new Date(
        `${fechaNacimiento}T00:00:00`
      ) > new Date()
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

    /*
     * VALIDAR IGLESIA
     */
    if (iglesiaId) {
      const {
        data: iglesia,
        error: errorIglesia,
      } = await supabase
        .from("iglesias")
        .select("id")
        .eq(
          "id",
          iglesiaId
        )
        .eq(
          "estado",
          "ACTIVO"
        )
        .maybeSingle();

      if (
        errorIglesia ||
        !iglesia
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
    }

    /*
     * GENERAR PIN
     */
    const pin =
      generarPin();

    /*
     * INSERTAR CAMPISTA
     *
     * No enviamos codigo_campista.
     *
     * El trigger de PostgreSQL
     * lo genera automáticamente
     * usando el ID.
     */
    const {
      data,
      error,
    } = await supabase
      .from("campistas")
      .insert({
        identidad,
        nombre,
        telefono,
        iglesia_id:
          iglesiaId,
        genero,
        fecha_nacimiento:
          fechaNacimiento,
        pin_consulta: pin,
        estado: "ACTIVO",
      })
      .select(`
        id,
        codigo_campista,
        identidad,
        nombre,
        telefono,
        genero,
        fecha_nacimiento,
        iglesia_id,
        estado
      `)
      .single();

    /*
     * ERRORES
     */
    if (error) {
      if (
        error.code ===
        "23505"
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

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * RESPUESTA
     */
    return NextResponse.json({
      campista: data,
      codigo_campista:
        data.codigo_campista,
      pin,
    });
  } catch (error) {
    console.error(
      "Error registrando campista:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al registrar el campista.",
      },
      {
        status: 500,
      }
    );
  }
}