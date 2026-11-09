// Chatbot de atendimento (WhatsApp): responde às perguntas mais comuns sem
// ninguém precisar parar o que está fazendo. Lógica pura: roda igual no
// simulador da tela e no webhook do servidor.
import { brl } from "../dominio/calculos";
import { resumoPromocao } from "../dominio/promocoes";
import type { Promocao, RespostaBot, StatusEntrega } from "../dominio/tipos";

export type ConfigBot = { ativo: boolean; saudacao: string; horario: string; foraDoHorario: string; respostas: RespostaBot[] };

export type PedidoBot = { numero: number; statusEntrega?: StatusEntrega; total: number; retirada?: boolean; abertaEm: string };

export type ContextoBot = {
  nome: string;
  endereco: string;
  bot: ConfigBot;
  /** Delivery recebendo pedidos agora */
  aberto: boolean;
  tempoEntrega: number;
  pedidoMinimo: number;
  urlCardapio: string;
  promocoes: Promocao[];
  /** Pedidos recentes do telefone que mandou a mensagem */
  pedidos: PedidoBot[];
  agora?: Date;
};

export type Intencao = "saudacao" | "cardapio" | "horario" | "endereco" | "pedido" | "promocoes" | "taxa" | "pagamento" | "atendente" | "personalizada" | "nao_entendi";

export type Resposta = { intencao: Intencao; texto: string; /** Pede para um atendente humano assumir */ transferir?: boolean };

const STATUS: Record<StatusEntrega, string> = {
  novo: "recebido e aguardando confirmação do restaurante",
  confirmado: "confirmado ✅",
  preparo: "em preparo na cozinha 👨‍🍳",
  pronto: "pronto",
  saiu: "saiu para entrega 🛵",
  entregue: "entregue",
};

/** Minúsculas, sem acento e sem pontuação, para comparar palavras. */
export function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const tem = (t: string, palavras: string[]) => palavras.some((p) => new RegExp(`(^| )${p}`).test(t));

const REGRAS: { i: Exclude<Intencao, "personalizada" | "nao_entendi" | "saudacao">; p: string[] }[] = [
  { i: "atendente", p: ["atendente", "humano", "pessoa", "falar com", "gerente", "reclama"] },
  { i: "pedido", p: ["meu pedido", "pedido", "demora", "chega", "chegando", "status", "cade", "atras"] },
  { i: "promocoes", p: ["promo", "cupom", "desconto", "happy", "combo", "oferta"] },
  { i: "taxa", p: ["taxa", "frete", "entrega", "entregam", "bairro", "minimo"] },
  { i: "pagamento", p: ["pix", "cartao", "pagamento", "pagar", "dinheiro", "troco"] },
  { i: "horario", p: ["horario", "hora", "abre", "aberto", "fecha", "funciona", "hoje"] },
  { i: "endereco", p: ["endereco", "onde fica", "localiza", "local", "como chego", "mapa"] },
  { i: "cardapio", p: ["cardapio", "menu", "pedir", "quero", "preco", "valor", "tem "] },
];

export function intencao(texto: string, respostas: RespostaBot[] = []): { i: Intencao; r?: RespostaBot } {
  const t = normalizar(texto);
  if (!t) return { i: "saudacao" };
  // Respostas cadastradas pelo restaurante vêm primeiro
  for (const r of respostas) {
    const g = r.gatilhos.split(",").map(normalizar).filter(Boolean);
    if (g.length && tem(t, g)) return { i: "personalizada", r };
  }
  for (const regra of REGRAS) if (tem(t, regra.p)) return { i: regra.i };
  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|opa|menu|inicio|0)$/.test(t) || t.split(" ").length <= 2) return { i: "saudacao" };
  return { i: "nao_entendi" };
}

const MENU = (c: ContextoBot) =>
  [`Posso ajudar com:`, `1️⃣ Cardápio e pedido: ${c.urlCardapio}`, `2️⃣ Horário de funcionamento`, `3️⃣ Endereço`, `4️⃣ Acompanhar meu pedido`, `5️⃣ Promoções`, `6️⃣ Falar com um atendente`].join("\n");

const ATALHO_NUM: Record<string, Intencao> = { "1": "cardapio", "2": "horario", "3": "endereco", "4": "pedido", "5": "promocoes", "6": "atendente" };

export function responder(texto: string, c: ContextoBot): Resposta {
  const agora = c.agora ?? new Date();
  const num = normalizar(texto);
  const { i, r } = ATALHO_NUM[num] ? { i: ATALHO_NUM[num], r: undefined } : intencao(texto, c.bot.respostas);
  const fechado = c.aberto ? "" : `\n\n${c.bot.foraDoHorario}`;

  switch (i) {
    case "personalizada":
      return { intencao: i, texto: r!.resposta };
    case "cardapio":
      return { intencao: i, texto: `Nosso cardápio completo, com fotos e preços, está aqui: ${c.urlCardapio}\nVocê monta o pedido por lá e acompanha a entrega em tempo real.${fechado}` };
    case "horario":
      return { intencao: i, texto: `🕒 ${c.bot.horario}.${c.aberto ? "\nEstamos abertos agora e recebendo pedidos!" : fechado}` };
    case "endereco":
      return { intencao: i, texto: `📍 ${c.endereco}\nhttps://maps.google.com/?q=${encodeURIComponent(c.endereco)}` };
    case "taxa":
      return { intencao: i, texto: `A taxa de entrega depende do bairro e aparece no cardápio quando você escolhe o endereço. Pedido mínimo: ${brl(c.pedidoMinimo)}. Tempo médio: ${c.tempoEntrega} min.\n${c.urlCardapio}` };
    case "pagamento":
      return { intencao: i, texto: "Aceitamos Pix (o QR Code aparece na tela depois do pedido), dinheiro (é só informar o troco) e cartão na entrega." };
    case "promocoes": {
      const hoje = agora.toLocaleDateString("sv-SE");
      // Lista o que está ativo (o happy hour aparece com o horário, mesmo fora dele)
      const ativas = c.promocoes.filter(
        (p) => p.ativo && (!p.validoAte || p.validoAte >= hoje) && !(p.limiteUsos && (p.usos ?? 0) >= p.limiteUsos) && (p.tipo !== "cupom" || !p.canais?.length || p.canais.includes("delivery")),
      );
      if (!ativas.length) return { intencao: i, texto: `No momento não temos promoção ativa, mas o cardápio está aqui: ${c.urlCardapio}` };
      return { intencao: i, texto: `🔥 Promoções:\n${ativas.map((p) => `• ${p.nome}: ${resumoPromocao(p)}`).join("\n")}\n\n${c.urlCardapio}` };
    }
    case "pedido": {
      const p = [...c.pedidos].sort((a, b) => b.abertaEm.localeCompare(a.abertaEm))[0];
      if (!p) return { intencao: i, texto: "Não encontrei pedido recente neste número. Se pediu por outro telefone, me mande o número do pedido que um atendente confere para você.", transferir: true };
      const st = p.statusEntrega ?? "novo";
      const sufixo = p.retirada && st === "pronto" ? "pronto para retirada 🎉" : STATUS[st];
      return { intencao: i, texto: `Seu pedido #${p.numero} (${brl(p.total)}) está ${sufixo}.${st === "preparo" || st === "confirmado" ? ` Tempo médio de entrega: ${c.tempoEntrega} min.` : ""}` };
    }
    case "atendente":
      return { intencao: i, texto: "Certo! Já chamei um atendente, ele responde por aqui em instantes. 🙋", transferir: true };
    case "saudacao":
      return { intencao: i, texto: `${c.bot.saudacao}\n\n${MENU(c)}${fechado}` };
    default:
      return { intencao: "nao_entendi", texto: `Desculpe, não entendi. 😅\n\n${MENU(c)}` };
  }
}
