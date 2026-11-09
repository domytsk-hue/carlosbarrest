import { CATEGORIAS_SEED, PRODUTOS_SEED } from "../dominio/cardapio-seed";
import type {
  Auditoria,
  Bairro,
  Caixa,
  Categoria,
  Cliente,
  Conta,
  FormaPagamento,
  Funcionario,
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
  seq: { conta: number; pedido: number };
  auditoria: Auditoria[];
};

export const VERSAO = 1;

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
    },
    categorias: CATEGORIAS_SEED,
    produtos: PRODUTOS_SEED,
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
    ],
    caixas: [
      { id: "cx1", nome: "Caixa 1" },
      { id: "cx2", nome: "Caixa Delivery" },
    ],
    sessoesCaixa: [],
    usuarioId: "f1",
    contas: [],
    seq: { conta: 1, pedido: 64000 },
    auditoria: [],
  };
}
