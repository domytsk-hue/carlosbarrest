import type { Conta, Item, Setor, StatusPreparo } from "./tipos";

export const ORDEM_PREPARO: StatusPreparo[] = ["pendente", "preparo", "pronto", "entregue"];

/** Um "Enviar" de uma conta para um setor: vira um cartão no painel da cozinha. */
export type GrupoPreparo = { chave: string; conta: Conta; pedido: number; setor: Setor; itens: Item[]; status: StatusPreparo; desde: string; prontoEm?: string };

/**
 * Junta os itens enviados em cartões por conta + pedido + setor. O status do
 * cartão é o do item mais atrasado (um item ainda na fila deixa o cartão na fila).
 */
export function gruposPreparo(contas: Conta[], agora: number, setor: Setor | "todos" = "todos"): GrupoPreparo[] {
  const limite = agora - 12 * 3600_000;
  const m = new Map<string, GrupoPreparo>();
  for (const c of contas) {
    if (c.status === "cancelada") continue;
    for (const i of c.itens) {
      if (i.cancelado || i.preparo === "entregue" || new Date(i.enviadoEm).getTime() < limite) continue;
      if (setor !== "todos" && i.setor !== setor) continue;
      const chave = `${c.id}:${i.pedidoNumero}:${i.setor}`;
      const g = m.get(chave) ?? { chave, conta: c, pedido: i.pedidoNumero, setor: i.setor, itens: [], status: "pronto" as StatusPreparo, desde: i.enviadoEm };
      g.itens.push(i);
      if (ORDEM_PREPARO.indexOf(i.preparo) < ORDEM_PREPARO.indexOf(g.status)) g.status = i.preparo;
      if (i.prontoEm && (!g.prontoEm || i.prontoEm > g.prontoEm)) g.prontoEm = i.prontoEm;
      m.set(chave, g);
    }
  }
  return [...m.values()].sort((a, b) => a.desde.localeCompare(b.desde));
}
