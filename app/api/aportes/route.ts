import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

    const body = await request.json();

    const inscripcionId = Number(body.inscripcion_id);
    const monto = Number(body.monto);

    const metodoPago = body.metodo_pago?.trim() || null;
    const referencia = body.referencia?.trim() || null;
    const observacion = body.observacion?.trim() || null;

    if (!inscripcionId) {
      return NextResponse.json(
        { error: "La inscripción es obligatoria." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor que cero." },
        { status: 400 }
      );
    }

    const { data: inscripcion, error: errorInscripcion } =
      await supabase
        .from("inscripciones")
        .select(`
          id,
          meta,
          estado
        `)
        .eq("id", inscripcionId)
        .single();

    if (errorInscripcion || !inscripcion) {
      return NextResponse.json(
        { error: "No se encontró la inscripción." },
        { status: 404 }
      );
    }

    if (inscripcion.estado === "CANCELADO") {
      return NextResponse.json(
        { error: "No se pueden registrar aportes en una inscripción cancelada." },
        { status: 400 }
      );
    }

    const { data: aportesActuales, error: errorAportes } =
      await supabase
        .from("aportes")
        .select("monto")
        .eq("inscripcion_id", inscripcionId)
        .eq("estado", "ACTIVO");

    if (errorAportes) {
      return NextResponse.json(
        { error: errorAportes.message },
        { status: 500 }
      );
    }

    const totalActual = (aportesActuales || []).reduce(
      (total, aporte) => total + Number(aporte.monto),
      0
    );

    const meta = Number(inscripcion.meta);

    if (totalActual >= meta) {
      return NextResponse.json(
        { error: "Esta inscripción ya alcanzó su meta." },
        { status: 400 }
      );
    }

    if (totalActual + monto > meta) {
      const restante = meta - totalActual;

      return NextResponse.json(
        {
          error: `El aporte supera la meta. El monto máximo permitido es L ${restante.toFixed(
            2
          )}.`,
        },
        { status: 400 }
      );
    }

    const { data: aporte, error } = await supabase
      .from("aportes")
      .insert({
        inscripcion_id: inscripcionId,
        monto,
        metodo_pago: metodoPago,
        referencia,
        observacion,
        estado: "ACTIVO",
      })
      .select(`
        id,
        inscripcion_id,
        monto,
        fecha_aporte,
        estado
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const nuevoTotal = totalActual + monto;

    if (nuevoTotal >= meta) {
      await supabase
        .from("inscripciones")
        .update({
          estado: "COMPLETO",
        })
        .eq("id", inscripcionId);
    }

    return NextResponse.json({
      aporte,
      total_ahorrado: nuevoTotal,
      pendiente: Math.max(meta - nuevoTotal, 0),
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al registrar el aporte." },
      { status: 500 }
    );
  }
}