import { NextResponse } from "next/server";
import { detalhesPedido, ifoodConfigurado } from "@/lib/integracoes/ifood-api";
import { normalizarIfood } from "@/lib/integracoes/marketplace";
import { assinaturaValida, gravarPedidoMarketplace } from "@/lib/integracoes/servidor";

// Webhook do iFood: cada evento traz orderId e code. No "PLC" (pedido feito),
// busca os detalhes, normaliza e grava como conta do canal "ifood".
// Cadastre https://SEU-DOMINIO/api/webhooks/ifood no Portal do Desenvolvedor.
export async function POST(req: Request) {
  if (!ifoodConfigurado()) return NextResponse.json({ erro: "iFood não configurado (IFOOD_CLIENT_ID/IFOOD_CLIENT_SECRET)" }, { status: 501 });
  const bruto = await req.text();
  if (!assinaturaValida(bruto, req.headers.get("x-ifood-signature"), process.env.IFOOD_CLIENT_SECRET)) return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });

  const eventos = [JSON.parse(bruto)].flat() as { code?: string; fullCode?: string; orderId?: string; merchantId?: string }[];
  for (const ev of eventos) {
    if ((ev.code ?? ev.fullCode) !== "PLC" && ev.fullCode !== "PLACED") continue;
    if (!ev.orderId || !ev.merchantId) continue;
    const pedido = normalizarIfood(await detalhesPedido(ev.orderId));
    await gravarPedidoMarketplace(ev.merchantId, pedido);
  }
  return NextResponse.json({ ok: true });
}
