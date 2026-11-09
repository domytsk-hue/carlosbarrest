import type { Funcao } from "./dominio/tipos";

export type { Funcao };

export const ROTULO_FUNCAO: Record<Funcao, string> = {
  dono: "Dono",
  gerente: "Gerente",
  caixa: "Caixa",
  garcom: "Garçom",
  cozinha: "Cozinha",
  entregador: "Entregador",
};
