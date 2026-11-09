"use client";

import clsx from "clsx";
import { Download } from "lucide-react";
import { brl } from "@/lib/dominio/calculos";
import { baixarCsv } from "@/lib/dominio/indicadores";
import { Botao, Tabela } from "./ui";

export function Exportar({ nome, cab, linhas }: { nome: string; cab: string[]; linhas: (string | number)[][] }) {
  return (
    <Botao variante="secundario" tamanho="sm" onClick={() => baixarCsv(nome, cab, linhas)}>
      <Download size={15} /> Excel
    </Botao>
  );
}

/** Tabela de relatório: colunas numéricas (exceto a primeira) saem em reais, menos contagens inteiras. */
export function Rel({ cab, linhas, nome }: { cab: string[]; linhas: (string | number)[][]; nome: string }) {
  const fmt = (v: string | number, i: number) => (typeof v !== "number" ? v : cab[i].includes("%") ? `${v.toFixed(1).replace(".", ",")}%` : Number.isInteger(v) && !/valor|total|vend|gasto|taxa|serviço|suprim|sangr|desp|repass|crédito|ticket/i.test(cab[i]) ? String(v) : brl(v));
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Exportar nome={nome} cab={cab} linhas={linhas} />
      </div>
      <Tabela colunas={cab.map((c, i) => ({ rotulo: c, direita: i > 0 && typeof linhas[0]?.[i] === "number" }))} vazio="Sem dados no período.">
        {linhas.map((l, k) => (
          <tr key={k}>
            {l.map((v, i) => (
              <td key={i} className={clsx("px-3 py-2.5", typeof v === "number" && i > 0 && "num text-right")}>
                {fmt(v, i)}
              </td>
            ))}
          </tr>
        ))}
      </Tabela>
    </div>
  );
}
