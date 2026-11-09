"use client";

import clsx from "clsx";
import { Bike, Check, ChefHat, MessageCircle, PackageCheck, Store, ThumbsUp, XCircle } from "lucide-react";
import Link from "next/link";
import { CabecalhoCliente } from "@/components/cliente/cardapio-cliente";
import { PixQR } from "@/components/pedido/pagamento-extra";
import { brl, hora, itensValidos, restante, subtotal, total } from "@/lib/dominio/calculos";
import type { StatusEntrega } from "@/lib/dominio/tipos";
import { useLoja } from "@/lib/loja/loja";

/** Acompanhamento do pedido online pelo cliente, atualizado em tempo real. */
export function AcompanharPedido({ id }: { id: string }) {
  const conta = useLoja((e) => e.contas.find((c) => c.id === id));
  const bairros = useLoja((e) => e.bairros);
  const config = useLoja((e) => e.config);

  if (!conta)
    return (
      <div className="min-h-dvh">
        <CabecalhoCliente titulo="Seu pedido" />
        <div className="mx-auto max-w-[720px] p-6 text-center text-mudo">
          Pedido não encontrado.{" "}
          <Link href="/cardapio" className="font-bold text-acao underline">
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    );

  const retirada = conta.paraViagem;
  const etapas: { s: StatusEntrega; r: string; i: React.ElementType }[] = [
    { s: "novo", r: "Pedido recebido", i: Check },
    { s: "confirmado", r: "Aceito pelo restaurante", i: ThumbsUp },
    { s: "preparo", r: "Em preparo", i: ChefHat },
    { s: "pronto", r: retirada ? "Pronto para retirar" : "Pronto", i: PackageCheck },
    ...(retirada ? [] : [{ s: "saiu" as StatusEntrega, r: "Saiu para entrega", i: Bike }]),
    { s: "entregue", r: retirada ? "Retirado" : "Entregue", i: retirada ? Store : Check },
  ];
  const atual = etapas.findIndex((x) => x.s === (conta.statusEntrega ?? "novo"));
  const cancelado = conta.status === "cancelada";
  const falta = restante(conta);
  const zap = config.whatsapp.replace(/\D/g, "");

  return (
    <div className="min-h-dvh pb-10">
      <CabecalhoCliente titulo={`Pedido #${conta.numero}`} sub={`Feito às ${hora(conta.abertaEm)} · ${conta.clienteNome ?? ""}`} />
      <main className="mx-auto grid max-w-[720px] gap-3 px-4 pt-3">
        <section className="rounded-[20px] bg-card p-4 shadow-card">
          {cancelado ? (
            <p className="flex items-center gap-2 font-bold text-st-cancelado">
              <XCircle size={20} /> Pedido cancelado. Fale com a gente se tiver dúvida.
            </p>
          ) : (
            <ol className="relative">
              {etapas.map((x, k) => {
                const feito = k <= atual;
                return (
                  <li key={x.s} className="flex items-center gap-3 py-1.5">
                    <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-full", feito ? "bg-acao text-white" : "bg-secundario text-mudo", k === atual && "ring-4 ring-rosado-forte")}>
                      <x.i size={17} />
                    </span>
                    <span className={clsx("text-[14px]", feito ? "font-bold" : "text-mudo", k === atual && "text-acao")}>{x.r}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {!cancelado && atual < etapas.length - 1 && (
            <p className="mt-2 text-[12.5px] text-mudo">Tempo estimado: {config.tempoEntrega} min. Esta tela atualiza sozinha.</p>
          )}
        </section>

        {conta.pagamentoOnline === "pix" && falta > 0.009 && !cancelado && <PixQR conta={conta} valor={falta} semBotao />}
        {conta.pagamentos.length > 0 && falta <= 0.009 && (
          <p className="flex items-center gap-2 rounded-2xl bg-st-pronto/15 p-3 text-[13.5px] font-semibold text-st-pronto">
            <Check size={18} /> Pagamento confirmado
          </p>
        )}

        <section className="rounded-[20px] bg-card p-4 shadow-card">
          <h2 className="mb-2 font-slab text-[17px] font-extrabold text-marca">Resumo</h2>
          <ul className="divide-y divide-linha text-[13.5px]">
            {itensValidos(conta).map((i) => (
              <li key={i.id} className="flex gap-2 py-1.5">
                <span className="num w-7 font-bold">{i.qtd}×</span>
                <span className="flex-1">
                  {i.nome}
                  {i.obs && <span className="block text-[11.5px] text-mudo">{i.obs}</span>}
                </span>
                <span className="num">{brl(i.preco * i.qtd)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-1 border-t border-linha pt-2 text-[13.5px]">
            <div className="flex justify-between text-mudo">
              <dt>Subtotal</dt>
              <dd className="num">{brl(subtotal(conta))}</dd>
            </div>
            {!retirada && (
              <div className="flex justify-between text-mudo">
                <dt>Entrega</dt>
                <dd className="num">{brl(conta.taxaEntrega)}</dd>
              </div>
            )}
            <div className="flex justify-between text-[16px] font-extrabold">
              <dt>Total</dt>
              <dd className="num">{brl(total(conta))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12.5px] text-mudo">
            {retirada
              ? `Retirada em ${config.endereco}`
              : `Entrega em ${conta.endereco?.rua}, ${conta.endereco?.numero}${conta.endereco?.complemento ? ` (${conta.endereco.complemento})` : ""} · ${bairros.find((b) => b.id === conta.endereco?.bairroId)?.nome ?? ""}`}
          </p>
          {conta.observacao && <p className="mt-1 text-[12.5px] text-mudo">{conta.observacao}</p>}
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/cardapio" className="flex min-h-12 items-center justify-center rounded-full bg-secundario text-[13.5px] font-bold">
            Fazer outro pedido
          </Link>
          {zap ? (
            <a
              href={`https://wa.me/55${zap}?text=${encodeURIComponent(`Olá! Sobre o meu pedido #${conta.numero}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ok text-[13.5px] font-bold text-white"
            >
              <MessageCircle size={17} /> WhatsApp
            </a>
          ) : (
            <span />
          )}
        </div>
      </main>
    </div>
  );
}
