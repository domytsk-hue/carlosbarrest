"use client";

import clsx from "clsx";
import { useState } from "react";
import { EditorLista } from "@/components/editor-lista";
import { Pilula, Titulo } from "@/components/ui";
import { brl } from "@/lib/dominio/calculos";
import { ROTULO_GRUPO } from "@/lib/dominio/financeiro";
import type { Bairro, Caixa, Categoria, Cliente, FormaPagamento, Fornecedor, Funcionario, Mesa, PlanoConta } from "@/lib/dominio/tipos";
import { excluirRegistro, salvarRegistro } from "@/lib/loja/cadastros";
import { useLoja } from "@/lib/loja/loja";
import { ROTULO_FUNCAO } from "@/lib/sessao-rotulos";

const ABAS = ["Clientes", "Fornecedores", "Funcionários", "Categorias", "Mesas", "Bairros", "Formas de pagamento", "Plano de contas", "Caixas"] as const;

export default function CadastrosPage() {
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Clientes");
  const e = useLoja((x) => x);

  return (
    <div className="mx-auto max-w-[1200px]">
      <Titulo sub="Tudo o que o restaurante precisa cadastrar uma vez">Cadastros</Titulo>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {ABAS.map((a) => (
          <button key={a} onClick={() => setAba(a)} className={clsx("whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold", a === aba ? "border-tinta bg-tinta text-fundo" : "border-linha bg-card")}>
            {a}
          </button>
        ))}
      </div>

      {aba === "Clientes" && (
        <EditorLista<Cliente>
          titulo="Cliente"
          itens={e.clientes}
          busca={(c, q) => c.nome.toLowerCase().includes(q) || c.telefone.includes(q)}
          novo={() => ({ id: "", nome: "", telefone: "", enderecos: [], credito: 0, criadoEm: new Date().toISOString() })}
          aoSalvar={(c) => salvarRegistro("clientes", c)}
          aoExcluir={(c) => excluirRegistro("clientes", c.id)}
          campos={[
            { chave: "nome", rotulo: "Nome", obrigatorio: true },
            { chave: "telefone", rotulo: "Telefone", obrigatorio: true },
            { chave: "enderecos", rotulo: "Endereços", formulario: false, exibir: (c) => c.enderecos.map((x) => `${x.rua}, ${x.numero}`).join(" · ") || "—" },
            { chave: "credito", rotulo: "Crédito / fiado", tipo: "valor", direita: true, exibir: (c) => <span className={c.credito < 0 ? "text-st-cancelado" : ""}>{brl(c.credito)}</span> },
          ]}
        />
      )}

      {aba === "Funcionários" && (
        <EditorLista<Funcionario>
          titulo="Funcionário"
          itens={e.funcionarios}
          novo={() => ({ id: "", nome: "", funcao: "garcom", comissao: 0, ativo: true })}
          aoSalvar={(f) => salvarRegistro("funcionarios", f)}
          aoExcluir={(f) => excluirRegistro("funcionarios", f.id)}
          campos={[
            { chave: "nome", rotulo: "Nome", obrigatorio: true },
            { chave: "funcao", rotulo: "Função", tipo: "opcao", opcoes: Object.entries(ROTULO_FUNCAO).map(([valor, rotulo]) => ({ valor, rotulo })) },
            { chave: "comissao", rotulo: "Comissão (% do serviço ou R$ por entrega)", tipo: "valor", direita: true },
            { chave: "ativo", rotulo: "Ativo", tipo: "booleano", exibir: (f) => (f.ativo ? <Pilula cor="verde">Ativo</Pilula> : <Pilula>Inativo</Pilula>) },
          ]}
        />
      )}

      {aba === "Categorias" && (
        <EditorLista<Categoria>
          titulo="Categoria"
          itens={e.categorias}
          novo={() => ({ id: "", nome: "" })}
          aoSalvar={(c) => salvarRegistro("categorias", c)}
          aoExcluir={(c) => excluirRegistro("categorias", c.id)}
          campos={[
            { chave: "nome", rotulo: "Nome", obrigatorio: true },
            { chave: "icone", rotulo: "Ícone (endereço da imagem)", naTabela: false },
          ]}
        />
      )}

      {aba === "Mesas" && (
        <EditorLista<Mesa>
          titulo="Mesa"
          itens={e.mesas}
          novo={() => ({ id: "", numero: (e.mesas.at(-1)?.numero ?? 0) + 1, area: "Salão", lugares: 4 })}
          aoSalvar={(m) => salvarRegistro("mesas", m)}
          aoExcluir={(m) => excluirRegistro("mesas", m.id)}
          campos={[
            { chave: "numero", rotulo: "Número", tipo: "numero", obrigatorio: true },
            { chave: "area", rotulo: "Área do salão", obrigatorio: true },
            { chave: "lugares", rotulo: "Lugares", tipo: "numero" },
          ]}
        />
      )}

      {aba === "Bairros" && (
        <EditorLista<Bairro>
          titulo="Bairro"
          itens={e.bairros}
          busca={(b, q) => b.nome.toLowerCase().includes(q)}
          novo={() => ({ id: "", nome: "", taxa: 0 })}
          aoSalvar={(b) => salvarRegistro("bairros", b)}
          aoExcluir={(b) => excluirRegistro("bairros", b.id)}
          campos={[
            { chave: "nome", rotulo: "Bairro", obrigatorio: true },
            { chave: "taxa", rotulo: "Taxa de entrega", tipo: "valor", direita: true, exibir: (b) => brl(b.taxa) },
          ]}
        />
      )}

      {aba === "Formas de pagamento" && (
        <EditorLista<FormaPagamento>
          titulo="Forma de pagamento"
          itens={e.formasPagamento}
          novo={() => ({ id: "", nome: "", tipo: "credito", taxa: 0, prazoDias: 0, ativo: true })}
          aoSalvar={(f) => salvarRegistro("formasPagamento", f)}
          aoExcluir={(f) => excluirRegistro("formasPagamento", f.id)}
          campos={[
            { chave: "nome", rotulo: "Nome", obrigatorio: true },
            {
              chave: "tipo",
              rotulo: "Tipo",
              tipo: "opcao",
              opcoes: [
                { valor: "dinheiro", rotulo: "Dinheiro" },
                { valor: "pix", rotulo: "Pix" },
                { valor: "credito", rotulo: "Cartão de crédito" },
                { valor: "debito", rotulo: "Cartão de débito" },
                { valor: "voucher", rotulo: "Voucher / vale-refeição" },
                { valor: "credito_cliente", rotulo: "Crédito do cliente" },
                { valor: "fiado", rotulo: "Fiado" },
              ],
            },
            { chave: "taxa", rotulo: "Taxa (%)", tipo: "valor", direita: true, exibir: (f) => `${f.taxa.toString().replace(".", ",")}%` },
            { chave: "prazoDias", rotulo: "Recebe em (dias)", tipo: "numero", direita: true },
            { chave: "ativo", rotulo: "Ativa", tipo: "booleano" },
          ]}
        />
      )}

      {aba === "Fornecedores" && (
        <EditorLista<Fornecedor>
          titulo="Fornecedor"
          itens={e.fornecedores}
          busca={(f, q) => f.nome.toLowerCase().includes(q) || f.documento.includes(q)}
          novo={() => ({ id: "", nome: "", documento: "", telefone: "" })}
          aoSalvar={(f) => salvarRegistro("fornecedores", f)}
          aoExcluir={(f) => excluirRegistro("fornecedores", f.id)}
          campos={[
            { chave: "nome", rotulo: "Nome", obrigatorio: true },
            { chave: "documento", rotulo: "CNPJ / CPF" },
            { chave: "telefone", rotulo: "Telefone" },
            { chave: "email", rotulo: "E-mail" },
          ]}
        />
      )}

      {aba === "Plano de contas" && (
        <EditorLista<PlanoConta>
          titulo="Conta do plano"
          itens={e.planoContas}
          novo={() => ({ id: "", nome: "", tipo: "despesa", grupo: "outras" })}
          aoSalvar={(p) => salvarRegistro("planoContas", p)}
          aoExcluir={(p) => excluirRegistro("planoContas", p.id)}
          campos={[
            { chave: "nome", rotulo: "Nome", obrigatorio: true },
            { chave: "tipo", rotulo: "Tipo", tipo: "opcao", opcoes: [{ valor: "despesa", rotulo: "Despesa" }, { valor: "receita", rotulo: "Receita" }] },
            { chave: "grupo", rotulo: "Linha no DRE", tipo: "opcao", opcoes: Object.entries(ROTULO_GRUPO).map(([valor, rotulo]) => ({ valor, rotulo })) },
          ]}
        />
      )}

      {aba === "Caixas" && (
        <EditorLista<Caixa>
          titulo="Caixa"
          itens={e.caixas}
          novo={() => ({ id: "", nome: "" })}
          aoSalvar={(c) => salvarRegistro("caixas", c)}
          campos={[{ chave: "nome", rotulo: "Nome", obrigatorio: true }]}
        />
      )}
    </div>
  );
}
