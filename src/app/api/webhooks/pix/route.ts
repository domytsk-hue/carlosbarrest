import { NextResponse } from "next/server";
import { provedorConfigurado } from "@/lib/integracoes/provedor-pix";

// Recebe a confirmação de pagamento do PSP (Pix dinâmico).
// Com o Supabase ligado, cada evento grava um registro em `pagamentos`
// (referencia = txid) e a conta fecha sozinha quando quitada.
export async function POST(req: Request) {
  if (!provedorConfigurado()) {
    return NextResponse.json({ erro: "Nenhum provedor Pix configurado (PIX_PROVEDOR)." }, { status: 501 });
  }
  const corpo = await req.json().catch(() => null);
  // TODO(integração): validar assinatura com o provedor escolhido e gravar o pagamento.
  console.info("[pix] webhook recebido", JSON.stringify(corpo)?.slice(0, 500));
  return NextResponse.json({ ok: true });
}
