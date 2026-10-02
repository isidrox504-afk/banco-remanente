
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const campamentoId = Number(
      searchParams.get("campamento_id")
    );

    const iglesiaParam = searchParams.get("iglesia_id");

    const iglesiaId =
      iglesiaParam && iglesiaParam.trim() !== ""
        ? Number(iglesiaParam)
        : null;

    if (
      !Number.isInteger(campamentoId) ||
      campamentoId <= 0
    ) {
      return NextResponse.json(
        { error: "Selecciona un campamento válido." },
        { status: 400 }
      );
    }

    if (
      iglesiaId !== null &&
      (!Number.isInteger(iglesiaId) || iglesiaId <= 0)
    ) {
      return NextResponse.json(
        { error: "Selecciona una iglesia válida." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "obtener_precio_registro_publico",
      {
        p_campamento_id: campamentoId,
        p_iglesia_id: iglesiaId,
      }
    );

    if (error) {
      console.error(
        "Error consultando precio de registro:",
        error
      );

      return NextResponse.json(
        { error: "No se pudo consultar el precio del registro." },
        { status: 400 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error en GET /api/registro/precio:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al consultar el precio." },
      { status: 500 }
    );
  }
}