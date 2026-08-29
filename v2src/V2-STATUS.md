# V2 — status da reconstrução

- [x] PostgreSQL permanece como backend central
- [x] Endpoint de reserva atômica com transação e row lock
- [x] Cliente não usa replace-all para reservar vagas
- [x] localStorage de slots/agendamentos reduzido a cache de UI
- [x] App reconsulta banco após sucesso/falha de reserva
- [x] Resposta de conflito 409 para vaga ocupada
- [x] Health check `/api/v2/health`
- [x] Variáveis de ambiente documentadas
- [ ] Migrar todos os demais cadastros (postos, usuários, pacientes, regras) para mutations somente no servidor
- [ ] Executar migração do banco em ambiente de produção
- [ ] Configurar domínio/Cloud Run/Netlify e realizar teste multi-computador
