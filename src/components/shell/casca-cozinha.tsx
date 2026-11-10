"use client";

import Image from "next/image";
import clsx from "clsx";
import { Cloud, CloudOff, LogOut, RefreshCw } from "lucide-react";
import { useNuvem, useStatusNuvem } from "@/lib/loja/nuvem";
import { sair, useSessao } from "@/lib/sessao";
import { AreaImpressao } from "../impressao";
import { useDoisCliques, useRelogio } from "../ui";

/**
 * Casca do painel para quem tem a função "cozinha": sem menu, sem barra de
 * acesso rápido e sem atalhos. Só o painel da cozinha, o relógio e o botão Sair.
 */
export function CascaCozinha({ children }: { children: React.ReactNode }) {
  const sessao = useSessao();
  useNuvem(sessao?.restauranteId);
  const agora = useRelogio(10000);
  const saida = useDoisCliques(() => void sair());

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-linha bg-card px-3 py-2 sm:px-5">
        <Image src="/logo.svg" alt="Carlos Bar & Restaurante" width={78} height={52} priority className="logo-marca h-auto w-[78px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold">{sessao?.nome ?? "…"}</p>
          <p className="truncate text-[11.5px] text-mudo">{sessao?.restaurante}</p>
        </div>
        <StatusSincronizacao />
        <span className="num hidden text-[22px] font-extrabold sm:block">{new Date(agora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        <button
          onClick={saida.clicar}
          onBlur={saida.desarmar}
          className={clsx("flex min-h-11 items-center gap-2 rounded-full px-4 text-[13px] font-bold", saida.armado ? "bg-rosado text-acao ring-2 ring-acao" : "bg-secundario text-tinta")}
        >
          <LogOut size={16} />
          {saida.armado ? "Toque de novo" : "Sair"}
        </button>
      </header>
      <main className="flex-1 px-3 pb-6 pt-2 sm:px-5">{children}</main>
      <AreaImpressao />
    </div>
  );
}

/** Mostra se este aparelho está recebendo os pedidos dos outros. */
export function StatusSincronizacao({ rotuloOk = "Recebendo pedidos" }: { rotuloOk?: string }) {
  const status = useStatusNuvem();
  if (status === "desligada") return null;
  const [Icone, rotulo, cor] =
    status === "ok"
      ? [Cloud, rotuloOk, "text-ok"]
      : status === "conectando"
        ? [RefreshCw, "Conectando…", "text-mudo"]
        : [CloudOff, "Sem conexão: tentando de novo", "text-st-cancelado"];
  return (
    <span className={clsx("flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold", cor)} title={rotulo}>
      <Icone size={15} className={status === "conectando" ? "animate-spin" : undefined} />
      <span className="hidden md:inline">{rotulo}</span>
    </span>
  );
}
