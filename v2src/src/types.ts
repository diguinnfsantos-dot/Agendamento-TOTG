export type UserRole = 'ADMIN' | 'OPERATOR';
export type OperatorStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED';
export type AppointmentStatus = 'CONFIRMED' | 'CANCEL_REQUESTED' | 'CANCELLED';

export interface Posto {
  id: string; // Ex: "P01", "P02", "P03"
  codigo: string; // Ex: "POSTO-01"
  origem: string; // Ex: "Posto Central - Centro"
  cidade?: string;
  ativo: boolean;
}

export interface User {
  id: string;
  email: string;
  senha: string; // 6 caracteres alfanuméricos (5 números e 1 letra)
  nome: string;
  telefone?: string; // Telefone celular do operador com DDD obrigatório
  role: UserRole;
  postoId?: string; // ID do posto (apenas para OPERATOR)
  origem?: string;  // Nome da origem (apenas para OPERATOR)
  status: OperatorStatus;
  criadoEm: string;
}

export interface Slot {
  id: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  especialidade: string;
  medico?: string;
  sala?: string;
  status: 'DISPONIVEL' | 'AGENDADO' | 'BLOQUEADO';
  agendamentoId?: string;
  criadoPorAdmin: boolean;
}

export interface PatientData {
  paciente: string; // Nome completo
  cpf: string;
  sus: string;
  nascido: string; // Data de nascimento
  mae: string; // Nome da mãe
  endereco: string;
  cep: string;
  tel: string; // Telefone / WhatsApp
}

export interface Appointment {
  id: string;
  slotId: string;
  data: string;
  horario: string;
  especialidade: string;
  medico?: string;
  postoId: string;
  origem: string;
  operadorId: string;
  operadorNome: string;
  operadorEmail: string;
  operadorTelefone?: string;
  paciente: PatientData;
  status: AppointmentStatus;
  motivoCancelamento?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SpecialtyQuotaRule {
  especialidade: string;
  maxVagasPorId: number; // Ex: 3, 5, 8, 1 vaga por ID de Posto
  cotaLivreEvento: boolean; // Se ativado pelo Administrador Master para Mutirão / Ação Social / Eventos
  descricaoEvento?: string; // Ex: "Mutirão da Saúde do Coração", "Ação Social de Dermatologia"
  motivoRestricao?: string; // Ex: "Médico em férias / Cota reduzida", "Apenas 1 especialista atuando"
}

export interface SystemRule {
  maxVagasPorId: number; // Regra geral padrão de vagas por especialidade para cada ID Posto (padrão: 3)
  cotasPorEspecialidade?: Record<string, SpecialtyQuotaRule>; // Configuração individualizada por especialidade
  diasParaRepescagemVencimento: number; // Padrão: 5 dias. Vagas a ≤ 5 dias de vencimento entram em Repescagem Automática (qualquer posto pode agendar)
  notificacaoWhatsAppAutomatica: boolean;
  mensagemPadraoWhatsApp: string;
  nomeClinica: string;
  telefoneClinica: string;
  enderecoClinica: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  usuarioNome: string;
  usuarioEmail: string;
  acao: string; // Ex: 'AGENDAMENTO_CRIADO', 'OPERADOR_APROVADO', 'POSTO_CRIADO', 'BACKUP_REALIZADO'
  detalhes: string;
  tipo: 'INFO' | 'AVISO' | 'SUCESSO' | 'ALERTA';
}

export interface CloudSnapshot {
  id: string;
  timestamp: string;
  descricao: string;
  totalAgendamentos: number;
  totalOperadores: number;
  totalPostos: number;
  tamanhoKb: number;
  dados: {
    users: User[];
    postos: Posto[];
    slots: Slot[];
    appointments: Appointment[];
    rules: SystemRule;
  };
}

export interface DoctorProfile {
  id: string;
  nome: string; // Ex: "Dr. Floriano Peixoto"
  especialidade: string; // Ex: "Clínica Geral"
  crm?: string; // Ex: "CRM/SP 123456"
  salaPadrao?: string; // Ex: "Consultório 01"
  telefone?: string;
  ativo: boolean;
}

export interface RegisteredPatient {
  id: string; // CPF limpo ou UUID
  cpf: string; // CPF formatado único
  paciente: string; // Nome completo
  sus: string; // Cartão SUS
  nascido: string; // Data de nascimento (YYYY-MM-DD)
  mae: string; // Nome da mãe
  endereco: string; // Endereço completo
  cep: string; // CEP formatado
  tel: string; // Telefone / WhatsApp
  postoId: string; // ID do Posto vinculado (Ex: "P01")
  postoNome: string; // Nome do Posto vinculado (Ex: "Posto Central - Centro")
  operadorId?: string; // Quem cadastrou originalmente
  operadorNome?: string;
  criadoEm: string;
  atualizadoEm: string;
  observacoes?: string;
}

export type ActiveTab = 
  | 'ENTRADA' 
  | 'OPERADORES' 
  | 'POSTOS' 
  | 'AGENDA' 
  | 'AGENDAMENTOS' 
  | 'PACIENTES'
  | 'CADASTROS'
  | 'RELATORIO' 
  | 'FERRAMENTAS'
  | 'GERENCIADOR'
  | 'PAINEL';

export type DeviceType = 'COMPUTER' | 'NOTEBOOK' | 'PHONE' | 'TABLET' | 'TERMINAL';
export type DeviceStatus = 'CONNECTED' | 'INVITED' | 'AUTHORIZED' | 'BLOCKED';
export type ConnectionType = 'WIFI_5GHZ' | 'WIFI_24GHZ' | 'ETHERNET';

export interface LocalNetworkDevice {
  id: string;
  nome: string;
  tipo: DeviceType;
  ip: string;
  macAddress: string;
  status: DeviceStatus;
  conexao: ConnectionType;
  postoId?: string;
  postoNome?: string;
  ultimoAcesso: string;
  autorizadoEm?: string;
  autorizadoPor?: string;
  conviteEnviado?: boolean;
}

export interface LocalNetworkConfig {
  localServerIp: string;
  port: number;
  serverName: string;
  networkNameSSID: string;
  networkPassword?: string;
  hotspotEnabled?: boolean;
  firewallStatus: 'CONFIGURED' | 'PENDING' | 'MANUAL';
  networkDiscoveryEnabled: boolean;
  allowAutoJoin: boolean;
  windowsFirewallRuleCreated: boolean;
  modoRede: 'LOCAL_LAN' | 'HOTSPOT_WIFI' | 'OFFLINE_STANDALONE';
  ultimoScanEm?: string;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  email: string;
  nome: string;
  role: UserRole;
  postoId?: string;
  origem?: string;
  lastActiveAt: number; // timestamp ms
  loggedInAt: string; // ISO string
  deviceHint: string;
  ip?: string;
}

export type SessionInfo = ActiveSession;

export interface DeveloperTransferHistory {
  id: string;
  deNome: string;
  deEmail: string;
  paraNome: string;
  paraEmail: string;
  data: string;
  motivo: string;
  ipOrigem?: string;
}

export interface DeveloperIdentity {
  id: string;
  nomeDesenvolvedor: string;
  emailGoogle: string; // Ex: diguinnfsantos@gmail.com
  telefoneContato?: string;
  instituicao: string;
  papel: string;
  status: 'ATIVO' | 'TRANSFERIDO' | 'HOMOLOGADO';
  dataVinculacao: string;
  ultimaTransferencia?: string;
  historicoTransferencias: DeveloperTransferHistory[];
  termoDoacaoAceito: boolean;
  termoDoacaoTexto?: string;
  chaveLicenca: string;
}

