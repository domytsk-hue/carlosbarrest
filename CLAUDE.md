# Instruções do projeto

- Idioma: código de domínio, textos da interface, commits e docs em **português**.
- Siga `docs/plano.md` (fases) e `docs/identidade-visual/identidade-visual.md` (cores, fontes, componentes). Não invente outra paleta: use os tokens de `src/app/globals.css` (`bg-card`, `text-acao`, `bg-rosado`, `text-mudo`, `border-linha`, `st-*` para status de pedido).
- Valores monetários: classe `num` (números tabulares) e `brl()`.
- Todo dado de negócio novo tem `restaurante_id` e política RLS com `public.e_membro(restaurante_id)`; ações sensíveis chamam `registrar_auditoria()`.
- Novos módulos entram em `src/lib/modulos.ts` (menu, barra rápida e atalhos saem dali).
- Antes de abrir PR: `npm run lint` e `npm run build`.
