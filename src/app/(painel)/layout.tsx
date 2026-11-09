import { AppShell } from "@/components/shell/app-shell";

// Sem consulta no servidor: as telas do painel são estáticas e abrem na hora.
// Quem não está logado é barrado antes, no middleware.
export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
