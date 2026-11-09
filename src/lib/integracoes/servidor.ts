import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../supabase/config";
import type { PedidoMarketplace } from "./marketplace";

// Utilidades só do servidor para as integrações: assinatura de webhook,
// cliente Supabase com a chave de serviço e gravação dos pedidos.

/** Compara a assinatura HMAC-SHA256 (hex) do corpo com o cabeçalho recebido. */
export function assinaturaValida(corpo: string, assinatura: string | null, segredo: string | undefined) {
  if (!segredo || !assinatura) return false;
  const esperado = createHmac("sha256", segredo).update(corpo).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(assinatura.replace(/^sha256=/, "").trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function supabaseServico() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !chave) return null;
  return createClient(SUPABASE_URL, chave, { auth: { persistSession: false } });
}

/** Grava o pedido normalizado no banco (função receber_pedido_marketplace). */
export async function gravarPedidoMarketplace(lojaId: string, p: PedidoMarketplace) {
  const sb = supabaseServico();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  const { data, error } = await sb.rpc("receber_pedido_marketplace", { p_canal: p.canal, p_loja: lojaId, p_pedido: p });
  if (error) throw new Error(error.message);
  return data as string | null;
}
