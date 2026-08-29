import React, { useState, useMemo } from 'react';
import { User, Slot, Appointment, SystemRule, PatientData, RegisteredPatient } from '../types';
import { db } from '../storage/db';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Send, 
  MessageSquarePlus,
  Printer, 
  Ban, 
  Building, 
  User as UserIcon, 
  Phone, 
  MapPin, 
  CreditCard, 
  Check, 
  X, 
  AlertTriangle,
  Lock,
  Search,
  HelpCircle,
  Info,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Zap,
  Flame,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { formatCPF, formatCEP, formatPhone, formatSUS, formatDateBR, getDayOfWeekName } from '../utils/formatters';
import { 
  getSlotBookingEligibility, 
  getSlotExpirationStatus, 
  getSpecialtyRule, 
  getPostoQuotaSummaries,
  calculateDaysToSlot 
} from '../utils/quotaEngine';
import confetti from 'canvas-confetti';

interface OperatorBookingProps {
  currentUser: User;
  slots: Slot[];
  appointments: Appointment[];
  rules: SystemRule;
  onSaveAppointment: (appointment: Appointment) => Promise<{ success: boolean; error?: string }>;
  onRequestCancel: (appointmentId: string, motivo: string) => void;
  onOpenWhatsApp: (app: Appointment, isCustomPhoneMode?: boolean) => void;
  onOpenReceipt: (app: Appointment) => void;
}

export const OperatorBooking: React.FC<OperatorBookingProps> = ({
  currentUser,
  slots,
  appointments,
  rules,
  onSaveAppointment,
  onRequestCancel,
  onOpenWhatsApp,
  onOpenReceipt,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'DISPONIVEIS' | 'MEUS_AGENDAMENTOS'>('DISPONIVEIS');

  // Selected slot for booking
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Form patient fields (All 8 mandatory)
  const [paciente, setPaciente] = useState('');
  const [cpf, setCpf] = useState('');
  const [sus, setSus] = useState('');
  const [nascido, setNascido] = useState('');
  const [mae, setMae] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cep, setCep] = useState('');
  const [tel, setTel] = useState('');
  const [formError, setFormError] = useState('');

  // Patient Registry Validation & Isolation State
  const [patientValidation, setPatientValidation] = useState<{
    status: 'IDLE' | 'VALID' | 'BLOCKED_OTHER_POSTO';
    message: string;
    patient?: RegisteredPatient;
  }>({ status: 'IDLE', message: '' });

  // Cancel Request Modal
  const [cancelModalApp, setCancelModalApp] = useState<Appointment | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Filters
  const [filterSpec, setFilterSpec] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [searchMyApps, setSearchMyApps] = useState('');

  // Specialty list and Quota summary per Specialty
  const myPostoId = currentUser.postoId || 'P203';
  const repescagemDays = rules.diasParaRepescagemVencimento ?? 5;

  // Unique specialties known in system
  const uniqueSpecs = useMemo(() => {
    const set = new Set<string>();
    slots.forEach(s => set.add(s.especialidade));
    if (rules.cotasPorEspecialidade) {
      Object.keys(rules.cotasPorEspecialidade).forEach(k => set.add(k));
    }
    return Array.from(set).filter(Boolean).sort();
  }, [slots, rules]);

  // Quota summaries for my Posto across all specialties
  const postoQuotaSummaries = useMemo(() => {
    return getPostoQuotaSummaries(myPostoId, uniqueSpecs, appointments, rules);
  }, [myPostoId, uniqueSpecs, appointments, rules]);

  // Total slots booked by my Posto across all specialties
  const totalBookedByPosto = appointments.filter(a => a.postoId === myPostoId && a.status !== 'CANCELLED').length;

  // Meus Agendamentos (apenas do operador logado)
  const myAppointments = appointments.filter(a => a.operadorId === currentUser.id);

  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  // Registered patients belonging exclusively to this Operator's Posto
  const myPostoRegisteredPatients = useMemo(() => {
    const all = db.getPatients();
    return all.filter(p => p.postoId === myPostoId);
  }, [myPostoId, showBookingModal]);

  // Handle CPF input with real-time uniqueness & Posto isolation validation
  const handleCpfInputChange = (rawCpf: string) => {
    const formatted = formatCPF(rawCpf);
    setCpf(formatted);
    const clean = formatted.replace(/\D/g, '');

    if (clean.length === 11) {
      const val = db.validatePatientRegistration(clean, myPostoId);
      if (!val.allowed && val.patient) {
        setPatientValidation({
          status: 'BLOCKED_OTHER_POSTO',
          message: `⛔ Paciente já cadastrado pelo ID ${val.patient.postoId} (${val.patient.postoNome}). Por motivos de privacidade e regra de vínculo por Posto, este paciente só pode ser agendado por operadores do Posto ${val.patient.postoId}. Caso necessite, solicite a transferência de vínculo ao Administrador Master.`,
          patient: val.patient,
        });
      } else if (val.allowed && val.patient) {
        setPatientValidation({
          status: 'VALID',
          message: `✓ Paciente identificado na base do seu Posto (${myPostoId}). Dados cadastrais carregados automaticamente.`,
          patient: val.patient,
        });
        // Auto-fill existing patient's fields
        setPaciente(val.patient.paciente);
        if (val.patient.sus) setSus(val.patient.sus);
        if (val.patient.nascido) setNascido(val.patient.nascido);
        if (val.patient.mae) setMae(val.patient.mae);
        if (val.patient.endereco) setEndereco(val.patient.endereco);
        if (val.patient.cep) setCep(val.patient.cep);
        if (val.patient.tel) setTel(val.patient.tel);
      } else {
        setPatientValidation({
          status: 'IDLE',
          message: `✓ Novo paciente será registrado e vinculado ao seu Posto (${myPostoId}).`,
        });
      }
    } else {
      setPatientValidation({ status: 'IDLE', message: '' });
    }
  };

  // Quick Select an already registered patient from this Posto
  const handleSelectExistingPatient = (patientId: string) => {
    if (!patientId) return;
    const pat = myPostoRegisteredPatients.find(p => p.id === patientId || p.cpf === patientId);
    if (pat) {
      setPaciente(pat.paciente);
      setCpf(pat.cpf);
      setSus(pat.sus || '');
      setNascido(pat.nascido || '');
      setMae(pat.mae || '');
      setEndereco(pat.endereco || '');
      setCep(pat.cep || '');
      setTel(pat.tel || '');
      setPatientValidation({
        status: 'VALID',
        message: `✓ Dados de ${pat.paciente} carregados com sucesso!`,
        patient: pat,
      });
    }
  };

  // Check if all 8 mandatory patient fields are valid
  const isFormValid = 
    paciente.trim().length >= 3 &&
    cpf.replace(/\D/g, '').length === 11 &&
    sus.replace(/\D/g, '').length >= 10 &&
    nascido.trim().length >= 8 &&
    mae.trim().length >= 3 &&
    endereco.trim().length >= 5 &&
    cep.replace(/\D/g, '').length === 8 &&
    tel.replace(/\D/g, '').length >= 10 &&
    patientValidation.status !== 'BLOCKED_OTHER_POSTO';

  const handleOpenBooking = (slot: Slot) => {
    const eligibility = getSlotBookingEligibility(slot, myPostoId, appointments, rules);
    if (!eligibility.allowed) {
      alert(`⛔ ${eligibility.message}`);
      return;
    }
    if (slot.status !== 'DISPONIVEL') {
      alert('Esta vaga já foi agendada por outro operador.');
      return;
    }
    setSelectedSlotId(slot.id);
    setFormError('');
    setPatientValidation({ status: 'IDLE', message: '' });
    setShowBookingModal(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedSlot) {
      setFormError('Selecione uma vaga válida.');
      return;
    }

    if (patientValidation.status === 'BLOCKED_OTHER_POSTO') {
      setFormError('Agendamento bloqueado: Paciente vinculado a outro Posto. Apenas o Administrador Master pode autorizar transferências.');
      return;
    }

    if (!isFormValid) {
      setFormError('Preencha todos os dados obrigatórios do paciente (*).');
      return;
    }

    // Double check CPF uniqueness and cross-posto isolation
    const cleanCpf = cpf.replace(/\D/g, '');
    const val = db.validatePatientRegistration(cleanCpf, myPostoId);
    if (!val.allowed) {
      setFormError(val.message || 'Este paciente está vinculado a outro Posto.');
      return;
    }

    // Regra anti-duplicidade em tempo de salvamento
    const freshSlot = slots.find(s => s.id === selectedSlot.id);
    if (!freshSlot || freshSlot.status !== 'DISPONIVEL') {
      setFormError('Esta vaga acabou de ser reservada por outro usuário. Por favor, escolha outro horário.');
      return;
    }

    // Persist or sync patient in central registry with current posto binding
    db.saveOrUpdatePatient({
      cpf: cpf.trim(),
      paciente: paciente.trim(),
      sus: sus.trim(),
      nascido: nascido.trim(),
      mae: mae.trim(),
      endereco: endereco.trim(),
      cep: cep.trim(),
      tel: tel.trim(),
      postoId: myPostoId,
      postoNome: currentUser.origem || `Posto ${myPostoId}`,
      operadorId: currentUser.id,
      operadorNome: currentUser.nome,
    });

    const newAppointment: Appointment = {
      id: `app_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      slotId: selectedSlot.id,
      data: selectedSlot.data,
      horario: selectedSlot.horario,
      especialidade: selectedSlot.especialidade,
      medico: selectedSlot.medico,
      postoId: currentUser.postoId || 'P203',
      origem: currentUser.origem || 'Policlínica Regional do Barreto – Dr. João da Silva Vizella',
      operadorId: currentUser.id,
      operadorNome: currentUser.nome,
      operadorEmail: currentUser.email,
      operadorTelefone: currentUser.telefone || '',
      paciente: {
        paciente: paciente.trim(),
        cpf: cpf.trim(),
        sus: sus.trim(),
        nascido: nascido.trim(),
        mae: mae.trim(),
        endereco: endereco.trim(),
        cep: cep.trim(),
        tel: tel.trim(),
      },
      status: 'CONFIRMED',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    const reservation = await onSaveAppointment(newAppointment);
    if (!reservation.success) {
      setFormError(reservation.error || 'Não foi possível reservar esta vaga.');
      return;
    }

    // Efeito de sucesso
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    setShowBookingModal(false);
    // Limpa formulário
    setPaciente('');
    setCpf('');
    setSus('');
    setNascido('');
    setMae('');
    setEndereco('');
    setCep('');
    setTel('');
    setSelectedSlotId(null);
    setPatientValidation({ status: 'IDLE', message: '' });

    // Sugere abrir WhatsApp ou Comprovante
    setTimeout(() => {
      onOpenWhatsApp(newAppointment);
    }, 400);
  };

  const handleConfirmCancelRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalApp) return;
    if (!cancelMotivo.trim()) {
      setCancelError('Informe o motivo do cancelamento da consulta.');
      return;
    }

    onRequestCancel(cancelModalApp.id, cancelMotivo.trim());
    setCancelModalApp(null);
    setCancelMotivo('');
    setCancelError('');
  };

  // Filtrar vagas disponíveis
  const availableSlots = slots.filter(slot => {
    const matchesSpec = filterSpec === 'ALL' || slot.especialidade === filterSpec;
    const matchesDate = !filterDate || slot.data === filterDate;
    return matchesSpec && matchesDate;
  }).sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return a.horario.localeCompare(b.horario);
  });

  return (
    <div className="space-y-6">
      {/* COTA STATUS BANNER DINÂMICO POR ESPECIALIDADE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-sm sm:text-base text-slate-900">
                  Posto Vinculado: ID {currentUser.postoId} ({currentUser.origem})
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  Operador: {currentUser.nome}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Regra Geral: Limite de cotas aplicado <strong>individualmente por especialidade</strong>. O controle é compartilhado entre operadores do mesmo ID.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Total Agendado pelo Posto</p>
              <p className="text-xl font-black text-blue-600 mt-0.5 font-mono">
                {totalBookedByPosto} <span className="text-xs font-semibold text-slate-500">vagas ativas</span>
              </p>
            </div>
          </div>
        </div>

        {/* ALERTA DE REPESCAGEM AUTOMÁTICA (≤ 5 DIAS) */}
        <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-300 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold text-amber-900 flex items-center gap-1.5">
                ⚡ Repescagem Automática por Vencimento (≤ {repescagemDays} dias):
              </strong>
              <span className="text-amber-800 text-[11px] block sm:inline sm:ml-1">
                Vagas com data de atendimento próxima (em até <strong>5 dias</strong>) entram automaticamente em liberação livre para qualquer ID Posto!
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-white shrink-0 self-start sm:self-center uppercase font-mono tracking-wider">
            Regra Automática
          </span>
        </div>

        {/* BARRA DE COTAS POR ESPECIALIDADE (PILLS INTERATIVAS) */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              Cotas do seu Posto ({myPostoId}) por Especialidade:
            </span>
            <span className="text-[10px] text-slate-400">Clique na especialidade para filtrar horários</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {postoQuotaSummaries.map(summary => {
              const isSelectedInFilter = filterSpec === summary.especialidade;
              const isFull = summary.atingiuLimite;
              const isCotaLivre = summary.isCotaLivreAdmin;

              return (
                <button
                  key={summary.especialidade}
                  type="button"
                  onClick={() => setFilterSpec(isSelectedInFilter ? 'ALL' : summary.especialidade)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                    isSelectedInFilter
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-400/30'
                      : isCotaLivre
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                        : isFull
                          ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{summary.especialidade}</span>
                  {isCotaLivre ? (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelectedInFilter ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      Livre
                    </span>
                  ) : (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isSelectedInFilter 
                        ? 'bg-white/20 text-white' 
                        : isFull 
                          ? 'bg-rose-200 text-rose-900 font-bold' 
                          : 'bg-slate-200 text-slate-800'
                    }`}>
                      {summary.totalAgendamentos}/{summary.maxVagas}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SUB TABS: VAGAS DISPONÍVEIS vs MEUS AGENDAMENTOS */}
      <div className="flex gap-2">
        <button
          id="btn-subtab-vagas"
          onClick={() => setActiveSubTab('DISPONIVEIS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'DISPONIVEIS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-2xs'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-400" />
          Vagas & Horários Disponíveis
        </button>

        <button
          id="btn-subtab-meus-agendamentos"
          onClick={() => setActiveSubTab('MEUS_AGENDAMENTOS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'MEUS_AGENDAMENTOS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-2xs'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          Meus Agendamentos Realizados ({myAppointments.length})
        </button>
      </div>

      {/* ABA 1: VAGAS DISPONÍVEIS */}
      {activeSubTab === 'DISPONIVEIS' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono mb-1">Especialidade Médica</label>
                <select
                  value={filterSpec}
                  onChange={(e) => setFilterSpec(e.target.value)}
                  className="w-full sm:w-56 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  <option value="ALL">Todas as Especialidades</option>
                  {uniqueSpecs.map(sp => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono mb-1">Data Específica</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full sm:w-44 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="text-xs text-slate-500 text-right">
              Mostrando <strong>{availableSlots.length}</strong> horários na agenda
            </div>
          </div>

          {/* Grid de Horários com Inteligência de Cotas e Repescagem */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {availableSlots.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                Nenhum horário encontrado para os filtros selecionados.
              </div>
            ) : (
              availableSlots.map(slot => {
                const isBooked = slot.status === 'AGENDADO';
                const isSelected = selectedSlotId === slot.id;
                
                // Avaliação Inteligente de Elegibilidade
                const eligibility = getSlotBookingEligibility(slot, myPostoId, appointments, rules);
                const isAllowedToBook = eligibility.allowed && !isBooked;

                return (
                  <div
                    key={slot.id}
                    className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                      isBooked
                        ? 'bg-slate-100/70 border-slate-200 opacity-60'
                        : !eligibility.allowed
                          ? 'bg-slate-100/80 border-slate-300 opacity-65'
                          : isSelected
                            ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/30 shadow-md'
                            : eligibility.isRepescagem
                              ? 'bg-gradient-to-br from-amber-50/80 to-orange-50/40 border-amber-300 hover:border-amber-400 hover:shadow-md'
                              : eligibility.isCotaLivreAdmin
                                ? 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-400 hover:shadow-md'
                                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Badge Superior: Especialidade + Status da Vaga */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {slot.especialidade}
                        </span>
                        
                        {/* Status / Badge de Cota */}
                        {isBooked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Reservada
                          </span>
                        ) : (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md ${eligibility.badgeClass} flex items-center gap-1`}>
                            {eligibility.isRepescagem && <Flame className="w-3 h-3 text-white" />}
                            {eligibility.isCotaLivreAdmin && <Sparkles className="w-3 h-3 text-white" />}
                            {eligibility.badgeLabel}
                          </span>
                        )}
                      </div>

                      {/* Horário e Data */}
                      <div className="mt-3.5 flex items-baseline gap-2">
                        <span className="text-xl font-black text-slate-900 font-mono">
                          {slot.horario}
                        </span>
                        <span className="text-xs text-slate-600 font-semibold">
                          {formatDateBR(slot.data)} ({getDayOfWeekName(slot.data).split('-')[0]})
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 mt-1.5 font-bold truncate">
                        👨‍⚕️ {slot.medico || 'Médico Especialista'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        📍 {slot.sala || 'Consultório Principal'}
                      </p>

                      {/* Mensagem de Repescagem ou Cota */}
                      {eligibility.isRepescagem && !isBooked && (
                        <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-300/80 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5 font-medium">
                          <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Liberada para qualquer Posto (≤ 5 dias de vencimento)</span>
                        </div>
                      )}

                      {eligibility.isCotaLivreAdmin && !isBooked && (
                        <div className="mt-2.5 p-2 bg-emerald-500/10 border border-emerald-300 rounded-xl text-[11px] text-emerald-900 flex items-center gap-1.5 font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Cota Livre para Mutirão / Ação Social</span>
                        </div>
                      )}

                      {!eligibility.allowed && !isBooked && (
                        <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-medium leading-tight">
                          ⛔ Cota de {slot.especialidade} esgotada para o Posto {myPostoId}. Aguarde repescagem (≤ 5 dias).
                        </div>
                      )}
                    </div>

                    {/* Botão Agendar no Card */}
                    <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between">
                      <div className="text-[11px] text-slate-500">
                        {isBooked ? (
                          <span className="italic text-slate-400">Horário ocupado</span>
                        ) : isAllowedToBook ? (
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                            <input
                              type="radio"
                              name="selected_slot"
                              checked={isSelected}
                              onChange={() => setSelectedSlotId(slot.id)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded-sm cursor-pointer"
                            />
                            <span>Selecionar</span>
                          </label>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-bold">Bloqueado p/ Cota</span>
                        )}
                      </div>

                      {isAllowedToBook && (
                        <button
                          id={`btn-book-slot-${slot.id}`}
                          onClick={() => handleOpenBooking(slot)}
                          className={`px-3.5 py-1.5 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 ${
                            eligibility.isRepescagem
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                              : eligibility.isCotaLivreAdmin
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Agendar Vaga</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ABA 2: MEUS AGENDAMENTOS (Exclusivo do Operador) */}
      {activeSubTab === 'MEUS_AGENDAMENTOS' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Histórico Pessoal
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Consultas Agendadas por Você ({currentUser.nome})
              </h3>
              <p className="text-xs text-slate-500">
                Você só visualiza os agendamentos realizados sob o seu usuário.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar paciente, CPF ou SUS..."
                value={searchMyApps}
                onChange={(e) => setSearchMyApps(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Paciente & Contato</th>
                  <th className="py-3 px-4">CPF / Cartão SUS</th>
                  <th className="py-3 px-4">Data & Horário</th>
                  <th className="py-3 px-4">Especialidade / Médico</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {myAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Você ainda não realizou nenhum agendamento.
                    </td>
                  </tr>
                ) : (
                  myAppointments
                    .filter(a => 
                      a.paciente.paciente.toLowerCase().includes(searchMyApps.toLowerCase()) ||
                      a.paciente.cpf.includes(searchMyApps) ||
                      a.paciente.sus.includes(searchMyApps)
                    )
                    .map(app => (
                      <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{app.paciente.paciente}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {app.paciente.tel}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-slate-800">CPF: {app.paciente.cpf}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">SUS: {app.paciente.sus}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{formatDateBR(app.data)}</div>
                          <div className="text-[11px] font-mono text-blue-600 font-bold">{app.horario}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{app.especialidade}</div>
                          <div className="text-[11px] text-slate-500">{app.medico || 'Médico Plantonista'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {app.status === 'CONFIRMED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Confirmado
                            </span>
                          )}
                          {app.status === 'CANCEL_REQUESTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              ⏳ Cancelamento Pendente de Aprovação
                            </span>
                          )}
                          {app.status === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              Cancelado
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Reminder (Direct - Tel do Paciente) */}
                            <button
                              id={`btn-wa-direct-${app.id}`}
                              onClick={() => onOpenWhatsApp(app, false)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Enviar Lembrete Direto via WhatsApp (Tel. do Paciente)"
                            >
                              <Send className="w-4 h-4" />
                            </button>

                            {/* WhatsApp Reminder (Opcional - Digitar / Escolher Número) */}
                            <button
                              id={`btn-wa-custom-${app.id}`}
                              onClick={() => onOpenWhatsApp(app, true)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Lembrete WhatsApp com Telefone Opcional / Institucional (Digitar Número)"
                            >
                              <MessageSquarePlus className="w-4 h-4" />
                            </button>

                            {/* Print Receipt */}
                            <button
                              id={`btn-receipt-${app.id}`}
                              onClick={() => onOpenReceipt(app)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Imprimir Comprovante"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Solicitar Cancelamento */}
                            {app.status === 'CONFIRMED' && (
                              <button
                                onClick={() => {
                                  setCancelModalApp(app);
                                  setCancelMotivo('');
                                  setCancelError('');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                title="Solicitar Cancelamento ao Administrador"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Cancelar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE AGENDAMENTO (TODOS OS 8 CAMPOS OBRIGATÓRIOS) */}
      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Formulário de Agendamento</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Preenchimento de Consulta
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSlot.especialidade} • {formatDateBR(selectedSlot.data)} às {selectedSlot.horario}
                </p>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Posto e Origem já travados */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">ID do Posto (Fixado):</span>
                <p className="font-bold text-blue-900 font-mono">{currentUser.postoId}</p>
              </div>
              <div>
                <span className="text-slate-500">Origem Vinculada (Fixada):</span>
                <p className="font-bold text-blue-900">{currentUser.origem}</p>
              </div>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Quick Picker from Posto Patients */}
            {myPostoRegisteredPatients.length > 0 && (
              <div className="mt-3.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between" htmlFor="select-posto-patient-quick">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    Carregar Paciente já Cadastrado no seu Posto ({myPostoId}):
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                </label>
                <select
                  id="select-posto-patient-quick"
                  onChange={(e) => handleSelectExistingPatient(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Selecione um paciente cadastrado para auto-preencher...</option>
                  {myPostoRegisteredPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.paciente} • CPF: {p.cpf}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Patient Uniqueness & Posto Isolation Validation Alerts */}
            {patientValidation.message && (
              <div className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                patientValidation.status === 'BLOCKED_OTHER_POSTO'
                  ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                  : patientValidation.status === 'VALID'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                {patientValidation.status === 'BLOCKED_OTHER_POSTO' && (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                {patientValidation.status === 'VALID' && (
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                )}
                {patientValidation.status === 'IDLE' && (
                  <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{patientValidation.message}</p>
                  {patientValidation.status === 'BLOCKED_OTHER_POSTO' && (
                    <p className="mt-1 text-[11px] text-rose-700">
                      <strong>Atenção:</strong> Por segurança da informação e sigilo médico, operadores não podem agendar pacientes registrados por outros Postos de Saúde sem a devida transferência realizada pela Regulação Master.
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. PACIENTE */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="pac-nome">
                    1. PACIENTE (Nome Completo) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pac-nome"
                    type="text"
                    required
                    value={paciente}
                    onChange={(e) => setPaciente(e.target.value)}
                    placeholder="Nome completo do paciente sem abreviações"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 2. CPF */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="pac-cpf">
                    2. CPF (ID Único) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pac-cpf"
                    type="text"
                    required
                    maxLength={14}
                    value={cpf}
                    onChange={(e) => handleCpfInputChange(e.target.value)}
                    placeholder="000.000.000-00"
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:bg-white ${
                      patientValidation.status === 'BLOCKED_OTHER_POSTO'
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/50 text-rose-900'
                        : patientValidation.status === 'VALID'
                          ? 'border-emerald-400 focus:ring-emerald-500 bg-emerald-50/30 text-emerald-900'
                          : 'border-slate-300 focus:ring-blue-600'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Identificador exclusivo de cadastro do paciente.</p>
                </div>

                {/* 3. SUS */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="pac-sus">
                    3. CARTÃO SUS (CNS) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pac-sus"
                    type="text"
                    required
                    maxLength={18}
                    value={sus}
                    onChange={(e) => setSus(formatSUS(e.target.value))}
                    placeholder="000 0000 0000 0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 4. NASCIDO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="pac-nasc">
                    4. NASCIDO (Data de Nascimento) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pac-nasc"
                    type="date"
                    required
                    value={nascido}
                    onChange={(e) => setNascido(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 5. MAE */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="pac-mae">
                    5. MÃE (Nome Completo da Mãe) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pac-mae"
                    type="text"
                    required
                    value={mae}
                    onChange={(e) => setMae(e.target.value)}
                    placeholder="Nome completo da mãe"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 6. ENDEREÇO */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="pac-end">
                    6. ENDEREÇO (Rua, Número, Bairro, Complemento) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pac-end"
                    type="text"
                    required
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Ex: Rua das Flores, 123 - Bairro Central"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 7. CEP */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="pac-cep">
                    7. CEP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pac-cep"
                    type="text"
                    required
                    maxLength={9}
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 8. TEL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="pac-tel">
                    8. TEL / WhatsApp (com DDD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pac-tel"
                    type="text"
                    required
                    maxLength={15}
                    value={tel}
                    onChange={(e) => setTel(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Status de validação */}
              {!isFormValid && (
                <p className="text-[11px] text-amber-700 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  {patientValidation.status === 'BLOCKED_OTHER_POSTO' 
                    ? 'Agendamento bloqueado: Paciente já cadastrado por outro Posto.' 
                    : 'Preencha todos os 8 campos obrigatórios para habilitar a gravação.'}
                </p>
              )}

              {/* Botões do Formulário */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  id="btn-save-appointment"
                  type="submit"
                  disabled={!isFormValid}
                  className={`px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ${
                    isFormValid 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Agendamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SOLICITAÇÃO DE CANCELAMENTO */}
      {cancelModalApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Solicitar Cancelamento de Consulta
              </h3>
              <button
                onClick={() => setCancelModalApp(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-1">
              <p><strong>Paciente:</strong> {cancelModalApp.paciente.paciente}</p>
              <p><strong>Data/Hora:</strong> {formatDateBR(cancelModalApp.data)} às {cancelModalApp.horario}</p>
              <p><strong>Especialidade:</strong> {cancelModalApp.especialidade}</p>
            </div>

            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <strong>Atenção:</strong> O cancelamento requer autorização do Administrador. Assim que aprovado, a vaga volta a ficar disponível e a cota do seu ID será restituída.
            </div>

            {cancelError && (
              <div className="mt-2 p-2 bg-rose-50 text-rose-700 text-xs rounded-lg">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleConfirmCancelRequest} className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="cancel-motivo">
                  Motivo do Cancelamento <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="cancel-motivo"
                  required
                  rows={3}
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  placeholder="Ex: Paciente informou que não poderá comparecer..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalApp(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  id="btn-confirm-cancel-request"
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Enviar Solicitação ao Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
