"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useEffect, useState } from "react";
import { descreverAparelho, idDoAparelho } from "@/lib/dispositivo";
import { registrarDispositivo } from "@/lib/loja/acoes";
import { MODULOS } from "@/lib/modulos";
import { useAtalhos } from "./use-atalhos";
import { StatusBar } from "./status-bar";
import { SupportButton } from "./support-button";
import { ThemeToggle } from "./theme-toggle";
import { AreaImpressao } from "../impressao";
import { AberturaCaixa } from "./abertura-caixa";
import { AvisoProntos } from "./aviso-prontos";
import { CascaCozinha } from "./casca-cozinha";
import { usePapel } from "./use-papel";

function ativo(pathname: string, slug: string) {
  return slug === "" ? pathname === "/" : pathname === "/" + slug || pathname.startsWith("/" + slug + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Quem entra com a função "cozinha" só vê o painel da cozinha
  const papel = usePapel();
  const soCozinha = papel === "cozinha";
  useEffect(() => {
    if (soCozinha && pathname !== "/cozinha") router.replace("/cozinha");
  }, [soCozinha, pathname, router]);
  const [menuAberto, setMenuAberto] = useState(false);
  // No computador o menu lateral pode ser recolhido (só ícones); a escolha fica salva neste aparelho
  const [recolhido, setRecolhido] = useState(false);
  useEffect(() => setRecolhido(document.documentElement.dataset.menu === "recolhido"), []);
  const alternarMenu = () => {
    const novo = !recolhido;
    if (novo) document.documentElement.dataset.menu = "recolhido";
    else delete document.documentElement.dataset.menu;
    try {
      localStorage.setItem("menu", novo ? "recolhido" : "aberto");
    } catch {}
    setRecolhido(novo);
  };
  useAtalhos(!soCozinha);
  // Anota este aparelho na lista de dispositivos (Configurações → Dispositivos)
  useEffect(() => {
    const id = idDoAparelho();
    if (id) registrarDispositivo(id, descreverAparelho());
  }, []);
  // Fecha o menu do celular ao trocar de tela e com a tecla Esc
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);
  useEffect(() => {
    if (!menuAberto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [menuAberto]);

  const rapidos = MODULOS.filter((m) => m.rapido);

  if (soCozinha) return <CascaCozinha>{pathname === "/cozinha" ? children : null}</CascaCozinha>;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--largura-menu)_1fr] lg:transition-[grid-template-columns]">
      {/* Menu lateral */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-card shadow-flutuante transition-transform lg:sticky lg:top-0 lg:h-dvh lg:w-auto lg:translate-x-0 lg:shadow-none lg:border-r lg:border-linha",
          menuAberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 lg:recolhido:flex-col lg:recolhido:gap-2 lg:recolhido:px-2">
          <Link href="/" onClick={() => setMenuAberto(false)} aria-label="Início" className="lg:recolhido:hidden">
            <Image src="/logo.svg" alt="Carlos Bar & Restaurante" width={150} height={100} priority className="logo-marca h-auto w-[150px] drop-shadow-[0_2px_4px_rgba(80,30,10,.15)]" />
          </Link>
          <button className="lg:hidden rounded-full p-2 text-mudo" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
            <X size={20} />
          </button>
          <button
            className="hidden rounded-full p-2 text-mudo hover:bg-secundario/60 hover:text-tinta lg:block"
            onClick={alternarMenu}
            title={recolhido ? "Expandir menu" : "Recolher menu"}
            aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
          >
            {recolhido ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 lg:recolhido:px-2">
          {MODULOS.map((m) => {
            const Icone = m.icone;
            const on = ativo(pathname, m.slug);
            return (
              <Link
                key={m.slug}
                href={"/" + m.slug}
                onClick={() => setMenuAberto(false)}
                title={m.desabilitado ?? (recolhido ? (m.atalho ? `${m.rotulo} (${m.atalho})` : m.rotulo) : undefined)}
                aria-label={m.rotulo}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-medium transition-colors lg:recolhido:justify-center",
                  on ? "bg-rosado text-acao font-semibold" : "text-tinta hover:bg-secundario/60",
                  m.desabilitado && !on && "opacity-50",
                )}
              >
                <Icone size={19} strokeWidth={on ? 2.3 : 1.8} />
                <span className="flex-1 lg:recolhido:hidden">{m.rotulo}</span>
                {m.desabilitado && <span className="lg:recolhido:hidden rounded-full bg-secundario px-2 py-0.5 text-[10px] font-semibold text-mudo">desligado</span>}
                {m.atalho && <kbd className="lg:recolhido:hidden text-[10.5px] font-medium text-mudo">{m.atalho}</kbd>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-linha px-5 py-3 lg:recolhido:px-2 lg:recolhido:[&_button]:justify-center lg:recolhido:[&_span]:hidden">
          <ThemeToggle />
        </div>
      </aside>
      {menuAberto && <div className="fixed inset-0 z-30 bg-[rgba(40,15,8,.45)] lg:hidden" onClick={() => setMenuAberto(false)} />}

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Barra de acesso rápido */}
        <header className="sticky top-0 z-20 bg-fundo/95 backdrop-blur px-3 pt-3 pb-2 sm:px-5">
          <div className="flex items-center gap-2 rounded-[20px] bg-card p-2 shadow-card">
            <button className="lg:hidden rounded-full p-2.5 text-tinta" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
              <Menu size={22} />
            </button>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
              {rapidos.map((m) => {
                const Icone = m.icone;
                const on = ativo(pathname, m.slug);
                return (
                  <Link
                    key={m.slug}
                    href={"/" + m.slug}
                    title={m.atalho ? `${m.rotulo} (${m.atalho})` : m.rotulo}
                    className={clsx(
                      "flex min-w-[68px] flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11.5px] font-medium transition-colors",
                      on ? "bg-rosado-forte text-acao font-semibold ring-[1.5px] ring-inset ring-[#E8A895]" : "text-tinta hover:bg-secundario/60",
                    )}
                  >
                    <Icone size={21} strokeWidth={on ? 2.3 : 1.8} />
                    <span className="whitespace-nowrap">{m.rotulo}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 pb-24 pt-2 sm:px-5">{children}</main>

        <StatusBar />
      </div>

      <AberturaCaixa />
      <AvisoProntos />
      <SupportButton />
      <AreaImpressao />
    </div>
  );
}
