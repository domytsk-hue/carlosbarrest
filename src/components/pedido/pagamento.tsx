"use client";

import clsx from "clsx";
import { Banknote, CreditCard, QrCode, Ticket, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { arred, brl, pago, restante, total } from "@/lib/dominio/calculos";
import type { Conta, TipoPagamento } from "@/lib/dominio/tipos";
import { pagar } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";
import { Botao, EntradaValor, Modal } from "../ui";
import { PagamentoExtra } from "./pagamento-extra";

const ICONE: Record<TipoPagamento, React.ElementType> = {
  dinheiro: Banknote,
  pix: QrCode,
  credito: CreditCard,
  debito: CreditCard,
  voucher: Ticket,
  credito_cliente: Wallet,
  fiado: Wallet,
};

/** Recebimento: total, parcial (dividir por pessoas), troco e várias formas na mesma conta. */
export function PagamentoModal({ conta, aberto, aoFechar, aoQuitar }: { conta: Conta; aberto: boolean; aoFechar: () => void; aoQuitar?: () => void }) {
  const formas = useLoja((e) => e.formasPagamento.filter((f) => f.ativo));
  const sessaoAtiva = useLoja((e) => e.sessaoAtivaId);
  const devido = restante(conta);
  const [formaId, setFormaId] = useState(formas[0]?.id);
  const [valor, setValor] = useState(devido);
  const [pessoas, setPessoas] = useState(1);
  const [chave, setChave] = useState(0);

  useEffect(() => {
    if (aberto) {
      setValor(devido);
      setPessoas(1);
      setChave((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, conta.id]);

  const forma = formas.find((f) => f.id === formaId);
  const troco = forma?.tipo === "dinheiro" && valor > devido ? arred(valor - devido) : 0;

  function dividir(n: number) {
    setPessoas(n);
    setValor(arred(devido / n));
    setChave((k) => k + 1);
  }

  function confirmar(extra?: { referencia?: string }) {
    if (!formaId || valor <= 0) return;
    const quitou = valor >= devido - 0.009;
    pagar(conta.id, formaId, valor, extra);
    if (quitou) {
      aoFechar();
      aoQuitar?.();
    } else {
      setValor(arred(devido - valor));
      setChave((k) => k + 1);
    }
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={`Receber · Conta ${conta.numero}`}>
      {!sessaoAtiva && <p className="mb-3 rounded-2xl bg-[#FDF0D6] p-3 text-[12.5px] font-semibold text-[#8A5A00]">Nenhum caixa aberto neste aparelho. O pagamento será registrado, mas não entra em nenhum caixa.</p>}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-card p-3 text-center shadow-card">
        <div>
          <p className="text-[11px] font-semibold text-mudo">Total</p>
          <p className="num text-[16px] font-extrabold">{brl(total(conta))}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-mudo">Pago</p>
          <p className="num text-[16px] font-extrabold text-ok">{brl(pago(conta))}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-mudo">Restante</p>
          <p className="num text-[16px] font-extrabold text-acao">{brl(devido)}</p>
        </div>
      </div>

      <p className="mb-2 mt-4 text-[12.5px] font-semibold">Forma de pagamento</p>
      <div className="grid grid-cols-3 gap-2">
        {formas.map((f) => {
          const Icone = ICONE[f.tipo];
          return (
            <button
              key={f.id}
              onClick={() => setFormaId(f.id)}
              className={clsx("flex flex-col items-center gap-1 rounded-2xl border-[1.5px] bg-card p-2.5 text-[12.5px] font-semibold", f.id === formaId ? "border-acao bg-rosado text-acao" : "border-linha")}
            >
              <Icone size={20} />
              {f.nome}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold">Valor recebido</span>
          <EntradaValor key={chave} valor={valor} aoMudar={setValor} className="text-[20px] font-extrabold" />
        </label>
        <div>
          <span className="mb-1.5 flex items-center gap-1 text-[12.5px] font-semibold">
            <Users size={14} /> Dividir
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => dividir(n)} className={clsx("h-11 w-9 rounded-xl text-[13px] font-bold", n === pessoas ? "bg-acao text-white" : "bg-secundario")}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
      {troco > 0 && (
        <p className="mt-3 rounded-2xl bg-[#E5F4EA] p-3 text-[15px] font-bold text-[#1E7A41]">
          Troco: <span className="num">{brl(troco)}</span>
        </p>
      )}

      {forma && <PagamentoExtra conta={conta} tipo={forma.tipo} valor={Math.min(valor, devido)} aoConfirmar={(ref) => confirmar({ referencia: ref })} />}

      <Botao variante="ok" tamanho="lg" className="mt-4 w-full" disabled={valor <= 0} onClick={() => confirmar()}>
        {valor >= devido - 0.009 ? "Receber e fechar conta" : `Receber parcial de ${brl(valor)}`}
      </Botao>
    </Modal>
  );
}
