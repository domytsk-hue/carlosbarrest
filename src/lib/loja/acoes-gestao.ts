"use client";

// Ações da Fase 3: estoque (movimentos, nota fiscal, inventário, ficha técnica)
// e financeiro (contas a pagar e a receber).
import { arred } from "../dominio/calculos";
import { arred3, saldos, type Nota } from "../dominio/estoque";
import { somarMeses } from "../dominio/financeiro";
import type { Lancamento, MovimentoEstoque, Produto, TipoMovEstoque } from "../dominio/tipos";
import { registrarAuditoria } from "./acoes";
import type { Estado } from "./estado";
import { atualizar, novoId, obterEstado } from "./loja";

const agora = () => new Date().toISOString();
const usuario = (e: Estado) => e.funcionarios.find((f) => f.id === e.usuarioId)?.nome;

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

export type MovimentoNovo = { insumoId: string; tipo: Exclude<TipoMovEstoque, "venda" | "estorno">; qtd: number; custo?: number; lote?: string; validade?: string; documento?: string; obs?: string };

/** Entradas somam e recalculam o custo médio; saídas e perdas subtraem; ajuste usa o sinal informado. */
function aplicarMovimentos(e: Estado, novos: MovimentoNovo[]): Estado {
  const saldo = saldos(e.movimentosEstoque);
  let insumos = e.insumos;
  const movs: MovimentoEstoque[] = novos.map((m) => {
    const q = m.tipo === "entrada" ? Math.abs(m.qtd) : m.tipo === "ajuste" ? m.qtd : -Math.abs(m.qtd);
    if (m.tipo === "entrada" && m.custo !== undefined) {
      const s = Math.max(0, saldo.get(m.insumoId) ?? 0);
      insumos = insumos.map((i) => (i.id === m.insumoId ? { ...i, custo: s + q > 0 ? arred((s * i.custo + q * m.custo!) / (s + q)) : m.custo! } : i));
    }
    saldo.set(m.insumoId, arred3((saldo.get(m.insumoId) ?? 0) + q));
    return { id: novoId("me"), em: agora(), usuario: usuario(e), ...m, qtd: arred3(q) };
  });
  return { ...e, insumos, movimentosEstoque: [...e.movimentosEstoque, ...movs] };
}

export function movimentarEstoque(m: MovimentoNovo) {
  atualizar((e) => aplicarMovimentos(e, [m]));
  if (m.tipo === "perda" || m.tipo === "ajuste") {
    const i = obterEstado().insumos.find((x) => x.id === m.insumoId);
    registrarAuditoria(`estoque.${m.tipo}`, `${i?.nome}: ${m.qtd} ${m.obs ?? ""}`);
  }
}

/** Inventário: grava a diferença entre o contado e o saldo do sistema como ajuste. */
export function lancarInventario(contagens: Record<string, number>) {
  const saldo = saldos(obterEstado().movimentosEstoque);
  const ajustes: MovimentoNovo[] = Object.entries(contagens)
    .map(([insumoId, contado]) => ({ insumoId, tipo: "ajuste" as const, qtd: arred3(contado - (saldo.get(insumoId) ?? 0)), obs: "Inventário" }))
    .filter((a) => a.qtd !== 0);
  atualizar((e) => aplicarMovimentos(e, ajustes));
  registrarAuditoria("estoque.inventario", `${Object.keys(contagens).length} itens contados, ${ajustes.length} ajustados`);
  return ajustes.length;
}

export type LinhaNota = { indice: number; insumoId: string; fator: number; lote?: string; validade?: string };

/**
 * Entrada da NF-e: dá entrada nos insumos casados (qtd da nota × fator de
 * conversão), lembra o código do fornecedor e, se pedido, gera a conta a pagar.
 */
export function entradaNota(nota: Nota, linhas: LinhaNota[], conta?: { vencimento: string; planoId: string; parcelas: number }) {
  atualizar((e) => {
    let fornecedores = e.fornecedores;
    let forn = fornecedores.find((f) => f.documento && f.documento.replace(/\D/g, "") === nota.cnpj);
    if (!forn) {
      forn = { id: novoId("fo"), nome: nota.fornecedor, documento: nota.cnpj, telefone: "" };
      fornecedores = [...fornecedores, forn];
    }
    const doc = `NF ${nota.numero}${nota.serie ? "/" + nota.serie : ""}`;
    const movs: MovimentoNovo[] = linhas.map((l) => {
      const it = nota.itens[l.indice];
      const qtd = arred3(it.qtd * l.fator);
      return { insumoId: l.insumoId, tipo: "entrada", qtd, custo: qtd > 0 ? arred(it.total / qtd) : 0, lote: l.lote, validade: l.validade, documento: doc };
    });
    let e2 = aplicarMovimentos({ ...e, fornecedores }, movs);
    e2 = {
      ...e2,
      insumos: e2.insumos.map((i) => {
        const l = linhas.find((x) => x.insumoId === i.id);
        return l ? { ...i, codigoFornecedor: nota.itens[l.indice].codigo, fornecedorId: i.fornecedorId ?? forn!.id } : i;
      }),
    };
    if (conta) e2 = { ...e2, lancamentos: [...e2.lancamentos, ...parcelar({ tipo: "pagar", descricao: `${nota.fornecedor} · ${doc}`, planoId: conta.planoId, fornecedorId: forn.id, valor: nota.total, vencimento: conta.vencimento, documento: doc }, conta.parcelas)] };
    return e2;
  });
  registrarAuditoria("estoque.nota", `${nota.fornecedor} NF ${nota.numero}: ${linhas.length} itens`);
}

export function salvarFicha(produtoId: string, ficha: Produto["ficha"]) {
  atualizar((e) => ({ ...e, produtos: e.produtos.map((p) => (p.id === produtoId ? { ...p, ficha: ficha?.filter((f) => f.insumoId && f.qtd > 0) } : p)) }));
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export type LancamentoNovo = Omit<Lancamento, "id" | "criadoEm">;

function parcelar(l: LancamentoNovo, parcelas: number): Lancamento[] {
  const n = Math.max(1, Math.floor(parcelas));
  const base = arred(l.valor / n);
  return Array.from({ length: n }, (_, k) => ({
    ...l,
    id: novoId("l"),
    criadoEm: agora(),
    valor: k === n - 1 ? arred(l.valor - base * (n - 1)) : base,
    vencimento: somarMeses(l.vencimento, k),
    parcela: n > 1 ? `${k + 1}/${n}` : undefined,
    descricao: l.descricao,
  }));
}

/** Cria (parcelado ou não) ou atualiza uma conta a pagar/receber. */
export function salvarLancamento(l: LancamentoNovo & { id?: string }, parcelas = 1) {
  atualizar((e) => {
    if (l.id && e.lancamentos.some((x) => x.id === l.id)) return { ...e, lancamentos: e.lancamentos.map((x) => (x.id === l.id ? { ...x, ...l, id: x.id } : x)) };
    return { ...e, lancamentos: [...e.lancamentos, ...parcelar(l, parcelas)] };
  });
}

export type Baixa = { pagoEm: string; valorPago: number; multa?: number; juros?: number; descontoPago?: number; formaId?: string };

/** Paga/recebe. Se for recorrente, já cria a do mês seguinte. */
export function baixarLancamento(id: string, b: Baixa) {
  const l = obterEstado().lancamentos.find((x) => x.id === id);
  if (!l || l.pagoEm) return;
  atualizar((e) => {
    let lancamentos = e.lancamentos.map((x) => (x.id === id ? { ...x, ...b } : x));
    if (l.recorrente) {
      const prox = somarMeses(l.vencimento, 1);
      if (!lancamentos.some((x) => x.recorrente && x.descricao === l.descricao && x.vencimento === prox))
        lancamentos = [...lancamentos, { ...l, id: novoId("l"), vencimento: prox, criadoEm: agora(), pagoEm: undefined, valorPago: undefined, multa: undefined, juros: undefined, descontoPago: undefined, anexo: undefined }];
    }
    return { ...e, lancamentos };
  });
  registrarAuditoria(l.tipo === "pagar" ? "financeiro.pago" : "financeiro.recebido", `${l.descricao}: ${b.valorPago.toFixed(2)}`);
}

export function estornarLancamento(id: string) {
  const l = obterEstado().lancamentos.find((x) => x.id === id);
  atualizar((e) => ({
    ...e,
    lancamentos: e.lancamentos.map((x) => (x.id === id ? { ...x, pagoEm: undefined, valorPago: undefined, multa: undefined, juros: undefined, descontoPago: undefined, formaId: undefined } : x)),
  }));
  registrarAuditoria("financeiro.estorno", l?.descricao);
}

export function excluirLancamento(id: string) {
  const l = obterEstado().lancamentos.find((x) => x.id === id);
  atualizar((e) => ({ ...e, lancamentos: e.lancamentos.filter((x) => x.id !== id) }));
  registrarAuditoria("financeiro.excluido", `${l?.descricao} (${l?.valor.toFixed(2)})`);
}
