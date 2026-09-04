"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { APP_CONFIG } from "@/lib/config/app";

type Iglesia = {
  id: number;
  nombre: string;
};

type Campamento = {
  id: number;
  nombre: string;
  precio_inscripcion: number | string;
};

export default function NuevoCampistaPage() {
  // ============================================================
  // DATOS PERSONALES
  // ============================================================

  const [identidad, setIdentidad] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [iglesiaId, setIglesiaId] = useState("");
  const [genero, setGenero] = useState("");
  const [fechaNacimiento, setFechaNacimiento] =
    useState("");

  // ============================================================
  // CATÁLOGOS
  // ============================================================

  const [iglesias, setIglesias] = useState<Iglesia[]>(
    []
  );

  const [campamentos, setCampamentos] = useState<
    Campamento[]
  >([]);

  const [cargandoCatalogos, setCargandoCatalogos] =
    useState(true);

  // ============================================================
  // INSCRIPCIÓN OPCIONAL
  // ============================================================

  const [inscribirAhora, setInscribirAhora] =
    useState(false);

  const [campamentoId, setCampamentoId] =
    useState("");

  const [meta, setMeta] = useState("");

  // ============================================================
  // ESTADO FORMULARIO
  // ============================================================

  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // ============================================================
  // RESULTADO REGISTRO
  // ============================================================

  const [campistaId, setCampistaId] = useState<
    number | null
  >(null);

  const [pinGenerado, setPinGenerado] = useState("");

  const [codigoCampista, setCodigoCampista] =
    useState("");

  const [
    campistaRegistrado,
    setCampistaRegistrado,
  ] = useState("");

  /*
   * Guardamos también el teléfono utilizado al momento
   * del registro.
   *
   * Así la pantalla de éxito no depende del formulario.
   */
  const [
    telefonoRegistrado,
    setTelefonoRegistrado,
  ] = useState("");

  const [
    inscripcionRealizada,
    setInscripcionRealizada,
  ] = useState(false);

  const [
    inscripcionSolicitada,
    setInscripcionSolicitada,
  ] = useState(false);

  const [
    errorInscripcion,
    setErrorInscripcion,
  ] = useState("");

  const [
    campamentoRegistrado,
    setCampamentoRegistrado,
  ] = useState("");

  const [metaRegistrada, setMetaRegistrada] =
    useState(0);

  // ============================================================
  // CARGAR CATÁLOGOS
  // ============================================================

  useEffect(() => {
    async function cargarCatalogos() {
      const supabase = createClient();

      try {
        const [
          resultadoIglesias,
          resultadoCampamentos,
        ] = await Promise.all([
          supabase
            .from("iglesias")
            .select("id, nombre")
            .eq("estado", "ACTIVO")
            .order("nombre", {
              ascending: true,
            }),

          supabase
            .from("campamentos")
            .select(`
              id,
              nombre,
              precio_inscripcion
            `)
            .eq("estado", "ACTIVO")
            .order("fecha_registro", {
              ascending: false,
            }),
        ]);

        if (resultadoIglesias.error) {
          setError(
            "No se pudo cargar el catálogo de iglesias."
          );
        } else {
          setIglesias(
            resultadoIglesias.data || []
          );
        }

        if (resultadoCampamentos.error) {
          setError(
            "No se pudo cargar el catálogo de campamentos."
          );
        } else {
          setCampamentos(
            resultadoCampamentos.data || []
          );
        }
      } finally {
        setCargandoCatalogos(false);
      }
    }

    cargarCatalogos();
  }, []);

  // ============================================================
  // CAMBIAR CAMPAMENTO
  // ============================================================

  function cambiarCampamento(id: string) {
    setCampamentoId(id);

    const campamento = campamentos.find(
      (item) => item.id === Number(id)
    );

    if (campamento) {
      setMeta(
        String(campamento.precio_inscripcion)
      );
    } else {
      setMeta("");
    }
  }

  // ============================================================
  // CAMBIAR INSCRIPCIÓN OPCIONAL
  // ============================================================

  function cambiarInscribirAhora(
    valor: boolean
  ) {
    setInscribirAhora(valor);

    if (!valor) {
      setCampamentoId("");
      setMeta("");
    }
  }

  // ============================================================
  // ABRIR WHATSAPP
  // ============================================================

  function enviarPorWhatsApp() {
    if (!telefonoRegistrado) {
      return;
    }

    /*
     * Eliminamos guiones, espacios, paréntesis, etc.
     *
     * Ejemplo:
     * 9999-9999 -> 99999999
     */
    let numero =
      telefonoRegistrado.replace(/\D/g, "");

    /*
     * Para números hondureños de 8 dígitos
     * agregamos automáticamente +504.
     *
     * Si el número ya viene como 50499999999,
     * no agregamos nuevamente el código.
     */
    if (
      numero.length === 8 &&
      !numero.startsWith("504")
    ) {
      numero = `504${numero}`;
    }

    /*
     * Mensaje base con las credenciales.
     */
    let mensaje =
      `¡Hola ${campistaRegistrado}! 👋\n\n` +
      `Tu registro en ${APP_CONFIG.nombre} fue creado correctamente.\n\n` +
      `Estos son tus datos para consultar tu ahorro:\n\n` +
      `Código de campista: ${codigoCampista}\n` +
      `PIN de consulta: ${pinGenerado}\n`;

    /*
     * Si además quedó inscrito inmediatamente
     * al campamento, incluimos esa información.
     */
    if (inscripcionRealizada) {
      mensaje +=
        `\nCampamento: ${campamentoRegistrado}\n` +
        `Meta de ahorro: ${formatearMoneda(
          metaRegistrada
        )}\n`;
    }

    mensaje +=
      `\nGuarda tu código y PIN, ya que los necesitarás para consultar tu ahorro.\n\n` +
      `${APP_CONFIG.nombre}`;

    const url =
      `https://wa.me/${numero}` +
      `?text=${encodeURIComponent(mensaje)}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // ============================================================
  // GUARDAR CAMPISTA
  // ============================================================

  async function guardarCampista(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setErrorInscripcion("");

    // ----------------------------------------------------------
    // VALIDACIONES PERSONALES
    // ----------------------------------------------------------

    if (!nombre.trim()) {
      setError(
        "El nombre es obligatorio."
      );
      return;
    }

    if (!genero) {
      setError(
        "Selecciona el género."
      );
      return;
    }

    if (!fechaNacimiento) {
      setError(
        "Ingresa la fecha de nacimiento."
      );
      return;
    }

    if (
      new Date(
        `${fechaNacimiento}T00:00:00`
      ) > new Date()
    ) {
      setError(
        "La fecha de nacimiento no puede ser futura."
      );
      return;
    }

    // ----------------------------------------------------------
    // VALIDACIONES INSCRIPCIÓN
    // ----------------------------------------------------------

    if (inscribirAhora) {
      if (!campamentoId) {
        setError(
          "Selecciona el campamento al que deseas inscribir al campista."
        );
        return;
      }

      if (!meta || Number(meta) <= 0) {
        setError(
          "Ingresa una meta de ahorro válida."
        );
        return;
      }
    }

    setGuardando(true);

    /*
     * Variable local importante:
     *
     * React actualiza campistaId de forma asíncrona.
     * Esta variable nos permite saber inmediatamente
     * si el campista ya fue creado.
     */
    let campistaCreado = false;

    try {
      // ========================================================
      // 1. CREAR CAMPISTA
      // ========================================================

      const responseCampista = await fetch(
        "/api/campistas",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            identidad:
              identidad.trim(),

            nombre:
              nombre.trim(),

            telefono:
              telefono.trim(),

            iglesia_id:
              iglesiaId
                ? Number(iglesiaId)
                : null,

            genero,

            fecha_nacimiento:
              fechaNacimiento,
          }),
        }
      );

      const resultadoCampista =
        await responseCampista.json();

      if (!responseCampista.ok) {
        setError(
          resultadoCampista.error ||
            "No se pudo registrar el campista."
        );

        return;
      }

      campistaCreado = true;

      const nuevoCampistaId = Number(
        resultadoCampista.campista.id
      );

      const nuevoCodigo =
        resultadoCampista.codigo_campista ||
        resultadoCampista.campista
          .codigo_campista;

      const nuevoPin =
        resultadoCampista.pin;

      // ========================================================
      // GUARDAMOS LOS DATOS GENERADOS
      // ========================================================

      setCampistaId(
        nuevoCampistaId
      );

      setCampistaRegistrado(
        resultadoCampista.campista.nombre
      );

      setCodigoCampista(
        nuevoCodigo
      );

      setPinGenerado(
        nuevoPin
      );

      setTelefonoRegistrado(
        telefono.trim()
      );

      setInscripcionSolicitada(
        inscribirAhora
      );

      // ========================================================
      // 2. SI NO DESEA INSCRIPCIÓN, TERMINAMOS
      // ========================================================

      if (!inscribirAhora) {
        return;
      }

      // ========================================================
      // 3. INSCRIBIR AL CAMPAMENTO
      // ========================================================

      const campamentoSeleccionado =
        campamentos.find(
          (campamento) =>
            campamento.id ===
            Number(campamentoId)
        );

      const responseInscripcion =
        await fetch(
          "/api/inscripciones",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              campista_id:
                nuevoCampistaId,

              campamento_id:
                Number(campamentoId),

              meta:
                Number(meta),
            }),
          }
        );

      const resultadoInscripcion =
        await responseInscripcion.json();

      if (!responseInscripcion.ok) {
        setErrorInscripcion(
          resultadoInscripcion.error ||
            "El campista fue registrado, pero no se pudo completar la inscripción al campamento."
        );

        return;
      }

      setInscripcionRealizada(
        true
      );

      setCampamentoRegistrado(
        campamentoSeleccionado?.nombre ||
          "Campamento seleccionado"
      );

      setMetaRegistrada(
        Number(meta)
      );
    } catch {
      if (!campistaCreado) {
        setError(
          "No se pudo conectar con el servidor."
        );
      } else {
        setErrorInscripcion(
          "El campista fue registrado, pero ocurrió un problema al intentar inscribirlo."
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  // ============================================================
  // PANTALLA DE REGISTRO EXITOSO
  // ============================================================

  if (
    pinGenerado &&
    codigoCampista
  ) {
    const textoCredenciales =
      `Campista: ${campistaRegistrado}\n` +
      `Código de campista: ${codigoCampista}\n` +
      `PIN de consulta: ${pinGenerado}`;

    return (
      <div className="max-w-xl">
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          {/* CABECERA */}

          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Campista registrado
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Registro exitoso
          </h1>

          <p className="mt-3 text-slate-500">
            {campistaRegistrado} fue
            registrado correctamente.
          </p>

          {/* CREDENCIALES */}

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            {/* CÓDIGO */}

            <div className="bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-500">
                Código de campista
              </p>

              <p className="mt-3 text-3xl font-bold tracking-wide text-slate-900">
                {codigoCampista}
              </p>
            </div>

            {/* PIN */}

            <div className="border-t border-slate-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-slate-500">
                PIN de consulta
              </p>

              <p className="mt-3 text-4xl font-bold tracking-[0.20em] text-slate-900">
                {pinGenerado}
              </p>
            </div>
          </div>

          {/* INSCRIPCIÓN EXITOSA */}

          {inscripcionSolicitada &&
            inscripcionRealizada && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="font-semibold text-emerald-800">
                  Inscripción realizada
                </p>

                <div className="mt-3 space-y-2 text-sm text-emerald-700">
                  <div className="flex items-center justify-between gap-4">
                    <span>
                      Campamento
                    </span>

                    <span className="text-right font-semibold">
                      {
                        campamentoRegistrado
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span>
                      Meta de ahorro
                    </span>

                    <span className="font-semibold">
                      {formatearMoneda(
                        metaRegistrada
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* SIN INSCRIPCIÓN */}

          {!inscripcionSolicitada && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              El campista fue registrado
              sin inscripción a un
              campamento. Puedes
              inscribirlo posteriormente
              desde su perfil.
            </div>
          )}

          {/* ERROR SOLO EN INSCRIPCIÓN */}

          {errorInscripcion && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="font-semibold text-amber-800">
                Campista registrado,
                inscripción pendiente
              </p>

              <p className="mt-2 text-sm text-amber-700">
                {errorInscripcion}
              </p>

              <p className="mt-2 text-sm text-amber-700">
                No vuelvas a registrar
                al campista. Puedes
                completar la inscripción
                desde su perfil.
              </p>
            </div>
          )}

          {/* AVISO */}

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-700">
            Entrega el código de
            campista y el PIN. Estos
            datos se utilizarán para
            consultar su ahorro.
          </div>

          {/* BOTONES */}

          <div className="mt-6 space-y-3">
            {/* WHATSAPP */}

            {telefonoRegistrado ? (
              <button
                type="button"
                onClick={
                  enviarPorWhatsApp
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                <span
                  aria-hidden="true"
                  className="text-lg"
                >
                  💬
                </span>

                Enviar datos por WhatsApp
              </button>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
                No se registró un número
                de teléfono. Los datos no
                pueden enviarse por
                WhatsApp.
              </div>
            )}

            {/* COPIAR */}

            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(
                    textoCredenciales
                  )
                  .catch(() => {});
              }}
              className="w-full rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Copiar código y PIN
            </button>

            {/* PERFIL */}

            {campistaId && (
              <Link
                href={`/admin/campistas/${campistaId}`}
                className="block w-full rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Ver perfil del campista
              </Link>
            )}

            {/* FINALIZAR */}

            <Link
              href="/admin/campistas"
              className="block w-full rounded-xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Finalizar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // FORMULARIO
  // ============================================================

  return (
    <>
      {/* CABECERA */}

      <div className="mb-8">
        <Link
          href="/admin/campistas"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver a campistas
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Registrar campista
        </h1>

        <p className="mt-2 text-slate-500">
          Ingresa los datos personales
          y, si deseas, inscríbelo a un
          campamento de una vez.
        </p>
      </div>

      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <form
          onSubmit={guardarCampista}
          className="space-y-8"
        >
          {/* ================================================== */}
          {/* DATOS PERSONALES */}
          {/* ================================================== */}

          <section>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Datos del campista
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Información personal
                del nuevo campista.
              </p>
            </div>

            <div className="space-y-6">
              {/* IDENTIDAD */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Número de identidad
                </label>

                <input
                  type="text"
                  value={identidad}
                  onChange={(e) =>
                    setIdentidad(
                      e.target.value
                    )
                  }
                  placeholder="0801-2000-00000"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Opcional. Si todavía
                  no tiene identidad,
                  deja este campo vacío.
                </p>
              </div>

              {/* NOMBRE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Nombre completo *
                </label>

                <input
                  type="text"
                  value={nombre}
                  onChange={(e) =>
                    setNombre(
                      e.target.value
                    )
                  }
                  placeholder="Nombre completo"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* GENERO / FECHA */}

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Género *
                  </label>

                  <select
                    value={genero}
                    onChange={(e) =>
                      setGenero(
                        e.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">
                      Selecciona una
                      opción
                    </option>

                    <option value="MASCULINO">
                      Masculino
                    </option>

                    <option value="FEMENINO">
                      Femenino
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Fecha de nacimiento
                    *
                  </label>

                  <input
                    type="date"
                    value={
                      fechaNacimiento
                    }
                    onChange={(e) =>
                      setFechaNacimiento(
                        e.target.value
                      )
                    }
                    required
                    max={
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* TELEFONO / IGLESIA */}

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Teléfono
                  </label>

                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) =>
                      setTelefono(
                        e.target.value
                      )
                    }
                    placeholder="9999-9999"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Si registras un
                    teléfono podrás enviar
                    el código y PIN
                    directamente por
                    WhatsApp.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Iglesia
                  </label>

                  <select
                    value={iglesiaId}
                    onChange={(e) =>
                      setIglesiaId(
                        e.target.value
                      )
                    }
                    disabled={
                      cargandoCatalogos
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {cargandoCatalogos
                        ? "Cargando iglesias..."
                        : "Selecciona una iglesia"}
                    </option>

                    {iglesias.map(
                      (iglesia) => (
                        <option
                          key={iglesia.id}
                          value={iglesia.id}
                        >
                          {
                            iglesia.nombre
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ================================================== */}
          {/* INSCRIPCIÓN A CAMPAMENTO */}
          {/* ================================================== */}

          <section className="border-t border-slate-200 pt-8">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Inscripción a
                campamento
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Esta parte es opcional.
                Puedes inscribir al
                campista inmediatamente
                o hacerlo después desde
                su perfil.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30">
              <input
                type="checkbox"
                checked={
                  inscribirAhora
                }
                onChange={(e) =>
                  cambiarInscribirAhora(
                    e.target.checked
                  )
                }
                className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />

              <div>
                <p className="font-semibold text-slate-900">
                  Inscribir al
                  campista ahora
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Selecciona un
                  campamento y define
                  su meta de ahorro.
                </p>
              </div>
            </label>

            {inscribirAhora && (
              <div className="mt-6 space-y-6">
                {campamentos.length ===
                0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-800">
                      No hay campamentos
                      activos
                    </p>

                    <p className="mt-2 text-sm text-amber-700">
                      Puedes registrar
                      al campista sin
                      inscripción y
                      crear el
                      campamento
                      posteriormente.
                    </p>

                    <Link
                      href="/admin/campamentos/nuevo"
                      className="mt-3 inline-block text-sm font-semibold text-amber-800 underline"
                    >
                      Crear campamento
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* SELECT CAMPAMENTO */}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Campamento *
                      </label>

                      <select
                        value={
                          campamentoId
                        }
                        onChange={(e) =>
                          cambiarCampamento(
                            e.target.value
                          )
                        }
                        required={
                          inscribirAhora
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="">
                          Selecciona un
                          campamento
                        </option>

                        {campamentos.map(
                          (campamento) => (
                            <option
                              key={
                                campamento.id
                              }
                              value={
                                campamento.id
                              }
                            >
                              {
                                campamento.nombre
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* META */}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Meta de ahorro *
                      </label>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                          L
                        </span>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={meta}
                          onChange={(e) =>
                            setMeta(
                              e.target.value
                            )
                          }
                          required={
                            inscribirAhora
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Se llena
                        automáticamente
                        con el precio
                        del campamento,
                        pero puedes
                        modificarlo si
                        existe una beca
                        o descuento.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* ================================================== */}
          {/* INFORMACIÓN AUTOMÁTICA */}
          {/* ================================================== */}

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-700">
            Al registrar al campista,
            el sistema generará
            automáticamente su código
            único y un PIN de consulta
            de 6 dígitos.
          </div>

          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* BOTONES */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/admin/campistas"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={
                guardando ||
                cargandoCatalogos
              }
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando
                ? inscribirAhora
                  ? "Registrando e inscribiendo..."
                  : "Registrando..."
                : "Registrar campista"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ============================================================
// UTILIDADES
// ============================================================

function formatearMoneda(
  valor: number
) {
  return `L ${valor.toLocaleString(
    "es-HN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}