import Image from "next/image";
import Link from "next/link";
import { AlarmClock, AlertTriangle, ArrowUpRight, Armchair, Package, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { DEMO, brl } from "@/lib/demo";
import { obterSessao } from "@/lib/sessao";

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

export default async function Dashboard() {
  const sessao = await obterSessao();
  const d = DEMO;
  const variacao = ((d.faturamentoHoje - d.faturamentoSemanaPassada) / d.faturamentoSemanaPassada) * 100;
  const maxHora = Math.max(...d.porHora.map((h) => h.valor));
  const totalCanais = d.porCanal.reduce((s, c) => s + c.valor, 0);
  const totalPag = d.pagamentos.reduce((s, p) => s + p.valor, 0);
  const totalMesas = d.mesas.ocupadas + d.mesas.emFechamento + d.mesas.livres;
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
        <div>
          <p className="text-[12.5px] font-semibold text-acao first-letter:uppercase">{hoje}</p>
          <h1 className="font-slab text-[26px] font-extrabold uppercase leading-tight tracking-tight text-marca">Visão geral</h1>
        </div>
        {sessao?.demo && <p className="text-[12px] text-mudo">Dados de exemplo · os números reais chegam com a Fase 1</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          destaque
          rotulo="Faturamento hoje"
          valor={brl(d.faturamentoHoje)}
          icone={Wallet}
          detalhe={
            <span className="inline-flex items-center gap-1 font-semibold">
              <ArrowUpRight size={14} />
              {variacao.toFixed(1).replace(".", ",")}% vs. semana passada
            </span>
          }
        />
        <Kpi rotulo="Pedidos" valor={String(d.pedidosHoje)} icone={ShoppingBag} detalhe="em todos os canais" />
        <Kpi rotulo="Ticket médio" valor={brl(d.ticketMedio)} icone={Receipt} />
        <Kpi
          rotulo="Mesas"
          valor={`${d.mesas.ocupadas + d.mesas.emFechamento}/${totalMesas}`}
          icone={Armchair}
          detalhe={
            <span>
              <b className="text-st-preparo">{d.mesas.emFechamento}</b> em fechamento · <b className="text-ok">{d.mesas.livres}</b> livres
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card titulo="Vendas por hora" className="lg:col-span-2">
          <div className="flex h-[190px] items-end gap-1.5 sm:gap-2.5" role="img" aria-label="Gráfico de vendas por hora">
            {d.porHora.map((h) => (
              <div key={h.hora} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <span className="num hidden text-[10.5px] font-semibold text-mudo opacity-0 sm:block transition-opacity group-hover:opacity-100">{brl(h.valor).replace(",00", "")}</span>
                <div className="w-full max-w-[34px] rounded-t-[8px] bg-acao transition-colors group-hover:bg-marca" style={{ height: `${(h.valor / maxHora) * 100}%` }} />
                <span className="text-[11px] text-mudo">{h.hora}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card titulo="Alertas">
          <ul className="space-y-2.5">
            {d.alertas.map((a) => {
              const Icone = a.tipo === "atraso" ? AlarmClock : a.tipo === "estoque" ? Package : AlertTriangle;
              return (
                <li key={a.texto} className="flex gap-3 rounded-2xl border border-linha p-3">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#FDF0D6] text-[#8A5A00]">
                    <Icone size={16} />
                  </span>
                  <span className="text-[13px] leading-snug">{a.texto}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card titulo="Mais vendidos hoje" acao={{ href: "/relatorios", texto: "Ver relatório" }}>
          <ul className="divide-y divide-linha">
            {d.maisVendidos.map((p, i) => (
              <li key={p.nome} className="flex items-center gap-3 py-2.5">
                <span className="w-4 text-[12px] font-bold text-mudo">{i + 1}</span>
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-icone-fundo">
                  <Image src={`/categorias/ic-${p.categoria}.png`} alt="" width={38} height={38} />
                </span>
                <span className="flex-1 text-[13.5px] font-medium leading-tight">
                  {p.nome}
                  <span className="block text-[11.5px] text-mudo">{p.qtd} vendidos</span>
                </span>
                <span className="num text-[13.5px] font-bold">{brl(p.total)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card titulo="Vendas por canal">
          <ul className="space-y-3">
            {d.porCanal.map((c) => (
              <li key={c.canal}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="font-medium">{c.canal}</span>
                  <span className="num font-semibold">{brl(c.valor)}</span>
                </div>
                <div className="h-2 rounded-full bg-secundario">
                  <div className="h-2 rounded-full bg-acao" style={{ width: `${(c.valor / totalCanais) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card titulo="Formas de pagamento" acao={{ href: "/caixa", texto: "Abrir caixa" }}>
          <ul className="space-y-3">
            {d.pagamentos.map((p) => (
              <li key={p.forma} className="flex items-center justify-between rounded-2xl bg-fundo px-3 py-2.5">
                <span className="text-[13.5px] font-semibold">{p.forma}</span>
                <span className="text-right">
                  <span className="num block text-[13.5px] font-bold">{brl(p.valor)}</span>
                  <span className="num block text-[11px] text-mudo">{((p.valor / totalPag) * 100).toFixed(0)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
