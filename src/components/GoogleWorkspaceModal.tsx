import React, { useState, useEffect } from 'react';
import { 
  User, 
  Appointment, 
  Posto, 
  Slot, 
  SystemRule 
} from '../types';
import { db } from '../storage/db';
import { 
  signInWithGoogle, 
  logoutGoogle, 
  getCachedAccessToken,
  initAuth 
} from '../lib/firebase';
import { GoogleDriveService, DriveFile } from '../services/googleDriveService';
import { GoogleSheetsService, SpreadsheetInfo } from '../services/googleSheetsService';
import { 
  X, 
  Database, 
  Cloud, 
  FileSpreadsheet, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  Trash2, 
  ShieldCheck, 
  FileText, 
  FolderPlus,
  Lock,
  ArrowRight,
  LogOut,
  Sparkles
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  appointments: Appointment[];
  postos: Posto[];
  slots: Slot[];
  rules: SystemRule;
  onRefreshData?: () => void;
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  appointments,
  postos,
  slots,
  rules,
  onRefreshData
}) => {
  if (!isOpen || currentUser?.role !== 'ADMIN') return null;

  const [activeTab, setActiveTab] = useState<'SHEETS' | 'DRIVE'>('SHEETS');
  
  // Google Auth State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sheets State
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [currentSheet, setCurrentSheet] = useState<SpreadsheetInfo | null>(() => {
    const saved = localStorage.getItem('last_google_sheet_info');
    return saved ? JSON.parse(saved) : null;
  });
  const [sheetSuccessMessage, setSheetSuccessMessage] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Drive State
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveSuccessMessage, setDriveSuccessMessage] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);

  // Check auth state on mount
  useEffect(() => {
    if (!isOpen) return;

    const token = getCachedAccessToken();
    if (token) setAccessToken(token);

    const unsubscribe = initAuth(
      (user, tok) => {
        setGoogleUser(user);
        if (tok) setAccessToken(tok);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  // Load drive files when switching to Drive tab if authenticated
  useEffect(() => {
    if (activeTab === 'DRIVE' && accessToken) {
      loadDriveFiles();
    }
  }, [activeTab, accessToken]);

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogle();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        db.addLog(
          currentUser?.nome || res.user.displayName || 'Usuário',
          res.user.email || 'google@user.com',
          'CONEXAO_GOOGLE_WORKSPACE',
          `Autenticado no Google Workspace com sucesso. Permissões de Google Drive e Google Sheets ativas.`,
          'SUCESSO'
        );
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setAuthError(err.message || 'Falha ao autenticar com a Conta Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setAccessToken(null);
    setDriveFiles([]);
  };

  // Google Sheets Export
  const handleExportToSheets = async () => {
    if (!accessToken) {
      setSheetError('É necessário autenticar com a Conta Google primeiro.');
      return;
    }

    setIsCreatingSheet(true);
    setSheetError(null);
    setSheetSuccessMessage(null);

    try {
      let sheet = currentSheet;
      if (!sheet) {
        sheet = await GoogleSheetsService.createAppointmentsSheet(
          accessToken,
          `Agendamentos - ${rules.nomeClinica} (${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')})`
        );
        setCurrentSheet(sheet);
        localStorage.setItem('last_google_sheet_info', JSON.stringify(sheet));
      }

      const syncResult = await GoogleSheetsService.syncAppointmentsToSheet(
        accessToken,
        sheet.spreadsheetId,
        appointments
      );

      // Record in Cloud SQL sync history
      await fetch('/api/workspace/sync-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'SHEETS',
          resourceId: sheet.spreadsheetId,
          resourceName: sheet.title,
          action: 'EXPORT',
          itemCount: syncResult.rowCount,
          syncedBy: currentUser?.nome || googleUser?.displayName || 'Administrador',
          details: `Exportados ${syncResult.rowCount} agendamentos com sucesso.`,
        })
      }).catch(() => {});

      db.addLog(
        currentUser?.nome || 'Admin',
        googleUser?.email || 'admin@klinica.com',
        'EXPORTACAO_GOOGLE_SHEETS',
        `Planilha Google atualizada: ${sheet.title} com ${syncResult.rowCount} agendamentos gravados.`,
        'SUCESSO'
      );

      setSheetSuccessMessage(`Planilha atualizada com sucesso com ${syncResult.rowCount} agendamento(s)!`);
      setTimeout(() => setSheetSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Export to sheets failed:', err);
      setSheetError(err.message || 'Erro ao sincronizar com o Google Sheets.');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Google Drive File Operations
  const loadDriveFiles = async () => {
    if (!accessToken) return;
    setIsLoadingDrive(true);
    setDriveError(null);
    try {
      const files = await GoogleDriveService.listFiles(accessToken);
      setDriveFiles(files);
    } catch (err: any) {
      setDriveError(err.message || 'Erro ao carregar arquivos do Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleBackupToDrive = async () => {
    if (!accessToken) {
      setDriveError('É necessário autenticar com a Conta Google primeiro.');
      return;
    }

    setIsUploadingDrive(true);
    setDriveError(null);
    setDriveSuccessMessage(null);

    try {
      // 1. Create dedicated app folder in Google Drive
      const folderId = await GoogleDriveService.getOrCreateAppFolder(
        accessToken,
        `Clínica ${rules.nomeClinica} - Backups & Relatórios`
      );

      // 2. Prepare comprehensive snapshot payload
      const snapshotData = {
        metadata: {
          nomeClinica: rules.nomeClinica,
          dataExportacao: new Date().toISOString(),
          totalAgendamentos: appointments.length,
          totalPostos: postos.length,
          totalVagas: slots.length,
          exportadoPor: currentUser?.nome || googleUser?.displayName || 'Admin',
        },
        appointments,
        postos,
        slots,
        rules,
      };

      const fileName = `Backup_Clinica_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.json`;

      const uploaded = await GoogleDriveService.uploadTextFile(
        accessToken,
        fileName,
        JSON.stringify(snapshotData, null, 2),
        'application/json',
        folderId
      );

      // Record in Cloud SQL sync history
      await fetch('/api/workspace/sync-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'DRIVE',
          resourceId: uploaded.id,
          resourceName: fileName,
          action: 'BACKUP',
          itemCount: appointments.length,
          syncedBy: currentUser?.nome || googleUser?.displayName || 'Admin',
          details: `Backup completo gravado na pasta oficial do Google Drive.`,
        })
      }).catch(() => {});

      db.addLog(
        currentUser?.nome || 'Admin',
        googleUser?.email || 'admin@klinica.com',
        'BACKUP_GOOGLE_DRIVE',
        `Arquivo de backup ${fileName} salvo com sucesso no Google Drive (ID: ${uploaded.id}).`,
        'SUCESSO'
      );

      setDriveSuccessMessage(`Arquivo '${fileName}' gravado com sucesso no Google Drive!`);
      await loadDriveFiles();
      setTimeout(() => setDriveSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Backup to drive failed:', err);
      setDriveError(err.message || 'Erro ao realizar backup para o Google Drive.');
    } finally {
      setIsUploadingDrive(false);
    }
  };

  // Mandatory confirmation for destructive Drive delete operation
  const confirmDeleteDriveFile = async () => {
    if (!fileToDelete || !accessToken) return;
    try {
      await GoogleDriveService.deleteFile(accessToken, fileToDelete.id);
      db.addLog(
        currentUser?.nome || 'Admin',
        googleUser?.email || 'admin@klinica.com',
        'EXCLUSAO_GOOGLE_DRIVE',
        `Arquivo '${fileToDelete.name}' excluído do Google Drive.`,
        'AVISO'
      );
      setFileToDelete(null);
      await loadDriveFiles();
    } catch (err: any) {
      setDriveError(err.message || 'Falha ao excluir arquivo do Google Drive.');
      setFileToDelete(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Cloud className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-500/30 text-blue-200 rounded-md font-mono">
                  Google Workspace Oficial
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-500/30 text-emerald-200 rounded-md font-mono">
                  Google Drive & Sheets
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white mt-0.5">
                Google Workspace (Planilhas & Backups em Nuvem)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Google Authentication Status Banner */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {googleUser ? (
            <div className="flex items-center gap-3">
              {googleUser.photoURL ? (
                <img 
                  src={googleUser.photoURL} 
                  alt={googleUser.displayName || 'Google User'} 
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full border border-slate-300 shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {googleUser.email?.slice(0, 1).toUpperCase() || 'G'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {googleUser.displayName || 'Conta Google Conectada'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">
                    Conectado
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {googleUser.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Google Workspace Desconectado
                </p>
                <p className="text-[11px] text-slate-500">
                  Conecte sua conta para habilitar o Google Sheets e Google Drive.
                </p>
              </div>
            </div>
          )}

          <div>
            {googleUser ? (
              <button
                onClick={handleGoogleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Desconectar Conta</span>
              </button>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isAuthenticating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                {/* Official Google Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isAuthenticating ? 'Conectando ao Google...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('SHEETS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'SHEETS'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets (Planilhas de Agendamentos)</span>
          </button>

          <button
            onClick={() => setActiveTab('DRIVE')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'DRIVE'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Google Drive (Snapshots & Backups JSON)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* TAB 1: GOOGLE SHEETS */}
          {activeTab === 'SHEETS' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">
                    Sincronização com o Google Planilhas (Sheets)
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Exporte em tempo real a listagem completa de agendamentos médicos, dados dos pacientes, cotas, protocolos e status para uma planilha Google formatada na sua nuvem.
                  </p>
                </div>
              </div>

              {sheetSuccessMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{sheetSuccessMessage}</span>
                </div>
              )}

              {sheetError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{sheetError}</span>
                </div>
              )}

              {/* Status and Action Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                      Planilha Ativa de Agendamentos
                    </span>
                    <h5 className="text-sm font-black text-slate-900">
                      {currentSheet ? currentSheet.title : 'Nenhuma planilha vinculada no momento'}
                    </h5>
                  </div>

                  {currentSheet && (
                    <a
                      href={currentSheet.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir no Google Planilhas</span>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase">Total de Agendamentos:</span>
                    <span className="text-base font-black text-slate-900">{appointments.length}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase">Confirmados:</span>
                    <span className="text-base font-black text-blue-600">
                      {appointments.filter(a => a.status === 'CONFIRMED').length}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase">Origens / Postos:</span>
                    <span className="text-base font-black text-emerald-600">{postos.length}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-500">
                    {googleUser 
                      ? 'Clique no botão ao lado para atualizar ou criar a planilha Google com as colunas oficiais.'
                      : 'Faça login com sua Conta Google acima para exportar para o Google Sheets.'}
                  </p>

                  <button
                    onClick={handleExportToSheets}
                    disabled={!accessToken || isCreatingSheet}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-all hover:shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCreatingSheet ? 'animate-spin' : ''}`} />
                    <span>{isCreatingSheet ? 'Exportando Linhas...' : 'Exportar Agendamentos para o Sheets'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE DRIVE */}
          {activeTab === 'DRIVE' && (
            <div className="space-y-5">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-950">
                    Google Drive Backup & Repositório de Documentos
                  </h4>
                  <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                    Grave snapshots completos do banco de dados, laudos e listas de presença diretamente na pasta designada do seu Google Drive corporativo ou pessoal com total segurança.
                  </p>
                </div>
              </div>

              {driveSuccessMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{driveSuccessMessage}</span>
                </div>
              )}

              {driveError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{driveError}</span>
                </div>
              )}

              {/* Actions Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <h5 className="font-bold text-slate-800">Pasta Oficial no Drive</h5>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Pasta: Clínica {rules.nomeClinica} - Backups & Relatórios
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadDriveFiles}
                    disabled={!accessToken || isLoadingDrive}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors"
                    title="Atualizar lista de arquivos"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={handleBackupToDrive}
                    disabled={!accessToken || isUploadingDrive}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-all"
                  >
                    <UploadCloud className={`w-4 h-4 ${isUploadingDrive ? 'animate-bounce' : ''}`} />
                    <span>{isUploadingDrive ? 'Salvando Snapshot...' : 'Salvar Snapshot no Drive'}</span>
                  </button>
                </div>
              </div>

              {/* Files Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">Arquivos no Google Drive</span>
                  <span className="font-mono text-[11px] text-slate-500">{driveFiles.length} item(s)</span>
                </div>

                {isLoadingDrive ? (
                  <div className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <p>Consultando arquivos no Google Drive...</p>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <HardDrive className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>Nenhum arquivo listado ou conta não conectada.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Clique em &quot;Salvar Snapshot no Drive&quot; para enviar seu primeiro arquivo.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {driveFiles.map((file) => (
                      <div key={file.id} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {file.createdTime ? new Date(file.createdTime).toLocaleString('pt-BR') : 'Data não disponível'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-blue-600 rounded-lg transition-colors cursor-pointer"
                              title="Abrir no Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Excluir arquivo (requer confirmação)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Google Drive API v3 • Google Sheets API v4 • Nuvem Central Firestore</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl cursor-pointer transition-colors"
          >
            Fechar Janela
          </button>
        </div>

      </div>

      {/* Mandatory User Confirmation Dialog for Destructive Operations (Google Workspace Skill Requirement) */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Confirmar Exclusão de Arquivo
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você tem certeza de que deseja excluir permanentemente o arquivo <strong className="text-slate-900">&quot;{fileToDelete.name}&quot;</strong> do seu Google Drive? Esta ação não pode ser desfeita.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteDriveFile}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Sim, Excluir do Drive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
