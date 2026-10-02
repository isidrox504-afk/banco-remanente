import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PrecioIglesia = {
  iglesia_id: number;
  precio: number;
};

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

    const nombre =
      typeof body.nombre === "string"
        ? body.nombre.trim()
        : "";

    const precioInscripcion = Number(body.precio_inscripcion);

    const fechaInicio =
      typeof body.fecha_inicio === "string"
        ? body.fecha_inicio.trim() || null
        : null;

    const fechaLimitePago =
      typeof body.fecha_limite_pago === "string"
        ? body.fecha_limite_pago.trim() || null
        : null;

    const preciosIglesia: PrecioIglesia[] =
      body.precios_iglesia ?? [];

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

    if (!Array.isArray(preciosIglesia)) {
      return NextResponse.json(
        { error: "La lista de precios por iglesia no es válida." },
        { status: 400 }
      );
    }

    const idsIglesias = new Set<number>();

    for (const item of preciosIglesia) {
      const iglesiaId = Number(item?.iglesia_id);
      const precioEspecial = Number(item?.precio);

      if (
        !Number.isSafeInteger(iglesiaId) ||
        iglesiaId <= 0 ||
        !Number.isFinite(precioEspecial) ||
        precioEspecial < 0
      ) {
        return NextResponse.json(
          { error: "Hay un precio por iglesia no válido." },
          { status: 400 }
        );
      }

      if (idsIglesias.has(iglesiaId)) {
        return NextResponse.json(
          { error: "Una iglesia aparece más de una vez en los precios." },
          { status: 400 }
        );
      }

      idsIglesias.add(iglesiaId);
    }

    // Verificar en el servidor que todas las iglesias estén activas.
    if (idsIglesias.size > 0) {
      const { data: iglesiasActivas, error: errorIglesias } =
        await supabase
          .from("iglesias")
          .select("id")
          .eq("estado", "ACTIVO")
          .in("id", Array.from(idsIglesias));

      if (errorIglesias) {
        return NextResponse.json(
          { error: "No se pudieron validar las iglesias seleccionadas." },
          { status: 500 }
        );
      }

      if ((iglesiasActivas?.length ?? 0) !== idsIglesias.size) {
        return NextResponse.json(
          { error: "Una o más iglesias no existen o no están activas." },
          { status: 400 }
        );
      }
    }

    // Crear el campamento.
    const { data: campamento, error: errorCampamento } =
      await supabase
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

    if (errorCampamento || !campamento) {
      return NextResponse.json(
        {
          error:
            errorCampamento?.message ||
            "No se pudo crear el campamento.",
        },
        { status: 500 }
      );
    }

    // Guardar los precios especiales del campamento.
    if (preciosIglesia.length > 0) {
      const filasPrecios = preciosIglesia.map((item) => ({
        campamento_id: campamento.id,
        iglesia_id: Number(item.iglesia_id),
        precio: Number(item.precio),
      }));

      const { error: errorPrecios } = await supabase
        .from("precios_campamento_iglesia")
        .insert(filasPrecios);

      if (errorPrecios) {
        // Intentar retirar el campamento si falla el guardado de precios.
        const { error: errorEliminar } = await supabase
          .from("campamentos")
          .delete()
          .eq("id", campamento.id);

        return NextResponse.json(
          {
            error: errorEliminar
              ? "No se pudieron guardar los precios y no se pudo eliminar automáticamente el campamento creado. Revisa el registro en Supabase."
              : "No se pudieron guardar los precios especiales. El campamento creado fue eliminado.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      campamento,
    });
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error al crear el campamento." },
      { status: 500 }
    );
  }
}