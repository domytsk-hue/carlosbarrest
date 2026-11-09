// Pedidos de marketplace (iFood, aiqfome) num formato único. Cada adaptador
// converte o JSON do parceiro para `PedidoMarketplace`, que vira uma `Conta`
// do canal "ifood" ou "aiqfome" e cai em Entregas e na Cozinha como qualquer
// outro pedido.
//
// iFood: Merchant API (Order v1.0). O pedido chega por polling de eventos
// (GET /order/v1.0/events:polling) ou webhook; os detalhes vêm de
// GET /order/v1.0/orders/{id}. O mapeamento abaixo segue esse formato.
// aiqfome: API v2 da plataforma. Confira os nomes dos campos na documentação
// do parceiro quando a credencial for liberada; o mapeamento está isolado em
// `normalizarAiqfome`.

import type { Produto } from "../dominio/tipos";

export type ItemMarketplace = { codigoExterno?: string; nome: string; qtd: number; precoUnit: number; obs?: string };

export type PedidoMarketplace = {
  canal: "ifood" | "aiqfome";
  externoId: string;
  /** Número curto que o entregador e o cliente veem */
  codigo: string;
  cliente: { nome: string; telefone?: string };
  entrega?: { rua: string; numero: string; bairro?: string; complemento?: string; referencia?: string };
  retirada: boolean;
  itens: ItemMarketplace[];
  taxaEntrega: number;
  desconto: number;
  total: number;
  /** Já pago no app (não cobrar na entrega) */
  pagoOnline: boolean;
  formaNaEntrega?: string;
  trocoPara?: number;
  observacao?: string;
  criadoEm: string;
};

type Json = Record<string, unknown>;
const txt = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const num = (v: unknown) => Number(v ?? 0) || 0;
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Json) : {});
const arr = (v: unknown) => (Array.isArray(v) ? (v as Json[]) : []);

/** iFood Order v1.0 → formato único. */
export function normalizarIfood(o: Json): PedidoMarketplace {
  const entrega = obj(obj(o.delivery).deliveryAddress);
  const total = obj(o.total);
  const pagamentos = arr(obj(o.payments).methods);
  const naEntrega = pagamentos.find((p) => txt(p.type) === "OFFLINE");
  const cliente = obj(o.customer);
  return {
    canal: "ifood",
    externoId: txt(o.id),
    codigo: txt(o.displayId) || txt(o.id).slice(-4),
    cliente: { nome: txt(cliente.name) || "Cliente iFood", telefone: txt(obj(cliente.phone).number) || undefined },
    retirada: txt(o.orderType) === "TAKEOUT",
    entrega: Object.keys(entrega).length
      ? { rua: txt(entrega.streetName), numero: txt(entrega.streetNumber), bairro: txt(entrega.neighborhood) || undefined, complemento: txt(entrega.complement) || undefined, referencia: txt(entrega.reference) || undefined }
      : undefined,
    itens: arr(o.items).map((i) => ({
      codigoExterno: txt(i.externalCode) || undefined,
      nome: txt(i.name),
      qtd: num(i.quantity),
      // totalPrice inclui complementos; dividimos pela quantidade
      precoUnit: num(i.quantity) ? num(i.totalPrice ?? i.price) / num(i.quantity) : num(i.unitPrice),
      obs: [txt(i.observations), ...arr(i.options).map((op) => `${num(op.quantity)}x ${txt(op.name)}`)].filter(Boolean).join(" · ") || undefined,
    })),
    taxaEntrega: num(total.deliveryFee),
    desconto: num(total.benefits),
    total: num(total.orderAmount),
    pagoOnline: !naEntrega,
    formaNaEntrega: naEntrega ? txt(naEntrega.method) : undefined,
    trocoPara: naEntrega ? num(obj(naEntrega.cash).changeFor) || undefined : undefined,
    observacao: txt(o.extraInfo) || undefined,
    criadoEm: txt(o.createdAt) || new Date().toISOString(),
  };
}

/** aiqfome v2 → formato único (conferir campos na documentação do parceiro). */
export function normalizarAiqfome(o: Json): PedidoMarketplace {
  const end = obj(o.address);
  const user = obj(o.user);
  const pag = obj(o.payment);
  return {
    canal: "aiqfome",
    externoId: txt(o.id),
    codigo: txt(o.display_id ?? o.id).slice(-5),
    cliente: { nome: txt(user.name) || "Cliente aiqfome", telefone: txt(user.phone) || undefined },
    retirada: Boolean(o.is_pickup),
    entrega: Object.keys(end).length
      ? { rua: txt(end.street), numero: txt(end.number), bairro: txt(end.neighborhood) || undefined, complemento: txt(end.complement) || undefined, referencia: txt(end.reference) || undefined }
      : undefined,
    itens: arr(o.items).map((i) => ({
      codigoExterno: txt(i.external_code ?? i.sku) || undefined,
      nome: txt(i.name),
      qtd: num(i.quantity),
      precoUnit: num(i.unit_price),
      obs: txt(i.observation) || undefined,
    })),
    taxaEntrega: num(o.delivery_tax),
    desconto: num(o.discount),
    total: num(o.total),
    pagoOnline: Boolean(pag.online ?? pag.is_online),
    formaNaEntrega: pag.online ? undefined : txt(pag.method),
    trocoPara: num(pag.change_for) || undefined,
    observacao: txt(o.observation) || undefined,
    criadoEm: txt(o.created_at) || new Date().toISOString(),
  };
}

/** Acha o produto do cardápio: código externo = código do produto; senão pelo nome. */
export function casarProduto(item: ItemMarketplace, produtos: Produto[]) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();
  return (item.codigoExterno && produtos.find((p) => p.codigo === item.codigoExterno)) || produtos.find((p) => norm(p.nome) === norm(item.nome));
}

/** Gera um pedido de teste no formato do iFood, com produtos do cardápio. */
export function pedidoIfoodExemplo(produtos: Produto[]): Json {
  const escolha = produtos.filter((p) => p.ativo && p.noDelivery).sort(() => Math.random() - 0.5).slice(0, 2);
  const itens = escolha.map((p, k) => ({ name: p.nome, externalCode: p.codigo, quantity: k + 1, unitPrice: p.precoDelivery ?? p.preco, totalPrice: (p.precoDelivery ?? p.preco) * (k + 1), observations: k === 0 ? "Sem cebola" : "" }));
  const sub = itens.reduce((s, i) => s + i.totalPrice, 0);
  const id = crypto.randomUUID();
  return {
    id,
    displayId: id.slice(0, 4).toUpperCase(),
    orderType: "DELIVERY",
    createdAt: new Date().toISOString(),
    customer: { name: ["Lucas Andrade", "Patrícia Souza", "Rafael Lima"][Math.floor(Math.random() * 3)], phone: { number: "0800 705 0255", localizer: "12345678" } },
    delivery: { deliveryAddress: { streetName: "Rua J. J. Seabra", streetNumber: String(10 + Math.floor(Math.random() * 400)), neighborhood: "Centro", complement: "Casa", reference: "Perto da praça" } },
    items: itens,
    total: { subTotal: sub, deliveryFee: 7.99, benefits: 0, orderAmount: sub + 7.99 },
    payments: { methods: [{ method: "CREDIT", type: "ONLINE", value: sub + 7.99 }] },
  };
}

export function pedidoAiqfomeExemplo(produtos: Produto[]): Json {
  const escolha = produtos.filter((p) => p.ativo && p.noDelivery).sort(() => Math.random() - 0.5).slice(0, 2);
  const items = escolha.map((p) => ({ name: p.nome, external_code: p.codigo, quantity: 1, unit_price: p.precoDelivery ?? p.preco, observation: "" }));
  const sub = items.reduce((s, i) => s + i.unit_price, 0);
  return {
    id: String(Date.now()).slice(-8),
    created_at: new Date().toISOString(),
    user: { name: "Marina Costa", phone: "74 99999-1234" },
    address: { street: "Av. Orlando Oliveira Pires", number: "250", neighborhood: "Estação", complement: "Apto 2" },
    items,
    delivery_tax: 5,
    discount: 0,
    total: sub + 5,
    payment: { online: false, method: "Dinheiro", change_for: 200 },
  };
}
