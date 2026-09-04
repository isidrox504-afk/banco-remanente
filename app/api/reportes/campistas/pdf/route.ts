import { NextRequest, NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

function calcularEdad(fechaNacimiento: string | null) {
  if (!fechaNacimiento) {
    return null;
  }

  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  const hoy = new Date();

  let edad = hoy.getFullYear() - nacimiento.getFullYear();

  const mes = hoy.getMonth() - nacimiento.getMonth();

  if (
    mes < 0 ||
    (mes === 0 && hoy.getDate() < nacimiento.getDate())
  ) {
    edad--;
  }

  return edad;
}

function textoSeguro(texto: string | null | undefined) {
  return texto?.trim() || "-";
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;

    const buscar = searchParams.get("buscar")?.trim() || "";
    const genero = searchParams.get("genero") || "";
    const iglesia = searchParams.get("iglesia") || "";
    const estado = searchParams.get("estado") || "";

    const edadMinTexto = searchParams.get("edadMin");
    const edadMaxTexto = searchParams.get("edadMax");

    const edadMin = edadMinTexto
      ? Number(edadMinTexto)
      : null;

    const edadMax = edadMaxTexto
      ? Number(edadMaxTexto)
      : null;

    let query = supabase
      .from("campistas")
      .select(`
        id,
        identidad,
        nombre,
        genero,
        fecha_nacimiento,
        estado,
        iglesia_id,
        iglesias (
          id,
          nombre
        )
      `)
      .order("nombre");

    if (genero) {
      query = query.eq("genero", genero);
    }

    if (iglesia) {
      query = query.eq("iglesia_id", Number(iglesia));
    }

    if (estado) {
      query = query.eq("estado", estado);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    let campistas = data || [];

    if (buscar) {
      const valor = buscar.toLowerCase();

      campistas = campistas.filter(
        (campista) =>
          campista.nombre?.toLowerCase().includes(valor) ||
          campista.identidad?.toLowerCase().includes(valor)
      );
    }

    const resultados = campistas
      .map((campista) => ({
        ...campista,
        edad: calcularEdad(campista.fecha_nacimiento),
      }))
      .filter((campista) => {
        if (
          edadMin !== null &&
          (campista.edad === null || campista.edad < edadMin)
        ) {
          return false;
        }

        if (
          edadMax !== null &&
          (campista.edad === null || campista.edad > edadMax)
        ) {
          return false;
        }

        return true;
      });

    const total = resultados.length;

    const hombres = resultados.filter(
      (campista) => campista.genero === "MASCULINO"
    ).length;

    const mujeres = resultados.filter(
      (campista) => campista.genero === "FEMENINO"
    ).length;

    const edades = resultados
      .map((campista) => campista.edad)
      .filter((edad): edad is number => edad !== null);

    const edadPromedio =
      edades.length > 0
        ? Math.round(
            edades.reduce(
              (acumulado, edad) => acumulado + edad,
              0
            ) / edades.length
          )
        : 0;

    let nombreIglesiaFiltro = "";

    if (iglesia) {
      const { data: iglesiaData } = await supabase
        .from("iglesias")
        .select("nombre")
        .eq("id", Number(iglesia))
        .maybeSingle();

      nombreIglesiaFiltro = iglesiaData?.nombre || "";
    }

    const pdfDoc = await PDFDocument.create();

    const font = await pdfDoc.embedFont(
      StandardFonts.Helvetica
    );

    const fontBold = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

    // A4 horizontal
    const pageWidth = 841.89;
    const pageHeight = 595.28;

    const margin = 35;

    const verde = rgb(0.02, 0.45, 0.32);
    const gris = rgb(0.35, 0.39, 0.45);
    const grisClaro = rgb(0.95, 0.96, 0.97);
    const negro = rgb(0.1, 0.12, 0.15);

    const columnas = {
      identidad: {
        x: margin,
        ancho: 115,
      },
      nombre: {
        x: margin + 115,
        ancho: 210,
      },
      edad: {
        x: margin + 325,
        ancho: 55,
      },
      genero: {
        x: margin + 380,
        ancho: 100,
      },
      iglesia: {
        x: margin + 480,
        ancho: 190,
      },
      estado: {
        x: margin + 670,
        ancho: 90,
      },
    };

    function cortarTexto(
      texto: string,
      maxCaracteres: number
    ) {
      if (texto.length <= maxCaracteres) {
        return texto;
      }

      return `${texto.substring(0, maxCaracteres - 3)}...`;
    }

    function nuevaPagina(numeroPagina: number) {
      const page = pdfDoc.addPage([
        pageWidth,
        pageHeight,
      ]);

      page.drawText("REMANENTE DE JEHOVA", {
        x: margin,
        y: pageHeight - 40,
        size: 10,
        font: fontBold,
        color: verde,
      });

      page.drawText("BANCO DE CAMPISTAS", {
        x: margin,
        y: pageHeight - 62,
        size: 20,
        font: fontBold,
        color: negro,
      });

      page.drawText("REPORTE DE CAMPISTAS", {
        x: margin,
        y: pageHeight - 82,
        size: 11,
        font: fontBold,
        color: gris,
      });

      page.drawText(`Pagina ${numeroPagina}`, {
        x: pageWidth - 90,
        y: pageHeight - 40,
        size: 8,
        font,
        color: gris,
      });

      return page;
    }

    let numeroPagina = 1;
    let page = nuevaPagina(numeroPagina);

    let y = pageHeight - 115;

    const fechaGeneracion = new Intl.DateTimeFormat(
      "es-HN",
      {
        dateStyle: "long",
        timeStyle: "short",
      }
    ).format(new Date());

    page.drawText(
      `Fecha de generacion: ${fechaGeneracion}`,
      {
        x: margin,
        y,
        size: 9,
        font,
        color: gris,
      }
    );

    y -= 25;

    page.drawText("FILTROS APLICADOS", {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: negro,
    });

    y -= 17;

    const filtros: string[] = [];

    if (buscar) {
      filtros.push(`Busqueda: ${buscar}`);
    }

    if (genero) {
      filtros.push(
        `Genero: ${
          genero === "MASCULINO"
            ? "Masculino"
            : "Femenino"
        }`
      );
    }

    if (nombreIglesiaFiltro) {
      filtros.push(
        `Iglesia: ${nombreIglesiaFiltro}`
      );
    }

    if (estado) {
      filtros.push(`Estado: ${estado}`);
    }

    if (
      edadMin !== null ||
      edadMax !== null
    ) {
      let filtroEdad = "Edad: ";

      if (
        edadMin !== null &&
        edadMax !== null
      ) {
        filtroEdad += `${edadMin} - ${edadMax}`;
      } else if (edadMin !== null) {
        filtroEdad += `Desde ${edadMin}`;
      } else if (edadMax !== null) {
        filtroEdad += `Hasta ${edadMax}`;
      }

      filtros.push(filtroEdad);
    }

    if (filtros.length === 0) {
      filtros.push("Todos los campistas");
    }

    filtros.forEach((filtro) => {
      page.drawText(filtro, {
        x: margin,
        y,
        size: 9,
        font,
        color: gris,
      });

      y -= 14;
    });

    y -= 5;

    page.drawRectangle({
      x: margin,
      y: y - 45,
      width: pageWidth - margin * 2,
      height: 45,
      color: grisClaro,
    });

    page.drawText(`Total: ${total}`, {
      x: margin + 15,
      y: y - 27,
      size: 10,
      font: fontBold,
      color: negro,
    });

    page.drawText(
      `Masculino: ${hombres}`,
      {
        x: margin + 170,
        y: y - 27,
        size: 10,
        font: fontBold,
        color: negro,
      }
    );

    page.drawText(
      `Femenino: ${mujeres}`,
      {
        x: margin + 335,
        y: y - 27,
        size: 10,
        font: fontBold,
        color: negro,
      }
    );

    page.drawText(
      `Edad promedio: ${edadPromedio}`,
      {
        x: margin + 500,
        y: y - 27,
        size: 10,
        font: fontBold,
        color: negro,
      }
    );

    y -= 70;

    function dibujarEncabezadoTabla() {
      page.drawRectangle({
        x: margin,
        y: y - 22,
        width: pageWidth - margin * 2,
        height: 22,
        color: verde,
      });

      const configTexto = {
        y: y - 15,
        size: 7,
        font: fontBold,
        color: rgb(1, 1, 1),
      };

      page.drawText("IDENTIDAD", {
        x: columnas.identidad.x + 4,
        ...configTexto,
      });

      page.drawText("NOMBRE", {
        x: columnas.nombre.x + 4,
        ...configTexto,
      });

      page.drawText("EDAD", {
        x: columnas.edad.x + 4,
        ...configTexto,
      });

      page.drawText("GENERO", {
        x: columnas.genero.x + 4,
        ...configTexto,
      });

      page.drawText("IGLESIA", {
        x: columnas.iglesia.x + 4,
        ...configTexto,
      });

      page.drawText("ESTADO", {
        x: columnas.estado.x + 4,
        ...configTexto,
      });

      y -= 22;
    }

    dibujarEncabezadoTabla();

    resultados.forEach((campista, index) => {
      if (y < 55) {
        numeroPagina++;

        page = nuevaPagina(numeroPagina);

        y = pageHeight - 105;

        dibujarEncabezadoTabla();
      }

      const iglesiaRelacion =
        Array.isArray(campista.iglesias)
          ? campista.iglesias[0]
          : campista.iglesias;

      if (index % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: y - 21,
          width: pageWidth - margin * 2,
          height: 21,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      const yTexto = y - 14;

      page.drawText(
        cortarTexto(
          textoSeguro(campista.identidad),
          18
        ),
        {
          x: columnas.identidad.x + 4,
          y: yTexto,
          size: 7.5,
          font,
          color: negro,
        }
      );

      page.drawText(
        cortarTexto(
          textoSeguro(campista.nombre),
          34
        ),
        {
          x: columnas.nombre.x + 4,
          y: yTexto,
          size: 7.5,
          font,
          color: negro,
        }
      );

      page.drawText(
        campista.edad !== null
          ? String(campista.edad)
          : "-",
        {
          x: columnas.edad.x + 4,
          y: yTexto,
          size: 7.5,
          font,
          color: negro,
        }
      );

      page.drawText(
        cortarTexto(
          textoSeguro(campista.genero),
          14
        ),
        {
          x: columnas.genero.x + 4,
          y: yTexto,
          size: 7.5,
          font,
          color: negro,
        }
      );

      page.drawText(
        cortarTexto(
          textoSeguro(
            iglesiaRelacion?.nombre
          ),
          28
        ),
        {
          x: columnas.iglesia.x + 4,
          y: yTexto,
          size: 7.5,
          font,
          color: negro,
        }
      );

      page.drawText(
        cortarTexto(
          textoSeguro(campista.estado),
          12
        ),
        {
          x: columnas.estado.x + 4,
          y: yTexto,
          size: 7.5,
          font,
          color: negro,
        }
      );

      y -= 21;
    });

    if (resultados.length === 0) {
      page.drawText(
        "No se encontraron campistas con los filtros seleccionados.",
        {
          x: margin,
          y: y - 25,
          size: 10,
          font,
          color: gris,
        }
      );
    }

    const pdfBytes = await pdfDoc.save();

    const fechaArchivo = new Date()
      .toISOString()
      .slice(0, 10);

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition": `attachment; filename="reporte-campistas-${fechaArchivo}.pdf"`,
        },
      }
    );
  } catch (error) {
    console.error(
      "Error generando reporte PDF:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrio un error al generar el reporte.",
      },
      { status: 500 }
    );
  }
}