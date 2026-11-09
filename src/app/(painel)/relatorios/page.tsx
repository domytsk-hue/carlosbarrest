"use client";

import clsx from "clsx";
import { useState } from "react";
import { Botao, Cartao, Entrada, Titulo } from "@/components/ui";
import { resumoSessao } from "@/lib/dominio/caixa";
import { saldoFiado } from "@/lib/dominio/fiado";
import { brl, dataCurta, diaLocal, hora, total } from "@/lib/dominio/calculos";
import { diasAtras, porAtendente, porCanal, porDia, porForma, porProduto, ROTULO_CANAL, somaVendas, vendasNoPeriodo } from "@/lib/dominio/indicadores";
import { useLoja } from "@/lib/loja/loja";
import { RELATORIOS_EXTRAS } from "./extras";
import { Exportar, Rel } from "@/components/relatorio";

const BASE = ["Vendas por período", "Vendas por produto", "Vendas por vendedor", "Vendas por canal", "Formas de pagamento", "Pedidos", "Movimentação do caixa", "Entregas por entregador", "Clientes", "Auditoria"] as const;

export default function RelatoriosPage() {
  const e = useLoja((x) => x);
  const [de, setDe] = useState(diasAtras(6));
  const [ate, setAte] = useState(diaLocal());
  const nomes = [...BASE, ...RELATORIOS_EXTRAS.filter((r) => !r.estoque || e.config.estoqueAtivo).map((r) => r.nome)];
  const [rel, setRel] = useState<string>(nomes[0]);
  const p = { de, ate };
  const vendas = vendasNoPeriodo(e.contas, p);
  const fat = somaVendas(vendas);
  const extra = RELATORIOS_EXTRAS.find((r) => r.nome === rel);

  const atalhos: [string, string, string][] = [
    ["Hoje", diaLocal(), diaLocal()],
    ["7 dias", diasAtras(6), diaLocal()],
    ["30 dias", diasAtras(29), diaLocal()],
  ];

  return (
    <div className="mx-auto max-w-[1300px]">
      <Titulo sub={`${vendas.length} vendas · ${brl(fat)} no período`}>Relatórios</Titulo>
      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {nomes.map((n) => (
            <button key={n} onClick={() => setRel(n)} className={clsx("whitespace-nowrap rounded-xl px-3 py-2 text-left text-[13px] font-medium", n === rel ? "bg-rosado font-semibold text-acao" : "hover:bg-secundario/60")}>
              {n}
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end gap-2 rounded-[18px] bg-card p-3 shadow-card">
            <label className="text-[12px] font-semibold">
              De
              <Entrada type="date" value={de} onChange={(x) => setDe(x.target.value)} className="mt-1 py-2" />
            </label>
            <label className="text-[12px] font-semibold">
              Até
              <Entrada type="date" value={ate} onChange={(x) => setAte(x.target.value)} className="mt-1 py-2" />
            </label>
            {atalhos.map(([r, a, b]) => (
              <Botao key={r} variante="secundario" tamanho="sm" onClick={() => { setDe(a); setAte(b); }}>
                {r}
              </Botao>
            ))}
          </div>

          {extra ? (
            <extra.Componente periodo={p} />
          ) : rel === "Vendas por período" ? (
            (() => {
              const dias = porDia(vendas, p);
              const max = Math.max(1, ...dias.map((d) => d.valor));
              return (
                <>
                  <Cartao titulo="Faturamento por dia" acao={<Exportar nome="vendas-por-dia" cab={["Dia", "Vendas", "Valor"]} linhas={dias.map((d) => [d.dia, d.qtd, d.valor])} />}>
                    <div className="flex h-[200px] items-end gap-1" role="img" aria-label="Faturamento por dia">
                      {dias.map((d) => (
                        <div key={d.dia} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d.dia}: ${brl(d.valor)}`}>
                          <div className="w-full max-w-[28px] rounded-t-md bg-acao group-hover:bg-marca" style={{ height: `${(d.valor / max) * 100}%` }} />
                          <span className="text-[10px] text-mudo">{d.dia.slice(8)}</span>
                        </div>
                      ))}
                    </div>
                  </Cartao>
                  <div className="grid grid-cols-3 gap-3">
                    {[["Faturamento", brl(fat)], ["Vendas", String(vendas.length)], ["Ticket médio", brl(vendas.length ? fat / vendas.length : 0)]].map(([r, v]) => (
                      <div key={r} className="rounded-[18px] bg-card p-3 shadow-card">
                        <p className="text-[11.5px] font-semibold text-mudo">{r}</p>
                        <p className="num text-[20px] font-extrabold">{v}</p>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()
          ) : rel === "Vendas por produto" ? (
            (() => {
              const l = porProduto(vendas);
              return (
                <Rel cab={["Produto", "Qtd", "Valor", "%"]} nome="vendas-por-produto" linhas={l.map((x) => [x.nome, x.qtd, x.valor, fat ? (x.valor / fat) * 100 : 0])} />
              );
            })()
          ) : rel === "Vendas por vendedor" ? (
            <Rel cab={["Atendente", "Itens", "Vendido", "Serviço gerado"]} nome="vendas-por-vendedor" linhas={porAtendente(vendas, e.funcionarios).map((x) => [x.nome, x.qtd, x.valor, x.servico])} />
          ) : rel === "Vendas por canal" ? (
            <Rel cab={["Canal", "Pedidos", "Valor", "Ticket médio"]} nome="vendas-por-canal" linhas={porCanal(vendas).map((x) => [x.rotulo, x.qtd, x.valor, x.valor / x.qtd])} />
          ) : rel === "Formas de pagamento" ? (
            <Rel cab={["Forma", "Pagamentos", "Valor", "Taxa estimada"]} nome="formas-de-pagamento" linhas={porForma(vendas, e.formasPagamento).map((x) => [x.forma.nome, x.qtd, x.valor, (x.valor * x.forma.taxa) / 100])} />
          ) : rel === "Pedidos" ? (
            <Rel
              cab={["Conta", "Data", "Canal", "Cliente", "Itens", "Total"]}
              nome="pedidos"
              linhas={vendas
                .slice()
                .reverse()
                .map((c) => [String(c.numero), `${dataCurta(c.fechadaEm!)} ${hora(c.fechadaEm!)}`, ROTULO_CANAL[c.canal], c.clienteNome ?? "", c.itens.filter((i) => !i.cancelado).length, total(c)])}
            />
          ) : rel === "Movimentação do caixa" ? (
            <Rel
              cab={["Abertura", "Caixa", "Operador", "Fundo de troco", "Faturamento", "Comissão arrecadada", "Fiado recebido", "Suprimentos", "Sangrias", "Despesas", "Repasses"]}
              nome="movimentacao-caixa"
              linhas={e.sessoesCaixa
                .filter((s) => diaLocal(new Date(s.abertaEm)) >= de && diaLocal(new Date(s.abertaEm)) <= ate)
                .map((s) => {
                  const r = resumoSessao(s, e.contas, e.formasPagamento, e.fiado);
                  return [`${dataCurta(s.abertaEm)} ${hora(s.abertaEm)}`, e.caixas.find((c) => c.id === s.caixaId)?.nome ?? "", s.operadorNome, s.fundo, r.vendas, r.comissao, r.fiadoRecebido, r.suprimentos, r.sangrias, r.despesas, r.repasses];
                })}
            />
          ) : rel === "Entregas por entregador" ? (
            <Rel
              cab={["Entregador", "Entregas", "Valor entregue", "Taxas de entrega"]}
              nome="entregas-por-entregador"
              linhas={e.funcionarios
                .filter((f) => f.funcao === "entregador")
                .map((f) => {
                  const l = vendas.filter((c) => c.entregadorId === f.id);
                  return [f.nome, l.length, somaVendas(l), l.reduce((s, c) => s + c.taxaEntrega, 0)];
                })}
            />
          ) : rel === "Clientes" ? (
            <Rel
              cab={["Cliente", "Telefone", "Pedidos no período", "Gasto no período", "Saldo do fiado"]}
              nome="clientes"
              linhas={e.clientes.map((c) => {
                const l = vendas.filter((v) => v.clienteId === c.id);
                return [c.nome, c.telefone, l.length, somaVendas(l), saldoFiado(e.fiado ?? [], c.id)];
              })}
            />
          ) : (
            <Rel
              cab={["Quando", "Usuário", "Ação", "Detalhes"]}
              nome="auditoria"
              linhas={e.auditoria.filter((a) => diaLocal(new Date(a.em)) >= de && diaLocal(new Date(a.em)) <= ate).map((a) => [`${dataCurta(a.em)} ${hora(a.em)}`, a.usuario, a.acao, a.detalhes ?? ""])}
            />
          )}
        </div>
      </div>
    </div>
  );
}

