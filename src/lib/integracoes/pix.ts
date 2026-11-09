// Pix "copia e cola" (BR Code / EMV MPM) conforme o Manual de Padrões para
// Iniciação do Pix do Banco Central. Gera o QR estático com valor e
// identificador; o banco do cliente lê e já preenche tudo.
//
// O QR estático não avisa o sistema quando é pago: o operador confirma.
// Para baixa automática, use um PSP com QR dinâmico e webhook (ver
// `provedor-pix.ts` e `src/app/api/webhooks/pix/route.ts`).

function campo(id: string, valor: string) {
  return id + String(valor.length).padStart(2, "0") + valor;
}

/** Remove acentos e caracteres fora do conjunto aceito pelo BR Code. */
function limpar(s: string, max: number) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, "")
    .toUpperCase()
    .slice(0, max)
    .trim();
}

export function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type DadosPix = {
  chave: string;
  nome: string;
  cidade: string;
  valor?: number;
  /** Identificador da cobrança (até 25 letras/números) */
  txid?: string;
  descricao?: string;
};

export function gerarPixCopiaECola({ chave, nome, cidade, valor, txid, descricao }: DadosPix) {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave.trim()) + (descricao ? campo("02", limpar(descricao, 40)) : "");
  const id = (txid ?? "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  let payload =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor && valor > 0 ? campo("54", valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(nome, 25) || "RESTAURANTE") +
    campo("60", limpar(cidade, 15) || "BRASIL") +
    campo("62", campo("05", id));
  payload += "6304";
  return payload + crc16(payload);
}
