"use client";

import clsx from "clsx";
import { ArrowDownToLine, ArrowUpFromLine, LockKeyhole, Printer, Receipt, Send, Unlock, Wallet } from "lucide-react";
import { useState } from "react";
import { imprimir } from "@/components/impressao";
import { Acao, Botao, Cartao, Entrada, EntradaValor, Modal, Pilula, Tabela, Titulo, Vazio } from "@/components/ui";
import { resumoSessao } from "@/lib/dominio/caixa";
import { arred, brl, dataCurta, hora } from "@/lib/dominio/calculos";
import type { TipoMovimento } from "@/lib/dominio/tipos";
import { abrirCaixa, fecharCaixa, movimentarCaixa, selecionarSessao } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

const MOV: Record<TipoMovimento, { rotulo: string; icone: React.ElementType; ajuda: string }> = {
  suprimento: { rotulo: "Inserir dinheiro", icone: ArrowDownToLine, ajuda: "Reforço de troco colocado na gaveta" },
  sangria: { rotulo: "Sangria", icone: ArrowUpFromLine, ajuda: "Retirada de dinheiro da gaveta" },
  despesa: { rotulo: "Despesa", icone: Receipt, ajuda: "Conta paga com dinheiro do caixa (vai para o financeiro)" },
  repasse: { rotulo: "Repasse", icone: Send, ajuda: "Transferência para outro caixa, cofre ou banco" },
};

export default function CaixaPage() {
  const e = useLoja((x) => x);
  const sessao = e.sessoesCaixa.find((s) => s.id === e.sessaoAtivaId);
  const abertasOutras = e.sessoesCaixa.filter((s) => !s.fechadaEm && s.id !== e.sessaoAtivaId);
  const fechadas = e.sessoesCaixa.filter((s) => s.fechadaEm).slice(-15).reverse();
  const [fundo, setFundo] = useState(e.sessoesCaixa.at(-1)?.fundo ?? 100);
  const [fundoConferido, setFundoConferido] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [caixaId, setCaixaId] = useState(e.caixas[0]?.id);
  const [mov, setMov] = useState<TipoMovimento | null>(null);
  const [valor, setValor] = useState(0);
  const [desc, setDesc] = useState("");
  const [fechando, setFechando] = useState(false);
  const [contado, setContado] = useState<Record<string, number>>({});

  if (!sessao) {
    const ocupados = new Set(e.sessoesCaixa.filter((s) => !s.fechadaEm).map((s) => s.caixaId));
    return (
      <div className="mx-auto max-w-3xl">
        <Titulo sub="Abra o caixa para começar a receber">Caixa</Titulo>
        <Cartao>
          <Vazio icone={Wallet} titulo="Nenhum caixa aberto neste aparelho" texto="Escolha o caixa, informe o fundo de troco e abra o turno." />
          <div className="mx-auto grid max-w-md gap-3">
            <div className="grid grid-cols-2 gap-2">
              {e.caixas.map((c) => (
                <button
                  key={c.id}
                  disabled={ocupados.has(c.id)}
                  onClick={() => setCaixaId(c.id)}
                  className={clsx("rounded-2xl border-[1.5px] bg-card p-3 text-[13.5px] font-semibold disabled:opacity-40", c.id === caixaId ? "border-acao bg-rosado text-acao" : "border-linha")}
                >
                  {c.nome}
                  {ocupados.has(c.id) && <span className="block text-[11px] text-mudo">já aberto</span>}
                </button>
              ))}
            </div>
            <label>
              <span className="mb-1.5 block text-[12.5px] font-semibold">Dinheiro inicial para troco (R$)</span>
              <EntradaValor valor={fundo} aoMudar={setFundo} />
              <span className="mt-1 block text-[11.5px] text-mudo">Fica separado das vendas e não conta como faturamento.</span>
            </label>
            <label className="flex items-center gap-2 rounded-2xl bg-fundo p-3 text-[13px] font-semibold">
              <input type="checkbox" checked={fundoConferido} onChange={(x) => setFundoConferido(x.target.checked)} className="h-5 w-5 accent-[var(--acao)]" />
              Conferi o dinheiro da gaveta
            </label>
            <Botao tamanho="lg" disabled={!caixaId || ocupados.has(caixaId) || !fundoConferido} onClick={() => caixaId && abrirCaixa(caixaId, fundo, true)}>
              <Unlock size={18} /> Abrir caixa
            </Botao>
            {abertasOutras.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[12px] font-semibold text-mudo">Ou continue um caixa já aberto:</p>
                {abertasOutras.map((s) => (
                  <Botao key={s.id} variante="secundario" className="w-full" onClick={() => selecionarSessao(s.id)}>
                    {e.caixas.find((c) => c.id === s.caixaId)?.nome} · {s.operadorNome} · desde {hora(s.abertaEm)}
                  </Botao>
                ))}
              </div>
            )}
          </div>
        </Cartao>
        <Historico />
      </div>
    );
  }

  const r = resumoSessao(sessao, e.contas, e.formasPagamento, e.fiado);
  const nomeCaixa = e.caixas.find((c) => c.id === sessao.caixaId)?.nome;

  /** Formas que entram na conferência: as usadas no dia (menos o fiado, que não é dinheiro recebido) e sempre o dinheiro. */
  const conferir = r.porForma.filter((p) => p.forma.tipo !== "fiado" && (p.valor || r.fiadoPorForma[p.forma.id] || p.forma.tipo === "dinheiro"));
  const ondeConferir = (tipo: string) =>
    tipo === "dinheiro" ? "dinheiro contado na gaveta" : tipo === "pix" ? "extrato do Pix" : tipo === "credito" || tipo === "debito" || tipo === "voucher" ? "nota da maquininha" : "comprovantes";

  /** Relatório diário (CAI-03): faturamento, comissão arrecadada e conferência por modalidade. */
  function imprimirFechamento(cont?: Record<string, number>) {
    const fmtDif = (id: string) => {
      const v = cont?.[id];
      if (v === undefined) return "";
      const d = arred(v - (r.esperado[id] ?? 0));
      return d === 0 ? " (confere)" : ` (${d > 0 ? "sobra" : "falta"} ${brl(Math.abs(d))})`;
    };
    imprimir({
      tipo: "texto",
      titulo: `${cont ? "Fechamento do caixa" : "Parcial do caixa"} · ${nomeCaixa} · ${new Date().toLocaleString("pt-BR")}`,
      linhas: [
        ["Operador", sessao!.operadorNome],
        ["Abertura", `${dataCurta(sessao!.abertaEm)} ${hora(sessao!.abertaEm)}`],
        ["Fundo de troco", brl(sessao!.fundo)],
        ["FATURAMENTO TOTAL", brl(r.vendas)],
        ["COMISSÃO ARRECADADA", brl(r.comissao)],
        ...r.porForma.filter((p) => p.valor).map((p) => [`Vendas · ${p.forma.nome}`, brl(p.valor)] as [string, string]),
        ...(r.fiadoRecebido ? ([["Pagamentos de fiado recebidos", brl(r.fiadoRecebido)]] as [string, string][]) : []),
        ["Suprimentos", brl(r.suprimentos)],
        ["Sangrias", brl(-r.sangrias)],
        ["Despesas", brl(-r.despesas)],
        ["Repasses", brl(-r.repasses)],
        ...conferir.map((p) => [`${p.forma.nome} · sistema`, brl(r.esperado[p.forma.id] ?? 0)] as [string, string]),
        ...(cont ? conferir.map((p) => [`${p.forma.nome} · conferido`, `${brl(cont[p.forma.id] ?? 0)}${fmtDif(p.forma.id)}`] as [string, string]) : []),
      ],
    });
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <Titulo
        sub={`${nomeCaixa} · ${sessao.operadorNome} · aberto às ${hora(sessao.abertaEm)}`}
        acoes={
          <>
            <Botao variante="secundario" onClick={() => imprimirFechamento()}>
              <Printer size={17} /> Parcial
            </Botao>
            <Botao
              onClick={() => {
                setContado({});
                setConfirmado(false);
                setFechando(true);
              }}
            >
              <LockKeyhole size={17} /> Fechar caixa
            </Botao>
          </>
        }
      >
        Caixa
      </Titulo>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-[20px] bg-gradient-to-br from-[#9E1B1E] to-[#C2402F] p-4 text-white shadow-card">
          <p className="text-[12px] font-semibold text-[#FFD9A0]">Faturamento</p>
          <p className="num text-[24px] font-extrabold">{brl(r.vendas)}</p>
          <p className="text-[11.5px] text-[#FFD9A0]">comissão arrecadada <span className="num">{brl(r.comissao)}</span></p>
        </div>
        <div className="rounded-[20px] bg-card p-4 shadow-card">
          <p className="text-[12px] font-semibold text-mudo">Dinheiro na gaveta</p>
          <p className="num text-[24px] font-extrabold">{brl(r.dinheiroEsperado)}</p>
          <p className="text-[11.5px] text-mudo">fundo {brl(sessao.fundo)}</p>
        </div>
        <div className="rounded-[20px] bg-card p-4 shadow-card">
          <p className="text-[12px] font-semibold text-mudo">Entradas</p>
          <p className="num text-[24px] font-extrabold text-ok">{brl(r.suprimentos)}</p>
        </div>
        <div className="rounded-[20px] bg-card p-4 shadow-card">
          <p className="text-[12px] font-semibold text-mudo">Saídas</p>
          <p className="num text-[24px] font-extrabold text-acao">{brl(r.sangrias + r.despesas + r.repasses)}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {(Object.keys(MOV) as TipoMovimento[]).map((t) => (
          <Acao key={t} icone={MOV[t].icone} rotulo={MOV[t].rotulo} onClick={() => { setMov(t); setValor(0); setDesc(""); }} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Recebido por forma de pagamento">
          <ul className="divide-y divide-linha">
            {r.porForma.map((p) => (
              <li key={p.forma.id} className="flex items-center justify-between py-2.5 text-[13.5px]">
                <span className="font-semibold">
                  {p.forma.nome} <span className="text-[11.5px] font-normal text-mudo">· {p.qtd} pagamento(s)</span>
                </span>
                <span className="num font-bold">{brl(p.valor)}</span>
              </li>
            ))}
            {r.fiadoRecebido > 0 && (
              <li className="flex items-center justify-between py-2.5 text-[13.5px]">
                <span className="font-semibold">
                  Pagamentos de fiado <span className="text-[11.5px] font-normal text-mudo">· não entram no faturamento</span>
                </span>
                <span className="num font-bold">{brl(r.fiadoRecebido)}</span>
              </li>
            )}
          </ul>
        </Cartao>
        <Cartao titulo="Movimentos do caixa">
          <ul className="divide-y divide-linha">
            {sessao.movimentos
              .slice()
              .reverse()
              .map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                  <span className="w-12 text-[11.5px] text-mudo">{hora(m.em)}</span>
                  <span className="flex-1">
                    <b>{MOV[m.tipo].rotulo}</b> · {m.descricao}
                  </span>
                  <span className={clsx("num font-bold", m.tipo === "suprimento" ? "text-ok" : "text-acao")}>
                    {m.tipo === "suprimento" ? "+" : "-"}
                    {brl(m.valor)}
                  </span>
                </li>
              ))}
            {!sessao.movimentos.length && <li className="py-6 text-center text-[13px] text-mudo">Nenhum movimento ainda.</li>}
          </ul>
        </Cartao>
      </div>
      <Historico />

      <Modal aberto={!!mov} aoFechar={() => setMov(null)} titulo={mov ? MOV[mov].rotulo : ""} largura="sm">
        {mov && (
          <div className="space-y-3">
            <p className="text-[12.5px] text-mudo">{MOV[mov].ajuda}</p>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Valor (R$)</span>
              <EntradaValor autoFocus valor={valor} aoMudar={setValor} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">{mov === "repasse" ? "Destino" : "Descrição"}</span>
              <Entrada value={desc} onChange={(x) => setDesc(x.target.value)} placeholder={mov === "despesa" ? "Ex.: gelo, gás" : mov === "repasse" ? "Ex.: cofre, Caixa Delivery" : "Ex.: troco"} />
            </label>
            {(mov === "sangria" || mov === "despesa" || mov === "repasse") && valor > r.dinheiroEsperado && <p className="text-[12.5px] font-semibold text-st-cancelado">Valor maior que o dinheiro na gaveta.</p>}
            <Botao className="w-full" disabled={valor <= 0 || !desc.trim()} onClick={() => { movimentarCaixa(mov, valor, desc, mov === "repasse" ? desc : undefined); setMov(null); }}>
              Confirmar
            </Botao>
          </div>
        )}
      </Modal>

      <Modal aberto={fechando} aoFechar={() => setFechando(false)} titulo={`Fechar ${nomeCaixa}`} largura="md">
        <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-card p-3 text-center shadow-card">
          <div>
            <p className="text-[11px] font-semibold text-mudo">Total recebido</p>
            <p className="num text-[16px] font-extrabold">{brl(r.recebido)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-mudo">Faturamento</p>
            <p className="num text-[16px] font-extrabold">{brl(r.vendas)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-mudo">Comissão arrecadada</p>
            <p className="num text-[16px] font-extrabold text-acao">{brl(r.comissao)}</p>
          </div>
        </div>
        {(r.fiadoVendido > 0 || r.fiadoRecebido > 0) && (
          <p className="mb-3 text-[12px] text-mudo">
            Vendido no fiado: <b className="num">{brl(r.fiadoVendido)}</b> (entra no faturamento, não no dinheiro) · Pagamentos de fiado recebidos: <b className="num">{brl(r.fiadoRecebido)}</b> (entram no dinheiro, não no faturamento).
          </p>
        )}
        <p className="mb-2 text-[13px] text-mudo">Informe o valor conferido de cada modalidade e compare com o sistema.</p>
        <div className="space-y-2">
          {conferir.map((p) => {
            const esp = r.esperado[p.forma.id] ?? 0;
            const inf = contado[p.forma.id];
            const dif = inf === undefined ? null : arred(inf - esp);
            return (
              <div key={p.forma.id} className="grid grid-cols-[1fr_120px] items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-card sm:grid-cols-[1fr_120px_110px]">
                <span className="text-[13.5px] font-semibold">
                  {p.forma.nome}
                  <span className="block text-[11.5px] font-normal text-mudo">
                    sistema <span className="num">{brl(esp)}</span> · confira no {ondeConferir(p.forma.tipo)}
                  </span>
                </span>
                <EntradaValor valor={0} aoMudar={(v) => setContado((c) => ({ ...c, [p.forma.id]: v }))} placeholder="Conferido" className="py-2" aria-label={`Conferido ${p.forma.nome}`} />
                <span className="col-span-2 text-right sm:col-span-1">
                  {dif === null ? null : dif === 0 ? <Pilula cor="verde">Confere</Pilula> : <Pilula cor={dif > 0 ? "azul" : "vermelha"}>{dif > 0 ? "Sobra" : "Falta"} {brl(Math.abs(dif))}</Pilula>}
                </span>
              </div>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-2xl bg-fundo p-3 text-[13px] font-semibold">
          <input type="checkbox" checked={confirmado} onChange={(x) => setConfirmado(x.target.checked)} className="h-5 w-5 accent-[var(--acao)]" />
          Conferi os valores e quero encerrar o caixa do dia
        </label>
        <Botao
          className="mt-3 w-full"
          tamanho="lg"
          disabled={!confirmado}
          onClick={() => {
            imprimirFechamento(contado);
            fecharCaixa(contado, { faturamento: r.vendas, comissao: r.comissao, fiadoVendido: r.fiadoVendido, fiadoRecebido: r.fiadoRecebido });
            setFechando(false);
          }}
        >
          <LockKeyhole size={18} /> Encerrar e imprimir relatório
        </Botao>
      </Modal>
    </div>
  );

  function Historico() {
    return (
      <div className="mt-6">
        <h2 className="mb-2 text-[15.5px] font-bold">Caixas fechados</h2>
        <Tabela colunas={[{ rotulo: "Data" }, { rotulo: "Caixa" }, { rotulo: "Operador" }, { rotulo: "Faturamento", direita: true }, { rotulo: "Comissão", direita: true }, { rotulo: "Diferença", direita: true }]} vazio="Nenhum caixa fechado ainda.">
          {fechadas.map((s) => {
            const rs = resumoSessao(s, e.contas, e.formasPagamento, e.fiado);
            const dif = arred(Object.entries(s.contado ?? {}).reduce((a, [id, v]) => a + v - (rs.esperado[id] ?? 0), 0));
            return (
              <tr key={s.id}>
                <td className="px-3 py-2.5">
                  {dataCurta(s.abertaEm)} {hora(s.abertaEm)}–{s.fechadaEm && hora(s.fechadaEm)}
                </td>
                <td className="px-3 py-2.5">{e.caixas.find((c) => c.id === s.caixaId)?.nome}</td>
                <td className="px-3 py-2.5">{s.operadorNome}</td>
                <td className="num px-3 py-2.5 text-right font-semibold">{brl(rs.vendas)}</td>
                <td className="num px-3 py-2.5 text-right">{brl(rs.comissao)}</td>
                <td className={clsx("num px-3 py-2.5 text-right font-semibold", dif < 0 ? "text-st-cancelado" : dif > 0 ? "text-st-confirmado" : "text-ok")}>{brl(dif)}</td>
              </tr>
            );
          })}
        </Tabela>
      </div>
    );
  }
}
