import { notFound } from "next/navigation";
import { Hammer } from "lucide-react";
import { MODULOS, moduloPorSlug } from "@/lib/modulos";

export function generateStaticParams() {
  return MODULOS.filter((m) => m.slug).map((m) => ({ modulo: m.slug }));
}

/** Página provisória de cada módulo até a sua fase ser construída. */
export default async function ModuloPage({ params }: { params: Promise<{ modulo: string }> }) {
  const { modulo } = await params;
  const m = moduloPorSlug(modulo);
  if (!m || !m.slug) notFound();
  const Icone = m.icone;

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="rounded-[20px] bg-card p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rosado text-acao">
          <Icone size={30} />
        </div>
        <h1 className="text-[22px] font-extrabold">{m.rotulo}</h1>
        <p className="mt-1 text-[14px] text-mudo">{m.descricao}</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FDF0D6] px-3 py-1.5 text-[12px] font-bold text-[#8A5A00]">
          <Hammer size={14} />
          Em construção · Fase {m.fase} do plano
        </p>
        {m.atalho && <p className="mt-3 text-[12px] text-mudo">Atalho: <kbd className="font-semibold">{m.atalho}</kbd></p>}
      </div>
    </div>
  );
}
