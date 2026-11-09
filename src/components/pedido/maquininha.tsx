"use client";

import type { Conta } from "@/lib/dominio/tipos";

/** Registro da integração com maquininha (preenchido na Fase 4 pela Stone). */
export const MAQUININHA: {
  Componente?: React.ComponentType<{ conta: Conta; tipo: "credito" | "debito"; valor: number; aoConfirmar: (referencia?: string) => void }>;
} = {};
