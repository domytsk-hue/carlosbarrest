"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Lancador } from "@/components/pedido/lancador";
import { PagamentoModal } from "@/components/pedido/pagamento";
import { imprimir } from "@/components/impressao";
import { Botao, Titulo } from "@/components/ui";
import { brl, total } from "@/lib/dominio/calculos";
import { abrirConta, descartarSeVazia } from "@/lib/loja/acoes";
import { obterEstado, useLoja } from "@/lib/loja/loja";

/** PDV / venda rápida: lança, cobra e já começa a próxima venda. */
export default function PdvPage() {
  const [contaId, setContaId] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  const [ultima, setUltima] = useState<string | null>(null);
  const conta = useLoja((e) => e.contas.find((c) => c.id === contaId));
  const ultimaConta = useLoja((e) => e.contas.find((c) => c.id === ultima));

  useEffect(() => {
    const id = abrirConta({ canal: "pdv" });
    setContaId(id);
    return () => descartarSeVazia(id);
  }, []);

  function proxima() {
    setUltima(contaId);
    const id = abrirConta({ canal: "pdv" });
    setContaId(id);
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <Titulo sub="Venda rápida sem identificar o cliente · F12">PDV</Titulo>
      {ultimaConta && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-[#E5F4EA] px-4 py-3 text-[13.5px] text-[#1E7A41]">
          <CheckCircle2 size={18} />
          <span className="flex-1 font-semibold">
            Venda #{ultimaConta.numero} recebida · <span className="num">{brl(total(ultimaConta))}</span>
            {ultimaConta.pagamentos.some((p) => p.troco) && <> · troco {brl(ultimaConta.pagamentos.reduce((s, p) => s + (p.troco ?? 0), 0))}</>}
          </span>
          <Botao tamanho="sm" variante="secundario" onClick={() => imprimir({ tipo: "conta", conta: obterEstado().contas.find((c) => c.id === ultima)! })}>
            Imprimir comprovante
          </Botao>
        </div>
      )}
      {contaId && (
        <Lancador
          key={contaId}
          contaId={contaId}
          titulo={`Venda #${conta?.numero ?? ""}`}
          totalAtual={conta ? total(conta) : 0}
          rotuloEnviar="Lançar e cobrar"
          aoEnviar={() => setPagando(true)}
        />
      )}
      {conta && <PagamentoModal conta={conta} aberto={pagando} aoFechar={() => setPagando(false)} aoQuitar={proxima} />}
    </div>
  );
}
