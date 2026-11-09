"use client";

import { Database, Download, RotateCcw, Sparkles, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Botao, Campo, Cartao, Entrada, EntradaValor, Selecao, Titulo } from "@/components/ui";
import { trocarUsuario } from "@/lib/loja/acoes";
import type { Config } from "@/lib/loja/estado";
import { gerarDadosExemplo } from "@/lib/loja/exemplo";
import { atualizar, obterEstado, reiniciarDemonstracao, useLoja } from "@/lib/loja/loja";
import { ROTULO_FUNCAO } from "@/lib/sessao-rotulos";
import { SECOES_CONFIG } from "./secoes";

function salvarConfig(c: Partial<Config>) {
  atualizar((e) => ({ ...e, config: { ...e.config, ...c } }));
}

export default function ConfiguracoesPage() {
  const config = useLoja((e) => e.config);
  const funcionarios = useLoja((e) => e.funcionarios);
  const usuarioId = useLoja((e) => e.usuarioId);
  const arquivo = useRef<HTMLInputElement>(null);

  function exportar() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obterEstado(), null, 1)], { type: "application/json" }));
    a.download = `carlos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  async function importar(f: File) {
    try {
      const dados = JSON.parse(await f.text());
      if (!dados.produtos || !dados.contas) throw new Error();
      atualizar(() => dados);
      alert("Backup restaurado.");
    } catch {
      alert("Arquivo inválido.");
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-4">
      <Titulo sub="Empresa, usuários, dispositivos e dados">Configurações</Titulo>

      <Cartao titulo="Empresa">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Nome do restaurante" className="sm:col-span-2">
            <Entrada defaultValue={config.nome} onBlur={(e) => salvarConfig({ nome: e.target.value })} />
          </Campo>
          <Campo rotulo="Endereço" className="sm:col-span-2">
            <Entrada defaultValue={config.endereco} onBlur={(e) => salvarConfig({ endereco: e.target.value })} />
          </Campo>
          <Campo rotulo="WhatsApp (com DDD)">
            <Entrada defaultValue={config.whatsapp} onBlur={(e) => salvarConfig({ whatsapp: e.target.value })} placeholder="74999999999" />
          </Campo>
          <Campo rotulo="Taxa de serviço padrão (%)">
            <EntradaValor valor={config.servicoPct} aoMudar={(v) => salvarConfig({ servicoPct: v })} />
          </Campo>
          <Campo rotulo="Quantidade de comandas">
            <Entrada type="number" defaultValue={config.totalComandas} onBlur={(e) => salvarConfig({ totalComandas: Math.max(1, Number(e.target.value)) })} />
          </Campo>
          <Campo rotulo="Chave Pix">
            <Entrada defaultValue={config.chavePix} onBlur={(e) => salvarConfig({ chavePix: e.target.value.trim() })} placeholder="CNPJ, e-mail, telefone ou aleatória" />
          </Campo>
          <Campo rotulo="Cidade (para o Pix)">
            <Entrada defaultValue={config.cidadePix} onBlur={(e) => salvarConfig({ cidadePix: e.target.value })} />
          </Campo>
        </div>
      </Cartao>

      <Cartao titulo={<span className="flex items-center gap-2"><UserRound size={18} /> Usuário neste aparelho</span>}>
        <p className="mb-3 text-[12.5px] text-mudo">No modo demonstração, escolha quem está operando. Com o Supabase ligado, cada um entra com seu próprio login.</p>
        <Selecao value={usuarioId} onChange={(e) => trocarUsuario(e.target.value)} className="max-w-sm">
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome} · {ROTULO_FUNCAO[f.funcao]}
            </option>
          ))}
        </Selecao>
      </Cartao>

      {SECOES_CONFIG.map((S, i) => (
        <S key={i} />
      ))}

      <Cartao titulo={<span className="flex items-center gap-2"><Database size={18} /> Dados</span>}>
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" onClick={exportar}>
            <Download size={16} /> Exportar backup
          </Botao>
          <Botao variante="secundario" onClick={() => arquivo.current?.click()}>
            <Upload size={16} /> Restaurar backup
          </Botao>
          <input ref={arquivo} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
          <Botao variante="secundario" onClick={() => gerarDadosExemplo()}>
            <Sparkles size={16} /> Gerar vendas de exemplo
          </Botao>
          <Botao variante="perigo" onClick={() => confirm("Apagar todos os dados deste aparelho e voltar ao início?") && reiniciarDemonstracao()}>
            <RotateCcw size={16} /> Reiniciar demonstração
          </Botao>
        </div>
        <p className="mt-3 text-[12.5px] text-mudo">
          A auditoria (cancelamentos, descontos, sangrias, reaberturas) está em{" "}
          <Link href="/relatorios" className="font-semibold text-acao">
            Relatórios → Auditoria
          </Link>
          .
        </p>
      </Cartao>
    </div>
  );
}
