import type { Estado } from "../loja/estado";
import { minutosDesde } from "./calculos";

export type Alerta = { tipo: "atraso" | "estoque" | "conta" | "caixa"; texto: string; href: string };

/** Alertas da dashboard. Cada fase acrescenta as suas regras aqui. */
export function calcularAlertas(e: Estado, agora = Date.now()): Alerta[] {
  const a: Alerta[] = [];
  const mesa = (id?: string) => e.mesas.find((m) => m.id === id)?.numero;

  for (const c of e.contas) {
    if (c.status !== "aberta" && c.status !== "fechamento") continue;
    const pendentes = c.itens.filter((i) => !i.cancelado && (i.preparo === "pendente" || i.preparo === "preparo"));
    const maisAntigo = pendentes.sort((x, y) => x.enviadoEm.localeCompare(y.enviadoEm))[0];
    if (maisAntigo && minutosDesde(maisAntigo.enviadoEm, agora) >= 25) {
      const onde = c.canal === "mesa" ? `Mesa ${mesa(c.mesaId)}` : c.canal === "comanda" ? `Comanda ${c.comanda}` : `Conta ${c.numero}`;
      a.push({ tipo: "atraso", texto: `Pedido ${maisAntigo.pedidoNumero} (${onde}) está há ${minutosDesde(maisAntigo.enviadoEm, agora)} min no preparo`, href: c.canal === "mesa" ? "/mesas" : "/comandas" });
    }
  }
  for (const c of e.contas) {
    if (!["entrega", "delivery", "ifood", "aiqfome"].includes(c.canal) || c.status === "cancelada" || c.statusEntrega === "entregue") continue;
    const m = minutosDesde(c.abertaEm, agora);
    if (m >= 45) a.push({ tipo: "atraso", texto: `Entrega #${c.numero} de ${c.clienteNome ?? "cliente"} está há ${m} min`, href: "/entregas" });
  }
  for (const ch of e.chamados ?? []) {
    if (ch.atendidoEm) continue;
    const m = minutosDesde(ch.em, agora);
    if (m >= 3) a.push({ tipo: "atraso", texto: `Mesa ${mesa(ch.mesaId)} ${ch.motivo === "conta" ? "pediu a conta" : "chamou o garçom"} há ${m} min`, href: "/garcom" });
  }
  for (const c of e.contas) {
    if (c.canal !== "delivery" || c.statusEntrega !== "novo" || c.status === "cancelada") continue;
    const m = minutosDesde(c.abertaEm, agora);
    if (m >= 5) a.push({ tipo: "atraso", texto: `Pedido online #${c.numero} aguarda aceite há ${m} min`, href: "/entregas" });
  }
  for (const s of e.sessoesCaixa) {
    if (!s.fechadaEm && minutosDesde(s.abertaEm, agora) > 14 * 60) {
      a.push({ tipo: "caixa", texto: `${e.caixas.find((c) => c.id === s.caixaId)?.nome} está aberto há mais de 14 horas`, href: "/caixa" });
    }
  }
  return a.slice(0, 8);
}
