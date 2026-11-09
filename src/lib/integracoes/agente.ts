"use client";

// Envia cupons ESC/POS ao agente local de impressão (pasta agente/ do repositório).
import { brl, hora, itensValidos, pago, restante, subtotal, total, totalItem, valorServico } from "../dominio/calculos";
import type { Conta, Setor } from "../dominio/tipos";
import type { Estado } from "../loja/estado";
import { Cupom } from "./escpos";

export type TrabalhoImpressao =
  | { tipo: "conta"; conta: Conta }
  | { tipo: "preparo"; conta: Conta; pedidoNumero?: number; setor?: Setor }
  | { tipo: "texto"; titulo: string; linhas: [string, string][] };

export async function chamarAgente(url: string, rota: "imprimir" | "testar" | "status", corpo?: object) {
  const r = await fetch(url.replace(/\/$/, "") + "/" + rota, {
    method: rota === "status" ? "GET" : "POST",
    headers: corpo ? { "Content-Type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(6000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro ?? `Agente respondeu ${r.status}`);
  return j;
}

export function rotuloConta(c: Conta, e: Estado) {
  if (c.canal === "mesa") return `Mesa ${e.mesas.find((m) => m.id === c.mesaId)?.numero ?? "?"}`;
  if (c.canal === "comanda") return `Comanda ${c.comanda}`;
  if (c.canal === "ifood") return `iFood #${c.externoId?.slice(-4) ?? c.numero}`;
  if (c.canal === "aiqfome") return `aiqfome #${c.externoId?.slice(-4) ?? c.numero}`;
  if (c.canal === "entrega" || c.canal === "delivery") return `Entrega #${c.numero}`;
  return `${c.paraViagem ? "Viagem" : "Balcão"} #${c.numero}`;
}

/** Monta os cupons de um trabalho, já separados por impressora. */
export function montarCupons(t: TrabalhoImpressao, e: Estado): { impressora: string; cupom: Cupom }[] {
  const imps = e.config.impressao.impressoras;
  const para = (setor: "caixa" | "cozinha" | "bar") => imps.find((i) => i.setores.includes(setor)) ?? imps[0];
  const novo = (setor: "caixa" | "cozinha" | "bar") => {
    const imp = para(setor);
    return { impressora: imp?.nome ?? setor, cupom: new Cupom(imp?.colunas ?? 48) };
  };

  if (t.tipo === "preparo") {
    const itens = itensValidos(t.conta).filter((i) => (t.pedidoNumero ? i.pedidoNumero === t.pedidoNumero : true) && (!t.setor || i.setor === t.setor));
    const setores = [...new Set(itens.map((i) => i.setor))];
    return setores.map((s) => {
      const r = novo(s);
      r.cupom.texto(`PREPARO · ${s.toUpperCase()}`, { negrito: true, centro: true, grande: true });
      r.cupom.texto(`${rotuloConta(t.conta, e)} · Pedido ${t.pedidoNumero ?? "—"} · ${hora(new Date().toISOString())}`, { centro: true });
      if (t.conta.paraViagem) r.cupom.texto("PARA VIAGEM", { negrito: true, centro: true });
      r.cupom.separador();
      for (const i of itens.filter((x) => x.setor === s)) {
        r.cupom.texto(`${i.qtd}x ${i.nome}`, { negrito: true, grande: true });
        if (i.obs) r.cupom.texto(`  > ${i.obs}`, { negrito: true });
      }
      r.cupom.cortar();
      return r;
    });
  }

  const r = novo("caixa");
  const c = r.cupom;
  c.texto(e.config.nome, { negrito: true, centro: true });
  if (t.tipo === "texto") {
    c.texto(t.titulo, { centro: true }).separador();
    for (const [a, b] of t.linhas) c.linha(a, b);
    c.cortar();
    return [r];
  }
  const k = t.conta;
  c.texto(`${rotuloConta(k, e)} · Conta ${k.numero}`, { centro: true });
  c.texto(new Date().toLocaleString("pt-BR"), { centro: true });
  if (k.clienteNome) c.texto(`Cliente: ${k.clienteNome}`);
  if (k.endereco) c.texto(`${k.endereco.rua}, ${k.endereco.numero} ${k.endereco.complemento ?? ""}`);
  c.separador();
  for (const i of itensValidos(k)) c.linha(`${i.qtd}x ${i.nome}`, brl(totalItem(i)));
  c.separador();
  c.linha("Subtotal", brl(subtotal(k)));
  if (k.servicoPct > 0) c.linha(`Serviço ${k.servicoPct}%`, brl(valorServico(k)));
  if (k.couvert > 0) c.linha("Couvert", brl(k.couvert));
  if (k.taxaEntrega > 0) c.linha("Taxa de entrega", brl(k.taxaEntrega));
  if (k.desconto > 0) c.linha("Desconto", "-" + brl(k.desconto));
  c.linha("TOTAL", brl(total(k)), true);
  if (pago(k) > 0) c.linha("Pago", brl(pago(k))).linha("Restante", brl(restante(k)));
  c.separador();
  c.texto(k.nfce?.chave ? `NFC-e ${k.nfce.numero} · consulte pela chave\n${k.nfce.chave}` : "Não é documento fiscal · Obrigado pela preferência!", { centro: true });
  c.cortar();
  return [r];
}

export async function imprimirNoAgente(t: TrabalhoImpressao, e: Estado) {
  const url = e.config.impressao.agenteUrl;
  for (const { impressora, cupom } of montarCupons(t, e)) await chamarAgente(url, "imprimir", { impressora, dados: cupom.base64() });
}
