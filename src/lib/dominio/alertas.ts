import type { Estado } from "../loja/estado";
import { diaLocal, minutosDesde } from "./calculos";
import { saldos } from "./estoque";

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
  const s = saldos(e.movimentosEstoque ?? []);
  const baixos = (e.config.estoqueAtivo ? (e.insumos ?? []) : []).filter((i) => i.ativo && (s.get(i.id) ?? 0) < i.estoqueMinimo);
  if (baixos.length)
    a.push({ tipo: "estoque", texto: baixos.length === 1 ? `${baixos[0].nome} está abaixo do estoque mínimo` : `${baixos.length} insumos abaixo do mínimo: ${baixos.slice(0, 3).map((i) => i.nome).join(", ")}${baixos.length > 3 ? "…" : ""}`, href: "/estoque" });
  const hoje = diaLocal();
  const abertas = (e.lancamentos ?? []).filter((l) => !l.pagoEm && l.tipo === "pagar");
  const vencidas = abertas.filter((l) => l.vencimento < hoje);
  const deHoje = abertas.filter((l) => l.vencimento === hoje);
  if (vencidas.length) a.push({ tipo: "conta", texto: `${vencidas.length} ${vencidas.length === 1 ? "conta vencida" : "contas vencidas"} a pagar (R$ ${vencidas.reduce((x, l) => x + l.valor, 0).toFixed(2).replace(".", ",")})`, href: "/contas" });
  if (deHoje.length) a.push({ tipo: "conta", texto: `${deHoje.length} ${deHoje.length === 1 ? "conta vence" : "contas vencem"} hoje: ${deHoje.map((l) => l.descricao).slice(0, 2).join(", ")}`, href: "/contas" });
  return a.slice(0, 8);
}
