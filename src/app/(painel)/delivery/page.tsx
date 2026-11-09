"use client";

import { copiarTexto } from "@/lib/copiar";
import clsx from "clsx";
import { Check, Copy, ExternalLink, QrCode, ShoppingCart, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { QR } from "@/components/qr";
import { Botao, Campo, Cartao, EntradaValor, Entrada, Pilula, Titulo } from "@/components/ui";
import { brl, diaLocal, hora, mesmoDia, total } from "@/lib/dominio/calculos";
import type { StatusEntrega } from "@/lib/dominio/tipos";
import { salvarConfig } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

const ROTULO: Record<StatusEntrega, string> = { novo: "Novo", confirmado: "Aceito", preparo: "Em preparo", pronto: "Pronto", saiu: "Saiu", entregue: "Entregue" };
const COR: Record<StatusEntrega, "amarela" | "azul" | "laranja" | "verde" | "neutra"> = { novo: "amarela", confirmado: "azul", preparo: "laranja", pronto: "verde", saiu: "neutra", entregue: "neutra" };

/** Delivery próprio (cardápio online) e canais de marketplace. */
export default function DeliveryPage() {
  const config = useLoja((e) => e.config);
  const contas = useLoja((e) => e.contas.filter((c) => c.canal === "delivery" && mesmoDia(c.abertaEm, diaLocal())));
  const marketplace = useLoja((e) => e.contas.filter((c) => (c.canal === "ifood" || c.canal === "aiqfome") && c.status !== "cancelada" && mesmoDia(c.abertaEm, diaLocal())));
  const [origem, setOrigem] = useState("");
  const [copiado, setCopiado] = useState(false);
  useEffect(() => setOrigem(window.location.origin), []);
  const link = `${origem}/cardapio`;
  const validos = contas.filter((c) => c.status !== "cancelada");
  const faturado = validos.reduce((s, c) => s + total(c), 0);
  const novos = contas.filter((c) => c.statusEntrega === "novo" && c.status !== "cancelada").length;

  return (
    <div className="mx-auto max-w-[1200px]">
      <Titulo
        sub="Cardápio online próprio, sem comissão. Os pedidos caem em Entregas."
        acoes={
          <Link href="/entregas">
            <Botao>
              <Truck size={18} /> Ver entregas {novos > 0 && <span className="num rounded-full bg-white/25 px-2">{novos}</span>}
            </Botao>
          </Link>
        }
      >
        Delivery
      </Titulo>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          <Cartao>
            <div className="flex flex-wrap items-center gap-4">
              <span className={clsx("grid h-14 w-14 place-items-center rounded-full", config.deliveryAberto ? "bg-st-pronto/15 text-st-pronto" : "bg-secundario text-mudo")}>
                <Store size={26} />
              </span>
              <div className="flex-1">
                <p className="text-[18px] font-extrabold">{config.deliveryAberto ? "Recebendo pedidos" : "Delivery fechado"}</p>
                <p className="text-[13px] text-mudo">{config.deliveryAberto ? "Clientes podem pedir pelo cardápio online agora." : "O cardápio fica visível, mas não aceita pedidos."}</p>
              </div>
              <Botao variante={config.deliveryAberto ? "secundario" : "ok"} onClick={() => salvarConfig({ deliveryAberto: !config.deliveryAberto }, config.deliveryAberto ? "Fechou o delivery" : "Abriu o delivery")}>
                {config.deliveryAberto ? "Fechar delivery" : "Abrir delivery"}
              </Botao>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Campo rotulo="Pedido mínimo">
                <EntradaValor valor={config.pedidoMinimo} aoMudar={(v) => salvarConfig({ pedidoMinimo: v })} />
              </Campo>
              <Campo rotulo="Tempo de entrega (min)">
                <Entrada type="number" defaultValue={config.tempoEntrega} onBlur={(e) => salvarConfig({ tempoEntrega: Math.max(5, Number(e.target.value) || 45) })} />
              </Campo>
              <Campo rotulo="Taxas por bairro">
                <Link href="/cadastros" className="flex min-h-11 items-center rounded-2xl border border-linha px-3 text-[14px] font-semibold text-acao">
                  Editar em Cadastros
                </Link>
              </Campo>
            </div>
          </Cartao>

          <Cartao titulo="Pedidos online de hoje" acao={<span className="num text-[13px] text-mudo">{validos.length} {validos.length === 1 ? "pedido" : "pedidos"} · {brl(faturado)}</span>}>
            {!contas.length ? (
              <p className="py-6 text-center text-[13.5px] text-mudo">Nenhum pedido online hoje.</p>
            ) : (
              <ul className="divide-y divide-linha">
                {[...contas].reverse().map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2 text-[13.5px]">
                    <span className="num w-12 text-mudo">{hora(c.abertaEm)}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      #{c.numero} · {c.clienteNome}
                      <span className="font-normal text-mudo"> · {c.paraViagem ? "retirada" : "entrega"}</span>
                    </span>
                    {c.status === "cancelada" ? <Pilula cor="vermelha">Cancelado</Pilula> : <Pilula cor={COR[c.statusEntrega ?? "novo"]}>{ROTULO[c.statusEntrega ?? "novo"]}</Pilula>}
                    <span className="num w-24 text-right font-bold">{brl(total(c))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao titulo="Marketplaces" acao={<Link href="/configuracoes" className="text-[12.5px] font-semibold text-acao">Configurar</Link>}>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["ifood", "iFood", "#EA1D2C"],
                  ["aiqfome", "aiqfome", "#7B2CBF"],
                ] as const
              ).map(([k, n, cor]) => {
                const hoje = marketplace.filter((c) => c.canal === k);
                return (
                  <div key={k} className="flex items-center gap-3 rounded-2xl border border-linha p-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: cor }}>
                      <ShoppingCart size={18} />
                    </span>
                    <div className="flex-1">
                      <p className="font-bold">{n}</p>
                      <p className="num text-[12px] text-mudo">
                        {hoje.length} {hoje.length === 1 ? "pedido" : "pedidos"} hoje · {brl(hoje.reduce((s, c) => s + total(c), 0))}
                      </p>
                    </div>
                    {config.marketplaces[k].ativo ? <Pilula cor="verde">Ligado</Pilula> : <Pilula>Desligado</Pilula>}
                  </div>
                );
              })}
            </div>
          </Cartao>
        </div>

        <div className="grid content-start gap-4">
          <Cartao titulo="Link do cardápio">
            {origem && <QR texto={link} tamanho={180} className="mx-auto overflow-hidden rounded-xl" />}
            <p className="mt-2 break-all text-center text-[13px] font-semibold">{link}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Botao
                variante="secundario"
                tamanho="sm"
                onClick={async () => {
                  if (!(await copiarTexto(link))) return;
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                }}
              >
                {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiado" : "Copiar"}
              </Botao>
              <a href="/cardapio" target="_blank" rel="noreferrer">
                <Botao variante="secundario" tamanho="sm" className="w-full">
                  <ExternalLink size={15} /> Abrir
                </Botao>
              </a>
            </div>
            <p className="mt-2 text-[12px] text-mudo">Coloque no Instagram, no WhatsApp Business e no Google Meu Negócio.</p>
          </Cartao>

          <Cartao titulo="QR Code nas mesas">
            <label className="flex items-center justify-between gap-3 text-[13.5px]">
              <span>Cliente pode pedir pelo QR Code</span>
              <input type="checkbox" checked={config.qrPedidos} onChange={(e) => salvarConfig({ qrPedidos: e.target.checked }, e.target.checked ? "Ligou pedidos pelo QR Code" : "Desligou pedidos pelo QR Code")} className="h-5 w-5 accent-[var(--acao)]" />
            </label>
            <p className="mt-1 text-[12px] text-mudo">Desligado, o QR mostra só o cardápio, a conta e o botão de chamar o garçom.</p>
            <Link href="/mesas/qrcodes" className="mt-3 block">
              <Botao variante="secundario" className="w-full">
                <QrCode size={17} /> Imprimir QR Codes das mesas
              </Botao>
            </Link>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
