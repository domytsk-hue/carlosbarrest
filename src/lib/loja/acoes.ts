"use client";

import { arred, restante, total } from "../dominio/calculos";
import { consumo } from "../dominio/estoque";
import { precoVigente, validarCupom } from "../dominio/promocoes";
import { nomeConta, rotuloMesa } from "../dominio/rotulos";
import type { Canal, Conta, Endereco, FormaPagamentoOnline, Item, MovFiado, MovimentoCaixa, Pagamento, SessaoCaixa, StatusEntrega, StatusPreparo, TipoMovimento } from "../dominio/tipos";
import type { Config, Estado } from "./estado";
import { atualizar, novoId, obterEstado } from "./loja";

const agora = () => new Date().toISOString();

function usuarioNome(e: Estado) {
  return e.funcionarios.find((f) => f.id === e.usuarioId)?.nome ?? "Usuário";
}

function comAuditoria(e: Estado, acao: string, detalhes?: string): Estado {
  return {
    ...e,
    auditoria: [{ id: novoId("a"), em: agora(), usuario: usuarioNome(e), acao, detalhes }, ...e.auditoria].slice(0, 2000),
  };
}

export function registrarAuditoria(acao: string, detalhes?: string) {
  atualizar((e) => comAuditoria(e, acao, detalhes));
}

function mudarConta(id: string, fn: (c: Conta) => Conta) {
  atualizar((e) => ({ ...e, contas: e.contas.map((c) => (c.id === id ? fn(c) : c)) }));
}

/**
 * Baixa (sinal 1) ou devolve (sinal −1) no estoque os insumos da ficha técnica
 * dos itens vendidos.
 */
function comBaixa(e: Estado, itens: { produtoId: string; qtd: number }[], sinal: 1 | -1, documento: string): Estado {
  // Estoque desligado (até o restaurante começar a usar): vendas não mexem nele
  if (!e.config.estoqueAtivo) return e;
  const c = consumo(itens, e.produtos);
  if (!c.size) return e;
  const em = agora();
  const movs = [...c.entries()].map(([insumoId, q]) => ({
    id: novoId("me"),
    insumoId,
    tipo: sinal === 1 ? ("venda" as const) : ("estorno" as const),
    qtd: -sinal * q,
    em,
    documento,
  }));
  return { ...e, movimentosEstoque: [...e.movimentosEstoque, ...movs] };
}

// ---------------------------------------------------------------------------
// Contas (pedidos de qualquer canal)
// ---------------------------------------------------------------------------

export type NovaConta = Partial<Omit<Conta, "id" | "numero" | "itens" | "pagamentos">> & { canal: Canal };

export function abrirConta(dados: NovaConta): string {
  const id = novoId("c");
  atualizar((e) => {
    const conta: Conta = {
      status: "aberta",
      desconto: 0,
      servicoPct: dados.canal === "mesa" || dados.canal === "comanda" || dados.canal === "qrcode" ? e.config.servicoPct : 0,
      couvert: 0,
      taxaEntrega: 0,
      abertaEm: agora(),
      atendenteId: e.usuarioId,
      ...dados,
      id,
      numero: e.seq.conta,
      itens: [],
      pagamentos: [],
    };
    return { ...e, contas: [...e.contas, conta], seq: { ...e.seq, conta: e.seq.conta + 1 } };
  });
  return id;
}

/** Remove uma conta recém-aberta que ficou sem itens nem pagamentos. */
export function descartarSeVazia(contaId: string) {
  atualizar((e) => {
    const c = e.contas.find((x) => x.id === contaId);
    if (!c || c.itens.length || c.pagamentos.length) return e;
    return { ...e, contas: e.contas.filter((x) => x.id !== contaId) };
  });
}

/** Conta aberta da mesa, se houver. */
export function contaDaMesa(e: Estado, mesaId: string) {
  return e.contas.find((c) => c.mesaId === mesaId && (c.status === "aberta" || c.status === "fechamento"));
}

export function contaDaComanda(e: Estado, numero: number) {
  return e.contas.find((c) => c.canal === "comanda" && c.comanda === numero && (c.status === "aberta" || c.status === "fechamento"));
}

export type ItemNovo = { produtoId: string; qtd: number; obs?: string };

/** "Enviar": lança os itens na conta com um novo número de pedido de preparo. */
export function lancarItens(contaId: string, itens: ItemNovo[], atendenteId?: string): number {
  let numero = 0;
  atualizar((e) => {
    numero = e.seq.pedido + 1;
    const canal = e.contas.find((c) => c.id === contaId)?.canal ?? "mesa";
    const novos: Item[] = itens.map((i) => {
      const p = e.produtos.find((x) => x.id === i.produtoId)!;
      return {
        id: novoId("i"),
        produtoId: p.id,
        nome: p.nome,
        preco: precoVigente(p, canal, e.promocoes ?? []),
        qtd: i.qtd,
        obs: i.obs,
        setor: p.setor,
        atendenteId: atendenteId ?? e.usuarioId,
        pedidoNumero: numero,
        enviadoEm: agora(),
        preparo: "pendente",
      };
    });
    return comBaixa(
      {
        ...e,
        seq: { ...e.seq, pedido: numero },
        contas: e.contas.map((c) =>
          c.id === contaId ? { ...c, itens: [...c.itens, ...novos], status: c.status === "fechamento" ? "aberta" : c.status } : c,
        ),
      },
      novos,
      1,
      `Pedido ${numero}`,
    );
  });
  return numero;
}

export function cancelarItem(contaId: string, itemId: string, motivo: string) {
  atualizar((e) => {
    const conta = e.contas.find((c) => c.id === contaId);
    const item = conta?.itens.find((i) => i.id === itemId);
    const e2 = {
      ...e,
      contas: e.contas.map((c) =>
        c.id === contaId
          ? { ...c, itens: c.itens.map((i) => (i.id === itemId ? { ...i, cancelado: { em: agora(), motivo, por: e.usuarioId } } : i)) }
          : c,
      ),
    };
    const e3 = item && !item.cancelado && conta?.status !== "cancelada" ? comBaixa(e2, [item], -1, `Cancelamento conta ${conta?.numero}`) : e2;
    return comAuditoria(e3, "item.cancelado", `Conta ${conta?.numero}: ${item?.qtd}x ${item?.nome} — ${motivo}`);
  });
}

export function alterarQtdItem(contaId: string, itemId: string, qtd: number) {
  atualizar((e) => {
    const conta = e.contas.find((c) => c.id === contaId);
    const item = conta?.itens.find((i) => i.id === itemId);
    if (!conta || !item) return e;
    const nova = Math.max(1, qtd);
    const e2 = { ...e, contas: e.contas.map((c) => (c.id === contaId ? { ...c, itens: c.itens.map((i) => (i.id === itemId ? { ...i, qtd: nova } : i)) } : c)) };
    const delta = nova - item.qtd;
    return delta ? comBaixa(e2, [{ produtoId: item.produtoId, qtd: Math.abs(delta) }], delta > 0 ? 1 : -1, `Conta ${conta.numero}`) : e2;
  });
}

export function aplicarDesconto(contaId: string, valor: number, motivo: string) {
  atualizar((e) => {
    const conta = e.contas.find((c) => c.id === contaId);
    const e2 = { ...e, contas: e.contas.map((c) => (c.id === contaId ? { ...c, desconto: arred(Math.max(0, valor)) } : c)) };
    return comAuditoria(e2, "conta.desconto", `Conta ${conta?.numero}: ${valor.toFixed(2)} — ${motivo}`);
  });
}

export function definirServico(contaId: string, pct: number, couvert = 0) {
  mudarConta(contaId, (c) => ({ ...c, servicoPct: pct, couvert }));
}

export function atualizarConta(contaId: string, dados: Partial<Conta>) {
  mudarConta(contaId, (c) => ({ ...c, ...dados }));
}

export function pedirConta(contaId: string) {
  mudarConta(contaId, (c) => ({ ...c, status: "fechamento" }));
}

export function reabrirConta(contaId: string) {
  atualizar((e) => {
    const conta = e.contas.find((c) => c.id === contaId);
    const e2 = { ...e, contas: e.contas.map((c) => (c.id === contaId ? { ...c, status: "aberta" as const, fechadaEm: undefined } : c)) };
    return comAuditoria(e2, "conta.reaberta", `Conta ${conta?.numero}`);
  });
}

/**
 * Registra um pagamento (parcial ou total). Fecha a conta quando quitada.
 * No fiado, `clienteFiadoId` diz em nome de quem a dívida fica: o valor entra
 * no fiado do cliente com a origem (mesa e número da conta).
 */
export function pagar(contaId: string, formaId: string, valor: number, extra?: Partial<Pagamento>, clienteFiadoId?: string) {
  atualizar((e) => {
    const conta = e.contas.find((c) => c.id === contaId);
    if (!conta) return e;
    const devido = restante(conta);
    const forma = e.formasPagamento.find((f) => f.id === formaId);
    const aplicado = arred(Math.min(valor, devido));
    const troco = forma?.tipo === "dinheiro" && valor > devido ? arred(valor - devido) : undefined;
    const pg: Pagamento = { id: novoId("pg"), formaId, valor: aplicado, troco, em: agora(), sessaoCaixaId: e.sessaoAtivaId, ...extra };
    let atualizada: Conta = { ...conta, pagamentos: [...conta.pagamentos, pg] };
    if (forma?.tipo === "fiado" && clienteFiadoId && !atualizada.clienteId) {
      const cl = e.clientes.find((x) => x.id === clienteFiadoId);
      atualizada = { ...atualizada, clienteId: clienteFiadoId, clienteNome: atualizada.clienteNome ?? cl?.nome };
    }
    if (restante(atualizada) <= 0.009) {
      atualizada = { ...atualizada, status: "paga", fechadaEm: agora() };
      if (atualizada.canal === "entrega" && atualizada.statusEntrega !== "entregue") atualizada.statusEntrega = atualizada.statusEntrega ?? "novo";
    }
    let e2: Estado = { ...e, contas: e.contas.map((c) => (c.id === contaId ? atualizada : c)) };
    // Fiado: a compra vai para a conta do cliente, com a origem
    const devedor = clienteFiadoId ?? conta.clienteId;
    if (forma?.tipo === "fiado" && devedor) {
      const mov: MovFiado = {
        id: novoId("fi"),
        clienteId: devedor,
        tipo: "lancamento",
        valor: aplicado,
        em: agora(),
        origem: `${nomeConta(conta, e.mesas)} · conta ${conta.numero}`,
        contaId,
        usuario: usuarioNome(e),
      };
      e2 = comAuditoria({ ...e2, fiado: [...(e2.fiado ?? []), mov] }, "fiado.lancado", `${e.clientes.find((c) => c.id === devedor)?.nome}: ${aplicado.toFixed(2)} (${mov.origem})`);
    }
    // Crédito pré-pago do cliente
    if (forma?.tipo === "credito_cliente" && conta.clienteId) {
      e2 = { ...e2, clientes: e2.clientes.map((cl) => (cl.id === conta.clienteId ? { ...cl, credito: arred(cl.credito - aplicado) } : cl)) };
    }
    return e2;
  });
}

/** Comissão escolhida pelo cliente (integral, parcial ou zero). `undefined` volta para a sugerida. */
export function definirComissao(contaId: string, valor: number | undefined) {
  atualizar((e) => {
    const conta = e.contas.find((c) => c.id === contaId);
    if (!conta) return e;
    const e2 = { ...e, contas: e.contas.map((c) => (c.id === contaId ? { ...c, servicoValor: valor === undefined ? undefined : arred(Math.max(0, valor)) } : c)) };
    return comAuditoria(e2, "conta.comissao", `Conta ${conta.numero}: ${valor === undefined ? "sugerida" : valor.toFixed(2)}`);
  });
}

/** Observação de um item já lançado (F2). */
export function definirObsItem(contaId: string, itemId: string, obs: string) {
  mudarConta(contaId, (c) => ({ ...c, itens: c.itens.map((i) => (i.id === itemId ? { ...i, obs: obs.trim() || undefined } : i)) }));
}

/**
 * Transfere a conta da mesa para outra mesa (Ctrl+J). Mesa livre: a conta só
 * muda de mesa. Mesa ocupada: as contas são juntadas na de destino — quem chama
 * deve pedir confirmação antes.
 */
export function transferirMesa(contaId: string, mesaDestinoId: string) {
  const e = obterEstado();
  const conta = e.contas.find((c) => c.id === contaId);
  const destino = e.mesas.find((m) => m.id === mesaDestinoId);
  if (!conta || !destino || conta.mesaId === mesaDestinoId) return;
  const ocupada = contaDaMesa(e, mesaDestinoId);
  const origem = rotuloMesa(e.mesas.find((m) => m.id === conta.mesaId));
  if (ocupada) {
    juntarContas(ocupada.id, contaId);
    registrarAuditoria("mesa.juntada", `${origem} → ${rotuloMesa(destino)}`);
  } else {
    mudarConta(contaId, (c) => ({ ...c, mesaId: mesaDestinoId, canal: c.canal === "qrcode" ? "mesa" : c.canal }));
    registrarAuditoria("mesa.transferida", `${origem} → ${rotuloMesa(destino)}`);
  }
}

/** Muda a localização de uma mesa (Salão, Varanda, Rua). Pedidos e histórico continuam ligados a ela. */
export function mudarLocalizacao(mesaId: string, area: string) {
  atualizar((e) => {
    const m = e.mesas.find((x) => x.id === mesaId);
    if (!m || m.area === area) return e;
    const e2 = { ...e, mesas: e.mesas.map((x) => (x.id === mesaId ? { ...x, area } : x)) };
    return comAuditoria(e2, "mesa.localizacao", `Mesa ${m.numero}: ${m.area} → ${area}`);
  });
}

/** Pedido de retirada entregue ao cliente no balcão. */
export function marcarRetirado(contaId: string, retirado = true) {
  mudarConta(contaId, (c) => ({ ...c, retiradoEm: retirado ? agora() : undefined }));
}

export function estornarPagamento(contaId: string, pagamentoId: string) {
  atualizar((e) => {
    const conta = e.contas.find((c) => c.id === contaId);
    const e2 = {
      ...e,
      contas: e.contas.map((c) =>
        c.id === contaId ? { ...c, status: "aberta" as const, fechadaEm: undefined, pagamentos: c.pagamentos.filter((p) => p.id !== pagamentoId) } : c,
      ),
    };
    return comAuditoria(e2, "pagamento.estornado", `Conta ${conta?.numero}`);
  });
}

export function cancelarConta(contaId: string, motivo: string) {
  atualizar((e) => {
    const conta = e.contas.find((c) => c.id === contaId);
    let e2: Estado = { ...e, contas: e.contas.map((c) => (c.id === contaId ? { ...c, status: "cancelada" as const, fechadaEm: agora() } : c)) };
    if (conta && conta.status !== "cancelada") e2 = comBaixa(e2, conta.itens.filter((i) => !i.cancelado), -1, `Cancelamento conta ${conta.numero}`);
    return comAuditoria(e2, "conta.cancelada", `Conta ${conta?.numero} (${conta && total(conta).toFixed(2)}) — ${motivo}`);
  });
}

/** Junta a conta `origemId` dentro de `destinoId` (juntar mesas/comandas). */
export function juntarContas(destinoId: string, origemId: string) {
  atualizar((e) => {
    const origem = e.contas.find((c) => c.id === origemId);
    if (!origem) return e;
    return {
      ...e,
      contas: e.contas
        .map((c) =>
          c.id === destinoId
            ? {
                ...c,
                itens: [...c.itens, ...origem.itens],
                pagamentos: [...c.pagamentos, ...origem.pagamentos],
                desconto: c.desconto + origem.desconto,
                couvert: c.couvert + origem.couvert,
                // A comissão escolhida volta para a sugerida: o consumo mudou
                servicoValor: undefined,
                status: "aberta" as const,
              }
            : c,
        )
        .filter((c) => c.id !== origemId),
    };
  });
}

/** Transfere itens para outra conta (ex.: de uma mesa para outra). */
export function transferirItens(origemId: string, destinoId: string, itemIds: string[]) {
  atualizar((e) => {
    const origem = e.contas.find((c) => c.id === origemId);
    if (!origem) return e;
    const movidos = origem.itens.filter((i) => itemIds.includes(i.id));
    return {
      ...e,
      contas: e.contas.map((c) => {
        if (c.id === origemId) return { ...c, itens: c.itens.filter((i) => !itemIds.includes(i.id)) };
        if (c.id === destinoId) return { ...c, itens: [...c.itens, ...movidos], status: "aberta" as const };
        return c;
      }),
    };
  });
}

/** Agrupa itens iguais (mesmo produto, preço e observação) numa linha só. */
export function agruparItens(contaId: string) {
  mudarConta(contaId, (c) => {
    const mapa = new Map<string, Item>();
    const resto: Item[] = [];
    for (const i of c.itens) {
      if (i.cancelado) {
        resto.push(i);
        continue;
      }
      const k = `${i.produtoId}|${i.preco}|${i.obs ?? ""}`;
      const ex = mapa.get(k);
      if (ex) mapa.set(k, { ...ex, qtd: ex.qtd + i.qtd });
      else mapa.set(k, { ...i });
    }
    return { ...c, itens: [...mapa.values(), ...resto] };
  });
}

/** Separa cada unidade em uma linha (desagrupar). */
export function desagruparItens(contaId: string) {
  mudarConta(contaId, (c) => ({
    ...c,
    itens: c.itens.flatMap((i) =>
      i.cancelado || i.qtd <= 1 || !Number.isInteger(i.qtd) ? [i] : Array.from({ length: i.qtd }, (_, k) => ({ ...i, id: k === 0 ? i.id : novoId("i"), qtd: 1 })),
    ),
  }));
}

const CANAIS_ENTREGA: Canal[] = ["entrega", "delivery", "ifood", "aiqfome"];

/** Avança o preparo (KDS). Em pedidos de entrega, o status do pedido acompanha a cozinha. */
export function mudarPreparo(contaId: string, itemIds: string[], status: StatusPreparo) {
  mudarConta(contaId, (c) => {
    const em = agora();
    const itens = c.itens.map((i) => {
      if (!itemIds.includes(i.id)) return i;
      const novo = { ...i, preparo: status };
      if (status === "preparo") novo.preparoEm = i.preparoEm ?? em;
      if (status === "pronto") novo.prontoEm = em;
      if (status === "pendente") delete novo.preparoEm;
      if (status === "pendente" || status === "preparo") delete novo.prontoEm;
      return novo;
    });
    let statusEntrega = c.statusEntrega;
    if (CANAIS_ENTREGA.includes(c.canal) && statusEntrega && ["novo", "confirmado", "preparo"].includes(statusEntrega)) {
      const validos = itens.filter((i) => !i.cancelado);
      if (validos.length && validos.every((i) => i.preparo === "pronto" || i.preparo === "entregue")) statusEntrega = "pronto";
      else if (status === "preparo") statusEntrega = "preparo";
    }
    return { ...c, itens, statusEntrega };
  });
}

// ---------------------------------------------------------------------------
// Cardápio QR Code da mesa e chamados
// ---------------------------------------------------------------------------

/** Pedido feito pelo cliente no QR Code: entra na conta da mesa (abre se preciso). */
export function pedidoQrCode(mesaId: string, itens: ItemNovo[]): number {
  const e = obterEstado();
  const contaId = contaDaMesa(e, mesaId)?.id ?? abrirConta({ canal: "mesa", mesaId, atendenteId: undefined });
  const n = lancarItens(contaId, itens, "qrcode");
  registrarAuditoria("Pedido pelo QR Code", `Mesa ${e.mesas.find((m) => m.id === mesaId)?.numero} · pedido ${n}`);
  return n;
}

export function chamar(mesaId: string, motivo: "garcom" | "conta") {
  atualizar((e) => {
    if (e.chamados.some((c) => c.mesaId === mesaId && c.motivo === motivo && !c.atendidoEm)) return e;
    return { ...e, chamados: [{ id: novoId("ch"), mesaId, motivo, em: agora() }, ...e.chamados].slice(0, 300) };
  });
  if (motivo === "conta") {
    const c = contaDaMesa(obterEstado(), mesaId);
    if (c && c.status === "aberta") pedirConta(c.id);
  }
}

export function atenderChamado(id: string) {
  atualizar((e) => ({ ...e, chamados: e.chamados.map((c) => (c.id === id ? { ...c, atendidoEm: agora(), atendidoPor: e.usuarioId } : c)) }));
}

// ---------------------------------------------------------------------------
// Delivery próprio (cardápio online)
// ---------------------------------------------------------------------------

export type PedidoOnline = {
  nome: string;
  telefone: string;
  retirada: boolean;
  endereco?: Endereco;
  itens: ItemNovo[];
  pagamento: FormaPagamentoOnline;
  trocoPara?: number;
  observacao?: string;
  cupom?: string;
};

function cupomAplicado(e: Estado, codigo: string | undefined, itens: Item[]) {
  if (!codigo) return {};
  const sub = itens.reduce((s, i) => s + i.preco * i.qtd, 0);
  const r = validarCupom(codigo, sub, "delivery", e.promocoes ?? []);
  return r.ok ? { cupom: r.promocao.codigo!.toUpperCase(), desconto: r.desconto } : {};
}

/** Pedido do cardápio online: vira uma conta do canal "delivery" com status "novo". */
export function pedidoOnline(p: PedidoOnline): string {
  const clienteId = salvarCliente({ nome: p.nome, telefone: p.telefone, endereco: p.retirada ? undefined : p.endereco });
  const id = novoId("c");
  atualizar((e) => {
    const numero = e.seq.pedido + 1;
    const taxa = p.retirada ? 0 : (e.bairros.find((b) => b.id === p.endereco?.bairroId)?.taxa ?? 0);
    const itens: Item[] = p.itens.map((i) => {
      const prod = e.produtos.find((x) => x.id === i.produtoId)!;
      return {
        id: novoId("i"),
        produtoId: prod.id,
        nome: prod.nome,
        preco: precoVigente(prod, "delivery", e.promocoes ?? []),
        qtd: i.qtd,
        obs: i.obs,
        setor: prod.setor,
        atendenteId: "online",
        pedidoNumero: numero,
        enviadoEm: agora(),
        preparo: "pendente",
      };
    });
    const pag = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão na entrega" }[p.pagamento];
    const troco = p.pagamento === "dinheiro" && p.trocoPara ? ` · troco para ${p.trocoPara.toFixed(2).replace(".", ",")}` : "";
    const conta: Conta = {
      id,
      numero: e.seq.conta,
      canal: "delivery",
      status: "aberta",
      clienteId,
      clienteNome: p.nome,
      telefone: p.telefone,
      endereco: p.retirada ? undefined : p.endereco,
      paraViagem: p.retirada,
      statusEntrega: "novo",
      itens,
      pagamentos: [],
      desconto: 0,
      servicoPct: 0,
      couvert: 0,
      taxaEntrega: taxa,
      abertaEm: agora(),
      pagamentoOnline: p.pagamento,
      ...cupomAplicado(e, p.cupom, itens),
      observacao: [`Pagamento: ${pag}${troco}`, p.retirada ? "Retirada no balcão" : "", p.observacao ?? ""].filter(Boolean).join(" · "),
    };
    const usado = conta.cupom ? e.promocoes.map((x) => (x.codigo?.toUpperCase() === conta.cupom ? { ...x, usos: (x.usos ?? 0) + 1 } : x)) : e.promocoes;
    return comBaixa({ ...e, promocoes: usado, contas: [...e.contas, conta], seq: { conta: e.seq.conta + 1, pedido: numero } }, itens, 1, `Pedido ${numero}`);
  });
  return id;
}

// ---------------------------------------------------------------------------
// Entregas
// ---------------------------------------------------------------------------

/** Pedidos do iFood/aiqfome: avisa o parceiro da mudança de status. */
function avisarParceiro(contaId: string, status: StatusEntrega) {
  const c = obterEstado().contas.find((x) => x.id === contaId);
  if (c && (c.canal === "ifood" || c.canal === "aiqfome")) import("./acoes-integracoes").then((m) => m.notificarMarketplace(c, status));
}

export function mudarStatusEntrega(contaId: string, status: StatusEntrega) {
  mudarConta(contaId, (c) => ({ ...c, statusEntrega: status }));
  avisarParceiro(contaId, status);
}

export function despachar(contaId: string, entregadorId: string) {
  mudarConta(contaId, (c) => ({ ...c, entregadorId, statusEntrega: "saiu", saiuEm: agora() }));
  avisarParceiro(contaId, "saiu");
}

/** Entregue: se já está tudo pago (ex.: pago no app), a conta fecha. */
export function concluirEntrega(contaId: string) {
  mudarConta(contaId, (c) => {
    const quitada = c.itens.some((i) => !i.cancelado) && restante(c) <= 0.009 && c.status !== "cancelada";
    return { ...c, statusEntrega: "entregue", ...(quitada && c.status !== "paga" ? { status: "paga" as const, fechadaEm: agora() } : {}) };
  });
  avisarParceiro(contaId, "entregue");
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export function salvarCliente(dados: { id?: string; nome: string; telefone: string; endereco?: Endereco }): string {
  const id = dados.id ?? novoId("cl");
  atualizar((e) => {
    const existente = e.clientes.find((c) => c.id === id);
    if (existente) {
      const enderecos =
        dados.endereco && !existente.enderecos.some((x) => x.rua === dados.endereco!.rua && x.numero === dados.endereco!.numero)
          ? [dados.endereco, ...existente.enderecos]
          : existente.enderecos;
      return { ...e, clientes: e.clientes.map((c) => (c.id === id ? { ...c, nome: dados.nome, telefone: dados.telefone, enderecos } : c)) };
    }
    return {
      ...e,
      clientes: [...e.clientes, { id, nome: dados.nome, telefone: dados.telefone, enderecos: dados.endereco ? [dados.endereco] : [], credito: 0, criadoEm: agora() }],
    };
  });
  return id;
}

// ---------------------------------------------------------------------------
// Caixa
// ---------------------------------------------------------------------------

export function abrirCaixa(caixaId: string, fundo: number, fundoConferido = false) {
  atualizar((e) => {
    const id = novoId("sx");
    const e2: Estado = {
      ...e,
      sessaoAtivaId: id,
      sessoesCaixa: [...e.sessoesCaixa, { id, caixaId, operadorId: e.usuarioId, operadorNome: usuarioNome(e), abertaEm: agora(), fundo, fundoConferido, movimentos: [] }],
    };
    return comAuditoria(e2, "caixa.aberto", `${e.caixas.find((c) => c.id === caixaId)?.nome} com fundo de troco ${fundo.toFixed(2)}${fundoConferido ? " (conferido)" : ""}`);
  });
}

export function selecionarSessao(sessaoId?: string) {
  atualizar((e) => ({ ...e, sessaoAtivaId: sessaoId }));
}

export function movimentarCaixa(tipo: TipoMovimento, valor: number, descricao: string, destino?: string) {
  atualizar((e) => {
    if (!e.sessaoAtivaId) return e;
    const mov: MovimentoCaixa = { id: novoId("mv"), tipo, valor: arred(valor), descricao, em: agora(), destino };
    const e2 = { ...e, sessoesCaixa: e.sessoesCaixa.map((s) => (s.id === e.sessaoAtivaId ? { ...s, movimentos: [...s.movimentos, mov] } : s)) };
    return comAuditoria(e2, `caixa.${tipo}`, `${valor.toFixed(2)} — ${descricao}`);
  });
}

export function fecharCaixa(contado: Record<string, number>, apuracao?: SessaoCaixa["apuracao"]) {
  atualizar((e) => {
    const id = e.sessaoAtivaId;
    if (!id) return e;
    const e2: Estado = {
      ...e,
      sessaoAtivaId: undefined,
      sessoesCaixa: e.sessoesCaixa.map((s) => (s.id === id ? { ...s, fechadaEm: agora(), contado, apuracao } : s)),
    };
    return comAuditoria(e2, "caixa.fechado", e.caixas.find((c) => c.id === e.sessoesCaixa.find((s) => s.id === id)?.caixaId)?.nome);
  });
}

export function trocarUsuario(funcionarioId: string) {
  atualizar((e) => ({ ...e, usuarioId: funcionarioId }));
}

export { obterEstado };

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

export function salvarConfig(c: Partial<Config>, auditar?: string) {
  atualizar((e) => {
    const n = { ...e, config: { ...e.config, ...c } };
    return auditar ? comAuditoria(n, auditar) : n;
  });
}

// ---------------------------------------------------------------------------
// Fiado (em Contas)
// ---------------------------------------------------------------------------

/** Cadastra um cliente do fiado: só o nome é obrigatório. */
export function cadastrarClienteFiado(nome: string, telefone = ""): string {
  const id = salvarCliente({ nome: nome.trim(), telefone: telefone.trim() });
  registrarAuditoria("fiado.cliente", nome.trim());
  return id;
}

/** Lança uma compra no fiado sem passar por uma conta (ex.: dívida anterior ao sistema). */
export function lancarFiado(clienteId: string, valor: number, origem: string, obs?: string) {
  atualizar((e) => {
    const mov: MovFiado = { id: novoId("fi"), clienteId, tipo: "lancamento", valor: arred(valor), em: agora(), origem: origem || "Lançamento manual", obs, usuario: usuarioNome(e) };
    return comAuditoria({ ...e, fiado: [...(e.fiado ?? []), mov] }, "fiado.lancado", `${e.clientes.find((c) => c.id === clienteId)?.nome}: ${valor.toFixed(2)} (${mov.origem})`);
  });
}

/** Pagamento (parcial ou total) do fiado. Entra no caixa aberto como recebimento, não como venda. */
export function pagarFiado(clienteId: string, valor: number, formaId: string, obs?: string) {
  atualizar((e) => {
    const mov: MovFiado = {
      id: novoId("fi"),
      clienteId,
      tipo: "pagamento",
      valor: arred(valor),
      em: agora(),
      origem: "Pagamento",
      formaId,
      sessaoCaixaId: e.sessaoAtivaId,
      obs,
      usuario: usuarioNome(e),
    };
    return comAuditoria({ ...e, fiado: [...(e.fiado ?? []), mov] }, "fiado.pago", `${e.clientes.find((c) => c.id === clienteId)?.nome}: ${valor.toFixed(2)}`);
  });
}

// ---------------------------------------------------------------------------
// Dispositivos
// ---------------------------------------------------------------------------

/** Anota que um aparelho abriu o sistema. Aparelho novo entra como "aguardando autorização". */
export function registrarDispositivo(id: string, descricao: string) {
  atualizar((e) => {
    const lista = e.dispositivos ?? [];
    const ex = lista.find((d) => d.id === id);
    if (ex) {
      // Não regrava a cada abertura no mesmo minuto
      if (ex.ultimoAcesso && Date.now() - new Date(ex.ultimoAcesso).getTime() < 60000) return e;
      return { ...e, dispositivos: lista.map((d) => (d.id === id ? { ...d, ultimoAcesso: agora() } : d)) };
    }
    return { ...e, dispositivos: [...lista, { id, nome: `Aparelho ${id.slice(-4).toUpperCase()}`, autorizado: false, criadoEm: agora(), ultimoAcesso: agora(), descricao }] };
  });
}

export function salvarDispositivo(id: string, dados: { nome?: string; funcionarioId?: string; autorizado?: boolean }) {
  atualizar((e) => {
    const d = (e.dispositivos ?? []).find((x) => x.id === id);
    if (!d) return e;
    const e2 = { ...e, dispositivos: e.dispositivos.map((x) => (x.id === id ? { ...x, ...dados } : x)) };
    return dados.autorizado !== undefined && dados.autorizado !== d.autorizado
      ? comAuditoria(e2, dados.autorizado ? "dispositivo.autorizado" : "dispositivo.bloqueado", dados.nome ?? d.nome)
      : e2;
  });
}

export function removerDispositivo(id: string) {
  atualizar((e) => comAuditoria({ ...e, dispositivos: (e.dispositivos ?? []).filter((d) => d.id !== id) }, "dispositivo.removido", id));
}
