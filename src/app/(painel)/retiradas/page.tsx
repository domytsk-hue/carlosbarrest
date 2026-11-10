"use client";

import clsx from "clsx";
import { CheckCheck, PackageCheck, RotateCcw } from "lucide-react";
import { useState } from "react";
import { PainelConta } from "@/components/pedido/painel-conta";
import { Botao, Pilula, Titulo, useRelogio, Vazio } from "@/components/ui";
import { brl, diaLocal, duracao, hora, itensValidos, restante, total } from "@/lib/dominio/calculos";
import { nomeConta } from "@/lib/dominio/rotulos";
import type { Conta } from "@/lib/dominio/tipos";
import { marcarRetirado } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

type Etapa = "preparo" | "pronto" | "retirado";

/** Pedido que o cliente vem buscar: balcão para viagem e cardápio online com retirada. */
const ehRetirada = (c: Conta) => !!c.paraViagem && (c.canal === "balcao" || c.canal === "delivery");

function etapa(c: Conta): Etapa {
  if (c.retiradoEm) return "retirado";
  const itens = itensValidos(c);
  return itens.length && itens.every((i) => i.preparo === "pronto" || i.preparo === "entregue") ? "pronto" : "preparo";
}

/**
 * Retiradas: acompanha os pedidos para o cliente buscar no balcão, do preparo
 * até a entrega na mão do cliente. O fluxo detalhado ainda será combinado com o restaurante.
 */
export default function RetiradasPage() {
  const mesas = useLoja((e) => e.mesas);
  const hoje = diaLocal();
  const contas = useLoja((e) =>
    e.contas.filter((c) => ehRetirada(c) && c.status !== "cancelada" && (c.status === "aberta" || c.status === "fechamento" || diaLocal(new Date(c.abertaEm)) === hoje)),
  );
  const agora = useRelogio();
  const [sel, setSel] = useState<string | null>(null);
  const contaSel = contas.find((c) => c.id === sel);

  const colunas: { id: Etapa; rotulo: string }[] = [
    { id: "preparo", rotulo: "Em preparo" },
    { id: "pronto", rotulo: "Pronto para retirar" },
    { id: "retirado", rotulo: "Retirados hoje" },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <Titulo sub="Pedidos para o cliente buscar no balcão (para viagem e cardápio online com retirada)">Retiradas</Titulo>
      <div className="grid gap-4 lg:grid-cols-[1fr_var(--painel-direito)]">
        <div className="grid content-start gap-4 md:grid-cols-3">
          {colunas.map((col) => {
            const lista = contas.filter((c) => etapa(c) === col.id).sort((a, b) => a.abertaEm.localeCompare(b.abertaEm));
            return (
              <section key={col.id}>
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-mudo">
                  {col.rotulo} · {lista.length}
                </h2>
                <div className="space-y-2">
                  {lista.map((c) => {
                    const falta = restante(c);
                    return (
                      <div
                        key={c.id}
                        className={clsx(
                          "rounded-[18px] border-l-[5px] bg-card p-3 shadow-card",
                          col.id === "preparo" && "border-l-st-preparo",
                          col.id === "pronto" && "border-l-ok",
                          col.id === "retirado" && "border-l-linha opacity-75",
                          c.id === sel && "ring-2 ring-acao",
                        )}
                      >
                        <button onClick={() => setSel(c.id)} className="w-full text-left">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[15px] font-extrabold">{nomeConta(c, mesas)}</span>
                            {falta > 0 ? <Pilula cor="amarela">A pagar</Pilula> : <Pilula cor="verde">Pago</Pilula>}
                          </div>
                          <p className="truncate text-[12.5px] text-mudo">{c.clienteNome ?? "Cliente não identificado"}</p>
                          <div className="mt-1.5 flex items-end justify-between">
                            <span className="text-[11.5px] text-mudo">{c.retiradoEm ? `retirado às ${hora(c.retiradoEm)}` : duracao(c.abertaEm, agora)}</span>
                            <span className="num text-[14px] font-bold text-acao">{brl(total(c))}</span>
                          </div>
                        </button>
                        {col.id === "pronto" && (
                          <Botao variante="ok" tamanho="sm" className="mt-2 w-full" onClick={() => marcarRetirado(c.id)}>
                            <CheckCheck size={15} /> Cliente retirou
                          </Botao>
                        )}
                        {col.id === "retirado" && (
                          <button onClick={() => marcarRetirado(c.id, false)} className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-mudo">
                            <RotateCcw size={12} /> Desfazer
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {!lista.length && <p className="rounded-[18px] border border-dashed border-linha p-4 text-center text-[12.5px] text-mudo">Nada aqui.</p>}
                </div>
              </section>
            );
          })}
        </div>
        <aside className={clsx("lg:sticky lg:top-28 lg:h-[calc(100dvh-150px)]", !contaSel && "hidden lg:block")}>
          {contaSel ? (
            <div className="fixed inset-0 z-40 overflow-y-auto bg-fundo p-4 lg:static lg:h-full lg:p-0">
              <PainelConta contaId={contaSel.id} aoFechar={() => setSel(null)} semAcoes={["servico"]} />
            </div>
          ) : (
            <div className="rounded-[20px] bg-card shadow-card">
              <Vazio icone={PackageCheck} titulo="Escolha um pedido" texto="Novos pedidos para viagem entram pelo Balcão; os do cardápio online com retirada entram sozinhos." />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
