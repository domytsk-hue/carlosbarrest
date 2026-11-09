"use client";

import { arred, restante, total } from "../dominio/calculos";
import type { Canal, Conta, Endereco, Item, MovimentoCaixa, Pagamento, StatusEntrega, StatusPreparo, TipoMovimento } from "../dominio/tipos";
import type { Estado } from "./estado";
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
    const novos: Item[] = itens.map((i) => {
      const p = e.produtos.find((x) => x.id === i.produtoId)!;
      return {
        id: novoId("i"),
        produtoId: p.id,
        nome: p.nome,
        preco: p.preco,
        qtd: i.qtd,
        obs: i.obs,
        setor: p.setor,
        atendenteId: atendenteId ?? e.usuarioId,
        pedidoNumero: numero,
        enviadoEm: agora(),
        preparo: "pendente",
      };
    });
    return {
      ...e,
      seq: { ...e.seq, pedido: numero },
      contas: e.contas.map((c) =>
        c.id === contaId ? { ...c, itens: [...c.itens, ...novos], status: c.status === "fechamento" ? "aberta" : c.status } : c,
      ),
    };
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
    return comAuditoria(e2, "item.cancelado", `Conta ${conta?.numero}: ${item?.qtd}x ${item?.nome} — ${motivo}`);
  });
}

export function alterarQtdItem(contaId: string, itemId: string, qtd: number) {
  mudarConta(contaId, (c) => ({ ...c, itens: c.itens.map((i) => (i.id === itemId ? { ...i, qtd: Math.max(1, qtd) } : i)) }));
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

/** Registra um pagamento (parcial ou total). Fecha a conta quando quitada. */
export function pagar(contaId: string, formaId: string, valor: number, extra?: Partial<Pagamento>) {
  atualizar((e) => {
    const conta = e.contas.find((c) => c.id === contaId);
    if (!conta) return e;
    const devido = restante(conta);
    const forma = e.formasPagamento.find((f) => f.id === formaId);
    const aplicado = arred(Math.min(valor, devido));
    const troco = forma?.tipo === "dinheiro" && valor > devido ? arred(valor - devido) : undefined;
    const pg: Pagamento = { id: novoId("pg"), formaId, valor: aplicado, troco, em: agora(), sessaoCaixaId: e.sessaoAtivaId, ...extra };
    let atualizada: Conta = { ...conta, pagamentos: [...conta.pagamentos, pg] };
    if (restante(atualizada) <= 0.009) {
      atualizada = { ...atualizada, status: "paga", fechadaEm: agora() };
      if (atualizada.canal === "entrega" && atualizada.statusEntrega !== "entregue") atualizada.statusEntrega = atualizada.statusEntrega ?? "novo";
    }
    let e2: Estado = { ...e, contas: e.contas.map((c) => (c.id === contaId ? atualizada : c)) };
    // Crédito/fiado do cliente
    if (forma && (forma.tipo === "fiado" || forma.tipo === "credito_cliente") && conta.clienteId) {
      e2 = { ...e2, clientes: e2.clientes.map((cl) => (cl.id === conta.clienteId ? { ...cl, credito: arred(cl.credito - aplicado) } : cl)) };
    }
    return e2;
  });
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
    const e2 = { ...e, contas: e.contas.map((c) => (c.id === contaId ? { ...c, status: "cancelada" as const, fechadaEm: agora() } : c)) };
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
            ? { ...c, itens: [...c.itens, ...origem.itens], pagamentos: [...c.pagamentos, ...origem.pagamentos], desconto: c.desconto + origem.desconto }
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

export function mudarPreparo(contaId: string, itemIds: string[], status: StatusPreparo) {
  mudarConta(contaId, (c) => ({ ...c, itens: c.itens.map((i) => (itemIds.includes(i.id) ? { ...i, preparo: status } : i)) }));
}

// ---------------------------------------------------------------------------
// Entregas
// ---------------------------------------------------------------------------

export function mudarStatusEntrega(contaId: string, status: StatusEntrega) {
  mudarConta(contaId, (c) => ({ ...c, statusEntrega: status }));
}

export function despachar(contaId: string, entregadorId: string) {
  mudarConta(contaId, (c) => ({ ...c, entregadorId, statusEntrega: "saiu", saiuEm: agora() }));
}

export function concluirEntrega(contaId: string) {
  mudarConta(contaId, (c) => ({ ...c, statusEntrega: "entregue" }));
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

export function abrirCaixa(caixaId: string, fundo: number) {
  atualizar((e) => {
    const id = novoId("sx");
    const e2: Estado = {
      ...e,
      sessaoAtivaId: id,
      sessoesCaixa: [...e.sessoesCaixa, { id, caixaId, operadorId: e.usuarioId, operadorNome: usuarioNome(e), abertaEm: agora(), fundo, movimentos: [] }],
    };
    return comAuditoria(e2, "caixa.aberto", `${e.caixas.find((c) => c.id === caixaId)?.nome} com fundo ${fundo.toFixed(2)}`);
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

export function fecharCaixa(contado: Record<string, number>) {
  atualizar((e) => {
    const id = e.sessaoAtivaId;
    if (!id) return e;
    const e2: Estado = {
      ...e,
      sessaoAtivaId: undefined,
      sessoesCaixa: e.sessoesCaixa.map((s) => (s.id === id ? { ...s, fechadaEm: agora(), contado } : s)),
    };
    return comAuditoria(e2, "caixa.fechado", e.caixas.find((c) => c.id === e.sessoesCaixa.find((s) => s.id === id)?.caixaId)?.nome);
  });
}

export function trocarUsuario(funcionarioId: string) {
  atualizar((e) => ({ ...e, usuarioId: funcionarioId }));
}

export { obterEstado };
