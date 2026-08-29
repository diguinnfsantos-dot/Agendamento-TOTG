import React from 'react';
import { Slot, Appointment, Posto, User, SystemRule } from '../types';
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Users, 
  Building, 
  AlertTriangle,
  Calendar,
  Activity,
  Percent,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface AdminDashboardProps {
  slots: Slot[];
  appointments: Appointment[];
  postos: Posto[];
  users: User[];
  rules: SystemRule;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  slots,
  appointments,
  postos,
  users,
  rules,
}) => {
  const totalVagas = slots.length;
  const vagasAgendadas = slots.filter(s => s.status === 'AGENDADO').length;
  const vagasLivres = slots.filter(s => s.status === 'DISPONIVEL').length;
  const taxaOcupacao = totalVagas > 0 ? Math.round((vagasAgendadas / totalVagas) * 100) : 0;

  const operators = users.filter(u => u.role === 'OPERATOR');
  const pendingOps = operators.filter(o => o.status === 'PENDING').length;
  const pendingCancels = appointments.filter(a => a.status === 'CANCEL_REQUESTED').length;

  // Gráfico 1: Vagas Utilizadas vs Vagas Livres (Bento Blue & Slate)
  const pieData = [
    { name: 'Vagas Utilizadas (Agendadas)', value: vagasAgendadas, color: '#2563eb' }, // Royal Blue
    { name: 'Vagas Livres (Disponíveis)', value: vagasLivres, color: '#94a3b8' }, // Slate 400
  ];

  // Gráfico 2: Distribuição de Vagas Agendadas por Especialidade
  const specCountMap: Record<string, { total: number; agendadas: number }> = {};
  slots.forEach(slot => {
    if (!specCountMap[slot.especialidade]) {
      specCountMap[slot.especialidade] = { total: 0, agendadas: 0 };
    }
    specCountMap[slot.especialidade].total += 1;
    if (slot.status === 'AGENDADO') {
      specCountMap[slot.especialidade].agendadas += 1;
    }
  });

  const specBarData = Object.entries(specCountMap).map(([name, data]) => ({
    especialidade: name.length > 12 ? `${name.slice(0, 10)}...` : name,
    nomeCompleto: name,
    Agendadas: data.agendadas,
    Disponíveis: data.total - data.agendadas,
  }));

  // Gráfico 3: Consumo de Cotas por ID / Posto
  const postoUsageData = postos.map(p => {
    const used = appointments.filter(a => a.postoId === p.id && a.status !== 'CANCELLED').length;
    return {
      postoId: p.id,
      nomePosto: p.origem,
      VagasUtilizadas: used,
      CotaMaxima: rules.maxVagasPorId,
    };
  });

  return (
    <div className="space-y-5">
      {/* Bento Grid Top Section: Dark Hero Block + Quick Info Chips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bento Card 1: Dark Slate Master Anchor (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                  Painel Executivo • Regulação em Tempo Real
                </span>
              </div>
              <span className="text-[11px] px-2.5 py-1 bg-slate-800 text-blue-300 font-mono font-bold rounded-lg border border-slate-700">
                Regra: {rules.maxVagasPorId} vagas / ID
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-3">
              Visão Geral de Agendamentos & Vagas Clínicas
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Monitoramento centralizado de vagas médicas, regulação automática de cotas por posto de coleta e gestão de atendimentos.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total de Vagas</p>
              <p className="text-2xl font-black text-white mt-0.5">{totalVagas}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Agendadas</p>
              <p className="text-2xl font-black text-blue-400 mt-0.5">{vagasAgendadas}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Disponíveis</p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">{vagasLivres}</p>
            </div>
            <div>
              <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Taxa Ocupação</p>
              <p className="text-2xl font-black text-amber-300 mt-0.5">{taxaOcupacao}%</p>
            </div>
          </div>
        </div>

        {/* Bento Card 2: Alerts & Status Summary */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Ações Regulatórias
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-2">
              Pendências & Autorizações
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Validação de novos operadores e solicitações de cancelamento de vagas.
            </p>
          </div>

          <div className="space-y-2.5 my-4">
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-700" />
                <span className="text-amber-950 font-semibold">Operadores Pendentes</span>
              </div>
              <span className="font-mono font-black text-amber-900 px-2 py-0.5 bg-amber-100 rounded-md">
                {pendingOps}
              </span>
            </div>

            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-700" />
                <span className="text-blue-950 font-semibold">Cancelamentos p/ Liberar</span>
              </div>
              <span className="font-mono font-black text-blue-900 px-2 py-0.5 bg-blue-100 rounded-md">
                {pendingCancels}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Postos Ativos: <strong>{postos.length}</strong></span>
            <span>Operadores: <strong>{operators.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Bento Grid Row 2: Four Key Bento Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Vagas Agendadas</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{vagasAgendadas}</span>
            <span className="text-xs text-slate-400">de {totalVagas} vagas</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${taxaOcupacao}%` }} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Vagas Livres</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{vagasLivres}</span>
            <span className="text-xs text-emerald-600 font-medium">prontas</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Disponíveis para os postos
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Eficiência de Ocupação</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{taxaOcupacao}%</span>
            <span className="text-xs text-slate-400">do total</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {vagasAgendadas} consultas marcadas
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cota Geral / Posto</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{rules.maxVagasPorId}</span>
            <span className="text-xs text-slate-400">vagas limite</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Compartilhado por ID de Posto
          </p>
        </div>
      </div>

      {/* Bento Grid Row 3: Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* GRÁFICO 1: PIE CHART - VAGAS UTILIZADAS VS VAGAS LIVRES (Solicitado no prompt) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Distribuição
              </span>
              <PieChartIcon className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1">
              Vagas Utilizadas vs Vagas Livres
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Proporção da ocupação atual da agenda clínica
            </p>
          </div>

          <div className="h-60 mt-2 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} vagas`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '12px', borderColor: '#1e293b' }}
                  itemStyle={{ color: '#93c5fd' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 text-center text-xs">
            <div className="border-r border-slate-100 pr-2">
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Agendadas</p>
              <p className="font-extrabold text-blue-700 mt-0.5">{vagasAgendadas} ({taxaOcupacao}%)</p>
            </div>
            <div className="pl-2">
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Disponíveis</p>
              <p className="font-extrabold text-slate-700 mt-0.5">{vagasLivres} ({100 - taxaOcupacao}%)</p>
            </div>
          </div>
        </div>

        {/* GRÁFICO 2: BAR CHART - OCUPAÇÃO POR ESPECIALIDADE */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Por Especialidade
              </span>
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1">
              Ocupação de Vagas por Especialidade Médica
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparativo de vagas agendadas versus vagas disponíveis em cada especialidade
            </p>
          </div>

          <div className="h-60 mt-3 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={specBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="especialidade" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value} vagas`, name]}
                  labelFormatter={(label, payload) => {
                    const item = payload && payload[0] ? (payload[0].payload as any) : null;
                    return item ? item.nomeCompleto : label;
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '12px', borderColor: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Agendadas" fill="#2563eb" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Disponíveis" fill="#cbd5e1" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 3: CONSUMO DE COTAS POR ID / POSTO */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Consumo de Cotas por Posto de Coleta (ID)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vagas utilizadas por cada posto em relação à cota permitida ({rules.maxVagasPorId} vagas por ID)
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
              Controle Geral
            </span>
          </div>

          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={postoUsageData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="postoId" tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 'bold' }} />
                <YAxis domain={[0, Math.max(rules.maxVagasPorId + 2, 6)]} tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value} vagas`, name === 'VagasUtilizadas' ? 'Utilizadas' : 'Cota Máxima']}
                  labelFormatter={(label, payload) => {
                    const item = payload && payload[0] ? (payload[0].payload as any) : null;
                    return item ? `Posto ${item.postoId} - ${item.nomePosto}` : label;
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '12px', borderColor: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="VagasUtilizadas" fill="#2563eb" name="Vagas Utilizadas pelo Posto" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
