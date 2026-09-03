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

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre de la iglesia es obligatorio." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("iglesias")
      .insert({
        nombre,
        estado: "ACTIVO",
      })
      .select(`
        id,
        nombre,
        estado,
        fecha_registro
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe una iglesia con ese nombre." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      iglesia: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al registrar la iglesia." },
      { status: 500 }
    );
  }
}