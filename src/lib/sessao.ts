import { supabaseConfigurado } from "./supabase/config";
import { criarClienteServidor } from "./supabase/server";

export type Funcao = "dono" | "gerente" | "caixa" | "garcom" | "cozinha" | "entregador";

export const ROTULO_FUNCAO: Record<Funcao, string> = {
  dono: "Dono",
  gerente: "Gerente",
  caixa: "Caixa",
  garcom: "Garçom",
  cozinha: "Cozinha",
  entregador: "Entregador",
};

export type Sessao = {
  nome: string;
  funcao: string;
  restaurante: string;
  restauranteId: string | null;
  caixa: string | null;
  demo: boolean;
};

const SESSAO_DEMO: Sessao = {
  nome: "Admin",
  funcao: "Dono",
  restaurante: "Carlo's Bar & Restaurante",
  restauranteId: null,
  caixa: "Caixa 1",
  demo: true,
};

/** Carrega o usuário logado e o restaurante ativo (primeiro vínculo do usuário). */
export async function obterSessao(): Promise<Sessao | null> {
  if (!supabaseConfigurado) return SESSAO_DEMO;

  const sb = await criarClienteServidor();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: vinculo } = await sb
    .from("membros")
    .select("funcao, nome_exibicao, restaurantes(id, nome)")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  const restaurante = vinculo?.restaurantes as unknown as { id: string; nome: string } | null;
  return {
    nome: vinculo?.nome_exibicao ?? user.email ?? "Usuário",
    funcao: vinculo ? ROTULO_FUNCAO[vinculo.funcao as Funcao] : "Sem restaurante",
    restaurante: restaurante?.nome ?? "Nenhum restaurante vinculado",
    restauranteId: restaurante?.id ?? null,
    caixa: null, // Fase 1: controle de caixa
    demo: false,
  };
}
