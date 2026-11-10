"use client";

import clsx from "clsx";
import Image from "next/image";
import { MessageSquareText, Minus, Plus, Scale, Search, Send, Trash2, UtensilsCrossed } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { brl } from "@/lib/dominio/calculos";
import type { Produto } from "@/lib/dominio/tipos";
import { lancarItens, type ItemNovo } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";
import { balancaDisponivel, lerPeso } from "@/lib/integracoes/balanca";
import { Botao, EntradaValor, JANELA_DOIS_CLIQUES, Modal, Selecao, useDoisCliques } from "../ui";

type Linha = ItemNovo & { chave: string };

/** Um clique adiciona o produto (Dom, 10/11/2026). Ligar aqui se voltar a pedir dois. */
const DOIS_CLIQUES_PRODUTO = false;

/**
 * Tela de lançamento de pedido, usada em mesas, comandas, balcão, PDV,
 * entregas e no app do garçom: categorias, busca, quantidade, observação,
 * atendente e "Enviar", que gera um número de pedido de preparo.
 */
export function Lancador({
  contaId,
  titulo,
  totalAtual,
  aoEnviar,
  compacto,
  rotuloEnviar = "Enviar",
}: {
  contaId: string;
  titulo: React.ReactNode;
  totalAtual?: number;
  aoEnviar?: (numeroPedido: number) => void;
  compacto?: boolean;
  rotuloEnviar?: string;
}) {
  const categorias = useLoja((e) => e.categorias);
  const produtos = useLoja((e) => e.produtos);
  const funcionarios = useLoja((e) => e.funcionarios);
  const usuarioId = useLoja((e) => e.usuarioId);
  const [cat, setCat] = useState<string | null>(categorias[0]?.id ?? null);
  const [busca, setBusca] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [obsAberta, setObsAberta] = useState<string | null>(null);
  const [atendente, setAtendente] = useState(usuarioId);

  const visiveis = useMemo(() => {
    const q = busca
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    return produtos.filter((p) => {
      if (!p.ativo) return false;
      if (q) {
        const n = p.nome.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
        return n.includes(q) || p.codigo === q;
      }
      return p.categoriaId === cat;
    });
  }, [produtos, busca, cat]);

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const somaNova = linhas.reduce((s, l) => s + (porId.get(l.produtoId)?.preco ?? 0) * l.qtd, 0);

  const [pesando, setPesando] = useState<Produto | null>(null);
  const [peso, setPeso] = useState(0);
  const [msgBalanca, setMsgBalanca] = useState("");

  // Com DOIS_CLIQUES_PRODUTO ligado, o primeiro clique marca o produto e o segundo (até 2,5 s) adiciona.
  const [armado, setArmado] = useState<string | null>(null);
  const timerArmado = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timerArmado.current), []);
  function tocarProduto(p: Produto) {
    if (!DOIS_CLIQUES_PRODUTO) return adicionar(p);
    clearTimeout(timerArmado.current);
    if (armado === p.id) {
      setArmado(null);
      return adicionar(p);
    }
    setArmado(p.id);
    timerArmado.current = setTimeout(() => setArmado(null), JANELA_DOIS_CLIQUES);
  }

  function adicionar(p: Produto) {
    if (p.porKg) {
      setPeso(0);
      setMsgBalanca("");
      return setPesando(p);
    }
    setLinhas((ls) => {
      const ex = ls.find((l) => l.produtoId === p.id && !l.obs);
      if (ex) return ls.map((l) => (l === ex ? { ...l, qtd: l.qtd + 1 } : l));
      return [...ls, { chave: Math.random().toString(36), produtoId: p.id, qtd: 1 }];
    });
  }

  function enviar() {
    if (!linhas.length) return;
    const n = lancarItens(
      contaId,
      linhas.map(({ produtoId, qtd, obs }) => ({ produtoId, qtd, obs })),
      atendente,
    );
    setLinhas([]);
    aoEnviar?.(n);
  }
  const botaoEnviar = useDoisCliques(enviar);

  async function lerBalanca() {
    setMsgBalanca("Lendo a balança…");
    try {
      const kg = await lerPeso();
      setPeso(kg);
      setMsgBalanca("");
    } catch (e) {
      setMsgBalanca((e as Error).message || "Não foi possível ler a balança");
    }
  }

  const modalPeso = (
    <Modal aberto={!!pesando} aoFechar={() => setPesando(null)} titulo={`Peso · ${pesando?.nome ?? ""}`} largura="sm">
      {pesando && (
        <div className="grid gap-3">
          <p className="text-[13px] text-mudo">
            {brl(pesando.preco)} o quilo. Digite o peso ou leia da balança.
          </p>
          <EntradaValor key={peso} valor={peso} aoMudar={setPeso} placeholder="kg (ex.: 0,450)" autoFocus className="text-center text-[22px] font-bold" />
          {balancaDisponivel() && (
            <Botao variante="secundario" onClick={lerBalanca}>
              <Scale size={17} /> Ler da balança
            </Botao>
          )}
          {msgBalanca && <p className="text-center text-[12.5px] font-semibold text-mudo">{msgBalanca}</p>}
          <div className="flex items-center justify-between rounded-2xl bg-fundo p-3">
            <span className="text-[13px] text-mudo">Valor</span>
            <span className="num text-[20px] font-extrabold">{brl(Math.round(pesando.preco * peso * 100) / 100)}</span>
          </div>
          <Botao
            disabled={peso <= 0}
            onClick={() => {
              setLinhas((ls) => [...ls, { chave: Math.random().toString(36), produtoId: pesando.id, qtd: Math.round(peso * 1000) / 1000 }]);
              setPesando(null);
            }}
          >
            Adicionar
          </Botao>
        </div>
      )}
    </Modal>
  );

  return (
    <div className={clsx("grid gap-3", compacto ? "grid-cols-1" : "lg:grid-cols-[92px_1fr_340px]")}>
      {/* Categorias */}
      <div className={clsx("flex gap-2 overflow-x-auto [scrollbar-width:none]", !compacto && "lg:max-h-[68dvh] lg:flex-col lg:overflow-y-auto")}>
        {categorias.map((c) => {
          const on = c.id === cat && !busca;
          return (
            <button
              key={c.id}
              onClick={() => {
                setCat(c.id);
                setBusca("");
              }}
              className="flex min-w-[78px] flex-col items-center gap-1 rounded-2xl p-1.5 text-[11.5px] font-medium"
            >
              <span className={clsx("flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-icone-fundo", on && "bg-rosado-forte ring-2 ring-inset ring-[#E8A895]")}>
                {c.icone ? <Image src={c.icone} alt="" width={48} height={48} /> : <UtensilsCrossed size={22} />}
              </span>
              <span className={clsx("whitespace-nowrap", on && "font-bold text-acao")}>{c.nome}</span>
            </button>
          );
        })}
      </div>

      {/* Produtos */}
      <div className="min-w-0">
        <label className="mb-3 flex items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-card">
          <Search size={18} className="text-mudo" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-mudo"
            autoFocus={!compacto}
          />
        </label>
        <div className={clsx("grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4", !compacto && "lg:max-h-[60dvh] lg:overflow-y-auto lg:pr-1")}>
          {visiveis.map((p) => {
            const qtd = linhas.filter((l) => l.produtoId === p.id).reduce((s, l) => s + l.qtd, 0);
            const marcado = armado === p.id;
            return (
              <button
                key={p.id}
                onClick={() => tocarProduto(p)}
                title={DOIS_CLIQUES_PRODUTO ? `${p.nome} · dois cliques para adicionar` : p.nome}
                aria-label={marcado ? `${p.nome}: clique de novo para adicionar` : p.nome}
                className={clsx(
                  "relative flex touch-manipulation select-none flex-col rounded-[18px] p-1.5 pb-2.5 text-left shadow-card transition-transform active:scale-[.98]",
                  marcado ? "bg-rosado ring-2 ring-acao" : "bg-card",
                  qtd > 0 && "ring-2 ring-acao",
                )}
              >
                {marcado && (
                  <span className="absolute inset-x-1.5 top-1.5 z-10 rounded-t-[13px] bg-acao py-1 text-center text-[11.5px] font-bold text-white">
                    <span className="lg:hidden">Toque de novo</span>
                    <span className="hidden lg:inline">Clique de novo</span>
                  </span>
                )}
                {p.foto ? (
                  <Image src={p.foto} alt="" width={200} height={200} className="aspect-[4/3] w-full rounded-[13px] bg-white object-cover" />
                ) : (
                  <span className="flex aspect-[4/3] w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-[#F3E6D8] to-[#EAD6C2] text-[#B07A5E]">
                    <UtensilsCrossed size={26} />
                  </span>
                )}
                <span className="mx-1 mt-2 line-clamp-2 flex-1 text-[12.5px] font-semibold leading-tight">{p.nome}</span>
                <span className="num mx-1 mt-1 text-[13px] font-bold">{brl(p.preco)}</span>
                {qtd > 0 && <span className="absolute right-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-acao px-1.5 text-[12px] font-bold text-white">{qtd}</span>}
              </button>
            );
          })}
          {!visiveis.length && <p className="col-span-full py-8 text-center text-[13px] text-mudo">Nenhum produto encontrado.</p>}
        </div>
      </div>

      {/* Pedido em montagem */}
      <div className="flex flex-col rounded-[20px] bg-card p-4 shadow-card lg:max-h-[68dvh]">
        <div className="mb-2 text-[15px] font-bold">{titulo}</div>
        <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-mudo">Produtos do pedido</p>
        <ul className="flex-1 divide-y divide-linha overflow-y-auto">
          {linhas.map((l) => {
            const p = porId.get(l.produtoId)!;
            return (
              <li key={l.chave} className="py-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[13px] font-medium leading-tight">{p.nome}</span>
                  <span className="num text-[13px] font-semibold">{brl(p.preco * l.qtd)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <button aria-label="Menos" onClick={() => setLinhas((ls) => ls.map((x) => (x === l && !p.porKg ? { ...x, qtd: Math.max(1, x.qtd - 1) } : x)))} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4E1D8] text-[#9E1B1E]">
                    <Minus size={14} />
                  </button>
                  <span className="num min-w-6 text-center text-[14px] font-bold">{p.porKg ? `${l.qtd.toLocaleString("pt-BR")} kg` : l.qtd}</span>
                  <button aria-label="Mais" onClick={() => setLinhas((ls) => ls.map((x) => (x === l && !p.porKg ? { ...x, qtd: x.qtd + 1 } : x)))} className="flex h-7 w-7 items-center justify-center rounded-full bg-acao text-white">
                    <Plus size={14} />
                  </button>
                  <button onClick={() => setObsAberta(obsAberta === l.chave ? null : l.chave)} className={clsx("ml-auto flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold", l.obs ? "bg-[#FDF0D6] text-[#8A5A00]" : "text-mudo")}>
                    <MessageSquareText size={14} /> Obs.
                  </button>
                  <button aria-label="Remover" onClick={() => setLinhas((ls) => ls.filter((x) => x !== l))} className="flex h-7 w-7 items-center justify-center rounded-full text-mudo hover:text-st-cancelado">
                    <Trash2 size={14} />
                  </button>
                </div>
                {(obsAberta === l.chave || l.obs) && (
                  <input
                    autoFocus={obsAberta === l.chave}
                    value={l.obs ?? ""}
                    onChange={(e) => setLinhas((ls) => ls.map((x) => (x === l ? { ...x, obs: e.target.value } : x)))}
                    placeholder="Ex.: sem cebola, bem passada"
                    className="mt-1.5 w-full rounded-lg border border-linha bg-fundo px-2 py-1.5 text-[12.5px] outline-none focus:border-acao"
                  />
                )}
              </li>
            );
          })}
          {!linhas.length && <li className="py-6 text-center text-[12.5px] text-mudo">Toque nos produtos para adicionar.</li>}
        </ul>
        <div className="mt-3 space-y-1 border-t border-linha pt-3 text-[13px]">
          <div className="flex justify-between">
            <span className="text-mudo">Novos itens</span>
            <span className="num font-semibold">{brl(somaNova)}</span>
          </div>
          {totalAtual !== undefined && (
            <div className="flex justify-between text-[17px] font-extrabold">
              <span>Total</span>
              <span className="num">{brl(totalAtual + somaNova)}</span>
            </div>
          )}
        </div>
        <label className="mt-3 block text-[12px] font-semibold">
          Atendente
          <Selecao value={atendente} onChange={(e) => setAtendente(e.target.value)} className="mt-1 py-2">
            {funcionarios
              .filter((f) => f.ativo)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
          </Selecao>
        </label>
        <Botao
          variante={botaoEnviar.armado ? "primario" : "ok"}
          tamanho="lg"
          className="mt-3 w-full touch-manipulation"
          disabled={!linhas.length}
          onClick={botaoEnviar.clicar}
          onBlur={botaoEnviar.desarmar}
        >
          <Send size={18} />{" "}
          {botaoEnviar.armado ? (
            <>
              <span className="lg:hidden">Toque de novo para enviar</span>
              <span className="hidden lg:inline">Clique de novo para enviar</span>
            </>
          ) : (
            rotuloEnviar
          )}
        </Botao>
      </div>
      {modalPeso}
    </div>
  );
}
