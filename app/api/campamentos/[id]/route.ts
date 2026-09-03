import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// EDITAR CAMPAMENTO
// ============================================================

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    const nombre = body.nombre?.trim();
    const precio = Number(body.precio_inscripcion);

    const fechaInicio =
      body.fecha_inicio?.trim() || null;

    const fechaLimitePago =
      body.fecha_limite_pago?.trim() || null;

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      return NextResponse.json(
        { error: "El precio de inscripción no es válido." },
        { status: 400 }
      );
    }

    if (
      fechaInicio &&
      fechaLimitePago &&
      fechaLimitePago > fechaInicio
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha límite de pago no puede ser posterior a la fecha del campamento.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("campamentos")
      .update({
        nombre,
        precio_inscripcion: precio,
        fecha_inicio: fechaInicio,
        fecha_limite_pago: fechaLimitePago,
      })
      .eq("id", id)
      .select(`
        id,
        nombre,
        precio_inscripcion,
        fecha_inicio,
        fecha_limite_pago,
        estado
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      campamento: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al actualizar el campamento." },
      { status: 500 }
    );
  }
}

// ============================================================
// CAMBIAR ESTADO
// ============================================================

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    const estado = body.estado;

    if (
      !["ACTIVO", "FINALIZADO", "INACTIVO"].includes(estado)
    ) {
      return NextResponse.json(
        { error: "Estado no válido." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("campamentos")
      .update({
        estado,
      })
      .eq("id", id)
      .select("id, nombre, estado")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      campamento: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al cambiar el estado." },
      { status: 500 }
    );
  }
}