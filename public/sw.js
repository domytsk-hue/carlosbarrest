/* Funcionamento sem internet (service worker)
 *
 * Guarda no aparelho as telas do sistema e os arquivos que elas usam, para que
 * o painel, a cozinha e o app do garçom continuem abrindo quando a internet do
 * restaurante cair. Os dados (contas, pedidos...) já ficam no aparelho e são
 * enviados ao Supabase quando a conexão volta (src/lib/loja/nuvem.ts).
 *
 * - Telas: busca na internet primeiro (até 4 s); sem resposta, abre a cópia guardada.
 * - Arquivos do Next (/_next/static): nunca mudam de conteúdo, então a cópia guardada vale.
 * - Imagens e ícones: abre a cópia guardada e atualiza por trás.
 * - Supabase e /api: não passam por aqui (sempre direto na internet).
 *
 * A versão vem do endereço (/sw.js?v=<deploy>): cada deploy cria caches novos
 * e apaga os antigos.
 */

const VERSAO = new URL(self.location.href).searchParams.get("v") || "dev";
const PAGINAS = "carlos-paginas-" + VERSAO;
const ESTATICOS = "carlos-estaticos-" + VERSAO;
const IMAGENS = "carlos-imagens";
const ESPERA_REDE = 4000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => n.startsWith("carlos-") && ![PAGINAS, ESTATICOS, IMAGENS].includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Resposta que pode ser guardada como a tela daquele endereço (sem desvio para o login). */
const guardavel = (r) => r && r.ok && r.type === "basic" && !r.redirected;

function comPrazo(promessa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("demorou")), ms);
    promessa.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

const TELA_OFFLINE = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem internet · Carlos</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F7EEE3;color:#2B1A14;font:16px/1.5 Poppins,system-ui,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:420px;text-align:center}h1{color:#9E1B1E;font-size:22px;margin:0 0 8px}a{display:inline-block;margin-top:16px;background:#B8322A;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600}</style></head>
<body><main><h1>Sem internet</h1><p>Esta tela ainda não tinha sido aberta neste aparelho, então não há cópia guardada. As telas já usadas continuam funcionando.</p><a href="/">Voltar ao início</a></main></body></html>`;

async function tela(request) {
  const cache = await caches.open(PAGINAS);
  try {
    const resposta = await comPrazo(fetch(request), ESPERA_REDE);
    if (guardavel(resposta)) await cache.put(request.url.split("#")[0], resposta.clone());
    return resposta;
  } catch {
    const guardada = (await cache.match(request.url, { ignoreSearch: false })) || (await cache.match(request.url, { ignoreSearch: true }));
    if (guardada) return guardada;
    return new Response(TELA_OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function estatico(request) {
  const cache = await caches.open(ESTATICOS);
  const guardado = await cache.match(request);
  if (guardado) return guardado;
  const resposta = await fetch(request);
  if (resposta.ok) await cache.put(request, resposta.clone());
  return resposta;
}

async function imagem(request, evento) {
  const cache = await caches.open(IMAGENS);
  const guardada = await cache.match(request);
  const daRede = fetch(request)
    .then(async (r) => {
      if (r.ok || r.type === "opaque") await cache.put(request, r.clone());
      return r;
    })
    .catch(() => guardada || Response.error());
  if (guardada) {
    evento.waitUntil(daRede);
    return guardada;
  }
  return daRede;
}

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const mesmaOrigem = url.origin === self.location.origin;

  if (mesmaOrigem && (url.pathname.startsWith("/api/") || url.pathname === "/sw.js")) return;

  // Navegação dentro do app (Next busca a tela em formato próprio): sem internet,
  // a falha faz o Next abrir a página inteira, que sai da cópia guardada.
  if (mesmaOrigem && request.headers.get("RSC")) return;

  if (request.mode === "navigate" && mesmaOrigem) {
    evento.respondWith(tela(request));
    return;
  }
  if (mesmaOrigem && url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(estatico(request));
    return;
  }
  if (request.destination === "image" || request.destination === "font" || (mesmaOrigem && /\.(png|svg|jpg|jpeg|webp|ico|webmanifest)$/.test(url.pathname))) {
    evento.respondWith(imagem(request, evento));
  }
});

// Ao abrir o sistema com internet, o app pede para guardar as telas principais
// (e os arquivos de cada uma), para que abram mesmo que nunca tenham sido visitadas.
self.addEventListener("message", (evento) => {
  const dados = evento.data || {};
  if (dados.tipo !== "aquecer" || !Array.isArray(dados.rotas)) return;
  evento.waitUntil(aquecer(dados.rotas));
});

async function aquecer(rotas) {
  const paginas = await caches.open(PAGINAS);
  const estaticos = await caches.open(ESTATICOS);
  const imagens = await caches.open(IMAGENS);
  const arquivos = new Set();
  const figuras = new Set(["/logo.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"]);
  for (const rota of rotas) {
    try {
      const url = new URL(rota, self.location.origin).href;
      if (await paginas.match(url)) continue;
      const r = await fetch(url, { credentials: "same-origin" });
      if (!guardavel(r)) continue;
      const html = await r.clone().text();
      await paginas.put(url, r);
      for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)]+/g)) arquivos.add(m[0]);
      for (const m of html.matchAll(/src="(\/[^"/][^"]*\.(?:svg|png|jpg|jpeg|webp))"/g)) figuras.add(m[1]);
    } catch {
      // sem internet ou tela com erro: tenta de novo na próxima abertura
    }
  }
  for (const a of arquivos) {
    try {
      if (await estaticos.match(a)) continue;
      const r = await fetch(a);
      if (!r.ok) continue;
      if (a.endsWith(".css")) {
        const css = await r.clone().text();
        for (const m of css.matchAll(/\/_next\/static\/media\/[^"')\s]+/g)) arquivos.add(m[0]);
      }
      await estaticos.put(a, r);
    } catch {}
  }
  for (const f of figuras) {
    try {
      if (await imagens.match(f)) continue;
      const r = await fetch(f);
      if (r.ok) await imagens.put(f, r);
    } catch {}
  }
}
