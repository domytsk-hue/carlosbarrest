"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ATALHOS } from "@/lib/modulos";

/** Converte um evento de teclado no nome usado em ATALHOS ("F3", "Ctrl+Ins"...). */
function nomeDaTecla(e: KeyboardEvent) {
  const tecla = e.key === "Insert" ? "Ins" : e.key;
  return (e.ctrlKey || e.metaKey ? "Ctrl+" : "") + tecla;
}

/** Atalhos de teclado globais para quem opera o caixa no computador. */
export function useAtalhos(ligados = true) {
  const router = useRouter();
  useEffect(() => {
    if (!ligados) return;
    const aoTeclar = (e: KeyboardEvent) => {
      const destino = ATALHOS[nomeDaTecla(e)];
      if (!destino) return;
      e.preventDefault();
      router.push(destino);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [router, ligados]);
}
