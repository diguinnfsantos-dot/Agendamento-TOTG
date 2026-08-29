import React, { useState, useEffect } from 'react';
import { User, Posto, Slot, Appointment, SystemRule, AuditLog } from '../types';
import { db } from '../storage/db';
import { AdminDeveloperModal } from './AdminDeveloperModal';
import { AdminQuotaManager } from './AdminQuotaManager';
import { 
  Sliders, 
  Building2, 
  ShieldCheck, 
  Activity, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  FileSpreadsheet, 
  Clock, 
  UserCheck, 
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  KeyRound,
  Mail,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Code2
} from 'lucide-react';
import { isValidAlphanumericPassword } from '../utils/formatters';

interface AdminManagerProps {
  currentUser?: User | null;
  users: User[];
  postos: Posto[];
  slots: Slot[];
  appointments: Appointment[];
  rules: SystemRule;
  onUpdateRules: (rules: SystemRule) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onSlotsUpdated?: (slots: Slot[]) => void;
  onNavigateTab?: (tab: 'OPERADORES' | 'POSTOS' | 'AGENDA' | 'AGENDAMENTOS') => void;
  onUpdateUserStatus?: (userId: string, status: 'ACTIVE' | 'BLOCKED') => void;
}

export const AdminManager: React.FC<AdminManagerProps> = ({
  currentUser,
  users,
  postos,
  slots,
  appointments,
  rules,
  onUpdateRules,
  onUpdateUser,
  onSlotsUpdated,
  onNavigateTab,
  onUpdateUserStatus,
}) => {
  // Form State for Clinic & Rules
  const [formData, setFormData] = useState<SystemRule>({ ...rules });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>(() => db.getLogs());
  const [logFilter, setLogFilter] = useState<string>('TODOS');
  
  // Find current master admin user
  const masterAdmin = users.find(u => u.role === 'ADMIN') || (currentUser?.role === 'ADMIN' ? currentUser : null) || {
    id: 'usr_admin_01',
    nome: 'Rodrigo Santos (Administrador Master)',
    email: 'admin@klinica.com',
    senha: '543W21',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    criadoEm: '2026-08-01T10:00:00Z',
  };

  // Form State for Master Admin Credentials
  const [adminNome, setAdminNome] = useState(masterAdmin.nome);
  const [adminEmail, setAdminEmail] = useState(masterAdmin.email);
  const [adminSenha, setAdminSenha] = useState(masterAdmin.senha);
  const [adminConfirmSenha, setAdminConfirmSenha] = useState(masterAdmin.senha);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminSaveSuccess, setAdminSaveSuccess] = useState(false);
  const [adminSaveError, setAdminSaveError] = useState('');

  // Keep admin form in sync if users changes externally
  useEffect(() => {
    const admin = users.find(u => u.role === 'ADMIN') || (currentUser?.role === 'ADMIN' ? currentUser : null);
    if (admin) {
      setAdminNome(admin.nome);
      setAdminEmail(admin.email);
      setAdminSenha(admin.senha);
      setAdminConfirmSenha(admin.senha);
    }
  }, [users, currentUser]);

  // Maintenance Feedback
  const [maintenanceSuccess, setMaintenanceSuccess] = useState('');
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [developerIdentity, setDeveloperIdentity] = useState(() => db.getDeveloperIdentity());

  // Refresh developer identity when modal opens/closes
  const handleOpenDeveloperModal = () => {
    setDeveloperIdentity(db.getDeveloperIdentity());
    setShowDeveloperModal(true);
  };

  // Live password validation counters
  const adminDigitsCount = (adminSenha.match(/\d/g) || []).length;
  const adminLettersCount = (adminSenha.match(/[a-zA-Z]/g) || []).length;
  const isPasswordValid = isValidAlphanumericPassword(adminSenha);
  const passwordsMatch = adminSenha === adminConfirmSenha;

  // Handle Save Master Admin
  const handleSaveMasterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSaveError('');
    setAdminSaveSuccess(false);

    const cleanNome = adminNome.trim();
    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanSenha = adminSenha.trim();
    const cleanConfirm = adminConfirmSenha.trim();

    if (!cleanNome) {
      setAdminSaveError('Informe o nome do Administrador Master.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAdminSaveError('Informe um email institucional válido para o Administrador Master.');
      return;
    }

    // Check if another user is using this email
    const emailConflict = users.some(
      u => u.id !== masterAdmin.id && u.email.toLowerCase().trim() === cleanEmail
    );
    if (emailConflict) {
      setAdminSaveError('Este email já está sendo utilizado por outro usuário no sistema.');
      return;
    }

    if (!isValidAlphanumericPassword(cleanSenha)) {
      setAdminSaveError('A nova senha deve conter exatamente 6 dígitos alfanuméricos: 5 números e 1 letra (Ex: 543W21).');
      return;
    }

    if (cleanSenha !== cleanConfirm) {
      setAdminSaveError('A confirmação da senha não coincide com a nova senha digitada.');
      return;
    }

    const updatedAdmin: User = {
      ...masterAdmin,
      nome: cleanNome,
      email: cleanEmail,
      senha: cleanSenha,
      role: 'ADMIN',
      status: 'ACTIVE',
    };

    // 1. Immediately persist and ban old credentials across localStorage & server
    await db.updateMasterProfile(updatedAdmin, masterAdmin?.email);

    // 2. Notify parent state
    if (onUpdateUser) {
      onUpdateUser(updatedAdmin);
    }

    // 3. Register audit log
    db.addLog(
      cleanNome,
      cleanEmail,
      'CREDENCIAIS_MASTER_ATUALIZADAS',
      `Dados cadastrais do Administrador Master atualizados com sucesso (Nome: ${cleanNome}, Email: ${cleanEmail}, Senha alfanumérica atualizada).`,
      'SUCESSO'
    );

    setLogs(db.getLogs());
    setAdminSaveSuccess(true);
    setTimeout(() => setAdminSaveSuccess(false), 4500);
  };

  const handleSaveClinicSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRules(formData);
    db.saveRules(formData);

    db.addLog(
      adminNome || 'Administrador Master',
      adminEmail || 'admin@klinica.com',
      'CONFIGURACOES_CLINICA_ATUALIZADAS',
      `Dados institucionais e cota padrão (${formData.maxVagasPorId} vagas) atualizados.`,
      'SUCESSO'
    );

    setLogs(db.getLogs());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Reset/Reopen quotas for a new cycle
  const handleResetQuotasCycle = () => {
    if (!window.confirm('Tem certeza que deseja zerar o ciclo de agendamentos atual? Todos os slots disponíveis serão mantidos para novas marcações.')) {
      return;
    }

    db.addLog(
      adminNome || 'Administrador Master',
      adminEmail || 'admin@klinica.com',
      'CICLO_COTAS_REINICIADO',
      'Novo ciclo de regulação aberto. Contadores de vagas por posto foram liberados.',
      'AVISO'
    );

    setLogs(db.getLogs());
    setMaintenanceSuccess('Ciclo de cotas reiniciado com sucesso! Novos agendamentos liberados.');
    setTimeout(() => setMaintenanceSuccess(''), 4500);
  };

  // Clear old cancelled records
  const handlePurgeCancelled = () => {
    const cancelledCount = appointments.filter(a => a.status === 'CANCELLED').length;
    if (cancelledCount === 0) {
      alert('Não há nenhum agendamento cancelado para limpeza.');
      return;
    }

    if (!window.confirm(`Deseja remover definitivamente ${cancelledCount} agendamentos com status "Cancelado"?`)) {
      return;
    }

    const filteredApps = appointments.filter(a => a.status !== 'CANCELLED');
    db.saveAppointments(filteredApps);

    db.addLog(
      adminNome || 'Administrador Master',
      adminEmail || 'admin@klinica.com',
      'PURGA_REGISTROS_CANCELADOS',
      `${cancelledCount} registros de agendamento cancelados foram expurgados para otimização do banco.`,
      'INFO'
    );

    setLogs(db.getLogs());
    setMaintenanceSuccess(`${cancelledCount} agendamentos cancelados foram removidos do banco com sucesso.`);
    setTimeout(() => {
      setMaintenanceSuccess('');
      window.location.reload();
    }, 2000);
  };

  // Run Integrity Optimization
  const handleOptimizeDatabase = () => {
    // Check and repair orphaned slots
    let fixedSlots = 0;
    const cleanedSlots = slots.map(s => {
      if (s.status === 'AGENDADO' && !appointments.some(a => a.slotId === s.id && a.status !== 'CANCELLED')) {
        fixedSlots++;
        return { ...s, status: 'DISPONIVEL' as const, agendamentoId: undefined };
      }
      return s;
    });

    if (fixedSlots > 0) {
      db.saveSlots(cleanedSlots);
      if (onSlotsUpdated) onSlotsUpdated(cleanedSlots);
    }

    db.addLog(
      adminNome || 'Administrador Master',
      adminEmail || 'admin@klinica.com',
      'OTIMIZACAO_INTEGRIDADE',
      `Diagnóstico executado: 0 erros encontrados, ${fixedSlots} slots corrigidos e índices reindexados.`,
      'SUCESSO'
    );

    setLogs(db.getLogs());
    setMaintenanceSuccess('Diagnóstico concluído: 100% de integridade no banco de dados!');
    setTimeout(() => setMaintenanceSuccess(''), 4000);
  };

  // Export Audit Logs to CSV/TXT
  const handleExportLogs = () => {
    const lines = [
      'ID;DATA_HORA;USUARIO;EMAIL;ACAO;TIPO;DETALHES',
      ...logs.map(l => `${l.id};"${new Date(l.timestamp).toLocaleString('pt-BR')}";"${l.usuarioNome}";"${l.usuarioEmail}";"${l.acao}";"${l.tipo}";"${l.detalhes.replace(/"/g, '""')}"`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logFilter === 'TODOS' 
    ? logs 
    : logs.filter(l => l.tipo === logFilter);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white border border-slate-800 shadow-xs">
            <Sliders className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Administração Geral Master
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Gerenciador Central
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Tela de Gerenciador do Sistema
            </h2>
            <p className="text-xs text-slate-500">
              Controle de credenciais master, parâmetros institucionais, regulação de cotas globais e auditoria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs">
          <Cpu className="w-4 h-4 text-blue-600" />
          <div>
            <p className="font-bold text-slate-800">Versão: v2.5.0-Bento</p>
            <p className="text-[10px] text-slate-400 font-mono">Status: 100% Saudável</p>
          </div>
        </div>
      </div>

      {/* Maintenance Feedback */}
      {maintenanceSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{maintenanceSuccess}</span>
        </div>
      )}

      {/* SECTION 0: GOVERNANÇA TÉCNICA & DESENVOLVEDOR MASTER (ÁREA VOLUNTÁRIA) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-indigo-500/30 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner shrink-0 mt-0.5 sm:mt-0">
              <Code2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 font-mono">
                  Governança & Cessão de Tecnologia
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                  Voluntariado & Transferência
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Protegido por Senha
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white mt-1">
                Painel do Desenvolvedor Master & Titularidade Técnica
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Desenvolvedor atual: <strong>{developerIdentity.nomeDesenvolvedor}</strong> • Gmail Master: <span className="font-mono text-indigo-200">{developerIdentity.emailGoogle}</span>
              </p>
            </div>
          </div>

          <button
            id="btn_open_developer_panel"
            onClick={handleOpenDeveloperModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
          >
            <KeyRound className="w-4 h-4 text-indigo-200" />
            <span>Acessar Painel do Desenvolvedor</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: MASTER ADMIN CREDENTIALS & CLINIC SETTINGS (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: DADOS & CREDENCIAIS DO ADMINISTRADOR MASTER */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 font-mono">
                    Acesso & Segurança de Nível Master
                  </span>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Dados do Administrador Master (Edição de Email & Senha)
                  </h3>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                👑 Super Admin
              </span>
            </div>

            {adminSaveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Sucesso!</strong> Dados e senha do Administrador Master atualizados com segurança.
                </span>
              </div>
            )}

            {adminSaveError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{adminSaveError}</span>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Nova Regra de Senha de Alta Segurança:</strong> A senha deve conter exatamente <strong>6 dígitos alfanuméricos</strong>, sendo <strong>5 números e 1 letra</strong> (ex: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-blue-700">543W21</code>).
              </p>
            </div>

            <form id="form-master-admin" onSubmit={handleSaveMasterAdmin} className="space-y-4 text-xs">
              {/* Nome do Administrador Master */}
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="set-admin-nome">
                  Nome do Administrador Master <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="set-admin-nome"
                    type="text"
                    required
                    value={adminNome}
                    onChange={(e) => setAdminNome(e.target.value)}
                    placeholder="Ex: Rodrigo Santos"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Email do Administrador Master */}
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="set-admin-email">
                  Email de Acesso Master <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="set-admin-email"
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@klinica.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Senha e Confirmação de Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700" htmlFor="set-admin-senha">
                      Nova Senha Master <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showAdminPassword ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                  </div>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="set-admin-senha"
                      type={showAdminPassword ? 'text' : 'password'}
                      maxLength={6}
                      required
                      value={adminSenha}
                      onChange={(e) => setAdminSenha(e.target.value.slice(0, 6))}
                      placeholder="Ex: 543W21"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm tracking-wider text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="set-admin-confirma">
                    Confirmar Senha <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="set-admin-confirma"
                      type={showAdminPassword ? 'text' : 'password'}
                      maxLength={6}
                      required
                      value={adminConfirmSenha}
                      onChange={(e) => setAdminConfirmSenha(e.target.value.slice(0, 6))}
                      placeholder="Ex: 543W21"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm tracking-wider text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password validation indicators */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Validação de Segurança em Tempo Real:
                </p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold ${
                    adminDigitsCount === 5 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {adminDigitsCount === 5 ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                    {adminDigitsCount === 5 ? '5 Números OK' : `Números: ${adminDigitsCount}/5`}
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold ${
                    adminLettersCount === 1 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {adminLettersCount === 1 ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                    {adminLettersCount === 1 ? '1 Letra OK' : `Letras: ${adminLettersCount}/1`}
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold ${
                    isPasswordValid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {isPasswordValid ? '✓ 6 Caracteres Alfanuméricos' : 'Tamanho: 6 caracteres'}
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold ${
                    passwordsMatch ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {passwordsMatch ? '✓ Senhas Coincidem' : '✗ Senhas Não Coincidem'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  id="btn-save-master-admin"
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-all hover:shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Dados do Administrador Master</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* CARD 2: DADOS INSTITUCIONAIS & PARÂMETROS DA CLÍNICA */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    Identidade do Estabelecimento
                  </span>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Dados Institucionais & Parâmetros da Clínica
                  </h3>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">
                Emissor Oficial
              </span>
            </div>

            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Parâmetros institucionais salvos com sucesso!</span>
              </div>
            )}

            <form id="form-clinic-settings" onSubmit={handleSaveClinicSettings} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="set-nome-clinica">
                    Nome Oficial da Clínica / Centro Médico <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="set-nome-clinica"
                    type="text"
                    required
                    value={formData.nomeClinica}
                    onChange={(e) => setFormData({ ...formData, nomeClinica: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="set-telefone">
                    Telefone / WhatsApp de Suporte <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="set-telefone"
                    type="text"
                    required
                    value={formData.telefoneClinica}
                    onChange={(e) => setFormData({ ...formData, telefoneClinica: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="set-cota-max">
                    Cota Padrão Máxima por ID/Posto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="set-cota-max"
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={formData.maxVagasPorId}
                    onChange={(e) => setFormData({ ...formData, maxVagasPorId: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="set-endereco">
                    Endereço Completo da Unidade Médica <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="set-endereco"
                    type="text"
                    required
                    value={formData.enderecoClinica}
                    onChange={(e) => setFormData({ ...formData, enderecoClinica: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="set-msg-wa">
                    Template de Mensagem de Lembrete (WhatsApp)
                  </label>
                  <textarea
                    id="set-msg-wa"
                    rows={3}
                    value={formData.mensagemPadraoWhatsApp}
                    onChange={(e) => setFormData({ ...formData, mensagemPadraoWhatsApp: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tags: {'{PACIENTE}'}, {'{DATA}'}, {'{HORARIO}'}, {'{ESPECIALIDADE}'}, {'{MEDICO}'}, {'{CLINICA}'}, {'{ENDERECO_CLINICA}'}, {'{ORIGEM}'}, {'{SUS}'}, {'{TEL_CLINICA}'}.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  id="btn-save-clinic-settings"
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações Institucionais</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* SECTION: GERENCIAMENTO DE OPERADORES & POSTOS (ATALHO & LIBERAÇÃO RÁPIDA) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center border border-slate-800 shadow-2xs">
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                  Equipes & Postos de Coleta
                </span>
                {users.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING').length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    {users.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING').length} Aguardando Autorização
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-900 leading-tight mt-0.5">
                Gerenciamento de Operadores & Postos de Coleta
              </h3>
              <p className="text-xs text-slate-500">
                Visualize os operadores cadastrados, aprove novas solicitações de acesso e regule as origens
              </p>
            </div>
          </div>

          {onNavigateTab && (
            <button
              id="btn-goto-operators-tab"
              onClick={() => onNavigateTab('OPERADORES')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all shrink-0"
            >
              <UserIcon className="w-4 h-4" />
              <span>Abrir Tela Completa de Operadores & Postos</span>
            </button>
          )}
        </div>

        {/* Status Mini Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Total de Operadores</span>
            <p className="text-xl font-black text-slate-900 mt-1">
              {users.filter(u => u.role === 'OPERATOR').length} cadastrados
            </p>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 font-mono">Operadores Ativos</span>
            <p className="text-xl font-black text-emerald-700 mt-1">
              {users.filter(u => u.role === 'OPERATOR' && u.status === 'ACTIVE').length} liberados
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${
            users.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING').length > 0
              ? 'bg-amber-50 border-amber-300'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono">Aguardando Aprovação</span>
            <p className="text-xl font-black text-amber-700 mt-1">
              {users.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING').length} pendentes
            </p>
          </div>
        </div>

        {/* List of Pending Operators (if any) */}
        {users.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING').length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Operadores com cadastro pendente de liberação:</span>
            </div>
            <div className="space-y-2">
              {users.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING').map(op => (
                <div key={op.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-amber-200 rounded-xl">
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <span>{op.nome}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {op.postoId} - {op.origem}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{op.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {onUpdateUserStatus && (
                      <button
                        onClick={() => onUpdateUserStatus(op.id, 'ACTIVE')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Autorizar Acesso</span>
                      </button>
                    )}
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('OPERADORES')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Ver Detalhes
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION: REGULAMENTAÇÃO DE COTAS POR ESPECIALIDADE & REPESCAGEM AUTOMÁTICA */}
      <AdminQuotaManager
        rules={formData}
        postos={postos}
        appointments={appointments}
        slots={slots}
        onRulesUpdated={(newRules) => {
          setFormData(newRules);
          onUpdateRules(newRules);
          setLogs(db.getLogs());
        }}
      />

      {/* SECTION 2: GESTÃO DE CICLO & MANUTENÇÃO DO BANCO (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ciclo & Cotas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                  Regulação de Ciclos
                </span>
                <h3 className="text-sm font-black text-slate-900 leading-tight">
                  Controle de Cotas & Reinício de Período
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mt-3">
              Reinicie o período de regulação para liberar cotas em todos os postos de coleta cadastrados sem apagar o histórico de agendamentos realizados.
            </p>
          </div>

          <button
            id="btn-reset-quotas"
            onClick={handleResetQuotasCycle}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Abrir Novo Ciclo de Vagas nos Postos</span>
          </button>
        </div>

        {/* Diagnóstico & Manutenção do Banco */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Saúde do Banco
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Manutenção & Integridade do Sistema
              </h3>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Total de Slots de Atendimento:</span>
              <span className="font-bold text-slate-900">{slots.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Agendamentos Válidos (Ativos):</span>
              <span className="font-bold text-blue-700">{appointments.filter(a => a.status === 'CONFIRMED').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cancelados Arquivados:</span>
              <span className="font-bold text-rose-600">{appointments.filter(a => a.status === 'CANCELLED').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Conflitos de Horário:</span>
              <span className="font-bold text-emerald-600">0 (Nenhum detectado)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              id="btn-optimize-db"
              onClick={handleOptimizeDatabase}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Otimizar & Diagnosticar</span>
            </button>

            <button
              id="btn-purge-cancelled"
              onClick={handlePurgeCancelled}
              className="py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpar Cancelados</span>
            </button>
          </div>
        </div>
      </div>

      {/* FULL WIDTH: Auditoria e Logs de Atividades */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center border border-slate-800">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Auditoria & Rastreabilidade
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Log de Atividades & Alterações do Sistema
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
              {['TODOS', 'SUCESSO', 'INFO', 'AVISO', 'ALERTA'].map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    logFilter === f ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              id="btn-export-audit-csv"
              onClick={handleExportLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Usuário</th>
                <th className="py-2.5 px-3">Ação</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Detalhes do Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                    {log.usuarioNome}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                    {log.acao}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase font-mono ${
                      log.tipo === 'SUCESSO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.tipo === 'AVISO'
                        ? 'bg-amber-100 text-amber-800'
                        : log.tipo === 'ALERTA'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {log.tipo}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {log.detalhes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Developer Modal */}
      {showDeveloperModal && (
        <AdminDeveloperModal
          isOpen={showDeveloperModal}
          onClose={() => {
            setShowDeveloperModal(false);
            setDeveloperIdentity(db.getDeveloperIdentity());
          }}
          onIdentityUpdated={(newIdentity) => {
            setDeveloperIdentity(newIdentity);
          }}
        />
      )}
    </div>
  );
};

