"use client";

import clsx from "clsx";
import { IdCard, Search } from "lucide-react";
import { useState } from "react";
import { Lancador } from "@/components/pedido/lancador";
import { PainelConta } from "@/components/pedido/painel-conta";
import { Modal, Titulo, useRelogio, Vazio } from "@/components/ui";
import { brl, duracao, total } from "@/lib/dominio/calculos";
import type { Conta } from "@/lib/dominio/tipos";
import { abrirConta, descartarSeVazia } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

export default function ComandasPage() {
  const totalComandas = useLoja((e) => e.config.totalComandas);
  const contas = useLoja((e) => e.contas.filter((c) => c.canal === "comanda" && (c.status === "aberta" || c.status === "fechamento")));
  const agora = useRelogio();
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [lancando, setLancando] = useState<{ contaId: string; numero: number } | null>(null);
  const [busca, setBusca] = useState("");

  const porNumero = new Map<number, Conta>(contas.map((c) => [c.comanda!, c]));
  const numeros = Array.from({ length: totalComandas }, (_, i) => i + 1);
  const abertas = numeros.filter((n) => porNumero.has(n));
  const livres = numeros.filter((n) => !porNumero.has(n));
  const contaSel = selecionada ? porNumero.get(selecionada) : undefined;

  function tocar(n: number) {
    if (porNumero.has(n)) return setSelecionada(n);
    const nome = busca && isNaN(Number(busca)) ? busca : undefined;
    const id = abrirConta({ canal: "comanda", comanda: n, clienteNome: nome });
    setSelecionada(n);
    setLancando({ contaId: id, numero: n });
    setBusca("");
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(busca);
    if (n >= 1 && n <= totalComandas) tocar(n);
  }

  const Bloco = ({ n }: { n: number }) => {
    const c = porNumero.get(n);
    return (
      <button
        onClick={() => tocar(n)}
        className={clsx(
          "flex min-h-[78px] flex-col items-start rounded-[18px] border-l-[5px] bg-card p-3 text-left shadow-card active:scale-[.97]",
          !c ? "border-l-linha" : c.status === "fechamento" ? "border-l-st-preparo" : "border-l-acao",
          n === selecionada && "ring-2 ring-acao",
        )}
      >
        <span className="flex items-center gap-1.5 text-[14.5px] font-extrabold">
          <IdCard size={16} className="text-mudo" /> {n}
        </span>
        {c ? (
          <>
            <span className="truncate text-[11.5px] text-mudo">{c.clienteNome ?? duracao(c.abertaEm, agora)}</span>
            <span className="num mt-auto text-[13px] font-bold text-acao">{brl(total(c))}</span>
          </>
        ) : (
          <span className="mt-auto text-[11.5px] text-mudo">Livre</span>
        )}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <Titulo sub={<>{abertas.length} abertas · {livres.length} livres · F11</>}>Comandas</Titulo>
      <div className="grid gap-4 lg:grid-cols-[1fr_var(--painel-direito)]">
        <div className="space-y-4">
          <form onSubmit={buscar} className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-card">
            <Search size={18} className="text-mudo" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite ou leia o número da comanda e tecle Enter"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-mudo"
              inputMode="numeric"
            />
          </form>
          {abertas.length > 0 && (
            <section>
              <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-mudo">Abertas · {abertas.length}</h2>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 xl:grid-cols-7">
                {abertas.map((n) => (
                  <Bloco key={n} n={n} />
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-mudo">Disponíveis · {livres.length}</h2>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 xl:grid-cols-7">
              {livres.map((n) => (
                <Bloco key={n} n={n} />
              ))}
            </div>
          </section>
        </div>
        <aside className={clsx("lg:sticky lg:top-28 lg:h-[calc(100dvh-150px)]", !contaSel && "hidden lg:block")}>
          {contaSel ? (
            <div className="fixed inset-0 z-40 overflow-y-auto bg-fundo p-4 lg:static lg:h-full lg:p-0">
              <PainelConta contaId={contaSel.id} aoFechar={() => setSelecionada(null)} />
            </div>
          ) : (
            <div className="rounded-[20px] bg-card shadow-card">
              <Vazio icone={IdCard} titulo="Escolha uma comanda" texto="Comandas individuais para bares: cada cliente com seu cartão ou pulseira numerada." />
            </div>
          )}
        </aside>
      </div>
      <Modal
        aberto={!!lancando}
        aoFechar={() => {
          if (lancando) descartarSeVazia(lancando.contaId);
          setLancando(null);
        }}
        titulo={`Comanda ${lancando?.numero} · novo pedido`}
        largura="xl"
      >
        {lancando && <Lancador contaId={lancando.contaId} titulo={`Comanda ${lancando.numero}`} totalAtual={0} aoEnviar={() => setLancando(null)} />}
      </Modal>
    </div>
  );
}
