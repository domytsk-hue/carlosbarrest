"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { descreverAparelho, idDoAparelho } from "@/lib/dispositivo";
import { registrarDispositivo } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

/**
 * Registra o aparelho e, quando a autorização está ligada em Configurações,
 * só deixa passar aparelhos autorizados pelo administrador (ADM-02).
 */
export function PortaoDispositivo({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState("");
  const exigir = useLoja((e) => e.config.exigirAutorizacao);
  const aparelho = useLoja((e) => (e.dispositivos ?? []).find((d) => d.id === id));

  useEffect(() => {
    const meu = idDoAparelho();
    setId(meu);
    if (meu) registrarDispositivo(meu, descreverAparelho());
  }, []);

  if (!exigir || aparelho?.autorizado) return <>{children}</>;
  if (!id) return null;

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-sm rounded-[20px] bg-card p-6 text-center shadow-card">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-rosado text-acao">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-[19px] font-extrabold">Aparelho não autorizado</h1>
        <p className="mt-1 text-[13.5px] text-mudo">Peça ao administrador para autorizar este aparelho em Configurações → Dispositivos.</p>
        <p className="mt-4 rounded-2xl bg-fundo p-3 text-[13px]">
          Código do aparelho
          <b className="num mt-0.5 block text-[22px] tracking-widest">{id.slice(-4).toUpperCase()}</b>
          <span className="text-[11.5px] text-mudo">{aparelho?.descricao}</span>
        </p>
      </div>
    </div>
  );
}
