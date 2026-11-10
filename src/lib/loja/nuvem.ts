"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfigurado } from "../supabase/config";
import { estadoInicial, type Estado } from "./estado";
import { atualizar, mesclar, obterEstado, observarLoja } from "./loja";

// ---------------------------------------------------------------------------
// Sincronização entre aparelhos (Supabase)
// ---------------------------------------------------------------------------
// A loja local (localStorage) só junta as abas de um mesmo aparelho. Para o
// tablet da cozinha, o celular do garçom e o computador do caixa verem as
// mesmas contas, cada registro (uma conta, um produto, um chamado...) é
// gravado na tabela `loja_registros` e as mudanças chegam pelo Realtime.
//
// - Envia só o que mudou, registro a registro, com número de versão: se outro
//   aparelho gravou antes, busca a versão nova, junta as duas (mesma mescla de
//   três vias usada entre abas, que junta os itens de uma conta um a um) e
//   tenta de novo. Assim a cozinha marcando "pronto" não apaga o item que o
//   garçom acabou de lançar na mesma conta.
// - Funciona sem internet: continua gravando no aparelho e envia ao voltar.

type Registro = { colecao: string; id: string; dados: unknown; versao: number; atualizado_em?: string };
type Base = { versao: number; dados: unknown };
export type StatusNuvem = "desligada" | "conectando" | "ok" | "offline";

/** Campos que valem só para este aparelho (caixa em uso, usuário do modo demonstração). */
const LOCAIS = new Set(["versao", "sessaoAtivaId", "usuarioId"]);
/** Listas em que o registro novo entra no começo (mais recente primeiro). */
const NO_COMECO = new Set(["auditoria", "chamados"]);
/** Campos que não são lista ficam na coleção "_" com o nome do campo como id. */
const SOLTOS = "_";
const LOTE = 200;

const SEMENTE = estadoInicial();
const COLECOES = (Object.keys(SEMENTE) as (keyof Estado)[]).filter((k) => !LOCAIS.has(k) && Array.isArray(SEMENTE[k])) as string[];
const CAMPOS = (Object.keys(SEMENTE) as (keyof Estado)[]).filter((k) => !LOCAIS.has(k) && !Array.isArray(SEMENTE[k])) as string[];

const chave = (colecao: string, id: string) => colecao + "\u0000" + id;
const json = (v: unknown) => JSON.stringify(v ?? null);

/** O que o servidor tem de cada registro (a "base" da mescla). */
const bases = new Map<string, Base>();
/** Último objeto conferido de cada registro: evita comparar o que não mudou. */
const conferidos = new Map<string, unknown>();

let sb: SupabaseClient | null = null;
let rid: string | null = null;
let ultimaVista = "";
let status: StatusNuvem = "desligada";
const ouvintesStatus = new Set<() => void>();
let envioAgendado: ReturnType<typeof setTimeout> | null = null;
let enviando = false;
let pronta = false;

function mudarStatus(s: StatusNuvem) {
  if (s === status) return;
  status = s;
  ouvintesStatus.forEach((o) => o());
}

/** Registros do estado local: { chave → [coleção, id, dados] } */
function registrosLocais(e: Estado) {
  const m = new Map<string, [string, string, unknown]>();
  const r = e as unknown as Record<string, unknown>;
  for (const c of COLECOES) for (const x of (r[c] as { id: string }[]) ?? []) m.set(chave(c, x.id), [c, x.id, x]);
  for (const k of CAMPOS) m.set(chave(SOLTOS, k), [SOLTOS, k, r[k]]);
  return m;
}

/** Sequências (número da conta e do pedido) nunca andam para trás. */
function juntar(colecao: string, id: string, base: unknown, local: unknown, remoto: unknown) {
  const res = mesclar(base, local, remoto);
  if (colecao === SOLTOS && id === "seq") {
    const l = (local ?? {}) as Record<string, number>;
    const m = { ...(res as Record<string, number>) };
    for (const k of Object.keys(l)) m[k] = Math.max(m[k] ?? 0, l[k] ?? 0);
    return m;
  }
  return res;
}

/** Aplica registros vindos do servidor no estado local. */
function aplicar(lista: Registro[], primeira = false, conhecidas?: Record<string, number>) {
  const mudancas: { colecao: string; id: string; valor: unknown; apagar: boolean }[] = [];
  const locais = registrosLocais(obterEstado());
  for (const r of lista) {
    const k = chave(r.colecao, r.id);
    if (r.atualizado_em && r.atualizado_em > ultimaVista) ultimaVista = r.atualizado_em;
    const antes = bases.get(k);
    if (antes && antes.versao >= r.versao) continue; // já visto (ou é o eco do que enviamos)
    const local = locais.get(k)?.[2];
    const remoto = r.dados ?? null;
    bases.set(k, { versao: r.versao, dados: remoto });
    if (r.colecao !== SOLTOS && !COLECOES.includes(r.colecao)) continue;
    if (r.colecao === SOLTOS && !CAMPOS.includes(r.id)) continue;

    let valor: unknown;
    if (local === undefined) valor = remoto;
    else if (antes) valor = json(local) === json(antes.dados) ? remoto : juntar(r.colecao, r.id, antes.dados, local, remoto);
    else if (primeira) {
      // Primeira vez deste aparelho: dado de exemplo nunca vence dado real
      const semente = registrosLocais(SEMENTE).get(k)?.[2];
      const remotoEhSemente = semente !== undefined && json(remoto) === json(semente);
      const localEhSemente = semente !== undefined && json(local) === json(semente);
      if (remotoEhSemente && !localEhSemente && remoto !== null) valor = local;
      else if (conhecidas?.[k] === r.versao) valor = local; // nada mudou lá desde a última vez
      else valor = remoto === null ? null : juntar(r.colecao, r.id, undefined, local, remoto);
    } else valor = juntar(r.colecao, r.id, undefined, local, remoto);

    if (json(valor) !== json(local)) mudancas.push({ colecao: r.colecao, id: r.id, valor, apagar: valor === null && r.colecao !== SOLTOS });
  }
  if (!mudancas.length) return;
  atualizar((e) => {
    const novo = { ...e } as unknown as Record<string, unknown>;
    for (const m of mudancas) {
      if (m.colecao === SOLTOS) {
        if (m.valor !== null) novo[m.id] = m.valor;
        continue;
      }
      const atual = (novo[m.colecao] as { id: string }[]) ?? [];
      const i = atual.findIndex((x) => x.id === m.id);
      if (m.apagar) novo[m.colecao] = i < 0 ? atual : atual.filter((x) => x.id !== m.id);
      else if (i >= 0) novo[m.colecao] = atual.map((x, j) => (j === i ? m.valor : x));
      else novo[m.colecao] = NO_COMECO.has(m.colecao) ? [m.valor, ...atual] : [...atual, m.valor];
    }
    return novo as unknown as Estado;
  });
}

/** Registros que mudaram aqui e ainda não estão no servidor. */
function pendentes() {
  const locais = registrosLocais(obterEstado());
  const lista: { k: string; colecao: string; id: string; dados: unknown; versao: number; ref: unknown }[] = [];
  for (const [k, [colecao, id, dados]] of locais) {
    if (conferidos.get(k) === dados) continue;
    const base = bases.get(k);
    if (base && json(base.dados) === json(dados)) {
      conferidos.set(k, dados);
      continue;
    }
    lista.push({ k, colecao, id, dados, versao: base?.versao ?? 0, ref: dados });
  }
  // Apagados aqui (só listas)
  for (const [k, base] of bases) {
    if (base.dados === null || locais.has(k)) continue;
    const [colecao, id] = k.split("\u0000");
    if (colecao === SOLTOS) continue;
    lista.push({ k, colecao, id, dados: null, versao: base.versao, ref: null });
  }
  return lista;
}

function agendarEnvio(ms = 300) {
  if (!pronta || envioAgendado) return;
  envioAgendado = setTimeout(() => {
    envioAgendado = null;
    void enviar();
  }, ms);
}

async function enviar() {
  if (!sb || !rid || enviando) return;
  enviando = true;
  try {
    const lista = pendentes();
    for (let i = 0; i < lista.length; i += LOTE) {
      const lote = lista.slice(i, i + LOTE);
      const { data, error } = await sb.rpc("gravar_registros", {
        rid,
        registros: lote.map(({ colecao, id, dados, versao }) => ({ colecao, id, dados, versao })),
      });
      if (error) throw error;
      const res = data as { gravados: { colecao: string; id: string; versao: number }[]; conflitos: { colecao: string; id: string }[] };
      const porChave = new Map(lote.map((x) => [x.k, x]));
      for (const g of res.gravados) {
        const k = chave(g.colecao, g.id);
        const x = porChave.get(k);
        if (!x) continue;
        const atual = bases.get(k);
        if (!atual || atual.versao < g.versao) bases.set(k, { versao: g.versao, dados: x.dados });
        conferidos.set(k, x.ref);
      }
      // Outro aparelho gravou antes: busca a versão dele e junta
      if (res.conflitos.length) await buscar(res.conflitos);
    }
    salvarVersoes();
    mudarStatus("ok");
  } catch {
    mudarStatus("offline");
    enviando = false;
    agendarEnvio(5000);
    return;
  }
  enviando = false;
  if (pendentes().length) agendarEnvio();
}

async function buscar(quais?: { colecao: string; id: string }[]) {
  if (!sb || !rid) return;
  const todos: Registro[] = [];
  if (quais) {
    const porColecao = new Map<string, string[]>();
    for (const q of quais) porColecao.set(q.colecao, [...(porColecao.get(q.colecao) ?? []), q.id]);
    for (const [colecao, ids] of porColecao) {
      const { data, error } = await sb.from("loja_registros").select("colecao,id,dados,versao,atualizado_em").eq("restaurante_id", rid).eq("colecao", colecao).in("id", ids);
      if (error) throw error;
      todos.push(...(data as Registro[]));
    }
    aplicar(todos);
    return;
  }
  // Tudo o que mudou desde a última vez (com folga de 5 s para relógios)
  const desde = ultimaVista ? new Date(new Date(ultimaVista).getTime() - 5000).toISOString() : null;
  for (let de = 0; ; de += 1000) {
    let q = sb.from("loja_registros").select("colecao,id,dados,versao,atualizado_em").eq("restaurante_id", rid).order("atualizado_em").range(de, de + 999);
    if (desde) q = q.gte("atualizado_em", desde);
    const { data, error } = await q;
    if (error) throw error;
    todos.push(...(data as Registro[]));
    if (!data || data.length < 1000) break;
  }
  aplicar(todos);
}

// Versões já sincronizadas ficam guardadas no aparelho: ao reabrir, sabe o que
// mudou lá fora e o que foi feito aqui sem internet.
const chaveVersoes = () => `carlos:nuvem:${rid}`;
function salvarVersoes() {
  try {
    const v: Record<string, number> = {};
    for (const [k, b] of bases) v[k] = b.versao;
    localStorage.setItem(chaveVersoes(), JSON.stringify(v));
  } catch {}
}
function lerVersoes(): Record<string, number> | undefined {
  try {
    const bruto = localStorage.getItem(chaveVersoes());
    return bruto ? JSON.parse(bruto) : undefined;
  } catch {
    return undefined;
  }
}

/** Liga a sincronização deste aparelho com o restaurante (uma vez por aba). */
export async function iniciarSincronizacao(restauranteId: string) {
  rid = restauranteId;
  mudarStatus("conectando");
  const { criarClienteNavegador } = await import("../supabase/client");
  sb = criarClienteNavegador();

  // Primeira carga completa
  const conhecidas = lerVersoes();
  try {
    const todos: Registro[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await sb.from("loja_registros").select("colecao,id,dados,versao,atualizado_em").eq("restaurante_id", rid).order("atualizado_em").range(de, de + 999);
      if (error) throw error;
      todos.push(...(data as Registro[]));
      if (!data || data.length < 1000) break;
    }
    // Registro que este aparelho já tinha sincronizado e sumiu do servidor não volta
    if (conhecidas) {
      const noServidor = new Set(todos.map((r) => chave(r.colecao, r.id)));
      const sumidos = Object.keys(conhecidas).filter((k) => !noServidor.has(k));
      if (sumidos.length)
        atualizar((e) => {
          const novo = { ...e } as unknown as Record<string, unknown>;
          for (const k of sumidos) {
            const [c, id] = k.split("\u0000");
            if (COLECOES.includes(c)) novo[c] = (novo[c] as { id: string }[]).filter((x) => x.id !== id);
          }
          return novo as unknown as Estado;
        });
    }
    aplicar(todos, true, conhecidas);
    // Aparelho novo entrando num restaurante que já tem dados: o que for só
    // exemplo (e não existe lá) fica de fora, para não ressuscitar o que foi apagado
    if (!conhecidas && todos.length) {
      const noServidor = new Set(todos.map((r) => chave(r.colecao, r.id)));
      const semente = registrosLocais(SEMENTE);
      atualizar((e) => {
        const novo = { ...e } as unknown as Record<string, unknown>;
        for (const c of COLECOES)
          novo[c] = (novo[c] as { id: string }[]).filter((x) => {
            const k = chave(c, x.id);
            return noServidor.has(k) || !semente.has(k) || json(semente.get(k)![2]) !== json(x);
          });
        return novo as unknown as Estado;
      });
    }
    mudarStatus("ok");
  } catch {
    mudarStatus("offline");
  }
  pronta = true;
  agendarEnvio(0);

  sb
    .channel(`loja:${rid}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "loja_registros", filter: `restaurante_id=eq.${rid}` }, (p) => {
      const r = p.new as Registro | undefined;
      if (r && r.colecao) {
        aplicar([r]);
        agendarEnvio();
      }
    })
    .subscribe((s) => {
      if (s === "SUBSCRIBED") {
        mudarStatus("ok");
        // Reconectou: pega o que mudou enquanto estava fora
        buscar().catch(() => mudarStatus("offline"));
        agendarEnvio(0);
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") mudarStatus("offline");
    });

  observarLoja(() => agendarEnvio());
  // Segurança extra: confere de tempos em tempos e ao voltar para a tela
  setInterval(() => buscar().then(() => agendarEnvio()).catch(() => mudarStatus("offline")), 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") buscar().then(() => agendarEnvio()).catch(() => mudarStatus("offline"));
  });
  window.addEventListener("online", () => agendarEnvio(0));
}

/** Liga a sincronização com o servidor (uma vez por aba), se houver restaurante. */
export function useNuvem(restauranteId: string | null | undefined) {
  useEffect(() => {
    if (!supabaseConfigurado || !restauranteId || rid) return;
    void iniciarSincronizacao(restauranteId);
  }, [restauranteId]);
}

/** Estado da sincronização, para mostrar na tela. */
export function useStatusNuvem(): StatusNuvem {
  return useSyncExternalStore(
    (o) => {
      ouvintesStatus.add(o);
      return () => ouvintesStatus.delete(o);
    },
    () => status,
    () => "desligada" as StatusNuvem,
  );
}
