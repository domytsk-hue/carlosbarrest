"use client";

import Image from "next/image";
import Link from "next/link";
import { AlarmClock, AlertTriangle, ArrowDownRight, ArrowUpRight, Armchair, CheckCircle2, Package, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { calcularAlertas } from "@/lib/dominio/alertas";
import { brl, diaLocal, total } from "@/lib/dominio/calculos";
import { diasAtras, porCanal, porForma, porHora, porProduto, somaVendas, vendasNoPeriodo } from "@/lib/dominio/indicadores";
import { useLoja } from "@/lib/loja/loja";
import { useRelogio } from "@/components/ui";

function Kpi({ rotulo, valor, detalhe, icone: Icone, destaque }: { rotulo: string; valor: string; detalhe?: React.ReactNode; icone: React.ElementType; destaque?: boolean }) {
  return (
    <div className={destaque ? "rounded-[20px] bg-gradient-to-br from-[#9E1B1E] to-[#C2402F] p-4 text-white shadow-card" : "rounded-[20px] bg-card p-4 shadow-card"}>
      <div className="flex items-center gap-2">
        <span className={destaque ? "flex h-9 w-9 items-center justify-center rounded-full bg-white/15" : "flex h-9 w-9 items-center justify-center rounded-full bg-rosado text-acao"}>
          <Icone size={18} />
        </span>
        <span className={destaque ? "text-[12px] font-semibold text-[#FFD9A0]" : "text-[12px] font-semibold text-mudo"}>{rotulo}</span>
      </div>
      <p className="num mt-3 text-[26px] font-extrabold leading-none tracking-tight">{valor}</p>
      {detalhe && <div className={destaque ? "mt-2 text-[12px] text-white/90" : "mt-2 text-[12px] text-mudo"}>{detalhe}</div>}
    </div>
  );
}

function Card({ titulo, acao, children, className = "" }: { titulo: string; acao?: { href: string; texto: string }; children: React.ReactNode; className?: string }) {
  return (
    <section className={"rounded-[20px] bg-card p-4 shadow-card " + className}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15.5px] font-bold">{titulo}</h2>
        {acao && (
          <Link href={acao.href} className="text-[12.5px] font-semibold text-acao">
            {acao.texto}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const ICONE_ALERTA = { atraso: AlarmClock, estoque: Package, conta: AlertTriangle, caixa: Wallet };

export default function Dashboard() {
  const e = useLoja((x) => x);
  const agora = useRelogio(60000);
  const hoje = diaLocal();
  const vendas = vendasNoPeriodo(e.contas, { de: hoje, ate: hoje });
  const semanaPassada = vendasNoPeriodo(e.contas, { de: diasAtras(7), ate: diasAtras(7) });
  const fat = somaVendas(vendas);
  const fatAnt = somaVendas(semanaPassada);
  const variacao = fatAnt ? ((fat - fatAnt) / fatAnt) * 100 : null;
  const ticket = vendas.length ? fat / vendas.length : 0;
  const abertas = e.contas.filter((c) => c.status === "aberta" || c.status === "fechamento");
  const mesasOcupadas = new Set(abertas.filter((c) => c.mesaId).map((c) => c.mesaId)).size;
  const emFechamento = abertas.filter((c) => c.mesaId && c.status === "fechamento").length;
  const emAberto = abertas.reduce((s, c) => s + total(c), 0);
  const horas = porHora(vendas).filter((h) => h.hora >= 10 || h.valor > 0);
  const faixa = horas.filter((h) => h.hora >= Math.min(11, ...horas.filter((x) => x.valor).map((x) => x.hora)) && h.hora <= Math.max(23, ...horas.filter((x) => x.valor).map((x) => x.hora)));
  const maxHora = Math.max(1, ...faixa.map((h) => h.valor));
  const canais = porCanal(vendas);
  const totalCanais = canais.reduce((s, c) => s + c.valor, 0) || 1;
  const formas = porForma(vendas, e.formasPagamento);
  const totalFormas = formas.reduce((s, f) => s + f.valor, 0) || 1;
  const top = porProduto(vendas).slice(0, 5);
  const alertas = calcularAlertas(e, agora);
  const dataHoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
        <div>
          <p className="text-[12.5px] font-semibold text-acao first-letter:uppercase">{dataHoje}</p>
          <h1 className="font-slab text-[26px] font-extrabold uppercase leading-tight tracking-tight text-marca">Visão geral</h1>
        </div>
        {abertas.length > 0 && (
          <p className="text-[12.5px] text-mudo">
            <b className="num text-tinta">{brl(emAberto)}</b> em {abertas.length} conta(s) abertas
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          destaque
          rotulo="Faturamento hoje"
          valor={brl(fat)}
          icone={Wallet}
          detalhe={
            variacao === null ? (
              "sem vendas no mesmo dia da semana passada"
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold">
                {variacao >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(variacao).toFixed(1).replace(".", ",")}% vs. semana passada
              </span>
            )
          }
        />
        <Kpi rotulo="Pedidos" valor={String(vendas.length)} icone={ShoppingBag} detalhe="pagos hoje, em todos os canais" />
        <Kpi rotulo="Ticket médio" valor={brl(ticket)} icone={Receipt} />
        <Kpi
          rotulo="Mesas"
          valor={`${mesasOcupadas}/${e.mesas.length}`}
          icone={Armchair}
          detalhe={
            <span>
              <b className="text-st-preparo">{emFechamento}</b> em fechamento · <b className="text-ok">{e.mesas.length - mesasOcupadas}</b> livres
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card titulo="Vendas por hora" className="lg:col-span-2">
          {fat === 0 ? (
            <p className="flex h-[190px] items-center justify-center text-[13px] text-mudo">As vendas de hoje aparecem aqui assim que a primeira conta for paga.</p>
          ) : (
            <div className="flex h-[190px] items-end gap-1 sm:gap-2" role="img" aria-label="Gráfico de vendas por hora">
              {faixa.map((h) => (
                <div key={h.hora} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="num hidden text-[10px] font-semibold text-mudo opacity-0 transition-opacity group-hover:opacity-100 sm:block">{h.valor ? brl(h.valor).replace(",00", "") : ""}</span>
                  <div className="w-full max-w-[30px] rounded-t-[7px] bg-acao transition-colors group-hover:bg-marca" style={{ height: `${Math.max(h.valor ? 3 : 0, (h.valor / maxHora) * 100)}%` }} />
                  <span className="text-[10.5px] text-mudo">{h.hora}h</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card titulo="Alertas">
          {alertas.length ? (
            <ul className="space-y-2.5">
              {alertas.map((a) => {
                const Icone = ICONE_ALERTA[a.tipo];
                return (
                  <li key={a.texto}>
                    <Link href={a.href} className="flex gap-3 rounded-2xl border border-linha p-3 hover:bg-fundo">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#FDF0D6] text-[#8A5A00]">
                        <Icone size={16} />
                      </span>
                      <span className="text-[13px] leading-snug">{a.texto}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-2xl bg-[#E5F4EA] p-3 text-[13px] font-semibold text-[#1E7A41]">
              <CheckCircle2 size={18} /> Tudo em dia por aqui.
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card titulo="Mais vendidos hoje" acao={{ href: "/relatorios", texto: "Ver relatório" }}>
          {top.length ? (
            <ul className="divide-y divide-linha">
              {top.map((p, i) => {
                const prod = e.produtos.find((x) => x.id === p.produtoId);
                const cat = e.categorias.find((c) => c.id === prod?.categoriaId);
                return (
                  <li key={p.produtoId} className="flex items-center gap-3 py-2.5">
                    <span className="w-4 text-[12px] font-bold text-mudo">{i + 1}</span>
                    <span className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-[14px] bg-icone-fundo">
                      {prod?.foto ? <Image src={prod.foto} alt="" width={44} height={44} className="h-11 w-11 object-cover" /> : cat?.icone ? <Image src={cat.icone} alt="" width={38} height={38} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-tight">
                      <span className="block truncate">{p.nome}</span>
                      <span className="block text-[11.5px] text-mudo">{p.qtd} vendidos</span>
                    </span>
                    <span className="num text-[13.5px] font-bold">{brl(p.valor)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-mudo">Nenhuma venda hoje ainda.</p>
          )}
        </Card>

        <Card titulo="Vendas por canal">
          {canais.length ? (
            <ul className="space-y-3">
              {canais.map((c) => (
                <li key={c.canal}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="font-medium">{c.rotulo}</span>
                    <span className="num font-semibold">{brl(c.valor)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secundario">
                    <div className="h-2 rounded-full bg-acao" style={{ width: `${(c.valor / totalCanais) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-mudo">Sem vendas no período.</p>
          )}
        </Card>

        <Card titulo="Formas de pagamento" acao={{ href: "/caixa", texto: "Ir para o caixa" }}>
          {formas.length ? (
            <ul className="space-y-2">
              {formas.map((p) => (
                <li key={p.forma.id} className="flex items-center justify-between rounded-2xl bg-fundo px-3 py-2.5">
                  <span className="text-[13.5px] font-semibold">{p.forma.nome}</span>
                  <span className="text-right">
                    <span className="num block text-[13.5px] font-bold">{brl(p.valor)}</span>
                    <span className="num block text-[11px] text-mudo">{((p.valor / totalFormas) * 100).toFixed(0)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-mudo">Nenhum pagamento hoje.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
