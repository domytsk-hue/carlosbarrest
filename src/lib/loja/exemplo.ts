"use client";

import { arred, total } from "../dominio/calculos";
import type { Canal, Conta, Item } from "../dominio/tipos";
import type { Estado } from "./estado";
import { atualizar, novoId } from "./loja";

/** Gera 14 dias de vendas de exemplo e algumas mesas abertas agora, para testar telas e relatórios. */
export function gerarDadosExemplo() {
  atualizar((e) => {
    let seqConta = e.seq.conta;
    let seqPedido = e.seq.pedido;
    const contas: Conta[] = [];
    const aleat = (n: number) => Math.floor(Math.random() * n);
    const escolher = <T,>(l: T[]) => l[aleat(l.length)];
    const garcons = e.funcionarios.filter((f) => f.funcao === "garcom");
    const pratos = e.produtos.filter((p) => ["pratos", "meio", "individuais", "tiragosto", "porcoes", "caldos"].includes(p.categoriaId));
    const bebidas = e.produtos.filter((p) => ["cervejas", "bebidas", "drinks", "sucos"].includes(p.categoriaId));
    const formas = e.formasPagamento.filter((f) => f.tipo !== "fiado");

    const criar = (canal: Canal, aberta: Date, aberto = false): Conta => {
      const pedido = ++seqPedido;
      const itens: Item[] = [];
      const add = (lista: typeof pratos, n: number) => {
        for (let k = 0; k < n; k++) {
          const p = escolher(lista);
          itens.push({ id: novoId("i"), produtoId: p.id, nome: p.nome, preco: p.preco, qtd: 1 + aleat(p.categoriaId === "cervejas" ? 6 : 2), setor: p.setor, atendenteId: escolher(garcons)?.id, pedidoNumero: pedido, enviadoEm: aberta.toISOString(), preparo: aberto ? "preparo" : "entregue" });
        }
      };
      add(pratos, 1 + aleat(2));
      add(bebidas, 1 + aleat(3));
      const c: Conta = {
        id: novoId("c"),
        numero: seqConta++,
        canal,
        status: aberto ? "aberta" : "paga",
        mesaId: canal === "mesa" ? escolher(e.mesas).id : undefined,
        comanda: canal === "comanda" ? 1 + aleat(e.config.totalComandas) : undefined,
        clienteNome: canal === "entrega" || canal === "delivery" || canal === "ifood" ? escolher(["Carla", "Roberto", "Juliana", "Marcos", "Fernanda"]) : undefined,
        itens,
        pagamentos: [],
        desconto: 0,
        servicoPct: canal === "mesa" || canal === "comanda" ? e.config.servicoPct : 0,
        couvert: 0,
        taxaEntrega: canal === "entrega" || canal === "delivery" ? 6 : 0,
        abertaEm: aberta.toISOString(),
        statusEntrega: ["entrega", "delivery", "ifood", "aiqfome"].includes(canal) ? "entregue" : undefined,
      };
      if (!aberto) {
        const fechada = new Date(aberta.getTime() + (20 + aleat(70)) * 60000);
        c.fechadaEm = fechada.toISOString();
        c.pagamentos = [{ id: novoId("pg"), formaId: escolher(formas).id, valor: arred(total(c)), em: c.fechadaEm }];
      }
      return c;
    };

    const canais: Canal[] = ["mesa", "mesa", "mesa", "mesa", "comanda", "balcao", "pdv", "entrega", "delivery", "ifood"];
    for (let d = 14; d >= 0; d--) {
      const qtd = d === 0 ? 14 : 18 + aleat(20);
      for (let k = 0; k < qtd; k++) {
        const dia = new Date();
        dia.setDate(dia.getDate() - d);
        const h = escolher([11, 12, 12, 13, 13, 14, 18, 19, 19, 20, 20, 21, 22]);
        dia.setHours(h, aleat(60), 0, 0);
        if (dia.getTime() > Date.now() - 90 * 60000) continue;
        contas.push(criar(escolher(canais), dia));
      }
    }
    // Mesas ocupadas agora
    const livres = e.mesas.filter((m) => !e.contas.some((c) => c.mesaId === m.id && c.status === "aberta"));
    for (let k = 0; k < 5 && k < livres.length; k++) {
      const c = criar("mesa", new Date(Date.now() - (10 + aleat(80)) * 60000), true);
      c.mesaId = livres[k * 3]?.id ?? livres[k].id;
      contas.push(c);
    }
    // Estoque inicial e contas do mês, para o DRE e as telas de gestão
    const hoje = new Date();
    const dia = (n: number) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + n);
      return d.toLocaleDateString("sv-SE");
    };
    const inicio = new Date(Date.now() - 15 * 86400000).toISOString();
    const estoque = e.insumos.map((i) => ({ id: novoId("me"), insumoId: i.id, tipo: "entrada" as const, qtd: i.estoqueMinimo * 4, custo: i.custo, em: inicio, documento: "Estoque inicial" }));
    const l = (tipo: "pagar" | "receber", descricao: string, planoId: string, valor: number, venc: number, pago?: boolean, recorrente?: boolean) => ({
      id: novoId("l"),
      tipo,
      descricao,
      planoId,
      valor,
      vencimento: dia(venc),
      pagoEm: pago ? dia(Math.min(venc, 0)) : undefined,
      valorPago: pago ? valor : undefined,
      recorrente,
      criadoEm: inicio,
    });
    const lancamentos = [
      l("pagar", "Aluguel do salão", "pc7", 4500, -10, true, true),
      l("pagar", "Energia elétrica (Coelba)", "pc8", 1860, -5, true, true),
      l("pagar", "Água (Embasa)", "pc9", 420, -3, true, true),
      l("pagar", "Gás P45", "pc10", 980, -7, true),
      l("pagar", "Folha de pagamento", "pc5", 14200, -8, true, true),
      l("pagar", "Simples Nacional", "pc15", 3100, -2, true, true),
      l("pagar", "Frigorífico Jacobina · NF 1841", "pc3", 6800, -6, true),
      l("pagar", "Distribuidora de Bebidas · NF 552", "pc4", 3900, -1),
      l("pagar", "Internet", "pc11", 189.9, 0, false, true),
      l("pagar", "Contabilidade", "pc12", 950, 4, false, true),
      l("pagar", "Anúncios Instagram", "pc14", 600, 9),
      l("receber", "Evento aniversário (sinal)", "pc2", 1500, 5),
    ];
    return {
      ...e,
      contas: [...e.contas, ...contas],
      movimentosEstoque: [...estoque, ...e.movimentosEstoque],
      lancamentos: [...e.lancamentos, ...lancamentos],
      seq: { conta: seqConta, pedido: seqPedido },
    } satisfies Estado;
  });
}
