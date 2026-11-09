"use client";

import clsx from "clsx";
import { Bike, CheckCheck, ChefHat, PackageCheck, Plus, ThumbsUp, Truck } from "lucide-react";
import { useState } from "react";
import { Lancador } from "@/components/pedido/lancador";
import { NovoPedido } from "@/components/pedido/novo-pedido";
import { nomeConta, PainelConta } from "@/components/pedido/painel-conta";
import { Botao, Modal, Pilula, Selecao, Titulo, useRelogio, Vazio } from "@/components/ui";
import { brl, faixaEspera, hora, minutosDesde, restante, total } from "@/lib/dominio/calculos";
import type { Conta, StatusEntrega } from "@/lib/dominio/tipos";
import { concluirEntrega, descartarSeVazia, despachar, mudarStatusEntrega } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

const CANAIS_ENTREGA = ["entrega", "delivery", "ifood", "aiqfome"];
const ROTULO: Record<StatusEntrega, string> = { novo: "Novo", confirmado: "Confirmado", preparo: "Em preparo", pronto: "Pronto", saiu: "Saiu", entregue: "Entregue" };
const COR: Record<StatusEntrega, "amarela" | "azul" | "laranja" | "verde" | "neutra"> = { novo: "amarela", confirmado: "azul", preparo: "laranja", pronto: "verde", saiu: "neutra", entregue: "neutra" };
const CANAL_COR: Record<string, string> = { ifood: "#EA1D2C", aiqfome: "#7B2CBF", delivery: "#B8322A", entrega: "#2A1A16" };

export default function EntregasPage() {
  const mesas = useLoja((e) => e.mesas);
  const bairros = useLoja((e) => e.bairros);
  const entregadores = useLoja((e) => e.funcionarios.filter((f) => f.funcao === "entregador" && f.ativo));
  const contas = useLoja((e) =>
    e.contas.filter((c) => CANAIS_ENTREGA.includes(c.canal) && c.status !== "cancelada" && c.statusEntrega !== "entregue"),
  );
  const agora = useRelogio(15000);
  const [sel, setSel] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [lancando, setLancando] = useState<string | null>(null);
  const [despachando, setDespachando] = useState<Conta | null>(null);
  const [entregador, setEntregador] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "cozinha" | "rua">("todos");

  const despachados = contas.filter((c) => c.statusEntrega === "saiu");
  const tempos = contas.map((c) => minutosDesde(c.abertaEm, agora));
  const medio = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
  const lista = contas
    .filter((c) => filtro === "todos" || (filtro === "rua" ? c.statusEntrega === "saiu" : c.statusEntrega !== "saiu"))
    .sort((a, b) => a.abertaEm.localeCompare(b.abertaEm));
  const contaSel = contas.find((c) => c.id === sel);

  function proximo(c: Conta) {
    const s = c.statusEntrega ?? "novo";
    if (s === "novo") return mudarStatusEntrega(c.id, "confirmado");
    if (s === "confirmado") return mudarStatusEntrega(c.id, "preparo");
    if (s === "preparo") return mudarStatusEntrega(c.id, "pronto");
    if (s === "pronto") {
      setEntregador(entregadores[0]?.id ?? "");
      return setDespachando(c);
    }
    if (s === "saiu") return concluirEntrega(c.id);
  }
  const acaoDe = (s: StatusEntrega = "novo") =>
    ({ novo: { r: "Aceitar", i: ThumbsUp }, confirmado: { r: "Preparar", i: ChefHat }, preparo: { r: "Pronto", i: PackageCheck }, pronto: { r: "Despachar", i: Truck }, saiu: { r: "Entregue", i: CheckCheck }, entregue: { r: "", i: CheckCheck } })[s];

  return (
    <div className="mx-auto max-w-[1400px]">
      <Titulo
        sub="Pedidos para entrega de todos os canais · F8"
        acoes={
          <Botao onClick={() => setNovo(true)}>
            <Plus size={18} /> Nova entrega
          </Botao>
        }
      >
        Entregas
      </Titulo>

      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-[repeat(3,minmax(0,180px))_1fr]">
        {[
          ["Pedidos", contas.length, "text-st-preparo"],
          ["Na rua", despachados.length, "text-st-confirmado"],
          ["Tempo médio", `${medio} min`, "text-tinta"],
        ].map(([r, v, c]) => (
          <div key={r as string} className="rounded-[18px] bg-card p-3 shadow-card">
            <p className="text-[11.5px] font-semibold text-mudo">{r}</p>
            <p className={clsx("num text-[22px] font-extrabold", c as string)}>{v}</p>
          </div>
        ))}
        <div className="col-span-3 flex flex-wrap items-center gap-3 rounded-[18px] bg-card px-4 py-3 text-[11.5px] text-mudo shadow-card sm:col-span-1">
          {[0, 15, 30, 45, 60].map((m) => (
            <span key={m} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ background: faixaEspera(m).cor }} />
              {m === 60 ? "1h" : `${m}min`}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3 flex gap-1 rounded-full bg-card p-1 shadow-card sm:inline-flex">
        {(["todos", "cozinha", "rua"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={clsx("flex-1 whitespace-nowrap rounded-full px-4 py-1.5 text-[12.5px] font-semibold", f === filtro ? "bg-tinta text-fundo" : "text-mudo")}>
            {f === "todos" ? "Todos" : f === "cozinha" ? "Na casa" : "Na rua"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_460px]">
        <div className="space-y-2.5">
          {lista.map((c) => {
            const min = minutosDesde(c.abertaEm, agora);
            const faixa = faixaEspera(min);
            const a = acaoDe(c.statusEntrega);
            const bairro = bairros.find((b) => b.id === c.endereco?.bairroId)?.nome;
            const devendo = restante(c) > 0;
            return (
              <div key={c.id} className={clsx("flex flex-wrap items-center gap-3 rounded-[18px] border-l-[6px] bg-card p-3 shadow-card", c.id === sel && "ring-2 ring-acao")} style={{ borderLeftColor: faixa.cor }}>
                <button onClick={() => setSel(c.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-extrabold">{nomeConta(c, mesas)}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase text-white" style={{ background: CANAL_COR[c.canal] }}>
                      {c.canal === "entrega" ? "Telefone" : c.canal === "delivery" ? "Site" : c.canal}
                    </span>
                    <Pilula cor={COR[c.statusEntrega ?? "novo"]}>{ROTULO[c.statusEntrega ?? "novo"]}</Pilula>
                    {devendo ? <Pilula cor="amarela">Receber {brl(restante(c))}</Pilula> : <Pilula cor="verde">Pago</Pilula>}
                  </div>
                  <p className="mt-0.5 truncate text-[12.5px]">
                    <b>{c.clienteNome}</b> · {c.telefone}
                  </p>
                  <p className="truncate text-[12px] text-mudo">
                    {c.endereco ? `${c.endereco.rua}, ${c.endereco.numero}${bairro ? ` · ${bairro}` : ""}` : "Retirada"}
                    {c.entregadorId && ` · ${entregadores.find((x) => x.id === c.entregadorId)?.nome ?? ""}`}
                    {c.saiuEm && ` · saiu ${hora(c.saiuEm)}`}
                  </p>
                </button>
                <div className="text-right">
                  <p className="num text-[15px] font-bold">{brl(total(c))}</p>
                  <p className="text-[11.5px] font-bold" style={{ color: faixa.cor }}>
                    {min} min
                  </p>
                </div>
                {a.r && (
                  <Botao tamanho="sm" variante={c.statusEntrega === "saiu" ? "ok" : "primario"} onClick={() => proximo(c)}>
                    <a.i size={15} /> {a.r}
                  </Botao>
                )}
              </div>
            );
          })}
          {!lista.length && (
            <div className="rounded-[20px] bg-card shadow-card">
              <Vazio icone={Bike} titulo="Nenhuma entrega em andamento" texto="Pedidos por telefone, do cardápio online, do iFood e do aiqfome aparecem aqui." />
            </div>
          )}
        </div>
        <aside className={clsx("lg:sticky lg:top-28 lg:h-[calc(100dvh-150px)]", !contaSel && "hidden lg:block")}>
          {contaSel && (
            <div className="fixed inset-0 z-40 overflow-y-auto bg-fundo p-4 lg:static lg:h-full lg:p-0">
              <PainelConta contaId={contaSel.id} aoFechar={() => setSel(null)} semAcoes={["servico", "juntar", "transferir"]} />
            </div>
          )}
        </aside>
      </div>

      <Modal aberto={novo} aoFechar={() => setNovo(false)} titulo="Nova entrega">
        <NovoPedido tipoInicial="entrega" aoCriar={(id) => { setNovo(false); setSel(id); setLancando(id); }} />
      </Modal>
      <Modal aberto={!!lancando} aoFechar={() => { if (lancando) descartarSeVazia(lancando); setLancando(null); }} titulo="Lançar produtos" largura="xl">
        {lancando && <Lancador contaId={lancando} titulo="Entrega" totalAtual={0} aoEnviar={() => setLancando(null)} />}
      </Modal>
      <Modal aberto={!!despachando} aoFechar={() => setDespachando(null)} titulo="Despachar entrega" largura="sm">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold">Entregador</span>
          <Selecao value={entregador} onChange={(e) => setEntregador(e.target.value)}>
            {entregadores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </Selecao>
        </label>
        {despachando && restante(despachando) > 0 && <p className="mt-3 text-[12.5px] text-mudo">O entregador deve receber {brl(restante(despachando))} na entrega.</p>}
        <Botao className="mt-4 w-full" disabled={!entregador} onClick={() => { if (despachando) despachar(despachando.id, entregador); setDespachando(null); }}>
          <Truck size={17} /> Saiu para entrega
        </Botao>
      </Modal>
    </div>
  );
}
