"use client";

import { useRef, useSyncExternalStore } from "react";
import { estadoInicial, TOTAL_MESAS, VERSAO, type Estado } from "./estado";

// Loja local do modo demonstração: todo o estado vive no navegador
// (localStorage) e sincroniza entre abas — o caixa e o app do garçom abertos
// no mesmo aparelho veem as mesmas mesas em tempo real. Quando o Supabase
// estiver ligado, as ações abaixo passam a gravar no banco.

const CHAVE = "carlos:estado";
type Ouvinte = () => void;

let estado: Estado | null = null;
/** Último texto gravado por esta aba (para perceber gravações de outras abas). */
let ultimoGravado: string | null = null;
const ouvintes = new Set<Ouvinte>();

function carregar(recebido?: string | null): Estado {
  if (typeof window === "undefined") return estadoInicial();
  try {
    const bruto = recebido ?? localStorage.getItem(CHAVE);
    ultimoGravado = bruto;
    if (bruto) {
      const salvo = JSON.parse(bruto) as Estado;
      // Campos novos de versões futuras entram com o valor padrão
      const padrao = estadoInicial();
      return migrar({ ...padrao, ...salvo, config: { ...padrao.config, ...salvo.config }, versao: VERSAO }, salvo.versao ?? 1);
    }
  } catch {}
  return estadoInicial();
}

/**
 * Ajusta dados gravados por versões anteriores:
 * v2 · mesas de 1 a 40 (sem duplicar número) e estoque desligado até março.
 */
function migrar(e: Estado, versaoSalva: number): Estado {
  if (versaoSalva >= 2) return e;
  const numeros = new Set(e.mesas.map((m) => m.numero));
  const faltam = Array.from({ length: TOTAL_MESAS }, (_, i) => i + 1)
    .filter((n) => !numeros.has(n))
    .map((n) => ({ id: `m${n}`, numero: n, area: "Salão", lugares: 4 }))
    .filter((m) => !e.mesas.some((x) => x.id === m.id));
  return {
    ...e,
    mesas: [...e.mesas, ...faltam].sort((a, b) => a.numero - b.numero),
    config: { ...e.config, estoqueAtivo: false },
  };
}

// Gravar no localStorage transforma o estado inteiro em texto, o que pesa
// quando há muitas contas e auditoria. Em vez de gravar a cada tecla ou clique,
// junta as mudanças e grava no máximo uma vez a cada 100 ms (e sempre antes de
// a aba fechar ou ir para segundo plano). A tela atualiza na hora, sem esperar.
const INTERVALO_GRAVACAO = 100;
let gravacaoPendente: ReturnType<typeof setTimeout> | null = null;

function agendarGravacao() {
  if (gravacaoPendente || typeof window === "undefined") return;
  gravacaoPendente = setTimeout(gravarPendente, INTERVALO_GRAVACAO);
}

function gravarPendente() {
  if (gravacaoPendente) {
    clearTimeout(gravacaoPendente);
    gravacaoPendente = null;
    if (estado) salvar(estado);
  }
}

let gravacaoNaSaida = false;
function gravarAoSair() {
  if (gravacaoNaSaida || typeof window === "undefined") return;
  gravacaoNaSaida = true;
  window.addEventListener("pagehide", gravarPendente);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") gravarPendente();
  });
}

function salvar(e: Estado) {
  if (gravacaoPendente) {
    clearTimeout(gravacaoPendente);
    gravacaoPendente = null;
  }
  try {
    const bruto = JSON.stringify(e);
    localStorage.setItem(CHAVE, bruto);
    ultimoGravado = bruto;
  } catch {}
}

export function obterEstado(): Estado {
  if (!estado) {
    estado = carregar();
    base = estado;
    gravarAoSair();
  }
  return estado;
}

// ---------------------------------------------------------------------------
// Sincronização entre abas
// ---------------------------------------------------------------------------
// Duas abas podem gravar quase ao mesmo tempo (ex.: duas mesas pedindo pelo
// QR Code, ou o garçom lançando enquanto o caixa recebe). Quem grava por
// último apagaria o que a outra acabou de fazer. Para evitar isso, cada aba
// guarda o último estado que recebeu da outra (a "base") e faz uma mescla de
// três vias: o que só mudou aqui fica, o que só mudou lá vem, e listas com id
// (contas, itens, chamados...) são mescladas registro a registro.

let base: Estado | null = null;

type ComId = { id: string };
const json = (v: unknown) => JSON.stringify(v);
const ehListaComId = (v: unknown): v is ComId[] =>
  Array.isArray(v) && v.every((x) => typeof x === "object" && x !== null && typeof (x as ComId).id === "string");
const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function mesclarLista(b: ComId[], l: ComId[], r: ComId[]): ComId[] {
  const B = new Map(b.map((x) => [x.id, x]));
  const L = new Map(l.map((x) => [x.id, x]));
  const R = new Set(r.map((x) => x.id));
  // Criados aqui e que a outra aba ainda não tinha
  const novos = l.filter((x) => !R.has(x.id) && !B.has(x.id));
  const res: ComId[] = [];
  for (const x of r) {
    const daqui = L.get(x.id);
    const antes = B.get(x.id);
    if (daqui) res.push(mesclar(antes, daqui, x) as ComId);
    // Apagado aqui e não mexido lá: continua apagado
    else if (!antes || json(antes) !== json(x)) res.push(x);
  }
  return [...novos, ...res];
}

function mesclar(b: unknown, l: unknown, r: unknown): unknown {
  const jl = json(l);
  const jr = json(r);
  if (jl === jr) return r;
  const jb = json(b);
  if (jl === jb) return r; // só a outra aba mudou
  if (jr === jb) return l; // só esta aba mudou
  if (ehListaComId(l) && ehListaComId(r)) return mesclarLista(ehListaComId(b) ? b : [], l, r);
  if (ehObjeto(l) && ehObjeto(r)) {
    const bo = ehObjeto(b) ? b : {};
    const res: Record<string, unknown> = { ...r };
    for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) res[k] = mesclar(bo[k], l[k], r[k]);
    return res;
  }
  // Os dois mudaram o mesmo valor simples: vale o mais recente (o da outra aba)
  return r;
}

/** Junta o estado gravado pela outra aba com o que mudou nesta. */
function sincronizar(recebido?: string | null) {
  const local = estado;
  // Usa o texto que veio no evento: a cópia local do armazenamento pode ainda
  // não ter a gravação da outra aba
  const remoto = carregar(recebido);
  estado = local && base ? (mesclar(base, local, remoto) as Estado) : remoto;
  base = remoto;
  if (json(estado) !== ultimoGravado) salvar(estado);
}

export function atualizar(fn: (e: Estado) => Estado) {
  // Se outra aba gravou e o evento "storage" ainda não chegou, parte do que
  // está gravado (juntando o que é novo aqui).
  if (estado && typeof window !== "undefined") {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto !== null && bruto !== ultimoGravado) sincronizar();
    } catch {}
  }
  estado = fn(obterEstado());
  agendarGravacao();
  ouvintes.forEach((o) => o());
}

let escutandoOutrasAbas = false;
function escutarOutrasAbas() {
  if (escutandoOutrasAbas || typeof window === "undefined") return;
  escutandoOutrasAbas = true;
  window.addEventListener("storage", (ev) => {
    if (ev.key !== CHAVE || ev.newValue === null || ev.newValue === ultimoGravado) return;
    sincronizar(ev.newValue);
    ouvintes.forEach((x) => x());
  });
}

function inscrever(o: Ouvinte) {
  ouvintes.add(o);
  escutarOutrasAbas();
  return () => {
    ouvintes.delete(o);
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
