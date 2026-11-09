"use client";

import { useEffect, useState } from "react";
import { brl, hora, itensValidos, pago, restante, subtotal, total, totalItem, valorServico } from "@/lib/dominio/calculos";
import type { Conta, Setor } from "@/lib/dominio/tipos";
import { obterEstado } from "@/lib/loja/loja";

// Impressão em bobina de 80 mm pelo navegador (Ctrl+P).
// O agente local de impressão (Fase 4) recebe o mesmo conteúdo em ESC/POS.

type Trabalho =
  | { tipo: "conta"; conta: Conta }
  | { tipo: "preparo"; conta: Conta; pedidoNumero?: number; setor?: Setor }
  | { tipo: "texto"; titulo: string; linhas: [string, string][] };

let definir: ((t: Trabalho | null) => void) | null = null;

export function imprimir(t: Trabalho) {
  definir?.(t);
  setTimeout(() => window.print(), 80);
}

function rotuloConta(c: Conta) {
  const e = obterEstado();
  if (c.canal === "mesa") return `Mesa ${e.mesas.find((m) => m.id === c.mesaId)?.numero ?? "?"}`;
  if (c.canal === "comanda") return `Comanda ${c.comanda}`;
  if (c.canal === "entrega" || c.canal === "delivery") return `Entrega #${c.numero}`;
  return `${c.paraViagem ? "Viagem" : "Balcão"} #${c.numero}`;
}

export function AreaImpressao() {
  const [t, setT] = useState<Trabalho | null>(null);
  useEffect(() => {
    definir = setT;
    return () => {
      definir = null;
    };
  }, []);
  if (!t) return null;
  const nome = obterEstado().config.nome;

  return (
    <div id="area-impressao" className="hidden">
      <div className="cupom">
        <p className="c">
          <b>{nome}</b>
        </p>
        {t.tipo === "texto" ? (
          <>
            <p className="c">{t.titulo}</p>
            <hr />
            {t.linhas.map(([a, b], i) => (
              <p key={i} className="l">
                <span>{a}</span>
                <span>{b}</span>
              </p>
            ))}
          </>
        ) : t.tipo === "preparo" ? (
          <>
            <p className="c g">PREPARO {t.setor ? `· ${t.setor.toUpperCase()}` : ""}</p>
            <p className="c">
              {rotuloConta(t.conta)} · Pedido {t.pedidoNumero ?? "—"} · {hora(new Date().toISOString())}
            </p>
            <hr />
            {itensValidos(t.conta)
              .filter((i) => (t.pedidoNumero ? i.pedidoNumero === t.pedidoNumero : true) && (!t.setor || i.setor === t.setor))
              .map((i) => (
                <div key={i.id}>
                  <p className="g">
                    {i.qtd}x {i.nome}
                  </p>
                  {i.obs && <p>  &gt; {i.obs}</p>}
                </div>
              ))}
          </>
        ) : (
          <>
            <p className="c">{rotuloConta(t.conta)} · Conta {t.conta.numero}</p>
            <p className="c">{new Date().toLocaleString("pt-BR")}</p>
            {t.conta.clienteNome && <p>Cliente: {t.conta.clienteNome}</p>}
            {t.conta.endereco && (
              <p>
                {t.conta.endereco.rua}, {t.conta.endereco.numero} {t.conta.endereco.complemento}
              </p>
            )}
            <hr />
            {itensValidos(t.conta).map((i) => (
              <p key={i.id} className="l">
                <span>
                  {i.qtd}x {i.nome}
                </span>
                <span>{brl(totalItem(i))}</span>
              </p>
            ))}
            <hr />
            <p className="l">
              <span>Subtotal</span>
              <span>{brl(subtotal(t.conta))}</span>
            </p>
            {t.conta.servicoPct > 0 && (
              <p className="l">
                <span>Serviço {t.conta.servicoPct}%</span>
                <span>{brl(valorServico(t.conta))}</span>
              </p>
            )}
            {t.conta.couvert > 0 && (
              <p className="l">
                <span>Couvert</span>
                <span>{brl(t.conta.couvert)}</span>
              </p>
            )}
            {t.conta.taxaEntrega > 0 && (
              <p className="l">
                <span>Taxa de entrega</span>
                <span>{brl(t.conta.taxaEntrega)}</span>
              </p>
            )}
            {t.conta.desconto > 0 && (
              <p className="l">
                <span>Desconto</span>
                <span>-{brl(t.conta.desconto)}</span>
              </p>
            )}
            <p className="l g">
              <span>TOTAL</span>
              <span>{brl(total(t.conta))}</span>
            </p>
            {pago(t.conta) > 0 && (
              <>
                <p className="l">
                  <span>Pago</span>
                  <span>{brl(pago(t.conta))}</span>
                </p>
                <p className="l">
                  <span>Restante</span>
                  <span>{brl(restante(t.conta))}</span>
                </p>
              </>
            )}
            <hr />
            <p className="c">Não é documento fiscal · Obrigado pela preferência!</p>
          </>
        )}
      </div>
    </div>
  );
}
