"use client";

import clsx from "clsx";
import { Check, MessageCircle } from "lucide-react";
import { Botao, Cartao, Pilula, Titulo } from "@/components/ui";
import { brl } from "@/lib/dominio/calculos";

const SUPORTE = process.env.NEXT_PUBLIC_SUPORTE_URL;

type Plano = { id: string; nome: string; preco: number; para: string; itens: string[]; destaque?: boolean };

const PLANOS: Plano[] = [
  {
    id: "essencial",
    nome: "Essencial",
    preco: 129,
    para: "Bar ou lanchonete com um caixa",
    itens: ["Mesas, comandas, balcão e PDV", "Caixa com sangria e fechamento", "Cardápio online e pedido por QR Code", "Relatórios de vendas", "1 terminal de caixa"],
  },
  {
    id: "completo",
    nome: "Completo",
    preco: 229,
    para: "Restaurante com cozinha e delivery",
    destaque: true,
    itens: ["Tudo do Essencial", "Monitor da cozinha e app do garçom", "Estoque com ficha técnica e XML", "Contas a pagar/receber e DRE", "Promoções, cupons e combos", "Até 3 terminais de caixa"],
  },
  {
    id: "rede",
    nome: "Integrado",
    preco: 349,
    para: "Operação com marketplaces e nota fiscal",
    itens: ["Tudo do Completo", "iFood e aiqfome no mesmo painel", "NFC-e e maquininha integrada", "Chatbot no WhatsApp", "Terminais ilimitados", "Treinamento ao vivo da equipe"],
  },
];

export default function AssinaturaPage() {
  const atual = "completo";
  return (
    <div className="mx-auto max-w-[1100px]">
      <Titulo sub="Planos mensais, sem fidelidade e sem taxa por pedido">Assinatura</Titulo>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANOS.map((p) => (
          <div key={p.id} className={clsx("flex flex-col rounded-[22px] bg-card p-5 shadow-card", p.destaque && "ring-2 ring-acao")}>
            <div className="flex items-center justify-between">
              <h2 className="font-slab text-[20px] font-extrabold text-marca">{p.nome}</h2>
              {p.id === atual ? <Pilula cor="verde">Seu plano</Pilula> : p.destaque ? <Pilula cor="laranja">Mais escolhido</Pilula> : null}
            </div>
            <p className="text-[12.5px] text-mudo">{p.para}</p>
            <p className="mt-3">
              <span className="num text-[30px] font-extrabold">{brl(p.preco)}</span>
              <span className="text-[13px] text-mudo"> /mês</span>
            </p>
            <ul className="mt-3 flex-1 space-y-1.5 text-[13.5px]">
              {p.itens.map((i) => (
                <li key={i} className="flex gap-2">
                  <Check size={17} className="mt-0.5 shrink-0 text-ok" /> {i}
                </li>
              ))}
            </ul>
            {p.id === atual ? (
              <Botao variante="secundario" disabled className="mt-4">
                Plano atual
              </Botao>
            ) : SUPORTE ? (
              <a href={`${SUPORTE}${SUPORTE.includes("?") ? "&" : "?"}text=${encodeURIComponent(`Quero mudar para o plano ${p.nome}`)}`} target="_blank" rel="noreferrer" className="mt-4">
                <Botao variante={p.destaque ? "primario" : "secundario"} className="w-full">
                  Mudar para {p.nome}
                </Botao>
              </a>
            ) : (
              <Botao variante="secundario" disabled className="mt-4">
                Fale com o suporte
              </Botao>
            )}
          </div>
        ))}
      </div>
      <Cartao className="mt-5">
        <div className="flex flex-wrap items-center gap-3">
          <MessageCircle size={26} className="text-acao" />
          <p className="flex-1 text-[13.5px]">
            Valores de referência para o lançamento. A cobrança recorrente (cartão ou boleto) entra quando o sistema for oferecido para outros restaurantes; o Carlo&apos;s usa o plano completo.
          </p>
        </div>
      </Cartao>
    </div>
  );
}
