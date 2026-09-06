# Rovetrack

> Baixe, converta e organize áudio e vídeo em um aplicativo desktop simples, local e open source.

O Rovetrack reúne aquisição, conversão e organização de mídia em uma única interface. Você informa uma URL HTTPS permitida, escolhe um preset e uma pasta de destino; o aplicativo cuida do download, do processamento e do nome final do arquivo.

O projeto está em beta (`0.3.1-beta`). Mudanças de comportamento e de contratos internos ainda podem acontecer.

## Principais recursos

- áudio e vídeo individuais ou em playlists;
- presets editáveis para diferentes formatos e níveis de qualidade;
- áudio em MP3, M4A, Opus, FLAC, WAV, AAC, Vorbis e ALAC;
- vídeo em MP4, WebM, MKV, MOV e AVI;
- metadados, capa incorporada em áudio e thumbnail opcional para vídeo;
- progresso em tempo real, interrupção segura e relatório por item;
- histórico local com repetição de downloads;
- controle de sites permitidos;
- backup e restauração de configurações e histórico;
- notificações sonoras e nativas;
- atualização do aplicativo e gerenciamento opcional do yt-dlp.

Todo o histórico e todas as preferências ficam no dispositivo. O Rovetrack não possui backend próprio, embora acesse a origem informada e os serviços necessários para buscar mídia e atualizações.

## Como funciona

```text
URL HTTPS
  → validação da origem
  → aquisição com um provider (atualmente yt-dlp)
  → processamento de áudio ou vídeo
  → armazenamento na pasta escolhida
  → histórico e relatório local
```

O Rovetrack separa a interface React dos recursos nativos do Electron. A comunicação acontece por uma API limitada no preload, e o processo principal valida os dados antes de iniciar o pipeline. Veja a [visão geral da arquitetura](docs/ARCHITECTURE.md) para entender o fluxo.

## Desenvolvimento local

Você precisa de Node.js, npm e um sistema operacional suportado pelo Electron.

```bash
npm install
npm run dev
```

Antes de enviar uma alteração, execute:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Os binários necessários do yt-dlp e do FFmpeg são incluídos nos pacotes distribuídos. Mais comandos e detalhes estão no [guia de desenvolvimento](docs/DEVELOPMENT.md).

## Documentação

- [Visão geral da documentação](docs/README.md)
- [Arquitetura e fluxo de dados](docs/ARCHITECTURE.md)
- [Desenvolvimento, testes e build](docs/DEVELOPMENT.md)
- [Termos de Uso](TERMS_OF_USE.md)
- [Licença Apache 2.0](LICENSE)

## Uso responsável

Use o Rovetrack somente quando você possuir autorização ou outra base legal para acessar, baixar, converter e utilizar o conteúdo. A ferramenta não concede direitos sobre conteúdos de terceiros e não contorna DRM, paywalls ou controles de acesso.

Os [Termos de Uso](TERMS_OF_USE.md) tratam do uso do aplicativo e de conteúdo de terceiros. A [Licença Apache 2.0](LICENSE) trata do uso, estudo, modificação e distribuição do código-fonte do Rovetrack.

## Contribuindo

Issues, correções e melhorias são bem-vindas. Antes de propor uma mudança grande, abra uma discussão ou issue para alinhar a solução. Ao contribuir, mantenha as validações de segurança, adicione testes quando o comportamento mudar e confirme que os comandos de qualidade continuam passando.

## Licença

Copyright 2026 João Alves Passos.

O Rovetrack é distribuído sob a [Apache License 2.0](LICENSE). Dependências e ferramentas de terceiros permanecem sujeitas às próprias licenças.
