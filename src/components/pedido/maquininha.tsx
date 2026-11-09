"use client";

import clsx from "clsx";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { brl } from "@/lib/dominio/calculos";
import type { Conta } from "@/lib/dominio/tipos";
import { useLoja } from "@/lib/loja/loja";
import { Botao, Entrada, Selecao } from "../ui";

type Props = { conta: Conta; tipo: "credito" | "debito"; valor: number; aoConfirmar: (referencia?: string) => void };

/** Registro da integração com maquininha (usado por PagamentoExtra). */
export const MAQUININHA: { Componente?: React.ComponentType<Props> } = {};

const BANDEIRAS = ["Visa", "Mastercard", "Elo", "Hipercard", "Amex", "Outra"];

/**
 * Cobrança no cartão. Com a Stone ligada (Configurações › Maquininha e
 * STONE_* no servidor), o valor vai direto para a maquininha e o NSU volta
 * sozinho. No modo manual, o operador passa o cartão na maquininha e digita
 * NSU e autorização do comprovante, para a conciliação bater depois.
 */
function CobrancaCartao({ conta, tipo, valor, aoConfirmar }: Props) {
  const cfg = useLoja((e) => e.config.maquininha);
  const [parcelas, setParcelas] = useState(1);
  const [bandeira, setBandeira] = useState(BANDEIRAS[0]);
  const [nsu, setNsu] = useState("");
  const [aut, setAut] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "erro">("");
  const [msg, setMsg] = useState("");

  const referencia = () => [nsu && `NSU ${nsu}`, aut && `AUT ${aut}`, bandeira, tipo === "credito" && parcelas > 1 ? `${parcelas}x` : ""].filter(Boolean).join(" · ");

  async function enviarStone() {
    setEstado("enviando");
    setMsg("Siga as instruções na maquininha…");
    try {
      const r = await fetch("/api/maquininha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor, tipo, parcelas, referencia: `conta-${conta.numero}`, serialPos: cfg.serialPos }),
      });
      const j = (await r.json().catch(() => ({}))) as { aprovado?: boolean; nsu?: string; autorizacao?: string; bandeira?: string; erro?: string };
      if (!r.ok || !j.aprovado) throw new Error(j.erro ?? "Pagamento não aprovado");
      aoConfirmar([`NSU ${j.nsu}`, j.autorizacao && `AUT ${j.autorizacao}`, j.bandeira, parcelas > 1 ? `${parcelas}x` : ""].filter(Boolean).join(" · "));
    } catch (e) {
      setEstado("erro");
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border-[1.5px] border-dashed border-[#E3B9A8] bg-card p-4">
      <p className="flex items-center gap-2 text-[13px] font-bold">
        <CreditCard size={16} className="text-acao" /> {tipo === "credito" ? "Crédito" : "Débito"} · <span className="num">{brl(valor)}</span>
        {cfg.provedor === "stone" && <span className="ml-auto rounded-full bg-[#E5F4EA] px-2 py-0.5 text-[10.5px] text-[#1E7A41]">Stone</span>}
      </p>
      <div className={clsx("mt-3 grid gap-2", tipo === "credito" ? "grid-cols-2" : "grid-cols-1")}>
        {tipo === "credito" && (
          <Selecao value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} aria-label="Parcelas" className="py-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "À vista" : `${n}x de ${brl(valor / n)}`}
              </option>
            ))}
          </Selecao>
        )}
        {cfg.provedor === "manual" && (
          <Selecao value={bandeira} onChange={(e) => setBandeira(e.target.value)} aria-label="Bandeira" className="py-2">
            {BANDEIRAS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Selecao>
        )}
      </div>
      {cfg.provedor === "stone" ? (
        <>
          <Botao className="mt-3 w-full" onClick={enviarStone} disabled={estado === "enviando" || valor <= 0}>
            {estado === "enviando" ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />} Enviar para a maquininha
          </Botao>
          {msg && <p className={clsx("mt-2 text-center text-[12.5px] font-semibold", estado === "erro" ? "text-st-cancelado" : "text-mudo")}>{msg}</p>}
        </>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Entrada value={nsu} onChange={(e) => setNsu(e.target.value.replace(/\D/g, ""))} placeholder="NSU / DOC" inputMode="numeric" className="py-2" />
            <Entrada value={aut} onChange={(e) => setAut(e.target.value.toUpperCase())} placeholder="Autorização" className="py-2" />
          </div>
          <p className="mt-1.5 text-[11.5px] text-mudo">Opcional: os números do comprovante ajudam a conferir o extrato da maquininha.</p>
          <Botao variante="ok" className="mt-3 w-full" onClick={() => aoConfirmar(referencia() || undefined)} disabled={valor <= 0}>
            <Check size={17} /> Aprovado na maquininha · confirmar
          </Botao>
        </>
      )}
    </div>
  );
}

MAQUININHA.Componente = CobrancaCartao;
