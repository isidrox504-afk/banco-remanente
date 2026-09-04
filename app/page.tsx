import Image from "next/image";
import Link from "next/link";
import { APP_CONFIG } from "@/lib/config/app";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
              <Image
                src={APP_CONFIG.logo}
                alt={`Logo ${APP_CONFIG.nombre}`}
                width={56}
                height={56}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            <div>
              <p className="text-xl font-bold text-slate-900">
                {APP_CONFIG.nombre}
              </p>

              <p className="text-sm text-slate-500">
                {APP_CONFIG.organizacion}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <section className="mx-auto flex min-h-[calc(100vh-95px)] max-w-6xl items-center px-6 py-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          {/* TEXTO */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              {APP_CONFIG.nombreCorto}
            </p>

            <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Consulta y administra el ahorro de campamento
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              {APP_CONFIG.descripcion}. Consulta tu progreso de ahorro
              y administra campistas, campamentos, inscripciones y aportes
              desde una sola plataforma.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/consulta"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Consultar mi ahorro
              </Link>

              <Link
                href="/admin/login"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Administración
              </Link>
            </div>
          </div>

          {/* TARJETA */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="rounded-2xl bg-emerald-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Para campistas
              </p>

              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                Revisa tu progreso cuando quieras
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Ingresa tu número de identidad y PIN para consultar tu meta,
                total ahorrado, saldo pendiente e historial de aportes.
              </p>

              <Link
                href="/consulta"
                className="mt-6 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Ir a consulta →
              </Link>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">
                  Campistas
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Consulta de ahorro mediante identidad y PIN.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">
                  Administradores
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Gestión de campistas, iglesias, campamentos, aportes y reportes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}