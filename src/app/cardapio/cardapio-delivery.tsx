"use client";

import clsx from "clsx";
import { Bike, Clock, Moon, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarraCarrinho, CabecalhoCliente, CardapioCliente, ListaCarrinho, somaCarrinho, type LinhaCarrinho } from "@/components/cliente/cardapio-cliente";
import { brl } from "@/lib/dominio/calculos";
import type { FormaPagamentoOnline } from "@/lib/dominio/tipos";
import { pedidoOnline } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

const CHAVE_CLIENTE = "carlos:cliente-delivery";
type DadosCliente = { nome: string; telefone: string; rua: string; numero: string; bairroId: string; complemento: string; referencia: string };
const VAZIO: DadosCliente = { nome: "", telefone: "", rua: "", numero: "", bairroId: "", complemento: "", referencia: "" };

const campo = "w-full rounded-2xl border border-linha bg-fundo px-3.5 py-2.5 text-[14px] outline-none focus:border-acao";

/** Cardápio online próprio (delivery sem comissão de marketplace). */
export function CardapioDelivery() {
  const router = useRouter();
  const config = useLoja((e) => e.config);
  const bairros = useLoja((e) => e.bairros);
  const produtos = useLoja((e) => e.produtos);
  const [carrinho, setCarrinho] = useState<LinhaCarrinho[]>([]);
  const [etapa, setEtapa] = useState<null | "carrinho" | "dados">(null);
  const [retirada, setRetirada] = useState(false);
  const [dados, setDados] = useState<DadosCliente>(VAZIO);
  const [pagamento, setPagamento] = useState<FormaPagamentoOnline>("pix");
  const [troco, setTroco] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_CLIENTE);
      if (salvo) setDados({ ...VAZIO, ...JSON.parse(salvo) });
    } catch {}
  }, []);

  const qtd = carrinho.reduce((s, l) => s + l.qtd, 0);
  const soma = somaCarrinho(carrinho, produtos, true);
  const taxa = retirada ? 0 : (bairros.find((b) => b.id === dados.bairroId)?.taxa ?? 0);
  const faltaMinimo = Math.max(0, config.pedidoMinimo - soma);
  const set = (k: keyof DadosCliente) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDados((d) => ({ ...d, [k]: e.target.value }));

  function finalizar() {
    const tel = dados.telefone.replace(/\D/g, "");
    if (!dados.nome.trim() || tel.length < 10) return setErro("Informe seu nome e um telefone com DDD.");
    if (!retirada && (!dados.rua.trim() || !dados.numero.trim() || !dados.bairroId)) return setErro("Informe rua, número e bairro para a entrega.");
    if (faltaMinimo > 0) return setErro(`O pedido mínimo é ${brl(config.pedidoMinimo)}.`);
    try {
      localStorage.setItem(CHAVE_CLIENTE, JSON.stringify(dados));
    } catch {}
    const id = pedidoOnline({
      nome: dados.nome.trim(),
      telefone: tel,
      retirada,
      endereco: retirada ? undefined : { rua: dados.rua.trim(), numero: dados.numero.trim(), bairroId: dados.bairroId, complemento: dados.complemento.trim() || undefined, referencia: dados.referencia.trim() || undefined },
      itens: carrinho,
      pagamento,
      trocoPara: pagamento === "dinheiro" ? Number(troco.replace(",", ".")) || undefined : undefined,
      observacao: obs.trim() || undefined,
    });
    router.push(`/cardapio/pedido/${id}`);
  }

  return (
    <div className="min-h-dvh pb-28">
      <CabecalhoCliente
        titulo="Delivery"
        sub={
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {config.tempoEntrega} min · pedido mínimo {brl(config.pedidoMinimo)}
          </span>
        }
      />
      <main className="mx-auto max-w-[720px] px-4">
        {!config.deliveryAberto && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#FDF0D6] p-3 text-[13.5px] text-[#8A5A00]">
            <Moon size={20} />
            <span>
              <b>Estamos fechados agora.</b> Você pode olhar o cardápio, e os pedidos voltam assim que abrirmos.
            </span>
          </div>
        )}
        <CardapioCliente delivery carrinho={carrinho} setCarrinho={setCarrinho} somenteConsulta={!config.deliveryAberto} />
      </main>

      {!etapa && <BarraCarrinho qtd={qtd} valor={soma} rotulo="Ver sacola" onClick={() => setEtapa("carrinho")} />}

      {etapa && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(40,15,8,.5)] sm:items-center" onMouseDown={() => setEtapa(null)}>
          <div className="max-h-[92dvh] w-full max-w-[560px] overflow-y-auto rounded-t-[26px] bg-card p-4 sm:rounded-[26px]" onMouseDown={(e) => e.stopPropagation()}>
            {etapa === "carrinho" ? (
              <>
                <h3 className="font-slab text-[19px] font-extrabold text-marca">Sua sacola</h3>
                <ListaCarrinho carrinho={carrinho} setCarrinho={setCarrinho} delivery />
                <div className="mt-2 flex justify-between border-t border-linha pt-3 text-[15px] font-extrabold">
                  <span>Subtotal</span>
                  <span className="num">{brl(soma)}</span>
                </div>
                {faltaMinimo > 0 && <p className="mt-1 text-[12.5px] text-[#8A5A00]">Faltam {brl(faltaMinimo)} para o pedido mínimo.</p>}
                <button
                  onClick={() => setEtapa("dados")}
                  disabled={!carrinho.length || faltaMinimo > 0}
                  className="mt-3 flex min-h-14 w-full items-center justify-center rounded-full bg-acao font-bold text-white shadow-botao disabled:opacity-50"
                >
                  Continuar
                </button>
              </>
            ) : (
              <>
                <h3 className="font-slab text-[19px] font-extrabold text-marca">Entrega e pagamento</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { v: false, r: "Entregar", i: Bike },
                    { v: true, r: "Retirar no local", i: Store },
                  ].map((o) => (
                    <button
                      key={o.r}
                      onClick={() => setRetirada(o.v)}
                      className={clsx("flex min-h-12 items-center justify-center gap-2 rounded-2xl border-[1.5px] text-[13.5px] font-bold", retirada === o.v ? "border-acao bg-rosado text-acao" : "border-linha")}
                    >
                      <o.i size={18} /> {o.r}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2">
                  <input className={campo} placeholder="Seu nome" value={dados.nome} onChange={set("nome")} autoComplete="name" />
                  <input className={campo} placeholder="WhatsApp com DDD" inputMode="tel" value={dados.telefone} onChange={set("telefone")} autoComplete="tel" />
                  {!retirada && (
                    <>
                      <div className="grid grid-cols-[1fr_96px] gap-2">
                        <input className={campo} placeholder="Rua" value={dados.rua} onChange={set("rua")} autoComplete="address-line1" />
                        <input className={campo} placeholder="Nº" value={dados.numero} onChange={set("numero")} />
                      </div>
                      <select className={campo} value={dados.bairroId} onChange={set("bairroId")} aria-label="Bairro">
                        <option value="">Bairro</option>
                        {bairros.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nome} · taxa {brl(b.taxa)}
                          </option>
                        ))}
                      </select>
                      <input className={campo} placeholder="Complemento (opcional)" value={dados.complemento} onChange={set("complemento")} />
                      <input className={campo} placeholder="Ponto de referência (opcional)" value={dados.referencia} onChange={set("referencia")} />
                    </>
                  )}
                </div>
                <p className="mt-4 text-[13px] font-bold">Pagamento</p>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["pix", "Pix"],
                      ["dinheiro", "Dinheiro"],
                      ["cartao", retirada ? "Cartão" : "Cartão na entrega"],
                    ] as const
                  ).map(([v, r]) => (
                    <button
                      key={v}
                      onClick={() => setPagamento(v)}
                      className={clsx("min-h-11 rounded-2xl border-[1.5px] px-1 text-[12.5px] font-bold", pagamento === v ? "border-acao bg-rosado text-acao" : "border-linha")}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {pagamento === "dinheiro" && <input className={clsx(campo, "mt-2")} placeholder="Troco para quanto? (opcional)" inputMode="decimal" value={troco} onChange={(e) => setTroco(e.target.value)} />}
                {pagamento === "pix" && <p className="mt-1.5 text-[12px] text-mudo">O QR Code do Pix aparece na próxima tela, com o valor certo.</p>}
                <textarea className={clsx(campo, "mt-2")} rows={2} placeholder="Observação do pedido (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} />

                <dl className="mt-3 space-y-1 border-t border-linha pt-3 text-[13.5px]">
                  <div className="flex justify-between text-mudo">
                    <dt>Subtotal</dt>
                    <dd className="num">{brl(soma)}</dd>
                  </div>
                  <div className="flex justify-between text-mudo">
                    <dt>Taxa de entrega</dt>
                    <dd className="num">{retirada ? "Grátis" : dados.bairroId ? brl(taxa) : "Escolha o bairro"}</dd>
                  </div>
                  <div className="flex justify-between text-[16px] font-extrabold">
                    <dt>Total</dt>
                    <dd className="num">{brl(soma + taxa)}</dd>
                  </div>
                </dl>
                {erro && <p className="mt-2 rounded-xl bg-rosado p-2 text-[12.5px] font-semibold text-acao">{erro}</p>}
                <button onClick={finalizar} className="mt-3 flex min-h-14 w-full items-center justify-center rounded-full bg-acao font-bold text-white shadow-botao">
                  Fazer pedido · <span className="num ml-1">{brl(soma + taxa)}</span>
                </button>
                <button onClick={() => setEtapa("carrinho")} className="mt-2 w-full py-2 text-[13px] font-semibold text-mudo">
                  Voltar para a sacola
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
