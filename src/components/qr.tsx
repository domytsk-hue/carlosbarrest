"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR Code em SVG (nítido na tela e na impressão). */
export function QR({ texto, tamanho = 200, className }: { texto: string; tamanho?: number; className?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let vivo = true;
    QRCode.toString(texto, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2A1A16", light: "#FFFFFF" } }).then((s) => vivo && setSvg(s));
    return () => {
      vivo = false;
    };
  }, [texto]);
  return <div className={className} style={{ width: tamanho, height: tamanho }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
