import { arred, total, valorServico } from "./calculos";
import type { Conta, FormaPagamento, MovFiado, SessaoCaixa } from "./tipos";

export type ResumoCaixa = {
  porForma: { forma: FormaPagamento; valor: number; qtd: number }[];
  /** Faturamento: vendas recebidas neste caixa (inclui o que foi vendido no fiado) */
  vendas: number;
  suprimentos: number;
  sangrias: number;
  despesas: number;
  repasses: number;
  /** Dinheiro que deveria estar na gaveta */
  dinheiroEsperado: number;
  /** Esperado por forma (dinheiro inclui fundo, movimentos e pagamentos de fiado) */
  esperado: Record<string, number>;
  /** Comissão (taxa de serviço) efetivamente paga pelos clientes neste caixa */
  comissao: number;
  /** Vendido no fiado (entra no faturamento, mas não é dinheiro recebido) */
  fiadoVendido: number;
  /** Pagamentos de fiado recebidos neste caixa, por forma. Não entram no faturamento. */
  fiadoRecebido: number;
  fiadoPorForma: Record<string, number>;
  /** Total que entrou de fato: vendas fora do fiado + pagamentos de fiado */
  recebido: number;
};

export function resumoSessao(s: SessaoCaixa, contas: Conta[], formas: FormaPagamento[], fiado: MovFiado[] = []): ResumoCaixa {
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

  const pagosFiado = fiado.filter((m) => m.tipo === "pagamento" && m.sessaoCaixaId === s.id);
  const fiadoPorForma: Record<string, number> = {};
  for (const m of pagosFiado) if (m.formaId) fiadoPorForma[m.formaId] = arred((fiadoPorForma[m.formaId] ?? 0) + m.valor);
  const fiadoRecebido = arred(pagosFiado.reduce((a, m) => a + m.valor, 0));

  const dinheiroForma = formas.find((f) => f.tipo === "dinheiro");
  const dinheiro = porForma.find((p) => p.forma.tipo === "dinheiro")?.valor ?? 0;
  const dinheiroFiado = dinheiroForma ? (fiadoPorForma[dinheiroForma.id] ?? 0) : 0;
  const dinheiroEsperado = arred(s.fundo + dinheiro + dinheiroFiado + suprimentos - sangrias - despesas - repasses);
  const esperado: Record<string, number> = {};
  for (const p of porForma) esperado[p.forma.id] = p.forma.tipo === "dinheiro" ? dinheiroEsperado : arred(p.valor + (fiadoPorForma[p.forma.id] ?? 0));

  // Comissão: parte da taxa de serviço de cada conta proporcional ao que foi pago neste caixa
  let comissao = 0;
  for (const c of contas) {
    if (c.status === "cancelada") continue;
    const aqui = c.pagamentos.filter((p) => p.sessaoCaixaId === s.id).reduce((a, p) => a + p.valor, 0);
    const t = total(c);
    if (aqui > 0 && t > 0) comissao += (valorServico(c) * Math.min(aqui, t)) / t;
  }

  const fiadoVendido = arred(porForma.filter((p) => p.forma.tipo === "fiado").reduce((a, p) => a + p.valor, 0));
  const vendas = arred(porForma.reduce((a, p) => a + p.valor, 0));
  return {
    porForma,
    vendas,
    suprimentos,
    sangrias,
    despesas,
    repasses,
    dinheiroEsperado,
    esperado,
    comissao: arred(comissao),
    fiadoVendido,
    fiadoRecebido,
    fiadoPorForma,
    recebido: arred(vendas - fiadoVendido + fiadoRecebido),
  };
}
