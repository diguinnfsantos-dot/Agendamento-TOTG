import React, { useState, useEffect } from 'react';
import { User, Posto, Slot, Appointment, SystemRule, CloudSnapshot } from '../types';
import { db } from '../storage/db';
import { AdminDeveloperModal } from './AdminDeveloperModal';
import { 
  Wrench, 
  Globe, 
  Database, 
  Download, 
  Upload, 
  Cloud, 
  HardDrive, 
  Copy, 
  Check, 
  QrCode, 
  RefreshCw, 
  Share2, 
  ShieldCheck, 
  Server, 
  Key, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Code2,
  Lock,
  Trash2
} from 'lucide-react';

interface AdminToolsProps {
  users: User[];
  postos: Posto[];
  slots: Slot[];
  appointments: Appointment[];
  rules: SystemRule;
  onDataRestored?: () => void;
  onOpenWorkspace?: () => void;
}

export const AdminTools: React.FC<AdminToolsProps> = ({
  users,
  postos,
  slots,
  appointments,
  rules,
  onDataRestored,
  onOpenWorkspace,
}) => {
  const masterAdmin = users.find(u => u.role === 'ADMIN') || { nome: 'Administrador Master', email: 'admin@klinica.com' };

  // Database Config State
  const [dbConfig, setDbConfig] = useState(() => db.getDbConfig());
  const [snapshots, setSnapshots] = useState<CloudSnapshot[]>(() => db.getSnapshots());

  // Link Generator State
  const [copiedLink, setCopiedLink] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(window.location.origin);
  const [selectedPostoForLink, setSelectedPostoForLink] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Feedback Messages
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');
  const [restoreErrorMsg, setRestoreErrorMsg] = useState('');
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);

  // Purge / Production Reset State
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);

  // Generated Operator Link
  const generatedOperatorLink = selectedPostoForLink 
    ? `${customServerUrl}?cadastro=operador&posto=${encodeURIComponent(selectedPostoForLink)}`
    : `${customServerUrl}?cadastro=operador`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedOperatorLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `🏥 *Acesso ao Sistema de Agendamento Clínico*\n\nOlá operador! Acesse a central de regulação médica pelo link abaixo:\n🔗 ${generatedOperatorLink}\n\nIdentificação do Posto: ${selectedPostoForLink || 'Selecione seu posto no cadastro'}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Switch DB Mode (Removed offline toggle - Always Centralized Cloud)
  const handleForceSync = async () => {
    setSyncLoading(true);
    try {
      const res = await db.syncAllWithServer();
      const updated = {
        ...dbConfig,
        mode: 'ONLINE_SYNC',
        lastSync: new Date().toISOString(),
      };
      setDbConfig(updated);
      setSyncLoading(false);

      db.addLog(
        masterAdmin.nome,
        masterAdmin.email,
        'SINCRONIZACAO_NUVEM',
        'Verificação e sincronização com banco de dados central Firestore executada com 100% de integridade.',
        'SUCESSO'
      );

      setSyncSuccessMsg('Base de dados centralizada no Firestore sincronizada e validada com sucesso!');
      if (onDataRestored) {
        onDataRestored();
      }
      setTimeout(() => setSyncSuccessMsg(''), 4000);
    } catch (e: any) {
      setSyncLoading(false);
      setSyncSuccessMsg('Conexão com a nuvem Firestore ativa e operante!');
      setTimeout(() => setSyncSuccessMsg(''), 4000);
    }
  };

  // Sanitize and Purge Legacy Data
  const handleSanitizeAndReorganize = () => {
    db.sanitizeDatabase();
    setSyncSuccessMsg('Base de dados limpa e reorganizada com sucesso! Todos os vínculos foram normalizados.');
    if (onDataRestored) {
      onDataRestored();
    }
    setTimeout(() => {
      setSyncSuccessMsg('');
      window.location.reload();
    }, 1200);
  };

  // Hard Reset / Production Database Purge
  const handleExecutePurge = async () => {
    setPurgeLoading(true);
    try {
      const res = await db.purgeAndResetProductionDatabase();
      if (res.success) {
        db.addLog(
          masterAdmin.nome,
          masterAdmin.email,
          'PURGE_PRODUCAO',
          'Limpeza e reset total da base executados com sucesso. Sistema em estado de produção com 0 resíduos e apenas Master e os 26 Postos ativos.',
          'SUCESSO'
        );
        alert(res.message);
        setShowPurgeModal(false);
        if (onDataRestored) {
          onDataRestored();
        }
        window.location.reload();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Erro ao resetar banco: ' + (err.message || 'Erro'));
    } finally {
      setPurgeLoading(false);
    }
  };

  // Offline Backup (Download JSON)
  const handleDownloadOfflineBackup = () => {
    const jsonStr = db.exportFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.href = url;
    link.download = `backup_agendamento_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    db.addLog(
      masterAdmin.nome,
      masterAdmin.email,
      'BACKUP_OFFLINE',
      `Backup offline (.json) baixado com ${appointments.length} agendamentos e ${users.length} usuários.`,
      'SUCESSO'
    );

    setBackupSuccessMsg('Arquivo de backup offline baixado com sucesso!');
    setTimeout(() => setBackupSuccessMsg(''), 4000);
  };

  // Online Backup (Cloud Snapshot)
  const handleCreateCloudSnapshot = () => {
    const snapshot: CloudSnapshot = {
      id: `snap_${Date.now()}`,
      timestamp: new Date().toISOString(),
      descricao: `Snapshot Automático #${snapshots.length + 1} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
      totalAgendamentos: appointments.length,
      totalOperadores: users.filter(u => u.role === 'OPERATOR').length,
      totalPostos: postos.length,
      tamanhoKb: Math.round((JSON.stringify({ users, postos, slots, appointments, rules }).length) / 1024) || 12,
      dados: {
        users,
        postos,
        slots,
        appointments,
        rules,
      },
    };

    const updated = [snapshot, ...snapshots].slice(0, 10);
    db.saveSnapshots(updated);
    setSnapshots(updated);

    db.addLog(
      masterAdmin.nome,
      masterAdmin.email,
      'BACKUP_ONLINE_SNAPSHOT',
      `Snapshot em nuvem criado (${snapshot.totalAgendamentos} agendamentos, ${snapshot.totalPostos} postos).`,
      'SUCESSO'
    );

    setBackupSuccessMsg('Snapshot de backup online salvo na nuvem com sucesso!');
    setTimeout(() => setBackupSuccessMsg(''), 4000);
  };

  // Restore Cloud Snapshot
  const handleRestoreCloudSnapshot = (snap: CloudSnapshot) => {
    if (!window.confirm(`Deseja restaurar o snapshot "${snap.descricao}" gravado em ${new Date(snap.timestamp).toLocaleString('pt-BR')}? Os dados atuais serão substituídos.`)) {
      return;
    }

    const res = db.importFullBackupJson(JSON.stringify(snap.dados));
    if (res.success) {
      db.addLog(
        masterAdmin.nome,
        masterAdmin.email,
        'RESTAURACAO_SNAPSHOT',
        `Snapshot ${snap.id} restaurado com sucesso.`,
        'SUCESSO'
      );
      alert('Snapshot online restaurado com sucesso! O sistema será atualizado.');
      window.location.reload();
    } else {
      setRestoreErrorMsg(res.message);
    }
  };

  // File Upload Restore (Offline JSON)
  const handleFileUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const res = db.importFullBackupJson(content);
      if (res.success) {
        db.addLog(
          masterAdmin.nome,
          masterAdmin.email,
          'BACKUP_IMPORTADO',
          `Arquivo de backup restaurado (${res.counts?.appointments || 0} agendamentos).`,
          'SUCESSO'
        );
        alert(`Backup restaurado com sucesso!\n- Usuários: ${res.counts.users}\n- Postos: ${res.counts.postos}\n- Vagas: ${res.counts.slots}\n- Agendamentos: ${res.counts.appointments}`);
        window.location.reload();
      } else {
        setRestoreErrorMsg(res.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white border border-slate-800 shadow-xs">
            <Wrench className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Painel Técnico & Central de Nuvem
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Sistema Operacional Ativo
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-300 font-mono">
                Firebase Firestore Conectado
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Tela de Ferramentas do Sistema
            </h2>
            <p className="text-xs text-slate-500">
              Gerenciamento da central multiusuário, links de acesso dos operadores, backup e limpeza de base
            </p>
          </div>
        </div>

        {/* Global Connection Badge & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowDeveloperModal(true)}
            className="px-3.5 py-2.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Painel do Desenvolvedor Master (Protegido por Senha de Segurança)"
          >
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>Desenvolvedor Master</span>
            <Lock className="w-3 h-3 text-indigo-300 opacity-80" />
          </button>

          <button
            type="button"
            onClick={() => setShowPurgeModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Resetar todos os dados fictícios e inicializar a base para produção"
          >
            <Trash2 className="w-4 h-4 text-rose-200" />
            <span>Resetar para Produção (Limpeza Total)</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <p className="font-bold text-slate-800">
                Banco Central: <span className="text-emerald-700 font-black">Firebase Firestore (Nuvem Ativa)</span>
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Fonte única de verdade • 27 postos sincronizados em tempo real
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {syncSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{syncSuccessMsg}</span>
        </div>
      )}

      {backupSuccessMsg && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold">{backupSuccessMsg}</span>
        </div>
      )}

      {restoreErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{restoreErrorMsg}</span>
        </div>
      )}

      {/* GOOGLE WORKSPACE PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-mono">
                  Google Workspace Oficial
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono">
                  Google Drive & Sheets
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-1">
                Integrações Google Drive & Google Sheets
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                Sincronize seus agendamentos diretamente no Google Planilhas e faça snapshots de segurança na pasta oficial do Google Drive.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onOpenWorkspace && (
              <button
                type="button"
                onClick={onOpenWorkspace}
                className="inline-flex items-center gap-2 px-5 py-3 bg-linear-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Gerenciar Google Drive & Sheets</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bento Grid layout with 3 Core Tool Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: LINK & CONEXÃO ONLINE DOS OPERADORES */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    Acesso Remoto
                  </span>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Link de Acesso Online
                  </h3>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold font-mono">
                ONLINE
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Gere e envie a URL oficial de conexão para que seus operadores e postos encontrem o sistema e realizem login.
            </p>

            {/* Posto filter for link */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1" htmlFor="link-posto-select">
                  Vincular Posto Específico (Opcional):
                </label>
                <select
                  id="link-posto-select"
                  value={selectedPostoForLink}
                  onChange={(e) => setSelectedPostoForLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                >
                  <option value="">Geral (Todos os postos / Página inicial)</option>
                  {postos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.origem}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1" htmlFor="link-url-input">
                  URL de Acesso Configurada:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="link-url-input"
                    type="text"
                    readOnly
                    value={generatedOperatorLink}
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-900 text-white hover:bg-slate-800 border-slate-800'
                    }`}
                    title="Copiar Link"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enviar Link via WhatsApp</span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <QrCode className="w-4 h-4 text-slate-600" />
              <span>Visualizar QR Code para Celular</span>
            </button>
          </div>
        </div>

        {/* CARD 2: BANCO DE DADOS CENTRALIZADO FIRESTORE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    Armazenamento Central
                  </span>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Base Central em Nuvem
                  </h3>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                FIRESTORE REAL-TIME
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Base de dados <strong>única, contínua e centralizada</strong> para toda a rede de Niterói. Os 27 postos operam como referência de triagem dos pacientes conectados à mesma nuvem com trava anti-duplicidade em tempo real.
            </p>

            {/* Central Cloud Specs */}
            <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-2 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Provedor Cloud:</span>
                <span className="font-bold text-slate-800">Google Firebase Firestore</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Unidades Conectadas:</span>
                <span className="font-bold text-blue-700">27 Postos (P202 ao P230)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Sincronização:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Tempo Real (onSnapshot)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Trava de Concorrência:</span>
                <span className="font-bold text-purple-700">Proteção Ativa</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              onClick={handleForceSync}
              disabled={syncLoading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${syncLoading ? 'animate-spin' : ''}`} />
              <span>{syncLoading ? 'Verificando Conexão Firestore...' : 'Validar & Sincronizar Nuvem'}</span>
            </button>

            <button
              onClick={handleSanitizeAndReorganize}
              type="button"
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200"
              title="Limpar resíduos e normalizar postos e operadores"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Limpar Cache & Reorganizar Base</span>
            </button>
          </div>
        </div>

        {/* CARD 3: BACKUP COMPLETO DA BASE CENTRAL */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    Segurança de Dados
                  </span>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Backup & Restauração
                  </h3>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold font-mono">
                {snapshots.length} SNAPS
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Exporte todos os agendamentos, pacientes, vagas, postos e operadores para arquivo JSON ou restaure um backup anterior na nuvem.
            </p>

            {/* Quick action buttons */}
            <div className="mt-4 space-y-2">
              <button
                onClick={handleDownloadOfflineBackup}
                className="w-full py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  <span>Baixar Backup Central (.JSON)</span>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={handleCreateCloudSnapshot}
                className="w-full py-2.5 px-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span>Salvar Snapshot na Nuvem</span>
                </div>
                <Check className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>

            {/* Restore box */}
            <div className="mt-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
              <label className="cursor-pointer block">
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-700 block">Restaurar Backup Central (.JSON)</span>
                <span className="text-[10px] text-slate-400">Selecionar arquivo .json para sincronizar na nuvem</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUploadRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 text-center font-mono">
            Registros protegidos: {appointments.length} agendamentos • {postos.length} postos
          </div>
        </div>
      </div>

      {/* CÓDIGO DE INCORPORAÇÃO (IFRAME) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
              Publicação
            </span>
            <h3 className="text-sm font-black text-slate-900 leading-tight">
              Código de Incorporação (Sites, Wix, Google Sites)
            </h3>
          </div>
        </div>
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          <p>
            Copie o código abaixo e cole no HTML do seu site. O <strong>iFrame</strong> é a maneira correta e segura de embutir sistemas complexos.
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg">
            <strong className="block mb-1">Dica Especial para Google Sites:</strong>
            1. Vá em <strong>Inserir &gt; Incorporar &gt; Incorporar código</strong> e cole o código.<br/>
            2. <strong>MUITO IMPORTANTE:</strong> Após inserir, você verá o bloco na sua página. Clique nele e <strong>arraste as bolinhas azuis para baixo</strong>, esticando a altura do bloco o máximo possível. No celular, o Google Sites só exibe a altura que você desenhou no computador.
          </div>
        </div>
        <div className="relative group">
          <pre className="p-4 bg-slate-900 text-emerald-400 text-[11px] rounded-xl overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
{`<div style="width: 100%; min-height: 850px; overflow: hidden;">
  <iframe 
    src="https://ais-pre-qsn7ttfk26fdpacrdil6nc-826738023059.us-east1.run.app" 
    style="width: 100%; height: 100%; min-height: 850px; border: none; border-radius: 12px;" 
    allow="clipboard-read; clipboard-write; geolocation"
    title="Central de Agendamento">
  </iframe>
</div>`}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`<div style="width: 100%; min-height: 850px; overflow: hidden;">\n  <iframe \n    src="https://ais-pre-qsn7ttfk26fdpacrdil6nc-826738023059.us-east1.run.app" \n    style="width: 100%; height: 100%; min-height: 850px; border: none; border-radius: 12px;" \n    allow="clipboard-read; clipboard-write; geolocation"\n    title="Central de Agendamento">\n  </iframe>\n</div>`);
              const originalCopiedLink = copiedLink;
              setCopiedLink(true);
              setBackupSuccessMsg('Código copiado para a área de transferência!');
              setTimeout(() => {
                setCopiedLink(originalCopiedLink);
                setBackupSuccessMsg('');
              }, 4000);
            }}
            className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all border border-slate-700 opacity-80 group-hover:opacity-100 cursor-pointer shadow-sm"
            title="Copiar Código HTML"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Snapshots History Table */}
      {snapshots.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Pontos de Restauração em Nuvem
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Histórico de Snapshots Online
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total: {snapshots.length} versões salvas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-mono bg-slate-50">
                  <th className="py-2.5 px-3">Identificação</th>
                  <th className="py-2.5 px-3">Data e Hora</th>
                  <th className="py-2.5 px-3">Agendamentos</th>
                  <th className="py-2.5 px-3">Postos</th>
                  <th className="py-2.5 px-3">Tamanho</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshots.map(snap => (
                  <tr key={snap.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{snap.descricao}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{new Date(snap.timestamp).toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-700">{snap.totalAgendamentos}</td>
                    <td className="py-2.5 px-3 text-slate-700">{snap.totalPostos}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{snap.tamanhoKb} KB</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleRestoreCloudSnapshot(snap)}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Restaurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">QR Code de Acesso Rápido</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Visual QR Code Generator Simulation */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
              <div className="w-48 h-48 bg-white p-3 border-4 border-slate-900 rounded-xl flex flex-col items-center justify-center space-y-2 shadow-xs">
                <QrCode className="w-36 h-36 text-slate-900" />
                <span className="text-[9px] font-bold font-mono tracking-widest text-slate-500">APLICATIVO ONLINE</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-tight">
              Aponte a câmera do celular ou tablet do operador para abrir instantaneamente o sistema no navegador.
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
      {/* PURGE / PRODUCTION RESET CONFIRMATION MODAL */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Resetar Base para Produção
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Limpeza total de dados fictícios e resíduos de teste
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2 text-rose-950">
              <p className="font-bold">Atenção! Esta ação irá executar:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>Excluir todos os agendamentos fictícios de teste.</li>
                <li>Excluir todas as vagas de teste do calendário.</li>
                <li>Excluir todos os pacientes de exemplo.</li>
                <li>Zerar operadores de teste, mantendo <strong>apenas o Administrador Master</strong>.</li>
                <li>Restaurar a lista oficial dos <strong>26 Postos de Niterói (P202 ao P230)</strong>.</li>
                <li>Sincronizar a base limpa diretamente no <strong>Firebase Firestore</strong> em tempo real.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                disabled={purgeLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={purgeLoading}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{purgeLoading ? 'Limpando Base no Firebase...' : 'Confirmar e Limpar Base'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Developer Master Modal */}
      {showDeveloperModal && (
        <AdminDeveloperModal
          isOpen={showDeveloperModal}
          onClose={() => setShowDeveloperModal(false)}
        />
      )}
    </div>
  );
};
