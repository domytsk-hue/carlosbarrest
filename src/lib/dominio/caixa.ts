import { arred } from "./calculos";
import type { Conta, FormaPagamento, SessaoCaixa } from "./tipos";

export type ResumoCaixa = {
  porForma: { forma: FormaPagamento; valor: number; qtd: number }[];
  vendas: number;
  suprimentos: number;
  sangrias: number;
  despesas: number;
  repasses: number;
  /** Dinheiro que deveria estar na gaveta */
  dinheiroEsperado: number;
  /** Esperado por forma (dinheiro inclui fundo e movimentos) */
  esperado: Record<string, number>;
};

export function resumoSessao(s: SessaoCaixa, contas: Conta[], formas: FormaPagamento[]): ResumoCaixa {
  const pagamentos = contas.flatMap((c) => c.pagamentos).filter((p) => p.sessaoCaixaId === s.id);
  const porForma = formas.map((forma) => {
    const ps = pagamentos.filter((p) => p.formaId === forma.id);
    return { forma, valor: arred(ps.reduce((a, p) => a + p.valor, 0)), qtd: ps.length };
  });
  const soma = (t: string) => arred(s.movimentos.filter((m) => m.tipo === t).reduce((a, m) => a + m.valor, 0));
  const suprimentos = soma("suprimento");
  const sangrias = soma("sangria");
  const despesas = soma("despesa");
  const repasses = soma("repasse");
  const dinheiro = porForma.find((p) => p.forma.tipo === "dinheiro")?.valor ?? 0;
  const dinheiroEsperado = arred(s.fundo + dinheiro + suprimentos - sangrias - despesas - repasses);
  const esperado: Record<string, number> = {};
  for (const p of porForma) esperado[p.forma.id] = p.forma.tipo === "dinheiro" ? dinheiroEsperado : p.valor;
  return { porForma, vendas: arred(porForma.reduce((a, p) => a + p.valor, 0)), suprimentos, sangrias, despesas, repasses, dinheiroEsperado, esperado };
}
