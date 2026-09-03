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

    const campistaId = Number(body.campista_id);
    const campamentoId = Number(body.campamento_id);
    const meta = Number(body.meta);

    if (!campistaId || !campamentoId) {
      return NextResponse.json(
        { error: "Campista y campamento son obligatorios." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(meta) || meta <= 0) {
      return NextResponse.json(
        { error: "La meta debe ser mayor que cero." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("inscripciones")
      .insert({
        campista_id: campistaId,
        campamento_id: campamentoId,
        meta,
        estado: "AHORRANDO",
      })
      .select(`
        id,
        campista_id,
        campamento_id,
        meta,
        estado
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Este campista ya está inscrito en ese campamento." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      inscripcion: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al crear la inscripción." },
      { status: 500 }
    );
  }
}