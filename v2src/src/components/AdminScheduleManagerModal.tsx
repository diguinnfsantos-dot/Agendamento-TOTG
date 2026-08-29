import React, { useState, useMemo } from 'react';
import { Slot, Appointment, SystemRule } from '../types';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Ban, 
  UserX, 
  UserCheck, 
  AlertTriangle, 
  Printer, 
  Download, 
  MessageSquare, 
  ArrowLeft, 
  Check, 
  Layers, 
  Stethoscope, 
  Building2, 
  Info,
  CheckCircle2,
  X,
  FileSpreadsheet,
  RefreshCw,
  Phone
} from 'lucide-react';
import { formatDateBR, getDayOfWeekName, cleanPhoneForWhatsApp } from '../utils/formatters';
import { db } from '../storage/db';

interface AdminScheduleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: Slot[];
  appointments: Appointment[];
  rules: SystemRule;
  onRefreshData: () => void;
}

type ManagementTab = 'BATCH_BLOCK' | 'REPLACE_DOCTOR' | 'AFFECTED_REPORT';

export const AdminScheduleManagerModal: React.FC<AdminScheduleManagerModalProps> = ({
  isOpen,
  onClose,
  slots,
  appointments,
  rules,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<ManagementTab>('BATCH_BLOCK');

  // Filters for Batch Operation
  const [scopeType, setScopeType] = useState<'MONTH' | 'WEEK' | 'DAY' | 'TURNO' | 'MEDICO' | 'SALA' | 'SPECIALTY'>('DAY');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedTurno, setSelectedTurno] = useState<'MANHA' | 'TARDE' | 'NOITE'>('MANHA');
  const [selectedMedico, setSelectedMedico] = useState('');
  const [selectedSala, setSelectedSala] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [blockReason, setBlockReason] = useState('Ponto facultativo / Intercorrência na unidade');

  // Doctor Replacement State
  const [oldDoctorSelect, setOldDoctorSelect] = useState('');
  const [newDoctorInput, setNewDoctorInput] = useState('');
  const [replacementScope, setReplacementScope] = useState<'ALL' | 'MONTH' | 'DAY'>('ALL');

  // Flow / Alert State
  const [showConflictPrompt, setShowConflictPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<'BLOCK' | 'DELETE' | null>(null);
  const [affectedList, setAffectedList] = useState<{
    slots: Slot[];
    appointments: Appointment[];
  }>({ slots: [], appointments: [] });

  const [notificationStatus, setNotificationStatus] = useState<{ [appId: string]: boolean }>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Doctors and Rooms list
  const doctorList = useMemo(() => db.getDoctors(), [isOpen]);
  const roomList = useMemo(() => db.getRooms(), [isOpen]);
  const specList = useMemo(() => db.getSpecialties(), [isOpen]);

  // Compute Affected Slots based on current filter
  const matchedSlots = useMemo(() => {
    return slots.filter((slot) => {
      // Filter by Scope
      if (scopeType === 'MONTH') {
        if (!slot.data.startsWith(selectedMonth)) return false;
        if (selectedMedico && slot.medico !== selectedMedico) return false;
      } else if (scopeType === 'DAY') {
        if (slot.data !== selectedDay) return false;
        if (selectedMedico && slot.medico !== selectedMedico) return false;
        if (selectedSala && slot.sala !== selectedSala) return false;
      } else if (scopeType === 'TURNO') {
        if (selectedDay && slot.data !== selectedDay) return false;
        const hour = parseInt(slot.horario.split(':')[0], 10);
        if (selectedTurno === 'MANHA' && (hour < 6 || hour >= 12)) return false;
        if (selectedTurno === 'TARDE' && (hour < 12 || hour >= 18)) return false;
        if (selectedTurno === 'NOITE' && (hour < 18 || hour >= 23)) return false;
      } else if (scopeType === 'WEEK') {
        if (!selectedDay) return false;
        const base = new Date(selectedDay);
        const target = new Date(slot.data);
        const diffDays = (target.getTime() - base.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
        if (selectedMedico && slot.medico !== selectedMedico) return false;
      } else if (scopeType === 'MEDICO') {
        if (!selectedMedico || slot.medico !== selectedMedico) return false;
        if (selectedMonth && !slot.data.startsWith(selectedMonth)) return false;
      } else if (scopeType === 'SALA') {
        if (!selectedSala || slot.sala !== selectedSala) return false;
        if (selectedDay && slot.data !== selectedDay) return false;
      } else if (scopeType === 'SPECIALTY') {
        if (!selectedSpec || slot.especialidade !== selectedSpec) return false;
        if (selectedMonth && !slot.data.startsWith(selectedMonth)) return false;
      }

      return true;
    });
  }, [slots, scopeType, selectedMonth, selectedDay, selectedTurno, selectedMedico, selectedSala, selectedSpec]);

  // Matched Appointments
  const matchedAppointments = useMemo(() => {
    const slotIds = new Set(matchedSlots.map((s) => s.id));
    return appointments.filter(
      (app) => slotIds.has(app.slotId) && app.status !== 'CANCELLED'
    );
  }, [matchedSlots, appointments]);

  if (!isOpen) return null;

  // Trigger batch action
  const handleInitiateBatchAction = (action: 'BLOCK' | 'DELETE') => {
    if (matchedSlots.length === 0) {
      alert('Nenhuma vaga encontrada com os filtros selecionados.');
      return;
    }

    if (matchedAppointments.length > 0) {
      // There are booked patients! Show conflict prompt
      setPendingAction(action);
      setAffectedList({
        slots: matchedSlots,
        appointments: matchedAppointments,
      });
      setShowConflictPrompt(true);
    } else {
      // No booked patients - direct apply
      executeBatchOperation(action, false);
    }
  };

  const executeBatchOperation = async (action: 'BLOCK' | 'DELETE', cancelledWithReport: boolean) => {
    const targetSlotIds = new Set(matchedSlots.map((s) => s.id));
    const currentSlots = db.getSlots();
    const currentApps = db.getAppointments();

    let updatedSlots: Slot[];
    if (action === 'DELETE') {
      // Remove free slots, mark booked as cancelled or delete
      updatedSlots = currentSlots.filter((s) => !targetSlotIds.has(s.id));
    } else {
      // Mark as BLOQUEADO
      updatedSlots = currentSlots.map((s) => {
        if (targetSlotIds.has(s.id)) {
          return { ...s, status: 'BLOQUEADO' };
        }
        return s;
      });
    }

    // Cancel affected appointments
    const updatedApps = currentApps.map((a) => {
      if (targetSlotIds.has(a.slotId)) {
        return {
          ...a,
          status: 'CANCELLED' as const,
          motivoCancelamento: `Cancelamento de agenda administrativa: ${blockReason}`,
          atualizadoEm: new Date().toISOString(),
        };
      }
      return a;
    });

    // V2: mutations must reach the central database; localStorage is cache only.
    if (action === 'BLOCK') {
      await Promise.all(matchedSlots.map(slot => fetch(`/api/v2/slots/batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BLOCK', slots: [slot] }),
      })));
    }
    for (const a of updatedApps.filter(a => targetSlotIds.has(a.slotId))) {
      await db.cancelAppointmentApiV2(a.id, a.motivoCancelamento || blockReason);
    }
    if (action === 'DELETE') {
      for (const slot of matchedSlots.filter(s => !matchedAppointments.some(a => a.slotId === s.id))) {
        await db.deleteSlotApi(slot.id);
      }
    }

    // Audit Log
    db.addLog(
      'Rodrigo Santos',
      'admin@klinica.com',
      action === 'DELETE' ? 'EXCLUSAO_AGENDA_LOTE' : 'BLOQUEIO_AGENDA_LOTE',
      `${action === 'DELETE' ? 'Exclusão' : 'Bloqueio'} em lote de ${matchedSlots.length} vagas (${matchedAppointments.length} agendamentos cancelados). Motivo: ${blockReason}`,
      'ALERTA'
    );

    onRefreshData();

    if (cancelledWithReport) {
      setActiveTab('AFFECTED_REPORT');
      setShowConflictPrompt(false);
      setFeedbackMessage(
        `Operação executada! ${matchedSlots.length} vagas foram ${action === 'DELETE' ? 'excluídas' : 'bloqueadas'}. Utilize os recursos abaixo para avisar os ${matchedAppointments.length} pacientes afetados.`
      );
    } else {
      setShowConflictPrompt(false);
      setFeedbackMessage(
        `Sucesso! ${matchedSlots.length} vagas foram ${action === 'DELETE' ? 'excluídas' : 'bloqueadas'}.`
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Replace Doctor
  const handleExecuteReplaceDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldDoctorSelect || !newDoctorInput.trim()) {
      alert('Selecione o médico atual e informe o nome do novo médico substituto.');
      return;
    }

    let filterM: string | undefined = undefined;
    let filterD: string | undefined = undefined;

    if (replacementScope === 'MONTH') filterM = selectedMonth;
    if (replacementScope === 'DAY') filterD = selectedDay;

    const res = db.replaceDoctorAcrossSchedules(
      oldDoctorSelect,
      newDoctorInput.trim(),
      filterM,
      filterD
    );

    onRefreshData();
    setFeedbackMessage(
      `Substituição concluída! "${oldDoctorSelect}" foi substituído por "${newDoctorInput.trim()}" em ${res.slotsChanged} vagas e ${res.appsChanged} agendamentos.`
    );
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Export Affected Patients CSV
  const handleExportCSV = () => {
    const appsToExport = affectedList.appointments.length > 0 ? affectedList.appointments : matchedAppointments;
    if (appsToExport.length === 0) return;

    const headers = ['Data', 'Horario', 'Especialidade', 'Medico', 'Paciente', 'CPF', 'Telefone', 'Origem_Posto', 'Status_Aviso'];
    const rows = appsToExport.map((a) => [
      formatDateBR(a.data),
      a.horario,
      `"${a.especialidade}"`,
      `"${a.medico || ''}"`,
      `"${a.paciente.paciente}"`,
      `"${a.paciente.cpf}"`,
      `"${a.paciente.tel}"`,
      `"${a.origem}"`,
      `"${notificationStatus[a.id] ? 'Notificado' : 'Pendente'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pacientes_afetados_bloqueio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrintReport = () => {
    window.print();
  };

  // Generate WhatsApp Message for Affected Patient
  const handleSendWhatsApp = (app: Appointment) => {
    const cleanPhone = cleanPhoneForWhatsApp(app.paciente.tel);
    const msg = `Olá, *${app.paciente.paciente}*!\nInformamos que devido a uma alteração emergencial na escala médica (${blockReason}), a sua consulta de *${app.especialidade}* agendada para o dia *${formatDateBR(app.data)}* às *${app.horario}* no *${rules.nomeClinica}* precisará ser reagendada.\n\nPor favor, entre em contato com a nossa equipe pelo telefone ${rules.telefoneClinica} ou dirija-se ao posto de atendimento (${app.origem}) para escolher um novo horário preferencial.\n\nPedimos sinceras desculpas pelo transtorno.`;
    
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setNotificationStatus((prev) => ({ ...prev, [app.id]: true }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Gerenciamento de Grade Médica & Bloqueios em Lote
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-mono">
                  Controle Avançado
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Bloqueie horários por intercorrência, pause períodos, exclua agendas ou substitua profissionais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 pb-2 border-b border-slate-100 shrink-0 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('BATCH_BLOCK');
              setShowConflictPrompt(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'BATCH_BLOCK'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Bloquear / Pausar / Excluir em Lote</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('REPLACE_DOCTOR');
              setShowConflictPrompt(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'REPLACE_DOCTOR'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Substituir Profissional na Grade</span>
          </button>

          {affectedList.appointments.length > 0 && (
            <button
              onClick={() => setActiveTab('AFFECTED_REPORT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'AFFECTED_REPORT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Planilha & Avisos de Pacientes ({affectedList.appointments.length})</span>
            </button>
          )}
        </div>

        {/* Feedback Message */}
        {feedbackMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 shrink-0 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* PROMPT DE CONFLITO: PACIENTES AGENDADOS */}
        {showConflictPrompt ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-base font-black text-rose-900">
                    Atenção: Existem pacientes agendados neste período/médico!
                  </h4>
                  <p className="text-xs text-rose-800 leading-relaxed font-medium">
                    Foi detectado que <strong>{matchedAppointments.length} consulta(s)</strong> já foram reservadas por operadores para pacientes reais no intervalo selecionado (Total de {matchedSlots.length} vagas afetadas).
                  </p>
                  <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-xs text-slate-800 font-semibold space-y-1">
                    <p className="text-rose-700 font-bold">
                      "Existem pacientes agendados, quer gerar um relatório impresso para que eles sejam avisados?"
                    </p>
                    <p className="text-[11px] text-slate-600 font-normal">
                      Ao escolher <strong>Voltar</strong>, nenhuma alteração será realizada e a agenda permanecerá intacta. Ao <strong>Prosseguir</strong>, as vagas serão atualizadas, a lista para impressão/planilha será gerada e você poderá disparar mensagens de aviso pelo WhatsApp aos pacientes.
                    </p>
                  </div>

                  {/* Summary of affected appointments */}
                  <div className="mt-3 max-h-36 overflow-y-auto bg-white rounded-xl border border-rose-200 p-2 space-y-1">
                    {matchedAppointments.map((app) => (
                      <div key={app.id} className="text-[11px] flex items-center justify-between py-1 px-2 hover:bg-slate-50 rounded">
                        <span className="font-semibold text-slate-900">{app.paciente.paciente}</span>
                        <span className="text-slate-500 font-mono">{formatDateBR(app.data)} às {app.horario} • {app.especialidade}</span>
                        <span className="text-blue-700 font-medium">{app.origem}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <button
                      onClick={() => setShowConflictPrompt(false)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar (Manter Agenda Intacta)</span>
                    </button>

                    <button
                      onClick={() => executeBatchOperation(pendingAction || 'BLOCK', true)}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      <span>Gerar Relatório & Prosseguir com o Cancelamento</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'BATCH_BLOCK' ? (
          /* TAB 1: BLOQUEIO / PAUSA / EXCLUSÃO EM LOTE */
          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            {/* Step 1: Select Scope */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                1. Selecione o Tipo de Escopo para o Bloqueio / Exclusão:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'DAY', label: 'Dia Específico', desc: 'Falta de energia, ponto facultativo, feriado' },
                  { id: 'TURNO', label: 'Turno / Horário', desc: 'Manhã, Tarde ou Noite (dedetização)' },
                  { id: 'MEDICO', label: 'Profissional / Médico', desc: 'Médico não faz mais parte da equipe' },
                  { id: 'MONTH', label: 'Mês Inteiro', desc: 'Toda a grade do mês' },
                  { id: 'WEEK', label: 'Semana / 7 Dias', desc: 'Intervalo de 7 dias a partir da data' },
                  { id: 'SALA', label: 'Sala / Consultório', desc: 'Reforma ou manutenção de sala' },
                  { id: 'SPECIALTY', label: 'Especialidade', desc: 'Bloqueio de especialidade específica' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScopeType(s.id as any)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      scopeType === s.id
                        ? 'border-blue-600 bg-blue-50/80 text-blue-950 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{s.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Scope Parameters Form */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(scopeType === 'DAY' || scopeType === 'TURNO' || scopeType === 'WEEK' || scopeType === 'SALA') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Data Específica / Início</label>
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                  />
                  {selectedDay && (
                    <span className="text-[10px] text-blue-700 font-semibold mt-0.5 block">
                      {getDayOfWeekName(selectedDay)}
                    </span>
                  )}
                </div>
              )}

              {scopeType === 'TURNO' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Turno a Bloquear</label>
                  <select
                    value={selectedTurno}
                    onChange={(e) => setSelectedTurno(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="MANHA">Manhã (06:00 às 12:00) - Dedetização/Manutenção</option>
                    <option value="TARDE">Tarde (12:00 às 18:00)</option>
                    <option value="NOITE">Noite (18:00 às 22:00)</option>
                  </select>
                </div>
              )}

              {(scopeType === 'MONTH' || scopeType === 'MEDICO' || scopeType === 'SPECIALTY') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mês de Referência</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              {(scopeType === 'MEDICO' || scopeType === 'DAY' || scopeType === 'MONTH') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Médico / Especialista {scopeType !== 'MEDICO' && '(Opcional)'}
                  </label>
                  <select
                    value={selectedMedico}
                    onChange={(e) => setSelectedMedico(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">{scopeType === 'MEDICO' ? 'Selecione o médico...' : 'Todos os médicos'}</option>
                    {doctorList.map((doc) => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
              )}

              {(scopeType === 'SALA' || scopeType === 'DAY') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sala / Consultório {scopeType !== 'SALA' && '(Opcional)'}
                  </label>
                  <select
                    value={selectedSala}
                    onChange={(e) => setSelectedSala(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">{scopeType === 'SALA' ? 'Selecione a sala...' : 'Todas as salas'}</option>
                    {roomList.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {scopeType === 'SPECIALTY' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Especialidade Médica</label>
                  <select
                    value={selectedSpec}
                    onChange={(e) => setSelectedSpec(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Selecione a especialidade...</option>
                    {specList.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Motivo / Justificativa do Bloqueio ou Cancelamento
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Intercorrência, Dedetização do consultório, Ponto facultativo, Médico desligado da equipe"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Impact Live Counter */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-blue-950">Resumo do Impacto nos Horários</h5>
                  <div className="flex items-center gap-3 text-xs text-slate-700 font-medium mt-0.5">
                    <span>Total de Vagas Afetadas: <strong className="text-blue-900 font-bold">{matchedSlots.length}</strong></span>
                    <span>•</span>
                    <span>Livres: <strong className="text-emerald-700">{matchedSlots.filter(s => s.status === 'DISPONIVEL').length}</strong></span>
                    <span>•</span>
                    <span>Com Paciente Agendado: <strong className={matchedAppointments.length > 0 ? 'text-rose-700 font-bold' : 'text-slate-600'}>{matchedAppointments.length}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInitiateBatchAction('BLOCK')}
                  disabled={matchedSlots.length === 0}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Bloquear / Pausar Vagas</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInitiateBatchAction('DELETE')}
                  disabled={matchedSlots.length === 0}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Agenda em Lote</span>
                </button>
              </div>
            </div>

            {/* Matched Slots Preview Table */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Prévia dos Horários Encontrados ({matchedSlots.length})
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Horário</th>
                      <th className="py-2 px-3">Especialidade / Médico</th>
                      <th className="py-2 px-3">Sala</th>
                      <th className="py-2 px-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {matchedSlots.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          Nenhum horário correspondente aos filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      matchedSlots.slice(0, 30).map((s) => {
                        const isBooked = s.status === 'AGENDADO';
                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-medium text-slate-900">{formatDateBR(s.data)}</td>
                            <td className="py-1.5 px-3 font-mono font-bold text-slate-800">{s.horario}</td>
                            <td className="py-1.5 px-3">
                              <span className="font-semibold text-blue-900">{s.especialidade}</span> • <span className="text-slate-500">{s.medico}</span>
                            </td>
                            <td className="py-1.5 px-3 text-slate-600">{s.sala}</td>
                            <td className="py-1.5 px-3">
                              {isBooked ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                  🔒 Paciente Agendado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Livre
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'REPLACE_DOCTOR' ? (
          /* TAB 2: SUBSTITUIR PROFISSIONAL */
          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-start gap-3">
              <UserCheck className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-purple-950">
                  Substituição Rápida de Profissional na Grade
                </h4>
                <p className="text-xs text-purple-900 mt-0.5 leading-relaxed">
                  Caso um médico deixe a equipe (ex: Dr. Fernando Dias) e outro profissional assuma o mesmo posto, sala e horários, substitua-o com um clique. O sistema preserva todas as consultas agendadas e atualiza o nome do médico em toda a grade!
                </p>
              </div>
            </div>

            <form onSubmit={handleExecuteReplaceDoctor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Médico Atual na Grade <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={oldDoctorSelect}
                    onChange={(e) => setOldDoctorSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  >
                    <option value="">Selecione o médico atual...</option>
                    {doctorList.map((doc) => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Novo Médico Substituto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dr. Carlos Mendonça"
                    value={newDoctorInput}
                    onChange={(e) => setNewDoctorInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Período da Substituição:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReplacementScope('ALL')}
                    className={`p-2.5 rounded-xl text-left border text-xs font-semibold cursor-pointer ${
                      replacementScope === 'ALL'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    Toda a Grade Futura
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplacementScope('MONTH')}
                    className={`p-2.5 rounded-xl text-left border text-xs font-semibold cursor-pointer ${
                      replacementScope === 'MONTH'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    Mês Específico
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplacementScope('DAY')}
                    className={`p-2.5 rounded-xl text-left border text-xs font-semibold cursor-pointer ${
                      replacementScope === 'DAY'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    Dia Específico
                  </button>
                </div>
              </div>

              {replacementScope === 'MONTH' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mês da Substituição</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full sm:w-64 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              )}

              {replacementScope === 'DAY' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data da Substituição</label>
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full sm:w-64 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Aplicar Substituição de Médico</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* TAB 3: PLANILHA E AVISOS DE PACIENTES AFETADOS */
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Relatório de Pacientes Afetados por Cancelamento / Intercorrência
                </h4>
                <p className="text-[11px] text-slate-500">
                  Total de {affectedList.appointments.length || matchedAppointments.length} pacientes necessitando de aviso e reagendamento
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha CSV</span>
                </button>

                <button
                  onClick={handlePrintReport}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Lista de Avisos / Salvar PDF</span>
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div id="printable-affected-report" className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Paciente & Documento</th>
                    <th className="py-2.5 px-3">Consulta Agendada</th>
                    <th className="py-2.5 px-3">Posto / Origem</th>
                    <th className="py-2.5 px-3">Contato WhatsApp</th>
                    <th className="py-2.5 px-3 text-right">Disparo Automático</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(affectedList.appointments.length > 0 ? affectedList.appointments : matchedAppointments).map((app) => {
                    const isNotified = notificationStatus[app.id];
                    return (
                      <tr key={app.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{app.paciente.paciente}</div>
                          <div className="text-[10px] text-slate-500 font-mono">CPF: {app.paciente.cpf}</div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-blue-900">{formatDateBR(app.data)} às {app.horario}</div>
                          <div className="text-[10px] text-slate-500">{app.especialidade} ({app.medico || 'Médico'})</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-800">{app.postoId}</span>
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{app.origem}</div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-mono font-medium text-slate-800">{app.paciente.tel}</div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleSendWhatsApp(app)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                              isNotified
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{isNotified ? 'Aviso Enviado ✓' : 'Enviar WhatsApp'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            Clínica: {rules.nomeClinica}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Fechar Gerenciador
          </button>
        </div>
      </div>
    </div>
  );
};
