import { LifeBuoy, MessageCircle } from "lucide-react";
import Link from "next/link";

const URL_SUPORTE = process.env.NEXT_PUBLIC_SUPORTE_URL;
const classe =
  "fixed bottom-14 right-3 z-30 flex h-12 w-12 items-center justify-center gap-2 rounded-full bg-acao text-[13px] font-bold text-white shadow-botao transition-transform hover:scale-[1.03] sm:right-4 xl:w-auto xl:px-4";

/**
 * Botão de suporte flutuante, presente em todas as telas. Só o ícone até telas
 * grandes, para não cobrir botões e listas. Sem link de suporte configurado,
 * leva para a central de ajuda.
 */
export function SupportButton() {
  if (!URL_SUPORTE)
    return (
      <Link href="/ajuda" className={classe} aria-label="Ajuda" title="Ajuda (F1)">
        <LifeBuoy size={20} />
        <span className="hidden xl:inline">Ajuda</span>
      </Link>
    );
  return (
    <a href={URL_SUPORTE} target="_blank" rel="noreferrer" className={classe} aria-label="Suporte" title="Suporte">
      <MessageCircle size={20} />
      <span className="hidden xl:inline">Suporte</span>
    </a>
  );
}
