# Sistema de Gestão para Restaurantes: Prompt Mestre e Plano de Implementação

> Documento de referência do projeto. A **Parte 1** é o prompt dissertativo, pronto para ser usado com uma IA de desenvolvimento ou entregue a um time. A **Parte 2** é o estudo tela por tela do sistema de referência (GrandChef Desktop), com o que vamos absorver e onde vamos superar. A **Parte 3** é o plano de construção, fase por fase. A **Parte 4** reúne a arquitetura sugerida e as decisões que ainda precisam ser tomadas.
>
> **Revisão 2 (09/11/2026):** incorporadas as funcionalidades observadas nos 19 prints do sistema de referência.
>
> **Revisão 3 (09/11/2026):** definida a identidade visual (Carlo's Bar & Restaurante), com guia completo, logo e ícones em `/mnt/project-files/identidade-visual/`. Incorporado também o app de cardápio do Carlos Bar, que já existe.

---

## Parte 1: Prompt dissertativo

Você vai me ajudar a construir um sistema completo de gestão para restaurantes, bares, lanchonetes e pizzarias, pensado para o mercado brasileiro. O objetivo é que o dono do estabelecimento consiga controlar toda a operação em um só lugar: do pedido que o garçom anota na mesa até o resultado financeiro do mês. O sistema precisa ser bonito, rápido e fácil de usar por pessoas sem familiaridade com tecnologia, porque ele será operado em horário de pico, com pressa, muitas vezes em um tablet ou celular. Cada tela deve priorizar clareza, botões grandes, poucos cliques e feedback visual imediato. O sistema será oferecido como um serviço online (SaaS) para vários restaurantes, então cada estabelecimento tem seus próprios dados isolados, seus usuários e suas permissões (dono, gerente, caixa, garçom, cozinha, entregador).

Usamos como referência funcional um sistema desktop já consolidado no mercado (GrandChef Desktop). Ele cobre bem a operação, mas é um aplicativo Windows com visual datado, depende de um servidor local na rede do restaurante e abre em uma tela inicial vazia, ocupada por propaganda. O nosso sistema deve oferecer **tudo o que ele faz na operação**, mas na nuvem, acessível de qualquer aparelho, com uma dashboard de verdade na tela inicial e com um visual moderno e próprio. Não vamos copiar a aparência dele: vamos usar a lista de funções como checklist de completude.

### Identidade visual

O sistema usa a identidade visual do **Carlo's Bar & Restaurante**, a mesma do cardápio online que já está no ar. O guia completo está em `identidade-visual/identidade-visual.md`, e o logo (SVG e PNG), os ícones do app e os 13 ícones 3D de categoria estão na mesma pasta. Em resumo:

- **Cores:** vermelho-vinho da marca `#9E1B1E`, vermelho de ação `#B8322A` (botões, links, foco), dourado `#F2A93B` (destaques, "mais pedido"), fundo creme `#F7EEE3`, cards `#FFFBF6`, texto marrom escuro `#2A1A16`, texto secundário `#7A685F`, bordas `#EADCCD`, verde de sucesso `#2E9E55`. Sombras sempre quentes, em tom de marrom.
- **Tipografia:** Poppins em toda a interface; Roboto Slab 800 em caixa alta para títulos de impacto. Números tabulares em valores e tabelas.
- **Formas:** cantos bem arredondados (cards 18 a 20 px, botões em pílula), botão "+" redondo vermelho, ícones 3D para categorias e ícones de linha para ações, barra superior vermelha no painel, cards de pedido com borda esquerda na cor do status.
- **Cores de status de pedido** (valem para mesas, cozinha, entregas e painel): novo dourado, confirmado azul `#3B82C4`, em preparo laranja `#E0702F`, pronto verde `#2E9E55`, entregue cinza-quente esmaecido, cancelado vermelho `#C0392B` esmaecido.
- **Modo escuro:** o cardápio atual é só claro; o sistema ganha um tema escuro derivado (fundo `#1C1412`, cards `#2A1F1C`), útil na cozinha e à noite.
- O fundo creme com cards claros e fotos grandes de comida deve continuar sendo a "cara" do produto. As telas de gestão, mais densas, mantêm a mesma paleta e as mesmas formas.

O sistema também deve **absorver o cardápio online que o Carlos Bar já tem** (carlosbar.netlify.app): ele já faz pedido para retirada com envio pelo WhatsApp, Pix por chave, horários de funcionamento, aviso de aberto/fechado, combos, promoções e cupons ("convites"), e tem um painel com pedidos, preços, combos, promoções e convites, já rodando no Supabase. Esse cardápio vira o **Cardápio Digital para Delivery** do novo sistema, e os pedidos dele passam a cair na Gestão de Entregas e no caixa, em vez de só no WhatsApp.

### Princípios de interface (aprendidos com a referência)

- **Barra de acesso rápido** sempre visível com os módulos de uso diário: Mesas, Comandas, Balcão, PDV, Entregas, Contas, Nova conta, Produtos, Estoque, Delivery.
- **Atalhos de teclado** para quem opera o caixa no computador: Mesas (F3), Balcão (F4), Entregas (F8), Comandas (F11), Venda rápida (F12), Fila de pedidos (Ctrl+O), Abrir caixa (Ctrl+Home), Fechar caixa (Ctrl+End), Registrar despesa (Ctrl+Ins). Os atalhos devem ser configuráveis.
- **Padrão de tela de operação em três colunas**: à esquerda, um painel de ações agrupadas (Movimentos, Relatórios, Taxas e serviços, Produtos); no centro, o mapa de mesas/comandas/pedidos e, abaixo, a lista de itens do selecionado; à direita, um painel de resumo (cliente, local, tempo de permanência, totais, contadores). Esse padrão funciona bem e deve ser mantido, com visual moderno, e virar uma única coluna com abas no celular.
- **Barra de status** no rodapé mostrando conexão, usuário logado e caixa ativo, para o operador nunca lançar no caixa errado.
- **Botão de suporte** flutuante em todas as telas.

As funções estão organizadas em quatro grandes áreas: Operação e Controle, Atendimento e Vendas, Gestão e Marketing, e Administração do Sistema.

### Operação e Controle

**Dashboard (visão geral).** A tela inicial do dono e do gerente, e o principal diferencial em relação à referência, que não tem nenhuma. Ela mostra, em tempo real, o faturamento do dia comparado com o mesmo dia da semana anterior, o ticket médio, o número de pedidos por canal (salão, balcão, delivery próprio, iFood, aiqfome), as mesas ocupadas, em fechamento e livres, as comandas abertas há mais tempo, as entregas atrasadas, os produtos mais vendidos, as formas de pagamento utilizadas, as contas a pagar que vencem hoje e alertas importantes (estoque baixo, caixa aberto há muito tempo, pedido atrasado na cozinha). Deve ter filtros por período e gráficos limpos e legíveis, e funcionar bem tanto em monitor quanto em celular. É a vitrine do sistema: precisa ser a tela mais bonita e mais útil.

**Controle de Caixa.** O restaurante cadastra quantos caixas quiser (ex.: Caixa 1, Caixa Delivery), e cada operador seleciona em qual está trabalhando. O caixa é aberto com um valor inicial (fundo de troco). Durante o turno, registra todas as entradas por forma de pagamento (dinheiro, Pix, débito, crédito, voucher, cheque, crédito de cliente, fiado) e as operações de caixa: **inserir dinheiro** (suprimento), **realizar sangria** (retirada), **registrar despesa** paga com dinheiro do caixa (que já cai no financeiro) e **realizar repasse** (transferência entre caixas ou para uma carteira/conta bancária). No fechamento, o operador informa o valor contado de cada forma de pagamento, e o sistema mostra a diferença entre o esperado e o informado. O histórico de caixas fechados fica disponível para auditoria, com o relatório de movimentação do caixa imprimível.

**Estoque.** Cadastro de insumos e produtos com unidade de medida, custo e estoque mínimo. Cada lançamento de estoque registra o tipo de movimento (compra, ajuste, perda, transferência, consumo interno), o fornecedor, a quantidade em unidades e em embalagens, o preço de compra, o total da compra, o preço de venda sugerido, o **lote**, a **data de fabricação**, a data de entrada e o **setor** (ex.: vendas, cozinha, bar), permitindo estoque por setor. A entrada de compras pode ser feita **importando o XML da NF-e do fornecedor**, que preenche itens, quantidades e custos sozinha. Cada produto do cardápio pode ter uma ficha técnica que diz quais insumos e quantidades consome, para dar baixa automática a cada venda. Inventário periódico, alertas de estoque mínimo, sugestão de compra e relatório de movimentação de estoque. O custo alimenta o CMV e a margem de cada produto.

**Integrações com Impressora e Balança.** Cadastro de impressoras e de quais setores cada uma atende, para roteamento automático: bebidas saem no bar, pratos na cozinha, pizzas no forno. Impressões necessárias: pedido de preparo (com reimpressão), conta/pré-conta da mesa ou comanda, comprovante de venda, relatório de fechamento de caixa, relatórios em geral e **etiquetas de produto** (preço, validade, lote). Integração com balanças (como Toledo e Filizola) para venda por quilo, lendo o peso diretamente e lançando no pedido. Como o navegador não fala bem com hardware, isso é feito por um pequeno agente local instalado no computador do restaurante. Uma tela de configuração lista os **computadores e tablets** conectados e o status de cada impressora.

**Extrato Financeiro.** Todo dinheiro que entra e sai do restaurante. O cadastro de uma conta tem: tipo (despesa ou receita), valor, vencimento, data de emissão, fornecedor ou cliente, número do documento, **classificação e subclassificação** (plano de contas, ex.: "Pagamento de Fornecedores"), **anexo** (foto do boleto ou da nota), acréscimo, **multa por atraso, juros (%)** e data de pagamento. A tela de consulta filtra por descrição ou código, cliente, tipo, número do documento, classificação, subclassificação, período de vencimento, período de emissão e estado (a pagar, a receber, pagas), e mostra no topo os totais: total, pago, restante e quantidade de contas. É possível **consolidar** várias contas (pagar ou receber em lote), imprimir e exportar. Contas recorrentes (aluguel, salários) são geradas automaticamente. Integra-se com os caixas, com os repasses do iFood e com os recebíveis de cartão (taxas e prazos). Cadastros de apoio: bancos, carteiras (contas onde o dinheiro fica), cartões e suas taxas, formas de pagamento, moedas e patrimônio. Visões de **fluxo de caixa**, **balanço de contas** e **receitas e despesas** por período.

**DRE.** O Demonstrativo de Resultado do Exercício, gerado automaticamente a partir do extrato financeiro e do estoque: receita bruta, deduções (impostos, taxas de cartão e de marketplace), receita líquida, CMV, lucro bruto, despesas operacionais agrupadas pelas classificações do plano de contas, resultado operacional e lucro líquido. Comparação entre meses e percentual de cada linha sobre a receita, para que o dono entenda onde está ganhando ou perdendo dinheiro sem precisar de um contador ao lado. (A referência não tem DRE; este é outro diferencial.)

**Relatórios.** Uma central de relatórios com filtros por período e exportação em PDF e Excel, cobrindo no mínimo o que a referência oferece: relatório de vendas, de pedidos, vendas por produto, por vendedor, por cliente e por período; movimentação do caixa, pagamento de contas, balanço de contas, fluxo de caixa e relatório de cheques; entregas por entregador e relatório de bairros; movimentação de estoque e relatório de produtos; relatório de funcionários, de clientes, de créditos de clientes e de carteiras.

### Atendimento e Vendas

**Mesas e Comandas.** Mapa visual do salão com as mesas agrupadas por estado: **em fechamento** (conta pedida), **ocupadas** e **disponíveis**, cada mesa mostrando o valor já consumido, e com contadores de ocupadas e livres. Ao selecionar uma mesa, o painel lateral mostra o cliente e o **tempo de permanência**, e a lista inferior mostra os itens (código, descrição, preço, quantidade, total, atendente que lançou e ações). O sistema também suporta **comandas individuais numeradas** (cartão ou pulseira), com o local onde o cliente está. Ações disponíveis: adicionar produtos, **pagamento parcial** (um cliente paga a sua parte e vai embora), concluir/fechar, reimprimir o pedido de preparo, imprimir a conta, aplicar descontos (com permissão), adicionar **serviços** (taxa de serviço de 10% configurável, couvert artístico, taxa de rolha), lançar **comissão** do atendente, **alterar** itens, **juntar** mesas/comandas, **agrupar e desagrupar** itens, transferir itens e **reservar** mesas. Cadastros de apoio: mesas e comandas (quantidade, nome, área do salão).

**Lançamento de pedido.** A tela de lançar itens tem as **categorias com ícones** em uma coluna (ex.: Adicionais, Bebidas, Caldos, Cervejas, Porções, Refeições), uma **busca** por nome ou código, e a lista de produtos com foto, preço e detalhes. Ao escolher um produto, o operador ajusta a quantidade com botões de mais e menos, adiciona **observação** (sem cebola, ponto da carne) e adicionais, e vê os produtos do pedido em montagem, o subtotal e o **total acumulado da mesa**. Escolhe o **atendente** responsável (para a comissão) e clica em **Enviar**, que manda para a produção e gera um **número de pedido**. O mesmo componente é usado em mesas, comandas, balcão, entregas e no app do garçom.

**Aplicativo para Garçons.** Um aplicativo para celular (um PWA, que funciona pelo navegador e pode ser instalado na tela inicial) com o mapa de mesas e comandas, a tela de lançamento de pedido descrita acima, pedir a conta, pagamento parcial e aviso de pedido pronto. Precisa ser extremamente ágil, tolerar internet instável (fila de envio offline) e mostrar ao garçom suas vendas e comissão do dia.

**Vendas no Balcão e PDV.** Duas formas de venda sem mesa. O **balcão** atende retirada e também entrega: busca ou cadastra o **cliente**, escolhe o **endereço de entrega** entre os salvos, marca o pedido como **para viagem**, lança os itens, aplica descontos e serviços, vê o **histórico de compras do cliente**, aceita pagamento parcial e conclui. O **PDV / venda rápida** é para vender em segundos sem identificar cliente (padaria, lanchonete, self-service): busca por nome ou código, leitor de código de barras, balança, senha de chamada para retirada e pagamento combinado (parte em dinheiro, parte em Pix etc.). Uma **fila de pedidos** mostra tudo o que está em produção, de todos os canais.

**Gestão de Entregas.** A tela de pedidos para entrega lista pedido, cliente, telefone, endereço, total, **entregador** e data de saída, com os contadores de pedidos, despachados e tempo médio. Cada pedido é colorido pelo **tempo de espera** (0, 15, 30, 45 minutos e 1 hora), para que os atrasados saltem aos olhos. Ações: adicionar produtos, **despachar** (atribuir entregador e registrar a saída), concluir, pagamento parcial, reimprimir preparo, descontos, serviços (taxa de entrega) e comissão do entregador. Cadastros de apoio: **bairros com taxa de entrega**, cidades, estados e países. Relatório de entregas por entregador para o acerto no fim do dia.

**Cardápio Digital QR Code.** Cada mesa tem um QR Code. O cliente escaneia, vê o cardápio com fotos, descrições e preços, e pode (conforme a configuração do restaurante) apenas consultar, chamar o garçom, ou fazer o pedido direto, que entra na comanda da mesa. Também pode ver a conta parcial e pagar via Pix pelo próprio celular.

**Cardápio Digital para Delivery.** Uma loja online própria do restaurante (equivalente ao "Site Delivery" da referência), com endereço personalizado, onde o cliente monta o pedido, informa o endereço (com taxa de entrega por bairro ou por distância), escolhe entrega ou retirada, e paga online (Pix) ou na entrega. O restaurante escolhe quais produtos aparecem no delivery e com qual preço. O pedido cai direto na tela de Gestão de Entregas. O cliente acompanha o status. Isso reduz a dependência das taxas dos marketplaces.

**Pagamento Pix Integrado.** Geração de QR Code Pix dinâmico com o valor exato da conta, por meio de um provedor de pagamentos (PSP) com API, e confirmação automática do pagamento via webhook, sem que ninguém precise conferir o extrato do banco. O pagamento já baixa a comanda e entra no caixa. Deve funcionar no PDV, no app do garçom, no QR Code da mesa e no delivery.

**POS Stone.** Integração com as maquininhas Stone para que o valor da conta seja enviado do sistema para a maquininha (sem digitação manual, sem erro de valor) e a confirmação volte automaticamente para o sistema, registrando bandeira, modalidade e NSU. Isso permite a conciliação automática dos recebíveis de cartão no financeiro.

**Integração iFood e aiqfome.** Os pedidos feitos nesses marketplaces entram automaticamente na Gestão de Entregas, junto com os pedidos do salão e do delivery próprio, sem precisar de um tablet separado para cada plataforma. O sistema aceita ou recusa o pedido, atualiza o status (em preparo, pronto, saiu para entrega), imprime na cozinha, dá baixa no estoque e registra a venda com as taxas da plataforma para o financeiro. Pausar a loja ou um produto esgotado deve refletir nas plataformas.

### Gestão e Marketing

**Clientes e Fornecedores.** Cadastro de clientes com telefone, vários endereços, histórico de pedidos, **créditos** (saldo pré-pago ou haver) e limite de fiado. Cadastro de fornecedores, usado nas compras de estoque e nas contas a pagar.

**Funcionários e Gestão de Comissão.** Cadastro de funcionários e de **funções** (garçom, caixa, cozinheiro, entregador), que definem as permissões. Regras de comissão configuráveis por funcionário ou função: percentual sobre a taxa de serviço, percentual sobre vendas, valor fixo por produto ou por entrega, metas com bônus. A comissão é lançada em cada pedido (botão Comissão nas telas de mesa, comanda, balcão e entrega). Relatório por período mostrando quanto cada um vendeu e tem a receber, integrado ao contas a pagar.

**Dinâmicas Promocionais.** Ferramentas para vender mais: cupons de desconto, combos, happy hour (preço diferente por dia e horário), "compre X e ganhe Y", programa de fidelidade (pontos ou cartão carimbo digital), cashback e campanhas para clientes inativos. Cada promoção tem período de validade, regras de uso e relatório de resultado.

**Chatbot.** Um atendente automático no WhatsApp que responde dúvidas frequentes (horário, endereço, cardápio), envia o link do cardápio de delivery, recebe pedidos ou encaminha para um humano, informa o status do pedido e dispara mensagens das campanhas promocionais para clientes que autorizaram. Pode usar IA para entender perguntas em linguagem natural, sempre com a opção de passar para uma pessoa.

**Materiais de apoio e treinamentos gravados.** Uma central de ajuda dentro do próprio sistema (o equivalente ao manual pelo F1 da referência), com artigos e vídeos curtos por funcionalidade, organizada por função. Um botão de ajuda contextual em cada tela, dicas de ferramenta (tooltips) nos botões, e trilhas de onboarding para o restaurante recém-chegado.

**Treinamentos personalizados e ao vivo.** Agendamento de sessões de treinamento com a equipe de suporte, por videochamada ou presencial, com calendário, confirmação e histórico de quem foi treinado. Inclui **suporte remoto** (chat de suporte e compartilhamento de tela) acessível pelo botão de suporte.

### Administração do Sistema

**Empresa e configurações.** Dados da empresa (razão social, CNPJ, endereço, logo), parâmetros do sistema (taxa de serviço padrão, regras de fechamento, idioma), cadastro de impressoras e dispositivos. Por ser nuvem, as funções de "conectar ao servidor" e "meu IP" da referência deixam de existir.

**Usuários, login e auditoria.** Login individual por funcionário (com troca rápida de usuário no mesmo aparelho), permissões por função e um **log de auditoria** de ações sensíveis: cancelamento de item, desconto, reabertura de conta, sangria, alteração de preço, exclusão.

**Backup e manutenção.** Na referência, o backup e a restauração são manuais. No nosso sistema, o backup é automático na nuvem, com exportação dos dados sob demanda. A função de "limpar vendas" vira um arquivamento com permissão de dono e registro em auditoria.

**Planos e assinatura.** Como SaaS, o sistema tem planos, cobrança recorrente, período de teste e comunicação de ofertas de renovação (como o banner que a referência mostra na tela inicial), mas de forma discreta, sem tomar o lugar da dashboard.

### Requisitos transversais

O sistema deve ser responsivo e funcionar em navegador, tablet e celular; ter controle de permissões por função; registrar quem fez cada ação; atualizar telas em tempo real (uma mesa ocupada no app do garçom aparece ocupada no caixa na hora); tolerar quedas de internet nas operações críticas; ser seguro (dados isolados por restaurante, senhas e chaves de API protegidas); estar em conformidade com a LGPD para os dados de clientes; e ter um visual consistente, moderno, com modo claro e escuro. Além das funções listadas, um sistema de PDV no Brasil precisa emitir documento fiscal (NFC-e), e isso deve ser previsto na arquitetura.

---

## Parte 2: Estudo do sistema de referência (GrandChef Desktop)

Resumo dos 19 prints enviados, tela por tela, com o que vamos absorver e onde vamos superar.

| Tela / menu | O que tem | O que fazemos |
|---|---|---|
| Tela inicial | Barra de atalhos, área central vazia com banner de renovação, botão Suporte, barra de status (usuário, caixa) | Manter atalhos, status e suporte; **trocar a área vazia pela Dashboard** |
| Mesas | Mesas agrupadas em Em fechamento / Ocupadas / Disponíveis com valor; painel com cliente, permanência, ocupadas/livres; ações Parcial, Concluir, Preparo, Conta, Descontos, Serviços, Comissão, Reservar, Juntar, Desagrupar | Tudo isso, mais mapa do salão arrastável por áreas e cores por tempo de permanência |
| Comandas | Comandas numeradas; painel com local, cliente, permanência; mesmas ações + Alterar e Agrupar | Igual, com leitura de cartão/QR da comanda |
| Lançar pedido | Categorias com ícones, busca, produtos com foto e preço, quantidade +/−, observação, total da mesa, atendente, Enviar, nº do pedido | Componente único reutilizado em todos os canais e no app do garçom |
| Balcão | Cliente, endereço de entrega, Viagem, Concluir, Cancelar, Parcial, Descontos, Serviços, Comissão, Histórico, Agrupar | Igual, separado do PDV rápido |
| PDV / Venda rápida | Atalho dedicado (F12) | PDV com código de barras, balança e pagamento combinado |
| Entrega | Lista com cliente, telefone, endereço, total, entregador, saída; contadores; legenda por tempo 0–60 min; Entregar, Concluir, Parcial, Preparo | Igual, mais pedidos de iFood/aiqfome na mesma fila e mapa de entregas |
| Contas a pagar/receber | Totais (total, pago, restante); filtros por cliente, tipo, documento, classificação, subclassificação, vencimento, emissão; Pesquisar, Consolidar, Imprimir | Igual, mais conciliação bancária e contas recorrentes |
| Cadastro de contas | Despesa/receita, valor, vencimento, fornecedor, documento, emissão, classificação, subclassificação, anexo, acréscimo, multa, juros, pagamento | Igual, alimentando a DRE |
| Produtos | Lista com foto, categoria e preço; editar, excluir, imprimir, etiquetas, paginação | Igual, mais ficha técnica, variações e disponibilidade por canal |
| Estoque | Movimento (compra etc.), fornecedor, unidades, quantidade, preço de compra/venda, lote, fabricação, setor, entrada; aba Importar XML | Igual, mais ficha técnica, baixa automática e inventário |
| Delivery | Gestão dos produtos do site de delivery | Cardápio digital próprio, com Pix |
| Menu Arquivo | Login, fechar, restaurar, cópia de segurança, sair | Login na nuvem; backup automático |
| Menu Financeiro | Selecionar/abrir/fechar caixa, inserir dinheiro, registrar despesa, sangria, repasse, receitas e despesas | Tudo isso no Controle de Caixa |
| Menu Visualizar | Tela cheia, barra de ferramentas, ícones modernos, linguagem, gerenciamento local, site delivery | Tela cheia, idioma, tema claro/escuro |
| Menu Vendas | Mesas (F3), Comandas (F11), Balcão (F4), Entrega (F8), Venda rápida (F12), Fila de pedidos (Ctrl+O) | Mesmos atalhos, configuráveis |
| Menu Relatórios | 21 relatórios (vendas, caixa, contas, estoque, entregas, clientes, funcionários, bairros, carteiras, cheques) | Todos, com exportação e gráficos, mais DRE |
| Menu Cadastro | Produtos, estoque, categorias, fornecedores, clientes, mesas, comandas, países/estados/cidades/bairros, funcionários, funções, contas, serviços, créditos, formas de pagamento, cartões, bancos, carteiras, moedas, caixas, patrimônio | Todos, organizados em uma área de Cadastros |
| Menu Configurações | Impressoras, computadores e tablets, meu IP, conectar ao servidor, empresa e sistema, limpar vendas, auditoria | Impressoras, dispositivos, empresa, auditoria (sem servidor local) |
| Menu Ajuda | Manual (F1), registro/licença, suporte remoto, atualizar, sobre | Central de ajuda, assinatura, suporte; atualização automática |

**O que a referência não mostra nos prints e nós teremos:** dashboard, DRE, Pix integrado com baixa automática, integração iFood/aiqfome e Stone, cardápio QR Code na mesa, app do garçom em PWA, promoções e chatbot.

---

## Parte 3: Plano de implementação, parte por parte

A lógica do plano é construir primeiro o **núcleo que gera venda** (cardápio, mesas, comandas, caixa) e só depois o que depende dele (estoque, financeiro, integrações, marketing). Cada fase termina com algo usável de verdade, que pode ser testado em um restaurante piloto. A tabela da Parte 2 serve de checklist de completude em cada fase.

### Fase 0: Fundação (1 a 2 semanas)

- Repositório, ambientes (desenvolvimento e produção) e deploy automático.
- Cadastro de restaurante (multi-empresa), dados da empresa, usuários, login individual com troca rápida, funções e permissões.
- Log de auditoria (a estrutura, desde o início, para que todas as fases registrem nele).
- Design system a partir do guia `identidade-visual/identidade-visual.md`: tokens de cor (claro e escuro), Poppins e Roboto Slab, componentes (botões em pílula, cards, botão "+", pílulas de status, bottom sheets), logo no cabeçalho e os 13 ícones de categoria já prontos.
- Layout base: barra de acesso rápido, menu lateral, barra de status (usuário, caixa ativo, conexão), botão de suporte, sistema de atalhos de teclado.
- Camada de tempo real.

**Pronto quando:** dá para criar um restaurante, convidar um funcionário e cada um ver só o que sua função permite.

### Fase 1: MVP operacional (5 a 7 semanas)

1. **Cadastros básicos:** categorias (com ícone), produtos (foto, preço, código, adicionais, variações), mesas, comandas, formas de pagamento, serviços (taxa de serviço, couvert), clientes com endereços, bairros com taxa de entrega, funcionários.
2. **Componente de lançamento de pedido:** categorias, busca, quantidade, observação, atendente, Enviar com número de pedido.
3. **Mesas e Comandas:** mapa por estado, painel de permanência, parcial, concluir, conta, descontos, serviços, juntar, agrupar/desagrupar, transferir, reservar.
4. **Balcão, PDV/venda rápida e fila de pedidos.**
5. **Gestão de Entregas:** lista com entregador, cores por tempo de espera, despachar e concluir.
6. **Controle de Caixa:** múltiplos caixas, abrir, inserir dinheiro, sangria, registrar despesa, repasse, fechar com conferência.
7. **Impressão básica:** pedido de preparo e conta, com o primeiro esboço do agente local.
8. **Dashboard v1** e relatórios essenciais: vendas, pedidos, vendas por produto/vendedor/período, movimentação do caixa.

**Pronto quando:** um restaurante piloto opera um turno inteiro (abrir caixa, atender mesas, comandas, balcão e entregas, fechar caixa) sem papel e sem o sistema antigo.

### Fase 2: Atendimento digital (4 a 5 semanas)

1. **Aplicativo para Garçons** (PWA), com fila offline, reaproveitando o componente de lançamento.
2. **Tela de cozinha (KDS)**, opcional à impressão.
3. **Cardápio Digital QR Code.**
4. **Pagamento Pix Integrado** em todos os pontos de venda.
5. **Cardápio Digital para Delivery**, partindo do cardápio online do Carlos Bar que já existe: migrar produtos, fotos, combos, promoções e cupons para o banco do novo sistema, trocar o Pix por chave pelo Pix dinâmico com baixa automática, e fazer os pedidos caírem na Gestão de Entregas. O endereço e o visual atuais se mantêm, para o cliente não perceber a troca.

**Pronto quando:** um garçom atende só pelo celular, e um cliente faz e paga um pedido de delivery sem falar com ninguém.

### Fase 3: Estoque e Financeiro (6 a 7 semanas)

1. **Estoque:** fornecedores, movimentos com lote, fabricação e setor, **importação de XML de NF-e**, ficha técnica, baixa automática, inventário, alertas, etiquetas.
2. **Integração com Balança.**
3. **Extrato Financeiro:** plano de contas (classificação e subclassificação), cadastro de contas com anexo, multa e juros, consulta com filtros e totais, consolidar, contas recorrentes, bancos, carteiras, cartões e taxas, créditos de clientes, fluxo de caixa, balanço, receitas e despesas.
4. **DRE** automático.
5. **Gestão de Comissão** (garçom e entregador).
6. **Central de relatórios completa** (todos os 21 da referência) e **Dashboard v2** com margem, CMV e contas do dia.

**Pronto quando:** o dono fecha o mês e vê a DRE correta sem planilha paralela, e encontra qualquer relatório que tinha no sistema antigo.

### Fase 4: Integrações externas (6 a 10 semanas, depende de terceiros)

**Os pedidos de credenciamento devem ser iniciados já na Fase 1**, para estarem liberados quando chegar a hora.

1. **iFood** e **aiqfome**, entrando na fila da Gestão de Entregas.
2. **POS Stone.**
3. **Emissão fiscal (NFC-e)** via emissor terceirizado com API.
4. **Impressão e agente local completos:** roteamento por setor, várias impressoras, tela de dispositivos conectados, reconexão automática.

**Pronto quando:** pedidos dos marketplaces entram sozinhos, a maquininha recebe o valor do sistema e a nota é emitida no fechamento.

### Fase 5: Gestão, Marketing e SaaS (4 a 6 semanas)

1. **Dinâmicas Promocionais.**
2. **Chatbot no WhatsApp.**
3. **Central de ajuda e treinamentos gravados**, com ajuda contextual e tooltips.
4. **Treinamentos ao vivo e suporte remoto.**
5. **Planos e assinatura:** cobrança recorrente, teste grátis, comunicação de renovação.
6. **Exportação de dados e arquivamento** de vendas antigas.

**Pronto quando:** um restaurante novo se cadastra, assina, aprende sozinho e lança sua primeira promoção.

### Visão geral do cronograma

| Fase | Foco | Duração estimada |
|---|---|---|
| 0 | Fundação, permissões, auditoria, design system | 1 a 2 semanas |
| 1 | MVP: cadastros, mesas, comandas, balcão, PDV, entregas, caixa, dashboard | 5 a 7 semanas |
| 2 | Garçom, KDS, QR Code, Pix, delivery próprio | 4 a 5 semanas |
| 3 | Estoque com XML, balança, financeiro, DRE, comissão, relatórios | 6 a 7 semanas |
| 4 | iFood, aiqfome, Stone, NFC-e, impressão completa | 6 a 10 semanas |
| 5 | Promoções, chatbot, treinamentos, assinatura | 4 a 6 semanas |

As estimativas consideram uma pessoa desenvolvendo com apoio de IA e são aproximadas. Em relação à primeira versão do plano, as Fases 1 e 3 cresceram uma semana cada, porque os prints mostraram mais detalhe operacional (entregas, múltiplos caixas, plano de contas, importação de XML, 21 relatórios).

---

## Parte 4: Arquitetura sugerida e decisões pendentes

### Stack sugerida

- **Frontend e painel:** Next.js (React) com TypeScript, Tailwind e shadcn/ui. Gráficos com Recharts ou similar.
- **Backend e banco:** Supabase (Postgres, autenticação, tempo real e armazenamento de fotos e anexos), com isolamento por restaurante via Row Level Security. O cardápio do Carlos Bar já usa Supabase; é preciso decidir se o novo sistema usa esse mesmo projeto ou um novo, com migração dos dados.
- **Hospedagem:** Vercel para o painel, o cardápio digital e os webhooks (Pix, iFood).
- **App do garçom:** PWA no mesmo projeto.
- **Agente local:** pequeno programa (Node ou Go) para impressoras e balança. É a única peça instalada no restaurante, no lugar do servidor local que a referência exige.
- **Pix:** um PSP com API e webhook (ex.: Mercado Pago, Efí, Asaas).

### Modelo de dados central (simplificado)

`restaurante` → `usuario` / `funcionario` (com `funcao`) · `categoria` → `produto` → `ficha_tecnica` → `insumo` · `setor` · `mesa` / `comanda` → `pedido` → `item_pedido` (com atendente e observação) · `cliente` → `endereco`, `credito_cliente` · `bairro` (taxa de entrega) · `entregador` · `caixa` → `sessao_caixa` → `movimento_caixa` (venda, suprimento, sangria, despesa, repasse) · `pagamento` (forma, PSP, NSU) · `fornecedor` · `movimento_estoque` (tipo, lote, fabricação, setor) · `conta` (tipo, classificação, subclassificação, vencimento, multa, juros, anexo) · `carteira` / `banco` / `cartao` · `servico` · `comissao` · `promocao` · `auditoria`.

O ponto mais importante continua sendo que **todo canal de venda vira um `pedido` no mesmo formato** (mesa, comanda, balcão, PDV, entrega, delivery próprio, iFood, aiqfome). Assim, estoque, caixa, financeiro, DRE, relatórios e dashboard funcionam igual, venha a venda de onde vier.

### Decisões que precisam ser tomadas

1. **Público:** o plano assume um SaaS para vários restaurantes. Se for para uso de um restaurante só, a Fase 0 e a parte de assinatura ficam mais simples.
2. **Migração:** se o restaurante piloto usa hoje o GrandChef, vale prever a importação de produtos, clientes e categorias dele, para facilitar a troca.
3. **Restaurante piloto:** ter um estabelecimento real para testar desde a Fase 1 acelera muito o produto.
4. **Emissão fiscal:** confirmar se a NFC-e entra no escopo.
5. **Provedor de Pix:** escolher o PSP.
6. **Credenciamentos:** iniciar cedo os cadastros no iFood, aiqfome, Stone e WhatsApp Business.
7. ~~Nome e identidade visual~~ **Definido:** identidade do Carlo's Bar & Restaurante (Revisão 3). Falta só decidir o nome do produto, caso ele seja vendido para outros restaurantes; nesse caso, a identidade do Carlos Bar vira o tema padrão e cada restaurante troca logo e cor principal.
8. **Projeto Supabase:** reaproveitar o do cardápio atual ou criar um novo e migrar.
