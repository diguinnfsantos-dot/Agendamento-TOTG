# Publicação da V2 — roteiro seguro

## Arquitetura recomendada
Publique frontend + Express no **mesmo serviço Cloud Run**. Assim o navegador usa um único domínio e `/api/*` chega ao mesmo backend. O PostgreSQL deve ser persistente e externo ao container.

## 1. Banco
- Crie/aponte um PostgreSQL persistente.
- Rode `migrations/001_v2_central_booking.sql`.
- Configure as variáveis `SQL_*` no Cloud Run.

## 2. Backend
- Build: `npm run build`
- Start: `node dist/server.cjs`
- Cloud Run injeta `PORT`; o Express deve escutar esse valor.

## 3. Secrets
Nunca coloque `SQL_PASSWORD`, `GEMINI_API_KEY`, `AUTH_SECRET` ou credenciais de banco no código ou no frontend. Use variáveis de ambiente/Secret Manager.

## 4. Health check
Depois de publicar, abra `/api/v2/health`. O resultado esperado contém `ok: true` e `database: postgresql`.

## 5. Teste de concorrência
Abra dois computadores/navegadores, selecione exatamente a mesma vaga e confirme ao mesmo tempo. O banco deve aceitar somente a quantidade definida em `vagas_totais`; para uma vaga normal (`1`), o segundo recebe `409 SLOT_TAKEN`.

## 6. Importante
Não use os endpoints antigos `replace-all` para operação normal. A V2 reserva/cancela por transação. Os endpoints antigos ficam apenas como compatibilidade e devem ser desativados/removidos antes de produção definitiva.
