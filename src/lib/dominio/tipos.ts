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
  /** Ficha técnica: insumos consumidos por unidade vendida (Fase 3) */
  ficha?: { insumoId: Id; qtd: number }[];
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
