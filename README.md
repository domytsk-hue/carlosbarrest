# Carlo's · Sistema de Gestão para Restaurantes

Sistema completo de gestão para restaurantes: mesas, comandas, balcão, entregas, caixa, estoque, financeiro, DRE, cardápio digital, Pix, integrações (iFood, aiqfome, Stone) e marketing.

- **Plano e prompt mestre:** [`docs/plano.md`](docs/plano.md)
- **Identidade visual:** [`docs/identidade-visual/identidade-visual.md`](docs/identidade-visual/identidade-visual.md)

## O que já está pronto

| Fase | Módulos |
| --- | --- |
| 1 · Operação | Mesas, comandas, balcão, PDV, entregas, caixa, produtos, cadastros, relatórios de venda |
| 2 · Atendimento | Pedido pelo QR Code da mesa, chamados, monitor da cozinha (KDS), app do garçom, cardápio online próprio com acompanhamento |
| 3 · Gestão | Estoque com ficha técnica e XML de NF-e, inventário, contas a pagar/receber, DRE, comissões, balança |
| 4 · Integrações | Agente de impressão (ESC/POS), iFood e aiqfome, NFC-e (Focus NFe), maquininha (manual ou Stone) |
| 5 · Crescimento | Promoções (cupom, happy hour, combo), chatbot do WhatsApp, central de ajuda (F1), treinamentos, assinatura |

As integrações com terceiros ficam desligadas até as credenciais entrarem nas variáveis do servidor (veja `.env.example`). Os segredos nunca vão para o banco nem para variáveis `NEXT_PUBLIC_`.

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
3. Rode `supabase/migrations/20261109060000_seguranca.sql` por último (já incluído no `db push`): tira da API as funções internas.
4. Crie um usuário em Authentication, entre no app e chame `select criar_restaurante('Carlo''s Bar & Restaurante', 'Seu nome');` logado como ele (ou insira o vínculo em `membros`).

### Tablet da cozinha

Com o Supabase ligado, as contas, os pedidos e os status de preparo passam por `loja_registros` (migração `20261110100000_sincronizacao_cozinha.sql`) e chegam aos outros aparelhos pelo Realtime: o garçom lança no celular, o tablet da cozinha recebe na hora e o salão é avisado quando o pedido fica pronto.

Login só da cozinha: crie o usuário em Authentication → Users e vincule com a função `cozinha`:

```sql
insert into membros (restaurante_id, user_id, funcao, nome_exibicao)
select r.id, u.id, 'cozinha', 'Cozinha'
from restaurantes r, auth.users u
where r.nome = 'Carlo''s Bar & Restaurante' and u.email = 'cozinha@seudominio.com'
on conflict (restaurante_id, user_id) do update set funcao = 'cozinha', ativo = true;
```

Quem entra com essa função vê só o painel da cozinha: sem menu, sem atalhos e sem acesso às outras telas.

## Estrutura

```
src/app/(painel)/        telas logadas (dashboard e módulos)
src/app/login/           login
src/components/shell/    layout: menu, barra de acesso rápido, barra de status, suporte, atalhos
src/lib/dominio/         regras de negócio puras (cálculos, estoque, financeiro, promoções)
src/lib/loja/            estado e ações do modo demonstração
src/lib/integracoes/     impressão, marketplaces, fiscal, webhooks
src/lib/chatbot/         robô de atendimento (simulador e WhatsApp)
agente/                  agente de impressão local (Node)
src/lib/modulos.ts       lista de módulos, ícones, atalhos e fase do plano
src/lib/sessao.ts        usuário, função e restaurante ativos
supabase/migrations/     esquema do banco (RLS por restaurante)
```

## Atalhos

F1 Ajuda · F3 Mesas · F4 Balcão · F6 Cozinha · F8 Entregas · F11 Comandas · F12 PDV · Ctrl+Ins Nova conta
