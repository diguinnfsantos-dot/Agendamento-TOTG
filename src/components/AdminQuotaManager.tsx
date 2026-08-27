import React, { useState } from 'react';
import { SystemRule, SpecialtyQuotaRule, Posto, Appointment, Slot } from '../types';
import { db } from '../storage/db';
import { 
  Sliders, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  HelpCircle,
  Stethoscope,
  Info,
  Calendar,
  Flame,
  Award
} from 'lucide-react';
import { calculateDaysToSlot, getSlotExpirationStatus, getSpecialtyRule } from '../utils/quotaEngine';

interface AdminQuotaManagerProps {
  rules: SystemRule;
  postos: Posto[];
  appointments: Appointment[];
  slots: Slot[];
  onRulesUpdated: (newRules: SystemRule) => void;
}

export const AdminQuotaManager: React.FC<AdminQuotaManagerProps> = ({
  rules,
  postos,
  appointments,
  slots,
  onRulesUpdated,
}) => {
  const [generalQuota, setGeneralQuota] = useState<number>(rules.maxVagasPorId || 3);
  const [repescagemDays, setRepescagemDays] = useState<number>(rules.diasParaRepescagemVencimento ?? 5);
  
  // Specialty quotas state dictionary
  const [specialtyQuotas, setSpecialtyQuotas] = useState<Record<string, SpecialtyQuotaRule>>(() => {
    return rules.cotasPorEspecialidade ? { ...rules.cotasPorEspecialidade } : {};
  });

  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecQuota, setNewSpecQuota] = useState(3);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [selectedFilterSpec, setSelectedFilterSpec] = useState<string>('ALL');

  // List of all unique specialties discovered from slots + registered doctors + standard list
  const allKnownSpecialties = Array.from(
    new Set([
      'Cardiologia',
      'Dermatologia',
      'Oftalmologia',
      'Clínica Geral',
      'Ortopedia',
      'Ginecologia',
      'Pediatria',
      'Neurologia',
      'Endocrinologia',
      ...slots.map(s => s.especialidade),
      ...Object.keys(specialtyQuotas),
    ])
  ).filter(Boolean).sort();

  // Ensure all known specialties have an entry in state
  const getRuleForSpec = (spec: string): SpecialtyQuotaRule => {
    if (specialtyQuotas[spec]) {
      return specialtyQuotas[spec];
    }
    return {
      especialidade: spec,
      maxVagasPorId: generalQuota,
      cotaLivreEvento: false,
    };
  };

  const handleUpdateQuotaValue = (spec: string, value: number) => {
    const current = getRuleForSpec(spec);
    const updated: SpecialtyQuotaRule = {
      ...current,
      maxVagasPorId: Math.max(1, Math.min(50, value)),
    };
    setSpecialtyQuotas(prev => ({ ...prev, [spec]: updated }));
  };

  const handleToggleCotaLivre = (spec: string) => {
    const current = getRuleForSpec(spec);
    const updated: SpecialtyQuotaRule = {
      ...current,
      cotaLivreEvento: !current.cotaLivreEvento,
      descricaoEvento: !current.cotaLivreEvento ? (current.descricaoEvento || 'Mutirão / Ação Social') : '',
    };
    setSpecialtyQuotas(prev => ({ ...prev, [spec]: updated }));
  };

  const handleUpdateDescription = (spec: string, desc: string) => {
    const current = getRuleForSpec(spec);
    const updated: SpecialtyQuotaRule = {
      ...current,
      descricaoEvento: desc,
    };
    setSpecialtyQuotas(prev => ({ ...prev, [spec]: updated }));
  };

  const handleUpdateMotivo = (spec: string, motivo: string) => {
    const current = getRuleForSpec(spec);
    const updated: SpecialtyQuotaRule = {
      ...current,
      motivoRestricao: motivo,
    };
    setSpecialtyQuotas(prev => ({ ...prev, [spec]: updated }));
  };

  const handleAddNewSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecName.trim()) return;
    const cleanName = newSpecName.trim();
    const updated: SpecialtyQuotaRule = {
      especialidade: cleanName,
      maxVagasPorId: Math.max(1, newSpecQuota),
      cotaLivreEvento: false,
    };
    setSpecialtyQuotas(prev => ({ ...prev, [cleanName]: updated }));
    setNewSpecName('');
    setNewSpecQuota(3);
    setShowAddForm(false);
  };

  const handleSaveAllRules = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Merge all known specialties into final dictionary
    const finalCotas: Record<string, SpecialtyQuotaRule> = {};
    allKnownSpecialties.forEach(spec => {
      finalCotas[spec] = getRuleForSpec(spec);
    });

    const updatedRules: SystemRule = {
      ...rules,
      maxVagasPorId: generalQuota,
      diasParaRepescagemVencimento: repescagemDays,
      cotasPorEspecialidade: finalCotas,
    };

    db.saveRules(updatedRules);
    db.addLog(
      'Rodrigo Santos (Admin Master)',
      'admin@klinica.com',
      'REGRAS_COTAS_ATUALIZADAS',
      `Regulamentação de cotas por especialidade atualizada. Cota geral: ${generalQuota} vagas. Repescagem: ≤ ${repescagemDays} dias.`,
      'SUCESSO'
    );

    onRulesUpdated(updatedRules);
    setSaveSuccessMsg('Regras de cotas por especialidade e repescagem automática salvas com sucesso!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleResetToDefaults = () => {
    if (!window.confirm('Deseja restaurar a matriz de cotas para as configurações recomendadas padrão?')) return;
    
    const defaults: Record<string, SpecialtyQuotaRule> = {
      'Cardiologia': { especialidade: 'Cardiologia', maxVagasPorId: 5, cotaLivreEvento: false, descricaoEvento: '' },
      'Dermatologia': { especialidade: 'Dermatologia', maxVagasPorId: 8, cotaLivreEvento: false, descricaoEvento: '' },
      'Oftalmologia': { especialidade: 'Oftalmologia', maxVagasPorId: 1, cotaLivreEvento: false, motivoRestricao: 'Apenas 1 especialista atuando' },
      'Clínica Geral': { especialidade: 'Clínica Geral', maxVagasPorId: 4, cotaLivreEvento: false, descricaoEvento: '' },
      'Ortopedia': { especialidade: 'Ortopedia', maxVagasPorId: 3, cotaLivreEvento: false, descricaoEvento: '' },
      'Ginecologia': { especialidade: 'Ginecologia', maxVagasPorId: 3, cotaLivreEvento: false, descricaoEvento: '' },
      'Pediatria': { especialidade: 'Pediatria', maxVagasPorId: 3, cotaLivreEvento: false, descricaoEvento: '' },
      'Neurologia': { especialidade: 'Neurologia', maxVagasPorId: 2, cotaLivreEvento: false, descricaoEvento: '' },
      'Endocrinologia': { especialidade: 'Endocrinologia', maxVagasPorId: 2, cotaLivreEvento: false, descricaoEvento: '' },
    };

    setGeneralQuota(3);
    setRepescagemDays(5);
    setSpecialtyQuotas(defaults);

    const updatedRules: SystemRule = {
      ...rules,
      maxVagasPorId: 3,
      diasParaRepescagemVencimento: 5,
      cotasPorEspecialidade: defaults,
    };

    db.saveRules(updatedRules);
    onRulesUpdated(updatedRules);
    setSaveSuccessMsg('Matriz de cotas restaurada para os padrões recomendados.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Active appointments summary per Posto x Specialty
  const activeApps = appointments.filter(a => a.status !== 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* HEADER BANNER: REGULAÇÃO DE COTAS POR ESPECIALIDADE */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-blue-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner shrink-0 mt-0.5">
              <Sliders className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 font-mono">
                  Regulação Médica & Distribuição de Vagas
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Repescagem Automática (≤ {repescagemDays} dias)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Cota Livre p/ Mutirões
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1 tracking-tight">
                Regulamentação de Cotas por Especialidade & Repescagem de Vencimento
              </h2>
              <p className="text-xs text-blue-200 mt-1 max-w-3xl leading-relaxed">
                As cotas de agendamento são aplicadas <strong>individualmente por especialidade</strong> para cada ID Posto. Vagas com vencimento em até <strong>5 dias</strong> entram automaticamente em <strong>Repescagem Livre</strong> para todos os postos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Restaurar valores padrão"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAllRules()}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/30 transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Todas as Regras</span>
            </button>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-3 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SECTION 1: PARÂMETROS GERAIS DE REPESCAGEM & COTA PADRÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* CARD A: REPESCAGEM AUTOMÁTICA POR VENCIMENTO (INEGOCIÁVEL: ≤ 5 DIAS) */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent bg-white p-5 sm:p-6 rounded-2xl border border-amber-300 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 font-mono">
                  Regra Automática Inegociável
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Repescagem Automática por Vencimento (≤ 5 dias)
                </h3>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 font-mono">
              Ativo
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Quando a data de atendimento estiver a <strong>5 dias ou menos</strong> do vencimento, o sistema <strong>remaneja automaticamente</strong> essas vagas para o regime de <strong>Repescagem Automática</strong>. Qualquer ID Posto pode agendar livremente sem travar a sua cota regular.
          </p>

          <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between gap-4">
            <div className="text-xs">
              <span className="font-bold text-slate-800">Janela de Repescagem:</span>
              <p className="text-[11px] text-slate-500">Dias antes da data da consulta para liberação livre</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="input-repescagem-days"
                type="number"
                min={1}
                max={15}
                value={repescagemDays}
                onChange={(e) => setRepescagemDays(Math.max(1, parseInt(e.target.value) || 5))}
                className="w-16 px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-center font-bold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-xs font-bold text-slate-600">dias</span>
            </div>
          </div>
        </div>

        {/* CARD B: COTA PADRÃO GERAL POR ESPECIALIDADE */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 font-mono">
                  Regra Geral de Partilha
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Cota Padrão Geral por Especialidade
                </h3>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200 font-mono">
              Padrão
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Número padrão de vagas disponibilizadas para cada ID Posto para especialidades que não possuam cota específica personalizada na tabela abaixo. O controle é compartilhado entre operadores do mesmo ID.
          </p>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="text-xs">
              <span className="font-bold text-slate-800">Cota Geral Base:</span>
              <p className="text-[11px] text-slate-500">Vagas padrão por especialidade para cada ID Posto</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="input-general-quota"
                type="number"
                min={1}
                max={50}
                value={generalQuota}
                onChange={(e) => setGeneralQuota(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-600">vagas / ID</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TABELA DE COTAS INDIVIDUALIZADAS POR ESPECIALIDADE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Matriz de Especialidades
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                {allKnownSpecialties.length} Especialidades Ativas
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-0.5">
              Configuração Específica de Cotas por Especialidade Médica
            </h3>
            <p className="text-xs text-slate-500">
              Ajuste as vagas de acordo com a disponibilidade médica (ex: 5 para Cardiologia, 8 para Dermatologia, 1 para Oftalmologia ou Cota Livre para Mutirões).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Nova Especialidade</span>
            </button>
          </div>
        </div>

        {/* Form para adicionar especialidade customizada */}
        {showAddForm && (
          <form onSubmit={handleAddNewSpecialty} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3 animate-fadeIn">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Adicionar Especialidade na Grade de Cotas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono mb-1">
                  Nome da Especialidade
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cardiologia Pediátrica, Urologia, Psiquiatria..."
                  value={newSpecName}
                  onChange={(e) => setNewSpecName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono mb-1">
                  Cota de Vagas por ID Posto
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newSpecQuota}
                    onChange={(e) => setNewSpecQuota(parseInt(e.target.value) || 3)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shrink-0 cursor-pointer shadow-xs"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Grade de Cards de Especialidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allKnownSpecialties.map(spec => {
            const rule = getRuleForSpec(spec);
            const isCotaLivre = rule.cotaLivreEvento;
            
            // Total slots in schedule for this specialty
            const totalSlotsInSchedule = slots.filter(s => s.especialidade === spec).length;
            const availableSlotsInSchedule = slots.filter(s => s.especialidade === spec && s.status === 'DISPONIVEL').length;
            const repescagemSlotsInSchedule = slots.filter(s => {
              if (s.especialidade !== spec || s.status !== 'DISPONIVEL') return false;
              const days = calculateDaysToSlot(s.data);
              return days >= 0 && days <= repescagemDays;
            }).length;

            return (
              <div
                key={spec}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCotaLivre
                    ? 'bg-emerald-50/60 border-emerald-300 shadow-xs ring-1 ring-emerald-400/30'
                    : rule.maxVagasPorId <= 1
                      ? 'bg-amber-50/50 border-amber-300 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isCotaLivre ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                      }`}>
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">
                          {spec}
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          {availableSlotsInSchedule} vagas livres na agenda
                        </span>
                      </div>
                    </div>

                    {isCotaLivre ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-600 text-white border border-emerald-700 shadow-2xs">
                        COTA LIVRE
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 font-mono">
                        {rule.maxVagasPorId} {rule.maxVagasPorId === 1 ? 'vaga/ID' : 'vagas/ID'}
                      </span>
                    )}
                  </div>

                  {/* Informações de Vagas & Repescagem */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Total na Agenda:</span>
                      <strong className="text-slate-800">{totalSlotsInSchedule} horários</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Em Repescagem (≤5d):</span>
                      <strong className={repescagemSlotsInSchedule > 0 ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                        {repescagemSlotsInSchedule} vagas livres
                      </strong>
                    </div>
                  </div>

                  {/* Cota Input e Controles */}
                  <div className="space-y-2 text-xs">
                    {!isCotaLivre && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                          Vagas permitidas por ID Posto:
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuotaValue(spec, rule.maxVagasPorId - 1)}
                            disabled={rule.maxVagasPorId <= 1}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={rule.maxVagasPorId}
                            onChange={(e) => handleUpdateQuotaValue(spec, parseInt(e.target.value) || 1)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-black text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuotaValue(spec, rule.maxVagasPorId + 1)}
                            disabled={rule.maxVagasPorId >= 50}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Toggle Cota Livre para Mutirões / Ações Sociais */}
                    <div className="pt-2 border-t border-slate-200/70">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cota Livre (Mutirão / Ação Social)</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={isCotaLivre}
                          onChange={() => handleToggleCotaLivre(spec)}
                          className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
                        />
                      </label>

                      {isCotaLivre && (
                        <div className="mt-2 space-y-1">
                          <input
                            type="text"
                            placeholder="Nome do Evento (ex: Mutirão da Cardiologia)"
                            value={rule.descricaoEvento || ''}
                            onChange={(e) => handleUpdateDescription(spec, e.target.value)}
                            className="w-full px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs text-emerald-900 font-semibold focus:ring-1 focus:ring-emerald-500 placeholder:text-emerald-400"
                          />
                          <p className="text-[10px] text-emerald-700 leading-tight">
                            Sem limites de vagas para qualquer Posto durante este evento.
                          </p>
                        </div>
                      )}

                      {!isCotaLivre && rule.maxVagasPorId <= 1 && (
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="Justificativa (ex: Apenas 1 médico atendendo)"
                            value={rule.motivoRestricao || ''}
                            onChange={(e) => handleUpdateMotivo(spec, e.target.value)}
                            className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-[11px] text-amber-900 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer status */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Regra Ativa</span>
                  <span className="font-mono">{isCotaLivre ? 'Ilimitada' : `${rule.maxVagasPorId} vagas`}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Lembre-se de clicar no botão abaixo para persistir as alterações na base de dados de todos os postos.
          </p>
          <button
            type="button"
            onClick={() => handleSaveAllRules()}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações de Cotas</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: MONITOR DE OCUPAÇÃO DE COTAS EM TEMPO REAL (POSTOS x ESPECIALIDADES) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Auditoria & Monitoramento
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Tempo Real
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-0.5">
              Matriz de Consumo de Cotas por Posto & Especialidade
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhe quantas vagas foram consumidas por cada ID Posto e o status de cada especialidade
            </p>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono mb-1">Filtrar Especialidade</label>
            <select
              value={selectedFilterSpec}
              onChange={(e) => setSelectedFilterSpec(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Todas as Especialidades</option>
              {allKnownSpecialties.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela Matriz */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-500 font-mono">
                <th className="py-3 px-3.5">ID Posto & Origem</th>
                <th className="py-3 px-3.5">Especialidade</th>
                <th className="py-3 px-3.5 text-center">Cota do Posto</th>
                <th className="py-3 px-3.5 text-center">Utilizadas (Regular)</th>
                <th className="py-3 px-3.5 text-center">Em Repescagem (≤5d)</th>
                <th className="py-3 px-3.5 text-center">Vagas Restantes</th>
                <th className="py-3 px-3.5 text-right">Status da Cota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {postos.flatMap(posto => {
                const specsToShow = selectedFilterSpec === 'ALL' 
                  ? allKnownSpecialties 
                  : [selectedFilterSpec];

                return specsToShow.map(spec => {
                  const rule = getRuleForSpec(spec);
                  const specApps = activeApps.filter(a => a.postoId === posto.id && a.especialidade === spec);
                  
                  let repescagemCount = 0;
                  let regularCount = 0;
                  specApps.forEach(a => {
                    const days = calculateDaysToSlot(a.data);
                    if (days >= 0 && days <= repescagemDays) {
                      repescagemCount++;
                    } else {
                      regularCount++;
                    }
                  });

                  const isCotaLivre = rule.cotaLivreEvento;
                  const maxQuota = isCotaLivre ? 999 : rule.maxVagasPorId;
                  const isEsgotada = !isCotaLivre && specApps.length >= maxQuota;
                  const restantes = isCotaLivre ? 'Livre' : Math.max(0, maxQuota - specApps.length);

                  return (
                    <tr key={`${posto.id}_${spec}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-slate-900">{posto.id}</span>
                        <span className="text-[11px] text-slate-400 block">{posto.origem}</span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-slate-800">{spec}</span>
                        {isCotaLivre && (
                          <span className="text-[9px] block text-emerald-600 font-bold">
                            ✨ Cota Livre (Evento)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold font-mono">
                        {isCotaLivre ? (
                          <span className="text-emerald-700">Ilimitada</span>
                        ) : (
                          `${rule.maxVagasPorId} vagas`
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-blue-600 font-mono">
                        {regularCount}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-amber-600 font-mono">
                        {repescagemCount}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold font-mono">
                        {isCotaLivre ? (
                          <span className="text-emerald-600">∞</span>
                        ) : (
                          <span className={isEsgotada ? 'text-rose-600' : 'text-slate-800'}>
                            {restantes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {isCotaLivre ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Cota Livre
                          </span>
                        ) : isEsgotada ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Esgotada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Disponível
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
