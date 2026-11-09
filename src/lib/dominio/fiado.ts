import { arred } from "./calculos";
import type { MovFiado } from "./tipos";

/** Saldo devedor do cliente: compras lançadas menos pagamentos. */
export function saldoFiado(movs: MovFiado[], clienteId: string) {
  return arred(movs.filter((m) => m.clienteId === clienteId).reduce((s, m) => s + (m.tipo === "lancamento" ? m.valor : -m.valor), 0));
}

/** Resumo por cliente: total comprado, total pago, saldo e último movimento. */
export function resumoFiado(movs: MovFiado[], clienteId: string) {
  const meus = movs.filter((m) => m.clienteId === clienteId);
  const comprado = arred(meus.filter((m) => m.tipo === "lancamento").reduce((s, m) => s + m.valor, 0));
  const pago = arred(meus.filter((m) => m.tipo === "pagamento").reduce((s, m) => s + m.valor, 0));
  const ultimo = meus.reduce<string | undefined>((u, m) => (!u || m.em > u ? m.em : u), undefined);
  return { comprado, pago, saldo: arred(comprado - pago), ultimo, qtd: meus.length };
}
