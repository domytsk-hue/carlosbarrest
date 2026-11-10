"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BotaoProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "ok" | "perigo" | "fantasma";
  tamanho?: "sm" | "md" | "lg";
};

export function Botao({ variante = "primario", tamanho = "md", className, ...props }: BotaoProps) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-[transform,opacity] active:scale-[.98] disabled:pointer-events-none disabled:opacity-45",
        tamanho === "sm" && "min-h-9 px-3.5 text-[12.5px]",
        tamanho === "md" && "min-h-11 px-[18px] text-[14px]",
        tamanho === "lg" && "min-h-14 px-6 text-[16px]",
        variante === "primario" && "bg-acao text-white shadow-botao",
        variante === "secundario" && "bg-secundario text-tinta",
        variante === "ok" && "bg-ok text-white",
        variante === "perigo" && "bg-st-cancelado text-white",
        variante === "fantasma" && "text-mudo hover:text-tinta",
        className,
      )}
    />
  );
}

/** Janela para o segundo clique/toque confirmar uma ação importante. */
export const JANELA_DOIS_CLIQUES = 2500;

/**
 * Confirmação por dois cliques, desligada por padrão (Dom pediu um clique em tudo e vai
 * dizer o que precisa de dois). Com `ligado`, o primeiro clique só "arma" o botão e o
 * segundo, dentro de 2,5 s, executa; no celular são dois toques separados.
 */
export function useDoisCliques(acao?: () => void, ligado = false, ms = JANELA_DOIS_CLIQUES) {
  const [armado, setArmado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const desarmar = () => {
    clearTimeout(timer.current);
    setArmado(false);
  };
  const clicar = () => {
    if (!ligado) return acao?.();
    if (armado) {
      desarmar();
      acao?.();
      return;
    }
    setArmado(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setArmado(false), ms);
  };
  return { armado, clicar, desarmar };
}

/**
 * Botão de ação do painel lateral (ícone grande + rótulo), padrão das telas de operação.
 * Um clique executa; `doisCliques` liga a confirmação (ver useDoisCliques).
 */
export function Acao({ icone: Icone, rotulo, onClick, disabled, destaque, doisCliques }: { icone: React.ElementType; rotulo: string; onClick?: () => void; disabled?: boolean; destaque?: boolean; doisCliques?: boolean }) {
  const { armado, clicar, desarmar } = useDoisCliques(onClick, doisCliques);
  const pedeSegundo = armado && !disabled;
  return (
    <button
      onClick={clicar}
      onBlur={desarmar}
      disabled={disabled}
      title={doisCliques ? `${rotulo} · dois cliques` : rotulo}
      aria-label={pedeSegundo ? `${rotulo}: clique de novo para confirmar` : rotulo}
      className={clsx(
        "flex min-h-[64px] touch-manipulation select-none flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11.5px] font-semibold transition-colors disabled:opacity-35",
        pedeSegundo
          ? "bg-rosado text-acao ring-2 ring-acao"
          : destaque
            ? "bg-acao text-white shadow-botao"
            : "bg-card text-tinta shadow-card hover:bg-rosado hover:text-acao",
      )}
    >
      <Icone size={20} />
      <span className="leading-tight">
        {pedeSegundo ? (
          <>
            <span className="lg:hidden">Toque de novo</span>
            <span className="hidden lg:inline">Clique de novo</span>
          </>
        ) : (
          rotulo
        )}
      </span>
    </button>
  );
}

export function Modal({ aberto, aoFechar, titulo, children, largura = "md" }: { aberto: boolean; aoFechar: () => void; titulo: string; children: React.ReactNode; largura?: "sm" | "md" | "lg" | "xl" }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(40,15,8,.45)] sm:items-center sm:p-4" onMouseDown={aoFechar}>
      <div
        role="dialog"
        aria-label={titulo}
        onMouseDown={(e) => e.stopPropagation()}
        className={clsx(
          "max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-fundo p-5 shadow-flutuante sm:rounded-3xl",
          largura === "sm" && "sm:max-w-[400px]",
          largura === "md" && "sm:max-w-[520px]",
          largura === "lg" && "sm:max-w-[760px]",
          largura === "xl" && "sm:max-w-[1100px]",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-extrabold">{titulo}</h2>
          <button onClick={aoFechar} className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-tinta shadow-card" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Campo({ rotulo, children, className }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold">{rotulo}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border-[1.5px] border-linha bg-card px-3 py-2.5 text-[14px] text-tinta outline-none focus:border-acao placeholder:text-mudo/70";

export function Entrada(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputCls, props.className)} />;
}

export function Selecao(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(inputCls, props.className)} />;
}

/** Campo numérico em reais que aceita vírgula. */
export function EntradaValor({ valor, aoMudar, ...props }: { valor: number; aoMudar: (v: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      inputMode="decimal"
      {...props}
      defaultValue={valor ? String(valor).replace(".", ",") : ""}
      onChange={(e) => aoMudar(Number(e.target.value.replace(/\./g, "").replace(",", ".")) || 0)}
      className={clsx(inputCls, "num", props.className)}
    />
  );
}

export function Cartao({ titulo, acao, children, className }: { titulo?: React.ReactNode; acao?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-[20px] bg-card p-4 shadow-card", className)}>
      {(titulo || acao) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {titulo && <h2 className="text-[15.5px] font-bold">{titulo}</h2>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

export function Pilula({ cor = "neutra", children }: { cor?: "neutra" | "verde" | "amarela" | "vermelha" | "azul" | "laranja"; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        cor === "neutra" && "bg-secundario text-tinta",
        cor === "verde" && "bg-[#E5F4EA] text-[#1E7A41]",
        cor === "amarela" && "bg-[#FDF0D6] text-[#8A5A00]",
        cor === "vermelha" && "bg-[#FBE3DF] text-[#A0261C]",
        cor === "azul" && "bg-[#E2EEF9] text-[#1F5C96]",
        cor === "laranja" && "bg-[#FCE7DA] text-[#A04A15]",
      )}
    >
      {children}
    </span>
  );
}

export function Vazio({ icone: Icone, titulo, texto, children }: { icone: React.ElementType; titulo: string; texto?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rosado text-acao">
        <Icone size={26} />
      </span>
      <p className="text-[15px] font-bold">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-[13px] text-mudo">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Titulo({ children, sub, acoes }: { children: React.ReactNode; sub?: React.ReactNode; acoes?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-3 pt-2">
      <div>
        <h1 className="font-slab text-[24px] font-extrabold uppercase leading-tight tracking-tight text-marca">{children}</h1>
        {sub && <p className="text-[12.5px] text-mudo">{sub}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

/** Tabela simples com o visual do sistema. */
export function Tabela({ colunas, children, vazio }: { colunas: { rotulo: string; direita?: boolean; className?: string }[]; children: React.ReactNode; vazio?: string }) {
  const temLinhas = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="overflow-x-auto rounded-2xl border border-linha bg-card">
      <table className="w-full min-w-[560px] text-[13px]">
        <thead>
          <tr className="border-b border-linha text-left text-[11.5px] uppercase tracking-wide text-mudo">
            {colunas.map((c) => (
              <th key={c.rotulo} className={clsx("px-3 py-2.5 font-semibold", c.direita && "text-right", c.className)}>
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-linha">{children}</tbody>
      </table>
      {!temLinhas && <p className="px-3 py-8 text-center text-[13px] text-mudo">{vazio ?? "Nada por aqui ainda."}</p>}
    </div>
  );
}

/** Hook que força re-render a cada N ms (para tempos de permanência). */
export function useRelogio(ms = 30000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return agora;
}
