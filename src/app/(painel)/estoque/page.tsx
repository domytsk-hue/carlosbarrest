"use client";

import clsx from "clsx";
import Link from "next/link";
import { AlertTriangle, PackageOpen, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, FileUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EditorLista } from "@/components/editor-lista";
import { Exportar } from "@/components/relatorio";
import { Botao, Campo, Cartao, Entrada, EntradaValor, Modal, Pilula, Selecao, Tabela, Titulo } from "@/components/ui";
import { brl, dataCurta, diaLocal, hora } from "@/lib/dominio/calculos";
import { arred3, custoFicha, lerXmlNfe, ROTULO_UNIDADE, saldos, sugerirInsumo, type Nota } from "@/lib/dominio/estoque";
import type { Insumo, TipoMovEstoque, Unidade } from "@/lib/dominio/tipos";
import { entradaNota, lancarInventario, movimentarEstoque, salvarFicha, type MovimentoNovo } from "@/lib/loja/acoes-gestao";
import { excluirRegistro, salvarRegistro } from "@/lib/loja/cadastros";
import { useLoja } from "@/lib/loja/loja";

const ABAS = ["Posição", "Movimentos", "Nota fiscal (XML)", "Inventário", "Fichas técnicas", "Insumos"] as const;
const ROTULO_MOV: Record<TipoMovEstoque, string> = { entrada: "Entrada", saida: "Saída", perda: "Perda", ajuste: "Ajuste", venda: "Venda", estorno: "Estorno" };
const COR_MOV: Record<TipoMovEstoque, "verde" | "neutra" | "vermelha" | "azul" | "laranja"> = { entrada: "verde", saida: "neutra", perda: "vermelha", ajuste: "azul", venda: "laranja", estorno: "azul" };
const fmtQ = (q: number, u: Unidade) => `${q.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${ROTULO_UNIDADE[u]}`;

/** Estoque fica desligado até o restaurante começar a usar (previsto para março). */
export default function EstoquePage() {
  const ativo = useLoja((e) => e.config.estoqueAtivo);
  if (!ativo) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <div className="rounded-[20px] bg-card p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secundario text-mudo">
            <PackageOpen size={30} />
          </div>
          <h1 className="text-[22px] font-extrabold">Estoque desligado</h1>
          <p className="mt-1 text-[14px] text-mudo">O controle de estoque volta a ser usado em março. Até lá, as vendas não dão baixa em insumos e nenhum aviso de estoque aparece.</p>
          <p className="mt-4 text-[12.5px] text-mudo">
            Nada foi apagado. Para religar quando chegar a hora, vá em{" "}
            <Link href="/configuracoes" className="font-semibold text-acao">
              Configurações → Estoque
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }
  return <EstoqueAtivo />;
}

function EstoqueAtivo() {
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Posição");
  const insumos = useLoja((e) => e.insumos);
  const movs = useLoja((e) => e.movimentosEstoque);
  const saldo = useMemo(() => saldos(movs), [movs]);
  const abaixo = insumos.filter((i) => i.ativo && (saldo.get(i.id) ?? 0) < i.estoqueMinimo);
  const valorTotal = insumos.reduce((s, i) => s + Math.max(0, saldo.get(i.id) ?? 0) * i.custo, 0);
  const [mov, setMov] = useState<MovimentoNovo | null>(null);

  return (
    <div className="mx-auto max-w-[1300px]">
      <Titulo
        sub="Insumos, entradas por nota, baixa automática pela ficha técnica e inventário"
        acoes={
          <>
            <Botao variante="secundario" onClick={() => setMov({ insumoId: insumos[0]?.id ?? "", tipo: "saida", qtd: 0 })}>
              <ArrowUpFromLine size={17} /> Saída / perda
            </Botao>
            <Botao onClick={() => setMov({ insumoId: insumos[0]?.id ?? "", tipo: "entrada", qtd: 0 })}>
              <ArrowDownToLine size={17} /> Entrada
            </Botao>
          </>
        }
      >
        Estoque
      </Titulo>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Indicador r="Insumos ativos" v={String(insumos.filter((i) => i.ativo).length)} />
        <Indicador r="Valor em estoque" v={brl(valorTotal)} />
        <Indicador r="Abaixo do mínimo" v={String(abaixo.length)} cor={abaixo.length ? "text-st-cancelado" : undefined} />
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {ABAS.map((a) => (
          <button key={a} onClick={() => setAba(a)} className={clsx("whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold", a === aba ? "border-tinta bg-tinta text-fundo" : "border-linha bg-card")}>
            {a}
          </button>
        ))}
      </div>

      {aba === "Posição" && <Posicao saldo={saldo} />}
      {aba === "Movimentos" && <Movimentos />}
      {aba === "Nota fiscal (XML)" && <NotaFiscal aoConcluir={() => setAba("Movimentos")} />}
      {aba === "Inventário" && <Inventario saldo={saldo} />}
      {aba === "Fichas técnicas" && <Fichas />}
      {aba === "Insumos" && <Insumos />}

      <Modal aberto={!!mov} aoFechar={() => setMov(null)} titulo={mov?.tipo === "entrada" ? "Entrada no estoque" : "Saída do estoque"}>
        {mov && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Insumo" className="sm:col-span-2">
              <Selecao value={mov.insumoId} onChange={(e) => setMov({ ...mov, insumoId: e.target.value })}>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome} · saldo {fmtQ(saldo.get(i.id) ?? 0, i.unidade)}
                  </option>
                ))}
              </Selecao>
            </Campo>
            {mov.tipo !== "entrada" && (
              <Campo rotulo="Tipo">
                <Selecao value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value as MovimentoNovo["tipo"] })}>
                  <option value="saida">Saída (consumo interno, transferência)</option>
                  <option value="perda">Perda (vencido, estragado, quebra)</option>
                </Selecao>
              </Campo>
            )}
            <Campo rotulo={`Quantidade (${ROTULO_UNIDADE[insumos.find((i) => i.id === mov.insumoId)?.unidade ?? "un"]})`}>
              <EntradaValor valor={mov.qtd} aoMudar={(v) => setMov({ ...mov, qtd: v })} />
            </Campo>
            {mov.tipo === "entrada" && (
              <>
                <Campo rotulo="Custo unitário">
                  <EntradaValor valor={mov.custo ?? 0} aoMudar={(v) => setMov({ ...mov, custo: v })} />
                </Campo>
                <Campo rotulo="Lote">
                  <Entrada value={mov.lote ?? ""} onChange={(e) => setMov({ ...mov, lote: e.target.value })} />
                </Campo>
                <Campo rotulo="Validade">
                  <Entrada type="date" value={mov.validade ?? ""} onChange={(e) => setMov({ ...mov, validade: e.target.value })} />
                </Campo>
                <Campo rotulo="Documento (NF, recibo)">
                  <Entrada value={mov.documento ?? ""} onChange={(e) => setMov({ ...mov, documento: e.target.value })} />
                </Campo>
              </>
            )}
            <Campo rotulo="Observação" className="sm:col-span-2">
              <Entrada value={mov.obs ?? ""} onChange={(e) => setMov({ ...mov, obs: e.target.value })} />
            </Campo>
            <Botao
              className="sm:col-span-2"
              disabled={!mov.insumoId || mov.qtd <= 0}
              onClick={() => {
                movimentarEstoque({ ...mov, custo: mov.tipo === "entrada" && mov.custo ? mov.custo : undefined });
                setMov(null);
              }}
            >
              Confirmar
            </Botao>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Indicador({ r, v, cor }: { r: string; v: string; cor?: string }) {
  return (
    <div className="rounded-[18px] bg-card p-3 shadow-card">
      <p className="text-[11.5px] font-semibold text-mudo">{r}</p>
      <p className={clsx("num text-[22px] font-extrabold", cor)}>{v}</p>
    </div>
  );
}

function Posicao({ saldo }: { saldo: Map<string, number> }) {
  const insumos = useLoja((e) => e.insumos);
  const fornecedores = useLoja((e) => e.fornecedores);
  const movs = useLoja((e) => e.movimentosEstoque);
  const hoje = diaLocal();
  // Lote com validade mais próxima entre as entradas
  const validade = (id: string) =>
    movs
      .filter((m) => m.insumoId === id && m.tipo === "entrada" && m.validade && m.validade >= hoje)
      .map((m) => m.validade!)
      .sort()[0];
  const linhas = insumos.filter((i) => i.ativo).sort((a, b) => a.local.localeCompare(b.local) || a.nome.localeCompare(b.nome));
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Exportar
          nome="posicao-estoque"
          cab={["Insumo", "Local", "Saldo", "Unidade", "Mínimo", "Custo médio", "Valor"]}
          linhas={linhas.map((i) => [i.nome, i.local, saldo.get(i.id) ?? 0, i.unidade, i.estoqueMinimo, i.custo, Math.max(0, saldo.get(i.id) ?? 0) * i.custo])}
        />
      </div>
      <Tabela colunas={[{ rotulo: "Insumo" }, { rotulo: "Local" }, { rotulo: "Saldo", direita: true }, { rotulo: "Mínimo", direita: true }, { rotulo: "Custo médio", direita: true }, { rotulo: "Valor", direita: true }, { rotulo: "Validade" }]}>
        {linhas.map((i) => {
          const s = saldo.get(i.id) ?? 0;
          const v = validade(i.id);
          const vence = v && (new Date(v).getTime() - Date.now()) / 86400000 < 7;
          return (
            <tr key={i.id}>
              <td className="px-3 py-2.5 font-semibold">
                {i.nome}
                <span className="block text-[11.5px] font-normal text-mudo">{fornecedores.find((f) => f.id === i.fornecedorId)?.nome}</span>
              </td>
              <td className="px-3 py-2.5">{i.local}</td>
              <td className={clsx("num px-3 py-2.5 text-right font-bold", s < i.estoqueMinimo && "text-st-cancelado")}>
                {s < i.estoqueMinimo && <AlertTriangle size={13} className="mr-1 inline" />}
                {fmtQ(s, i.unidade)}
              </td>
              <td className="num px-3 py-2.5 text-right text-mudo">{fmtQ(i.estoqueMinimo, i.unidade)}</td>
              <td className="num px-3 py-2.5 text-right">{brl(i.custo)}</td>
              <td className="num px-3 py-2.5 text-right">{brl(Math.max(0, s) * i.custo)}</td>
              <td className="px-3 py-2.5">{v ? <Pilula cor={vence ? "vermelha" : "neutra"}>{dataCurta(v + "T12:00")}</Pilula> : "—"}</td>
            </tr>
          );
        })}
      </Tabela>
    </div>
  );
}

function Movimentos() {
  const insumos = useLoja((e) => e.insumos);
  const movs = useLoja((e) => e.movimentosEstoque);
  const [filtro, setFiltro] = useState("");
  const [tipo, setTipo] = useState<TipoMovEstoque | "">("");
  const lista = [...movs]
    .reverse()
    .filter((m) => (!filtro || m.insumoId === filtro) && (!tipo || m.tipo === tipo))
    .slice(0, 400);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Selecao value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-xs py-2">
          <option value="">Todos os insumos</option>
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </Selecao>
        <Selecao value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovEstoque | "")} className="max-w-[180px] py-2">
          <option value="">Todos os tipos</option>
          {Object.entries(ROTULO_MOV).map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </Selecao>
      </div>
      <Tabela colunas={[{ rotulo: "Quando" }, { rotulo: "Insumo" }, { rotulo: "Tipo" }, { rotulo: "Qtd", direita: true }, { rotulo: "Custo", direita: true }, { rotulo: "Lote / validade" }, { rotulo: "Documento" }, { rotulo: "Por" }]} vazio="Nenhum movimento. As vendas de pratos com ficha técnica baixam o estoque sozinhas.">
        {lista.map((m) => {
          const i = insumos.find((x) => x.id === m.insumoId);
          return (
            <tr key={m.id}>
              <td className="num whitespace-nowrap px-3 py-2">
                {dataCurta(m.em)} {hora(m.em)}
              </td>
              <td className="px-3 py-2 font-semibold">{i?.nome}</td>
              <td className="px-3 py-2">
                <Pilula cor={COR_MOV[m.tipo]}>{ROTULO_MOV[m.tipo]}</Pilula>
              </td>
              <td className={clsx("num px-3 py-2 text-right font-bold", m.qtd < 0 ? "text-st-cancelado" : "text-ok")}>{i ? fmtQ(m.qtd, i.unidade) : m.qtd}</td>
              <td className="num px-3 py-2 text-right">{m.custo !== undefined ? brl(m.custo) : ""}</td>
              <td className="px-3 py-2 text-[12px]">{[m.lote, m.validade && dataCurta(m.validade + "T12:00")].filter(Boolean).join(" · ")}</td>
              <td className="px-3 py-2 text-[12px]">{m.documento ?? m.obs}</td>
              <td className="px-3 py-2 text-[12px] text-mudo">{m.usuario}</td>
            </tr>
          );
        })}
      </Tabela>
    </div>
  );
}

function NotaFiscal({ aoConcluir }: { aoConcluir: () => void }) {
  const insumos = useLoja((e) => e.insumos);
  const plano = useLoja((e) => e.planoContas.filter((p) => p.tipo === "despesa"));
  const [nota, setNota] = useState<Nota | null>(null);
  const [erro, setErro] = useState("");
  const [casar, setCasar] = useState<{ insumoId: string; fator: number; lote: string; validade: string }[]>([]);
  const [gerarConta, setGerarConta] = useState(true);
  const [vencimento, setVencimento] = useState(diaLocal());
  const [planoId, setPlanoId] = useState("pc3");
  const [parcelas, setParcelas] = useState(1);

  async function abrir(f: File) {
    setErro("");
    try {
      const n = lerXmlNfe(await f.text());
      setNota(n);
      setCasar(n.itens.map((it) => ({ insumoId: sugerirInsumo(it, insumos) ?? "", fator: 1, lote: "", validade: "" })));
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  if (!nota)
    return (
      <Cartao>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#E3B9A8] p-10 text-center">
          <FileUp size={32} className="text-acao" />
          <span className="font-bold">Escolha o XML da NF-e do fornecedor</span>
          <span className="text-[12.5px] text-mudo">Os itens são casados com os insumos pelo código do fornecedor ou pelo nome. Na próxima nota do mesmo fornecedor, o casamento é automático.</span>
          <input type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={(e) => e.target.files?.[0] && abrir(e.target.files[0])} />
        </label>
        {erro && <p className="mt-2 text-[13px] font-semibold text-st-cancelado">{erro}</p>}
      </Cartao>
    );

  const casados = casar.filter((c) => c.insumoId).length;
  return (
    <div className="grid gap-4">
      <Cartao titulo={`NF ${nota.numero} · ${nota.fornecedor}`} acao={<span className="num font-bold">{brl(nota.total)}</span>}>
        <p className="mb-3 text-[12.5px] text-mudo">
          CNPJ {nota.cnpj} · emitida em {nota.emissao.split("-").reverse().join("/")} · {nota.itens.length} itens. Use o fator para converter a unidade da nota (ex.: caixa com 24 → fator 24).
        </p>
        <Tabela colunas={[{ rotulo: "Item da nota" }, { rotulo: "Qtd", direita: true }, { rotulo: "Total", direita: true }, { rotulo: "Insumo" }, { rotulo: "Fator", direita: true }, { rotulo: "Lote" }, { rotulo: "Validade" }]}>
          {nota.itens.map((it, k) => {
            const c = casar[k];
            const set = (x: Partial<typeof c>) => setCasar((l) => l.map((y, j) => (j === k ? { ...y, ...x } : y)));
            const ins = insumos.find((i) => i.id === c.insumoId);
            return (
              <tr key={k}>
                <td className="px-3 py-2">
                  <span className="font-semibold">{it.descricao}</span>
                  <span className="block text-[11px] text-mudo">cód. {it.codigo}</span>
                </td>
                <td className="num px-3 py-2 text-right">
                  {it.qtd.toLocaleString("pt-BR")} {it.unidade}
                </td>
                <td className="num px-3 py-2 text-right">{brl(it.total)}</td>
                <td className="px-3 py-2">
                  <Selecao value={c.insumoId} onChange={(e) => set({ insumoId: e.target.value })} className="min-w-[160px] py-1.5">
                    <option value="">Não dar entrada</option>
                    {insumos.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nome} ({ROTULO_UNIDADE[i.unidade]})
                      </option>
                    ))}
                  </Selecao>
                  {ins && <span className="text-[11px] text-mudo">entra {fmtQ(arred3(it.qtd * c.fator), ins.unidade)}</span>}
                </td>
                <td className="px-3 py-2">
                  <EntradaValor valor={c.fator} aoMudar={(v) => set({ fator: v || 1 })} className="w-20 py-1.5 text-right" />
                </td>
                <td className="px-3 py-2">
                  <Entrada value={c.lote} onChange={(e) => set({ lote: e.target.value })} className="w-24 py-1.5" />
                </td>
                <td className="px-3 py-2">
                  <Entrada type="date" value={c.validade} onChange={(e) => set({ validade: e.target.value })} className="py-1.5" />
                </td>
              </tr>
            );
          })}
        </Tabela>
      </Cartao>
      <Cartao>
        <label className="flex items-center gap-2 text-[14px] font-semibold">
          <input type="checkbox" checked={gerarConta} onChange={(e) => setGerarConta(e.target.checked)} className="h-5 w-5 accent-[var(--acao)]" /> Lançar em contas a pagar
        </label>
        {gerarConta && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Campo rotulo="1º vencimento">
              <Entrada type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </Campo>
            <Campo rotulo="Plano de contas">
              <Selecao value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
                {plano.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Parcelas">
              <Entrada type="number" min={1} max={12} value={parcelas} onChange={(e) => setParcelas(Math.max(1, Number(e.target.value)))} />
            </Campo>
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Botao variante="secundario" onClick={() => setNota(null)}>
            Cancelar
          </Botao>
          <Botao
            disabled={!casados && !gerarConta}
            onClick={() => {
              entradaNota(
                nota,
                casar.map((c, indice) => ({ indice, insumoId: c.insumoId, fator: c.fator, lote: c.lote || undefined, validade: c.validade || undefined })).filter((c) => c.insumoId),
                gerarConta ? { vencimento, planoId, parcelas } : undefined,
              );
              setNota(null);
              aoConcluir();
            }}
          >
            <ArrowDownToLine size={17} /> Dar entrada em {casados} {casados === 1 ? "item" : "itens"}
          </Botao>
        </div>
      </Cartao>
    </div>
  );
}

function Inventario({ saldo }: { saldo: Map<string, number> }) {
  const insumos = useLoja((e) => e.insumos.filter((i) => i.ativo));
  const [local, setLocal] = useState("");
  const [contado, setContado] = useState<Record<string, number>>({});
  const [feito, setFeito] = useState<number | null>(null);
  const locais = [...new Set(insumos.map((i) => i.local))];
  const lista = insumos.filter((i) => !local || i.local === local);
  return (
    <Cartao
      titulo="Contagem de estoque"
      acao={
        <Selecao value={local} onChange={(e) => setLocal(e.target.value)} className="max-w-[200px] py-1.5">
          <option value="">Todos os locais</option>
          {locais.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </Selecao>
      }
    >
      <p className="mb-3 text-[12.5px] text-mudo">Conte o que tem fisicamente e digite. Só os itens preenchidos são ajustados; a diferença fica registrada como “Ajuste” com o seu nome.</p>
      <Tabela colunas={[{ rotulo: "Insumo" }, { rotulo: "No sistema", direita: true }, { rotulo: "Contado", direita: true }, { rotulo: "Diferença", direita: true }]}>
        {lista.map((i) => {
          const s = saldo.get(i.id) ?? 0;
          const c = contado[i.id];
          const d = c === undefined ? undefined : arred3(c - s);
          return (
            <tr key={i.id}>
              <td className="px-3 py-2 font-semibold">{i.nome}</td>
              <td className="num px-3 py-2 text-right">{fmtQ(s, i.unidade)}</td>
              <td className="px-3 py-2 text-right">
                <EntradaValor key={feito ?? 0} valor={0} aoMudar={(v) => setContado((x) => ({ ...x, [i.id]: v }))} placeholder={ROTULO_UNIDADE[i.unidade]} className="ml-auto w-28 py-1.5 text-right" />
              </td>
              <td className={clsx("num px-3 py-2 text-right font-bold", d && (d < 0 ? "text-st-cancelado" : "text-ok"))}>{d === undefined ? "" : fmtQ(d, i.unidade)}</td>
            </tr>
          );
        })}
      </Tabela>
      <div className="mt-3 flex items-center justify-end gap-3">
        {feito !== null && <span className="text-[13px] font-semibold text-ok">{feito} ajuste(s) lançado(s)</span>}
        <Botao
          disabled={!Object.keys(contado).length}
          onClick={() => {
            setFeito(lancarInventario(contado));
            setContado({});
          }}
        >
          <ClipboardCheck size={17} /> Lançar inventário
        </Botao>
      </div>
    </Cartao>
  );
}

function Fichas() {
  const produtos = useLoja((e) => e.produtos.filter((p) => p.ativo));
  const insumos = useLoja((e) => e.insumos);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [ficha, setFicha] = useState<{ insumoId: string; qtd: number }[]>([]);
  const lista = produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));
  const produto = produtos.find((p) => p.id === sel);
  const custo = arred3(ficha.reduce((s, f) => s + f.qtd * (insumos.find((i) => i.id === f.insumoId)?.custo ?? 0), 0));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <div>
        <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto" className="mb-3 max-w-xs" />
        <Tabela colunas={[{ rotulo: "Produto" }, { rotulo: "Preço", direita: true }, { rotulo: "Custo (ficha)", direita: true }, { rotulo: "CMV %", direita: true }, { rotulo: "" }]}>
          {lista.map((p) => {
            const c = custoFicha(p, insumos);
            const pct = c !== undefined && p.preco ? (c / p.preco) * 100 : undefined;
            return (
              <tr key={p.id} className={clsx("cursor-pointer hover:bg-fundo/60", sel === p.id && "bg-rosado")} onClick={() => (setSel(p.id), setFicha(p.ficha ?? []))}>
                <td className="px-3 py-2 font-semibold">{p.nome}</td>
                <td className="num px-3 py-2 text-right">{brl(p.preco)}</td>
                <td className="num px-3 py-2 text-right">{c !== undefined ? brl(c) : <span className="text-mudo">sem ficha</span>}</td>
                <td className={clsx("num px-3 py-2 text-right font-bold", pct !== undefined && (pct > 40 ? "text-st-cancelado" : pct > 32 ? "text-st-preparo" : "text-ok"))}>{pct !== undefined ? `${pct.toFixed(1).replace(".", ",")}%` : ""}</td>
                <td className="px-3 py-2 text-right text-[12px] font-semibold text-acao">Editar</td>
              </tr>
            );
          })}
        </Tabela>
      </div>
      <Cartao titulo={produto ? `Ficha · ${produto.nome}` : "Ficha técnica"} className="h-fit lg:sticky lg:top-4">
        {!produto ? (
          <p className="py-6 text-center text-[13px] text-mudo">Escolha um produto para montar a ficha. Cada venda baixa do estoque o que está na ficha.</p>
        ) : (
          <>
            <ul className="grid gap-2">
              {ficha.map((f, k) => {
                const ins = insumos.find((i) => i.id === f.insumoId);
                return (
                  <li key={k} className="grid grid-cols-[1fr_96px_32px] items-center gap-2">
                    <Selecao value={f.insumoId} onChange={(e) => setFicha((l) => l.map((x, j) => (j === k ? { ...x, insumoId: e.target.value } : x)))} className="py-2">
                      <option value="">Insumo</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </Selecao>
                    <EntradaValor key={f.insumoId + k} valor={f.qtd} aoMudar={(v) => setFicha((l) => l.map((x, j) => (j === k ? { ...x, qtd: v } : x)))} placeholder={ins ? ROTULO_UNIDADE[ins.unidade] : ""} className="py-2 text-right" />
                    <button onClick={() => setFicha((l) => l.filter((_, j) => j !== k))} className="text-mudo hover:text-st-cancelado" aria-label="Remover">
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <Botao variante="fantasma" tamanho="sm" className="mt-2" onClick={() => setFicha((l) => [...l, { insumoId: "", qtd: 0 }])}>
              <Plus size={15} /> Adicionar insumo
            </Botao>
            <div className="mt-3 flex justify-between border-t border-linha pt-3 text-[14px]">
              <span>Custo por unidade</span>
              <span className="num font-extrabold">{brl(custo)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-mudo">
              <span>CMV sobre o preço</span>
              <span className="num">{produto.preco ? ((custo / produto.preco) * 100).toFixed(1).replace(".", ",") : 0}%</span>
            </div>
            <Botao className="mt-3 w-full" onClick={() => salvarFicha(produto.id, ficha)}>
              Salvar ficha
            </Botao>
          </>
        )}
      </Cartao>
    </div>
  );
}

function Insumos() {
  const insumos = useLoja((e) => e.insumos);
  const fornecedores = useLoja((e) => e.fornecedores);
  return (
    <EditorLista<Insumo>
      titulo="Insumo"
      itens={insumos}
      busca={(i, q) => i.nome.toLowerCase().includes(q)}
      novo={() => ({ id: "", nome: "", unidade: "kg", custo: 0, estoqueMinimo: 0, local: "Depósito", ativo: true })}
      aoSalvar={(i) => salvarRegistro("insumos", i)}
      aoExcluir={(i) => excluirRegistro("insumos", i.id)}
      campos={[
        { chave: "nome", rotulo: "Nome", obrigatorio: true },
        { chave: "unidade", rotulo: "Unidade", tipo: "opcao", opcoes: Object.keys(ROTULO_UNIDADE).map((u) => ({ valor: u, rotulo: ROTULO_UNIDADE[u as Unidade] })) },
        { chave: "local", rotulo: "Local" },
        { chave: "estoqueMinimo", rotulo: "Estoque mínimo", tipo: "numero", direita: true },
        { chave: "custo", rotulo: "Custo médio", tipo: "valor", direita: true, exibir: (i) => brl(i.custo) },
        { chave: "fornecedorId", rotulo: "Fornecedor", tipo: "opcao", opcoes: [{ valor: "", rotulo: "—" }, ...fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome }))] },
        { chave: "ativo", rotulo: "Ativo", tipo: "booleano", exibir: (i) => (i.ativo ? <Pilula cor="verde">Ativo</Pilula> : <Pilula>Inativo</Pilula>) },
      ]}
    />
  );
}

