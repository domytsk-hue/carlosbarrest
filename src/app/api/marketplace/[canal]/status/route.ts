import { NextResponse } from "next/server";
import { ifoodConfigurado, mudarStatus } from "@/lib/integracoes/ifood-api";

// Repassa ao marketplace a mudança de status feita em Entregas/Cozinha.
export async function POST(req: Request, { params }: { params: Promise<{ canal: string }> }) {
  const { canal } = await params;
  const { pedidoId, acao } = (await req.json().catch(() => ({}))) as { pedidoId?: string; acao?: string };
  if (!pedidoId || !acao) return NextResponse.json({ erro: "pedidoId e acao obrigatórios" }, { status: 400 });
  if (canal === "ifood") {
    if (!ifoodConfigurado()) return NextResponse.json({ erro: "iFood não configurado" }, { status: 501 });
    await mudarStatus(pedidoId, acao);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ erro: `Status para ${canal} ainda não implementado` }, { status: 501 });
}
