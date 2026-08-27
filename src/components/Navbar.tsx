import React from 'react';
import { User, ActiveTab } from '../types';
import { 
  Calendar, 
  Users, 
  MapPin, 
  FileText, 
  PieChart, 
  CheckSquare, 
  LogOut, 
  Building2,
  Clock,
  Sparkles,
  Wrench,
  Sliders,
  Cloud,
  FileSpreadsheet,
  Database,
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingOperatorsCount: number;
  pendingCancelsCount: number;
  onLogout: () => void;
  onOpenWorkspace?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  pendingOperatorsCount,
  pendingCancelsCount,
  onLogout,
  onOpenWorkspace,
}) => {
  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      {/* Top Banner / Brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs border border-slate-800">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  MedAgendamento
                </span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isAdmin 
                    ? 'bg-slate-900 text-amber-300 border border-slate-700' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {isAdmin ? 'Admin Master' : 'Operador'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Regulação de Vagas Clínicas & Lembretes WhatsApp
              </p>
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center space-x-3">
            {isAdmin && onOpenWorkspace && (
              <button
                id="btn-open-workspace"
                onClick={onOpenWorkspace}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Abrir Google Workspace (Drive, Sheets) e Cloud SQL (Exclusivo Administrador Master)"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Google Drive / Sheets</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}

            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900 leading-none">{currentUser.nome}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {isAdmin ? 'Acesso Total Regulador' : `ID: ${currentUser.postoId} • ${currentUser.origem}`}
              </p>
            </div>

            <button
              id="btn-logout"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Encerrar Sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <nav className="flex space-x-1.5 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {isAdmin ? (
            <>
              <button
                id="tab-admin-dashboard"
                onClick={() => setActiveTab('PAINEL')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'PAINEL'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <PieChart className={`w-3.5 h-3.5 ${activeTab === 'PAINEL' ? 'text-blue-400' : 'text-slate-400'}`} />
                Painel Executivo
              </button>

              <button
                id="tab-admin-agenda"
                onClick={() => setActiveTab('AGENDA')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'AGENDA'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${activeTab === 'AGENDA' ? 'text-blue-400' : 'text-slate-400'}`} />
                Agenda & Vagas
              </button>

              <button
                id="tab-admin-appointments"
                onClick={() => setActiveTab('AGENDAMENTOS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'AGENDAMENTOS'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CheckSquare className={`w-3.5 h-3.5 ${activeTab === 'AGENDAMENTOS' ? 'text-blue-400' : 'text-slate-400'}`} />
                Agendamentos
                {pendingCancelsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                    {pendingCancelsCount}
                  </span>
                )}
              </button>

              <button
                id="tab-admin-patients"
                onClick={() => setActiveTab('PACIENTES')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'PACIENTES'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <UserCheck className={`w-3.5 h-3.5 ${activeTab === 'PACIENTES' ? 'text-blue-400' : 'text-slate-400'}`} />
                Pacientes
              </button>

              <button
                id="tab-admin-operators"
                onClick={() => setActiveTab('OPERADORES')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'OPERADORES'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className={`w-3.5 h-3.5 ${activeTab === 'OPERADORES' ? 'text-blue-400' : 'text-slate-400'}`} />
                Operadores
                {pendingOperatorsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                    {pendingOperatorsCount}
                  </span>
                )}
              </button>

              <button
                id="tab-admin-postos"
                onClick={() => setActiveTab('POSTOS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'POSTOS'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${activeTab === 'POSTOS' ? 'text-blue-400' : 'text-slate-400'}`} />
                IDs & Origens
              </button>

              <button
                id="tab-admin-reports"
                onClick={() => setActiveTab('RELATORIO')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'RELATORIO'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${activeTab === 'RELATORIO' ? 'text-blue-400' : 'text-slate-400'}`} />
                Google Planilhas
              </button>

              <button
                id="tab-admin-tools"
                onClick={() => setActiveTab('FERRAMENTAS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'FERRAMENTAS'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Wrench className={`w-3.5 h-3.5 ${activeTab === 'FERRAMENTAS' ? 'text-blue-400' : 'text-slate-400'}`} />
                Ferramentas
              </button>

              <button
                id="tab-admin-manager"
                onClick={() => setActiveTab('GERENCIADOR')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'GERENCIADOR'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sliders className={`w-3.5 h-3.5 ${activeTab === 'GERENCIADOR' ? 'text-blue-400' : 'text-slate-400'}`} />
                Gerenciador
              </button>
            </>
          ) : (
            <>
              <button
                id="tab-operator-booking"
                onClick={() => setActiveTab('AGENDAMENTOS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'AGENDAMENTOS'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${activeTab === 'AGENDAMENTOS' ? 'text-blue-400' : 'text-slate-400'}`} />
                Tela de Agendamento
              </button>

              <button
                id="tab-operator-home"
                onClick={() => setActiveTab('ENTRADA')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'ENTRADA'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${activeTab === 'ENTRADA' ? 'text-blue-400' : 'text-slate-400'}`} />
                Meu Posto ({currentUser.postoId})
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
