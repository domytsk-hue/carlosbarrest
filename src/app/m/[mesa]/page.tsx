import type { Metadata } from "next";
import { MesaCliente } from "./mesa-cliente";

export const metadata: Metadata = { title: "Cardápio · Carlo's Bar & Restaurante" };

/** Cardápio da mesa aberto pelo QR Code: o cliente pede, chama o garçom e vê a conta. */
export default async function MesaPage({ params }: { params: Promise<{ mesa: string }> }) {
  const { mesa } = await params;
  return <MesaCliente numero={Number(mesa)} />;
}
