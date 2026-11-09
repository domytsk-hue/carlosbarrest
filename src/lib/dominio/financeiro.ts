// Contas a pagar e a receber, DRE e comissões.
import { arred, diaLocal, total } from "./calculos";
import { cmvDasVendas } from "./estoque";
import { porAtendente, vendasNoPeriodo, type Periodo } from "./indicadores";
import type { Conta, FormaPagamento, Funcionario, GrupoDre, Insumo, Lancamento, PlanoConta, Produto, SessaoCaixa } from "./tipos";

export type SituacaoLancamento = "pago" | "vencido" | "hoje" | "aberto";

export function situacao(l: Lancamento, hoje = diaLocal()): SituacaoLancamento {
  if (l.pagoEm) return "pago";
  if (l.vencimento < hoje) return "vencido";
  if (l.vencimento === hoje) return "hoje";
  return "aberto";
}

/** Valor efetivamente pago/recebido (com multa, juros e desconto). */
export const valorFinal = (l: Lancamento) => arred(l.valorPago ?? l.valor + (l.multa ?? 0) + (l.juros ?? 0) - (l.descontoPago ?? 0));

/** Soma meses a uma data AAAA-MM-DD, ajustando o fim do mês (31/01 + 1 = 28/02). */
export function somarMeses(data: string, n: number) {
  const [a, m, d] = data.split("-").map(Number);
  const alvo = new Date(a, m - 1 + n, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d, ultimo));
  return alvo.toLocaleDateString("sv-SE");
}

/** Multa e juros sugeridos para atraso: 2% de multa + 1% ao mês pró-rata. */
export function encargosAtraso(l: Lancamento, pagoEm: string) {
  if (pagoEm <= l.vencimento) return { multa: 0, juros: 0 };
  const dias = Math.round((new Date(pagoEm).getTime() - new Date(l.vencimento).getTime()) / 86400000);
  return { multa: arred(l.valor * 0.02), juros: arred(l.valor * 0.01 * (dias / 30)) };
}

export const ROTULO_GRUPO: Record<GrupoDre, string> = {
  receita: "Receitas",
  cmv: "Custo das mercadorias (CMV)",
  pessoal: "Pessoal",
  ocupacao: "Ocupação (aluguel, energia, água, gás)",
  administrativa: "Administrativas",
  marketing: "Marketing",
  impostos: "Impostos",
  financeira: "Despesas financeiras",
  investimento: "Manutenção e investimentos",
  outras: "Outras despesas",
};

const noPeriodo = (dia: string | undefined, p: Periodo) => !!dia && dia >= p.de && dia <= p.ate;

export type LinhaDre = { rotulo: string; valor: number; nivel: 0 | 1 | 2; destaque?: boolean; pct?: number };

/**
 * DRE gerencial pelo regime de caixa: vendas do período, taxas das maquininhas,
 * CMV pela ficha técnica (ou pelas compras quando não há ficha) e as despesas
 * pagas no período (contas a pagar + despesas lançadas no caixa).
 */
export function dre(
  d: { contas: Conta[]; lancamentos: Lancamento[]; planoContas: PlanoConta[]; formas: FormaPagamento[]; produtos: Produto[]; insumos: Insumo[]; sessoes: SessaoCaixa[] },
  p: Periodo,
) {
  const vendas = vendasNoPeriodo(d.contas, p);
  const bruta = arred(vendas.reduce((s, c) => s + total(c), 0));
  const descontos = arred(vendas.reduce((s, c) => s + c.desconto, 0));
  const taxas = arred(
    vendas.reduce((s, c) => s + c.pagamentos.reduce((x, pg) => x + (pg.valor * (d.formas.find((f) => f.id === pg.formaId)?.taxa ?? 0)) / 100, 0), 0),
  );
  const pagos = d.lancamentos.filter((l) => noPeriodo(l.pagoEm, p));
  const grupoDe = (l: Lancamento) => d.planoContas.find((x) => x.id === l.planoId)?.grupo ?? (l.tipo === "receber" ? "receita" : "outras");
  const outrasReceitas = arred(pagos.filter((l) => l.tipo === "receber").reduce((s, l) => s + valorFinal(l), 0));

  const { cmv: cmvFicha, receitaSemFicha } = cmvDasVendas(vendas, d.produtos, d.insumos);
  const comprasCmv = arred(pagos.filter((l) => l.tipo === "pagar" && grupoDe(l) === "cmv").reduce((s, l) => s + valorFinal(l), 0));
  // Sem ficha técnica para tudo, usa as compras pagas como CMV da parte sem ficha (proporcional)
  const cmv = cmvFicha > 0 ? arred(cmvFicha + (bruta > 0 ? (comprasCmv * receitaSemFicha) / bruta : 0)) : comprasCmv;

  const despesasCaixa = arred(
    d.sessoes.flatMap((s) => s.movimentos).filter((m) => m.tipo === "despesa" && noPeriodo(new Date(m.em).toLocaleDateString("sv-SE"), p)).reduce((s, m) => s + m.valor, 0),
  );
  const grupos: GrupoDre[] = ["pessoal", "ocupacao", "administrativa", "marketing", "impostos", "financeira", "investimento", "outras"];
  const porGrupo = grupos.map((g) => ({
    g,
    v: arred(pagos.filter((l) => l.tipo === "pagar" && grupoDe(l) === g).reduce((s, l) => s + valorFinal(l), 0) + (g === "outras" ? despesasCaixa : 0)),
  }));
  const despesas = arred(porGrupo.reduce((s, x) => s + x.v, 0));
  const liquida = arred(bruta - taxas);
  const margem = arred(liquida - cmv);
  const operacional = arred(margem - despesas + outrasReceitas);
  const pct = (v: number) => (bruta > 0 ? arred((v / bruta) * 100) : 0);

  const linhas: LinhaDre[] = [
    { rotulo: "Receita bruta de vendas", valor: bruta, nivel: 0, destaque: true, pct: 100 },
    { rotulo: "Descontos concedidos (já abatidos)", valor: -descontos, nivel: 2 },
    { rotulo: "(−) Taxas de cartão e meios de pagamento", valor: -taxas, nivel: 1, pct: pct(taxas) },
    { rotulo: "Receita líquida", valor: liquida, nivel: 0, destaque: true, pct: pct(liquida) },
    { rotulo: "(−) CMV", valor: -cmv, nivel: 1, pct: pct(cmv) },
    { rotulo: "Margem de contribuição", valor: margem, nivel: 0, destaque: true, pct: pct(margem) },
    ...porGrupo.filter((x) => x.v).map((x) => ({ rotulo: `(−) ${ROTULO_GRUPO[x.g]}`, valor: -x.v, nivel: 1 as const, pct: pct(x.v) })),
    ...(outrasReceitas ? [{ rotulo: "(+) Outras receitas", valor: outrasReceitas, nivel: 1 as const }] : []),
    { rotulo: "Resultado operacional", valor: operacional, nivel: 0, destaque: true, pct: pct(operacional) },
  ];
  return { linhas, bruta, cmv, cmvFicha, receitaSemFicha, despesas, operacional, vendas: vendas.length };
}

/** Comissões: garçom recebe % da taxa de serviço; entregador recebe R$ por entrega. */
export function comissoes(contas: Conta[], funcionarios: Funcionario[], p: Periodo) {
  const vendas = vendasNoPeriodo(contas, p);
  const atendentes = porAtendente(vendas, funcionarios);
  // Comissão individual: % da comissão que o cliente pagou nos itens do funcionário,
  // ou valor fixo por atendimento (conta aberta por ele)
  const garcons = funcionarios
    .filter((f) => f.funcao !== "entregador" && f.comissao > 0)
    .map((f) => {
      const a = atendentes.find((x) => x.id === f.id);
      if (f.comissaoTipo === "valor") {
        const n = vendas.filter((c) => c.atendenteId === f.id).length;
        return { id: f.id, nome: f.nome, base: n, regra: `R$ ${f.comissao.toFixed(2).replace(".", ",")} por atendimento`, valor: arred(n * f.comissao), qtd: n };
      }
      if (!a) return null;
      return { id: f.id, nome: f.nome, base: a.servico, regra: `${f.comissao}% da comissão paga`, valor: arred((a.servico * f.comissao) / 100), qtd: a.qtd };
    })
    .filter((x): x is { id: string; nome: string; base: number; regra: string; valor: number; qtd: number } => !!x && x.qtd > 0);
  const entregadores = funcionarios
    .filter((f) => f.funcao === "entregador")
    .map((f) => {
      const n = vendas.filter((c) => c.entregadorId === f.id).length;
      return { id: f.id, nome: f.nome, base: n, regra: `R$ ${f.comissao.toFixed(2).replace(".", ",")} por entrega`, valor: arred(n * f.comissao), qtd: n };
    })
    .filter((x) => x.qtd > 0);
  return { garcons, entregadores, total: arred([...garcons, ...entregadores].reduce((s, x) => s + x.valor, 0)) };
}

