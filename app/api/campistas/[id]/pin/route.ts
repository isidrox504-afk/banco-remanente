import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generarPin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);

  const numero = (array[0] % 900000) + 100000;

  return numero.toString();
}

export async function POST(
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

    const nuevoPin = generarPin();

    const { data, error } = await supabase
      .from("campistas")
      .update({
        pin_consulta: nuevoPin,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, nombre")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      campista: data,
      pin: nuevoPin,
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al generar el nuevo PIN." },
      { status: 500 }
    );
  }
}

