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
  Produto,
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
};

export type Impressora = { id: string; /** Nome igual ao do impressoras.json do agente (o IP fica lá) */ nome: string; setores: ("caixa" | "cozinha" | "bar")[]; colunas: number };
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
  chamados: Chamado[];
  insumos: Insumo[];
  movimentosEstoque: MovimentoEstoque[];
  fornecedores: Fornecedor[];
  planoContas: PlanoConta[];
  lancamentos: Lancamento[];
  seq: { conta: number; pedido: number };
  auditoria: Auditoria[];
};

export const VERSAO = 1;

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
          { id: "imp1", nome: "caixa", setores: ["caixa"], colunas: 48 },
          { id: "imp2", nome: "cozinha", setores: ["cozinha"], colunas: 48 },
          { id: "imp3", nome: "bar", setores: ["bar"], colunas: 48 },
        ],
      },
      maquininha: { provedor: "manual", serialPos: "" },
      fiscal: { emissor: "nenhum", ambiente: "homologacao", cnpj: "", inscricaoEstadual: "", regime: "simples", automatica: false },
      marketplaces: {
        ifood: { ativo: false, lojaId: "", aceiteAutomatico: false },
        aiqfome: { ativo: false, lojaId: "", aceiteAutomatico: false },
      },
    },
    categorias: CATEGORIAS_SEED,
    produtos: comFichasExemplo(PRODUTOS_SEED),
    mesas: Array.from({ length: 30 }, (_, i) => ({
      id: `m${i + 1}`,
      numero: i + 1,
      area: i < 20 ? "Salão" : "Varanda",
      lugares: 4,
    })),
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
      { id: "f2", nome: "João", funcao: "garcom", comissao: 100, ativo: true },
      { id: "f3", nome: "Maria", funcao: "garcom", comissao: 100, ativo: true },
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
    chamados: [],
    insumos: INSUMOS_SEED,
    movimentosEstoque: [],
    fornecedores: [
      { id: "fo1", nome: "Frigorífico Jacobina", documento: "", telefone: "" },
      { id: "fo2", nome: "Distribuidora de Bebidas", documento: "", telefone: "" },
    ],
    planoContas: PLANO_SEED,
    lancamentos: [],
    seq: { conta: 1, pedido: 64000 },
    auditoria: [],
  };
}
