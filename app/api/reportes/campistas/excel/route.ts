import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type EstadoPago =
  | "COMPLETO"
  | "PENDIENTE"
  | "SIN_INSCRIPCION";

type Relacion<T> = T | T[] | null;

function obtenerRelacion<T>(
  relacion: Relacion<T>
): T | null {
  if (!relacion) return null;

  if (Array.isArray(relacion)) {
    return relacion[0] || null;
  }

  return relacion as T;
}

function calcularEdad(
  fechaNacimiento: string | null
): number | null {
  if (!fechaNacimiento) return null;

  const nacimiento = new Date(
    `${fechaNacimiento}T00:00:00`
  );

  if (Number.isNaN(nacimiento.getTime())) {
    return null;
  }

  const hoy = new Date();

  let edad =
    hoy.getFullYear() - nacimiento.getFullYear();

  const mes =
    hoy.getMonth() - nacimiento.getMonth();

  if (
    mes < 0 ||
    (mes === 0 &&
      hoy.getDate() < nacimiento.getDate())
  ) {
    edad--;
  }

  return edad;
}

function obtenerInscripcionActual(
  inscripciones: any[]
) {
  const ordenadas = [...inscripciones].sort(
    (a, b) =>
      new Date(
        b.fecha_inscripcion || 0
      ).getTime() -
      new Date(
        a.fecha_inscripcion || 0
      ).getTime()
  );

  return (
    ordenadas.find(
      (inscripcion) =>
        inscripcion.estado !== "CANCELADO"
    ) || null
  );
}

function calcularFinanzas(inscripcion: any) {
  if (!inscripcion) {
    return {
      meta: 0,
      ahorrado: 0,
      pendiente: 0,
      estadoPago: "SIN_INSCRIPCION" as EstadoPago,
    };
  }

  const aportes = Array.isArray(inscripcion.aportes)
    ? inscripcion.aportes
    : [];

  const ahorrado = aportes
    .filter(
      (aporte: any) =>
        aporte.estado === "ACTIVO"
    )
    .reduce(
      (total: number, aporte: any) =>
        total + Number(aporte.monto || 0),
      0
    );

  const meta = Number(inscripcion.meta || 0);

  const pendiente = Math.max(
    meta - ahorrado,
    0
  );

  const estadoPago: EstadoPago =
    meta > 0 && ahorrado >= meta
      ? "COMPLETO"
      : "PENDIENTE";

  return {
    meta,
    ahorrado,
    pendiente,
    estadoPago,
  };
}

function formatearFecha(
  fecha: string | null
): string {
  if (!fecha) return "";

  return fecha;
}

function crearHoja(
  filas: Record<string, unknown>[]
) {
  return XLSX.utils.json_to_sheet(filas);
}

function ajustarColumnas(
  hoja: XLSX.WorkSheet,
  filas: Record<string, unknown>[]
) {
  const encabezados =
    XLSX.utils.sheet_to_json<string[]>(hoja, {
      header: 1,
    })[0] || [];

  hoja["!cols"] = encabezados.map(
    (encabezado, indice) => {
      const longitudMaxima = Math.max(
        String(encabezado).length,
        ...filas.map((fila) =>
          String(
            fila[String(encabezado)] ?? ""
          ).length
        )
      );

      return {
        wch: Math.min(
          Math.max(longitudMaxima + 2, 12),
          35
        ),
      };
    }
  );
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // ========================================================
    // VALIDAR SESIÓN ADMINISTRATIVA
    // ========================================================

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Debes iniciar sesión para exportar los reportes.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const alcance =
      searchParams.get("alcance") || "filtrados";

    if (
      alcance !== "todos" &&
      alcance !== "filtrados"
    ) {
      return NextResponse.json(
        { error: "El alcance de exportación no es válido." },
        { status: 400 }
      );
    }

    // ========================================================
    // FILTROS DEL REPORTE
    // ========================================================

    const buscar = (
      searchParams.get("buscar") || ""
    )
      .trim()
      .toLowerCase();

    const genero =
      searchParams.get("genero") || "";

    const iglesia =
      searchParams.get("iglesia") || "";

    const estado =
      searchParams.get("estado") || "";

    const estadoPago =
      searchParams.get("estadoPago") || "";

    const edadMinTexto =
      searchParams.get("edadMin") || "";

    const edadMaxTexto =
      searchParams.get("edadMax") || "";

    const edadMin =
      edadMinTexto !== ""
        ? Number(edadMinTexto)
        : null;

    const edadMax =
      edadMaxTexto !== ""
        ? Number(edadMaxTexto)
        : null;

    if (
      (edadMin !== null &&
        (!Number.isInteger(edadMin) ||
          edadMin < 0 ||
          edadMin > 120)) ||
      (edadMax !== null &&
        (!Number.isInteger(edadMax) ||
          edadMax < 0 ||
          edadMax > 120)) ||
      (edadMin !== null &&
        edadMax !== null &&
        edadMin > edadMax)
    ) {
      return NextResponse.json(
        { error: "Los filtros de edad no son válidos." },
        { status: 400 }
      );
    }

    if (
      iglesia &&
      (!Number.isInteger(Number(iglesia)) ||
        Number(iglesia) <= 0)
    ) {
      return NextResponse.json(
        { error: "El filtro de iglesia no es válido." },
        { status: 400 }
      );
    }

    // ========================================================
    // CONSULTAR TODOS LOS CAMPISTAS POR LOTES
    // ========================================================

    const todosLosCampistas: any[] = [];
    const tamanoLote = 500;
    let desde = 0;

    while (true) {
      let query = supabase
        .from("campistas")
        .select(`
          id,
          codigo_campista,
          identidad,
          nombre,
          telefono,
          genero,
          fecha_nacimiento,
          estado,
          fecha_registro,
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
              fecha_aporte,
              referencia,
              metodo_pago,
              banco_transferencia,
              observacion,
              estado,
              fecha_registro
            )
          )
        `)
        .order("nombre", { ascending: true })
        .range(
          desde,
          desde + tamanoLote - 1
        );

      // Los filtros de base de datos se aplican
      // solo cuando se exporta el reporte filtrado.

      if (alcance === "filtrados") {
        if (genero) {
          query = query.eq("genero", genero);
        }

        if (iglesia) {
          query = query.eq(
            "iglesia_id",
            Number(iglesia)
          );
        }

        if (estado) {
          query = query.eq("estado", estado);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error(
          "Error consultando campistas para Excel:",
          error
        );

        return NextResponse.json(
          {
            error:
              "No se pudieron consultar los campistas y sus aportaciones.",
          },
          { status: 500 }
        );
      }

      const lote = data || [];

      todosLosCampistas.push(...lote);

      if (lote.length < tamanoLote) {
        break;
      }

      desde += tamanoLote;
    }

    // ========================================================
    // PREPARAR CAMPISTAS Y APLICAR FILTROS
    // ========================================================

    const campistasProcesados = todosLosCampistas.map(
      (campista: any) => {
        const inscripciones = Array.isArray(
          campista.inscripciones
        )
          ? campista.inscripciones
          : [];

        const inscripcionActual =
          obtenerInscripcionActual(inscripciones);

        const edad = calcularEdad(
          campista.fecha_nacimiento
        );

        const finanzas = calcularFinanzas(
          inscripcionActual
        );

        const iglesiaRelacion = obtenerRelacion(
          campista.iglesias
        ) as {
          id: number;
          nombre: string;
        } | null;

        const campamentoRelacion = inscripcionActual
          ? (obtenerRelacion(
              inscripcionActual.campamentos
            ) as {
              id: number;
              nombre: string;
            } | null)
          : null;

        return {
          ...campista,
          edad,
          iglesiaNombre:
            iglesiaRelacion?.nombre || "",
          inscripcionActual,
          campamentoNombre:
            campamentoRelacion?.nombre || "",
          ...finanzas,
        };
      }
    );

    let campistasExportar = campistasProcesados;

    if (alcance === "filtrados") {
      if (buscar) {
        campistasExportar = campistasExportar.filter(
          (campista) =>
            String(campista.nombre || "")
              .toLowerCase()
              .includes(buscar) ||
            String(campista.identidad || "")
              .toLowerCase()
              .includes(buscar)
        );
      }

      if (edadMin !== null) {
        campistasExportar = campistasExportar.filter(
          (campista) =>
            campista.edad !== null &&
            campista.edad >= edadMin
        );
      }

      if (edadMax !== null) {
        campistasExportar = campistasExportar.filter(
          (campista) =>
            campista.edad !== null &&
            campista.edad <= edadMax
        );
      }

      if (estadoPago) {
        campistasExportar = campistasExportar.filter(
          (campista) =>
            campista.estadoPago === estadoPago
        );
      }
    }

    // ========================================================
    // HOJA 1: CAMPISTAS
    // ========================================================

    const filasCampistas = campistasExportar.map(
      (campista) => ({
        "ID interno": campista.id,
        "Código de campista":
          campista.codigo_campista || "",
        "Nombre completo": campista.nombre || "",
        Identidad: campista.identidad || "",
        Teléfono: campista.telefono || "",
        Iglesia: campista.iglesiaNombre,
        Género: campista.genero || "",
        "Fecha de nacimiento": formatearFecha(
          campista.fecha_nacimiento
        ),
        Edad: campista.edad ?? "",
        Estado: campista.estado || "",
        "Fecha de registro": formatearFecha(
          campista.fecha_registro
        ),
      })
    );

    // ========================================================
    // HOJA 2: INSCRIPCIONES
    // ========================================================

    const filasInscripciones: Record<
      string,
      unknown
    >[] = [];

    for (const campista of campistasExportar) {
      const inscripciones = Array.isArray(
        campista.inscripciones
      )
        ? campista.inscripciones
        : [];

      for (const inscripcion of inscripciones) {
        const campamento = obtenerRelacion(
          inscripcion.campamentos
        ) as {
          id: number;
          nombre: string;
        } | null;

        const finanzas =
          calcularFinanzas(inscripcion);

        filasInscripciones.push({
          "ID inscripción": inscripcion.id,
          "Código de campista":
            campista.codigo_campista || "",
          Campista: campista.nombre || "",
          Iglesia: campista.iglesiaNombre,
          Campamento: campamento?.nombre || "",
          "Fecha de inscripción":
            formatearFecha(
              inscripcion.fecha_inscripcion
            ),
          Meta: Number(inscripcion.meta || 0),
          "Total ahorrado": finanzas.ahorrado,
          "Falta por pagar": finanzas.pendiente,
          "Estado de pago": finanzas.estadoPago,
          "Estado de inscripción":
            inscripcion.estado || "",
        });
      }
    }

    // ========================================================
    // HOJA 3: APORTACIONES
    // ========================================================

    const filasAportes: Record<
      string,
      unknown
    >[] = [];

    for (const campista of campistasExportar) {
      const inscripciones = Array.isArray(
        campista.inscripciones
      )
        ? campista.inscripciones
        : [];

      for (const inscripcion of inscripciones) {
        const campamento = obtenerRelacion(
          inscripcion.campamentos
        ) as {
          id: number;
          nombre: string;
        } | null;

        const aportes = Array.isArray(
          inscripcion.aportes
        )
          ? inscripcion.aportes
          : [];

        for (const aporte of aportes) {
          filasAportes.push({
            "ID aporte": aporte.id,
            "Código de campista":
              campista.codigo_campista || "",
            Campista: campista.nombre || "",
            Iglesia: campista.iglesiaNombre,
            Campamento: campamento?.nombre || "",
            "ID inscripción": inscripcion.id,
            "Fecha del aporte": formatearFecha(
              aporte.fecha_aporte
            ),
            Monto: Number(aporte.monto || 0),
            "Método de pago":
              aporte.metodo_pago || "",
            Banco: aporte.banco_transferencia || "",
            Referencia: aporte.referencia || "",
            Observación: aporte.observacion || "",
            Estado: aporte.estado || "",
            "Fecha de registro": formatearFecha(
              aporte.fecha_registro
            ),
          });
        }
      }
    }

    // ========================================================
    // HOJA 4: RESUMEN
    // ========================================================

    const totalAportado = filasAportes.reduce(
      (total, aporte) => {
        // Solo los aportes activos cuentan para ahorro.
        if (aporte.Estado !== "ACTIVO") {
          return total;
        }

        return total + Number(aporte.Monto || 0);
      },
      0
    );

    const filasResumen = [
      {
        Indicador: "Fecha de generación",
        Valor: new Date().toLocaleString("es-HN"),
      },
      {
        Indicador: "Tipo de exportación",
        Valor:
          alcance === "todos"
            ? "Todos los campistas"
            : "Campistas filtrados",
      },
      {
        Indicador: "Cantidad de campistas",
        Valor: campistasExportar.length,
      },
      {
        Indicador: "Cantidad de inscripciones",
        Valor: filasInscripciones.length,
      },
      {
        Indicador: "Cantidad de aportaciones",
        Valor: filasAportes.length,
      },
      {
        Indicador: "Total de aportaciones activas",
        Valor: totalAportado,
      },
    ];

    // ========================================================
    // GENERAR LIBRO EXCEL
    // ========================================================

    const libro = XLSX.utils.book_new();

    const hojaResumen = crearHoja(filasResumen);
    const hojaCampistas = crearHoja(filasCampistas);
    const hojaInscripciones = crearHoja(
      filasInscripciones
    );
    const hojaAportes = crearHoja(filasAportes);

    ajustarColumnas(hojaResumen, filasResumen);
    ajustarColumnas(hojaCampistas, filasCampistas);
    ajustarColumnas(hojaInscripciones, filasInscripciones);
    ajustarColumnas(hojaAportes, filasAportes);

    XLSX.utils.book_append_sheet(
      libro,
      hojaResumen,
      "Resumen"
    );

    XLSX.utils.book_append_sheet(
      libro,
      hojaCampistas,
      "Campistas"
    );

    XLSX.utils.book_append_sheet(
      libro,
      hojaInscripciones,
      "Inscripciones"
    );

    XLSX.utils.book_append_sheet(
      libro,
      hojaAportes,
      "Aportaciones"
    );

    const contenido = XLSX.write(libro, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fecha = new Date()
      .toISOString()
      .slice(0, 10);

    const nombreArchivo =
      `banco-remanente-${alcance}-${fecha}.xlsx`;

    return new NextResponse(contenido, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename="${nombreArchivo}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Error generando Excel de campistas:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al generar el archivo Excel.",
      },
      { status: 500 }
    );
  }
}