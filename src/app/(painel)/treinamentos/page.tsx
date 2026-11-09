"use client";

import clsx from "clsx";
import { CalendarClock, CheckCircle2, Circle, ExternalLink, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Botao, Campo, Cartao, Entrada, EntradaValor, Modal, Pilula, Selecao, Titulo } from "@/components/ui";
import { MATERIAIS } from "@/lib/ajuda/conteudo";
import type { Funcao, Treinamento } from "@/lib/dominio/tipos";
import { concluirMaterial, confirmarPresenca, excluirTreinamento, marcarPresente, salvarTreinamento } from "@/lib/loja/acoes-crescimento";
import { useLoja } from "@/lib/loja/loja";
import { ROTULO_FUNCAO } from "@/lib/sessao-rotulos";

const FUNCOES = Object.keys(ROTULO_FUNCAO) as Funcao[];
type Rascunho = Omit<Treinamento, "id" | "confirmados"> & { id?: string; confirmados?: string[] };

const quandoBr = (s: string) => new Date(s).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function TreinamentosPage() {
  const funcionarios = useLoja((e) => e.funcionarios.filter((f) => f.ativo));
  const concluidos = useLoja((e) => e.materiaisConcluidos);
  const treinamentos = useLoja((e) => e.treinamentos);
  const usuarioId = useLoja((e) => e.usuarioId);
  const [pessoa, setPessoa] = useState(usuarioId);
  const [editar, setEditar] = useState<Rascunho | null>(null);
  const [chamada, setChamada] = useState<Treinamento | null>(null);
  const f = funcionarios.find((x) => x.id === pessoa) ?? funcionarios[0];
  const trilha = f ? MATERIAIS[f.funcao] : [];
  const feitos = f ? (concluidos[f.id] ?? []) : [];
  const pct = trilha.length ? Math.round((trilha.filter((m) => feitos.includes(m.id)).length / trilha.length) * 100) : 0;
  // Hora local no mesmo formato do campo (AAAA-MM-DDTHH:mm), não em UTC
  const agora = new Date().toLocaleString("sv-SE").replace(" ", "T").slice(0, 16);
  const proximos = [...treinamentos].sort((a, b) => a.quando.localeCompare(b.quando));

  return (
    <div className="mx-auto max-w-[1200px]">
      <Titulo
        sub="Trilha de aprendizado por função e agenda de treinamentos ao vivo"
        acoes={
          <Botao onClick={() => setEditar({ titulo: "", descricao: "", quando: `${new Date().toLocaleDateString("sv-SE")}T15:00`, duracaoMin: 60, funcoes: ["garcom"] })}>
            <Plus size={16} /> Agendar treinamento
          </Botao>
        }
      >
        Treinamentos
      </Titulo>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Cartao
          titulo="Trilha por função"
          acao={
            <Selecao value={f?.id} onChange={(e) => setPessoa(e.target.value)} aria-label="Funcionário" className="max-w-[220px]">
              {funcionarios.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome} · {ROTULO_FUNCAO[x.funcao]}
                </option>
              ))}
            </Selecao>
          }
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-fundo">
              <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <span className="num text-[13px] font-bold">{pct}%</span>
          </div>
          <ul className="divide-y divide-linha">
            {trilha.map((m) => {
              const ok = feitos.includes(m.id);
              return (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <button onClick={() => f && concluirMaterial(f.id, m.id)} aria-label={ok ? "Desmarcar" : "Marcar como concluído"} className={ok ? "text-ok" : "text-mudo"}>
                    {ok ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={clsx("font-semibold", ok && "text-mudo line-through")}>{m.titulo}</p>
                    <p className="text-[12.5px] text-mudo">
                      {m.descricao} · {m.minutos} min
                    </p>
                  </div>
                  {m.artigo && (
                    <Link href={`/ajuda?artigo=${m.artigo}`} className="text-[12.5px] font-bold text-acao">
                      Ler
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[12px] text-mudo">Progresso da equipe: {funcionarios.map((x) => `${x.nome} ${Math.round(((concluidos[x.id] ?? []).filter((id) => MATERIAIS[x.funcao].some((m) => m.id === id)).length / MATERIAIS[x.funcao].length) * 100)}%`).join(" · ")}</p>
        </Cartao>

        <Cartao titulo="Agenda ao vivo">
          {!proximos.length && <p className="py-6 text-center text-[13px] text-mudo">Nenhum treinamento agendado.</p>}
          <ul className="grid gap-3">
            {proximos.map((t) => {
              const passado = t.quando < agora;
              const convidados = funcionarios.filter((x) => t.funcoes.includes(x.funcao));
              const euConvidado = convidados.some((x) => x.id === usuarioId);
              const confirmado = t.confirmados.includes(usuarioId);
              return (
                <li key={t.id} className={clsx("rounded-2xl border border-linha p-3", passado && "opacity-70")}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{t.titulo}</p>
                      <p className="flex flex-wrap items-center gap-x-3 text-[12.5px] text-mudo">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={13} /> {quandoBr(t.quando)} · {t.duracaoMin} min
                        </span>
                        {t.local && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={13} /> {t.local}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Users size={13} /> {t.confirmados.length}/{convidados.length} confirmados
                        </span>
                      </p>
                      {t.descricao && <p className="mt-1 text-[13px]">{t.descricao}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {t.funcoes.map((fn) => (
                          <Pilula key={fn}>{ROTULO_FUNCAO[fn]}</Pilula>
                        ))}
                        {passado && <Pilula cor="azul">{(t.presentes ?? []).length} presentes</Pilula>}
                      </div>
                    </div>
                    <button onClick={() => setEditar(structuredClone(t))} className="p-2 text-mudo hover:text-tinta" aria-label="Editar">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => confirm(`Excluir "${t.titulo}"?`) && excluirTreinamento(t.id)} className="p-2 text-mudo hover:text-st-cancelado" aria-label="Excluir">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!passado && euConvidado && (
                      <Botao tamanho="sm" variante={confirmado ? "ok" : "secundario"} onClick={() => confirmarPresenca(t.id, usuarioId)}>
                        {confirmado ? "Presença confirmada" : "Confirmar presença"}
                      </Botao>
                    )}
                    {t.link && (
                      <a href={t.link} target="_blank" rel="noreferrer">
                        <Botao tamanho="sm" variante="secundario">
                          <ExternalLink size={14} /> Entrar
                        </Botao>
                      </a>
                    )}
                    <Botao tamanho="sm" variante="fantasma" onClick={() => setChamada(t)}>
                      Lista de presença
                    </Botao>
                  </div>
                </li>
              );
            })}
          </ul>
        </Cartao>
      </div>

      <Modal aberto={!!editar} aoFechar={() => setEditar(null)} titulo={editar?.id ? "Editar treinamento" : "Agendar treinamento"}>
        {editar && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Título" className="sm:col-span-2">
              <Entrada value={editar.titulo} onChange={(e) => setEditar({ ...editar, titulo: e.target.value })} placeholder="Ex.: Novo cardápio de verão" autoFocus />
            </Campo>
            <Campo rotulo="Descrição" className="sm:col-span-2">
              <Entrada value={editar.descricao} onChange={(e) => setEditar({ ...editar, descricao: e.target.value })} />
            </Campo>
            <Campo rotulo="Quando">
              <Entrada type="datetime-local" value={editar.quando} onChange={(e) => setEditar({ ...editar, quando: e.target.value })} />
            </Campo>
            <Campo rotulo="Duração (min)">
              <EntradaValor valor={editar.duracaoMin} aoMudar={(v) => setEditar({ ...editar, duracaoMin: Math.max(5, Math.floor(v)) })} />
            </Campo>
            <Campo rotulo="Local (opcional)">
              <Entrada value={editar.local ?? ""} onChange={(e) => setEditar({ ...editar, local: e.target.value || undefined })} placeholder="Salão" />
            </Campo>
            <Campo rotulo="Link da chamada (opcional)">
              <Entrada value={editar.link ?? ""} onChange={(e) => setEditar({ ...editar, link: e.target.value || undefined })} placeholder="https://meet.google.com/…" />
            </Campo>
            <Grupo rotulo="Para quem" className="sm:col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {FUNCOES.map((fn) => (
                  <button
                    key={fn}
                    type="button"
                    onClick={() => setEditar({ ...editar, funcoes: editar.funcoes.includes(fn) ? editar.funcoes.filter((x) => x !== fn) : [...editar.funcoes, fn] })}
                    className={clsx("rounded-full border-[1.5px] px-3 py-1 text-[12.5px] font-semibold", editar.funcoes.includes(fn) ? "border-acao bg-rosado text-acao" : "border-linha bg-card")}
                  >
                    {ROTULO_FUNCAO[fn]}
                  </button>
                ))}
              </div>
            </Grupo>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Botao variante="fantasma" onClick={() => setEditar(null)}>
                Cancelar
              </Botao>
              <Botao disabled={!editar.titulo.trim() || !editar.funcoes.length || !editar.quando} onClick={() => (salvarTreinamento({ ...editar, link: editar.link && /^https:\/\//.test(editar.link) ? editar.link : undefined }), setEditar(null))}>
                Salvar
              </Botao>
            </div>
          </div>
        )}
      </Modal>

      <Modal aberto={!!chamada} aoFechar={() => setChamada(null)} titulo="Lista de presença" largura="sm">
        {chamada && <ListaPresenca id={chamada.id} />}
      </Modal>
    </div>
  );
}

function ListaPresenca({ id }: { id: string }) {
  const t = useLoja((e) => e.treinamentos.find((x) => x.id === id));
  const funcionarios = useLoja((e) => e.funcionarios.filter((f) => f.ativo));
  if (!t) return null;
  const convidados = funcionarios.filter((x) => t.funcoes.includes(x.funcao));
  return (
    <ul className="divide-y divide-linha">
      {convidados.map((x) => {
        const presente = t.presentes?.includes(x.id);
        return (
          <li key={x.id} className="flex items-center gap-3 py-2">
            <div className="flex-1">
              <p className="font-semibold">{x.nome}</p>
              <p className="text-[12px] text-mudo">
                {ROTULO_FUNCAO[x.funcao]}
                {t.confirmados.includes(x.id) ? " · confirmou" : ""}
              </p>
            </div>
            <Botao tamanho="sm" variante={presente ? "ok" : "secundario"} onClick={() => marcarPresente(t.id, x.id)}>
              {presente ? "Presente" : "Marcar presente"}
            </Botao>
          </li>
        );
      })}
      {!convidados.length && <p className="py-4 text-center text-[13px] text-mudo">Nenhum funcionário ativo nessas funções.</p>}
    </ul>
  );
}

/** Rótulo para um grupo de botões (um <label> ativaria o primeiro botão ao clicar no texto). */
function Grupo({ rotulo, children, className }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={rotulo} className={className}>
      <span className="mb-1.5 block text-[12.5px] font-semibold">{rotulo}</span>
      {children}
    </div>
  );
}
