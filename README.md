# RoveTrack

RoveTrack é um aplicativo desktop para obter, processar e organizar mídia localmente. Esta versão produz áudio MP3 e vídeo MP4 a partir de fontes HTTPS autorizadas pelo usuário e atendidas pelo provider atual.

## Status

O projeto está em beta, versão `0.2.0-beta`. Comportamentos e contratos internos ainda podem evoluir.

## O que o RoveTrack faz

O fluxo atual é:

```text
URL HTTPS
  → política de sites permitidos
  → provider compatível
  → áudio MP3 ou vídeo MP4
  → metadata e thumbnail configurável
  → arquivos organizados no destino escolhido
```

Autorizar um domínio não garante que o provider consiga processá-lo. A política responde se o usuário permite a tentativa; o `ProviderResolver` decide separadamente se existe implementação compatível.

## Recursos atuais

- vídeos individuais e playlists;
- presets built-in Música (MP3, com capa) e Vídeo (MP4, sem thumbnail por padrão), com override por execução;
- título, artista e álbum em tags ID3, com capa opcional;
- vídeo MP4 com merge de áudio/vídeo pelo yt-dlp/FFmpeg;
- thumbnail configurável em 1:1 ou 16:9, JPG, PNG ou WebP;
- sites permitidos built-in e customizados, habilitáveis individualmente;
- backup JSON seletivo de configurações, histórico ou tudo;
- navegação interna por rotas, sem recarregar a janela;
- progresso do download e do processamento;
- interrupção confirmada, encerramento da árvore do processo e limpeza dos temporários;
- relatório de sucesso, falha parcial, interrupção ou erro;
- histórico local acessível pelo modal rápido e por uma página completa, com retry fiel;
- notificações sonoras e nativas;
- prevenção de sobrescrita por nomes repetidos.
- atualização manual do RoveTrack por GitHub Releases e atualização independente opcional do yt-dlp.

## Sistema de atualizações

O updater mantém duas responsabilidades separadas:

- **Application Update:** `electron-updater` consulta as releases públicas de `joaoapassos/rovetrack`. O download só começa por ação do usuário e a instalação exige uma segunda ação explícita. O aplicativo nunca reinicia durante um download/processamento de mídia.
- **Component Update:** o RoveTrack consulta somente releases oficiais do yt-dlp. O binário independente fica em `<userData>/components/yt-dlp`; a cópia empacotada nunca é sobrescrita e permanece como fallback.

Configurações oferece três políticas para o yt-dlp:

- **Gerenciado pelo RoveTrack (padrão):** usa sempre a versão incluída e testada com a release instalada. Não faz consultas independentes do yt-dlp.
- **Stable:** consulta o canal stable oficial com cooldown de 24 horas e deixa a instalação a cargo do usuário.
- **Avançado:** permite escolher `stable`, `nightly` ou `master`, além de controlar verificação, notificação e instalação automática. A instalação automática vem desligada por padrão.

Antes de ativar um componente independente, o Main seleciona um asset conhecido para a plataforma/arquitetura, restringe origem e redirects a HTTPS/hosts oficiais, limita o tamanho, compara o SHA-256 com `SHA2-256SUMS` e executa `yt-dlp --version` com timeout. O candidato só então é movido para o diretório versionado e ativado.

O estado operacional preserva a origem e a versão anteriores. Assim, a interface pode fazer rollback offline para a versão managed anterior ou restaurar a versão bundled. Downloads incompletos, checksum inválido ou falha no health check não alteram a versão ativa. Trocas de componente e instalação do aplicativo são bloqueadas enquanto há mídia em processamento.

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
UrlAccessPolicy
  ↓
DownloadProvider
  ↓
ProcessorResolver / Media Processor
  ↓
Output Storage
```

- **Renderer:** formulário, apresentação de progresso, relatórios, preferências e histórico.
- **Preload:** expõe apenas operações específicas do RoveTrack; não oferece IPC genérico.
- **Main/IPC:** valida requisições em runtime e controla recursos nativos.
- **Pipeline:** cria a execução e o workspace, resolve um provider e um processor, coordena armazenamento, relatório e cleanup.
- **Provider:** isola a aquisição e normaliza os artefatos produzidos pela ferramenta externa.
- **Processor:** aplica o pós-processamento específico da mídia.
- **Storage:** define filename, trata colisões e move o resultado com fallback entre volumes.

## Providers

`DownloadProvider` é a fronteira entre o domínio do RoveTrack e a ferramenta responsável por adquirir o conteúdo. Um `ProviderResolver` seleciona o primeiro provider registrado que declare suporte à requisição.

A implementação real atual é `YtDlpProvider`, com áudio MP3 e vídeo MP4. A origem precisa ser aprovada antes por `UrlAccessPolicy`; domínios customizados autorizam uma tentativa, não afirmam suporte do yt-dlp. Não existe fallback automático entre providers.

## Processamento de mídia

Aquisição e pós-processamento são responsabilidades separadas. `ProcessorResolver` escolhe `AudioMp3Processor` ou `VideoMp4Processor`. O áudio recebe metadata textual mesmo sem capa; thumbnails de vídeo habilitadas são armazenadas ao lado do MP4 com nome `.thumbnail` e proteção contra colisões.

## Navegação

O renderer usa `HashRouter`, compatível com o `index.html` carregado diretamente pelo Electron empacotado:

```text
/                  → Download
/config     → Configurações
/history    → Histórico
/about      → Sobre
/terms      → Termos de Uso
```

Um único menu expansível reúne todas as páginas. As antigas rotas `/options/*` são redirecionadas para os novos endereços e rotas desconhecidas retornam a `/`. O histórico é exibido somente como página completa.

## Política de domínios

Uma URL precisa:

1. usar HTTPS;
2. pertencer a um domínio habilitado nas configurações;
3. possuir um provider capaz de processar a combinação solicitada.

Hostnames são normalizados com as APIs de URL/IDNA. Um domínio permitido aceita seus subdomínios reais, mas não nomes parecidos como `youtube.com.attacker.com`. Hosts locais e redes privadas são rejeitados ao cadastrar domínios customizados.

As regras de sites possuem CRUD completo e aceitam vários domínios normalizados. Quando existe ao menos um domínio habilitado, a origem precisa corresponder à lista. Quando não existe nenhum, o RoveTrack aceita qualquer URL HTTPS pública que passe pelas verificações de segurança; endereços locais, redes privadas, credenciais, portas e protocolos inseguros continuam bloqueados.

## Formatos de saída

Os presets podem ser criados, editados, duplicados e excluídos. Os formatos disponíveis seguem as conversões documentadas pelo yt-dlp/FFmpeg:

- áudio: MP3, M4A, Opus, FLAC, WAV, AAC, Vorbis e ALAC;
- vídeo: MP4, WebM, MKV, MOV e AVI.

AAC e ALAC utilizam contêiner M4A, enquanto Vorbis utiliza contêiner OGG. A thumbnail de vídeo permanece como arquivo separado; para áudio, o processamento de capa segue o suporte do formato selecionado.

## Configurações e backup

As configurações possuem schema Zod versionado e defaults centralizados. O backup usa JSON versionado, diálogos nativos e seleção de configurações, histórico ou ambos. Arquivos importados têm limite de 5 MB e são integralmente validados antes da aplicação; configurações são substituídas e histórico é mesclado por `id`.

## Segurança

- `contextIsolation`, sandbox e renderer sem integração Node;
- API de preload explícita e limitada;
- payloads IPC validados em runtime;
- URLs limitadas a HTTPS e verificadas pela allowlist no renderer e novamente no Main antes do provider;
- navegação inesperada bloqueada;
- abertura externa restrita a HTTPS;
- uma única execução ativa por vez.
- canais, componentes, hosts, assets e payloads do updater restritos por enums/allowlists no Main;
- componentes independentes verificados por SHA-256 e health check antes da ativação atômica;
- nenhum token GitHub é armazenado ou distribuído pelo aplicativo.

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

### Publicar uma release atualizável

1. Atualize a versão SemVer no `package.json` (por exemplo, `0.3.0-beta.1`).
2. Se desejar mudar a versão bundled do yt-dlp, execute `npm run update:yt-dlp` e valide a combinação antes da release.
3. Execute `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.
4. Gere os pacotes da plataforma com os scripts de build correspondentes.
5. Publique no GitHub Release o instalador/pacote e **todos os metadados gerados pelo electron-builder**, como `latest.yml`, `latest-mac.yml`, `latest-linux.yml` e arquivos `.blockmap` aplicáveis.

O provider GitHub está configurado no `electron-builder.yml`. Um `GH_TOKEN`/`GITHUB_TOKEN`, quando necessário para publicar, deve existir somente no ambiente de desenvolvimento ou CI; usuários não precisam de token para consultar releases públicas. Os scripts locais não publicam por conta própria.

Auto-update de produção exige a infraestrutura de assinatura adequada. Windows/NSIS deve ser validado com code signing antes da distribuição ampla. macOS ainda precisa de assinatura e notarização; não é considerado pronto para auto-update em produção. No Linux, o fluxo automático é adequado principalmente ao AppImage e deve ser validado na distribuição alvo; DEB e Snap podem seguir os respectivos gerenciadores de pacotes.

## Estrutura

```text
src/
├── main/
│   ├── providers/       # contratos, resolver e YtDlpProvider
│   ├── processors/      # resolver e pós-processamento de áudio/vídeo
│   ├── services/storage # filename, colisão e movimentação
│   ├── pipeline.ts      # orquestração
│   ├── updates/         # application updater, component manager, resolver e fontes oficiais
│   └── index.ts         # Electron, segurança e IPC
├── preload/             # window.api
├── renderer/            # rotas, páginas, configurações, interface e histórico
└── shared/              # contratos, settings, catálogo, política e progresso
```

## Testes

```bash
npm test
```

A suíte usa Vitest e não acessa fontes externas nem executa downloads reais. Ela cobre política de URL/IDNA, settings, presets, backup, providers, áudio/vídeo, processors, IPC, pipeline, histórico/migrations, storage, progresso e metadata ID3.

## Privacidade

O RoveTrack não possui backend próprio. Processamento, preferências e histórico ocorrem localmente no dispositivo. O histórico pode conter URLs, nomes e paths escolhidos pelo usuário e fica no perfil local do aplicativo.

O provider acessa a fonte indicada para obter a mídia; ferramentas de terceiros podem realizar as comunicações necessárias ao funcionamento delas.

## Uso responsável

Utilize o RoveTrack apenas quando possuir autorização ou base legal para acessar, baixar, converter e usar o conteúdo. Respeite direitos autorais, legislação aplicável e termos dos serviços acessados.

Leia os [Termos de Uso](TERMS_OF_USE.md) antes de instalar ou utilizar o aplicativo.

## Dependências principais

- **Electron:** aplicação desktop e APIs nativas;
- **React / React Router:** interface e navegação por hash;
- **yt-dlp / yt-dlp-exec:** aquisição atual de mídia do YouTube;
- **FFmpeg:** extração e conversão de áudio;
- **Sharp:** processamento da capa;
- **node-id3:** tags e arte incorporada no MP3;
- **Zod:** validação runtime;
- **Vitest:** testes automatizados.

## Possibilidades futuras

Sem compromisso de prazo, a arquitetura permite registrar novos providers, processors, presets, páginas e formatos sem reescrever o pipeline ou a persistência do histórico. Prioridade/fallback de providers, plugins, autenticação e fila não fazem parte desta versão.
