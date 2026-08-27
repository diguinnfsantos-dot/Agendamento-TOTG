import { Slot, Appointment, SystemRule, SpecialtyQuotaRule, Posto } from '../types';

/**
 * Utilitário de Motor de Cotas por Especialidade e Repescagem Automática (≤ 5 dias)
 */

/**
 * Calcula a diferença em dias corridos entre uma data base (hoje) e a data do slot.
 * Retorna número de dias (positivo = futuro ou hoje; 0 = hoje; negativo = passado).
 */
export function calculateDaysToSlot(slotDateStr: string, baseDateStr?: string): number {
  if (!slotDateStr) return 999;
  
  let base: Date;
  if (baseDateStr) {
    const [by, bm, bd] = baseDateStr.split('-').map(Number);
    base = new Date(by, bm - 1, bd, 0, 0, 0, 0);
  } else {
    const now = new Date();
    base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  const [sy, sm, sd] = slotDateStr.split('-').map(Number);
  if (!sy || !sm || !sd) return 999;
  const slotDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);

  const diffTime = slotDate.getTime() - base.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Avalia se o horário/vaga está na janela de Repescagem Automática (≤ 5 dias de vencimento).
 */
export function getSlotExpirationStatus(slotDateStr: string, diasLimite: number = 5): {
  isRepescagem: boolean;
  diasRestantes: number;
  isToday: boolean;
  isPast: boolean;
  diasTexto: string;
} {
  const diasRestantes = calculateDaysToSlot(slotDateStr);
  const isToday = diasRestantes === 0;
  const isPast = diasRestantes < 0;
  const isRepescagem = !isPast && diasRestantes <= (diasLimite || 5);

  let diasTexto = '';
  if (isPast) {
    diasTexto = 'Data passada';
  } else if (isToday) {
    diasTexto = 'Atendimento HOJE';
  } else if (diasRestantes === 1) {
    diasTexto = 'Amanhã (1 dia)';
  } else {
    diasTexto = `Em ${diasRestantes} dias`;
  }

  return {
    isRepescagem,
    diasRestantes,
    isToday,
    isPast,
    diasTexto,
  };
}

/**
 * Obtém a regra de cota ativa para uma especialidade.
 * Se não houver personalização, usa a cota padrão geral do sistema.
 */
export function getSpecialtyRule(rules: SystemRule, especialidade: string): SpecialtyQuotaRule {
  const custom = rules?.cotasPorEspecialidade?.[especialidade];
  if (custom) {
    return custom;
  }
  return {
    especialidade,
    maxVagasPorId: rules?.maxVagasPorId || 3,
    cotaLivreEvento: false,
  };
}

export type SlotEligibilityType = 
  | 'REPESCAGEM_5_DIAS' 
  | 'COTA_LIVRE_ADMIN' 
  | 'REGULAR_DISPONIVEL' 
  | 'COTA_ESGOTADA' 
  | 'JA_AGENDADO' 
  | 'BLOQUEADO';

export interface SlotEligibilityResult {
  allowed: boolean;
  type: SlotEligibilityType;
  badgeType: 'REPESCAGEM' | 'COTA_LIVRE' | 'REGULAR' | 'ESGOTADA' | 'RESERVADA' | 'BLOQUEADA';
  badgeLabel: string;
  badgeClass: string;
  cardBorderClass: string;
  message: string;
  usedInSpecialty: number;
  maxQuota: number;
  isRepescagem: boolean;
  isCotaLivreAdmin: boolean;
  diasRestantes: number;
}

/**
 * Avalia se um operador de um determinado Posto pode selecionar e agendar um horário específico.
 */
export function getSlotBookingEligibility(
  slot: Slot,
  postoId: string,
  appointments: Appointment[],
  rules: SystemRule
): SlotEligibilityResult {
  const diasLimite = rules?.diasParaRepescagemVencimento ?? 5;
  const expiration = getSlotExpirationStatus(slot.data, diasLimite);
  const specRule = getSpecialtyRule(rules, slot.especialidade);

  // 1. Se já está agendado
  if (slot.status === 'AGENDADO') {
    return {
      allowed: false,
      type: 'JA_AGENDADO',
      badgeType: 'RESERVADA',
      badgeLabel: 'Reservada',
      badgeClass: 'bg-slate-200 text-slate-700 border border-slate-300',
      cardBorderClass: 'border-slate-200 bg-slate-100/70 opacity-60',
      message: 'Este horário já foi agendado.',
      usedInSpecialty: 0,
      maxQuota: specRule.maxVagasPorId,
      isRepescagem: expiration.isRepescagem,
      isCotaLivreAdmin: specRule.cotaLivreEvento,
      diasRestantes: expiration.diasRestantes,
    };
  }

  // 2. Se bloqueado pelo administrador
  if (slot.status === 'BLOQUEADO') {
    return {
      allowed: false,
      type: 'BLOQUEADO',
      badgeType: 'BLOQUEADA',
      badgeLabel: 'Bloqueada',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300',
      cardBorderClass: 'border-rose-200 bg-rose-50/50 opacity-60',
      message: 'Horário bloqueado pela administração médica.',
      usedInSpecialty: 0,
      maxQuota: specRule.maxVagasPorId,
      isRepescagem: expiration.isRepescagem,
      isCotaLivreAdmin: specRule.cotaLivreEvento,
      diasRestantes: expiration.diasRestantes,
    };
  }

  // 3. Caso A: REPESCAGEM AUTOMÁTICA POR PROXIMIDADE DE VENCIMENTO (≤ 5 DIAS)
  // Regra inegociável: Qualquer posto pode agendar independente de cota anterior!
  if (expiration.isRepescagem) {
    return {
      allowed: true,
      type: 'REPESCAGEM_5_DIAS',
      badgeType: 'REPESCAGEM',
      badgeLabel: `⚡ Repescagem Automática (${expiration.diasTexto})`,
      badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-xs border border-amber-600',
      cardBorderClass: 'border-amber-400 bg-amber-50/40 hover:border-amber-500 hover:shadow-md ring-1 ring-amber-400/30',
      message: `Vaga em regime de Repescagem Automática por vencimento iminente (${expiration.diasTexto}). Liberada para qualquer Posto sem consumir a cota regular!`,
      usedInSpecialty: 0,
      maxQuota: specRule.maxVagasPorId,
      isRepescagem: true,
      isCotaLivreAdmin: specRule.cotaLivreEvento,
      diasRestantes: expiration.diasRestantes,
    };
  }

  // 4. Caso B: COTA LIVRE ADMINISTRATIVA (MUTIRÃO / AÇÃO SOCIAL / EVENTO)
  if (specRule.cotaLivreEvento) {
    return {
      allowed: true,
      type: 'COTA_LIVRE_ADMIN',
      badgeType: 'COTA_LIVRE',
      badgeLabel: `✨ Cota Livre (${specRule.descricaoEvento || 'Mutirão / Evento'})`,
      badgeClass: 'bg-emerald-600 text-white font-bold shadow-xs border border-emerald-700',
      cardBorderClass: 'border-emerald-400 bg-emerald-50/40 hover:border-emerald-500 hover:shadow-md ring-1 ring-emerald-400/30',
      message: `Especialidade com Cota Livre liberada pela Administração Master para eventos e mutirões. Não há restrição de vagas para o seu posto.`,
      usedInSpecialty: 0,
      maxQuota: 999,
      isRepescagem: false,
      isCotaLivreAdmin: true,
      diasRestantes: expiration.diasRestantes,
    };
  }

  // 5. Caso C: COTA REGULAR POR ESPECIALIDADE
  // Contamos os agendamentos ativos do Posto para esta especialidade específica.
  // Importante: Agendamentos que foram feitos em vagas que já estavam em repescagem (≤ 5 dias) não bloqueiam a cota regular.
  const activePostoAppsForSpec = appointments.filter(a => {
    if (a.postoId !== postoId || a.status === 'CANCELLED') return false;
    return a.especialidade === slot.especialidade;
  });

  // Agendamentos regulares (que contam na cota regular da especialidade)
  const regularUsed = activePostoAppsForSpec.filter(a => {
    // Se a data do agendamento era > 5 dias da data de criação/atendimento
    const days = calculateDaysToSlot(a.data);
    return days > diasLimite;
  }).length;

  const totalUsedForSpec = activePostoAppsForSpec.length;
  const maxQuota = specRule.maxVagasPorId;
  const isQuotaReached = totalUsedForSpec >= maxQuota;

  if (isQuotaReached) {
    return {
      allowed: false,
      type: 'COTA_ESGOTADA',
      badgeType: 'ESGOTADA',
      badgeLabel: `Cota Esgotada (${totalUsedForSpec}/${maxQuota} vagas)`,
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      cardBorderClass: 'border-slate-200 bg-slate-100/80 opacity-65',
      message: `Seu Posto (${postoId}) já atingiu o limite de ${maxQuota} vagas para ${slot.especialidade}. Aguarde vaga em Repescagem (≤ 5 dias) ou solicite ampliação de cota ao Administrador Master.`,
      usedInSpecialty: totalUsedForSpec,
      maxQuota,
      isRepescagem: false,
      isCotaLivreAdmin: false,
      diasRestantes: expiration.diasRestantes,
    };
  }

  return {
    allowed: true,
    type: 'REGULAR_DISPONIVEL',
    badgeType: 'REGULAR',
    badgeLabel: `Cota Posto: ${totalUsedForSpec}/${maxQuota} vagas`,
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200 font-bold',
    cardBorderClass: 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs',
    message: `Vaga regular disponível para seu Posto (${postoId}). ${maxQuota - totalUsedForSpec} vagas restantes para ${slot.especialidade}.`,
    usedInSpecialty: totalUsedForSpec,
    maxQuota,
    isRepescagem: false,
    isCotaLivreAdmin: false,
    diasRestantes: expiration.diasRestantes,
  };
}

/**
 * Resumo detalhado de cotas de um Posto para todas as Especialidades.
 */
export interface SpecialtyQuotaSummary {
  especialidade: string;
  maxVagas: number;
  isCotaLivreAdmin: boolean;
  descricaoEvento?: string;
  totalAgendamentos: number;
  agendamentosRegulares: number;
  agendamentosRepescagem: number;
  vagasRestantes: number;
  atingiuLimite: boolean;
}

export function getPostoQuotaSummaries(
  postoId: string,
  specialties: string[],
  appointments: Appointment[],
  rules: SystemRule
): SpecialtyQuotaSummary[] {
  const diasLimite = rules?.diasParaRepescagemVencimento ?? 5;
  const activePostoApps = appointments.filter(a => a.postoId === postoId && a.status !== 'CANCELLED');

  return specialties.map(spec => {
    const specRule = getSpecialtyRule(rules, spec);
    const specApps = activePostoApps.filter(a => a.especialidade === spec);
    
    let repescagemCount = 0;
    let regularCount = 0;

    specApps.forEach(a => {
      const days = calculateDaysToSlot(a.data);
      if (days >= 0 && days <= diasLimite) {
        repescagemCount++;
      } else {
        regularCount++;
      }
    });

    const isCotaLivre = specRule.cotaLivreEvento;
    const maxVagas = isCotaLivre ? 999 : specRule.maxVagasPorId;
    const atingiuLimite = !isCotaLivre && specApps.length >= maxVagas;
    const vagasRestantes = isCotaLivre ? 999 : Math.max(0, maxVagas - specApps.length);

    return {
      especialidade: spec,
      maxVagas: specRule.maxVagasPorId,
      isCotaLivreAdmin: isCotaLivre,
      descricaoEvento: specRule.descricaoEvento,
      totalAgendamentos: specApps.length,
      agendamentosRegulares: regularCount,
      agendamentosRepescagem: repescagemCount,
      vagasRestantes,
      atingiuLimite,
    };
  });
}
