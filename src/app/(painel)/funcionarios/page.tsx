"use client";

import { useState } from "react";
import { EditorLista } from "@/components/editor-lista";
import { Cartao, Entrada, Pilula, Tabela, Titulo } from "@/components/ui";
import { brl, diaLocal } from "@/lib/dominio/calculos";
import { comissoes } from "@/lib/dominio/financeiro";
import type { Funcionario } from "@/lib/dominio/tipos";
import { excluirRegistro, salvarRegistro } from "@/lib/loja/cadastros";
import { useLoja } from "@/lib/loja/loja";
import { ROTULO_FUNCAO } from "@/lib/sessao-rotulos";

const regra = (f: Funcionario) => {
  if (!f.comissao) return "Sem comissão";
  if (f.funcao === "entregador") return `${brl(f.comissao)} por entrega`;
  return f.comissaoTipo === "valor" ? `${brl(f.comissao)} por atendimento` : `${f.comissao.toString().replace(".", ",")}% da comissão paga`;
};

/** Cadastro da equipe com a comissão individual de cada um (FUN-01 e FUN-02). */
export default function FuncionariosPage() {
  const funcionarios = useLoja((e) => e.funcionarios);
  const contas = useLoja((e) => e.contas);
  const [dia, setDia] = useState(diaLocal());
  const c = comissoes(contas, funcionarios, { de: dia, ate: dia });

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <Titulo sub="Equipe do restaurante e a comissão individual de cada um">Funcionários</Titulo>
      <EditorLista<Funcionario>
        titulo="Funcionário"
        itens={funcionarios}
        busca={(f, q) => f.nome.toLowerCase().includes(q)}
        novo={() => ({ id: "", nome: "", funcao: "garcom", comissao: 0, comissaoTipo: "percentual", ativo: true })}
        aoSalvar={(f) => salvarRegistro("funcionarios", f)}
        aoExcluir={(f) => excluirRegistro("funcionarios", f.id)}
        campos={[
          { chave: "nome", rotulo: "Nome", obrigatorio: true },
          { chave: "funcao", rotulo: "Função", tipo: "opcao", opcoes: Object.entries(ROTULO_FUNCAO).map(([valor, rotulo]) => ({ valor, rotulo })) },
          {
            chave: "comissaoTipo",
            rotulo: "Tipo de comissão",
            tipo: "opcao",
            naTabela: false,
            opcoes: [
              { valor: "percentual", rotulo: "% da comissão que o cliente pagou" },
              { valor: "valor", rotulo: "Valor fixo (R$) por atendimento" },
            ],
          },
          { chave: "comissao", rotulo: "Comissão individual", tipo: "valor", exibir: regra },
          { chave: "ativo", rotulo: "Ativo", tipo: "booleano", exibir: (f) => (f.ativo ? <Pilula cor="verde">Ativo</Pilula> : <Pilula>Inativo</Pilula>) },
        ]}
      />
      <p className="text-[12px] text-mudo">
        Percentual: parte da comissão (taxa de serviço) que o cliente pagou de verdade nos itens que o funcionário lançou, inclusive quando pagou só uma parte ou nada. Valor fixo: quantia por conta aberta por ele. Entregador: valor por entrega. A regra final de divisão ainda vai ser combinada com o restaurante.
      </p>

      <Cartao
        titulo="Comissão por funcionário"
        acao={<Entrada type="date" value={dia} onChange={(e) => setDia(e.target.value || diaLocal())} className="w-[170px] py-1.5" aria-label="Dia" />}
      >
        <Tabela colunas={[{ rotulo: "Funcionário" }, { rotulo: "Regra" }, { rotulo: "Base", direita: true }, { rotulo: "Comissão", direita: true }]} vazio="Nenhum atendimento com comissão neste dia.">
          {[...c.garcons, ...c.entregadores].map((x) => (
            <tr key={x.id}>
              <td className="px-3 py-2.5 font-semibold">{x.nome}</td>
              <td className="px-3 py-2.5 text-[12.5px] text-mudo">{x.regra}</td>
              <td className="num px-3 py-2.5 text-right">{x.regra.includes("%") ? brl(x.base) : `${x.base}`}</td>
              <td className="num px-3 py-2.5 text-right font-bold">{brl(x.valor)}</td>
            </tr>
          ))}
        </Tabela>
        <p className="mt-2 text-right text-[14px] font-extrabold">
          Total: <span className="num">{brl(c.total)}</span>
        </p>
      </Cartao>
    </div>
  );
}
