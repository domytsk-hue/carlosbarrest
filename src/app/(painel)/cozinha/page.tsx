"use client";

import clsx from "clsx";
import { Bell, CheckCheck, ChefHat, Flame, Maximize2, Printer, Wine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { imprimir } from "@/components/impressao";
import { nomeConta } from "@/components/pedido/painel-conta";
import { Titulo, useRelogio, Vazio } from "@/components/ui";
import { faixaEspera, minutosDesde } from "@/lib/dominio/calculos";
import type { Conta, Item, Setor, StatusPreparo } from "@/lib/dominio/tipos";
import { mudarPreparo } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

type Grupo = { chave: string; conta: Conta; pedido: number; setor: Setor; itens: Item[]; status: StatusPreparo; desde: string };

const ORDEM: StatusPreparo[] = ["pendente", "preparo", "pronto", "entregue"];
const COLUNAS: { s: StatusPreparo; r: string; cor: string; acao: string; prox: StatusPreparo }[] = [
  { s: "pendente", r: "Na fila", cor: "bg-st-novo", acao: "Iniciar", prox: "preparo" },
  { s: "preparo", r: "Preparando", cor: "bg-st-preparo", acao: "Pronto", prox: "pronto" },
  { s: "pronto", r: "Pronto · aguardando", cor: "bg-st-pronto", acao: "Entregue", prox: "entregue" },
];

/** Monitor da cozinha e do bar (KDS): cada "Enviar" vira um cartão por setor. */
export default function CozinhaPage() {
  const contas = useLoja((e) => e.contas);
  const mesas = useLoja((e) => e.mesas);
  const agora = useRelogio(15000);
  const [setor, setSetor] = useState<Setor | "todos">("todos");

  const grupos = useMemo(() => {
    const limite = agora - 12 * 3600_000;
    const m = new Map<string, Grupo>();
    for (const c of contas) {
      if (c.status === "cancelada") continue;
      for (const i of c.itens) {
        if (i.cancelado || i.preparo === "entregue" || new Date(i.enviadoEm).getTime() < limite) continue;
        if (setor !== "todos" && i.setor !== setor) continue;
        const chave = `${c.id}:${i.pedidoNumero}:${i.setor}`;
        const g = m.get(chave) ?? { chave, conta: c, pedido: i.pedidoNumero, setor: i.setor, itens: [], status: "pronto" as StatusPreparo, desde: i.enviadoEm };
        g.itens.push(i);
        if (ORDEM.indexOf(i.preparo) < ORDEM.indexOf(g.status)) g.status = i.preparo;
        m.set(chave, g);
      }
    }
    return [...m.values()].sort((a, b) => a.desde.localeCompare(b.desde));
  }, [contas, setor, agora]);

  // Aviso sonoro quando chega pedido novo na fila
  const vistos = useRef<Set<string> | null>(null);
  useEffect(() => {
    const fila = grupos.filter((g) => g.status === "pendente").map((g) => g.chave);
    if (vistos.current && fila.some((k) => !vistos.current!.has(k))) bip();
    vistos.current = new Set(fila);
  }, [grupos]);

  const avancar = (g: Grupo, prox: StatusPreparo) =>
    mudarPreparo(
      g.conta.id,
      g.itens.filter((i) => ORDEM.indexOf(i.preparo) < ORDEM.indexOf(prox)).map((i) => i.id),
      prox,
    );

  return (
    <div className="mx-auto max-w-[1600px]">
      <Titulo
        sub="Toque no cartão para avançar o pedido. Chega com aviso sonoro."
        acoes={
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-card p-1 shadow-card">
              {(
                [
                  ["todos", "Tudo", null],
                  ["cozinha", "Cozinha", ChefHat],
                  ["bar", "Bar", Wine],
                ] as const
              ).map(([v, r, I]) => (
                <button key={v} onClick={() => setSetor(v)} className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold", setor === v ? "bg-acao text-white" : "text-mudo")}>
                  {I && <I size={15} />} {r}
                </button>
              ))}
            </div>
            <button onClick={() => document.documentElement.requestFullscreen?.()} className="hidden h-10 w-10 place-items-center rounded-full bg-card text-mudo shadow-card sm:grid" aria-label="Tela cheia" title="Tela cheia">
              <Maximize2 size={17} />
            </button>
          </div>
        }
      >
        Cozinha
      </Titulo>

      {!grupos.length ? (
        <Vazio icone={ChefHat} titulo="Nenhum pedido em preparo" texto="Os pedidos lançados nas mesas, comandas, balcão, delivery e QR Code aparecem aqui." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUNAS.map((col) => {
            const lista = grupos.filter((g) => g.status === col.s);
            return (
              <section key={col.s} className="min-w-0">
                <h2 className="mb-2 flex items-center gap-2 text-[14px] font-extrabold">
                  <span className={clsx("h-2.5 w-2.5 rounded-full", col.cor)} /> {col.r}
                  <span className="num rounded-full bg-secundario px-2 text-[12px]">{lista.length}</span>
                </h2>
                <div className="grid gap-3">
                  {lista.map((g) => {
                    const min = minutosDesde(g.desde, agora);
                    const faixa = faixaEspera(min);
                    return (
                      <article key={g.chave} className="overflow-hidden rounded-[18px] bg-card shadow-card">
                        <header className="flex items-center gap-2 px-3 py-2" style={{ background: `${faixa.cor}1F` }}>
                          {g.setor === "bar" ? <Wine size={16} /> : <Flame size={16} />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14.5px] font-extrabold">
                              {nomeConta(g.conta, mesas)}
                              {g.conta.clienteNome && g.conta.canal !== "mesa" ? ` · ${g.conta.clienteNome}` : ""}
                            </p>
                            <p className="text-[11.5px] text-mudo">
                              Pedido {g.pedido}
                              {g.itens[0].atendenteId === "qrcode" && " · pelo QR Code"}
                              {g.itens[0].atendenteId === "online" && " · cardápio online"}
                              {g.conta.paraViagem && " · para viagem"}
                            </p>
                          </div>
                          <span className="num rounded-full px-2 py-0.5 text-[12px] font-extrabold text-white" style={{ background: faixa.cor }}>
                            {min} min
                          </span>
                        </header>
                        <ul className="px-3 py-2">
                          {g.itens.map((i) => (
                            <li key={i.id} className={clsx("flex gap-2 py-1 text-[15px]", ORDEM.indexOf(i.preparo) > ORDEM.indexOf(g.status) && "text-mudo line-through")}>
                              <span className="num w-8 font-extrabold">{i.qtd}×</span>
                              <span className="flex-1 font-semibold">
                                {i.nome}
                                {i.obs && <span className="block text-[12.5px] font-bold text-acao">⚠ {i.obs}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <footer className="flex gap-2 px-3 pb-3">
                          <button
                            onClick={() => imprimir({ tipo: "preparo", conta: g.conta, pedidoNumero: g.pedido, setor: g.setor })}
                            className="grid h-11 w-11 place-items-center rounded-full bg-secundario text-mudo"
                            aria-label="Imprimir"
                            title="Imprimir"
                          >
                            <Printer size={17} />
                          </button>
                          <button
                            onClick={() => avancar(g, col.prox)}
                            className={clsx("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full font-bold text-white", col.s === "pronto" ? "bg-ok" : "bg-acao shadow-botao")}
                          >
                            {col.s === "pronto" ? <CheckCheck size={18} /> : col.s === "preparo" ? <Bell size={18} /> : <Flame size={18} />}
                            {col.acao}
                          </button>
                        </footer>
                      </article>
                    );
                  })}
                  {!lista.length && <p className="rounded-[18px] border-[1.5px] border-dashed border-linha p-4 text-center text-[13px] text-mudo">Vazio</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function bip() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {}
}
