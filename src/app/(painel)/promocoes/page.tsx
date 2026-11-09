"use client";

import clsx from "clsx";
import { Clock, Gift, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Botao, Campo, Entrada, EntradaValor, Modal, Pilula, Selecao, Tabela, Titulo } from "@/components/ui";
import { arred, brl } from "@/lib/dominio/calculos";
import { custoFicha } from "@/lib/dominio/estoque";
import { DIAS, resumoPromocao, vigente } from "@/lib/dominio/promocoes";
import type { Canal, Promocao, TipoPromocao } from "@/lib/dominio/tipos";
import { alternarPromocao, excluirPromocao, salvarPromocao } from "@/lib/loja/acoes-crescimento";
import { useLoja } from "@/lib/loja/loja";

const TIPOS: Record<TipoPromocao, { r: string; i: typeof Tag; d: string }> = {
  cupom: { r: "Cupom", i: Tag, d: "Código que o cliente digita no delivery ou que o caixa aplica" },
  happyhour: { r: "Happy hour", i: Clock, d: "Desconto automático por dia e horário" },
  combo: { r: "Combo", i: Gift, d: "Vários produtos por um preço fechado; vira um item do cardápio" },
};
const CANAIS: { v: Canal; r: string }[] = [
  { v: "mesa", r: "Mesa" },
  { v: "comanda", r: "Comanda" },
  { v: "balcao", r: "Balcão" },
  { v: "pdv", r: "PDV" },
  { v: "qrcode", r: "QR Code" },
  { v: "delivery", r: "Delivery próprio" },
];

type Rascunho = Omit<Promocao, "id"> & { id?: string };
const NOVO: Record<TipoPromocao, Rascunho> = {
  cupom: { nome: "", tipo: "cupom", ativo: true, codigo: "", percentual: 10, canais: ["delivery"], usos: 0 },
  happyhour: { nome: "", tipo: "happyhour", ativo: true, percentual: 20, diasSemana: [2, 3, 4, 5], horaInicio: "17:00", horaFim: "19:00", canais: ["mesa", "comanda", "balcao", "qrcode"] },
  combo: { nome: "", tipo: "combo", ativo: true, combo: { itens: [], preco: 0 } },
};

export default function PromocoesPage() {
  const promocoes = useLoja((e) => e.promocoes);
  const contas = useLoja((e) => e.contas);
  const [editar, setEditar] = useState<Rascunho | null>(null);

  // Uso de cada promoção: cupons pelas contas, combos pelos itens vendidos
  const uso = useMemo(() => {
    const m = new Map<string, { vezes: number; valor: number }>();
    for (const p of promocoes) {
      let vezes = 0;
      let valor = 0;
      for (const c of contas) {
        if (c.status === "cancelada") continue;
        if (p.tipo === "cupom" && c.cupom && c.cupom === p.codigo?.toUpperCase()) {
          vezes++;
          valor += c.desconto ?? 0;
        }
        if (p.tipo === "combo")
          for (const it of c.itens) {
            if (it.cancelado || it.produtoId !== p.combo?.produtoId) continue;
            vezes += it.qtd;
            valor += it.qtd * it.preco;
          }
      }
      m.set(p.id, { vezes, valor: arred(valor) });
    }
    return m;
  }, [promocoes, contas]);

  return (
    <div className="mx-auto max-w-[1200px]">
      <Titulo
        sub="Cupons de desconto, happy hour por horário e combos"
        acoes={(Object.keys(TIPOS) as TipoPromocao[]).map((t) => {
          const I = TIPOS[t].i;
          return (
            <Botao key={t} variante={t === "cupom" ? "primario" : "secundario"} onClick={() => setEditar(structuredClone(NOVO[t]))}>
              <Plus size={16} /> <I size={16} /> {TIPOS[t].r}
            </Botao>
          );
        })}
      >
        Promoções
      </Titulo>

      <Tabela
        colunas={[{ rotulo: "Promoção" }, { rotulo: "Tipo" }, { rotulo: "Regra" }, { rotulo: "Situação" }, { rotulo: "Uso", direita: true }, { rotulo: "Movimentou", direita: true }, { rotulo: "", className: "w-28" }]}
        vazio="Nenhuma promoção cadastrada."
      >
        {promocoes.map((p) => {
          const agora = p.tipo === "combo" ? p.ativo : vigente(p, (p.canais?.[0] ?? "mesa") as Canal);
          const u = uso.get(p.id);
          return (
            <tr key={p.id}>
              <td className="px-3 py-2.5 font-semibold">{p.nome}</td>
              <td className="px-3 py-2.5">{TIPOS[p.tipo].r}</td>
              <td className="px-3 py-2.5 text-mudo">{resumoPromocao(p)}</td>
              <td className="px-3 py-2.5">
                <button onClick={() => alternarPromocao(p.id)} title="Ativar / desativar">
                  {!p.ativo ? <Pilula>Desligada</Pilula> : agora ? <Pilula cor="verde">Valendo agora</Pilula> : <Pilula cor="amarela">Ativa · fora do horário</Pilula>}
                </button>
              </td>
              <td className="num px-3 py-2.5 text-right">
                {p.tipo === "happyhour" ? "—" : u?.vezes ?? 0}
                {p.limiteUsos ? <span className="text-mudo"> / {p.limiteUsos}</span> : null}
              </td>
              <td className="num px-3 py-2.5 text-right">{p.tipo === "happyhour" ? "—" : `${p.tipo === "cupom" ? "−" : ""}${brl(u?.valor ?? 0)}`}</td>
              <td className="px-3 py-2.5 text-right">
                <button onClick={() => setEditar(structuredClone(p))} className="p-1.5 text-mudo hover:text-tinta" aria-label="Editar">
                  <Pencil size={16} />
                </button>
                <button onClick={() => confirm(`Excluir "${p.nome}"?`) && excluirPromocao(p.id)} className="p-1.5 text-mudo hover:text-st-cancelado" aria-label="Excluir">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          );
        })}
      </Tabela>
      <p className="mt-2 text-[12px] text-mudo">O happy hour muda o preço na hora do lançamento, em todos os canais marcados. O cupom do delivery é digitado pelo cliente no fechamento do pedido.</p>

      <Modal aberto={!!editar} aoFechar={() => setEditar(null)} titulo={editar ? `${editar.id ? "Editar" : "Novo"} ${TIPOS[editar.tipo].r.toLowerCase()}` : ""} largura="lg">
        {editar && <Editor r={editar} setR={setEditar} />}
      </Modal>
    </div>
  );
}

function Editor({ r, setR }: { r: Rascunho; setR: (r: Rascunho | null) => void }) {
  const categorias = useLoja((e) => e.categorias);
  const produtos = useLoja((e) => e.produtos.filter((p) => p.ativo && p.categoriaId !== "combos"));
  const insumos = useLoja((e) => e.insumos);
  const promocoes = useLoja((e) => e.promocoes);
  const set = (p: Partial<Rascunho>) => setR({ ...r, ...p });
  const alterna = <T,>(l: T[] | undefined, v: T) => (l?.includes(v) ? l.filter((x) => x !== v) : [...(l ?? []), v]);
  const [erro, setErro] = useState("");

  const itensCombo = r.combo?.itens ?? [];
  const cheio = arred(itensCombo.reduce((s, i) => s + (produtos.find((p) => p.id === i.produtoId)?.preco ?? 0) * i.qtd, 0));
  const custo = arred(itensCombo.reduce((s, i) => s + (() => { const p = produtos.find((x) => x.id === i.produtoId); return p ? (custoFicha(p, insumos) ?? 0) : 0; })() * i.qtd, 0));

  function salvar() {
    if (!r.nome.trim()) return setErro("Dê um nome para a promoção.");
    if (r.tipo === "cupom") {
      const cod = r.codigo?.trim().toUpperCase();
      if (!cod || cod.length < 3) return setErro("O código do cupom precisa de pelo menos 3 letras.");
      if (promocoes.some((p) => p.id !== r.id && p.codigo?.toUpperCase() === cod)) return setErro("Já existe um cupom com esse código.");
      if (!r.percentual && !r.valorFixo) return setErro("Informe o desconto em % ou em R$.");
    }
    if (r.tipo === "happyhour" && (!r.percentual || !r.horaInicio || !r.horaFim)) return setErro("Informe o desconto e o horário.");
    if (r.tipo === "combo" && (itensCombo.length < 2 || !r.combo?.preco)) return setErro("O combo precisa de pelo menos 2 itens e um preço.");
    salvarPromocao({ ...r, nome: r.nome.trim() });
    setR(null);
  }

  return (
    <div className="grid gap-3">
      <p className="text-[12.5px] text-mudo">{TIPOS[r.tipo].d}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome">
          <Entrada value={r.nome} onChange={(e) => set({ nome: e.target.value })} placeholder={r.tipo === "combo" ? "Ex.: Combo picanha + chope" : "Ex.: Happy hour do chope"} autoFocus />
        </Campo>
        {r.tipo === "cupom" && (
          <Campo rotulo="Código">
            <Entrada value={r.codigo ?? ""} onChange={(e) => set({ codigo: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="BEMVINDO10" />
          </Campo>
        )}
        {r.tipo !== "combo" && (
          <>
            <Campo rotulo="Desconto (%)">
              <EntradaValor valor={r.percentual ?? 0} aoMudar={(v) => set({ percentual: Math.min(100, Math.max(0, v)) })} />
            </Campo>
            {r.tipo === "cupom" && (
              <>
                <Campo rotulo="Ou desconto fixo (R$)">
                  <EntradaValor valor={r.valorFixo ?? 0} aoMudar={(v) => set({ valorFixo: v || undefined })} />
                </Campo>
                <Campo rotulo="Pedido mínimo (R$)">
                  <EntradaValor valor={r.pedidoMinimo ?? 0} aoMudar={(v) => set({ pedidoMinimo: v || undefined })} />
                </Campo>
                <Campo rotulo="Limite de usos (0 = sem limite)">
                  <EntradaValor valor={r.limiteUsos ?? 0} aoMudar={(v) => set({ limiteUsos: Math.floor(v) || undefined })} />
                </Campo>
              </>
            )}
            <Campo rotulo="Válido até (opcional)">
              <Entrada type="date" value={r.validoAte ?? ""} onChange={(e) => set({ validoAte: e.target.value || undefined })} />
            </Campo>
          </>
        )}
      </div>

      {r.tipo === "happyhour" && (
        <>
          <Grupo rotulo="Dias da semana">
            <div className="flex flex-wrap gap-1.5">
              {DIAS.map((d, i) => (
                <Chip key={d} ativo={!!r.diasSemana?.includes(i)} onClick={() => set({ diasSemana: alterna(r.diasSemana, i).sort() })}>
                  {d}
                </Chip>
              ))}
            </div>
          </Grupo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Das">
              <Entrada type="time" value={r.horaInicio ?? ""} onChange={(e) => set({ horaInicio: e.target.value })} />
            </Campo>
            <Campo rotulo="Até">
              <Entrada type="time" value={r.horaFim ?? ""} onChange={(e) => set({ horaFim: e.target.value })} />
            </Campo>
          </div>
          <Grupo rotulo="Categorias (nenhuma marcada = cardápio todo)">
            <div className="flex flex-wrap gap-1.5">
              {categorias
                .filter((c) => c.id !== "combos")
                .map((c) => (
                  <Chip key={c.id} ativo={!!r.categoriaIds?.includes(c.id)} onClick={() => set({ categoriaIds: alterna(r.categoriaIds, c.id) })}>
                    {c.nome}
                  </Chip>
                ))}
            </div>
          </Grupo>
        </>
      )}

      {r.tipo === "combo" && (
        <>
          <Grupo rotulo="Itens do combo">
            <div className="grid gap-2">
              {itensCombo.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_36px] gap-2">
                  <Selecao value={it.produtoId} onChange={(e) => set({ combo: { ...r.combo!, itens: itensCombo.map((x, j) => (j === i ? { ...x, produtoId: e.target.value } : x)) } })}>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} · {brl(p.preco)}
                      </option>
                    ))}
                  </Selecao>
                  <EntradaValor valor={it.qtd} aoMudar={(v) => set({ combo: { ...r.combo!, itens: itensCombo.map((x, j) => (j === i ? { ...x, qtd: Math.max(1, Math.floor(v)) } : x)) } })} />
                  <button onClick={() => set({ combo: { ...r.combo!, itens: itensCombo.filter((_, j) => j !== i) } })} className="text-mudo hover:text-st-cancelado" aria-label="Remover item">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <Botao variante="secundario" tamanho="sm" className="justify-self-start" onClick={() => set({ combo: { ...r.combo!, itens: [...itensCombo, { produtoId: produtos[0]?.id ?? "", qtd: 1 }] } })}>
                <Plus size={15} /> Adicionar item
              </Botao>
            </div>
          </Grupo>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Preço do combo (R$)">
              <EntradaValor valor={r.combo?.preco ?? 0} aoMudar={(v) => set({ combo: { ...r.combo!, preco: v } })} />
            </Campo>
            <div className="rounded-2xl bg-fundo p-3 text-[12.5px]">
              <p className="text-mudo">Separados</p>
              <p className="num font-bold">{brl(cheio)}</p>
            </div>
            <div className="rounded-2xl bg-fundo p-3 text-[12.5px]">
              <p className="text-mudo">Custo (fichas) · margem</p>
              <p className="num font-bold">
                {brl(custo)} · {r.combo?.preco ? `${Math.round(((r.combo.preco - custo) / r.combo.preco) * 100)}%` : "—"}
              </p>
            </div>
          </div>
        </>
      )}

      {r.tipo !== "combo" && (
        <Grupo rotulo="Vale em">
          <div className="flex flex-wrap gap-1.5">
            {CANAIS.map((c) => (
              <Chip key={c.v} ativo={!!r.canais?.includes(c.v)} onClick={() => set({ canais: alterna(r.canais, c.v) })}>
                {c.r}
              </Chip>
            ))}
          </div>
        </Grupo>
      )}

      <label className="flex items-center gap-2 text-[13.5px] font-semibold">
        <input type="checkbox" checked={r.ativo} onChange={(e) => set({ ativo: e.target.checked })} className="h-4 w-4 accent-[var(--acao)]" /> Ativa
      </label>
      {erro && <p className="rounded-xl bg-rosado p-2 text-[12.5px] font-semibold text-acao">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Botao variante="fantasma" onClick={() => setR(null)}>
          Cancelar
        </Botao>
        <Botao onClick={salvar}>Salvar</Botao>
      </div>
    </div>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={clsx("rounded-full border-[1.5px] px-3 py-1 text-[12.5px] font-semibold", ativo ? "border-acao bg-rosado text-acao" : "border-linha bg-card")}>
      {children}
    </button>
  );
}

/** Rótulo para um grupo de botões (um <label> ativaria o primeiro botão ao clicar no texto). */
function Grupo({ rotulo, children, className }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={rotulo} className={className}>
      <span className="mb-1.5 block text-[12.5px] font-semibold">{rotulo}</span>
      {children}
    </div>
  );
}
