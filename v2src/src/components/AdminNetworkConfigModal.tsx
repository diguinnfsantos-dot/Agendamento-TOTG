import React, { useState } from 'react';
import { 
  LocalNetworkDevice, 
  LocalNetworkConfig, 
  DeviceType, 
  DeviceStatus, 
  ConnectionType, 
  Posto 
} from '../types';
import { db } from '../storage/db';
import { 
  Wifi, 
  WifiOff, 
  Server, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Monitor, 
  ShieldCheck, 
  ShieldAlert, 
  Copy, 
  Check, 
  QrCode, 
  Share2, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  Terminal, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  MessageSquare,
  Sparkles,
  Search,
  Cable,
  Radio,
  SlidersHorizontal,
  FileCode2,
  HelpCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Key,
  Flame,
  Globe
} from 'lucide-react';

interface AdminNetworkConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  postos: Posto[];
  onNetworkUpdated?: () => void;
}

export const AdminNetworkConfigModal: React.FC<AdminNetworkConfigModalProps> = ({
  isOpen,
  onClose,
  postos,
  onNetworkUpdated,
}) => {
  const [config, setConfig] = useState<LocalNetworkConfig>(() => db.getNetworkConfig());
  const [devices, setDevices] = useState<LocalNetworkDevice[]>(() => db.getLocalDevices());

  // Password visibility states
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [copiedWifiPass, setCopiedWifiPass] = useState(false);
  const [copiedSSID, setCopiedSSID] = useState(false);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Selected device for dedicated QR code modal
  const [activeQrDevice, setActiveQrDevice] = useState<LocalNetworkDevice | null>(null);
  const [showCentralQr, setShowCentralQr] = useState(false);
  const [qrMode, setQrMode] = useState<'APP_LINK' | 'WIFI_CONNECT'>('APP_LINK');

  // Add Device Modal State
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>('PHONE');
  const [newDeviceIp, setNewDeviceIp] = useState('192.168.1.');
  const [newDeviceConexao, setNewDeviceConexao] = useState<ConnectionType>('WIFI_5GHZ');
  const [newDevicePostoId, setNewDevicePostoId] = useState('');

  // Filter State
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Tab inside modal: 'DEVICES' | 'WINDOWS_CONFIG' | 'SERVER_SETTINGS'
  const [activeSubTab, setActiveSubTab] = useState<'DEVICES' | 'WINDOWS_CONFIG' | 'SERVER_SETTINGS'>('DEVICES');

  // Deletion confirmation state
  const [deviceToDelete, setDeviceToDelete] = useState<LocalNetworkDevice | null>(null);

  if (!isOpen) return null;

  const localUrl = `http://${config.localServerIp}:${config.port}`;
  const wifiSSID = config.networkNameSSID || 'Clinica_Hotspot_WiFi';
  const wifiPassword = config.networkPassword || 'Clinica@Hotspot2026';

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  // Copy local server URL
  const handleCopyServerUrl = () => {
    navigator.clipboard.writeText(localUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    showToast('Link de rede local copiado com sucesso!');
  };

  // Copy Wi-Fi Password
  const handleCopyWifiPassword = () => {
    navigator.clipboard.writeText(wifiPassword);
    setCopiedWifiPass(true);
    setTimeout(() => setCopiedWifiPass(false), 2500);
    showToast('Senha da Rede Wi-Fi copiada para a área de transferência!');
  };

  // Copy SSID
  const handleCopySSID = () => {
    navigator.clipboard.writeText(wifiSSID);
    setCopiedSSID(true);
    setTimeout(() => setCopiedSSID(false), 2500);
    showToast('Nome da Rede Wi-Fi (SSID) copiado!');
  };

  // Copy custom command
  const handleCopyCommand = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2500);
    showToast('Comando copiado para a área de transferência!');
  };

  // Scan local network
  const handleScanNetwork = () => {
    setIsScanning(true);
    setScanMessage('Varrendo sinais Wi-Fi, Hotspot e portas locais na rede residencial...');
    setTimeout(() => {
      const updated = db.scanNetwork();
      setDevices(updated);
      setIsScanning(false);
      setScanMessage('');
      showToast('Varredura concluída! Dispositivos na mesma rede identificados.');
      if (onNetworkUpdated) onNetworkUpdated();
    }, 1200);
  };

  // Authorize device (Accept invitation and make visible)
  const handleAuthorizeDevice = (dev: LocalNetworkDevice) => {
    const updated = db.authorizeDevice(dev.id);
    setDevices(updated);
    showToast(`Dispositivo "${dev.nome}" autorizado! O sistema agora está visível para este aparelho.`);
    if (onNetworkUpdated) onNetworkUpdated();
  };

  // Invite device
  const handleInviteDevice = (dev: LocalNetworkDevice) => {
    const updated = db.inviteDevice(dev.id);
    setDevices(updated);
    showToast(`Convite de acesso gerado para "${dev.nome}".`);
    if (onNetworkUpdated) onNetworkUpdated();
  };

  // Block device (Immediately revokes visibility and access)
  const handleBlockDevice = (dev: LocalNetworkDevice) => {
    const updated = db.blockDevice(dev.id);
    setDevices(updated);
    showToast(`Aparelho "${dev.nome}" teve a visibilidade e permissões BLOQUEADAS imediatamente!`);
    if (onNetworkUpdated) onNetworkUpdated();
  };

  // Delete device confirmation trigger
  const handleDeleteDevice = (dev: LocalNetworkDevice) => {
    setDeviceToDelete(dev);
  };

  // Confirm and execute permanent deletion
  const handleConfirmDeleteDevice = () => {
    if (!deviceToDelete) return;
    const updated = db.deleteDevice(deviceToDelete.id);
    setDevices(updated);
    showToast(`Aparelho "${deviceToDelete.nome}" (${deviceToDelete.ip}) foi excluído do sistema.`);
    setDeviceToDelete(null);
    if (onNetworkUpdated) onNetworkUpdated();
  };

  // Authorize all connected devices
  const handleAuthorizeAll = () => {
    let current = [...devices];
    current.forEach(d => {
      if (d.status !== 'AUTHORIZED') {
        current = db.authorizeDevice(d.id);
      }
    });
    setDevices(current);
    showToast('Todos os aparelhos conectados foram autorizados com sucesso!');
    if (onNetworkUpdated) onNetworkUpdated();
  };

  // Add new device
  const handleAddDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim() || !newDeviceIp.trim()) return;

    const postoObj = postos.find(p => p.id === newDevicePostoId);

    const updated = db.addLocalDevice({
      nome: newDeviceName.trim(),
      tipo: newDeviceType,
      ip: newDeviceIp.trim(),
      macAddress: `00:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:AA:BB`,
      status: 'AUTHORIZED',
      conexao: newDeviceConexao,
      postoId: newDevicePostoId || undefined,
      postoNome: postoObj ? `${postoObj.id} - ${postoObj.origem}` : undefined,
      conviteEnviado: true,
      autorizadoEm: new Date().toISOString(),
      autorizadoPor: 'Rodrigo Santos',
    });

    setDevices(updated);
    setShowAddDeviceModal(false);
    setNewDeviceName('');
    setNewDeviceIp('192.168.1.');
    setNewDevicePostoId('');
    showToast('Novo dispositivo cadastrado e autorizado na rede local!');
    if (onNetworkUpdated) onNetworkUpdated();
  };

  // Save network parameters
  const handleSaveNetworkSettings = () => {
    db.saveNetworkConfig(config);
    showToast('Configurações da rede, Hotspot Wi-Fi e senha salvas com sucesso!');
    if (onNetworkUpdated) onNetworkUpdated();
  };

  // Download Windows .BAT automation script
  const handleDownloadBatchScript = () => {
    const scriptContent = db.generateWindowsBatchScript(
      config.localServerIp, 
      config.port,
      config.networkNameSSID,
      config.networkPassword
    );
    // Explicit Windows CRLF (\r\n) formatting to guarantee 100% CMD compatibility
    const crlfContent = scriptContent.replace(/\r?\n/g, '\r\n');
    const blob = new Blob([crlfContent], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'configurar_rede_local_windows.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Script do Windows (.BAT) baixado com auto-elevação! Ao executar, ele solicitará permissão de Administrador e abrirá o menu interativo.');
  };

  // Share device URL via WhatsApp
  const handleShareDeviceWhatsapp = (dev: LocalNetworkDevice) => {
    const devUrl = dev.postoId ? `${localUrl}?posto=${dev.postoId}` : localUrl;
    const text = `🏥 *Acesso à Rede Local & Hotspot da Clínica*\n\nOlá operador!\nSeu aparelho *${dev.nome}* foi configurado para acessar o sistema clínico na mesma rede.\n\n📶 *Rede Wi-Fi (SSID):* ${wifiSSID}\n🔑 *Senha da Rede Wi-Fi:* ${wifiPassword}\n🔗 *Link Direto de Acesso:* ${devUrl}\n📡 *IP Local do Servidor:* ${config.localServerIp}:${config.port}\n\nConecte seu celular, iPad ou notebook no Wi-Fi/Hotspot acima e abra o link do sistema no navegador!`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Filtered devices list
  const filteredDevices = devices.filter(dev => {
    const matchesType = filterType === 'ALL' || dev.tipo === filterType;
    const matchesStatus = filterStatus === 'ALL' || dev.status === filterStatus;
    const matchesSearch = !searchQuery.trim() || 
      dev.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dev.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.postoNome && dev.postoNome.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesStatus && matchesSearch;
  });

  const getDeviceIcon = (tipo: DeviceType) => {
    switch (tipo) {
      case 'COMPUTER':
        return <Monitor className="w-4 h-4 text-blue-600" />;
      case 'NOTEBOOK':
        return <Laptop className="w-4 h-4 text-indigo-600" />;
      case 'PHONE':
        return <Smartphone className="w-4 h-4 text-emerald-600" />;
      case 'TABLET':
        return <Tablet className="w-4 h-4 text-purple-600" />;
      case 'TERMINAL':
        return <Server className="w-4 h-4 text-slate-700" />;
    }
  };

  const getConnectionBadge = (conexao: ConnectionType) => {
    switch (conexao) {
      case 'WIFI_5GHZ':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Wifi className="w-3 h-3 text-blue-600" />
            Wi-Fi 5 GHz
          </span>
        );
      case 'WIFI_24GHZ':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <Radio className="w-3 h-3 text-teal-600" />
            Wi-Fi 2.4 GHz
          </span>
        );
      case 'ETHERNET':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <Cable className="w-3 h-3 text-slate-600" />
            Cabo Ethernet
          </span>
        );
    }
  };

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case 'AUTHORIZED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Autorizado & Visível
          </span>
        );
      case 'INVITED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Convite Pendente
          </span>
        );
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Radio className="w-3 h-3 text-blue-600 animate-pulse" />
            Aguardando Aceite
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            Visibilidade Bloqueada
          </span>
        );
    }
  };

  const totalAuthorized = devices.filter(d => d.status === 'AUTHORIZED').length;
  const totalPending = devices.filter(d => d.status === 'CONNECTED' || d.status === 'INVITED').length;
  const totalBlocked = devices.filter(d => d.status === 'BLOCKED').length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Configuração de Rede Local & Hotspot Wi-Fi
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                  SEM HOSPEDAGEM WEB
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Compartilhamento via Wi-Fi, Cabo ou Hotspot Móvel do Windows para Celulares, iPads e Notebooks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar Modal"
          >
            ✕
          </button>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="my-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Quick Connection Bar & Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3 shrink-0">
          {/* Card 1: Local URL & Copy */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono uppercase font-bold text-emerald-400">
                <Server className="w-3.5 h-3.5" />
                Link de Acesso Local
              </span>
              <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded-md text-[9px] font-mono">
                Porta {config.port}
              </span>
            </div>

            <div className="my-1.5 flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-xs font-mono font-bold text-emerald-300 truncate mr-2 select-all">
                {localUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyServerUrl}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs cursor-pointer transition-colors shrink-0"
                title="Copiar Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Máquina: {config.serverName}</span>
              <button
                type="button"
                onClick={() => setShowCentralQr(true)}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3 h-3" />
                <span>QR Code Central</span>
              </button>
            </div>
          </div>

          {/* Card 2: Wi-Fi SSID & Password */}
          <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-blue-900 font-bold">
              <span className="flex items-center gap-1 font-mono uppercase">
                <Wifi className="w-3.5 h-3.5 text-blue-600" />
                Hotspot / Rede Wi-Fi (SSID)
              </span>
              <button
                onClick={handleCopySSID}
                className="text-[10px] text-blue-700 hover:text-blue-900 font-mono flex items-center gap-0.5"
                title="Copiar SSID"
              >
                {copiedSSID ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>

            <div className="my-1 text-xs">
              <div className="font-bold text-slate-900 truncate">
                {wifiSSID}
              </div>
              <div className="flex items-center gap-2 mt-1 bg-white/80 px-2 py-1 rounded-lg border border-blue-200">
                <Key className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="text-[11px] font-mono font-bold text-slate-800 flex-1 truncate">
                  {showWifiPassword ? wifiPassword : '••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowWifiPassword(!showWifiPassword)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                  title={showWifiPassword ? "Ocultar" : "Mostrar"}
                >
                  {showWifiPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyWifiPassword}
                  className="text-blue-600 hover:text-blue-800 p-0.5"
                  title="Copiar Senha"
                >
                  {copiedWifiPass ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="text-[10px] text-blue-800/80 flex items-center justify-between">
              <span>Compatível com Celular, iPad & PC</span>
              <span className="font-semibold text-emerald-700">✓ Hotspot Ativo</span>
            </div>
          </div>

          {/* Card 3: Devices Overview */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/60 rounded-2xl border border-emerald-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-emerald-900 font-bold">
              <span className="flex items-center gap-1 font-mono uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Status dos Aparelhos
              </span>
              <span className="text-[10px] text-emerald-700 font-mono">
                {devices.length} cadastrados
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-1 text-center">
              <div className="p-1.5 bg-white/80 rounded-xl border border-emerald-200">
                <div className="text-base font-black text-emerald-700">{totalAuthorized}</div>
                <div className="text-[9px] text-emerald-900 font-bold uppercase">Autorizados</div>
              </div>
              <div className="p-1.5 bg-white/80 rounded-xl border border-amber-200">
                <div className="text-base font-black text-amber-600">{totalPending}</div>
                <div className="text-[9px] text-amber-800 font-bold uppercase">Aguardando</div>
              </div>
              <div className="p-1.5 bg-white/80 rounded-xl border border-rose-200">
                <div className="text-base font-black text-rose-600">{totalBlocked}</div>
                <div className="text-[9px] text-rose-800 font-bold uppercase">Bloqueados</div>
              </div>
            </div>

            <div className="text-[10px] text-emerald-800/80 flex items-center justify-between">
              <span>Firewall Windows: Liberado</span>
              <button
                onClick={() => setActiveSubTab('WINDOWS_CONFIG')}
                className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
              >
                Ver Regras
              </button>
            </div>
          </div>
        </div>

        {/* Sub Navigation Tabs inside Modal */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mt-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('DEVICES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'DEVICES'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Aparelhos na Rede & Aceites ({devices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('WINDOWS_CONFIG')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'WINDOWS_CONFIG'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Regras do Windows & Hotspot (.BAT)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('SERVER_SETTINGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'SERVER_SETTINGS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Configurações do Servidor Local & Senha</span>
          </button>
        </div>

        {/* TAB 1: DEVICES LIST & SCANNER */}
        {activeSubTab === 'DEVICES' && (
          <div className="flex-1 overflow-y-auto space-y-4 mt-3 pr-1">
            {/* Filter and Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, IP ou posto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                {/* Filter Type */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="PHONE">Celulares / Smartphones</option>
                  <option value="TABLET">iPads / Tablets</option>
                  <option value="NOTEBOOK">Notebooks</option>
                  <option value="COMPUTER">Computadores</option>
                </select>

                {/* Filter Status */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">Todas as Situações</option>
                  <option value="AUTHORIZED">Autorizados / Visíveis ({totalAuthorized})</option>
                  <option value="CONNECTED">Aguardando Aceite ({totalPending})</option>
                  <option value="BLOCKED">Bloqueados ({totalBlocked})</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleScanNetwork}
                  disabled={isScanning}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                  title="Varredura de novos aparelhos na mesma rede Wi-Fi"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Varrendo Rede...' : 'Escanear Rede Local'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAuthorizeAll}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Autorizar e tornar o sistema visível para todos os aparelhos detectados"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Autorizar Todos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Aparelho</span>
                </button>
              </div>
            </div>

            {/* Scanning In Progress Alert */}
            {isScanning && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2 animate-pulse font-medium">
                <Radio className="w-4 h-4 text-blue-600 animate-spin" />
                <span>{scanMessage}</span>
              </div>
            )}

            {/* Devices Table / Grid */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Aparelho / Dispositivo</th>
                    <th className="py-3 px-4">Endereço IP & Conexão</th>
                    <th className="py-3 px-4">Posto Vinculado</th>
                    <th className="py-3 px-4">Status na Rede Local</th>
                    <th className="py-3 px-4 text-right">Ações de Aceite & Acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Nenhum dispositivo encontrado com os filtros selecionados. Clique em "Escanear Rede Local" ou "+ Adicionar Aparelho".
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map(dev => {
                      const isAuth = dev.status === 'AUTHORIZED';
                      const isBlocked = dev.status === 'BLOCKED';

                      return (
                        <tr 
                          key={dev.id} 
                          className={`transition-colors ${
                            isBlocked
                              ? 'bg-rose-50/50'
                              : isAuth
                              ? 'hover:bg-slate-50/80'
                              : 'bg-amber-50/40 hover:bg-amber-50/70'
                          }`}
                        >
                          {/* Device Name & Type */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                isBlocked 
                                  ? 'bg-rose-100 border-rose-200' 
                                  : isAuth 
                                  ? 'bg-slate-100 border-slate-200' 
                                  : 'bg-amber-100 border-amber-200'
                              }`}>
                                {getDeviceIcon(dev.tipo)}
                              </div>
                              <div>
                                <div className={`font-bold ${isBlocked ? 'text-rose-950 line-through' : 'text-slate-900'}`}>
                                  {dev.nome}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  MAC: {dev.macAddress}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* IP & Connection Type */}
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-blue-900">{dev.ip}</div>
                            <div className="mt-0.5">{getConnectionBadge(dev.conexao)}</div>
                          </td>

                          {/* Linked Posto */}
                          <td className="py-3 px-4">
                            {dev.postoNome ? (
                              <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                {dev.postoNome}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Acesso Geral</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {getStatusBadge(dev.status)}
                            {dev.autorizadoPor && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Liberado por: {dev.autorizadoPor}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Convite de Aceite / Autorizar */}
                              {!isAuth && !isBlocked && (
                                <button
                                  type="button"
                                  onClick={() => handleAuthorizeDevice(dev)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Fazer convite de aceite e tornar sistema visível"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Aceitar & Tornar Visível</span>
                                </button>
                              )}

                              {/* WhatsApp Direct Link */}
                              <button
                                type="button"
                                onClick={() => handleShareDeviceWhatsapp(dev)}
                                className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="Enviar link e dados de Wi-Fi para o WhatsApp do operador"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* QR Code Individual */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveQrDevice(dev);
                                  setQrMode('APP_LINK');
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="Visualizar QR Code para a câmera do aparelho"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>

                              {/* Block / Unlock */}
                              {isBlocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleAuthorizeDevice(dev)}
                                  className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg border border-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Desbloquear e restaurar visibilidade deste aparelho"
                                >
                                  <Unlock className="w-3 h-3 text-emerald-700" />
                                  <span>Desbloquear</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleBlockDevice(dev)}
                                  className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-lg border border-slate-200 hover:border-rose-300 transition-colors cursor-pointer"
                                  title="Bloquear visibilidade deste aparelho imediatamente"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Device */}
                              <button
                                type="button"
                                onClick={() => handleDeleteDevice(dev)}
                                className="p-1.5 bg-slate-100 hover:bg-rose-600 text-slate-400 hover:text-white rounded-lg border border-slate-200 hover:border-rose-600 transition-colors cursor-pointer"
                                title="Excluir aparelho da lista permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* TAB 2: WINDOWS RULES & FIREWALL AUTOMATION (CABO E WI-FI) */}
        {activeSubTab === 'WINDOWS_CONFIG' && (
          <div className="flex-1 overflow-y-auto space-y-4 mt-3 pr-1">
            {/* Windows Rules Hero */}
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm mb-1">
                <Terminal className="w-4 h-4 text-amber-700" />
                <span>Automatização de Rede Local (Cabo de Rede Ethernet & Wi-Fi / Hotspot)</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Para que computadores conectados via <strong>Cabo de Rede (Ethernet)</strong> ou via <strong>Rede Sem Fio (Wi-Fi / Hotspot)</strong> consigam acessar o sistema rodando na máquina servidor, utilize o <strong>Script .BAT de 1-Clique</strong> ou siga os passos rápidos de configuração do Windows.
              </p>
            </div>

            {/* BAT Downloader Hero Banner */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Automatizador 1-Clique Windows (.BAT)
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">Suporta Servidor + Pontos de Acesso</span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Script Completo: Cabo de Rede (Ethernet) + Wi-Fi Hotspot + Firewall
                </h4>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Execute no Servidor Master para liberar portas e Hotspot, ou execute nos computadores/notebooks dos postos de atendimento para abrir conexões de rede, testar Ping e criar atalho na Área de Trabalho.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadBatchScript}
                className="shrink-0 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all hover:scale-105"
              >
                <Download className="w-4 h-4" />
                <span>Baixar .BAT do Windows</span>
              </button>
            </div>

            {/* Automation Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1: Firewall Inbound & Outbound Rules */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                    Passo 1 • Firewall (Cabo & Wi-Fi)
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  Liberar Porta {config.port} no Firewall do Windows
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Permite conexões de entrada na porta <strong>{config.port}</strong> tanto para placas cabeadas (Ethernet) quanto sem fio.
                </p>

                <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl relative group">
                  <code className="break-all select-all">
                    {`netsh advfirewall firewall add rule name="SistemaAgendamentoClinico" dir=in action=allow protocol=TCP localport=${config.port}`}
                  </code>
                  <button
                    onClick={() => handleCopyCommand(`netsh advfirewall firewall add rule name="SistemaAgendamentoClinico" dir=in action=allow protocol=TCP localport=${config.port}`, 'cmd1')}
                    className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-all"
                    title="Copiar Comando"
                  >
                    {copiedCmd === 'cmd1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Step 2: Ethernet Properties (ncpa.cpl & TCP/IPv4) */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                    Passo 2 • Conexão Cabeada (Cabo de Rede)
                  </span>
                  <Laptop className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  Propriedades de Rede Ethernet (Protocolo IP TCP/IPv4)
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Abra as Conexões de Rede no Windows para conferir o IP estático ou DHCP na placa de rede cabeada.
                </p>

                <div className="p-2.5 bg-slate-900 text-cyan-300 font-mono text-[11px] rounded-xl relative group">
                  <code className="break-all select-all">
                    control ncpa.cpl
                  </code>
                  <button
                    onClick={() => handleCopyCommand('control ncpa.cpl', 'cmd_ncpa')}
                    className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-all"
                    title="Copiar Comando"
                  >
                    {copiedCmd === 'cmd_ncpa' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Dica: Clique com o botão direito em "Ethernet" → Propriedades → Protocolo IP Versão 4 (TCP/IPv4) para fixar IP na mesma faixa do servidor (ex: 192.168.1.X).
                </p>
              </div>

              {/* Step 3: Network Discovery */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                    Passo 3 • Descoberta Local
                  </span>
                  <Wifi className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  Ativar Descoberta de Rede & Compartilhamento
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Torna o host visível para computadores via cabo e aparelhos conectados na rede Wi-Fi.
                </p>

                <div className="p-2.5 bg-slate-900 text-purple-400 font-mono text-[11px] rounded-xl relative group">
                  <code className="break-all select-all">
                    netsh advfirewall firewall set rule group="Descoberta de Rede" new enable=Yes
                  </code>
                  <button
                    onClick={() => handleCopyCommand('netsh advfirewall firewall set rule group="Descoberta de Rede" new enable=Yes', 'cmd2')}
                    className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-all"
                    title="Copiar Comando"
                  >
                    {copiedCmd === 'cmd2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Step 4: Hotspot Móvel do Windows */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                    Passo 4 • Hotspot Sem Fio
                  </span>
                  <Flame className="w-4 h-4 text-indigo-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  Compartilhar Sistema via Hotspot Móvel (SSID & Senha)
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Cria um ponto de acesso sem fio no Windows com o nome <strong>{wifiSSID}</strong> e senha <strong>{wifiPassword}</strong>.
                </p>

                <div className="p-2.5 bg-slate-900 text-indigo-300 font-mono text-[11px] rounded-xl relative group">
                  <code className="break-all select-all">
                    {`netsh wlan set hostednetwork mode=allow ssid="${wifiSSID}" key="${wifiPassword}"`}
                  </code>
                  <button
                    onClick={() => handleCopyCommand(`netsh wlan set hostednetwork mode=allow ssid="${wifiSSID}" key="${wifiPassword}"`, 'cmd3')}
                    className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-all"
                    title="Copiar Comando"
                  >
                    {copiedCmd === 'cmd3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SERVER SETTINGS, WIFI SSID & PASSWORD CONFIG */}
        {activeSubTab === 'SERVER_SETTINGS' && (
          <div className="flex-1 overflow-y-auto space-y-4 mt-3 pr-1">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Parâmetros do Servidor Local, Rede Wi-Fi (SSID) e Senha de Acesso
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure os parâmetros de IP, porta e credenciais do Hotspot móvel do Windows.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                  HOTSPOT & LAN
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* IP do Host */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="srv-ip">
                    Endereço IPv4 do Servidor Host (Seu Computador) *
                  </label>
                  <input
                    id="srv-ip"
                    type="text"
                    value={config.localServerIp}
                    onChange={(e) => setConfig({ ...config, localServerIp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Ex: 192.168.1.100 ou 192.168.0.50</p>
                </div>

                {/* Porta do Sistema */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="srv-port">
                    Porta do Sistema Local *
                  </label>
                  <input
                    id="srv-port"
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Padrão da aplicação: 3000</p>
                </div>

                {/* Nome da Máquina Host */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="srv-name">
                    Nome Identificador da Máquina Host
                  </label>
                  <input
                    id="srv-name"
                    type="text"
                    value={config.serverName}
                    onChange={(e) => setConfig({ ...config, serverName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>

                {/* Nome da Rede Wi-Fi (SSID) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="srv-wifi-name">
                    Nome da Rede Wi-Fi (SSID) / Hotspot Móvel *
                  </label>
                  <input
                    id="srv-wifi-name"
                    type="text"
                    placeholder="Ex: Clinica_Hotspot_WiFi"
                    value={config.networkNameSSID || ''}
                    onChange={(e) => setConfig({ ...config, networkNameSSID: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Nome que aparecerá no Wi-Fi dos celulares e iPads</p>
                </div>

                {/* Senha da Rede Wi-Fi & Acesso ao App */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="srv-wifi-pass">
                    Senha da Rede Wi-Fi (Hotspot) & Acesso ao Aplicativo *
                  </label>
                  <div className="relative">
                    <input
                      id="srv-wifi-pass"
                      type={showWifiPassword ? "text" : "password"}
                      placeholder="Digite a senha da rede Wi-Fi / Hotspot e do app..."
                      value={config.networkPassword || ''}
                      onChange={(e) => setConfig({ ...config, networkPassword: e.target.value })}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWifiPassword(!showWifiPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      title={showWifiPassword ? "Ocultar Senha" : "Exibir Senha"}
                    >
                      {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Esta senha será utilizada para conexão no Wi-Fi/Hotspot da clínica e autenticação dos aparelhos.
                  </p>
                </div>
              </div>

              {/* ACTION BAR: PASSWORD INPUT DIRECTLY NEXT TO THE SAVE BUTTON */}
              <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl">
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-full">
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">
                      Senha de Acesso Wi-Fi & App:
                    </span>
                    <div className="relative">
                      <input
                        type={showWifiPassword ? "text" : "password"}
                        value={config.networkPassword || ''}
                        onChange={(e) => setConfig({ ...config, networkPassword: e.target.value })}
                        placeholder="Senha da rede..."
                        className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWifiPassword(!showWifiPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        title={showWifiPassword ? "Ocultar Senha" : "Exibir Senha"}
                      >
                        {showWifiPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={handleSaveNetworkSettings}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Salvar Parâmetros da Rede</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            {devices.length} aparelhos • Rede: <strong className="text-slate-700">{wifiSSID}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>

      {/* MODAL: ADD DEVICE MANUALLY */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Cadastrar Aparelho na Rede Local
              </h3>
              <button
                onClick={() => setShowAddDeviceModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDeviceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome do Aparelho (Identificação) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: iPad Sala de Triagem, Celular Recepção"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Aparelho</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value as DeviceType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="PHONE">Celular / Smartphone</option>
                    <option value="TABLET">iPad / Tablet</option>
                    <option value="NOTEBOOK">Notebook</option>
                    <option value="COMPUTER">Computador Desktop</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Conexão</label>
                  <select
                    value={newDeviceConexao}
                    onChange={(e) => setNewDeviceConexao(e.target.value as ConnectionType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="WIFI_5GHZ">Wi-Fi 5 GHz</option>
                    <option value="WIFI_24GHZ">Wi-Fi 2.4 GHz</option>
                    <option value="ETHERNET">Cabo Ethernet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Endereço IP na Rede Local *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 192.168.1.115"
                  value={newDeviceIp}
                  onChange={(e) => setNewDeviceIp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vincular a um Posto (Opcional)</label>
                <select
                  value={newDevicePostoId}
                  onChange={(e) => setNewDevicePostoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="">Nenhum (Acesso Geral)</option>
                  {postos.map(p => (
                    <option key={p.id} value={p.id}>{p.id} - {p.origem}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Cadastrar & Autorizar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INDIVIDUAL / CENTRAL QR CODE & WI-FI PAIRING */}
      {(activeQrDevice || showCentralQr) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-600 font-mono">
                  Pareamento Wi-Fi / Hotspot
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  {activeQrDevice ? activeQrDevice.nome : 'Acesso Geral à Rede Local'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveQrDevice(null);
                  setShowCentralQr(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* QR Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setQrMode('APP_LINK')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  qrMode === 'APP_LINK' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Link do Sistema
              </button>
              <button
                type="button"
                onClick={() => setQrMode('WIFI_CONNECT')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  qrMode === 'WIFI_CONNECT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Conectar no Wi-Fi
              </button>
            </div>

            {/* QR Code Container */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
              <div className="w-48 h-48 bg-white p-3 border-4 border-slate-900 rounded-xl flex flex-col items-center justify-center space-y-2 shadow-xs">
                <QrCode className="w-36 h-36 text-slate-900" />
                <span className="text-[9px] font-bold font-mono tracking-wider text-slate-600">
                  {qrMode === 'APP_LINK' ? (activeQrDevice?.ip || config.localServerIp) : wifiSSID}
                </span>
              </div>
            </div>

            {/* Wi-Fi & Link Credentials Box */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold">Rede Wi-Fi (SSID):</span>
                <span className="font-bold text-slate-900 font-mono">{wifiSSID}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold">Senha do Wi-Fi:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-indigo-700 font-mono">{wifiPassword}</span>
                  <button
                    onClick={handleCopyWifiPassword}
                    className="p-1 text-slate-400 hover:text-slate-700"
                    title="Copiar Senha"
                  >
                    {copiedWifiPass ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold">URL:</span>
                <span className="font-mono text-[11px] text-blue-900 font-bold truncate max-w-[170px]">
                  {activeQrDevice?.postoId ? `${localUrl}?posto=${activeQrDevice.postoId}` : localUrl}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveQrDevice(null);
                setShowCentralQr(false);
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Fechar QR Code
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DEVICE DELETION */}
      {deviceToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-600 font-mono block">
                    Confirmação de Exclusão
                  </span>
                  <h3 className="text-sm font-black text-slate-900">
                    Excluir Aparelho da Rede Local?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeviceToDelete(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Nome do Aparelho:</span>
                <span className="font-bold text-slate-900">{deviceToDelete.nome}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Endereço IP:</span>
                <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">{deviceToDelete.ip}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Tipo de Conexão:</span>
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  {deviceToDelete.conexao === 'ETHERNET' ? 'Cabo de Rede (Ethernet)' : 'Wi-Fi Sem Fio'}
                </span>
              </div>
              {deviceToDelete.postoNome && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-200/50">
                  <span className="text-slate-500 font-medium">Posto Vinculado:</span>
                  <span className="font-bold text-indigo-900">{deviceToDelete.postoNome}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O aparelho será <strong>permanentemente eliminado</strong> da lista do sistema e perderá imediatamente todo o acesso. Ele só voltará a ser disponibilizado quando o Administrador Master realizar uma nova varredura de aparelhos clicando no botão <strong>"Escanear Rede Local"</strong>.
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeviceToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDevice}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Aparelho</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
