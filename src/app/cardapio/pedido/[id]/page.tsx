import type { Metadata } from "next";
import { AcompanharPedido } from "./acompanhar";

export const metadata: Metadata = { title: "Seu pedido · Carlos Bar & Restaurante" };

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AcompanharPedido id={id} />;
}
