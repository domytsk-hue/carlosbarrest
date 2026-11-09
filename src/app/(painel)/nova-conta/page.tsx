"use client";

import { useRouter } from "next/navigation";
import { FormLancamento } from "@/components/financeiro/form-lancamento";
import { Cartao, Titulo } from "@/components/ui";

export default function NovaContaPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-[720px]">
      <Titulo sub="Conta a pagar ou a receber · Ctrl+Ins">Nova conta</Titulo>
      <Cartao>
        <FormLancamento aoSalvar={() => router.push("/contas")} />
      </Cartao>
    </div>
  );
}
