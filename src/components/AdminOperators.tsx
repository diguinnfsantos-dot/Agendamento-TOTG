import React, { useState, useEffect } from 'react';
import { User, Posto, ActiveSession } from '../types';
import { db } from '../storage/db';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Trash2, 
  Share2, 
  Check, 
  Search, 
  Clock, 
  Building, 
  Mail, 
  UserPlus,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  Calendar,
  RefreshCw,
  Sparkles,
  Database,
  CheckCheck,
  Send,
  Laptop,
  Smartphone,
  Radio,
  Edit3,
  Phone,
  ArrowRightLeft
} from 'lucide-react';
import { isValidAlphanumericPassword, formatPhone } from '../utils/formatters';

interface AdminOperatorsProps {
  users: User[];
  postos: Posto[];
  onUpdateUserStatus: (userId: string, status: 'ACTIVE' | 'BLOCKED') => void;
  onDeleteUser: (userId: string) => void;
  onUpdateUser?: (user: User) => void;
  onRegisterUser?: (newUser: Omit<User, 'id' | 'criadoEm'>) => { success: boolean; message: string };
  onRecoverOperators?: (searchName?: string) => Promise<{ success: boolean; recoveredCount: number; pendingCount: number; users: User[]; message: string }>;
  onApproveAllPending?: () => void;
}

export const AdminOperators: React.FC<AdminOperatorsProps> = ({
  users,
  postos,
  onUpdateUserStatus,
  onDeleteUser,
  onUpdateUser,
  onRegisterUser,
  onRecoverOperators,
  onApproveAllPending,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Link generator modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostoForShare, setSelectedPostoForShare] = useState<string>('');

  // Modal State for New Operator
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalNome, setModalNome] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalTelefone, setModalTelefone] = useState('');
  const [modalSenha, setModalSenha] = useState('543W21');
  const [modalPostoId, setModalPostoId] = useState(postos[0]?.id || 'P203');
  const [modalStatus, setModalStatus] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Modal State for Edit Operator / Job Rotation
  const [editingOperator, setEditingOperator] = useState<User | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editSenha, setEditSenha] = useState('');
  const [editPostoId, setEditPostoId] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'PENDING' | 'BLOCKED'>('ACTIVE');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Active Sessions Tracking
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const list = await db.fetchActiveSessionsApi();
        if (Array.isArray(list)) {
          setActiveSessions(list);
        }
      } catch (e) {
        // Silent fail
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const operators = users.filter(u => u.role === 'OPERATOR');

  const filteredOperators = operators.filter(op => {
    const matchesStatus = filterStatus === 'ALL' || op.status === filterStatus;
    const matchesSearch = 
      op.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.telefone && op.telefone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (op.postoId && op.postoId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (op.origem && op.origem.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = operators.filter(o => o.status === 'PENDING').length;
  const activeCount = operators.filter(o => o.status === 'ACTIVE').length;
  const blockedCount = operators.filter(o => o.status === 'BLOCKED').length;

  const pendingOperators = operators.filter(o => o.status === 'PENDING');

  // Deep Scan and Unified Operator Recovery
  const handleDeepScanAndRecover = async (targetQuery?: string) => {
    try {
      setIsScanning(true);
      setScanMessage(null);

      let result;
      if (onRecoverOperators) {
        result = await onRecoverOperators(targetQuery || searchTerm || 'all');
      } else {
        result = await db.recoverAndSyncOperators(targetQuery || searchTerm || 'all');
      }

      setIsScanning(false);
      setScanMessage({
        type: 'success',
        text: result.message || `Varredura concluída com sucesso! Localizados ${result.recoveredCount || operators.length} operadores no total (${result.pendingCount ?? pendingCount} aguardando autorização).`,
      });

      // If pending operators exist, auto-switch filter so admin sees them immediately
      if ((result.pendingCount ?? pendingCount) > 0) {
        setFilterStatus('PENDING');
      }

      setTimeout(() => {
        setScanMessage(null);
      }, 7000);
    } catch (e: any) {
      setIsScanning(false);
      setScanMessage({
        type: 'error',
        text: 'Erro ao executar varredura. Os dados locais foram mantidos com segurança.',
      });
    }
  };

  const getRegistrationLink = (postoId?: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    if (postoId) {
      return `${baseUrl}?cadastro=operador&posto=${encodeURIComponent(postoId)}`;
    }
    return `${baseUrl}?cadastro=operador`;
  };

  const handleCopyRegistrationLink = (postoId?: string) => {
    const link = getRegistrationLink(postoId);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareWhatsApp = (postoId?: string) => {
    const link = getRegistrationLink(postoId);
    const selectedPosto = postos.find(p => p.id === postoId);
    const postoText = selectedPosto ? `\nPosto de Coleta: *${selectedPosto.origem}* (ID: ${selectedPosto.id})` : '';
    const text = `🏥 *Cadastro de Operador - Central de Agendamento*\n\nOlá operador! Complete seu cadastro para autorização de acesso ao sistema de agendamento clínico:${postoText}\n\n🔗 ${link}\n\nApós preencher seus dados, o Administrador Master liberará seu acesso.`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleAddOperatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!modalNome.trim()) {
      setModalError('Informe o nome completo do operador.');
      return;
    }
    if (!modalEmail.trim()) {
      setModalError('Informe o email institucional do operador.');
      return;
    }
    const cleanPhoneDigits = modalTelefone.replace(/\D/g, '');
    if (!modalTelefone.trim() || cleanPhoneDigits.length < 10) {
      setModalError('Informe o telefone celular com DDD obrigatório (ex: (21) 99999-9999).');
      return;
    }
    if (!isValidAlphanumericPassword(modalSenha.trim())) {
      setModalError('A senha de segurança deve conter exatamente 6 dígitos alfanuméricos (5 números e 1 letra). Ex: 543W21');
      return;
    }

    const selectedPosto = postos.find(p => p.id === modalPostoId) || postos[0];
    if (!selectedPosto) {
      setModalError('Selecione um posto de coleta válido.');
      return;
    }

    if (onRegisterUser) {
      const result = onRegisterUser({
        nome: modalNome.trim(),
        email: modalEmail.trim(),
        telefone: modalTelefone.trim(),
        senha: modalSenha.trim(),
        postoId: selectedPosto.id,
        origem: selectedPosto.origem,
        role: 'OPERATOR',
        status: modalStatus,
      });

      if (result.success) {
        setModalSuccess(modalStatus === 'ACTIVE' ? 'Operador cadastrado e ativado com sucesso!' : 'Operador cadastrado como pendente!');
        setTimeout(() => {
          setShowAddModal(false);
          setModalNome('');
          setModalEmail('');
          setModalTelefone('');
          setModalSenha('543W21');
          setModalSuccess('');
        }, 1500);
      } else {
        setModalError(result.message);
      }
    }
  };

  // Open Edit / Job Rotation Modal
  const handleOpenEdit = (op: User) => {
    setEditingOperator(op);
    setEditNome(op.nome);
    setEditEmail(op.email);
    setEditTelefone(op.telefone || '');
    setEditSenha(op.senha || '543W21');
    setEditPostoId(op.postoId || postos[0]?.id || 'P203');
    setEditStatus(op.status);
    setEditError('');
    setEditSuccess('');
  };

  // Save Edit / Job Rotation
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOperator) return;
    setEditError('');
    setEditSuccess('');

    if (!editNome.trim()) {
      setEditError('Informe o nome completo do operador.');
      return;
    }
    if (!editEmail.trim()) {
      setEditError('Informe o email institucional.');
      return;
    }
    const rawDigits = editTelefone.replace(/\D/g, '');
    if (!editTelefone.trim() || rawDigits.length < 10) {
      setEditError('O telefone celular com DDD é obrigatório (ex: (21) 99999-9999).');
      return;
    }
    if (!isValidAlphanumericPassword(editSenha.trim())) {
      setEditError('A senha deve conter exatamente 6 dígitos alfanuméricos (5 números e 1 letra). Ex: 543W21');
      return;
    }

    const selectedPosto = postos.find(p => p.id === editPostoId) || postos[0];
    const isJobRotation = editingOperator.postoId !== selectedPosto.id;

    const updatedUser: User = {
      ...editingOperator,
      nome: editNome.trim(),
      email: editEmail.trim().toLowerCase(),
      telefone: editTelefone.trim(),
      senha: editSenha.trim(),
      postoId: selectedPosto.id,
      origem: selectedPosto.origem,
      status: editStatus,
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
    try {
      await db.updateUserApi(updatedUser);
    } catch {}

    db.addLog(
      'Administrador Master',
      'admin@klinica.com',
      isJobRotation ? 'JOB_ROTATION_OPERADOR' : 'OPERADOR_ATUALIZADO',
      isJobRotation 
        ? `Job Rotation: Operador ${updatedUser.nome} transferido de ${editingOperator.origem || editingOperator.postoId} para ${updatedUser.origem} (${updatedUser.postoId}). Telefone: ${updatedUser.telefone}.`
        : `Cadastro do operador ${updatedUser.nome} atualizado. Telefone: ${updatedUser.telefone}, Posto: ${updatedUser.origem}, Status: ${updatedUser.status}.`,
      'SUCESSO'
    );

    setEditSuccess(isJobRotation ? 'Job Rotation concluído! Posto e dados do operador atualizados com sucesso.' : 'Dados cadastrais do operador atualizados com sucesso!');
    setTimeout(() => {
      setEditingOperator(null);
      setEditSuccess('');
    }, 1500);
  };

  return (
    <div className="space-y-5">
      {/* Top Bento Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
              Equipes, Postos & Autorizações
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Base Central Unificada
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
            <span>Gerenciamento de Operadores & Postos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Todos os cadastros efetuados pela tela de Login ou via Link de Convite são gravados centralmente na mesma base da clínica. Autorize operadores, sincronize pendências ou adicione novos cooperadores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Deep Scan / Recover Operators Button */}
          <button
            id="btn-recover-sync-operators"
            onClick={() => handleDeepScanAndRecover()}
            disabled={isScanning}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
              isScanning 
                ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
            }`}
            title="Efetuar varredura completa na base de dados central para localizar e unificar todos os operadores cadastrados"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-amber-700' : 'text-emerald-200'}`} />
            <span>{isScanning ? 'Executando Varredura...' : '🔍 Buscar / Sincronizar Operadores'}</span>
          </button>

          <button
            id="btn-add-operator-modal"
            onClick={() => {
              setModalError('');
              setModalSuccess('');
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>+ Cadastrar Operador</span>
          </button>

          <button
            id="btn-share-invite-modal"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>Link de Cadastro</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK SCAN MESSAGE */}
      {scanMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 shadow-xs animate-fadeIn ${
          scanMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : scanMessage.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <div className="flex items-start gap-2.5">
            {scanMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{scanMessage.type === 'success' ? 'Varredura e Unificação Concluídas' : 'Aviso de Sincronização'}</p>
              <p className="mt-0.5">{scanMessage.text}</p>
            </div>
          </div>
          <button 
            onClick={() => setScanMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PENDING NOTIFICATION BANNER */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 font-mono">
                  Autorização de Acesso Necessária
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-400">
                  {pendingCount} {pendingCount === 1 ? 'Pendente' : 'Pendentes'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-amber-950 mt-0.5">
                Há novos operadores cadastrados aguardando liberação de acesso pelo Administrador Master
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {pendingOperators.map(p => (
                  <div 
                    key={p.id} 
                    className="inline-flex items-center gap-2 bg-white/90 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-950 shadow-2xs"
                  >
                    <span><strong>{p.nome}</strong> ({p.email}) - {p.origem || p.postoId}</span>
                    <button
                      onClick={() => onUpdateUserStatus(p.id, 'ACTIVE')}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Autorizar</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onApproveAllPending && pendingCount > 1 && (
              <button
                id="btn-approve-all-pending"
                onClick={onApproveAllPending}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Autorizar Todos ({pendingCount})</span>
              </button>
            )}

            <button
              id="btn-filter-pending-banner"
              onClick={() => setFilterStatus('PENDING')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              <span>Ver Pendentes ({pendingCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setFilterStatus('ALL')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'ALL' ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-xs' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Total de Operadores</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{operators.length}</p>
        </div>

        <div 
          onClick={() => setFilterStatus('PENDING')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'PENDING' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs bg-amber-50/40' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold tracking-wider text-amber-700 font-mono">Aguardando Autorização</p>
            {pendingCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{pendingCount}</p>
        </div>

        <div 
          onClick={() => setFilterStatus('ACTIVE')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'ACTIVE' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs bg-emerald-50/40' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 font-mono">Operadores Ativos</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">{activeCount}</p>
        </div>

        <div 
          onClick={() => setFilterStatus('BLOCKED')}
          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'BLOCKED' ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-xs bg-rose-50/40' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] uppercase font-bold tracking-wider text-rose-700 font-mono">Operadores Bloqueados</p>
          <p className="text-2xl font-black text-rose-600 mt-2">{blockedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome (ex: Wanessa), email, ID ou posto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDeepScanAndRecover(searchTerm);
                  }
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => handleDeepScanAndRecover(searchTerm)}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                title="Buscar no banco de dados central"
              >
                Buscar
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {(['ALL', 'PENDING', 'ACTIVE', 'BLOCKED'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterStatus === st 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' && `Todos (${operators.length})`}
                {st === 'PENDING' && `Pendentes (${pendingCount})`}
                {st === 'ACTIVE' && `Ativos (${activeCount})`}
                {st === 'BLOCKED' && `Bloqueados (${blockedCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Operators Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Operador / Usuário</th>
                <th className="py-3 px-4">ID & Origem Vinculada</th>
                <th className="py-3 px-4">Data do Cadastro</th>
                <th className="py-3 px-4">Status de Acesso</th>
                <th className="py-3 px-4">Senha Cadastrada</th>
                <th className="py-3 px-4 text-right">Ações do Administrador Master</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredOperators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 space-y-2">
                    <p className="font-semibold text-slate-700">Nenhum operador encontrado com os filtros atuais.</p>
                    <p className="text-xs text-slate-400">Clique em <strong>"Buscar / Sincronizar Operadores"</strong> para buscar cadastros pendentes no banco central.</p>
                    <button
                      onClick={() => handleDeepScanAndRecover()}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sincronizar Base Central</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredOperators.map(op => {
                  const opSession = activeSessions.find(
                    s => s.userId === op.id || (s.email && s.email.toLowerCase() === op.email.toLowerCase())
                  );

                  return (
                    <tr 
                      key={op.id} 
                      className={`transition-colors ${
                        op.status === 'PENDING' 
                          ? 'bg-amber-50/60 hover:bg-amber-50' 
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{op.nome}</span>
                          {op.status === 'PENDING' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-200 text-amber-900 border border-amber-300">
                              Aguardando Liberação
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono">{op.email}</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-mono mt-0.5 font-medium">
                          <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{op.telefone || 'Não informado'}</span>
                        </div>
                        {opSession && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300 font-semibold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            <span>Online agora: <strong>{opSession.deviceHint}</strong></span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          <Building className="w-3 h-3 text-blue-600" />
                          <span>{op.postoId || 'P203'}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 max-w-xs truncate" title={op.origem}>
                          {op.origem || 'Posto de Coleta'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {op.criadoEm ? new Date(op.criadoEm).toLocaleDateString('pt-BR') : '20/08/2026'}
                      </td>
                      <td className="py-3.5 px-4">
                        {op.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            <Clock className="w-3 h-3" />
                            Aguardando Autorização
                          </span>
                        )}
                        {op.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <UserCheck className="w-3 h-3" />
                            Acesso Autorizado (Ativo)
                          </span>
                        )}
                        {op.status === 'BLOCKED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <UserX className="w-3 h-3" />
                            Acesso Bloqueado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 tracking-wider font-semibold border border-slate-200">
                          {op.senha || '543W21'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {op.status === 'PENDING' && (
                            <button
                              id={`btn-approve-op-${op.id}`}
                              onClick={() => onUpdateUserStatus(op.id, 'ACTIVE')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                              title="Autorizar entrada no sistema de agendamento"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-emerald-100" />
                              <span>Autorizar</span>
                            </button>
                          )}

                          {/* Botão Alterar / Job Rotation */}
                          <button
                            id={`btn-edit-op-${op.id}`}
                            onClick={() => handleOpenEdit(op)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition-colors cursor-pointer border border-blue-200"
                            title="Alterar dados e transferir posto (Job Rotation)"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                            <span>Alterar / Posto</span>
                          </button>

                        {op.status === 'ACTIVE' && (
                          <button
                            id={`btn-block-op-${op.id}`}
                            onClick={() => onUpdateUserStatus(op.id, 'BLOCKED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                            title="Bloquear acesso do operador"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Bloquear</span>
                          </button>
                        )}

                        {op.status === 'BLOCKED' && (
                          <button
                            id={`btn-unblock-op-${op.id}`}
                            onClick={() => onUpdateUserStatus(op.id, 'ACTIVE')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                            title="Reativar acesso do operador"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Reativar</span>
                          </button>
                        )}

                        <button
                          id={`btn-delete-op-${op.id}`}
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja excluir o operador ${op.nome}?`)) {
                              onDeleteUser(op.id);
                            }
                          }}
                          className="inline-flex items-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir operador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: COMPARTILHAR LINK DE CADASTRO */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Link de Cadastro de Operador</h3>
                  <p className="text-[11px] text-slate-500">Envie o link para o operador preencher seu cadastro</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vincular a um Posto de Coleta Específico (Opcional):
                </label>
                <select
                  value={selectedPostoForShare}
                  onChange={(e) => setSelectedPostoForShare(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">Nenhum (Operador selecionará seu posto)</option>
                  {postos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.origem} ({p.cidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Link Gerado para Cadastro:
                </label>
                <div className="p-3 bg-slate-100 rounded-xl font-mono text-[11px] text-blue-950 break-all border border-slate-200">
                  {getRegistrationLink(selectedPostoForShare)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleCopyRegistrationLink(selectedPostoForShare)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleShareWhatsApp(selectedPostoForShare)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar WhatsApp</span>
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px] flex items-start gap-2 mt-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Assim que o operador preencher os dados pelo link, o cadastro constará imediatamente como <strong>Aguardando Autorização</strong> nesta tela para liberação do Administrador Master.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVO OPERADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cadastrar Novo Operador</h3>
                  <p className="text-[11px] text-slate-500">Adicione um cooperador vinculado a um posto de coleta</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddOperatorSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Posto de Coleta / ID de Origem <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalPostoId}
                  onChange={(e) => setModalPostoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                >
                  {postos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.origem} ({p.cidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Completo do Operador <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Wanessa Souza"
                  value={modalNome}
                  onChange={(e) => setModalNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email Institucional <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="operador@posto.com"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Telefone Celular do Operador (WhatsApp) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">DDD obrigatório</span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="DDD obrigatório"
                    value={modalTelefone}
                    onChange={(e) => setModalTelefone(formatPhone(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Este número será utilizado para o envio de lembretes aos pacientes atendidos pelo operador.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Senha de Acesso (6 dígitos) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">5 números + 1 letra</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="543W21"
                  value={modalSenha}
                  onChange={(e) => setModalSenha(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm tracking-wider focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Status Inicial
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalStatus('ACTIVE')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      modalStatus === 'ACTIVE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Ativo (Liberado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatus('PENDING')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      modalStatus === 'PENDING'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ⏳ Pendente (Aguardando)
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Salvar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAR OPERADOR & JOB ROTATION */}
      {editingOperator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Gerenciar Operador & Job Rotation</h3>
                  <p className="text-[11px] text-slate-500">Altere dados cadastrais, telefone e transfira o posto de trabalho</p>
                </div>
              </div>
              <button
                onClick={() => setEditingOperator(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{editSuccess}</span>
              </div>
            )}

            {editError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-semibold">{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Job Rotation Notice Banner */}
              {editPostoId !== editingOperator.postoId && (
                <div className="p-3.5 bg-blue-50 border-2 border-blue-300 rounded-xl text-blue-950 text-xs space-y-1 animate-pulse">
                  <div className="flex items-center gap-2 font-bold text-blue-800">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                    <span>Transferência de Posto (Job Rotation) em andamento:</span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    O operador <strong>{editingOperator.nome}</strong> será transferido de <strong>{editingOperator.origem || editingOperator.postoId}</strong> para <strong>{postos.find(p => p.id === editPostoId)?.origem || editPostoId}</strong>.
                  </p>
                </div>
              )}

              {/* Posto Selection / Job Rotation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    <span>Posto de Coleta / Lotação <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Job Rotation</span>
                </div>
                <select
                  value={editPostoId}
                  onChange={(e) => setEditPostoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                >
                  {postos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.origem} ({p.cidade})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Posto atual: <span className="font-semibold text-slate-700">{editingOperator.origem || editingOperator.postoId}</span>
                </p>
              </div>

              {/* Nome */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Nome Completo do Operador <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Email Institucional <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="operador@posto.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Telefone Celular do Operador (WhatsApp) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Telefone Celular do Operador (WhatsApp) <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">DDD obrigatório</span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="DDD obrigatório"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(formatPhone(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Este número de telefone é o que sairá nos lembretes de WhatsApp e canais de contato com os pacientes agendados por este operador.
                </p>
              </div>

              {/* Senha */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800">
                    Senha de Acesso (6 dígitos) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">5 números + 1 letra</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="543W21"
                  value={editSenha}
                  onChange={(e) => setEditSenha(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm tracking-wider focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Status de Acesso
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('ACTIVE')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] border transition-all cursor-pointer ${
                      editStatus === 'ACTIVE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('PENDING')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] border transition-all cursor-pointer ${
                      editStatus === 'PENDING'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ⏳ Pendente
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('BLOCKED')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-[11px] border transition-all cursor-pointer ${
                      editStatus === 'BLOCKED'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ✕ Bloqueado
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOperator(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
