"use client";

import clsx from "clsx";
import { Banknote, Calculator, CreditCard, QrCode, Ticket, UserPlus, Users, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { arred, brl, pago, restante, servicoSugerido, total, totalSemServico, valorServico } from "@/lib/dominio/calculos";
import { saldoFiado } from "@/lib/dominio/fiado";
import type { Conta, TipoPagamento } from "@/lib/dominio/tipos";
import { cadastrarClienteFiado, definirComissao, pagar } from "@/lib/loja/acoes";
import { emitirNfce } from "@/lib/loja/acoes-integracoes";
import { obterEstado, useLoja } from "@/lib/loja/loja";
import { Botao, Entrada, EntradaValor, Modal } from "../ui";
import { Calculadora } from "./calculadora";
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
  const [calc, setCalc] = useState(false);
  const [clienteFiado, setClienteFiado] = useState<string | undefined>(conta.clienteId);

  useEffect(() => {
    if (aberto) {
      setValor(devido);
      setPessoas(1);
      setChave((k) => k + 1);
      setCalc(false);
      setClienteFiado(conta.clienteId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, conta.id]);

  const forma = formas.find((f) => f.id === formaId);
  const ehFiado = forma?.tipo === "fiado";
  const temComissao = conta.servicoPct > 0 || conta.servicoValor !== undefined;

  /** Muda a comissão e já ajusta o valor a receber para o novo total. */
  function mudarComissao(v: number | undefined) {
    definirComissao(conta.id, v);
    const nova = v === undefined ? servicoSugerido(conta) : arred(Math.max(0, v));
    setValor(arred(Math.max(0, totalSemServico(conta) + nova - pago(conta))));
    setPessoas(1);
    setChave((k) => k + 1);
  }
  const troco = forma?.tipo === "dinheiro" && valor > devido ? arred(valor - devido) : 0;

  function dividir(n: number) {
    setPessoas(n);
    setValor(arred(devido / n));
    setChave((k) => k + 1);
  }

  function confirmar(extra?: { referencia?: string }) {
    if (!formaId || valor <= 0) return;
    if (ehFiado && !clienteFiado) return;
    const quitou = valor >= devido - 0.009;
    pagar(conta.id, formaId, valor, extra, ehFiado ? clienteFiado : undefined);
    if (quitou && obterEstado().config.fiscal.automatica) emitirNfce(conta.id);
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
      {temComissao && <Comissao conta={conta} aoMudar={mudarComissao} />}

      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-card p-3 text-center shadow-card">
        <div>
          <p className="text-[11px] font-semibold text-mudo">Total a pagar</p>
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

      {ehFiado && <ClienteFiado selecionado={clienteFiado} aoEscolher={setClienteFiado} />}

      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[12.5px] font-semibold">
            Valor recebido
            <button type="button" onClick={() => setCalc((c) => !c)} className={clsx("flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold", calc ? "bg-acao text-white" : "bg-secundario")}>
              <Calculator size={14} /> Calculadora
            </button>
          </span>
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
      {calc && (
        <div className="mt-3">
          <Calculadora
            aoUsar={(v) => {
              setValor(v);
              setChave((k) => k + 1);
            }}
          />
        </div>
      )}
      {troco > 0 && (
        <p className="mt-3 rounded-2xl bg-[#E5F4EA] p-3 text-[15px] font-bold text-[#1E7A41]">
          Troco: <span className="num">{brl(troco)}</span>
        </p>
      )}

      {forma && <PagamentoExtra conta={conta} tipo={forma.tipo} valor={Math.min(valor, devido)} aoConfirmar={(ref) => confirmar({ referencia: ref })} />}

      <Botao variante="ok" tamanho="lg" className="mt-4 w-full" disabled={valor <= 0 || (ehFiado && !clienteFiado)} onClick={() => confirmar()}>
        {ehFiado ? `Lançar ${brl(Math.min(valor, devido))} no fiado` : valor >= devido - 0.009 ? "Receber e fechar conta" : `Receber parcial de ${brl(valor)}`}
      </Botao>
    </Modal>
  );
}

/** Comissão (taxa de serviço) opcional: integral, parcial ou zero. */
function Comissao({ conta, aoMudar }: { conta: Conta; aoMudar: (v: number | undefined) => void }) {
  const sugerida = servicoSugerido(conta);
  const atual = valorServico(conta);
  const [outro, setOutro] = useState<number | null>(null);
  const [chave, setChave] = useState(0);
  const modo = conta.servicoValor === undefined ? "integral" : atual === 0 ? "zero" : atual === sugerida ? "integral" : "outro";
  return (
    <div className="mb-3 rounded-2xl border border-linha bg-card p-3">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-mudo">Valor sem comissão</span>
        <span className="num font-bold">{brl(totalSemServico(conta))}</span>
      </div>
      <p className="mb-2 mt-2 text-[12.5px] font-semibold">
        Comissão <span className="font-normal text-mudo">· sugerida {brl(sugerida)} ({conta.servicoPct}%) · o cliente escolhe</span>
      </p>
      <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-2">
        <button onClick={() => aoMudar(undefined)} className={clsx("h-10 rounded-xl text-[12.5px] font-bold", modo === "integral" ? "bg-acao text-white" : "bg-secundario")}>
          Integral
        </button>
        <button onClick={() => aoMudar(0)} className={clsx("h-10 rounded-xl text-[12.5px] font-bold", modo === "zero" ? "bg-acao text-white" : "bg-secundario")}>
          Sem comissão
        </button>
        <EntradaValor
          key={`${chave}-${modo}`}
          valor={modo === "outro" ? atual : 0}
          aoMudar={setOutro}
          onBlur={() => {
            if (outro !== null && outro !== atual) aoMudar(outro);
            setOutro(null);
            setChave((k) => k + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="Outro valor"
          aria-label="Comissão em reais"
          className={clsx("h-10 py-1.5 text-[14px] font-bold", modo === "outro" && "ring-2 ring-acao")}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between text-[13px]">
        <span className="text-mudo">Comissão cobrada</span>
        <span className="num font-bold text-acao">{brl(atual)}</span>
      </div>
    </div>
  );
}

/** Escolhe (ou cadastra na hora) o cliente que fica devendo no fiado. */
function ClienteFiado({ selecionado, aoEscolher }: { selecionado?: string; aoEscolher: (id: string | undefined) => void }) {
  const clientes = useLoja((e) => e.clientes);
  const movs = useLoja((e) => e.fiado);
  const [q, setQ] = useState("");
  const cliente = clientes.find((c) => c.id === selecionado);
  const achados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return clientes.filter((c) => c.nome.toLowerCase().includes(t) || (c.telefone && c.telefone.replace(/\D/g, "").includes(t.replace(/\D/g, "") || "§"))).slice(0, 5);
  }, [clientes, q]);

  if (cliente)
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-rosado p-3 text-[13px]">
        <Wallet size={18} className="text-acao" />
        <span className="flex-1">
          Fiado de <b>{cliente.nome}</b>
          <span className="block text-[11.5px] text-mudo">
            deve hoje <span className="num">{brl(saldoFiado(movs ?? [], cliente.id))}</span>
          </span>
        </span>
        <button onClick={() => aoEscolher(undefined)} className="rounded-full bg-card px-3 py-1.5 text-[12px] font-bold">
          Trocar
        </button>
      </div>
    );

  return (
    <div className="mt-3 rounded-2xl border border-linha bg-card p-3">
      <p className="mb-1.5 text-[12.5px] font-semibold">Em nome de quem fica o fiado?</p>
      <Entrada autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou telefone do cliente" />
      <ul className="mt-1.5 space-y-1">
        {achados.map((c) => (
          <li key={c.id}>
            <button onClick={() => aoEscolher(c.id)} className="flex w-full items-center justify-between rounded-xl bg-fundo px-3 py-2 text-left text-[13px]">
              <span>
                <b>{c.nome}</b> {c.telefone && <span className="text-mudo">· {c.telefone}</span>}
              </span>
              <span className="num text-[12px] text-mudo">deve {brl(saldoFiado(movs ?? [], c.id))}</span>
            </button>
          </li>
        ))}
        {q.trim().length >= 2 && (
          <li>
            <button onClick={() => aoEscolher(cadastrarClienteFiado(q))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-acao">
              <UserPlus size={16} /> Cadastrar &quot;{q.trim()}&quot; (telefone pode ficar para depois)
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
