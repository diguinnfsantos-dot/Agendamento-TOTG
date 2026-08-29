import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Users table (supporting both Firebase Auth and local login)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID or system user ID
  email: text('email').notNull().unique(),
  senha: text('senha'), // Senha alfanumérica de 6 caracteres
  nome: text('nome').notNull(),
  telefone: text('telefone'), // Telefone celular do operador (WhatsApp)
  role: text('role').notNull().default('OPERATOR'), // 'ADMIN' | 'OPERATOR'
  postoId: text('posto_id'),
  origem: text('origem'),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'PENDING' | 'BLOCKED'
  criadoEm: text('criado_em').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Postos table
export const postos = pgTable('postos', {
  id: serial('id').primaryKey(),
  postoId: text('posto_id').notNull().unique(), // e.g. 'P01'
  codigo: text('codigo').notNull(),
  origem: text('origem').notNull(),
  cidade: text('cidade').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Slots table (vagas de agenda)
export const slots = pgTable('slots', {
  id: serial('id').primaryKey(),
  slotId: text('slot_id').notNull().unique(),
  data: text('data').notNull(), // YYYY-MM-DD
  horario: text('horario').notNull(), // HH:MM
  especialidade: text('especialidade').notNull(),
  medico: text('medico').notNull(),
  sala: text('sala'),
  vagasTotais: integer('vagas_totais').notNull().default(1),
  vagasOcupadas: integer('vagas_ocupadas').notNull().default(0),
  postoRestritoId: text('posto_restrito_id'),
  ativo: boolean('ativo').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Appointments table (agendamentos)
export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  appointmentId: text('appointment_id').notNull().unique(),
  slotId: text('slot_id').notNull(),
  pacienteNome: text('paciente_nome').notNull(),
  pacienteCpf: text('paciente_cpf').notNull(),
  pacienteSus: text('paciente_sus'),
  pacienteTelefone: text('paciente_telefone').notNull(),
  pacienteDataNasc: text('paciente_data_nasc'),
  postoId: text('posto_id').notNull(),
  origem: text('origem').notNull(),
  operadorId: text('operador_id').notNull(),
  operadorNome: text('operador_nome').notNull(),
  operadorTelefone: text('operador_telefone'),
  protocolo: text('protocolo').notNull(),
  data: text('data').notNull(),
  horario: text('horario').notNull(),
  especialidade: text('especialidade').notNull(),
  medico: text('medico').notNull(),
  sala: text('sala'),
  observacoes: text('observacoes'),
  status: text('status').notNull().default('CONFIRMED'), // 'CONFIRMED' | 'CANCELLED' | 'ATTENDED'
  criadoEm: text('criado_em').notNull(),
  googleDriveFileId: text('google_drive_file_id'),
  googleSheetsRowIndex: integer('google_sheets_row_index'),
  createdAt: timestamp('created_at').defaultNow(),
});

// System Rules table
export const systemRules = pgTable('system_rules', {
  id: serial('id').primaryKey(),
  nomeClinica: text('nome_clinica').notNull(),
  telefoneClinica: text('telefone_clinica').notNull(),
  enderecoClinica: text('endereco_clinica').notNull(),
  maxVagasPorId: integer('max_vagas_por_id').notNull().default(5),
  mensagemPadraoWhatsApp: text('mensagem_padrao_whats_app').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Audit Logs table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  logId: text('log_id').notNull().unique(),
  timestamp: text('timestamp').notNull(),
  usuarioNome: text('usuario_nome').notNull(),
  usuarioEmail: text('usuario_email').notNull(),
  acao: text('acao').notNull(),
  detalhes: text('detalhes').notNull(),
  tipo: text('tipo').notNull().default('INFO'), // 'INFO' | 'AVISO' | 'SUCESSO' | 'ERRO'
  createdAt: timestamp('created_at').defaultNow(),
});

// Google Workspace Sync Logs
export const workspaceSyncs = pgTable('workspace_syncs', {
  id: serial('id').primaryKey(),
  service: text('service').notNull(), // 'DRIVE' | 'SHEETS'
  resourceId: text('resource_id').notNull(), // fileId or spreadsheetId
  resourceName: text('resource_name').notNull(),
  action: text('action').notNull(), // 'EXPORT' | 'IMPORT' | 'BACKUP'
  itemCount: integer('item_count').default(0),
  syncedBy: text('synced_by').notNull(),
  syncedAt: text('synced_at').notNull(),
  status: text('status').notNull().default('SUCCESS'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});
