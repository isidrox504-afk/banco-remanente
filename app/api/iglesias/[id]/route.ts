import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// EDITAR IGLESIA
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

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre de la iglesia es obligatorio." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("iglesias")
      .update({
        nombre,
      })
      .eq("id", id)
      .select(`
        id,
        nombre,
        estado
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
      { error: "Ocurrió un error al actualizar la iglesia." },
      { status: 500 }
    );
  }
}

// ============================================================
// ACTIVAR / DESACTIVAR
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

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return NextResponse.json(
        { error: "Estado no válido." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("iglesias")
      .update({
        estado,
      })
      .eq("id", id)
      .select(`
        id,
        nombre,
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
      iglesia: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al cambiar el estado." },
      { status: 500 }
    );
  }
}

// ============================================================
// ELIMINAR IGLESIA
// Solo si no tiene campistas asociados
// ============================================================

export async function DELETE(
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

    const { count, error: errorConteo } = await supabase
      .from("campistas")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("iglesia_id", Number(id));

    if (errorConteo) {
      return NextResponse.json(
        { error: "No se pudo validar la iglesia." },
        { status: 500 }
      );
    }

    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar esta iglesia porque tiene campistas asociados. Puedes desactivarla.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("iglesias")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al eliminar la iglesia." },
      { status: 500 }
    );
  }
}