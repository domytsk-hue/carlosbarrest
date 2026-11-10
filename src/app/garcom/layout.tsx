import type { Metadata, Viewport } from "next";
import { AreaImpressao } from "@/components/impressao";

export const metadata: Metadata = { title: "Garçom · Carlo's", manifest: undefined };
export const viewport: Viewport = { themeColor: "#9E1B1E", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

/** App do garçom: tela própria, pensada para o celular, sem o menu do painel. */
export default function GarcomLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AreaImpressao />
    </>
  );
}
