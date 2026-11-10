"use client";

import clsx from "clsx";
import Image from "next/image";
import { Printer, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { CampoFoto } from "@/components/campo-foto";
import { EditorLista } from "@/components/editor-lista";
import { imprimir } from "@/components/impressao";
import { Botao, Pilula, Titulo } from "@/components/ui";
import { brl } from "@/lib/dominio/calculos";
import type { Produto } from "@/lib/dominio/tipos";
import { excluirRegistro, salvarRegistro } from "@/lib/loja/cadastros";
import { useLoja } from "@/lib/loja/loja";

export default function ProdutosPage() {
  const produtos = useLoja((e) => e.produtos);
  const categorias = useLoja((e) => e.categorias);
  const [cat, setCat] = useState<string>("todas");
  const lista = cat === "todas" ? produtos : produtos.filter((p) => p.categoriaId === cat);

  return (
    <div className="mx-auto max-w-[1200px]">
      <Titulo
        sub={`${produtos.length} produtos em ${categorias.length} categorias`}
        acoes={
          <Botao
            variante="secundario"
            onClick={() =>
              imprimir({
                tipo: "texto",
                titulo: "Tabela de preços",
                linhas: lista.filter((p) => p.ativo).map((p) => [`${p.codigo} ${p.nome}`, brl(p.preco)]),
              })
            }
          >
            <Printer size={17} /> Imprimir preços
          </Botao>
        }
      >
        Produtos
      </Titulo>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[{ id: "todas", nome: "Todas" }, ...categorias].map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={clsx("whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold", c.id === cat ? "border-tinta bg-tinta text-fundo" : "border-linha bg-card")}>
            {c.nome}
          </button>
        ))}
      </div>
      <EditorLista<Produto>
        titulo="Produto"
        itens={lista}
        busca={(p, q) => p.nome.toLowerCase().includes(q) || p.codigo === q}
        novo={() => ({ id: "", codigo: String(100 + produtos.length + 1), categoriaId: cat === "todas" ? categorias[0]?.id : cat, nome: "", preco: 0, setor: "cozinha", ativo: true, noDelivery: true })}
        aoSalvar={(p) => salvarRegistro("produtos", p)}
        aoExcluir={(p) => excluirRegistro("produtos", p.id)}
        campos={[
          {
            chave: "nome",
            rotulo: "Produto",
            obrigatorio: true,
            exibir: (p) => (
              <span className="flex items-center gap-2.5">
                {p.foto ? <Image src={p.foto} alt="" width={40} height={40} className="h-10 w-10 rounded-xl bg-white object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-icone-fundo text-mudo"><UtensilsCrossed size={16} /></span>}
                <span>
                  <b className="font-semibold">{p.nome}</b>
                  <span className="block text-[11.5px] text-mudo">
                    {categorias.find((c) => c.id === p.categoriaId)?.nome} · cód. {p.codigo}
                  </span>
                </span>
              </span>
            ),
          },
          { chave: "categoriaId", rotulo: "Categoria", tipo: "opcao", opcoes: categorias.map((c) => ({ valor: c.id, rotulo: c.nome })), naTabela: false },
          { chave: "preco", rotulo: "Preço", tipo: "valor", direita: true, exibir: (p) => <b>{brl(p.preco)}</b> },
          { chave: "codigo", rotulo: "Código", naTabela: false, tipo: "numero" },
          { chave: "setor", rotulo: "Setor de preparo", tipo: "opcao", opcoes: [{ valor: "cozinha", rotulo: "Cozinha" }, { valor: "bar", rotulo: "Bar" }] },
          { chave: "ativo", rotulo: "Ativo", tipo: "booleano", exibir: (p) => (p.ativo ? <Pilula cor="verde">Ativo</Pilula> : <Pilula>Inativo</Pilula>) },
          { chave: "noDelivery", rotulo: "No delivery", tipo: "booleano" },
          { chave: "porKg", rotulo: "Vendido por quilo (balança)", tipo: "booleano", naTabela: false },
          { chave: "precoDelivery", rotulo: "Preço no delivery (opcional)", tipo: "valor", naTabela: false },
          { chave: "descricao", rotulo: "Descrição", naTabela: false },
          {
            chave: "foto",
            rotulo: "Foto",
            naTabela: false,
            editor: (p, set) => <CampoFoto valor={p.foto} aoMudar={set} produto={p} />,
          },
        ]}
      />
    </div>
  );
}
