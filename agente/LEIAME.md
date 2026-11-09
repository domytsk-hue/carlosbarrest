# Agente local de impressão

O navegador não consegue falar direto com impressoras térmicas da rede. Este agente roda no computador do caixa e faz a ponte: o sistema manda o cupom já em ESC/POS para `http://localhost:9123` dizendo o nome da impressora (caixa, cozinha ou bar), e o agente envia para o IP cadastrado aqui.

## Instalar

1. Instale o [Node.js](https://nodejs.org) 18 ou mais novo.
2. Copie a pasta `agente/` para o computador do caixa.
3. Copie `impressoras.exemplo.json` para `impressoras.json` e ajuste:
   - `impressoras`: nome → IP:porta de cada impressora térmica (porta 9100 é o padrão das impressoras de rede).
   - `origens`: o endereço do sistema (ex.: `https://carlos.vercel.app`). Só esses endereços conseguem imprimir.
4. Rode `node agente-impressao.mjs`. Para iniciar junto com o Windows, crie um atalho para `node C:\carlos\agente\agente-impressao.mjs` na pasta Inicializar (`shell:startup`).
5. No sistema, em **Configurações › Impressoras**, ligue "Usar o agente local" e use **Testar** em cada impressora. Os nomes precisam ser os mesmos do `impressoras.json`.

## Segurança

- O agente só escuta no próprio computador (127.0.0.1).
- O sistema só escolhe o nome da impressora; o endereço de verdade fica neste arquivo. Não há como mandar para outro endereço nem gravar arquivos.
- Cada cupom tem no máximo 256 KB.

Sem o agente, o sistema imprime pelo navegador (Ctrl+P) na impressora padrão.
