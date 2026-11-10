"use client";

import { useEffect, useState } from "react";
import { supabaseConfigurado } from "./supabase/config";
import { ROTULO_FUNCAO, type Funcao } from "./sessao-rotulos";
export { ROTULO_FUNCAO, type Funcao };

export type Sessao = {
  nome: string;
  funcao: string;
  /** Código da função ("cozinha", "garcom"...); null no modo demonstração ou sem vínculo */
  papel: Funcao | null;
  restaurante: string;
  restauranteId: string | null;
  caixa: string | null;
  demo: boolean;
};

const SESSAO_DEMO: Sessao = {
  nome: "Admin",
  funcao: "Dono",
  papel: null,
  restaurante: "Carlos Bar & Restaurante",
  restauranteId: null,
  caixa: "Caixa 1",
  demo: true,
};

const CHAVE = "carlos:sessao";
/** Função do último login neste aparelho: o tablet da cozinha já abre travado na cozinha. */
const CHAVE_PAPEL = "carlos:papel";

/** Lembra a função do último login deste aparelho (sem esperar o banco). */
export function papelLembrado(): Funcao | null {
  try {
    return (localStorage.getItem(CHAVE_PAPEL) as Funcao) || null;
  } catch {
    return null;
  }
}

// A sessão é carregada uma vez por aba e guardada aqui. Antes, cada clique no
// menu ia ao servidor conferir o login e buscar o restaurante de novo; agora
// as telas do painel abrem direto no navegador e o login é conferido no
// middleware (que bloqueia quem não está logado).
let atual: Sessao | null = supabaseConfigurado ? null : SESSAO_DEMO;
let carregando: Promise<Sessao | null> | null = null;

async function buscar(): Promise<Sessao | null> {
  // Carregado sob demanda para não pesar a abertura das telas
  const { criarClienteNavegador } = await import("./supabase/client");
  const sb = criarClienteNavegador();
  const {
    data: { session },
  } = await sb.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // Mesma pessoa na mesma aba: reaproveita sem consultar o banco
  try {
    const salvo = sessionStorage.getItem(CHAVE);
    if (salvo) {
      const s = JSON.parse(salvo) as Sessao & { userId: string };
      if (s.userId === user.id && "papel" in s) return s;
    }
  } catch {}

  const { data: vinculo } = await sb
    .from("membros")
    .select("funcao, nome_exibicao, restaurantes(id, nome)")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  const restaurante = vinculo?.restaurantes as unknown as { id: string; nome: string } | null;
  const s: Sessao = {
    nome: vinculo?.nome_exibicao ?? user.email ?? "Usuário",
    funcao: vinculo ? ROTULO_FUNCAO[vinculo.funcao as Funcao] : "Sem restaurante",
    papel: (vinculo?.funcao as Funcao | undefined) ?? null,
    restaurante: restaurante?.nome ?? "Nenhum restaurante vinculado",
    restauranteId: restaurante?.id ?? null,
    caixa: null, // Fase 1: controle de caixa
    demo: false,
  };
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify({ ...s, userId: user.id }));
    localStorage.setItem(CHAVE_PAPEL, s.papel ?? "");
  } catch {}
  return s;
}

/** Usuário logado e restaurante ativo (primeiro vínculo do usuário). Null enquanto carrega. */
export function useSessao(): Sessao | null {
  const [sessao, setSessao] = useState(atual);
  useEffect(() => {
    if (atual) return;
    carregando ??= buscar()
      .then((s) => (atual = s))
      .finally(() => (carregando = null));
    let vivo = true;
    carregando.then((s) => {
      if (!vivo) return;
      if (s) setSessao(s);
      // Login venceu nesta aba: volta para a tela de entrada
      else window.location.assign("/login");
    });
    return () => {
      vivo = false;
    };
  }, []);
  return sessao;
}

/** Esquece a sessão guardada (ex.: depois de entrar com outro usuário). */
export function limparSessao() {
  atual = supabaseConfigurado ? null : SESSAO_DEMO;
  try {
    sessionStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE_PAPEL);
  } catch {}
}

/** Sai do sistema neste aparelho e volta para a tela de entrada. */
export async function sair() {
  if (supabaseConfigurado) {
    const { criarClienteNavegador } = await import("./supabase/client");
    await criarClienteNavegador().auth.signOut();
  }
  limparSessao();
  window.location.assign("/login");
}
