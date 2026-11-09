// Balança no balcão (Toledo Prix, Filizola, Urano) pela porta serial/USB do
// computador, usando a Web Serial API do Chrome/Edge. Protocolo padrão das
// balanças de checkout: envia ENQ (0x05) e recebe STX + peso + ETX.
//
// Sem navegador compatível ou sem balança, o operador digita o peso.

type PortaSerial = {
  open(o: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};
type Serial = { requestPort(): Promise<PortaSerial>; getPorts(): Promise<PortaSerial[]> };

export const balancaDisponivel = () => typeof navigator !== "undefined" && "serial" in navigator;

let porta: PortaSerial | null = null;

async function obterPorta() {
  const serial = (navigator as unknown as { serial: Serial }).serial;
  if (porta) return porta;
  const ja = await serial.getPorts();
  porta = ja[0] ?? (await serial.requestPort());
  await porta.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none" });
  return porta;
}

/** Interpreta a resposta da balança e devolve o peso em kg (ou null se instável). */
export function interpretarPeso(bytes: Uint8Array): number | null {
  const txt = new TextDecoder("ascii").decode(bytes);
  // Respostas instáveis/sobrecarga vêm como "IIIII", "NNNNN" ou "SSSSS"
  if (/[INS]{3,}/.test(txt)) return null;
  const dig = txt.replace(/[^0-9.,]/g, "");
  if (!dig) return null;
  if (/[.,]/.test(dig)) return Number(dig.replace(",", "."));
  // Sem separador: 5 dígitos em gramas (00500 = 0,500 kg)
  return Number(dig) / 1000;
}

/** Pede o peso à balança. Lança erro se não houver resposta em 2 s. */
export async function lerPeso(): Promise<number> {
  const p = await obterPorta();
  const w = p.writable!.getWriter();
  await w.write(new Uint8Array([0x05]));
  w.releaseLock();
  const r = p.readable!.getReader();
  const buf: number[] = [];
  const limite = setTimeout(() => r.cancel(), 2000);
  try {
    while (true) {
      const { value, done } = await r.read();
      if (done) break;
      buf.push(...value);
      if (buf.includes(0x03) || buf.length > 20) break;
    }
  } finally {
    clearTimeout(limite);
    r.releaseLock();
  }
  const peso = interpretarPeso(new Uint8Array(buf));
  if (peso === null || !(peso > 0)) throw new Error("Peso instável ou balança vazia. Tente de novo.");
  return peso;
}
