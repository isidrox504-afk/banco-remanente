
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IglesiaRelacion = {
  id: number;
  nombre: string;
};

type Inscripcion = {
  campamento_id: number;
  estado: string | null;
};

type Campista = {
  id: number;
  codigo_campista: string | null;
  nombre: string;
  iglesia_id: number | null;
  iglesias: IglesiaRelacion | IglesiaRelacion[] | null;
  inscripciones: Inscripcion[] | null;
};

function obtenerRelacion<T>(
  relacion: T | T[] | null
): T | null {
  if (!relacion) return null;

  return Array.isArray(relacion)
    ? relacion[0] ?? null
    : relacion;
}

function textoSeguro(valor: unknown): string {
  return String(valor ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Validar sesión administrativa.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const params = request.nextUrl.searchParams;
    const campamentoParam = params.get("campamento");
    const iglesiaParam = params.get("iglesia");

    const campamentoId = Number(campamentoParam);
    const iglesiaId = iglesiaParam
      ? Number(iglesiaParam)
      : null;

    // El campamento siempre es obligatorio.
    if (
      !campamentoParam ||
      !Number.isInteger(campamentoId) ||
      campamentoId <= 0
    ) {
      return NextResponse.json(
        { error: "Selecciona un campamento válido." },
        { status: 400 }
      );
    }

    // Si se envía una iglesia, debe ser válida.
    if (
      iglesiaParam &&
      (!Number.isInteger(iglesiaId) ||
        iglesiaId === null ||
        iglesiaId <= 0)
    ) {
      return NextResponse.json(
        { error: "Selecciona una iglesia válida." },
        { status: 400 }
      );
    }

    // Consultar el campamento seleccionado.
    const {
      data: campamento,
      error: campamentoError,
    } = await supabase
      .from("campamentos")
      .select("id, nombre")
      .eq("id", campamentoId)
      .maybeSingle();

    if (campamentoError) {
      console.error(
        "Error consultando campamento:",
        campamentoError
      );

      throw new Error("No se pudo consultar el campamento.");
    }

    if (!campamento) {
      return NextResponse.json(
        { error: "El campamento seleccionado no existe." },
        { status: 404 }
      );
    }

    const nombreCampamento = campamento.nombre;

    // Consultar la iglesia únicamente para la modalidad por iglesia.
    let nombreIglesia: string | null = null;

    if (iglesiaId !== null) {
      const {
        data: iglesia,
        error: iglesiaError,
      } = await supabase
        .from("iglesias")
        .select("id, nombre")
        .eq("id", iglesiaId)
        .maybeSingle();

      if (iglesiaError) {
        console.error(
          "Error consultando iglesia:",
          iglesiaError
        );

        throw new Error("No se pudo consultar la iglesia.");
      }

      if (!iglesia) {
        return NextResponse.json(
          { error: "La iglesia seleccionada no existe." },
          { status: 404 }
        );
      }

      nombreIglesia = iglesia.nombre;
    }

    // Consultar campistas y sus inscripciones.
    let query = supabase
      .from("campistas")
      .select(`
        id,
        codigo_campista,
        nombre,
        iglesia_id,
        iglesias (
          id,
          nombre
        ),
        inscripciones (
          campamento_id,
          estado
        )
      `)
      .order("nombre", { ascending: true });

    // En modalidad por iglesia, filtrar también por iglesia.
    if (iglesiaId !== null) {
      query = query.eq("iglesia_id", iglesiaId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Error consultando asistencia:",
        error
      );

      throw new Error(
        "No se pudo consultar la lista de campistas."
      );
    }

    // Incluir solamente campistas con inscripción en el
    // campamento seleccionado que NO esté cancelada.
    const campistas = (
      (data ?? []) as unknown as Campista[]
    )
      .filter((campista) => {
        const inscripciones = campista.inscripciones ?? [];

        return inscripciones.some(
          (inscripcion) =>
            Number(inscripcion.campamento_id) === campamentoId &&
            inscripcion.estado !== "CANCELADO"
        );
      })
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es")
      );

    const listaGeneral = iglesiaId === null;

    // Crear PDF tamaño carta vertical.
    const pdf = await PDFDocument.create();

    const font = await pdf.embedFont(
      StandardFonts.Helvetica
    );

    const fontBold = await pdf.embedFont(
      StandardFonts.HelveticaBold
    );

    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 36;
    const tableWidth = pageWidth - margin * 2;

    const colorTexto = rgb(0.12, 0.16, 0.20);
    const colorGris = rgb(0.91, 0.93, 0.94);
    const colorBorde = rgb(0.72, 0.75, 0.78);

    const rowHeight = 29;
    const headerHeight = 30;

    // Las columnas cambian según la modalidad.
    // Lista por iglesia: N.º, código, nombre, presente, ausente.
    // Lista general: N.º, código, nombre, iglesia, presente, ausente.
    const widths = listaGeneral
      ? [28, 76, 180, 110, 70, 76]
      : [30, 94, 250, 72, 94];

    // Los anchos suman 540 puntos, igual que tableWidth (612 - 36 - 36).
    const headers = listaGeneral
      ? [
          "N.º",
          "Código",
          "Nombre completo",
          "Iglesia",
          "Presente",
          "Ausente",
        ]
      : [
          "N.º",
          "Código",
          "Nombre completo",
          "Presente",
          "Ausente",
        ];

    let page = pdf.addPage([
      pageWidth,
      pageHeight,
    ]);

    let y = pageHeight - margin;

    function dibujarEncabezado() {
      page.drawText("BANCO REMANENTE", {
        x: margin,
        y,
        size: 16,
        font: fontBold,
        color: colorTexto,
      });

      y -= 23;

      page.drawText(
        listaGeneral
          ? "LISTA GENERAL DE ASISTENCIA"
          : "LISTA DE ASISTENCIA",
        {
          x: margin,
          y,
          size: 12,
          font: fontBold,
          color: colorTexto,
        }
      );

      y -= 20;

      page.drawText(
        `Campamento: ${textoSeguro(nombreCampamento)}`,
        {
          x: margin,
          y,
          size: 9,
          font,
          color: colorTexto,
        }
      );

      y -= 15;

      if (!listaGeneral && nombreIglesia) {
        page.drawText(
          `Iglesia: ${textoSeguro(nombreIglesia)}`,
          {
            x: margin,
            y,
            size: 9,
            font,
            color: colorTexto,
          }
        );

        y -= 15;
      }

      y -= 9;
    }

    function dibujarTablaEncabezado() {
      const top = y;
      const bottom = top - headerHeight;

      page.drawRectangle({
        x: margin,
        y: bottom,
        width: tableWidth,
        height: headerHeight,
        color: colorGris,
        borderColor: colorBorde,
        borderWidth: 0.7,
      });

      let x = margin;

      headers.forEach((header, index) => {
        page.drawText(header, {
          x: x + 4,
          y: bottom + 10,
          size: 7.5,
          font: fontBold,
          color: colorTexto,
          maxWidth: widths[index] - 8,
        });

        x += widths[index];
      });

      y = bottom;
    }

    function dibujarFila(
      campista: Campista,
      numero: number
    ) {
      const bottom = y - rowHeight;

      page.drawRectangle({
        x: margin,
        y: bottom,
        width: tableWidth,
        height: rowHeight,
        borderColor: colorBorde,
        borderWidth: 0.5,
      });

      const iglesiaRelacion = obtenerRelacion(
        campista.iglesias
      );

      const valores = listaGeneral
        ? [
            String(numero),
            textoSeguro(campista.codigo_campista) || "—",
            textoSeguro(campista.nombre),
            textoSeguro(iglesiaRelacion?.nombre) || "—",
          ]
        : [
            String(numero),
            textoSeguro(campista.codigo_campista) || "—",
            textoSeguro(campista.nombre),
          ];

      let x = margin;

      // Dibujar cada texto en una sola línea y reducir
      // el tamaño de fuente cuando no quepa en su celda.
      valores.forEach((valor, index) => {
        const cellWidth = widths[index];
        const texto = textoSeguro(valor);
        const anchoDisponible = cellWidth - 8;

        let fontSize = 7.5;

        while (
          fontSize > 5.5 &&
          font.widthOfTextAtSize(texto, fontSize) >
            anchoDisponible
        ) {
          fontSize -= 0.25;
        }

        // Si aún es demasiado largo, recortar hasta que quepa.
        let textoVisible = texto;
        while (
          textoVisible.length > 1 &&
          font.widthOfTextAtSize(textoVisible, fontSize) >
            anchoDisponible
        ) {
          textoVisible = `${textoVisible.slice(0, -2)}…`;
        }

        page.drawText(textoVisible, {
          x: x + 4,
          y: bottom + 10,
          size: fontSize,
          font,
          color: colorTexto,
        });

        x += cellWidth;
      });

      // Dibujar casillas vacías centradas en sus celdas.
      const primeraColumnaCasilla = listaGeneral ? 4 : 3;

      // Al terminar las columnas de texto, x apunta al inicio
      // de la primera columna de casillas.
      for (
        let index = primeraColumnaCasilla;
        index < widths.length;
        index++
      ) {
        const checkboxSize = 10;
        const cellWidth = widths[index];

        const checkboxX =
          x + (cellWidth - checkboxSize) / 2;

        page.drawRectangle({
          x: checkboxX,
          y: bottom + (rowHeight - checkboxSize) / 2,
          width: checkboxSize,
          height: checkboxSize,
          borderColor: colorTexto,
          borderWidth: 0.9,
        });

        x += cellWidth;
      }

      y = bottom;
    }

    dibujarEncabezado();
    dibujarTablaEncabezado();

    if (campistas.length === 0) {
      page.drawText(
        listaGeneral
          ? "No hay campistas con inscripciones no canceladas en este campamento."
          : "No hay campistas con inscripciones no canceladas para esta iglesia y campamento.",
        {
          x: margin,
          y: y - 22,
          size: 9,
          font,
          color: colorTexto,
          maxWidth: tableWidth,
        }
      );
    } else {
      for (let index = 0; index < campistas.length; index++) {
        // Crear otra página cuando no quede espacio para la fila.
        if (y - rowHeight < margin + 22) {
          page = pdf.addPage([
            pageWidth,
            pageHeight,
          ]);

          y = pageHeight - margin;

          dibujarEncabezado();
          dibujarTablaEncabezado();
        }

        dibujarFila(campistas[index], index + 1);
      }
    }

    // Numerar todas las páginas.
    const pages = pdf.getPages();

    pages.forEach((pagina, index) => {
      pagina.drawText(
        `Página ${index + 1} de ${pages.length}`,
        {
          x: pageWidth - margin - 80,
          y: 18,
          size: 8,
          font,
          color: colorTexto,
        }
      );
    });

    const bytes = await pdf.save();

    const nombreArchivo = listaGeneral
      ? `asistencia-general-${campamentoId}.pdf`
      : `asistencia-${campamentoId}-${iglesiaId}.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `inline; filename="${nombreArchivo}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(
      "Error generando lista de asistencia:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo generar la lista de asistencia.",
      },
      { status: 500 }
    );
  }
}
