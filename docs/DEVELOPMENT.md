# Desenvolvimento

## Requisitos

- Node.js compatível com as dependências do projeto;
- npm;
- sistema operacional suportado pelo Electron.

O Windows é o alvo validado com maior frequência. Builds e integrações nativas de macOS e Linux devem ser testados nas respectivas plataformas.

## Preparação

```bash
npm install
npm run dev
```

O modo de desenvolvimento inicia o Electron por meio do electron-vite e recarrega a interface durante as alterações.

## Verificações

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

- `typecheck` verifica os projetos Node/Electron e web;
- `lint` executa as regras do Biome em `src`;
- `test` executa a suíte Vitest;
- `build` verifica os tipos e gera os bundles do Electron.

Os testes são unitários e não realizam downloads reais. Mudanças de contrato, validação, pipeline ou persistência devem incluir ou atualizar os testes correspondentes.

## Builds locais

```bash
npm run build:unpack
npm run build:win
npm run build:mac
npm run build:linux
```

- `build:unpack` gera um pacote sem instalador;
- `build:win` gera o instalador NSIS;
- `build:mac` gera os artefatos de macOS/DMG;
- `build:linux` gera AppImage, Snap e DEB.

Assinatura, notarização e publicação exigem configuração própria da plataforma e não devem ser presumidas apenas porque o build local foi concluído.

## Atualizando o yt-dlp empacotado

```bash
npm run update:yt-dlp
```

Esse comando atualiza o binário fornecido por `yt-dlp-exec`. A nova combinação deve passar por testes antes de ser incluída em uma release.

## Preparando uma release

1. Atualize a versão SemVer em `package.json`.
2. Execute typecheck, lint, testes e build.
3. Gere os pacotes na plataforma correspondente.
4. Publique os artefatos e os metadados gerados pelo electron-builder, incluindo arquivos `latest*.yml` e `.blockmap` aplicáveis.

Tokens de publicação devem existir apenas no ambiente de desenvolvimento ou CI. Eles não fazem parte do aplicativo distribuído.

## Orientações para contribuições

- mantenha a separação entre renderer, preload, main e shared;
- nunca confie apenas na validação da interface para operações privilegiadas;
- preserve contratos pequenos e explícitos em `window.api`;
- não sobrescreva arquivos do usuário;
- mantenha limpeza e interrupção do pipeline seguras;
- atualize a documentação quando uma funcionalidade pública mudar.

Contribuições intencionalmente enviadas ao projeto são licenciadas nos termos da Apache License 2.0, conforme a seção 5 da licença.
