// Estoque: saldo por insumo, custo da ficha técnica (CMV) e leitura do XML da NF-e.
import { arred, itensValidos } from "./calculos";
import type { Conta, Insumo, MovimentoEstoque, Produto, Unidade } from "./tipos";

export const ROTULO_UNIDADE: Record<Unidade, string> = { un: "un", kg: "kg", g: "g", l: "L", ml: "mL", cx: "cx", pct: "pct" };

/** Fichas técnicas de exemplo para alguns pratos do cardápio. */
export function comFichasExemplo(produtos: Produto[]): Produto[] {
  const fichas: Record<string, Produto["ficha"]> = {
    p1: [
      { insumoId: "in1", qtd: 0.6 },
      { insumoId: "in3", qtd: 0.25 },
      { insumoId: "in4", qtd: 0.2 },
      { insumoId: "in5", qtd: 0.1 },
      { insumoId: "in7", qtd: 0.3 },
    ],
    p2: [
      { insumoId: "in2", qtd: 0.7 },
      { insumoId: "in3", qtd: 0.25 },
      { insumoId: "in4", qtd: 0.2 },
      { insumoId: "in7", qtd: 0.3 },
    ],
    p3: [
      { insumoId: "in1", qtd: 0.3 },
      { insumoId: "in2", qtd: 0.35 },
      { insumoId: "in3", qtd: 0.25 },
      { insumoId: "in4", qtd: 0.2 },
    ],
    p72: [{ insumoId: "in6", qtd: 1 }],
  };
  return produtos.map((p) => (fichas[p.id] ? { ...p, ficha: fichas[p.id] } : p));
}

export function saldos(movs: MovimentoEstoque[]) {
  const m = new Map<string, number>();
  for (const x of movs) m.set(x.insumoId, arred3((m.get(x.insumoId) ?? 0) + x.qtd));
  return m;
}

export const arred3 = (v: number) => Math.round(v * 1000) / 1000;

/** Custo de uma unidade do produto pela ficha técnica (undefined se não tem ficha). */
export function custoFicha(p: Produto, insumos: Insumo[]) {
  if (!p.ficha?.length) return undefined;
  return arred(p.ficha.reduce((s, f) => s + f.qtd * (insumos.find((i) => i.id === f.insumoId)?.custo ?? 0), 0));
}

/** Consumo de insumos de uma lista de itens vendidos. */
export function consumo(itens: { produtoId: string; qtd: number }[], produtos: Produto[]) {
  const m = new Map<string, number>();
  for (const it of itens) {
    const p = produtos.find((x) => x.id === it.produtoId);
    for (const f of p?.ficha ?? []) m.set(f.insumoId, arred3((m.get(f.insumoId) ?? 0) + f.qtd * it.qtd));
  }
  return m;
}

/** CMV das vendas: custo pela ficha e a parte da receita sem ficha. */
export function cmvDasVendas(contas: Conta[], produtos: Produto[], insumos: Insumo[]) {
  let cmv = 0;
  let receitaSemFicha = 0;
  for (const c of contas)
    for (const i of itensValidos(c)) {
      const p = produtos.find((x) => x.id === i.produtoId);
      const custo = p ? custoFicha(p, insumos) : undefined;
      if (custo === undefined) receitaSemFicha += i.preco * i.qtd;
      else cmv += custo * i.qtd;
    }
  return { cmv: arred(cmv), receitaSemFicha: arred(receitaSemFicha) };
}

// ---------------------------------------------------------------------------
// NF-e (XML do fornecedor)
// ---------------------------------------------------------------------------

export type ItemNota = { codigo: string; descricao: string; unidade: string; qtd: number; valorUnit: number; total: number; ean?: string };
export type Nota = { numero: string; serie: string; emissao: string; fornecedor: string; cnpj: string; total: number; itens: ItemNota[] };

/** Lê o XML da NF-e (modelo 55) no navegador. */
export function lerXmlNfe(xml: string): Nota {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Arquivo XML inválido");
  const um = (el: Element | Document, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
  const ide = doc.getElementsByTagName("ide")[0];
  const emit = doc.getElementsByTagName("emit")[0];
  if (!ide || !emit) throw new Error("Não parece uma NF-e (faltam ide/emit)");
  const itens = Array.from(doc.getElementsByTagName("det")).map((det) => {
    const prod = det.getElementsByTagName("prod")[0];
    return {
      codigo: um(prod, "cProd"),
      descricao: um(prod, "xProd"),
      unidade: um(prod, "uCom"),
      qtd: Number(um(prod, "qCom")),
      valorUnit: Number(um(prod, "vUnCom")),
      total: Number(um(prod, "vProd")),
      ean: um(prod, "cEAN") || undefined,
    };
  });
  return {
    numero: um(ide, "nNF"),
    serie: um(ide, "serie"),
    emissao: (um(ide, "dhEmi") || um(ide, "dEmi")).slice(0, 10),
    fornecedor: um(emit, "xFant") || um(emit, "xNome"),
    cnpj: um(emit, "CNPJ") || um(emit, "CPF"),
    total: Number(um(doc.getElementsByTagName("ICMSTot")[0] ?? doc, "vNF")) || arred(itens.reduce((s, i) => s + i.total, 0)),
    itens,
  };
}

/** Sugere o insumo de cada item da nota (código do fornecedor ou nome parecido). */
export function sugerirInsumo(item: ItemNota, insumos: Insumo[]) {
  const porCodigo = insumos.find((i) => i.codigoFornecedor && i.codigoFornecedor === item.codigo);
  if (porCodigo) return porCodigo.id;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  const d = norm(item.descricao);
  return insumos.find((i) => d.includes(norm(i.nome)) || norm(i.nome).includes(d.split(" ")[0]))?.id;
}
