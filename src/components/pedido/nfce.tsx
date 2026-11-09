"use client";

import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Conta } from "@/lib/dominio/tipos";
import { emitirNfce } from "@/lib/loja/acoes-integracoes";
import { Botao, Pilula } from "../ui";

/** Emitir / ver a NFC-e de uma conta paga. */
export function BotaoNfce({ conta }: { conta: Conta }) {
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const n = conta.nfce;
  if (n?.status === "autorizada")
    return (
      <span className="flex items-center gap-2">
        <Pilula cor="verde">NFC-e {n.numero}</Pilula>
        {n.url && (
          <a href={n.url} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-acao">
            <ExternalLink size={14} className="inline" /> DANFE
          </a>
        )}
      </span>
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Botao
        variante="secundario"
        tamanho="sm"
        disabled={enviando}
        onClick={async () => {
          setEnviando(true);
          const r = await emitirNfce(conta.id).catch((e) => ({ ok: false, mensagem: (e as Error).message }));
          setMsg(r.mensagem);
          setEnviando(false);
        }}
      >
        {enviando ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} {n?.status === "erro" ? "Tentar NFC-e de novo" : "Emitir NFC-e"}
      </Botao>
      {(msg || n?.mensagem) && <span className="max-w-[260px] text-[11.5px] text-mudo">{msg || n?.mensagem}</span>}
    </span>
  );
}
