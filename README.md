# Agenda SA — frontend

React, Vite e Tailwind existentes, com Google OIDC gerenciado pelo backend e sessão HTTP.

Consulte o [guia de execução e Google Cloud](../agendamentos-sa-docs/api/INTEGRACAO-OAUTH.md), a [matriz de conformidade](../agendamentos-sa-docs/api/CONFORMIDADE.md) e o [OpenAPI](../agendamentos-sa-docs/api/openapi.yaml).

Copie `.env.example` para `.env.local`, configure `VITE_API_BASE_URL` (origem do backend, sem `/api/v1`) e mantenha `VITE_USE_MOCK=false` para a integração real. Execute `npm ci` e `npm run dev`; build com `npm run build`. Testes unitários: `npm test`; navegador: `npm run test:e2e` (Chromium ou `PLAYWRIGHT_CHANNEL=msedge`).

Somente `VITE_USE_MOCK=true` ativa a demonstração, em memória e sem Google. Recarregar reinicia os dados simulados. Nenhuma falha da API real ativa mocks automaticamente.

Cadastro completo dos três perfis e edição própria de contatos: [contrato 1.5.0](../agendamentos-sa-docs/api/DADOS-PESSOAIS.md). As chaves criptográficas pertencem somente ao backend; nenhuma variável VITE contém chave.
