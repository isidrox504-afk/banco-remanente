"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CerrarSesion() {
  const router = useRouter();

  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState("");

  async function cerrarSesion() {
    setCerrando(true);
    setError("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        setError("No se pudo cerrar la sesión.");
        setCerrando(false);
        return;
      }

      // Enviar al login administrativo
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setError("Ocurrió un error al cerrar la sesión.");
      setCerrando(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={cerrarSesion}
        disabled={cerrando}
        className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}