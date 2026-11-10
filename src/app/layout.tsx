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

export const metadata: Metadata = {
  title: "Carlo's · Gestão",
  description: "Sistema de gestão do Carlo's Bar & Restaurante",
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#9E1B1E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Aplica o tema e o menu (aberto/recolhido) salvos antes da primeira pintura, para não piscar.
// Também bloqueia copiar, arrastar e "salvar imagem" fora dos campos de digitar, e o zoom por pinça no iPhone.
const bloqueios = `(function(){var ok=function(e){var t=e.target;return t&&t.closest&&t.closest("input,textarea,select,[contenteditable=true]")};["copy","cut","dragstart","contextmenu"].forEach(function(n){document.addEventListener(n,function(e){if(!ok(e))e.preventDefault()})});document.addEventListener("gesturestart",function(e){e.preventDefault()})})();`;
const temaInicial = `try{var d=document.documentElement,t=localStorage.getItem("tema");if(t)d.dataset.theme=t;var m=localStorage.getItem("menu");if(m)d.dataset.menu=m}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial + bloqueios }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
