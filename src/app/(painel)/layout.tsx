import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { obterSessao } from "@/lib/sessao";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  return <AppShell sessao={sessao}>{children}</AppShell>;
}
