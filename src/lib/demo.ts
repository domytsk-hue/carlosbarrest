// Dados de exemplo para o modo demonstração. Serão trocados por consultas
// reais a partir da Fase 1 (pedidos, mesas e caixa).

export const DEMO = {
  faturamentoHoje: 4870.5,
  faturamentoSemanaPassada: 4212.0,
  pedidosHoje: 86,
  ticketMedio: 56.63,
  mesas: { ocupadas: 7, emFechamento: 4, livres: 39 },
  porCanal: [
    { canal: "Salão", valor: 2650.0 },
    { canal: "Balcão", valor: 610.5 },
    { canal: "Delivery próprio", valor: 880.0 },
    { canal: "iFood", valor: 540.0 },
    { canal: "aiqfome", valor: 190.0 },
  ],
  porHora: [
    { hora: "11h", valor: 180 },
    { hora: "12h", valor: 720 },
    { hora: "13h", valor: 940 },
    { hora: "14h", valor: 410 },
    { hora: "15h", valor: 120 },
    { hora: "16h", valor: 90 },
    { hora: "17h", valor: 160 },
    { hora: "18h", valor: 380 },
    { hora: "19h", valor: 610 },
    { hora: "20h", valor: 830 },
    { hora: "21h", valor: 430 },
  ],
  maisVendidos: [
    { nome: "Picanha na Chapa", categoria: "pratos", qtd: 14, total: 2786 },
    { nome: "Heineken Long Neck", categoria: "cervejas", qtd: 52, total: 624 },
    { nome: "Meio-prato de Picanha", categoria: "meio", qtd: 9, total: 1080 },
    { nome: "Caldo de Sururu", categoria: "caldos", qtd: 11, total: 275 },
    { nome: "Caipirinha", categoria: "drinks", qtd: 18, total: 360 },
  ],
  pagamentos: [
    { forma: "Pix", valor: 1950.2 },
    { forma: "Crédito", valor: 1320.0 },
    { forma: "Débito", valor: 980.3 },
    { forma: "Dinheiro", valor: 620.0 },
  ],
  alertas: [
    { tipo: "atraso", texto: "Pedido #64687 da Mesa 7 está há 32 min na cozinha" },
    { tipo: "estoque", texto: "Picanha: restam 3,2 kg (mínimo 5 kg)" },
    { tipo: "conta", texto: "2 contas a pagar vencem hoje · R$ 1.480,00" },
  ],
};

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
