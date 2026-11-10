"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Botao, Campo, Entrada, EntradaValor, Modal, Selecao, Tabela } from "./ui";

export type CampoDef<T> = {
  chave: keyof T & string;
  rotulo: string;
  tipo?: "texto" | "numero" | "valor" | "opcao" | "booleano";
  opcoes?: { valor: string; rotulo: string }[];
  /** Renderização na tabela */
  exibir?: (item: T) => React.ReactNode;
  naTabela?: boolean;
  direita?: boolean;
  obrigatorio?: boolean;
  /** false = só aparece na tabela */
  formulario?: boolean;
  /** Controle próprio no formulário (ocupa a linha inteira), no lugar da entrada padrão */
  editor?: (item: T, aoMudar: (v: unknown) => void) => React.ReactNode;
};

/** Cadastro genérico: tabela + formulário em modal. */
export function EditorLista<T extends { id: string }>({
  titulo,
  itens,
  campos,
  novo,
  aoSalvar,
  aoExcluir,
  busca,
}: {
  titulo: string;
  itens: T[];
  campos: CampoDef<T>[];
  novo: () => T;
  aoSalvar: (item: T) => void;
  aoExcluir?: (item: T) => void;
  busca?: (item: T, q: string) => boolean;
}) {
  const [editando, setEditando] = useState<T | null>(null);
  const [q, setQ] = useState("");
  const lista = busca && q ? itens.filter((i) => busca(i, q.toLowerCase())) : itens;
  const visiveis = campos.filter((c) => c.naTabela !== false);
  const valido = editando && campos.every((c) => !c.obrigatorio || (editando[c.chave] !== "" && editando[c.chave] !== undefined));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {busca && <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar em ${titulo.toLowerCase()}`} className="max-w-xs" />}
        <span className="flex-1 text-[12.5px] text-mudo">{lista.length} registro(s)</span>
        <Botao tamanho="sm" onClick={() => setEditando(novo())}>
          <Plus size={16} /> Novo
        </Botao>
      </div>
      <Tabela colunas={[...visiveis.map((c) => ({ rotulo: c.rotulo, direita: c.direita })), { rotulo: "", direita: true }]}>
        {lista.map((item) => (
          <tr key={item.id} className="hover:bg-fundo/60">
            {visiveis.map((c) => (
              <td key={c.chave} className={`px-3 py-2.5 ${c.direita ? "num text-right" : ""}`}>
                {c.exibir ? c.exibir(item) : c.tipo === "booleano" ? (item[c.chave] ? "Sim" : "Não") : c.opcoes ? c.opcoes.find((o) => o.valor === String(item[c.chave]))?.rotulo : String(item[c.chave] ?? "")}
              </td>
            ))}
            <td className="whitespace-nowrap px-3 py-2 text-right">
              <button onClick={() => setEditando(item)} className="rounded-full p-2 text-mudo hover:bg-rosado hover:text-acao" aria-label="Editar">
                <Pencil size={15} />
              </button>
              {aoExcluir && (
                <button onClick={() => confirm("Excluir este registro?") && aoExcluir(item)} className="rounded-full p-2 text-mudo hover:bg-rosado hover:text-st-cancelado" aria-label="Excluir">
                  <Trash2 size={15} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </Tabela>
      <Modal aberto={!!editando} aoFechar={() => setEditando(null)} titulo={titulo}>
        {editando && (
          <div className="grid gap-3 sm:grid-cols-2">
            {campos.filter((c) => c.formulario !== false).map((c) => {
              const v = editando[c.chave] as unknown;
              const set = (nv: unknown) => setEditando({ ...editando, [c.chave]: nv });
              if (c.editor)
                // div em vez de <label>: o controle próprio pode ter vários botões e entradas
                return (
                  <div key={c.chave} className="sm:col-span-2">
                    <span className="mb-1.5 block text-[12.5px] font-semibold">{c.rotulo + (c.obrigatorio ? " *" : "")}</span>
                    {c.editor(editando, set)}
                  </div>
                );
              return (
                <Campo key={c.chave} rotulo={c.rotulo + (c.obrigatorio ? " *" : "")} className={c.tipo === "texto" || !c.tipo ? "sm:col-span-2" : ""}>
                  {c.tipo === "opcao" ? (
                    <Selecao value={String(v ?? "")} onChange={(e) => set(e.target.value)}>
                      {c.opcoes?.map((o) => (
                        <option key={o.valor} value={o.valor}>
                          {o.rotulo}
                        </option>
                      ))}
                    </Selecao>
                  ) : c.tipo === "booleano" ? (
                    <Selecao value={v ? "1" : "0"} onChange={(e) => set(e.target.value === "1")}>
                      <option value="1">Sim</option>
                      <option value="0">Não</option>
                    </Selecao>
                  ) : c.tipo === "valor" ? (
                    <EntradaValor valor={Number(v ?? 0)} aoMudar={set} />
                  ) : c.tipo === "numero" ? (
                    <Entrada type="number" value={String(v ?? "")} onChange={(e) => set(Number(e.target.value))} />
                  ) : (
                    <Entrada value={String(v ?? "")} onChange={(e) => set(e.target.value)} />
                  )}
                </Campo>
              );
            })}
            <Botao
              className="sm:col-span-2"
              disabled={!valido}
              onClick={() => {
                aoSalvar(editando);
                setEditando(null);
              }}
            >
              Salvar
            </Botao>
          </div>
        )}
      </Modal>
    </div>
  );
}
