import type { Conta, Item } from "./tipos";

export const arred = (v: number) => Math.round(v * 100) / 100;

export const itensValidos = (c: Conta) => c.itens.filter((i) => !i.cancelado);

export const totalItem = (i: Item) => arred(i.preco * i.qtd);

export function subtotal(c: Conta) {
  return arred(itensValidos(c).reduce((s, i) => s + totalItem(i), 0));
}

export function valorServico(c: Conta) {
  return arred((subtotal(c) * c.servicoPct) / 100);
}

export function total(c: Conta) {
  return arred(Math.max(0, subtotal(c) + valorServico(c) + c.couvert + c.taxaEntrega - c.desconto));
}

export function pago(c: Conta) {
  return arred(c.pagamentos.reduce((s, p) => s + p.valor, 0));
}

export function restante(c: Conta) {
  return arred(Math.max(0, total(c) - pago(c)));
}

/** Minutos desde um instante ISO. */
export function minutosDesde(iso: string, agora = Date.now()) {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
}

export function duracao(iso: string, agora = Date.now()) {
  const m = minutosDesde(iso, agora);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

/** Cor da faixa de espera usada em Entregas (0, 15, 30, 45 min, 1 h). */
export function faixaEspera(min: number) {
  if (min >= 60) return { cor: "#C0392B", rotulo: "1h+" };
  if (min >= 45) return { cor: "#E0702F", rotulo: "45 min" };
  if (min >= 30) return { cor: "#F2A93B", rotulo: "30 min" };
  if (min >= 15) return { cor: "#3B82C4", rotulo: "15 min" };
  return { cor: "#2E9E55", rotulo: "0 min" };
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const mesmoDia = (iso: string, dia: string) => new Date(iso).toLocaleDateString("sv-SE") === dia;

export const diaLocal = (d = new Date()) => d.toLocaleDateString("sv-SE");
