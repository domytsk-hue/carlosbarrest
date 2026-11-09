import { MessageCircle } from "lucide-react";

/** Botão de suporte flutuante, presente em todas as telas. */
export function SupportButton() {
  return (
    <a
      href={process.env.NEXT_PUBLIC_SUPORTE_URL ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-14 right-4 z-30 flex items-center gap-2 rounded-full bg-acao px-4 py-3 text-[13px] font-bold text-white shadow-botao transition-transform hover:scale-[1.03]"
    >
      <MessageCircle size={18} />
      Suporte
    </a>
  );
}
