import React, { useState } from 'react';
import { Appointment, Slot, Posto, SystemRule } from '../types';
import { 
  CheckSquare, 
  Search, 
  Send, 
  MessageSquarePlus,
  Printer, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Phone, 
  Building, 
  Calendar, 
  Clock, 
  Filter,
  UserCheck,
  Ban
} from 'lucide-react';
import { formatDateBR } from '../utils/formatters';

interface AdminAppointmentsProps {
  appointments: Appointment[];
  slots: Slot[];
  postos: Posto[];
  rules: SystemRule;
  onApproveCancel: (appointmentId: string) => void;
  onRejectCancel: (appointmentId: string) => void;
  onOpenWhatsApp: (app: Appointment, isCustomPhoneMode?: boolean) => void;
  onOpenReceipt: (app: Appointment) => void;
}

export const AdminAppointments: React.FC<AdminAppointmentsProps> = ({
  appointments,
  slots,
  postos,
  rules,
  onApproveCancel,
  onRejectCancel,
  onOpenWhatsApp,
  onOpenReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING_CANCEL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosto, setFilterPosto] = useState('ALL');
  const [filterSpec, setFilterSpec] = useState('ALL');

  const pendingCancels = appointments.filter(a => a.status === 'CANCEL_REQUESTED');
  const activeApps = appointments.filter(a => a.status !== 'CANCELLED');

  const filteredAppointments = appointments.filter(app => {
    const matchesTab = activeTab === 'ALL' ? app.status !== 'CANCELLED' : app.status === 'CANCEL_REQUESTED';
    const matchesPosto = filterPosto === 'ALL' || app.postoId === filterPosto;
    const matchesSpec = filterSpec === 'ALL' || app.especialidade === filterSpec;
    const matchesSearch = 
      app.paciente.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.paciente.cpf.includes(searchTerm) ||
      app.paciente.sus.includes(searchTerm) ||
      app.operadorNome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesPosto && matchesSpec && matchesSearch;
  }).sort((a, b) => a.data.localeCompare(b.data));

  // Unique specialties
  const uniqueSpecs = Array.from(new Set(appointments.map(a => a.especialidade))).sort();

  return (
    <div className="space-y-5">
      {/* Top Bento Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
              Painel Operacional
            </span>
          </div>
          <h2 className="text-base font-black text-slate-900 mt-1">
            Gerenciamento Geral de Agendamentos
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Acompanhe todas as consultas marcadas por todos os postos de coleta, autorize solicitações de cancelamento e envie lembretes via WhatsApp.
          </p>
        </div>

        {pendingCancels.length > 0 && (
          <button
            onClick={() => setActiveTab('PENDING_CANCEL')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{pendingCancels.length} Cancelamentos Pendentes</span>
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2">
        <button
          id="tab-all-appointments"
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          Todos os Agendamentos Ativos ({activeApps.length})
        </button>

        <button
          id="tab-pending-cancels"
          onClick={() => setActiveTab('PENDING_CANCEL')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'PENDING_CANCEL'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Solicitações de Cancelamento ({pendingCancels.length})
        </button>
      </div>

      {/* Filters Bar & Table Container */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar paciente, CPF, SUS ou operador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <select
              value={filterPosto}
              onChange={(e) => setFilterPosto(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Todos os Postos (IDs)</option>
              {postos.map(p => (
                <option key={p.id} value={p.id}>ID {p.id} - {p.origem}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterSpec}
              onChange={(e) => setFilterSpec(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Todas as Especialidades</option>
              {uniqueSpecs.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Paciente & Contato</th>
                <th className="py-3 px-4">Documentos (CPF / SUS)</th>
                <th className="py-3 px-4">Data & Horário</th>
                <th className="py-3 px-4">Especialidade / Médico</th>
                <th className="py-3 px-4">Posto / Operador</th>
                <th className="py-3 px-4">Situação</th>
                <th className="py-3 px-4 text-right">Ações do Administrador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhum agendamento encontrado para esta visualização.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map(app => {
                  const isPendingCancel = app.status === 'CANCEL_REQUESTED';

                  return (
                    <tr 
                      key={app.id} 
                      className={`transition-colors ${
                        isPendingCancel ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                      }`}
                    >
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
                        <div className="font-bold text-blue-900">{formatDateBR(app.data)}</div>
                        <div className="text-[11px] font-mono text-slate-600 font-semibold">{app.horario}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{app.especialidade}</div>
                        <div className="text-[11px] text-slate-500">{app.medico || 'Médico Plantonista'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {app.postoId}
                        </span>
                        <div className="text-[11px] text-slate-600 mt-1 truncate max-w-[140px]" title={app.origem}>
                          {app.origem}
                        </div>
                        <div className="text-[10px] text-slate-400">Op: {app.operadorNome}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {app.status === 'CONFIRMED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Confirmado
                          </span>
                        )}
                        {app.status === 'CANCEL_REQUESTED' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              ⚠️ Cancelamento Solicitado
                            </span>
                            {app.motivoCancelamento && (
                              <p className="text-[10px] text-amber-800 mt-1 italic max-w-xs">
                                "{app.motivoCancelamento}"
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPendingCancel ? (
                            <>
                              <button
                                id={`btn-approve-cancel-${app.id}`}
                                onClick={() => {
                                  if (window.confirm(`Autorizar cancelamento da consulta de ${app.paciente.paciente}? A vaga será liberada imediatamente para novos agendamentos.`)) {
                                    onApproveCancel(app.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
                                title="Autorizar Cancelamento e Liberar Vaga"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprovar & Liberar Vaga</span>
                              </button>

                              <button
                                id={`btn-reject-cancel-${app.id}`}
                                onClick={() => {
                                  if (window.confirm(`Manter a consulta de ${app.paciente.paciente} confirmada?`)) {
                                    onRejectCancel(app.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                                title="Recusar Cancelamento"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Recusar</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* WhatsApp Reminder (Direct - Tel Paciente) */}
                              <button
                                id={`btn-admin-wa-direct-${app.id}`}
                                onClick={() => onOpenWhatsApp(app, false)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Disparar Lembrete Direto WhatsApp (Tel. do Paciente)"
                              >
                                <Send className="w-4 h-4" />
                              </button>

                              {/* WhatsApp Reminder (Opcional - Digitar / Escolher Número) */}
                              <button
                                id={`btn-admin-wa-custom-${app.id}`}
                                onClick={() => onOpenWhatsApp(app, true)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Lembrete WhatsApp com Telefone Opcional / Institucional (Digitar Número)"
                              >
                                <MessageSquarePlus className="w-4 h-4" />
                              </button>

                              <button
                                id={`btn-admin-receipt-${app.id}`}
                                onClick={() => onOpenReceipt(app)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Visualizar / Imprimir Comprovante"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              <button
                                id={`btn-admin-cancel-${app.id}`}
                                onClick={() => {
                                  if (window.confirm(`Deseja cancelar o agendamento de ${app.paciente.paciente}? A vaga voltará a ficar disponível imediatamente.`)) {
                                    onApproveCancel(app.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancelar Agendamento (Master)"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
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
    </div>
  );
};
