import { arred, diaLocal, itensValidos, total } from "./calculos";
import type { Canal, Conta, FormaPagamento, Funcionario } from "./tipos";

export const ROTULO_CANAL: Record<Canal, string> = {
  mesa: "Salão",
  comanda: "Comandas",
  balcao: "Balcão",
  pdv: "PDV",
  entrega: "Entrega (telefone)",
  delivery: "Delivery próprio",
  ifood: "iFood",
  aiqfome: "aiqfome",
  qrcode: "QR Code na mesa",
};

export type Periodo = { de: string; ate: string };

/** Contas pagas cujo fechamento caiu no período (datas locais AAAA-MM-DD, inclusivas). */
export function vendasNoPeriodo(contas: Conta[], p: Periodo) {
  return contas.filter((c) => c.status === "paga" && c.fechadaEm && diaLocal(new Date(c.fechadaEm)) >= p.de && diaLocal(new Date(c.fechadaEm)) <= p.ate);
}

export function somaVendas(contas: Conta[]) {
  return arred(contas.reduce((s, c) => s + total(c), 0));
}

export function porCanal(contas: Conta[]) {
  const m = new Map<Canal, { qtd: number; valor: number }>();
  for (const c of contas) {
    const x = m.get(c.canal) ?? { qtd: 0, valor: 0 };
    m.set(c.canal, { qtd: x.qtd + 1, valor: arred(x.valor + total(c)) });
  }
  return [...m.entries()].map(([canal, v]) => ({ canal, rotulo: ROTULO_CANAL[canal], ...v })).sort((a, b) => b.valor - a.valor);
}

export function porForma(contas: Conta[], formas: FormaPagamento[]) {
  return formas
    .map((f) => {
      const ps = contas.flatMap((c) => c.pagamentos).filter((p) => p.formaId === f.id);
      return { forma: f, qtd: ps.length, valor: arred(ps.reduce((s, p) => s + p.valor, 0)) };
    })
    .filter((x) => x.qtd > 0)
    .sort((a, b) => b.valor - a.valor);
}

export function porProduto(contas: Conta[]) {
  const m = new Map<string, { nome: string; produtoId: string; qtd: number; valor: number }>();
  for (const c of contas)
    for (const i of itensValidos(c)) {
      const x = m.get(i.produtoId) ?? { nome: i.nome, produtoId: i.produtoId, qtd: 0, valor: 0 };
      m.set(i.produtoId, { ...x, qtd: x.qtd + i.qtd, valor: arred(x.valor + i.preco * i.qtd) });
    }
  return [...m.values()].sort((a, b) => b.valor - a.valor);
}

export function porAtendente(contas: Conta[], funcionarios: Funcionario[]) {
  const m = new Map<string, { qtd: number; valor: number; servico: number }>();
  for (const c of contas) {
    const itens = itensValidos(c);
    const sub = itens.reduce((s, i) => s + i.preco * i.qtd, 0) || 1;
    for (const i of itens) {
      const id = i.atendenteId ?? "—";
      const x = m.get(id) ?? { qtd: 0, valor: 0, servico: 0 };
      const v = i.preco * i.qtd;
      m.set(id, { qtd: x.qtd + i.qtd, valor: arred(x.valor + v), servico: arred(x.servico + (v / sub) * ((sub * c.servicoPct) / 100)) });
    }
  }
  return [...m.entries()].map(([id, v]) => ({ id, nome: id === "qrcode" ? "Cardápio QR" : id === "online" ? "Delivery online" : (funcionarios.find((f) => f.id === id)?.nome ?? "—"), ...v })).sort((a, b) => b.valor - a.valor);
}

export function porHora(contas: Conta[]) {
  const horas = Array.from({ length: 24 }, (_, h) => ({ hora: h, valor: 0, qtd: 0 }));
  for (const c of contas) {
    const h = new Date(c.abertaEm).getHours();
    horas[h].valor = arred(horas[h].valor + total(c));
    horas[h].qtd++;
  }
  return horas;
}

export function porDia(contas: Conta[], p: Periodo) {
  const dias: { dia: string; valor: number; qtd: number }[] = [];
  for (let d = new Date(p.de + "T12:00:00"); diaLocal(d) <= p.ate; d.setDate(d.getDate() + 1)) dias.push({ dia: diaLocal(d), valor: 0, qtd: 0 });
  for (const c of contas) {
    const x = dias.find((d) => d.dia === diaLocal(new Date(c.fechadaEm!)));
    if (x) {
      x.valor = arred(x.valor + total(c));
      x.qtd++;
    }
  }
  return dias;
}

export function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return diaLocal(d);
}

/** Exporta linhas para CSV (abre no Excel com ; e vírgula decimal). */
export function baixarCsv(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const fmt = (v: string | number) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : `"${String(v).replace(/"/g, '""')}"`);
  const csv = "﻿" + [cabecalho.map(fmt), ...linhas.map((l) => l.map(fmt))].map((l) => l.join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `${nome}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
