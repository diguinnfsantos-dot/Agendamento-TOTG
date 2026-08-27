import React, { useState, useMemo, useEffect } from 'react';
import {
  Slot,
  Appointment,
} from '../types';
import {
  X,
  Building2,
  Calendar,
  Clock,
  Stethoscope,
  ArrowRightLeft,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Layers,
  HelpCircle,
  RefreshCw,
  Plus,
  FileText,
  Copy,
  Info,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { formatDateBR, getDayOfWeekName } from '../utils/formatters';
import { db } from '../storage/db';

export type ShiftType = 'MANHÃ' | 'TARDE' | 'NOITE';

export function getTurnoFromHorario(horario: string): ShiftType {
  const [h] = horario.split(':').map(Number);
  if (isNaN(h)) return 'MANHÃ';
  if (h < 13) return 'MANHÃ';
  if (h < 18) return 'TARDE';
  return 'NOITE';
}

interface AdminRoomManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: Slot[];
  appointments: Appointment[];
  onSlotsUpdated: (newSlots: Slot[]) => void;
  onAppointmentsUpdated?: (newApps: Appointment[]) => void;
  onOpenBatchAdd?: (prefill?: { sala?: string; data?: string; medico?: string; especialidade?: string }) => void;
}

export const AdminRoomManagerModal: React.FC<AdminRoomManagerModalProps> = ({
  isOpen,
  onClose,
  slots,
  appointments,
  onSlotsUpdated,
  onAppointmentsUpdated,
  onOpenBatchAdd,
}) => {
  if (!isOpen) return null;

  const rules = useMemo(() => db.getRules(), []);

  // Active Tab in the Room Manager
  const [activeTab, setActiveTab] = useState<'VACANT' | 'OCCUPANCY' | 'SCHEDULE_BOARD' | 'CONFLICTS'>('VACANT');

  // Rooms and Doctor profiles
  const [roomsList, setRoomsList] = useState<string[]>(() => db.getRooms());
  const [doctorProfiles, setDoctorProfiles] = useState(() => db.getDoctorProfiles());

  // Date Range State (Defaults to current week or the first slot's week, e.g. 2026-08-31 to 2026-09-04)
  const defaultDates = useMemo(() => {
    // Find earliest slot date or default to 2026-08-31
    const sortedDates: string[] = Array.from(new Set(slots.map(s => s.data)))
      .filter((d): d is string => typeof d === 'string' && d.length > 0)
      .sort();
    const initDate = sortedDates[0] || '2026-08-31';
    
    // Compute 5 days forward (Segunda a Sexta) or 7 days
    try {
      const [y, m, d] = initDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const endDt = new Date(dt);
      endDt.setDate(dt.getDate() + 4); // +4 days = Friday
      const endYear = endDt.getFullYear();
      const endMonth = String(endDt.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDt.getDate()).padStart(2, '0');
      return {
        startDate: initDate,
        endDate: `${endYear}-${endMonth}-${endDay}`,
      };
    } catch {
      return { startDate: '2026-08-31', endDate: '2026-09-04' };
    }
  }, [slots]);

  const [dataInicial, setDataInicial] = useState<string>(defaultDates.startDate);
  const [dataFinal, setDataFinal] = useState<string>(defaultDates.endDate);
  const [filtroSala, setFiltroSala] = useState<string>('TODAS');
  const [filtroTurno, setFiltroTurno] = useState<string>('TODOS');

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportCopied, setReportCopied] = useState<boolean>(false);
  const [emptyOccupancyNotice, setEmptyOccupancyNotice] = useState<string | null>(null);

  // Conflict state
  const [conflicts, setConflicts] = useState(() => db.detectRoomConflicts());
  const [conflictSuccessMsg, setConflictSuccessMsg] = useState<string | null>(null);

  // Relocation State (Remanejamento)
  const [relocateModal, setRelocateModal] = useState<{
    open: boolean;
    data: string;
    turno: ShiftType;
    medico: string;
    especialidade: string;
    salaAtual: string;
    targetSala: string;
  }>({
    open: false,
    data: '',
    turno: 'MANHÃ',
    medico: '',
    especialidade: '',
    salaAtual: '',
    targetSala: '',
  });

  const [relocateSuccessMsg, setRelocateSuccessMsg] = useState<string | null>(null);

  // ESC Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReportModal) {
          setShowReportModal(false);
        } else if (relocateModal.open) {
          setRelocateModal(prev => ({ ...prev, open: false }));
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, relocateModal.open, showReportModal]);

  // Generate array of consecutive dates from dataInicial to dataFinal
  const dateRangeList = useMemo(() => {
    if (!dataInicial || !dataFinal) return [];
    const list: string[] = [];
    const [sy, sm, sd] = dataInicial.split('-').map(Number);
    const [ey, em, ed] = dataFinal.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    if (start > end) return [dataInicial];

    const current = new Date(start);
    // Limit to max 31 days for safety
    let count = 0;
    while (current <= end && count < 31) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      list.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return list;
  }, [dataInicial, dataFinal]);

  // Shifts definition
  const shifts: Array<{ id: ShiftType; name: string; timeRange: string; icon: any; color: string; badgeBg: string }> = [
    { id: 'MANHÃ', name: 'Manhã', timeRange: '07:00 às 12:59', icon: Sun, color: 'text-amber-600', badgeBg: 'bg-amber-50 border-amber-200 text-amber-900' },
    { id: 'TARDE', name: 'Tarde', timeRange: '13:00 às 17:59', icon: Sunset, color: 'text-orange-600', badgeBg: 'bg-orange-50 border-orange-200 text-orange-900' },
    { id: 'NOITE', name: 'Noite', timeRange: '18:00 às 22:00', icon: Moon, color: 'text-indigo-600', badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
  ];

  // Helper to get all rooms
  const activeRooms = useMemo(() => {
    if (filtroSala === 'TODAS') return roomsList;
    return roomsList.filter(r => r === filtroSala);
  }, [roomsList, filtroSala]);

  // Matrix analysis for Date x Shift x Room
  const matrixData = useMemo(() => {
    const res: Record<string, Record<ShiftType, Record<string, {
      isOccupied: boolean;
      doctor?: string;
      specialty?: string;
      totalSlots: number;
      freeSlots: number;
      bookedSlots: number;
      blockedSlots: number;
      slots: Slot[];
      horariosLivres: string[];
      horariosOcupados: string[];
    }>>> = {};

    dateRangeList.forEach(date => {
      res[date] = {
        'MANHÃ': {},
        'TARDE': {},
        'NOITE': {},
      };

      shifts.forEach(shift => {
        roomsList.forEach(room => {
          // Find slots on this date, room, shift
          const roomSlots = slots.filter(s => {
            if (s.data !== date) return false;
            if (s.sala.toLowerCase().trim() !== room.toLowerCase().trim()) return false;
            const turno = getTurnoFromHorario(s.horario);
            return turno === shift.id;
          }).sort((a, b) => a.horario.localeCompare(b.horario));

          const totalSlots = roomSlots.length;
          const freeSlots = roomSlots.filter(s => s.status === 'DISPONIVEL').length;
          const bookedSlots = roomSlots.filter(s => s.status === 'AGENDADO').length;
          const blockedSlots = roomSlots.filter(s => s.status === 'BLOQUEADO').length;

          const isOccupied = totalSlots > 0;
          const doctor = isOccupied ? roomSlots[0].medico : undefined;
          const specialty = isOccupied ? roomSlots[0].especialidade : undefined;
          const horariosLivres = roomSlots.filter(s => s.status === 'DISPONIVEL').map(s => s.horario);
          const horariosOcupados = roomSlots.filter(s => s.status === 'AGENDADO').map(s => s.horario);

          res[date][shift.id][room] = {
            isOccupied,
            doctor,
            specialty,
            totalSlots,
            freeSlots,
            bookedSlots,
            blockedSlots,
            slots: roomSlots,
            horariosLivres,
            horariosOcupados,
          };
        });
      });
    });

    return res;
  }, [dateRangeList, roomsList, slots]);

  // Overall statistics for the selected period & filters
  const periodStats = useMemo(() => {
    let totalSlots = 0;
    let bookedSlots = 0;
    let freeSlots = 0;
    let occupiedCells = 0;
    let totalPossibleCells = 0;
    const activeDoctorsSet = new Set<string>();

    dateRangeList.forEach(date => {
      shifts
        .filter(sh => filtroTurno === 'TODOS' || filtroTurno === sh.id)
        .forEach(shift => {
          activeRooms.forEach(room => {
            totalPossibleCells++;
            const cellInfo = matrixData[date]?.[shift.id]?.[room];
            if (cellInfo && cellInfo.isOccupied) {
              occupiedCells++;
              totalSlots += cellInfo.totalSlots;
              bookedSlots += cellInfo.bookedSlots;
              freeSlots += cellInfo.freeSlots;
              if (cellInfo.doctor) activeDoctorsSet.add(cellInfo.doctor);
            }
          });
        });
    });

    const hasOccupancy = occupiedCells > 0 && totalSlots > 0;
    const taxaOcupacao = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
    const vacantCells = totalPossibleCells - occupiedCells;

    return {
      totalSlots,
      bookedSlots,
      freeSlots,
      occupiedCells,
      totalPossibleCells,
      vacantCells,
      hasOccupancy,
      taxaOcupacao,
      totalDoctors: activeDoctorsSet.size,
    };
  }, [dateRangeList, shifts, filtroTurno, activeRooms, matrixData]);

  // Check occupancy on filter/date change and update notification banner
  useEffect(() => {
    if (!periodStats.hasOccupancy) {
      setEmptyOccupancyNotice(
        `Nenhuma ocupação de salas ou escala médica foi encontrada no período selecionado (${formatDateBR(dataInicial)} a ${formatDateBR(dataFinal)}). Todas as salas estão 100% livres.`
      );
    } else {
      setEmptyOccupancyNotice(null);
    }
  }, [periodStats.hasOccupancy, dataInicial, dataFinal, filtroSala, filtroTurno]);

  // Quick Date Setters
  const handleSetCurrentWeek = () => {
    const sorted: string[] = Array.from(new Set(slots.map(s => s.data)))
      .filter((d): d is string => typeof d === 'string' && d.length > 0)
      .sort();
    const base = sorted[0] || '2026-08-31';
    const [y, m, d] = base.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const endDt = new Date(dt);
    endDt.setDate(dt.getDate() + 6); // Seg a Dom
    const ey = endDt.getFullYear();
    const em = String(endDt.getMonth() + 1).padStart(2, '0');
    const ed = String(endDt.getDate()).padStart(2, '0');
    setDataInicial(base);
    setDataFinal(`${ey}-${em}-${ed}`);
  };

  const handleSetNextWeek = () => {
    const [y, m, d] = dataInicial.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 7);
    const nextStart = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const nextEndDt = new Date(dt);
    nextEndDt.setDate(dt.getDate() + 6);
    const nextEnd = `${nextEndDt.getFullYear()}-${String(nextEndDt.getMonth() + 1).padStart(2, '0')}-${String(nextEndDt.getDate()).padStart(2, '0')}`;
    setDataInicial(nextStart);
    setDataFinal(nextEnd);
  };

  const handleSetWholeMonth = () => {
    const sorted: string[] = Array.from(new Set(slots.map(s => s.data)))
      .filter((d): d is string => typeof d === 'string' && d.length > 0)
      .sort();
    const base = sorted[0] || '2026-08-31';
    const [y, m] = base.split('-');
    setDataInicial(`${y}-${m}-01`);
    setDataFinal(`${y}-${m}-30`);
  };

  // Conflict Resolution
  const handleScanConflicts = () => {
    const found = db.detectRoomConflicts();
    setConflicts(found);
    if (found.length === 0) {
      setConflictSuccessMsg('Nenhum conflito encontrado! Todas as salas estão perfeitamente distribuídas.');
      setTimeout(() => setConflictSuccessMsg(null), 4000);
    }
  };

  const handleAutoResolveConflicts = () => {
    const res = db.resolveAllRoomConflicts();
    const newSlots = db.getSlots();
    onSlotsUpdated(newSlots);
    setConflicts(db.detectRoomConflicts());
    setConflictSuccessMsg(
      `Sucesso! ${res.resolvedCount} conflito(s) resolvido(s) e ${res.reallocatedCount} vaga(s) remanejada(s) para salas livres com total integridade.`
    );
    setTimeout(() => setConflictSuccessMsg(null), 6000);
  };

  // Relocation Handler (Remanejamento de Médico para outra sala)
  const handleOpenRelocate = (data: string, turno: ShiftType, medico: string, especialidade: string, salaAtual: string) => {
    const availableRooms = roomsList.filter(r => r !== salaAtual);
    const vacantFirst = availableRooms.find(r => {
      const cell = matrixData[data]?.[turno]?.[r];
      return !cell?.isOccupied;
    }) || availableRooms[0] || '';

    setRelocateModal({
      open: true,
      data,
      turno,
      medico,
      especialidade,
      salaAtual,
      targetSala: vacantFirst,
    });
  };

  const handleExecuteRelocate = () => {
    if (!relocateModal.targetSala || relocateModal.targetSala === relocateModal.salaAtual) {
      alert('Selecione uma sala de destino diferente da sala atual.');
      return;
    }

    const res = db.relocateDoctorRoom({
      data: relocateModal.data,
      medico: relocateModal.medico,
      deSala: relocateModal.salaAtual,
      paraSala: relocateModal.targetSala,
      turno: relocateModal.turno,
    });

    const newSlots = db.getSlots();
    const newApps = db.getAppointments();
    onSlotsUpdated(newSlots);
    if (onAppointmentsUpdated) onAppointmentsUpdated(newApps);

    setRelocateSuccessMsg(
      `Remanejamento efetuado! ${res.slotsMoved} vaga(s) do(a) ${relocateModal.medico} transferidas com sucesso da ${relocateModal.salaAtual} para a ${relocateModal.targetSala} no turno da ${relocateModal.turno}.`
    );
    setRelocateModal(prev => ({ ...prev, open: false }));
    setTimeout(() => setRelocateSuccessMsg(null), 5000);
  };

  // Export Master Schedule to CSV / Excel
  const handleExportCSV = () => {
    const rows: string[][] = [
      ['DATA', 'DIA DA SEMANA', 'TURNO', 'SALA / CONSULTORIO', 'MEDICO', 'ESPECIALIDADE', 'HORARIOS', 'TOTAL VAGAS', 'VAGAS AGENDADAS', 'VAGAS DISPONIVEIS', 'STATUS DA SALA']
    ];

    dateRangeList.forEach(date => {
      const diaSemana = getDayOfWeekName(date);
      shifts
        .filter(sh => filtroTurno === 'TODOS' || filtroTurno === sh.id)
        .forEach(shift => {
          activeRooms.forEach(room => {
            const info = matrixData[date]?.[shift.id]?.[room];
            if (!info) return;

            const statusStr = !info.isOccupied
              ? '100% LIVRE (SEM ESCALA)'
              : info.freeSlots > 0 && info.bookedSlots > 0
              ? 'PARCIALMENTE OCUPADA'
              : info.freeSlots === 0
              ? 'TOTALMENTE AGENDADA'
              : 'VAGAS DISPONIVEIS';

            const horariosStr = info.slots.map(s => s.horario).join(' / ') || 'Nenhum';

            rows.push([
              formatDateBR(date),
              diaSemana,
              shift.name,
              room,
              info.doctor || 'Disponível / Sem Médico',
              info.specialty || '-',
              horariosStr,
              String(info.totalSlots),
              String(info.bookedSlots),
              String(info.freeSlots),
              statusStr,
            ]);
          });
        });
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Quadro_Salas_Ocupacao_${dataInicial}_a_${dataFinal}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open the Official Report Preview Modal
  const handleOpenReportModal = () => {
    if (!periodStats.hasOccupancy) {
      setEmptyOccupancyNotice(
        `Nenhuma ocupação de salas ou escala médica foi encontrada no período selecionado (${formatDateBR(dataInicial)} a ${formatDateBR(dataFinal)}). Todas as salas estão 100% livres.`
      );
    }
    setShowReportModal(true);
  };

  // Generate Standalone HTML Document for Printing & Download
  const generateReportHTML = () => {
    const clinicName = rules?.nomeClinica || 'Central de Agendamento RSantos';
    const clinicAddress = rules?.enderecoClinica || 'Rua Dr. Luiz Palmier, 726 - Barreto, Niterói - RJ, CEP 24110-310';
    const clinicPhone = rules?.telefoneClinica || '(21) 995860846';
    const emissionDate = new Date().toLocaleString('pt-BR');

    let tableRowsHTML = '';
    dateRangeList.forEach(date => {
      const diaSemana = getDayOfWeekName(date);
      shifts
        .filter(sh => filtroTurno === 'TODOS' || filtroTurno === sh.id)
        .forEach(shift => {
          activeRooms.forEach(room => {
            const cellInfo = matrixData[date]?.[shift.id]?.[room];
            if (!cellInfo) return;

            const isVacant = !cellInfo.isOccupied;
            const statusLabel = isVacant
              ? '<span style="color:#047857;font-weight:bold;">100% LIVRE</span>'
              : cellInfo.freeSlots > 0
              ? `<span style="color:#b45309;font-weight:bold;">PARCIAL (${cellInfo.freeSlots} vagas livres)</span>`
              : '<span style="color:#1d4ed8;font-weight:bold;">LOTADA</span>';

            const doctorLabel = isVacant
              ? '<span style="color:#6b7280;font-style:italic;">Sem médico alocado</span>'
              : `<strong>${cellInfo.doctor || '-'}</strong>`;

            const horariosLabel = cellInfo.slots.length > 0
              ? `${cellInfo.slots[0].horario} às ${cellInfo.slots[cellInfo.slots.length - 1].horario} (${cellInfo.slots.length} vagas)`
              : '-';

            tableRowsHTML += `
              <tr style="border-bottom: 1px solid #e5e7eb; ${isVacant ? 'background-color: #f0fdf4;' : ''}">
                <td style="padding: 8px 10px; font-family: monospace; font-weight: bold;">${formatDateBR(date)}</td>
                <td style="padding: 8px 10px;">${diaSemana}</td>
                <td style="padding: 8px 10px; font-weight: bold;">${shift.name}</td>
                <td style="padding: 8px 10px; font-weight: bold; color: #0f172a;">${room}</td>
                <td style="padding: 8px 10px;">${doctorLabel}</td>
                <td style="padding: 8px 10px;">${cellInfo.specialty || '-'}</td>
                <td style="padding: 8px 10px; font-family: monospace; font-size: 11px;">${horariosLabel}</td>
                <td style="padding: 8px 10px; text-align: center;">${cellInfo.totalSlots > 0 ? `${cellInfo.freeSlots}L / ${cellInfo.bookedSlots}O` : '0'}</td>
                <td style="padding: 8px 10px;">${statusLabel}</td>
              </tr>
            `;
          });
        });
    });

    const emptyNoticeHTML = !periodStats.hasOccupancy
      ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; color: #92400e; font-size: 13px; font-weight: bold;">
          ⚠️ AVISO IMPORTANTE: Nenhuma ocupação de sala ou escala médica foi encontrada no período selecionado (${formatDateBR(dataInicial)} a ${formatDateBR(dataFinal)}). Todos os consultórios encontram-se 100% livres e disponíveis.
        </div>
      `
      : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Oficial de Escala Física e Horários - ${formatDateBR(dataInicial)} a ${formatDateBR(dataFinal)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #1e293b; background: #fff; font-size: 12px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { margin: 0; font-size: 18px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 4px 0 0 0; font-size: 13px; color: #2563eb; font-weight: bold; }
    .header p { margin: 4px 0 0 0; font-size: 11px; color: #64748b; }
    .meta-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px; }
    .meta-col { display: flex; flex-direction: column; gap: 3px; }
    .stats-grid { display: flex; gap: 10px; margin-bottom: 16px; }
    .stat-card { flex: 1; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; text-align: center; }
    .stat-val { font-size: 16px; font-weight: bold; color: #0f172a; }
    .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th { background: #0f172a; color: #ffffff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print {
      body { margin: 10mm; font-size: 10px; }
      th { background: #0f172a !important; color: #fff !important; -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${clinicName}</h1>
    <h2>RELATÓRIO OFICIAL DE ESCALA DE SALAS, CONSULTÓRIOS E HORÁRIOS</h2>
    <p>${clinicAddress} • Central: ${clinicPhone} • Emissão: ${emissionDate}</p>
  </div>

  <div class="meta-box">
    <div class="meta-col">
      <span><strong>Período Auditado:</strong> ${formatDateBR(dataInicial)} até ${formatDateBR(dataFinal)} (${dateRangeList.length} dias)</span>
      <span><strong>Filtro de Consultório:</strong> ${filtroSala === 'TODAS' ? `Todos os Consultórios (${roomsList.length})` : filtroSala}</span>
    </div>
    <div class="meta-col">
      <span><strong>Filtro de Turno:</strong> ${filtroTurno === 'TODOS' ? 'Manhã, Tarde e Noite' : filtroTurno}</span>
      <span><strong>Médicos Escalados:</strong> ${periodStats.totalDoctors} profissional(is)</span>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-val">${periodStats.totalSlots}</div>
      <div class="stat-label">Total de Vagas</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#047857;">${periodStats.freeSlots}</div>
      <div class="stat-label">Vagas Livres</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#2563eb;">${periodStats.bookedSlots}</div>
      <div class="stat-label">Vagas Agendadas</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${periodStats.taxaOcupacao}%</div>
      <div class="stat-label">Taxa de Ocupação</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color:#d97706;">${periodStats.vacantCells}</div>
      <div class="stat-label">Turnos 100% Livres</div>
    </div>
  </div>

  ${emptyNoticeHTML}

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Dia</th>
        <th>Turno</th>
        <th>Consultório</th>
        <th>Médico Responsável</th>
        <th>Especialidade</th>
        <th>Horários de Atendimento</th>
        <th style="text-align: center;">Vagas</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHTML}
    </tbody>
  </table>

  <div class="footer">
    Documento oficial emitido eletronicamente pelo Sistema de Gestão Ambulatorial • ${emissionDate}
  </div>
</body>
</html>`;
  };

  // Robust Direct Printing Function (with Iframe Fallback for Sandbox Environment)
  const handlePrintDocument = () => {
    const htmlContent = generateReportHTML();
    
    // Create an invisible iframe for pristine print output
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    try {
      const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (err) {
            console.warn('Iframe print fallback triggered window.print', err);
            window.print();
          }
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 2000);
        }, 300);
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Direct print fallback', e);
      window.print();
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
    }
  };

  // Download Formatted HTML Report File
  const handleDownloadReportHTML = () => {
    const htmlContent = generateReportHTML();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Escala_Salas_${dataInicial}_a_${dataFinal}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Plain Text Report to Clipboard
  const handleCopyReportText = () => {
    let text = `=====================================================\n`;
    text += `${rules?.nomeClinica || 'Central de Agendamento RSantos'}\n`;
    text += `RELATÓRIO OFICIAL DE ESCALA DE SALAS, CONSULTÓRIOS E HORÁRIOS\n`;
    text += `Período: ${formatDateBR(dataInicial)} a ${formatDateBR(dataFinal)} | Emissão: ${new Date().toLocaleString('pt-BR')}\n`;
    text += `Total de Vagas: ${periodStats.totalSlots} | Livres: ${periodStats.freeSlots} | Agendadas: ${periodStats.bookedSlots} | Taxa: ${periodStats.taxaOcupacao}%\n`;
    text += `=====================================================\n\n`;

    if (!periodStats.hasOccupancy) {
      text += `[AVISO] Nenhuma ocupação de salas encontrada no período. Todas as salas estão 100% livres.\n\n`;
    }

    text += `DATA | DIA | TURNO | SALA | MÉDICO | ESPECIALIDADE | HORÁRIOS | VAGAS | STATUS\n`;
    text += `---------------------------------------------------------------------------------\n`;

    dateRangeList.forEach(date => {
      const diaSemana = getDayOfWeekName(date);
      shifts
        .filter(sh => filtroTurno === 'TODOS' || filtroTurno === sh.id)
        .forEach(shift => {
          activeRooms.forEach(room => {
            const info = matrixData[date]?.[shift.id]?.[room];
            if (!info) return;

            const statusStr = !info.isOccupied ? 'LIVRE' : info.freeSlots > 0 ? 'PARCIAL' : 'LOTADA';
            const doctorStr = info.doctor || 'Sem Médico';
            const horariosStr = info.slots.map(s => s.horario).join(',') || '-';

            text += `${formatDateBR(date)} | ${diaSemana} | ${shift.name} | ${room} | ${doctorStr} | ${info.specialty || '-'} | ${horariosStr} | ${info.freeSlots}L/${info.bookedSlots}O | ${statusStr}\n`;
          });
        });
    });

    navigator.clipboard.writeText(text).then(() => {
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 3000);
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* TOP HEADER */}
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-black shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    Painel de Gestão de Salas, Consultórios & Ocupação
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                    {roomsList.length} Consultórios Ativos
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Controle em tempo real de salas vazias por turno, médicos ocupantes, remanejamento de emergência e quadro geral.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-close-room-manager-modal"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fechar painel (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* FEEDBACK BANNERS */}
          {relocateSuccessMsg && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 shadow-xs shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{relocateSuccessMsg}</span>
            </div>
          )}

          {conflictSuccessMsg && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl flex items-center gap-2 shadow-xs shrink-0">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold">{conflictSuccessMsg}</span>
            </div>
          )}

          {/* EMPTY OCCUPANCY NOTIFICATION BANNER */}
          {emptyOccupancyNotice && activeTab !== 'CONFLICTS' && (
            <div id="banner-empty-occupancy" className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between gap-2 shadow-xs shrink-0 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">
                  <strong className="font-bold">Aviso de Ocupação:</strong> {emptyOccupancyNotice}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSetCurrentWeek}
                className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-[11px] transition-colors shrink-0 cursor-pointer"
              >
                Ir para Semana com Vagas
              </button>
            </div>
          )}

          {/* NAVIGATION TABS */}
          <div className="flex items-center gap-1.5 mt-3.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200 overflow-x-auto shrink-0">
            <button
              id="tab-vacant-rooms"
              onClick={() => setActiveTab('VACANT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'VACANT'
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Salas Vazias & Horários Livres</span>
            </button>

            <button
              id="tab-occupancy-relocate"
              onClick={() => setActiveTab('OCCUPANCY')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'OCCUPANCY'
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Ocupação por Sala & Remanejamento</span>
            </button>

            <button
              id="tab-schedule-board"
              onClick={() => setActiveTab('SCHEDULE_BOARD')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'SCHEDULE_BOARD'
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>3. Quadro Geral & Relatórios</span>
            </button>

            <button
              id="tab-conflicts-audit"
              onClick={() => {
                setActiveTab('CONFLICTS');
                handleScanConflicts();
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative ${
                activeTab === 'CONFLICTS'
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              <span>4. Auditoria de Conflitos de Sala</span>
              {conflicts.length > 0 && (
                <span className="w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {conflicts.length}
                </span>
              )}
            </button>
          </div>

          {/* COMMON FILTER BAR FOR TABS 1, 2 & 3 */}
          {activeTab !== 'CONFLICTS' && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Data Inicial */}
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                  <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Data Inicial:</label>
                  <input
                    type="date"
                    value={dataInicial}
                    onChange={(e) => setDataInicial(e.target.value)}
                    className="text-xs font-bold text-blue-950 focus:outline-hidden"
                  />
                </div>

                {/* Data Final */}
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                  <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Data Final:</label>
                  <input
                    type="date"
                    value={dataFinal}
                    onChange={(e) => setDataFinal(e.target.value)}
                    className="text-xs font-bold text-blue-950 focus:outline-hidden"
                  />
                </div>

                {/* Filtro de Consultório */}
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={filtroSala}
                    onChange={(e) => setFiltroSala(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                  >
                    <option value="TODAS">Todos os Consultórios ({roomsList.length})</option>
                    {roomsList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro de Turno */}
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={filtroTurno}
                    onChange={(e) => setFiltroTurno(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                  >
                    <option value="TODOS">Todos os Turnos (Manhã/Tarde/Noite)</option>
                    <option value="MANHÃ">Apenas Manhã (07h - 13h)</option>
                    <option value="TARDE">Apenas Tarde (13h - 18h)</option>
                    <option value="NOITE">Apenas Noite (18h - 22h)</option>
                  </select>
                </div>
              </div>

              {/* Quick Period Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetCurrentWeek}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors cursor-pointer"
                  title="Visualizar semana selecionada (Segunda a Domingo)"
                >
                  Esta Semana
                </button>
                <button
                  type="button"
                  onClick={handleSetNextWeek}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors cursor-pointer"
                  title="Avançar 7 dias"
                >
                  Próxima Semana
                </button>
                <button
                  type="button"
                  onClick={handleSetWholeMonth}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors cursor-pointer"
                  title="Visualizar o mês completo"
                >
                  Mês Todo
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: QUADRO DE SALAS VAZIAS E DISPONIBILIDADE POR TURNO */}
          {activeTab === 'VACANT' && (
            <div className="mt-4 flex-1 flex flex-col overflow-hidden">
              {/* Header info */}
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Quadro de Disponibilidade Semanal (Segunda a Domingo)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    • Exibindo {dateRangeList.length} dia(s) no período
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    100% Livre
                  </span>
                  <span className="flex items-center gap-1 text-amber-700 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    Horários Parciais Livres
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                    Ocupado
                  </span>
                </div>
              </div>

              {/* Matrix Table with Sticky Headers */}
              <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  {/* TOP HEADER: Days of Week + Dates */}
                  <thead className="bg-slate-900 text-white sticky top-0 z-20">
                    <tr>
                      <th className="p-3 text-xs font-black uppercase tracking-wider border-r border-slate-800 w-36 bg-slate-900 sticky left-0 z-30">
                        Turno / Período
                      </th>
                      {dateRangeList.map(date => {
                        const dayName = getDayOfWeekName(date);
                        const isWeekend = dayName.startsWith('Sáb') || dayName.startsWith('Dom');
                        return (
                          <th
                            key={date}
                            className={`p-3 text-center border-r border-slate-800 last:border-r-0 min-w-[200px] ${
                              isWeekend ? 'bg-slate-950/80 text-amber-300' : 'bg-slate-900 text-white'
                            }`}
                          >
                            <div className="text-xs font-black tracking-wide">{dayName}</div>
                            <div className="text-[11px] font-mono text-blue-300 font-bold mt-0.5">
                              {formatDateBR(date)}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* TABLE BODY: 3 Shifts (Manhã, Tarde, Noite) */}
                  <tbody className="divide-y divide-slate-200">
                    {shifts
                      .filter(s => filtroTurno === 'TODOS' || filtroTurno === s.id)
                      .map(shift => {
                        const ShiftIcon = shift.icon;
                        return (
                          <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* LEFT ROW HEADER: Shift Name and Times */}
                            <td className="p-3.5 border-r border-slate-200 bg-slate-50 sticky left-0 z-10 align-top shadow-xs">
                              <div className="flex items-center gap-1.5">
                                <ShiftIcon className={`w-4 h-4 ${shift.color}`} />
                                <span className="text-xs font-black text-slate-900 uppercase">
                                  {shift.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-semibold mt-1 font-mono">
                                {shift.timeRange}
                              </div>
                            </td>

                            {/* CELLS FOR EACH DATE */}
                            {dateRangeList.map(date => {
                              const dateRooms = matrixData[date]?.[shift.id] || {};
                              const availableRooms = activeRooms;

                              return (
                                <td key={date} className="p-2.5 border-r border-slate-200 last:border-r-0 align-top bg-white">
                                  <div className="space-y-1.5">
                                    {availableRooms.map(room => {
                                      const cellInfo = dateRooms[room];
                                      const isVacant = !cellInfo || !cellInfo.isOccupied;
                                      const hasFreeSlots = cellInfo && cellInfo.freeSlots > 0;

                                      if (isVacant) {
                                        // 100% Vacant Room
                                        return (
                                          <div
                                            key={room}
                                            className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex flex-col justify-between hover:bg-emerald-100/70 transition-colors group"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                {room}
                                              </span>
                                              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded-md">
                                                100% Livre
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-emerald-700 mt-1 flex items-center justify-between">
                                              <span>Sem médico alocado</span>
                                              {onOpenBatchAdd && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    onClose();
                                                    onOpenBatchAdd({ sala: room, data: date });
                                                  }}
                                                  className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                  title="Criar vagas nesta sala"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  <span>Alocar</span>
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Partially Free or Occupied Room
                                      if (hasFreeSlots) {
                                        return (
                                          <div
                                            key={room}
                                            className="p-2 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 flex flex-col gap-1"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                {room}
                                              </span>
                                              <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-md">
                                                {cellInfo.freeSlots} vaga(s) livre(s)
                                              </span>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-800 truncate">
                                              👨‍⚕️ {cellInfo.doctor}
                                            </div>
                                            <div className="text-[9px] text-amber-800 font-mono">
                                              Livres: {cellInfo.horariosLivres.slice(0, 4).join(', ')}
                                              {cellInfo.horariosLivres.length > 4 && '...'}
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Fully Booked / Occupied Room
                                      return (
                                        <div
                                          key={room}
                                          className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex flex-col gap-0.5 opacity-85 hover:opacity-100 transition-opacity"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-900">
                                              {room}
                                            </span>
                                            <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md">
                                              Ocupado
                                            </span>
                                          </div>
                                          <div className="text-[10px] font-semibold text-slate-800 truncate">
                                            {cellInfo.doctor}
                                          </div>
                                          <div className="text-[9px] text-slate-500">
                                            {cellInfo.specialty} • {cellInfo.totalSlots} vagas
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: OCUPAÇÃO POR SALA & REMANEJAMENTO RÁPIDO */}
          {activeTab === 'OCCUPANCY' && (
            <div className="mt-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                  Mapeamento de Médicos por Turno & Remanejamento de Salas
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Altere ou transfira salas de médicos em poucos cliques em caso de intercorrências físicas.
                </span>
              </div>

              {/* List of Rooms and their occupancies */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {activeRooms.map(room => {
                  // Collect all occupied slots for this room in the date range
                  const roomSlots = slots.filter(s => {
                    if (s.sala.toLowerCase().trim() !== room.toLowerCase().trim()) return false;
                    return dateRangeList.includes(s.data);
                  });

                  return (
                    <div key={room} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                      {/* Room Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">{room}</h4>
                            <span className="text-[11px] text-slate-500">
                              {roomSlots.length} vaga(s) distribuídas no período selecionado
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                          {Array.from(new Set(roomSlots.map(s => s.medico))).length} Médico(s) Vinculado(s)
                        </span>
                      </div>

                      {/* Occupancy Grid by Date & Shift */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {dateRangeList.map(date => {
                          const dayName = getDayOfWeekName(date);
                          const dayShifts = shifts.filter(sh => filtroTurno === 'TODOS' || filtroTurno === sh.id);

                          return (
                            <div key={date} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-2">
                                <span className="text-xs font-black text-slate-900">{dayName}</span>
                                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                                  {formatDateBR(date)}
                                </span>
                              </div>

                              <div className="space-y-2">
                                {dayShifts.map(shift => {
                                  const cellInfo = matrixData[date]?.[shift.id]?.[room];
                                  const isOccupied = cellInfo && cellInfo.isOccupied;

                                  if (!isOccupied) {
                                    return (
                                      <div key={shift.id} className="flex items-center justify-between text-[11px] text-slate-400 py-1 px-2 bg-white rounded-lg border border-dashed border-slate-200">
                                        <span className="font-semibold">{shift.name}:</span>
                                        <span className="text-emerald-600 font-bold">Livre (Sem Médico)</span>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={shift.id}
                                      className="p-2 bg-white rounded-xl border border-indigo-200 text-slate-800 shadow-2xs space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-black tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                          {shift.name} ({cellInfo.slots.length} vagas)
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleOpenRelocate(
                                              date,
                                              shift.id,
                                              cellInfo.doctor || '',
                                              cellInfo.specialty || '',
                                              room
                                            )
                                          }
                                          className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                                          title="Remanejar para outro consultório"
                                        >
                                          <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                                          <span>Remanejar</span>
                                        </button>
                                      </div>

                                      <div className="text-xs font-black text-slate-900">
                                        {cellInfo.doctor}
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-medium">
                                        {cellInfo.specialty}
                                      </div>
                                      <div className="text-[10px] font-mono text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                                        <span>Horários: {cellInfo.slots[0]?.horario} - {cellInfo.slots[cellInfo.slots.length - 1]?.horario}</span>
                                        <span className="font-bold text-emerald-600">{cellInfo.freeSlots} livres / {cellInfo.bookedSlots} agend.</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: QUADRO GERAL DE HORÁRIOS & RELATÓRIOS (EXCEL / IMPRESSÃO) */}
          {activeTab === 'SCHEDULE_BOARD' && (
            <div className="mt-4 flex-1 flex flex-col overflow-hidden">
              {/* Header & Export Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 shrink-0">
                <div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    Quadro Consolidado de Horários, Médicos & Salas
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Visão executiva completa de escala física com exportação oficial para planilha e emissão de relatório formatado.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-export-csv-schedule"
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Exportar planilha completa (.CSV compatível com Excel e Google Sheets)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Planilha Excel / CSV</span>
                  </button>

                  <button
                    id="btn-print-report-schedule"
                    type="button"
                    onClick={handleOpenReportModal}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Visualizar e Imprimir relatório formatado do quadro de horários"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Relatório</span>
                  </button>
                </div>
              </div>

              {/* Master Table */}
              <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white sticky top-0 z-10 text-xs font-bold">
                    <tr>
                      <th className="p-3 border-b border-slate-800">Data</th>
                      <th className="p-3 border-b border-slate-800">Dia</th>
                      <th className="p-3 border-b border-slate-800">Turno</th>
                      <th className="p-3 border-b border-slate-800">Consultório / Sala</th>
                      <th className="p-3 border-b border-slate-800">Médico Responsável</th>
                      <th className="p-3 border-b border-slate-800">Especialidade</th>
                      <th className="p-3 border-b border-slate-800">Horários de Atendimento</th>
                      <th className="p-3 border-b border-slate-800 text-center">Vagas</th>
                      <th className="p-3 border-b border-slate-800">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-medium">
                    {dateRangeList.map(date => {
                      const diaSemana = getDayOfWeekName(date);
                      return shifts
                        .filter(sh => filtroTurno === 'TODOS' || filtroTurno === sh.id)
                        .map(shift => {
                          return activeRooms.map(room => {
                            const cellInfo = matrixData[date]?.[shift.id]?.[room];
                            if (!cellInfo) return null;

                            const isVacant = !cellInfo.isOccupied;

                            return (
                              <tr
                                key={`${date}_${shift.id}_${room}`}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  isVacant ? 'bg-emerald-50/20 text-slate-600' : 'bg-white text-slate-900'
                                }`}
                              >
                                <td className="p-3 font-mono font-bold text-slate-800">{formatDateBR(date)}</td>
                                <td className="p-3 text-slate-700">{diaSemana}</td>
                                <td className="p-3 font-bold text-indigo-900">{shift.name}</td>
                                <td className="p-3 font-black text-slate-900">{room}</td>
                                <td className="p-3 font-bold">
                                  {cellInfo.doctor || (
                                    <span className="text-emerald-700 font-semibold italic">Disponível (Sem Médico)</span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600">{cellInfo.specialty || '-'}</td>
                                <td className="p-3 font-mono text-[11px] text-slate-600">
                                  {cellInfo.slots.length > 0
                                    ? `${cellInfo.slots[0].horario} às ${cellInfo.slots[cellInfo.slots.length - 1].horario} (${cellInfo.slots.map(s => s.horario).join(', ')})`
                                    : '-'}
                                </td>
                                <td className="p-3 text-center">
                                  {cellInfo.totalSlots > 0 ? (
                                    <span className="font-bold text-slate-900">
                                      {cellInfo.freeSlots}L / {cellInfo.bookedSlots}O
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {isVacant ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900">
                                      LIVRE
                                    </span>
                                  ) : cellInfo.freeSlots > 0 ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                                      PARCIAL
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900">
                                      LOTADA
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        });
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: AUDITORIA DE CONFLITOS DE SALA */}
          {activeTab === 'CONFLICTS' && (
            <div className="mt-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    Auditoria de Conflitos & Sobreposições de Salas
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Verifique e previna que dois ou mais profissionais fiquem alocados na mesma sala física no mesmo horário.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanConflicts}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Verificar Grade Completa</span>
                  </button>

                  {conflicts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoResolveConflicts}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Corrigir Todos os Conflitos Automaticamente</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Content: List of Conflicts or Clean State */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {conflicts.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center my-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-black text-emerald-950">
                      Grade Física 100% Íntegra & Sem Conflitos
                    </h3>
                    <p className="text-xs text-emerald-800 max-w-md mt-1">
                      Nenhuma sobreposição de médicos na mesma sala e mesmo horário foi detectada. O espaço físico está devidamente organizado e seguro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center justify-between font-bold">
                      <span>⚠️ Foram identificados {conflicts.length} conflito(s) de alocação de sala na grade.</span>
                      <span>Clique em resolver para remanejar automaticamente para consultórios livres.</span>
                    </div>

                    {conflicts.map(conf => (
                      <div
                        key={conf.id}
                        className="p-4 bg-white border border-rose-300 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                              Conflito em {conf.sala}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-800">
                              {formatDateBR(conf.data)} às {conf.horario}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700">
                            <strong>Profissionais competindo pelo espaço:</strong> {conf.medicos.join(' VS ')}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Especialidades: {conf.especialidades.join(', ')} • Total de {conf.slots.length} vagas sobrepostas
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleAutoResolveConflicts}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Resolver Conflito</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RELOCATION MODAL POPUP */}
          {relocateModal.open && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-60">
              <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-black text-slate-900">
                      Remanejamento de Sala
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRelocateModal(prev => ({ ...prev, open: false }))}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div><strong>Médico:</strong> {relocateModal.medico}</div>
                    <div><strong>Especialidade:</strong> {relocateModal.especialidade}</div>
                    <div><strong>Data:</strong> {formatDateBR(relocateModal.data)} ({relocateModal.turno})</div>
                    <div><strong>Sala Atual:</strong> <span className="text-rose-600 font-bold">{relocateModal.salaAtual}</span></div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1" htmlFor="select-target-room">
                      Selecione a Nova Sala / Consultório de Destino:
                    </label>
                    <select
                      id="select-target-room"
                      value={relocateModal.targetSala}
                      onChange={(e) => setRelocateModal(prev => ({ ...prev, targetSala: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    >
                      {roomsList
                        .filter(r => r !== relocateModal.salaAtual)
                        .map(r => {
                          const cell = matrixData[relocateModal.data]?.[relocateModal.turno]?.[r];
                          const isVacant = !cell?.isOccupied;
                          return (
                            <option key={r} value={r}>
                              {r} {isVacant ? '(🟢 100% Livre)' : `(⚠️ Ocupado por ${cell?.doctor || ''})`}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRelocateModal(prev => ({ ...prev, open: false }))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteRelocate}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Confirmar Transferência
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* DEDICATED OFFICIAL REPORT VIEWER & PRINT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-70 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[96vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* REPORT MODAL HEADER */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Relatório Oficial de Escala Física & Horários de Consultórios
                  </h3>
                  <p className="text-xs text-slate-500">
                    Documento estruturado para emissão de relatório, impressão e exportação com cabeçalho oficial.
                  </p>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-copy-report-text"
                  type="button"
                  onClick={handleCopyReportText}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Copiar dados do relatório em texto"
                >
                  {reportCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{reportCopied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  id="btn-download-report-html"
                  type="button"
                  onClick={handleDownloadReportHTML}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Baixar arquivo formatado pronto para abrir e imprimir"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Baixar Arquivo (.HTML)</span>
                </button>

                <button
                  id="btn-trigger-print-document"
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Imprimir ou Salvar em PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>

                <button
                  id="btn-close-report-modal"
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Fechar visualização de relatório"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* REPORT BODY PREVIEW (PRINTABLE CANVAS) */}
            <div className="flex-1 overflow-y-auto mt-4 p-4 sm:p-6 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-4">
              
              {/* Official Letterhead Header */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs text-center space-y-1">
                <h2 className="text-base font-black text-slate-900 tracking-wide uppercase">
                  {rules?.nomeClinica || 'Central de Agendamento RSantos'}
                </h2>
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Relatório Oficial de Escala Física, Salas e Quadro de Horários
                </div>
                <div className="text-[11px] text-slate-500">
                  {rules?.enderecoClinica || 'Rua Dr. Luiz Palmier, 726 - Barreto, Niterói - RJ, CEP 24110-310'} • Central de Atendimento: {rules?.telefoneClinica || '(21) 995860846'} • Emissão: {new Date().toLocaleString('pt-BR')}
                </div>
              </div>

              {/* Meta & Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Período Auditado</span>
                  <div className="text-xs font-mono font-black text-slate-900 mt-0.5">
                    {formatDateBR(dataInicial)} a {formatDateBR(dataFinal)}
                  </div>
                  <span className="text-[9px] text-slate-400">({dateRangeList.length} dias)</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Total de Vagas</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {periodStats.totalSlots}
                  </div>
                  <span className="text-[9px] text-slate-400">Na grade selecionada</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Vagas Livres</span>
                  <div className="text-base font-black text-emerald-600 mt-0.5">
                    {periodStats.freeSlots}
                  </div>
                  <span className="text-[9px] text-emerald-700 font-semibold">Disponíveis</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-blue-700">Vagas Agendadas</span>
                  <div className="text-base font-black text-blue-600 mt-0.5">
                    {periodStats.bookedSlots}
                  </div>
                  <span className="text-[9px] text-blue-700 font-semibold">Pacientes marcados</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-purple-700">Taxa Ocupação</span>
                  <div className="text-base font-black text-purple-600 mt-0.5">
                    {periodStats.taxaOcupacao}%
                  </div>
                  <span className="text-[9px] text-purple-700 font-semibold">Média do período</span>
                </div>
              </div>

              {/* EMPTY OCCUPANCY NOTIFICATION IN REPORT */}
              {!periodStats.hasOccupancy && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs flex items-center gap-3 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-black text-amber-950">Aviso: Nenhuma Ocupação de Sala Encontrada no Período</h4>
                    <p className="mt-0.5">
                      Não há médicos escalados ou vagas agendadas para o intervalo de <strong>{formatDateBR(dataInicial)}</strong> até <strong>{formatDateBR(dataFinal)}</strong>. Todos os consultórios estão 100% disponíveis.
                    </p>
                  </div>
                </div>
              )}

              {/* TABLE CONTAINER */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">Dia</th>
                      <th className="p-2.5">Turno</th>
                      <th className="p-2.5">Consultório / Sala</th>
                      <th className="p-2.5">Médico Responsável</th>
                      <th className="p-2.5">Especialidade</th>
                      <th className="p-2.5">Horários</th>
                      <th className="p-2.5 text-center">Vagas</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dateRangeList.map(date => {
                      const diaSemana = getDayOfWeekName(date);
                      return shifts
                        .filter(sh => filtroTurno === 'TODOS' || filtroTurno === sh.id)
                        .map(shift => {
                          return activeRooms.map(room => {
                            const cellInfo = matrixData[date]?.[shift.id]?.[room];
                            if (!cellInfo) return null;

                            const isVacant = !cellInfo.isOccupied;

                            return (
                              <tr
                                key={`report_${date}_${shift.id}_${room}`}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  isVacant ? 'bg-emerald-50/20 text-slate-600' : 'bg-white text-slate-900'
                                }`}
                              >
                                <td className="p-2.5 font-mono font-bold text-slate-800">{formatDateBR(date)}</td>
                                <td className="p-2.5 text-slate-700">{diaSemana}</td>
                                <td className="p-2.5 font-bold text-indigo-900">{shift.name}</td>
                                <td className="p-2.5 font-black text-slate-900">{room}</td>
                                <td className="p-2.5 font-bold">
                                  {cellInfo.doctor || (
                                    <span className="text-emerald-700 font-semibold italic">Disponível (Sem Médico)</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-600">{cellInfo.specialty || '-'}</td>
                                <td className="p-2.5 font-mono text-[11px] text-slate-600">
                                  {cellInfo.slots.length > 0
                                    ? `${cellInfo.slots[0].horario} às ${cellInfo.slots[cellInfo.slots.length - 1].horario}`
                                    : '-'}
                                </td>
                                <td className="p-2.5 text-center font-bold">
                                  {cellInfo.totalSlots > 0 ? `${cellInfo.freeSlots}L / ${cellInfo.bookedSlots}O` : '0'}
                                </td>
                                <td className="p-2.5">
                                  {isVacant ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900">
                                      100% LIVRE
                                    </span>
                                  ) : cellInfo.freeSlots > 0 ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                                      PARCIAL
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900">
                                      LOTADA
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        });
                    })}
                  </tbody>
                </table>
              </div>

              {/* Report Footer */}
              <div className="pt-2 text-center text-[11px] text-slate-400">
                Documento emitido eletronicamente via Sistema Ambulatorial • Todos os horários e escalas sincronizados em tempo real.
              </div>

            </div>

            {/* BOTTOM CLOSE */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar Visualização
              </button>
              <button
                type="button"
                onClick={handlePrintDocument}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Salvar Relatório</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
