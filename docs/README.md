# Documentação do Rovetrack

Esta pasta apresenta a base técnica do projeto sem exigir conhecimento prévio de toda a implementação.

## Por onde começar

1. Leia o [README principal](../README.md) para conhecer o produto e seus recursos.
2. Consulte [Arquitetura](ARCHITECTURE.md) para entender os processos do Electron e o pipeline de mídia.
3. Use [Desenvolvimento](DEVELOPMENT.md) para configurar o ambiente, validar mudanças e gerar builds.

## Mapa rápido do repositório

```text
src/
├── main/       processo principal, pipeline e integrações nativas
├── preload/    ponte segura entre interface e processo principal
├── renderer/   interface React, páginas, estado e configurações
└── shared/     contratos e regras compartilhados

build/          ícones e recursos dos instaladores
resources/      recursos incluídos no aplicativo
docs/           documentação do projeto
```

## Documentos legais

- [Termos de Uso](../TERMS_OF_USE.md): responsabilidades ao usar o aplicativo e processar conteúdo.
- [Apache License 2.0](../LICENSE): permissões e condições para usar, modificar e distribuir o código.

A documentação acompanha a versão em desenvolvimento. Como o projeto está em beta, nomes internos e fluxos podem mudar.
