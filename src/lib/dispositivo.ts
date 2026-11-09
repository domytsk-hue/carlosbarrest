"use client";

const CHAVE = "carlos:aparelho";

/** Identificador fixo deste aparelho (gerado no primeiro acesso e guardado no navegador). */
export function idDoAparelho(): string {
  try {
    let id = localStorage.getItem(CHAVE);
    if (!id) {
      id = "ap" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      localStorage.setItem(CHAVE, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Descrição curta do aparelho para o administrador reconhecer na lista. */
export function descreverAparelho(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const so = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone/iPad" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "Outro";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return `${so} · ${nav}`;
}
