import React, { useState, useEffect } from 'react';
import { Appointment, SystemRule } from '../types';
import { buildWhatsAppReminder, openWhatsAppLink } from '../utils/whatsapp';
import { db } from '../storage/db';
import { 
  Send, 
  Copy, 
  Check, 
  MessageSquare, 
  X, 
  Phone, 
  Calendar, 
  User as UserIcon,
  Sparkles,
  ExternalLink,
  Building2,
  PhoneCall,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Share2
} from 'lucide-react';
import { formatDateBR, formatPhone } from '../utils/formatters';

interface WhatsAppModalProps {
  appointment: Appointment | null;
  rules: SystemRule;
  isCustomPhoneMode?: boolean;
  onClose: () => void;
  onAppointmentUpdated?: (updatedApp: Appointment) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  appointment,
  rules,
  isCustomPhoneMode = false,
  onClose,
  onAppointmentUpdated,
}) => {
  if (!appointment) return null;

  // Phone selection mode: 'PATIENT' | 'OPERATOR' | 'CUSTOM'
  const [phoneMode, setPhoneMode] = useState<'PATIENT' | 'OPERATOR' | 'CUSTOM'>(() => {
    if (isCustomPhoneMode) return 'CUSTOM';
    return 'PATIENT';
  });

  // Operator Phone Resolution
  const getOperatorPhone = () => {
    // 1. If currently logged in as operator and matches appointment
    const current = db.getCurrentUser();
    if (current && current.role === 'OPERATOR') {
      const isMatch =
        (appointment.operadorId && appointment.operadorId === current.id) ||
        (appointment.operadorEmail && current.email && appointment.operadorEmail.toLowerCase() === current.email.toLowerCase()) ||
        (appointment.postoId && appointment.postoId === current.postoId);
      if (isMatch && current.telefone && current.telefone.trim()) {
        return current.telefone.trim();
      }
    }

    // 2. Lookup in users registry by ID or Email
    try {
      const users = db.getUsers();
      const op = users.find(u => 
        (appointment.operadorId && u.id === appointment.operadorId) || 
        (appointment.operadorEmail && u.email && u.email.toLowerCase() === appointment.operadorEmail.toLowerCase())
      );
      if (op?.telefone && op.telefone.trim()) {
        return op.telefone.trim();
      }
    } catch {}

    // 3. Fallback to appointment stored operator phone
    if (appointment.operadorTelefone && appointment.operadorTelefone.trim()) {
      return appointment.operadorTelefone.trim();
    }

    return '';
  };
  const operatorPhone = getOperatorPhone();

  const initialMessage = buildWhatsAppReminder(appointment, rules, operatorPhone);
  const [customMessage, setCustomMessage] = useState(initialMessage);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Custom Phone State
  const [customPhone, setCustomPhone] = useState(() => {
    if (isCustomPhoneMode) {
      return appointment.paciente.tel || '';
    }
    return appointment.paciente.tel || '';
  });

  // Checkbox: Save custom phone to the appointment
  const [saveToAppointment, setSaveToAppointment] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Active target phone based on mode
  const getActivePhone = () => {
    if (phoneMode === 'PATIENT') return appointment.paciente.tel || '';
    if (phoneMode === 'OPERATOR') return operatorPhone;
    return customPhone;
  };

  const currentTargetPhone = getActivePhone();
  const rawDigits = currentTargetPhone.replace(/\D/g, '');
  const isValidPhoneNumber = rawDigits.length >= 10 && rawDigits.length <= 13;

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyAll = () => {
    const fullText = `*Telefone de Contato:* ${currentTargetPhone}\n*Paciente:* ${appointment.paciente.paciente}\n\n${customMessage}`;
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  const handleSend = () => {
    setPhoneError('');
    if (!currentTargetPhone.trim()) {
      setPhoneError('Por favor, informe um número de telefone com DDD para realizar o envio.');
      return;
    }
    if (!isValidPhoneNumber) {
      setPhoneError('O número de telefone deve conter pelo menos 10 dígitos com DDD obrigatório.');
      return;
    }

    // If operator checked to update the patient's record on this appointment
    if (saveToAppointment && phoneMode === 'CUSTOM' && customPhone.trim()) {
      const updated = db.updateAppointmentPhone(appointment.id, customPhone.trim());
      if (updated && onAppointmentUpdated) {
        onAppointmentUpdated(updated);
      }
    }

    openWhatsAppLink(currentTargetPhone, customMessage);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
              isCustomPhoneMode || phoneMode === 'CUSTOM'
                ? 'bg-blue-900 text-blue-300 border-blue-800'
                : 'bg-emerald-950 text-emerald-400 border-emerald-900'
            }`}>
              {isCustomPhoneMode || phoneMode === 'CUSTOM' ? (
                <Smartphone className="w-5 h-5" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                  Notificação Direta & Envio
                </span>
                <span className={`text-[10px] px-2 py-0.2 rounded-md font-bold font-mono ${
                  isCustomPhoneMode || phoneMode === 'CUSTOM'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {isCustomPhoneMode || phoneMode === 'CUSTOM' ? 'Número Opcional / Customizado' : 'Envio Direto'}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 leading-tight mt-0.5">
                Lembrete de Consulta via WhatsApp
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Summary Bento Banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900">{appointment.paciente.paciente}</span>
              <span className="text-slate-400">•</span>
              <span className="text-blue-700 font-bold">{appointment.especialidade}</span>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5 font-mono">
              📅 {formatDateBR(appointment.data)} às {appointment.horario} • {appointment.medico || 'Médico Especialista'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono border border-blue-200">
              Posto: {appointment.postoId}
            </span>
          </div>
        </div>

        {/* TELEFONE DE DESTINO / ENVIO - AMPLO ESPAÇO PARA DIGITAÇÃO E ESCOLHA */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>Destino do WhatsApp / Número para Envio:</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">DDD obrigatório</span>
          </div>

          {/* Selector Tabs: Paciente, WhatsApp do Operador, Personalizado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              id="tab-phone-patient"
              onClick={() => {
                setPhoneMode('PATIENT');
                setPhoneError('');
              }}
              className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                phoneMode === 'PATIENT'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px]">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Tel. do Paciente</span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                {appointment.paciente.tel || 'Sem telefone'}
              </p>
            </button>

            <button
              type="button"
              id="tab-phone-operator"
              onClick={() => {
                setPhoneMode('OPERATOR');
                setPhoneError('');
              }}
              className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                phoneMode === 'OPERATOR'
                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px]">
                <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">WhatsApp do Operador</span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                {operatorPhone || 'Não informado'}
              </p>
            </button>

            <button
              type="button"
              id="tab-phone-custom"
              onClick={() => {
                setPhoneMode('CUSTOM');
                setPhoneError('');
              }}
              className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                phoneMode === 'CUSTOM'
                  ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px]">
                <PhoneCall className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Digitar Outro Número</span>
              </div>
              <p className="text-[10px] font-mono text-indigo-600 mt-1 truncate">
                {customPhone ? customPhone : 'Opcional / Novo'}
              </p>
            </button>
          </div>

          {/* Input Box when in CUSTOM mode or always editable */}
          <div className="space-y-2 pt-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4 text-blue-600" />
              </div>
              <input
                id="input-wa-custom-phone"
                type="text"
                maxLength={16}
                value={phoneMode === 'CUSTOM' ? customPhone : currentTargetPhone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setCustomPhone(formatted);
                  if (phoneMode !== 'CUSTOM') {
                    setPhoneMode('CUSTOM');
                  }
                  setPhoneError('');
                }}
                placeholder="(00) 00000-0000"
                className="w-full pl-9 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
              <div className="absolute inset-y-0 right-1 flex items-center pr-2">
                {isValidPhoneNumber ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md font-mono border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Válido
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Incompleto
                  </span>
                )}
              </div>
            </div>

            {/* Helper explanation box */}
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span>
                  <strong>Dica de Envio:</strong> Se o número do paciente não estiver salvo na sua agenda, você pode digitar o número institucional ou de outro aparelho para enviar a mensagem, ou clicar em <strong>"Copiar Mensagem"</strong> para colar no WhatsApp Web.
                </span>
              </div>
            </div>

            {/* Checkbox to persist custom phone in appointment */}
            {phoneMode === 'CUSTOM' && customPhone !== appointment.paciente.tel && (
              <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToAppointment}
                  onChange={(e) => setSaveToAppointment(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-800">
                  Salvar este novo telefone ({customPhone || '...'}) no cadastro da consulta deste paciente
                </span>
              </label>
            )}

            {phoneError && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{phoneError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Message Editor / Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono" htmlFor="wa-message-text">
              Texto do Lembrete Formatado
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {customMessage.length} caracteres
            </span>
          </div>
          <textarea
            id="wa-message-text"
            rows={8}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden leading-relaxed"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Você pode personalizar o texto livremente ou adicionar avisos (ex: jejum, documentos, horário de chegada).
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-copy-wa-text"
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Copiar texto da mensagem para a área de transferência"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Mensagem Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Fechar
            </button>

            <button
              id="btn-open-wa-direct"
              type="button"
              onClick={handleSend}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              title={`Enviar mensagem para ${currentTargetPhone}`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Abrir no WhatsApp ({currentTargetPhone || 'Sem Número'})</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

