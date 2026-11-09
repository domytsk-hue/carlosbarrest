"use client";

// Ações da Fase 5: promoções (cupom, happy hour, combo), chatbot e treinamentos.
import { arred3 } from "../dominio/estoque";
import type { Produto, Promocao, Treinamento } from "../dominio/tipos";
import { registrarAuditoria } from "./acoes";
import type { Estado } from "./estado";
import { atualizar, novoId, obterEstado } from "./loja";

export const CATEGORIA_COMBOS = "combos";

/** Ficha do combo = soma das fichas dos produtos que o compõem. */
function fichaDoCombo(e: Estado, itens: { produtoId: string; qtd: number }[]) {
  const soma = new Map<string, number>();
  for (const it of itens) {
    const p = e.produtos.find((x) => x.id === it.produtoId);
    for (const f of p?.ficha ?? []) soma.set(f.insumoId, arred3((soma.get(f.insumoId) ?? 0) + f.qtd * it.qtd));
  }
  return [...soma].map(([insumoId, qtd]) => ({ insumoId, qtd }));
}

/** Combo vira um produto na categoria "Combos", com preço fechado e a ficha somada. */
function comProdutoDoCombo(e: Estado, p: Promocao): { e: Estado; p: Promocao } {
  if (p.tipo !== "combo" || !p.combo) return { e, p };
  let categorias = e.categorias;
  if (!categorias.some((c) => c.id === CATEGORIA_COMBOS)) categorias = [...categorias, { id: CATEGORIA_COMBOS, nome: "Combos", icone: "🎁" }];
  const nomes = p.combo.itens.map((i) => `${i.qtd}× ${e.produtos.find((x) => x.id === i.produtoId)?.nome ?? "?"}`).join(" + ");
  const setor = e.produtos.find((x) => x.id === p.combo!.itens[0]?.produtoId)?.setor ?? "cozinha";
  const existente = p.combo.produtoId ? e.produtos.find((x) => x.id === p.combo!.produtoId) : undefined;
  const produto: Produto = {
    id: existente?.id ?? novoId("pc"),
    codigo: existente?.codigo ?? `C${e.produtos.filter((x) => x.categoriaId === CATEGORIA_COMBOS).length + 1}`,
    categoriaId: CATEGORIA_COMBOS,
    nome: p.nome,
    descricao: nomes,
    preco: p.combo.preco,
    setor,
    ativo: p.ativo,
    noDelivery: !p.canais?.length || p.canais.includes("delivery"),
    ficha: fichaDoCombo(e, p.combo.itens),
  };
  const produtos = existente ? e.produtos.map((x) => (x.id === produto.id ? { ...x, ...produto } : x)) : [...e.produtos, produto];
  return { e: { ...e, categorias, produtos }, p: { ...p, combo: { ...p.combo, produtoId: produto.id } } };
}

export function salvarPromocao(p: Omit<Promocao, "id"> & { id?: string }) {
  const nova = !p.id;
  atualizar((e) => {
    const base: Promocao = { ...p, id: p.id ?? novoId("pr"), codigo: p.codigo?.trim().toUpperCase() || undefined };
    const r = comProdutoDoCombo(e, base);
    const promocoes = nova ? [...r.e.promocoes, r.p] : r.e.promocoes.map((x) => (x.id === r.p.id ? r.p : x));
    return { ...r.e, promocoes };
  });
  registrarAuditoria(nova ? "Promoção criada" : "Promoção alterada", p.nome);
}

export function alternarPromocao(id: string) {
  const p = obterEstado().promocoes.find((x) => x.id === id);
  if (!p) return;
  salvarPromocao({ ...p, ativo: !p.ativo });
}

export function excluirPromocao(id: string) {
  const p = obterEstado().promocoes.find((x) => x.id === id);
  if (!p) return;
  atualizar((e) => ({
    ...e,
    promocoes: e.promocoes.filter((x) => x.id !== id),
    // O produto do combo sai do cardápio, mas continua no histórico de vendas
    produtos: p.combo?.produtoId ? e.produtos.map((x) => (x.id === p.combo!.produtoId ? { ...x, ativo: false } : x)) : e.produtos,
  }));
  registrarAuditoria("Promoção excluída", p.nome);
}

// ---------------------------------------------------------------------------
// Chatbot
// ---------------------------------------------------------------------------

export function salvarChatbot(c: Estado["config"]["chatbot"]) {
  atualizar((e) => ({ ...e, config: { ...e.config, chatbot: c } }));
  registrarAuditoria("Chatbot alterado", c.ativo ? "ativo" : "desligado");
}

// ---------------------------------------------------------------------------
// Treinamentos
// ---------------------------------------------------------------------------

export function salvarTreinamento(t: Omit<Treinamento, "id" | "confirmados"> & { id?: string; confirmados?: string[] }) {
  atualizar((e) => {
    const novo: Treinamento = { confirmados: [], ...t, id: t.id ?? novoId("tr") };
    return { ...e, treinamentos: t.id ? e.treinamentos.map((x) => (x.id === t.id ? { ...x, ...novo } : x)) : [...e.treinamentos, novo] };
  });
}

export function excluirTreinamento(id: string) {
  atualizar((e) => ({ ...e, treinamentos: e.treinamentos.filter((x) => x.id !== id) }));
}

const alterna = (lista: string[] | undefined, id: string) => (lista?.includes(id) ? lista.filter((x) => x !== id) : [...(lista ?? []), id]);

export function confirmarPresenca(treinamentoId: string, funcionarioId: string) {
  atualizar((e) => ({ ...e, treinamentos: e.treinamentos.map((t) => (t.id === treinamentoId ? { ...t, confirmados: alterna(t.confirmados, funcionarioId) } : t)) }));
}

export function marcarPresente(treinamentoId: string, funcionarioId: string) {
  atualizar((e) => ({ ...e, treinamentos: e.treinamentos.map((t) => (t.id === treinamentoId ? { ...t, presentes: alterna(t.presentes, funcionarioId) } : t)) }));
}

export function concluirMaterial(funcionarioId: string, materialId: string) {
  atualizar((e) => ({ ...e, materiaisConcluidos: { ...e.materiaisConcluidos, [funcionarioId]: alterna(e.materiaisConcluidos[funcionarioId], materialId) } }));
}
