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

    if (!/^\d+$/.test(id) || Number(id) <= 0) {
      return NextResponse.json(
        { error: "El identificador del campamento no es válido." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const nombre =
      typeof body.nombre === "string"
        ? body.nombre.trim()
        : "";

    const precio = Number(body.precio_inscripcion);

    const fechaInicio =
      typeof body.fecha_inicio === "string" &&
      body.fecha_inicio.trim()
        ? body.fecha_inicio.trim()
        : null;

    const fechaLimitePago =
      typeof body.fecha_limite_pago === "string" &&
      body.fecha_limite_pago.trim()
        ? body.fecha_limite_pago.trim()
        : null;

    const preciosIglesia = body.precios_iglesia;

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

    if (!Array.isArray(preciosIglesia)) {
      return NextResponse.json(
        {
          error:
            "Debes enviar la lista de precios por iglesia.",
        },
        { status: 400 }
      );
    }

    const iglesiasProcesadas = new Set<number>();

    for (const item of preciosIglesia) {
      const iglesiaId = Number(item?.iglesia_id);
      const precioIglesia = Number(item?.precio);

      if (
        !Number.isInteger(iglesiaId) ||
        iglesiaId <= 0 ||
        !Number.isFinite(precioIglesia) ||
        precioIglesia < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Hay un precio por iglesia o identificador no válido.",
          },
          { status: 400 }
        );
      }

      if (iglesiasProcesadas.has(iglesiaId)) {
        return NextResponse.json(
          {
            error:
              "No puedes enviar una iglesia más de una vez.",
          },
          { status: 400 }
        );
      }

      iglesiasProcesadas.add(iglesiaId);
    }

    const { data, error } = await supabase.rpc(
      "actualizar_campamento_con_precios",
      {
        p_campamento_id: Number(id),
        p_nombre: nombre,
        p_precio_inscripcion: precio,
        p_fecha_inicio: fechaInicio,
        p_fecha_limite_pago: fechaLimitePago,
        p_precios_iglesia: preciosIglesia,
      }
    );

    if (error) {
      console.error(
        "Error al actualizar campamento con precios:",
        error
      );

      return NextResponse.json(
        {
          error:
            "No se pudo actualizar el campamento y sus precios por iglesia.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      campamento: data,
    });
  } catch (error) {
    console.error("Error inesperado al actualizar campamento:", error);

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al actualizar el campamento.",
      },
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