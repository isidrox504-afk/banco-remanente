"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_CONFIG } from "@/lib/config/app";

export default function LoginAdmin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setCargando(true);

    const supabase = createClient();

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <div className="w-full max-w-md">
        {/* VOLVER AL INICIO */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700"
          >
            <span>←</span>
            Volver al inicio
          </Link>
        </div>

        {/* ENCABEZADO */}
        <div className="mb-8 text-center">
          {/* LOGO */}
          <div className="mb-6 flex justify-center">
            <Link
              href="/"
              aria-label="Volver al inicio"
              className="block"
            >
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
                <Image
                  src={APP_CONFIG.logo}
                  alt={`Logo ${APP_CONFIG.nombre}`}
                  width={112}
                  height={112}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* NOMBRE DEL BANCO */}
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-600">
            {APP_CONFIG.nombre}
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Administración
          </h1>

          <p className="mt-3 text-slate-500">
            Ingresa tus credenciales para administrar{" "}
            {APP_CONFIG.nombre}.
          </p>
        </div>

        {/* FORMULARIO */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form
            onSubmit={iniciarSesion}
            className="space-y-6"
          >
            {/* CORREO */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="admin@correo.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* CONTRASEÑA */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* ERROR */}
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* BOTÓN */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando
                ? "Ingresando..."
                : "Iniciar sesión"}
            </button>
          </form>
        </div>

        {/* PIE */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Acceso exclusivo para administradores
        </p>
      </div>
    </main>
  );
}