"use client";

import clsx from "clsx";
import { Armchair, MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Lancador } from "@/components/pedido/lancador";
import { PainelConta } from "@/components/pedido/painel-conta";
import { Acao, Botao, JANELA_DOIS_CLIQUES, Modal, Pilula, Titulo, useDoisCliques, useRelogio, Vazio } from "@/components/ui";
import { brl, duracao, total } from "@/lib/dominio/calculos";
import { rotuloMesa } from "@/lib/dominio/rotulos";
import { LOCALIZACOES, type Conta, type Mesa } from "@/lib/dominio/tipos";
import { abrirConta, descartarSeVazia, mudarLocalizacao } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

type Estado = "fechamento" | "ocupada" | "livre";

export default function MesasPage() {
  const mesas = useLoja((e) => e.mesas);
  const contas = useLoja((e) => e.contas.filter((c) => c.mesaId && (c.status === "aberta" || c.status === "fechamento")));
  const agora = useRelogio();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [lancando, setLancando] = useState<{ contaId: string; numero: number; totalAtual: number } | null>(null);
  const [area, setArea] = useState("Todas");
  const [numero, setNumero] = useState("");
  const [aviso, setAviso] = useState("");
  const [organizando, setOrganizando] = useState(false);
  const campoNumero = useRef<HTMLInputElement>(null);

  const ultimoClique = useRef<{ id: string; em: number } | null>(null);

  const contaPorMesa = new Map<string, Conta>(contas.map((c) => [c.mesaId!, c]));
  const estadoDa = (m: Mesa): Estado => {
    const c = contaPorMesa.get(m.id);
    return !c ? "livre" : c.status === "fechamento" ? "fechamento" : "ocupada";
  };
  const areas = ["Todas", ...new Set([...LOCALIZACOES, ...mesas.map((m) => m.area)])];
  const visiveis = mesas.filter((m) => area === "Todas" || m.area === area);
  const grupos: { estado: Estado; rotulo: string }[] = [
    { estado: "fechamento", rotulo: "Em fechamento" },
    { estado: "ocupada", rotulo: "Ocupadas" },
    { estado: "livre", rotulo: "Disponíveis" },
  ];
  const contaSel = selecionada ? contaPorMesa.get(selecionada) : undefined;

  const mesaSel = selecionada ? mesas.find((m) => m.id === selecionada) : undefined;

  /** Seleciona a mesa e mostra o painel lateral, sem abrir nada. */
  function selecionar(m: Mesa) {
    setSelecionada(m.id);
    if (area !== "Todas" && m.area !== area) setArea("Todas");
    requestAnimationFrame(() => document.getElementById(`mesa-${m.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  /** Abre a mesa: livre abre a conta; ocupada vai direto para adicionar itens. */
  function abrir(m: Mesa) {
    setSelecionada(m.id);
    const c = contaPorMesa.get(m.id);
    if (c) return setLancando({ contaId: c.id, numero: m.numero, totalAtual: total(c) });
    const id = abrirConta({ canal: "mesa", mesaId: m.id });
    setLancando({ contaId: id, numero: m.numero, totalAtual: 0 });
  }

  // Um clique seleciona; o segundo clique na mesma mesa (até 2,5 s) abre.
  function clicarMesa(m: Mesa) {
    const u = ultimoClique.current;
    if (u && u.id === m.id && Date.now() - u.em < JANELA_DOIS_CLIQUES) {
      ultimoClique.current = null;
      return abrir(m);
    }
    ultimoClique.current = { id: m.id, em: Date.now() };
    selecionar(m);
  }

  const mesaPorNumero = (n: string) => mesas.find((x) => String(x.numero) === n.trim());

  const ocupadas = mesas.filter((m) => estadoDa(m) !== "livre").length;

  function digitarNumero(n: string) {
    setNumero(n);
    setAviso("");
    const m = mesaPorNumero(n);
    if (m) selecionar(m);
  }

  function irParaNumero() {
    const m = numero ? mesaPorNumero(numero) : mesaSel;
    if (!m) {
      setAviso(numero ? `Mesa ${numero} não existe` : "");
      return;
    }
    setAviso("");
    setNumero("");
    campoNumero.current?.blur();
    abrir(m);
  }
  const botaoAbrir = useDoisCliques(irParaNumero);

  // Teclado na tela de mesas: número seleciona a mesa, Enter abre, Esc limpa.
  const teclado = useRef<(ev: KeyboardEvent) => void>(() => {});
  teclado.current = (ev: KeyboardEvent) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || document.querySelector("[role=dialog]")) return;
    const alvo = ev.target as HTMLElement;
    if (alvo.closest("input, textarea, select")) return;
    if (/^[0-9]$/.test(ev.key)) {
      ev.preventDefault();
      digitarNumero(ev.key);
      campoNumero.current?.focus();
    } else if (ev.key === "Enter" && mesaSel && (!alvo.closest("button, a") || alvo.closest("[data-mesa]"))) {
      ev.preventDefault();
      abrir(mesaSel);
    } else if (ev.key === "Escape" && selecionada) {
      setSelecionada(null);
    }
  };
  useEffect(() => {
    const ouvir = (ev: KeyboardEvent) => teclado.current(ev);
    window.addEventListener("keydown", ouvir);
    return () => window.removeEventListener("keydown", ouvir);
  }, []);

  return (
    <div className="mx-auto max-w-[1400px]">
      <Titulo
        sub={
          <>
            <b className="text-tinta">{ocupadas}</b> ocupadas · <b className="text-ok">{mesas.length - ocupadas}</b> livres · F3
          </>
        }
        acoes={
          <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              irParaNumero();
            }}
            className="flex items-center gap-1.5 rounded-full bg-card py-1 pl-3 pr-1 shadow-card"
          >
            <Search size={15} className="text-mudo" />
            <input
              ref={campoNumero}
              value={numero}
              onChange={(ev) => digitarNumero(ev.target.value.replace(/\D/g, "").slice(0, 3))}
              onKeyDown={(ev) => {
                if (ev.key === "Escape") {
                  setNumero("");
                  ev.currentTarget.blur();
                }
              }}
              inputMode="numeric"
              placeholder="Nº da mesa"
              aria-label="Número da mesa"
              className="num w-[92px] bg-transparent text-[14px] font-bold outline-none placeholder:font-medium placeholder:text-mudo"
            />
            <button
              type="button"
              onClick={botaoAbrir.clicar}
              onBlur={botaoAbrir.desarmar}
              title="Abrir a mesa (ou Enter)"
              className={clsx("touch-manipulation rounded-full px-3 py-1.5 text-[12px] font-bold", botaoAbrir.armado ? "bg-rosado text-acao ring-2 ring-acao" : "bg-acao text-white")}
            >
              {botaoAbrir.armado ? "De novo" : "Abrir"}
            </button>
          </form>
          <button
            onClick={() => setOrganizando((o) => !o)}
            className={clsx("flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-semibold shadow-card", organizando ? "bg-tinta text-fundo" : "bg-card")}
          >
            <MapPin size={15} /> Localização
          </button>
          <div className="flex gap-1 rounded-full bg-card p-1 shadow-card">
            {areas.map((a) => (
              <button key={a} onClick={() => setArea(a)} className={clsx("rounded-full px-3 py-1.5 text-[12.5px] font-semibold", a === area ? "bg-tinta text-fundo" : "text-mudo")}>
                {a}
              </button>
            ))}
          </div>
          </div>
        }
      >
        Mesas
      </Titulo>
      {aviso && <p className="-mt-2 mb-3 text-[12.5px] font-semibold text-st-cancelado">{aviso}</p>}

      {organizando && (
        <div className="mb-4 rounded-[20px] bg-card p-4 shadow-card">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="flex-1 text-[13px] text-mudo">Escolha onde cada mesa está hoje. Os pedidos e o histórico continuam ligados à mesa.</p>
            {LOCALIZACOES.map((l) => (
              <Botao key={l} variante="secundario" tamanho="sm" onClick={() => confirm(`Colocar as ${visiveis.length} mesas mostradas em ${l}?`) && visiveis.forEach((m) => mudarLocalizacao(m.id, l))}>
                Todas em {l}
              </Botao>
            ))}
            <Botao tamanho="sm" onClick={() => setOrganizando(false)}>
              Pronto
            </Botao>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visiveis.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-2xl border border-linha px-2.5 py-2">
                <span className="num w-8 text-[15px] font-extrabold">{m.numero}</span>
                <div className="flex flex-1 gap-1">
                  {LOCALIZACOES.map((l) => (
                    <button
                      key={l}
                      onClick={() => mudarLocalizacao(m.id, l)}
                      className={clsx("flex-1 rounded-lg py-1 text-[11px] font-bold", m.area === l ? "bg-acao text-white" : "bg-secundario text-mudo")}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_var(--painel-direito)]">
        <div className="space-y-4">
          {grupos.map((g) => {
            const lista = visiveis.filter((m) => estadoDa(m) === g.estado);
            if (!lista.length) return null;
            return (
              <section key={g.estado}>
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-mudo">
                  {g.rotulo} · {lista.length}
                </h2>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                  {lista.map((m) => {
                    const c = contaPorMesa.get(m.id);
                    const on = m.id === selecionada;
                    return (
                      <button
                        key={m.id}
                        id={`mesa-${m.id}`}
                        data-mesa
                        onClick={() => clicarMesa(m)}
                        title="Um clique mostra a mesa · dois cliques abrem"
                        className={clsx(
                          "relative flex min-h-[84px] touch-manipulation select-none flex-col items-start rounded-[18px] border-l-[5px] bg-card p-3 text-left shadow-card transition-transform active:scale-[.97]",
                          g.estado === "livre" && "border-l-linha",
                          g.estado === "ocupada" && "border-l-acao",
                          g.estado === "fechamento" && "border-l-st-preparo",
                          on && "ring-2 ring-acao",
                        )}
                      >
                        <span className="text-[15px] font-extrabold">Mesa {m.numero}</span>
                        {c ? (
                          <>
                            <span className="num mt-auto text-[13px] font-bold text-acao">{brl(total(c))}</span>
                            <span className="text-[11px] text-mudo">
                              {m.area} · {duracao(c.abertaEm, agora)}
                            </span>
                          </>
                        ) : (
                          <span className="mt-auto text-[11.5px] text-mudo">{m.area}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className={clsx("lg:sticky lg:top-28 lg:h-[calc(100dvh-150px)]", !mesaSel && "hidden lg:block")}>
          {contaSel ? (
            <div className="fixed inset-0 z-40 overflow-y-auto bg-fundo p-4 lg:static lg:h-full lg:p-0">
              <PainelConta contaId={contaSel.id} aoFechar={() => setSelecionada(null)} />
            </div>
          ) : mesaSel ? (
            // No celular a mesa livre aparece numa gaveta embaixo, deixando as mesas visíveis para o segundo toque
            <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-fundo p-4 pb-6 shadow-flutuante lg:static lg:h-full lg:rounded-none lg:p-0 lg:shadow-none">
              <div className="mb-3 flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-[18px] font-extrabold leading-tight">{rotuloMesa(mesaSel)}</p>
                  <p className="text-[12px] text-mudo">Sem conta aberta</p>
                </div>
                <Pilula cor="verde">Livre</Pilula>
                <button onClick={() => setSelecionada(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secundario" aria-label="Fechar painel">
                  <X size={16} />
                </button>
              </div>
              <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                <Acao icone={Plus} rotulo="Abrir mesa" destaque onClick={() => abrir(mesaSel)} />
              </div>
              <div className="rounded-2xl border border-linha bg-card px-4 py-4 text-center text-[13px] text-mudo lg:py-8">
                Nenhum item lançado ainda.
                <br />
                Toque em <b className="text-tinta">Abrir mesa</b> ou aperte <b className="text-tinta">Enter</b> para lançar o pedido.
              </div>
            </div>
          ) : (
            <div className="rounded-[20px] bg-card shadow-card">
              <Vazio
                icone={Armchair}
                titulo="Escolha uma mesa"
                texto="Um clique mostra a mesa aqui; dois cliques abrem. Digite o número no teclado para achar a mesa e aperte Enter para abrir."
              />
            </div>
          )}
        </aside>
      </div>

      <Modal
        aberto={!!lancando}
        aoFechar={() => {
          if (lancando) descartarSeVazia(lancando.contaId);
          setLancando(null);
        }} titulo={`${rotuloMesa(mesas.find((m) => m.numero === lancando?.numero))} · novo pedido`} largura="xl">
        {lancando && <Lancador contaId={lancando.contaId} titulo={`Mesa ${lancando.numero}`} totalAtual={lancando.totalAtual} aoEnviar={() => setLancando(null)} />}
      </Modal>
    </div>
  );
}
