import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building2,
  Mail,
  Phone,
  FileText,
  History,
  ArrowRight,
  Printer,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  BadgeCheck,
  RotateCcw
} from 'lucide-react';
import { DeveloperIdentity, DeveloperTransferHistory } from '../types';
import { db } from '../storage/db';

interface AdminDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIdentityUpdated?: (newIdentity: DeveloperIdentity) => void;
}

export const AdminDeveloperModal: React.FC<AdminDeveloperModalProps> = ({ isOpen, onClose, onIdentityUpdated }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState<string>('');
  const [showInputPassword, setShowInputPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Developer data
  const [identity, setIdentity] = useState<DeveloperIdentity | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'transfer' | 'history' | 'termo'>('info');

  // Transfer Form State
  const [novoNome, setNovoNome] = useState<string>('');
  const [novoEmailGoogle, setNovoEmailGoogle] = useState<string>('');
  const [novoTelefone, setNovoTelefone] = useState<string>('');
  const [novaInstituicao, setNovaInstituicao] = useState<string>('');
  const [novaSenha, setNovaSenha] = useState<string>('');
  const [confirmaNovaSenha, setConfirmaNovaSenha] = useState<string>('');
  const [showNovaSenha, setShowNovaSenha] = useState<boolean>(false);
  const [motivo, setMotivo] = useState<string>('');
  const [currentConfirmPassword, setCurrentConfirmPassword] = useState<string>('');
  const [termoAceito, setTermoAceito] = useState<boolean>(false);

  const [transferError, setTransferError] = useState<string>('');
  const [transferSuccess, setTransferSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showChaveLicenca, setShowChaveLicenca] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Load identity on open
  useEffect(() => {
    if (isOpen) {
      const current = db.getDeveloperIdentity();
      setIdentity(current);
      setNovaInstituicao(current.instituicao || '');
      const masterSaved = localStorage.getItem('clinica_master_identified_email');
      if (masterSaved && masterSaved.toLowerCase() === 'diguinnfsantos@gmail.com') {
        setIsAuthenticated(true);
      }
    } else {
      // Reset state on close
      setIsAuthenticated(false);
      setInputPassword('');
      setAuthError('');
      setTransferError('');
      setTransferSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!inputPassword.trim()) {
      setAuthError('Por favor, informe a senha de acesso do Desenvolvedor.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await db.verifyDeveloperPassword(inputPassword);
      if (res.valid) {
        setIsAuthenticated(true);
        if (res.identity) {
          setIdentity(res.identity);
        }
        setAuthError('');
      } else {
        setAuthError(res.message || 'Senha incorreta. Acesso não autorizado.');
      }
    } catch {
      setAuthError('Ocorreu um erro ao verificar a senha. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');

    if (!novoNome.trim()) {
      setTransferError('Informe o nome completo do novo desenvolvedor / responsável.');
      return;
    }
    if (!novoEmailGoogle.trim() || !novoEmailGoogle.includes('@')) {
      setTransferError('Informe um e-mail Google (Gmail) válido para a nova titularidade.');
      return;
    }
    if (!currentConfirmPassword.trim()) {
      setTransferError('Informe a senha atual de Desenvolvedor para validar esta transferência.');
      return;
    }
    if (novaSenha && novaSenha !== confirmaNovaSenha) {
      setTransferError('A nova senha e a confirmação de senha não coincidem.');
      return;
    }
    if (novaSenha && novaSenha.length < 6) {
      setTransferError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!termoAceito) {
      setTransferError('Você deve aceitar a declaração de transferência e cessão técnica.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await db.transferDeveloperMaster({
        currentPassword: currentConfirmPassword,
        novoNome,
        novoEmailGoogle,
        novoTelefone,
        novaInstituicao,
        novaSenha: novaSenha.trim() || undefined,
        motivo,
        termoAceito,
      });

      if (res.success) {
        setIdentity(res.identity);
        if (onIdentityUpdated && res.identity) {
          onIdentityUpdated(res.identity);
        }
        setTransferSuccess(res.message || 'Transferência de titularidade realizada com sucesso!');
        // Reset form
        setNovoNome('');
        setNovoEmailGoogle('');
        setNovoTelefone('');
        setNovaSenha('');
        setConfirmaNovaSenha('');
        setCurrentConfirmPassword('');
        setMotivo('');
        setTermoAceito(false);
        setActiveTab('info');
      } else {
        setTransferError(res.message || 'Erro ao realizar a transferência.');
      }
    } catch (err: any) {
      setTransferError(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyKey = () => {
    if (identity?.chaveLicenca) {
      navigator.clipboard.writeText(identity.chaveLicenca);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handlePrintTermo = () => {
    window.print();
  };

  return (
    <div
      id="modal_admin_developer"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 border-b border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
                {isAuthenticated ? <Unlock className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight">Painel do Desenvolvedor Master</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Área Técnica Voluntária
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Gestão de titularidade técnica, cessão institucional e conta Google Master
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              id="btn_close_developer_modal"
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isAuthenticated ? (
            /* PASSWORD AUTHENTICATION SCREEN */
            <div className="max-w-md mx-auto py-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                  <KeyRound className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Autenticação do Desenvolvedor</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Esta funcionalidade é protegida por senha de segurança para garantir que apenas o desenvolvedor voluntário responsável ou a liderança autorizada da Instituição possa alterar a titularidade.
                </p>
              </div>

              <form onSubmit={handleAuthenticate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Senha do Desenvolvedor Master
                  </label>
                  <div className="relative">
                    <input
                      id="input_developer_master_pwd"
                      type={showInputPassword ? 'text' : 'password'}
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      placeholder="Digite a senha de desenvolvedor..."
                      className="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowInputPassword(!showInputPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      title={showInputPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showInputPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <ShieldAlert className="w-4 h-4 text-indigo-500" />
                    <span>Proteção de Titularidade e Código</span>
                  </div>
                  <p>
                    A senha master está protegida por criptografia unidirecional segura (SHA-256) e não fica exposta em texto plano.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn_submit_developer_auth"
                    type="submit"
                    disabled={isVerifying || !inputPassword.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Acessar Painel</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* AUTHENTICATED DEVELOPER MANAGEMENT PANEL */
            <div className="space-y-6">
              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
                <button
                  id="tab_dev_info"
                  onClick={() => setActiveTab('info')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition ${
                    activeTab === 'info'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Identidade Atual
                </button>
                <button
                  id="tab_dev_transfer"
                  onClick={() => setActiveTab('transfer')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition ${
                    activeTab === 'transfer'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowRight className="w-4 h-4" />
                  Transferir Titularidade
                </button>
                <button
                  id="tab_dev_termo"
                  onClick={() => setActiveTab('termo')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition ${
                    activeTab === 'termo'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Termo de Doação & Licença
                </button>
                <button
                  id="tab_dev_history"
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition ${
                    activeTab === 'history'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  Histórico ({identity?.historicoTransferencias?.length || 0})
                </button>
              </div>

              {/* Feedback messages */}
              {transferSuccess && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-3 text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-semibold">Operação concluída com sucesso!</p>
                    <p className="text-xs mt-0.5">{transferSuccess}</p>
                  </div>
                </div>
              )}

              {/* TAB 1: IDENTIDADE ATUAL */}
              {activeTab === 'info' && identity && (
                <div className="space-y-6">
                  {/* Hero card */}
                  <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20 p-5 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-200/50 dark:border-indigo-900/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            {identity.status === 'TRANSFERIDO' ? 'Titularidade Transferida' : 'Desenvolvedor Master Ativo'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {identity.id}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                          {identity.nomeDesenvolvedor}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {identity.papel}
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveTab('transfer')}
                        className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Transferir para Outro
                      </button>
                    </div>

                    {/* Data grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                        <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                            Conta Google Master (Gmail)
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                            {identity.emailGoogle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                            Telefone / WhatsApp
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {identity.telefoneContato || 'Não informado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                            Instituição Beneficiária
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {identity.instituicao || 'Central de Agendamento RSantos'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                        <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                            Modalidade de Licença
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Doação Voluntária Vitalícia
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* License and Google Integration notice */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Chave de Identificação & Licença:
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                          Protegida
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowChaveLicenca(!showChaveLicenca)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                          title={showChaveLicenca ? 'Ocultar chave' : 'Exibir chave'}
                        >
                          {showChaveLicenca ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {showChaveLicenca ? 'Ocultar' : 'Exibir'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyKey}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey ? 'Copiado!' : 'Copiar Chave'}
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <code className="block p-2.5 bg-slate-900 text-emerald-400 rounded-lg text-xs font-mono break-all tracking-wider select-all">
                        {showChaveLicenca
                          ? identity.chaveLicenca
                          : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                      </code>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Esta chave atesta a cessão de uso irrestrita do software desenvolvido pelo voluntário para a clínica e seus operadores. Por segurança e privacidade na publicação, a chave é mantida ocultada por padrão.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: TRANSFERIR TITULARIDADE */}
              {activeTab === 'transfer' && (
                <form onSubmit={handleTransferSubmit} className="space-y-5">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Atenção: Transferência Formal de Responsabilidade</span>
                    </div>
                    <p>
                      Ao transferir a titularidade de Desenvolvedor Master, a nova conta de e-mail e responsável assumirão a referência técnica para integrações, backup e manutenção do sistema.
                    </p>
                  </div>

                  {transferError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{transferError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Novo Nome do Desenvolvedor / Responsável *
                      </label>
                      <input
                        type="text"
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        placeholder="Ex: Carlos Eduardo (Novo TI)"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Novo E-mail Google (Gmail Master) *
                      </label>
                      <input
                        type="email"
                        value={novoEmailGoogle}
                        onChange={(e) => setNovoEmailGoogle(e.target.value)}
                        placeholder="Ex: novoti.clinica@gmail.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Novo Telefone / WhatsApp de Contato
                      </label>
                      <input
                        type="text"
                        value={novoTelefone}
                        onChange={(e) => setNovoTelefone(e.target.value)}
                        placeholder="Ex: (21) 98888-7777"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Instituição / Unidade de Saúde
                      </label>
                      <input
                        type="text"
                        value={novaInstituicao}
                        onChange={(e) => setNovaInstituicao(e.target.value)}
                        placeholder="Ex: Central de Agendamento RSantos"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Optional Password Update */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-indigo-500" />
                        Alteração da Senha Master do Desenvolvedor (Opcional)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowNovaSenha(!showNovaSenha)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {showNovaSenha ? 'Ocultar senhas' : 'Exibir campos de senha'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Caso deseje manter a senha atual, deixe os campos abaixo em branco.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Nova Senha Master (Mínimo 6 dígitos)
                        </label>
                        <input
                          type={showNovaSenha ? 'text' : 'password'}
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          placeholder="Deixe em branco para manter a atual"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Confirmar Nova Senha Master
                        </label>
                        <input
                          type={showNovaSenha ? 'text' : 'password'}
                          value={confirmaNovaSenha}
                          onChange={(e) => setConfirmaNovaSenha(e.target.value)}
                          placeholder="Repita a nova senha"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Motivo / Justificativa da Transferência
                    </label>
                    <textarea
                      rows={2}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ex: Transição de voluntariado e entrega da governança técnica para a Instituição."
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  {/* Current Password Validation */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                      Digite a Senha Atual do Desenvolvedor para Confirmar *
                    </label>
                    <input
                      type="password"
                      value={currentConfirmPassword}
                      onChange={(e) => setCurrentConfirmPassword(e.target.value)}
                      placeholder="Senha atual de desenvolvedor..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Term agreement */}
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={termoAceito}
                      onChange={(e) => setTermoAceito(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      required
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                      Declaro que estou ciente da transferência de autonomia e titularidade técnica do sistema para o novo responsável / instituição acima descrita.
                    </span>
                  </label>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('info')}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Voltar
                    </button>
                    <button
                      id="btn_confirm_dev_transfer"
                      type="submit"
                      disabled={isSubmitting || !termoAceito}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processando Transferência...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Confirmar Transferência</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: TERMO DE DOAÇÃO & LICENÇA */}
              {activeTab === 'termo' && identity && (
                <div className="space-y-4">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 space-y-4 text-xs leading-relaxed print:text-black">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          Termo de Cessão e Doação Técnica de Software
                        </h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Sistema de Agendamento Clínico Multi-Postos
                        </span>
                      </div>
                      <button
                        onClick={handlePrintTermo}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs hover:bg-slate-100 transition shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimir Termo
                      </button>
                    </div>

                    <p>
                      <strong>DECLARAÇÃO:</strong> {identity.termoDoacaoTexto}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px]">
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="font-semibold text-slate-500 block">DESENVOLVEDOR MASTER:</span>
                        <span className="font-bold">{identity.nomeDesenvolvedor}</span>
                        <span className="block text-slate-400">{identity.emailGoogle}</span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="font-semibold text-slate-500 block">INSTITUIÇÃO BENEFICIÁRIA:</span>
                        <span className="font-bold">{identity.instituicao}</span>
                        <span className="block text-slate-400">
                          Licença: {showChaveLicenca ? identity.chaveLicenca : 'LIC-VOL-••••••••-2026-PROTEGIDA'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                      Registro inicial em: {new Date(identity.dataVinculacao).toLocaleDateString('pt-BR')} às {new Date(identity.dataVinculacao).toLocaleTimeString('pt-BR')}
                      {identity.ultimaTransferencia && (
                        <span> | Última transferência: {new Date(identity.ultimaTransferencia).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: HISTÓRICO DE TRANSFERÊNCIAS */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Registro de Auditoria de Transferências
                  </h4>

                  {(!identity?.historicoTransferencias || identity.historicoTransferencias.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                      Nenhuma transferência registrada até o momento.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {identity.historicoTransferencias.map((tr: DeveloperTransferHistory, idx: number) => (
                        <div
                          key={tr.id || idx}
                          className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                              <span>{tr.deNome}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="text-indigo-600 dark:text-indigo-400">{tr.paraNome}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {new Date(tr.data).toLocaleDateString('pt-BR')} às {new Date(tr.data).toLocaleTimeString('pt-BR')}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            <strong>E-mail Google de Destino:</strong> {tr.paraEmail}
                          </div>

                          {tr.motivo && (
                            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                              <strong>Motivo:</strong> {tr.motivo}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Módulo de Governança Técnica & Doação Institucional</span>
          </div>

          <div className="flex gap-2">
            {isAuthenticated && (
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setInputPassword('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <Lock className="w-3.5 h-3.5" />
                Bloquear Painel
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
