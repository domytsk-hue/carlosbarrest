"use client";

import clsx from "clsx";
import { BellRing, Check, ChefHat, Receipt, Send, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { BarraCarrinho, CabecalhoCliente, CardapioCliente, ListaCarrinho, somaCarrinho, type LinhaCarrinho } from "@/components/cliente/cardapio-cliente";
import { PixQR } from "@/components/pedido/pagamento-extra";
import { brl, itensValidos, pago, restante, subtotal, total, valorServico } from "@/lib/dominio/calculos";
import type { StatusPreparo } from "@/lib/dominio/tipos";
import { chamar, contaDaMesa, pedidoQrCode } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

const PREPARO: Record<StatusPreparo, { r: string; c: string }> = {
  pendente: { r: "Na fila", c: "bg-st-novo/20 text-[#8A5A00]" },
  preparo: { r: "Preparando", c: "bg-st-preparo/15 text-st-preparo" },
  pronto: { r: "Pronto", c: "bg-st-pronto/15 text-st-pronto" },
  entregue: { r: "Servido", c: "bg-secundario text-mudo" },
};

export function MesaCliente({ numero }: { numero: number }) {
  const mesa = useLoja((e) => e.mesas.find((m) => m.numero === numero));
  const conta = useLoja((e) => (mesa ? contaDaMesa(e, mesa.id) : undefined));
  const produtos = useLoja((e) => e.produtos);
  const permitePedir = useLoja((e) => e.config.qrPedidos);
  const chamados = useLoja((e) => e.chamados.filter((c) => c.mesaId === mesa?.id && !c.atendidoEm));
  const [aba, setAba] = useState<"cardapio" | "conta">("cardapio");
  const [carrinho, setCarrinho] = useState<LinhaCarrinho[]>([]);
  const [revisando, setRevisando] = useState(false);
  const [enviado, setEnviado] = useState<number | null>(null);

  if (!mesa)
    return (
      <div className="min-h-dvh">
        <CabecalhoCliente titulo="Cardápio digital" />
        <p className="mx-auto max-w-[720px] p-6 text-center text-mudo">Mesa {Number.isFinite(numero) ? numero : ""} não encontrada. Peça ajuda ao garçom.</p>
      </div>
    );

  const qtd = carrinho.reduce((s, l) => s + l.qtd, 0);
  const soma = somaCarrinho(carrinho, produtos, false);
  const chamouGarcom = chamados.some((c) => c.motivo === "garcom");
  const pediuConta = chamados.some((c) => c.motivo === "conta") || conta?.status === "fechamento";

  function enviar() {
    const n = pedidoQrCode(
      mesa!.id,
      carrinho.map(({ produtoId, qtd, obs }) => ({ produtoId, qtd, obs })),
    );
    setCarrinho([]);
    setRevisando(false);
    setEnviado(n);
    setTimeout(() => setEnviado(null), 5000);
  }

  return (
    <div className="min-h-dvh pb-28">
      <CabecalhoCliente
        titulo={`Mesa ${mesa.numero}`}
        sub={permitePedir ? "Peça por aqui, a gente leva até você" : "Cardápio digital"}
        direita={
          <div className="flex rounded-full bg-secundario p-0.5 text-[12.5px] font-bold">
            {(["cardapio", "conta"] as const).map((a) => (
              <button key={a} onClick={() => setAba(a)} className={clsx("rounded-full px-3 py-1.5", aba === a ? "bg-card text-acao shadow-card" : "text-mudo")}>
                {a === "cardapio" ? "Cardápio" : "Conta"}
              </button>
            ))}
          </div>
        }
      />

      <main className="mx-auto max-w-[720px] px-4">
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => chamar(mesa.id, "garcom")}
            disabled={chamouGarcom}
            className={clsx("flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[13.5px] font-bold", chamouGarcom ? "bg-st-pronto/15 text-st-pronto" : "bg-card text-tinta shadow-card")}
          >
            {chamouGarcom ? <Check size={18} /> : <BellRing size={18} className="text-acao" />}
            {chamouGarcom ? "Garçom a caminho" : "Chamar garçom"}
          </button>
          <button
            onClick={() => (chamar(mesa.id, "conta"), setAba("conta"))}
            disabled={pediuConta || !conta}
            className={clsx("flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[13.5px] font-bold disabled:opacity-60", pediuConta ? "bg-st-pronto/15 text-st-pronto" : "bg-card text-tinta shadow-card")}
          >
            {pediuConta ? <Check size={18} /> : <Receipt size={18} className="text-acao" />}
            {pediuConta ? "Conta pedida" : "Pedir a conta"}
          </button>
        </div>

        {enviado && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-st-pronto/15 p-3 text-[13.5px] font-semibold text-st-pronto">
            <ChefHat size={18} /> Pedido {enviado} enviado para a cozinha. Acompanhe na aba Conta.
          </div>
        )}

        {aba === "cardapio" ? (
          <CardapioCliente delivery={false} carrinho={carrinho} setCarrinho={setCarrinho} somenteConsulta={!permitePedir} />
        ) : (
          <section className="mt-4 rounded-[20px] bg-card p-4 shadow-card">
            {!conta || !itensValidos(conta).length ? (
              <div className="py-8 text-center text-mudo">
                <UtensilsCrossed className="mx-auto mb-2 text-acao/60" />
                Nenhum pedido nesta mesa ainda.
              </div>
            ) : (
              <>
                <h2 className="mb-2 font-slab text-[18px] font-extrabold text-marca">Sua conta</h2>
                <ul className="divide-y divide-linha">
                  {itensValidos(conta).map((i) => (
                    <li key={i.id} className="flex items-center gap-2 py-2 text-[13.5px]">
                      <span className="num w-7 font-bold">{i.qtd}×</span>
                      <span className="min-w-0 flex-1">
                        {i.nome}
                        {i.obs && <span className="block text-[11.5px] text-mudo">{i.obs}</span>}
                      </span>
                      <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-bold", PREPARO[i.preparo].c)}>{PREPARO[i.preparo].r}</span>
                      <span className="num w-20 text-right">{brl(i.preco * i.qtd)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 space-y-1 border-t border-linha pt-3 text-[13.5px]">
                  <Linha r="Subtotal" v={subtotal(conta)} />
                  {conta.servicoPct > 0 && <Linha r={`Serviço (${conta.servicoPct}%) opcional`} v={valorServico(conta)} />}
                  {conta.desconto > 0 && <Linha r="Desconto" v={-conta.desconto} />}
                  <Linha r="Total" v={total(conta)} forte />
                  {pago(conta) > 0 && <Linha r="Já pago" v={-pago(conta)} />}
                </dl>
                {restante(conta) > 0.009 && (
                  <>
                    <PixQR conta={conta} valor={restante(conta)} semBotao />
                    <p className="mt-2 text-center text-[12px] text-mudo">Pagou no Pix? Mostre o comprovante ao garçom. Também aceitamos cartão e dinheiro na mesa.</p>
                  </>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {aba === "cardapio" && <BarraCarrinho qtd={qtd} valor={soma} rotulo="Ver pedido" onClick={() => setRevisando(true)} />}

      {revisando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(40,15,8,.5)] sm:items-center" onMouseDown={() => setRevisando(false)}>
          <div className="max-h-[85dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[26px] bg-card p-4 sm:rounded-[26px]" onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="font-slab text-[19px] font-extrabold text-marca">Seu pedido · Mesa {mesa.numero}</h3>
            <ListaCarrinho carrinho={carrinho} setCarrinho={setCarrinho} delivery={false} />
            <button
              onClick={enviar}
              disabled={!carrinho.length}
              className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-acao font-bold text-white shadow-botao disabled:opacity-50"
            >
              <Send size={18} /> Enviar pedido · <span className="num">{brl(soma)}</span>
            </button>
            <button onClick={() => setRevisando(false)} className="mt-2 w-full py-2 text-[13px] font-semibold text-mudo">
              Continuar escolhendo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ r, v, forte }: { r: string; v: number; forte?: boolean }) {
  return (
    <div className={clsx("flex justify-between", forte ? "text-[16px] font-extrabold" : "text-mudo")}>
      <dt>{r}</dt>
      <dd className="num">{brl(v)}</dd>
    </div>
  );
}
