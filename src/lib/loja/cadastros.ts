"use client";

import type { Estado } from "./estado";
import { atualizar, novoId } from "./loja";

type Listas = {
  [K in keyof Estado as Estado[K] extends { id: string }[] ? K : never]: Estado[K];
};
type ListaChave = keyof Listas & string;

/** Insere ou atualiza um registro em qualquer lista de cadastro. */
export function salvarRegistro<K extends ListaChave>(lista: K, item: Listas[K][number]) {
  atualizar((e) => {
    const atual = (e as unknown as Record<string, { id: string }[]>)[lista];
    const it = item as { id: string };
    const existe = it.id && atual.some((x) => x.id === it.id);
    return { ...e, [lista]: existe ? atual.map((x) => (x.id === it.id ? it : x)) : [...atual, { ...it, id: it.id || novoId() }] };
  });
}

export function excluirRegistro(lista: ListaChave, id: string) {
  atualizar((e) => ({ ...e, [lista]: (e as unknown as Record<string, { id: string }[]>)[lista].filter((x) => x.id !== id) }));
}
