"use client";

import type { Conta, TipoPagamento } from "@/lib/dominio/tipos";

/**
 * Ponto de extensão do recebimento por forma de pagamento.
 * Fase 2: QR Code Pix. Fase 4: envio do valor para a maquininha Stone.
 */
export function PagamentoExtra(_props: { conta: Conta; tipo: TipoPagamento; valor: number; aoConfirmar: (referencia?: string) => void }) {
  return null;
}
