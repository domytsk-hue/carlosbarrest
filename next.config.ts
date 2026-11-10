import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos de produto podem vir de qualquer endereço cadastrado pelo restaurante
  images: { unoptimized: true },
  // Versão do deploy: cada deploy renova as telas guardadas para uso sem internet
  env: { NEXT_PUBLIC_VERSAO: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERSAO ?? String(Date.now()) },
  async headers() {
    // O service worker precisa ser conferido a cada abertura (nunca preso em cache)
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
};

export default nextConfig;
