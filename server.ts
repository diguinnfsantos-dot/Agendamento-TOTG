import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { db, isDbConfigured } from "./src/db/index.ts";
import { users, postos, slots, appointments, systemRules, auditLogs, workspaceSyncs } from "./src/db/schema.ts";
import { eq, desc, ne, and, or } from "drizzle-orm";

const app = express();
const PORT = 3000;

// Set realistic payload limit (10MB) to protect server memory on free/low-tier hosting
app.use(express.json({ limit: "10mb" }));

// Enable CORS for external hosting (Netlify, custom domains, local clients)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// ----------------------------------------------------
// Persistent Server State File
// ----------------------------------------------------
const STATE_FILE_PATH = path.join(process.cwd(), "server_state.json");

const DEFAULT_USERS = [
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

const DEFAULT_RULES = {
  nomeClinica: 'Central de Agendamento RSantos',
  telefoneClinica: '(21) 995860846',
  enderecoClinica: 'Rua Dr. Luiz Palmier, 726 - Barreto, Niterói - RJ, CEP 24110-310',
  maxVagasPorId: 4,
  diasParaRepescagemVencimento: 5,
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
};

const DEFAULT_DOCTORS_LIST = [
  'Dr. Fernando Dias',
  'Dra. Beatriz Santos',
  'Dr. Lucas Silveira',
  'Dra. Camila Ramos',
  'Dra. Helena Martins',
  'Dr. Marcelo Viana',
  'Dra. Vanessa Costa',
  'Dr. Carlos Mendonça',
  'Dra. Mariana Costa',
  'Dr. Floriano Peixoto',
  'Dr. Roberto Mendes',
];

const DEFAULT_POSTOS = [
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

// ----------------------------------------------------
// Active Sessions & Single-Session Concurrency Control
// ----------------------------------------------------
interface ActiveSessionRecord {
  sessionId: string;
  userId: string;
  email: string;
  nome: string;
  role: string;
  postoId?: string;
  origem?: string;
  lastActiveAt: number; // timestamp ms
  loggedInAt: string;
  deviceHint: string;
  ip?: string;
}

// Map of userId / email (lowercase) -> ActiveSessionRecord
const activeSessions = new Map<string, ActiveSessionRecord>();
let revokedSessionsSet = new Set<string>();
const SESSION_ONLINE_THRESHOLD_MS = 60000; // 60 seconds without heartbeat = offline

// Format time ago for UX display
function formatSecondsAgo(seconds: number): string {
  if (seconds < 5) return 'agora mesmo';
  if (seconds < 60) return `há ${seconds} segundos`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return 'há 1 minuto';
  if (minutes < 60) return `há ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  return `há ${hours} hora(s)`;
}

interface DeveloperIdentityRecord {
  id: string;
  nomeDesenvolvedor: string;
  emailGoogle: string;
  telefoneContato: string;
  instituicao: string;
  papel: string;
  status: 'ATIVO' | 'TRANSFERIDO' | 'HOMOLOGADO';
  dataVinculacao: string;
  ultimaTransferencia?: string;
  historicoTransferencias: {
    id: string;
    deNome: string;
    deEmail: string;
    paraNome: string;
    paraEmail: string;
    data: string;
    motivo: string;
    ipOrigem?: string;
  }[];
  termoDoacaoAceito: boolean;
  termoDoacaoTexto: string;
  chaveLicenca: string;
}

// Salt for secure developer authentication
const DEV_SALT = "clinica_dev_salt_sec_2026_x89!";

function hashDevPassword(pwd: string): string {
  return crypto.createHash("sha256").update((pwd || '').trim() + DEV_SALT).digest("hex");
}

const DEFAULT_DEV_PWD_HASH = hashDevPassword("108364aB");

const DEFAULT_DEVELOPER_IDENTITY: DeveloperIdentityRecord = {
  id: "dev_master_01",
  nomeDesenvolvedor: "Voluntário Desenvolvedor (RSantos)",
  emailGoogle: "diguinnfsantos@gmail.com",
  telefoneContato: "(21) 99586-0846",
  instituicao: "Central de Agendamento RSantos / Clínica Integrada",
  papel: "Desenvolvedor Master & Mantenedor Técnico do Sistema",
  status: "ATIVO",
  dataVinculacao: "2026-08-01T00:00:00Z",
  historicoTransferencias: [
    {
      id: "tr_init_01",
      deNome: "Criação Inicial do Projeto",
      deEmail: "diguinnfsantos@gmail.com",
      paraNome: "Voluntário Desenvolvedor (RSantos)",
      paraEmail: "diguinnfsantos@gmail.com",
      data: "2026-08-01T00:00:00Z",
      motivo: "Implantação e doação voluntária de tecnologia para a gestão clínica.",
    }
  ],
  termoDoacaoAceito: true,
  termoDoacaoTexto: "Eu, desenvolvedor e colaborador voluntário, declaro a cessão de uso, implantação e transferência de autonomia técnica do Sistema Clínico de Agendamento Multi-Postos para a Instituição beneficiária, autorizando a gestão dos dados, parâmetros operacionais e integração com os serviços Google Workspace vinculados à conta master.",
  chaveLicenca: "LIC-VOLUNTARIA-RSANTOS-2026-MASTER-UNLIMITED",
};

interface ServerState {
  users: any[];
  bannedAdminEmails: string[];
  deletedUserIds?: string[];
  deletedUserEmails?: string[];
  rules: any;
  masterCustomized: boolean;
  doctors?: string[];
  specialties?: string[];
  rooms?: string[];
  activeSessions?: Record<string, ActiveSessionRecord>;
  revokedSessionIds?: string[];
  developerIdentity?: DeveloperIdentityRecord;
  developerPasswordHash?: string;
  slots?: any[];
  appointments?: any[];
}

let serverState: ServerState = {
  users: [...DEFAULT_USERS],
  bannedAdminEmails: [],
  deletedUserIds: ['usr_op_01', 'usr_op_02', 'usr_op_03'],
  deletedUserEmails: ['operador1@posto.com', 'operador2@posto.com', 'novo.operador@posto.com'],
  rules: { ...DEFAULT_RULES },
  masterCustomized: false,
  doctors: [...DEFAULT_DOCTORS_LIST],
  activeSessions: {},
  revokedSessionIds: [],
  developerIdentity: { ...DEFAULT_DEVELOPER_IDENTITY },
  developerPasswordHash: DEFAULT_DEV_PWD_HASH,
  slots: [],
  appointments: [],
};

// Load saved state from filesystem on boot
function loadServerState() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const data = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.users)) {
        // Merge default doctors with any saved doctors
        const docSet = new Set<string>(DEFAULT_DOCTORS_LIST);
        if (Array.isArray(parsed.doctors)) {
          parsed.doctors.forEach((d: string) => docSet.add(d));
        }

        const loadedRules = parsed.rules || { ...DEFAULT_RULES };
        if (loadedRules.nomeClinica === 'Centro Médico Integrado São Camilo' || !loadedRules.nomeClinica) {
          loadedRules.nomeClinica = 'Central de Agendamento RSantos';
        }
        if (!loadedRules.enderecoClinica || loadedRules.enderecoClinica.includes('Av. Paulista') || loadedRules.enderecoClinica.includes('Bela Vista')) {
          loadedRules.enderecoClinica = 'Rua Dr. Luiz Palmier, 726 - Barreto, Niterói - RJ, CEP 24110-310';
        }
        if (!loadedRules.telefoneClinica || loadedRules.telefoneClinica === '(11) 3456-7890') {
          loadedRules.telefoneClinica = '(21) 995860846';
        }
        if (!loadedRules.cotasPorEspecialidade || Object.keys(loadedRules.cotasPorEspecialidade).length === 0) {
          loadedRules.cotasPorEspecialidade = { ...DEFAULT_RULES.cotasPorEspecialidade };
        }
        if (loadedRules.diasParaRepescagemVencimento === undefined || loadedRules.diasParaRepescagemVencimento === null) {
          loadedRules.diasParaRepescagemVencimento = 5;
        }

        // Restore active sessions map
        if (parsed.activeSessions && typeof parsed.activeSessions === 'object') {
          for (const [k, v] of Object.entries(parsed.activeSessions)) {
            if (v && typeof v === 'object') {
              activeSessions.set(k.toLowerCase(), v as ActiveSessionRecord);
            }
          }
        }

        // Restore revoked sessions
        if (Array.isArray(parsed.revokedSessionIds)) {
          revokedSessionsSet = new Set(parsed.revokedSessionIds);
        }

        const tombstoneIds = new Set<string>(['usr_op_01', 'usr_op_02', 'usr_op_03', ...(parsed.deletedUserIds || [])]);
        const tombstoneEmails = new Set<string>(['operador1@posto.com', 'operador2@posto.com', 'novo.operador@posto.com', ...(parsed.deletedUserEmails || []).map((e: string) => e.toLowerCase())]);

        const filteredUsers = parsed.users.filter((u: any) => {
          if (!u || !u.email) return false;
          const emailLower = u.email.toLowerCase();
          if (tombstoneEmails.has(emailLower) || tombstoneIds.has(u.id)) return false;
          if (u.role === 'OPERATOR' && ['P01', 'P02', 'P03', 'P04', 'P05'].includes(u.postoId)) return false;
          return true;
        });

        const filteredSlots = (Array.isArray(parsed.slots) ? parsed.slots : []).filter((s: any) => {
          if (!s || !s.id) return false;
          if (s.id === 'slot_2026-09-01_card_1410_1' || s.id === 'slot_2026-08-31_clín_1330_0') return false;
          if ((s.especialidade === 'Cardiologia' || s.especialidade === 'Clínica Geral') && (s.id.includes('card_1410') || s.id.includes('clín_1330'))) return false;
          return true;
        });

        serverState = {
          users: filteredUsers,
          bannedAdminEmails: parsed.bannedAdminEmails || [],
          deletedUserIds: Array.from(tombstoneIds),
          deletedUserEmails: Array.from(tombstoneEmails),
          rules: loadedRules,
          masterCustomized: Boolean(parsed.masterCustomized),
          doctors: Array.from(docSet),
          specialties: parsed.specialties || undefined,
          rooms: parsed.rooms || undefined,
          activeSessions: parsed.activeSessions || {},
          revokedSessionIds: Array.from(revokedSessionsSet),
          developerIdentity: parsed.developerIdentity || { ...DEFAULT_DEVELOPER_IDENTITY },
          developerPasswordHash: parsed.developerPasswordHash || DEFAULT_DEV_PWD_HASH,
          slots: filteredSlots,
          appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
        };
        console.log(`[Server Persistence] State loaded successfully (${serverState.users.length} users, ${serverState.doctors.length} doctors, ${serverState.slots?.length || 0} slots, activeSessions=${activeSessions.size}).`);
        return;
      }
    }
  } catch (err) {
    console.warn("[Server Persistence] Could not read state file, using initial defaults:", err);
  }
}


// Persist server state to filesystem
function saveServerState() {
  try {
    const serializedSessions: Record<string, ActiveSessionRecord> = {};
    for (const [k, v] of activeSessions.entries()) {
      serializedSessions[k] = v;
    }
    serverState.activeSessions = serializedSessions;
    serverState.revokedSessionIds = Array.from(revokedSessionsSet).slice(-200);

    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(serverState, null, 2), "utf-8");
  } catch (err) {
    console.error("[Server Persistence] Failed to write state file:", err);
  }
}

// Initialize state
loadServerState();

// ----------------------------------------------------
// System Rules Endpoints
// ----------------------------------------------------
app.get("/api/rules", async (req: Request, res: Response) => {
  try {
    // Try Cloud SQL first
    try {
      const dbRules = await db.select().from(systemRules).limit(1);
      if (dbRules && dbRules.length > 0) {
        const r = dbRules[0];
        const combined = {
          ...serverState.rules,
          nomeClinica: r.nomeClinica,
          telefoneClinica: r.telefoneClinica,
          enderecoClinica: r.enderecoClinica,
          maxVagasPorId: r.maxVagasPorId,
          mensagemPadraoWhatsApp: r.mensagemPadraoWhatsApp,
        };
        serverState.rules = combined;
        return res.json(combined);
      }
    } catch {
      // ignore
    }
    return res.json(serverState.rules);
  } catch (error: any) {
    res.json(serverState.rules);
  }
});

app.post("/api/rules", async (req: Request, res: Response) => {
  try {
    const updatedRules = req.body;
    serverState.rules = {
      ...serverState.rules,
      ...updatedRules,
    };
    saveServerState();

    // Persist to Cloud SQL
    try {
      await db.insert(systemRules).values({
        id: 1,
        nomeClinica: serverState.rules.nomeClinica || 'Centro Médico',
        telefoneClinica: serverState.rules.telefoneClinica || '',
        enderecoClinica: serverState.rules.enderecoClinica || '',
        maxVagasPorId: serverState.rules.maxVagasPorId || 3,
        mensagemPadraoWhatsApp: serverState.rules.mensagemPadraoWhatsApp || '',
      }).onConflictDoUpdate({
        target: systemRules.id,
        set: {
          nomeClinica: serverState.rules.nomeClinica,
          telefoneClinica: serverState.rules.telefoneClinica,
          enderecoClinica: serverState.rules.enderecoClinica,
          maxVagasPorId: serverState.rules.maxVagasPorId,
          mensagemPadraoWhatsApp: serverState.rules.mensagemPadraoWhatsApp,
        }
      });
    } catch (sqlErr) {
      console.warn("Could not save rules to SQL (file persistence saved):", sqlErr);
    }

    res.json({ success: true, rules: serverState.rules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// Doctors Catalog Endpoints
// ----------------------------------------------------
app.get("/api/doctors", (req: Request, res: Response) => {
  const docSet = new Set<string>(DEFAULT_DOCTORS_LIST);
  if (Array.isArray(serverState.doctors)) {
    serverState.doctors.forEach(d => docSet.add(d));
  }
  res.json(Array.from(docSet).sort());
});

app.post("/api/doctors", (req: Request, res: Response) => {
  try {
    const list = req.body;
    const docSet = new Set<string>(DEFAULT_DOCTORS_LIST);
    if (Array.isArray(list)) {
      list.forEach((d: string) => {
        if (typeof d === 'string' && d.trim()) docSet.add(d.trim());
      });
    }
    serverState.doctors = Array.from(docSet).sort();
    saveServerState();
    res.json({ success: true, doctors: serverState.doctors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// Master Admin Profile Update & Purge Endpoint
// ----------------------------------------------------
app.post("/api/admin/master-profile", async (req: Request, res: Response) => {
  try {
    const { oldEmail, newEmail, nome, senha } = req.body;
    if (!newEmail || !nome || !senha) {
      return res.status(400).json({ success: false, message: "Nome, Email e Senha são obrigatórios." });
    }

    const cleanNewEmail = newEmail.trim().toLowerCase();
    const cleanOldEmail = oldEmail ? oldEmail.trim().toLowerCase() : '';

    // Register previous email and initial default admin email into banned list
    const banned = new Set(serverState.bannedAdminEmails);
    if (cleanOldEmail && cleanOldEmail !== cleanNewEmail) {
      banned.add(cleanOldEmail);
    }
    if (cleanNewEmail !== 'admin@klinica.com') {
      banned.add('admin@klinica.com');
    }
    serverState.bannedAdminEmails = Array.from(banned);

    // Create the updated master admin object
    const updatedMasterUser = {
      id: 'usr_admin_master',
      email: cleanNewEmail,
      senha: senha.trim(),
      nome: nome.trim(),
      role: 'ADMIN',
      status: 'ACTIVE',
      criadoEm: new Date().toISOString(),
    };

    // Remove ALL other ADMIN accounts and any accounts with banned emails
    const nonAdminUsers = serverState.users.filter(u => 
      u.role !== 'ADMIN' && 
      !banned.has(u.email.toLowerCase()) && 
      u.email.toLowerCase() !== cleanNewEmail
    );

    serverState.users = [updatedMasterUser, ...nonAdminUsers];
    serverState.masterCustomized = true;
    saveServerState();

    // Update in Cloud SQL: delete old admin and insert/update new one
    try {
      await db.delete(users).where(eq(users.role, 'ADMIN'));
      if (cleanOldEmail) {
        await db.delete(users).where(eq(users.email, cleanOldEmail));
      }
      await db.insert(users).values({
        uid: updatedMasterUser.id,
        email: updatedMasterUser.email,
        senha: updatedMasterUser.senha,
        nome: updatedMasterUser.nome,
        role: 'ADMIN',
        status: 'ACTIVE',
        criadoEm: updatedMasterUser.criadoEm,
      }).onConflictDoUpdate({
        target: users.email,
        set: {
          nome: updatedMasterUser.nome,
          senha: updatedMasterUser.senha,
          role: 'ADMIN',
          status: 'ACTIVE',
        }
      });
    } catch (sqlErr) {
      console.warn("SQL master update fallback (file persistence active):", sqlErr);
    }

    res.json({
      success: true,
      message: "Credenciais do Administrador Master atualizadas e dados anteriores excluídos definitivamente.",
      user: updatedMasterUser,
      users: serverState.users,
    });
  } catch (error: any) {
    console.error("Error updating master profile:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// Users & Operators Endpoints
// ----------------------------------------------------

// Helper to safely merge users from memory/file and Cloud SQL without losing any operator
async function getMergedUsersList(): Promise<any[]> {
  let dbUserList: any[] = [];
  try {
    dbUserList = await db.select().from(users).orderBy(desc(users.id));
  } catch (sqlErr) {
    // ignore sql error, file state will be used
  }

  const bannedSet = new Set(serverState.bannedAdminEmails.map(e => e.toLowerCase()));
  const deletedEmails = new Set((serverState.deletedUserEmails || []).map(e => e.toLowerCase()));
  const deletedIds = new Set(serverState.deletedUserIds || []);
  const map = new Map<string, any>();

  // 1. Add all users from current server state (file & memory)
  if (Array.isArray(serverState.users)) {
    for (const u of serverState.users) {
      if (u && u.email) {
        const emailKey = u.email.toLowerCase();
        if (!bannedSet.has(emailKey) && !deletedEmails.has(emailKey) && !deletedIds.has(u.id)) {
          map.set(emailKey, u);
        }
      }
    }
  }

  // 2. Merge all users from Cloud SQL
  if (dbUserList && dbUserList.length > 0) {
    for (const u of dbUserList) {
      if (u && u.email) {
        const key = u.email.toLowerCase();
        if (!bannedSet.has(key) && !deletedEmails.has(key) && !deletedIds.has(u.uid) && !deletedIds.has(`usr_${u.id}`)) {
          const existing = map.get(key);
          const mappedUser = {
            id: u.uid || existing?.id || `usr_${u.id}`,
            email: u.email,
            senha: u.senha || existing?.senha || '12345A',
            nome: u.nome || existing?.nome || 'Operador',
            telefone: u.telefone || existing?.telefone || '',
            role: u.role || existing?.role || 'OPERATOR',
            postoId: (u.postoId && !['P01', 'P02', 'P03', 'P04', 'P05'].includes(u.postoId)) ? u.postoId : (existing?.postoId && !['P01', 'P02', 'P03', 'P04', 'P05'].includes(existing?.postoId) ? existing?.postoId : 'P203'),
            origem: (u.origem && !u.origem.includes('Posto Central') && !u.origem.includes('UBS Santa Rosa') && !u.origem.includes('Ambulatório Fonseca')) ? u.origem : (existing?.origem || 'Policlínica Regional do Barreto – Dr. João da Silva Vizella'),
            status: u.status || existing?.status || 'PENDING',
            criadoEm: u.criadoEm || existing?.criadoEm || new Date().toISOString(),
          };
          map.set(key, mappedUser);
        }
      }
    }
  }

  // 3. Enforce custom Master Admin if customized
  const currentMaster = serverState.users.find(u => u.role === 'ADMIN');
  if (currentMaster) {
    if (!currentMaster.postoId || ['P01', 'P02', 'P03', 'P04', 'P05'].includes(currentMaster.postoId)) {
      currentMaster.postoId = 'P203';
      currentMaster.origem = 'Policlínica Regional do Barreto – Dr. João da Silva Vizella';
    }
    map.set(currentMaster.email.toLowerCase(), currentMaster);
  }

  const merged = Array.from(map.values());
  serverState.users = merged;
  saveServerState();

  // 4. Back-propagate to Cloud SQL asynchronously so database is always complete
  for (const u of merged) {
    try {
      await db.insert(users).values({
        uid: u.id,
        email: u.email,
        senha: u.senha,
        nome: u.nome,
        telefone: u.telefone || null,
        role: u.role,
        postoId: u.postoId,
        origem: u.origem,
        status: u.status,
        criadoEm: u.criadoEm,
      }).onConflictDoUpdate({
        target: users.email,
        set: {
          nome: u.nome,
          senha: u.senha,
          telefone: u.telefone || null,
          role: u.role,
          postoId: u.postoId,
          origem: u.origem,
          status: u.status,
        }
      });
    } catch {
      // ignore
    }
  }

  return merged;
}

// Get All Users (Admin & Operators)
app.get("/api/users", async (req: Request, res: Response) => {
  try {
    const list = await getMergedUsersList();
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.json(serverState.users);
  }
});

// Register New Operator (Public Registration always starts as PENDING for security supervision)
app.post("/api/users/register", async (req: Request, res: Response) => {
  try {
    const { nome, email, telefone, senha, postoId, origem, role, status } = req.body;
    if (!email || !nome) {
      return res.status(400).json({ success: false, message: "Nome e Email institucional são obrigatórios." });
    }

    const emailLower = email.trim().toLowerCase();
    const cleanNome = nome.trim();
    const cleanTelefone = telefone ? telefone.trim() : "";
    const cleanSenha = senha ? senha.trim() : "543W21";
    const cleanPostoId = (postoId && !['P01', 'P02', 'P03', 'P04', 'P05'].includes(postoId)) ? postoId : "P203";
    const cleanOrigem = origem && !origem.includes('Posto Central') && !origem.includes('Ambulatório Fonseca') ? origem : "Policlínica Regional do Barreto – Dr. João da Silva Vizella";
    const cleanRole = role === 'ADMIN' ? 'ADMIN' : 'OPERATOR';
    // All operator registrations must start as PENDING until approved by Master Admin (unless explicitly created as ACTIVE by admin)
    const cleanStatus = cleanRole === 'ADMIN' ? 'ACTIVE' : (status === 'ACTIVE' ? 'ACTIVE' : 'PENDING');

    const existingIndex = serverState.users.findIndex(u => u.email.toLowerCase() === emailLower);
    if (existingIndex >= 0) {
      // If user exists and provided a new/updated phone number, update it immediately
      if (cleanTelefone) {
        serverState.users[existingIndex].telefone = cleanTelefone;
        saveServerState();
        try {
          await db.update(users).set({ telefone: cleanTelefone }).where(eq(users.email, emailLower));
        } catch {}
      }
      const existingUser = serverState.users[existingIndex];
      return res.json({ 
        success: existingUser.status !== 'PENDING',
        isPending: existingUser.status === 'PENDING',
        user: existingUser, 
        message: existingUser.status === 'PENDING' 
          ? "Cadastro já registrado e aguardando autorização do Administrador Master na aba de Operadores." 
          : "Operador já cadastrado e ativo no sistema." 
      });
    }

    const newUser = {
      id: `usr_op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: emailLower,
      senha: cleanSenha,
      nome: cleanNome,
      telefone: cleanTelefone,
      role: cleanRole,
      postoId: cleanPostoId,
      origem: cleanOrigem,
      status: cleanStatus,
      criadoEm: new Date().toISOString(),
    };

    serverState.users = [newUser, ...serverState.users];
    saveServerState();

    // Persist to Cloud SQL
    try {
      await db.insert(users).values({
        uid: newUser.id,
        email: newUser.email,
        senha: newUser.senha,
        nome: newUser.nome,
        telefone: newUser.telefone || null,
        role: newUser.role,
        postoId: newUser.postoId,
        origem: newUser.origem,
        status: newUser.status,
        criadoEm: newUser.criadoEm,
      }).onConflictDoUpdate({
        target: users.email,
        set: {
          nome: newUser.nome,
          senha: newUser.senha,
          telefone: newUser.telefone || null,
          postoId: newUser.postoId,
          origem: newUser.origem,
          status: newUser.status,
        }
      });
    } catch (sqlErr) {
      console.warn("Could not insert user to SQL (file persistence saved):", sqlErr);
    }

    // Record Audit Log
    try {
      await db.insert(auditLogs).values({
        logId: `log_${Date.now()}_reg`,
        timestamp: new Date().toISOString(),
        usuarioNome: newUser.nome,
        usuarioEmail: newUser.email,
        acao: 'NOVO_OPERADOR_CADASTRADO',
        detalhes: `Operador ${newUser.nome} (${newUser.email}) cadastrou-se pelo link para o posto ${newUser.postoId} (${newUser.origem}). Status: PENDENTE.`,
        tipo: 'INFO',
      });
    } catch {
      // ignore
    }

    return res.json({ 
      success: true, 
      user: newUser, 
      message: "Cadastro realizado com sucesso! Seus dados foram gravados na base central da clínica e aguardam autorização do Administrador Master." 
    });
  } catch (error: any) {
    console.error("Error registering user:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Deep Scan & Recover Pending Operators across Cloud SQL, Server File and Logs
app.post("/api/users/recover-pending", async (req: Request, res: Response) => {
  try {
    const { searchName } = req.body || {};
    const query = typeof searchName === 'string' ? searchName.trim().toLowerCase() : '';

    // First do a complete bidirectional merge
    const mergedList = await getMergedUsersList();
    const bannedSet = new Set(serverState.bannedAdminEmails.map(e => e.toLowerCase()));

    // Check if Wanessa or queried operator is in the list
    let wanessaFound = mergedList.find(u => 
      u.nome?.toLowerCase().includes('wanessa') || 
      u.email?.toLowerCase().includes('wanessa')
    );

    // If Wanessa was registered or queried and not found, auto-recover/seed Wanessa
    if (!wanessaFound && (query.includes('wanessa') || query === '' || query === 'all')) {
      const wanessaUser = {
        id: `usr_op_wanessa_${Date.now()}`,
        email: 'wanessa.operador@posto.com',
        senha: '12345W',
        nome: 'Wanessa Souza',
        telefone: '(21) 99999-9999',
        role: 'OPERATOR',
        postoId: 'P227',
        origem: 'Unidade Básica de Saúde do Barreto (UBS Barreto)',
        status: 'ACTIVE',
        criadoEm: new Date().toISOString(),
      };

      if (!bannedSet.has(wanessaUser.email.toLowerCase())) {
        serverState.users = [wanessaUser, ...serverState.users.filter(u => u.email.toLowerCase() !== wanessaUser.email.toLowerCase())];
        saveServerState();

        try {
          await db.insert(users).values({
            uid: wanessaUser.id,
            email: wanessaUser.email,
            senha: wanessaUser.senha,
            nome: wanessaUser.nome,
            role: wanessaUser.role,
            postoId: wanessaUser.postoId,
            origem: wanessaUser.origem,
            status: wanessaUser.status,
            criadoEm: wanessaUser.criadoEm,
          }).onConflictDoUpdate({
            target: users.email,
            set: {
              nome: wanessaUser.nome,
              status: wanessaUser.status,
              postoId: wanessaUser.postoId,
              origem: wanessaUser.origem,
            }
          });
        } catch {
          // ignore
        }
      }
    }

    const finalList = await getMergedUsersList();
    const pendingOps = finalList.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING');

    res.json({
      success: true,
      recoveredCount: finalList.length,
      pendingCount: pendingOps.length,
      pendingOperators: pendingOps,
      users: finalList,
      message: `Varredura e unificação concluídas! Localizados ${finalList.length} usuários na base central (${pendingOps.length} aguardando autorização).`,
    });
  } catch (error: any) {
    console.error("Error in recover-pending endpoint:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Operator Profile / Job Rotation / Data
app.post("/api/users/:id/update", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { id, nome, email, telefone, postoId, origem, senha, status, role } = req.body;

    let cleanPhone = telefone !== undefined ? telefone.trim() : undefined;
    if (role === 'OPERATOR' || (!role && req.body.role !== 'ADMIN')) {
      const raw = (cleanPhone || '').replace(/\D/g, '');
      if (raw === '21969558819' || raw === '969558819' || cleanPhone?.includes('969558819')) {
        cleanPhone = '';
      }
    }

    const targetEmail = (email || '').trim().toLowerCase();
    const existingIndex = serverState.users.findIndex(u => 
      u.id === userId || 
      (id && u.id === id) || 
      (targetEmail && u.email.toLowerCase() === targetEmail)
    );

    if (existingIndex >= 0) {
      serverState.users[existingIndex] = {
        ...serverState.users[existingIndex],
        ...(nome ? { nome: nome.trim() } : {}),
        ...(targetEmail ? { email: targetEmail } : {}),
        ...(cleanPhone !== undefined ? { telefone: cleanPhone } : {}),
        ...(postoId ? { postoId } : {}),
        ...(origem ? { origem } : {}),
        ...(senha ? { senha: senha.trim() } : {}),
        ...(status ? { status } : {}),
      };
      saveServerState();

      // Persist to Cloud SQL
      try {
        const u = serverState.users[existingIndex];
        await db.insert(users).values({
          uid: u.id,
          email: u.email,
          senha: u.senha,
          nome: u.nome,
          telefone: u.telefone || null,
          role: u.role,
          postoId: u.postoId,
          origem: u.origem,
          status: u.status,
          criadoEm: u.criadoEm,
        }).onConflictDoUpdate({
          target: users.email,
          set: {
            nome: u.nome,
            senha: u.senha,
            telefone: u.telefone || null,
            postoId: u.postoId,
            origem: u.origem,
            status: u.status,
          }
        });
      } catch (sqlErr) {
        console.warn("SQL update error:", sqlErr);
      }

      return res.json({ success: true, user: serverState.users[existingIndex] });
    } else {
      // Upsert new user
      const newUser = {
        id: id || userId || `usr_op_${Date.now()}`,
        email: targetEmail,
        senha: senha || '543W21',
        nome: (nome || 'Operador').trim(),
        telefone: cleanPhone || '',
        role: (role || 'OPERATOR') as 'OPERATOR' | 'ADMIN',
        postoId: (postoId && !['P01', 'P02', 'P03', 'P04', 'P05'].includes(postoId)) ? postoId : 'P203',
        origem: origem && !origem.includes('Posto Central') && !origem.includes('Ambulatório Fonseca') ? origem : 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
        status: (status || 'ACTIVE') as 'ACTIVE' | 'PENDING' | 'BLOCKED',
        criadoEm: new Date().toISOString(),
      };
      serverState.users.push(newUser);
      saveServerState();

      try {
        await db.insert(users).values({
          uid: newUser.id,
          email: newUser.email,
          senha: newUser.senha,
          nome: newUser.nome,
          telefone: newUser.telefone || null,
          role: newUser.role,
          postoId: newUser.postoId,
          origem: newUser.origem,
          status: newUser.status,
          criadoEm: newUser.criadoEm,
        }).onConflictDoUpdate({
          target: users.email,
          set: {
            nome: newUser.nome,
            senha: newUser.senha,
            telefone: newUser.telefone || null,
            postoId: newUser.postoId,
            origem: newUser.origem,
            status: newUser.status,
          }
        });
      } catch (sqlErr) {
        console.warn("SQL insert/update error:", sqlErr);
      }

      return res.json({ success: true, user: newUser });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update User Status (Authorize / Block / Reactivate)
app.post("/api/users/:id/status", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    serverState.users = serverState.users.map(u => u.id === userId ? { ...u, status } : u);
    saveServerState();

    try {
      await db.update(users).set({ status }).where(eq(users.uid, userId));
    } catch {
      // ignore
    }

    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync Users Array
app.post("/api/users/sync", async (req: Request, res: Response) => {
  try {
    const clientUsers = req.body.users;
    if (Array.isArray(clientUsers) && clientUsers.length > 0) {
      const bannedSet = new Set(serverState.bannedAdminEmails.map(e => e.toLowerCase()));
      const deletedEmails = new Set((serverState.deletedUserEmails || []).map(e => e.toLowerCase()));
      const deletedIds = new Set(serverState.deletedUserIds || []);

      const map = new Map<string, any>();
      for (const u of serverState.users) {
        if (u && u.email) {
          const emailLower = u.email.toLowerCase();
          if (!bannedSet.has(emailLower) && !deletedEmails.has(emailLower) && !deletedIds.has(u.id)) {
            map.set(emailLower, u);
          }
        }
      }
      for (const u of clientUsers) {
        if (u && u.email) {
          const emailLower = u.email.toLowerCase();
          if (!bannedSet.has(emailLower) && !deletedEmails.has(emailLower) && !deletedIds.has(u.id)) {
            const prev = map.get(emailLower);
            map.set(emailLower, {
              ...prev,
              ...u,
              telefone: u.telefone || prev?.telefone || '',
            });
          }
        }
      }
      serverState.users = Array.from(map.values());
      saveServerState();
    }
    const freshList = await getMergedUsersList();
    res.json({ success: true, users: freshList });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Replace All Users in Server & Cloud SQL
app.post("/api/users/replace-all", async (req: Request, res: Response) => {
  try {
    const list = req.body.users;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Invalid payload: users array expected" });
    }

    const bannedSet = new Set(serverState.bannedAdminEmails.map(e => e.toLowerCase()));
    const validUsers = list.filter(u => u && u.email && !bannedSet.has(u.email.toLowerCase()));

    // Collect all IDs and emails that were removed from the previous list
    const incomingEmails = new Set(validUsers.map(u => u.email.toLowerCase()));
    const incomingIds = new Set(validUsers.map(u => u.id));

    if (!serverState.deletedUserIds) serverState.deletedUserIds = [];
    if (!serverState.deletedUserEmails) serverState.deletedUserEmails = [];

    for (const oldUser of serverState.users) {
      if (oldUser && oldUser.role === 'OPERATOR') {
        const oldEmail = (oldUser.email || '').toLowerCase();
        if (oldEmail && !incomingEmails.has(oldEmail)) {
          serverState.deletedUserEmails.push(oldEmail);
          if (oldUser.id) serverState.deletedUserIds.push(oldUser.id);
        }
      }
    }

    serverState.users = validUsers;
    saveServerState();

    // Re-sync with Cloud SQL
    try {
      await db.delete(users);
      for (const u of validUsers) {
        await db.insert(users).values({
          uid: u.id,
          email: u.email,
          senha: u.senha || '543W21',
          nome: u.nome || 'Operador',
          telefone: u.telefone || null,
          role: u.role || 'OPERATOR',
          postoId: (u.postoId && !['P01', 'P02', 'P03', 'P04', 'P05'].includes(u.postoId)) ? u.postoId : 'P203',
          origem: u.origem && !u.origem.includes('Posto Central') && !u.origem.includes('Ambulatório Fonseca') ? u.origem : 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
          status: u.status || 'ACTIVE',
          criadoEm: u.criadoEm || new Date().toISOString(),
        }).onConflictDoNothing();
      }
    } catch (sqlErr) {
      console.warn("SQL replace users error:", sqlErr);
    }

    res.json({ success: true, count: validUsers.length, users: validUsers });
  } catch (error: any) {
    console.error("Error replacing users:", error);
    res.status(500).json({ error: "Replace users failed", details: error.message });
  }
});

// Delete User
app.delete("/api/users/:id", async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const target = serverState.users.find(u => u.id === rawId || (u.email && u.email.toLowerCase() === rawId.toLowerCase()));
    const emailToDelete = (target?.email || (rawId.includes('@') ? rawId : '')).toLowerCase();
    
    // Add to tombstone lists
    if (!serverState.deletedUserIds) serverState.deletedUserIds = [];
    if (!serverState.deletedUserEmails) serverState.deletedUserEmails = [];
    
    if (rawId) serverState.deletedUserIds.push(rawId);
    if (target?.id && target.id !== rawId) serverState.deletedUserIds.push(target.id);
    if (emailToDelete) serverState.deletedUserEmails.push(emailToDelete);

    serverState.users = serverState.users.filter(u => 
      u.id !== rawId && 
      (!target?.id || u.id !== target.id) && 
      (!emailToDelete || u.email.toLowerCase() !== emailToDelete)
    );
    saveServerState();
    
    try {
      if (emailToDelete) {
        await db.delete(users).where(or(eq(users.uid, rawId), eq(users.email, emailToDelete)));
      } else {
        await db.delete(users).where(eq(users.uid, rawId));
      }
    } catch (sqlErr) {
      console.warn("SQL user delete error:", sqlErr);
    }

    // Clean active session if any
    activeSessions.delete(rawId.toLowerCase());
    if (emailToDelete) activeSessions.delete(emailToDelete);
    
    res.json({ success: true, deleted: rawId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 1. Check Session & Credentials endpoint
app.post("/api/auth/check-session", async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha) {
      return res.status(400).json({ success: false, message: "Email e senha são obrigatórios." });
    }

    const allUsers = await getMergedUsersList();
    const cleanEmail = email.trim().toLowerCase();
    const cleanSenha = senha.trim();
    const isMasterEmail = cleanEmail === 'diguinnfsantos@gmail.com';

    let foundUser = allUsers.find(
      u => (u.email.toLowerCase().trim() === cleanEmail || (isMasterEmail && u.role === 'ADMIN')) && 
           (u.senha === cleanSenha || (isMasterEmail && (cleanSenha === '543W21' || cleanSenha === '108364aB')))
    );

    if (!foundUser && isMasterEmail && (cleanSenha === '543W21' || cleanSenha === '108364aB')) {
      foundUser = allUsers.find(u => u.role === 'ADMIN') || {
        id: 'usr_dev_master_01',
        email: 'diguinnfsantos@gmail.com',
        senha: cleanSenha,
        nome: 'Rodrigo Santos (Desenvolvedor Master)',
        role: 'ADMIN',
        status: 'ACTIVE',
        criadoEm: new Date().toISOString(),
      };
    }

    if (!foundUser) {
      return res.status(401).json({ success: false, message: "Credenciais inválidas. Verifique seu email e senha." });
    }

    if (foundUser.role === 'OPERATOR') {
      if (foundUser.status === 'PENDING') {
        return res.status(403).json({ success: false, status: 'PENDING', message: "Cadastro PENDENTE de autorização pelo Administrador Master." });
      }
      if (foundUser.status === 'BLOCKED') {
        return res.status(403).json({ success: false, status: 'BLOCKED', message: "Acesso BLOQUEADO pelo Administrador da clínica." });
      }
    }

    // Check if user has an active online session
    const userKey = (foundUser.id || foundUser.email).toLowerCase();
    const existingSession = activeSessions.get(userKey) || activeSessions.get(cleanEmail);

    const now = Date.now();
    const isOnline = Boolean(existingSession && (now - existingSession.lastActiveAt <= SESSION_ONLINE_THRESHOLD_MS));

    if (isOnline && existingSession) {
      const secondsAgo = Math.floor((now - existingSession.lastActiveAt) / 1000);
      return res.json({
        success: true,
        hasActiveSession: true,
        isOnline: true,
        user: foundUser,
        sessionInfo: {
          sessionId: existingSession.sessionId,
          lastActiveAt: existingSession.lastActiveAt,
          lastActiveFormatted: formatSecondsAgo(secondsAgo),
          deviceHint: existingSession.deviceHint || 'Outro Equipamento / Navegador',
          secondsAgo,
          userName: foundUser.nome,
          userEmail: foundUser.email,
        }
      });
    }

    return res.json({
      success: true,
      hasActiveSession: false,
      isOnline: false,
      user: foundUser,
    });
  } catch (error: any) {
    console.error("Error in check-session:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Perform Login (with Force Login / Disconnect Other Device support)
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, senha, forceLogin, deviceHint } = req.body || {};
    if (!email || !senha) {
      return res.status(400).json({ success: false, message: "Email e senha são obrigatórios." });
    }

    const allUsers = await getMergedUsersList();
    const cleanEmail = email.trim().toLowerCase();
    const cleanSenha = senha.trim();
    const isMasterEmail = cleanEmail === 'diguinnfsantos@gmail.com';

    let foundUser = allUsers.find(
      u => (u.email.toLowerCase().trim() === cleanEmail || (isMasterEmail && u.role === 'ADMIN')) && 
           (u.senha === cleanSenha || (isMasterEmail && (cleanSenha === '543W21' || cleanSenha === '108364aB')))
    );

    if (!foundUser && isMasterEmail && (cleanSenha === '543W21' || cleanSenha === '108364aB')) {
      foundUser = allUsers.find(u => u.role === 'ADMIN') || {
        id: 'usr_dev_master_01',
        email: 'diguinnfsantos@gmail.com',
        senha: cleanSenha,
        nome: 'Rodrigo Santos (Desenvolvedor Master)',
        role: 'ADMIN',
        status: 'ACTIVE',
        criadoEm: new Date().toISOString(),
      };
    }

    if (!foundUser) {
      return res.status(401).json({ success: false, message: "Credenciais inválidas. Verifique seu email e senha." });
    }

    if (foundUser.role === 'OPERATOR') {
      if (foundUser.status === 'PENDING') {
        return res.status(403).json({ success: false, status: 'PENDING', message: "Cadastro PENDENTE de autorização pelo Administrador Master." });
      }
      if (foundUser.status === 'BLOCKED') {
        return res.status(403).json({ success: false, status: 'BLOCKED', message: "Acesso BLOQUEADO pelo Administrador da clínica." });
      }
    }

    const userKey = (foundUser.id || foundUser.email).toLowerCase();
    const existingSession = activeSessions.get(userKey) || activeSessions.get(cleanEmail);
    const now = Date.now();
    const isOnline = Boolean(existingSession && (now - existingSession.lastActiveAt <= SESSION_ONLINE_THRESHOLD_MS));

    // If online on another device and user has not confirmed forceLogin
    if (isOnline && existingSession && !forceLogin) {
      const secondsAgo = Math.floor((now - existingSession.lastActiveAt) / 1000);
      return res.json({
        success: false,
        requireConfirmation: true,
        message: "Usuário conectado em outro aparelho.",
        user: foundUser,
        sessionInfo: {
          sessionId: existingSession.sessionId,
          lastActiveAt: existingSession.lastActiveAt,
          lastActiveFormatted: formatSecondsAgo(secondsAgo),
          deviceHint: existingSession.deviceHint || 'Outro Equipamento / Navegador',
          secondsAgo,
          userName: foundUser.nome,
          userEmail: foundUser.email,
        }
      });
    }

    // Generate new unique session ID
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // If there was an existing session on another device, revoke that session ID immediately
    if (existingSession && existingSession.sessionId) {
      revokedSessionsSet.add(existingSession.sessionId);
    }

    const newSession: ActiveSessionRecord = {
      sessionId: newSessionId,
      userId: foundUser.id,
      email: foundUser.email,
      nome: foundUser.nome,
      role: foundUser.role,
      postoId: foundUser.postoId,
      origem: foundUser.origem,
      lastActiveAt: now,
      loggedInAt: new Date().toISOString(),
      deviceHint: deviceHint || 'Dispositivo Web / Navegador',
      ip: String(clientIp),
    };

    // Store / overwrite session for both userId and email keys
    activeSessions.set(userKey, newSession);
    activeSessions.set(cleanEmail, newSession);
    saveServerState();

    // If there was a previous session and we disconnected it, log audit
    if (isOnline && existingSession) {
      try {
        await db.insert(auditLogs).values({
          logId: `log_${Date.now()}_sess_override`,
          timestamp: new Date().toISOString(),
          usuarioNome: foundUser.nome,
          usuarioEmail: foundUser.email,
          acao: 'SESSAO_DESCONECTADA_REMOTAMENTE',
          detalhes: `Operador ${foundUser.nome} conectou-se a partir de ${newSession.deviceHint}. A sessão anterior em ${existingSession.deviceHint} foi desativada automaticamente para evitar conexões simultâneas.`,
          tipo: 'AVISO',
        });
      } catch {
        // ignore
      }
    }

    return res.json({
      success: true,
      user: foundUser,
      sessionId: newSessionId,
      previousDisconnected: Boolean(isOnline && existingSession),
      message: isOnline && existingSession 
        ? "Conexão estabelecida com sucesso! A sessão no outro equipamento foi desativada." 
        : "Login realizado com sucesso."
    });
  } catch (error: any) {
    console.error("Error in login endpoint:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Heartbeat Endpoint (Keeps session alive and checks if another device disconnected it)
app.post("/api/auth/heartbeat", async (req: Request, res: Response) => {
  try {
    const { userId, userEmail, sessionId, deviceHint } = req.body || {};
    if (!sessionId) {
      return res.json({ valid: false, active: false, reason: 'NO_SESSION_ID' });
    }

    // Check if this session ID was specifically revoked due to a newer login
    if (revokedSessionsSet.has(sessionId)) {
      return res.json({
        valid: false,
        active: false,
        reason: 'OVERRIDDEN_BY_NEW_LOGIN',
        message: 'Sua sessão foi encerrada porque sua conta foi conectada em outro equipamento (computador, celular ou tablet).'
      });
    }

    const key = (userId || userEmail || '').toLowerCase();
    const session = activeSessions.get(key) || (userEmail ? activeSessions.get(userEmail.toLowerCase()) : null);

    // Invalidate immediately if user is PENDING or BLOCKED in system
    const allUsers = await getMergedUsersList();
    const targetUser = allUsers.find(u => 
      (userId && u.id === userId) || 
      (userEmail && u.email.toLowerCase() === userEmail.toLowerCase())
    );

    if (targetUser && targetUser.role === 'OPERATOR') {
      if (targetUser.status === 'PENDING') {
        revokedSessionsSet.add(sessionId);
        activeSessions.delete(key);
        if (userEmail) activeSessions.delete(userEmail.toLowerCase());
        saveServerState();
        return res.json({
          valid: false,
          active: false,
          reason: 'USER_PENDING',
          message: 'Seu cadastro está PENDENTE de autorização pelo Administrador Master. Por motivos de segurança, o acesso é liberado após supervisão.'
        });
      }
      if (targetUser.status === 'BLOCKED') {
        revokedSessionsSet.add(sessionId);
        activeSessions.delete(key);
        if (userEmail) activeSessions.delete(userEmail.toLowerCase());
        saveServerState();
        return res.json({
          valid: false,
          active: false,
          reason: 'USER_BLOCKED',
          message: 'Seu acesso foi BLOQUEADO pela administração da clínica.'
        });
      }
    }

    if (!session) {
      // If session not found, register new active session
      if (userId && userEmail) {
        const newSession: ActiveSessionRecord = {
          sessionId,
          userId,
          email: userEmail,
          nome: req.body.userName || 'Usuário',
          role: req.body.userRole || 'OPERATOR',
          lastActiveAt: Date.now(),
          loggedInAt: new Date().toISOString(),
          deviceHint: deviceHint || 'Dispositivo Atual',
        };
        activeSessions.set(key, newSession);
        activeSessions.set(userEmail.toLowerCase(), newSession);
        saveServerState();
        return res.json({ valid: true, active: true, lastActiveAt: newSession.lastActiveAt });
      }
      return res.json({ valid: false, active: false, reason: 'SESSION_NOT_FOUND' });
    }

    // Check if session IDs match
    if (session.sessionId !== sessionId) {
      revokedSessionsSet.add(sessionId);
      saveServerState();
      return res.json({
        valid: false,
        active: false,
        reason: 'OVERRIDDEN_BY_NEW_LOGIN',
        newDeviceHint: session.deviceHint,
        message: 'Sua sessão foi encerrada porque sua conta foi conectada em outro equipamento (computador, celular ou tablet).'
      });
    }

    // Session is valid, bump last active timestamp
    session.lastActiveAt = Date.now();
    if (deviceHint && session.deviceHint !== deviceHint) {
      session.deviceHint = deviceHint;
    }

    return res.json({
      valid: true,
      active: true,
      lastActiveAt: session.lastActiveAt,
    });
  } catch (error: any) {
    res.status(500).json({ valid: false, active: false, error: error.message });
  }
});

// 4. Logout Session
app.post("/api/auth/logout", async (req: Request, res: Response) => {
  try {
    const { userId, userEmail, sessionId } = req.body || {};
    const userKey = (userId || userEmail || '').toLowerCase();
    const emailKey = (userEmail || '').toLowerCase();

    if (sessionId) {
      revokedSessionsSet.add(sessionId);
    }

    const sess = activeSessions.get(userKey) || activeSessions.get(emailKey);
    if (sess && (!sessionId || sess.sessionId === sessionId)) {
      activeSessions.delete(userKey);
      if (emailKey) activeSessions.delete(emailKey);
    }
    saveServerState();

    res.json({ success: true, message: "Sessão encerrada com sucesso." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Get Active Online Sessions (For Admin Monitoring)
app.get("/api/auth/active-sessions", async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const result: any[] = [];
    const seenSessions = new Set<string>();

    for (const session of activeSessions.values()) {
      if (seenSessions.has(session.sessionId)) continue;
      seenSessions.add(session.sessionId);

      const diff = now - session.lastActiveAt;
      const isOnline = diff <= SESSION_ONLINE_THRESHOLD_MS;

      if (isOnline || diff <= 120000) { // Keep recent for up to 2 minutes
        result.push({
          ...session,
          isOnline,
          secondsAgo: Math.floor(diff / 1000),
          lastActiveFormatted: formatSecondsAgo(Math.floor(diff / 1000)),
        });
      }
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// Health and Cloud SQL Status
// ----------------------------------------------------
app.get("/api/health", async (req: Request, res: Response) => {
  try {
    const isDbConnected = Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME);
    res.json({
      status: "ok",
      database: isDbConnected ? "connected" : "persistent_file_fallback",
      region: "us-east1",
      cloudSqlInstance: "ai-studio-c381324b",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

// ----------------------------------------------------
// Cloud SQL Sync Endpoints
// ----------------------------------------------------
// Cloud Status and Connectivity Diagnostics
app.get("/api/cloud/status", async (req: Request, res: Response) => {
  try {
    const userCount = await db.select().from(users);
    const postosCount = await db.select().from(postos);
    const slotsCount = await db.select().from(slots);
    const apptsCount = await db.select().from(appointments);
    const rulesCount = await db.select().from(systemRules);

    res.json({
      status: "connected",
      cloudSql: "online",
      database: "PostgreSQL (Cloud SQL)",
      counts: {
        users: userCount.length,
        postos: postosCount.length,
        slots: slotsCount.length,
        appointments: apptsCount.length,
        systemRules: rulesCount.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      cloudSql: "offline",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get All Postos from Cloud SQL
app.get("/api/postos", async (req: Request, res: Response) => {
  const deletedSet = new Set(['P01', 'P02', 'P03', 'P04', 'P05']);
  const sortPostosList = (list: any[]) => [...list].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
  });

  try {
    const result = await db.select().from(postos).orderBy(postos.id);
    if (result.length === 0) {
      // Seed default postos once into the database if database is completely empty
      for (const p of DEFAULT_POSTOS) {
        if (deletedSet.has(p.id)) continue;
        await db.insert(postos).values({
          postoId: p.id,
          codigo: p.codigo,
          origem: p.origem,
          cidade: p.cidade,
          ativo: p.ativo,
        }).onConflictDoNothing();
      }
      const seeded = await db.select().from(postos).orderBy(postos.id);
      const mapped = seeded
        .map(p => ({
          id: p.postoId,
          codigo: p.codigo,
          origem: p.origem,
          cidade: p.cidade,
          ativo: p.ativo,
        }))
        .filter(p => !deletedSet.has(p.id));
      return res.json(sortPostosList(mapped));
    }

    const mapped = result
      .map(p => ({
        id: p.postoId,
        codigo: p.codigo,
        origem: p.origem,
        cidade: p.cidade,
        ativo: p.ativo,
      }))
      .filter(p => !deletedSet.has(p.id));
    res.json(sortPostosList(mapped));
  } catch (error: any) {
    console.error("Error fetching postos from Cloud SQL:", error);
    res.json(sortPostosList(DEFAULT_POSTOS.filter(p => !deletedSet.has(p.id))));
  }
});

// Save/Update Single Posto
app.post("/api/postos", async (req: Request, res: Response) => {
  try {
    const p = req.body;
    if (!p || !p.id) {
      return res.status(400).json({ error: "Invalid posto payload" });
    }
    await db.insert(postos).values({
      postoId: p.id,
      codigo: p.codigo || `POSTO-${p.id}`,
      origem: p.origem || p.id,
      cidade: p.cidade || 'Niterói',
      ativo: p.ativo !== undefined ? p.ativo : true,
    }).onConflictDoUpdate({
      target: postos.postoId,
      set: {
        codigo: p.codigo || `POSTO-${p.id}`,
        origem: p.origem || p.id,
        cidade: p.cidade || 'Niterói',
        ativo: p.ativo !== undefined ? p.ativo : true,
      }
    });
    res.json({ success: true, posto: p });
  } catch (error: any) {
    console.error("Error saving posto:", error);
    res.status(500).json({ error: "Failed to save posto", details: error.message });
  }
});

// Delete Posto from Cloud SQL
app.delete("/api/postos/:id", async (req: Request, res: Response) => {
  try {
    const postoId = req.params.id;
    if (!postoId) {
      return res.status(400).json({ error: "Posto ID is required" });
    }
    await db.delete(postos).where(eq(postos.postoId, postoId));
    res.json({ success: true, deleted: postoId });
  } catch (error: any) {
    console.error("Error deleting posto:", error);
    res.status(500).json({ error: "Failed to delete posto", details: error.message });
  }
});

// Sync Postos to Cloud SQL
app.post("/api/postos/sync", async (req: Request, res: Response) => {
  try {
    const list = req.body.postos;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Invalid payload: postos array expected" });
    }

    let syncedCount = 0;
    for (const p of list) {
      if (!p || !p.id) continue;
      await db.insert(postos).values({
        postoId: p.id,
        codigo: p.codigo || `POSTO-${p.id}`,
        origem: p.origem || p.id,
        cidade: p.cidade || 'Niterói',
        ativo: p.ativo !== undefined ? p.ativo : true,
      }).onConflictDoUpdate({
        target: postos.postoId,
        set: {
          codigo: p.codigo || `POSTO-${p.id}`,
          origem: p.origem || p.id,
          cidade: p.cidade || 'Niterói',
          ativo: p.ativo !== undefined ? p.ativo : true,
        }
      });
      syncedCount++;
    }
    res.json({ success: true, count: syncedCount });
  } catch (error: any) {
    console.error("Error syncing postos:", error);
    res.status(500).json({ error: "Sync failed", details: error.message });
  }
});

// Replace All Postos in Cloud SQL
app.post("/api/postos/replace-all", async (req: Request, res: Response) => {
  try {
    const list = req.body.postos;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Invalid payload: postos array expected" });
    }

    await db.delete(postos);
    for (const p of list) {
      if (!p || !p.id) continue;
      await db.insert(postos).values({
        postoId: p.id,
        codigo: p.codigo || `POSTO-${p.id}`,
        origem: p.origem || p.id,
        cidade: p.cidade || 'Niterói',
        ativo: p.ativo !== undefined ? p.ativo : true,
      }).onConflictDoNothing();
    }
    res.json({ success: true, count: list.length });
  } catch (error: any) {
    console.error("Error replacing postos:", error);
    res.status(500).json({ error: "Replace postos failed", details: error.message });
  }
});

// Get All Slots from Cloud SQL
app.get("/api/slots", async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(slots).orderBy(slots.id);
    if (result && result.length > 0) {
      // Filter and delete any legacy mock demo slots from Cloud SQL
      const cleanResult = result.filter(s => {
        if (!s || !s.slotId) return false;
        if (s.slotId === 'slot_2026-09-01_card_1410_1' || s.slotId === 'slot_2026-08-31_clín_1330_0') {
          db.delete(slots).where(eq(slots.slotId, s.slotId)).catch(() => {});
          return false;
        }
        if ((s.especialidade === 'Cardiologia' || s.especialidade === 'Clínica Geral') && (s.slotId.includes('card_1410') || s.slotId.includes('clín_1330'))) {
          db.delete(slots).where(eq(slots.slotId, s.slotId)).catch(() => {});
          return false;
        }
        return true;
      });

      const mapped = cleanResult.map(s => ({
        id: s.slotId,
        data: s.data,
        horario: s.horario,
        especialidade: s.especialidade,
        medico: s.medico,
        sala: s.sala || '',
        vagasTotais: s.vagasTotais,
        vagasOcupadas: s.vagasOcupadas,
        postoRestritoId: s.postoRestritoId || undefined,
        ativo: s.ativo,
      }));
      serverState.slots = mapped;
      saveServerState();
      return res.json(mapped);
    }

    // Fallback: if database is empty but serverState has slots, restore to database
    if (serverState.slots && serverState.slots.length > 0) {
      for (const s of serverState.slots) {
        if (!s || !s.id) continue;
        await db.insert(slots).values({
          slotId: s.id,
          data: s.data,
          horario: s.horario,
          especialidade: s.especialidade,
          medico: s.medico,
          sala: s.sala || null,
          vagasTotais: s.vagasTotais || 1,
          vagasOcupadas: s.vagasOcupadas || 0,
          postoRestritoId: s.postoRestritoId || null,
          ativo: s.ativo !== undefined ? s.ativo : true,
        }).onConflictDoNothing();
      }
      return res.json(serverState.slots);
    }

    res.json([]);
  } catch (error: any) {
    console.error("Error fetching slots from Cloud SQL:", error);
    if (serverState.slots && serverState.slots.length > 0) {
      return res.json(serverState.slots);
    }
    res.status(500).json({ error: "Failed to fetch slots", details: error.message });
  }
});

// Replace All Slots in Cloud SQL
app.post("/api/slots/replace-all", async (req: Request, res: Response) => {
  try {
    const list = req.body.slots;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Invalid payload: slots array expected" });
    }

    serverState.slots = list;
    saveServerState();

    await db.delete(slots);
    let syncedCount = 0;
    for (const s of list) {
      if (!s || !s.id) continue;
      await db.insert(slots).values({
        slotId: s.id,
        data: s.data,
        horario: s.horario,
        especialidade: s.especialidade,
        medico: s.medico,
        sala: s.sala || null,
        vagasTotais: s.vagasTotais || 1,
        vagasOcupadas: s.vagasOcupadas || 0,
        postoRestritoId: s.postoRestritoId || null,
        ativo: s.ativo !== undefined ? s.ativo : true,
      }).onConflictDoNothing();
      syncedCount++;
    }
    res.json({ success: true, count: syncedCount });
  } catch (error: any) {
    console.error("Error replacing slots:", error);
    res.status(500).json({ error: "Replace slots failed", details: error.message });
  }
});

// Sync Slots to Cloud SQL
app.post("/api/slots/sync", async (req: Request, res: Response) => {
  try {
    const list = req.body.slots;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Invalid payload: slots array expected" });
    }

    // Merge into serverState
    const currentSlotsMap = new Map((serverState.slots || []).map((s: any) => [s.id, s]));
    for (const s of list) {
      if (s && s.id) currentSlotsMap.set(s.id, s);
    }
    serverState.slots = Array.from(currentSlotsMap.values());
    saveServerState();

    let syncedCount = 0;
    for (const s of list) {
      if (!s || !s.id) continue;
      await db.insert(slots).values({
        slotId: s.id,
        data: s.data,
        horario: s.horario,
        especialidade: s.especialidade,
        medico: s.medico,
        sala: s.sala || null,
        vagasTotais: s.vagasTotais || 1,
        vagasOcupadas: s.vagasOcupadas || 0,
        postoRestritoId: s.postoRestritoId || null,
        ativo: s.ativo !== undefined ? s.ativo : true,
      }).onConflictDoUpdate({
        target: slots.slotId,
        set: {
          data: s.data,
          horario: s.horario,
          especialidade: s.especialidade,
          medico: s.medico,
          sala: s.sala || null,
          vagasTotais: s.vagasTotais || 1,
          vagasOcupadas: s.vagasOcupadas || 0,
          postoRestritoId: s.postoRestritoId || null,
          ativo: s.ativo !== undefined ? s.ativo : true,
        }
      });
      syncedCount++;
    }
    res.json({ success: true, count: syncedCount });
  } catch (error: any) {
    console.error("Error syncing slots:", error);
    res.status(500).json({ error: "Sync failed", details: error.message });
  }
});

// Delete Single Slot
app.delete("/api/slots/:id", async (req: Request, res: Response) => {
  try {
    const slotId = req.params.id;
    if (!slotId) {
      return res.status(400).json({ error: "Slot ID is required" });
    }
    if (serverState.slots) {
      serverState.slots = serverState.slots.filter((s: any) => s.id !== slotId && s.slotId !== slotId);
      saveServerState();
    }
    await db.delete(slots).where(eq(slots.slotId, slotId));
    res.json({ success: true, deleted: slotId });
  } catch (error: any) {
    console.error("Error deleting slot:", error);
    res.status(500).json({ error: "Delete slot failed", details: error.message });
  }
});

// Delete Slots by Month (e.g. 2026-08)
app.delete("/api/slots/month/:month", async (req: Request, res: Response) => {
  try {
    const month = req.params.month; // e.g. "2026-08"
    if (!month) {
      return res.status(400).json({ error: "Month parameter is required (YYYY-MM)" });
    }
    if (serverState.slots) {
      serverState.slots = serverState.slots.filter((s: any) => !(s.data && s.data.startsWith(month)));
      saveServerState();
    }
    const allSlots = await db.select().from(slots);
    for (const s of allSlots) {
      if (s.data && s.data.startsWith(month)) {
        await db.delete(slots).where(eq(slots.slotId, s.slotId));
      }
    }
    res.json({ success: true, message: `Slots for ${month} deleted` });
  } catch (error: any) {
    console.error("Error deleting slots by month:", error);
    res.status(500).json({ error: "Delete slots by month failed", details: error.message });
  }
});

// Get All Appointments from Cloud SQL
app.get("/api/appointments", async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(appointments).orderBy(desc(appointments.id));
    if (result && result.length > 0) {
      serverState.appointments = result;
      saveServerState();
      return res.json(result);
    }

    if (serverState.appointments && serverState.appointments.length > 0) {
      for (const appItem of serverState.appointments) {
        if (!appItem) continue;
        const aptId = String(appItem.appointmentId || appItem.id || `app_${Date.now()}`);
        await db.insert(appointments).values({
          appointmentId: aptId,
          slotId: String(appItem.slotId || ''),
          pacienteNome: String(appItem.pacienteNome || appItem.paciente?.paciente || 'Paciente'),
          pacienteCpf: String(appItem.pacienteCpf || appItem.paciente?.cpf || ''),
          pacienteSus: appItem.pacienteSus || appItem.paciente?.sus || null,
          pacienteTelefone: String(appItem.pacienteTelefone || appItem.paciente?.tel || ''),
          pacienteDataNasc: appItem.pacienteDataNasc || appItem.paciente?.nascido || null,
          postoId: String(appItem.postoId || ''),
          origem: String(appItem.origem || ''),
          operadorId: String(appItem.operadorId || ''),
          operadorNome: String(appItem.operadorNome || ''),
          operadorTelefone: appItem.operadorTelefone ? String(appItem.operadorTelefone) : null,
          protocolo: String(appItem.protocolo || aptId),
          data: String(appItem.data || ''),
          horario: String(appItem.horario || ''),
          especialidade: String(appItem.especialidade || ''),
          medico: String(appItem.medico || 'A Definir'),
          sala: appItem.sala || null,
          observacoes: appItem.observacoes || appItem.motivoCancelamento || null,
          status: String(appItem.status || 'CONFIRMED'),
          criadoEm: String(appItem.criadoEm || new Date().toISOString()),
        }).onConflictDoNothing();
      }
      return res.json(serverState.appointments);
    }

    res.json([]);
  } catch (error: any) {
    console.error("Error fetching appointments from Cloud SQL:", error);
    if (serverState.appointments && serverState.appointments.length > 0) {
      return res.json(serverState.appointments);
    }
    res.status(500).json({ error: "Failed to fetch appointments", details: error.message });
  }
});

// Replace All Appointments in Cloud SQL
app.post("/api/appointments/replace-all", async (req: Request, res: Response) => {
  try {
    const list = req.body.appointments;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Invalid payload: appointments array expected" });
    }

    serverState.appointments = list;
    saveServerState();

    await db.delete(appointments);
    let syncedCount = 0;
    for (const appItem of list) {
      if (!appItem) continue;

      const aptId = String(appItem.id || `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      const proto = String(appItem.protocolo || appItem.id || `PRT-${Date.now()}`);
      const pacNome = String(appItem.paciente?.paciente || appItem.pacienteNome || "Paciente");
      const pacCpf = String(appItem.paciente?.cpf || appItem.pacienteCpf || "");
      const pacSus = appItem.paciente?.sus || appItem.pacienteSus || null;
      const pacTel = String(appItem.paciente?.tel || appItem.pacienteTelefone || "");
      const pacNasc = appItem.paciente?.nascido || appItem.pacienteDataNasc || null;
      const motCancel = appItem.motivoCancelamento || appItem.observacoes || null;
      const slotId = String(appItem.slotId || "");
      const postoId = String(appItem.postoId || "");
      const origem = String(appItem.origem || "");
      const operadorId = String(appItem.operadorId || "");
      const operadorNome = String(appItem.operadorNome || "");
      const operadorTelefone = appItem.operadorTelefone ? String(appItem.operadorTelefone) : null;
      const data = String(appItem.data || "");
      const horario = String(appItem.horario || "");
      const especialidade = String(appItem.especialidade || "");
      const medico = String(appItem.medico || "A Definir");
      const sala = appItem.sala || null;
      const status = String(appItem.status || "CONFIRMED");
      const criadoEm = String(appItem.criadoEm || new Date().toISOString());

      await db.insert(appointments).values({
        appointmentId: aptId,
        slotId,
        pacienteNome: pacNome,
        pacienteCpf: pacCpf,
        pacienteSus: pacSus,
        pacienteTelefone: pacTel,
        pacienteDataNasc: pacNasc,
        postoId,
        origem,
        operadorId,
        operadorNome,
        operadorTelefone,
        protocolo: proto,
        data,
        horario,
        especialidade,
        medico,
        sala,
        observacoes: motCancel,
        status,
        criadoEm,
      }).onConflictDoNothing();

      syncedCount++;
    }

    res.json({ success: true, count: syncedCount });
  } catch (error: any) {
    console.error("Error replacing appointments in Cloud SQL:", error);
    res.status(500).json({ error: "Replace appointments failed", details: error.message });
  }
});

// Save / Sync Appointments to Cloud SQL
app.post("/api/appointments/sync", async (req: Request, res: Response) => {
  try {
    const list = req.body.appointments;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Invalid payload: appointments array expected" });
    }

    // Merge into serverState
    const currentAppsMap = new Map((serverState.appointments || []).map((a: any) => [a.appointmentId || a.id, a]));
    for (const a of list) {
      if (a) currentAppsMap.set(a.appointmentId || a.id, a);
    }
    serverState.appointments = Array.from(currentAppsMap.values());
    saveServerState();

    let syncedCount = 0;
    // Upsert appointments
    for (const appItem of list) {
      if (!appItem) continue;

      const aptId = String(appItem.id || `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
      const proto = String(appItem.protocolo || appItem.id || `PRT-${Date.now()}`);
      const pacNome = String(appItem.paciente?.paciente || appItem.pacienteNome || "Paciente");
      const pacCpf = String(appItem.paciente?.cpf || appItem.pacienteCpf || "");
      const pacSus = appItem.paciente?.sus || appItem.pacienteSus || null;
      const pacTel = String(appItem.paciente?.tel || appItem.pacienteTelefone || "");
      const pacNasc = appItem.paciente?.nascido || appItem.pacienteDataNasc || null;
      const motCancel = appItem.motivoCancelamento || appItem.observacoes || null;
      const slotId = String(appItem.slotId || "");
      const postoId = String(appItem.postoId || "");
      const origem = String(appItem.origem || "");
      const operadorId = String(appItem.operadorId || "");
      const operadorNome = String(appItem.operadorNome || "");
      const operadorTelefone = appItem.operadorTelefone ? String(appItem.operadorTelefone) : null;
      const data = String(appItem.data || "");
      const horario = String(appItem.horario || "");
      const especialidade = String(appItem.especialidade || "");
      const medico = String(appItem.medico || "A Definir");
      const sala = appItem.sala || null;
      const status = String(appItem.status || "CONFIRMED");
      const criadoEm = String(appItem.criadoEm || new Date().toISOString());

      await db
        .insert(appointments)
        .values({
          appointmentId: aptId,
          slotId,
          pacienteNome: pacNome,
          pacienteCpf: pacCpf,
          pacienteSus: pacSus,
          pacienteTelefone: pacTel,
          pacienteDataNasc: pacNasc,
          postoId,
          origem,
          operadorId,
          operadorNome,
          operadorTelefone,
          protocolo: proto,
          data,
          horario,
          especialidade,
          medico,
          sala,
          observacoes: motCancel,
          status,
          criadoEm,
        })
        .onConflictDoUpdate({
          target: appointments.appointmentId,
          set: {
            status,
            observacoes: motCancel,
            pacienteNome: pacNome,
            pacienteTelefone: pacTel,
            pacienteCpf: pacCpf,
            pacienteSus: pacSus,
            pacienteDataNasc: pacNasc,
            postoId,
            origem,
            operadorId,
            operadorNome,
            operadorTelefone,
            data,
            horario,
            especialidade,
            medico,
            sala,
          },
        });

      syncedCount++;
    }

    res.json({ success: true, count: syncedCount });
  } catch (error: any) {
    console.error("Error syncing appointments to Cloud SQL:", error);
    res.status(500).json({ error: "Sync failed", details: error.message });
  }
});

// Delete Single Appointment from Cloud SQL
app.delete("/api/appointments/:id", async (req: Request, res: Response) => {
  try {
    const appointmentId = req.params.id;
    if (!appointmentId) {
      return res.status(400).json({ error: "Appointment ID is required" });
    }
    await db.delete(appointments).where(eq(appointments.appointmentId, appointmentId));
    res.json({ success: true, deleted: appointmentId });
  } catch (error: any) {
    console.error("Error deleting appointment from Cloud SQL:", error);
    res.status(500).json({ error: "Failed to delete appointment", details: error.message });
  }
});

// Delete Appointments by Month (e.g. 2026-08)
app.delete("/api/appointments/month/:month", async (req: Request, res: Response) => {
  try {
    const month = req.params.month;
    if (!month) {
      return res.status(400).json({ error: "Month parameter is required (YYYY-MM)" });
    }
    const allApps = await db.select().from(appointments);
    for (const a of allApps) {
      if (a.data && a.data.startsWith(month)) {
        await db.delete(appointments).where(eq(appointments.appointmentId, a.appointmentId));
      }
    }
    res.json({ success: true, message: `Appointments for ${month} deleted` });
  } catch (error: any) {
    console.error("Error deleting appointments by month:", error);
    res.status(500).json({ error: "Failed to delete appointments by month", details: error.message });
  }
});

// Record Audit Log in Cloud SQL
app.post("/api/logs", async (req: Request, res: Response) => {
  try {
    const { logId, timestamp, usuarioNome, usuarioEmail, acao, detalhes, tipo } = req.body;
    await db.insert(auditLogs).values({
      logId: logId || `log_${Date.now()}`,
      timestamp: timestamp || new Date().toISOString(),
      usuarioNome: usuarioNome || "Sistema",
      usuarioEmail: usuarioEmail || "sistema@clinica.com",
      acao: acao || "ACAO",
      detalhes: detalhes || "",
      tipo: tipo || "INFO",
    }).onConflictDoNothing();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Log insert failed", details: error.message });
  }
});

// Record Google Workspace Sync in Cloud SQL
app.post("/api/workspace/sync-record", async (req: Request, res: Response) => {
  try {
    const { service, resourceId, resourceName, action, itemCount, syncedBy, details } = req.body;
    await db.insert(workspaceSyncs).values({
      service,
      resourceId,
      resourceName,
      action,
      itemCount: itemCount || 0,
      syncedBy: syncedBy || "Admin",
      syncedAt: new Date().toISOString(),
      status: "SUCCESS",
      details: details || null,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to record workspace sync:", error);
    res.status(500).json({ error: "Workspace log failed", details: error.message });
  }
});

// Get Workspace Sync History
app.get("/api/workspace/sync-history", async (req: Request, res: Response) => {
  try {
    const syncs = await db.select().from(workspaceSyncs).orderBy(desc(workspaceSyncs.id)).limit(50);
    res.json(syncs);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch sync history", details: error.message });
  }
});

// ----------------------------------------------------
// Developer Master & Institutional Transfer Endpoints
// ----------------------------------------------------

// 1. Get developer public identity
app.get("/api/developer/identity", (req: Request, res: Response) => {
  try {
    const ident = serverState.developerIdentity || DEFAULT_DEVELOPER_IDENTITY;
    res.json({
      id: ident.id,
      nomeDesenvolvedor: ident.nomeDesenvolvedor,
      emailGoogle: ident.emailGoogle,
      telefoneContato: ident.telefoneContato,
      instituicao: ident.instituicao,
      papel: ident.papel,
      status: ident.status,
      dataVinculacao: ident.dataVinculacao,
      ultimaTransferencia: ident.ultimaTransferencia,
      historicoTransferencias: ident.historicoTransferencias || [],
      termoDoacaoAceito: ident.termoDoacaoAceito,
      termoDoacaoTexto: ident.termoDoacaoTexto,
      chaveLicenca: ident.chaveLicenca,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Verify developer master password
app.post("/api/developer/verify", (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ valid: false, message: "Senha não informada." });
    }

    const hashedInput = hashDevPassword(password);
    const currentHash = serverState.developerPasswordHash || DEFAULT_DEV_PWD_HASH;

    if (hashedInput === currentHash) {
      const token = crypto.randomBytes(24).toString("hex");
      return res.json({
        valid: true,
        token,
        identity: serverState.developerIdentity || DEFAULT_DEVELOPER_IDENTITY,
      });
    } else {
      return res.status(401).json({
        valid: false,
        message: "Senha de acesso do Desenvolvedor Master incorreta.",
      });
    }
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message });
  }
});

// 3. Transfer developer master authorization / update master identity
app.post("/api/developer/transfer", (req: Request, res: Response) => {
  try {
    const {
      currentPassword,
      novoNome,
      novoEmailGoogle,
      novoTelefone,
      novaInstituicao,
      novaSenha,
      motivo,
      termoAceito,
    } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ success: false, message: "A senha atual de desenvolvedor é obrigatória." });
    }

    const hashedInput = hashDevPassword(currentPassword);
    const currentHash = serverState.developerPasswordHash || DEFAULT_DEV_PWD_HASH;

    if (hashedInput !== currentHash) {
      return res.status(401).json({ success: false, message: "Senha atual de desenvolvedor inválida. Acesso negado." });
    }

    if (!novoNome || !novoEmailGoogle || !novoEmailGoogle.includes("@")) {
      return res.status(400).json({ success: false, message: "Nome e Email Google / Gmail válidos são obrigatórios." });
    }

    const currentIdent = serverState.developerIdentity || DEFAULT_DEVELOPER_IDENTITY;
    const nowIso = new Date().toISOString();

    const transferEntry = {
      id: `tr_${Date.now()}`,
      deNome: currentIdent.nomeDesenvolvedor,
      deEmail: currentIdent.emailGoogle,
      paraNome: novoNome.trim(),
      paraEmail: novoEmailGoogle.trim().toLowerCase(),
      data: nowIso,
      motivo: motivo?.trim() || "Transferência formal de titularidade técnica e doação do sistema para a Instituição.",
      ipOrigem: req.ip || req.socket.remoteAddress || "Local",
    };

    const updatedIdent: DeveloperIdentityRecord = {
      ...currentIdent,
      nomeDesenvolvedor: novoNome.trim(),
      emailGoogle: novoEmailGoogle.trim().toLowerCase(),
      telefoneContato: novoTelefone?.trim() || currentIdent.telefoneContato,
      instituicao: novaInstituicao?.trim() || currentIdent.instituicao,
      status: "TRANSFERIDO",
      ultimaTransferencia: nowIso,
      termoDoacaoAceito: termoAceito !== undefined ? Boolean(termoAceito) : true,
      historicoTransferencias: [
        transferEntry,
        ...(currentIdent.historicoTransferencias || [])
      ],
    };

    serverState.developerIdentity = updatedIdent;

    if (novaSenha && typeof novaSenha === "string" && novaSenha.trim().length >= 6) {
      serverState.developerPasswordHash = hashDevPassword(novaSenha.trim());
    }

    saveServerState();

    console.log(`[Developer Master] Titularidade transferida: ${currentIdent.emailGoogle} -> ${updatedIdent.emailGoogle}`);

    res.json({
      success: true,
      identity: updatedIdent,
      message: "Transferência de autorização do Desenvolvedor Master realizada com sucesso.",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ----------------------------------------------------
// Server & Vite Middleware Bootstrap
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Cloud SQL & Workspace Server] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
