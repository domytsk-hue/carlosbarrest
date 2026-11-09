"use client";

import clsx from "clsx";
import { Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { brl, duracao, total } from "@/lib/dominio/calculos";
import type { Conta } from "@/lib/dominio/tipos";
import { descartarSeVazia } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";
import { Botao, Modal, Pilula, Titulo, useRelogio, Vazio } from "../ui";
import { Lancador } from "./lancador";
import { NovoPedido, type TipoPedido } from "./novo-pedido";
import { nomeConta, PainelConta } from "./painel-conta";

/** Tela de pedidos sem mesa (Balcão): lista à esquerda, conta selecionada à direita. */
export function TelaPedidos({ titulo, sub, filtro, tipoInicial }: { titulo: string; sub: string; filtro: (c: Conta) => boolean; tipoInicial: TipoPedido }) {
  const mesas = useLoja((e) => e.mesas);
  const contas = useLoja((e) => e.contas.filter((c) => (c.status === "aberta" || c.status === "fechamento") && filtro(c)));
  const todas = useLoja((e) => e.contas);
  const agora = useRelogio();
  const [sel, setSel] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [lancando, setLancando] = useState<string | null>(null);
  const contaSel = todas.find((c) => c.id === sel && (c.status === "aberta" || c.status === "fechamento"));

  return (
    <div className="mx-auto max-w-[1400px]">
      <Titulo
        sub={sub}
        acoes={
          <Botao onClick={() => setNovo(true)}>
            <Plus size={18} /> Novo pedido
          </Botao>
        }
      >
        {titulo}
      </Titulo>
      <div className="grid gap-4 lg:grid-cols-[1fr_480px]">
        <div className="grid content-start gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {contas.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)} className={clsx("rounded-[18px] border-l-[5px] border-l-acao bg-card p-3.5 text-left shadow-card", c.id === sel && "ring-2 ring-acao")}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-extrabold">{nomeConta(c, mesas)}</span>
                {c.paraViagem && <Pilula cor="azul">Viagem</Pilula>}
              </div>
              <p className="truncate text-[12.5px] text-mudo">{c.clienteNome ?? "Cliente não identificado"}</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-[11.5px] text-mudo">{duracao(c.abertaEm, agora)}</span>
                <span className="num text-[15px] font-bold text-acao">{brl(total(c))}</span>
              </div>
            </button>
          ))}
          {!contas.length && (
            <div className="col-span-full rounded-[20px] bg-card shadow-card">
              <Vazio icone={ShoppingBag} titulo="Nenhum pedido em aberto" texto="Comece um pedido para retirada no balcão, para viagem ou para entrega.">
                <Botao onClick={() => setNovo(true)}>
                  <Plus size={18} /> Novo pedido
                </Botao>
              </Vazio>
            </div>
          )}
        </div>
        <aside className={clsx("lg:sticky lg:top-28 lg:h-[calc(100dvh-150px)]", !contaSel && "hidden lg:block")}>
          {contaSel && (
            <div className="fixed inset-0 z-40 overflow-y-auto bg-fundo p-4 lg:static lg:h-full lg:p-0">
              <PainelConta contaId={contaSel.id} aoFechar={() => setSel(null)} semAcoes={["servico"]} />
            </div>
          )}
        </aside>
      </div>

      <Modal aberto={novo} aoFechar={() => setNovo(false)} titulo="Novo pedido">
        <NovoPedido
          tipoInicial={tipoInicial}
          aoCriar={(id) => {
            setNovo(false);
            setSel(id);
            setLancando(id);
          }}
        />
      </Modal>
      <Modal
        aberto={!!lancando}
        aoFechar={() => {
          if (lancando) descartarSeVazia(lancando);
          setLancando(null);
        }}
        titulo="Lançar produtos"
        largura="xl"
      >
        {lancando && <Lancador contaId={lancando} titulo="Pedido" totalAtual={0} aoEnviar={() => setLancando(null)} />}
      </Modal>
    </div>
  );
}
