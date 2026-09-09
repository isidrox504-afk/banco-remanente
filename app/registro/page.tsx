"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import { APP_CONFIG } from "@/lib/config/app";

type Iglesia = {
  id: number;
  nombre: string;
};

type Campamento = {
  id: number;
  nombre: string;
  precio_inscripcion:
    number | string;
};

export default function RegistroPage() {
  // ============================================================
  // DATOS PERSONALES
  // ============================================================

  const [
    identidad,
    setIdentidad,
  ] = useState("");

  const [
    nombre,
    setNombre,
  ] = useState("");

  const [
    telefono,
    setTelefono,
  ] = useState("");

  const [
    genero,
    setGenero,
  ] = useState("");

  const [
    fechaNacimiento,
    setFechaNacimiento,
  ] = useState("");

  const [
    iglesiaId,
    setIglesiaId,
  ] = useState("");

  const [
    campamentoId,
    setCampamentoId,
  ] = useState("");

  // ============================================================
  // CATÁLOGOS
  // ============================================================

  const [
    iglesias,
    setIglesias,
  ] = useState<Iglesia[]>(
    []
  );

  const [
    campamentos,
    setCampamentos,
  ] = useState<
    Campamento[]
  >([]);

  // ============================================================
  // ESTADOS
  // ============================================================

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  // ============================================================
  // RESULTADO
  // ============================================================

  const [
    codigoCampista,
    setCodigoCampista,
  ] = useState("");

  const [
    pinGenerado,
    setPinGenerado,
  ] = useState("");

  const [
    nombreRegistrado,
    setNombreRegistrado,
  ] = useState("");

  const [
    campamentoRegistrado,
    setCampamentoRegistrado,
  ] = useState("");

  const [
    metaRegistrada,
    setMetaRegistrada,
  ] = useState<
    number | null
  >(null);

  // ============================================================
  // COPIADO
  // ============================================================

  const [
    copiado,
    setCopiado,
  ] = useState(false);

  // ============================================================
  // CARGAR CATÁLOGOS
  // ============================================================

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const response =
          await fetch(
            "/api/registro",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.error ||
              "No se pudieron cargar los datos del registro."
          );

          return;
        }

        const iglesiasCargadas:
          Iglesia[] =
          data.iglesias ||
          [];

        const campamentosCargados:
          Campamento[] =
          data.campamentos ||
          [];

        setIglesias(
          iglesiasCargadas
        );

        setCampamentos(
          campamentosCargados
        );

        /*
         * Si solo existe un campamento activo,
         * lo seleccionamos automáticamente.
         */
        if (
          campamentosCargados.length ===
          1
        ) {
          setCampamentoId(
            String(
              campamentosCargados[0]
                .id
            )
          );
        }
      } catch {
        setError(
          "No se pudieron cargar los datos del registro."
        );
      } finally {
        setCargando(
          false
        );
      }
    }

    cargarCatalogos();
  }, []);

  // ============================================================
  // CAMPAMENTO SELECCIONADO
  // ============================================================

  const campamentoSeleccionado =
    campamentos.find(
      (campamento) =>
        campamento.id ===
        Number(
          campamentoId
        )
    );

  // ============================================================
  // REGISTRAR
  // ============================================================

  async function registrar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    // ----------------------------------------------------------
    // NOMBRE
    // ----------------------------------------------------------

    if (!nombre.trim()) {
      setError(
        "Ingresa tu nombre completo."
      );

      return;
    }

    // ----------------------------------------------------------
    // GÉNERO
    // ----------------------------------------------------------

    if (!genero) {
      setError(
        "Selecciona tu género."
      );

      return;
    }

    // ----------------------------------------------------------
    // FECHA NACIMIENTO
    // ----------------------------------------------------------

    if (
      !fechaNacimiento
    ) {
      setError(
        "Ingresa tu fecha de nacimiento."
      );

      return;
    }

    if (
      new Date(
        `${fechaNacimiento}T00:00:00`
      ) >
      new Date()
    ) {
      setError(
        "La fecha de nacimiento no puede ser futura."
      );

      return;
    }

    // ----------------------------------------------------------
    // CAMPAMENTO OBLIGATORIO
    // ----------------------------------------------------------

    if (
      !campamentoId
    ) {
      setError(
        "Selecciona el campamento al que deseas inscribirte."
      );

      return;
    }

    setGuardando(true);

    try {
      const response =
        await fetch(
          "/api/registro",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                identidad:
                  identidad.trim(),

                nombre:
                  nombre.trim(),

                telefono:
                  telefono.trim(),

                genero,

                fecha_nacimiento:
                  fechaNacimiento,

                iglesia_id:
                  iglesiaId
                    ? Number(
                        iglesiaId
                      )
                    : null,

                campamento_id:
                  Number(
                    campamentoId
                  ),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "No se pudo completar el registro."
        );

        return;
      }

      setNombreRegistrado(
        data.campista.nombre
      );

      setCodigoCampista(
        data.codigo_campista
      );

      setPinGenerado(
        data.pin
      );

      setCampamentoRegistrado(
        data.campamento ||
          campamentoSeleccionado
            ?.nombre ||
          ""
      );

      setMetaRegistrada(
        data.meta !==
          null &&
          data.meta !==
            undefined
          ? Number(
              data.meta
            )
          : campamentoSeleccionado
              ?.precio_inscripcion !==
            undefined
          ? Number(
              campamentoSeleccionado
                .precio_inscripcion
            )
          : null
      );
    } catch {
      setError(
        "No se pudo conectar con el servidor. Intenta nuevamente."
      );
    } finally {
      setGuardando(
        false
      );
    }
  }

  // ============================================================
  // COPIAR CREDENCIALES
  // ============================================================

  async function copiarCredenciales() {
    const texto =
      `Código de campista: ${codigoCampista}\n` +
      `PIN de consulta: ${pinGenerado}`;

    try {
      await navigator.clipboard.writeText(
        texto
      );

      setCopiado(true);

      setTimeout(() => {
        setCopiado(false);
      }, 2500);
    } catch {
      setCopiado(false);
    }
  }

  // ============================================================
  // REGISTRO EXITOSO
  // ============================================================

  if (
    codigoCampista &&
    pinGenerado
  ) {
    const urlConsulta =
      `/consulta?codigo=${encodeURIComponent(
        codigoCampista
      )}`;

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-emerald-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="text-center">
              <Image
                src={
                  APP_CONFIG.logo
                }
                alt={
                  APP_CONFIG.nombre
                }
                width={72}
                height={72}
                className="mx-auto rounded-2xl object-contain"
              />

              <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Registro completado
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                ¡Bienvenido!
              </h1>

              <p className="mt-3 text-slate-500">
                {
                  nombreRegistrado
                }
                , tu registro fue
                realizado
                correctamente.
              </p>
            </div>

            {/* CREDENCIALES */}

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <div className="bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Código de
                  campista
                </p>

                <p className="mt-3 text-3xl font-bold tracking-wide text-slate-900">
                  {
                    codigoCampista
                  }
                </p>
              </div>

              <div className="border-t border-slate-200 bg-white p-6 text-center">
                <p className="text-sm font-medium text-slate-500">
                  PIN de consulta
                </p>

                <p className="mt-3 text-4xl font-bold tracking-[0.20em] text-slate-900">
                  {
                    pinGenerado
                  }
                </p>
              </div>
            </div>

            {/* INSCRIPCIÓN */}

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-800">
                Inscripción al
                campamento realizada
              </p>

              <div className="mt-3 space-y-2 text-sm text-emerald-700">
                <div className="flex justify-between gap-4">
                  <span>
                    Campamento
                  </span>

                  <strong className="text-right">
                    {
                      campamentoRegistrado
                    }
                  </strong>
                </div>

                {metaRegistrada !==
                  null && (
                  <div className="flex justify-between gap-4">
                    <span>
                      Meta de ahorro
                    </span>

                    <strong>
                      {formatearMoneda(
                        metaRegistrada
                      )}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* AVISO */}

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Guarda tu código de
              campista y tu PIN.
              Necesitarás ambos para
              consultar tu ahorro.
            </div>

            {/* MENSAJE COPIADO */}

            {copiado && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                Código y PIN copiados
                exitosamente.
              </div>
            )}

            {/* BOTONES */}

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={
                  copiarCredenciales
                }
                className={`w-full rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                  copiado
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {copiado
                  ? "Código y PIN copiados"
                  : "Copiar código y PIN"}
              </button>

              <Link
                href={
                  urlConsulta
                }
                className="block w-full rounded-xl bg-emerald-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-emerald-700"
              >
                Consultar mi ahorro
              </Link>

              <Link
                href="/"
                className="block w-full rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ============================================================
  // FORMULARIO
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src={
                APP_CONFIG.logo
              }
              alt={
                APP_CONFIG.nombre
              }
              width={48}
              height={48}
              className="rounded-xl object-contain"
            />

            <div>
              <p className="font-bold text-slate-900">
                {
                  APP_CONFIG.nombre
                }
              </p>

              <p className="text-xs text-slate-500">
                {
                  APP_CONFIG.organizacion
                }
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Inicio
          </Link>
        </div>
      </header>

      {/* CONTENIDO */}

      <section className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
            {
              APP_CONFIG.nombreCorto
            }
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
            Registro de campista
          </h1>

          <p className="mt-4 text-slate-600">
            Completa tus datos para
            inscribirte al campamento
            y obtener tu código de
            campista y PIN de consulta.
          </p>
        </div>

        {/* FORMULARIO */}

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form
            onSubmit={
              registrar
            }
            className="space-y-7"
          >
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
                required
                placeholder="Tu nombre completo"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* IDENTIDAD */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Número de identidad
              </label>

              <input
                type="text"
                value={
                  identidad
                }
                onChange={(e) =>
                  setIdentidad(
                    e.target.value
                  )
                }
                placeholder="Opcional"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Si todavía no tienes
                identidad, puedes
                dejar este campo
                vacío.
              </p>
            </div>

            {/* GENERO / FECHA */}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Género *
                </label>

                <select
                  value={
                    genero
                  }
                  onChange={(e) =>
                    setGenero(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">
                    Selecciona
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
                  Fecha de nacimiento *
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
                  max={
                    new Date()
                      .toISOString()
                      .split(
                        "T"
                      )[0]
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* TELÉFONO */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Teléfono
              </label>

              <input
                type="tel"
                value={
                  telefono
                }
                onChange={(e) =>
                  setTelefono(
                    e.target.value
                  )
                }
                placeholder="9999-9999"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* IGLESIA */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Iglesia
              </label>

              <select
                value={
                  iglesiaId
                }
                onChange={(e) =>
                  setIglesiaId(
                    e.target.value
                  )
                }
                disabled={
                  cargando
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              >
                <option value="">
                  {cargando
                    ? "Cargando..."
                    : "Selecciona tu iglesia"}
                </option>

                {iglesias.map(
                  (iglesia) => (
                    <option
                      key={
                        iglesia.id
                      }
                      value={
                        iglesia.id
                      }
                    >
                      {
                        iglesia.nombre
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* CAMPAMENTO */}

            <div className="border-t border-slate-200 pt-7">
              <h2 className="text-lg font-bold text-slate-900">
                Campamento *
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Selecciona el
                campamento al que
                deseas inscribirte.
                Tu inscripción se
                realizará
                automáticamente.
              </p>

              {campamentos.length ===
              0 &&
              !cargando ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Actualmente no hay
                  campamentos activos
                  disponibles para
                  inscripción.
                </div>
              ) : (
                <select
                  value={
                    campamentoId
                  }
                  onChange={(e) =>
                    setCampamentoId(
                      e.target.value
                    )
                  }
                  disabled={
                    cargando
                  }
                  required
                  className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {cargando
                      ? "Cargando campamentos..."
                      : "Selecciona un campamento"}
                  </option>

                  {campamentos.map(
                    (
                      campamento
                    ) => (
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
                        }{" "}
                        -{" "}
                        {formatearMoneda(
                          Number(
                            campamento
                              .precio_inscripcion
                          )
                        )}
                      </option>
                    )
                  )}
                </select>
              )}

              {campamentoSeleccionado && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">
                    Campamento
                    seleccionado
                  </p>

                  <p className="mt-1 font-semibold text-emerald-900">
                    {
                      campamentoSeleccionado
                        .nombre
                    }
                  </p>

                  <div className="mt-3 flex justify-between border-t border-emerald-200 pt-3 text-sm text-emerald-800">
                    <span>
                      Meta de ahorro
                    </span>

                    <strong>
                      {formatearMoneda(
                        Number(
                          campamentoSeleccionado
                            .precio_inscripcion
                        )
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* INFORMACIÓN */}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
              Al completar tu
              registro quedarás
              inscrito
              automáticamente al
              campamento
              seleccionado. También
              recibirás tu código de
              campista y un PIN de 6
              dígitos para consultar
              tu ahorro.
            </div>

            {/* ERROR */}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {
                  error
                }
              </div>
            )}

            {/* BOTÓN */}

            <button
              type="submit"
              disabled={
                guardando ||
                cargando ||
                campamentos.length ===
                  0
              }
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando
                ? "Registrando e inscribiendo..."
                : "Completar registro"}
            </button>
          </form>
        </div>

        {/* PRIVACIDAD */}

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Tus datos serán utilizados
          únicamente para gestionar
          tu participación y ahorro
          dentro de{" "}
          {
            APP_CONFIG.nombre
          }.
        </p>
      </section>
    </main>
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