import type { Metadata } from "next";
import { CardapioDelivery } from "./cardapio-delivery";

export const metadata: Metadata = { title: "Delivery · Carlo's Bar & Restaurante", description: "Peça online no Carlo's Bar & Restaurante" };

export default function CardapioPage() {
  return <CardapioDelivery />;
}
