"use client";

import { ChevronRight, LifeBuoy, Lightbulb, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Botao, Cartao, Entrada, Titulo } from "@/components/ui";
import { ARTIGOS, type Artigo } from "@/lib/ajuda/conteudo";
import { normalizar } from "@/lib/chatbot/bot";
import { moduloPorSlug } from "@/lib/modulos";

const SUPORTE = process.env.NEXT_PUBLIC_SUPORTE_URL;

export default function AjudaPage() {
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState<Artigo | null>(null);
  // Link direto para um artigo (ex.: vindo dos treinamentos)
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("artigo");
    if (id) setAberto(ARTIGOS.find((a) => a.id === id) ?? null);
  }, []);

  const lista = useMemo(() => {
    const termos = normalizar(q).split(" ").filter(Boolean);
    if (!termos.length) return ARTIGOS;
    return ARTIGOS.map((a) => {
      const alvo = normalizar([a.titulo, a.resumo, ...a.passos, a.dica ?? "", moduloPorSlug(a.modulo)?.rotulo ?? ""].join(" "));
      const titulo = normalizar(a.titulo);
      const pontos = termos.reduce((s, t) => s + (titulo.includes(t) ? 3 : 0) + (alvo.includes(t) ? 1 : 0), 0);
      return { a, pontos, todos: termos.every((t) => alvo.includes(t)) };
    })
      .filter((x) => x.todos)
      .sort((x, y) => y.pontos - x.pontos)
      .map((x) => x.a);
  }, [q]);

  return (
    <div className="mx-auto max-w-[1000px]">
      <Titulo sub="Passo a passo de cada tela do sistema">Central de ajuda</Titulo>
      <div className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mudo" />
        <Entrada className="pl-10" placeholder="Busque: fechar caixa, cupom, impressora, XML…" value={q} onChange={(e) => (setQ(e.target.value), setAberto(null))} autoFocus aria-label="Buscar na ajuda" />
      </div>

      {aberto ? (
        <Cartao>
          <button onClick={() => setAberto(null)} className="mb-2 text-[13px] font-semibold text-mudo hover:text-tinta">
            ← Todos os artigos
          </button>
          <h2 className="font-slab text-[20px] font-extrabold text-marca">{aberto.titulo}</h2>
          <p className="mt-1 text-[14px] text-mudo">{aberto.resumo}</p>
          <ol className="mt-4 space-y-3">
            {aberto.passos.map((p, i) => (
              <li key={i} className="flex gap-3 text-[14px]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rosado text-[13px] font-extrabold text-acao">{i + 1}</span>
                <span className="pt-0.5">{p}</span>
              </li>
            ))}
          </ol>
          {aberto.dica && (
            <p className="mt-4 flex gap-2 rounded-2xl bg-[#FDF0D6] p-3 text-[13px] text-[#8A5A00]">
              <Lightbulb size={18} className="shrink-0" /> {aberto.dica}
            </p>
          )}
          {moduloPorSlug(aberto.modulo) && (
            <Link href={`/${aberto.modulo}`} className="mt-4 inline-block">
              <Botao variante="secundario">Abrir {moduloPorSlug(aberto.modulo)!.rotulo}</Botao>
            </Link>
          )}
        </Cartao>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {lista.map((a) => (
            <button key={a.id} onClick={() => setAberto(a)} className="flex items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-card hover:ring-2 hover:ring-rosado">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{a.titulo}</p>
                <p className="truncate text-[12.5px] text-mudo">
                  {moduloPorSlug(a.modulo)?.rotulo} · {a.resumo}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-mudo" />
            </button>
          ))}
          {!lista.length && <p className="col-span-full py-8 text-center text-[13.5px] text-mudo">Nada encontrado para “{q}”. Tente outra palavra ou fale com o suporte.</p>}
        </div>
      )}

      <Cartao className="mt-5">
        <div className="flex flex-wrap items-center gap-3">
          <LifeBuoy size={28} className="text-acao" />
          <div className="flex-1">
            <p className="font-bold">Não achou o que precisava?</p>
            <p className="text-[13px] text-mudo">Veja também os treinamentos por função ou chame o suporte.</p>
          </div>
          <Link href="/treinamentos">
            <Botao variante="secundario">Treinamentos</Botao>
          </Link>
          {SUPORTE && (
            <a href={SUPORTE} target="_blank" rel="noreferrer">
              <Botao>
                <MessageCircle size={16} /> Suporte
              </Botao>
            </a>
          )}
        </div>
      </Cartao>
    </div>
  );
}
