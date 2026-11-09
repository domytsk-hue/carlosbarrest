// Montagem de cupons em ESC/POS para impressoras térmicas de 80 mm (Epson,
// Elgin, Bematech, Daruma em modo ESC/POS). Acentos na página de código 860
// (português); o que não existir nela sai sem acento.

const ESC = 0x1b;
const GS = 0x1d;

// CP860: caracteres acentuados do português
const CP860: Record<string, number> = {
  Ç: 0x80, ü: 0x81, é: 0x82, â: 0x83, ã: 0x84, à: 0x85, Á: 0x86, ç: 0x87, ê: 0x88, Ê: 0x89, è: 0x8a, Í: 0x8b, Ô: 0x8c, ì: 0x8d, Ã: 0x8e, Â: 0x8f,
  É: 0x90, À: 0x91, È: 0x92, ô: 0x93, õ: 0x94, ò: 0x95, Ú: 0x96, ù: 0x97, Ì: 0x98, Õ: 0x99, Ü: 0x9a, Ó: 0x9f, á: 0xa0, í: 0xa1, ó: 0xa2, ú: 0xa3,
  ñ: 0xa4, Ñ: 0xa5, ª: 0xa6, º: 0xa7, "°": 0xf8,
};

const TROCAS: Record<string, string> = { "·": "-", "—": "-", "–": "-", "…": "...", "“": '"', "”": '"', "‘": "'", "’": "'", "×": "x" };

export function codificar(texto: string): number[] {
  const out: number[] = [];
  for (const ch of texto.replace(/\u00a0/g, " ").replace(/[·—–…“”‘’×]/g, (c) => TROCAS[c] ?? c)) {
    const c = ch.charCodeAt(0);
    if (c < 0x80) out.push(c);
    else if (CP860[ch] !== undefined) out.push(CP860[ch]);
    else
      for (const x of ch.normalize("NFD").replace(/[̀-ͯ]/g, "")) out.push(x.charCodeAt(0) < 0x80 ? x.charCodeAt(0) : 0x3f);
  }
  return out;
}

function quebrar(s: string, larg: number) {
  const res: string[] = [];
  for (const par of s.split("\n")) {
    let atual = "";
    for (const p of par.split(" ")) {
      if ((atual + " " + p).trim().length > larg) {
        if (atual) res.push(atual);
        atual = p.length > larg ? p.slice(0, larg) : p;
      } else atual = (atual + " " + p).trim();
    }
    res.push(atual);
  }
  return res;
}

export class Cupom {
  private b: number[] = [ESC, 0x40, ESC, 0x74, 3]; // inicializa + CP860
  constructor(public colunas = 48) {}

  private estilo(negrito: boolean, grande: boolean, centro: boolean) {
    this.b.push(ESC, 0x45, negrito ? 1 : 0, GS, 0x21, grande ? 0x11 : 0x00, ESC, 0x61, centro ? 1 : 0);
  }

  texto(s: string, o: { negrito?: boolean; grande?: boolean; centro?: boolean } = {}) {
    this.estilo(!!o.negrito, !!o.grande, !!o.centro);
    const larg = o.grande ? Math.floor(this.colunas / 2) : this.colunas;
    for (const linha of quebrar(s, larg)) this.b.push(...codificar(linha), 0x0a);
    this.estilo(false, false, false);
    return this;
  }

  /** Texto à esquerda e valor à direita na mesma linha. */
  linha(esq: string, dir: string, negrito = false) {
    const espaco = this.colunas - dir.length - 1;
    const partes = quebrar(esq, Math.max(8, espaco));
    this.estilo(negrito, false, false);
    partes.forEach((p, i) => this.b.push(...codificar(i === partes.length - 1 ? p.padEnd(this.colunas - dir.length) + dir : p), 0x0a));
    this.estilo(false, false, false);
    return this;
  }

  separador(c = "-") {
    this.b.push(...codificar(c.repeat(this.colunas)), 0x0a);
    return this;
  }

  /** Avança o papel e corta (corte parcial). */
  cortar() {
    this.b.push(0x0a, 0x0a, 0x0a, GS, 0x56, 0x42, 0x00);
    return this;
  }

  /** Pulso para abrir a gaveta de dinheiro ligada à impressora. */
  abrirGaveta() {
    this.b.push(ESC, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  bytes() {
    return new Uint8Array(this.b);
  }

  base64() {
    let s = "";
    for (const x of this.b) s += String.fromCharCode(x);
    return btoa(s);
  }
}
