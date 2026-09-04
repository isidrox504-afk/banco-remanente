import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function calcularEdad(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;

  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);

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

    const { data: campistas, error } = await supabase
      .from("campistas")
      .select(`
        id,
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
      .or(
        `nombre.ilike.%${buscar}%,identidad.ilike.%${buscar}%`
      )
      .eq("estado", "ACTIVO")
      .order("nombre")
      .limit(15);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const resultados = [];

    for (const campista of campistas || []) {
      const inscripciones =
        Array.isArray(campista.inscripciones)
          ? campista.inscripciones
          : [];

      const inscripcionActiva =
        inscripciones.find(
          (inscripcion: any) =>
            inscripcion.estado === "AHORRANDO" ||
            inscripcion.estado === "ACTIVO"
        ) || null;

      let totalAhorrado = 0;

      if (inscripcionActiva) {
        const {
          data: aportes,
          error: errorAportes,
        } = await supabase
          .from("aportes")
          .select("monto")
          .eq(
            "inscripcion_id",
            inscripcionActiva.id
          )
          .eq("estado", "ACTIVO");

        if (errorAportes) {
          return NextResponse.json(
            { error: errorAportes.message },
            { status: 500 }
          );
        }

        totalAhorrado = (aportes || []).reduce(
          (total, aporte) =>
            total + Number(aporte.monto),
          0
        );
      }

      const meta = inscripcionActiva
        ? Number(inscripcionActiva.meta)
        : 0;

      resultados.push({
        id: campista.id,
        identidad: campista.identidad,
        nombre: campista.nombre,
        telefono: campista.telefono,
        genero: campista.genero,
        edad: calcularEdad(
          campista.fecha_nacimiento
        ),
        estado: campista.estado,
        iglesia:
          Array.isArray(campista.iglesias)
            ? campista.iglesias[0]?.nombre || null
            : (campista.iglesias as any)?.nombre || null,
        inscripcion: inscripcionActiva
          ? {
              id: inscripcionActiva.id,
              estado: inscripcionActiva.estado,
              meta,
              total_ahorrado: totalAhorrado,
              pendiente: Math.max(
                meta - totalAhorrado,
                0
              ),
              campamento:
                Array.isArray(
                  inscripcionActiva.campamentos
                )
                  ? inscripcionActiva
                      .campamentos[0]
                      ?.nombre || null
                  : (
                      inscripcionActiva.campamentos as any
                    )?.nombre || null,
            }
          : null,
      });
    }

    return NextResponse.json({
      campistas: resultados,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Ocurrió un error al buscar campistas.",
      },
      { status: 500 }
    );
  }
}