"use client";

import clsx from "clsx";
import { CreditCard, FileText, Plus, Printer, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { Botao, Campo, Cartao, Entrada, Pilula, Selecao } from "@/components/ui";
import { chamarAgente } from "@/lib/integracoes/agente";
import { normalizarAiqfome, normalizarIfood, pedidoAiqfomeExemplo, pedidoIfoodExemplo } from "@/lib/integracoes/marketplace";
import { salvarConfig } from "@/lib/loja/acoes";
import { receberPedidoMarketplace } from "@/lib/loja/acoes-integracoes";
import type { Config, Impressora } from "@/lib/loja/estado";
import { obterEstado, useLoja } from "@/lib/loja/loja";

/** Seções de configuração acrescentadas pelas fases seguintes (impressoras, integrações...). */
export const SECOES_CONFIG: React.ComponentType[] = [SecaoImpressoras, SecaoMaquininha, SecaoFiscal, SecaoMarketplaces];

const Titulo = ({ i: I, children }: { i: React.ElementType; children: React.ReactNode }) => (
  <span className="flex items-center gap-2">
    <I size={18} /> {children}
  </span>
);

function Chave({ ligado, aoMudar, rotulo }: { ligado: boolean; aoMudar: (v: boolean) => void; rotulo: string }) {
  return (
    <label className="flex items-center justify-between gap-3 text-[13.5px] font-semibold">
      {rotulo}
      <input type="checkbox" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} className="h-5 w-5 accent-[var(--acao)]" />
    </label>
  );
}

function SecaoImpressoras() {
  const cfg = useLoja((e) => e.config.impressao);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const set = (x: Partial<Config["impressao"]>) => salvarConfig({ impressao: { ...obterEstado().config.impressao, ...x } });
  const setImp = (id: string, x: Partial<Impressora>) => set({ impressoras: cfg.impressoras.map((i) => (i.id === id ? { ...i, ...x } : i)) });
  const testar = async (chave: string, f: () => Promise<unknown>) => {
    setMsg((m) => ({ ...m, [chave]: "…" }));
    try {
      const r = (await f()) as { impressoras?: string[] };
      setMsg((m) => ({ ...m, [chave]: r?.impressoras ? `Agente ok · ${r.impressoras.join(", ")}` : "Impresso" }));
    } catch (e) {
      setMsg((m) => ({ ...m, [chave]: (e as Error).message.includes("fetch") ? "Agente não encontrado" : (e as Error).message }));
    }
  };

  return (
    <Cartao titulo={<Titulo i={Printer}>Impressoras</Titulo>}>
      <Chave rotulo="Usar o agente local (imprime direto na impressora térmica do setor)" ligado={cfg.agenteAtivo} aoMudar={(v) => set({ agenteAtivo: v })} />
      <p className="mt-1 text-[12px] text-mudo">Desligado, os cupons saem pelo navegador (Ctrl+P). O agente fica na pasta agente/ do sistema, com o passo a passo no LEIAME.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <Campo rotulo="Endereço do agente">
          <Entrada defaultValue={cfg.agenteUrl} onBlur={(e) => set({ agenteUrl: e.target.value.trim() || "http://localhost:9123" })} />
        </Campo>
        <Botao variante="secundario" onClick={() => testar("agente", () => chamarAgente(cfg.agenteUrl, "status"))}>
          Verificar agente
        </Botao>
      </div>
      {msg.agente && <p className="mt-1 text-[12.5px] font-semibold text-mudo">{msg.agente}</p>}

      <ul className="mt-4 grid gap-2">
        {cfg.impressoras.map((i) => (
          <li key={i.id} className="grid gap-2 rounded-2xl border border-linha p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Entrada defaultValue={i.nome} onBlur={(e) => setImp(i.id, { nome: e.target.value.trim().toLowerCase() })} className="max-w-[160px] py-1.5" aria-label="Nome no agente" />
              {(["caixa", "cozinha", "bar"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setImp(i.id, { setores: i.setores.includes(s) ? i.setores.filter((x) => x !== s) : [...i.setores, s] })}
                  className={clsx("rounded-full border-[1.5px] px-2.5 py-1 text-[12px] font-semibold capitalize", i.setores.includes(s) ? "border-acao bg-rosado text-acao" : "border-linha text-mudo")}
                >
                  {s}
                </button>
              ))}
              <Selecao value={i.colunas} onChange={(e) => setImp(i.id, { colunas: Number(e.target.value) })} className="max-w-[110px] py-1.5" aria-label="Largura">
                <option value={48}>80 mm</option>
                <option value={32}>58 mm</option>
              </Selecao>
            </div>
            <div className="flex items-center gap-2">
              <Botao variante="secundario" tamanho="sm" onClick={() => testar(i.id, () => chamarAgente(cfg.agenteUrl, "testar", { impressora: i.nome }))}>
                Testar
              </Botao>
              {msg[i.id] && <span className="text-[12px] text-mudo">{msg[i.id]}</span>}
            </div>
            <button onClick={() => set({ impressoras: cfg.impressoras.filter((x) => x.id !== i.id) })} className="justify-self-end rounded-full p-2 text-mudo hover:text-st-cancelado" aria-label="Remover impressora">
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      <Botao variante="fantasma" tamanho="sm" className="mt-2" onClick={() => set({ impressoras: [...cfg.impressoras, { id: "imp" + Date.now(), nome: "nova", setores: [], colunas: 48 }] })}>
        <Plus size={15} /> Adicionar impressora
      </Botao>
      <p className="mt-1 text-[12px] text-mudo">O nome de cada impressora precisa ser igual ao do arquivo impressoras.json do agente, onde fica o IP.</p>
    </Cartao>
  );
}

function SecaoMaquininha() {
  const cfg = useLoja((e) => e.config.maquininha);
  const set = (x: Partial<Config["maquininha"]>) => salvarConfig({ maquininha: { ...obterEstado().config.maquininha, ...x } });
  return (
    <Cartao titulo={<Titulo i={CreditCard}>Maquininha</Titulo>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Integração">
          <Selecao value={cfg.provedor} onChange={(e) => set({ provedor: e.target.value as "manual" | "stone" })}>
            <option value="manual">Manual (digita NSU e autorização)</option>
            <option value="stone">Stone integrada (valor vai para a POS)</option>
          </Selecao>
        </Campo>
        {cfg.provedor === "stone" && (
          <Campo rotulo="Número de série da POS">
            <Entrada defaultValue={cfg.serialPos} onBlur={(e) => set({ serialPos: e.target.value.trim() })} placeholder="Atrás da maquininha" />
          </Campo>
        )}
      </div>
      <p className="mt-2 text-[12px] text-mudo">A integração Stone usa as credenciais STONE_* no servidor. Sem elas, a tela de cobrança avisa e o caixa usa o modo manual.</p>
    </Cartao>
  );
}

function SecaoFiscal() {
  const cfg = useLoja((e) => e.config.fiscal);
  const set = (x: Partial<Config["fiscal"]>) => salvarConfig({ fiscal: { ...obterEstado().config.fiscal, ...x } }, "Alterou a configuração fiscal");
  return (
    <Cartao titulo={<Titulo i={FileText}>Fiscal (NFC-e)</Titulo>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Emissor">
          <Selecao value={cfg.emissor} onChange={(e) => set({ emissor: e.target.value as Config["fiscal"]["emissor"] })}>
            <option value="nenhum">Não emitir</option>
            <option value="focusnfe">Focus NFe</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Ambiente">
          <Selecao value={cfg.ambiente} onChange={(e) => set({ ambiente: e.target.value as Config["fiscal"]["ambiente"] })}>
            <option value="homologacao">Homologação (teste)</option>
            <option value="producao">Produção</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Regime">
          <Selecao value={cfg.regime} onChange={(e) => set({ regime: e.target.value as Config["fiscal"]["regime"] })}>
            <option value="simples">Simples Nacional</option>
            <option value="normal">Regime normal</option>
          </Selecao>
        </Campo>
        <Campo rotulo="CNPJ">
          <Entrada defaultValue={cfg.cnpj} onBlur={(e) => set({ cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
        </Campo>
        <Campo rotulo="Inscrição estadual">
          <Entrada defaultValue={cfg.inscricaoEstadual} onBlur={(e) => set({ inscricaoEstadual: e.target.value })} />
        </Campo>
        <div className="flex items-end pb-2">
          <Chave rotulo="Emitir ao fechar a conta" ligado={cfg.automatica} aoMudar={(v) => set({ automatica: v })} />
        </div>
      </div>
      <p className="mt-2 text-[12px] text-mudo">
        O certificado A1 e o CSC da SEFAZ-BA são cadastrados no painel do Focus NFe; o token fica no servidor (FOCUS_NFE_TOKEN). NCM e CFOP de cada produto ficam em Produtos (padrão 21069090 / 5102). Confirme a tributação com o contador antes de ir para produção.
      </p>
    </Cartao>
  );
}

function SecaoMarketplaces() {
  const cfg = useLoja((e) => e.config.marketplaces);
  const [msg, setMsg] = useState("");
  const set = (canal: "ifood" | "aiqfome", x: Partial<Config["marketplaces"]["ifood"]>) =>
    salvarConfig({ marketplaces: { ...obterEstado().config.marketplaces, [canal]: { ...obterEstado().config.marketplaces[canal], ...x } } });
  const simular = (canal: "ifood" | "aiqfome") => {
    const prods = obterEstado().produtos;
    const p = canal === "ifood" ? normalizarIfood(pedidoIfoodExemplo(prods)) : normalizarAiqfome(pedidoAiqfomeExemplo(prods));
    receberPedidoMarketplace(p);
    setMsg(`Pedido de teste do ${canal === "ifood" ? "iFood" : "aiqfome"} #${p.codigo} criado em Entregas.`);
  };
  return (
    <Cartao titulo={<Titulo i={ShoppingCart}>iFood e aiqfome</Titulo>}>
      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["ifood", "iFood", "#EA1D2C", "ID da loja (merchantId)"],
            ["aiqfome", "aiqfome", "#7B2CBF", "ID da loja"],
          ] as const
        ).map(([k, nome, cor, rot]) => (
          <div key={k} className="rounded-2xl border border-linha p-3">
            <p className="mb-2 flex items-center gap-2 font-bold">
              <span className="h-3 w-3 rounded-full" style={{ background: cor }} /> {nome}
              {cfg[k].ativo ? <Pilula cor="verde">Ligado</Pilula> : <Pilula>Desligado</Pilula>}
            </p>
            <div className="grid gap-2">
              <Chave rotulo="Receber pedidos" ligado={cfg[k].ativo} aoMudar={(v) => set(k, { ativo: v })} />
              <Chave rotulo="Aceitar automaticamente" ligado={cfg[k].aceiteAutomatico} aoMudar={(v) => set(k, { aceiteAutomatico: v })} />
              <Campo rotulo={rot}>
                <Entrada defaultValue={cfg[k].lojaId} onBlur={(e) => set(k, { lojaId: e.target.value.trim() })} className="py-2" />
              </Campo>
              <Botao variante="secundario" tamanho="sm" onClick={() => simular(k)}>
                Simular pedido de teste
              </Botao>
            </div>
          </div>
        ))}
      </div>
      {msg && <p className="mt-2 text-[12.5px] font-semibold text-ok">{msg}</p>}
      <p className="mt-2 text-[12px] text-mudo">
        Os pedidos chegam pelos webhooks /api/webhooks/ifood e /api/webhooks/aiqfome (credenciais IFOOD_* e AIQFOME_* no servidor) e entram em Entregas e na Cozinha. Aceitar, pronto e despachar voltam para o iFood sozinhos.
      </p>
    </Cartao>
  );
}
