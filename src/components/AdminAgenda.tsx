import React, { useState, useMemo, useEffect } from 'react';
import { Slot, Appointment, SystemRule } from '../types';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Sliders, 
  Trash2, 
  Check, 
  Filter, 
  Sparkles, 
  AlertCircle,
  Stethoscope,
  Info,
  CheckCircle2,
  Users,
  Layers,
  CalendarCheck,
  Ban,
  Building2,
  UserCheck,
  Edit3,
  CalendarDays,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Zap,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { formatDateBR, getDayOfWeekName } from '../utils/formatters';
import { db } from '../storage/db';
import { AdminScheduleManagerModal } from './AdminScheduleManagerModal';
import { StandardizeOptionsModal, StandardizeType } from './StandardizeOptionsModal';
import { AdminRoomManagerModal } from './AdminRoomManagerModal';

interface AdminAgendaProps {
  slots: Slot[];
  appointments: Appointment[];
  rules: SystemRule;
  onUpdateRules: (newRules: SystemRule) => void;
  onAddSlots: (newSlots: Slot[]) => void;
  onDeleteSlot: (slotId: string) => void;
  onNavigateTab?: (tab: any) => void;
  onSlotsUpdated?: (newSlots: Slot[]) => void;
  onAppointmentsUpdated?: (newApps: Appointment[]) => void;
}

export const AdminAgenda: React.FC<AdminAgendaProps> = ({
  slots,
  appointments,
  rules,
  onUpdateRules,
  onAddSlots,
  onDeleteSlot,
  onNavigateTab,
  onSlotsUpdated,
  onAppointmentsUpdated,
}) => {
  // Rules State
  const [maxVagasInput, setMaxVagasInput] = useState<number>(rules.maxVagasPorId);
  const [rulesSuccess, setRulesSuccess] = useState(false);

  // Modals State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showRoomManagerModal, setShowRoomManagerModal] = useState(false);
  const [standardizeModal, setStandardizeModal] = useState<{
    open: boolean;
    type: StandardizeType;
  }>({ open: false, type: 'SPECIALTY' });

  // Manageable Lists & Profiles
  const [specialtiesList, setSpecialtiesList] = useState<string[]>(() => db.getSpecialties());
  const [roomsList, setRoomsList] = useState<string[]>(() => db.getRooms());
  const [doctorsList, setDoctorsList] = useState<string[]>(() => db.getDoctors());
  const [doctorProfiles, setDoctorProfiles] = useState(() => db.getDoctorProfiles());

  // Form State - Add Slots with Automatic Binding
  const [medicoInput, setMedicoInput] = useState(() => doctorsList[0] || 'Laboratório / Sala de Coleta');
  const [specInput, setSpecInput] = useState(() => {
    const bound = db.getSpecialtyForDoctor(doctorsList[0] || 'Laboratório / Sala de Coleta');
    return bound || specialtiesList[0] || 'TOTG';
  });
  const [salaInput, setSalaInput] = useState(() => {
    const prof = db.getDoctorProfileByName(doctorsList[0] || 'Laboratório / Sala de Coleta');
    return prof?.salaPadrao || roomsList[0] || 'Sala de Coleta';
  });

  // Strict Automatic Doctor-Specialty Linkage Handler
  const handleSelectDoctor = (doctorName: string) => {
    setMedicoInput(doctorName);
    const profile = db.getDoctorProfileByName(doctorName);
    if (profile && profile.especialidade) {
      setSpecInput(profile.especialidade);
      if (profile.salaPadrao && roomsList.includes(profile.salaPadrao)) {
        setSalaInput(profile.salaPadrao);
      }
    }
  };

  const handleSelectSpecialty = (specialtyName: string) => {
    setSpecInput(specialtyName);
    // Check if current doctor matches this specialty, otherwise auto-select the first doctor that matches
    const currentProf = db.getDoctorProfileByName(medicoInput);
    if (!currentProf || currentProf.especialidade.toLowerCase() !== specialtyName.toLowerCase()) {
      const matchingDoctor = doctorProfiles.find(
        d => d.especialidade.toLowerCase() === specialtyName.toLowerCase()
      );
      if (matchingDoctor) {
        setMedicoInput(matchingDoctor.nome);
        if (matchingDoctor.salaPadrao && roomsList.includes(matchingDoctor.salaPadrao)) {
          setSalaInput(matchingDoctor.salaPadrao);
        }
      }
    }
  };

  // Single Date vs Multi-Day "Agenda Mês"
  const [isMonthAgendaMode, setIsMonthAgendaMode] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedMonthDays, setSelectedMonthDays] = useState<string[]>([]);

  const [dataInput, setDataInput] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // Batch Times Generator State
  const [horariosBatch, setHorariosBatch] = useState<string[]>([
    '08:00', '08:40', '09:20', '10:00', '10:40', '11:20', '13:30', '14:10', '14:50', '15:30'
  ]);
  const [batchInitialTime, setBatchInitialTime] = useState('08:00');
  const [batchDurationMinutes, setBatchDurationMinutes] = useState<20 | 40>(40);
  const [customHora, setCustomHora] = useState('');

  // Conflict / Validation Alerts inside Modal
  const [validationAlerts, setValidationAlerts] = useState<string[]>([]);

  // Main Table Filters
  const [filterSpec, setFilterSpec] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DISPONIVEL' | 'AGENDADO' | 'BLOQUEADO'>('ALL');
  const [filterDate, setFilterDate] = useState('');

  const refreshLists = () => {
    const docs = db.getDoctors();
    const specs = db.getSpecialties();
    const rms = db.getRooms();
    const profiles = db.getDoctorProfiles();
    setSpecialtiesList(specs);
    setRoomsList(rms);
    setDoctorsList(docs);
    setDoctorProfiles(profiles);
  };

  useEffect(() => {
    refreshLists();
  }, [slots, appointments, showBatchModal, showManagerModal]);

  // Save Quota Rule
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (maxVagasInput < 1) return;

    onUpdateRules({
      ...rules,
      maxVagasPorId: Number(maxVagasInput),
    });
    setRulesSuccess(true);
    setTimeout(() => setRulesSuccess(false), 3000);
  };

  // Generate 10 sequential slots with 20 or 40 min spacing
  const handleCalculate10Slots = () => {
    if (!batchInitialTime || !/^\d{2}:\d{2}$/.test(batchInitialTime)) return;
    const [startH, startM] = batchInitialTime.split(':').map(Number);
    let totalMinutes = startH * 60 + startM;

    const generated: string[] = [];
    for (let i = 0; i < 10; i++) {
      const currentH = Math.floor(totalMinutes / 60) % 24;
      const currentM = totalMinutes % 60;
      const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
      generated.push(timeStr);
      totalMinutes += batchDurationMinutes;
    }

    setHorariosBatch(generated);
  };

  // Add custom single time
  const handleAddCustomTime = () => {
    if (customHora && /^\d{2}:\d{2}$/.test(customHora) && !horariosBatch.includes(customHora)) {
      setHorariosBatch(prev => [...prev, customHora].sort());
      setCustomHora('');
    }
  };

  // Remove single time from batch
  const handleRemoveTime = (timeToRemove: string) => {
    setHorariosBatch(prev => prev.filter(t => t !== timeToRemove));
  };

  // Toggle day selection in "Agenda Mês"
  const handleToggleMonthDay = (dateStr: string) => {
    setSelectedMonthDays(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr].sort();
      }
    });
  };

  // Select all specific weekdays (e.g., all Mondays) in the current month
  const handleSelectAllWeekday = (dayOfWeekIndex: number) => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const numDays = new Date(year, month, 0).getDate();
    const daysToAdd: string[] = [];

    for (let d = 1; d <= numDays; d++) {
      const dateObj = new Date(year, month - 1, d);
      if (dateObj.getDay() === dayOfWeekIndex) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        daysToAdd.push(dateStr);
      }
    }

    // Toggle: if all are already selected, unselect them; otherwise select all
    const allSelected = daysToAdd.every(d => selectedMonthDays.includes(d));
    if (allSelected) {
      setSelectedMonthDays(prev => prev.filter(d => !daysToAdd.includes(d)));
    } else {
      setSelectedMonthDays(prev => Array.from(new Set([...prev, ...daysToAdd])).sort());
    }
  };

  // Calendar rendering helper for Agenda Mês
  const calendarDaysMatrix = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Empty lead cells
    for (let i = 0; i < firstDay; i++) {
      days.push({ dateStr: '', dayNum: 0, isCurrentMonth: false });
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    return days;
  }, [calendarMonth]);

  // Create Batch Slots with Strict Duplicate / Conflict Validations & Guaranteed Doctor-Specialty Linkage
  const handleCreateBatchSlots = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationAlerts([]);

    const finalMedico = medicoInput.trim();
    // Guarantee that specialty matches the doctor's official profile linkage (e.g. Dr. Floriano Peixoto -> Clínica Geral)
    const boundSpec = db.getSpecialtyForDoctor(finalMedico) || specInput.trim();
    const finalSpec = boundSpec;
    const finalSala = salaInput.trim();

    if (!finalSpec || !finalMedico || !finalSala || horariosBatch.length === 0) {
      setValidationAlerts(['Preencha todos os campos obrigatórios e informe ao menos 1 horário.']);
      return;
    }

    // Determine target dates
    const targetDates: string[] = isMonthAgendaMode
      ? selectedMonthDays
      : [dataInput];

    if (targetDates.length === 0) {
      setValidationAlerts(['Selecione ao menos um dia no calendário ou informe uma data válida.']);
      return;
    }

    // Validation checks across all existing slots in DB
    const existingSlots = db.getSlots();
    const errors: string[] = [];
    const newSlotsToCreate: Slot[] = [];

    for (const date of targetDates) {
      for (const hora of horariosBatch) {
        // 1. Anti-Duplicidade de Médico:
        const doctorConflict = existingSlots.find(
          s => s.data === date && 
               s.horario === hora && 
               s.medico?.toLowerCase() === finalMedico.toLowerCase() &&
               s.status !== 'BLOQUEADO'
        );

        if (doctorConflict) {
          errors.push(
            `⚠️ Agenda duplicada: O médico "${finalMedico}" já possui atendimento cadastrado no dia ${formatDateBR(date)} às ${hora} (${doctorConflict.especialidade} na ${doctorConflict.sala || 'sala'}).`
          );
          continue;
        }

        // 2. Bloqueio de Ocupação de Sala / Consultório:
        const roomConflict = existingSlots.find(
          s => s.data === date && 
               s.horario === hora && 
               s.sala?.toLowerCase() === finalSala.toLowerCase() &&
               s.status !== 'BLOQUEADO'
        );

        if (roomConflict) {
          errors.push(
            `⚠️ Consultório ocupado neste horário: "${finalSala}" já está reservado no dia ${formatDateBR(date)} às ${hora} para ${roomConflict.especialidade} com ${roomConflict.medico || 'outro profissional'}.`
          );
          continue;
        }

        // Valid slot!
        newSlotsToCreate.push({
          id: `slot_${date}_${finalSpec.toLowerCase().slice(0, 3)}_${hora.replace(':', '')}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          data: date,
          horario: hora,
          especialidade: finalSpec,
          medico: finalMedico,
          sala: finalSala,
          status: 'DISPONIVEL',
          criadoPorAdmin: true,
        });
      }
    }

    if (errors.length > 0 && newSlotsToCreate.length === 0) {
      // Complete block
      setValidationAlerts(errors);
      return;
    }

    // Save successful slots
    onAddSlots(newSlotsToCreate);

    // If there were some partial errors, show them or close modal
    if (errors.length > 0) {
      setValidationAlerts([
        `Criadas ${newSlotsToCreate.length} vagas com sucesso! Porém, os seguintes horários foram impedidos devido a conflitos:`,
        ...errors,
      ]);
    } else {
      setShowBatchModal(false);
      setIsMonthAgendaMode(false);
      setSelectedMonthDays([]);
    }
  };

  // Unique specialties for filter
  const uniqueSpecs = Array.from(new Set(slots.map(s => s.especialidade))).sort();

  // Filter slots
  const filteredSlots = slots.filter(slot => {
    const matchesSpec = filterSpec === 'ALL' || slot.especialidade === filterSpec;
    const matchesStatus = filterStatus === 'ALL' || slot.status === filterStatus;
    const matchesDate = !filterDate || slot.data === filterDate;
    return matchesSpec && matchesStatus && matchesDate;
  }).sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return a.horario.localeCompare(b.horario);
  });

  const totalSlots = slots.length;
  const bookedSlots = slots.filter(s => s.status === 'AGENDADO').length;
  const freeSlots = slots.filter(s => s.status === 'DISPONIVEL').length;
  const blockedSlots = slots.filter(s => s.status === 'BLOQUEADO').length;

  return (
    <div className="space-y-5">
      {/* Bento Grid Top Section: Rule Box + Actions Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bento Card 1: Regra de Cotas (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Regulamentação de Cotas
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono">
                Trava Automática
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 mt-2">
              Regra Geral de Agendamento (Cota Limite por ID / Posto)
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Defina o número máximo de vagas que cada Posto (ID) tem direito a reservar. Caso os operadores de um mesmo ID atinjam esse limite, o sistema automaticamente bloqueia novas seleções para aquele ID.
            </p>
          </div>

          <form onSubmit={handleSaveRule} className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <label htmlFor="input-quota" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Limite por ID:
              </label>
              <input
                id="input-quota"
                type="number"
                min={1}
                max={50}
                required
                value={maxVagasInput}
                onChange={(e) => setMaxVagasInput(Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold text-blue-900 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
              <span className="text-xs text-slate-500 font-medium">vagas</span>
            </div>

            <button
              id="btn-save-quota-rule"
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-blue-400" />
              <span>Aplicar Regra</span>
            </button>
          </form>

          {rulesSuccess && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Regra atualizada com sucesso! Todos os operadores agora têm cota de <strong>{rules.maxVagasPorId} vagas por ID</strong>.</span>
            </div>
          )}
        </div>

        {/* Bento Card 2: Grade Médica Actions Block */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-600/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 font-mono">
                Grade Médica
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                {totalSlots} Vagas
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              Publicar & Gerenciar Grade
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Disponibilize horários em lote, substitua profissionais ou gerencie bloqueios por intercorrências.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2">
            {/* Primary Action: Add Slots */}
            <button
              id="btn-open-batch-modal"
              onClick={() => {
                refreshLists();
                setValidationAlerts([]);
                setShowBatchModal(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Disponibilizar Vagas & Horários</span>
            </button>

            {/* Requested Button: Gerenciar Grade Médica & Bloqueios */}
            <button
              id="btn-open-schedule-manager"
              onClick={() => setShowManagerModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-rose-400" />
              <span>Gerenciar Grade, Vagas & Bloqueios</span>
            </button>

            {/* Requested Button: Gerenciar Salas, Consultórios & Ocupação */}
            <button
              id="btn-open-room-manager"
              onClick={() => setShowRoomManagerModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Gerenciar Salas, Consultórios & Ocupação</span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Livres: <strong className="text-emerald-400">{freeSlots}</strong></span>
              <span>Ocupadas: <strong className="text-blue-400">{bookedSlots}</strong></span>
              <span>Bloqueadas: <strong className="text-rose-400">{blockedSlots}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: BATCH CREATOR & AGENDA MÊS */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col my-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Criar e Disponibilizar Vagas na Agenda
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gere horários com cálculo automático e selecione dias avulsos ou o mês completo
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBatchModal(false);
                  setValidationAlerts([]);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Validation Conflicts Alert */}
            {validationAlerts.length > 0 && (
              <div className="mt-3 p-3.5 bg-rose-50 border border-rose-300 text-rose-950 text-xs rounded-xl space-y-1.5 shrink-0 max-h-40 overflow-y-auto">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Atenção: Conflitos de Agendamento Detectados</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-900 font-medium">
                  {validationAlerts.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleCreateBatchSlots} className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Header inside form with direct link to Cadastros Clínicos */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  Alocação do Profissional & Consultório
                </span>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBatchModal(false);
                      onNavigateTab('CADASTROS');
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                    title="Acessar ambiente completo para cadastrar, alterar e vincular Médicos, Especialidades e Salas"
                  >
                    <Sliders className="w-3 h-3 text-blue-600" />
                    <span>Gerenciar Cadastros & Vínculos</span>
                  </button>
                )}
              </div>

              {/* Top Controls: Doctor, Specialty (auto-locked), Room */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                {/* 1. Nome do Médico / Especialista */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="agenda-medico">
                    Nome do Médico <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="agenda-medico"
                    value={medicoInput}
                    onChange={(e) => handleSelectDoctor(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  >
                    {doctorsList.map(d => {
                      const prof = doctorProfiles.find(p => p.nome.toLowerCase() === d.toLowerCase());
                      const specTag = prof?.especialidade ? ` (${prof.especialidade})` : '';
                      return (
                        <option key={d} value={d}>{d}{specTag}</option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Especialidade Médica (Auto-bound & Locked to Doctor) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700" htmlFor="agenda-spec">
                      Especialidade Médica <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded-md font-mono flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 text-blue-600" />
                      Vinculada
                    </span>
                  </div>
                  <select
                    id="agenda-spec"
                    value={specInput}
                    onChange={(e) => handleSelectSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-blue-50/50 border border-blue-300 rounded-xl text-xs font-bold text-blue-950 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  >
                    {specialtiesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Sala ou Consultório */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="agenda-sala">
                    Sala ou Consultório <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="agenda-sala"
                    value={salaInput}
                    onChange={(e) => setSalaInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  >
                    {roomsList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Rule Visual Feedback Badge */}
                <div className="col-span-1 sm:col-span-3 flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Vínculo Oficial Validado: <strong>{medicoInput}</strong> está vinculado à especialidade <strong>{specInput}</strong>.
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold hidden sm:inline-block">
                    100% Protegido
                  </span>
                </div>
              </div>

              {/* Date Mode Selector: Single Day vs "Agenda Mês" */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Modo de Seleção de Datas
                  </span>

                  {/* Agenda Mês Button */}
                  <button
                    type="button"
                    onClick={() => setIsMonthAgendaMode(!isMonthAgendaMode)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      isMonthAgendaMode
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span>{isMonthAgendaMode ? 'Agenda Mês (Ativo)' : 'Agenda Mês (Seleção Múltipla)'}</span>
                  </button>
                </div>

                {isMonthAgendaMode ? (
                  /* AGENDA MÊS INTERACTIVE CALENDAR */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700">Mês da Agenda:</label>
                        <input
                          type="month"
                          value={calendarMonth}
                          onChange={(e) => {
                            setCalendarMonth(e.target.value);
                            setSelectedMonthDays([]);
                          }}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        {selectedMonthDays.length} dia(s) selecionado(s)
                      </span>
                    </div>

                    {/* Quick Weekday Selectors */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="font-semibold text-slate-500 mr-1">Selecionar todos:</span>
                      {[
                        { dayIndex: 1, label: 'Segundas' },
                        { dayIndex: 2, label: 'Terças' },
                        { dayIndex: 3, label: 'Quartas' },
                        { dayIndex: 4, label: 'Quintas' },
                        { dayIndex: 5, label: 'Sextas' },
                        { dayIndex: 6, label: 'Sábados' },
                      ].map(wd => (
                        <button
                          key={wd.dayIndex}
                          type="button"
                          onClick={() => handleSelectAllWeekday(wd.dayIndex)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 rounded-md font-semibold cursor-pointer"
                        >
                          + {wd.label}
                        </button>
                      ))}
                    </div>

                    {/* Interactive Month Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="font-bold text-slate-400 py-1 text-[11px] uppercase">
                          {d}
                        </div>
                      ))}

                      {calendarDaysMatrix.map((item, idx) => {
                        if (!item.isCurrentMonth) {
                          return <div key={idx} className="p-2 text-transparent" />;
                        }

                        const isSelected = selectedMonthDays.includes(item.dateStr);

                        return (
                          <button
                            key={item.dateStr}
                            type="button"
                            onClick={() => handleToggleMonthDay(item.dateStr)}
                            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-400'
                                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border border-slate-200/80'
                            }`}
                          >
                            {item.dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* SINGLE DATE SELECTOR */
                  <div className="sm:w-72">
                    <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="agenda-data">
                      Data do Atendimento <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="agenda-data"
                      type="date"
                      required
                      value={dataInput}
                      onChange={(e) => setDataInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                    {dataInput && (
                      <p className="text-[11px] text-blue-700 font-medium mt-1">
                        {getDayOfWeekName(dataInput)} • {formatDateBR(dataInput)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* HORÁRIOS EM LOTE & CÁLCULO AUTOMÁTICO */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Adicionar Horários em Lote (Cálculo Automático de 10 Vagas)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Informe o horário inicial e o intervalo (20 ou 40 min). O sistema calculará 10 vagas consecutivas.
                    </p>
                  </div>
                </div>

                {/* Generator controls */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                    <label className="text-xs font-semibold text-slate-700">Início:</label>
                    <input
                      type="time"
                      value={batchInitialTime}
                      onChange={(e) => setBatchInitialTime(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-blue-900"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-600 px-2">Duração:</span>
                    <button
                      type="button"
                      onClick={() => setBatchDurationMinutes(20)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        batchDurationMinutes === 20
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      20 minutos
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchDurationMinutes(40)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        batchDurationMinutes === 40
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      40 minutos
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCalculate10Slots}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Calcular & Gerar 10 Vagas</span>
                  </button>
                </div>

                {/* Selected batch slots tags */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Horários Prontos para Publicação ({horariosBatch.length} vagas por dia):</span>
                    {horariosBatch.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHorariosBatch([])}
                        className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                      >
                        Limpar Horários
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-3 bg-white rounded-xl border border-slate-200 min-h-[50px] items-center">
                    {horariosBatch.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Nenhum horário na lista. Clique em "Calcular & Gerar 10 Vagas" ou adicione abaixo.</span>
                    ) : (
                      horariosBatch.map(h => (
                        <span 
                          key={h}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                        >
                          <Clock className="w-3 h-3 text-blue-600" />
                          {h}
                          <button
                            type="button"
                            onClick={() => handleRemoveTime(h)}
                            className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                            title="Remover horário"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Add single custom time */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="time"
                      value={customHora}
                      onChange={(e) => setCustomHora(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTime}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      + Adicionar Horário Avulso
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  Total a ser gerado: <strong className="text-blue-900 font-bold">{horariosBatch.length * (isMonthAgendaMode ? selectedMonthDays.length : 1)} vagas</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBatchModal(false);
                      setValidationAlerts([]);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-confirm-create-slots"
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Publicar Vagas na Agenda</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCHEDULE MANAGER & BATCH BLOCKS (SUBSTITUIR MÉDICO / BLOQUEIO POR INTERCORRÊNCIA) */}
      <AdminScheduleManagerModal
        isOpen={showManagerModal}
        onClose={() => setShowManagerModal(false)}
        slots={slots}
        appointments={appointments}
        rules={rules}
        onRefreshData={() => {
          onUpdateRules({ ...rules });
        }}
      />

      {/* MODAL 3: STANDARDIZE / EDIT LISTS (ESPECIALIDADES, SALAS, MÉDICOS) */}
      <StandardizeOptionsModal
        isOpen={standardizeModal.open}
        type={standardizeModal.type}
        onClose={() => setStandardizeModal({ open: false, type: 'SPECIALTY' })}
        onDataUpdated={() => {
          refreshLists();
          onUpdateRules({ ...rules });
        }}
        onSelectOption={(val) => {
          if (standardizeModal.type === 'SPECIALTY') setSpecInput(val);
          else if (standardizeModal.type === 'ROOM') setSalaInput(val);
          else setMedicoInput(val);
        }}
      />

      {/* MODAL 4: ROOM & CONSULTATION OFFICE MANAGER (GESTÃO DE SALAS VAZIAS, OCUPAÇÃO & RELATÓRIOS) */}
      <AdminRoomManagerModal
        isOpen={showRoomManagerModal}
        onClose={() => setShowRoomManagerModal(false)}
        slots={slots}
        appointments={appointments}
        onSlotsUpdated={(newSlots) => {
          if (onSlotsUpdated) onSlotsUpdated(newSlots);
          else onUpdateRules({ ...rules });
        }}
        onAppointmentsUpdated={(newApps) => {
          if (onAppointmentsUpdated) onAppointmentsUpdated(newApps);
        }}
        onOpenBatchAdd={(prefill) => {
          refreshLists();
          if (prefill?.sala) setSalaInput(prefill.sala);
          if (prefill?.data) setDataInput(prefill.data);
          if (prefill?.medico) handleSelectDoctor(prefill.medico);
          setShowBatchModal(true);
        }}
      />

      {/* MAIN SLOTS TABLE & FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filtrar por Especialidade</label>
            <select
              value={filterSpec}
              onChange={(e) => setFilterSpec(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 font-medium"
            >
              <option value="ALL">Todas as Especialidades ({slots.length})</option>
              {uniqueSpecs.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filtrar por Situação</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 font-medium"
            >
              <option value="ALL">Todos os Status ({slots.length})</option>
              <option value="DISPONIVEL">Apenas Vagas Livres / Disponíveis ({freeSlots})</option>
              <option value="AGENDADO">Apenas Vagas Já Agendadas ({bookedSlots})</option>
              <option value="BLOQUEADO">Apenas Vagas Bloqueadas ({blockedSlots})</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filtrar por Data Específica</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 font-medium"
            />
          </div>
        </div>

        {/* Grade de Vagas */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Data & Dia</th>
                <th className="py-3 px-4">Horário</th>
                <th className="py-3 px-4">Especialidade / Médico</th>
                <th className="py-3 px-4">Local / Sala</th>
                <th className="py-3 px-4">Situação da Vaga</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhuma vaga encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSlots.map(slot => {
                  const isAgendado = slot.status === 'AGENDADO';
                  const isBloqueado = slot.status === 'BLOQUEADO';
                  const app = appointments.find(a => a.slotId === slot.id && a.status !== 'CANCELLED');

                  return (
                    <tr 
                      key={slot.id} 
                      className={`transition-colors ${
                        isBloqueado
                          ? 'bg-rose-50/40 opacity-75'
                          : isAgendado 
                          ? 'bg-slate-50/60 opacity-80' 
                          : 'hover:bg-blue-50/40'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{formatDateBR(slot.data)}</div>
                        <div className="text-[10px] text-slate-500">{getDayOfWeekName(slot.data)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <Clock className="w-3 h-3 text-blue-600" />
                          {slot.horario}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-blue-900">{slot.especialidade}</div>
                        <div className="text-[11px] text-slate-500">{slot.medico || 'Médico Especialista'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {slot.sala || 'Consultório'}
                      </td>
                      <td className="py-3 px-4">
                        {isBloqueado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <Lock className="w-3 h-3 text-rose-600" />
                            Bloqueada / Pausada
                          </span>
                        ) : isAgendado ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              🔒 Agendada {app ? `(${app.postoId})` : ''}
                            </span>
                            {app && (
                              <div className="text-[10px] text-slate-500 mt-0.5 font-medium truncate max-w-[160px]">
                                Paciente: {app.paciente.paciente}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Disponível para Postos
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isAgendado ? (
                          <button
                            onClick={() => onDeleteSlot(slot.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir horário não utilizado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Reservada</span>
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
  );
};
