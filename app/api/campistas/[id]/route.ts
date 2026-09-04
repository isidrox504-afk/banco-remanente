import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// EDITAR CAMPISTA
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
    const telefono = body.telefono?.trim() || null;

    const iglesiaId = body.iglesia_id
      ? Number(body.iglesia_id)
      : null;

    const genero = body.genero?.trim() || null;

    const fechaNacimiento =
      body.fecha_nacimiento?.trim() || null;

    // ========================================================
    // VALIDACIONES
    // ========================================================

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
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
      new Date(`${fechaNacimiento}T00:00:00`) > new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha de nacimiento no puede ser futura.",
        },
        { status: 400 }
      );
    }

    // Validar iglesia
    if (iglesiaId) {
      const { data: iglesia, error: errorIglesia } =
        await supabase
          .from("iglesias")
          .select("id, estado")
          .eq("id", iglesiaId)
          .maybeSingle();

      if (errorIglesia) {
        return NextResponse.json(
          {
            error:
              "No se pudo validar la iglesia seleccionada.",
          },
          { status: 500 }
        );
      }

      if (!iglesia) {
        return NextResponse.json(
          {
            error:
              "La iglesia seleccionada no existe.",
          },
          { status: 400 }
        );
      }

      if (iglesia.estado !== "ACTIVO") {
        return NextResponse.json(
          {
            error:
              "La iglesia seleccionada se encuentra inactiva.",
          },
          { status: 400 }
        );
      }
    }

    // ========================================================
    // ACTUALIZAR
    // ========================================================

    const { data, error } = await supabase
      .from("campistas")
      .update({
        nombre,
        telefono,
        iglesia_id: iglesiaId,
        genero,
        fecha_nacimiento: fechaNacimiento,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        id,
        codigo_campista,
        identidad,
        nombre,
        telefono,
        iglesia_id,
        genero,
        fecha_nacimiento,
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
      campista: data,
    });
  } catch (error) {
    console.error(
      "Error actualizando campista:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al actualizar el campista.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// ACTIVAR / DESACTIVAR CAMPISTA
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

    const nuevoEstado = body.estado;

    if (
      !["ACTIVO", "INACTIVO"].includes(
        nuevoEstado
      )
    ) {
      return NextResponse.json(
        { error: "Estado no válido." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("campistas")
      .update({
        estado: nuevoEstado,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        id,
        codigo_campista,
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
      campista: data,
    });
  } catch (error) {
    console.error(
      "Error cambiando estado del campista:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al cambiar el estado del campista.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// ELIMINAR CAMPISTA COMPLETAMENTE
// ============================================================

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const campistaId = Number(id);

    if (
      !Number.isInteger(campistaId) ||
      campistaId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del campista no es válido.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // ========================================================
    // VALIDAR SESIÓN
    // ========================================================

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    // ========================================================
    // VALIDAR QUE EL CAMPISTA EXISTA
    // ========================================================

    const {
      data: campista,
      error: errorCampista,
    } = await supabase
      .from("campistas")
      .select(`
        id,
        nombre,
        codigo_campista
      `)
      .eq("id", campistaId)
      .maybeSingle();

    if (errorCampista) {
      console.error(
        "Error buscando campista:",
        errorCampista
      );

      return NextResponse.json(
        {
          error:
            "No se pudo validar el campista.",
        },
        { status: 500 }
      );
    }

    if (!campista) {
      return NextResponse.json(
        {
          error:
            "El campista no existe.",
        },
        { status: 404 }
      );
    }

    // ========================================================
    // ELIMINAR TODO MEDIANTE RPC / TRANSACCIÓN
    // ========================================================

    const {
      error: errorEliminacion,
    } = await supabase.rpc(
      "eliminar_campista_completo",
      {
        p_campista_id: campistaId,
      }
    );

    if (errorEliminacion) {
      console.error(
        "Error eliminando campista:",
        errorEliminacion
      );

      return NextResponse.json(
        {
          error:
            "No se pudo eliminar completamente al campista.",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json({
      mensaje:
        "Campista eliminado correctamente.",
      campista: {
        id: campista.id,
        nombre: campista.nombre,
        codigo_campista:
          campista.codigo_campista,
      },
    });
  } catch (error) {
    console.error(
      "Error eliminando campista:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al eliminar el campista.",
      },
      { status: 500 }
    );
  }
}