"use client";

import clsx from "clsx";
import Image from "next/image";
import { ImagePlus, Link2, LoaderCircle, Trash2, UtensilsCrossed } from "lucide-react";
import { useRef, useState } from "react";
import { brl } from "@/lib/dominio/calculos";
import { useSessao } from "@/lib/sessao";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { Entrada } from "./ui";

const BUCKET = "produtos";
const LADO_MAXIMO = 1000; // px — suficiente para o detalhe do cardápio (520px) em tela retina

/** Reduz a foto no próprio navegador e converte para WebP (ou JPEG, se o navegador não gerar WebP). */
async function prepararImagem(arquivo: File, lado = LADO_MAXIMO): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível ler a imagem.");
  ctx.fillStyle = "#fff"; // PNG com fundo transparente vira fundo branco
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const gerar = (tipo: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, 0.82));
  const webp = await gerar("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await gerar("image/jpeg");
  if (!jpeg) throw new Error("Não foi possível converter a imagem.");
  return jpeg;
}

function paraDataUrl(blob: Blob) {
  return new Promise<string>((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => erro(r.error);
    r.readAsDataURL(blob);
  });
}

function nomeArquivo(nome: string, ext: string) {
  const base =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "produto";
  return `${base}-${Date.now().toString(36)}.${ext}`;
}

/**
 * Foto do produto: envia o arquivo direto (Supabase Storage) e mostra como
 * ela vai aparecer no cardápio online e no lançamento de pedidos.
 * Endereços já cadastrados (ex.: /produtos/tnt.webp) continuam valendo.
 */
export function CampoFoto({
  valor,
  aoMudar,
  produto,
}: {
  valor: string | undefined;
  aoMudar: (v: string | undefined) => void;
  produto: { nome: string; preco: number; descricao?: string };
}) {
  const sessao = useSessao();
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [verEndereco, setVerEndereco] = useState(false);

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro("");
    if (!arquivo.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
      return;
    }
    if (arquivo.size > 20 * 1024 * 1024) {
      setErro("Imagem muito grande (máximo 20 MB).");
      return;
    }
    setEnviando(true);
    try {
      const rid = sessao?.restauranteId;
      if (!supabaseConfigurado || !rid) {
        // Modo demonstração: guarda a foto reduzida junto do cadastro
        aoMudar(await paraDataUrl(await prepararImagem(arquivo, 600)));
        return;
      }
      const blob = await prepararImagem(arquivo);
      const caminho = `${rid}/${nomeArquivo(produto.nome, blob.type === "image/webp" ? "webp" : "jpg")}`;
      const supabase = criarClienteNavegador();
      const { error } = await supabase.storage.from(BUCKET).upload(caminho, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (error) throw error;
      aoMudar(supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível enviar a foto. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  const nome = produto.nome || "Nome do produto";

  return (
    <div className="grid gap-3">
      <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => enviar(e.target.files?.[0])} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          enviar(e.dataTransfer.files?.[0]);
        }}
        className={clsx("flex items-center gap-3 rounded-xl border-[1.5px] border-dashed bg-card p-2.5", arrastando ? "border-acao bg-rosado" : "border-linha")}
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-rosado">
          {valor ? <Image src={valor} alt="" fill sizes="64px" className="object-cover" /> : <ImagePlus className="absolute inset-0 m-auto text-acao/60" size={24} />}
          {enviando && (
            <span className="absolute inset-0 grid place-items-center bg-card/70">
              <LoaderCircle className="animate-spin text-acao" size={22} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <button type="button" disabled={enviando} onClick={() => entrada.current?.click()} className="text-[13.5px] font-bold text-acao disabled:opacity-50">
            {enviando ? "Enviando…" : valor ? "Trocar foto" : "Enviar foto"}
          </button>
          <p className="text-[11.5px] text-mudo">Toque para escolher ou arraste a imagem aqui. A foto é reduzida automaticamente.</p>
        </div>
        {valor && !enviando && (
          <button type="button" onClick={() => aoMudar(undefined)} className="rounded-full p-2 text-mudo hover:bg-rosado hover:text-st-cancelado" aria-label="Remover foto">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {erro && <p className="text-[12px] font-semibold text-st-cancelado">{erro}</p>}

      {/* Pré-visualização: mesmos cortes do cardápio online e do lançamento de pedidos */}
      <div className="rounded-xl bg-fundo p-2.5">
        <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-mudo">Como vai aparecer</p>
        <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-2.5 sm:grid-cols-[minmax(0,1fr)_140px]">
          <div>
            <p className="mb-1 text-[11px] text-mudo">Cardápio online</p>
            <article className="flex gap-3 rounded-[18px] bg-card p-2.5 shadow-card">
              <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[14px] bg-rosado">
                {valor ? <Image src={valor} alt="" fill sizes="84px" className="object-cover" /> : <UtensilsCrossed className="absolute inset-0 m-auto text-acao/50" size={28} />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[14px] font-bold leading-tight">{nome}</p>
                {produto.descricao && <p className="mt-0.5 line-clamp-2 text-[12px] text-mudo">{produto.descricao}</p>}
                <span className="num mt-auto pt-1 text-[15px] font-extrabold text-marca">{brl(produto.preco || 0)}</span>
              </div>
            </article>
          </div>
          <div>
            <p className="mb-1 text-[11px] text-mudo">Lançar pedido</p>
            <div className="flex flex-col rounded-[18px] bg-card p-1.5 pb-2.5 shadow-card">
              {valor ? (
                <span className="relative aspect-[4/3] w-full overflow-hidden rounded-[13px] bg-white">
                  <Image src={valor} alt="" fill sizes="140px" className="object-cover" />
                </span>
              ) : (
                <span className="flex aspect-[4/3] w-full items-center justify-center rounded-[13px] bg-gradient-to-br from-[#F3E6D8] to-[#EAD6C2] text-[#B07A5E]">
                  <UtensilsCrossed size={22} />
                </span>
              )}
              <span className="mx-1 mt-2 line-clamp-2 text-[12.5px] font-semibold leading-tight">{nome}</span>
              <span className="num mx-1 mt-1 text-[13px] font-bold">{brl(produto.preco || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {verEndereco ? (
        <Entrada value={valor?.startsWith("data:") ? "" : (valor ?? "")} onChange={(e) => aoMudar(e.target.value || undefined)} placeholder="/produtos/nome.webp ou https://…" />
      ) : (
        <button type="button" onClick={() => setVerEndereco(true)} className="flex items-center gap-1.5 justify-self-start text-[12px] font-semibold text-mudo hover:text-acao">
          <Link2 size={13} /> Usar endereço de imagem
        </button>
      )}
    </div>
  );
}
