"use client";

import clsx from "clsx";
import { Bike, ShoppingBag, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { brl } from "@/lib/dominio/calculos";
import type { Endereco } from "@/lib/dominio/tipos";
import { abrirConta, salvarCliente } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";
import { Botao, Campo, Entrada, Selecao } from "../ui";

export type TipoPedido = "retirada" | "viagem" | "entrega";

/** Identifica o cliente (busca por telefone ou nome), o endereço e o tipo do pedido de balcão. */
export function NovoPedido({ tipoInicial = "retirada", aoCriar }: { tipoInicial?: TipoPedido; aoCriar: (contaId: string) => void }) {
  const clientes = useLoja((e) => e.clientes);
  const bairros = useLoja((e) => e.bairros);
  const [tipo, setTipo] = useState<TipoPedido>(tipoInicial);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [clienteId, setClienteId] = useState<string | undefined>();
  const [endIdx, setEndIdx] = useState<number>(-1);
  const [end, setEnd] = useState<Endereco>({ rua: "", numero: "", bairroId: "" });

  const sugestoes = useMemo(() => {
    if ((telefone && telefone.replace(/\D/g, "").length < 3) || (!telefone && nome.length < 2)) return [];
    return clientes
      .filter((c) => (telefone ? c.telefone.replace(/\D/g, "").includes(telefone.replace(/\D/g, "")) : c.nome.toLowerCase().includes(nome.toLowerCase())))
      .slice(0, 5);
  }, [clientes, telefone, nome]);

  const cliente = clientes.find((c) => c.id === clienteId);
  const enderecoFinal: Endereco | undefined = tipo !== "entrega" ? undefined : endIdx >= 0 && cliente ? cliente.enderecos[endIdx] : end;
  const bairro = bairros.find((b) => b.id === enderecoFinal?.bairroId);
  const valido = tipo !== "entrega" || Boolean(enderecoFinal?.rua && enderecoFinal?.numero && enderecoFinal?.bairroId && nome && telefone);

  function criar() {
    let cid = clienteId;
    if (nome && telefone) cid = salvarCliente({ id: clienteId, nome, telefone, endereco: tipo === "entrega" && endIdx < 0 ? end : undefined });
    const id = abrirConta({
      canal: tipo === "entrega" ? "entrega" : "balcao",
      paraViagem: tipo === "viagem",
      clienteId: cid,
      clienteNome: nome || undefined,
      telefone: telefone || undefined,
      endereco: enderecoFinal,
      taxaEntrega: tipo === "entrega" ? (bairro?.taxa ?? 0) : 0,
      statusEntrega: tipo === "entrega" ? "confirmado" : undefined,
    });
    aoCriar(id);
  }

  const opcoes: { id: TipoPedido; rotulo: string; icone: React.ElementType }[] = [
    { id: "retirada", rotulo: "Balcão", icone: Store },
    { id: "viagem", rotulo: "Para viagem", icone: ShoppingBag },
    { id: "entrega", rotulo: "Entrega", icone: Bike },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {opcoes.map((o) => (
          <button
            key={o.id}
            onClick={() => setTipo(o.id)}
            className={clsx("flex flex-col items-center gap-1 rounded-2xl border-[1.5px] bg-card p-3 text-[12.5px] font-semibold", tipo === o.id ? "border-acao bg-rosado text-acao" : "border-linha")}
          >
            <o.icone size={20} />
            {o.rotulo}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo={tipo === "entrega" ? "Telefone *" : "Telefone"}>
          <Entrada value={telefone} onChange={(e) => { setTelefone(e.target.value); setClienteId(undefined); }} inputMode="tel" placeholder="(74) 9...." />
        </Campo>
        <Campo rotulo={tipo === "entrega" ? "Nome do cliente *" : "Nome do cliente"}>
          <Entrada value={nome} onChange={(e) => { setNome(e.target.value); setClienteId(undefined); }} placeholder="Opcional no balcão" />
        </Campo>
      </div>
      {!clienteId && sugestoes.length > 0 && (
        <div className="space-y-1">
          {sugestoes.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setClienteId(c.id);
                setNome(c.nome);
                setTelefone(c.telefone);
                setEndIdx(c.enderecos.length ? 0 : -1);
              }}
              className="flex w-full items-center justify-between rounded-xl bg-card px-3 py-2 text-left text-[13px] shadow-card"
            >
              <span>
                <b>{c.nome}</b> · {c.telefone}
              </span>
              <span className="text-[11.5px] text-mudo">{c.enderecos.length} endereço(s)</span>
            </button>
          ))}
        </div>
      )}
      {tipo === "entrega" && (
        <div className="space-y-3 rounded-2xl bg-card p-3 shadow-card">
          {cliente && cliente.enderecos.length > 0 && (
            <Campo rotulo="Endereço para entrega">
              <Selecao value={endIdx} onChange={(e) => setEndIdx(Number(e.target.value))}>
                {cliente.enderecos.map((x, i) => (
                  <option key={i} value={i}>
                    {x.rua}, {x.numero} · {bairros.find((b) => b.id === x.bairroId)?.nome}
                  </option>
                ))}
                <option value={-1}>Novo endereço...</option>
              </Selecao>
            </Campo>
          )}
          {(!cliente || endIdx < 0) && (
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <Entrada placeholder="Rua *" value={end.rua} onChange={(e) => setEnd({ ...end, rua: e.target.value })} />
              <Entrada placeholder="Nº *" value={end.numero} onChange={(e) => setEnd({ ...end, numero: e.target.value })} />
              <Selecao value={end.bairroId} onChange={(e) => setEnd({ ...end, bairroId: e.target.value })}>
                <option value="">Bairro *</option>
                {bairros.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome} · {brl(b.taxa)}
                  </option>
                ))}
              </Selecao>
              <Entrada placeholder="Compl." value={end.complemento ?? ""} onChange={(e) => setEnd({ ...end, complemento: e.target.value })} />
              <Entrada className="col-span-2" placeholder="Ponto de referência" value={end.referencia ?? ""} onChange={(e) => setEnd({ ...end, referencia: e.target.value })} />
            </div>
          )}
          {bairro && (
            <p className="text-[12.5px] text-mudo">
              Taxa de entrega ({bairro.nome}): <b className="num text-tinta">{brl(bairro.taxa)}</b>
            </p>
          )}
        </div>
      )}
      <Botao className="w-full" tamanho="lg" disabled={!valido} onClick={criar}>
        Começar pedido
      </Botao>
    </div>
  );
}
