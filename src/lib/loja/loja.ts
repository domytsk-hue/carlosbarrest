"use client";

import { useRef, useSyncExternalStore } from "react";
import { estadoInicial, VERSAO, type Estado } from "./estado";

// Loja local do modo demonstração: todo o estado vive no navegador
// (localStorage) e sincroniza entre abas — o caixa e o app do garçom abertos
// no mesmo aparelho veem as mesmas mesas em tempo real. Quando o Supabase
// estiver ligado, as ações abaixo passam a gravar no banco.

const CHAVE = "carlos:estado";
type Ouvinte = () => void;

let estado: Estado | null = null;
const ouvintes = new Set<Ouvinte>();

function carregar(): Estado {
  if (typeof window === "undefined") return estadoInicial();
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const salvo = JSON.parse(bruto) as Estado;
      // Campos novos de versões futuras entram com o valor padrão
      return { ...estadoInicial(), ...salvo, config: { ...estadoInicial().config, ...salvo.config }, versao: VERSAO };
    }
  } catch {}
  return estadoInicial();
}

function salvar(e: Estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch {}
}

export function obterEstado(): Estado {
  if (!estado) estado = carregar();
  return estado;
}

export function atualizar(fn: (e: Estado) => Estado) {
  estado = fn(obterEstado());
  salvar(estado);
  ouvintes.forEach((o) => o());
}

function inscrever(o: Ouvinte) {
  ouvintes.add(o);
  const aoArmazenar = (ev: StorageEvent) => {
    if (ev.key !== CHAVE) return;
    estado = carregar();
    ouvintes.forEach((x) => x());
  };
  window.addEventListener("storage", aoArmazenar);
  return () => {
    ouvintes.delete(o);
    window.removeEventListener("storage", aoArmazenar);
  };
}

const servidor = estadoInicial();

/** Lê uma fatia do estado e re-renderiza quando ela muda. */
export function useLoja<T>(seletor: (e: Estado) => T): T {
  // Memoiza por (estado, seletor) para que listas filtradas não mudem de
  // referência a cada leitura do React.
  const cache = useRef<{ e: Estado | null; s: unknown; v: T } | null>(null);
  const ler = (e: Estado) => {
    const c = cache.current;
    if (c && c.e === e && c.s === seletor) return c.v;
    const v = seletor(e);
    cache.current = { e, s: seletor, v };
    return v;
  };
  return useSyncExternalStore(
    inscrever,
    () => ler(obterEstado()),
    () => ler(servidor),
  );
}

export function reiniciarDemonstracao() {
  estado = estadoInicial();
  salvar(estado);
  ouvintes.forEach((o) => o());
}

export const novoId = (prefixo = "") => prefixo + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
