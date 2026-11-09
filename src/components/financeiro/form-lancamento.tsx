"use client";

import clsx from "clsx";
import { Paperclip, X } from "lucide-react";
import { useState } from "react";
import { brl, diaLocal } from "@/lib/dominio/calculos";
import { somarMeses } from "@/lib/dominio/financeiro";
import type { Lancamento } from "@/lib/dominio/tipos";
import { salvarLancamento } from "@/lib/loja/acoes-gestao";
import { useLoja } from "@/lib/loja/loja";
import { Botao, Campo, Entrada, EntradaValor, Selecao } from "../ui";

const LIMITE_ANEXO = 1_500_000;

/** Cadastro de conta a pagar ou a receber: parcelas, recorrência e anexo. */
export function FormLancamento({ inicial, aoSalvar }: { inicial?: Partial<Lancamento>; aoSalvar: () => void }) {
  const plano = useLoja((e) => e.planoContas);
  const fornecedores = useLoja((e) => e.fornecedores);
  const clientes = useLoja((e) => e.clientes);
  const editando = !!inicial?.id;
  const [l, setL] = useState<Partial<Lancamento>>({ tipo: "pagar", vencimento: diaLocal(), valor: 0, planoId: "", descricao: "", ...inicial });
  const [parcelas, setParcelas] = useState(1);
  const [erro, setErro] = useState("");
  const set = (x: Partial<Lancamento>) => setL((v) => ({ ...v, ...x }));
  const planos = plano.filter((p) => p.tipo === (l.tipo === "pagar" ? "despesa" : "receita"));

  function anexar(f: File) {
    if (f.size > LIMITE_ANEXO) return setErro("Anexo muito grande (máx. 1,5 MB). Use foto ou PDF menor.");
    const r = new FileReader();
    r.onload = () => set({ anexo: { nome: f.name, dados: String(r.result) } });
    r.readAsDataURL(f);
  }

  function salvar() {
    if (!l.descricao?.trim() || !l.valor || !l.vencimento || !l.planoId) return setErro("Preencha descrição, valor, vencimento e plano de contas.");
    salvarLancamento({ ...(l as Lancamento), descricao: l.descricao.trim() }, editando ? 1 : parcelas);
    aoSalvar();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {!editando && (
        <div className="flex rounded-full bg-secundario p-1 sm:col-span-2">
          {(["pagar", "receber"] as const).map((t) => (
            <button key={t} onClick={() => set({ tipo: t, planoId: "" })} className={clsx("flex-1 rounded-full py-2 text-[13.5px] font-bold", l.tipo === t ? (t === "pagar" ? "bg-acao text-white" : "bg-ok text-white") : "text-mudo")}>
              {t === "pagar" ? "A pagar" : "A receber"}
            </button>
          ))}
        </div>
      )}
      <Campo rotulo="Descrição" className="sm:col-span-2">
        <Entrada value={l.descricao} onChange={(e) => set({ descricao: e.target.value })} placeholder={l.tipo === "pagar" ? "Ex.: Conta de energia" : "Ex.: Evento aniversário sábado"} autoFocus />
      </Campo>
      <Campo rotulo={editando || parcelas === 1 ? "Valor" : "Valor total"}>
        <EntradaValor valor={l.valor ?? 0} aoMudar={(v) => set({ valor: v })} />
      </Campo>
      <Campo rotulo={parcelas > 1 ? "1º vencimento" : "Vencimento"}>
        <Entrada type="date" value={l.vencimento} onChange={(e) => set({ vencimento: e.target.value })} />
      </Campo>
      <Campo rotulo="Plano de contas">
        <Selecao value={l.planoId} onChange={(e) => set({ planoId: e.target.value })}>
          <option value="">Escolha</option>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Selecao>
      </Campo>
      {l.tipo === "pagar" ? (
        <Campo rotulo="Fornecedor">
          <Selecao value={l.fornecedorId ?? ""} onChange={(e) => set({ fornecedorId: e.target.value || undefined })}>
            <option value="">—</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
      ) : (
        <Campo rotulo="Cliente">
          <Selecao value={l.clienteId ?? ""} onChange={(e) => set({ clienteId: e.target.value || undefined })}>
            <option value="">—</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
      )}
      <Campo rotulo="Documento (boleto, NF)">
        <Entrada value={l.documento ?? ""} onChange={(e) => set({ documento: e.target.value })} />
      </Campo>
      {!editando && (
        <Campo rotulo="Parcelas">
          <Entrada type="number" min={1} max={48} value={parcelas} onChange={(e) => setParcelas(Math.max(1, Math.min(48, Number(e.target.value) || 1)))} disabled={l.recorrente} />
        </Campo>
      )}
      <label className="flex items-center gap-2 text-[13.5px] font-semibold sm:col-span-2">
        <input type="checkbox" checked={!!l.recorrente} onChange={(e) => (set({ recorrente: e.target.checked }), e.target.checked && setParcelas(1))} className="h-5 w-5 accent-[var(--acao)]" />
        Repete todo mês (ao pagar, a do mês seguinte é criada)
      </label>
      {parcelas > 1 && l.valor ? (
        <p className="text-[12.5px] text-mudo sm:col-span-2">
          {parcelas}× de <span className="num font-semibold">{brl(l.valor / parcelas)}</span>, de {l.vencimento?.split("-").reverse().join("/")} a {somarMeses(l.vencimento!, parcelas - 1).split("-").reverse().join("/")}
        </p>
      ) : null}
      <Campo rotulo="Observação" className="sm:col-span-2">
        <Entrada value={l.obs ?? ""} onChange={(e) => set({ obs: e.target.value })} />
      </Campo>
      <div className="sm:col-span-2">
        {l.anexo ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-secundario px-3 py-1.5 text-[12.5px] font-semibold">
            <Paperclip size={14} /> {l.anexo.nome}
            <button onClick={() => set({ anexo: undefined })} aria-label="Remover anexo">
              <X size={14} />
            </button>
          </span>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-acao">
            <Paperclip size={15} /> Anexar boleto, nota ou comprovante
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && anexar(e.target.files[0])} />
          </label>
        )}
      </div>
      {erro && <p className="rounded-xl bg-rosado p-2 text-[12.5px] font-semibold text-acao sm:col-span-2">{erro}</p>}
      <Botao className="sm:col-span-2" variante={l.tipo === "receber" ? "ok" : "primario"} onClick={salvar}>
        {editando ? "Salvar alterações" : parcelas > 1 ? `Lançar ${parcelas} parcelas` : "Lançar conta"}
      </Botao>
    </div>
  );
}
