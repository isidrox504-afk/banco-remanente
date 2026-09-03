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

    const nombre = body.nombre?.trim();
    const precioInscripcion = Number(body.precio_inscripcion);

    const fechaInicio =
      body.fecha_inicio?.trim() || null;

    const fechaLimitePago =
      body.fecha_limite_pago?.trim() || null;

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del campamento es obligatorio." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(precioInscripcion) ||
      precioInscripcion <= 0
    ) {
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
            "La fecha límite de pago no puede ser posterior al inicio del campamento.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("campamentos")
      .insert({
        nombre,
        precio_inscripcion: precioInscripcion,
        fecha_inicio: fechaInicio,
        fecha_limite_pago: fechaLimitePago,
        estado: "ACTIVO",
      })
      .select(`
        id,
        nombre,
        precio_inscripcion,
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
      { error: "Ocurrió un error al crear el campamento." },
      { status: 500 }
    );
  }
}