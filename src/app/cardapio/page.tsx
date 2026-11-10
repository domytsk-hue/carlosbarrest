import type { Metadata } from "next";
import { CardapioDelivery } from "./cardapio-delivery";

export const metadata: Metadata = { title: "Delivery · Carlos Bar & Restaurante", description: "Peça online no Carlos Bar & Restaurante" };

export default function CardapioPage() {
  return <CardapioDelivery />;
}
