import { NextResponse } from "next/server";
import { normalizarAiqfome } from "@/lib/integracoes/marketplace";
import { assinaturaValida, gravarPedidoMarketplace } from "@/lib/integracoes/servidor";

// Webhook do aiqfome: recebe o pedido completo. O cabeçalho da assinatura e o
// formato do corpo devem ser conferidos na documentação v2 do parceiro quando
// a credencial for liberada (ver normalizarAiqfome).
export async function POST(req: Request) {
  const segredo = process.env.AIQFOME_WEBHOOK_SECRET;
  if (!segredo) return NextResponse.json({ erro: "aiqfome não configurado (AIQFOME_WEBHOOK_SECRET)" }, { status: 501 });
  const bruto = await req.text();
  if (!assinaturaValida(bruto, req.headers.get("x-aiqfome-signature"), segredo)) return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  const corpo = JSON.parse(bruto) as { store_id?: string; order?: Record<string, unknown> } & Record<string, unknown>;
  const pedido = normalizarAiqfome(corpo.order ?? corpo);
  await gravarPedidoMarketplace(String(corpo.store_id ?? ""), pedido);
  return NextResponse.json({ ok: true });
}
