"use client";

import clsx from "clsx";
import { Bell, BellOff, CheckCheck, ChefHat, Flame, Maximize2, Minimize2, Printer, Undo2, Wine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { imprimir } from "@/components/impressao";
import { Titulo, useDoisCliques, useRelogio, Vazio } from "@/components/ui";
import { StatusSincronizacao } from "@/components/shell/casca-cozinha";
import { faixaEspera, minutosDesde } from "@/lib/dominio/calculos";
import { gruposPreparo, ORDEM_PREPARO, type GrupoPreparo } from "@/lib/dominio/cozinha";
import { nomeConta } from "@/lib/dominio/rotulos";
import type { Setor, StatusPreparo } from "@/lib/dominio/tipos";
import { mudarPreparo } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";
import { liberarSom, somLiberado, tocar } from "@/lib/som";

type Coluna = { s: StatusPreparo; rotulo: string; cor: string; vazio: string };
const COLUNAS: Coluna[] = [
  { s: "pendente", rotulo: "Novos", cor: "bg-st-novo", vazio: "Nenhum pedido novo" },
  { s: "preparo", rotulo: "Em produção", cor: "bg-st-preparo", vazio: "Nada em produção" },
  { s: "pronto", rotulo: "Prontos", cor: "bg-st-pronto", vazio: "Nada esperando o garçom" },
];
const CHAVE_SETOR = "carlos:cozinha-setor";
/** Por quanto tempo o cartão recém-chegado fica piscando */
const DESTAQUE_MS = 20_000;

/**
 * Painel da cozinha e do bar (KDS), pensado para um tablet na parede: cada
 * "Enviar" das mesas, comandas, balcão e delivery vira um cartão. A cozinha
 * passa o cartão de "Novos" para "Em produção" e depois para "Pronto", e o
 * salão e o app do garçom recebem o aviso de que está pronto para levar.
 */
export default function CozinhaPage() {
  const contas = useLoja((e) => e.contas);
  const mesas = useLoja((e) => e.mesas);
  const agora = useRelogio(15000);
  const [setor, setSetorBruto] = useState<Setor | "todos">("todos");
  const [som, setSom] = useState(true);
  const [telaCheia, setTelaCheia] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_SETOR) as Setor | "todos" | null;
      if (salvo) setSetorBruto(salvo);
    } catch {}
  }, []);
  const setSetor = (s: Setor | "todos") => {
    setSetorBruto(s);
    try {
      localStorage.setItem(CHAVE_SETOR, s);
    } catch {}
  };

  const grupos = useMemo(() => gruposPreparo(contas, agora, setor), [contas, agora, setor]);
  const porColuna = useMemo(() => Object.fromEntries(COLUNAS.map((c) => [c.s, grupos.filter((g) => g.status === c.s)])) as Record<StatusPreparo, GrupoPreparo[]>, [grupos]);

  // Pedido novo: toca o aviso e destaca o cartão por alguns segundos
  const vistos = useRef<Set<string> | null>(null);
  const [chegadas, setChegadas] = useState<Record<string, number>>({});
  useEffect(() => {
    const fila = grupos.filter((g) => g.status === "pendente").map((g) => g.chave);
    if (vistos.current) {
      const novos = fila.filter((k) => !vistos.current!.has(k));
      if (novos.length) {
        if (som) tocar("novo");
        const t = Date.now();
        setChegadas((c) => ({ ...c, ...Object.fromEntries(novos.map((k) => [k, t])) }));
      }
    }
    vistos.current = new Set(fila);
  }, [grupos, som]);

  // O tablet só libera som depois de um toque; o primeiro toque em qualquer lugar já libera
  const [somPronto, setSomPronto] = useState(true);
  useEffect(() => {
    setSomPronto(somLiberado());
    const liberar = () => {
      liberarSom();
      setTimeout(() => setSomPronto(somLiberado()), 50);
    };
    window.addEventListener("pointerdown", liberar);
    return () => window.removeEventListener("pointerdown", liberar);
  }, []);

  // Tela sempre acesa enquanto o painel está aberto (quando o tablet permite)
  useEffect(() => {
    let trava: { release: () => Promise<void> } | null = null;
    const pedir = async () => {
      try {
        trava = await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
      } catch {}
    };
    void pedir();
    const aoVoltar = () => document.visibilityState === "visible" && void pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    const aoTrocarTela = () => setTelaCheia(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", aoTrocarTela);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      document.removeEventListener("fullscreenchange", aoTrocarTela);
      void trava?.release().catch(() => {});
    };
  }, []);

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const avancar = (g: GrupoPreparo, prox: StatusPreparo) =>
    mudarPreparo(
      g.conta.id,
      g.itens.filter((i) => ORDEM_PREPARO.indexOf(i.preparo) < ORDEM_PREPARO.indexOf(prox)).map((i) => i.id),
      prox,
    );
  const voltar = (g: GrupoPreparo, para: StatusPreparo) =>
    mudarPreparo(
      g.conta.id,
      g.itens.map((i) => i.id),
      para,
    );

  return (
    <div className="mx-auto max-w-[1800px]">
      <Titulo
        sub={
          <>
            <span className="num">{porColuna.pendente.length}</span> novos · <span className="num">{porColuna.preparo.length}</span> em produção · <span className="num">{porColuna.pronto.length}</span> prontos
          </>
        }
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <StatusSincronizacao />
            <div className="flex rounded-full bg-card p-1 shadow-card">
              {(
                [
                  ["todos", "Tudo", null],
                  ["cozinha", "Cozinha", ChefHat],
                  ["bar", "Bar", Wine],
                ] as const
              ).map(([v, r, I]) => (
                <button key={v} onClick={() => setSetor(v)} className={clsx("flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold", setor === v ? "bg-acao text-white" : "text-mudo")}>
                  {I && <I size={16} />} {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSom((s) => !s)}
              className={clsx("grid h-12 w-12 place-items-center rounded-full shadow-card", som ? "bg-card text-acao" : "bg-secundario text-mudo")}
              aria-label={som ? "Desligar som" : "Ligar som"}
              title={som ? "Som ligado" : "Som desligado"}
            >
              {som ? <Bell size={19} /> : <BellOff size={19} />}
            </button>
            <button onClick={alternarTelaCheia} className="grid h-12 w-12 place-items-center rounded-full bg-card text-mudo shadow-card" aria-label="Tela cheia" title="Tela cheia">
              {telaCheia ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
            </button>
          </div>
        }
      >
        Cozinha
      </Titulo>

      {som && !somPronto && (
        <button onClick={() => liberarSom()} className="mb-3 flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#FDF0D6] px-4 py-3 text-[14px] font-bold text-[#8A5A00]">
          <Bell size={18} /> Toque aqui para ligar o som dos pedidos novos
        </button>
      )}

      {!grupos.length ? (
        <Vazio icone={ChefHat} titulo="Nenhum pedido agora" texto="Os pedidos lançados nas mesas, comandas, balcão e delivery aparecem aqui na hora, com aviso sonoro." />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUNAS.map((col) => {
            const lista = porColuna[col.s];
            return (
              <section key={col.s} className="min-w-0">
                <h2 className="mb-2 flex items-center gap-2 text-[16px] font-extrabold">
                  <span className={clsx("h-3 w-3 rounded-full", col.cor)} /> {col.rotulo}
                  <span className="num rounded-full bg-secundario px-2.5 text-[13px]">{lista.length}</span>
                </h2>
                <div className="grid gap-3">
                  {lista.map((g) => (
                    <CartaoPedido
                      key={g.chave}
                      g={g}
                      nome={nomeConta(g.conta, mesas)}
                      agora={agora}
                      novo={Boolean(chegadas[g.chave] && Date.now() - chegadas[g.chave] < DESTAQUE_MS)}
                      avancar={(p) => avancar(g, p)}
                      voltar={(p) => voltar(g, p)}
                    />
                  ))}
                  {!lista.length && <p className="rounded-[18px] border-[1.5px] border-dashed border-linha p-5 text-center text-[13.5px] text-mudo">{col.vazio}</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CartaoPedido({
  g,
  nome,
  agora,
  novo,
  avancar,
  voltar,
}: {
  g: GrupoPreparo;
  nome: string;
  agora: number;
  novo: boolean;
  avancar: (prox: StatusPreparo) => void;
  voltar: (para: StatusPreparo) => void;
}) {
  const min = minutosDesde(g.desde, agora);
  const faixa = faixaEspera(min);
  const [rotulo, prox, Icone] =
    g.status === "pendente"
      ? (["Começar produção", "preparo", Flame] as const)
      : g.status === "preparo"
        ? (["Pronto: avisar salão", "pronto", Bell] as const)
        : (["Entregue", "entregue", CheckCheck] as const);
  const principal = useDoisCliques(() => avancar(prox));
  const desfazer = useDoisCliques(() => voltar(g.status === "pronto" ? "preparo" : "pendente"));
  const origem = g.itens[0].atendenteId === "qrcode" ? "pelo QR Code" : g.itens[0].atendenteId === "online" ? "cardápio online" : g.conta.paraViagem ? "para viagem" : null;

  return (
    <article className={clsx("overflow-hidden rounded-[18px] bg-card shadow-card", novo && "animate-pulse ring-[3px] ring-st-novo", g.status === "pronto" && "opacity-90")}>
      <header className="flex items-center gap-2 px-3.5 py-2.5" style={{ background: `${faixa.cor}1F` }}>
        {g.setor === "bar" ? <Wine size={18} /> : <Flame size={18} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold leading-tight">
            {nome}
            {g.conta.clienteNome && g.conta.canal !== "mesa" ? ` · ${g.conta.clienteNome}` : ""}
          </p>
          <p className="text-[12px] text-mudo">
            Pedido <span className="num">{g.pedido}</span>
            {origem && ` · ${origem}`}
            {g.status === "pronto" && g.prontoEm && ` · pronto há ${minutosDesde(g.prontoEm, agora)} min`}
          </p>
        </div>
        <span className="num rounded-full px-2.5 py-1 text-[13px] font-extrabold text-white" style={{ background: faixa.cor }}>
          {min} min
        </span>
      </header>
      <ul className="px-3.5 py-2">
        {g.itens.map((i) => (
          <li key={i.id} className={clsx("flex gap-2 py-1 text-[17px] leading-snug", ORDEM_PREPARO.indexOf(i.preparo) > ORDEM_PREPARO.indexOf(g.status) && "text-mudo line-through")}>
            <span className="num w-9 shrink-0 font-extrabold">{i.qtd}×</span>
            <span className="flex-1 font-semibold">
              {i.nome}
              {i.obs && <span className="mt-0.5 block rounded-lg bg-rosado px-2 py-0.5 text-[14px] font-bold text-acao">⚠ {i.obs}</span>}
            </span>
          </li>
        ))}
      </ul>
      <footer className="flex gap-2 px-3.5 pb-3.5">
        {g.status === "pendente" ? (
          <button
            onClick={() => imprimir({ tipo: "preparo", conta: g.conta, pedidoNumero: g.pedido, setor: g.setor })}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secundario text-mudo"
            aria-label="Imprimir"
            title="Imprimir"
          >
            <Printer size={18} />
          </button>
        ) : (
          <button
            onClick={desfazer.clicar}
            onBlur={desfazer.desarmar}
            className={clsx("flex h-12 shrink-0 items-center justify-center gap-1 rounded-full text-[12.5px] font-bold", desfazer.armado ? "bg-rosado px-3 text-acao ring-2 ring-acao" : "w-12 bg-secundario text-mudo")}
            aria-label="Voltar uma etapa"
            title="Voltar uma etapa"
          >
            <Undo2 size={18} />
            {desfazer.armado && "Voltar?"}
          </button>
        )}
        <button
          onClick={principal.clicar}
          onBlur={principal.desarmar}
          className={clsx(
            "flex min-h-12 flex-1 touch-manipulation select-none items-center justify-center gap-2 rounded-full text-[15px] font-bold",
            principal.armado ? "bg-rosado text-acao ring-2 ring-acao" : g.status === "pronto" ? "bg-secundario text-tinta" : g.status === "preparo" ? "bg-st-pronto text-white" : "bg-acao text-white shadow-botao",
          )}
        >
          <Icone size={19} />
          {principal.armado ? "Toque de novo" : rotulo}
        </button>
      </footer>
    </article>
  );
}
