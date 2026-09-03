import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generarPin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);

  const numero = (array[0] % 900000) + 100000;

  return numero.toString();
}

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

    const identidad = body.identidad?.trim();
    const nombre = body.nombre?.trim();
    const telefono = body.telefono?.trim() || null;
    const genero = body.genero?.trim() || null;
    const fechaNacimiento = body.fecha_nacimiento?.trim() || null;

    const iglesiaId = body.iglesia_id
      ? Number(body.iglesia_id)
      : null;

    if (!identidad || !nombre) {
      return NextResponse.json(
        { error: "Identidad y nombre son obligatorios." },
        { status: 400 }
      );
    }

    if (
      genero &&
      !["MASCULINO", "FEMENINO"].includes(genero)
    ) {
      return NextResponse.json(
        { error: "El género seleccionado no es válido." },
        { status: 400 }
      );
    }

    if (
      fechaNacimiento &&
      new Date(fechaNacimiento) > new Date()
    ) {
      return NextResponse.json(
        { error: "La fecha de nacimiento no puede ser futura." },
        { status: 400 }
      );
    }

    if (iglesiaId) {
      const { data: iglesia } = await supabase
        .from("iglesias")
        .select("id")
        .eq("id", iglesiaId)
        .eq("estado", "ACTIVO")
        .maybeSingle();

      if (!iglesia) {
        return NextResponse.json(
          { error: "La iglesia seleccionada no es válida." },
          { status: 400 }
        );
      }
    }

    const pin = generarPin();

    const { data, error } = await supabase
      .from("campistas")
      .insert({
        identidad,
        nombre,
        telefono,
        iglesia_id: iglesiaId,
        genero,
        fecha_nacimiento: fechaNacimiento,
        pin_consulta: pin,
        estado: "ACTIVO",
      })
      .select(`
        id,
        identidad,
        nombre,
        genero,
        fecha_nacimiento
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe un campista con ese número de identidad." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      campista: data,
      pin,
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al registrar el campista." },
      { status: 500 }
    );
  }
}