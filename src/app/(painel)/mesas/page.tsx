"use client";

import clsx from "clsx";
import { Armchair } from "lucide-react";
import { useState } from "react";
import { Lancador } from "@/components/pedido/lancador";
import { PainelConta } from "@/components/pedido/painel-conta";
import { Modal, Titulo, useRelogio, Vazio } from "@/components/ui";
import { brl, duracao, total } from "@/lib/dominio/calculos";
import type { Conta, Mesa } from "@/lib/dominio/tipos";
import { abrirConta, descartarSeVazia } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

type Estado = "fechamento" | "ocupada" | "livre";

export default function MesasPage() {
  const mesas = useLoja((e) => e.mesas);
  const contas = useLoja((e) => e.contas.filter((c) => c.mesaId && (c.status === "aberta" || c.status === "fechamento")));
  const agora = useRelogio();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [lancando, setLancando] = useState<{ contaId: string; numero: number } | null>(null);
  const [area, setArea] = useState("Todas");

  const contaPorMesa = new Map<string, Conta>(contas.map((c) => [c.mesaId!, c]));
  const estadoDa = (m: Mesa): Estado => {
    const c = contaPorMesa.get(m.id);
    return !c ? "livre" : c.status === "fechamento" ? "fechamento" : "ocupada";
  };
  const areas = ["Todas", ...new Set(mesas.map((m) => m.area))];
  const visiveis = mesas.filter((m) => area === "Todas" || m.area === area);
  const grupos: { estado: Estado; rotulo: string }[] = [
    { estado: "fechamento", rotulo: "Em fechamento" },
    { estado: "ocupada", rotulo: "Ocupadas" },
    { estado: "livre", rotulo: "Disponíveis" },
  ];
  const contaSel = selecionada ? contaPorMesa.get(selecionada) : undefined;

  function tocar(m: Mesa) {
    const c = contaPorMesa.get(m.id);
    if (c) return setSelecionada(m.id);
    const id = abrirConta({ canal: "mesa", mesaId: m.id });
    setSelecionada(m.id);
    setLancando({ contaId: id, numero: m.numero });
  }

  const ocupadas = mesas.filter((m) => estadoDa(m) !== "livre").length;

  return (
    <div className="mx-auto max-w-[1400px]">
      <Titulo
        sub={
          <>
            <b className="text-tinta">{ocupadas}</b> ocupadas · <b className="text-ok">{mesas.length - ocupadas}</b> livres · F3
          </>
        }
        acoes={
          <div className="flex gap-1 rounded-full bg-card p-1 shadow-card">
            {areas.map((a) => (
              <button key={a} onClick={() => setArea(a)} className={clsx("rounded-full px-3 py-1.5 text-[12.5px] font-semibold", a === area ? "bg-tinta text-fundo" : "text-mudo")}>
                {a}
              </button>
            ))}
          </div>
        }
      >
        Mesas
      </Titulo>

      <div className="grid gap-4 lg:grid-cols-[1fr_480px]">
        <div className="space-y-4">
          {grupos.map((g) => {
            const lista = visiveis.filter((m) => estadoDa(m) === g.estado);
            if (!lista.length) return null;
            return (
              <section key={g.estado}>
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-mudo">
                  {g.rotulo} · {lista.length}
                </h2>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                  {lista.map((m) => {
                    const c = contaPorMesa.get(m.id);
                    const on = m.id === selecionada;
                    return (
                      <button
                        key={m.id}
                        onClick={() => tocar(m)}
                        className={clsx(
                          "relative flex min-h-[84px] flex-col items-start rounded-[18px] border-l-[5px] bg-card p-3 text-left shadow-card transition-transform active:scale-[.97]",
                          g.estado === "livre" && "border-l-linha",
                          g.estado === "ocupada" && "border-l-acao",
                          g.estado === "fechamento" && "border-l-st-preparo",
                          on && "ring-2 ring-acao",
                        )}
                      >
                        <span className="text-[15px] font-extrabold">Mesa {m.numero}</span>
                        {c ? (
                          <>
                            <span className="num mt-auto text-[13px] font-bold text-acao">{brl(total(c))}</span>
                            <span className="text-[11px] text-mudo">{duracao(c.abertaEm, agora)}</span>
                          </>
                        ) : (
                          <span className="mt-auto text-[11.5px] text-mudo">{m.area}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className={clsx("lg:sticky lg:top-28 lg:h-[calc(100dvh-150px)]", !contaSel && "hidden lg:block")}>
          {contaSel ? (
            <div className="fixed inset-0 z-40 overflow-y-auto bg-fundo p-4 lg:static lg:h-full lg:p-0">
              <PainelConta contaId={contaSel.id} aoFechar={() => setSelecionada(null)} />
            </div>
          ) : (
            <div className="rounded-[20px] bg-card shadow-card">
              <Vazio icone={Armchair} titulo="Escolha uma mesa" texto="Toque numa mesa livre para abrir e lançar o pedido, ou numa ocupada para ver a conta." />
            </div>
          )}
        </aside>
      </div>

      <Modal
        aberto={!!lancando}
        aoFechar={() => {
          if (lancando) descartarSeVazia(lancando.contaId);
          setLancando(null);
        }} titulo={`Mesa ${lancando?.numero} · novo pedido`} largura="xl">
        {lancando && <Lancador contaId={lancando.contaId} titulo={`Mesa ${lancando.numero}`} totalAtual={0} aoEnviar={() => setLancando(null)} />}
      </Modal>
    </div>
  );
}
