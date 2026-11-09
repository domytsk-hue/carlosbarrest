import type { Conta, Mesa } from "./tipos";

type MesaRef = Pick<Mesa, "id" | "numero"> & { area?: string };

/** "Mesa 12 · Varanda": número e localização atual da mesa. */
export function rotuloMesa(m: MesaRef | undefined) {
  if (!m) return "Mesa ?";
  return m.area ? `Mesa ${m.numero} · ${m.area}` : `Mesa ${m.numero}`;
}

/** Nome curto de uma conta de qualquer canal, usado em telas e impressos. */
export function nomeConta(c: Conta, mesas: MesaRef[]) {
  switch (c.canal) {
    case "mesa":
    case "qrcode":
      return rotuloMesa(mesas.find((m) => m.id === c.mesaId));
    case "comanda":
      return `Comanda ${c.comanda}`;
    case "entrega":
    case "delivery":
      return c.paraViagem ? `Retirada #${c.numero}` : `Entrega #${c.numero}`;
    case "ifood":
      return `iFood #${c.numero}`;
    case "aiqfome":
      return `aiqfome #${c.numero}`;
    case "pdv":
      return `Venda #${c.numero}`;
    default:
      return `${c.paraViagem ? "Viagem" : "Balcão"} #${c.numero}`;
  }
}

/** Rótulo da linha de comissão: "Comissão (10%)" ou só "Comissão" quando o cliente escolheu outro valor. */
export function rotuloComissao(c: Conta) {
  return c.servicoValor !== undefined ? "Comissão" : `Comissão (${c.servicoPct}%)`;
}
