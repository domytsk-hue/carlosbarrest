"use client";

import clsx from "clsx";
import { Unlock } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { brl } from "@/lib/dominio/calculos";
import { abrirCaixa } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";
import { Botao, EntradaValor, Modal } from "../ui";

const CHAVE_ADIADO = "carlos:abertura-adiada";

/**
 * Abertura do caixa (CAI-01): no primeiro acesso depois do fechamento anterior,
 * pede a conferência e o valor do fundo de troco. O fundo fica separado das
 * vendas (não entra no faturamento).
 */
export function AberturaCaixa() {
  const pathname = usePathname();
  const caixas = useLoja((e) => e.caixas);
  const algumAberto = useLoja((e) => e.sessoesCaixa.some((s) => !s.fechadaEm));
  const ultimoFundo = useLoja((e) => e.sessoesCaixa.at(-1)?.fundo);
  const funcao = useLoja((e) => e.funcionarios.find((f) => f.id === e.usuarioId)?.funcao);
  const [adiado, setAdiado] = useState(true);
  const [caixaId, setCaixaId] = useState(caixas[0]?.id);
  const [fundo, setFundo] = useState(0);
  const [conferido, setConferido] = useState(false);

  useEffect(() => {
    try {
      setAdiado(sessionStorage.getItem(CHAVE_ADIADO) === "1");
    } catch {
      setAdiado(false);
    }
  }, []);
  useEffect(() => {
    if (ultimoFundo !== undefined) setFundo(ultimoFundo);
  }, [ultimoFundo]);

  const podeAbrir = funcao === "dono" || funcao === "gerente" || funcao === "caixa";
  const aberto = !adiado && !algumAberto && podeAbrir && pathname !== "/caixa";

  function adiar() {
    try {
      sessionStorage.setItem(CHAVE_ADIADO, "1");
    } catch {}
    setAdiado(true);
  }

  return (
    <Modal aberto={aberto} aoFechar={adiar} titulo="Abertura do caixa" largura="sm">
      <p className="mb-3 text-[13px] text-mudo">O caixa anterior foi fechado. Antes de começar, confira o dinheiro deixado para troco e informe o valor.</p>
      {caixas.length > 1 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {caixas.map((c) => (
            <button
              key={c.id}
              onClick={() => setCaixaId(c.id)}
              className={clsx("rounded-2xl border-[1.5px] bg-card p-2.5 text-[13px] font-semibold", c.id === caixaId ? "border-acao bg-rosado text-acao" : "border-linha")}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-semibold">Dinheiro inicial para troco (R$)</span>
        <EntradaValor autoFocus valor={fundo} aoMudar={setFundo} className="text-[20px] font-extrabold" />
      </label>
      <p className="mt-1 text-[11.5px] text-mudo">O fundo de troco fica separado das vendas e não conta como faturamento.</p>
      <label className="mt-3 flex items-center gap-2 rounded-2xl bg-fundo p-3 text-[13px] font-semibold">
        <input type="checkbox" checked={conferido} onChange={(e) => setConferido(e.target.checked)} className="h-5 w-5 accent-[var(--acao)]" />
        Conferi o dinheiro da gaveta: <span className="num">{brl(fundo)}</span>
      </label>
      <Botao tamanho="lg" className="mt-3 w-full" disabled={!caixaId || !conferido} onClick={() => caixaId && abrirCaixa(caixaId, fundo, true)}>
        <Unlock size={18} /> Abrir caixa
      </Botao>
      <button onClick={adiar} className="mt-2 w-full py-2 text-[12.5px] font-semibold text-mudo">
        Agora não
      </button>
    </Modal>
  );
}
