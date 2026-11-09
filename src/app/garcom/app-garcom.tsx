"use client";

import clsx from "clsx";
import { ArrowLeft, Armchair, BellRing, CheckCheck, HandPlatter, LayoutGrid, Plus, Printer, Receipt, Wallet, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { imprimir } from "@/components/impressao";
import { Lancador } from "@/components/pedido/lancador";
import { PagamentoModal } from "@/components/pedido/pagamento";
import { nomeConta } from "@/components/pedido/painel-conta";
import { useRelogio } from "@/components/ui";
import { brl, duracao, itensValidos, minutosDesde, restante, total } from "@/lib/dominio/calculos";
import type { Conta } from "@/lib/dominio/tipos";
import { abrirConta, atenderChamado, descartarSeVazia, mudarPreparo, pedirConta, trocarUsuario } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

type Aba = "mesas" | "prontos" | "chamados";

export function AppGarcom() {
  const mesas = useLoja((e) => e.mesas);
  const contas = useLoja((e) => e.contas);
  const chamadosTodos = useLoja((e) => e.chamados);
  const funcionarios = useLoja((e) => e.funcionarios);
  const usuarioId = useLoja((e) => e.usuarioId);
  const agora = useRelogio(15000);
  const [aba, setAba] = useState<Aba>("mesas");
  const [soMinhas, setSoMinhas] = useState(false);
  const [mesaSel, setMesaSel] = useState<string | null>(null);
  const [lancando, setLancando] = useState<{ contaId: string; titulo: string; nova: boolean } | null>(null);
  const [pagando, setPagando] = useState<Conta | null>(null);
  const [aviso, setAviso] = useState("");

  const abertas = useMemo(() => contas.filter((c) => c.status === "aberta" || c.status === "fechamento"), [contas]);
  const chamados = chamadosTodos.filter((c) => !c.atendidoEm);
  const prontos = useMemo(() => {
    const m = new Map<string, { conta: Conta; pedido: number; itens: Conta["itens"] }>();
    for (const c of abertas) {
      if (c.canal !== "mesa" && c.canal !== "comanda" && c.canal !== "qrcode") continue;
      for (const i of c.itens) {
        if (i.cancelado || i.preparo !== "pronto") continue;
        const k = `${c.id}:${i.pedidoNumero}`;
        const g = m.get(k) ?? { conta: c, pedido: i.pedidoNumero, itens: [] };
        g.itens.push(i);
        m.set(k, g);
      }
    }
    return [...m.values()];
  }, [abertas]);
  const garcons = funcionarios.filter((f) => f.ativo && ["garcom", "dono", "gerente"].includes(f.funcao));

  const mostrar = (t: string) => {
    setAviso(t);
    setTimeout(() => setAviso(""), 3000);
  };

  const mesa = mesas.find((m) => m.id === mesaSel);
  const conta = mesa ? abertas.find((c) => c.mesaId === mesa.id) : undefined;

  function novoPedido() {
    if (!mesa) return;
    const existente = conta;
    const id = existente?.id ?? abrirConta({ canal: "mesa", mesaId: mesa.id, atendenteId: usuarioId });
    setLancando({ contaId: id, titulo: `Mesa ${mesa.numero}`, nova: !existente });
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-barra-topo px-3 py-2.5 text-white">
        {mesa ? (
          <button onClick={() => setMesaSel(null)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <Link href="/" className="rounded-xl bg-[#F7EEE3] px-1.5 py-1" aria-label="Painel">
            <Image src="/logo.svg" alt="Carlo's" width={54} height={36} className="h-auto w-[54px]" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-slab text-[17px] font-extrabold">{mesa ? `Mesa ${mesa.numero}` : "Garçom"}</p>
          {mesa && conta && (
            <p className="text-[11.5px] text-white/75">
              Aberta há {duracao(conta.abertaEm, agora)} · {funcionarios.find((f) => f.id === conta.atendenteId)?.nome ?? "—"}
            </p>
          )}
        </div>
        <select
          value={usuarioId}
          onChange={(e) => trocarUsuario(e.target.value)}
          aria-label="Garçom"
          className="max-w-[120px] rounded-full bg-white/15 px-3 py-2 text-[13px] font-semibold text-white outline-none [&>option]:text-tinta"
        >
          {garcons.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
      </header>

      {aviso && <div className="fixed inset-x-3 top-16 z-50 rounded-2xl bg-tinta px-4 py-3 text-center text-[14px] font-semibold text-white shadow-flutuante">{aviso}</div>}

      {mesa ? (
        <main className="p-3">
          {!conta ? (
            <div className="mt-10 text-center">
              <Armchair size={40} className="mx-auto text-mudo" />
              <p className="mt-2 text-mudo">Mesa livre</p>
              <button onClick={novoPedido} className="mx-auto mt-4 flex min-h-14 items-center gap-2 rounded-full bg-acao px-8 font-bold text-white shadow-botao">
                <Plus size={20} /> Abrir mesa e lançar
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-[20px] bg-card p-3 shadow-card">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-mudo">{conta.status === "fechamento" ? "Conta pedida" : "Total da mesa"}</span>
                  <span className="num text-[24px] font-extrabold text-marca">{brl(total(conta))}</span>
                </div>
                {restante(conta) < total(conta) && <p className="num text-right text-[12.5px] text-mudo">Falta {brl(restante(conta))}</p>}
                <ul className="mt-2 divide-y divide-linha">
                  {itensValidos(conta).map((i) => (
                    <li key={i.id} className="flex items-center gap-2 py-2 text-[14px]">
                      <span className="num w-8 font-bold">{i.qtd}×</span>
                      <span className="min-w-0 flex-1">
                        {i.nome}
                        {i.obs && <span className="block text-[11.5px] text-mudo">{i.obs}</span>}
                      </span>
                      <span
                        className={clsx(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          i.preparo === "pendente" && "bg-st-novo",
                          i.preparo === "preparo" && "bg-st-preparo",
                          i.preparo === "pronto" && "bg-st-pronto",
                          i.preparo === "entregue" && "bg-st-entregue",
                        )}
                        title={i.preparo}
                      />
                      <span className="num w-20 text-right">{brl(i.preco * i.qtd)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <BotaoGrande icone={Plus} rotulo="Lançar" destaque onClick={novoPedido} />
                <BotaoGrande
                  icone={Receipt}
                  rotulo="Pedir conta"
                  onClick={() => {
                    pedirConta(conta.id);
                    imprimir({ tipo: "conta", conta });
                    mostrar("Conta enviada para impressão");
                  }}
                />
                <BotaoGrande icone={Wallet} rotulo="Receber" onClick={() => setPagando(conta)} disabled={restante(conta) <= 0} />
              </div>
              <button onClick={() => imprimir({ tipo: "conta", conta })} className="mx-auto mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-mudo">
                <Printer size={15} /> Imprimir parcial
              </button>
            </>
          )}
        </main>
      ) : aba === "mesas" ? (
        <main className="p-3">
          <div className="mb-3 flex items-center gap-2 text-[12.5px]">
            <button onClick={() => setSoMinhas(false)} className={clsx("rounded-full px-3 py-1.5 font-bold", !soMinhas ? "bg-acao text-white" : "bg-card shadow-card")}>
              Todas
            </button>
            <button onClick={() => setSoMinhas(true)} className={clsx("rounded-full px-3 py-1.5 font-bold", soMinhas ? "bg-acao text-white" : "bg-card shadow-card")}>
              Minhas
            </button>
            <span className="ml-auto text-mudo">{abertas.filter((c) => c.mesaId).length} ocupadas</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {mesas.map((m) => {
              const c = abertas.find((x) => x.mesaId === m.id);
              if (soMinhas && c?.atendenteId !== usuarioId) return null;
              const chamou = chamados.some((x) => x.mesaId === m.id);
              const pronto = prontos.some((p) => p.conta.mesaId === m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => setMesaSel(m.id)}
                  className={clsx(
                    "relative flex aspect-square flex-col items-center justify-center rounded-2xl shadow-card",
                    !c && "bg-card",
                    c?.status === "aberta" && "bg-acao text-white",
                    c?.status === "fechamento" && "bg-ouro text-tinta",
                  )}
                >
                  <span className="num text-[22px] font-extrabold leading-none">{m.numero}</span>
                  {c && <span className="num mt-0.5 text-[10.5px] font-semibold opacity-85">{brl(total(c)).replace("R$", "").trim()}</span>}
                  {chamou && <BellRing size={15} className="absolute right-1.5 top-1.5 animate-pulse text-ouro drop-shadow" />}
                  {pronto && <HandPlatter size={15} className="absolute left-1.5 top-1.5 text-[#BDF5CF]" />}
                </button>
              );
            })}
          </div>
        </main>
      ) : aba === "prontos" ? (
        <main className="grid gap-2 p-3">
          {!prontos.length && <p className="py-10 text-center text-mudo">Nada pronto para levar agora.</p>}
          {prontos.map((p) => (
            <div key={`${p.conta.id}${p.pedido}`} className="rounded-[18px] bg-card p-3 shadow-card">
              <div className="flex items-center justify-between">
                <p className="font-extrabold">{nomeConta(p.conta, mesas)}</p>
                <span className="text-[12px] text-mudo">Pedido {p.pedido}</span>
              </div>
              <ul className="my-1.5 text-[14px]">
                {p.itens.map((i) => (
                  <li key={i.id}>
                    <b className="num">{i.qtd}×</b> {i.nome}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => mudarPreparo(p.conta.id, p.itens.map((i) => i.id), "entregue")}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ok font-bold text-white"
              >
                <CheckCheck size={18} /> Levei para a mesa
              </button>
            </div>
          ))}
        </main>
      ) : (
        <main className="grid gap-2 p-3">
          {!chamados.length && <p className="py-10 text-center text-mudo">Nenhum chamado das mesas.</p>}
          {chamados.map((c) => {
            const m = mesas.find((x) => x.id === c.mesaId);
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-[18px] bg-card p-3 shadow-card">
                <span className={clsx("grid h-11 w-11 place-items-center rounded-full", c.motivo === "conta" ? "bg-ouro/25 text-[#8A5A00]" : "bg-rosado text-acao")}>
                  {c.motivo === "conta" ? <Receipt size={20} /> : <BellRing size={20} />}
                </span>
                <div className="flex-1">
                  <p className="font-extrabold">Mesa {m?.numero}</p>
                  <p className="text-[12.5px] text-mudo">
                    {c.motivo === "conta" ? "Pediu a conta" : "Chamou o garçom"} · há {minutosDesde(c.em, agora)} min
                  </p>
                </div>
                <button onClick={() => atenderChamado(c.id)} className="min-h-10 rounded-full bg-acao px-4 text-[13px] font-bold text-white">
                  Atender
                </button>
              </div>
            );
          })}
        </main>
      )}

      {!mesa && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-linha bg-card pb-[env(safe-area-inset-bottom)]">
          {(
            [
              ["mesas", "Mesas", LayoutGrid, 0],
              ["prontos", "Prontos", HandPlatter, prontos.length],
              ["chamados", "Chamados", BellRing, chamados.length],
            ] as const
          ).map(([v, r, I, n]) => (
            <button key={v} onClick={() => setAba(v)} className={clsx("relative flex flex-col items-center gap-0.5 py-2.5 text-[11.5px] font-bold", aba === v ? "text-acao" : "text-mudo")}>
              <I size={22} />
              {r}
              {n > 0 && <span className="num absolute left-1/2 top-1 ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-acao px-1 text-[11px] text-white">{n}</span>}
            </button>
          ))}
        </nav>
      )}

      {lancando && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-fundo">
          <div className="sticky top-0 z-10 flex items-center gap-2 bg-barra-topo px-3 py-2.5 text-white">
            <button
              onClick={() => {
                if (lancando.nova) descartarSeVazia(lancando.contaId);
                setLancando(null);
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
            <p className="font-slab text-[17px] font-extrabold">{lancando.titulo} · novo pedido</p>
          </div>
          <div className="p-3">
            <Lancador
              compacto
              contaId={lancando.contaId}
              titulo={lancando.titulo}
              aoEnviar={(n) => {
                setLancando(null);
                mostrar(`Pedido ${n} enviado para a cozinha`);
              }}
            />
          </div>
        </div>
      )}

      {pagando && (
        <PagamentoModal
          conta={contas.find((c) => c.id === pagando.id) ?? pagando}
          aberto
          aoFechar={() => setPagando(null)}
          aoQuitar={() => {
            setPagando(null);
            setMesaSel(null);
            mostrar("Mesa fechada");
          }}
        />
      )}
    </div>
  );
}

function BotaoGrande({ icone: I, rotulo, onClick, destaque, disabled }: { icone: React.ElementType; rotulo: string; onClick: () => void; destaque?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx("flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl text-[13px] font-bold disabled:opacity-40", destaque ? "bg-acao text-white shadow-botao" : "bg-card shadow-card")}
    >
      <I size={22} />
      {rotulo}
    </button>
  );
}
