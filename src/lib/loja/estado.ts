import { CATEGORIAS_SEED, PRODUTOS_SEED } from "../dominio/cardapio-seed";
import { comFichasExemplo } from "../dominio/estoque";
import type {
  Auditoria,
  Bairro,
  Caixa,
  Categoria,
  Chamado,
  Cliente,
  Conta,
  FormaPagamento,
  Fornecedor,
  Funcionario,
  Insumo,
  Lancamento,
  MovimentoEstoque,
  PlanoConta,
  Mesa,
  MovFiado,
  Dispositivo,
  Produto,
  Promocao,
  RespostaBot,
  Treinamento,
  SessaoCaixa,
} from "../dominio/tipos";

export type Config = {
  nome: string;
  servicoPct: number;
  couvert: number;
  /** Comandas numeradas disponíveis */
  totalComandas: number;
  whatsapp: string;
  chavePix: string;
  cidadePix: string;
  endereco: string;
  /** Cardápio online (delivery próprio) recebendo pedidos */
  deliveryAberto: boolean;
  pedidoMinimo: number;
  /** Tempo estimado de entrega, em minutos */
  tempoEntrega: number;
  /** Permite ao cliente pedir pelo QR Code da mesa (se não, só consulta) */
  qrPedidos: boolean;
  impressao: ConfigImpressao;
  maquininha: { provedor: "manual" | "stone"; serialPos: string };
  fiscal: ConfigFiscal;
  marketplaces: Record<"ifood" | "aiqfome", { ativo: boolean; lojaId: string; aceiteAutomatico: boolean }>;
  chatbot: { ativo: boolean; saudacao: string; horario: string; foraDoHorario: string; respostas: RespostaBot[] };
  /** Estoque ligado. Fica desligado até o restaurante começar a usar (previsto para março). */
  estoqueAtivo: boolean;
  /** Só aparelhos autorizados em Configurações abrem o app do garçom */
  exigirAutorizacao: boolean;
};

export type Impressora = {
  id: string;
  /** Nome igual ao do impressoras.json do agente (o IP fica lá) */
  nome: string;
  setores: ("caixa" | "cozinha" | "bar")[];
  colunas: number;
  /** Onde fica e como está ligada (ex.: "Balcão do caixa · rede 192.168.0.50") */
  local?: string;
  ativa?: boolean;
};
export type ConfigImpressao = { agenteAtivo: boolean; agenteUrl: string; impressoras: Impressora[] };
export type ConfigFiscal = {
  emissor: "nenhum" | "focusnfe";
  ambiente: "homologacao" | "producao";
  cnpj: string;
  inscricaoEstadual: string;
  regime: "simples" | "normal";
  /** Emite NFC-e sozinho ao fechar a conta */
  automatica: boolean;
};

export type Estado = {
  versao: number;
  config: Config;
  categorias: Categoria[];
  produtos: Produto[];
  mesas: Mesa[];
  clientes: Cliente[];
  bairros: Bairro[];
  funcionarios: Funcionario[];
  formasPagamento: FormaPagamento[];
  caixas: Caixa[];
  sessoesCaixa: SessaoCaixa[];
  /** Caixa em uso neste aparelho */
  sessaoAtivaId?: string;
  usuarioId: string;
  contas: Conta[];
  /** Fiado: compras lançadas e pagamentos de cada cliente */
  fiado: MovFiado[];
  /** Aparelhos que usam o sistema e se estão autorizados */
  dispositivos: Dispositivo[];
  chamados: Chamado[];
  insumos: Insumo[];
  movimentosEstoque: MovimentoEstoque[];
  fornecedores: Fornecedor[];
  planoContas: PlanoConta[];
  lancamentos: Lancamento[];
  promocoes: Promocao[];
  treinamentos: Treinamento[];
  /** Materiais concluídos por funcionário */
  materiaisConcluidos: Record<string, string[]>;
  seq: { conta: number; pedido: number };
  auditoria: Auditoria[];
};

export const VERSAO = 2;

/** Mesas numeradas de 1 a 40 (requisito MES-01). */
export const TOTAL_MESAS = 40;

export const mesasPadrao = (): Mesa[] =>
  Array.from({ length: TOTAL_MESAS }, (_, i) => ({ id: `m${i + 1}`, numero: i + 1, area: "Salão", lugares: 4 }));

const PLANO_SEED: PlanoConta[] = [
  { id: "pc1", nome: "Vendas no salão e delivery", tipo: "receita", grupo: "receita" },
  { id: "pc2", nome: "Outras receitas", tipo: "receita", grupo: "receita" },
  { id: "pc3", nome: "Compra de mercadorias e insumos", tipo: "despesa", grupo: "cmv" },
  { id: "pc4", nome: "Bebidas para revenda", tipo: "despesa", grupo: "cmv" },
  { id: "pc5", nome: "Salários e encargos", tipo: "despesa", grupo: "pessoal" },
  { id: "pc6", nome: "Comissões e taxa de serviço", tipo: "despesa", grupo: "pessoal" },
  { id: "pc7", nome: "Aluguel", tipo: "despesa", grupo: "ocupacao" },
  { id: "pc8", nome: "Energia elétrica", tipo: "despesa", grupo: "ocupacao" },
  { id: "pc9", nome: "Água", tipo: "despesa", grupo: "ocupacao" },
  { id: "pc10", nome: "Gás", tipo: "despesa", grupo: "ocupacao" },
  { id: "pc11", nome: "Internet e telefone", tipo: "despesa", grupo: "administrativa" },
  { id: "pc12", nome: "Contabilidade e sistemas", tipo: "despesa", grupo: "administrativa" },
  { id: "pc13", nome: "Material de limpeza e embalagens", tipo: "despesa", grupo: "administrativa" },
  { id: "pc14", nome: "Marketing e anúncios", tipo: "despesa", grupo: "marketing" },
  { id: "pc15", nome: "Impostos (Simples Nacional)", tipo: "despesa", grupo: "impostos" },
  { id: "pc16", nome: "Tarifas bancárias e juros", tipo: "despesa", grupo: "financeira" },
  { id: "pc17", nome: "Manutenção e equipamentos", tipo: "despesa", grupo: "investimento" },
  { id: "pc18", nome: "Outras despesas", tipo: "despesa", grupo: "outras" },
];

const INSUMOS_SEED: Insumo[] = [
  { id: "in1", nome: "Picanha", unidade: "kg", custo: 62, estoqueMinimo: 10, local: "Câmara fria", fornecedorId: "fo1", ativo: true },
  { id: "in2", nome: "Carne de bode", unidade: "kg", custo: 38, estoqueMinimo: 8, local: "Câmara fria", fornecedorId: "fo1", ativo: true },
  { id: "in3", nome: "Arroz", unidade: "kg", custo: 5.5, estoqueMinimo: 15, local: "Depósito", ativo: true },
  { id: "in4", nome: "Feijão", unidade: "kg", custo: 7.8, estoqueMinimo: 10, local: "Depósito", ativo: true },
  { id: "in5", nome: "Farinha de mandioca", unidade: "kg", custo: 6, estoqueMinimo: 5, local: "Depósito", ativo: true },
  { id: "in6", nome: "Heineken long neck", unidade: "un", custo: 5.2, estoqueMinimo: 48, local: "Bar", fornecedorId: "fo2", ativo: true },
  { id: "in7", nome: "Carvão", unidade: "kg", custo: 4, estoqueMinimo: 20, local: "Depósito", ativo: true },
];

export function estadoInicial(): Estado {
  return {
    versao: VERSAO,
    config: {
      nome: "Carlo's Bar & Restaurante",
      servicoPct: 10,
      couvert: 0,
      totalComandas: 40,
      whatsapp: "",
      chavePix: "",
      cidadePix: "JACOBINA",
      endereco: "Rua da Missão, 111 - Missão, Jacobina/BA",
      deliveryAberto: true,
      pedidoMinimo: 20,
      tempoEntrega: 45,
      qrPedidos: true,
      impressao: {
        agenteAtivo: false,
        agenteUrl: "http://localhost:9123",
        impressoras: [
          { id: "imp1", nome: "caixa", setores: ["caixa"], colunas: 48, local: "Balcão do caixa", ativa: true },
          { id: "imp2", nome: "cozinha", setores: ["cozinha"], colunas: 48, local: "Cozinha", ativa: true },
          { id: "imp3", nome: "bar", setores: ["bar"], colunas: 48, local: "Bar", ativa: true },
        ],
      },
      maquininha: { provedor: "manual", serialPos: "" },
      fiscal: { emissor: "nenhum", ambiente: "homologacao", cnpj: "", inscricaoEstadual: "", regime: "simples", automatica: false },
      marketplaces: {
        ifood: { ativo: false, lojaId: "", aceiteAutomatico: false },
        aiqfome: { ativo: false, lojaId: "", aceiteAutomatico: false },
      },
      chatbot: {
        ativo: false,
        saudacao: "Olá! Aqui é o atendimento do Carlo's Bar & Restaurante 🍖",
        horario: "Terça a domingo, das 11h às 23h",
        foraDoHorario: "Estamos fechados agora, mas você já pode ver o cardápio. Abrimos de terça a domingo, às 11h.",
        respostas: [
          { id: "rb1", gatilhos: "reserva, reservar, aniversário", resposta: "Fazemos reserva para grupos a partir de 8 pessoas. Me diga o dia, o horário e quantas pessoas que um atendente confirma com você." },
          { id: "rb2", gatilhos: "estacionamento, estacionar", resposta: "Temos estacionamento em frente ao restaurante." },
        ],
      },
      estoqueAtivo: false,
      exigirAutorizacao: false,
    },
    categorias: CATEGORIAS_SEED,
    produtos: comFichasExemplo(PRODUTOS_SEED),
    mesas: mesasPadrao(),
    clientes: [],
    bairros: [
      { id: "b1", nome: "Missão", taxa: 5 },
      { id: "b2", nome: "Centro", taxa: 6 },
      { id: "b3", nome: "Estação", taxa: 7 },
      { id: "b4", nome: "Leader", taxa: 8 },
      { id: "b5", nome: "Catuaba", taxa: 10 },
    ],
    funcionarios: [
      { id: "f1", nome: "Admin", funcao: "dono", comissao: 0, ativo: true },
      { id: "f2", nome: "João", funcao: "garcom", comissao: 100, comissaoTipo: "percentual", ativo: true },
      { id: "f3", nome: "Maria", funcao: "garcom", comissao: 100, comissaoTipo: "percentual", ativo: true },
      { id: "f4", nome: "Pedro", funcao: "entregador", comissao: 4, ativo: true },
      { id: "f5", nome: "Ana", funcao: "caixa", comissao: 0, ativo: true },
    ],
    formasPagamento: [
      { id: "fp1", nome: "Dinheiro", tipo: "dinheiro", taxa: 0, prazoDias: 0, ativo: true },
      { id: "fp2", nome: "Pix", tipo: "pix", taxa: 0, prazoDias: 0, ativo: true },
      { id: "fp3", nome: "Crédito", tipo: "credito", taxa: 3.2, prazoDias: 30, ativo: true },
      { id: "fp4", nome: "Débito", tipo: "debito", taxa: 1.4, prazoDias: 1, ativo: true },
      { id: "fp5", nome: "Voucher", tipo: "voucher", taxa: 5, prazoDias: 30, ativo: true },
      { id: "fp6", nome: "Fiado", tipo: "fiado", taxa: 0, prazoDias: 30, ativo: true },
      { id: "fp7", nome: "Pago no app (iFood/aiqfome)", tipo: "voucher", taxa: 0, prazoDias: 30, ativo: false },
    ],
    caixas: [
      { id: "cx1", nome: "Caixa 1" },
      { id: "cx2", nome: "Caixa Delivery" },
    ],
    sessoesCaixa: [],
    usuarioId: "f1",
    contas: [],
    fiado: [],
    dispositivos: [],
    chamados: [],
    insumos: INSUMOS_SEED,
    movimentosEstoque: [],
    fornecedores: [
      { id: "fo1", nome: "Frigorífico Jacobina", documento: "", telefone: "" },
      { id: "fo2", nome: "Distribuidora de Bebidas", documento: "", telefone: "" },
    ],
    planoContas: PLANO_SEED,
    lancamentos: [],
    promocoes: [
      { id: "pr1", nome: "Happy hour do chope", tipo: "happyhour", ativo: true, percentual: 20, categoriaIds: ["cervejas"], diasSemana: [2, 3, 4, 5], horaInicio: "17:00", horaFim: "19:00", canais: ["mesa", "comanda", "balcao", "qrcode"] },
      { id: "pr2", nome: "Primeira compra no delivery", tipo: "cupom", ativo: true, codigo: "BEMVINDO10", percentual: 10, canais: ["delivery"], pedidoMinimo: 50, usos: 0 },
    ],
    treinamentos: [],
    materiaisConcluidos: {},
    seq: { conta: 1, pedido: 64000 },
    auditoria: [],
  };
}
