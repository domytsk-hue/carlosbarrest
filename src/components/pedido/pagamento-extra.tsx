"use client";

import { copiarTexto } from "@/lib/copiar";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { brl } from "@/lib/dominio/calculos";
import type { Conta, TipoPagamento } from "@/lib/dominio/tipos";
import { gerarPixCopiaECola } from "@/lib/integracoes/pix";
import { useLoja } from "@/lib/loja/loja";
import { QR } from "../qr";
import { Botao } from "../ui";
import { MAQUININHA } from "./maquininha";

/**
 * Ponto de extensão do recebimento por forma de pagamento.
 * Pix: QR Code com o valor exato. Cartão: envio para a maquininha (Fase 4).
 */
export function PagamentoExtra({ conta, tipo, valor, aoConfirmar }: { conta: Conta; tipo: TipoPagamento; valor: number; aoConfirmar: (referencia?: string) => void }) {
  if (tipo === "pix") return <PixQR conta={conta} valor={valor} aoConfirmar={aoConfirmar} />;
  if ((tipo === "credito" || tipo === "debito") && MAQUININHA.Componente) return <MAQUININHA.Componente conta={conta} tipo={tipo} valor={valor} aoConfirmar={aoConfirmar} />;
  return null;
}

export function PixQR({ conta, valor, aoConfirmar, semBotao }: { conta: Conta; valor: number; aoConfirmar?: (ref?: string) => void; semBotao?: boolean }) {
  const config = useLoja((e) => e.config);
  const [copiado, setCopiado] = useState(false);
  if (!config.chavePix)
    return (
      <p className="mt-3 rounded-2xl bg-[#FDF0D6] p-3 text-[12.5px] text-[#8A5A00]">
        Cadastre a chave Pix em{" "}
        <Link href="/configuracoes" className="font-bold underline">
          Configurações
        </Link>{" "}
        para mostrar o QR Code com o valor.
      </p>
    );
  const txid = `CB${conta.numero}T${Date.now().toString(36).toUpperCase()}`.slice(0, 25);
  const codigo = gerarPixCopiaECola({ chave: config.chavePix, nome: config.nome, cidade: config.cidadePix, valor, txid, descricao: `Conta ${conta.numero}` });

  return (
    <div className="mt-3 rounded-2xl border-[1.5px] border-dashed border-[#E3B9A8] bg-card p-4 text-center">
      <p className="text-[12px] text-mudo">Pix · aponte a câmera do banco</p>
      <p className="num text-[24px] font-extrabold text-marca">{brl(valor)}</p>
      <QR texto={codigo} tamanho={200} className="mx-auto my-2 overflow-hidden rounded-xl" />
      <button
        onClick={async () => {
          if (!(await copiarTexto(codigo))) return;
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
        className="mx-auto flex items-center gap-1.5 rounded-full bg-secundario px-3 py-1.5 text-[12.5px] font-semibold"
      >
        {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? "Copiado" : "Copiar Pix copia e cola"}
      </button>
      {!semBotao && aoConfirmar && (
        <Botao variante="ok" className="mt-3 w-full" onClick={() => aoConfirmar(txid)}>
          <Check size={17} /> Pix recebido · confirmar
        </Botao>
      )}
    </div>
  );
}
