"use client";

import clsx from "clsx";
import { CheckCheck, HandPlatter, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { nomeConta } from "@/lib/dominio/rotulos";
import { gruposPreparo, type GrupoPreparo } from "@/lib/dominio/cozinha";
import { mudarPreparo } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";
import { tocar } from "@/lib/som";
import { useDoisCliques, useRelogio } from "../ui";

/**
 * Aviso no salão/caixa quando a cozinha marca um pedido como pronto: toca um
 * som e mostra um cartão no canto da tela até alguém levar o pedido.
 */
export function AvisoProntos() {
  const pathname = usePathname();
  const contas = useLoja((e) => e.contas);
  const mesas = useLoja((e) => e.mesas);
  const agora = useRelogio(30000);
  const [fechados, setFechados] = useState<string[]>([]);

  const prontos = useMemo(() => gruposPreparo(contas, agora).filter((g) => g.status === "pronto"), [contas, agora]);

  // Toca quando aparece um pronto novo (não na primeira carga da tela)
  const vistos = useRef<Set<string> | null>(null);
  useEffect(() => {
    const chaves = prontos.map((g) => g.chave);
    if (vistos.current && chaves.some((k) => !vistos.current!.has(k))) tocar("pronto");
    vistos.current = new Set(chaves);
  }, [prontos]);

  // Só os que ficaram prontos nesta sessão de tela e não foram dispensados
  const lista = prontos.filter((g) => !fechados.includes(g.chave) && g.prontoEm && agora - new Date(g.prontoEm).getTime() < 3600_000).slice(-3);
  if (pathname === "/cozinha" || !lista.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-28 right-3 z-30 grid w-[min(340px,calc(100vw-24px))] gap-2 sm:right-5" aria-live="polite">
      {lista.map((g) => (
        <Cartao key={g.chave} g={g} nome={nomeConta(g.conta, mesas)} fechar={() => setFechados((f) => [...f, g.chave])} />
      ))}
    </div>
  );
}

function Cartao({ g, nome, fechar }: { g: GrupoPreparo; nome: string; fechar: () => void }) {
  const levar = useDoisCliques(() =>
    mudarPreparo(
      g.conta.id,
      g.itens.map((i) => i.id),
      "entregue",
    ),
  );
  return (
    <div className="pointer-events-auto overflow-hidden rounded-[18px] bg-card shadow-flutuante ring-2 ring-st-pronto">
      <div className="flex items-start gap-3 p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-st-pronto text-white">
          <HandPlatter size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold uppercase tracking-wide text-st-pronto">{g.setor === "bar" ? "Bar" : "Cozinha"} · pronto para levar</p>
          <p className="truncate text-[15px] font-extrabold">{nome}</p>
          <p className="truncate text-[12.5px] text-mudo">
            {g.itens.map((i) => `${i.qtd}× ${i.nome}`).join(", ")}
          </p>
        </div>
        <button onClick={fechar} className="rounded-full p-1 text-mudo hover:bg-secundario" aria-label="Fechar aviso" title="Fechar aviso">
          <X size={16} />
        </button>
      </div>
      <button
        onClick={levar.clicar}
        onBlur={levar.desarmar}
        className={clsx("flex w-full items-center justify-center gap-2 py-2.5 text-[13.5px] font-bold", levar.armado ? "bg-rosado text-acao" : "bg-st-pronto text-white")}
      >
        <CheckCheck size={17} />
        {levar.armado ? "Toque de novo para confirmar" : "Entregue"}
      </button>
    </div>
  );
}
