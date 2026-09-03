import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CerrarSesion from "./CerrarSesion";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  // Verificar que exista una sesión activa
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no hay sesión, regresar al login
if (!user) {
  redirect("/admin/login");
}

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        {/* =====================================================
            MENÚ LATERAL
        ===================================================== */}
        <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
          {/* LOGO / NOMBRE */}
          <div className="border-b border-slate-200 px-6 py-6">
            <Link
              href="/admin"
              className="text-xl font-bold text-slate-900"
            >
              Banco de Campistas
            </Link>

            <p className="mt-1 text-sm text-slate-500">
              Panel administrativo
            </p>
          </div>

          {/* NAVEGACIÓN */}
          <nav className="flex-1 space-y-2 p-4">
            <Link
              href="/admin"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/campistas"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              Campistas
            </Link>

            <Link
              href="/admin/aportes"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              Aportes
            </Link>

            <Link
              href="/admin/campamentos"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              Campamentos
            </Link>

            <Link
              href="/admin/iglesias"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              Iglesias
            </Link>

            <Link
              href="/admin/parametros"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              Parámetros
            </Link>
          </nav>

          {/* USUARIO / CERRAR SESIÓN */}
          <div className="border-t border-slate-200 p-4">
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Sesión iniciada
              </p>

              <p className="mt-1 truncate text-sm font-medium text-slate-700">
                {user.email}
              </p>
            </div>

            <CerrarSesion />
          </div>
        </aside>

        {/* =====================================================
            CONTENIDO
        ===================================================== */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* HEADER MÓVIL */}
          <header className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/admin"
                className="font-bold text-slate-900"
              >
                Banco de Campistas
              </Link>

              <CerrarSesion />
            </div>

            {/* MENÚ MÓVIL */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              <Link
                href="/admin"
                className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Dashboard
              </Link>

              <Link
                href="/admin/campistas"
                className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Campistas
              </Link>

              <Link
                href="/admin/aportes"
                className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Aportes
              </Link>

              <Link
                href="/admin/campamentos"
                className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Campamentos
              </Link>

              <Link
                href="/admin/iglesias"
                className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Iglesias
              </Link>

              <Link
                href="/admin/parametros"
                className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Parámetros
              </Link>
            </div>
          </header>

          {/* PÁGINA */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}