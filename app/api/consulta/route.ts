import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const body = await request.json();

    const identidad = body.identidad?.trim();
    const pin = body.pin?.trim();

    if (!identidad || !pin) {
      return NextResponse.json(
        { error: "Identidad y PIN son obligatorios." },
        { status: 400 }
      );
    }

    // Buscar campista
    const { data: campista, error: errorCampista } = await supabase
      .from("campistas")
      .select(`
        id,
        nombre,
        identidad,
        pin_consulta,
        estado
      `)
      .eq("identidad", identidad)
      .maybeSingle();

    if (errorCampista) {
      return NextResponse.json(
        { error: "No se pudo realizar la consulta." },
        { status: 500 }
      );
    }

    if (!campista) {
      return NextResponse.json(
        { error: "Identidad o PIN incorrectos." },
        { status: 401 }
      );
    }

    if (campista.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "Este campista no se encuentra activo." },
        { status: 403 }
      );
    }

    if (campista.pin_consulta !== pin) {
      return NextResponse.json(
        { error: "Identidad o PIN incorrectos." },
        { status: 401 }
      );
    }

    // Obtener inscripción más reciente
    const { data: inscripcion, error: errorInscripcion } =
      await supabase
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
        .eq("campista_id", campista.id)
        .neq("estado", "CANCELADO")
        .order("fecha_inscripcion", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (errorInscripcion) {
      return NextResponse.json(
        { error: "No se pudo obtener la inscripción." },
        { status: 500 }
      );
    }

    if (!inscripcion) {
      return NextResponse.json({
        campista: {
          nombre: campista.nombre,
        },
        inscripcion: null,
        aportes: [],
      });
    }

    // Obtener aportes
    const { data: aportes, error: errorAportes } = await supabase
      .from("aportes")
      .select(`
        id,
        monto,
        fecha_aporte,
        metodo_pago,
        referencia
      `)
      .eq("inscripcion_id", inscripcion.id)
      .eq("estado", "ACTIVO")
      .order("fecha_aporte", { ascending: false });

    if (errorAportes) {
      return NextResponse.json(
        { error: "No se pudieron obtener los aportes." },
        { status: 500 }
      );
    }

    const totalAhorrado =
      aportes?.reduce(
        (total, aporte) => total + Number(aporte.monto),
        0
      ) || 0;

    const meta = Number(inscripcion.meta);

    const pendiente = Math.max(meta - totalAhorrado, 0);

    const porcentaje =
      meta > 0
        ? Math.min(
            Math.round((totalAhorrado / meta) * 100),
            100
          )
        : 0;

    const relacionCampamento = inscripcion.campamentos;

    const campamento = Array.isArray(relacionCampamento)
      ? relacionCampamento[0]
      : relacionCampamento;

    return NextResponse.json({
      campista: {
        nombre: campista.nombre,
      },

      inscripcion: {
        id: inscripcion.id,
        meta,
        estado: inscripcion.estado,

        campamento: campamento
          ? {
              nombre: campamento.nombre,
              fecha_inicio: campamento.fecha_inicio,
              fecha_limite_pago:
                campamento.fecha_limite_pago,
            }
          : null,

        total_ahorrado: totalAhorrado,
        pendiente,
        porcentaje,
      },

      aportes: aportes || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al consultar el ahorro." },
      { status: 500 }
    );
  }
}