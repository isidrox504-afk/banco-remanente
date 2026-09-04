"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { APP_CONFIG } from "@/lib/config/app";

const opciones = [
  {
    nombre: "Dashboard",
    href: "/admin",
  },
  {
    nombre: "Campistas",
    href: "/admin/campistas",
  },
  {
    nombre: "Campamentos",
    href: "/admin/campamentos",
  },
  {
    nombre: "Iglesias",
    href: "/admin/iglesias",
  },
  {
    nombre: "Reportes",
    href: "/admin/reportes",
  },
];

export default function MenuMovil() {
  const [abierto, setAbierto] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  /*
   * Precargamos todas las páginas principales
   * apenas se monta el menú.
   *
   * Así, cuando el usuario toca una opción,
   * Next.js ya tiene adelantada parte de la navegación.
   */
  useEffect(() => {
    opciones.forEach((opcion) => {
      router.prefetch(opcion.href);
    });
  }, [router]);

  function cerrarMenu() {
    setAbierto(false);
  }

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white lg:hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/admin"
          prefetch
          onClick={cerrarMenu}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-200">
            <Image
              src={APP_CONFIG.logo}
              alt={`Logo ${APP_CONFIG.nombre}`}
              width={44}
              height={44}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {APP_CONFIG.nombre}
            </p>

            <p className="text-xs text-slate-500">
              Panel administrativo
            </p>
          </div>
        </Link>

        {/* HAMBURGUESA */}
        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition active:scale-95"
        >
          {abierto ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* MENÚ */}
      {abierto && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg">
          <nav className="space-y-2">
            {opciones.map((opcion) => {
              const activo =
                opcion.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(opcion.href);

              return (
                <Link
                  key={opcion.href}
                  href={opcion.href}
                  prefetch
                  onClick={cerrarMenu}
                  className={`block rounded-xl px-4 py-3.5 text-sm font-semibold transition active:scale-[0.99] ${
                    activo
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opcion.nombre}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}