"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Inscripcion = {
  id: number;
  estado: string;
  meta: number;
  total_ahorrado: number;
  pendiente: number;
  campamento: string | null;
};

type Campista = {
  id: number;
  codigo_campista: string | null;
  identidad: string | null;
  nombre: string;
  telefono: string | null;
  genero: string | null;
  edad: number | null;
  estado: string;
  iglesia: string | null;
  inscripcion: Inscripcion | null;
};

const bancos = [
  "BAC",
  "FICOHSA",
  "ATLANTIDA",
  "OCCIDENTE",
  "ACH",
];

export default function AportesRapidos() {
  const [buscar, setBuscar] = useState("");
  const [campistas, setCampistas] = useState<Campista[]>([]);

  const [campistaSeleccionado, setCampistaSeleccionado] =
    useState<Campista | null>(null);

  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] =
    useState("EFECTIVO");

  const [
    bancoTransferencia,
    setBancoTransferencia,
  ] = useState("");

  const [referencia, setReferencia] = useState("");
  const [observacion, setObservacion] = useState("");

  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] =
    useState(false);

  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Controla la ventana de confirmación antes de guardar el aporte.
  const [confirmarAporte, setConfirmarAporte] = useState(false);

  // Guarda los datos que se mostrarán en la ventana de éxito.
  const [aporteExitoso, setAporteExitoso] = useState<{
    monto: number;
    campista: string;
  } | null>(null);

  /*
   * Guardamos la petición activa.
   *
   * Si el usuario sigue escribiendo,
   * cancelamos la consulta anterior.
   */
  const abortControllerRef =
    useRef<AbortController | null>(null);

  // ==========================================================
  // BÚSQUEDA CON DEBOUNCE
  // ==========================================================

  useEffect(() => {
    const texto = buscar.trim();

    /*
     * Si ya seleccionamos un campista,
     * no necesitamos volver a buscar
     * simplemente porque colocamos su nombre
     * en el input.
     */
    if (campistaSeleccionado) {
      return;
    }

    /*
     * Cancelamos cualquier petición anterior.
     */
    abortControllerRef.current?.abort();

    if (texto.length < 2) {
      setCampistas([]);
      setBuscando(false);
      setBusquedaRealizada(false);
      return;
    }

    /*
     * Todavía estamos esperando que el usuario
     * termine de escribir.
     */
    setBuscando(true);
    setBusquedaRealizada(false);

    const timer = setTimeout(() => {
      buscarCampistas(texto);
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [buscar, campistaSeleccionado]);

  // ==========================================================
  // BUSCAR CAMPISTAS
  // ==========================================================

  async function buscarCampistas(texto: string) {
    /*
     * Cancelar búsqueda anterior.
     */
    abortControllerRef.current?.abort();

    const controller = new AbortController();

    abortControllerRef.current = controller;

    try {
      setBuscando(true);
      setBusquedaRealizada(false);
      setError("");

      const response = await fetch(
        `/api/aportes/buscar-campistas?buscar=${encodeURIComponent(
          texto
        )}`,
        {
          cache: "no-store",
          signal: controller.signal,
        }
      );

      const data = await response.json();

      /*
       * Si esta petición ya fue cancelada,
       * ignoramos completamente su resultado.
       */
      if (controller.signal.aborted) {
        return;
      }

      if (!response.ok) {
        setError(
          data.error ||
            "No fue posible buscar campistas."
        );

        setCampistas([]);
        setBusquedaRealizada(true);

        return;
      }

      setCampistas(data.campistas || []);
      setBusquedaRealizada(true);
    } catch (error) {
      /*
       * AbortError significa que nosotros mismos
       * cancelamos la petición porque el usuario
       * siguió escribiendo.
       *
       * No debe mostrarse como error.
       */
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setError(
        "Ocurrió un error al buscar campistas."
      );

      setCampistas([]);
      setBusquedaRealizada(true);
    } finally {
      /*
       * Solo quitamos "Buscando..." si esta sigue
       * siendo la petición más reciente.
       */
      if (
        abortControllerRef.current === controller
      ) {
        setBuscando(false);
      }
    }
  }

  // ==========================================================
  // SELECCIONAR CAMPISTA
  // ==========================================================

  function seleccionarCampista(
    campista: Campista
  ) {
    /*
     * Ya encontramos al campista.
     * Cancelamos cualquier petición pendiente.
     */
    abortControllerRef.current?.abort();

    setCampistaSeleccionado(campista);

    setCampistas([]);

    setBuscar(campista.nombre);

    setBusquedaRealizada(false);

    setMonto("");
    setMetodoPago("EFECTIVO");
    setBancoTransferencia("");
    setReferencia("");
    setObservacion("");

    setError("");
    setMensaje("");
    setBuscando(false);
  }

  // ==========================================================
  // LIMPIAR SELECCIÓN
  // ==========================================================

  function limpiarSeleccion() {
    abortControllerRef.current?.abort();

    setCampistaSeleccionado(null);

    setBuscar("");

    setCampistas([]);

    setBusquedaRealizada(false);

    setMonto("");
    setMetodoPago("EFECTIVO");
    setBancoTransferencia("");
    setReferencia("");
    setObservacion("");

    setError("");
    setMensaje("");
    setBuscando(false);
  }

  // ==========================================================
  // REGISTRAR APORTE
  // ==========================================================

  // Valida los datos y abre la confirmación sin guardar todavía.
  function solicitarConfirmacionAporte(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setMensaje("");

    if (!campistaSeleccionado) {
      setError("Debe seleccionar un campista.");
      return;
    }

    if (!campistaSeleccionado.inscripcion) {
      setError("El campista no tiene una inscripción activa.");
      return;
    }

    const montoNumerico = Number(monto);

    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError("Ingrese un monto válido mayor que cero.");
      return;
    }

    if (
      montoNumerico > campistaSeleccionado.inscripcion.pendiente
    ) {
      setError("El aporte no puede ser mayor al monto pendiente.");
      return;
    }

    if (metodoPago === "TRANSFERENCIA" && !bancoTransferencia) {
      setError("Debe seleccionar el banco de la transferencia.");
      return;
    }

    // Solo mostramos la ventana; el registro ocurre al confirmar.
    setConfirmarAporte(true);
  }

  // Ejecuta el registro después de que el usuario confirma.
  async function registrarAporte() {
    if (!campistaSeleccionado?.inscripcion) {
      setError("Debe seleccionar un campista con inscripción activa.");
      setConfirmarAporte(false);
      return;
    }

    const montoNumerico = Number(monto);

    // Revalidamos antes de enviar la solicitud a la API.
    if (
      !Number.isFinite(montoNumerico) ||
      montoNumerico <= 0 ||
      montoNumerico > campistaSeleccionado.inscripcion.pendiente
    ) {
      setError("Ingrese un monto válido que no supere el saldo pendiente.");
      setConfirmarAporte(false);
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");
      setConfirmarAporte(false);

      const response = await fetch(
        "/api/aportes",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            inscripcion_id:
              campistaSeleccionado.inscripcion.id,

            monto: montoNumerico,

            metodo_pago:
              metodoPago,

            banco_transferencia:
              metodoPago ===
              "TRANSFERENCIA"
                ? bancoTransferencia
                : null,

            referencia,

            observacion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "No fue posible registrar el aporte."
        );

        return;
      }

      const campistaActualizado: Campista = {
        ...campistaSeleccionado,

        inscripcion: {
          ...campistaSeleccionado.inscripcion,

          total_ahorrado:
            Number(
              data.total_ahorrado
            ) || 0,

          pendiente:
            Number(
              data.pendiente
            ) || 0,
        },
      };

      setCampistaSeleccionado(
        campistaActualizado
      );

      setMonto("");
      setReferencia("");
      setObservacion("");
      setBancoTransferencia("");

      // Mostramos el éxito únicamente después de confirmar la respuesta de la API.
      setMensaje("");
      setAporteExitoso({
        monto: montoNumerico,
        campista: campistaSeleccionado.nombre,
      });
    } catch {
      setError(
        "Ocurrió un error al registrar el aporte."
      );
    } finally {
      setGuardando(false);
    }
  }

  const inscripcion =
    campistaSeleccionado?.inscripcion;

  return (
    <div>
      {/* ======================================================
          ENCABEZADO
      ====================================================== */}

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
          Aportaciones
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Registro rápido de aportes
        </h1>

        <p className="mt-2 max-w-2xl text-slate-500">
          Busca un campista, revisa cuánto ha
          ahorrado y cuánto le falta por pagar.
          Registra su aporte sin salir de esta
          pantalla.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {/* ==================================================
              BUSCADOR
          ================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <label
              htmlFor="buscar-campista"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Buscar campista
            </label>

            <div className="relative">
              <input
                id="buscar-campista"
                value={buscar}
                onChange={(e) => {
                  const valor =
                    e.target.value;

                  setBuscar(valor);

                  setCampistas([]);

                  setBusquedaRealizada(
                    false
                  );

                  setMensaje("");
                  setError("");

                  if (
                    campistaSeleccionado
                  ) {
                    setCampistaSeleccionado(
                      null
                    );
                  }
                }}
                placeholder="Escribe el nombre del campista..."
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-24 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              {buscando && (
                <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

                  <span className="text-xs font-medium text-slate-400">
                    Buscando
                  </span>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Escribe al menos 2 letras del nombre.
            </p>

            {/* ================================================
                RESULTADOS
            ================================================ */}

            {!buscando &&
              campistas.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  {campistas.map(
                    (campista) => (
                      <button
                        key={campista.id}
                        type="button"
                        onClick={() =>
                          seleccionarCampista(
                            campista
                          )
                        }
                        className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {
                              campista.nombre
                            }
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                            {campista.codigo_campista && (
                              <span className="font-mono font-semibold text-slate-600">
                                {
                                  campista.codigo_campista
                                }
                              </span>
                            )}

                            {campista.identidad && (
                              <>
                                {campista.codigo_campista && (
                                  <span>
                                    •
                                  </span>
                                )}

                                <span>
                                  {
                                    campista.identidad
                                  }
                                </span>
                              </>
                            )}

                            {campista.iglesia && (
                              <>
                                <span>
                                  •
                                </span>

                                <span>
                                  {
                                    campista.iglesia
                                  }
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {campista.inscripcion ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Faltan L{" "}
                              {campista.inscripcion.pendiente.toFixed(
                                2
                              )}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              Sin inscripción
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}

            {/* ================================================
                SIN RESULTADOS
            ================================================ */}

            {!buscando &&
              busquedaRealizada &&
              buscar.trim().length >= 2 &&
              campistas.length === 0 &&
              !campistaSeleccionado && (
                <p className="mt-3 text-sm text-slate-500">
                  No se encontraron campistas.
                </p>
              )}
          </div>

          {/* ==================================================
              CAMPISTA SELECCIONADO
          ================================================== */}

          {campistaSeleccionado && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    Campista seleccionado
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    {
                      campistaSeleccionado.nombre
                    }
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    {campistaSeleccionado.codigo_campista && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono font-semibold text-slate-700">
                        {
                          campistaSeleccionado.codigo_campista
                        }
                      </span>
                    )}

                    {campistaSeleccionado.identidad && (
                      <span>
                        {
                          campistaSeleccionado.identidad
                        }
                      </span>
                    )}

                    {campistaSeleccionado.iglesia && (
                      <>
                        <span>•</span>

                        <span>
                          {
                            campistaSeleccionado.iglesia
                          }
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    limpiarSeleccion
                  }
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  Cambiar campista
                </button>
              </div>

              {inscripcion ? (
                <>
                  <div className="mt-6">
                    <p className="text-sm text-slate-500">
                      Campamento
                    </p>

                    <p className="font-semibold text-slate-900">
                      {inscripcion.campamento ||
                        "Sin nombre"}
                    </p>
                  </div>

                  {/* RESUMEN */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Meta
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        L{" "}
                        {inscripcion.meta.toFixed(
                          2
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                        Ahorrado
                      </p>

                      <p className="mt-1 text-lg font-bold text-emerald-700">
                        L{" "}
                        {inscripcion.total_ahorrado.toFixed(
                          2
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                        Falta por pagar
                      </p>

                      <p className="mt-1 text-lg font-bold text-amber-700">
                        L{" "}
                        {inscripcion.pendiente.toFixed(
                          2
                        )}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-xl bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  Este campista no tiene una
                  inscripción activa.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ====================================================
            FORMULARIO
        ==================================================== */}

        <div>
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Registrar aporte
            </h2>

            {!campistaSeleccionado && (
              <p className="mt-2 text-sm text-slate-500">
                Selecciona primero un campista.
              </p>
            )}

            <form
              onSubmit={solicitarConfirmacionAporte}
              className="mt-6 space-y-5"
            >
              {/* MONTO */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Monto
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400">
                    L
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={monto}
                    onChange={(e) =>
                      setMonto(
                        e.target.value
                      )
                    }
                    disabled={
                      !inscripcion ||
                      inscripcion.pendiente <=
                        0
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  />
                </div>

                {inscripcion &&
                  inscripcion.pendiente >
                    0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMonto(
                          inscripcion.pendiente.toFixed(
                            2
                          )
                        )
                      }
                      className="mt-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                    >
                      Completar pago — L{" "}
                      {inscripcion.pendiente.toFixed(
                        2
                      )}
                    </button>
                  )}
              </div>

              {/* MÉTODO */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Método de pago
                </label>

                <select
                  value={metodoPago}
                  onChange={(e) => {
                    const valor =
                      e.target.value;

                    setMetodoPago(valor);

                    if (
                      valor !==
                      "TRANSFERENCIA"
                    ) {
                      setBancoTransferencia(
                        ""
                      );
                    }
                  }}
                  disabled={!inscripcion}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                >
                  <option value="EFECTIVO">
                    Efectivo
                  </option>

                  <option value="TRANSFERENCIA">
                    Transferencia
                  </option>

                  <option value="DEPOSITO">
                    Depósito
                  </option>

                  <option value="OTRO">
                    Otro
                  </option>
                </select>
              </div>

              {/* BANCO */}
              {metodoPago ===
                "TRANSFERENCIA" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Banco
                  </label>

                  <select
                    value={
                      bancoTransferencia
                    }
                    onChange={(e) =>
                      setBancoTransferencia(
                        e.target.value
                      )
                    }
                    disabled={
                      !inscripcion
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      Seleccionar banco
                    </option>

                    {bancos.map(
                      (banco) => (
                        <option
                          key={banco}
                          value={banco}
                        >
                          {banco}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              {/* REFERENCIA */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Referencia
                </label>

                <input
                  value={referencia}
                  onChange={(e) =>
                    setReferencia(
                      e.target.value
                    )
                  }
                  disabled={!inscripcion}
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                />
              </div>

              {/* OBSERVACIÓN */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Observación
                </label>

                <textarea
                  value={observacion}
                  onChange={(e) =>
                    setObservacion(
                      e.target.value
                    )
                  }
                  disabled={!inscripcion}
                  rows={3}
                  placeholder="Opcional"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                />
              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* ÉXITO */}
              {mensaje && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {mensaje}
                </div>
              )}

              {/* BOTÓN */}
              <button
                type="submit"
                disabled={
                  guardando ||
                  !inscripcion ||
                  inscripcion.pendiente <=
                    0
                }
                className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando
                  ? "Registrando..."
                  : "Registrar aporte"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ======================================================
          MODAL DE CONFIRMACIÓN DEL APORTE
          El usuario puede cancelar o confirmar antes de guardar.
      ====================================================== */}
      {confirmarAporte && campistaSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmar-aporte"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-8 w-8 text-amber-600"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-0.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 4.5h.008v.008H12V16.5Z"
                  />
                </svg>
              </div>
              <div>
                <h2
                  id="titulo-confirmar-aporte"
                  className="text-xl font-bold text-slate-900"
                >
                  ¿Confirmar aporte?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Revisa los datos antes de continuar.
                </p>
              </div>
            </div>

            {/* Resumen de los datos que se van a registrar. */}
            <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Campista
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {campistaSeleccionado.nombre}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Monto del aporte
                </p>
                <p className="mt-1 text-3xl font-bold text-emerald-700">
                  L{" "}
                  {Number(monto).toLocaleString("es-HN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <span className="text-sm text-slate-500">
                  Método de pago
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {metodoPago === "EFECTIVO"
                    ? "Efectivo"
                    : metodoPago === "TRANSFERENCIA"
                      ? `Transferencia${bancoTransferencia ? ` - ${bancoTransferencia}` : ""}`
                      : metodoPago === "DEPOSITO"
                        ? "Depósito"
                        : "Otro"}
                </span>
              </div>

              {referencia.trim() && (
                <div className="flex items-start justify-between gap-3 border-t border-slate-200 pt-3">
                  <span className="text-sm text-slate-500">
                    Referencia
                  </span>
                  <span className="break-all text-right text-sm font-medium text-slate-800">
                    {referencia}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-sm text-slate-600">
              ¿Estás seguro de que deseas registrar este aporte?
            </p>

            {/* Acciones para cancelar o proceder con el registro. */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setConfirmarAporte(false)}
                disabled={guardando}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void registrarAporte()}
                disabled={guardando}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? "Registrando..." : "Sí, registrar aporte"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL DE REGISTRO EXITOSO
          Solo aparece si la API confirma que el aporte se guardó.
      ====================================================== */}
      {aporteExitoso && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-aporte-exitoso"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-11 w-11 text-emerald-600"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m5 12 4 4L19 6"
                  />
                </svg>
              </div>

              <h2
                id="titulo-aporte-exitoso"
                className="mt-5 text-2xl font-bold text-slate-900"
              >
                ¡Aporte registrado!
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                El aporte se ha guardado correctamente.
              </p>
            </div>

            {/* Presenta el monto confirmado y el campista asociado. */}
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
              <p className="text-sm font-medium text-emerald-700">
                Monto registrado
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-700">
                L{" "}
                {aporteExitoso.monto.toLocaleString("es-HN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>

              <div className="mt-4 border-t border-emerald-200 pt-4">
                <p className="text-xs text-emerald-600">
                  Campista
                </p>
                <p className="mt-1 font-semibold text-emerald-900">
                  {aporteExitoso.campista}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAporteExitoso(null)}
              className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}