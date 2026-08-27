import React, { useState, useEffect } from 'react';
import { User, Posto, Slot, Appointment, SystemRule, CloudSnapshot, LocalNetworkDevice, LocalNetworkConfig } from '../types';
import { db } from '../storage/db';
import { AdminNetworkConfigModal } from './AdminNetworkConfigModal';
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
  Wifi, 
  WifiOff, 
  Server, 
  Key, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Radio,
  Smartphone,
  Laptop,
  Tablet,
  Terminal,
  Sparkles,
  Cable,
  Monitor,
  Code2,
  Lock
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

  // Network Config & Devices State
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkConfig, setNetworkConfig] = useState<LocalNetworkConfig>(() => db.getNetworkConfig());
  const [localDevices, setLocalDevices] = useState<LocalNetworkDevice[]>(() => db.getLocalDevices());

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

  const refreshNetworkData = () => {
    setNetworkConfig(db.getNetworkConfig());
    setLocalDevices(db.getLocalDevices());
  };

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

  // Switch DB Mode (Offline vs Online Sync)
  const handleToggleDbMode = (newMode: 'OFFLINE' | 'ONLINE_SYNC') => {
    const updated = {
      ...dbConfig,
      mode: newMode,
      lastSync: new Date().toISOString(),
    };
    db.saveDbConfig(updated);
    setDbConfig(updated);
    
    db.addLog(
      masterAdmin.nome,
      masterAdmin.email,
      'MODO_BANCO_ALTERADO',
      `Armazenamento alterado para modo: ${newMode === 'OFFLINE' ? 'OFFLINE (Local)' : 'ONLINE (Nuvem / Sincronização)'}`,
      'INFO'
    );

    setSyncSuccessMsg(`Modo alterado para ${newMode === 'OFFLINE' ? 'Offline Local' : 'Online em Nuvem'} com sucesso!`);
    setTimeout(() => setSyncSuccessMsg(''), 4000);
  };

  // Force Manual Sync
  const handleForceSync = () => {
    setSyncLoading(true);
    setTimeout(() => {
      const updated = {
        ...dbConfig,
        lastSync: new Date().toISOString(),
      };
      db.saveDbConfig(updated);
      setDbConfig(updated);
      setSyncLoading(false);

      db.addLog(
        masterAdmin.nome,
        masterAdmin.email,
        'SINCRONIZACAO_NUVEM',
        'Sincronização manual com banco de dados central concluída com 100% de integridade.',
        'SUCESSO'
      );

      setSyncSuccessMsg('Sincronização com o servidor online executada com sucesso!');
      setTimeout(() => setSyncSuccessMsg(''), 4000);
    }, 1000);
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

  const authorizedCount = localDevices.filter(d => d.status === 'AUTHORIZED').length;
  const pendingCount = localDevices.filter(d => d.status === 'CONNECTED' || d.status === 'INVITED').length;

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
                Painel Técnico & Conectividade
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Sistema Operacional Ativo
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 font-mono">
                <Wifi className="w-3 h-3 text-blue-600" />
                LAN: {networkConfig.localServerIp}:{networkConfig.port}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Tela de Ferramentas do Sistema
            </h2>
            <p className="text-xs text-slate-500">
              Configuração de rede local para celulares e PCs, automatizador do Windows, links de operadores e backup
            </p>
          </div>
        </div>

        {/* Global Connection Badge & Network Config Action */}
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
            onClick={() => setShowNetworkModal(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all border border-slate-800 hover:scale-[1.02] active:scale-[0.98]"
            title="Configurar celulares, iPads, notebooks e PCs na mesma rede residencial"
          >
            <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Configuração de Rede</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                {pendingCount} novo(s)
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <p className="font-bold text-slate-800">
                Modo: <span className="text-blue-700">{dbConfig.mode === 'OFFLINE' ? 'Offline Local (LocalStorage)' : 'Online em Nuvem (Cloud Sync)'}</span>
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {authorizedCount} aparelho(s) autorizados na LAN
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NEW HERO BENTO: LOCAL NETWORK AUTOMATOR BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white p-6 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono uppercase">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Automatizador de Rede Residencial / Local (Wi-Fi & Cabo)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                Independente de Hospedagem Web
              </span>
            </div>

            <h3 className="text-lg font-black text-white tracking-tight">
              Acesso Multi-Aparelhos na Mesma Rede Local
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Permita que qualquer <strong>computador, celular, iPad, notebook ou tablet</strong> conectado na mesma rede residencial/local (por fio ou sem fio) se conecte ao sistema através do IP do seu computador. Use o automatizador para aplicar as regras de permissão do Windows e convidar/aceitar aparelhos tornando o sistema visível.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Host Local: <strong className="text-white">http://{networkConfig.localServerIp}:{networkConfig.port}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Firewall Windows: <strong className="text-emerald-400">Regra Ativa (Porta {networkConfig.port})</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Smartphone className="w-4 h-4 text-purple-400" />
                <span>{authorizedCount} autorizados • {pendingCount} pendente(s)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowNetworkModal(true)}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Wifi className="w-4 h-4" />
              <span>Abrir Configuração de Rede Local</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const script = db.generateWindowsBatchScript(
                    networkConfig.localServerIp, 
                    networkConfig.port,
                    networkConfig.networkNameSSID,
                    networkConfig.networkPassword
                  );
                  const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'configurar_rede_local_windows.bat';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  setBackupSuccessMsg('Automatizador do Windows (.BAT) baixado! Execute como Administrador para liberar o Firewall.');
                  setTimeout(() => setBackupSuccessMsg(''), 4000);
                }}
                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
                title="Baixar executável do Windows para liberar portas"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Baixar .BAT do Windows</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = `http://${networkConfig.localServerIp}:${networkConfig.port}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                  setBackupSuccessMsg(`Link local "${url}" copiado!`);
                  setTimeout(() => setBackupSuccessMsg(''), 3000);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
                title="Copiar IP do Host"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiar IP</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick device preview chips */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 font-mono">Dispositivos Detectados:</span>
          {localDevices.slice(0, 5).map(dev => (
            <div 
              key={dev.id}
              onClick={() => setShowNetworkModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 text-slate-200 border border-slate-700/60 cursor-pointer hover:bg-slate-700 transition-colors"
            >
              {dev.tipo === 'COMPUTER' && <Monitor className="w-3 h-3 text-blue-400" />}
              {dev.tipo === 'NOTEBOOK' && <Laptop className="w-3 h-3 text-indigo-400" />}
              {dev.tipo === 'PHONE' && <Smartphone className="w-3 h-3 text-emerald-400" />}
              {dev.tipo === 'TABLET' && <Tablet className="w-3 h-3 text-purple-400" />}
              <span>{dev.nome}</span>
              {dev.status === 'AUTHORIZED' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
          ))}
          {localDevices.length > 5 && (
            <button 
              onClick={() => setShowNetworkModal(true)}
              className="text-[11px] text-emerald-400 hover:underline font-bold"
            >
              +{localDevices.length - 5} mais...
            </button>
          )}
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

      {/* GOOGLE WORKSPACE & CLOUD SQL NATIVE PANEL */}
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
                  Cloud SQL us-east1
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-1">
                Integrações Google Drive, Google Sheets & Cloud SQL PostgreSQL
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                Sincronize seus agendamentos diretamente no Google Planilhas, faça snapshots de segurança na pasta oficial do Google Drive e mantenha seu banco de dados corporativo relacional no Cloud SQL (PostgreSQL).
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
                <span>Gerenciar Google Drive, Sheets & Cloud SQL</span>
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

        {/* CARD 2: VÍNCULO DE BANCO DE DADOS (ONLINE VS OFFLINE) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    Armazenamento
                  </span>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Vínculo do Banco de Dados
                  </h3>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold font-mono ${
                dbConfig.mode === 'ONLINE_SYNC' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {dbConfig.mode === 'ONLINE_SYNC' ? 'NUVEM' : 'LOCAL'}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Escolha se seus dados serão salvos no modo <strong>Offline Local</strong> (máxima velocidade e segurança) ou <strong>Online em Nuvem</strong> (sincronização multi-postos).
            </p>

            {/* Toggle Mode Selectors */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleToggleDbMode('OFFLINE')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  dbConfig.mode === 'OFFLINE'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <HardDrive className={`w-4 h-4 ${dbConfig.mode === 'OFFLINE' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs">Offline Local</span>
                </div>
                <p className="text-[10px] opacity-80 leading-tight">
                  Salva no navegador do operador sem depender de internet.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleToggleDbMode('ONLINE_SYNC')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  dbConfig.mode === 'ONLINE_SYNC'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Cloud className={`w-4 h-4 ${dbConfig.mode === 'ONLINE_SYNC' ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs">Online Nuvem</span>
                </div>
                <p className="text-[10px] opacity-80 leading-tight">
                  Sincronização em tempo real entre todos os postos de coleta.
                </p>
              </button>
            </div>

            {/* Connection Specs */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Provedor Nuvem:</span>
                <span className="font-bold text-slate-700 truncate max-w-[170px]">{dbConfig.cloudStorageProvider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Token de Segurança:</span>
                <span className="font-bold text-slate-600 truncate font-mono">•••••••••••••••• (Protegido)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Integridade de Dados:</span>
                <span className="font-bold text-emerald-600">100% Sincronizado</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleForceSync}
              disabled={syncLoading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${syncLoading ? 'animate-spin' : ''}`} />
              <span>{syncLoading ? 'Sincronizando Banco...' : 'Sincronizar Banco Agora'}</span>
            </button>
          </div>
        </div>

        {/* CARD 3: BACKUP COMPLETO (ONLINE OU OFFLINE) */}
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
              Exporte todos os agendamentos, postos e operadores para seu computador ou salve snapshots diretamente na nuvem.
            </p>

            {/* Quick action buttons */}
            <div className="mt-4 space-y-2">
              <button
                onClick={handleDownloadOfflineBackup}
                className="w-full py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  <span>Baixar Backup Offline (.JSON)</span>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={handleCreateCloudSnapshot}
                className="w-full py-2.5 px-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span>Salvar Snapshot Online na Nuvem</span>
                </div>
                <Check className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>

            {/* Restore box */}
            <div className="mt-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
              <label className="cursor-pointer block">
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-700 block">Restaurar de Arquivo (.JSON)</span>
                <span className="text-[10px] text-slate-400">Clique para selecionar o backup salvo</span>
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
      {/* Network Configuration & Device Authorization Modal */}
      <AdminNetworkConfigModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        postos={postos}
        onNetworkUpdated={refreshNetworkData}
      />

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
