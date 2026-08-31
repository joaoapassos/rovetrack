# RoveTrack

RoveTrack é um aplicativo desktop para obter, processar e organizar mídia localmente. A funcionalidade disponível nesta versão recebe uma URL do YouTube e produz arquivos MP3 com metadata e capa.

## Status

O projeto está em beta, versão `0.2.0-beta`. Comportamentos e contratos internos ainda podem evoluir.

## O que o RoveTrack faz

O fluxo atual é:

```text
URL do YouTube
  → aquisição de áudio e metadata
  → MP3
  → capa 600 × 600 e tags ID3
  → arquivo organizado no destino escolhido
```

O aplicativo não oferece atualmente download de vídeo ou imagem, outros formatos de saída ou suporte funcional a sites diferentes do YouTube.

## Recursos atuais

- vídeos individuais e playlists do YouTube;
- saída em MP3;
- título, artista, álbum e capa em tags ID3;
- progresso do download e do processamento;
- interrupção confirmada, encerramento da árvore do processo e limpeza dos temporários;
- relatório de sucesso, falha parcial, interrupção ou erro;
- histórico local com opção de tentar novamente e abrir a pasta de destino validada;
- notificações sonoras e nativas;
- prevenção de sobrescrita por nomes repetidos.

## Arquitetura

```text
React Renderer
  ↓ window.api
Preload / contextBridge
  ↓ IPC validado
Electron Main
  ↓
Pipeline
  ↓
DownloadProvider
  ↓
Media Processor
  ↓
Output Storage
```

- **Renderer:** formulário, apresentação de progresso, relatórios, preferências e histórico.
- **Preload:** expõe apenas operações específicas do RoveTrack; não oferece IPC genérico.
- **Main/IPC:** valida requisições em runtime e controla recursos nativos.
- **Pipeline:** cria a execução e o workspace, resolve um provider, coordena processamento, armazenamento, relatório e cleanup.
- **Provider:** isola a aquisição e normaliza os artefatos produzidos pela ferramenta externa.
- **Processor:** aplica o pós-processamento específico da mídia.
- **Storage:** define filename, trata colisões e move o resultado com fallback entre volumes.

## Providers

`DownloadProvider` é a fronteira entre o domínio do RoveTrack e a ferramenta responsável por adquirir o conteúdo. Um `ProviderResolver` seleciona o primeiro provider registrado que declare suporte à requisição.

A única implementação real atual é `YtDlpProvider`, limitada a URLs HTTPS conhecidas do YouTube e a áudio MP3. A separação permite registrar outra implementação futuramente sem colocar detalhes de CLI e parsing dentro do pipeline. Não existe fallback automático entre providers.

## Processamento de mídia

Aquisição e pós-processamento são responsabilidades separadas. Atualmente, `AudioMp3Processor` redimensiona a thumbnail com Sharp, grava metadata e capa com node-id3 e entrega o artefato ao storage.

## Segurança

- `contextIsolation`, sandbox e renderer sem integração Node;
- API de preload explícita e limitada;
- payloads IPC validados em runtime;
- URLs de entrada limitadas a HTTPS e suporte da origem decidido pelo provider;
- navegação inesperada bloqueada;
- abertura externa restrita a HTTPS;
- uma única execução ativa por vez.

## Requisitos

Para desenvolvimento:

- Node.js compatível com as versões declaradas pelas dependências;
- npm;
- sistema operacional suportado pelo Electron.

Os pacotes distribuídos incluem os binários necessários de yt-dlp e FFmpeg; o usuário final não precisa instalá-los separadamente.

## Desenvolvimento

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Para atualizar o binário fornecido pelo pacote `yt-dlp-exec`:

```bash
npm run update:yt-dlp
```

## Build e distribuição

Scripts disponíveis:

- `npm run build:unpack`: pacote local sem instalador;
- `npm run build:win`: instalador NSIS para Windows;
- `npm run build:mac`: pacote macOS/DMG;
- `npm run build:linux`: AppImage, Snap e DEB.

O build Windows é o alvo validado com maior frequência neste ambiente. Os targets macOS e Linux exigem validação nas respectivas plataformas e pipelines de distribuição. O instalador assistido do Windows e o DMG usam os Termos de Uso disponíveis em `build/eula_pt_BR.txt`.

## Estrutura

```text
src/
├── main/
│   ├── providers/       # contratos, resolver e YtDlpProvider
│   ├── processors/      # pós-processamento de áudio/MP3
│   ├── services/storage # filename, colisão e movimentação
│   ├── pipeline.ts      # orquestração
│   └── index.ts         # Electron, segurança e IPC
├── preload/             # window.api
├── renderer/            # interface React componentizada, schemas, types e histórico
└── shared/              # contratos, schemas e progresso
```

## Testes

```bash
npm test
```

A suíte usa Vitest e não acessa YouTube nem executa downloads reais. Ela cobre resolver/provider, parser orientado a linhas, interrupção da árvore de processos, schemas IPC, validação de diretórios, filenames, colisões, movimento `EXDEV`, workspace, pipeline, histórico, progresso e metadata ID3.

## Privacidade

O RoveTrack não possui backend próprio. Processamento, preferências e histórico ocorrem localmente no dispositivo. O histórico pode conter URLs, nomes e paths escolhidos pelo usuário e fica no perfil local do aplicativo.

O provider acessa a fonte indicada para obter a mídia; ferramentas de terceiros podem realizar as comunicações necessárias ao funcionamento delas.

## Uso responsável

Utilize o RoveTrack apenas quando possuir autorização ou base legal para acessar, baixar, converter e usar o conteúdo. Respeite direitos autorais, legislação aplicável e termos dos serviços acessados.

Leia os [Termos de Uso](TERMS_OF_USE.md) antes de instalar ou utilizar o aplicativo.

## Dependências principais

- **Electron:** aplicação desktop e APIs nativas;
- **React:** interface;
- **yt-dlp / yt-dlp-exec:** aquisição atual de mídia do YouTube;
- **FFmpeg:** extração e conversão de áudio;
- **Sharp:** processamento da capa;
- **node-id3:** tags e arte incorporada no MP3;
- **Zod:** validação runtime;
- **Vitest:** testes automatizados.

## Possibilidades futuras

Sem compromisso de prazo, a arquitetura permite avaliar providers adicionais e outros tipos e formatos de mídia. Essas funcionalidades não fazem parte da versão atual.
