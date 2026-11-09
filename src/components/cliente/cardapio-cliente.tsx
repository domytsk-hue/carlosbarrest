"use client";

import clsx from "clsx";
import Image from "next/image";
import { Minus, Plus, Search, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { brl } from "@/lib/dominio/calculos";
import type { Produto } from "@/lib/dominio/tipos";
import { useLoja } from "@/lib/loja/loja";

export type LinhaCarrinho = { produtoId: string; qtd: number; obs?: string };

/** Cabeçalho das páginas do cliente (cardápio da mesa e delivery). */
export function CabecalhoCliente({ titulo, sub, direita }: { titulo: React.ReactNode; sub?: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-linha bg-fundo/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[720px] items-center gap-3">
        <Image src="/logo.svg" alt="Carlo's Bar & Restaurante" width={84} height={56} priority className="logo-marca h-auto w-[84px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-slab text-[17px] font-extrabold text-marca">{titulo}</p>
          {sub && <p className="truncate text-[12px] text-mudo">{sub}</p>}
        </div>
        {direita}
      </div>
    </header>
  );
}

/** Preço do produto no canal: o delivery pode ter preço próprio. */
export const precoNoCanal = (p: Produto, delivery: boolean) => (delivery ? (p.precoDelivery ?? p.preco) : p.preco);

/**
 * Cardápio para o cliente: categorias com ícone, busca, foto, descrição e
 * carrinho com observação por item. Usado no QR Code da mesa e no delivery.
 */
export function CardapioCliente({
  delivery,
  carrinho,
  setCarrinho,
  somenteConsulta,
}: {
  delivery: boolean;
  carrinho: LinhaCarrinho[];
  setCarrinho: (fn: (c: LinhaCarrinho[]) => LinhaCarrinho[]) => void;
  somenteConsulta?: boolean;
}) {
  const categorias = useLoja((e) => e.categorias);
  const todos = useLoja((e) => e.produtos);
  const produtos = useMemo(() => todos.filter((p) => p.ativo && (!delivery || p.noDelivery)), [todos, delivery]);
  const cats = useMemo(() => categorias.filter((c) => produtos.some((p) => p.categoriaId === c.id)), [categorias, produtos]);
  const [busca, setBusca] = useState("");
  const [ativa, setAtiva] = useState<string | undefined>();
  const [detalhe, setDetalhe] = useState<Produto | null>(null);
  const secoes = useRef<Record<string, HTMLElement | null>>({});

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  const q = norm(busca.trim());
  const filtrados = q ? produtos.filter((p) => norm(p.nome).includes(q) || norm(p.descricao ?? "").includes(q)) : produtos;

  useEffect(() => {
    if (!ativa && cats[0]) setAtiva(cats[0].id);
  }, [cats, ativa]);

  const qtdDe = (id: string) => carrinho.filter((l) => l.produtoId === id).reduce((s, l) => s + l.qtd, 0);
  const somar = (p: Produto, d: number, obs?: string) =>
    setCarrinho((c) => {
      const ex = c.find((l) => l.produtoId === p.id && (l.obs ?? "") === (obs ?? ""));
      if (ex) return c.map((l) => (l === ex ? { ...l, qtd: l.qtd + d } : l)).filter((l) => l.qtd > 0);
      return d > 0 ? [...c, { produtoId: p.id, qtd: d, obs }] : c;
    });

  return (
    <div>
      <div className="sticky top-[81px] z-20 -mx-4 bg-fundo/95 px-4 pb-2 pt-1 backdrop-blur">
        <label className="flex items-center gap-2 rounded-full border border-linha bg-card px-4 py-2.5">
          <Search size={17} className="text-mudo" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no cardápio" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
          {busca && (
            <button onClick={() => setBusca("")} aria-label="Limpar busca">
              <X size={16} className="text-mudo" />
            </button>
          )}
        </label>
        {!q && (
          <nav className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setAtiva(c.id);
                  const el = secoes.current[c.id];
                  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: "smooth" });
                }}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold",
                  ativa === c.id ? "bg-acao text-white" : "bg-card text-tinta shadow-card",
                )}
              >
                {c.icone && <Image src={c.icone} alt="" width={20} height={20} className="h-5 w-5" />}
                {c.nome}
              </button>
            ))}
          </nav>
        )}
      </div>

      {(q ? [{ id: "busca", nome: `Resultados para "${busca}"` }] : cats).map((c) => {
        const lista = q ? filtrados : filtrados.filter((p) => p.categoriaId === c.id);
        if (!lista.length) return null;
        return (
          <section key={c.id} ref={(el) => void (secoes.current[c.id] = el)} className="mt-4">
            <h2 className="mb-2 font-slab text-[18px] font-extrabold text-marca">{c.nome}</h2>
            <div className="grid gap-2.5">
              {lista.map((p) => {
                const n = qtdDe(p.id);
                return (
                  <article key={p.id} className="flex gap-3 rounded-[18px] bg-card p-2.5 shadow-card">
                    <button onClick={() => setDetalhe(p)} className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[14px] bg-rosado">
                      {p.foto ? (
                        <Image src={p.foto} alt={p.nome} fill sizes="84px" className="object-cover" />
                      ) : (
                        <UtensilsCrossed className="absolute inset-0 m-auto text-acao/50" size={28} />
                      )}
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <button onClick={() => setDetalhe(p)} className="text-left">
                        <p className="text-[14px] font-bold leading-tight">{p.nome}</p>
                        {p.descricao && <p className="mt-0.5 line-clamp-2 text-[12px] text-mudo">{p.descricao}</p>}
                      </button>
                      <div className="mt-auto flex items-center justify-between pt-1">
                        <span className="num text-[15px] font-extrabold text-marca">{brl(precoNoCanal(p, delivery))}</span>
                        {!somenteConsulta &&
                          (n ? (
                            <div className="flex items-center gap-1 rounded-full bg-rosado p-0.5">
                              <button aria-label="Menos" onClick={() => somar(p, -1)} className="grid h-8 w-8 place-items-center rounded-full bg-card text-acao">
                                <Minus size={16} />
                              </button>
                              <span className="num w-6 text-center text-[14px] font-bold">{n}</span>
                              <button aria-label="Mais" onClick={() => somar(p, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-acao text-white">
                                <Plus size={16} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => somar(p, 1)} className="flex items-center gap-1 rounded-full bg-acao px-3 py-1.5 text-[12.5px] font-bold text-white shadow-botao">
                              <Plus size={15} /> Adicionar
                            </button>
                          ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
      {!filtrados.length && <p className="py-10 text-center text-[14px] text-mudo">Nada encontrado no cardápio.</p>}

      {detalhe && <DetalheProduto produto={detalhe} delivery={delivery} somenteConsulta={somenteConsulta} aoFechar={() => setDetalhe(null)} aoAdicionar={(qtd, obs) => (somar(detalhe, qtd, obs || undefined), setDetalhe(null))} />}
    </div>
  );
}

function DetalheProduto({
  produto: p,
  delivery,
  somenteConsulta,
  aoFechar,
  aoAdicionar,
}: {
  produto: Produto;
  delivery: boolean;
  somenteConsulta?: boolean;
  aoFechar: () => void;
  aoAdicionar: (qtd: number, obs: string) => void;
}) {
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(40,15,8,.5)] sm:items-center" onMouseDown={aoFechar}>
      <div className="w-full max-w-[520px] overflow-hidden rounded-t-[26px] bg-card sm:rounded-[26px]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="relative aspect-[16/10] bg-rosado">
          {p.foto && <Image src={p.foto} alt={p.nome} fill sizes="520px" className="object-cover" />}
          <button onClick={aoFechar} aria-label="Fechar" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <h3 className="font-slab text-[20px] font-extrabold text-marca">{p.nome}</h3>
          {p.descricao && <p className="mt-1 text-[13.5px] text-mudo">{p.descricao}</p>}
          <p className="num mt-2 text-[18px] font-extrabold">{brl(precoNoCanal(p, delivery))}</p>
          {!somenteConsulta && (
            <>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Alguma observação? Ex.: sem cebola, bem passado"
                rows={2}
                className="mt-3 w-full rounded-2xl border border-linha bg-fundo px-3 py-2 text-[14px] outline-none focus:border-acao"
              />
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-full bg-rosado p-1">
                  <button aria-label="Menos" onClick={() => setQtd((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center rounded-full bg-card text-acao">
                    <Minus size={18} />
                  </button>
                  <span className="num w-8 text-center text-[16px] font-bold">{qtd}</span>
                  <button aria-label="Mais" onClick={() => setQtd((q) => q + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-acao text-white">
                    <Plus size={18} />
                  </button>
                </div>
                <button onClick={() => aoAdicionar(qtd, obs.trim())} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-acao font-bold text-white shadow-botao">
                  Adicionar <span className="num">{brl(precoNoCanal(p, delivery) * qtd)}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Barra fixa do carrinho no rodapé. */
export function BarraCarrinho({ qtd, valor, rotulo, onClick }: { qtd: number; valor: number; rotulo: string; onClick: () => void }) {
  if (!qtd) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <button onClick={onClick} className="mx-auto flex min-h-14 w-full max-w-[720px] items-center gap-3 rounded-full bg-acao px-5 font-bold text-white shadow-botao">
        <span className="relative">
          <ShoppingBag size={22} />
          <span className="num absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ouro px-1 text-[11px] text-tinta">{qtd}</span>
        </span>
        <span className="flex-1 text-left">{rotulo}</span>
        <span className="num">{brl(valor)}</span>
      </button>
    </div>
  );
}

/** Lista editável do carrinho. */
export function ListaCarrinho({ carrinho, setCarrinho, delivery }: { carrinho: LinhaCarrinho[]; setCarrinho: (fn: (c: LinhaCarrinho[]) => LinhaCarrinho[]) => void; delivery: boolean }) {
  const produtos = useLoja((e) => e.produtos);
  return (
    <ul className="divide-y divide-linha">
      {carrinho.map((l, k) => {
        const p = produtos.find((x) => x.id === l.produtoId);
        if (!p) return null;
        const mudar = (d: number) => setCarrinho((c) => c.map((x, j) => (j === k ? { ...x, qtd: x.qtd + d } : x)).filter((x) => x.qtd > 0));
        return (
          <li key={k} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold leading-tight">{p.nome}</p>
              {l.obs && <p className="text-[12px] text-mudo">Obs.: {l.obs}</p>}
              <p className="num text-[12.5px] text-mudo">{brl(precoNoCanal(p, delivery) * l.qtd)}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-rosado p-0.5">
              <button aria-label="Menos" onClick={() => mudar(-1)} className="grid h-8 w-8 place-items-center rounded-full bg-card text-acao">
                <Minus size={15} />
              </button>
              <span className="num w-6 text-center text-[14px] font-bold">{l.qtd}</span>
              <button aria-label="Mais" onClick={() => mudar(1)} className="grid h-8 w-8 place-items-center rounded-full bg-acao text-white">
                <Plus size={15} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function somaCarrinho(carrinho: LinhaCarrinho[], produtos: Produto[], delivery: boolean) {
  return carrinho.reduce((s, l) => {
    const p = produtos.find((x) => x.id === l.produtoId);
    return s + (p ? precoNoCanal(p, delivery) * l.qtd : 0);
  }, 0);
}
