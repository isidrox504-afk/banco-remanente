"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Inscripcion = {
  id: number;
  meta: number | string;
  estado: string;
  campamentos:
    | {
        nombre: string;
      }
    | {
        nombre: string;
      }[]
    | null;
};

const bancos = [
  "BAC",
  "FICOHSA",
  "ATLANTIDA",
  "OCCIDENTE",
  "ACH",
];

export default function RegistrarAportePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const campistaId = params.id;

  const [inscripcion, setInscripcion] =
    useState<Inscripcion | null>(null);

  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [bancoTransferencia, setBancoTransferencia] =
    useState("");
  const [referencia, setReferencia] = useState("");
  const [observacion, setObservacion] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarInscripcion() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("inscripciones")
        .select(`
          id,
          meta,
          estado,
          campamentos (
            nombre
          )
        `)
        .eq("campista_id", Number(campistaId))
        .neq("estado", "CANCELADO")
        .order("fecha_inscripcion", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setError("No se pudo cargar la inscripción.");
        setCargando(false);
        return;
      }

      setInscripcion(data);
      setCargando(false);
    }

    cargarInscripcion();
  }, [campistaId]);

  function cambiarMetodoPago(nuevoMetodo: string) {
    setMetodoPago(nuevoMetodo);

    if (nuevoMetodo !== "TRANSFERENCIA") {
      setBancoTransferencia("");
    }
  }

  async function guardarAporte(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (!inscripcion) {
      setError("El campista no tiene una inscripción activa.");
      return;
    }

    if (!monto || Number(monto) <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }

    if (
      metodoPago === "TRANSFERENCIA" &&
      !bancoTransferencia
    ) {
      setError("Selecciona el banco de la transferencia.");
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch("/api/aportes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inscripcion_id: inscripcion.id,
          monto: Number(monto),
          metodo_pago: metodoPago,

          banco_transferencia:
            metodoPago === "TRANSFERENCIA"
              ? bancoTransferencia
              : null,

          referencia: referencia.trim(),
          observacion: observacion.trim(),
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error || "No se pudo registrar el aporte."
        );
        return;
      }

      router.push(`/admin/campistas/${campistaId}`);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">
          Cargando inscripción...
        </p>
      </div>
    );
  }

  const nombreCampamento = Array.isArray(
    inscripcion?.campamentos
  )
    ? inscripcion?.campamentos[0]?.nombre
    : inscripcion?.campamentos?.nombre;

  return (
    <>
      <div className="mb-8">
        <Link
          href={`/admin/campistas/${campistaId}`}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver al campista
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Registrar aporte
        </h1>

        <p className="mt-2 text-slate-500">
          Registra un nuevo aporte al ahorro del campista.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {!inscripcion ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-800">
              Sin inscripción
            </p>

            <p className="mt-2 text-sm text-amber-700">
              Este campista todavía no tiene una inscripción activa.
            </p>
          </div>
        ) : (
          <form
            onSubmit={guardarAporte}
            className="space-y-6"
          >
            {/* CAMPAMENTO */}
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Campamento
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {nombreCampamento || "Campamento"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Meta: L{" "}
                {Number(inscripcion.meta).toLocaleString(
                  "es-HN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </p>
            </div>

            {/* MONTO */}
            <div>
              <label
                htmlFor="monto"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Monto del aporte *
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                  L
                </span>

                <input
                  id="monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) =>
                    setMonto(e.target.value)
                  }
                  required
                  placeholder="500.00"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* MÉTODO DE PAGO */}
            <div>
              <label
                htmlFor="metodoPago"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Método de pago
              </label>

              <select
                id="metodoPago"
                value={metodoPago}
                onChange={(e) =>
                  cambiarMetodoPago(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
            {metodoPago === "TRANSFERENCIA" && (
              <div>
                <label
                  htmlFor="bancoTransferencia"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Banco *
                </label>

                <select
                  id="bancoTransferencia"
                  value={bancoTransferencia}
                  onChange={(e) =>
                    setBancoTransferencia(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">
                    Selecciona un banco
                  </option>

                  {bancos.map((banco) => (
                    <option
                      key={banco}
                      value={banco}
                    >
                      {banco === "ATLANTIDA"
                        ? "ATLÁNTIDA"
                        : banco}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  Selecciona el banco desde donde se
                  realizó la transferencia.
                </p>
              </div>
            )}

            {/* REFERENCIA */}
            <div>
              <label
                htmlFor="referencia"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Referencia
              </label>

              <input
                id="referencia"
                type="text"
                value={referencia}
                onChange={(e) =>
                  setReferencia(e.target.value)
                }
                placeholder={
                  metodoPago === "TRANSFERENCIA"
                    ? "Número de transferencia"
                    : "Número de recibo, comprobante, etc."
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* OBSERVACIÓN */}
            <div>
              <label
                htmlFor="observacion"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Observación
              </label>

              <textarea
                id="observacion"
                value={observacion}
                onChange={(e) =>
                  setObservacion(e.target.value)
                }
                rows={4}
                placeholder="Observación opcional..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
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
                href={`/admin/campistas/${campistaId}`}
                className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={guardando}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando
                  ? "Registrando..."
                  : "Registrar aporte"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}