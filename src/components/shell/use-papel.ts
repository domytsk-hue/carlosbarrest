"use client";

import { useEffect, useState } from "react";
import { useNuvem } from "@/lib/loja/nuvem";
import { papelLembrado, useSessao, type Funcao } from "@/lib/sessao";

/**
 * Função de quem está logado ("cozinha", "garcom"...). Enquanto a sessão
 * carrega, usa a função do último login neste aparelho, para o tablet da
 * cozinha não mostrar o painel completo nem por um instante.
 * Também liga a sincronização com os outros aparelhos do restaurante.
 */
export function usePapel(): Funcao | null {
  const sessao = useSessao();
  useNuvem(sessao?.restauranteId);
  const [lembrado, setLembrado] = useState<Funcao | null>(null);
  useEffect(() => setLembrado(papelLembrado()), []);
  if (sessao && !sessao.demo) return sessao.papel;
  return lembrado;
}
