import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListaCampistas from "./ListaCampistas";

export default async function CampistasPage() {
  const supabase = await createClient();

  const { data: campistas, error } = await supabase
    .from("campistas")
    .select(`
      id,
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
      )
    `)
    .order("nombre", { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Error al cargar los campistas: {error.message}
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Campistas
          </h1>

          <p className="mt-2 text-slate-500">
            Administra las personas registradas en el Banco de Campistas.
          </p>
        </div>

        <Link
          href="/admin/campistas/nuevo"
          className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          + Registrar campista
        </Link>
      </div>

      <ListaCampistas campistas={campistas || []} />
    </>
  );
}