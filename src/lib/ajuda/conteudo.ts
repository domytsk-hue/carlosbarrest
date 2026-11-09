// Conteúdo da central de ajuda e dos materiais de treinamento.
import type { Funcao } from "../dominio/tipos";

export type Artigo = { id: string; titulo: string; modulo: string; resumo: string; passos: string[]; dica?: string };

export const ARTIGOS: Artigo[] = [
  {
    id: "abrir-caixa",
    titulo: "Abrir e fechar o caixa",
    modulo: "caixa",
    resumo: "Todo dia começa com a abertura do caixa e termina com a conferência.",
    passos: ["Em Caixa, toque em Abrir caixa e informe o fundo de troco.", "Durante o dia, use Sangria para retirar dinheiro e Suprimento para colocar.", "No fim do expediente, toque em Fechar, conte o dinheiro e informe o valor de cada forma.", "O sistema mostra a diferença entre o contado e o esperado e imprime o resumo."],
    dica: "Despesas pagas com o dinheiro do caixa (gelo, gás) entram em Despesa, para não virar diferença no fechamento.",
  },
  {
    id: "lancar-mesa",
    titulo: "Abrir mesa e lançar pedidos",
    modulo: "mesas",
    resumo: "Lançamento rápido pelo mapa do salão (F3).",
    passos: ["Toque na mesa livre (verde) para abrir.", "Busque o produto pelo nome ou código e toque para adicionar.", "Use Observação para pedidos como \"sem cebola\".", "Toque em Enviar: cada setor (cozinha, bar) recebe só o que é dele."],
    dica: "Mesa amarela está em fechamento (conta pedida). Vermelha está ocupada.",
  },
  {
    id: "fechar-conta",
    titulo: "Fechar conta, dividir e receber",
    modulo: "mesas",
    resumo: "Parcial, divisão por pessoa e várias formas de pagamento.",
    passos: ["Na mesa, toque em Fechar conta.", "Confira serviço (10%) e couvert; desconto pede motivo.", "Use Dividir para separar por pessoas ou por itens.", "Lance um pagamento por forma (ex.: parte no Pix, parte no cartão). A conta fecha quando o valor bate."],
  },
  {
    id: "comandas",
    titulo: "Comandas individuais",
    modulo: "comandas",
    resumo: "Cada cliente com seu cartão numerado (F11).",
    passos: ["Digite o número da comanda para abrir ou continuar.", "Lance os itens como na mesa.", "Na saída, feche a comanda no caixa pelo número."],
  },
  {
    id: "delivery-proprio",
    titulo: "Receber pedidos do cardápio online",
    modulo: "delivery",
    resumo: "Pedidos do seu site, sem comissão de marketplace.",
    passos: ["Divulgue o link /cardapio (WhatsApp, Instagram).", "Quando chega pedido, o sino toca e o pedido aparece em Delivery como Novo.", "Toque em Aceitar: a cozinha recebe e o cliente acompanha o status pelo celular.", "Mude para Saiu para entrega e depois Entregue."],
    dica: "Em Configurações dá para fechar o delivery, mudar o pedido mínimo e o tempo de entrega.",
  },
  {
    id: "qrcode-mesa",
    titulo: "Pedido pelo QR Code da mesa",
    modulo: "mesas",
    resumo: "O cliente vê o cardápio, pede e chama o garçom pelo celular.",
    passos: ["Em Mesas > QR Codes, imprima a folha com o código de cada mesa.", "O pedido do cliente cai direto na conta da mesa e vai para a cozinha.", "Chamados de garçom e de conta aparecem no topo do sistema e no app do garçom."],
  },
  {
    id: "kds",
    titulo: "Monitor da cozinha (KDS)",
    modulo: "cozinha",
    resumo: "Pedidos na tela da cozinha e do bar, em ordem de chegada (F6).",
    passos: ["Abra Cozinha na TV ou tablet da cozinha e escolha o setor.", "Toque no pedido para marcar Em preparo e depois Pronto.", "O cartão muda de cor conforme o tempo de espera."],
  },
  {
    id: "ficha-tecnica",
    titulo: "Ficha técnica e baixa de estoque",
    modulo: "estoque",
    resumo: "Cada venda baixa os insumos automaticamente.",
    passos: ["Cadastre os insumos (carne, bebidas, embalagens) com unidade e estoque mínimo.", "Em Fichas técnicas, informe quanto de cada insumo vai em uma unidade do produto.", "Ao vender, o estoque baixa sozinho; cancelamento devolve.", "O relatório CMV por produto mostra o custo e a margem de cada prato."],
  },
  {
    id: "nota-xml",
    titulo: "Dar entrada com o XML da nota",
    modulo: "estoque",
    resumo: "Sem digitar item por item.",
    passos: ["Em Estoque > Nota fiscal (XML), envie o arquivo XML que o fornecedor mandou.", "Ligue cada item da nota a um insumo (o sistema sugere pelo nome).", "Confirme: entra no estoque, atualiza o custo médio e pode gerar a conta a pagar."],
  },
  {
    id: "contas",
    titulo: "Contas a pagar e a receber",
    modulo: "contas",
    resumo: "Financeiro com vencimentos, parcelas e DRE.",
    passos: ["Em Nova conta (Ctrl+Ins), informe valor, vencimento e categoria do plano de contas.", "Parcelas e contas recorrentes (aluguel, internet) são criadas de uma vez.", "Em Contas, marque e dê baixa; juros e multa entram no valor pago.", "A DRE em Relatórios mostra o resultado do mês."],
  },
  {
    id: "impressoras",
    titulo: "Configurar impressoras",
    modulo: "configuracoes",
    resumo: "Cupom do caixa e vias de preparo direto nas térmicas.",
    passos: ["Instale o agente de impressão no computador do caixa (pasta agente/ do sistema).", "Cadastre as impressoras no impressoras.json do agente (nome e IP).", "Em Configurações > Impressoras, use os mesmos nomes e marque os setores de cada uma.", "Toque em Testar. Sem o agente, o sistema imprime pelo navegador."],
  },
  {
    id: "promocoes",
    titulo: "Criar cupom, happy hour e combo",
    modulo: "promocoes",
    resumo: "Promoções que o sistema aplica sozinho.",
    passos: ["Em Promoções, escolha Cupom, Happy hour ou Combo.", "Cupom: defina o código, o desconto e onde vale (ex.: só delivery).", "Happy hour: dias, horário e categorias. O preço muda sozinho no lançamento.", "Combo: escolha os produtos e o preço. Ele vira um item na categoria Combos."],
  },
  {
    id: "chatbot",
    titulo: "Atendimento automático no WhatsApp",
    modulo: "chatbot",
    resumo: "O robô responde o básico; o atendente cuida do resto.",
    passos: ["Em Chatbot, ajuste a saudação, o horário e a mensagem de fechado.", "Cadastre respostas para perguntas frequentes (reserva, estacionamento).", "Teste no simulador e, com as credenciais da Meta configuradas, ligue."],
  },
  {
    id: "marketplaces",
    titulo: "iFood e aiqfome no mesmo painel",
    modulo: "delivery",
    resumo: "Os pedidos dos apps entram junto com os do seu cardápio.",
    passos: ["Em Configurações > Marketplaces, informe o ID da loja e ative.", "Pedidos pagos no app entram como Pago no app; o caixa não cobra de novo.", "Aceitar, despachar e concluir avisam o parceiro automaticamente."],
  },
  {
    id: "nfce",
    titulo: "Emitir NFC-e",
    modulo: "configuracoes",
    resumo: "Nota fiscal do consumidor ao fechar a conta.",
    passos: ["Em Configurações > Fiscal, preencha CNPJ, IE e regime e escolha o ambiente.", "Cadastre NCM e CFOP nos produtos.", "Ao fechar a conta, toque em Emitir NFC-e (ou deixe automático)."],
  },
];

export type Material = { id: string; titulo: string; descricao: string; artigo?: string; minutos: number };

/** Trilha de treinamento por função. */
export const MATERIAIS: Record<Funcao, Material[]> = {
  dono: [
    { id: "d1", titulo: "Visão geral do sistema", descricao: "Dashboard, módulos e atalhos de teclado", minutos: 10 },
    { id: "d2", titulo: "Financeiro e DRE", descricao: "Contas, plano de contas e resultado do mês", artigo: "contas", minutos: 15 },
    { id: "d3", titulo: "Custos e margem", descricao: "Ficha técnica, CMV e preço de venda", artigo: "ficha-tecnica", minutos: 15 },
    { id: "d4", titulo: "Promoções", descricao: "Cupom, happy hour e combos", artigo: "promocoes", minutos: 8 },
  ],
  gerente: [
    { id: "g1", titulo: "Caixa do dia", descricao: "Abertura, sangria e fechamento", artigo: "abrir-caixa", minutos: 10 },
    { id: "g2", titulo: "Estoque e notas", descricao: "Entrada por XML e inventário", artigo: "nota-xml", minutos: 12 },
    { id: "g3", titulo: "Delivery e marketplaces", descricao: "Aceitar, despachar e acompanhar", artigo: "delivery-proprio", minutos: 10 },
    { id: "g4", titulo: "Impressoras e NFC-e", descricao: "Configuração e emissão", artigo: "impressoras", minutos: 10 },
  ],
  caixa: [
    { id: "c1", titulo: "Abrir e fechar o caixa", descricao: "Fundo de troco, sangria e conferência", artigo: "abrir-caixa", minutos: 10 },
    { id: "c2", titulo: "Receber contas", descricao: "Divisão, várias formas e troco", artigo: "fechar-conta", minutos: 10 },
    { id: "c3", titulo: "Balcão e PDV", descricao: "Venda rápida e para viagem", minutos: 8 },
    { id: "c4", titulo: "Comandas", descricao: "Abrir e fechar pelo número", artigo: "comandas", minutos: 5 },
  ],
  garcom: [
    { id: "w1", titulo: "App do garçom", descricao: "Mesas, lançamento e envio para a cozinha", artigo: "lancar-mesa", minutos: 10 },
    { id: "w2", titulo: "Chamados das mesas", descricao: "QR Code, chamado de garçom e de conta", artigo: "qrcode-mesa", minutos: 5 },
    { id: "w3", titulo: "Observações e cancelamentos", descricao: "Quando e como cancelar um item", minutos: 5 },
  ],
  cozinha: [
    { id: "k1", titulo: "Monitor da cozinha", descricao: "Preparo, pronto e tempo de espera", artigo: "kds", minutos: 8 },
    { id: "k2", titulo: "Ficha técnica na prática", descricao: "Porções certas = estoque certo", artigo: "ficha-tecnica", minutos: 8 },
  ],
  entregador: [
    { id: "e1", titulo: "Rotina de entregas", descricao: "Saiu para entrega, entregue e acerto", artigo: "delivery-proprio", minutos: 8 },
  ],
};
