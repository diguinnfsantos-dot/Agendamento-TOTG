# Sistema Integrado de Agendamento V2

## Objetivo
A V2 usa PostgreSQL como **única fonte de verdade** para agendas e agendamentos. `localStorage` serve apenas como cache de interface.

## Correção principal
O endpoint `POST /api/v2/appointments/reserve` abre uma transação PostgreSQL, bloqueia a linha da vaga com `FOR UPDATE`, verifica a capacidade e insere o agendamento antes de atualizar `vagas_ocupadas`. Dois operadores que tentarem a mesma vaga simultaneamente não conseguem criar dois agendamentos além da capacidade.

## Publicação
1. Criar um PostgreSQL persistente.
2. Configurar `SQL_HOST`, `SQL_PORT`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` no ambiente do backend/Cloud Run.
3. Executar o schema/migrações do projeto.
4. Publicar o frontend no Netlify (ou outro host) apontando `/api/*` para o backend.
5. Configurar `APP_URL` e demais segredos no backend.

## Regra de segurança
Não use `replace-all` para operações normais de agenda/agendamento. Esses endpoints antigos foram mantidos apenas por compatibilidade/migração; o fluxo V2 de reserva não os utiliza.

## Teste obrigatório
Abrir dois navegadores/computadores, selecionar a mesma vaga e confirmar simultaneamente. Um deve receber confirmação e o outro HTTP 409/SLOT_TAKEN.
