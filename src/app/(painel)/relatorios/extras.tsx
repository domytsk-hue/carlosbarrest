"use client";

import type { Periodo } from "@/lib/dominio/indicadores";

/** Relatórios acrescentados pelas fases seguintes (estoque, financeiro, DRE...). */
export const RELATORIOS_EXTRAS: { nome: string; Componente: (p: { periodo: Periodo }) => React.ReactNode }[] = [];
