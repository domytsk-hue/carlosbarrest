"use client";

import { useEffect, useState } from "react";
import { CircleUserRound, Wallet, Wifi, WifiOff } from "lucide-react";
import type { Sessao } from "@/lib/sessao";

/** Barra de status: conexão, usuário logado e caixa ativo, sempre visíveis. */
export function StatusBar({ sessao }: { sessao: Sessao }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  return (
    <footer className="sticky bottom-0 z-10 flex items-center gap-3 sm:gap-4 whitespace-nowrap overflow-hidden border-t border-linha bg-card px-4 py-2 text-[12px] text-mudo sm:px-5">
      <span className={online ? "flex items-center gap-1.5 text-ok font-semibold" : "flex items-center gap-1.5 text-st-cancelado font-semibold"}>
        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
        {online ? "Online" : "Sem conexão"}
      </span>
      <span className="flex items-center gap-1.5">
        <CircleUserRound size={14} />
        {sessao.nome}
        <span className="hidden sm:inline">· {sessao.funcao}</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        <Wallet size={14} />
        {sessao.caixa ?? "Nenhum caixa aberto"}
      </span>
      <span className="ml-auto hidden truncate sm:block">{sessao.restaurante}</span>
      {sessao.demo && <span className="ml-auto sm:ml-0 rounded-full bg-[#FDF0D6] px-2 py-0.5 text-[11px] font-bold text-[#8A5A00]">Demonstração</span>}
    </footer>
  );
}
