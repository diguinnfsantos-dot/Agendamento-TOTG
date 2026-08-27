import React, { useState, useEffect } from 'react';
import { User, Posto, SessionInfo } from '../types';
import { db, sessionBroadcast } from '../storage/db';
import { 
  Lock, 
  Unlock,
  Mail, 
  User as UserIcon, 
  MapPin, 
  Shield, 
  Building, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  KeyRound,
  ArrowRight,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  LogOut,
  Laptop,
  Smartphone,
  ShieldAlert,
  Sparkles,
  Code2,
  Phone,
  X
} from 'lucide-react';
import { isValidAlphanumericPassword, formatPhone } from '../utils/formatters';
import { initAuth, signInWithGoogle, logoutGoogle, MASTER_DEVELOPER_EMAIL } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { AdminDeveloperModal } from './AdminDeveloperModal';

const AUTHORIZED_GOOGLE_EMAIL = MASTER_DEVELOPER_EMAIL || 'diguinnfsantos@gmail.com';

interface AuthScreenProps {
  postos: Posto[];
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (newUser: Omit<User, 'id' | 'criadoEm'>) => { success: boolean; message: string };
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  postos,
  users,
  onLogin,
  onRegister,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('cadastro') === 'operador' || params.has('posto') || params.has('origem')) {
        return 'REGISTER';
      }
    }
    return 'LOGIN';
  });

  // Form states - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Modal / Alert for Active Session Conflict ("Usuário Conectado em Outro Aparelho")
  const [sessionConflictModal, setSessionConflictModal] = useState<{
    user: User;
    sessionInfo: SessionInfo;
    email: string;
    senha: string;
  } | null>(null);

  // Disconnected notice from another device overriding session
  const [remoteDisconnectedAlert, setRemoteDisconnectedAlert] = useState<string | null>(() => {
    return db.getDisconnectedNotice();
  });

  // Form states - Register
  const [regPostoId, setRegPostoId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlPosto = params.get('posto');
      if (urlPosto) return urlPosto;
    }
    return '';
  });
  const [regEmail, setRegEmail] = useState('');
  const [regTelefone, setRegTelefone] = useState('');
  const [regNome, setRegNome] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmSenha, setRegConfirmSenha] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Google Auth & Master Developer Unlock State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [isDeveloperModalOpen, setIsDeveloperModalOpen] = useState(false);
  
  const [masterUnlocked, setMasterUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('clinica_master_identified_email') === AUTHORIZED_GOOGLE_EMAIL;
  });

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
        setIsGoogleLoading(false);
        if (user && user.email?.toLowerCase().trim() === AUTHORIZED_GOOGLE_EMAIL.toLowerCase()) {
          localStorage.setItem('clinica_master_identified_email', AUTHORIZED_GOOGLE_EMAIL);
          setMasterUnlocked(true);
        }
      },
      () => {
        setGoogleUser(null);
        setIsGoogleLoading(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const isAuthorizedGoogleUser = googleUser?.email?.toLowerCase().trim() === AUTHORIZED_GOOGLE_EMAIL.toLowerCase();
  const isMasterIdentified = isAuthorizedGoogleUser || masterUnlocked;

  const handleGoogleConnect = async () => {
    try {
      setIsGoogleLoading(true);
      setGoogleAuthError(null);
      const res = await signInWithGoogle(false);
      if (res?.user) {
        setGoogleUser(res.user);
        if (res.user.email?.toLowerCase().trim() === AUTHORIZED_GOOGLE_EMAIL.toLowerCase()) {
          localStorage.setItem('clinica_master_identified_email', AUTHORIZED_GOOGLE_EMAIL);
          setMasterUnlocked(true);
        } else {
          setGoogleAuthError(
            `A conta conectada (${res.user.email}) não é a autorizada para desenvolvedor master.`
          );
        }
      }
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      setGoogleAuthError('Não foi possível autenticar via Google Firebase.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleMasterDisconnect = async () => {
    try {
      await logoutGoogle();
    } catch (err) {
      console.error('Erro ao desconectar Google:', err);
    }
    setGoogleUser(null);
    setGoogleAuthError(null);
    localStorage.removeItem('clinica_master_identified_email');
    setMasterUnlocked(false);
  };

  const handleDirectMasterLogin = async () => {
    setIsAuthenticating(true);
    setLoginError('');
    try {
      let res = await db.loginWithSessionApi(AUTHORIZED_GOOGLE_EMAIL, '543W21', true);
      if (!res.success || !res.user) {
        res = await db.loginWithSessionApi('admin@klinica.com', '543W21', true);
      }
      if (res.success && res.user) {
        if (res.sessionId) db.setSessionId(res.sessionId);
        db.clearDisconnectedNotice();
        setRemoteDisconnectedAlert(null);
        onLogin(res.user);
      } else {
        setLoginError(res.message || 'Erro ao realizar login como Administrador Master.');
      }
    } catch (e: any) {
      setLoginError(e.message || 'Falha ao autenticar.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle selected Posto
  const activePostos = postos.filter(p => p.ativo);
  const selectedPostoObj = activePostos.find(p => p.id === regPostoId);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanEmail = loginEmail.trim();
    const cleanSenha = loginSenha.trim();

    if (!cleanEmail || !cleanSenha) {
      setLoginError('Informe o seu email e senha de acesso.');
      return;
    }

    const isMaster = cleanEmail.toLowerCase() === AUTHORIZED_GOOGLE_EMAIL.toLowerCase();
    if (!isValidAlphanumericPassword(cleanSenha) && !(isMaster && cleanSenha === '108364aB')) {
      setLoginError('A senha de segurança deve conter exatamente 6 caracteres alfanuméricos.');
      return;
    }

    setIsAuthenticating(true);

    try {
      // Authenticate with multi-device session check
      const result = await db.loginWithSessionApi(cleanEmail, cleanSenha, false);

      if (result.requireConfirmation && result.sessionInfo && result.user) {
        // Active session is detected on another device!
        setSessionConflictModal({
          user: result.user,
          sessionInfo: result.sessionInfo,
          email: cleanEmail,
          senha: cleanSenha,
        });
        setIsAuthenticating(false);
        return;
      }

      if (!result.success) {
        setLoginError(result.message || 'Credenciais inválidas. Verifique seu email e senha cadastrados.');
        setIsAuthenticating(false);
        return;
      }

      if (result.user) {
        // Strict Operator Supervisor Authorization Check
        if (result.user.role === 'OPERATOR') {
          if (result.user.status === 'PENDING') {
            setLoginError('ACESSO BLOQUEADO: Seu cadastro está PENDENTE de autorização pelo Administrador Master. Por motivos de segurança, o acesso é liberado após a supervisão e desbloqueio do Administrador na aba de Operadores.');
            setIsAuthenticating(false);
            return;
          }
          if (result.user.status === 'BLOCKED') {
            setLoginError('ACESSO BLOQUEADO: Seu usuário foi bloqueado pela administração da clínica.');
            setIsAuthenticating(false);
            return;
          }
        }

        if (result.sessionId) {
          db.setSessionId(result.sessionId);
          // Broadcast to any other open tabs
          if (sessionBroadcast) {
            sessionBroadcast.postMessage({
              type: 'FORCE_LOGIN_DISCONNECT',
              userEmail: result.user.email,
              newSessionId: result.sessionId,
              deviceHint: db.getDeviceHint(),
            });
          }
          try {
            localStorage.setItem('clinica_latest_session_owner_v1', JSON.stringify({
              email: result.user.email,
              sessionId: result.sessionId,
              deviceHint: db.getDeviceHint(),
              timestamp: Date.now(),
            }));
          } catch {}
        }
        db.clearDisconnectedNotice();
        setRemoteDisconnectedAlert(null);
        onLogin(result.user);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleConfirmForceLogin = async () => {
    if (!sessionConflictModal) return;
    setIsAuthenticating(true);
    try {
      const result = await db.loginWithSessionApi(
        sessionConflictModal.email,
        sessionConflictModal.senha,
        true // forceLogin = true -> disconnects the previous device
      );

      if (result.success && result.user) {
        if (result.user.role === 'OPERATOR') {
          if (result.user.status === 'PENDING') {
            setLoginError('ACESSO BLOQUEADO: Cadastro PENDENTE de autorização pelo Administrador Master.');
            setSessionConflictModal(null);
            setIsAuthenticating(false);
            return;
          }
          if (result.user.status === 'BLOCKED') {
            setLoginError('ACESSO BLOQUEADO: Usuário BLOQUEADO pela administração.');
            setSessionConflictModal(null);
            setIsAuthenticating(false);
            return;
          }
        }

        if (result.sessionId) {
          db.setSessionId(result.sessionId);
          // Broadcast to any other open tabs
          if (sessionBroadcast) {
            sessionBroadcast.postMessage({
              type: 'FORCE_LOGIN_DISCONNECT',
              userEmail: result.user.email,
              newSessionId: result.sessionId,
              deviceHint: db.getDeviceHint(),
            });
          }
          try {
            localStorage.setItem('clinica_latest_session_owner_v1', JSON.stringify({
              email: result.user.email,
              sessionId: result.sessionId,
              deviceHint: db.getDeviceHint(),
              timestamp: Date.now(),
            }));
          } catch {}
        }
        db.clearDisconnectedNotice();
        setRemoteDisconnectedAlert(null);
        setSessionConflictModal(null);
        onLogin(result.user);
      } else {
        setLoginError(result.message || 'Falha ao assumir nova conexão.');
        setSessionConflictModal(null);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao conectar.');
      setSessionConflictModal(null);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess(false);

    if (!regPostoId) {
      setRegisterError('Selecione o ID / Origem do seu posto de coleta.');
      return;
    }
    if (!regNome.trim()) {
      setRegisterError('Informe o nome de Usuário do operador.');
      return;
    }
    if (!regEmail.trim()) {
      setRegisterError('Informe o email institucional do operador.');
      return;
    }
    const rawTelDigits = regTelefone.replace(/\D/g, '');
    if (!regTelefone.trim() || rawTelDigits.length < 10) {
      setRegisterError('O número de telefone celular do operador é obrigatório com DDD.');
      return;
    }
    if (!isValidAlphanumericPassword(regSenha.trim())) {
      setRegisterError('A senha de segurança deve conter exatamente 6 dígitos alfanuméricos.');
      return;
    }
    if (regSenha.trim() !== regConfirmSenha.trim()) {
      setRegisterError('As senhas digitadas não coincidem.');
      return;
    }

    const posto = activePostos.find(p => p.id === regPostoId);
    if (!posto) {
      setRegisterError('Posto selecionado inválido.');
      return;
    }

    const res = onRegister({
      email: regEmail.trim().toLowerCase(),
      senha: regSenha.trim(),
      nome: regNome.trim(),
      telefone: regTelefone.trim(),
      role: 'OPERATOR',
      postoId: posto.id,
      origem: posto.origem,
      status: 'PENDING',
    });

    if (res.success) {
      setRegisterSuccess(true);
      setRegEmail('');
      setRegTelefone('');
      setRegNome('');
      setRegSenha('');
      setRegConfirmSenha('');
    } else {
      setRegisterError(res.message);
    }
  };

  const fillQuickDemo = (user: User) => {
    setLoginEmail(user.email);
    setLoginSenha(user.senha);
    if (user.role === 'OPERATOR' && user.status === 'PENDING') {
      setLoginError('Aviso de Segurança: Este cadastro está PENDENTE de autorização pelo Administrador Master (Bloqueio de 1º Acesso ativo).');
    } else if (user.role === 'OPERATOR' && user.status === 'BLOCKED') {
      setLoginError('Aviso: Este operador está BLOQUEADO pela administração.');
    } else {
      setLoginError('');
    }
  };

  // Password breakdown helper for register
  const regDigitsCount = (regSenha.match(/\d/g) || []).length;
  const regLettersCount = (regSenha.match(/[a-zA-Z]/g) || []).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-8 sm:px-6 lg:px-8 relative selection:bg-blue-600 selection:text-white">
      {/* Background Graphic Accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-100/60 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 ring-4 ring-white">
            <Building className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-slate-900">
          Sistema de Agendamento TOTG
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Central Integrada de Regulação Médica & Gestão de Vagas
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        {/* Remote Disconnection Banner (if session was disconnected from another browser) */}
        {remoteDisconnectedAlert && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 flex items-start gap-3 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs space-y-1">
              <p className="font-bold text-amber-900">Sua sessão anterior foi finalizada</p>
              <p className="text-amber-800 leading-relaxed">{remoteDisconnectedAlert}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                db.clearDisconnectedNotice();
                setRemoteDisconnectedAlert(null);
              }}
              className="text-amber-500 hover:text-amber-800 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white py-6 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              id="tab-btn-login"
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setLoginError('');
                setRegisterError('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'LOGIN'
                  ? 'bg-white text-blue-900 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar no Sistema</span>
            </button>
            <button
              id="tab-btn-register"
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setLoginError('');
                setRegisterError('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'REGISTER'
                  ? 'bg-white text-blue-900 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Solicitar Cadastro</span>
            </button>
          </div>

          {/* LOGIN FORM */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="login-email">
                  Email de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Digite aqui o seu email"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="login-password">
                    Senha de Acesso
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    placeholder="••••••"
                    className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={isAuthenticating}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-xs text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <span>Verificando Acesso...</span>
                ) : (
                  <>
                    <span>Acessar Painel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'REGISTER' && (
            <div>
              {registerSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Solicitação Enviada com Sucesso!</span>
                  </div>
                  <p className="leading-relaxed text-emerald-800">
                    Seu cadastro como <strong>Operador</strong> foi registrado. Por normas de segurança clínica, o acesso fica em <strong>análise pendente</strong> até que o <strong>Administrador Master</strong> autorize seu usuário na aba de Operadores.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('LOGIN')}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Ir para Login
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {registerError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span>{registerError}</span>
                    </div>
                  )}

                  {/* Seleção do Posto / Origem */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-posto">
                      Posto de Coleta / ID de Origem <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <select
                        id="reg-posto"
                        required
                        value={regPostoId}
                        onChange={(e) => setRegPostoId(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                      >
                        <option value="">Selecione seu Posto de Origem</option>
                        {activePostos.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.codigo} - {p.origem} ({p.cidade})
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedPostoObj && (
                      <p className="mt-1 text-[10px] text-emerald-700 font-medium">
                        ✓ Vinculado a: <strong>{selectedPostoObj.origem}</strong> ({selectedPostoObj.cidade})
                      </p>
                    )}
                  </div>

                  {/* Nome de Usuário */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-nome">
                      Nome Completo do Operador <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-nome"
                        type="text"
                        required
                        value={regNome}
                        onChange={(e) => setRegNome(e.target.value)}
                        placeholder="Nome e Sobrenome"
                        className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="reg-email">
                      Email de Acesso (Login) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="Digite o email institucional"
                        className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Telefone Celular do Operador (WhatsApp) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="reg-telefone">
                        Telefone Celular do Operador (WhatsApp) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">DDD obrigatório</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </div>
                      <input
                        id="reg-telefone"
                        type="text"
                        required
                        maxLength={16}
                        value={regTelefone}
                        onChange={(e) => setRegTelefone(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Número de WhatsApp do operador para envio de lembretes e contato direto com seus pacientes.
                    </p>
                  </div>

                  {/* Senha e Confirmação */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700" htmlFor="reg-senha">
                          Senha (6 carac.) <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] font-mono text-slate-400">6 carac.</span>
                      </div>
                      <input
                        id="reg-senha"
                        type={showRegPassword ? 'text' : 'password'}
                        maxLength={6}
                        required
                        value={regSenha}
                        onChange={(e) => setRegSenha(e.target.value.slice(0, 6))}
                        placeholder="••••••"
                        className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700" htmlFor="reg-confirm-senha">
                          Confirmar Senha <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="text-[10px] text-slate-500 hover:text-blue-600 cursor-pointer"
                        >
                          {showRegPassword ? 'Ocultar' : 'Ver'}
                        </button>
                      </div>
                      <input
                        id="reg-confirm-senha"
                        type={showRegPassword ? 'text' : 'password'}
                        maxLength={6}
                        required
                        value={regConfirmSenha}
                        onChange={(e) => setRegConfirmSenha(e.target.value.slice(0, 6))}
                        placeholder="••••••"
                        className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Live Validation Pill */}
                  {regSenha && (
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-md font-semibold ${
                        regDigitsCount === 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {regDigitsCount === 5 ? '✓ 5 números' : `Números: ${regDigitsCount}/5`}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold ${
                        regLettersCount === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {regLettersCount === 1 ? '✓ 1 letra' : `Letras: ${regLettersCount}/1`}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold ${
                        regSenha.length === 6 && isValidAlphanumericPassword(regSenha) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isValidAlphanumericPassword(regSenha) ? '✓ Formato Válido' : 'Tamanho: 6 carac.'}
                      </span>
                      {regConfirmSenha && (
                        <span className={`px-2 py-0.5 rounded-md font-semibold ${
                          regSenha === regConfirmSenha ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {regSenha === regConfirmSenha ? '✓ Senhas Iguais' : '✗ Senhas não batem'}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    id="btn-submit-register"
                    type="submit"
                    className="w-full mt-3 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-xs text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <span>Solicitar Cadastro de Operador</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* DEVELOPER MASTER SECTION & USER LIST */}
          {isMasterIdentified ? (
            /* AUTHORIZED MASTER VIEW */
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3.5 animate-in fade-in">
              {/* Master Status Card */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Unlock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <span>Desenvolvedor Master Reconhecido</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      </p>
                      <p className="text-[10px] text-emerald-800 font-mono font-medium">
                        {AUTHORIZED_GOOGLE_EMAIL}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleMasterDisconnect}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 hover:text-rose-600 bg-white/80 hover:bg-white px-2 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    title="Desconectar / Bloquear"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Bloquear</span>
                  </button>
                </div>

                {/* Master Action Shortcuts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-master-direct-login"
                    onClick={handleDirectMasterLogin}
                    disabled={isAuthenticating}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Entrar no Sistema (Master)</span>
                  </button>

                  <button
                    type="button"
                    id="btn-open-dev-modal"
                    onClick={() => setIsDeveloperModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Painel do Desenvolvedor</span>
                  </button>
                </div>
              </div>

              {/* Complete User Accounts Directory */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-600 font-mono flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    Contas do Sistema ({users.length})
                  </p>
                  <span className="text-[9px] text-slate-400 font-mono">Clique para preencher</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {users.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => fillQuickDemo(u)}
                      className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-xs flex items-center justify-between group cursor-pointer"
                    >
                      <div className="truncate pr-2">
                        <p className="font-bold text-slate-800 truncate group-hover:text-blue-900">
                          {u.role === 'ADMIN' ? '👑 Admin Master' : `👤 ${u.nome.split(' ')[0]} (${u.postoId || 'Posto'})`}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate font-mono">
                          {u.email} • Senha: <span className="text-slate-600 font-bold">••••••</span>
                        </p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 ${
                        u.role === 'ADMIN' 
                          ? 'bg-amber-100 text-amber-800' 
                          : u.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.role === 'ADMIN' ? 'Master' : u.status === 'ACTIVE' ? 'Ativo' : 'Pendente'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* NON-AUTHORIZED MASTER VIEW */
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center justify-center space-y-2.5">
              {googleUser && (
                <div className="w-full p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">Conta <strong>{googleUser.email}</strong> não autorizada como Master.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMasterDisconnect}
                    className="text-[10px] font-bold underline hover:text-amber-950 shrink-0 cursor-pointer"
                  >
                    Desconectar
                  </button>
                </div>
              )}

              {googleAuthError && (
                <div className="w-full p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-xl text-center space-y-1">
                  <p>{googleAuthError}</p>
                </div>
              )}

              {/* Developer Identification Actions */}
              <div className="w-full flex items-center justify-center">
                <button
                  type="button"
                  id="btn-google-admin-unlock"
                  onClick={handleGoogleConnect}
                  disabled={isGoogleLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 shadow-2xs hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
                  title="Identificar com Conta Google Firebase"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isGoogleLoading ? 'Verificando Firebase...' : 'Identificar via Google (Firebase)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Developer Modal (accessible right from Auth Screen) */}
      <AdminDeveloperModal
        isOpen={isDeveloperModalOpen}
        onClose={() => setIsDeveloperModalOpen(false)}
      />

      {/* Session Conflict Modal ("Usuário conectado em outro aparelho - Deseja continuar?") */}
      {sessionConflictModal && (
        <div 
          id="modal-session-conflict"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-amber-300 overflow-hidden">
            <div className="bg-amber-500 p-5 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-amber-100 block">
                  Conexão Simultânea Detectada
                </span>
                <h3 className="text-base font-black text-white leading-tight">
                  Conta já Conectada em Outro Aparelho
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Identificamos que o usuário <strong>{sessionConflictModal.user.nome}</strong> (<span className="font-mono text-slate-900 font-semibold">{sessionConflictModal.user.email}</span>) já está <strong>conectado e ativo</strong> em outro equipamento neste momento.
              </p>

              {/* Active Session Info Box */}
              <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-amber-950">
                  <span className="font-medium text-slate-600">Aparelho Conectado:</span>
                  <span className="font-bold bg-white px-2.5 py-1 rounded-lg border border-amber-300 text-amber-900 shadow-2xs">
                    {sessionConflictModal.sessionInfo.deviceHint}
                  </span>
                </div>
                <div className="flex items-center justify-between text-amber-950">
                  <span className="font-medium text-slate-600">Última Atividade:</span>
                  <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {sessionConflictModal.sessionInfo.lastActiveFormatted}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[11px] text-slate-600 leading-relaxed space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Regra de Sessão Única por Operador</span>
                </div>
                <p>
                  Para evitar sobrecarga e conflitos de dados em múltiplos equipamentos simultâneos (computador, celular ou tablet), caso decida prosseguir, <strong>a conexão no outro aparelho será encerrada imediatamente</strong> e este equipamento assumirá a sessão.
                </p>
              </div>

              <p className="text-xs font-bold text-slate-800 text-center pt-1">
                Usuário conectado, deseja continuar e assumir o acesso neste aparelho?
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  id="btn-cancel-conflict-login"
                  onClick={() => setSessionConflictModal(null)}
                  disabled={isAuthenticating}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-confirm-conflict-login"
                  onClick={handleConfirmForceLogin}
                  disabled={isAuthenticating}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isAuthenticating ? (
                    <span>Desconectando outro...</span>
                  ) : (
                    <>
                      <span>Sim, Desconectar e Entrar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
