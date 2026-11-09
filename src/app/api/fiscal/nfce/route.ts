import { NextResponse } from "next/server";
import type { Conta, FormaPagamento, Produto } from "@/lib/dominio/tipos";
import { montarNfceFocus, urlFocus } from "@/lib/integracoes/fiscal";
import type { ConfigFiscal } from "@/lib/loja/estado";

// Emite a NFC-e de uma conta paga pelo Focus NFe. Precisa de FOCUS_NFE_TOKEN
// no servidor e do emissor "Focus NFe" em Configurações › Fiscal.
export async function POST(req: Request) {
  const token = process.env.FOCUS_NFE_TOKEN;
  const corpo = (await req.json().catch(() => null)) as { referencia: string; conta: Conta; produtos: Produto[]; formas: FormaPagamento[]; fiscal: ConfigFiscal } | null;
  if (!corpo?.conta || !corpo.fiscal) return NextResponse.json({ erro: "Dados incompletos" }, { status: 400 });
  if (corpo.fiscal.emissor !== "focusnfe" || !token)
    return NextResponse.json({ erro: "Emissor fiscal não configurado. Escolha o Focus NFe em Configurações › Fiscal e defina FOCUS_NFE_TOKEN no servidor." }, { status: 501 });
  if (corpo.conta.status !== "paga") return NextResponse.json({ erro: "Só é possível emitir NFC-e de conta paga." }, { status: 400 });
  if (!/^\d{14}$/.test(corpo.fiscal.cnpj.replace(/\D/g, ""))) return NextResponse.json({ erro: "CNPJ do emitente inválido (Configurações › Fiscal)." }, { status: 400 });
  if (!/^[\w-]{1,60}$/.test(corpo.referencia)) return NextResponse.json({ erro: "Referência inválida" }, { status: 400 });

  const nota = montarNfceFocus(corpo.conta, corpo.produtos, corpo.formas, corpo.fiscal);
  const base = urlFocus(corpo.fiscal.ambiente);
  const r = await fetch(`${base}/v2/nfce?ref=${encodeURIComponent(corpo.referencia)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(token + ":").toString("base64") },
    body: JSON.stringify(nota),
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, string>;
  if (!r.ok && r.status !== 422) return NextResponse.json({ erro: j.mensagem ?? `Focus NFe respondeu ${r.status}` }, { status: 502 });
  return NextResponse.json({
    status: j.status,
    numero: j.numero,
    serie: j.serie,
    chave: j.chave_nfe,
    url: j.caminho_danfe ? `${base}${j.caminho_danfe}` : undefined,
    mensagem: j.mensagem_sefaz ?? j.mensagem,
  });
}
