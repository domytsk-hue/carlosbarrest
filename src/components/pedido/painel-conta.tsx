"use client";

import clsx from "clsx";
import {
  ArrowRightLeft,
  BadgePercent,
  Ban,
  CircleDollarSign,
  Combine,
  HandPlatter,
  Layers,
  Merge,
  MessageSquareText,
  MoveRight,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Split,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { brl, duracao, hora, itensValidos, pago, restante, subtotal, total, totalItem, valorServico } from "@/lib/dominio/calculos";
import { nomeConta, rotuloComissao, rotuloMesa } from "@/lib/dominio/rotulos";
import type { Conta } from "@/lib/dominio/tipos";
import {
  agruparItens,
  aplicarDesconto,
  cancelarConta,
  cancelarItem,
  definirObsItem,
  definirServico,
  desagruparItens,
  juntarContas,
  pedirConta,
  reabrirConta,
  transferirItens,
  transferirMesa,
} from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";
import { BotaoNfce } from "./nfce";
import { imprimir } from "../impressao";
import { Acao, Botao, EntradaValor, Entrada, Modal, Pilula, Selecao, useRelogio } from "../ui";
import { Lancador } from "./lancador";
import { PagamentoModal } from "./pagamento";

export { nomeConta };

const COR_PREPARO = { pendente: "amarela", preparo: "laranja", pronto: "verde", entregue: "neutra" } as const;
const MOTIVOS_CANCELAMENTO = ["Lançado errado", "Cliente cancelou"] as const;
const ROTULO_PREPARO = { pendente: "Na fila", preparo: "Preparando", pronto: "Pronto", entregue: "Entregue" } as const;

/** Painel completo de uma conta: itens, totais e todas as ações das telas de operação. */
export function PainelConta({ contaId, aoFechar, semAcoes }: { contaId: string; aoFechar?: () => void; semAcoes?: ("juntar" | "transferir" | "servico")[] }) {
  const conta = useLoja((e) => e.contas.find((c) => c.id === contaId));
  const mesas = useLoja((e) => e.mesas);
  const funcionarios = useLoja((e) => e.funcionarios);
  const abertas = useLoja((e) => e.contas.filter((c) => c.status === "aberta" || c.status === "fechamento"));
  const agora = useRelogio();
  const [modal, setModal] = useState<null | "lancar" | "pagar" | "desconto" | "servico" | "transferir" | "juntar" | "cancelar" | "obs" | "mesa" | { item: string }>(null);
  const [itemSel, setItemSel] = useState<string | null>(null);
  const [mesaDestino, setMesaDestino] = useState("");
  const [confirmarJuntar, setConfirmarJuntar] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [valor, setValor] = useState(0);
  const [destino, setDestino] = useState("");
  const [enviado, setEnviado] = useState<number | null>(null);

  // Agrupar e Desagrupar viram um botão só: agrupa se há itens repetidos, senão desagrupa
  const validosAg = conta ? conta.itens.filter((i) => !i.cancelado) : [];
  const chaveAg = (i: { produtoId: string; preco: number; obs?: string }) => `${i.produtoId}|${i.preco}|${i.obs ?? ""}`;
  const podeAgrupar = new Set(validosAg.map(chaveAg)).size < validosAg.length;
  const podeDesagrupar = validosAg.some((i) => i.qtd > 1 && Number.isInteger(i.qtd));
  function alternarGrupo() {
    if (!conta) return;
    if (podeAgrupar) agruparItens(conta.id);
    else if (podeDesagrupar) desagruparItens(conta.id);
  }

  // Atalhos da conta aberta: F7 imprime, F6 recebe, F2 observação do item, Ctrl+J transfere a mesa, Ctrl+G agrupa/desagrupa
  const atalhos = useRef<(e: KeyboardEvent) => void>(() => {});
  atalhos.current = (ev: KeyboardEvent) => {
    if (!conta || modal) return;
    const aberta = conta.status === "aberta" || conta.status === "fechamento";
    const tecla = (ev.ctrlKey || ev.metaKey ? "Ctrl+" : "") + (ev.key.length === 1 ? ev.key.toUpperCase() : ev.key);
    if (tecla === "F7" && itensValidos(conta).length) {
      ev.preventDefault();
      if (aberta) pedirConta(conta.id);
      imprimir({ tipo: "conta", conta });
    } else if (tecla === "F6" && aberta && itensValidos(conta).length) {
      ev.preventDefault();
      setModal("pagar");
    } else if (tecla === "F2" && aberta && conta.itens.some((i) => !i.cancelado)) {
      ev.preventDefault();
      abrirObs();
    } else if (tecla === "Ctrl+J" && aberta && conta.mesaId) {
      ev.preventDefault();
      abrirTransferirMesa();
    } else if (tecla === "Ctrl+G" && aberta) {
      ev.preventDefault();
      alternarGrupo();
    }
  };
  useEffect(() => {
    const ouvir = (ev: KeyboardEvent) => atalhos.current(ev);
    window.addEventListener("keydown", ouvir);
    return () => window.removeEventListener("keydown", ouvir);
  }, []);

  if (!conta) return null;
  const itemObs = conta.itens.find((i) => i.id === itemSel && !i.cancelado) ?? conta.itens.filter((i) => !i.cancelado).at(-1);
  function abrirObs() {
    const alvo = conta!.itens.find((i) => i.id === itemSel && !i.cancelado) ?? conta!.itens.filter((i) => !i.cancelado).at(-1);
    if (!alvo) return;
    setItemSel(alvo.id);
    setTexto(alvo.obs ?? "");
    setModal("obs");
  }
  function abrirTransferirMesa() {
    setMesaDestino("");
    setConfirmarJuntar(false);
    setModal("mesa");
  }
  const fechada = conta.status === "paga" || conta.status === "cancelada";
  const nome = nomeConta(conta, mesas);
  const outras = abertas.filter((c) => c.id !== conta.id);
  const fechar = () => setModal(null);

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho */}
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <div className="flex-1">
          <p className="text-[18px] font-extrabold leading-tight">{nome}</p>
          <p className="text-[12px] text-mudo">
            Conta {conta.numero} · aberta às {hora(conta.abertaEm)} · {duracao(conta.abertaEm, agora)}
            {conta.clienteNome && ` · ${conta.clienteNome}`}
          </p>
        </div>
        {conta.status === "fechamento" && <Pilula cor="laranja">Em fechamento</Pilula>}
        {conta.status === "paga" && <Pilula cor="verde">Paga</Pilula>}
        {conta.status === "cancelada" && <Pilula cor="vermelha">Cancelada</Pilula>}
        {aoFechar && (
          <button onClick={aoFechar} className="flex h-8 w-8 items-center justify-center rounded-full bg-secundario" aria-label="Fechar painel">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Ações */}
      {!fechada && (
        <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          <Acao icone={Plus} rotulo="Adicionar" destaque onClick={() => setModal("lancar")} />
          <Acao icone={CircleDollarSign} rotulo="Receber (F6)" onClick={() => setModal("pagar")} disabled={!itensValidos(conta).length} />
          <Acao icone={ReceiptText} rotulo="Conta (F7)" onClick={() => { pedirConta(conta.id); imprimir({ tipo: "conta", conta }); }} disabled={!itensValidos(conta).length} />
          <Acao icone={Printer} rotulo="Preparo" onClick={() => imprimir({ tipo: "preparo", conta, pedidoNumero: conta.itens.at(-1)?.pedidoNumero })} disabled={!conta.itens.length} />
          <Acao icone={BadgePercent} rotulo="Desconto" onClick={() => { setValor(conta.desconto); setTexto(""); setModal("desconto"); }} />
          {!semAcoes?.includes("servico") && <Acao icone={HandPlatter} rotulo="Serviço" onClick={() => setModal("servico")} />}
          {!semAcoes?.includes("transferir") && <Acao icone={ArrowRightLeft} rotulo="Transferir" onClick={() => { setSelecionados([]); setDestino(""); setModal("transferir"); }} disabled={!conta.itens.length || !outras.length} />}
          <Acao icone={MessageSquareText} rotulo="Obs. (F2)" onClick={abrirObs} disabled={!conta.itens.some((i) => !i.cancelado)} />
          {conta.mesaId && !semAcoes?.includes("transferir") && <Acao icone={MoveRight} rotulo="Mesa (Ctrl+J)" onClick={abrirTransferirMesa} />}
          {!semAcoes?.includes("juntar") && <Acao icone={Merge} rotulo="Juntar" onClick={() => { setDestino(""); setModal("juntar"); }} disabled={!outras.length} />}
          <Acao
            icone={podeAgrupar || !podeDesagrupar ? Combine : Split}
            rotulo={podeAgrupar || !podeDesagrupar ? "Agrupar (Ctrl+G)" : "Desagrupar (Ctrl+G)"}
            onClick={alternarGrupo}
            disabled={!podeAgrupar && !podeDesagrupar}
          />
          <Acao icone={Ban} rotulo="Cancelar" onClick={() => { setTexto(""); setModal("cancelar"); }} />
        </div>
      )}
      {fechada && conta.status === "paga" && (
        <div className="mb-3 flex gap-2">
          <Botao variante="secundario" tamanho="sm" onClick={() => imprimir({ tipo: "conta", conta })}>
            <Printer size={15} /> Reimprimir
          </Botao>
          <Botao variante="secundario" tamanho="sm" onClick={() => reabrirConta(conta.id)}>
            <RotateCcw size={15} /> Reabrir
          </Botao>
          <BotaoNfce conta={conta} />
        </div>
      )}

      {/* Itens */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-linha bg-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-linha text-left text-[11px] uppercase tracking-wide text-mudo">
              <th className="px-3 py-2 font-semibold">Descrição</th>
              <th className="px-2 py-2 text-right font-semibold">Qtd</th>
              <th className="px-2 py-2 text-right font-semibold">Total</th>
              <th className="hidden px-2 py-2 font-semibold sm:table-cell">Atendente</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {conta.itens.map((i) => (
              <tr
                key={i.id}
                onClick={() => !i.cancelado && setItemSel(i.id)}
                className={clsx("cursor-pointer", i.cancelado && "text-mudo line-through opacity-60", !i.cancelado && itemObs?.id === i.id && itemSel && "bg-rosado")}
              >
                <td className="px-3 py-2">
                  <span className="font-medium">{i.nome}</span>
                  <span className="ml-1.5 text-[11px] text-mudo">#{i.pedidoNumero}</span>
                  {i.obs && <span className="block text-[11.5px] text-[#8A5A00]">{i.obs}</span>}
                  {!i.cancelado && (
                    <span className="mt-0.5 block">
                      <Pilula cor={COR_PREPARO[i.preparo]}>{ROTULO_PREPARO[i.preparo]}</Pilula>
                    </span>
                  )}
                </td>
                <td className="num px-2 py-2 text-right">{i.qtd}</td>
                <td className="num px-2 py-2 text-right font-semibold">{brl(totalItem(i))}</td>
                <td className="hidden px-2 py-2 text-[12px] text-mudo sm:table-cell">{funcionarios.find((f) => f.id === i.atendenteId)?.nome}</td>
                <td className="px-2 py-2 text-right">
                  {!i.cancelado && !fechada && (
                    <button onClick={(ev) => { ev.stopPropagation(); setTexto(""); setModal({ item: i.id }); }} className="rounded-full p-1.5 text-mudo hover:bg-rosado hover:text-st-cancelado" aria-label="Cancelar item">
                      <X size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!conta.itens.length && <p className="px-3 py-8 text-center text-[13px] text-mudo">Nenhum item lançado. Toque em Adicionar.</p>}
      </div>

      {/* Totais */}
      <div className="mt-3 space-y-1 rounded-2xl bg-card p-3 text-[13px] shadow-card">
        <Linha r="Subtotal" v={subtotal(conta)} />
        {(conta.servicoPct > 0 || conta.servicoValor !== undefined) && <Linha r={rotuloComissao(conta)} v={valorServico(conta)} />}
        {conta.couvert > 0 && <Linha r="Couvert" v={conta.couvert} />}
        {conta.taxaEntrega > 0 && <Linha r="Taxa de entrega" v={conta.taxaEntrega} />}
        {conta.desconto > 0 && <Linha r="Desconto" v={-conta.desconto} />}
        <div className="flex justify-between pt-1 text-[18px] font-extrabold">
          <span>Total</span>
          <span className="num">{brl(total(conta))}</span>
        </div>
        {pago(conta) > 0 && (
          <>
            <Linha r="Pago" v={pago(conta)} cor="text-ok" />
            <Linha r="Restante" v={restante(conta)} cor="text-acao font-bold" />
          </>
        )}
      </div>

      {/* Modais */}
      <Modal aberto={modal === "lancar"} aoFechar={fechar} titulo={`Adicionar produtos · ${nome}`} largura="xl">
        <Lancador
          contaId={conta.id}
          titulo={nome}
          totalAtual={total(conta)}
          aoEnviar={(n) => {
            setEnviado(n);
            fechar();
            setTimeout(() => setEnviado(null), 4000);
          }}
        />
      </Modal>
      {enviado && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ok px-5 py-3 text-[14px] font-bold text-white shadow-flutuante">
          Pedido {enviado} enviado para o preparo
        </div>
      )}

      <PagamentoModal conta={conta} aberto={modal === "pagar"} aoFechar={fechar} aoQuitar={aoFechar} />

      <Modal aberto={modal === "desconto"} aoFechar={fechar} titulo="Desconto" largura="sm">
        <div className="space-y-3">
          <div className="flex gap-2">
            {[5, 10, 15].map((p) => (
              <Botao key={p} variante="secundario" tamanho="sm" onClick={() => setValor(Math.round(subtotal(conta) * p) / 100)}>
                {p}%
              </Botao>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Valor do desconto (R$)</span>
            <EntradaValor key={valor} valor={valor} aoMudar={setValor} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Motivo (fica na auditoria)</span>
            <Entrada value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: cliente frequente" />
          </label>
          <Botao className="w-full" disabled={!texto.trim()} onClick={() => { aplicarDesconto(conta.id, valor, texto); fechar(); }}>
            Aplicar desconto
          </Botao>
        </div>
      </Modal>

      <Modal aberto={modal === "servico"} aoFechar={fechar} titulo="Serviço e couvert" largura="sm">
        <ServicoForm pct={conta.servicoPct} couvert={conta.couvert} aoSalvar={(p, c) => { definirServico(conta.id, p, c); fechar(); }} />
      </Modal>

      <Modal aberto={modal === "transferir"} aoFechar={fechar} titulo="Transferir itens" largura="md">
        <p className="mb-2 text-[12.5px] font-semibold">Itens</p>
        <div className="mb-3 max-h-60 space-y-1 overflow-y-auto">
          {itensValidos(conta).map((i) => (
            <label key={i.id} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-[13px]">
              <input type="checkbox" checked={selecionados.includes(i.id)} onChange={(e) => setSelecionados((s) => (e.target.checked ? [...s, i.id] : s.filter((x) => x !== i.id)))} />
              <span className="flex-1">
                {i.qtd}x {i.nome}
              </span>
              <span className="num">{brl(totalItem(i))}</span>
            </label>
          ))}
        </div>
        <DestinoSelect contas={outras} mesas={mesas} valor={destino} aoMudar={setDestino} />
        <Botao className="mt-3 w-full" disabled={!destino || !selecionados.length} onClick={() => { transferirItens(conta.id, destino, selecionados); fechar(); }}>
          Transferir {selecionados.length} item(ns)
        </Botao>
      </Modal>

      <Modal aberto={modal === "obs"} aoFechar={fechar} titulo="Observação do item (F2)" largura="sm">
        {itemObs && (
          <div className="space-y-3">
            <p className="text-[13px]">
              <b>
                {itemObs.qtd}x {itemObs.nome}
              </b>{" "}
              <span className="text-mudo">· pedido #{itemObs.pedidoNumero}</span>
            </p>
            {conta.itens.filter((i) => !i.cancelado).length > 1 && (
              <Selecao value={itemObs.id} onChange={(ev) => { const it = conta.itens.find((i) => i.id === ev.target.value); setItemSel(ev.target.value); setTexto(it?.obs ?? ""); }} aria-label="Item">
                {conta.itens.filter((i) => !i.cancelado).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.qtd}x {i.nome} {i.obs ? `· ${i.obs}` : ""}
                  </option>
                ))}
              </Selecao>
            )}
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Observação</span>
              <Entrada autoFocus value={texto} onChange={(ev) => setTexto(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") { definirObsItem(conta.id, itemObs.id, texto); fechar(); } }} placeholder="Ex.: sem cebola, bem passado" />
            </label>
            <Botao className="w-full" onClick={() => { definirObsItem(conta.id, itemObs.id, texto); fechar(); }}>
              Salvar observação
            </Botao>
          </div>
        )}
      </Modal>

      <Modal aberto={modal === "mesa"} aoFechar={fechar} titulo={`Transferir ${nome} (Ctrl+J)`} largura="sm">
        {(() => {
          const destino = mesas.find((m) => String(m.numero) === mesaDestino.trim());
          const ocupada = destino ? abertas.find((c) => c.mesaId === destino.id && c.id !== conta.id) : undefined;
          const mesma = destino?.id === conta.mesaId;
          const executar = () => {
            if (!destino || mesma) return;
            if (ocupada && !confirmarJuntar) return setConfirmarJuntar(true);
            transferirMesa(conta.id, destino.id);
            fechar();
            if (ocupada) aoFechar?.();
          };
          return (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold">Número da mesa de destino</span>
                <Entrada
                  autoFocus
                  inputMode="numeric"
                  value={mesaDestino}
                  onChange={(ev) => { setMesaDestino(ev.target.value.replace(/\D/g, "")); setConfirmarJuntar(false); }}
                  onKeyDown={(ev) => ev.key === "Enter" && executar()}
                  placeholder="Ex.: 12"
                  className="text-[20px] font-extrabold"
                />
              </label>
              {mesaDestino && !destino && <p className="text-[12.5px] font-semibold text-st-cancelado">Mesa {mesaDestino} não existe.</p>}
              {mesma && <p className="text-[12.5px] text-mudo">É a mesma mesa.</p>}
              {destino && !mesma && !ocupada && <p className="text-[12.5px] text-ok">{rotuloMesa(destino)} está livre: a conta inteira passa para ela.</p>}
              {destino && ocupada && !confirmarJuntar && <p className="text-[12.5px] font-semibold text-[#8A5A00]">{rotuloMesa(destino)} está ocupada ({brl(total(ocupada))}).</p>}
              {destino && ocupada && confirmarJuntar && (
                <div className="rounded-2xl bg-[#FDF0D6] p-3 text-[13px] text-[#8A5A00]">
                  <p className="font-bold">Juntar as contas?</p>
                  <p>
                    Os itens e pagamentos de {nome} ({brl(total(conta))}) passam para {rotuloMesa(destino)}. As duas viram uma conta só.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Botao variante="secundario" onClick={() => setConfirmarJuntar(false)}>
                      Cancelar
                    </Botao>
                    <Botao onClick={executar}>
                      <Layers size={16} /> Juntar
                    </Botao>
                  </div>
                </div>
              )}
              {!confirmarJuntar && (
                <Botao className="w-full" disabled={!destino || mesma} onClick={executar}>
                  <MoveRight size={16} /> {ocupada ? "Continuar" : "Transferir"}
                </Botao>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal aberto={modal === "juntar"} aoFechar={fechar} titulo={`Juntar com ${nome}`} largura="sm">
        <p className="mb-3 text-[13px] text-mudo">Os itens e pagamentos da conta escolhida passam para {nome}, e ela é encerrada.</p>
        <DestinoSelect contas={outras} mesas={mesas} valor={destino} aoMudar={setDestino} />
        <Botao className="mt-3 w-full" disabled={!destino} onClick={() => { juntarContas(conta.id, destino); fechar(); }}>
          <Layers size={16} /> Juntar contas
        </Botao>
      </Modal>

      <Modal aberto={modal === "cancelar" || (typeof modal === "object" && modal !== null)} aoFechar={fechar} titulo={modal === "cancelar" ? "Cancelar conta inteira" : "Cancelar item"} largura="sm">
        <p className="mb-3 text-[12.5px] text-mudo">Escolha o motivo (fica na auditoria):</p>
        {(() => {
          const cancelar = (motivo: string) => {
            if (modal === "cancelar") {
              cancelarConta(conta.id, motivo);
              fechar();
              aoFechar?.();
            } else if (typeof modal === "object" && modal) {
              cancelarItem(conta.id, modal.item, motivo);
              fechar();
            }
          };
          const outro = texto.trim();
          return (
            <div className="grid gap-2">
              {MOTIVOS_CANCELAMENTO.map((motivo) => (
                <Botao key={motivo} variante="perigo" tamanho="lg" className="w-full" onClick={() => cancelar(motivo)}>
                  <Ban size={17} /> {motivo}
                </Botao>
              ))}
              <div className="mt-1 rounded-2xl border border-linha bg-card p-3">
                <span className="mb-1.5 block text-[12.5px] font-semibold">Outro motivo</span>
                <Entrada value={texto} onChange={(ev) => setTexto(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && outro && cancelar(outro)} placeholder="Digite o motivo" />
                <Botao variante="perigo" className="mt-2 w-full" disabled={!outro} onClick={() => cancelar(outro)}>
                  <Ban size={16} /> Cancelar com esse motivo
                </Botao>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function Linha({ r, v, cor }: { r: string; v: number; cor?: string }) {
  return (
    <div className={clsx("flex justify-between", cor)}>
      <span className={cor ? "" : "text-mudo"}>{r}</span>
      <span className="num">{brl(v)}</span>
    </div>
  );
}

function ServicoForm({ pct, couvert, aoSalvar }: { pct: number; couvert: number; aoSalvar: (p: number, c: number) => void }) {
  const [p, setP] = useState(pct);
  const [c, setC] = useState(couvert);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[0, 10, 12, 15].map((x) => (
          <button key={x} onClick={() => setP(x)} className={clsx("h-10 flex-1 rounded-xl text-[13px] font-bold", p === x ? "bg-acao text-white" : "bg-secundario")}>
            {x === 0 ? "Sem" : `${x}%`}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-semibold">Couvert artístico (R$, total da mesa)</span>
        <EntradaValor valor={c} aoMudar={setC} />
      </label>
      <Botao className="w-full" onClick={() => aoSalvar(p, c)}>
        Salvar
      </Botao>
    </div>
  );
}

function DestinoSelect({ contas, mesas, valor, aoMudar }: { contas: Conta[]; mesas: { id: string; numero: number }[]; valor: string; aoMudar: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold">Para</span>
      <Selecao value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">Escolha a mesa, comanda ou pedido</option>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {nomeConta(c, mesas)} · {brl(total(c))}
          </option>
        ))}
      </Selecao>
    </label>
  );
}
