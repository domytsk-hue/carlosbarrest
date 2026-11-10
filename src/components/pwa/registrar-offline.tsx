"use client";

import { useEffect } from "react";
import { MODULOS } from "@/lib/modulos";

/** Telas guardadas no aparelho para abrir sem internet (módulos do menu + app do garçom). */
const ROTAS = ["/", ...MODULOS.filter((m) => !m.desabilitado && m.slug).map((m) => "/" + m.slug), "/garcom", "/login"];

/**
 * Liga o funcionamento sem internet (public/sw.js). Só em produção: no
 * `npm run dev` os arquivos mudam a cada edição e a cópia guardada atrapalharia.
 */
export function RegistrarOffline() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const versao = process.env.NEXT_PUBLIC_VERSAO || "local";
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(versao)}`, { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // Espera a tela terminar de abrir para não disputar a internet com ela
        setTimeout(() => {
          if (navigator.onLine) reg.active?.postMessage({ tipo: "aquecer", rotas: ROTAS });
        }, 5000);
      })
      .catch(() => {});
  }, []);
  return null;
}
