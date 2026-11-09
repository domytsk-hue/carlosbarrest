// Modelo de domínio do sistema. As tabelas do Supabase (supabase/migrations)
// seguem os mesmos nomes. Todo canal de venda vira uma `Conta` no mesmo formato.

export type Id = string;

export type Setor = "cozinha" | "bar";

export type Categoria = { id: Id; nome: string; icone?: string };

export type Produto = {
  id: Id;
  codigo: string;
  categoriaId: Id;
  nome: string;
  preco: number;
  foto?: string;
  setor: Setor;
  ativo: boolean;
  /** Aparece no cardápio de delivery */
  noDelivery: boolean;
  precoDelivery?: number;
  descricao?: string;
  /** Ficha técnica: insumos consumidos por unidade vendida */
  ficha?: { insumoId: Id; qtd: number }[];
  /** Vendido por quilo (lê o peso na balança) */
  porKg?: boolean;
  /** Fiscal (NFC-e) */
  ncm?: string;
  cfop?: string;
};

export type Bairro = { id: Id; nome: string; taxa: number };

export type Endereco = { rua: string; numero: string; bairroId?: Id; complemento?: string; referencia?: string };

export type Cliente = {
  id: Id;
  nome: string;
  telefone: string;
  enderecos: Endereco[];
  /** Saldo pré-pago (positivo) ou fiado em aberto (negativo) */
  credito: number;
  criadoEm: string;
};

export type Funcao = "dono" | "gerente" | "caixa" | "garcom" | "cozinha" | "entregador";

export type Funcionario = {
  id: Id;
  nome: string;
  funcao: Funcao;
  /** % de comissão sobre a taxa de serviço (garçom) ou valor por entrega (entregador) */
  comissao: number;
  ativo: boolean;
};

export type TipoPagamento = "dinheiro" | "pix" | "credito" | "debito" | "voucher" | "credito_cliente" | "fiado";

export type FormaPagamento = { id: Id; nome: string; tipo: TipoPagamento; taxa: number; prazoDias: number; ativo: boolean };

export type Mesa = { id: Id; numero: number; area: string; lugares: number };

export type Canal = "mesa" | "comanda" | "balcao" | "pdv" | "entrega" | "delivery" | "ifood" | "aiqfome" | "qrcode";

export type StatusConta = "aberta" | "fechamento" | "paga" | "cancelada";

export type StatusPreparo = "pendente" | "preparo" | "pronto" | "entregue";

export type StatusEntrega = "novo" | "confirmado" | "preparo" | "pronto" | "saiu" | "entregue";

export type Item = {
  id: Id;
  produtoId: Id;
  nome: string;
  preco: number;
  qtd: number;
  obs?: string;
  setor: Setor;
  atendenteId?: Id;
  /** Número do pedido de preparo (cada "Enviar" gera um) */
  pedidoNumero: number;
  enviadoEm: string;
  preparo: StatusPreparo;
  cancelado?: { em: string; motivo: string; por?: Id };
};

export type Pagamento = {
  id: Id;
  formaId: Id;
  valor: number;
  troco?: number;
  em: string;
  sessaoCaixaId?: Id;
  /** Identificador externo: txid do Pix, NSU da maquininha */
  referencia?: string;
};

export type Conta = {
  id: Id;
  numero: number;
  canal: Canal;
  status: StatusConta;
  mesaId?: Id;
  comanda?: number;
  clienteId?: Id;
  clienteNome?: string;
  telefone?: string;
  endereco?: Endereco;
  paraViagem?: boolean;
  entregadorId?: Id;
  statusEntrega?: StatusEntrega;
  saiuEm?: string;
  itens: Item[];
  pagamentos: Pagamento[];
  desconto: number;
  /** % de taxa de serviço (0 desliga) */
  servicoPct: number;
  couvert: number;
  taxaEntrega: number;
  abertaEm: string;
  fechadaEm?: string;
  atendenteId?: Id;
  pessoas?: number;
  /** Id do pedido no marketplace (iFood/aiqfome) */
  externoId?: string;
  cupom?: string;
  observacao?: string;
  /** Forma escolhida pelo cliente no cardápio online */
  pagamentoOnline?: FormaPagamentoOnline;
  /** Pedido do marketplace já pago no app */
  pagoNoApp?: boolean;
  nfce?: NotaConsumidor;
};

export type NotaConsumidor = {
  status: "processando" | "autorizada" | "erro" | "cancelada";
  referencia: string;
  numero?: string;
  serie?: string;
  chave?: string;
  url?: string;
  mensagem?: string;
  em: string;
};

export type Caixa = { id: Id; nome: string };

export type TipoMovimento = "suprimento" | "sangria" | "despesa" | "repasse";

export type MovimentoCaixa = { id: Id; tipo: TipoMovimento; valor: number; descricao: string; em: string; destino?: string };

export type SessaoCaixa = {
  id: Id;
  caixaId: Id;
  operadorId?: Id;
  operadorNome: string;
  abertaEm: string;
  fundo: number;
  movimentos: MovimentoCaixa[];
  fechadaEm?: string;
  /** Valores contados no fechamento, por forma de pagamento */
  contado?: Record<Id, number>;
};

export type Auditoria = { id: Id; em: string; usuario: string; acao: string; detalhes?: string };

/** Chamado do cliente pelo cardápio QR Code (chamar garçom, pedir a conta). */
export type Chamado = {
  id: Id;
  mesaId: Id;
  motivo: "garcom" | "conta";
  em: string;
  atendidoEm?: string;
  atendidoPor?: Id;
};

export type FormaPagamentoOnline = "pix" | "dinheiro" | "cartao";

// ---------------------------------------------------------------------------
// Fase 3 · Estoque e financeiro
// ---------------------------------------------------------------------------

export type Unidade = "un" | "kg" | "g" | "l" | "ml" | "cx" | "pct";

export type Insumo = {
  id: Id;
  nome: string;
  unidade: Unidade;
  /** Custo médio por unidade (atualizado nas entradas) */
  custo: number;
  estoqueMinimo: number;
  /** Onde fica guardado: Cozinha, Bar, Depósito... */
  local: string;
  fornecedorId?: Id;
  /** Código do produto na nota do fornecedor, para casar o XML */
  codigoFornecedor?: string;
  ativo: boolean;
};

export type TipoMovEstoque = "entrada" | "saida" | "perda" | "ajuste" | "venda" | "estorno";

export type MovimentoEstoque = {
  id: Id;
  insumoId: Id;
  tipo: TipoMovEstoque;
  /** Quantidade com sinal (+ entra, − sai) */
  qtd: number;
  /** Custo unitário na entrada */
  custo?: number;
  em: string;
  lote?: string;
  validade?: string;
  documento?: string;
  obs?: string;
  usuario?: string;
};

export type Fornecedor = { id: Id; nome: string; documento: string; telefone: string; email?: string };

/** Grupo da linha no DRE */
export type GrupoDre = "receita" | "cmv" | "pessoal" | "ocupacao" | "administrativa" | "marketing" | "impostos" | "financeira" | "investimento" | "outras";

export type PlanoConta = { id: Id; nome: string; tipo: "receita" | "despesa"; grupo: GrupoDre };

export type Lancamento = {
  id: Id;
  tipo: "pagar" | "receber";
  descricao: string;
  planoId: Id;
  fornecedorId?: Id;
  clienteId?: Id;
  valor: number;
  /** AAAA-MM-DD */
  vencimento: string;
  competencia?: string;
  documento?: string;
  /** "2/6" quando parcelado */
  parcela?: string;
  recorrente?: boolean;
  pagoEm?: string;
  valorPago?: number;
  multa?: number;
  juros?: number;
  descontoPago?: number;
  formaId?: Id;
  anexo?: { nome: string; dados: string };
  obs?: string;
  criadoEm: string;
};

// ---------------------------------------------------------------------------
// Fase 5 · Marketing, atendimento automático e equipe
// ---------------------------------------------------------------------------

export type TipoPromocao = "cupom" | "happyhour" | "combo";

export type Promocao = {
  id: Id;
  nome: string;
  tipo: TipoPromocao;
  ativo: boolean;
  /** Cupom: código digitado pelo cliente */
  codigo?: string;
  percentual?: number;
  valorFixo?: number;
  /** Happy hour: categorias/produtos com desconto (vazio = todos) */
  categoriaIds?: Id[];
  produtoIds?: Id[];
  /** 0 = domingo … 6 = sábado (vazio = todos os dias) */
  diasSemana?: number[];
  horaInicio?: string;
  horaFim?: string;
  canais?: Canal[];
  pedidoMinimo?: number;
  validoAte?: string;
  limiteUsos?: number;
  usos?: number;
  /** Combo: itens e preço fechado; vira um produto no cardápio */
  combo?: { itens: { produtoId: Id; qtd: number }[]; preco: number; produtoId?: Id };
};

export type Treinamento = {
  id: Id;
  titulo: string;
  descricao: string;
  /** AAAA-MM-DDTHH:mm */
  quando: string;
  duracaoMin: number;
  link?: string;
  local?: string;
  funcoes: Funcao[];
  confirmados: Id[];
  presentes?: Id[];
};

export type RespostaBot = { id: Id; gatilhos: string; resposta: string };
