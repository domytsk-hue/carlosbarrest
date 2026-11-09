"use client";

import { TelaPedidos } from "@/components/pedido/tela-pedidos";

export default function BalcaoPage() {
  return <TelaPedidos titulo="Balcão" sub="Retirada e para viagem, com cliente identificado · F4" filtro={(c) => c.canal === "balcao"} tipoInicial="retirada" />;
}
