"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import Image from "next/image";

import { APP_CONFIG } from "@/lib/config/app";

type Aporte = {
  id: number;
  monto: number | string;
  fecha_aporte: string;
  metodo_pago: string | null;
  referencia: string | null;
};

type ResultadoConsulta = {
  campista: {
    nombre: string;
    codigo_campista: string;
  };

  inscripcion: {
    id: number;
    meta: number;
    estado: string;

    campamento: {
      nombre: string;
      fecha_inicio: string | null;
      fecha_limite_pago: string | null;
    } | null;

    total_ahorrado: number;
    pendiente: number;
    porcentaje: number;
  } | null;

  aportes: Aporte[];
};

export default function ConsultaPage() {
  const [
    codigoCampista,
    setCodigoCampista,
  ] = useState("");

  const [pin, setPin] =
    useState("");

  const [
    resultado,
    setResultado,
  ] =
    useState<ResultadoConsulta | null>(
      null
    );

  const [error, setError] =
    useState("");

  const [
    consultando,
    setConsultando,
  ] = useState(false);

  const [
    actualizando,
    setActualizando,
  ] = useState(false);

  const [
    ultimaActualizacion,
    setUltimaActualizacion,
  ] = useState<Date | null>(
    null
  );

  const [
    mensajeActualizacion,
    setMensajeActualizacion,
  ] = useState("");

  // ============================================================
  // CONSULTAR
  // ============================================================

  async function consultarAhorro(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setResultado(null);
    setMensajeActualizacion("");

    const codigoLimpio =
      codigoCampista
        .trim()
        .toUpperCase();

    const pinLimpio =
      pin.trim();

    if (!codigoLimpio) {
      setError(
        "Ingresa tu código de campista."
      );

      return;
    }

    if (!pinLimpio) {
      setError(
        "Ingresa tu PIN de consulta."
      );

      return;
    }

    if (
      !/^\d{6}$/.test(
        pinLimpio
      )
    ) {
      setError(
        "El PIN de consulta debe contener 6 dígitos."
      );

      return;
    }

    setConsultando(true);

    try {
      const response =
        await fetch(
          "/api/consulta",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                codigo_campista:
                  codigoLimpio,

                pin:
                  pinLimpio,
              }),

            cache: "no-store",
          }
        );

      let data;

      try {
        data =
          await response.json();
      } catch {
        setError(
          "El servidor devolvió una respuesta no válida."
        );

        return;
      }

      if (!response.ok) {
        if (
          response.status ===
          401
        ) {
          setError(
            "El código de campista o el PIN son incorrectos."
          );
        } else if (
          response.status ===
          403
        ) {
          setError(
            data.error ||
              "Este campista no se encuentra habilitado para consultar."
          );
        } else if (
          response.status ===
          404
        ) {
          setError(
            "No encontramos un campista con los datos ingresados."
          );
        } else {
          setError(
            data.error ||
              "No se pudo realizar la consulta."
          );
        }

        return;
      }

      if (!data?.campista) {
        setError(
          "No encontramos información para los datos ingresados."
        );

        return;
      }

      setResultado(data);

      setUltimaActualizacion(
        new Date()
      );
    } catch (error) {
      console.error(
        "Error consultando ahorro:",
        error
      );

      setError(
        "No se pudo conectar con el servidor. Intenta nuevamente."
      );
    } finally {
      setConsultando(false);
    }
  }

  // ============================================================
  // ACTUALIZAR SALDO
  // ============================================================

  async function actualizarSaldo() {
    if (
      !codigoCampista.trim() ||
      !pin.trim()
    ) {
      setError(
        "No se pudo actualizar. Realiza una nueva consulta."
      );

      return;
    }

    setActualizando(true);
    setError("");
    setMensajeActualizacion(
      ""
    );

    try {
      const aportesAnteriores =
        resultado?.aportes
          .length || 0;

      const ahorroAnterior =
        resultado
          ?.inscripcion
          ?.total_ahorrado ||
        0;

      const response =
        await fetch(
          "/api/consulta",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                codigo_campista:
                  codigoCampista
                    .trim()
                    .toUpperCase(),

                pin:
                  pin.trim(),
              }),

            cache: "no-store",
          }
        );

      let data;

      try {
        data =
          await response.json();
      } catch {
        setError(
          "El servidor devolvió una respuesta no válida."
        );

        return;
      }

      if (!response.ok) {
        setError(
          data.error ||
            "No se pudo actualizar el saldo."
        );

        return;
      }

      const aportesNuevos =
        data.aportes.length -
        aportesAnteriores;

      const ahorroNuevo =
        data.inscripcion
          ?.total_ahorrado ||
        0;

      const diferencia =
        ahorroNuevo -
        ahorroAnterior;

      setResultado(data);

      setUltimaActualizacion(
        new Date()
      );

      if (
        aportesNuevos > 0 &&
        diferencia > 0
      ) {
        setMensajeActualizacion(
          `¡Nuevo aporte registrado! Tu ahorro aumentó ${formatearMoneda(
            diferencia
          )}.`
        );
      } else {
        setMensajeActualizacion(
          "Tu información está actualizada."
        );
      }
    } catch {
      setError(
        "No se pudo conectar con el servidor para actualizar."
      );
    } finally {
      setActualizando(false);
    }
  }

  // ============================================================
  // NUEVA CONSULTA
  // ============================================================

  function nuevaConsulta() {
    setResultado(null);
    setCodigoCampista("");
    setPin("");
    setError("");
    setMensajeActualizacion(
      ""
    );
    setUltimaActualizacion(
      null
    );
  }

  // ============================================================
  // RESULTADO
  // ============================================================

  if (resultado) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          {/* CABECERA */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <Image
                src={
                  APP_CONFIG.logo
                }
                alt={
                  APP_CONFIG.nombre
                }
                width={72}
                height={72}
                className="rounded-2xl object-contain"
              />
            </div>

            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              {
                APP_CONFIG.nombre
              }
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Hola,{" "}
              {
                resultado
                  .campista
                  .nombre
              }
            </h1>

            <p className="mt-2 text-slate-500">
              Este es el estado
              actual de tu ahorro.
            </p>

            <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2">
              <span className="text-xs text-slate-500">
                Código:{" "}
                <strong className="font-semibold text-slate-700">
                  {
                    resultado
                      .campista
                      .codigo_campista
                  }
                </strong>
              </span>
            </div>
          </div>

          {/* ACTUALIZACIÓN */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Estado de la
                  consulta
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {ultimaActualizacion
                    ? `Última actualización: ${formatearHora(
                        ultimaActualizacion
                      )}`
                    : "Información consultada"}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  actualizarSaldo
                }
                disabled={
                  actualizando
                }
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actualizando
                  ? "Actualizando..."
                  : "Actualizar saldo"}
              </button>
            </div>

            {mensajeActualizacion && (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {
                  mensajeActualizacion
                }
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* SIN INSCRIPCIÓN */}
          {!resultado.inscripcion ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-amber-900">
                No tienes una
                inscripción activa
              </h2>

              <p className="mt-3 text-sm leading-6 text-amber-700">
                Tu código y PIN son
                correctos, pero
                actualmente no tienes
                una inscripción
                asociada a un
                campamento.
              </p>
            </div>
          ) : (
            <>
              {/* AHORRO */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Campamento
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      {resultado
                        .inscripcion
                        .campamento
                        ?.nombre ||
                        "Campamento"}
                    </h2>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      resultado
                        .inscripcion
                        .estado ===
                      "COMPLETO"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {
                      resultado
                        .inscripcion
                        .estado
                    }
                  </span>
                </div>

                {/* RESUMEN */}
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <Resumen
                    titulo="Meta"
                    valor={formatearMoneda(
                      resultado
                        .inscripcion
                        .meta
                    )}
                  />

                  <Resumen
                    titulo="Ahorrado"
                    valor={formatearMoneda(
                      resultado
                        .inscripcion
                        .total_ahorrado
                    )}
                    destacado
                  />

                  <Resumen
                    titulo="Falta por pagar"
                    valor={formatearMoneda(
                      resultado
                        .inscripcion
                        .pendiente
                    )}
                  />
                </div>

                {/* PROGRESO */}
                <div className="mt-8">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-600">
                      Progreso de tu
                      ahorro
                    </p>

                    <p className="text-sm font-bold text-slate-900">
                      {
                        resultado
                          .inscripcion
                          .porcentaje
                      }
                      %
                    </p>
                  </div>

                  <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          resultado
                            .inscripcion
                            .porcentaje,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* FECHA LÍMITE */}
                {resultado
                  .inscripcion
                  .campamento
                  ?.fecha_limite_pago && (
                  <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Fecha límite de
                      pago
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatearFecha(
                        resultado
                          .inscripcion
                          .campamento
                          .fecha_limite_pago
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* APORTES */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900">
                  Historial de
                  aportes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Estos son los
                  aportes registrados
                  en tu ahorro.
                </p>

                {resultado.aportes
                  .length === 0 ? (
                  <div className="mt-6 rounded-xl bg-slate-50 px-6 py-10 text-center">
                    <p className="font-semibold text-slate-700">
                      Todavía no
                      tienes aportes
                      registrados
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Cuando se
                      registre tu
                      primer aporte
                      aparecerá aquí.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 divide-y divide-slate-100">
                    {resultado.aportes.map(
                      (
                        aporte
                      ) => (
                        <div
                          key={
                            aporte.id
                          }
                          className="flex items-center justify-between gap-4 py-4"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {formatearFecha(
                                aporte
                                  .fecha_aporte
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatearMetodo(
                                aporte
                                  .metodo_pago
                              )}

                              {aporte
                                .referencia
                                ? ` · ${aporte.referencia}`
                                : ""}
                            </p>
                          </div>

                          <p className="whitespace-nowrap text-lg font-bold text-emerald-700">
                            +{" "}
                            {formatearMoneda(
                              Number(
                                aporte.monto
                              )
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* NUEVA CONSULTA */}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={
                nuevaConsulta
              }
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Realizar otra
              consulta
            </button>
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
      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 py-16 sm:py-20">
        <div className="w-full max-w-xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-600">
            {
              APP_CONFIG.nombreCorto
            }
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Consulta tu ahorro
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Ingresa tu código de
            campista y tu PIN para
            consultar cuánto llevas
            ahorrado y cuánto te falta
            para alcanzar tu meta.
          </p>
        </div>

        {/* FORMULARIO */}
        <div className="mt-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form
            onSubmit={
              consultarAhorro
            }
            className="space-y-6"
            autoComplete="off"
          >
            {/* CAMPOS PARA EVITAR AUTOFILL */}
            <input
              type="text"
              name="fake-email"
              autoComplete="username"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            <input
              type="password"
              name="fake-password"
              autoComplete="current-password"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            {/* CÓDIGO CAMPISTA */}
            <div>
              <label
                htmlFor="codigo-campista"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Código de campista
              </label>

              <input
                id="codigo-campista"
                name="codigo-campista"
                type="text"
                value={
                  codigoCampista
                }
                onChange={(e) =>
                  setCodigoCampista(
                    e.target.value
                      .toUpperCase()
                  )
                }
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="CAM-000158"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold uppercase tracking-wide text-slate-900 placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                Ejemplo:
                CAM-000158
              </p>
            </div>

            {/* PIN */}
            <div>
              <label
                htmlFor="pin-consulta"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                PIN de consulta
              </label>

              <input
                id="pin-consulta"
                name="pin-consulta"
                type="text"
                value={pin}
                onChange={(e) => {
                  const soloNumeros =
                    e.target.value.replace(
                      /\D/g,
                      ""
                    );

                  setPin(
                    soloNumeros.slice(
                      0,
                      6
                    )
                  );
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoComplete="off"
                placeholder="000000"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-lg tracking-[0.25em] text-slate-900 placeholder:tracking-normal placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                Ingresa los 6 dígitos
                de tu PIN de consulta.
              </p>
            </div>

            {/* ERROR */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {/* BOTÓN */}
            <button
              type="submit"
              disabled={
                consultando
              }
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {consultando
                ? "Consultando..."
                : "Consultar mi ahorro"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            Utiliza el código y PIN
            que recibiste al momento
            de tu registro.
          </p>
        </div>
      </section>
    </main>
  );
}

// ============================================================
// COMPONENTE RESUMEN
// ============================================================

function Resumen({
  titulo,
  valor,
  destacado = false,
}: {
  titulo: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${
        destacado
          ? "border border-emerald-100 bg-emerald-50"
          : "bg-slate-50"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          destacado
            ? "text-emerald-600"
            : "text-slate-400"
        }`}
      >
        {titulo}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          destacado
            ? "text-emerald-700"
            : "text-slate-900"
        }`}
      >
        {valor}
      </p>
    </div>
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

function formatearFecha(
  fecha: string
) {
  return new Date(
    fecha
  ).toLocaleDateString(
    "es-HN"
  );
}

function formatearHora(
  fecha: Date
) {
  return fecha.toLocaleString(
    "es-HN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function formatearMetodo(
  metodo: string | null
) {
  if (!metodo) {
    return "Aporte";
  }

  const metodos: Record<
    string,
    string
  > = {
    EFECTIVO:
      "Efectivo",

    TRANSFERENCIA:
      "Transferencia",

    DEPOSITO:
      "Depósito",

    OTRO:
      "Otro",
  };

  return (
    metodos[metodo] ||
    metodo
  );
}