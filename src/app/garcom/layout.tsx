import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { AreaImpressao } from "@/components/impressao";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Garçom · Carlo's", manifest: undefined };
export const viewport: Viewport = { themeColor: "#9E1B1E", width: "device-width", initialScale: 1, maximumScale: 1 };

/** App do garçom: tela própria, pensada para o celular, sem o menu do painel. */
export default async function GarcomLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  return (
    <>
      {children}
      <AreaImpressao />
    </>
  );
}
