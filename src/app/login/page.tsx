"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { limparSessao } from "@/lib/sessao";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await criarClienteNavegador().auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) return setErro("Usuário ou senha incorretos.");
    limparSessao();
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <Image src="/logo.svg" alt="Carlo's Bar & Restaurante" width={210} height={140} priority className="logo-marca mx-auto mb-6 h-auto w-[210px] drop-shadow-[0_2px_4px_rgba(80,30,10,.15)]" />
        <form onSubmit={entrar} className="rounded-[20px] bg-card p-6 shadow-card">
          <h1 className="font-slab text-[22px] font-extrabold uppercase tracking-tight text-marca">Painel do restaurante</h1>
          <p className="mt-1 mb-4 text-[13px] text-mudo">Entre com seu usuário para começar o turno.</p>

          {!supabaseConfigurado ? (
            <div className="rounded-2xl border border-[#F2D9BE] bg-[#FFF6EC] p-4 text-[13px] leading-relaxed text-[#2A1A16]">
              O Supabase ainda não foi configurado, então o sistema está em <b>modo demonstração</b>.{" "}
              <Link href="/" className="font-bold text-[#B8322A] underline">
                Entrar na demonstração
              </Link>
            </div>
          ) : (
            <>
              <label className="mt-3 mb-1.5 block text-[12.5px] font-semibold">E-mail</label>
              <input
                className="w-full rounded-xl border-[1.5px] border-linha bg-white px-3 py-2.5 text-[15px] text-[#2A1A16] outline-none focus:border-acao"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label className="mt-3 mb-1.5 block text-[12.5px] font-semibold">Senha</label>
              <input
                className="w-full rounded-xl border-[1.5px] border-linha bg-white px-3 py-2.5 text-[15px] text-[#2A1A16] outline-none focus:border-acao"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              {erro && <p className="mt-2 text-[12.5px] font-semibold text-st-cancelado">{erro}</p>}
              <button
                disabled={enviando}
                className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-acao font-bold text-white shadow-botao disabled:opacity-50"
              >
                <LogIn size={18} />
                {enviando ? "Entrando..." : "Entrar"}
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
