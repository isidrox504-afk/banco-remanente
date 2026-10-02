
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Campamento = {
  id: number;
  nombre: string;
  precio_inscripcion: number | string;
  fecha_inicio: string | null;
  fecha_limite_pago: string | null;
  estado: string;
};

type Iglesia = {
  id: number;
  nombre: string;
  estado: string;
};

type PrecioIglesia = {
  iglesia_id: number;
  precio: string;
};

export default function EditarCampamentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaLimitePago, setFechaLimitePago] = useState("");

  const [iglesias, setIglesias] = useState<Iglesia[]>([]);
  const [preciosIglesia, setPreciosIglesia] = useState<
    Record<number, string>
  >({});

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargarCampamento() {
      setCargando(true);
      setError("");

      const supabase = createClient();

      const [
        { data: campamento, error: errorCampamento },
        { data: iglesiasData, error: errorIglesias },
      ] = await Promise.all([
        supabase
          .from("campamentos")
          .select(`
            id,
            nombre,
            precio_inscripcion,
            fecha_inicio,
            fecha_limite_pago,
            estado
          `)
          .eq("id", id)
          .single<Campamento>(),

        supabase
          .from("iglesias")
          .select("id, nombre, estado")
          .eq("estado", "ACTIVO")
          .order("nombre"),
      ]);

      if (cancelado) return;

      if (errorCampamento || !campamento) {
        setError("No se pudo cargar el campamento.");
        setCargando(false);
        return;
      }

      if (errorIglesias) {
        setError("No se pudieron cargar las iglesias activas.");
        setCargando(false);
        return;
      }

      const { data: preciosGuardados, error: errorPrecios } =
        await supabase
          .from("precios_campamento_iglesia")
          .select("iglesia_id, precio")
          .eq("campamento_id", campamento.id);

      if (cancelado) return;

     if (errorPrecios) {
  console.error("Error al cargar precios por iglesia:", errorPrecios);
  setError(
    `Error al cargar precios: ${errorPrecios.message}`
  );
  setCargando(false);
  return;
}

      const preciosIniciales: Record<number, string> = {};

      for (const iglesia of iglesiasData ?? []) {
        const precioExistente = (preciosGuardados ?? []).find(
          (item) => Number(item.iglesia_id) === Number(iglesia.id)
        );

        preciosIniciales[Number(iglesia.id)] =
          precioExistente != null
            ? String(precioExistente.precio)
            : "";
      }

      setNombre(campamento.nombre);
      setPrecio(String(campamento.precio_inscripcion));
      setFechaInicio(campamento.fecha_inicio || "");
      setFechaLimitePago(campamento.fecha_limite_pago || "");
      setIglesias((iglesiasData ?? []) as Iglesia[]);
      setPreciosIglesia(preciosIniciales);
      setCargando(false);
    }

    if (id) {
      cargarCampamento();
    }

    return () => {
      cancelado = true;
    };
  }, [id]);

  function actualizarPrecioIglesia(
    iglesiaId: number,
    nuevoPrecio: string
  ) {
    setPreciosIglesia((actuales) => ({
      ...actuales,
      [iglesiaId]: nuevoPrecio,
    }));
  }

  async function guardarCambios(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    const precioGeneral = Number(precio);

    if (
      !precio.trim() ||
      !Number.isFinite(precioGeneral) ||
      precioGeneral <= 0
    ) {
      setError("Ingresa un precio de inscripción válido.");
      return;
    }

    if (
      fechaInicio &&
      fechaLimitePago &&
      fechaLimitePago > fechaInicio
    ) {
      setError(
        "La fecha límite de pago no puede ser posterior a la fecha del campamento."
      );
      return;
    }

    const preciosParaGuardar: PrecioIglesia[] = [];

    for (const iglesia of iglesias) {
      const valor = preciosIglesia[Number(iglesia.id)] ?? "";

      // Un campo vacío significa que esta iglesia no tendrá
      // un precio especial configurado.
      if (!valor.trim()) continue;

      const precioIglesia = Number(valor);

      if (
        !Number.isFinite(precioIglesia) ||
        precioIglesia < 0
      ) {
        setError(
          `Ingresa un precio válido para la iglesia ${iglesia.nombre}.`
        );
        return;
      }

      preciosParaGuardar.push({
        iglesia_id: Number(iglesia.id),
        precio: String(precioIglesia),
      });
    }

    setGuardando(true);

    try {
      const response = await fetch(`/api/campamentos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          precio_inscripcion: precioGeneral,
          fecha_inicio: fechaInicio || null,
          fecha_limite_pago: fechaLimitePago || null,
          precios_iglesia: preciosParaGuardar.map((item) => ({
            iglesia_id: item.iglesia_id,
            precio: Number(item.precio),
          })),
        }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setError(
          resultado.error ||
            "No se pudo actualizar el campamento."
        );
        return;
      }

      router.push(`/admin/campamentos/${id}`);
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
          Cargando campamento...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href={`/admin/campamentos/${id}`}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver al campamento
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Editar campamento
        </h1>

        <p className="mt-2 text-slate-500">
          Actualiza los datos generales y configura los precios
          especiales por iglesia.
        </p>
      </div>

      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={guardarCambios} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Nombre del campamento *
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Precio general de inscripción *
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                L
              </span>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Este es el precio general. Configura abajo un precio
              diferente únicamente para las iglesias que lo necesiten.
              Los cambios no modifican las metas históricas de las
              personas inscritas.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Fecha del campamento
              </label>

              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Fecha límite de pago
              </label>

              <input
                type="date"
                value={fechaLimitePago}
                onChange={(e) => setFechaLimitePago(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Precios por iglesia
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Deja el campo vacío si la iglesia utilizará el precio
                general. Solo se muestran iglesias activas.
              </p>
            </div>

            {iglesias.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No hay iglesias activas para configurar.
              </div>
            ) : (
              <div className="space-y-3">
                {iglesias.map((iglesia) => (
                  <div
                    key={iglesia.id}
                    className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_200px] sm:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {iglesia.nombre}
                      </p>
                      <p className="text-xs text-slate-500">
                        ID: {iglesia.id}
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`precio-iglesia-${iglesia.id}`}
                        className="mb-1 block text-xs font-medium text-slate-600"
                      >
                        Precio especial (L)
                      </label>

                      <input
                        id={`precio-iglesia-${iglesia.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder={`General: L ${precio || "0.00"}`}
                        value={
                          preciosIglesia[Number(iglesia.id)] ?? ""
                        }
                        onChange={(e) =>
                          actualizarPrecioIglesia(
                            Number(iglesia.id),
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Link
              href={`/admin/campamentos/${id}`}
              className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}