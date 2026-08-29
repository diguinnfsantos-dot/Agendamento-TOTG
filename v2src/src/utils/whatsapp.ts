import { Appointment, SystemRule } from '../types';
import { formatDateBR, cleanPhoneForWhatsApp } from './formatters';
import { db } from '../storage/db';

export function buildWhatsAppReminder(appointment: Appointment, rules: SystemRule, operatorPhone?: string): string {
  let template = rules.mensagemPadraoWhatsApp || '';
  
  // Resolve the telephone number of the operator who booked the appointment
  let opPhone = operatorPhone && operatorPhone.trim() ? operatorPhone.trim() : '';

  if (!opPhone) {
    const current = db.getCurrentUser();
    if (current && current.role === 'OPERATOR') {
      const isThisOp = 
        (appointment.operadorId && appointment.operadorId === current.id) ||
        (appointment.operadorEmail && current.email && appointment.operadorEmail.toLowerCase() === current.email.toLowerCase()) ||
        (appointment.postoId && appointment.postoId === current.postoId);
      if (isThisOp && current.telefone && current.telefone.trim()) {
        opPhone = current.telefone.trim();
      }
    }
  }

  if (!opPhone) {
    try {
      const users = db.getUsers();
      const op = users.find(u => 
        (appointment.operadorId && u.id === appointment.operadorId) || 
        (appointment.operadorEmail && u.email && u.email.toLowerCase() === appointment.operadorEmail.toLowerCase())
      );
      if (op?.telefone && op.telefone.trim()) {
        opPhone = op.telefone.trim();
      }
    } catch {}
  }

  if (!opPhone && appointment.operadorTelefone && appointment.operadorTelefone.trim()) {
    opPhone = appointment.operadorTelefone.trim();
  }

  if (!opPhone) {
    opPhone = '';
  }

  const replacements: Record<string, string> = {
    '{PACIENTE}': appointment.paciente.paciente || '',
    '{CPF}': appointment.paciente.cpf || '',
    '{SUS}': appointment.paciente.sus || '',
    '{DATA}': formatDateBR(appointment.data),
    '{HORARIO}': appointment.horario,
    '{ESPECIALIDADE}': appointment.especialidade,
    '{MEDICO}': appointment.medico || 'Médico Plantonista / Especialista',
    '{CLINICA}': rules.nomeClinica || 'Clínica Médica',
    '{TEL_CLINICA}': opPhone,
    '{TEL_OPERADOR}': opPhone,
    '{ENDERECO_CLINICA}': rules.enderecoClinica || '',
    '{ORIGEM}': appointment.origem || 'Posto de Atendimento',
    '{ID_POSTO}': appointment.postoId || '',
    '{OPERADOR}': appointment.operadorNome || '',
  };

  for (const [placeholder, val] of Object.entries(replacements)) {
    template = template.split(placeholder).join(val);
  }

  // Replace any residual central or admin numbers with the operator's phone if operator phone is available
  if (opPhone) {
    template = template.replace(/\(?21\)?\s*99586-?0846/g, opPhone);
    template = template.replace(/\(?21\)?\s*96955-?8819/g, opPhone);
  }

  return template;
}

export function openWhatsAppLink(phone: string, text: string) {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
