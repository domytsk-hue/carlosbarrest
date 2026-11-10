# Identidade Visual: Carlos Bar & Restaurante

> Extraída do app de cardápio já publicado (carlosbar.netlify.app) e do seu painel administrativo. Esta é a identidade oficial que o novo sistema vai usar. Todos os arquivos estão nesta pasta.

## Arquivos

| Pasta | Conteúdo |
|---|---|
| `logo/` | `logo-carlos-bar.svg` (vetor original, use sempre que possível), `logo-carlos-bar.png` (2010 px, fundo transparente), `logo-carlos-bar-600.png` (600 px) |
| `icones-app/` | `favicon.png`, `icon-192.png`, `icon-512.png` (maskable), `apple-touch-icon.png`, `og.jpg` (imagem de compartilhamento 1200×630) |
| `icones-categorias/` | 13 ícones 3D das categorias: pratos, meio-prato, individuais, quentinha, tira-gosto, porções, caldos, cervejas, drinks, bebidas, sucos, águas, sobremesas |
| `referencia/` | Prints do cardápio online no celular, para consulta |

## Logo

Faixa vermelho-vinho com contorno escuro, o nome **CARLO'S** em letras brancas de estilo manuscrito/serifado, um círculo âmbar no topo com um chapéu de chef desenhado a traço, e a assinatura **BAR & RESTAURANTE** em caixa alta, espaçada, em preto, abaixo.

- Cores do logo: vermelho `#A0000F`, âmbar `#FFAC07`, branco `#FFFFFF`, quase-preto `#140F0F`.
- Proporção 3:2 (4020 × 2682). Não distorcer, não recolorir, não colocar sobre fundo vermelho sem uma área de respiro clara.
- Uso no app: no cabeçalho com cerca de 92 px de altura e uma sombra suave (`drop-shadow(0 2px 4px rgba(80,30,10,.15))`).
- Tamanho mínimo recomendado: 120 px de largura, para a assinatura "BAR & RESTAURANTE" continuar legível. Abaixo disso, usar só o ícone do app.

## Paleta (tokens)

| Token | Hex | Uso |
|---|---|---|
| `--red` | `#9E1B1E` | Cor da marca: barra superior do painel, títulos, preço em destaque, `theme-color` do navegador |
| `--red2` | `#B8322A` | Ação principal: botões, botão "+", links, borda de campo em foco, item ativo |
| `--gold` | `#F2A93B` | Destaque: estrela de "mais pedido", selos, pedido novo |
| `--bg` | `#F7EEE3` | Fundo creme de todas as telas |
| `--card` | `#FFFBF6` | Fundo de cards, barra de navegação, painéis |
| `--ink` | `#2A1A16` | Texto principal (marrom quase preto, nunca preto puro) |
| `--mute` | `#7A685F` a `#86756C` | Texto secundário, rótulos, ícones inativos |
| `--line` | `#EADCCD` | Bordas e divisórias |
| `--ok` | `#2E9E55` | Sucesso, "aberto agora", pedido pronto, interruptor ligado |
| WhatsApp | `#1FA855` | Somente no botão de enviar pelo WhatsApp |
| Erro | `#C0262D` / `#C0392B` | Erro de formulário, "fechado", cancelado |

**Tons de apoio** (fundos suaves derivados do vermelho): `#FBE9E2` (fundo de ícone/pílula), `#FBE1D8` + borda `#E8A895` (categoria selecionada), `#F4E1D8` (botões de quantidade), `#FFF6EC` (avisos), `#F1E4D6` (botão secundário), `#F4EFEA` (fundo do ícone de categoria).

**Gradiente de destaque** (banners e promoções): `linear-gradient(120deg, #9E1B1E, #C2402F)`, com rótulo em `#FFD9A0`.

**Cores de status de pedido** (já usadas no painel, manter no sistema todo): novo `--gold`, confirmado `#3B82C4`, em preparo `#E0702F`, pronto `#2E9E55`, retirado/entregue `#B9AAA0` (esmaecido), cancelado `#C0392B` (esmaecido). Pílulas de status: verde `#E5F4EA`/`#1E7A41`, amarelo `#FDF0D6`/`#8A5A00`, vermelho `#FBE3DF`/`#A0261C`, azul `#E2EEF9`/`#1F5C96`.

**Sombras**: sempre quentes, nunca cinza: `0 2px 12px rgba(80,30,10,.06)` em cards, `0 8px 30px rgba(80,30,10,.18)` na barra flutuante. Overlay de modal: `rgba(40,15,8,.45)`.

**Modo escuro** (o app atual é só claro; proposta para o sistema): fundo `#1C1412`, card `#2A1F1C`, texto `#F7EEE3`, secundário `#B8A79C`, linha `#3D2E29`, ação `#D9483D`, marca `#C4302F`, mantendo dourado e verde.

## Tipografia

- **Poppins** (Google Fonts, pesos 400, 500, 600, 700, 800): fonte de toda a interface. Corpo 14 px, rótulos 11 a 12,5 px, títulos de seção 18 px peso 700, títulos de modal 20 a 21 px peso 800, preço 15 px peso 700.
- **Roboto Slab** (pesos 700 e 800): títulos de impacto e nome da casa, como no banner "A MELHOR PICANHA DA REGIÃO" (22 px, 800, `letter-spacing: -.3px`, em caixa alta).
- Em campos de formulário no celular, usar 16 px para o iPhone não dar zoom.

## Formas e componentes

- **Cantos bem arredondados**: cards 18 a 20 px, banner 24 px, campos 12 px, ícones de categoria 18 px, botões e pílulas totalmente arredondados (999 px).
- **Botão principal**: fundo `--red2`, texto branco 700, arredondado, altura mínima 44 px. Secundário: fundo `#F1E4D6`, texto `--ink`. Sucesso: `--ok`.
- **Botão "+" redondo** (34 px) em `--red2` com sombra avermelhada `0 3px 8px rgba(184,50,42,.35)`; vira seletor de quantidade com − e + em `#F4E1D8`.
- **Card de produto**: foto quadrada com cantos de 14 px, nome 13,5 px peso 600, preço em negrito, selo vermelho no canto superior esquerdo ("4-5 pessoas") e estrela dourada no direito ("mais pedido").
- **Categorias**: ícones 3D em blocos arredondados de 60 px, em uma faixa horizontal fixa no topo; a selecionada ganha fundo rosado e contorno.
- **Barra de navegação inferior flutuante** com botão central redondo de 64 px (sacola/pedido) saindo para cima, com contador.
- **Painel administrativo**: barra superior vermelha `--red` com texto branco, cards creme, abas inferiores (Pedidos, Preços, Combos, Promoções, Convites), cards de pedido com **borda esquerda de 5 px na cor do status**, filtros em pílulas (a ativa fica marrom escuro com texto branco), interruptores verdes.
- **Bottom sheets** para carrinho e checkout, com cantos superiores de 24 px.
- **Ícones de linha** (estilo traço) para navegação e ações; **ícones 3D** só para categorias de cardápio.

## Tom de voz

Português próximo e apetitoso: "Picanha chiando, servida na chapa sobre fogareiro", "Peça agora →", "Fechado agora · abre amanhã às 11h". Frases curtas, diretas, com foco na comida e no cliente.

## Como aplicar no sistema de gestão

- O fundo creme e os cards claros funcionam bem no salão iluminado; para a cozinha (KDS) e para uso noturno, oferecer o modo escuro.
- O sistema de gestão tem muito mais tabelas e números que o cardápio: manter Poppins, mas usar números tabulares (`font-variant-numeric: tabular-nums`) em valores e tabelas.
- Vermelho é a cor da marca e da ação; para **erro** e **cancelamento** usar sempre ícone e texto junto da cor, porque o vermelho sozinho se confunde com a marca.
- Se o sistema for vendido para outros restaurantes, esta identidade vira o **tema padrão** e cada restaurante troca logo e cor principal nas configurações; as cores de status e a estrutura ficam iguais.
