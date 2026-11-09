"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [escuro, setEscuro] = useState(false);
  useEffect(() => setEscuro(document.documentElement.dataset.theme === "dark"), []);

  const alternar = () => {
    const novo = escuro ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    try {
      localStorage.setItem("tema", novo);
    } catch {}
    setEscuro(!escuro);
  };

  return (
    <button onClick={alternar} className="flex w-full items-center gap-2 text-[13px] font-medium text-mudo hover:text-tinta">
      {escuro ? <Sun size={17} /> : <Moon size={17} />}
      {escuro ? "Modo claro" : "Modo escuro"}
    </button>
  );
}
