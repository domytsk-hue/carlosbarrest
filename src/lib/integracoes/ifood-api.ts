import "server-only";

// Cliente mínimo da Merchant API do iFood (https://developer.ifood.com.br).
// Credenciais do app (client credentials) em IFOOD_CLIENT_ID / IFOOD_CLIENT_SECRET.

const BASE = "https://merchant-api.ifood.com.br";
let token: { valor: string; expira: number } | null = null;

export const ifoodConfigurado = () => Boolean(process.env.IFOOD_CLIENT_ID && process.env.IFOOD_CLIENT_SECRET);

async function obterToken() {
  if (token && token.expira > Date.now() + 60_000) return token.valor;
  const r = await fetch(`${BASE}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grantType: "client_credentials", clientId: process.env.IFOOD_CLIENT_ID!, clientSecret: process.env.IFOOD_CLIENT_SECRET! }),
  });
  if (!r.ok) throw new Error(`iFood: autenticação falhou (${r.status})`);
  const j = (await r.json()) as { accessToken: string; expiresIn: number };
  token = { valor: j.accessToken, expira: Date.now() + j.expiresIn * 1000 };
  return token.valor;
}

async function chamar(caminho: string, metodo = "GET", corpo?: unknown) {
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: { Authorization: `Bearer ${await obterToken()}`, ...(corpo ? { "Content-Type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok && r.status !== 202 && r.status !== 204) throw new Error(`iFood ${metodo} ${caminho}: ${r.status}`);
  return r.status === 200 ? r.json() : null;
}

export const detalhesPedido = (id: string) => chamar(`/order/v1.0/orders/${encodeURIComponent(id)}`) as Promise<Record<string, unknown>>;

/** Eventos pendentes (alternativa ao webhook) e confirmação de leitura. */
export const eventosPendentes = () => chamar("/order/v1.0/events:polling") as Promise<{ id: string; code: string; orderId: string; merchantId: string }[] | null>;
export const reconhecerEventos = (ids: string[]) => chamar("/order/v1.0/events/acknowledgment", "POST", ids.map((id) => ({ id })));

const ROTA_ACAO: Record<string, string> = { confirmar: "confirm", pronto: "readyToPickup", despachar: "dispatch" };

export async function mudarStatus(id: string, acao: string) {
  const rota = ROTA_ACAO[acao];
  if (!rota) return;
  await chamar(`/order/v1.0/orders/${encodeURIComponent(id)}/${rota}`, "POST");
}
