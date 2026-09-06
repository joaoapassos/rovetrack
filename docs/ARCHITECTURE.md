# Arquitetura

O Rovetrack é um aplicativo Electron com TypeScript e React. A arquitetura mantém a interface isolada das APIs do sistema operacional e divide aquisição, processamento e armazenamento em etapas independentes.

## Visão geral

```text
Renderer (React)
    │ window.api
    ▼
Preload / contextBridge
    │ IPC com contratos validados
    ▼
Electron Main
    │
    ▼
Pipeline → Provider → Processor → OutputStorage
```

### Renderer

`src/renderer` contém as páginas, formulários, configurações, histórico e apresentação do progresso. Ele não acessa Node.js diretamente. As rotas usam `HashRouter`, o que permite que a navegação funcione também no aplicativo empacotado.

### Preload

`src/preload` expõe em `window.api` apenas as operações necessárias, como selecionar uma pasta, iniciar ou interromper uma execução, gerenciar backups e consultar atualizações. Essa camada evita disponibilizar IPC genérico para a interface.

### Processo principal

`src/main/index.ts` cria a janela, configura as restrições de navegação, registra handlers IPC e conecta os serviços. Entradas relevantes são verificadas novamente no processo principal antes de acessar arquivos, rede ou processos externos.

### Código compartilhado

`src/shared` mantém contratos Zod, tipos, catálogo de sites e regras que precisam ser iguais nos dois lados da aplicação. Os schemas funcionam como fronteira de validação em runtime, não apenas como tipos TypeScript.

## Pipeline de mídia

Uma execução possui um identificador e um workspace temporário isolado. O fluxo básico é:

1. validar a requisição e a política da URL;
2. preparar o workspace temporário;
3. selecionar um provider compatível;
4. adquirir um ou mais itens;
5. selecionar o processor adequado para cada item;
6. aplicar conversão, metadados e thumbnail;
7. mover os resultados para o destino sem sobrescrever arquivos existentes;
8. limpar o workspace e devolver um relatório.

Falhas durante o pós-processamento são isoladas por item sempre que possível. A telemetria do pipeline alimenta a interface e o progresso da barra de tarefas. Só uma execução de mídia pode ficar ativa por vez.

## Pontos de extensão

- `DownloadProvider`: declara capacidades e transforma uma origem em artefatos adquiridos. A implementação atual utiliza yt-dlp.
- `MediaProcessor`: transforma um artefato no formato final. Há processors separados para áudio e vídeo.
- `ProviderResolver` e `ProcessorResolver`: escolhem uma implementação compatível sem acoplar o pipeline a uma ferramenta específica.
- `OutputStorage`: define o nome final, lida com colisões e movimenta arquivos.

Adicionar suporte arquitetural não significa que uma fonte ou um formato já esteja implementado. A política de sites apenas autoriza a tentativa; o provider ainda precisa declarar suporte à requisição.

## Dados locais

Configurações e histórico são persistidos no perfil local do aplicativo pelo renderer. O schema de configurações é versionado e possui migração para versões anteriores. Backups JSON podem conter configurações, histórico ou ambos e são validados integralmente antes da importação.

## Atualizações

O `UpdateManager` separa duas responsabilidades:

- atualização do Rovetrack por releases públicas do GitHub;
- atualização opcional e independente do componente yt-dlp.

Um yt-dlp baixado só é ativado após validação de origem, tamanho, SHA-256 e execução de um health check. A versão empacotada continua disponível como fallback. Instalações e trocas de componente ficam bloqueadas enquanto mídia está sendo processada.

## Segurança em resumo

- `contextIsolation` e sandbox habilitados;
- integração Node desabilitada no renderer;
- preload explícito e IPC validado;
- somente URLs HTTPS públicas aceitas pela política;
- navegação inesperada e permissões do navegador bloqueadas;
- workspaces temporários por execução;
- uma execução ativa por vez;
- componentes externos verificados antes da ativação.
