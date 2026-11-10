import type { Metadata, Viewport } from "next";
// Fontes empacotadas no app (funcionam offline e no build sem internet)
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-800.css";
import "@fontsource/roboto-slab/latin-700.css";
import "@fontsource/roboto-slab/latin-800.css";
import "./globals.css";
import { RegistrarOffline } from "@/components/pwa/registrar-offline";

export const metadata: Metadata = {
  title: "Carlo's · Gestão",
  description: "Sistema de gestão do Carlo's Bar & Restaurante",
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#9E1B1E",
};

// Aplica o tema e o menu (aberto/recolhido) salvos antes da primeira pintura, para não piscar.
const temaInicial = `try{var d=document.documentElement,t=localStorage.getItem("tema");if(t)d.dataset.theme=t;var m=localStorage.getItem("menu");if(m)d.dataset.menu=m}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body className="antialiased">
        {children}
        <RegistrarOffline />
      </body>
    </html>
  );
}
