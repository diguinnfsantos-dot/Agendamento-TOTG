import { Slot, Appointment } from '../types';
import { formatDateBR } from './formatters';

export interface ExportRow {
  statusVaga: 'AGENDADA' | 'DISPONÍVEL';
  data: string;
  horario: string;
  especialidade: string;
  medico: string;
  postoId: string;
  origem: string;
  operador: string;
  pacienteNome: string;
  pacienteCpf: string;
  pacienteSus: string;
  pacienteNasc: string;
  pacienteMae: string;
  pacienteTel: string;
  pacienteEndereco: string;
  pacienteCep: string;
  statusAgendamento: string;
}

export function buildFullSlotsExportData(slots: Slot[], appointments: Appointment[]): ExportRow[] {
  const appMap = new Map<string, Appointment>();
  appointments.forEach(app => {
    appMap.set(app.slotId, app);
  });

  return slots.map(slot => {
    const app = appMap.get(slot.id);
    const isAgendado = slot.status === 'AGENDADO' && !!app;

    return {
      statusVaga: isAgendado ? 'AGENDADA' : 'DISPONÍVEL',
      data: formatDateBR(slot.data),
      horario: slot.horario,
      especialidade: slot.especialidade,
      medico: slot.medico || 'Não informado',
      postoId: isAgendado && app ? app.postoId : '-',
      origem: isAgendado && app ? app.origem : '-',
      operador: isAgendado && app ? app.operadorNome : '-',
      pacienteNome: isAgendado && app ? app.paciente.paciente : '-',
      pacienteCpf: isAgendado && app ? app.paciente.cpf : '-',
      pacienteSus: isAgendado && app ? app.paciente.sus : '-',
      pacienteNasc: isAgendado && app ? formatDateBR(app.paciente.nascido) : '-',
      pacienteMae: isAgendado && app ? app.paciente.mae : '-',
      pacienteTel: isAgendado && app ? app.paciente.tel : '-',
      pacienteEndereco: isAgendado && app ? app.paciente.endereco : '-',
      pacienteCep: isAgendado && app ? app.paciente.cep : '-',
      statusAgendamento: isAgendado && app ? (app.status === 'CANCEL_REQUESTED' ? 'Cancelamento Solicitado' : 'Confirmado') : 'Livre',
    };
  });
}

export function exportToCSV(rows: ExportRow[], filename = 'relatorio_vagas_clinica.csv') {
  const headers = [
    'STATUS DA VAGA',
    'DATA',
    'HORÁRIO',
    'ESPECIALIDADE',
    'MÉDICO',
    'ID POSTO',
    'ORIGEM',
    'OPERADOR RESPONSÁVEL',
    'PACIENTE',
    'CPF',
    'CARTÃO SUS',
    'DATA NASCIMENTO',
    'NOME DA MÃE',
    'TELEFONE/WHATSAPP',
    'ENDEREÇO',
    'CEP',
    'SITUAÇÃO',
  ];

  const csvContent = [
    headers.join(';'),
    ...rows.map(r => [
      `"${r.statusVaga}"`,
      `"${r.data}"`,
      `"${r.horario}"`,
      `"${r.especialidade}"`,
      `"${r.medico}"`,
      `"${r.postoId}"`,
      `"${r.origem}"`,
      `"${r.operador}"`,
      `"${r.pacienteNome}"`,
      `"${r.pacienteCpf}"`,
      `"${r.pacienteSus}"`,
      `"${r.pacienteNasc}"`,
      `"${r.pacienteMae}"`,
      `"${r.pacienteTel}"`,
      `"${r.pacienteEndereco}"`,
      `"${r.pacienteCep}"`,
      `"${r.statusAgendamento}"`,
    ].join(';')),
  ].join('\r\n');

  // Adiciona BOM para UTF-8 no Excel e Google Sheets reconhecerem acentos
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function copyTableToClipboard(rows: ExportRow[]): Promise<void> {
  const headers = [
    'Status Vaga', 'Data', 'Horário', 'Especialidade', 'Médico', 'ID Posto', 
    'Origem', 'Operador', 'Paciente', 'CPF', 'SUS', 'Nascimento', 'Mãe', 'Telefone', 'Endereço', 'CEP', 'Situação'
  ];

  const tsvContent = [
    headers.join('\t'),
    ...rows.map(r => [
      r.statusVaga,
      r.data,
      r.horario,
      r.especialidade,
      r.medico,
      r.postoId,
      r.origem,
      r.operador,
      r.pacienteNome,
      r.pacienteCpf,
      r.pacienteSus,
      r.pacienteNasc,
      r.pacienteMae,
      r.pacienteTel,
      r.pacienteEndereco,
      r.pacienteCep,
      r.statusAgendamento,
    ].join('\t')),
  ].join('\n');

  return navigator.clipboard.writeText(tsvContent);
}
