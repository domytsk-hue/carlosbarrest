import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { responder, type ContextoBot } from "@/lib/chatbot/bot";
import { assinaturaValida, supabaseServico } from "@/lib/integracoes/servidor";

// Webhook do WhatsApp Business (Cloud API da Meta).
// GET: verificação do webhook (hub.verify_token = WHATSAPP_VERIFY_TOKEN).
// POST: mensagem recebida. A assinatura X-Hub-Signature-256 é conferida com
// WHATSAPP_APP_SECRET; a resposta sai pela Graph API com WHATSAPP_TOKEN.

const GRAPH = "https://graph.facebook.com/v21.0";

function iguais(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && u.searchParams.get("hub.mode") === "subscribe" && iguais(u.searchParams.get("hub.verify_token") ?? "", token))
    return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  return new Response("proibido", { status: 403 });
}

type Mensagem = { from: string; id: string; type: string; text?: { body: string }; interactive?: { button_reply?: { title: string }; list_reply?: { title: string } } };
type Corpo = { entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; messages?: Mensagem[] } }[] }[] };

export async function POST(req: Request) {
  const segredo = process.env.WHATSAPP_APP_SECRET;
  const tokenEnvio = process.env.WHATSAPP_TOKEN;
  if (!segredo || !tokenEnvio) return NextResponse.json({ erro: "WhatsApp não configurado (WHATSAPP_APP_SECRET / WHATSAPP_TOKEN)" }, { status: 501 });
  const bruto = await req.text();
  if (!assinaturaValida(bruto, req.headers.get("x-hub-signature-256"), segredo)) return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 501 });
  const corpo = JSON.parse(bruto) as Corpo;
  const origem = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  for (const entrada of corpo.entry ?? [])
    for (const mudanca of entrada.changes ?? []) {
      const phoneId = mudanca.value?.metadata?.phone_number_id ?? process.env.WHATSAPP_PHONE_ID;
      for (const m of mudanca.value?.messages ?? []) {
        const texto = m.text?.body ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
        // Contexto do restaurante dono deste número (config, promoções e pedidos recentes do cliente)
        const { data, error } = await sb.rpc("contexto_chatbot", { p_phone_id: phoneId, p_telefone: m.from, p_mensagem: texto.slice(0, 1000) });
        if (error || !data) continue;
        const ctx = data as Omit<ContextoBot, "urlCardapio"> & { slug?: string };
        if (!ctx.bot?.ativo) continue;
        const r = responder(texto, { ...ctx, urlCardapio: `${origem}/cardapio` });
        await fetch(`${GRAPH}/${phoneId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenEnvio}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: m.from, type: "text", text: { body: r.texto, preview_url: true } }),
        });
        await sb.rpc("registrar_resposta_chatbot", { p_phone_id: phoneId, p_telefone: m.from, p_intencao: r.intencao, p_resposta: r.texto, p_transferir: !!r.transferir });
      }
    }
  // A Meta reenvia se não receber 200 rápido
  return NextResponse.json({ ok: true });
}
