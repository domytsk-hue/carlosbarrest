"use client";

import Image from "next/image";
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { QR } from "@/components/qr";
import { Botao, Titulo } from "@/components/ui";
import { useLoja } from "@/lib/loja/loja";

/** Folha A4 com o QR Code de cada mesa, para imprimir e colar nas mesas. */
export default function QrCodesMesasPage() {
  const mesas = useLoja((e) => e.mesas);
  const [origem, setOrigem] = useState("");
  useEffect(() => setOrigem(window.location.origin), []);

  return (
    <div className="mx-auto max-w-[1000px]">
      <Titulo
        sub="Cada QR abre o cardápio da mesa: o cliente pede, chama o garçom e vê a conta."
        acoes={
          <Botao onClick={() => window.print()}>
            <Printer size={18} /> Imprimir
          </Botao>
        }
      >
        QR Codes das mesas
      </Titulo>
      <div className="folha-impressao grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-3">
        {origem &&
          mesas.map((m) => (
            <div key={m.id} className="flex break-inside-avoid flex-col items-center rounded-[18px] border-[1.5px] border-dashed border-[#E3B9A8] bg-white p-3 text-center text-[#2A1A16]">
              <Image src="/logo.svg" alt="Carlo's" width={90} height={60} className="h-auto w-[90px]" />
              <p className="mt-1 font-slab text-[22px] font-extrabold text-[#9E1B1E]">Mesa {m.numero}</p>
              <QR texto={`${origem}/m/${m.numero}`} tamanho={150} />
              <p className="mt-1 text-[11.5px] font-semibold">Aponte a câmera para pedir e ver a conta</p>
            </div>
          ))}
      </div>
    </div>
  );
}
