import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos de produto podem vir de qualquer endereço cadastrado pelo restaurante
  images: { unoptimized: true },
};

export default nextConfig;
