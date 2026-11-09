# Carlo's · Sistema de Gestão para Restaurantes

Sistema completo de gestão para restaurantes: mesas, comandas, balcão, entregas, caixa, estoque, financeiro, DRE, cardápio digital, Pix, integrações (iFood, aiqfome, Stone) e marketing.

- **Plano e prompt mestre:** [`docs/plano.md`](docs/plano.md)
- **Identidade visual:** [`docs/identidade-visual/identidade-visual.md`](docs/identidade-visual/identidade-visual.md)

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Realtime) · lucide-react · Poppins e Roboto Slab empacotadas (@fontsource).

## Rodando

```bash
npm install
cp .env.example .env.local   # opcional
npm run dev                  # http://localhost:3000
```

Sem as variáveis do Supabase, o app roda em **modo demonstração**: sem login e com dados de exemplo no dashboard.

### Ligando o Supabase

1. Crie um projeto no Supabase e aplique `supabase/migrations/` (pelo SQL Editor ou `supabase db push`).
2. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no `.env.local`.
3. Crie um usuário em Authentication, entre no app e chame `select criar_restaurante('Carlo''s Bar & Restaurante', 'Seu nome');` logado como ele (ou insira o vínculo em `membros`).

## Estrutura

```
src/app/(painel)/        telas logadas (dashboard e módulos)
src/app/login/           login
src/components/shell/    layout: menu, barra de acesso rápido, barra de status, suporte, atalhos
src/lib/modulos.ts       lista de módulos, ícones, atalhos e fase do plano
src/lib/sessao.ts        usuário, função e restaurante ativos
supabase/migrations/     esquema do banco (RLS por restaurante)
```

## Atalhos

F3 Mesas · F4 Balcão · F8 Entregas · F11 Comandas · F12 PDV · Ctrl+Ins Nova conta
