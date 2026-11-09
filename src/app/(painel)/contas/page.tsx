"use client";

import clsx from "clsx";
import { CheckCheck, Paperclip, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FormLancamento } from "@/components/financeiro/form-lancamento";
import { Fiado } from "./fiado";
import { Exportar } from "@/components/relatorio";
import { Botao, Campo, Entrada, EntradaValor, Modal, Pilula, Selecao, Tabela, Titulo } from "@/components/ui";
import { arred, brl, diaLocal } from "@/lib/dominio/calculos";
import { encargosAtraso, situacao, valorFinal, type SituacaoLancamento } from "@/lib/dominio/financeiro";
import type { Lancamento } from "@/lib/dominio/tipos";
import { baixarLancamento, estornarLancamento, excluirLancamento } from "@/lib/loja/acoes-gestao";
import { useLoja } from "@/lib/loja/loja";

const SIT: Record<SituacaoLancamento, { r: string; c: "verde" | "vermelha" | "amarela" | "neutra" }> = {
  pago: { r: "Pago", c: "verde" },
  vencido: { r: "Vencido", c: "vermelha" },
  hoje: { r: "Vence hoje", c: "amarela" },
  aberto: { r: "Em aberto", c: "neutra" },
};
const br = (d: string) => d.split("-").reverse().join("/");
const somaDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return diaLocal(d);
};

const ABAS = ["Fiado", "Contas a pagar e receber"] as const;

/** Contas: o fiado dos clientes (substitui a antiga "Nova conta") e o financeiro a pagar/receber. */
export default function ContasPage() {
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Fiado");
  return (
    <div className="mx-auto max-w-[1300px]">
      <div className="mb-3 flex gap-1.5">
        {ABAS.map((a) => (
          <button key={a} onClick={() => setAba(a)} className={clsx("whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold", a === aba ? "border-tinta bg-tinta text-fundo" : "border-linha bg-card")}>
            {a}
          </button>
        ))}
      </div>
      {aba === "Fiado" ? <Fiado /> : <Financeiro />}
    </div>
  );
}

function Financeiro() {
  const lancamentos = useLoja((e) => e.lancamentos);
  const plano = useLoja((e) => e.planoContas);
  const fornecedores = useLoja((e) => e.fornecedores);
  const clientes = useLoja((e) => e.clientes);
  const formas = useLoja((e) => e.formasPagamento.filter((f) => f.ativo));
  const hoje = diaLocal();
  const [tipo, setTipo] = useState<"" | "pagar" | "receber">("");
  const [filtroSit, setFiltroSit] = useState<"abertas" | SituacaoLancamento | "todas">("abertas");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [editar, setEditar] = useState<Lancamento | null | "novo">(null);
  const [baixa, setBaixa] = useState<Lancamento[] | null>(null);

  const abertos = lancamentos.filter((l) => !l.pagoEm);
  const soma = (ls: Lancamento[]) => arred(ls.reduce((s, l) => s + l.valor, 0));
  const pagarVencido = soma(abertos.filter((l) => l.tipo === "pagar" && l.vencimento < hoje));
  const pagarHoje = soma(abertos.filter((l) => l.tipo === "pagar" && l.vencimento === hoje));
  const pagar7 = soma(abertos.filter((l) => l.tipo === "pagar" && l.vencimento > hoje && l.vencimento <= somaDias(7)));
  const receber = soma(abertos.filter((l) => l.tipo === "receber"));
  const previsto30 = arred(soma(abertos.filter((l) => l.tipo === "receber" && l.vencimento <= somaDias(30))) - soma(abertos.filter((l) => l.tipo === "pagar" && l.vencimento <= somaDias(30))));

  const lista = useMemo(
    () =>
      lancamentos
        .filter((l) => {
          const s = situacao(l, hoje);
          if (tipo && l.tipo !== tipo) return false;
          if (filtroSit === "abertas" && s === "pago") return false;
          if (filtroSit !== "abertas" && filtroSit !== "todas" && s !== filtroSit) return false;
          if (de && l.vencimento < de) return false;
          if (ate && l.vencimento > ate) return false;
          if (q && !l.descricao.toLowerCase().includes(q.toLowerCase()) && !(l.documento ?? "").includes(q)) return false;
          return true;
        })
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [lancamentos, tipo, filtroSit, de, ate, q, hoje],
  );
  const selecionados = lista.filter((l) => sel.includes(l.id) && !l.pagoEm);
  const nomeDe = (l: Lancamento) => (l.tipo === "pagar" ? fornecedores.find((f) => f.id === l.fornecedorId)?.nome : clientes.find((c) => c.id === l.clienteId)?.nome);

  return (
    <div>
      <Titulo
        sub="Contas a pagar e a receber, com parcelas, recorrência, multa/juros e anexos"
        acoes={
          <>
            <Exportar
              nome="contas"
              cab={["Tipo", "Descrição", "Parcela", "Plano", "Fornecedor/Cliente", "Vencimento", "Valor", "Pago em", "Valor pago"]}
              linhas={lista.map((l) => [l.tipo, l.descricao, l.parcela ?? "", plano.find((p) => p.id === l.planoId)?.nome ?? "", nomeDe(l) ?? "", br(l.vencimento), l.valor, l.pagoEm ? br(l.pagoEm) : "", l.pagoEm ? valorFinal(l) : ""])}
            />
            <Botao onClick={() => setEditar("novo")}>
              <Plus size={18} /> Lançar conta
            </Botao>
          </>
        }
      >
        Contas
      </Titulo>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Ind r="A pagar vencido" v={pagarVencido} cor={pagarVencido ? "text-st-cancelado" : undefined} onClick={() => (setTipo("pagar"), setFiltroSit("vencido"))} />
        <Ind r="A pagar hoje" v={pagarHoje} cor={pagarHoje ? "text-st-preparo" : undefined} onClick={() => (setTipo("pagar"), setFiltroSit("hoje"))} />
        <Ind r="A pagar em 7 dias" v={pagar7} onClick={() => (setTipo("pagar"), setFiltroSit("aberto"), setDe(hoje), setAte(somaDias(7)))} />
        <Ind r="A receber" v={receber} cor="text-ok" onClick={() => (setTipo("receber"), setFiltroSit("abertas"))} />
        <Ind r="Saldo previsto 30 dias" v={previsto30} cor={previsto30 < 0 ? "text-st-cancelado" : "text-ok"} />
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-[18px] bg-card p-3 shadow-card">
        <div className="flex rounded-full bg-secundario p-1 text-[12.5px] font-bold">
          {(
            [
              ["", "Todas"],
              ["pagar", "A pagar"],
              ["receber", "A receber"],
            ] as const
          ).map(([v, r]) => (
            <button key={v} onClick={() => setTipo(v)} className={clsx("rounded-full px-3 py-1.5", tipo === v ? "bg-card text-acao shadow-card" : "text-mudo")}>
              {r}
            </button>
          ))}
        </div>
        <Selecao value={filtroSit} onChange={(e) => setFiltroSit(e.target.value as typeof filtroSit)} className="max-w-[210px] py-2">
          <option value="abertas">Em aberto (todas)</option>
          <option value="vencido">Vencidas</option>
          <option value="hoje">Vencem hoje</option>
          <option value="aberto">A vencer</option>
          <option value="pago">Pagas</option>
          <option value="todas">Todas</option>
        </Selecao>
        <label className="text-[12px] font-semibold">
          Vencimento de
          <Entrada type="date" value={de} onChange={(e) => setDe(e.target.value)} className="mt-1 py-2" />
        </label>
        <label className="text-[12px] font-semibold">
          até
          <Entrada type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="mt-1 py-2" />
        </label>
        <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar descrição ou documento" className="max-w-[240px] py-2" />
        {(de || ate || q) && (
          <Botao variante="fantasma" tamanho="sm" onClick={() => (setDe(""), setAte(""), setQ(""))}>
            Limpar
          </Botao>
        )}
        <span className="flex-1" />
        {selecionados.length > 0 && (
          <Botao variante="ok" tamanho="sm" onClick={() => setBaixa(selecionados)}>
            <CheckCheck size={16} /> Consolidar {selecionados.length} · {brl(soma(selecionados))}
          </Botao>
        )}
      </div>

      <Tabela colunas={[{ rotulo: "" }, { rotulo: "Descrição" }, { rotulo: "Plano" }, { rotulo: "Vencimento" }, { rotulo: "Valor", direita: true }, { rotulo: "Situação" }, { rotulo: "" }]} vazio="Nenhuma conta com esses filtros.">
        {lista.map((l) => {
          const s = situacao(l, hoje);
          return (
            <tr key={l.id} className="hover:bg-fundo/60">
              <td className="w-8 px-3 py-2">
                {!l.pagoEm && <input type="checkbox" checked={sel.includes(l.id)} onChange={(e) => setSel((x) => (e.target.checked ? [...x, l.id] : x.filter((y) => y !== l.id)))} className="h-4 w-4 accent-[var(--acao)]" aria-label="Selecionar" />}
              </td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className={clsx("h-2 w-2 shrink-0 rounded-full", l.tipo === "pagar" ? "bg-acao" : "bg-ok")} />
                  {l.descricao}
                  {l.parcela && <span className="text-[11.5px] font-normal text-mudo">({l.parcela})</span>}
                  {l.recorrente && <RotateCcw size={12} className="text-mudo" />}
                </span>
                <span className="block pl-3.5 text-[11.5px] text-mudo">{[nomeDe(l), l.documento].filter(Boolean).join(" · ")}</span>
              </td>
              <td className="px-3 py-2 text-[12.5px]">{plano.find((p) => p.id === l.planoId)?.nome}</td>
              <td className="num px-3 py-2">{br(l.vencimento)}</td>
              <td className={clsx("num px-3 py-2 text-right font-bold", l.tipo === "pagar" ? "text-tinta" : "text-ok")}>
                {brl(l.pagoEm ? valorFinal(l) : l.valor)}
                {l.pagoEm && valorFinal(l) !== l.valor && <span className="block text-[11px] font-normal text-mudo">original {brl(l.valor)}</span>}
              </td>
              <td className="px-3 py-2">
                <Pilula cor={SIT[s].c}>{s === "pago" ? `${l.tipo === "pagar" ? "Pago" : "Recebido"} ${br(l.pagoEm!).slice(0, 5)}` : SIT[s].r}</Pilula>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                {l.anexo && (
                  <a href={l.anexo.dados} download={l.anexo.nome} className="inline-block rounded-full p-2 text-mudo hover:text-acao" title={l.anexo.nome} aria-label="Anexo">
                    <Paperclip size={15} />
                  </a>
                )}
                {l.pagoEm ? (
                  <button onClick={() => confirm("Estornar o pagamento?") && estornarLancamento(l.id)} className="rounded-full p-2 text-mudo hover:text-acao" title="Estornar" aria-label="Estornar">
                    <RotateCcw size={15} />
                  </button>
                ) : (
                  <>
                    <button onClick={() => setBaixa([l])} className="mr-1 rounded-full bg-rosado px-3 py-1.5 text-[12px] font-bold text-acao">
                      {l.tipo === "pagar" ? "Pagar" : "Receber"}
                    </button>
                    <button onClick={() => setEditar(l)} className="rounded-full p-2 text-mudo hover:text-acao" aria-label="Editar">
                      <Pencil size={15} />
                    </button>
                  </>
                )}
                <button onClick={() => confirm("Excluir esta conta?") && excluirLancamento(l.id)} className="rounded-full p-2 text-mudo hover:text-st-cancelado" aria-label="Excluir">
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          );
        })}
      </Tabela>

      <Modal aberto={!!editar} aoFechar={() => setEditar(null)} titulo={editar === "novo" ? "Nova conta" : "Editar conta"} largura="lg">
        {editar && <FormLancamento inicial={editar === "novo" ? undefined : editar} aoSalvar={() => setEditar(null)} />}
      </Modal>

      {baixa && <BaixaModal itens={baixa} formas={formas} aoFechar={() => (setBaixa(null), setSel([]))} />}
    </div>
  );
}

function Ind({ r, v, cor, onClick }: { r: string; v: number; cor?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="rounded-[18px] bg-card p-3 text-left shadow-card disabled:cursor-default">
      <p className="text-[11.5px] font-semibold text-mudo">{r}</p>
      <p className={clsx("num text-[20px] font-extrabold", cor)}>{brl(v)}</p>
    </button>
  );
}

function BaixaModal({ itens, formas, aoFechar }: { itens: Lancamento[]; formas: { id: string; nome: string }[]; aoFechar: () => void }) {
  const um = itens.length === 1 ? itens[0] : null;
  const [data, setData] = useState(diaLocal());
  const sug = um ? encargosAtraso(um, data) : { multa: 0, juros: 0 };
  const [multa, setMulta] = useState(sug.multa);
  const [juros, setJuros] = useState(sug.juros);
  const [desc, setDesc] = useState(0);
  const [formaId, setFormaId] = useState(formas[0]?.id ?? "");
  const totalBase = arred(itens.reduce((s, l) => s + l.valor, 0));
  const final = arred(totalBase + (um ? multa + juros - desc : 0));
  const rot = itens.every((l) => l.tipo === "receber") ? "Receber" : "Pagar";

  return (
    <Modal aberto aoFechar={aoFechar} titulo={um ? `${rot}: ${um.descricao}` : `Consolidar ${itens.length} contas`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Data do pagamento">
          <Entrada
            type="date"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              if (um) {
                const s = encargosAtraso(um, e.target.value);
                setMulta(s.multa);
                setJuros(s.juros);
              }
            }}
          />
        </Campo>
        <Campo rotulo="Forma">
          <Selecao value={formaId} onChange={(e) => setFormaId(e.target.value)}>
            {formas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        {um && (
          <>
            <Campo rotulo="Multa">
              <EntradaValor key={`m${data}`} valor={multa} aoMudar={setMulta} />
            </Campo>
            <Campo rotulo="Juros">
              <EntradaValor key={`j${data}`} valor={juros} aoMudar={setJuros} />
            </Campo>
            <Campo rotulo="Desconto">
              <EntradaValor valor={desc} aoMudar={setDesc} />
            </Campo>
          </>
        )}
        {!um && (
          <ul className="max-h-48 overflow-y-auto text-[13px] sm:col-span-2">
            {itens.map((l) => (
              <li key={l.id} className="flex justify-between border-b border-linha py-1.5">
                <span>{l.descricao}</span>
                <span className="num">{brl(l.valor)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between rounded-2xl bg-fundo p-3 sm:col-span-2">
          <span className="text-[13px] text-mudo">{um && final !== totalBase ? `Original ${brl(totalBase)}` : "Total"}</span>
          <span className="num text-[22px] font-extrabold">{brl(final)}</span>
        </div>
        <Botao
          variante="ok"
          className="sm:col-span-2"
          onClick={() => {
            for (const l of itens) baixarLancamento(l.id, um ? { pagoEm: data, valorPago: final, multa, juros, descontoPago: desc, formaId } : { pagoEm: data, valorPago: l.valor, formaId });
            aoFechar();
          }}
        >
          <CheckCheck size={18} /> Confirmar
        </Botao>
      </div>
    </Modal>
  );
}
