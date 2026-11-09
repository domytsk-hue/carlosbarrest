"use client";

import clsx from "clsx";
import { Bot, Plus, Send, Trash2, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Botao, Campo, Cartao, Entrada, Pilula, Titulo } from "@/components/ui";
import { arred } from "@/lib/dominio/calculos";
import { responder, type ContextoBot, type Resposta } from "@/lib/chatbot/bot";
import { salvarChatbot } from "@/lib/loja/acoes-crescimento";
import { obterEstado, novoId, useLoja } from "@/lib/loja/loja";

const SUGESTOES = ["Oi", "Qual o horário?", "Cadê meu pedido?", "Tem promoção?", "Quanto é a taxa de entrega?", "Vocês fazem reserva?", "Quero falar com atendente"];

function contexto(telefone: string): ContextoBot {
  const e = obterEstado();
  const tel = telefone.replace(/\D/g, "");
  return {
    nome: e.config.nome,
    endereco: e.config.endereco,
    bot: e.config.chatbot,
    aberto: e.config.deliveryAberto,
    tempoEntrega: e.config.tempoEntrega,
    pedidoMinimo: e.config.pedidoMinimo,
    urlCardapio: `${location.origin}/cardapio`,
    promocoes: e.promocoes,
    pedidos: e.contas
      .filter((c) => tel.length >= 8 && c.telefone?.replace(/\D/g, "").endsWith(tel.slice(-8)) && c.status !== "cancelada")
      .map((c) => ({
        numero: c.numero,
        statusEntrega: c.statusEntrega,
        retirada: c.paraViagem,
        abertaEm: c.abertaEm,
        total: arred(c.itens.filter((i) => !i.cancelado).reduce((s, i) => s + i.preco * i.qtd, 0) + (c.taxaEntrega ?? 0) - c.desconto),
      })),
  };
}

type Msg = { de: "cliente" | "bot"; texto: string; r?: Resposta };

export default function ChatbotPage() {
  const cfg = useLoja((e) => e.config.chatbot);
  const [c, setC] = useState(cfg);
  const [salvo, setSalvo] = useState(false);
  useEffect(() => {
    setC(cfg);
  }, [cfg]);
  const set = (p: Partial<typeof c>) => (setC({ ...c, ...p }), setSalvo(false));
  const mudou = JSON.stringify(c) !== JSON.stringify(cfg);

  return (
    <div className="mx-auto max-w-[1200px]">
      <Titulo sub="Atendimento automático no WhatsApp: cardápio, horário, endereço, status do pedido e promoções">Chatbot</Titulo>
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="grid content-start gap-4">
          <Cartao
            titulo="Configuração"
            acao={
              <label className="flex items-center gap-2 text-[13px] font-bold">
                <input type="checkbox" checked={c.ativo} onChange={(e) => set({ ativo: e.target.checked })} className="h-5 w-5 accent-[var(--acao)]" />
                {c.ativo ? <Pilula cor="verde">Ligado</Pilula> : <Pilula>Desligado</Pilula>}
              </label>
            }
          >
            <div className="grid gap-3">
              <Campo rotulo="Saudação (primeira mensagem)">
                <Entrada value={c.saudacao} onChange={(e) => set({ saudacao: e.target.value })} />
              </Campo>
              <Campo rotulo="Horário de funcionamento">
                <Entrada value={c.horario} onChange={(e) => set({ horario: e.target.value })} />
              </Campo>
              <Campo rotulo="Mensagem quando o delivery está fechado">
                <Entrada value={c.foraDoHorario} onChange={(e) => set({ foraDoHorario: e.target.value })} />
              </Campo>
            </div>
          </Cartao>

          <Cartao
            titulo="Respostas personalizadas"
            acao={
              <Botao variante="secundario" tamanho="sm" onClick={() => set({ respostas: [...c.respostas, { id: novoId("rb"), gatilhos: "", resposta: "" }] })}>
                <Plus size={15} /> Resposta
              </Botao>
            }
          >
            <p className="mb-3 text-[12.5px] text-mudo">Quando a mensagem do cliente tiver uma das palavras (separadas por vírgula), o robô manda a resposta. Elas têm prioridade sobre as respostas padrão.</p>
            <div className="grid gap-3">
              {c.respostas.map((r, i) => (
                <div key={r.id} className="grid gap-2 rounded-2xl border border-linha p-3">
                  <div className="flex gap-2">
                    <Entrada placeholder="Palavras-chave: reserva, aniversário" value={r.gatilhos} onChange={(e) => set({ respostas: c.respostas.map((x, j) => (j === i ? { ...x, gatilhos: e.target.value } : x)) })} />
                    <button onClick={() => set({ respostas: c.respostas.filter((_, j) => j !== i) })} className="px-2 text-mudo hover:text-st-cancelado" aria-label="Remover resposta">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-linha bg-fundo px-3 py-2 text-[13.5px] outline-none focus:border-acao"
                    placeholder="Resposta"
                    value={r.resposta}
                    onChange={(e) => set({ respostas: c.respostas.map((x, j) => (j === i ? { ...x, resposta: e.target.value } : x)) })}
                  />
                </div>
              ))}
            </div>
          </Cartao>

          <div className="flex items-center justify-end gap-3">
            {salvo && !mudou && <span className="text-[13px] font-semibold text-ok">Salvo</span>}
            <Botao disabled={!mudou} onClick={() => (salvarChatbot({ ...c, respostas: c.respostas.filter((r) => r.gatilhos.trim() && r.resposta.trim()) }), setSalvo(true))}>
              Salvar
            </Botao>
          </div>

          <Cartao titulo="Como ligar no WhatsApp">
            <ol className="list-decimal space-y-1.5 pl-5 text-[13px]">
              <li>No Meta for Developers, crie um app do tipo Business e adicione o produto WhatsApp.</li>
              <li>
                Em Configuração do webhook, use a URL <code className="rounded bg-fundo px-1">/api/webhooks/whatsapp</code> deste sistema e o mesmo token de verificação da variável <code className="rounded bg-fundo px-1">WHATSAPP_VERIFY_TOKEN</code>.
              </li>
              <li>Assine o campo &quot;messages&quot;.</li>
              <li>
                No servidor, preencha <code className="rounded bg-fundo px-1">WHATSAPP_TOKEN</code>, <code className="rounded bg-fundo px-1">WHATSAPP_APP_SECRET</code> e <code className="rounded bg-fundo px-1">WHATSAPP_PHONE_ID</code>. Os segredos não ficam no banco.
              </li>
            </ol>
          </Cartao>
        </div>

        <Simulador />
      </div>
    </div>
  );
}

function Simulador() {
  const [tel, setTel] = useState("");
  const [texto, setTexto] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const fim = useRef<HTMLDivElement>(null);
  // Bloco com chaves: scrollIntoView devolve uma Promise nos navegadores novos
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs]);

  function enviar(t = texto) {
    if (!t.trim()) return;
    const r = responder(t, contexto(tel));
    setMsgs((m) => [...m, { de: "cliente", texto: t }, { de: "bot", texto: r.texto, r }]);
    setTexto("");
  }

  return (
    <Cartao titulo="Simulador" className="lg:sticky lg:top-4 lg:self-start">
      <Campo rotulo="Telefone do cliente (para ver o status do pedido)">
        <Entrada inputMode="tel" placeholder="74 99999-9999" value={tel} onChange={(e) => setTel(e.target.value)} />
      </Campo>
      <div className="mt-3 h-[340px] overflow-y-auto rounded-2xl bg-[#ECE5DD] p-3">
        {!msgs.length && <p className="pt-24 text-center text-[12.5px] text-mudo">Mande uma mensagem como se fosse o cliente.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={clsx("mb-2 flex", m.de === "cliente" ? "justify-end" : "justify-start")}>
            <div className={clsx("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] shadow-sm", m.de === "cliente" ? "bg-[#DCF8C6]" : "bg-white")}>
              {m.de === "bot" && (
                <p className="mb-0.5 flex items-center gap-1 text-[10.5px] font-bold uppercase text-mudo">
                  <Bot size={11} /> {m.r?.intencao.replace("_", " ")}
                  {m.r?.transferir && m.r.intencao !== "atendente" && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-acao">
                      <UserRound size={11} /> atendente
                    </span>
                  )}
                </p>
              )}
              {m.texto}
            </div>
          </div>
        ))}
        <div ref={fim} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGESTOES.map((s) => (
          <button key={s} onClick={() => enviar(s)} className="rounded-full border border-linha bg-card px-2.5 py-1 text-[11.5px] font-semibold">
            {s}
          </button>
        ))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => (e.preventDefault(), enviar())}>
        <Entrada placeholder="Mensagem" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Mensagem do cliente" />
        <Botao type="submit" aria-label="Enviar">
          <Send size={16} />
        </Botao>
      </form>
    </Cartao>
  );
}
