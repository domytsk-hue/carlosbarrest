// Promoções: happy hour (desconto por horário), cupons e combos.
import { arred } from "./calculos";
import type { Canal, Produto, Promocao } from "./tipos";

const minutos = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + (b || 0);
};

/** A promoção vale neste momento e neste canal? */
export function vigente(p: Promocao, canal: Canal, agora = new Date()) {
  if (!p.ativo) return false;
  if (p.validoAte && agora.toLocaleDateString("sv-SE") > p.validoAte) return false;
  if (p.canais?.length && !p.canais.includes(canal)) return false;
  if (p.diasSemana?.length && !p.diasSemana.includes(agora.getDay())) return false;
  if (p.horaInicio && p.horaFim) {
    const m = agora.getHours() * 60 + agora.getMinutes();
    const ini = minutos(p.horaInicio);
    const fim = minutos(p.horaFim);
    // Faixa que atravessa a meia-noite (ex.: 22:00–02:00)
    if (ini <= fim ? m < ini || m >= fim : m < ini && m >= fim) return false;
  }
  if (p.limiteUsos && (p.usos ?? 0) >= p.limiteUsos) return false;
  return true;
}

/** Happy hour que se aplica ao produto agora (o de maior desconto). */
export function happyHourDo(produto: Produto, canal: Canal, promos: Promocao[], agora = new Date()) {
  return promos
    .filter((p) => p.tipo === "happyhour" && vigente(p, canal, agora))
    .filter((p) => (!p.categoriaIds?.length && !p.produtoIds?.length) || p.categoriaIds?.includes(produto.categoriaId) || p.produtoIds?.includes(produto.id))
    .sort((a, b) => (b.percentual ?? 0) - (a.percentual ?? 0))[0];
}

/** Preço do produto no canal, já com happy hour. */
export function precoVigente(produto: Produto, canal: Canal, promos: Promocao[], agora = new Date()) {
  const base = canal === "delivery" ? (produto.precoDelivery ?? produto.preco) : produto.preco;
  const hh = happyHourDo(produto, canal, promos, agora);
  return hh ? arred(base * (1 - (hh.percentual ?? 0) / 100)) : base;
}

export type ResultadoCupom = { ok: true; promocao: Promocao; desconto: number } | { ok: false; erro: string };

/** Valida o cupom e calcula o desconto sobre o subtotal. */
export function validarCupom(codigo: string, subtotal: number, canal: Canal, promos: Promocao[], agora = new Date()): ResultadoCupom {
  const c = codigo.trim().toUpperCase();
  if (!c) return { ok: false, erro: "Digite o cupom" };
  const p = promos.find((x) => x.tipo === "cupom" && x.codigo?.toUpperCase() === c);
  if (!p) return { ok: false, erro: "Cupom não encontrado" };
  if (!vigente(p, canal, agora)) return { ok: false, erro: p.limiteUsos && (p.usos ?? 0) >= p.limiteUsos ? "Cupom esgotado" : "Cupom fora da validade ou não vale aqui" };
  if (p.pedidoMinimo && subtotal < p.pedidoMinimo) return { ok: false, erro: `Vale para pedidos a partir de R$ ${p.pedidoMinimo.toFixed(2).replace(".", ",")}` };
  const desconto = arred(Math.min(subtotal, (subtotal * (p.percentual ?? 0)) / 100 + (p.valorFixo ?? 0)));
  return { ok: true, promocao: p, desconto };
}

export const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function resumoPromocao(p: Promocao) {
  const desc = [p.percentual ? `${p.percentual}%` : "", p.valorFixo ? `R$ ${p.valorFixo.toFixed(2).replace(".", ",")}` : ""].filter(Boolean).join(" + ");
  const quando = [p.diasSemana?.length ? p.diasSemana.map((d) => DIAS[d]).join(", ") : "", p.horaInicio && p.horaFim ? `${p.horaInicio}–${p.horaFim}` : ""].filter(Boolean).join(" · ");
  if (p.tipo === "combo") return `Combo por R$ ${(p.combo?.preco ?? 0).toFixed(2).replace(".", ",")}`;
  if (p.tipo === "cupom") return `${p.codigo} · ${desc} off${p.pedidoMinimo ? ` acima de R$ ${p.pedidoMinimo}` : ""}`;
  return `${desc} off${quando ? ` · ${quando}` : ""}`;
}
