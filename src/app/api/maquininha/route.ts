import { NextResponse } from "next/server";

// Envio da cobrança para a maquininha Stone (Stone Connect / POS integrado).
//
// Fluxo: o sistema cria o pedido de pagamento para o número de série da POS,
// a POS mostra o valor, o cliente passa o cartão e a Stone devolve NSU,
// autorização e bandeira. Os endpoints e a autenticação são liberados pela
// Stone junto com a credencial do parceiro; até lá a rota responde 501 e o
// caixa usa o modo manual (digita NSU e autorização).
//
// Variáveis: STONE_CLIENT_ID, STONE_CLIENT_SECRET, STONE_URL.
export async function POST(req: Request) {
  const corpo = (await req.json().catch(() => ({}))) as { valor?: number; tipo?: string; parcelas?: number; serialPos?: string };
  if (!process.env.STONE_CLIENT_ID || !process.env.STONE_CLIENT_SECRET || !process.env.STONE_URL) {
    return NextResponse.json({ erro: "Integração Stone ainda não configurada no servidor. Use o modo manual em Configurações › Maquininha." }, { status: 501 });
  }
  if (!corpo.valor || corpo.valor <= 0 || !corpo.serialPos) return NextResponse.json({ erro: "Valor e número de série da maquininha são obrigatórios" }, { status: 400 });
  // TODO(credencial Stone): criar o pedido na POS e aguardar o resultado.
  return NextResponse.json({ erro: "Integração Stone aguardando a documentação da credencial." }, { status: 501 });
}
