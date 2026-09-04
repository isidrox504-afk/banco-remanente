import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { createClient } from "@/lib/supabase/server";
import { APP_CONFIG } from "@/lib/config/app";

type EstadoPago =
  | "COMPLETO"
  | "PENDIENTE"
  | "SIN_INSCRIPCION";

function calcularEdad(
  fechaNacimiento: string | null
) {
  if (!fechaNacimiento) {
    return null;
  }

  const nacimiento = new Date(
    `${fechaNacimiento}T00:00:00`
  );

  const hoy = new Date();

  let edad =
    hoy.getFullYear() -
    nacimiento.getFullYear();

  const mes =
    hoy.getMonth() -
    nacimiento.getMonth();

  if (
    mes < 0 ||
    (mes === 0 &&
      hoy.getDate() <
        nacimiento.getDate())
  ) {
    edad--;
  }

  return edad;
}

function obtenerRelacion<T>(
  relacion: T | T[] | null
): T | null {
  if (!relacion) {
    return null;
  }

  if (Array.isArray(relacion)) {
    return relacion[0] || null;
  }

  return relacion;
}

function textoSeguro(
  texto: string | null | undefined
) {
  return texto?.trim() || "-";
}

/*
 * Evitamos caracteres problemáticos
 * con las fuentes estándar del PDF.
 */
function textoPdf(
  texto: string | null | undefined
) {
  return textoSeguro(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatearMoneda(
  valor: number
) {
  return `L ${Number(
    valor || 0
  ).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatearEstadoPago(
  estado: EstadoPago
) {
  if (estado === "COMPLETO") {
    return "PAGADO";
  }

  if (estado === "PENDIENTE") {
    return "PENDIENTE";
  }

  return "SIN INSCRIP.";
}

export async function GET(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    const searchParams =
      request.nextUrl.searchParams;

    const buscar =
      searchParams
        .get("buscar")
        ?.trim() || "";

    const genero =
      searchParams.get("genero") ||
      "";

    const iglesia =
      searchParams.get("iglesia") ||
      "";

    const estado =
      searchParams.get("estado") ||
      "";

    const estadoPago =
      searchParams.get(
        "estadoPago"
      ) || "";

    const edadMinTexto =
      searchParams.get("edadMin");

    const edadMaxTexto =
      searchParams.get("edadMax");

    const edadMin =
      edadMinTexto
        ? Number(edadMinTexto)
        : null;

    const edadMax =
      edadMaxTexto
        ? Number(edadMaxTexto)
        : null;

    /*
     * CONSULTA PRINCIPAL
     */
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
        ),
        inscripciones (
          id,
          meta,
          estado,
          fecha_inscripcion,
          campamento_id,
          campamentos (
            id,
            nombre
          ),
          aportes (
            id,
            monto,
            estado
          )
        )
      `)
      .order("nombre");

    /*
     * FILTROS DIRECTOS
     */
    if (genero) {
      query = query.eq(
        "genero",
        genero
      );
    }

    if (iglesia) {
      query = query.eq(
        "iglesia_id",
        Number(iglesia)
      );
    }

    if (estado) {
      query = query.eq(
        "estado",
        estado
      );
    }

    const { data, error } =
      await query;

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * PROCESAR INFORMACIÓN DE PAGO
     */
    let resultados = (
      data || []
    ).map((campista: any) => {
      const inscripciones =
        Array.isArray(
          campista.inscripciones
        )
          ? campista.inscripciones
          : [];

      const inscripcionesOrdenadas =
        [...inscripciones].sort(
          (a, b) => {
            const fechaA =
              new Date(
                a.fecha_inscripcion ||
                  0
              ).getTime();

            const fechaB =
              new Date(
                b.fecha_inscripcion ||
                  0
              ).getTime();

            return fechaB - fechaA;
          }
        );

      const inscripcionActual =
        inscripcionesOrdenadas.find(
          (inscripcion) =>
            inscripcion.estado !==
            "CANCELADO"
        ) || null;

      const edad =
        calcularEdad(
          campista.fecha_nacimiento
        );

      if (!inscripcionActual) {
        return {
          ...campista,
          edad,
          campamento: null,
          meta: 0,
          total_ahorrado: 0,
          falta_por_pagar: 0,
          estado_pago:
            "SIN_INSCRIPCION" as EstadoPago,
        };
      }

      const aportes =
        Array.isArray(
          inscripcionActual.aportes
        )
          ? inscripcionActual.aportes
          : [];

      const totalAhorrado =
        aportes
          .filter(
            (aporte: any) =>
              aporte.estado ===
              "ACTIVO"
          )
          .reduce(
            (
              total: number,
              aporte: any
            ) =>
              total +
              Number(
                aporte.monto || 0
              ),
            0
          );

      const meta = Number(
        inscripcionActual.meta ||
          0
      );

      const faltaPorPagar =
        Math.max(
          meta - totalAhorrado,
          0
        );

      const estadoPagoCalculado: EstadoPago =
        meta > 0 &&
        totalAhorrado >= meta
          ? "COMPLETO"
          : "PENDIENTE";

      const campamentoRelacion =
        obtenerRelacion(
          inscripcionActual.campamentos
        ) as {
          id: number;
          nombre: string;
        } | null;

      return {
        ...campista,
        edad,
        campamento:
          campamentoRelacion?.nombre ||
          null,
        meta,
        total_ahorrado:
          totalAhorrado,
        falta_por_pagar:
          faltaPorPagar,
        estado_pago:
          estadoPagoCalculado,
      };
    });

    /*
     * FILTRO NOMBRE / IDENTIDAD
     */
    if (buscar) {
      const valor =
        buscar.toLowerCase();

      resultados =
        resultados.filter(
          (campista) =>
            campista.nombre
              ?.toLowerCase()
              .includes(valor) ||
            campista.identidad
              ?.toLowerCase()
              .includes(valor)
        );
    }

    /*
     * EDADES
     */
    resultados =
      resultados.filter(
        (campista) => {
          if (
            edadMin !== null &&
            (
              campista.edad ===
                null ||
              campista.edad <
                edadMin
            )
          ) {
            return false;
          }

          if (
            edadMax !== null &&
            (
              campista.edad ===
                null ||
              campista.edad >
                edadMax
            )
          ) {
            return false;
          }

          return true;
        }
      );

    /*
     * ESTADO DE PAGO
     */
    if (estadoPago) {
      resultados =
        resultados.filter(
          (campista) =>
            campista.estado_pago ===
            estadoPago
        );
    }

    /*
     * RESUMEN
     */
    const total =
      resultados.length;

    const completos =
      resultados.filter(
        (campista) =>
          campista.estado_pago ===
          "COMPLETO"
      ).length;

    const pendientes =
      resultados.filter(
        (campista) =>
          campista.estado_pago ===
          "PENDIENTE"
      ).length;

    const sinInscripcion =
      resultados.filter(
        (campista) =>
          campista.estado_pago ===
          "SIN_INSCRIPCION"
      ).length;

    /*
     * NOMBRE DE IGLESIA PARA
     * MOSTRAR EN FILTROS DEL PDF
     */
    let nombreIglesiaFiltro =
      "";

    if (iglesia) {
      const {
        data: iglesiaData,
      } = await supabase
        .from("iglesias")
        .select("nombre")
        .eq(
          "id",
          Number(iglesia)
        )
        .maybeSingle();

      nombreIglesiaFiltro =
        iglesiaData?.nombre || "";
    }

    /*
     * CREAR PDF
     */
    const pdfDoc =
      await PDFDocument.create();

    const font =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

    const fontBold =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
      );

    /*
     * A4 HORIZONTAL
     */
    const pageWidth = 841.89;
    const pageHeight = 595.28;

    const margin = 35;

    const verde = rgb(
      0.02,
      0.45,
      0.32
    );

    const gris = rgb(
      0.35,
      0.39,
      0.45
    );

    const grisClaro = rgb(
      0.95,
      0.96,
      0.97
    );

    const negro = rgb(
      0.1,
      0.12,
      0.15
    );

    /*
     * COLUMNAS DEL PDF
     */
    const columnas = {
      identidad: {
        x: margin,
        ancho: 88,
      },

      nombre: {
        x: margin + 88,
        ancho: 125,
      },

      edad: {
        x: margin + 213,
        ancho: 32,
      },

      genero: {
        x: margin + 245,
        ancho: 58,
      },

      iglesia: {
        x: margin + 303,
        ancho: 90,
      },

      campamento: {
        x: margin + 393,
        ancho: 105,
      },

      estado: {
        x: margin + 498,
        ancho: 62,
      },

      estadoPago: {
        x: margin + 560,
        ancho: 70,
      },

      ahorrado: {
        x: margin + 630,
        ancho: 70,
      },

      falta: {
        x: margin + 700,
        ancho: 72,
      },
    };

    function cortarTexto(
      texto: string,
      maxCaracteres: number
    ) {
      if (
        texto.length <=
        maxCaracteres
      ) {
        return texto;
      }

      return `${texto.substring(
        0,
        maxCaracteres - 3
      )}...`;
    }

    function nuevaPagina(
      numeroPagina: number
    ) {
      const page =
        pdfDoc.addPage([
          pageWidth,
          pageHeight,
        ]);

      page.drawText(
        textoPdf(
          APP_CONFIG.organizacion.toUpperCase()
        ),
        {
          x: margin,
          y: pageHeight - 40,
          size: 10,
          font: fontBold,
          color: verde,
        }
      );

      page.drawText(
        textoPdf(
          APP_CONFIG.nombre.toUpperCase()
        ),
        {
          x: margin,
          y: pageHeight - 62,
          size: 20,
          font: fontBold,
          color: negro,
        }
      );

      page.drawText(
        "REPORTE DE CAMPISTAS",
        {
          x: margin,
          y: pageHeight - 82,
          size: 11,
          font: fontBold,
          color: gris,
        }
      );

      page.drawText(
        `Pagina ${numeroPagina}`,
        {
          x: pageWidth - 90,
          y: pageHeight - 40,
          size: 8,
          font,
          color: gris,
        }
      );

      return page;
    }

    let numeroPagina = 1;

    let page =
      nuevaPagina(
        numeroPagina
      );

    let y =
      pageHeight - 115;

    /*
     * FECHA
     */
    const fechaGeneracion =
      new Intl.DateTimeFormat(
        "es-HN",
        {
          dateStyle: "long",
          timeStyle: "short",
        }
      ).format(new Date());

    page.drawText(
      textoPdf(
        `Fecha de generacion: ${fechaGeneracion}`
      ),
      {
        x: margin,
        y,
        size: 9,
        font,
        color: gris,
      }
    );

    y -= 25;

    /*
     * FILTROS
     */
    page.drawText(
      "FILTROS APLICADOS",
      {
        x: margin,
        y,
        size: 10,
        font: fontBold,
        color: negro,
      }
    );

    y -= 17;

    const filtros: string[] =
      [];

    if (buscar) {
      filtros.push(
        `Busqueda: ${buscar}`
      );
    }

    if (genero) {
      filtros.push(
        `Genero: ${
          genero ===
          "MASCULINO"
            ? "Masculino"
            : "Femenino"
        }`
      );
    }

    if (
      nombreIglesiaFiltro
    ) {
      filtros.push(
        `Iglesia: ${nombreIglesiaFiltro}`
      );
    }

    if (estado) {
      filtros.push(
        `Estado campista: ${estado}`
      );
    }

    if (estadoPago) {
      let textoEstadoPago =
        estadoPago;

      if (
        estadoPago ===
        "COMPLETO"
      ) {
        textoEstadoPago =
          "Pagado completo";
      }

      if (
        estadoPago ===
        "PENDIENTE"
      ) {
        textoEstadoPago =
          "Pendiente";
      }

      if (
        estadoPago ===
        "SIN_INSCRIPCION"
      ) {
        textoEstadoPago =
          "Sin inscripcion";
      }

      filtros.push(
        `Estado pago: ${textoEstadoPago}`
      );
    }

    if (
      edadMin !== null ||
      edadMax !== null
    ) {
      let filtroEdad =
        "Edad: ";

      if (
        edadMin !== null &&
        edadMax !== null
      ) {
        filtroEdad +=
          `${edadMin} - ${edadMax}`;
      } else if (
        edadMin !== null
      ) {
        filtroEdad +=
          `Desde ${edadMin}`;
      } else if (
        edadMax !== null
      ) {
        filtroEdad +=
          `Hasta ${edadMax}`;
      }

      filtros.push(
        filtroEdad
      );
    }

    if (
      filtros.length === 0
    ) {
      filtros.push(
        "Todos los campistas"
      );
    }

    filtros.forEach(
      (filtro) => {
        page.drawText(
          textoPdf(filtro),
          {
            x: margin,
            y,
            size: 9,
            font,
            color: gris,
          }
        );

        y -= 14;
      }
    );

    y -= 5;

    /*
     * RESUMEN
     */
    page.drawRectangle({
      x: margin,
      y: y - 45,
      width:
        pageWidth -
        margin * 2,
      height: 45,
      color: grisClaro,
    });

    page.drawText(
      `Total: ${total}`,
      {
        x: margin + 15,
        y: y - 27,
        size: 9,
        font: fontBold,
        color: negro,
      }
    );

    page.drawText(
      `Completos: ${completos}`,
      {
        x: margin + 180,
        y: y - 27,
        size: 9,
        font: fontBold,
        color: negro,
      }
    );

    page.drawText(
      `Pendientes: ${pendientes}`,
      {
        x: margin + 355,
        y: y - 27,
        size: 9,
        font: fontBold,
        color: negro,
      }
    );

    page.drawText(
      `Sin inscripcion: ${sinInscripcion}`,
      {
        x: margin + 535,
        y: y - 27,
        size: 9,
        font: fontBold,
        color: negro,
      }
    );

    y -= 70;

    /*
     * ENCABEZADO TABLA
     */
    function dibujarEncabezadoTabla() {
      page.drawRectangle({
        x: margin,
        y: y - 22,
        width:
          pageWidth -
          margin * 2,
        height: 22,
        color: verde,
      });

      const configTexto = {
        y: y - 15,
        size: 6.2,
        font: fontBold,
        color: rgb(
          1,
          1,
          1
        ),
      };

      page.drawText(
        "IDENTIDAD",
        {
          x:
            columnas
              .identidad.x + 3,
          ...configTexto,
        }
      );

      page.drawText(
        "NOMBRE",
        {
          x:
            columnas
              .nombre.x + 3,
          ...configTexto,
        }
      );

      page.drawText(
        "EDAD",
        {
          x:
            columnas
              .edad.x + 3,
          ...configTexto,
        }
      );

      page.drawText(
        "GEN.",
        {
          x:
            columnas
              .genero.x + 3,
          ...configTexto,
        }
      );

      page.drawText(
        "IGLESIA",
        {
          x:
            columnas
              .iglesia.x + 3,
          ...configTexto,
        }
      );

      page.drawText(
        "CAMPAMENTO",
        {
          x:
            columnas
              .campamento.x +
            3,
          ...configTexto,
        }
      );

      page.drawText(
        "ESTADO",
        {
          x:
            columnas
              .estado.x + 3,
          ...configTexto,
        }
      );

      page.drawText(
        "PAGO",
        {
          x:
            columnas
              .estadoPago.x +
            3,
          ...configTexto,
        }
      );

      page.drawText(
        "AHORRADO",
        {
          x:
            columnas
              .ahorrado.x +
            3,
          ...configTexto,
        }
      );

      page.drawText(
        "FALTA",
        {
          x:
            columnas
              .falta.x + 3,
          ...configTexto,
        }
      );

      y -= 22;
    }

    dibujarEncabezadoTabla();

    /*
     * FILAS
     */
    resultados.forEach(
      (
        campista,
        index
      ) => {
        if (y < 55) {
          numeroPagina++;

          page =
            nuevaPagina(
              numeroPagina
            );

          y =
            pageHeight -
            105;

          dibujarEncabezadoTabla();
        }

        const iglesiaRelacion =
          obtenerRelacion(
            campista.iglesias
          ) as {
            id: number;
            nombre: string;
          } | null;

        if (
          index % 2 === 0
        ) {
          page.drawRectangle({
            x: margin,
            y: y - 21,
            width:
              pageWidth -
              margin * 2,
            height: 21,
            color: rgb(
              0.98,
              0.98,
              0.98
            ),
          });
        }

        const yTexto =
          y - 14;

        /*
         * IDENTIDAD
         */
        page.drawText(
          cortarTexto(
            textoPdf(
              campista.identidad
            ),
            14
          ),
          {
            x:
              columnas
                .identidad.x +
              3,
            y: yTexto,
            size: 6.5,
            font,
            color: negro,
          }
        );

        /*
         * NOMBRE
         */
        page.drawText(
          cortarTexto(
            textoPdf(
              campista.nombre
            ),
            21
          ),
          {
            x:
              columnas
                .nombre.x + 3,
            y: yTexto,
            size: 6.5,
            font,
            color: negro,
          }
        );

        /*
         * EDAD
         */
        page.drawText(
          campista.edad !==
            null
            ? String(
                campista.edad
              )
            : "-",
          {
            x:
              columnas.edad.x +
              3,
            y: yTexto,
            size: 6.5,
            font,
            color: negro,
          }
        );

        /*
         * GENERO
         */
        const generoTexto =
          campista.genero ===
          "MASCULINO"
            ? "M"
            : campista.genero ===
                "FEMENINO"
              ? "F"
              : "-";

        page.drawText(
          generoTexto,
          {
            x:
              columnas.genero.x +
              3,
            y: yTexto,
            size: 6.5,
            font,
            color: negro,
          }
        );

        /*
         * IGLESIA
         */
        page.drawText(
          cortarTexto(
            textoPdf(
              iglesiaRelacion
                ?.nombre
            ),
            15
          ),
          {
            x:
              columnas.iglesia.x +
              3,
            y: yTexto,
            size: 6.5,
            font,
            color: negro,
          }
        );

        /*
         * CAMPAMENTO
         */
        page.drawText(
          cortarTexto(
            textoPdf(
              campista.campamento
            ),
            17
          ),
          {
            x:
              columnas
                .campamento.x +
              3,
            y: yTexto,
            size: 6.5,
            font,
            color: negro,
          }
        );

        /*
         * ESTADO CAMPISTA
         */
        page.drawText(
          cortarTexto(
            textoPdf(
              campista.estado
            ),
            9
          ),
          {
            x:
              columnas.estado.x +
              3,
            y: yTexto,
            size: 6.5,
            font,
            color: negro,
          }
        );

        /*
         * ESTADO PAGO
         */
        page.drawText(
          formatearEstadoPago(
            campista.estado_pago
          ),
          {
            x:
              columnas
                .estadoPago.x +
              3,
            y: yTexto,
            size: 6,
            font: fontBold,
            color:
              campista.estado_pago ===
              "COMPLETO"
                ? verde
                : negro,
          }
        );

        /*
         * AHORRADO
         */
        const ahorradoTexto =
          campista.estado_pago ===
          "SIN_INSCRIPCION"
            ? "-"
            : formatearMoneda(
                campista.total_ahorrado
              );

        page.drawText(
          cortarTexto(
            ahorradoTexto,
            13
          ),
          {
            x:
              columnas
                .ahorrado.x +
              3,
            y: yTexto,
            size: 6.2,
            font,
            color: negro,
          }
        );

        /*
         * FALTA POR PAGAR
         */
        const faltaTexto =
          campista.estado_pago ===
          "SIN_INSCRIPCION"
            ? "-"
            : formatearMoneda(
                campista.falta_por_pagar
              );

        page.drawText(
          cortarTexto(
            faltaTexto,
            13
          ),
          {
            x:
              columnas.falta.x +
              3,
            y: yTexto,
            size: 6.2,
            font:
              campista.estado_pago ===
              "PENDIENTE"
                ? fontBold
                : font,
            color: negro,
          }
        );

        y -= 21;
      }
    );

    /*
     * SIN RESULTADOS
     */
    if (
      resultados.length === 0
    ) {
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

    /*
     * GUARDAR PDF
     */
    const pdfBytes =
      await pdfDoc.save();

    const fechaArchivo =
      new Date()
        .toISOString()
        .slice(0, 10);

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="reporte-campistas-${fechaArchivo}.pdf"`,
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
      {
        status: 500,
      }
    );
  }
}