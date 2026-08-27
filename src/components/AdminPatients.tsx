import React, { useState, useMemo } from 'react';
import { RegisteredPatient, Posto, Appointment, SystemRule, User } from '../types';
import { db } from '../storage/db';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  CreditCard, 
  Phone, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  FileText, 
  Download, 
  Filter,
  X,
  Check,
  AlertTriangle,
  Info,
  Clock,
  UserCheck,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Printer,
  Copy,
  History,
  CalendarCheck,
  CalendarClock,
  HeartPulse,
  User as UserIcon
} from 'lucide-react';
import { formatCPF, formatCEP, formatPhone, formatSUS, formatDateBR } from '../utils/formatters';

interface AdminPatientsProps {
  patients: RegisteredPatient[];
  postos: Posto[];
  appointments: Appointment[];
  rules: SystemRule;
  currentUser: User;
  onPatientsUpdated: (newPatients: RegisteredPatient[]) => void;
  onOpenWhatsApp?: (app: Appointment, isCustomPhoneMode?: boolean) => void;
  onOpenReceipt?: (app: Appointment) => void;
}

export const AdminPatients: React.FC<AdminPatientsProps> = ({
  patients,
  postos,
  appointments,
  rules,
  currentUser,
  onPatientsUpdated,
  onOpenWhatsApp,
  onOpenReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosto, setFilterPosto] = useState('ALL');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal States
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<RegisteredPatient | null>(null);
  const [transferringPatient, setTransferringPatient] = useState<RegisteredPatient | null>(null);
  const [historyPatient, setHistoryPatient] = useState<RegisteredPatient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<RegisteredPatient | null>(null);

  // Prontuário Sub-tabs & Filter State
  const [prontuarioTab, setProntuarioTab] = useState<'ACTIVE' | 'PAST' | 'ALL'>('ACTIVE');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    paciente: '',
    cpf: '',
    sus: '',
    nascido: '',
    mae: '',
    endereco: '',
    cep: '',
    tel: '',
    postoId: postos[0]?.id || 'P01',
    observacoes: '',
  });
  const [formError, setFormError] = useState('');

  // Transfer Form State
  const [targetPostoId, setTargetPostoId] = useState('');
  const [transferMotive, setTransferMotive] = useState('');

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // Filtered Patients List
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/\D/g, '');
      const cleanCpf = patient.cpf.replace(/\D/g, '');
      const cleanSus = (patient.sus || '').replace(/\D/g, '');
      const cleanTel = (patient.tel || '').replace(/\D/g, '');

      const matchesSearch = !q || 
        patient.paciente.toLowerCase().includes(q) ||
        cleanCpf.includes(cleanQ) ||
        patient.cpf.includes(q) ||
        cleanSus.includes(cleanQ) ||
        (patient.mae && patient.mae.toLowerCase().includes(q)) ||
        cleanTel.includes(cleanQ) ||
        (patient.endereco && patient.endereco.toLowerCase().includes(q)) ||
        patient.postoId.toLowerCase().includes(q) ||
        patient.postoNome.toLowerCase().includes(q);

      const matchesPosto = filterPosto === 'ALL' || patient.postoId === filterPosto;

      return matchesSearch && matchesPosto;
    }).sort((a, b) => a.paciente.localeCompare(b.paciente));
  }, [patients, searchQuery, filterPosto]);

  // Statistics
  const totalPatientsCount = patients.length;
  const postosWithPatients = new Set(patients.map(p => p.postoId)).size;
  const totalAppointmentsCount = appointments.filter(a => a.status !== 'CANCELLED').length;

  // Calculate age helper
  const calculateAge = (birthDateStr: string) => {
    if (!birthDateStr) return '';
    try {
      const birth = new Date(birthDateStr);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return isNaN(age) || age < 0 ? '' : `${age} anos`;
    } catch {
      return '';
    }
  };

  const getNumericAge = (birthDateStr: string) => {
    if (!birthDateStr) return null;
    try {
      const birth = new Date(birthDateStr);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return isNaN(age) || age < 0 ? null : age;
    } catch {
      return null;
    }
  };

  // Handle open Add Modal
  const handleOpenAddModal = () => {
    setEditingPatient(null);
    setFormData({
      paciente: '',
      cpf: '',
      sus: '',
      nascido: '',
      mae: '',
      endereco: '',
      cep: '',
      tel: '',
      postoId: postos[0]?.id || 'P01',
      observacoes: '',
    });
    setFormError('');
    setIsNewPatientModalOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEditModal = (patient: RegisteredPatient) => {
    setEditingPatient(patient);
    setFormData({
      paciente: patient.paciente,
      cpf: patient.cpf,
      sus: patient.sus || '',
      nascido: patient.nascido || '',
      mae: patient.mae || '',
      endereco: patient.endereco || '',
      cep: patient.cep || '',
      tel: patient.tel || '',
      postoId: patient.postoId,
      observacoes: patient.observacoes || '',
    });
    setFormError('');
    setIsNewPatientModalOpen(true);
  };

  // Handle Form Submit (Add or Edit)
  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setFormError('CPF inválido. O CPF deve conter exatamente 11 dígitos numéricos.');
      return;
    }

    if (!formData.paciente.trim()) {
      setFormError('Informe o nome completo do paciente.');
      return;
    }

    // Check CPF Uniqueness across the entire system
    const existing = db.findPatientByCpf(cleanCpf);
    if (existing && (!editingPatient || existing.id !== editingPatient.id)) {
      setFormError(`Duplicidade impedida: Este CPF já pertence ao paciente ${existing.paciente}, vinculado ao Posto ${existing.postoId} (${existing.postoNome}). Cada CPF é um ID exclusivo.`);
      return;
    }

    const targetPosto = postos.find(p => p.id === formData.postoId);
    const postoNome = targetPosto ? targetPosto.origem : `Posto ${formData.postoId}`;

    if (editingPatient) {
      // Update existing
      const updated: RegisteredPatient = {
        ...editingPatient,
        paciente: formData.paciente.trim(),
        cpf: formData.cpf.trim(),
        sus: formData.sus.trim(),
        nascido: formData.nascido.trim(),
        mae: formData.mae.trim(),
        endereco: formData.endereco.trim(),
        cep: formData.cep.trim(),
        tel: formData.tel.trim(),
        postoId: formData.postoId,
        postoNome: postoNome,
        observacoes: formData.observacoes.trim(),
        atualizadoEm: new Date().toISOString(),
      };
      db.updatePatient(updated);
      onPatientsUpdated(db.getPatients());
      showFeedback('success', `Cadastro do paciente ${updated.paciente} atualizado com sucesso!`);
    } else {
      // Create new
      const result = db.saveOrUpdatePatient({
        cpf: formData.cpf.trim(),
        paciente: formData.paciente.trim(),
        sus: formData.sus.trim(),
        nascido: formData.nascido.trim(),
        mae: formData.mae.trim(),
        endereco: formData.endereco.trim(),
        cep: formData.cep.trim(),
        tel: formData.tel.trim(),
        postoId: formData.postoId,
        postoNome: postoNome,
        operadorId: currentUser.id,
        operadorNome: currentUser.nome,
        observacoes: formData.observacoes.trim(),
      });

      if (!result.success) {
        setFormError(result.error || 'Erro ao registrar paciente.');
        return;
      }
      onPatientsUpdated(db.getPatients());
      showFeedback('success', `Paciente ${formData.paciente} cadastrado com sucesso e vinculado ao Posto ${formData.postoId}!`);
    }

    setIsNewPatientModalOpen(false);
    setEditingPatient(null);
  };

  // Handle open Transfer Modal
  const handleOpenTransferModal = (patient: RegisteredPatient) => {
    setTransferringPatient(patient);
    const otherPostos = postos.filter(p => p.id !== patient.postoId);
    setTargetPostoId(otherPostos[0]?.id || '');
    setTransferMotive('');
  };

  // Confirm Transfer
  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringPatient || !targetPostoId) return;

    const targetPosto = postos.find(p => p.id === targetPostoId);
    const targetPostoNome = targetPosto ? targetPosto.origem : `Posto ${targetPostoId}`;

    const ok = db.transferPatientPosto(
      transferringPatient.id,
      targetPostoId,
      targetPostoNome,
      transferMotive.trim()
    );

    if (ok) {
      onPatientsUpdated(db.getPatients());
      showFeedback('success', `Vínculo do paciente ${transferringPatient.paciente} transferido com sucesso para ${targetPostoId} (${targetPostoNome})!`);
    } else {
      showFeedback('error', 'Falha ao transferir vínculo do paciente.');
    }

    setTransferringPatient(null);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingPatient) return;
    const ok = db.deletePatient(deletingPatient.id);
    if (ok) {
      onPatientsUpdated(db.getPatients());
      showFeedback('info', `Cadastro de ${deletingPatient.paciente} removido da base com sucesso.`);
    }
    setDeletingPatient(null);
  };

  // Export Patients as CSV
  const handleExportCSV = () => {
    const headers = ['CPF (ID)', 'Nome Completo', 'Cartão SUS', 'Data Nascimento', 'Nome da Mãe', 'Telefone', 'Endereço', 'CEP', 'ID Posto Vinculado', 'Nome do Posto', 'Cadastrado Em'];
    const rows = patients.map(p => [
      `"${p.cpf}"`,
      `"${p.paciente}"`,
      `"${p.sus || ''}"`,
      `"${p.nascido || ''}"`,
      `"${p.mae || ''}"`,
      `"${p.tel || ''}"`,
      `"${p.endereco || ''}"`,
      `"${p.cep || ''}"`,
      `"${p.postoId}"`,
      `"${p.postoNome}"`,
      `"${p.criadoEm}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pacientes_cadastrados_clinica_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('success', 'Relatório de pacientes exportado em formato CSV!');
  };

  // Open history modal with clean tab reset
  const handleOpenHistoryModal = (patient: RegisteredPatient) => {
    setHistoryPatient(patient);
    setProntuarioTab('ACTIVE');
    setHistorySearchQuery('');
    setCopiedAppId(null);
  };

  // Reference date (today)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Helper to get days difference (targetDate - today)
  const getDaysDifference = (targetDateStr: string) => {
    try {
      const today = new Date(todayStr + 'T00:00:00');
      const target = new Date(targetDateStr + 'T00:00:00');
      const diffTime = target.getTime() - today.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Helper for human-readable relative timing tag and alerts
  const getRelativeDateInfo = (dateStr: string) => {
    const diff = getDaysDifference(dateStr);
    if (diff === 0) {
      return {
        badgeText: '🔔 HOJE!',
        badgeClass: 'bg-emerald-600 text-white font-black animate-pulse shadow-xs',
        isUpcoming: true,
        daysText: 'Consulta marcada para HOJE',
        type: 'TODAY',
        diff,
      };
    }
    if (diff === 1) {
      return {
        badgeText: '⚡ AMANHÃ',
        badgeClass: 'bg-amber-500 text-white font-black shadow-xs',
        isUpcoming: true,
        daysText: 'Falta 1 dia (Amanhã)',
        type: 'TOMORROW',
        diff,
      };
    }
    if (diff > 1) {
      return {
        badgeText: `🟢 No Prazo (Faltam ${diff} dias)`,
        badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold',
        isUpcoming: true,
        daysText: `Faltam ${diff} dias (${formatDateBR(dateStr)})`,
        type: 'FUTURE',
        diff,
      };
    }
    if (diff === -1) {
      return {
        badgeText: '⏳ Ontem',
        badgeClass: 'bg-slate-200 text-slate-700 font-medium',
        isUpcoming: false,
        daysText: 'Realizada / Passou ontem',
        type: 'YESTERDAY',
        diff,
      };
    }
    const absDays = Math.abs(diff);
    if (absDays >= 30) {
      const months = Math.floor(absDays / 30);
      return {
        badgeText: `⌛ Passada (Há ~${months} ${months === 1 ? 'mês' : 'meses'})`,
        badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200 font-medium',
        isUpcoming: false,
        daysText: `Realizada há ~${months} ${months === 1 ? 'mês' : 'meses'} (${formatDateBR(dateStr)})`,
        type: 'PAST',
        diff,
      };
    }
    return {
      badgeText: `⌛ Passada (Há ${absDays} dias)`,
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200 font-medium',
      isUpcoming: false,
      daysText: `Realizada há ${absDays} dias (${formatDateBR(dateStr)})`,
      type: 'PAST',
      diff,
    };
  };

  // Get all appointments for selected history patient
  const allPatientAppointments = useMemo(() => {
    if (!historyPatient) return [];
    const cleanCpf = historyPatient.cpf.replace(/\D/g, '');
    return appointments.filter(a => {
      if (!a.paciente || !a.paciente.cpf) return false;
      return a.paciente.cpf.replace(/\D/g, '') === cleanCpf;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [historyPatient, appointments]);

  // Consultas Futuras & No Prazo (Ativas / Hoje em diante e não canceladas)
  const activeAndUpcomingAppointments = useMemo(() => {
    return allPatientAppointments
      .filter(a => a.data >= todayStr && a.status !== 'CANCELLED')
      .sort((a, b) => a.data.localeCompare(b.data)); // Soonest first
  }, [allPatientAppointments, todayStr]);

  // Consultas Passadas / Anteriores (Antes de hoje ou canceladas)
  const pastAppointments = useMemo(() => {
    return allPatientAppointments
      .filter(a => a.data < todayStr || a.status === 'CANCELLED')
      .sort((a, b) => b.data.localeCompare(a.data)); // Most recent past first
  }, [allPatientAppointments, todayStr]);

  // Filtered past appointments by search query
  const filteredPastAppointments = useMemo(() => {
    if (!historySearchQuery.trim()) return pastAppointments;
    const q = historySearchQuery.toLowerCase().trim();
    return pastAppointments.filter(a => 
      a.especialidade.toLowerCase().includes(q) ||
      (a.medico && a.medico.toLowerCase().includes(q)) ||
      a.data.includes(q) ||
      formatDateBR(a.data).includes(q) ||
      a.horario.includes(q) ||
      (a.origem && a.origem.toLowerCase().includes(q)) ||
      a.postoId.toLowerCase().includes(q)
    );
  }, [pastAppointments, historySearchQuery]);

  // Next immediate appointment (for intelligent guidance banner)
  const nextAppointment = activeAndUpcomingAppointments[0] || null;

  // Copy appointment text to clipboard
  const handleCopyAppText = (app: Appointment) => {
    const text = `📋 AGENDAMENTO DE CONSULTA MÉDICA\n` +
      `Paciente: ${app.paciente.paciente}\n` +
      `CPF: ${app.paciente.cpf} | Cartão SUS: ${app.paciente.sus || 'Não informado'}\n` +
      `Especialidade: ${app.especialidade}\n` +
      `Médico: ${app.medico || 'Médico Regulador'}\n` +
      `Data: ${formatDateBR(app.data)} às ${app.horario}\n` +
      `Local: ${rules.nomeClinica || 'Central de Agendamento RSantos'}\n` +
      `Endereço: ${rules.enderecoClinica || 'Rua Dr. Luiz Palmier, 726 - Barreto, Niterói - RJ'}\n` +
      `Posto de Vínculo: ${app.postoId} (${app.origem})\n` +
      `Status: ${app.status === 'CONFIRMED' ? 'Confirmado' : app.status}\n` +
      `⚠️ Chegar com 15 minutos de antecedência munido de documento oficial com foto e Cartão SUS.`;

    navigator.clipboard.writeText(text);
    setCopiedAppId(app.id);
    showFeedback('info', 'Detalhes da consulta copiados para a área de transferência!');
    setTimeout(() => setCopiedAppId(null), 3000);
  };

  // Generate & Print Complete Patient Extract (Folha de Prontuário / Extrato)
  const handlePrintPatientExtract = () => {
    if (!historyPatient) return;
    const clinicName = rules.nomeClinica || 'Central de Agendamento RSantos';
    const clinicAddress = rules.enderecoClinica || 'Rua Dr. Luiz Palmier, 726 - Barreto, Niterói - RJ, CEP 24110-310';
    const clinicPhone = rules.telefoneClinica || '(21) 995860846';
    const emissionDate = new Date().toLocaleString('pt-BR');

    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (!printWin) {
      alert('Por favor, permita popups para imprimir a folha de prontuário do paciente.');
      return;
    }

    let activeRows = '';
    if (activeAndUpcomingAppointments.length === 0) {
      activeRows = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 12px;">Nenhuma consulta futura agendada no momento.</td></tr>`;
    } else {
      activeAndUpcomingAppointments.forEach(a => {
        const rel = getRelativeDateInfo(a.data);
        activeRows += `
          <tr style="background-color: #f0fdf4;">
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #166534;">
              ${formatDateBR(a.data)} às ${a.horario} <br><small style="color: #15803d; font-weight: normal;">${rel.daysText}</small>
            </td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold;">${a.especialidade}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${a.medico || 'Médico Regulador'}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Posto ${a.postoId} (${a.origem})</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #15803d;">CONFIRMADO</td>
          </tr>
        `;
      });
    }

    let pastRows = '';
    if (pastAppointments.length === 0) {
      pastRows = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 12px;">Nenhuma consulta anterior registrada.</td></tr>`;
    } else {
      pastAppointments.forEach(a => {
        const rel = getRelativeDateInfo(a.data);
        pastRows += `
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">
              ${formatDateBR(a.data)} às ${a.horario} <br><small style="color: #64748b;">${rel.daysText}</small>
            </td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${a.especialidade}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${a.medico || 'Médico Regulador'}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Posto ${a.postoId} (${a.origem})</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">
              ${a.status === 'CONFIRMED' ? 'Realizada / Passada' : a.status === 'CANCELLED' ? 'Cancelada' : 'Cancelamento Solicitado'}
            </td>
          </tr>
        `;
      });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Prontuário e Extrato de Consultas - ${historyPatient.paciente}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 15px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { font-size: 16px; margin: 0; text-transform: uppercase; color: #0f172a; }
          .header p { margin: 2px 0; color: #475569; font-size: 11px; }
          .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 15px; }
          .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          .section-title { font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 15px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th { background: #0f172a; color: white; padding: 6px 10px; text-align: left; border: 1px solid #0f172a; font-size: 10px; text-transform: uppercase; }
          .alert-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; margin-bottom: 15px; font-size: 11px; color: #1e3a8a; }
          .footer { text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 20px; font-size: 10px; color: #64748b; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right; margin-bottom: 10px;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Imprimir Extrato</button>
        </div>

        <div class="header">
          <h1>${clinicName}</h1>
          <p>${clinicAddress} • Central de Atendimento: ${clinicPhone}</p>
          <p><strong>EXTRATO OFICIAL DE AGENDAMENTOS E PRONTUÁRIO RESUMIDO</strong> • Emissão: ${emissionDate}</p>
        </div>

        <div class="patient-box">
          <div class="patient-grid">
            <div><strong>Nome do Paciente:</strong> ${historyPatient.paciente}</div>
            <div><strong>CPF (ID Único):</strong> ${historyPatient.cpf}</div>
            <div><strong>Cartão SUS:</strong> ${historyPatient.sus || 'Não informado'}</div>
            <div><strong>Data de Nascimento:</strong> ${formatDateBR(historyPatient.nascido)} ${calculateAge(historyPatient.nascido) ? `(${calculateAge(historyPatient.nascido)})` : ''}</div>
            <div><strong>Nome da Mãe:</strong> ${historyPatient.mae || 'Não informado'}</div>
            <div><strong>Telefone de Contato:</strong> ${historyPatient.tel || 'Não informado'}</div>
            <div><strong>Posto de Vínculo:</strong> ${historyPatient.postoId} - ${historyPatient.postoNome}</div>
            <div><strong>Endereço:</strong> ${historyPatient.endereco || 'Não informado'} ${historyPatient.cep ? `(CEP: ${historyPatient.cep})` : ''}</div>
          </div>
          ${historyPatient.observacoes ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1;"><strong>Observações Clínicas / Acompanhamento:</strong> ${historyPatient.observacoes}</div>` : ''}
        </div>

        <div class="section-title" style="color: #166534;">🟢 Consultas no Prazo & Futuras (Monitoramento Ativo)</div>
        <table>
          <thead>
            <tr>
              <th>Data & Horário</th>
              <th>Especialidade</th>
              <th>Médico</th>
              <th>Posto Solicitante</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${activeRows}
          </tbody>
        </table>

        <div class="section-title" style="color: #475569;">⏳ Histórico de Consultas Passadas / Anteriores</div>
        <table>
          <thead>
            <tr>
              <th>Data Original</th>
              <th>Especialidade</th>
              <th>Médico</th>
              <th>Posto Solicitante</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            ${pastRows}
          </tbody>
        </table>

        <div class="alert-box">
          <strong>⚠️ Orientações ao Paciente e Acompanhante:</strong><br>
          • Chegar sempre com 15 minutos de antecedência ao horário agendado.<br>
          • Apresentar este extrato, documento oficial com foto e Cartão SUS.<br>
          • Em caso de dúvidas sobre a data ou remarcação, contate a Central pelo telefone ${clinicPhone}.
        </div>

        <div class="footer">
          Central de Agendamento RSantos • Sistema Regulador Central • Documento emitido para controle e acompanhamento do paciente.
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* HEADER & CONTEXT BANNER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Lista de Pacientes Cadastrados
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  Exclusivo Administrador Master
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  1 CPF = 1 Cadastro Único
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Gestão centralizada de pacientes com <strong>regra de vínculo por Posto</strong>. O CPF atua como ID de identidade único, impedindo cadastros duplicados. Operadores visualizam exclusivamente os pacientes vinculados ao seu próprio Posto de origem.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="btn-export-patients-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Exportar Lista Completa em Planilha CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              id="btn-add-new-patient"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Paciente</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST */}
        {feedbackMessage && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
            feedbackMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : feedbackMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {feedbackMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {feedbackMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {feedbackMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
        )}

        {/* KPI BENTO CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Total de Pacientes</span>
            <p className="text-xl font-black text-slate-900 mt-0.5">{totalPatientsCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Cadastros individuais ativos</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Postos com Vínculo</span>
            <p className="text-xl font-black text-blue-600 mt-0.5">{postosWithPatients} / {postos.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Unidades com pacientes</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Consultas Marcadas</span>
            <p className="text-xl font-black text-indigo-600 mt-0.5">{totalAppointmentsCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Agendamentos no histórico</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Proteção de Dados</span>
            <p className="text-xl font-black text-emerald-600 mt-0.5">100%</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Isolamento por Posto ativo</p>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-patients"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Nome, CPF, Cartão SUS, Mãe, Telefone ou Posto..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter by Posto */}
          <div className="w-full sm:w-64">
            <select
              id="select-filter-posto"
              value={filterPosto}
              onChange={(e) => setFilterPosto(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="ALL">🏢 Todos os Postos ({patients.length})</option>
              {postos.map(p => {
                const count = patients.filter(pt => pt.postoId === p.id).length;
                return (
                  <option key={p.id} value={p.id}>
                    {p.id} - {p.origem} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 whitespace-nowrap self-end sm:self-center">
          Exibindo <strong>{filteredPatients.length}</strong> de <strong>{patients.length}</strong> pacientes
        </div>
      </div>

      {/* PATIENTS TABLE / CARDS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="py-16 text-center text-slate-500 px-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Nenhum paciente encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Não há pacientes cadastrados que correspondam aos filtros ou ao termo de busca digitado.
            </p>
            {(searchQuery || filterPosto !== 'ALL') && (
              <button
                onClick={() => { setSearchQuery(''); setFilterPosto('ALL'); }}
                className="mt-3.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  <th className="py-3.5 px-4">Paciente / Filiação</th>
                  <th className="py-3.5 px-4">CPF (ID Único)</th>
                  <th className="py-3.5 px-4">Cartão SUS & Contato</th>
                  <th className="py-3.5 px-4">Vínculo com Posto</th>
                  <th className="py-3.5 px-4">Cadastrado em</th>
                  <th className="py-3.5 px-4 text-right">Ações Regulador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPatients.map((patient) => {
                  const age = calculateAge(patient.nascido);
                  const patientAppsCount = appointments.filter(a => {
                    return a.paciente?.cpf?.replace(/\D/g, '') === patient.cpf.replace(/\D/g, '');
                  }).length;

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Paciente / Filiação */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {patient.paciente}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          {patient.nascido && (
                            <span>
                              🎂 {formatDateBR(patient.nascido)} {age && `(${age})`}
                            </span>
                          )}
                          {patient.mae && (
                            <span className="truncate max-w-[200px]" title={`Mãe: ${patient.mae}`}>
                              • Mãe: {patient.mae}
                            </span>
                          )}
                        </div>
                        {patient.endereco && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs" title={patient.endereco}>
                            📍 {patient.endereco} {patient.cep ? `(CEP: ${patient.cep})` : ''}
                          </div>
                        )}
                      </td>

                      {/* CPF (ID ÚNICO) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{patient.cpf}</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium mt-1">
                          ✓ ID Exclusivo Válido
                        </div>
                      </td>

                      {/* Cartão SUS & Contato */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-slate-700 font-medium flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>{patient.sus || 'Não informado'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{patient.tel || 'Sem telefone'}</span>
                        </div>
                      </td>

                      {/* Vínculo com Posto */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-semibold text-xs">
                          <Building className="w-3.5 h-3.5 text-blue-600" />
                          <span>ID {patient.postoId}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-1 truncate max-w-[220px]" title={patient.postoNome}>
                          {patient.postoNome}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          🔒 Acesso restrito a operadores de {patient.postoId}
                        </div>
                      </td>

                      {/* Cadastrado em */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        <div className="text-xs">
                          {formatDateBR(patient.criadoEm.slice(0, 10))}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {patient.operadorNome ? `Por ${patient.operadorNome}` : 'Pelo Sistema'}
                        </div>
                        {patientAppsCount > 0 && (
                          <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold mt-1">
                            {patientAppsCount} agendamento{patientAppsCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>

                      {/* Ações Regulador */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Histórico / Consultas */}
                          <button
                            id={`btn-patient-history-${patient.id}`}
                            onClick={() => handleOpenHistoryModal(patient)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver Prontuário / Histórico de Consultas deste Paciente"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Transferir Vínculo de Posto */}
                          <button
                            id={`btn-patient-transfer-${patient.id}`}
                            onClick={() => handleOpenTransferModal(patient)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Transferir Vínculo para Outro Posto"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>

                          {/* Editar Dados */}
                          <button
                            id={`btn-patient-edit-${patient.id}`}
                            onClick={() => handleOpenEditModal(patient)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar Cadastro do Paciente"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Excluir Cadastro */}
                          <button
                            id={`btn-patient-delete-${patient.id}`}
                            onClick={() => setDeletingPatient(patient)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Cadastro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: NOVO PACIENTE / EDITAR PACIENTE */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingPatient ? 'Editar Cadastro de Paciente' : 'Novo Cadastro de Paciente'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingPatient ? `Atualização cadastral do ID ${editingPatient.cpf}` : 'Registro único por CPF com vínculo exclusivo por Posto'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPatientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3.5 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePatient} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Nome Completo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-name">
                    Nome Completo do Paciente <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="inp-patient-name"
                    type="text"
                    required
                    value={formData.paciente}
                    onChange={(e) => setFormData({ ...formData, paciente: e.target.value })}
                    placeholder="Nome completo sem abreviações"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 2. CPF (ID ÚNICO) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-cpf">
                    CPF (ID de Identidade Único) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="inp-patient-cpf"
                    type="text"
                    required
                    maxLength={14}
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Obrigatório 11 dígitos. Apenas um cadastro por CPF.</p>
                </div>

                {/* 3. Cartão SUS */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-sus">
                    Cartão SUS (CNS) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="inp-patient-sus"
                    type="text"
                    required
                    maxLength={18}
                    value={formData.sus}
                    onChange={(e) => setFormData({ ...formData, sus: formatSUS(e.target.value) })}
                    placeholder="000 0000 0000 0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 4. Data de Nascimento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-birth">
                    Data de Nascimento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="inp-patient-birth"
                    type="date"
                    required
                    value={formData.nascido}
                    onChange={(e) => setFormData({ ...formData, nascido: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 5. Nome da Mãe */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-mother">
                    Nome Completo da Mãe <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="inp-patient-mother"
                    type="text"
                    required
                    value={formData.mae}
                    onChange={(e) => setFormData({ ...formData, mae: e.target.value })}
                    placeholder="Nome completo da mãe"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 6. Posto de Vínculo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-posto">
                    Posto de Saúde Vinculado (Regra de Vínculo e Isolamento) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="inp-patient-posto"
                    value={formData.postoId}
                    onChange={(e) => setFormData({ ...formData, postoId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  >
                    {postos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id} - {p.origem} ({p.cidade || 'Unidade'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-blue-700 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
                    Somente operadores deste ID ({formData.postoId}) poderão visualizar e agendar para este paciente.
                  </p>
                </div>

                {/* 7. Endereço */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-address">
                    Endereço Completo (Rua, Número, Bairro) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="inp-patient-address"
                    type="text"
                    required
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Ex: Rua das Palmeiras, 142 - Centro"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 8. CEP */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-cep">
                    CEP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="inp-patient-cep"
                    type="text"
                    required
                    maxLength={9}
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 9. Telefone / WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-phone">
                    Telefone / WhatsApp (com DDD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="inp-patient-phone"
                    type="text"
                    required
                    maxLength={15}
                    value={formData.tel}
                    onChange={(e) => setFormData({ ...formData, tel: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                {/* 10. Observações */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-patient-notes">
                    Observações Cadastrais / Histórico
                  </label>
                  <textarea
                    id="inp-patient-notes"
                    rows={2}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Alergias, orientações de contato ou histórico de atendimento..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingPatient ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TRANSFERIR VÍNCULO DE POSTO */}
      {transferringPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Transferir Vínculo de Posto
                  </h3>
                  <p className="text-xs text-slate-500">
                    Alteração de unidade responsável pelo paciente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTransferringPatient(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Paciente:</span>
                <strong className="text-slate-900 font-bold">{transferringPatient.paciente}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">CPF (ID Único):</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">{transferringPatient.cpf}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Posto Atual:</span>
                <strong className="text-blue-900">{transferringPatient.postoId} ({transferringPatient.postoNome})</strong>
              </div>
            </div>

            <form onSubmit={handleConfirmTransfer} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="select-target-posto">
                  Novo Posto de Destino <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-target-posto"
                  required
                  value={targetPostoId}
                  onChange={(e) => setTargetPostoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  {postos.map(p => (
                    <option key={p.id} value={p.id} disabled={p.id === transferringPatient.postoId}>
                      {p.id} - {p.origem} {p.id === transferringPatient.postoId ? '(Posto Atual)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="inp-transfer-motive">
                  Motivo da Transferência / Justificativa Administrativa
                </label>
                <input
                  id="inp-transfer-motive"
                  type="text"
                  value={transferMotive}
                  onChange={(e) => setTransferMotive(e.target.value)}
                  placeholder="Ex: Mudança de endereço do paciente / Solicitação do operador"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  Ao transferir o vínculo, os operadores do novo Posto passarão a ter acesso exclusivo ao cadastro deste paciente.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTransferringPatient(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Confirmar Transferência</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HISTÓRICO COMPLETO / PRONTUÁRIO RESUMIDO DE CONSULTAS ORGANIZADO */}
      {historyPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0 gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Prontuário & Histórico de Agendamentos
                    </h3>
                    {getNumericAge(historyPatient.nascido) !== null && (getNumericAge(historyPatient.nascido) || 0) >= 60 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        🧓 Idoso (60+ anos)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Paciente: <strong className="text-slate-900">{historyPatient.paciente}</strong> • CPF: <span className="font-mono font-bold text-slate-900">{historyPatient.cpf}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryPatient(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors shrink-0"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="overflow-y-auto pr-1 space-y-4 my-3 grow">
              {/* Resumo do Paciente & Identificação Cadastral */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] font-mono uppercase font-bold">Vínculo de Posto</span>
                  <p className="font-bold text-blue-900 mt-0.5 truncate" title={`${historyPatient.postoId} (${historyPatient.postoNome})`}>
                    {historyPatient.postoId} ({historyPatient.postoNome})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-mono uppercase font-bold">Cartão SUS</span>
                  <p className="font-mono font-semibold text-slate-800 mt-0.5">{historyPatient.sus || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-mono uppercase font-bold">Telefone / WhatsApp</span>
                  <p className="font-mono font-semibold text-slate-800 mt-0.5">{historyPatient.tel || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-mono uppercase font-bold">Nascimento & Idade</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {formatDateBR(historyPatient.nascido)} {calculateAge(historyPatient.nascido) && `(${calculateAge(historyPatient.nascido)})`}
                  </p>
                </div>
              </div>

              {/* Observações Cadastrais / Clínicas se existirem */}
              {historyPatient.observacoes && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-950">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>Observações Cadastrais / Alerta Clínico:</span>
                  </div>
                  <p className="mt-1 text-slate-700 leading-relaxed">{historyPatient.observacoes}</p>
                </div>
              )}

              {/* CARD INTELIGENTE DE MONITORAMENTO & PREVENÇÃO DE CONFUSÃO DE DATAS (IDOSOS / NEUROLÓGICOS) */}
              {nextAppointment ? (
                <div className={`p-4 rounded-2xl border transition-all ${
                  getRelativeDateInfo(nextAppointment.data).type === 'TODAY'
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : getRelativeDateInfo(nextAppointment.data).type === 'TOMORROW'
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${getRelativeDateInfo(nextAppointment.data).badgeClass}`}>
                          {getRelativeDateInfo(nextAppointment.data).badgeText}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          Próxima Consulta Agendada: <strong className="text-slate-900">{nextAppointment.especialidade}</strong>
                        </span>
                      </div>

                      <p className="text-xs text-slate-700">
                        📅 Marcada para <strong>{formatDateBR(nextAppointment.data)} às {nextAppointment.horario}</strong> com <strong>Dr(a) {nextAppointment.medico || 'Médico Regulador'}</strong> no <strong>Posto {nextAppointment.postoId}</strong>.
                      </p>

                      {/* Orientação ao Atendente caso o paciente tenha comparecido antes do dia */}
                      {getRelativeDateInfo(nextAppointment.data).diff > 0 && (
                        <div className="mt-2 text-[11px] bg-white/80 p-2.5 rounded-xl border border-indigo-100 text-slate-700 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-slate-900">Atenção ao Atendimento (Prevenção de Desperdício e Confusão de Data):</strong>
                            <p className="mt-0.5">
                              Caso o paciente ou acompanhante tenha comparecido <strong>hoje antecipadamente</strong> por esquecimento ou perda de documentos, esclareça que a consulta está no prazo para o dia <strong>{formatDateBR(nextAppointment.data)}</strong> (faltam {getRelativeDateInfo(nextAppointment.data).diff} dias). Forneça o comprovante impresso ou envie o lembrete via WhatsApp para reforçar a data correta.
                            </p>
                          </div>
                        </div>
                      )}

                      {getRelativeDateInfo(nextAppointment.data).diff === 0 && (
                        <div className="mt-2 text-[11px] bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-emerald-950">Paciente no Dia Correto da Consulta (HOJE):</strong>
                            <p className="mt-0.5">
                              A consulta é hoje às <strong>{nextAppointment.horario}</strong>. Confirme a chegada do paciente e encaminhe para a recepção/sala de atendimento.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : pastAppointments.length > 0 ? (
                <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Sem Consultas Futuras no Prazo:</strong>
                    <p className="mt-0.5">
                      Este paciente não tem nenhuma consulta agendada para hoje ou datas futuras. A última consulta registrada foi em <strong>{formatDateBR(pastAppointments[0].data)}</strong> ({getRelativeDateInfo(pastAppointments[0].data).daysText}). Você pode consultar as consultas anteriores na aba <strong>"Histórico Passado"</strong> ou abrir a tela de agendamento se for necessária nova marcação.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* ABAS DE NAVEGAÇÃO ORGANIZADA */}
              <div className="pt-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
                  {/* Aba 1: No Prazo / Recentes */}
                  <button
                    type="button"
                    onClick={() => setProntuarioTab('ACTIVE')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      prontuarioTab === 'ACTIVE'
                        ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <CalendarCheck className="w-4 h-4 text-emerald-600" />
                    <span>No Prazo & Futuras</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeAndUpcomingAppointments.length > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {activeAndUpcomingAppointments.length}
                    </span>
                  </button>

                  {/* Aba 2: Histórico Passado / Anteriores */}
                  <button
                    type="button"
                    onClick={() => setProntuarioTab('PAST')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      prontuarioTab === 'PAST'
                        ? 'bg-white text-indigo-900 shadow-xs border border-indigo-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <History className="w-4 h-4 text-indigo-600" />
                    <span>Histórico Passado</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      pastAppointments.length > 0
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {pastAppointments.length}
                    </span>
                  </button>

                  {/* Aba 3: Todas as Consultas */}
                  <button
                    type="button"
                    onClick={() => setProntuarioTab('ALL')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      prontuarioTab === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>Todas ({allPatientAppointments.length})</span>
                  </button>
                </div>
              </div>

              {/* CONTEÚDO DA ABA 1: CONSULTAS NO PRAZO & ATIVAS */}
              {prontuarioTab === 'ACTIVE' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Consultas Ativas & Futuras ({activeAndUpcomingAppointments.length})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Monitoramento para evitar perda de prazos e faltas
                    </span>
                  </div>

                  {activeAndUpcomingAppointments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <CalendarCheck className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Nenhuma consulta futura ou ativa no momento</p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                        O paciente não possui consultas agendadas para hoje ou datas posteriores.
                        {pastAppointments.length > 0 && ' Você pode conferir os atendimentos anteriores na aba "Histórico Passado".'}
                      </p>
                      {pastAppointments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setProntuarioTab('PAST')}
                          className="mt-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Ver {pastAppointments.length} consulta(s) anteriores no Histórico</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeAndUpcomingAppointments.map(app => {
                        const relInfo = getRelativeDateInfo(app.data);
                        return (
                          <div
                            key={app.id}
                            className="p-4 rounded-2xl border border-emerald-200 bg-white hover:border-emerald-400 shadow-xs transition-all space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm">
                                    {app.especialidade}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${relInfo.badgeClass}`}>
                                    {relInfo.badgeText}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                    Confirmado
                                  </span>
                                </div>
                                <div className="text-slate-600 mt-1.5 text-xs flex items-center gap-2.5 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    📅 {formatDateBR(app.data)} às {app.horario}
                                  </span>
                                  <span>• 👨‍⚕️ {app.medico || 'Médico Regulador'}</span>
                                  <span>• 🏢 Posto {app.postoId} ({app.origem})</span>
                                  {app.operadorNome && (
                                    <span className="text-slate-400">• Agendado por: {app.operadorNome}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Ações de Apoio ao Paciente */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{rules.nomeClinica || 'Central de Agendamento RSantos'}</span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Botão Copiar */}
                                <button
                                  type="button"
                                  onClick={() => handleCopyAppText(app)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                                  title="Copiar dados da consulta para colar em mensagem"
                                >
                                  {copiedAppId === app.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-700 font-bold">Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Copiar</span>
                                    </>
                                  )}
                                </button>

                                {/* Botão WhatsApp */}
                                {onOpenWhatsApp && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenWhatsApp(app, false)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                                    title="Disparar Lembrete Oficial via WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Lembrete WhatsApp</span>
                                  </button>
                                )}

                                {/* Botão Imprimir Comprovante Oficial */}
                                {onOpenReceipt && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenReceipt(app)}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                                    title="Imprimir Guia / Comprovante Oficial em Impressora Térmica ou A4"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Imprimir Guia</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CONTEÚDO DA ABA 2: HISTÓRICO PASSADO / ANTERIORES */}
              {prontuarioTab === 'PAST' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Consultas Anteriores / Já Realizadas ({filteredPastAppointments.length} de {pastAppointments.length})
                    </span>

                    {/* Barra de Busca no Histórico Passado */}
                    {pastAppointments.length > 0 && (
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          placeholder="Buscar por médico, especialidade, mês..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {historySearchQuery && (
                          <button
                            type="button"
                            onClick={() => setHistorySearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {pastAppointments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs space-y-1">
                      <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-700">Nenhum agendamento anterior registrado</p>
                      <p className="text-slate-500 text-[11px]">Este paciente não possui consultas passadas na base de dados.</p>
                    </div>
                  ) : filteredPastAppointments.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                      Nenhuma consulta passada encontrada com o termo "{historySearchQuery}".
                      <button
                        type="button"
                        onClick={() => setHistorySearchQuery('')}
                        className="block mx-auto mt-2 text-indigo-600 hover:underline font-bold"
                      >
                        Limpar busca
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPastAppointments.map(app => {
                        const relInfo = getRelativeDateInfo(app.data);
                        return (
                          <div
                            key={app.id}
                            className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800">
                                  {app.especialidade}
                                </span>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  {relInfo.badgeText}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  app.status === 'CONFIRMED'
                                    ? 'bg-slate-100 text-slate-700'
                                    : app.status === 'CANCEL_REQUESTED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {app.status === 'CONFIRMED' ? 'Realizada / Passada' : app.status === 'CANCEL_REQUESTED' ? 'Cancelamento Solicitado' : 'Cancelado'}
                                </span>
                              </div>
                              <div className="text-slate-500 mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                                <span>📅 {formatDateBR(app.data)} às {app.horario}</span>
                                <span>• 👨‍⚕️ {app.medico || 'Médico Regulador'}</span>
                                <span>• 🏢 Posto {app.postoId} ({app.origem})</span>
                                {app.operadorNome && <span>• Agendado por: {app.operadorNome}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              {onOpenReceipt && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReceipt(app)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Imprimir 2ª Via / Comprovante do Histórico"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>2ª Via</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CONTEÚDO DA ABA 3: TODAS AS CONSULTAS (CRONOLOGIA COMPLETA) */}
              {prontuarioTab === 'ALL' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Todas as Consultas do Paciente ({allPatientAppointments.length})
                    </span>
                  </div>

                  {allPatientAppointments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                      Nenhuma consulta vinculada a este paciente.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allPatientAppointments.map(app => {
                        const relInfo = getRelativeDateInfo(app.data);
                        return (
                          <div
                            key={app.id}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                              relInfo.isUpcoming
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">
                                  {app.especialidade}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${relInfo.badgeClass}`}>
                                  {relInfo.badgeText}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  app.status === 'CONFIRMED'
                                    ? relInfo.isUpcoming ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                    : app.status === 'CANCEL_REQUESTED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {app.status === 'CONFIRMED' ? (relInfo.isUpcoming ? 'Confirmado' : 'Passada') : app.status === 'CANCEL_REQUESTED' ? 'Cancelamento Solicitado' : 'Cancelado'}
                                </span>
                              </div>
                              <div className="text-slate-600 mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                                <span>📅 {formatDateBR(app.data)} às {app.horario}</span>
                                <span>• 👨‍⚕️ {app.medico || 'Médico Regulador'}</span>
                                <span>• 🏢 Posto {app.postoId} ({app.origem})</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              {onOpenReceipt && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReceipt(app)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Imprimir Comprovante"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Guia</span>
                                </button>
                              )}
                              {onOpenWhatsApp && relInfo.isUpcoming && (
                                <button
                                  type="button"
                                  onClick={() => onOpenWhatsApp(app, false)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Enviar Lembrete WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer com Botão de Extrato Completo e Fechar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handlePrintPatientExtract}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Imprimir Extrato Completo do Paciente (Prontuário de Consultas)"
              >
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>Imprimir Ficha Completa do Paciente</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryPatient(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Fechar Prontuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Excluir Cadastro do Paciente?
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Deseja remover <strong>{deletingPatient.paciente}</strong> (CPF: {deletingPatient.cpf}) da base central?
              Esta ação é irreversível.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                onClick={() => setDeletingPatient(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                Sim, Excluir Cadastro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
