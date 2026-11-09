"use client";

import clsx from "clsx";
import { Exportar, Rel } from "@/components/relatorio";
import { Cartao } from "@/components/ui";
import { brl } from "@/lib/dominio/calculos";
import { custoFicha, ROTULO_UNIDADE, saldos } from "@/lib/dominio/estoque";
import { comissoes, dre, situacao, valorFinal } from "@/lib/dominio/financeiro";
import { porProduto, vendasNoPeriodo, type Periodo } from "@/lib/dominio/indicadores";
import { useLoja } from "@/lib/loja/loja";

/** Relatórios acrescentados pelas fases seguintes (estoque, financeiro, DRE...). */
export const RELATORIOS_EXTRAS: { nome: string; Componente: (p: { periodo: Periodo }) => React.ReactNode; estoque?: boolean }[] = [
  { nome: "DRE", Componente: Dre },
  { nome: "Contas pagas e recebidas", Componente: ContasPagas },
  { nome: "Contas em aberto", Componente: ContasAbertas },
  { nome: "Comissões", Componente: Comissoes },
  { nome: "Posição do estoque", Componente: PosicaoEstoque, estoque: true },
  { nome: "Consumo de insumos", Componente: ConsumoInsumos, estoque: true },
  { nome: "CMV por produto", Componente: CmvProduto },
];

function Dre({ periodo }: { periodo: Periodo }) {
  const e = useLoja((x) => x);
  const r = dre({ contas: e.contas, lancamentos: e.lancamentos, planoContas: e.planoContas, formas: e.formasPagamento, produtos: e.produtos, insumos: e.insumos, sessoes: e.sessoesCaixa }, periodo);
  return (
    <Cartao titulo="DRE gerencial (regime de caixa)" acao={<Exportar nome="dre" cab={["Linha", "Valor", "% da receita"]} linhas={r.linhas.map((l) => [l.rotulo, l.valor, l.pct ?? ""])} />}>
      <table className="w-full text-[14px]">
        <tbody>
          {r.linhas.map((l) => (
            <tr key={l.rotulo} className={clsx("border-b border-linha", l.destaque && "bg-fundo font-extrabold")}>
              <td className={clsx("py-2.5", l.nivel === 1 && "pl-5", l.nivel === 2 && "pl-8 text-[12.5px] text-mudo")}>{l.rotulo}</td>
              <td className={clsx("num py-2.5 text-right", l.valor < 0 && l.nivel !== 2 && "text-st-cancelado", l.destaque && l.valor >= 0 && "text-tinta")}>{brl(l.valor)}</td>
              <td className="num w-20 py-2.5 text-right text-[12.5px] text-mudo">{l.pct !== undefined ? `${l.pct.toFixed(1).replace(".", ",")}%` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] text-mudo">
        CMV pela ficha técnica: {brl(r.cmvFicha)}.{" "}
        {r.receitaSemFicha > 0 && `${brl(r.receitaSemFicha)} da receita vem de produtos sem ficha; para essa parte o CMV usa as compras de mercadoria pagas no período, proporcionalmente.`} Despesas incluem as contas pagas no período e as despesas lançadas no caixa.
      </p>
    </Cartao>
  );
}

function ContasPagas({ periodo }: { periodo: Periodo }) {
  const e = useLoja((x) => x);
  const l = e.lancamentos.filter((x) => x.pagoEm && x.pagoEm >= periodo.de && x.pagoEm <= periodo.ate).sort((a, b) => a.pagoEm!.localeCompare(b.pagoEm!));
  return (
    <Rel
      nome="contas-pagas-recebidas"
      cab={["Data", "Tipo", "Descrição", "Plano", "Valor original", "Multa/juros", "Valor pago"]}
      linhas={l.map((x) => [x.pagoEm!.split("-").reverse().join("/"), x.tipo === "pagar" ? "Pago" : "Recebido", x.descricao, e.planoContas.find((p) => p.id === x.planoId)?.nome ?? "", x.valor, (x.multa ?? 0) + (x.juros ?? 0), valorFinal(x)])}
    />
  );
}

function ContasAbertas() {
  const e = useLoja((x) => x);
  const l = e.lancamentos.filter((x) => !x.pagoEm).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const rot = { vencido: "Vencida", hoje: "Vence hoje", aberto: "A vencer", pago: "Paga" };
  return (
    <Rel
      nome="contas-em-aberto"
      cab={["Vencimento", "Tipo", "Descrição", "Situação", "Valor"]}
      linhas={l.map((x) => [x.vencimento.split("-").reverse().join("/"), x.tipo === "pagar" ? "A pagar" : "A receber", x.descricao, rot[situacao(x)], x.valor])}
    />
  );
}

function Comissoes({ periodo }: { periodo: Periodo }) {
  const e = useLoja((x) => x);
  const c = comissoes(e.contas, e.funcionarios, periodo);
  return (
    <div className="space-y-3">
      <Rel nome="comissoes" cab={["Funcionário", "Regra", "Base", "Comissão"]} linhas={[...c.garcons.map((g) => [g.nome, g.regra, g.base, g.valor]), ...c.entregadores.map((x) => [x.nome, x.regra, `${x.base} entregas`, x.valor])]} />
      <p className="text-right text-[14px] font-extrabold">
        Total a pagar: <span className="num">{brl(c.total)}</span>
      </p>
      <p className="text-[12px] text-mudo">Garçom: percentual da comissão que o cliente pagou nos itens que lançou, ou valor fixo por atendimento. Entregador: valor fixo por entrega concluída. Ajuste a comissão de cada um em Funcionários.</p>
    </div>
  );
}

function PosicaoEstoque() {
  const e = useLoja((x) => x);
  const s = saldos(e.movimentosEstoque);
  return (
    <Rel
      nome="posicao-estoque"
      cab={["Insumo", "Local", "Saldo", "Mínimo", "Custo médio", "Valor em estoque"]}
      linhas={e.insumos.filter((i) => i.ativo).map((i) => [i.nome, i.local, `${(s.get(i.id) ?? 0).toLocaleString("pt-BR")} ${ROTULO_UNIDADE[i.unidade]}`, `${i.estoqueMinimo} ${ROTULO_UNIDADE[i.unidade]}`, i.custo, Math.max(0, s.get(i.id) ?? 0) * i.custo])}
    />
  );
}

function ConsumoInsumos({ periodo }: { periodo: Periodo }) {
  const e = useLoja((x) => x);
  const noP = e.movimentosEstoque.filter((m) => {
    const d = new Date(m.em).toLocaleDateString("sv-SE");
    return d >= periodo.de && d <= periodo.ate;
  });
  return (
    <Rel
      nome="consumo-insumos"
      cab={["Insumo", "Entradas", "Vendas (ficha)", "Saídas e perdas", "Ajustes", "Custo consumido"]}
      linhas={e.insumos.map((i) => {
        const m = noP.filter((x) => x.insumoId === i.id);
        const soma = (t: string[]) => m.filter((x) => t.includes(x.tipo)).reduce((s, x) => s + x.qtd, 0);
        const fmt = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${ROTULO_UNIDADE[i.unidade]}`;
        const consumido = -(soma(["venda", "estorno", "saida", "perda"]));
        return [i.nome, fmt(soma(["entrada"])), fmt(-soma(["venda", "estorno"])), fmt(-soma(["saida", "perda"])), fmt(soma(["ajuste"])), consumido * i.custo];
      })}
    />
  );
}

function CmvProduto({ periodo }: { periodo: Periodo }) {
  const e = useLoja((x) => x);
  const vendas = porProduto(vendasNoPeriodo(e.contas, periodo));
  return (
    <Rel
      nome="cmv-por-produto"
      cab={["Produto", "Qtd", "Vendido", "Custo (ficha)", "Margem", "CMV %"]}
      linhas={vendas
        .map((v) => {
          const p = e.produtos.find((x) => x.id === v.produtoId);
          const c = p ? custoFicha(p, e.insumos) : undefined;
          if (c === undefined) return null;
          const custo = c * v.qtd;
          return [v.nome, v.qtd, v.valor, custo, v.valor - custo, v.valor ? (custo / v.valor) * 100 : 0];
        })
        .filter(Boolean) as (string | number)[][]}
    />
  );
}
