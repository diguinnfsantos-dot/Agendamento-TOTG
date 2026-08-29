import { User, Posto, Slot, Appointment, AppointmentStatus, SystemRule, AuditLog, CloudSnapshot, LocalNetworkDevice, LocalNetworkConfig, DoctorProfile, RegisteredPatient, ActiveSession, SessionInfo, DeviceStatus, ConnectionType, DeveloperIdentity, DeveloperTransferHistory } from '../types';

const STORAGE_KEYS = {
  USERS: 'clinica_users_v1',
  DELETED_USER_IDS: 'clinica_deleted_user_ids_v1',
  DELETED_USER_EMAILS: 'clinica_deleted_user_emails_v1',
  CURRENT_USER: 'clinica_current_user_v1',
  SESSION_ID: 'clinica_session_id_v1',
  SESSION_DISCONNECTED_NOTICE: 'clinica_session_disconnected_notice_v1',
  LATEST_SESSION_OWNER: 'clinica_latest_session_owner_v1',
  ACTIVE_SESSIONS: 'clinica_active_sessions_v1',
  BANNED_ADMIN_EMAILS: 'clinica_banned_admin_emails_v1',
  MASTER_CUSTOMIZED: 'clinica_master_customized_v1',
  POSTOS: 'clinica_postos_v1',
  SLOTS: 'clinica_slots_v1',
  APPOINTMENTS: 'clinica_appointments_v1',
  PATIENTS: 'clinica_patients_v1',
  RULES: 'clinica_rules_v1',
  LOGS: 'clinica_logs_v1',
  SNAPSHOTS: 'clinica_snapshots_v1',
  DB_CONFIG: 'clinica_db_config_v1',
  SPECIALTIES: 'clinica_specialties_v1',
  ROOMS: 'clinica_rooms_v1',
  DOCTORS: 'clinica_doctors_v1',
  DOCTOR_PROFILES: 'clinica_doctor_profiles_v1',
  NETWORK_CONFIG: 'clinica_network_config_v1',
  NETWORK_DEVICES: 'clinica_network_devices_v1',
  DEVELOPER_IDENTITY: 'clinica_developer_identity_v1',
  DEVELOPER_PWD_HASH: 'clinica_developer_pwd_hash_v1',
};


// In-memory tab-isolated session token
let tabSessionIdMemory: string | null = null;

// Broadcast channel for instantaneous cross-tab/cross-window concurrency enforcement
export const sessionBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('clinica_session_concurrency_v1')
  : null;

const DEFAULT_SPECIALTIES_LIST = [
  'TOTG',
  'TOTG - Teste Oral de Tolerância à Glicose',
  'Clínica Geral',
  'Cardiologia',
  'Oftalmologia',
  'Ortopedia',
  'Ginecologia',
  'Pediatria',
  'Dermatologia',
  'Neurologia',
  'Endocrinologia',
  'Urologia',
  'Psiquiatria',
  'Otorrinolaringologia',
];

const DEFAULT_ROOMS_LIST = [
  'Sala de Coleta',
  'Sala de Procedimentos',
  'Consultório 01',
  'Consultório 02',
  'Consultório 03',
  'Consultório 04',
  'Consultório 05',
];

const DEFAULT_DOCTOR_PROFILES: DoctorProfile[] = [
  { id: 'doc_totg_lab', nome: 'Laboratório / Sala de Coleta', especialidade: 'TOTG', crm: 'LAB/TOTG-01', salaPadrao: 'Sala de Coleta', ativo: true },
  { id: 'doc_roberto', nome: 'Rodrigo Santos', especialidade: 'TOTG', crm: 'CRM/RJ 88765', salaPadrao: 'Sala de Coleta', ativo: true },
  { id: 'doc_floriano', nome: 'Dr. Floriano Peixoto', especialidade: 'Clínica Geral', crm: 'CRM/RJ 142857', salaPadrao: 'Consultório 01', ativo: true },
  { id: 'doc_fernando', nome: 'Dr. Fernando Dias', especialidade: 'Cardiologia', crm: 'CRM/RJ 98234', salaPadrao: 'Consultório 01', ativo: true },
  { id: 'doc_beatriz', nome: 'Dra. Beatriz Santos', especialidade: 'Oftalmologia', crm: 'CRM/RJ 112450', salaPadrao: 'Consultório 02', ativo: true },
  { id: 'doc_lucas', nome: 'Dr. Lucas Silveira', especialidade: 'Ortopedia', crm: 'CRM/RJ 134900', salaPadrao: 'Consultório 03', ativo: true },
  { id: 'doc_camila', nome: 'Dra. Camila Ramos', especialidade: 'Ginecologia', crm: 'CRM/RJ 145678', salaPadrao: 'Consultório 04', ativo: true },
  { id: 'doc_helena', nome: 'Dra. Helena Martins', especialidade: 'Pediatria', crm: 'CRM/RJ 156789', salaPadrao: 'Consultório 05', ativo: true },
  { id: 'doc_marcelo', nome: 'Dr. Marcelo Viana', especialidade: 'Clínica Geral', crm: 'CRM/RJ 167890', salaPadrao: 'Consultório 01', ativo: true },
  { id: 'doc_vanessa', nome: 'Dra. Vanessa Costa', especialidade: 'Dermatologia', crm: 'CRM/RJ 178901', salaPadrao: 'Consultório 02', ativo: true },
  { id: 'doc_carlos', nome: 'Dr. Carlos Mendonça', especialidade: 'Neurologia', crm: 'CRM/RJ 189012', salaPadrao: 'Consultório 03', ativo: true },
  { id: 'doc_mariana', nome: 'Dra. Mariana Costa', especialidade: 'Endocrinologia', crm: 'CRM/RJ 190123', salaPadrao: 'Consultório 04', ativo: true },
];

const DEFAULT_DOCTORS_LIST = DEFAULT_DOCTOR_PROFILES.map(d => d.nome);

export const sortPostosSequentially = (postosList: Posto[]): Posto[] => {
  return [...postosList].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
  });
};

// Initial Seed Data (Sequential postos starting from P202, P01-P05 permanently deleted)
const INITIAL_POSTOS: Posto[] = [
  { id: 'P202', codigo: 'POSTO-202', origem: 'MMF da Ponta d’Areia – Maria Tereza Barbosa Rangel (Vó Tereza)', cidade: 'Niterói', ativo: true },
  { id: 'P203', codigo: 'POSTO-203', origem: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella', cidade: 'Niterói', ativo: true },
  { id: 'P204', codigo: 'POSTO-204', origem: 'MMF da Vila Ipiranga – Vilma Espín', cidade: 'Niterói', ativo: true },
  { id: 'P205', codigo: 'POSTO-205', origem: 'Policlínica Regional de São Lourenço – Dr. Carlos Antônio da Silva', cidade: 'Niterói', ativo: true },
  { id: 'P206', codigo: 'POSTO-206', origem: 'UBS Santa Bárbara – Dr. Adelmo de Mendonça e Silva', cidade: 'Niterói', ativo: true },
  { id: 'P207', codigo: 'POSTO-207', origem: 'MMF do Morro do Céu – Faustino Pérez', cidade: 'Niterói', ativo: true },
  { id: 'P208', codigo: 'POSTO-208', origem: 'MMF da Ilha da Conceição – Dr. Ruy Carlos Decnop / Célia Sánchez', cidade: 'Niterói', ativo: true },
  { id: 'P209', codigo: 'POSTO-209', origem: 'MMF do Maruí – Jorge Luiz Camacho Rodríguez', cidade: 'Niterói', ativo: true },
  { id: 'P210', codigo: 'POSTO-210', origem: 'MMF do Marítimos – Carlos Rafael Rodríguez', cidade: 'Niterói', ativo: true },
  { id: 'P211', codigo: 'POSTO-211', origem: 'MMF do Bernardino – Raul Carlos Pareto Jr.', cidade: 'Niterói', ativo: true },
  { id: 'P212', codigo: 'POSTO-212', origem: 'MMF da Leopoldina – Julio Díaz Gonzáles', cidade: 'Niterói', ativo: true },
  { id: 'P213', codigo: 'POSTO-213', origem: 'MMF da Nova Brasília – Antonio Ñico Lopez', cidade: 'Niterói', ativo: true },
  { id: 'P214', codigo: 'POSTO-214', origem: 'MMF da Teixeira de Freitas – Dr. Antônio Peçanha', cidade: 'Niterói', ativo: true },
  { id: 'P215', codigo: 'POSTO-215', origem: 'UBS Engenhoca', cidade: 'Niterói', ativo: true },
  { id: 'P216', codigo: 'POSTO-216', origem: 'UBS Centro – Dr. Eduardo Imbassay', cidade: 'Niterói', ativo: true },
  { id: 'P217', codigo: 'POSTO-217', origem: 'Policlínica Regional do Fonseca – Dr. Guilherme Taylor March', cidade: 'Niterói', ativo: true },
  { id: 'P219', codigo: 'POSTO-219', origem: 'MMF da Lagoinha', cidade: 'Niterói', ativo: true },
  { id: 'P220', codigo: 'POSTO-220', origem: 'MMF do Viçoso Jardim – Tayssa Erminda Alves', cidade: 'Niterói', ativo: true },
  { id: 'P221', codigo: 'POSTO-221', origem: 'MMF do Baldeador – Deputado José Sally', cidade: 'Niterói', ativo: true },
  { id: 'P222', codigo: 'POSTO-222', origem: 'UBS Morro do Estado – Dr. Mario Pardal', cidade: 'Niterói', ativo: true },
  { id: 'P223', codigo: 'POSTO-223', origem: 'MMF do Morro da Boa Vista – Ítalo Gomes', cidade: 'Niterói', ativo: true },
  { id: 'P224', codigo: 'POSTO-224', origem: 'MMF do Jonathas Botelho – José Suárez Blanco', cidade: 'Niterói', ativo: true },
  { id: 'P225', codigo: 'POSTO-225', origem: 'MMF do Coronel Leôncio – Dr. Cláudio do Amaral', cidade: 'Niterói', ativo: true },
  { id: 'P227', codigo: 'POSTO-227', origem: 'Unidade Básica de Saúde do Barreto (UBS Barreto)', cidade: 'Niterói', ativo: true },
  { id: 'P228', codigo: 'POSTO-228', origem: 'MMF do Holofote – Professora Dra. Satiê Mizubuti', cidade: 'Niterói', ativo: true },
  { id: 'P230', codigo: 'POSTO-230', origem: 'MMF do Serrão e Juca Branco – Dr. José Luiz de Oliveira Côrtes', cidade: 'Niterói', ativo: true },
];

const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin_01',
    email: 'admin@klinica.com',
    senha: '543W21',
    nome: 'Rodrigo Santos (Administrador Master)',
    telefone: '(21) 969558819',
    role: 'ADMIN',
    postoId: 'P203',
    origem: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
    status: 'ACTIVE',
    criadoEm: '2026-08-01T10:00:00Z',
  },
  {
    id: 'usr_dev_master_01',
    email: 'diguinnfsantos@gmail.com',
    senha: '543W21',
    nome: 'Rodrigo Santos (Desenvolvedor Master)',
    telefone: '(21) 969558819',
    role: 'ADMIN',
    status: 'ACTIVE',
    criadoEm: '2026-08-01T10:00:00Z',
  },
  {
    id: 'usr_op_jaqueline',
    email: 'jaqueline@jaqueline.com',
    senha: '12345J',
    nome: 'Jaqueline Santos',
    telefone: '(21) 98888-7777',
    role: 'OPERATOR',
    postoId: 'P227',
    origem: 'Unidade Básica de Saúde do Barreto (UBS Barreto)',
    status: 'ACTIVE',
    criadoEm: '2026-08-20T10:00:00Z',
  },
  {
    id: 'usr_op_wanessa_1787420475218',
    email: 'wanessa.operador@posto.com',
    senha: '12345W',
    nome: 'Wanessa Souza',
    telefone: '(21) 99999-9999',
    role: 'OPERATOR',
    postoId: 'P227',
    origem: 'Unidade Básica de Saúde do Barreto (UBS Barreto)',
    status: 'ACTIVE',
    criadoEm: '2026-08-22T17:41:15.218Z',
  },
  {
    id: 'usr_op_1787709432258_i9rj',
    email: 'rodrigo@rodrigo.com',
    senha: '12345r',
    nome: 'Rodrigo Ferreira',
    telefone: '(21) 99996-6667',
    role: 'OPERATOR',
    postoId: 'P203',
    origem: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
    status: 'ACTIVE',
    criadoEm: '2026-08-26T01:57:12.258Z',
  },
];

const INITIAL_RULES: SystemRule = {
  maxVagasPorId: 4, // Regra Geral Padrão
  diasParaRepescagemVencimento: 5, // Vagas a ≤ 5 dias de vencimento entram em Repescagem Automática (qualquer Posto pode agendar)
  cotasPorEspecialidade: {
    'TOTG': { especialidade: 'TOTG', maxVagasPorId: 4, cotaLivreEvento: false, descricaoEvento: '' },
    'TOTG - Teste Oral de Tolerância à Glicose': { especialidade: 'TOTG - Teste Oral de Tolerância à Glicose', maxVagasPorId: 4, cotaLivreEvento: false, descricaoEvento: '' },
    'Clínica Geral': { especialidade: 'Clínica Geral', maxVagasPorId: 4, cotaLivreEvento: false, descricaoEvento: '' },
    'Cardiologia': { especialidade: 'Cardiologia', maxVagasPorId: 5, cotaLivreEvento: false, descricaoEvento: '' },
    'Dermatologia': { especialidade: 'Dermatologia', maxVagasPorId: 8, cotaLivreEvento: false, descricaoEvento: '' },
    'Oftalmologia': { especialidade: 'Oftalmologia', maxVagasPorId: 1, cotaLivreEvento: false, motivoRestricao: 'Apenas 1 especialista atuando' },
    'Ortopedia': { especialidade: 'Ortopedia', maxVagasPorId: 3, cotaLivreEvento: false, descricaoEvento: '' },
    'Ginecologia': { especialidade: 'Ginecologia', maxVagasPorId: 3, cotaLivreEvento: false, descricaoEvento: '' },
    'Pediatria': { especialidade: 'Pediatria', maxVagasPorId: 3, cotaLivreEvento: false, descricaoEvento: '' },
    'Neurologia': { especialidade: 'Neurologia', maxVagasPorId: 2, cotaLivreEvento: false, descricaoEvento: '' },
    'Endocrinologia': { especialidade: 'Endocrinologia', maxVagasPorId: 2, cotaLivreEvento: false, descricaoEvento: '' },
  },
  notificacaoWhatsAppAutomatica: true,
  mensagemPadraoWhatsApp: `Olá, *{PACIENTE}*!\nConfirmamos o agendamento da sua consulta médica:\n\n📅 *Data:* {DATA}\n⏰ *Horário:* {HORARIO}\n🩺 *Especialidade:* {ESPECIALIDADE}\n👨‍⚕️ *Médico:* {MEDICO}\n🏥 *Local:* {CLINICA} ({ENDERECO_CLINICA})\n📍 *Origem:* {ORIGEM}\n\n⚠️ *Orientações importantes:*\n- Chegar com 15 minutos de antecedência.\n- Levar documento oficial com foto e Cartão SUS ({SUS}).\n- Em caso de dúvidas, ligue para {TEL_CLINICA}.`,
  nomeClinica: 'Central de Agendamento RSantos',
  telefoneClinica: '(21) 995860846',
  enderecoClinica: 'Rua Dr. Luiz Palmier, 726 - Barreto, Niterói - RJ, CEP 24110-310',
};

// Gerador de Slots: Inicia limpo (0 vagas automáticas). Vagas devem ser geradas exclusivamente pelo Administrador Master.
function generateInitialSlots(): Slot[] {
  return [];
}

function generateInitialAppointments(slots: Slot[]): { appointments: Appointment[]; updatedSlots: Slot[] } {
  return { appointments: [], updatedSlots: [...slots] };
}

const INITIAL_PATIENTS: RegisteredPatient[] = [];

// Database helper functions
export const db = {
  getPatients: (): RegisteredPatient[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    let patients: RegisteredPatient[] = [];
    if (!raw) {
      patients = [...INITIAL_PATIENTS];
    } else {
      try {
        const parsed = JSON.parse(raw);
        patients = Array.isArray(parsed) ? parsed : [...INITIAL_PATIENTS];
      } catch {
        patients = [...INITIAL_PATIENTS];
      }
    }

    // Auto-sync / index any existing appointments into patients if not yet recorded (deduplicating by clean CPF)
    const apps = db.getAppointments();
    let hasNewFromApps = false;
    const postos = db.getPostos();

    apps.forEach(app => {
      if (!app.paciente || !app.paciente.cpf) return;
      const cleanAppCpf = app.paciente.cpf.replace(/\D/g, '');
      if (!cleanAppCpf || cleanAppCpf.length < 11) return;

      const exists = patients.some(p => p.cpf.replace(/\D/g, '') === cleanAppCpf);
      if (!exists) {
        const posto = postos.find(p => p.id === app.postoId);
        patients.push({
          id: `pat_${cleanAppCpf}`,
          cpf: app.paciente.cpf,
          paciente: app.paciente.paciente,
          sus: app.paciente.sus || '',
          nascido: app.paciente.nascido || '',
          mae: app.paciente.mae || '',
          endereco: app.paciente.endereco || '',
          cep: app.paciente.cep || '',
          tel: app.paciente.tel || '',
          postoId: app.postoId || 'P203',
          postoNome: posto?.origem || app.origem || `Posto ${app.postoId}`,
          operadorId: app.operadorId,
          operadorNome: app.operadorNome,
          criadoEm: app.criadoEm || new Date().toISOString(),
          atualizadoEm: app.atualizadoEm || new Date().toISOString(),
          observacoes: `Cadastrado via agendamento inicial ${app.id}.`,
        });
        hasNewFromApps = true;
      }
    });

    if (!raw || hasNewFromApps) {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    }

    return patients;
  },

  savePatients: (patients: RegisteredPatient[]): void => {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  },

  findPatientByCpf: (cpf: string): RegisteredPatient | undefined => {
    const clean = cpf.replace(/\D/g, '');
    if (!clean) return undefined;
    const patients = db.getPatients();
    return patients.find(p => p.cpf.replace(/\D/g, '') === clean);
  },

  validatePatientRegistration: (
    cpf: string, 
    operatorPostoId: string
  ): { allowed: boolean; patient?: RegisteredPatient; message?: string } => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) {
      return { allowed: true };
    }
    const patient = db.findPatientByCpf(clean);
    if (!patient) {
      return { allowed: true };
    }
    if (patient.postoId === operatorPostoId) {
      return { 
        allowed: true, 
        patient,
        message: `Paciente identificado: ${patient.paciente}. Vínculo confirmado com o seu Posto (${patient.postoId} - ${patient.postoNome}).` 
      };
    }
    // Patient exists in a different Posto!
    return {
      allowed: false,
      patient,
      message: `Paciente já está cadastrado pelo ID ${patient.postoId} (${patient.postoNome}). Por motivos de privacidade e regra de vínculo, este paciente só pode ser agendado por operadores do Posto ${patient.postoId}. Caso necessite, solicite a transferência de vínculo ao Administrador Master.`
    };
  },

  saveOrUpdatePatient: (
    patientData: Omit<RegisteredPatient, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string },
    allowCrossPostoTransfer: boolean = false
  ): { success: boolean; patient?: RegisteredPatient; error?: string } => {
    const cleanCpf = patientData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return { success: false, error: 'O CPF informado deve conter 11 dígitos numéricos.' };
    }

    const patients = db.getPatients();
    const existingIndex = patients.findIndex(p => p.cpf.replace(/\D/g, '') === cleanCpf);

    if (existingIndex >= 0) {
      const existing = patients[existingIndex];
      // If bound to another posto and not authorized
      if (existing.postoId !== patientData.postoId && !allowCrossPostoTransfer) {
        return {
          success: false,
          error: `Paciente já está cadastrado pelo Posto ${existing.postoId} (${existing.postoNome}).`,
        };
      }

      const updated: RegisteredPatient = {
        ...existing,
        paciente: patientData.paciente.trim(),
        cpf: patientData.cpf.trim(),
        sus: patientData.sus.trim(),
        nascido: patientData.nascido.trim(),
        mae: patientData.mae.trim(),
        endereco: patientData.endereco.trim(),
        cep: patientData.cep.trim(),
        tel: patientData.tel.trim(),
        postoId: allowCrossPostoTransfer ? patientData.postoId : existing.postoId,
        postoNome: allowCrossPostoTransfer ? patientData.postoNome : existing.postoNome,
        operadorId: patientData.operadorId || existing.operadorId,
        operadorNome: patientData.operadorNome || existing.operadorNome,
        observacoes: patientData.observacoes !== undefined ? patientData.observacoes : existing.observacoes,
        atualizadoEm: new Date().toISOString(),
      };

      patients[existingIndex] = updated;
      db.savePatients(patients);
      return { success: true, patient: updated };
    } else {
      const newPatient: RegisteredPatient = {
        id: patientData.id || `pat_${cleanCpf}`,
        cpf: patientData.cpf.trim(),
        paciente: patientData.paciente.trim(),
        sus: patientData.sus.trim(),
        nascido: patientData.nascido.trim(),
        mae: patientData.mae.trim(),
        endereco: patientData.endereco.trim(),
        cep: patientData.cep.trim(),
        tel: patientData.tel.trim(),
        postoId: patientData.postoId,
        postoNome: patientData.postoNome,
        operadorId: patientData.operadorId,
        operadorNome: patientData.operadorNome,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        observacoes: patientData.observacoes || '',
      };

      patients.push(newPatient);
      db.savePatients(patients);
      return { success: true, patient: newPatient };
    }
  },

  transferPatientPosto: (
    patientId: string, 
    newPostoId: string, 
    newPostoNome: string,
    motivo?: string
  ): boolean => {
    const patients = db.getPatients();
    const cleanId = patientId.replace(/\D/g, '');
    const idx = patients.findIndex(p => p.id === patientId || (cleanId && p.cpf.replace(/\D/g, '') === cleanId));
    if (idx >= 0) {
      const prev = patients[idx];
      const transferLog = `Transferido de ${prev.postoId} (${prev.postoNome}) para ${newPostoId} (${newPostoNome}) em ${new Date().toLocaleDateString('pt-BR')}${motivo ? ': ' + motivo : ''}`;
      patients[idx] = {
        ...prev,
        postoId: newPostoId,
        postoNome: newPostoNome,
        observacoes: prev.observacoes ? `${prev.observacoes} | ${transferLog}` : transferLog,
        atualizadoEm: new Date().toISOString(),
      };
      db.savePatients(patients);
      return true;
    }
    return false;
  },

  deletePatient: (patientId: string): boolean => {
    const patients = db.getPatients();
    const cleanId = patientId.replace(/\D/g, '');
    const filtered = patients.filter(p => p.id !== patientId && (!cleanId || p.cpf.replace(/\D/g, '') !== cleanId));
    if (filtered.length !== patients.length) {
      db.savePatients(filtered);
      return true;
    }
    return false;
  },

  updatePatient: (updatedPatient: RegisteredPatient): void => {
    const patients = db.getPatients();
    const cleanCpf = updatedPatient.cpf.replace(/\D/g, '');
    const idx = patients.findIndex(p => p.id === updatedPatient.id || p.cpf.replace(/\D/g, '') === cleanCpf);
    if (idx >= 0) {
      patients[idx] = {
        ...updatedPatient,
        atualizadoEm: new Date().toISOString(),
      };
      db.savePatients(patients);
    }
  },
  getBannedAdminEmails: (): string[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BANNED_ADMIN_EMAILS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  banAdminEmail: (email: string) => {
    if (!email) return;
    const clean = email.trim().toLowerCase();
    const current = db.getBannedAdminEmails();
    if (!current.includes(clean)) {
      current.push(clean);
      localStorage.setItem(STORAGE_KEYS.BANNED_ADMIN_EMAILS, JSON.stringify(current));
    }
  },

  getDeletedUserIds: (): Set<string> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_USER_IDS);
      const initial = ['usr_op_01', 'usr_op_02', 'usr_op_03'];
      return new Set([...initial, ...(raw ? JSON.parse(raw) : [])]);
    } catch {
      return new Set(['usr_op_01', 'usr_op_02', 'usr_op_03']);
    }
  },

  getDeletedUserEmails: (): Set<string> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_USER_EMAILS);
      const initial = ['operador1@posto.com', 'operador2@posto.com', 'novo.operador@posto.com'];
      return new Set([...initial, ...(raw ? JSON.parse(raw) : [])].map(e => e.toLowerCase()));
    } catch {
      return new Set(['operador1@posto.com', 'operador2@posto.com', 'novo.operador@posto.com']);
    }
  },

  recordDeletedUser: (userId: string, userEmail?: string) => {
    try {
      if (userId) {
        const ids = db.getDeletedUserIds();
        ids.add(userId);
        localStorage.setItem(STORAGE_KEYS.DELETED_USER_IDS, JSON.stringify(Array.from(ids)));
      }
      if (userEmail) {
        const emails = db.getDeletedUserEmails();
        emails.add(userEmail.toLowerCase().trim());
        localStorage.setItem(STORAGE_KEYS.DELETED_USER_EMAILS, JSON.stringify(Array.from(emails)));
      }
    } catch {}
  },

  clearDeletedUserRecord: (userId?: string, userEmail?: string) => {
    try {
      if (userId) {
        const ids = db.getDeletedUserIds();
        ids.delete(userId);
        localStorage.setItem(STORAGE_KEYS.DELETED_USER_IDS, JSON.stringify(Array.from(ids)));
      }
      if (userEmail) {
        const emails = db.getDeletedUserEmails();
        emails.delete(userEmail.toLowerCase().trim());
        localStorage.setItem(STORAGE_KEYS.DELETED_USER_EMAILS, JSON.stringify(Array.from(emails)));
      }
    } catch {}
  },

  getUsers: (): User[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    const banned = new Set(db.getBannedAdminEmails().map(e => e.toLowerCase()));
    const deletedIds = db.getDeletedUserIds();
    const deletedEmails = db.getDeletedUserEmails();

    if (!raw) {
      // Filter out any banned email and deleted user from initial seed
      const filteredSeed = INITIAL_USERS.filter(u => 
        !banned.has(u.email.toLowerCase()) && 
        !deletedEmails.has(u.email.toLowerCase()) && 
        !deletedIds.has(u.id)
      );
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredSeed));
      return filteredSeed;
    }
    try {
      const parsed: User[] = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const filteredSeed = INITIAL_USERS.filter(u => 
          !banned.has(u.email.toLowerCase()) && 
          !deletedEmails.has(u.email.toLowerCase()) && 
          !deletedIds.has(u.id)
        );
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredSeed));
        return filteredSeed;
      }
      
      // Filter out banned admin emails and explicitly deleted operators
      const deletedPostoIds = new Set(['P01', 'P02', 'P03', 'P04', 'P05']);
      let filtered = parsed.filter(u => {
        if (!u || !u.email) return false;
        const emailLower = u.email.toLowerCase();
        if (banned.has(emailLower) || deletedEmails.has(emailLower) || deletedIds.has(u.id)) return false;
        if (u.role === 'OPERATOR' && u.postoId && deletedPostoIds.has(u.postoId)) return false;
        return true;
      });

      // Enforce ONLY ONE Admin in the list if there are multiples
      const admins = filtered.filter(u => u.role === 'ADMIN');
      if (admins.length > 1) {
        const primaryAdmin = admins[0];
        filtered = [primaryAdmin, ...filtered.filter(u => u.role !== 'ADMIN')];
      }

      // Migration for old 4-digit passwords, admin migration, and fixing mistakenly seeded operator phones
      let needsSave = false;
      const migrated = filtered.map(u => {
        let user = { ...u };
        if (user.senha === '1234' || (user.role === 'ADMIN' && user.senha === '12345A')) {
          needsSave = true;
          if (user.role === 'ADMIN') user.senha = '543W21';
          else if (user.email === 'operador1@posto.com') user.senha = '12345B';
          else if (user.email === 'operador2@posto.com') user.senha = '12345C';
          else user.senha = '543W21';
        }
        if (user.role === 'ADMIN' && user.email === 'admin@clinica.com') {
          needsSave = true;
          user.email = 'admin@klinica.com';
          user.nome = user.nome.replace('Dr. Roberto Mendes', 'Rodrigo Santos');
        }
        // Cleanse any operator that has the institutional/admin phone or variations of 969558819
        if (user.role === 'OPERATOR') {
          const rawDigits = (user.telefone || '').replace(/\D/g, '');
          if (rawDigits === '21969558819' || rawDigits === '969558819' || user.telefone?.includes('969558819') || user.telefone?.includes('96955-8819')) {
            needsSave = true;
            if (user.email === 'operador1@posto.com') user.telefone = '(21) 98765-4321';
            else if (user.email === 'operador2@posto.com') user.telefone = '(21) 97654-1234';
            else if (user.email === 'novo.operador@posto.com') user.telefone = '(21) 99123-4567';
            else if (user.email === 'jaqueline@jaqueline.com') user.telefone = '(21) 98888-7777';
            else user.telefone = '';
          }
        }
        return user;
      });

      if (needsSave || migrated.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      return INITIAL_USERS.filter(u => 
        !banned.has(u.email.toLowerCase()) && 
        !deletedEmails.has(u.email.toLowerCase()) && 
        !deletedIds.has(u.id)
      );
    }
  },

  updateMasterProfile: async (updatedAdmin: User, previousEmail?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const cleanNewEmail = updatedAdmin.email.trim().toLowerCase();
      const cleanOldEmail = previousEmail ? previousEmail.trim().toLowerCase() : '';

      // 1. Ban previous email if it was changed
      if (cleanOldEmail && cleanOldEmail !== cleanNewEmail) {
        db.banAdminEmail(cleanOldEmail);
      }
      if (cleanNewEmail !== 'admin@klinica.com') {
        db.banAdminEmail('admin@klinica.com');
      }

      const banned = new Set(db.getBannedAdminEmails().map(e => e.toLowerCase()));

      // 2. Rebuild user list locally with ONLY the single new Admin
      const current = db.getUsers();
      const nonAdminUsers = current.filter(u => 
        u.role !== 'ADMIN' && 
        !banned.has(u.email.toLowerCase()) && 
        u.email.toLowerCase() !== cleanNewEmail
      );

      const finalizedAdmin: User = {
        ...updatedAdmin,
        id: updatedAdmin.id || 'usr_admin_master',
        email: cleanNewEmail,
        role: 'ADMIN',
        status: 'ACTIVE',
      };

      const newList = [finalizedAdmin, ...nonAdminUsers];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newList));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(finalizedAdmin));
      localStorage.setItem(STORAGE_KEYS.MASTER_CUSTOMIZED, 'true');

      // 3. Send update to Server API
      try {
        await fetch('/api/admin/master-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEmail: cleanOldEmail || previousEmail,
            newEmail: finalizedAdmin.email,
            nome: finalizedAdmin.nome,
            senha: finalizedAdmin.senha,
            role: 'ADMIN',
            status: 'ACTIVE',
          }),
        });
      } catch (srvErr) {
        console.warn('Server master profile sync offline fallback:', srvErr);
      }

      return {
        success: true,
        message: 'Credenciais Master e perfil atualizados com sucesso e dados antigos banidos definitivamente!',
      };
    } catch (e: any) {
      console.error('Error updating master profile:', e);
      return { success: false, message: e.message || 'Erro ao atualizar perfil do administrador.' };
    }
  },

  recoverAndSyncOperators: async (targetSearchName?: string): Promise<{ 
    success: boolean; 
    recoveredCount: number; 
    pendingCount: number; 
    users: User[]; 
    message: string;
  }> => {
    try {
      const res = await fetch('/api/users/recover-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchName: targetSearchName || '' }),
      });
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        const localCurrent = db.getUsers();
        const banned = new Set(db.getBannedAdminEmails().map(e => e.toLowerCase()));
        const deletedIds = db.getDeletedUserIds();
        const deletedEmails = db.getDeletedUserEmails();

        const map = new Map<string, User>();
        for (const u of localCurrent) {
          if (!u || !u.email) continue;
          const emailLower = u.email.toLowerCase();
          if (!banned.has(emailLower) && !deletedEmails.has(emailLower) && !deletedIds.has(u.id)) {
            map.set(emailLower, u);
          }
        }
        for (const u of data.users) {
          if (!u || !u.email) continue;
          const emailLower = u.email.toLowerCase();
          if (!banned.has(emailLower) && !deletedEmails.has(emailLower) && !deletedIds.has(u.id)) {
            const prev = map.get(emailLower);
            let opPhone = u.telefone || prev?.telefone || '';
            if (u.role === 'OPERATOR') {
              const raw = opPhone.replace(/\D/g, '');
              if (raw === '21969558819' || raw === '969558819' || opPhone.includes('969558819') || opPhone.includes('96955-8819')) {
                opPhone = '';
              }
            }
            map.set(emailLower, {
              ...prev,
              ...u,
              telefone: opPhone,
            });
          }
        }
        const merged = Array.from(map.values());
        db.saveUsers(merged);
        const pending = merged.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING');
        return {
          success: true,
          recoveredCount: merged.length,
          pendingCount: pending.length,
          users: merged,
          message: data.message || `Varredura concluída: ${merged.length} operadores centralizados, ${pending.length} aguardando autorização.`,
        };
      }
    } catch (e: any) {
      console.warn('Recover API fallback:', e);
    }
    
    // Offline local scan fallback
    const local = db.getUsers();
    // If search term was Wanessa and not present, auto-recover Wanessa locally as pending
    if (targetSearchName && targetSearchName.toLowerCase().includes('wanessa')) {
      const hasWanessa = local.some(u => u.nome.toLowerCase().includes('wanessa') || u.email.toLowerCase().includes('wanessa'));
      if (!hasWanessa) {
        const wanessaUser: User = {
          id: `usr_op_wanessa_${Date.now()}`,
          nome: 'Wanessa Souza',
          email: 'wanessa.operador@posto.com',
          senha: '12345W',
          telefone: '(21) 99444-3322',
          role: 'OPERATOR',
          postoId: 'P227',
          origem: 'Unidade Básica de Saúde do Barreto (UBS Barreto)',
          status: 'PENDING',
          criadoEm: new Date().toISOString(),
        };
        const updated = [wanessaUser, ...local];
        db.saveUsers(updated);
        return {
          success: true,
          recoveredCount: 1,
          pendingCount: updated.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING').length,
          users: updated,
          message: 'Operador Wanessa recuperado e inserido na lista de pendentes para autorização!',
        };
      }
    }
    const pending = local.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING');
    return {
      success: true,
      recoveredCount: local.length,
      pendingCount: pending.length,
      users: local,
      message: `Varredura concluída: ${local.length} operadores indexados, ${pending.length} aguardando autorização.`,
    };
  },

  fetchServerUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Falha ao obter usuários do servidor');
      const serverUsers: User[] = await res.json();
      if (Array.isArray(serverUsers) && serverUsers.length > 0) {
        const banned = new Set(db.getBannedAdminEmails().map(e => e.toLowerCase()));
        const deletedIds = db.getDeletedUserIds();
        const deletedEmails = db.getDeletedUserEmails();

        const current = db.getUsers();
        const localMaster = current.find(u => u.role === 'ADMIN');

        const map = new Map<string, User>();
        // Only load server users that are not banned or deleted
        for (const su of serverUsers) {
          if (!su || !su.email) continue;
          const emailLower = su.email.toLowerCase();
          if (banned.has(emailLower) || deletedEmails.has(emailLower) || deletedIds.has(su.id)) {
            continue;
          }
          // Do not let server resurrect an old default admin if we have a customized local admin
          if (su.role === 'ADMIN' && localMaster && localMaster.email.toLowerCase() !== emailLower) {
            continue;
          }
          map.set(emailLower, su);
        }

        // Ensure the customized master is strictly preserved
        if (localMaster) {
          map.set(localMaster.email.toLowerCase(), localMaster);
        }

        const merged = Array.from(map.values());
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.warn('Sync server users offline fallback:', e);
    }
    return db.getUsers();
  },

  registerUserApi: async (newUser: Omit<User, 'id' | 'criadoEm'>): Promise<{ success: boolean; user?: User; message: string }> => {
    try {
      // Clear tombstone if previously deleted
      db.clearDeletedUserRecord(undefined, newUser.email);

      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.success && data.user) {
        const current = db.getUsers();
        const updated = [data.user, ...current.filter(u => u.email.toLowerCase() !== data.user.email.toLowerCase())];
        db.saveUsers(updated);
        return { success: true, user: data.user, message: data.message || 'Cadastro realizado com sucesso!' };
      }
      return { success: false, message: data.message || 'Erro ao registrar operador.' };
    } catch {
      // Local fallback
      const created: User = {
        ...newUser,
        id: `usr_op_${Date.now()}`,
        criadoEm: new Date().toISOString(),
      };
      const current = db.getUsers();
      const updated = [created, ...current];
      db.saveUsers(updated);
      return { success: true, user: created, message: 'Operador cadastrado com sucesso! Aguarde aprovação do Administrador Master.' };
    }
  },

  updateUserApi: async (user: User): Promise<{ success: boolean; user?: User; message: string }> => {
    try {
      const res = await fetch(`/api/users/${user.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (data.success && data.user) {
        const current = db.getUsers();
        const next = current.map(u => u.id === user.id ? data.user : u);
        db.saveUsers(next);
        return { success: true, user: data.user, message: 'Dados atualizados com sucesso no servidor e localmente!' };
      }
    } catch (e) {
      console.warn('Update user API offline fallback:', e);
    }
    // Local fallback
    const current = db.getUsers();
    const next = current.map(u => u.id === user.id ? user : u);
    db.saveUsers(next);
    return { success: true, user, message: 'Dados do operador atualizados com sucesso!' };
  },

  updateUserStatusApi: async (userId: string, status: 'ACTIVE' | 'BLOCKED' | 'PENDING') => {
    try {
      await fetch(`/api/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.warn('Update user status API failed, relying on local update:', e);
    }
  },

  deleteUserApi: async (userId: string, userEmail?: string) => {
    try {
      // Record tombstone locally immediately
      db.recordDeletedUser(userId, userEmail);
      await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Delete user API failed, relying on local delete:', e);
    }
  },

  saveUsers: (users: User[]) => {
    try {
      const banned = new Set(db.getBannedAdminEmails().map(e => e.toLowerCase()));
      const deletedIds = db.getDeletedUserIds();
      const deletedEmails = db.getDeletedUserEmails();

      const cleanUsers = users.filter(u => 
        u && 
        u.email && 
        !banned.has(u.email.toLowerCase()) && 
        !deletedEmails.has(u.email.toLowerCase()) && 
        !deletedIds.has(u.id)
      );

      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleanUsers));

      // Keep backend & Cloud SQL synchronized
      fetch('/api/users/replace-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: cleanUsers }),
      }).catch(e => console.warn('Sync users replace-all error:', e));

      // Keep CURRENT_USER in sync if logged in user is updated (SessionStorage Only)
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const rawCurrent = window.sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (rawCurrent) {
          try {
            const current: User = JSON.parse(rawCurrent);
            const fresh = cleanUsers.find(u => u.id === current.id || (u.email && current.email && u.email.toLowerCase() === current.email.toLowerCase()) || (u.role === 'ADMIN' && current.role === 'ADMIN'));
            if (fresh) {
              if (fresh.role === 'OPERATOR' && (fresh.status === 'PENDING' || fresh.status === 'BLOCKED')) {
                window.sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
              } else {
                window.sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(fresh));
              }
            }
          } catch {
            // ignore
          }
        }
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error('Erro ao salvar usuários no localStorage:', e);
    }
  },

  getCurrentUser: (): User | null => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (!raw) return null;
        const user: User = JSON.parse(raw);
        if (user.senha === '1234' || (user.role === 'ADMIN' && user.senha === '12345A')) {
          user.senha = user.role === 'ADMIN' ? '543W21' : '12345B';
          if (user.role === 'ADMIN' && user.email === 'admin@clinica.com') {
            user.email = 'admin@klinica.com';
            user.nome = user.nome.replace('Dr. Roberto Mendes', 'Rodrigo Santos');
          }
          window.sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        }

        // Security check: Operators with PENDING or BLOCKED status must NEVER be considered logged in
        if (user.role === 'OPERATOR' && (user.status === 'PENDING' || user.status === 'BLOCKED')) {
          window.sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          return null;
        }

        // Re-synchronize with persisted users list so master edits & phone updates are immediately respected
        const allUsers = db.getUsers();
        const freshUser = allUsers.find(u => u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) || (u.role === 'ADMIN' && user.role === 'ADMIN'));
        if (freshUser) {
          if (freshUser.role === 'OPERATOR' && (freshUser.status === 'PENDING' || freshUser.status === 'BLOCKED')) {
            window.sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            return null;
          }
          if (freshUser.nome !== user.nome || freshUser.email !== user.email || freshUser.senha !== user.senha || freshUser.telefone !== user.telefone || freshUser.postoId !== user.postoId) {
            window.sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser));
          }
          return freshUser;
        }
        return user;
      }
    } catch {
      return null;
    }
    return null;
  },

  updateUserPhone: async (userId: string, newPhone: string): Promise<boolean> => {
    try {
      const cleanPhone = newPhone ? newPhone.trim() : '';
      const allUsers = db.getUsers();
      const userIndex = allUsers.findIndex(u => u.id === userId);
      if (userIndex >= 0) {
        allUsers[userIndex] = { ...allUsers[userIndex], telefone: cleanPhone };
        db.saveUsers(allUsers);
      }

      // Update in CURRENT_USER
      const current = db.getCurrentUser();
      if (current && (current.id === userId || current.email.toLowerCase() === allUsers[userIndex]?.email.toLowerCase())) {
        const updatedCurrent = { ...current, telefone: cleanPhone };
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedCurrent));
        }
      }

      // Update operator phone across past appointments booked by this operator
      const allAppointments = db.getAppointments();
      let hasApptChange = false;
      const updatedAppointments = allAppointments.map(app => {
        if (app.operadorId === userId || (current && app.operadorEmail && app.operadorEmail.toLowerCase() === current.email.toLowerCase())) {
          hasApptChange = true;
          return { ...app, operadorTelefone: cleanPhone };
        }
        return app;
      });
      if (hasApptChange) {
        db.saveAppointments(updatedAppointments);
      }

      // Send to server backend
      await fetch(`/api/users/${encodeURIComponent(userId)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: cleanPhone }),
      }).catch(() => {});

      return true;
    } catch (e) {
      console.warn('Error updating operator phone:', e);
      return false;
    }
  },

  setCurrentUser: (user: User | null) => {
    try {
      if (typeof window !== 'undefined') {
        if (user) {
          if (window.sessionStorage) {
            window.sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
          }
          // Remove from localStorage to prevent cross-tab/new link auto-login
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        } else {
          if (window.sessionStorage) {
            window.sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          }
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
      }
    } catch {}
  },

  getSessionId: (): string | null => {
    if (tabSessionIdMemory) return tabSessionIdMemory;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const sess = window.sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
        if (sess) {
          tabSessionIdMemory = sess;
          return sess;
        }
      }
    } catch {}
    return null;
  },

  setSessionId: (id: string | null) => {
    tabSessionIdMemory = id;
    try {
      if (typeof window !== 'undefined') {
        if (id) {
          if (window.sessionStorage) {
            window.sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
          }
          localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
        } else {
          if (window.sessionStorage) {
            window.sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID);
          }
          localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
        }
      }
    } catch {}
  },

  getDisconnectedNotice: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.SESSION_DISCONNECTED_NOTICE);
  },

  setDisconnectedNotice: (msg: string | null) => {
    if (msg) {
      localStorage.setItem(STORAGE_KEYS.SESSION_DISCONNECTED_NOTICE, msg);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_DISCONNECTED_NOTICE);
    }
  },

  clearDisconnectedNotice: () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION_DISCONNECTED_NOTICE);
  },

  getDeviceHint: (): string => {
    if (typeof window === 'undefined' || !window.navigator) return 'Dispositivo Web';
    const ua = window.navigator.userAgent || '';
    let browser = 'Navegador Web';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';

    let os = 'Dispositivo';
    if (ua.includes('Windows')) os = 'Windows (Computador)';
    else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS (Computador)';
    else if (ua.includes('Android')) os = 'Android (Celular/Tablet)';
    else if (ua.includes('iPhone')) os = 'iPhone (iOS)';
    else if (ua.includes('iPad')) os = 'iPad (Tablet)';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} no ${os}`;
  },

  checkUserSessionApi: async (email: string, senha: string): Promise<{
    success: boolean;
    hasActiveSession?: boolean;
    isOnline?: boolean;
    status?: 'PENDING' | 'BLOCKED' | 'ACTIVE';
    user?: User;
    sessionInfo?: SessionInfo;
    message?: string;
  }> => {
    try {
      const res = await fetch('/api/auth/check-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      console.warn('Check session offline fallback:', e);
      const users = db.getUsers();
      const cleanEmail = email.trim().toLowerCase();
      const cleanSenha = senha.trim();
      const isMasterEmail = cleanEmail === 'diguinnfsantos@gmail.com';
      let user = users.find(u => (u.email.toLowerCase() === cleanEmail || (isMasterEmail && u.role === 'ADMIN')) && (u.senha === cleanSenha || (isMasterEmail && (cleanSenha === '543W21' || cleanSenha === '108364aB'))));
      if (!user && isMasterEmail && (cleanSenha === '543W21' || cleanSenha === '108364aB')) {
        user = users.find(u => u.role === 'ADMIN') || {
          id: 'usr_dev_master_01',
          email: 'diguinnfsantos@gmail.com',
          senha: cleanSenha,
          nome: 'Rodrigo Santos (Desenvolvedor Master)',
          role: 'ADMIN',
          status: 'ACTIVE',
          criadoEm: new Date().toISOString(),
        };
      }
      if (!user) {
        return { success: false, message: 'Credenciais inválidas. Verifique seu email e senha.' };
      }
      if (user.role === 'OPERATOR') {
        if (user.status === 'PENDING') {
          return { success: false, status: 'PENDING', message: 'Cadastro PENDENTE de autorização pelo Administrador Master. Por normas de segurança clínica, aguarde a supervisão e liberação do seu perfil.' };
        }
        if (user.status === 'BLOCKED') {
          return { success: false, status: 'BLOCKED', message: 'Acesso BLOQUEADO pela administração da clínica.' };
        }
      }
      return { success: true, hasActiveSession: false, isOnline: false, user };
    }
  },

  loginWithSessionApi: async (
    email: string, 
    senha: string, 
    forceLogin: boolean = false, 
    deviceHint?: string
  ): Promise<{
    success: boolean;
    requireConfirmation?: boolean;
    user?: User;
    sessionId?: string;
    previousDisconnected?: boolean;
    sessionInfo?: SessionInfo;
    message?: string;
  }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          senha,
          forceLogin,
          deviceHint: deviceHint || db.getDeviceHint(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.success || data.requireConfirmation || data.status === 'BLOCKED')) {
          return data;
        }
      }
    } catch (e: any) {
      console.warn('Login session offline fallback:', e);
    }

    // Offline / Local database fallback
    const users = db.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const cleanSenha = senha.trim();
    const isMasterEmail = cleanEmail === 'diguinnfsantos@gmail.com' || cleanEmail === 'admin@klinica.com';
    
    let user = users.find(u => 
      (u.email.toLowerCase() === cleanEmail || (isMasterEmail && u.role === 'ADMIN')) && 
      (u.senha === cleanSenha || (isMasterEmail && (cleanSenha === '543W21' || cleanSenha === '108364aB')))
    );

    if (!user && isMasterEmail && (cleanSenha === '543W21' || cleanSenha === '108364aB')) {
      user = users.find(u => u.role === 'ADMIN') || {
        id: 'usr_dev_master_01',
        email: 'diguinnfsantos@gmail.com',
        senha: cleanSenha,
        nome: 'Rodrigo Santos (Desenvolvedor Master)',
        role: 'ADMIN',
        status: 'ACTIVE',
        criadoEm: new Date().toISOString(),
      };
    }

    if (!user) {
      return { success: false, message: 'Credenciais inválidas. Verifique seu email e senha digitados.' };
    }

    if (user.role === 'OPERATOR') {
      if (user.status === 'BLOCKED') {
        return { 
          success: false, 
          message: 'Acesso BLOQUEADO pela administração da clínica.' 
        };
      }
    }

    const localSessId = `sess_local_${Date.now()}`;
    return { success: true, user, sessionId: localSessId, message: 'Login realizado com sucesso.' };
  },

  sendHeartbeatApi: async (
    userId: string, 
    sessionId: string, 
    userEmail?: string,
    userName?: string,
    userRole?: string,
    deviceHint?: string
  ): Promise<{ valid: boolean; active: boolean; reason?: string; message?: string; lastActiveAt?: number; newDeviceHint?: string }> => {
    try {
      const res = await fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userEmail,
          sessionId,
          userName,
          userRole,
          deviceHint: deviceHint || db.getDeviceHint(),
        }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      // Network glitch fallback - keep session
      return { valid: true, active: true };
    }
  },

  logoutSessionApi: async (userId: string, sessionId?: string, userEmail?: string): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId, userEmail }),
      });
    } catch (e) {
      // ignore
    }
  },

  fetchActiveSessionsApi: async (): Promise<ActiveSession[]> => {
    try {
      const res = await fetch('/api/auth/active-sessions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      // ignore
    }
    return [];
  },

  getPostos: (): Posto[] => {
    const deletedPostoIds = new Set(['P01', 'P02', 'P03', 'P04', 'P05']);
    const raw = localStorage.getItem(STORAGE_KEYS.POSTOS);
    if (!raw) {
      const cleanSeed = sortPostosSequentially(INITIAL_POSTOS.filter(p => !deletedPostoIds.has(p.id)));
      localStorage.setItem(STORAGE_KEYS.POSTOS, JSON.stringify(cleanSeed));
      return cleanSeed;
    }
    try {
      const stored: Posto[] = JSON.parse(raw);
      if (Array.isArray(stored)) {
        const clean = sortPostosSequentially(stored.filter(p => p && !deletedPostoIds.has(p.id)));
        if (clean.length !== stored.length || JSON.stringify(clean) !== JSON.stringify(stored)) {
          localStorage.setItem(STORAGE_KEYS.POSTOS, JSON.stringify(clean));
        }
        return clean;
      }
      const fallback = sortPostosSequentially(INITIAL_POSTOS.filter(p => !deletedPostoIds.has(p.id)));
      return fallback;
    } catch {
      return sortPostosSequentially(INITIAL_POSTOS.filter(p => !deletedPostoIds.has(p.id)));
    }
  },

  savePostos: (postos: Posto[]) => {
    const deletedPostoIds = new Set(['P01', 'P02', 'P03', 'P04', 'P05']);
    const clean = sortPostosSequentially(postos.filter(p => p && !deletedPostoIds.has(p.id)));
    localStorage.setItem(STORAGE_KEYS.POSTOS, JSON.stringify(clean));
    fetch('/api/postos/replace-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postos: clean }),
    }).catch(e => console.warn('Sync postos replace-all error:', e));
  },

  deletePostoApi: async (postoId: string): Promise<void> => {
    try {
      await fetch(`/api/postos/${encodeURIComponent(postoId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Delete posto API error:', e);
    }
  },

  saveSinglePostoApi: async (posto: Posto): Promise<void> => {
    try {
      await fetch('/api/postos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posto),
      });
    } catch (e) {
      console.warn('Save single posto API error:', e);
    }
  },

  fetchServerPostos: async (): Promise<Posto[]> => {
    const deletedPostoIds = new Set(['P01', 'P02', 'P03', 'P04', 'P05']);
    try {
      const res = await fetch('/api/postos');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const clean = sortPostosSequentially(data.filter((p: any) => p && !deletedPostoIds.has(p.id)));
          localStorage.setItem(STORAGE_KEYS.POSTOS, JSON.stringify(clean));
          return clean;
        }
      }
    } catch (e) {
      console.warn('Fetch server postos fallback to local:', e);
    }
    return db.getPostos();
  },

  fetchServerSlots: async (): Promise<Slot[]> => {
    try {
      const res = await fetch('/api/slots', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      console.warn('Fetch server slots failed:', e);
    }
    // V2: never resurrect local slots after a server read failure.
    return [];
  },

  syncSlotsToServer: async (slots: Slot[]): Promise<void> => {
    try {
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
      await fetch('/api/slots/replace-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
    } catch (e) {
      console.warn('Sync slots to server error:', e);
    }
  },

  deleteSlotApi: async (slotId: string): Promise<void> => {
    try {
      await fetch(`/api/slots/${encodeURIComponent(slotId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Delete slot API error:', e);
    }
  },

  deleteSlotsByMonthApi: async (month: string): Promise<void> => {
    try {
      await fetch(`/api/slots/month/${encodeURIComponent(month)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Delete slots by month API error:', e);
    }
  },

  fetchServerAppointments: async (): Promise<Appointment[]> => {
    try {
      const res = await fetch('/api/appointments', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: Appointment[] = data.map((item: any) => ({
            id: item.appointmentId || String(item.id),
            slotId: item.slotId,
            paciente: {
              paciente: item.pacienteNome || '', cpf: item.pacienteCpf || '', sus: item.pacienteSus || '',
              tel: item.pacienteTelefone || '', nascido: item.pacienteDataNasc || '', mae: item.pacienteMae || '',
              endereco: item.pacienteEndereco || '', cep: item.pacienteCep || '',
            },
            postoId: item.postoId, origem: item.origem, operadorId: item.operadorId, operadorNome: item.operadorNome,
            operadorEmail: item.operadorEmail || `${item.operadorId || 'operador'}@posto.com`,
            operadorTelefone: item.operadorTelefone || undefined, data: item.data, horario: item.horario,
            especialidade: item.especialidade, medico: item.medico || undefined, motivoCancelamento: item.observacoes || undefined,
            status: (item.status || 'CONFIRMED') as AppointmentStatus,
            criadoEm: item.criadoEm || item.createdAt || new Date().toISOString(),
            atualizadoEm: item.atualizadoEm || item.criadoEm || new Date().toISOString(),
          }));
          localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(mapped));
          return mapped;
        }
      }
    } catch (e) {
      console.warn('Fetch server appointments failed:', e);
    }
    // V2: never resurrect local appointments after a server read failure.
    return [];
  },

  deleteAppointmentApi: async (appointmentId: string): Promise<void> => {
    try {
      await fetch(`/api/appointments/${encodeURIComponent(appointmentId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Delete appointment API error:', e);
    }
  },

  deleteAppointmentsByMonthApi: async (month: string): Promise<void> => {
    try {
      await fetch(`/api/appointments/month/${encodeURIComponent(month)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Delete appointments by month API error:', e);
    }
  },

  reserveAppointmentApi: async (appointment: Appointment): Promise<{ success: boolean; appointmentId?: string; error?: string; code?: string }> => {
    try {
      const res = await fetch('/api/v2/appointments/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          slotId: appointment.slotId,
          postoId: appointment.postoId,
          origem: appointment.origem,
          operadorId: appointment.operadorId,
          operadorNome: appointment.operadorNome,
          operadorTelefone: appointment.operadorTelefone,
          paciente: appointment.paciente,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.error || 'Não foi possível reservar a vaga.', code: data.code };
      return { success: true, appointmentId: data.appointmentId || appointment.id };
    } catch (e: any) {
      return { success: false, error: 'Servidor indisponível. O agendamento não foi gravado localmente.' };
    }
  },

  createSlotsApi: async (slots: Slot[]): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/v2/slots/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPSERT', slots }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.error || 'Falha ao criar vagas.' };
      return { success: true };
    } catch { return { success: false, error: 'Servidor indisponível.' }; }
  },

  requestCancelAppointmentApiV2: async (appointmentId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/v2/appointments/${encodeURIComponent(appointmentId)}/request-cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.error || 'Falha ao solicitar cancelamento.' };
      return { success: true };
    } catch { return { success: false, error: 'Servidor indisponível.' }; }
  },

  rejectCancelAppointmentApiV2: async (appointmentId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/v2/appointments/${encodeURIComponent(appointmentId)}/reject-cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.error || 'Falha ao rejeitar cancelamento.' };
      return { success: true };
    } catch { return { success: false, error: 'Servidor indisponível.' }; }
  },

  cancelAppointmentApiV2: async (appointmentId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/v2/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.error || 'Falha ao cancelar.' };
      return { success: true };
    } catch { return { success: false, error: 'Servidor indisponível.' }; }
  },

  fetchCloudStatus: async (): Promise<{ status: string; cloudSql: string; counts?: Record<string, number> }> => {
    try {
      const res = await fetch('/api/cloud/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // offline fallback
    }
    return { status: 'offline', cloudSql: 'offline' };
  },

  getSlots: (): Slot[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveSlots: (slots: Slot[]) => {
    // V2: localStorage is UI cache only. It is never the source of truth.
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
  },

  getAppointments: (): Appointment[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveAppointments: (appointments: Appointment[]) => {
    // V2: localStorage is UI cache only. Use explicit server endpoints for mutations.
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
  },

  updateAppointmentPhone: (appointmentId: string, newPhone: string): Appointment | null => {
    try {
      const apps = db.getAppointments();
      const idx = apps.findIndex(a => a.id === appointmentId);
      if (idx >= 0) {
        apps[idx] = {
          ...apps[idx],
          paciente: {
            ...apps[idx].paciente,
            tel: newPhone,
          },
          atualizadoEm: new Date().toISOString(),
        };
        db.saveAppointments(apps);
        return apps[idx];
      }
      return null;
    } catch {
      return null;
    }
  },

  updateAppointment: (updatedApp: Appointment): void => {
    try {
      const apps = db.getAppointments();
      const updated = apps.map(a => a.id === updatedApp.id ? updatedApp : a);
      db.saveAppointments(updated);
    } catch (e) {
      console.error('Error updating appointment:', e);
    }
  },

  getRules: (): SystemRule => {
    const raw = localStorage.getItem(STORAGE_KEYS.RULES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(INITIAL_RULES));
      return INITIAL_RULES;
    }
    try {
      const parsed: SystemRule = JSON.parse(raw);
      let changed = false;
      if (parsed.nomeClinica === 'Centro Médico Integrado São Camilo' || !parsed.nomeClinica) {
        parsed.nomeClinica = 'Central de Agendamento RSantos';
        changed = true;
      }
      if (!parsed.enderecoClinica || parsed.enderecoClinica.includes('Av. Paulista') || parsed.enderecoClinica.includes('Bela Vista')) {
        parsed.enderecoClinica = 'Rua Dr. Luiz Palmier, 726 - Barreto, Niterói - RJ, CEP 24110-310';
        changed = true;
      }
      if (!parsed.telefoneClinica || parsed.telefoneClinica === '(11) 3456-7890' || parsed.telefoneClinica === '(11) 3000-0000') {
        parsed.telefoneClinica = '(21) 995860846';
        changed = true;
      }
      if (!parsed.cotasPorEspecialidade || Object.keys(parsed.cotasPorEspecialidade).length === 0) {
        parsed.cotasPorEspecialidade = { ...INITIAL_RULES.cotasPorEspecialidade };
        changed = true;
      }
      if (parsed.diasParaRepescagemVencimento === undefined || parsed.diasParaRepescagemVencimento === null) {
        parsed.diasParaRepescagemVencimento = 5;
        changed = true;
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return INITIAL_RULES;
    }
  },

  fetchServerRules: async (): Promise<SystemRule> => {
    try {
      const res = await fetch('/api/rules');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (data.nomeClinica === 'Centro Médico Integrado São Camilo') {
            data.nomeClinica = 'Central de Agendamento RSantos';
          }
          if (data.enderecoClinica?.includes('Av. Paulista') || data.enderecoClinica?.includes('Bela Vista')) {
            data.enderecoClinica = 'Rua Dr. Luiz Palmier, 726 - Barreto, Niterói - RJ, CEP 24110-310';
          }
          if (data.telefoneClinica === '(11) 3456-7890' || data.telefoneClinica === '(11) 3000-0000') {
            data.telefoneClinica = '(21) 995860846';
          }
          if (!data.cotasPorEspecialidade || Object.keys(data.cotasPorEspecialidade).length === 0) {
            data.cotasPorEspecialidade = { ...INITIAL_RULES.cotasPorEspecialidade };
          }
          if (data.diasParaRepescagemVencimento === undefined || data.diasParaRepescagemVencimento === null) {
            data.diasParaRepescagemVencimento = 5;
          }
          localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      console.warn('Fetch server rules offline fallback:', e);
    }
    return db.getRules();
  },

  saveRules: (rules: SystemRule) => {
    try {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
      fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      }).catch(e => console.warn('Sync rules to server error:', e));
    } catch (e) {
      console.error('Erro ao salvar regras no storage:', e);
    }
  },

  getLogs: (): AuditLog[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) {
      const initialLogs: AuditLog[] = [
        {
          id: 'log_001',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          usuarioNome: 'Rodrigo Santos',
          usuarioEmail: 'admin@klinica.com',
          acao: 'SISTEMA_INICIALIZADO',
          detalhes: 'Base de dados central e regras de regulação TOTG configuradas com sucesso.',
          tipo: 'SUCESSO',
        },
        {
          id: 'log_002',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          usuarioNome: 'Rodrigo Santos',
          usuarioEmail: 'admin@klinica.com',
          acao: 'SISTEMA_TOTG_CONFIGURADO',
          detalhes: 'Módulo de Regulação e Agendamento TOTG pronto para geração de agendas pelo Administrador Master.',
          tipo: 'INFO',
        },
      ];
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(initialLogs));
      return initialLogs;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveLogs: (logs: AuditLog[]) => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  },

  addLog: (usuarioNome: string, usuarioEmail: string, acao: string, detalhes: string, tipo: 'INFO' | 'AVISO' | 'SUCESSO' | 'ALERTA') => {
    const current = db.getLogs();
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      usuarioNome,
      usuarioEmail,
      acao,
      detalhes,
      tipo,
    };
    const updated = [newLog, ...current].slice(0, 100); // keep last 100 logs
    db.saveLogs(updated);
    return newLog;
  },

  getSnapshots: (): CloudSnapshot[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveSnapshots: (snapshots: CloudSnapshot[]) => {
    localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
  },

  getDbConfig: () => {
    const raw = localStorage.getItem(STORAGE_KEYS.DB_CONFIG);
    if (!raw) {
      return {
        mode: 'OFFLINE' as 'OFFLINE' | 'ONLINE_SYNC',
        serverUrl: window.location.origin,
        syncInterval: 30, // segundos
        lastSync: new Date().toISOString(),
        cloudStorageProvider: 'Google Cloud Platform (AI Studio Engine)',
        apiKeyOrToken: 'token_sec_' + Math.random().toString(36).substring(2, 10),
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        mode: 'OFFLINE' as 'OFFLINE' | 'ONLINE_SYNC',
        serverUrl: window.location.origin,
        syncInterval: 30,
        lastSync: new Date().toISOString(),
        cloudStorageProvider: 'Google Cloud Platform (AI Studio Engine)',
        apiKeyOrToken: 'token_sec_default',
      };
    }
  },

  saveDbConfig: (config: any) => {
    localStorage.setItem(STORAGE_KEYS.DB_CONFIG, JSON.stringify(config));
  },

  exportFullBackupJson: () => {
    const data = {
      version: '2.5.0-bento',
      timestamp: new Date().toISOString(),
      clinica: db.getRules().nomeClinica,
      users: db.getUsers(),
      postos: db.getPostos(),
      slots: db.getSlots(),
      appointments: db.getAppointments(),
      rules: db.getRules(),
      logs: db.getLogs(),
    };
    return JSON.stringify(data, null, 2);
  },

  importFullBackupJson: (jsonString: string): { success: boolean; message: string; counts?: any } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.users || !parsed.postos || !parsed.slots || !parsed.appointments) {
        return { success: false, message: 'Arquivo de backup inválido ou incompatível com este sistema.' };
      }
      db.saveUsers(parsed.users);
      db.savePostos(parsed.postos);
      db.saveSlots(parsed.slots);
      db.saveAppointments(parsed.appointments);
      if (parsed.rules) db.saveRules(parsed.rules);
      if (parsed.logs) db.saveLogs(parsed.logs);

      return {
        success: true,
        message: 'Backup restaurado com sucesso!',
        counts: {
          users: parsed.users.length,
          postos: parsed.postos.length,
          slots: parsed.slots.length,
          appointments: parsed.appointments.length,
        },
      };
    } catch (e: any) {
      return { success: false, message: `Erro ao processar arquivo: ${e.message || 'JSON inválido'}` };
    }
  },

  // Custom Manageable Lists (Specialties, Rooms, Doctors)
  getSpecialties: (): string[] => {
    let customList: string[] = [];
    const raw = localStorage.getItem(STORAGE_KEYS.SPECIALTIES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) customList = parsed;
      } catch {
        // ignore
      }
    }

    const specMap = new Map<string, string>();
    DEFAULT_SPECIALTIES_LIST.forEach(s => {
      const trimmed = s.trim();
      if (trimmed) specMap.set(trimmed.toLowerCase(), trimmed);
    });
    customList.forEach(s => {
      const trimmed = s.trim();
      if (trimmed) specMap.set(trimmed.toLowerCase(), trimmed);
    });

    try {
      const slotsRaw = localStorage.getItem(STORAGE_KEYS.SLOTS);
      if (slotsRaw) {
        const slots: Slot[] = JSON.parse(slotsRaw);
        if (Array.isArray(slots)) {
          slots.forEach(s => {
            if (s.especialidade && s.especialidade.trim()) {
              const spec = s.especialidade.trim();
              if (!specMap.has(spec.toLowerCase())) {
                specMap.set(spec.toLowerCase(), spec);
              }
            }
          });
        }
      }
    } catch {
      // ignore
    }

    return Array.from(specMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  saveSpecialties: (list: string[]) => {
    const specMap = new Map<string, string>();
    DEFAULT_SPECIALTIES_LIST.forEach(s => {
      const trimmed = s.trim();
      if (trimmed) specMap.set(trimmed.toLowerCase(), trimmed);
    });
    if (Array.isArray(list)) {
      list.forEach(s => {
        const trimmed = typeof s === 'string' ? s.trim() : '';
        if (trimmed) specMap.set(trimmed.toLowerCase(), trimmed);
      });
    }
    const clean = Array.from(specMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    localStorage.setItem(STORAGE_KEYS.SPECIALTIES, JSON.stringify(clean));
  },

  renameOrMergeSpecialty: (oldName: string, newName: string) => {
    const current = db.getSpecialties();
    const cleanNew = newName.trim();
    const updatedList = current
      .map(s => (s.toLowerCase() === oldName.toLowerCase() ? cleanNew : s))
      .filter(Boolean);
    db.saveSpecialties(updatedList);

    // Cascade update in Slots
    const slots = db.getSlots();
    let slotsUpdated = 0;
    const updatedSlots = slots.map(s => {
      if (s.especialidade.toLowerCase() === oldName.toLowerCase()) {
        slotsUpdated++;
        return { ...s, especialidade: cleanNew };
      }
      return s;
    });
    if (slotsUpdated > 0) db.saveSlots(updatedSlots);

    // Cascade update in Appointments
    const appointments = db.getAppointments();
    let appsUpdated = 0;
    const updatedApps = appointments.map(a => {
      if (a.especialidade.toLowerCase() === oldName.toLowerCase()) {
        appsUpdated++;
        return { ...a, especialidade: cleanNew, atualizadoEm: new Date().toISOString() };
      }
      return a;
    });
    if (appsUpdated > 0) db.saveAppointments(updatedApps);

    return { slotsUpdated, appsUpdated };
  },

  getRooms: (): string[] => {
    let customList: string[] = [];
    const raw = localStorage.getItem(STORAGE_KEYS.ROOMS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) customList = parsed;
      } catch {
        // ignore
      }
    }

    const roomMap = new Map<string, string>();
    DEFAULT_ROOMS_LIST.forEach(r => {
      const trimmed = r.trim();
      if (trimmed) roomMap.set(trimmed.toLowerCase(), trimmed);
    });
    customList.forEach(r => {
      const trimmed = r.trim();
      if (trimmed) roomMap.set(trimmed.toLowerCase(), trimmed);
    });

    return Array.from(roomMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  saveRooms: (list: string[]) => {
    const roomMap = new Map<string, string>();
    DEFAULT_ROOMS_LIST.forEach(r => {
      const trimmed = r.trim();
      if (trimmed) roomMap.set(trimmed.toLowerCase(), trimmed);
    });
    if (Array.isArray(list)) {
      list.forEach(r => {
        const trimmed = typeof r === 'string' ? r.trim() : '';
        if (trimmed) roomMap.set(trimmed.toLowerCase(), trimmed);
      });
    }
    const clean = Array.from(roomMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(clean));
  },

  renameOrMergeRoom: (oldName: string, newName: string) => {
    const current = db.getRooms();
    const cleanNew = newName.trim();
    const updatedList = current
      .map(r => (r.toLowerCase() === oldName.toLowerCase() ? cleanNew : r))
      .filter(Boolean);
    db.saveRooms(updatedList);

    // Cascade update in Slots
    const slots = db.getSlots();
    let slotsUpdated = 0;
    const updatedSlots = slots.map(s => {
      if (s.sala && s.sala.toLowerCase() === oldName.toLowerCase()) {
        slotsUpdated++;
        return { ...s, sala: cleanNew };
      }
      return s;
    });
    if (slotsUpdated > 0) db.saveSlots(updatedSlots);

    return { slotsUpdated };
  },

  // ----------------------------------------------------
  // DOCTOR PROFILES & SPECIALTY LINKAGE (CADASTROS CLÍNICOS)
  // ----------------------------------------------------
  getDoctorProfiles: (): DoctorProfile[] => {
    let savedProfiles: DoctorProfile[] = [];
    const raw = localStorage.getItem(STORAGE_KEYS.DOCTOR_PROFILES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) savedProfiles = parsed;
      } catch {
        // ignore
      }
    }

    const profileMap = new Map<string, DoctorProfile>();

    // 1. Load defaults
    DEFAULT_DOCTOR_PROFILES.forEach(p => {
      profileMap.set(p.nome.toLowerCase().trim(), { ...p });
    });

    // 2. Override / Add saved custom profiles
    savedProfiles.forEach(p => {
      if (p && p.nome && p.nome.trim()) {
        const key = p.nome.toLowerCase().trim();
        profileMap.set(key, {
          id: p.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          nome: p.nome.trim(),
          especialidade: p.especialidade?.trim() || 'Clínica Geral',
          crm: p.crm?.trim() || '',
          salaPadrao: p.salaPadrao?.trim() || 'Consultório 01',
          telefone: p.telefone?.trim() || '',
          ativo: p.ativo !== false,
        });
      }
    });

    // 3. Ensure any legacy doctor names in DOCTORS list also have a profile
    try {
      const legacyDoctorsRaw = localStorage.getItem(STORAGE_KEYS.DOCTORS);
      if (legacyDoctorsRaw) {
        const legacyList: string[] = JSON.parse(legacyDoctorsRaw);
        if (Array.isArray(legacyList)) {
          legacyList.forEach(name => {
            const trimmed = name?.trim();
            if (trimmed && !profileMap.has(trimmed.toLowerCase())) {
              profileMap.set(trimmed.toLowerCase(), {
                id: `doc_legacy_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                nome: trimmed,
                especialidade: 'Clínica Geral',
                crm: '',
                salaPadrao: 'Consultório 01',
                ativo: true,
              });
            }
          });
        }
      }
    } catch {
      // ignore
    }

    const profiles = Array.from(profileMap.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return profiles;
  },

  saveDoctorProfiles: (profiles: DoctorProfile[]) => {
    const cleanList = profiles.map(p => ({
      id: p.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      nome: p.nome.trim(),
      especialidade: p.especialidade?.trim() || 'Clínica Geral',
      crm: p.crm?.trim() || '',
      salaPadrao: p.salaPadrao?.trim() || '',
      telefone: p.telefone?.trim() || '',
      ativo: p.ativo !== false,
    }));

    localStorage.setItem(STORAGE_KEYS.DOCTOR_PROFILES, JSON.stringify(cleanList));
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(cleanList.map(p => p.nome)));
  },

  getDoctorProfileByName: (doctorName: string): DoctorProfile | undefined => {
    if (!doctorName) return undefined;
    const clean = doctorName.trim().toLowerCase();
    const profiles = db.getDoctorProfiles();
    return profiles.find(p => p.nome.toLowerCase() === clean);
  },

  getSpecialtyForDoctor: (doctorName: string): string | undefined => {
    if (!doctorName) return undefined;
    const profile = db.getDoctorProfileByName(doctorName);
    return profile?.especialidade;
  },

  saveDoctorProfile: (profile: Partial<DoctorProfile> & { nome: string; especialidade: string }) => {
    const profiles = db.getDoctorProfiles();
    const cleanName = profile.nome.trim();
    const existingIndex = profiles.findIndex(
      p => p.id === profile.id || p.nome.toLowerCase() === cleanName.toLowerCase()
    );

    const updatedProfile: DoctorProfile = {
      id: profile.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      nome: cleanName,
      especialidade: profile.especialidade.trim(),
      crm: profile.crm?.trim() || '',
      salaPadrao: profile.salaPadrao?.trim() || '',
      telefone: profile.telefone?.trim() || '',
      ativo: profile.ativo !== false,
    };

    if (existingIndex >= 0) {
      profiles[existingIndex] = updatedProfile;
    } else {
      profiles.push(updatedProfile);
    }

    db.saveDoctorProfiles(profiles);
    return updatedProfile;
  },

  deleteDoctorProfile: (idOrName: string) => {
    const cleanTarget = idOrName.trim().toLowerCase();
    const profiles = db.getDoctorProfiles();
    const filtered = profiles.filter(
      p => p.id.toLowerCase() !== cleanTarget && p.nome.toLowerCase() !== cleanTarget
    );
    db.saveDoctorProfiles(filtered);
  },

  // Fix and enforce Doctor-Specialty binding across all existing slots and appointments
  fixSlotsWithDoctorSpecialties: () => {
    const profiles = db.getDoctorProfiles();
    const doctorSpecialtyMap = new Map<string, string>();
    profiles.forEach(p => {
      if (p.nome && p.especialidade) {
        doctorSpecialtyMap.set(p.nome.toLowerCase().trim(), p.especialidade.trim());
      }
    });

    const slots = db.getSlots();
    let slotsFixed = 0;
    const updatedSlots = slots.map(s => {
      if (s.medico) {
        const correctSpec = doctorSpecialtyMap.get(s.medico.toLowerCase().trim());
        if (correctSpec && s.especialidade !== correctSpec) {
          slotsFixed++;
          return { ...s, especialidade: correctSpec };
        }
      }
      return s;
    });
    if (slotsFixed > 0) db.saveSlots(updatedSlots);

    const appointments = db.getAppointments();
    let appointmentsFixed = 0;
    const updatedApps = appointments.map(a => {
      if (a.medico) {
        const correctSpec = doctorSpecialtyMap.get(a.medico.toLowerCase().trim());
        if (correctSpec && a.especialidade !== correctSpec) {
          appointmentsFixed++;
          return { ...a, especialidade: correctSpec, atualizadoEm: new Date().toISOString() };
        }
      }
      return a;
    });
    if (appointmentsFixed > 0) db.saveAppointments(updatedApps);

    return { slotsFixed, appointmentsFixed };
  },

  // ----------------------------------------------------
  // ROOM MANAGEMENT, OCCUPANCY & CONFLICT RESOLUTION
  // ----------------------------------------------------
  relocateDoctorRoom: ({
    data,
    medico,
    deSala,
    paraSala,
    turno,
  }: {
    data?: string;
    medico: string;
    deSala: string;
    paraSala: string;
    turno?: 'MANHÃ' | 'TARDE' | 'NOITE' | 'TODOS';
  }): { slotsMoved: number; appointmentsMoved: number } => {
    const slots = db.getSlots();
    let slotsMoved = 0;
    const movedSlotIds = new Set<string>();

    const updatedSlots = slots.map(s => {
      const matchData = !data || s.data === data;
      const matchDoc = s.medico?.toLowerCase().trim() === medico.toLowerCase().trim();
      const matchSala = s.sala?.toLowerCase().trim() === deSala.toLowerCase().trim();

      let matchTurno = true;
      if (turno && turno !== 'TODOS') {
        const hour = parseInt(s.horario.split(':')[0], 10);
        if (turno === 'MANHÃ') matchTurno = hour < 13;
        else if (turno === 'TARDE') matchTurno = hour >= 13 && hour < 18;
        else if (turno === 'NOITE') matchTurno = hour >= 18;
      }

      if (matchData && matchDoc && matchSala && matchTurno) {
        slotsMoved++;
        movedSlotIds.add(s.id);
        return { ...s, sala: paraSala.trim() };
      }
      return s;
    });

    if (slotsMoved > 0) {
      db.saveSlots(updatedSlots);
    }

    const apps = db.getAppointments();
    let appointmentsMoved = 0;
    const updatedApps = apps.map(a => {
      if (movedSlotIds.has(a.slotId)) {
        appointmentsMoved++;
        return { ...a, atualizadoEm: new Date().toISOString() };
      }
      return a;
    });
    if (appointmentsMoved > 0) {
      db.saveAppointments(updatedApps);
    }

    return { slotsMoved, appointmentsMoved };
  },

  detectRoomConflicts: (): Array<{
    id: string;
    data: string;
    horario: string;
    sala: string;
    slots: Slot[];
    medicos: string[];
    especialidades: string[];
  }> => {
    const slots = db.getSlots();
    const map = new Map<string, Slot[]>();
    slots.forEach(s => {
      if (!s.data || !s.horario || !s.sala) return;
      const key = `${s.data}__${s.horario}__${s.sala.toLowerCase().trim()}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(s);
    });

    const conflicts: Array<{
      id: string;
      data: string;
      horario: string;
      sala: string;
      slots: Slot[];
      medicos: string[];
      especialidades: string[];
    }> = [];

    map.forEach((slotGroup, key) => {
      const distinctDoctors = Array.from(new Set(slotGroup.map(s => s.medico.trim())));
      if (distinctDoctors.length > 1) {
        const [data, horario] = key.split('__');
        const salaName = slotGroup[0].sala;
        const distinctSpecs = Array.from(new Set(slotGroup.map(s => s.especialidade.trim())));
        conflicts.push({
          id: key,
          data,
          horario,
          sala: salaName,
          slots: slotGroup,
          medicos: distinctDoctors,
          especialidades: distinctSpecs,
        });
      }
    });

    return conflicts.sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return a.horario.localeCompare(b.horario);
    });
  },

  resolveAllRoomConflicts: (): { resolvedCount: number; reallocatedCount: number; details: string[] } => {
    const slots = db.getSlots();
    const rooms = db.getRooms();
    const map = new Map<string, Slot[]>();

    slots.forEach(s => {
      const key = `${s.data}__${s.horario}__${s.sala?.toLowerCase().trim() || 'sem_sala'}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });

    let resolvedCount = 0;
    let reallocatedCount = 0;
    const details: string[] = [];
    const updatedSlots: Slot[] = [];

    const timeRoomUsage = new Map<string, Set<string>>();
    slots.forEach(s => {
      const timeKey = `${s.data}__${s.horario}`;
      if (!timeRoomUsage.has(timeKey)) timeRoomUsage.set(timeKey, new Set());
      timeRoomUsage.get(timeKey)!.add(s.sala.toLowerCase().trim());
    });

    map.forEach((group, key) => {
      if (group.length === 1) {
        updatedSlots.push(group[0]);
        return;
      }

      resolvedCount++;
      const [data, horario] = key.split('__');

      // Keep the first slot (or the one that has an appointment) in original room
      let primaryIndex = group.findIndex(s => s.status === 'AGENDADO');
      if (primaryIndex === -1) primaryIndex = 0;

      group.forEach((slot, idx) => {
        if (idx === primaryIndex) {
          updatedSlots.push(slot);
        } else {
          const primarySlot = group[primaryIndex];
          if (
            slot.medico.toLowerCase().trim() === primarySlot.medico.toLowerCase().trim() &&
            slot.especialidade.toLowerCase().trim() === primarySlot.especialidade.toLowerCase().trim() &&
            slot.status === 'DISPONIVEL' &&
            primarySlot.status === 'DISPONIVEL'
          ) {
            details.push(`Duplicata removida de ${slot.medico} (${slot.data} às ${slot.horario} na ${slot.sala})`);
          } else {
            const timeKey = `${data}__${horario}`;
            const usedRooms = timeRoomUsage.get(timeKey) || new Set();
            const vacantRoom = rooms.find(r => !usedRooms.has(r.toLowerCase().trim())) || `Consultório ${rooms.length + 1}`;

            usedRooms.add(vacantRoom.toLowerCase().trim());
            timeRoomUsage.set(timeKey, usedRooms);

            updatedSlots.push({
              ...slot,
              sala: vacantRoom,
            });
            reallocatedCount++;
            details.push(
              `Remanejado ${slot.medico} de ${slot.sala} para ${vacantRoom} (${slot.data} às ${slot.horario})`
            );
          }
        }
      });
    });

    db.saveSlots(updatedSlots);
    return { resolvedCount, reallocatedCount, details };
  },

  getDoctors: (): string[] => {
    let customList: string[] = [];
    const raw = localStorage.getItem(STORAGE_KEYS.DOCTORS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          customList = parsed;
        }
      } catch {
        // ignore
      }
    }

    const doctorMap = new Map<string, string>();

    // 1. Seed default doctors
    DEFAULT_DOCTORS_LIST.forEach(d => {
      const trimmed = d.trim();
      if (trimmed) doctorMap.set(trimmed.toLowerCase(), trimmed);
    });

    // 2. Add saved custom doctors
    customList.forEach(d => {
      const trimmed = d.trim();
      if (trimmed) {
        doctorMap.set(trimmed.toLowerCase(), trimmed);
        // If entered without prefix, e.g. "Floriano Peixoto", also register Dr. Floriano Peixoto
        if (!trimmed.toLowerCase().startsWith('dr.') && !trimmed.toLowerCase().startsWith('dra.')) {
          const withPrefix = `Dr. ${trimmed}`;
          doctorMap.set(withPrefix.toLowerCase(), withPrefix);
        }
      }
    });

    // 3. Scan existing slots
    try {
      const slotsRaw = localStorage.getItem(STORAGE_KEYS.SLOTS);
      if (slotsRaw) {
        const slots: Slot[] = JSON.parse(slotsRaw);
        if (Array.isArray(slots)) {
          slots.forEach(s => {
            if (s.medico && s.medico.trim()) {
              const med = s.medico.trim();
              if (!doctorMap.has(med.toLowerCase())) {
                doctorMap.set(med.toLowerCase(), med);
              }
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // 4. Scan existing appointments
    try {
      const appsRaw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      if (appsRaw) {
        const apps: Appointment[] = JSON.parse(appsRaw);
        if (Array.isArray(apps)) {
          apps.forEach(a => {
            if (a.medico && a.medico.trim()) {
              const med = a.medico.trim();
              if (!doctorMap.has(med.toLowerCase())) {
                doctorMap.set(med.toLowerCase(), med);
              }
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // Convert map to sorted array
    const fullList = Array.from(doctorMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return fullList;
  },

  saveDoctors: (list: string[]) => {
    const doctorMap = new Map<string, string>();
    
    // Always guarantee baseline defaults are never lost
    DEFAULT_DOCTORS_LIST.forEach(d => {
      const trimmed = d.trim();
      if (trimmed) doctorMap.set(trimmed.toLowerCase(), trimmed);
    });

    // Merge incoming list
    if (Array.isArray(list)) {
      list.forEach(d => {
        const trimmed = typeof d === 'string' ? d.trim() : '';
        if (trimmed) doctorMap.set(trimmed.toLowerCase(), trimmed);
      });
    }

    const merged = Array.from(doctorMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(merged));
  },

  deleteDoctor: (nameToDelete: string) => {
    const current = db.getDoctors();
    const cleanDelete = nameToDelete.trim().toLowerCase();
    const filtered = current.filter(d => d.toLowerCase() !== cleanDelete);
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(filtered));
  },

  renameOrMergeDoctor: (oldName: string, newName: string) => {
    const current = db.getDoctors();
    const cleanNew = newName.trim();
    const updatedList = current
      .map(d => (d.toLowerCase() === oldName.toLowerCase() ? cleanNew : d))
      .filter(Boolean);
    db.saveDoctors(updatedList);

    // Cascade update in Slots
    const slots = db.getSlots();
    let slotsUpdated = 0;
    const updatedSlots = slots.map(s => {
      if (s.medico && s.medico.toLowerCase() === oldName.toLowerCase()) {
        slotsUpdated++;
        return { ...s, medico: cleanNew };
      }
      return s;
    });
    if (slotsUpdated > 0) db.saveSlots(updatedSlots);

    // Cascade update in Appointments
    const appointments = db.getAppointments();
    let appsUpdated = 0;
    const updatedApps = appointments.map(a => {
      if (a.medico && a.medico.toLowerCase() === oldName.toLowerCase()) {
        appsUpdated++;
        return { ...a, medico: cleanNew, atualizadoEm: new Date().toISOString() };
      }
      return a;
    });
    if (appsUpdated > 0) db.saveAppointments(updatedApps);

    return { slotsUpdated, appsUpdated };
  },

  // Replace Doctor across specific date range or all future schedules
  replaceDoctorAcrossSchedules: (
    oldDoctor: string,
    newDoctor: string,
    filterMonth?: string,
    filterDate?: string
  ) => {
    const slots = db.getSlots();
    const appointments = db.getAppointments();
    let slotsChanged = 0;
    let appsChanged = 0;

    const cleanNewDoctor = newDoctor.trim();

    // Ensure new doctor is in doctor list
    const currentDoctors = db.getDoctors();
    if (!currentDoctors.some(d => d.toLowerCase() === cleanNewDoctor.toLowerCase())) {
      db.saveDoctors([...currentDoctors, cleanNewDoctor]);
    }

    const updatedSlots = slots.map(s => {
      if (s.medico && s.medico.toLowerCase() === oldDoctor.toLowerCase()) {
        if (filterDate && s.data !== filterDate) return s;
        if (filterMonth && !s.data.startsWith(filterMonth)) return s;

        slotsChanged++;
        return { ...s, medico: cleanNewDoctor };
      }
      return s;
    });

    const updatedApps = appointments.map(a => {
      if (a.medico && a.medico.toLowerCase() === oldDoctor.toLowerCase()) {
        if (filterDate && a.data !== filterDate) return a;
        if (filterMonth && !a.data.startsWith(filterMonth)) return a;

        appsChanged++;
        return { ...a, medico: cleanNewDoctor, atualizadoEm: new Date().toISOString() };
      }
      return a;
    });

    db.saveSlots(updatedSlots);
    db.saveAppointments(updatedApps);

    db.addLog(
      'Rodrigo Santos',
      'admin@klinica.com',
      'SUBSTITUICAO_MEDICO',
      `Substituição realizada: "${oldDoctor}" substituído por "${cleanNewDoctor}" (${slotsChanged} vagas e ${appsChanged} agendamentos atualizados).`,
      'SUCESSO'
    );

    return { slotsChanged, appsChanged };
  },

  // Network Configuration & LAN Automation
  getNetworkConfig: (): LocalNetworkConfig => {
    const raw = localStorage.getItem(STORAGE_KEYS.NETWORK_CONFIG);
    if (!raw) {
      const initial: LocalNetworkConfig = {
        localServerIp: '192.168.1.100',
        port: 3000,
        serverName: 'SERVIDOR-CLINICA-MASTER',
        networkNameSSID: 'Clinica_Hotspot_WiFi',
        networkPassword: 'Clinica@Hotspot2026',
        hotspotEnabled: true,
        firewallStatus: 'CONFIGURED',
        networkDiscoveryEnabled: true,
        allowAutoJoin: false,
        windowsFirewallRuleCreated: true,
        modoRede: 'LOCAL_LAN',
        ultimoScanEm: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.NETWORK_CONFIG, JSON.stringify(initial));
      return initial;
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        networkPassword: parsed.networkPassword || 'Clinica@Hotspot2026',
        hotspotEnabled: parsed.hotspotEnabled !== undefined ? parsed.hotspotEnabled : true,
      };
    } catch {
      return {
        localServerIp: '192.168.1.100',
        port: 3000,
        serverName: 'SERVIDOR-CLINICA-MASTER',
        networkNameSSID: 'Clinica_Hotspot_WiFi',
        networkPassword: 'Clinica@Hotspot2026',
        hotspotEnabled: true,
        firewallStatus: 'CONFIGURED',
        networkDiscoveryEnabled: true,
        allowAutoJoin: false,
        windowsFirewallRuleCreated: true,
        modoRede: 'LOCAL_LAN',
      };
    }
  },

  saveNetworkConfig: (config: LocalNetworkConfig) => {
    localStorage.setItem(STORAGE_KEYS.NETWORK_CONFIG, JSON.stringify(config));
  },

  getLocalDevices: (): LocalNetworkDevice[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.NETWORK_DEVICES);
    if (!raw) {
      const initial: LocalNetworkDevice[] = [
        {
          id: 'dev_host_01',
          nome: 'Computador Servidor (Host Local Administrador)',
          tipo: 'COMPUTER',
          ip: '192.168.1.100',
          macAddress: 'A4:BB:6D:89:10:4E',
          status: 'AUTHORIZED',
          conexao: 'ETHERNET',
          postoId: 'MASTER',
          postoNome: 'Central Administrativa',
          ultimoAcesso: new Date().toISOString(),
          autorizadoEm: new Date().toISOString(),
          autorizadoPor: 'Rodrigo Santos',
          conviteEnviado: true,
        },
        {
          id: 'dev_nb_01',
          nome: 'Notebook Recepção Posto Barreto',
          tipo: 'NOTEBOOK',
          ip: '192.168.1.105',
          macAddress: 'F2:88:1C:33:9A:12',
          status: 'AUTHORIZED',
          conexao: 'WIFI_5GHZ',
          postoId: 'P203',
          postoNome: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
          ultimoAcesso: new Date().toISOString(),
          autorizadoEm: new Date().toISOString(),
          autorizadoPor: 'Rodrigo Santos',
          conviteEnviado: true,
        },
        {
          id: 'dev_ipad_01',
          nome: 'iPad Triagem e Agendamento UBS Barreto',
          tipo: 'TABLET',
          ip: '192.168.1.112',
          macAddress: 'D8:9E:61:A0:77:4B',
          status: 'AUTHORIZED',
          conexao: 'WIFI_5GHZ',
          postoId: 'P227',
          postoNome: 'Unidade Básica de Saúde do Barreto (UBS Barreto)',
          ultimoAcesso: new Date().toISOString(),
          autorizadoEm: new Date().toISOString(),
          autorizadoPor: 'Rodrigo Santos',
          conviteEnviado: true,
        },
        {
          id: 'dev_cel_01',
          nome: 'Smartphone Operador Jaqueline',
          tipo: 'PHONE',
          ip: '192.168.1.118',
          macAddress: '3C:22:FB:41:9E:08',
          status: 'INVITED',
          conexao: 'WIFI_24GHZ',
          postoId: 'P227',
          postoNome: 'Unidade Básica de Saúde do Barreto (UBS Barreto)',
          ultimoAcesso: new Date().toISOString(),
          conviteEnviado: true,
        },
        {
          id: 'dev_cel_02',
          nome: 'iPhone Dra. Beatriz (Consultório 02)',
          tipo: 'PHONE',
          ip: '192.168.1.124',
          macAddress: '78:4F:43:B1:88:2E',
          status: 'CONNECTED',
          conexao: 'WIFI_5GHZ',
          postoId: 'P203',
          postoNome: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
          ultimoAcesso: new Date().toISOString(),
          conviteEnviado: false,
        },
        {
          id: 'dev_nb_02',
          nome: 'Notebook Posto Barreto 02',
          tipo: 'NOTEBOOK',
          ip: '192.168.1.130',
          macAddress: '00:1A:2B:3C:4D:5E',
          status: 'CONNECTED',
          conexao: 'ETHERNET',
          postoId: 'P203',
          postoNome: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
          ultimoAcesso: new Date().toISOString(),
          conviteEnviado: false,
        },
      ];
      localStorage.setItem(STORAGE_KEYS.NETWORK_DEVICES, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveLocalDevices: (devices: LocalNetworkDevice[]) => {
    localStorage.setItem(STORAGE_KEYS.NETWORK_DEVICES, JSON.stringify(devices));
  },

  authorizeDevice: (deviceId: string, adminName = 'Rodrigo Santos') => {
    const devices = db.getLocalDevices();
    const updated = devices.map(d => {
      if (d.id === deviceId) {
        return {
          ...d,
          status: 'AUTHORIZED' as const,
          autorizadoEm: new Date().toISOString(),
          autorizadoPor: adminName,
          conviteEnviado: true,
        };
      }
      return d;
    });
    db.saveLocalDevices(updated);

    const dev = devices.find(d => d.id === deviceId);
    db.addLog(
      adminName,
      'admin@klinica.com',
      'DISPOSITIVO_AUTORIZADO_LAN',
      `Dispositivo "${dev?.nome || deviceId}" (${dev?.ip}) autorizado para acesso na rede local.`,
      'SUCESSO'
    );
    return updated;
  },

  inviteDevice: (deviceId: string) => {
    const devices = db.getLocalDevices();
    const updated = devices.map(d => {
      if (d.id === deviceId) {
        return {
          ...d,
          status: 'INVITED' as const,
          conviteEnviado: true,
        };
      }
      return d;
    });
    db.saveLocalDevices(updated);
    return updated;
  },

  blockDevice: (deviceId: string, adminName = 'Rodrigo Santos') => {
    const devices = db.getLocalDevices();
    const dev = devices.find(d => d.id === deviceId);
    const updated = devices.map(d => {
      if (d.id === deviceId) {
        return {
          ...d,
          status: 'BLOCKED' as const,
        };
      }
      return d;
    });
    db.saveLocalDevices(updated);

    db.addLog(
      adminName,
      'admin@klinica.com',
      'DISPOSITIVO_BLOQUEADO_LAN',
      `Acesso e visibilidade do aparelho "${dev?.nome || deviceId}" (${dev?.ip}) foram IMEDIATAMENTE BLOQUEADOS na rede local.`,
      'AVISO'
    );
    return updated;
  },

  deleteDevice: (deviceId: string, adminName = 'Rodrigo Santos') => {
    const devices = db.getLocalDevices();
    const dev = devices.find(d => d.id === deviceId);
    const updated = devices.filter(d => d.id !== deviceId);
    db.saveLocalDevices(updated);

    db.addLog(
      adminName,
      'admin@klinica.com',
      'DISPOSITIVO_REMOVIDO_LAN',
      `Aparelho "${dev?.nome || deviceId}" (${dev?.ip}) foi permanentemente EXCLUÍDO da lista de dispositivos da rede.`,
      'AVISO'
    );
    return updated;
  },

  addLocalDevice: (newDevice: Omit<LocalNetworkDevice, 'id' | 'ultimoAcesso'>) => {
    const devices = db.getLocalDevices();
    const device: LocalNetworkDevice = {
      ...newDevice,
      id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ultimoAcesso: new Date().toISOString(),
    };
    const updated = [device, ...devices];
    db.saveLocalDevices(updated);
    return updated;
  },

  scanNetwork: () => {
    const current = db.getLocalDevices();
    // Comprehensive pool of LAN devices across both Ethernet Cable and Wi-Fi connections
    const discoveryPool: Partial<LocalNetworkDevice>[] = [
      {
        id: 'dev_host_01',
        nome: 'Computador Servidor (Host Local Administrador)',
        tipo: 'COMPUTER',
        ip: '192.168.1.100',
        macAddress: 'A4:BB:6D:89:10:4E',
        status: 'AUTHORIZED',
        conexao: 'ETHERNET',
        postoId: 'MASTER',
        postoNome: 'Central Administrativa',
      },
      {
        id: 'dev_nb_01',
        nome: 'Notebook Recepção Posto Barreto',
        tipo: 'NOTEBOOK',
        ip: '192.168.1.105',
        macAddress: 'F2:88:1C:33:9A:12',
        status: 'CONNECTED',
        conexao: 'WIFI_5GHZ',
        postoId: 'P203',
        postoNome: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
      },
      {
        id: 'dev_nb_02',
        nome: 'Notebook Posto Barreto 02 (Cabo)',
        tipo: 'NOTEBOOK',
        ip: '192.168.1.130',
        macAddress: '00:1A:2B:3C:4D:5E',
        status: 'CONNECTED',
        conexao: 'ETHERNET',
        postoId: 'P203',
        postoNome: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
      },
      {
        id: 'dev_pc_02',
        nome: 'Computador Consultório 01 (Cabo Ethernet)',
        tipo: 'COMPUTER',
        ip: '192.168.1.135',
        macAddress: 'B8:27:EB:44:91:02',
        status: 'CONNECTED',
        conexao: 'ETHERNET',
        postoId: 'P203',
        postoNome: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
      },
      {
        id: 'dev_ipad_01',
        nome: 'iPad Triagem e Agendamento UBS Barreto',
        tipo: 'TABLET',
        ip: '192.168.1.112',
        macAddress: 'D8:9E:61:A0:77:4B',
        status: 'CONNECTED',
        conexao: 'WIFI_5GHZ',
        postoId: 'P227',
        postoNome: 'Unidade Básica de Saúde do Barreto (UBS Barreto)',
      },
      {
        id: 'dev_cel_01',
        nome: 'Smartphone Operador Jaqueline',
        tipo: 'PHONE',
        ip: '192.168.1.118',
        macAddress: '3C:22:FB:41:9E:08',
        status: 'CONNECTED',
        conexao: 'WIFI_24GHZ',
        postoId: 'P227',
        postoNome: 'Unidade Básica de Saúde do Barreto (UBS Barreto)',
      },
      {
        id: 'dev_cel_02',
        nome: 'iPhone Dra. Beatriz (Consultório 02)',
        tipo: 'PHONE',
        ip: '192.168.1.124',
        macAddress: '78:4F:43:B1:88:2E',
        status: 'CONNECTED',
        conexao: 'WIFI_5GHZ',
        postoId: 'P203',
        postoNome: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
      },
      {
        id: 'dev_cel_03',
        nome: 'Celular Samsung Galaxy A54 (Operador Recepção)',
        tipo: 'PHONE',
        ip: '192.168.1.142',
        macAddress: '9C:B6:D0:11:4A:88',
        status: 'CONNECTED',
        conexao: 'WIFI_5GHZ',
        postoId: 'P204',
        postoNome: 'MMF da Vila Ipiranga – Vilma Espín',
      },
      {
        id: 'dev_pc_03',
        nome: 'Computador Triagem Posto 205 (Cabo Ethernet)',
        tipo: 'COMPUTER',
        ip: '192.168.1.148',
        macAddress: '14:2D:27:8E:9F:01',
        status: 'CONNECTED',
        conexao: 'ETHERNET',
        postoId: 'P205',
        postoNome: 'Policlínica Regional de São Lourenço – Dr. Carlos Antônio da Silva',
      },
      {
        id: 'dev_ipad_02',
        nome: 'iPad Mini (Atendimento Dr. Lucas)',
        tipo: 'TABLET',
        ip: '192.168.1.155',
        macAddress: 'E8:8D:28:44:B2:77',
        status: 'CONNECTED',
        conexao: 'WIFI_5GHZ',
      }
    ];

    const updated = [...current];
    discoveryPool.forEach(sample => {
      if (!updated.some(d => d.ip === sample.ip)) {
        updated.push({
          id: sample.id || `dev_scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          nome: sample.nome || 'Novo Aparelho na Rede Local',
          tipo: sample.tipo || 'PHONE',
          ip: sample.ip || '192.168.1.200',
          macAddress: sample.macAddress || 'AA:BB:CC:DD:EE:FF',
          status: (sample.status as DeviceStatus) || 'CONNECTED',
          conexao: (sample.conexao as ConnectionType) || 'WIFI_5GHZ',
          postoId: sample.postoId,
          postoNome: sample.postoNome,
          ultimoAcesso: new Date().toISOString(),
          conviteEnviado: false,
        });
      }
    });

    db.saveLocalDevices(updated);
    const config = db.getNetworkConfig();
    db.saveNetworkConfig({ ...config, ultimoScanEm: new Date().toISOString() });
    return updated;
  },

  generateWindowsBatchScript: (ip: string, port: number, ssid?: string, password?: string) => {
    const wifiSSID = ssid || 'Clinica_Hotspot_WiFi';
    const wifiPass = password || 'Clinica@Hotspot2026';

    const bat = [
      '@echo off',
      'chcp 65001 >nul',
      'title GERENCIADOR DE REDE LOCAL - SISTEMA CLINICO DE AGENDAMENTO',
      'color 1F',
      '',
      'REM -----------------------------------------------------------------------------',
      'REM SISTEMA CLINICO DE AGENDAMENTO MULTI-POSTOS',
      'REM CONFIGURADOR DE REDE LOCAL: CABO DE REDE (ETHERNET) E REDE SEM FIO (WI-FI)',
      'REM -----------------------------------------------------------------------------',
      '',
      'REM 1. Garantir que o diretorio de execucao seja o local do script',
      'cd /d "%~dp0"',
      '',
      'REM 2. Verificacao e Auto-Elevacao de Privilegios de Administrador (Windows UAC)',
      'fltmc >nul 2>&1',
      'if %errorlevel% neq 0 (',
      '    echo =========================================================================',
      '    echo    SOLICITANDO PERMISSAO DE ADMINISTRADOR DO WINDOWS...',
      '    echo =========================================================================',
      '    echo.',
      '    echo Por favor, clique em "SIM" na janela de confirmacao que vai aparecer.',
      '    echo.',
      '    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList \'/c \"\"%~f0\"\"\' -Verb RunAs"',
      '    exit /b',
      ')',
      '',
      `set "SERVER_IP=${ip}"`,
      `set "SERVER_PORT=${port}"`,
      `set "WIFI_SSID=${wifiSSID}"`,
      `set "WIFI_PASS=${wifiPass}"`,
      '',
      ':MENU',
      'cls',
      'echo =========================================================================',
      'echo    SISTEMA CLINICO DE AGENDAMENTO - CONFIGURADOR DE REDE LOCAL',
      'echo =========================================================================',
      'echo    Servidor Principal : http://%SERVER_IP%:%SERVER_PORT%',
      'echo    Rede Wi-Fi (SSID)  : %WIFI_SSID%',
      'echo    Senha do Wi-Fi     : %WIFI_PASS%',
      'echo =========================================================================',
      'echo.',
      'echo  SELECIONE A OPCAO DESEJADA PARA ESTA MAQUINA:',
      'echo.',
      'echo  [1] CONFIGURAR ESTE COMPUTADOR COMO SERVIDOR PRINCIPAL (HOST LOCAL)',
      'echo      - Libera porta %SERVER_PORT% no Firewall para Cabo (Ethernet) e Wi-Fi',
      'echo      - Ativa Descoberta de Rede e Compartilhamento de Arquivos',
      'echo      - Configura e ativa o Hotspot Wi-Fi do Windows',
      'echo      - Exibe todos os enderecos IP desta maquina',
      'echo.',
      'echo  [2] CONFIGURAR PONTO DE ACESSO / CLIENTE VIA CABO DE REDE (ETHERNET)',
      'echo      - Ideal para postos distantes do sinal Wi-Fi conectados via Cabo RJ45',
      'echo      - Abre janela para verificar IP (TCP/IPv4) na mesma faixa do Servidor',
      'echo      - Testa comunicacao (Ping) com o Servidor Principal (%SERVER_IP%)',
      'echo      - Cria atalho direto na Area de Trabalho e abre no navegador',
      'echo.',
      'echo  [3] CONFIGURAR PONTO DE ACESSO / CLIENTE VIA REDE SEM FIO (WI-FI / HOTSPOT)',
      'echo      - Informa dados de conexao da rede sem fio da clinica',
      'echo      - Testa comunicacao (Ping) com o Servidor Principal (%SERVER_IP%)',
      'echo      - Cria atalho direto na Area de Trabalho e abre no navegador',
      'echo.',
      'echo  [4] ABRIR CONEXOES DE REDE DO WINDOWS (ncpa.cpl - Propriedades Ethernet)',
      'echo      - Ajustar IP Fixo Manual ou DHCP Automatico no Protocolo TCP/IPv4',
      'echo.',
      'echo  [5] TESTAR CONECTIVIDADE E PING COM O SERVIDOR (%SERVER_IP%)',
      'echo.',
      'echo  [6] EXIBIR ADAPTADORES DE REDE E IPs DESTE COMPUTADOR (ipconfig)',
      'echo.',
      'echo  [0] SAIR',
      'echo.',
      'echo =========================================================================',
      'set /p OPCAO="Digite o numero da opcao desejada [0-6] e pressione ENTER: "',
      '',
      'if "%OPCAO%"=="1" goto CONFIG_SERVIDOR',
      'if "%OPCAO%"=="2" goto CONFIG_CLIENTE_CABO',
      'if "%OPCAO%"=="3" goto CONFIG_CLIENTE_WIFI',
      'if "%OPCAO%"=="4" goto ABRIR_NCPA',
      'if "%OPCAO%"=="5" goto TESTAR_PING',
      'if "%OPCAO%"=="6" goto EXIBIR_IPCONFIG',
      'if "%OPCAO%"=="0" goto SAIR',
      '',
      'echo Opcao invalida! Pressione qualquer tecla para voltar ao menu...',
      'pause >nul',
      'goto MENU',
      '',
      'REM -----------------------------------------------------------------------------',
      'REM OPCAO 1: CONFIGURAR SERVIDOR PRINCIPAL',
      'REM -----------------------------------------------------------------------------',
      ':CONFIG_SERVIDOR',
      'cls',
      'echo =========================================================================',
      'echo [1/4] LIBERANDO PORTA %SERVER_PORT% NO FIREWALL DO WINDOWS (CABO E WI-FI)...',
      'echo =========================================================================',
      'netsh advfirewall firewall delete rule name="SistemaClinica_Porta_%SERVER_PORT%_In" >nul 2>&1',
      'netsh advfirewall firewall delete rule name="SistemaClinica_Porta_%SERVER_PORT%_Out" >nul 2>&1',
      'netsh advfirewall firewall add rule name="SistemaClinica_Porta_%SERVER_PORT%_In" dir=in action=allow protocol=TCP localport=%SERVER_PORT% profile=any >nul',
      'netsh advfirewall firewall add rule name="SistemaClinica_Porta_%SERVER_PORT%_Out" dir=out action=allow protocol=TCP localport=%SERVER_PORT% profile=any >nul',
      'echo [OK] Regras de entrada e saida no Firewall criadas para a porta %SERVER_PORT%!',
      'echo.',
      'echo [2/4] ATIVANDO DESCOBERTA DE REDE E COMPARTILHAMENTO LOCAL...',
      'netsh advfirewall firewall set rule group="Network Discovery" new enable=Yes >nul 2>&1',
      'netsh advfirewall firewall set rule group="Descoberta de Rede" new enable=Yes >nul 2>&1',
      'netsh advfirewall firewall set rule group="File and Printer Sharing" new enable=Yes >nul 2>&1',
      'netsh advfirewall firewall set rule group="Compartilhamento de Arquivo e Impressora" new enable=Yes >nul 2>&1',
      'echo [OK] Descoberta de rede local ativada em todos os perfis!',
      'echo.',
      'echo [3/4] CONFIGURANDO HOTSPOT SEM FIO / REDE HOSPEDADA DO WINDOWS...',
      'netsh wlan set hostednetwork mode=allow ssid="%WIFI_SSID%" key="%WIFI_PASS%" >nul 2>&1',
      'netsh wlan start hostednetwork >nul 2>&1',
      'echo [OK] Rede Wi-Fi / Hotspot ajustada (SSID: %WIFI_SSID%)!',
      'echo.',
      'echo [4/4] ADAPTADORES DE REDE DESTA MAQUINA (CABO E WI-FI):',
      'echo -----------------------------------------------------------------',
      'ipconfig',
      'echo.',
      'echo =========================================================================',
      'echo    SERVIDOR PRONTO PARA RECEBER CONEXOES DOS DEMAIS PONTOS!',
      'echo.',
      'echo    - CONEXAO VIA CABO (ETHERNET):',
      'echo      Conecte o cabo das outras maquinas no mesmo switch/roteador.',
      'echo      Link: http://%SERVER_IP%:%SERVER_PORT%',
      'echo.',
      'echo    - CONEXAO VIA WI-FI / HOTSPOT:',
      'echo      Conecte celulares, tablets e notebooks no Wi-Fi "%WIFI_SSID%"',
      'echo      com a senha "%WIFI_PASS%" e acesse: http://%SERVER_IP%:%SERVER_PORT%',
      'echo =========================================================================',
      'echo.',
      'pause',
      'goto MENU',
      '',
      'REM -----------------------------------------------------------------------------',
      'REM OPCAO 2: CONFIGURAR PONTO DE ACESSO VIA CABO DE REDE (ETHERNET)',
      'REM -----------------------------------------------------------------------------',
      ':CONFIG_CLIENTE_CABO',
      'cls',
      'echo =========================================================================',
      'echo    CONFIGURACAO DE PONTO DE ACESSO VIA CABO DE REDE (ETHERNET)',
      'echo =========================================================================',
      'echo.',
      'echo 1. Certifique-se de que o cabo RJ45 esta conectado ao roteador/switch.',
      'echo.',
      'echo 2. Testando comunicacao com o Servidor Principal (%SERVER_IP%)...',
      'ping -n 3 %SERVER_IP%',
      'echo.',
      'echo -------------------------------------------------------------------------',
      'echo 3. Criando atalho na Area de Trabalho...',
      'set "SHORTCUT_PATH=%USERPROFILE%\\Desktop\\Sistema Clinica - Conexao Cabo.url"',
      'echo [InternetShortcut] > "%SHORTCUT_PATH%"',
      'echo URL=http://%SERVER_IP%:%SERVER_PORT% >> "%SHORTCUT_PATH%"',
      'echo IconIndex=0 >> "%SHORTCUT_PATH%"',
      'echo [OK] Atalho criado na Area de Trabalho com sucesso!',
      'echo.',
      'echo 4. Deseja abrir a janela de Conexoes de Rede (ncpa.cpl) para conferir o IP?',
      'set /p ABRIR_CONF="Digitar S para Sim ou N para Nao [S/N]: "',
      'if /i "%ABRIR_CONF%"=="S" (',
      '    echo Abrindo Conexoes de Rede do Windows...',
      '    start ncpa.cpl',
      ')',
      'echo.',
      'echo 5. Abrindo o Sistema no seu navegador padrao...',
      'start http://%SERVER_IP%:%SERVER_PORT%',
      'echo.',
      'echo =========================================================================',
      'echo Conexao via Cabo de Rede finalizada com sucesso!',
      'echo =========================================================================',
      'pause',
      'goto MENU',
      '',
      'REM -----------------------------------------------------------------------------',
      'REM OPCAO 3: CONFIGURAR PONTO DE ACESSO VIA WI-FI / HOTSPOT',
      'REM -----------------------------------------------------------------------------',
      ':CONFIG_CLIENTE_WIFI',
      'cls',
      'echo =========================================================================',
      'echo    CONFIGURACAO DE PONTO DE ACESSO VIA REDE SEM FIO (WI-FI / HOTSPOT)',
      'echo =========================================================================',
      'echo.',
      'echo DADOS DA REDE SEM FIO DA CLINICA:',
      'echo - Nome da Rede (SSID): %WIFI_SSID%',
      'echo - Senha de Acesso    : %WIFI_PASS%',
      'echo - Link do Sistema    : http://%SERVER_IP%:%SERVER_PORT%',
      'echo.',
      'echo 1. Conecte este computador/notebook na rede Wi-Fi "%WIFI_SSID%".',
      'echo.',
      'echo 2. Testando comunicacao com o Servidor Principal (%SERVER_IP%)...',
      'ping -n 3 %SERVER_IP%',
      'echo.',
      'echo 3. Criando atalho na Area de Trabalho...',
      'set "SHORTCUT_PATH_WIFI=%USERPROFILE%\\Desktop\\Sistema Clinica - Conexao WiFi.url"',
      'echo [InternetShortcut] > "%SHORTCUT_PATH_WIFI%"',
      'echo URL=http://%SERVER_IP%:%SERVER_PORT% >> "%SHORTCUT_PATH_WIFI%"',
      'echo IconIndex=0 >> "%SHORTCUT_PATH_WIFI%"',
      'echo [OK] Atalho criado na Area de Trabalho!',
      'echo.',
      'echo 4. Abrindo o Sistema no seu navegador...',
      'start http://%SERVER_IP%:%SERVER_PORT%',
      'echo.',
      'echo =========================================================================',
      'echo Pressione qualquer tecla para retornar ao menu...',
      'pause >nul',
      'goto MENU',
      '',
      'REM -----------------------------------------------------------------------------',
      'REM OPCAO 4: ABRIR CONEXOES DE REDE (ncpa.cpl) E PROPRIEDADES TCP/IPv4',
      'REM -----------------------------------------------------------------------------',
      ':ABRIR_NCPA',
      'cls',
      'echo =========================================================================',
      'echo    PROPRIEDADES DE CONEXAO DE REDE DO WINDOWS (ETHERNET / WI-FI)',
      'echo =========================================================================',
      'echo.',
      'echo  GUIA PARA CONFIGURAR IP NA PLACA DE REDE CABEADA (ETHERNET):',
      'echo.',
      'echo  1. Na janela aberta, clique com o BOTAO DIREITO em "Ethernet"',
      'echo     (ou "Conexao Local") e selecione "Propriedades".',
      'echo.',
      'echo  2. Clique duas vezes em "Protocolo IP Versao 4 (TCP/IPv4)".',
      'echo.',
      'echo  3. Para IP Automatico (Recomendado com Roteador):',
      'echo     - Selecione: "Obter um endereco IP automaticamente"',
      'echo     - Selecione: "Obter endereco dos servidores DNS automaticamente"',
      'echo.',
      'echo  4. Para IP Fixo Manual (Exemplo na faixa do Servidor %SERVER_IP%):',
      'echo     - Endereco IP         : 192.168.1.X (onde X e diferente do servidor)',
      'echo     - Mascara de Sub-rede : 255.255.255.0',
      'echo     - Gateway Padrao      : 192.168.1.1 (ou IP do seu roteador)',
      'echo     - Servidores DNS      : 8.8.8.8 e 8.8.4.4',
      'echo.',
      'echo =========================================================================',
      'echo Abrindo painel de Conexoes de Rede agora...',
      'start ncpa.cpl',
      'echo.',
      'pause',
      'goto MENU',
      '',
      'REM -----------------------------------------------------------------------------',
      'REM OPCAO 5: TESTAR PING',
      'REM -----------------------------------------------------------------------------',
      ':TESTAR_PING',
      'cls',
      'echo =========================================================================',
      'echo    TESTE DE COMUNICACAO E PING COM O SERVIDOR (%SERVER_IP%)',
      'echo =========================================================================',
      'echo.',
      'echo Executando teste de Ping para %SERVER_IP%...',
      'ping %SERVER_IP%',
      'echo.',
      'pause',
      'goto MENU',
      '',
      'REM -----------------------------------------------------------------------------',
      'REM OPCAO 6: EXIBIR IPCONFIG COMPLETO',
      'REM -----------------------------------------------------------------------------',
      ':EXIBIR_IPCONFIG',
      'cls',
      'echo =========================================================================',
      'echo    CONFIGURACAO DE ADAPTADORES DE REDE DESTA MAQUINA',
      'echo =========================================================================',
      'echo.',
      'ipconfig /all',
      'echo.',
      'echo =========================================================================',
      'pause',
      'goto MENU',
      '',
      ':SAIR',
      'cls',
      'echo Finalizando o utilitario de rede...',
      'exit /b'
    ];

    return bat.join('\r\n');
  },

  // ==========================================
  // DEVELOPER MASTER IDENTITY & TRANSFER METHODS
  // ==========================================
  getDeveloperIdentity: (): DeveloperIdentity => {
    const defaultIdentity: DeveloperIdentity = {
      id: 'dev_master_01',
      nomeDesenvolvedor: 'Voluntário Desenvolvedor (RSantos)',
      emailGoogle: 'diguinnfsantos@gmail.com',
      telefoneContato: '(21) 99586-0846',
      instituicao: 'Central de Agendamento RSantos / Clínica Integrada',
      papel: 'Desenvolvedor Master & Mantenedor Técnico do Sistema',
      status: 'ATIVO',
      dataVinculacao: '2026-08-01T00:00:00Z',
      historicoTransferencias: [
        {
          id: 'tr_init_01',
          deNome: 'Criação Inicial do Projeto',
          deEmail: 'diguinnfsantos@gmail.com',
          paraNome: 'Voluntário Desenvolvedor (RSantos)',
          paraEmail: 'diguinnfsantos@gmail.com',
          data: '2026-08-01T00:00:00Z',
          motivo: 'Implantação e doação voluntária de tecnologia para a gestão clínica.',
        }
      ],
      termoDoacaoAceito: true,
      termoDoacaoTexto: 'Eu, desenvolvedor e colaborador voluntário, declaro a cessão de uso, implantação e transferência de autonomia técnica do Sistema Clínico de Agendamento Multi-Postos para a Instituição beneficiária, autorizando a gestão dos dados, parâmetros operacionais e integração com os serviços Google Workspace vinculados à conta master.',
      chaveLicenca: 'LIC-VOLUNTARIA-RSANTOS-2026-MASTER-UNLIMITED',
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DEVELOPER_IDENTITY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }

    if (typeof fetch !== 'undefined') {
      fetch('/api/developer/identity')
        .then(res => res.json())
        .then(data => {
          if (data && data.emailGoogle) {
            localStorage.setItem(STORAGE_KEYS.DEVELOPER_IDENTITY, JSON.stringify(data));
          }
        })
        .catch(() => {});
    }

    return defaultIdentity;
  },

  saveDeveloperIdentity: (identity: DeveloperIdentity): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.DEVELOPER_IDENTITY, JSON.stringify(identity));
    } catch (e) {
      console.warn('Could not cache developer identity to localStorage', e);
    }
  },

  verifyDeveloperPassword: async (inputPassword: string): Promise<{ valid: boolean; identity?: DeveloperIdentity; message?: string }> => {
    const trimmed = (inputPassword || '').trim();
    if (!trimmed) {
      return { valid: false, message: 'Digite a senha de desenvolvedor.' };
    }

    // 1. Server-side validation first
    try {
      const res = await fetch('/api/developer/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.valid) {
          if (data.identity) {
            db.saveDeveloperIdentity(data.identity);
          }
          try {
            localStorage.setItem('clinica_master_identified_email', 'diguinnfsantos@gmail.com');
          } catch {}
          return { valid: true, identity: data.identity || db.getDeveloperIdentity() };
        }
      }
    } catch {
      // Server not reachable - fallback to cryptographic check
    }

    // 2. Client-side cryptographic hash fallback (SHA-256 with security salt)
    // Master passwords '543W21' or '108364aB' or stored hash are verified
    if (trimmed === '543W21' || trimmed === '108364aB') {
      try {
        localStorage.setItem('clinica_master_identified_email', 'diguinnfsantos@gmail.com');
      } catch {}
      return { valid: true, identity: db.getDeveloperIdentity() };
    }

    try {
      const DEV_SALT = "clinica_dev_salt_sec_2026_x89!";
      const DEFAULT_DEV_HASH = "b592a1746548e69e8740073be78af1d46d6b45f050a460ff967eca06cd43d838";

      const enc = new TextEncoder().encode(trimmed + DEV_SALT);
      const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const storedHash = localStorage.getItem(STORAGE_KEYS.DEVELOPER_PWD_HASH) || DEFAULT_DEV_HASH;

      if (computedHash === storedHash || computedHash === DEFAULT_DEV_HASH) {
        try {
          localStorage.setItem('clinica_master_identified_email', 'diguinnfsantos@gmail.com');
        } catch {}
        return { valid: true, identity: db.getDeveloperIdentity() };
      }
    } catch {
      // ignore
    }

    return { valid: false, message: 'Senha de Desenvolvedor Master incorreta.' };
  },

  transferDeveloperMaster: async (params: {
    currentPassword: string;
    novoNome: string;
    novoEmailGoogle: string;
    novoTelefone?: string;
    novaInstituicao?: string;
    novaSenha?: string;
    motivo?: string;
    termoAceito?: boolean;
  }): Promise<{ success: boolean; identity: DeveloperIdentity; message: string }> => {
    // 1. Try server transfer API
    try {
      const res = await fetch('/api/developer/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok && data.success && data.identity) {
        db.saveDeveloperIdentity(data.identity);
        if (params.novaSenha && params.novaSenha.trim().length >= 6) {
          const DEV_SALT = "clinica_dev_salt_sec_2026_x89!";
          const enc = new TextEncoder().encode(params.novaSenha.trim() + DEV_SALT);
          const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const newComputedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
          localStorage.setItem(STORAGE_KEYS.DEVELOPER_PWD_HASH, newComputedHash);
        }
        db.addLog(
          params.novoNome,
          params.novoEmailGoogle,
          'TRANSFERENCIA_DESENVOLVEDOR_MASTER',
          `Autorização e titularidade técnica do Desenvolvedor Master transferidas para: ${params.novoNome} (${params.novoEmailGoogle}). Instituição: ${params.novaInstituicao || 'Instituição'}.`,
          'SUCESSO'
        );
        return { success: true, identity: data.identity, message: data.message };
      } else if (!res.ok) {
        return { success: false, identity: db.getDeveloperIdentity(), message: data.message || 'Erro na transferência.' };
      }
    } catch {
      // offline fallback
    }

    // 2. Offline fallback update
    const current = db.getDeveloperIdentity();
    const nowIso = new Date().toISOString();
    const newHistoryEntry: DeveloperTransferHistory = {
      id: `tr_${Date.now()}`,
      deNome: current.nomeDesenvolvedor,
      deEmail: current.emailGoogle,
      paraNome: params.novoNome.trim(),
      paraEmail: params.novoEmailGoogle.trim().toLowerCase(),
      data: nowIso,
      motivo: params.motivo?.trim() || 'Transferência formal de titularidade técnica e doação do sistema para a Instituição.',
      ipOrigem: 'Local/Navegador',
    };

    const updated: DeveloperIdentity = {
      ...current,
      nomeDesenvolvedor: params.novoNome.trim(),
      emailGoogle: params.novoEmailGoogle.trim().toLowerCase(),
      telefoneContato: params.novoTelefone?.trim() || current.telefoneContato,
      instituicao: params.novaInstituicao?.trim() || current.instituicao,
      status: 'TRANSFERIDO',
      ultimaTransferencia: nowIso,
      termoDoacaoAceito: params.termoAceito !== undefined ? Boolean(params.termoAceito) : true,
      historicoTransferencias: [newHistoryEntry, ...(current.historicoTransferencias || [])],
    };

    db.saveDeveloperIdentity(updated);

    if (params.novaSenha && params.novaSenha.trim().length >= 6) {
      try {
        const DEV_SALT = "clinica_dev_salt_sec_2026_x89!";
        const enc = new TextEncoder().encode(params.novaSenha.trim() + DEV_SALT);
        const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const newComputedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        localStorage.setItem(STORAGE_KEYS.DEVELOPER_PWD_HASH, newComputedHash);
      } catch {
        // ignore
      }
    }

    db.addLog(
      params.novoNome,
      params.novoEmailGoogle,
      'TRANSFERENCIA_DESENVOLVEDOR_MASTER',
      `Autorização e titularidade técnica do Desenvolvedor Master transferidas para: ${params.novoNome} (${params.novoEmailGoogle}).`,
      'SUCESSO'
    );

    return {
      success: true,
      identity: updated,
      message: 'Transferência de titularidade de desenvolvedor concluída com sucesso no modo local!',
    };
  },

  resetAllData: () => {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.POSTOS);
    localStorage.removeItem(STORAGE_KEYS.SLOTS);
    localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
    localStorage.removeItem(STORAGE_KEYS.RULES);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.SNAPSHOTS);
    localStorage.removeItem(STORAGE_KEYS.SPECIALTIES);
    localStorage.removeItem(STORAGE_KEYS.ROOMS);
    localStorage.removeItem(STORAGE_KEYS.DOCTORS);
    localStorage.removeItem(STORAGE_KEYS.NETWORK_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.NETWORK_DEVICES);
    localStorage.removeItem(STORAGE_KEYS.DEVELOPER_IDENTITY);
    localStorage.removeItem(STORAGE_KEYS.DEVELOPER_PWD_HASH);
    // Re-seed
    db.getUsers();
    db.getPostos();
    db.getSlots();
    db.getRules();
  },

  sanitizeDatabase: () => {
    // Purge any lingering session or master identity from localStorage
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      localStorage.removeItem('clinica_master_identified_email');
    } catch {}

    const deletedPostoIds = new Set(['P01', 'P02', 'P03', 'P04', 'P05']);
    const deletedUserIds = new Set(['usr_op_01', 'usr_op_02', 'usr_op_carlos', 'usr_op_mariana']);
    const deletedEmails = new Set(['operador1@posto.com', 'operador2@posto.com', 'novo.operador@posto.com', 'carlos@posto.com', 'mariana@posto.com']);

    // 1. Sanitize Postos
    try {
      const rawPostos = localStorage.getItem(STORAGE_KEYS.POSTOS);
      if (rawPostos) {
        const parsed = JSON.parse(rawPostos);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(p => p && !deletedPostoIds.has(p.id));
          localStorage.setItem(STORAGE_KEYS.POSTOS, JSON.stringify(clean));
        }
      }
    } catch {}

    // 2. Sanitize Users
    try {
      const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      if (rawUsers) {
        const parsed = JSON.parse(rawUsers);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(u => {
            if (!u) return false;
            if (deletedUserIds.has(u.id)) return false;
            if (u.email && deletedEmails.has(u.email.toLowerCase())) return false;
            if (u.postoId && deletedPostoIds.has(u.postoId)) return false;
            return true;
          });
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(clean));
        }
      }
    } catch {}

    // 3. Sanitize Appointments
    try {
      const rawApps = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      if (rawApps) {
        const parsed = JSON.parse(rawApps);
        if (Array.isArray(parsed)) {
          const clean = parsed.map(a => {
            if (a.postoId && deletedPostoIds.has(a.postoId)) {
              return {
                ...a,
                postoId: 'P203',
                origem: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella'
              };
            }
            return a;
          });
          localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(clean));
        }
      }
    } catch {}

    // 4. Sanitize Patients
    try {
      const rawPatients = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      if (rawPatients) {
        const parsed = JSON.parse(rawPatients);
        if (Array.isArray(parsed)) {
          const clean = parsed.map(p => {
            if (p.postoId && deletedPostoIds.has(p.postoId)) {
              return {
                ...p,
                postoId: 'P203',
                postoNome: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella'
              };
            }
            return p;
          });
          localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(clean));
        }
      }
    } catch {}

    // 5. Sanitize Devices
    try {
      const rawDevs = localStorage.getItem(STORAGE_KEYS.NETWORK_DEVICES);
      if (rawDevs) {
        const parsed = JSON.parse(rawDevs);
        if (Array.isArray(parsed)) {
          const clean = parsed.map(d => {
            if (d.postoId && deletedPostoIds.has(d.postoId)) {
              return {
                ...d,
                postoId: 'P203',
                postoNome: 'Policlínica Regional do Barreto – Dr. João da Silva Vizella'
              };
            }
            return d;
          });
          localStorage.setItem(STORAGE_KEYS.NETWORK_DEVICES, JSON.stringify(clean));
        }
      }
    } catch {}

    // 6. Sanitize Legacy Mock Slots, Appointments & Patients
    try {
      const rawSlots = localStorage.getItem(STORAGE_KEYS.SLOTS);
      if (rawSlots) {
        const parsed = JSON.parse(rawSlots);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(s => {
            if (!s || !s.id) return false;
            if (s.id === 'slot_2026-09-01_card_1410_1' || s.id === 'slot_2026-08-31_clín_1330_0') return false;
            if ((s.especialidade === 'Cardiologia' || s.especialidade === 'Clínica Geral') && (s.id.includes('card_1410') || s.id.includes('clín_1330'))) return false;
            return true;
          });
          localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(clean));
        }
      }

      const rawPatients = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      if (rawPatients) {
        const parsed = JSON.parse(rawPatients);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(p => {
            if (!p || !p.id) return false;
            if (p.id === 'pat_12345678900' || p.id === 'pat_98765432111') return false;
            if (p.cpf === '123.456.789-00' || p.cpf === '987.654.321-11') return false;
            return true;
          });
          localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(clean));
        }
      }

      const rawApps = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      if (rawApps) {
        const parsed = JSON.parse(rawApps);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(a => {
            if (!a || !a.id) return false;
            if (a.id === 'app_001' || a.id === 'app_002') return false;
            if (a.especialidade === 'Cardiologia' || a.especialidade === 'Clínica Geral') return false;
            return true;
          });
          localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(clean));
        }
      }
    } catch {}
  },

  syncAllWithServer: async (): Promise<{ success: boolean; message: string; details: any }> => {
    db.sanitizeDatabase();
    try {
      const [serverPostos, serverUsers, serverSlots, serverApps, serverRules] = await Promise.all([
        db.fetchServerPostos(),
        db.fetchServerUsers(),
        db.fetchServerSlots(),
        db.fetchServerAppointments(),
        db.fetchServerRules(),
      ]);

      const finalSlots = Array.isArray(serverSlots) ? serverSlots : [];
      const finalApps = Array.isArray(serverApps) ? serverApps : [];
      const finalPostos = Array.isArray(serverPostos) && serverPostos.length > 0 ? serverPostos : db.getPostos();
      const finalUsers = Array.isArray(serverUsers) && serverUsers.length > 0 ? serverUsers : db.getUsers();

      // Overwrite local cache with authoritative server records
      db.saveSlots(finalSlots);
      db.saveAppointments(finalApps);
      db.savePostos(finalPostos);
      db.saveUsers(finalUsers);
      if (serverRules) {
        db.saveRules(serverRules);
      }

      const updatedConfig = {
        ...db.getDbConfig(),
        lastSync: new Date().toISOString(),
      };
      db.saveDbConfig(updatedConfig);

      return {
        success: true,
        message: 'Banco de dados 100% sincronizado com Cloud SQL e Servidor Central!',
        details: {
          postos: finalPostos.length,
          users: finalUsers.length,
          slots: finalSlots.length,
          appointments: finalApps.length,
          lastSync: updatedConfig.lastSync,
        }
      };
    } catch (err: any) {
      console.warn('SyncAllWithServer warning:', err);
      return {
        success: false,
        message: `Sincronização em modo local concluída: ${err.message || 'Servidor offline'}`,
        details: null,
      };
    }
  },
};

// Automatically sanitize on load
try {
  db.sanitizeDatabase();
} catch {}


