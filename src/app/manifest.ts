import type { MetadataRoute } from "next";

/** Permite instalar o sistema como aplicativo (tela cheia, ícone na tela inicial). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Carlo's · Gestão",
    short_name: "Carlo's",
    description: "Sistema de gestão do Carlo's Bar & Restaurante",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7EEE3",
    theme_color: "#9E1B1E",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
