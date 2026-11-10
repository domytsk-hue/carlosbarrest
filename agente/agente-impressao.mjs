#!/usr/bin/env node
// Agente local de impressão do Carlos.
//
// Roda no computador do caixa (Node 18+). O sistema, aberto no navegador, manda
// o cupom já em ESC/POS e o NOME da impressora ("cozinha", "bar", "caixa"); o
// agente repassa para o IP:porta cadastrado AQUI, no arquivo impressoras.json.
//
// Segurança:
// - O navegador só escolhe entre as impressoras do impressoras.json; não há
//   como mandar para outro endereço nem gravar arquivos.
// - Só responde em 127.0.0.1 e só para os endereços listados em "origens".
// - Cada cupom tem no máximo 256 KB.

import { createServer } from "node:http";
import { connect } from "node:net";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSAO = "1.0.0";
const pasta = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(pasta, "impressoras.json"), "utf8"));
const PORTA = Number(config.porta ?? 9123);
const ORIGENS = new Set(config.origens ?? ["http://localhost:3000"]);
const IMPRESSORAS = config.impressoras ?? {};
const LIMITE = 256 * 1024;

for (const [nome, end] of Object.entries(IMPRESSORAS)) {
  if (!/^[\w.-]+:\d{2,5}$/.test(String(end))) throw new Error(`Endereço inválido para "${nome}": use IP:porta, ex. 192.168.0.50:9100`);
}

function enviar(nome, bytes) {
  const [host, porta] = IMPRESSORAS[nome].split(":");
  return new Promise((ok, falha) => {
    const sock = connect({ host, port: Number(porta), timeout: 5000 }, () => sock.end(bytes, ok));
    sock.on("timeout", () => {
      sock.destroy();
      falha(new Error(`Impressora "${nome}" (${host}) não respondeu`));
    });
    sock.on("error", falha);
  });
}

const TESTE = Buffer.from("\x1b@\x1ba\x01\x1bE\x01CARLO'S - TESTE DE IMPRESSAO\x1bE\x00\n" + "Agente " + VERSAO + "\n\n\n\x1dVB\x00", "latin1");

function lerJson(req) {
  return new Promise((ok, falha) => {
    let tam = 0;
    const partes = [];
    req.on("data", (c) => {
      tam += c.length;
      if (tam > LIMITE * 2) {
        req.destroy();
        falha(new Error("cupom grande demais"));
      } else partes.push(c);
    });
    req.on("end", () => {
      try {
        ok(JSON.parse(Buffer.concat(partes).toString("utf8") || "{}"));
      } catch {
        falha(new Error("JSON inválido"));
      }
    });
  });
}

createServer(async (req, res) => {
  const origem = req.headers.origin;
  const json = (status, corpo) => res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(corpo));
  if (!origem || !ORIGENS.has(origem)) return json(403, { erro: "origem não autorizada (veja 'origens' no impressoras.json)" });
  res.setHeader("Access-Control-Allow-Origin", origem);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") return res.writeHead(204).end();

  try {
    if (req.method === "GET" && req.url === "/status") return json(200, { ok: true, versao: VERSAO, impressoras: Object.keys(IMPRESSORAS) });
    if (req.method === "POST" && (req.url === "/imprimir" || req.url === "/testar")) {
      const { impressora, dados } = await lerJson(req);
      if (!Object.hasOwn(IMPRESSORAS, impressora)) return json(404, { erro: `Impressora "${impressora}" não está no impressoras.json` });
      const bytes = req.url === "/testar" ? TESTE : Buffer.from(String(dados ?? ""), "base64");
      if (!bytes.length || bytes.length > LIMITE) return json(400, { erro: "cupom vazio ou grande demais" });
      await enviar(impressora, bytes);
      console.log(new Date().toLocaleTimeString("pt-BR"), "→", impressora, bytes.length, "bytes");
      return json(200, { ok: true });
    }
    json(404, { erro: "rota não encontrada" });
  } catch (e) {
    console.error("erro:", e.message);
    json(502, { erro: e.message });
  }
}).listen(PORTA, "127.0.0.1", () => console.log(`Agente de impressão Carlos ${VERSAO} em http://localhost:${PORTA} · impressoras: ${Object.keys(IMPRESSORAS).join(", ")}`));
