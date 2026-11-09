"use client";

import clsx from "clsx";
import { HandCoins, Plus, ReceiptText, UserPlus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Exportar } from "@/components/relatorio";
import { Botao, Campo, Entrada, EntradaValor, Modal, Pilula, Selecao, Tabela, Titulo, Vazio } from "@/components/ui";
import { arred, brl, dataCurta, diaLocal, hora } from "@/lib/dominio/calculos";
import { resumoFiado } from "@/lib/dominio/fiado";
import type { Cliente } from "@/lib/dominio/tipos";
import { cadastrarClienteFiado, lancarFiado, pagarFiado, salvarCliente } from "@/lib/loja/acoes";
import { useLoja } from "@/lib/loja/loja";

/**
 * Fiado (FIA-01 a FIA-04): cadastro do cliente (só o nome é obrigatório),
 * compras lançadas das mesas, pagamentos parciais, saldo e histórico.
 */
export function Fiado() {
  const clientes = useLoja((e) => e.clientes);
  const movs = useLoja((e) => e.fiado ?? []);
  const sessaoAtiva = useLoja((e) => e.sessaoAtivaId);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"devendo" | "todos">("devendo");
  const [novo, setNovo] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const hoje = diaLocal();

  const linhas = useMemo(
    () =>
      clientes
        .map((c) => ({ c, r: resumoFiado(movs, c.id) }))
        .filter(({ c, r }) => {
          if (filtro === "devendo" && r.saldo <= 0.009 && !q) return false;
          const t = q.trim().toLowerCase();
          return !t || c.nome.toLowerCase().includes(t) || (!!c.telefone && c.telefone.replace(/\D/g, "").includes(t.replace(/\D/g, "") || "§"));
        })
        .sort((a, b) => b.r.saldo - a.r.saldo || a.c.nome.localeCompare(b.c.nome)),
    [clientes, movs, filtro, q],
  );
  const emAberto = arred(clientes.reduce((s, c) => s + Math.max(0, resumoFiado(movs, c.id).saldo), 0));
  const devendo = clientes.filter((c) => resumoFiado(movs, c.id).saldo > 0.009).length;
  const recebidoHoje = arred(movs.filter((m) => m.tipo === "pagamento" && diaLocal(new Date(m.em)) === hoje).reduce((s, m) => s + m.valor, 0));
  const clienteAberto = clientes.find((c) => c.id === aberto);

  return (
    <div>
      <Titulo
        sub="Clientes que compram para pagar depois: saldo, pagamentos parciais e histórico"
        acoes={
          <>
            <Exportar nome="fiado" cab={["Cliente", "Telefone", "Comprado", "Pago", "Saldo"]} linhas={linhas.map(({ c, r }) => [c.nome, c.telefone, r.comprado, r.pago, r.saldo])} />
            <Botao onClick={() => setNovo(true)}>
              <UserPlus size={18} /> Novo cliente
            </Botao>
          </>
        }
      >
        Fiado
      </Titulo>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Ind r="Total em aberto" v={brl(emAberto)} cor={emAberto ? "text-acao" : undefined} />
        <Ind r="Clientes devendo" v={String(devendo)} />
        <Ind r="Recebido hoje" v={brl(recebidoHoje)} cor="text-ok" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[18px] bg-card p-3 shadow-card">
        <div className="flex rounded-full bg-secundario p-1 text-[12.5px] font-bold">
          {(
            [
              ["devendo", "Devendo"],
              ["todos", "Todos os clientes"],
            ] as const
          ).map(([v, r]) => (
            <button key={v} onClick={() => setFiltro(v)} className={clsx("rounded-full px-3 py-1.5", filtro === v ? "bg-card text-acao shadow-card" : "text-mudo")}>
              {r}
            </button>
          ))}
        </div>
        <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou telefone" className="max-w-[280px] py-2" />
      </div>

      {linhas.length ? (
        <Tabela colunas={[{ rotulo: "Cliente" }, { rotulo: "Último movimento" }, { rotulo: "Comprado", direita: true }, { rotulo: "Pago", direita: true }, { rotulo: "Saldo", direita: true }, { rotulo: "" }]}>
          {linhas.map(({ c, r }) => (
            <tr key={c.id} className="cursor-pointer hover:bg-fundo/60" onClick={() => setAberto(c.id)}>
              <td className="px-3 py-2.5">
                <b className="font-semibold">{c.nome}</b>
                <span className="block text-[11.5px] text-mudo">{c.telefone || "sem telefone"}</span>
              </td>
              <td className="px-3 py-2.5 text-[12.5px] text-mudo">{r.ultimo ? `${dataCurta(r.ultimo)} ${hora(r.ultimo)}` : "—"}</td>
              <td className="num px-3 py-2.5 text-right">{brl(r.comprado)}</td>
              <td className="num px-3 py-2.5 text-right text-ok">{brl(r.pago)}</td>
              <td className={clsx("num px-3 py-2.5 text-right font-bold", r.saldo > 0.009 ? "text-acao" : "text-mudo")}>{brl(r.saldo)}</td>
              <td className="px-3 py-2.5 text-right">
                <span className="rounded-full bg-rosado px-3 py-1.5 text-[12px] font-bold text-acao">Abrir</span>
              </td>
            </tr>
          ))}
        </Tabela>
      ) : (
        <div className="rounded-[20px] bg-card shadow-card">
          <Vazio icone={Wallet} titulo={filtro === "devendo" ? "Ninguém devendo" : "Nenhum cliente"} texto="Cadastre o cliente aqui ou, ao receber uma mesa, escolha a forma Fiado e o nome do cliente.">
            <Botao onClick={() => setNovo(true)}>
              <UserPlus size={18} /> Novo cliente
            </Botao>
          </Vazio>
        </div>
      )}

      <NovoCliente aberto={novo} aoFechar={() => setNovo(false)} aoCriar={(id) => (setNovo(false), setAberto(id))} />
      {clienteAberto && <FichaCliente cliente={clienteAberto} semCaixa={!sessaoAtiva} aoFechar={() => setAberto(null)} />}
    </div>
  );
}

function Ind({ r, v, cor }: { r: string; v: string; cor?: string }) {
  return (
    <div className="rounded-[18px] bg-card p-3 shadow-card">
      <p className="text-[11.5px] font-semibold text-mudo">{r}</p>
      <p className={clsx("num text-[20px] font-extrabold", cor)}>{v}</p>
    </div>
  );
}

function NovoCliente({ aberto, aoFechar, aoCriar }: { aberto: boolean; aoFechar: () => void; aoCriar: (id: string) => void }) {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const criar = () => {
    if (!nome.trim()) return;
    const id = cadastrarClienteFiado(nome, tel);
    setNome("");
    setTel("");
    aoCriar(id);
  };
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Novo cliente do fiado" largura="sm">
      <div className="space-y-3">
        <Campo rotulo="Nome *">
          <Entrada autoFocus value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && criar()} />
        </Campo>
        <Campo rotulo="Telefone (opcional)">
          <Entrada value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="(74) 9...." onKeyDown={(e) => e.key === "Enter" && criar()} />
        </Campo>
        <Botao className="w-full" disabled={!nome.trim()} onClick={criar}>
          <UserPlus size={17} /> Cadastrar
        </Botao>
      </div>
    </Modal>
  );
}

/** Saldo, histórico e ações de um cliente do fiado. */
function FichaCliente({ cliente, semCaixa, aoFechar }: { cliente: Cliente; semCaixa: boolean; aoFechar: () => void }) {
  const movs = useLoja((e) => e.fiado ?? []);
  const todasFormas = useLoja((e) => e.formasPagamento);
  const formas = todasFormas.filter((f) => f.ativo && f.tipo !== "fiado" && f.tipo !== "credito_cliente");
  const r = resumoFiado(movs, cliente.id);
  const [acao, setAcao] = useState<null | "pagar" | "lancar" | "editar">(null);
  const [valor, setValor] = useState(0);
  const [formaId, setFormaId] = useState(formas[0]?.id ?? "");
  const [texto, setTexto] = useState("");
  const [nome, setNome] = useState(cliente.nome);
  const [tel, setTel] = useState(cliente.telefone);
  const [chave, setChave] = useState(0);

  // Histórico do mais antigo para o mais novo, com o saldo depois de cada movimento
  const historico = useMemo(() => {
    let saldo = 0;
    return movs
      .filter((m) => m.clienteId === cliente.id)
      .sort((a, b) => a.em.localeCompare(b.em))
      .map((m) => {
        saldo = arred(saldo + (m.tipo === "lancamento" ? m.valor : -m.valor));
        return { m, saldo };
      })
      .reverse();
  }, [movs, cliente.id]);

  const abrir = (a: "pagar" | "lancar") => {
    setValor(a === "pagar" ? Math.max(0, r.saldo) : 0);
    setTexto("");
    setChave((k) => k + 1);
    setAcao(a);
  };

  return (
    <Modal aberto aoFechar={aoFechar} titulo={`Fiado · ${cliente.nome}`} largura="lg">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex-1 text-[12.5px] text-mudo">
          {cliente.telefone || "sem telefone"} ·{" "}
          <button onClick={() => (setNome(cliente.nome), setTel(cliente.telefone), setAcao("editar"))} className="font-semibold text-acao">
            editar cadastro
          </button>
        </p>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-card p-3 text-center shadow-card">
        <div>
          <p className="text-[11px] font-semibold text-mudo">Comprado</p>
          <p className="num text-[16px] font-extrabold">{brl(r.comprado)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-mudo">Pago</p>
          <p className="num text-[16px] font-extrabold text-ok">{brl(r.pago)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-mudo">Saldo restante</p>
          <p className={clsx("num text-[16px] font-extrabold", r.saldo > 0.009 ? "text-acao" : "text-mudo")}>{brl(r.saldo)}</p>
        </div>
      </div>

      {acao === null && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Botao variante="ok" disabled={r.saldo <= 0.009} onClick={() => abrir("pagar")}>
            <HandCoins size={17} /> Registrar pagamento
          </Botao>
          <Botao variante="secundario" onClick={() => abrir("lancar")}>
            <Plus size={17} /> Lançar compra
          </Botao>
        </div>
      )}

      {acao === "pagar" && (
        <div className="mb-3 space-y-2 rounded-2xl border border-linha p-3">
          {semCaixa && <p className="rounded-xl bg-[#FDF0D6] p-2 text-[12px] font-semibold text-[#8A5A00]">Nenhum caixa aberto neste aparelho: o pagamento fica no histórico, mas não entra em nenhum caixa.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Campo rotulo="Valor pago (pode ser parcial)">
              <EntradaValor key={chave} autoFocus valor={valor} aoMudar={setValor} className="text-[18px] font-extrabold" />
            </Campo>
            <Campo rotulo="Forma">
              <Selecao value={formaId} onChange={(e) => setFormaId(e.target.value)}>
                {formas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>
          <Entrada value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Observação (opcional)" />
          {valor > 0 && <p className="text-[12.5px] text-mudo">Depois deste pagamento o saldo fica <b className="num text-tinta">{brl(arred(r.saldo - valor))}</b>.</p>}
          <div className="grid grid-cols-2 gap-2">
            <Botao variante="secundario" onClick={() => setAcao(null)}>
              Voltar
            </Botao>
            <Botao variante="ok" disabled={valor <= 0 || !formaId} onClick={() => (pagarFiado(cliente.id, valor, formaId, texto || undefined), setAcao(null))}>
              Confirmar pagamento
            </Botao>
          </div>
        </div>
      )}

      {acao === "lancar" && (
        <div className="mb-3 space-y-2 rounded-2xl border border-linha p-3">
          <p className="text-[12px] text-mudo">Para lançar o consumo de uma mesa, receba a mesa com a forma Fiado. Aqui é para compras fora do sistema (ex.: dívida anterior).</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Campo rotulo="Valor">
              <EntradaValor key={chave} autoFocus valor={valor} aoMudar={setValor} className="text-[18px] font-extrabold" />
            </Campo>
            <Campo rotulo="Origem">
              <Entrada value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: dívida anterior, Mesa 12" />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Botao variante="secundario" onClick={() => setAcao(null)}>
              Voltar
            </Botao>
            <Botao disabled={valor <= 0} onClick={() => (lancarFiado(cliente.id, valor, texto.trim()), setAcao(null))}>
              Lançar no fiado
            </Botao>
          </div>
        </div>
      )}

      {acao === "editar" && (
        <div className="mb-3 space-y-2 rounded-2xl border border-linha p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Campo rotulo="Nome *">
              <Entrada value={nome} onChange={(e) => setNome(e.target.value)} />
            </Campo>
            <Campo rotulo="Telefone (opcional)">
              <Entrada value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Botao variante="secundario" onClick={() => setAcao(null)}>
              Voltar
            </Botao>
            <Botao disabled={!nome.trim()} onClick={() => (salvarCliente({ id: cliente.id, nome: nome.trim(), telefone: tel.trim() }), setAcao(null))}>
              Salvar
            </Botao>
          </div>
        </div>
      )}

      <h3 className="mb-1.5 text-[13px] font-bold">Histórico</h3>
      <div className="max-h-[45vh] overflow-y-auto rounded-2xl border border-linha bg-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-linha text-left text-[11px] uppercase tracking-wide text-mudo">
              <th className="px-3 py-2 font-semibold">Quando</th>
              <th className="px-3 py-2 font-semibold">Origem</th>
              <th className="px-3 py-2 text-right font-semibold">Valor</th>
              <th className="px-3 py-2 text-right font-semibold">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {historico.map(({ m, saldo }) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap px-3 py-2 text-[12px] text-mudo">
                  {dataCurta(m.em)} {hora(m.em)}
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    {m.tipo === "lancamento" ? <ReceiptText size={14} className="text-acao" /> : <HandCoins size={14} className="text-ok" />}
                    {m.tipo === "pagamento" ? "Pagamento" : m.origem}
                    {m.tipo === "pagamento" && <Pilula cor="verde">{todasFormas.find((f) => f.id === m.formaId)?.nome ?? "—"}</Pilula>}
                  </span>
                  {(m.obs || m.usuario) && <span className="block pl-5 text-[11.5px] text-mudo">{[m.obs, m.usuario && `por ${m.usuario}`].filter(Boolean).join(" · ")}</span>}
                </td>
                <td className={clsx("num px-3 py-2 text-right font-semibold", m.tipo === "pagamento" ? "text-ok" : "text-acao")}>
                  {m.tipo === "pagamento" ? "−" : "+"}
                  {brl(m.valor)}
                </td>
                <td className="num px-3 py-2 text-right">{brl(saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!historico.length && <p className="px-3 py-6 text-center text-[13px] text-mudo">Nenhum lançamento ainda.</p>}
      </div>
    </Modal>
  );
}
