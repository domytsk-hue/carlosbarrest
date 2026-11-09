"use client";

// Ações da Fase 4: pedidos de marketplace, NFC-e e status de volta ao parceiro.
import { arred, total } from "../dominio/calculos";
import type { Conta, Item, StatusEntrega } from "../dominio/tipos";
import { casarProduto, type PedidoMarketplace } from "../integracoes/marketplace";
import { registrarAuditoria } from "./acoes";
import { atualizar, novoId, obterEstado } from "./loja";

const agora = () => new Date().toISOString();

/** Cria a conta do pedido de marketplace (ignora se o mesmo pedido já entrou). */
export function receberPedidoMarketplace(p: PedidoMarketplace): string | null {
  const e0 = obterEstado();
  if (e0.contas.some((c) => c.canal === p.canal && c.externoId === p.externoId)) return null;
  const id = novoId("c");
  const cfg = e0.config.marketplaces[p.canal];
  atualizar((e) => {
    const numero = e.seq.pedido + 1;
    const itens: Item[] = p.itens.map((i) => {
      const prod = casarProduto(i, e.produtos);
      return {
        id: novoId("i"),
        produtoId: prod?.id ?? `ext:${i.codigoExterno ?? i.nome}`,
        nome: prod?.nome ?? i.nome,
        preco: arred(i.precoUnit),
        qtd: i.qtd,
        obs: i.obs,
        setor: prod?.setor ?? "cozinha",
        atendenteId: p.canal,
        pedidoNumero: numero,
        enviadoEm: agora(),
        preparo: "pendente",
      };
    });
    const forma = p.pagoOnline ? "Pago no app" : `Cobrar na entrega: ${p.formaNaEntrega ?? "?"}${p.trocoPara ? ` · troco para ${p.trocoPara.toFixed(2).replace(".", ",")}` : ""}`;
    let conta: Conta = {
      id,
      numero: e.seq.conta,
      canal: p.canal,
      status: "aberta",
      externoId: p.externoId,
      clienteNome: p.cliente.nome,
      telefone: p.cliente.telefone,
      endereco: p.entrega ? { rua: p.entrega.rua, numero: p.entrega.numero, complemento: [p.entrega.complemento, p.entrega.bairro].filter(Boolean).join(" · ") || undefined, referencia: p.entrega.referencia } : undefined,
      paraViagem: p.retirada,
      statusEntrega: cfg.aceiteAutomatico ? "confirmado" : "novo",
      itens,
      pagamentos: [],
      desconto: arred(p.desconto),
      servicoPct: 0,
      couvert: 0,
      taxaEntrega: arred(p.taxaEntrega),
      abertaEm: agora(),
      pagoNoApp: p.pagoOnline,
      observacao: [`#${p.codigo}`, forma, p.observacao].filter(Boolean).join(" · "),
    };
    // Pago no app: registra o pagamento sem passar pelo caixa
    if (p.pagoOnline) conta = { ...conta, pagamentos: [{ id: novoId("pg"), formaId: "fp7", valor: total(conta), em: agora(), referencia: `${p.canal}:${p.externoId}` }] };
    return { ...e, contas: [...e.contas, conta], seq: { conta: e.seq.conta + 1, pedido: numero } };
  });
  return id;
}

const ACAO_MARKETPLACE: Partial<Record<StatusEntrega, string>> = { confirmado: "confirmar", pronto: "pronto", saiu: "despachar", entregue: "concluir" };

/** Avisa o iFood/aiqfome da mudança de status (se a integração estiver ligada). */
export function notificarMarketplace(conta: Conta, status: StatusEntrega) {
  if (conta.canal !== "ifood" && conta.canal !== "aiqfome") return;
  const cfg = obterEstado().config.marketplaces[conta.canal];
  const acao = ACAO_MARKETPLACE[status];
  if (!cfg?.ativo || !acao || !conta.externoId) return;
  fetch(`/api/marketplace/${conta.canal}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pedidoId: conta.externoId, acao }) }).catch(() => {});
}

/** Pede a NFC-e ao emissor configurado (servidor) e guarda o resultado na conta. */
export async function emitirNfce(contaId: string): Promise<{ ok: boolean; mensagem: string }> {
  const e = obterEstado();
  const conta = e.contas.find((c) => c.id === contaId);
  if (!conta) return { ok: false, mensagem: "Conta não encontrada" };
  const referencia = conta.nfce?.referencia ?? `cb-${conta.numero}-${Date.now().toString(36)}`;
  const r = await fetch("/api/fiscal/nfce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referencia, conta, produtos: e.produtos, formas: e.formasPagamento, fiscal: e.config.fiscal }),
  });
  const j = (await r.json().catch(() => ({}))) as { status?: string; numero?: string; serie?: string; chave?: string; url?: string; mensagem?: string; erro?: string };
  if (!r.ok) {
    if (r.status !== 501) mudar(contaId, { status: "erro", referencia, mensagem: j.erro ?? `Erro ${r.status}`, em: agora() });
    return { ok: false, mensagem: j.erro ?? `Erro ${r.status}` };
  }
  const status = j.status === "autorizado" ? "autorizada" : j.status === "processando_autorizacao" ? "processando" : "erro";
  mudar(contaId, { status, referencia, numero: j.numero, serie: j.serie, chave: j.chave, url: j.url, mensagem: j.mensagem, em: agora() });
  if (status === "autorizada") registrarAuditoria("fiscal.nfce", `Conta ${conta.numero}: NFC-e ${j.numero}`);
  return { ok: status !== "erro", mensagem: status === "autorizada" ? `NFC-e ${j.numero} autorizada` : (j.mensagem ?? status) };
}

function mudar(contaId: string, nfce: NonNullable<Conta["nfce"]>) {
  atualizar((e) => ({ ...e, contas: e.contas.map((c) => (c.id === contaId ? { ...c, nfce } : c)) }));
}
