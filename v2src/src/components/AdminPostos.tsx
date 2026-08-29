import React, { useState } from 'react';
import { Posto, User, Appointment, SystemRule } from '../types';
import { 
  MapPin, 
  Plus, 
  Building, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Users, 
  Calendar,
  Layers,
  AlertCircle
} from 'lucide-react';

interface AdminPostosProps {
  postos: Posto[];
  users: User[];
  appointments: Appointment[];
  rules: SystemRule;
  onSavePosto: (posto: Posto) => void;
  onDeletePosto: (postoId: string) => void;
}

export const AdminPostos: React.FC<AdminPostosProps> = ({
  postos,
  users,
  appointments,
  rules,
  onSavePosto,
  onDeletePosto,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formId, setFormId] = useState('');
  const [formCodigo, setFormCodigo] = useState('');
  const [formOrigem, setFormOrigem] = useState('');
  const [formCidade, setFormCidade] = useState('Niterói');
  const [formError, setFormError] = useState('');

  const handleStartAdd = () => {
    // Sugestão automática de próximo ID
    const nextNum = postos.length + 1;
    const padNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    setFormId(`P${padNum}`);
    setFormCodigo(`POSTO-${padNum}`);
    setFormOrigem('');
    setFormCidade('Niterói');
    setFormError('');
    setEditingId(null);
    setShowAddForm(true);
  };

  const handleStartEdit = (posto: Posto) => {
    setFormId(posto.id);
    setFormCodigo(posto.codigo);
    setFormOrigem(posto.origem);
    setFormCidade(posto.cidade || 'Niterói');
    setFormError('');
    setEditingId(posto.id);
    setShowAddForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formId.trim() || !formOrigem.trim()) {
      setFormError('Informe o Código ID e a Origem/Nome da Unidade.');
      return;
    }

    // Checa duplicação de ID se for novo cadastro
    if (!editingId) {
      const exists = postos.some(p => p.id.toUpperCase() === formId.toUpperCase().trim());
      if (exists) {
        setFormError(`Já existe um posto cadastrado com o ID "${formId}". Escolha outro código.`);
        return;
      }
    }

    onSavePosto({
      id: formId.toUpperCase().trim(),
      codigo: formCodigo.trim() || `POSTO-${formId.toUpperCase().trim()}`,
      origem: formOrigem.trim(),
      cidade: formCidade.trim(),
      ativo: true,
    });

    setShowAddForm(false);
    setEditingId(null);
  };

  // Contagem de operadores e agendamentos por posto
  const getPostoMetrics = (postoId: string) => {
    const totalOps = users.filter(u => u.postoId === postoId).length;
    const activeApps = appointments.filter(a => a.postoId === postoId && a.status !== 'CANCELLED').length;
    return { totalOps, activeApps };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
            Parâmetros & Postos
          </span>
          <h2 className="text-base font-black text-slate-900 mt-1">Cadastro de ID e Origem (Postos de Coleta)</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Cadastre os IDs e as Origens que estarão disponíveis nas listas suspensas de cadastro e agendamento dos cooperadores.
          </p>
        </div>

        <button
          id="btn-add-posto"
          onClick={handleStartAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo ID & Origem</span>
        </button>
      </div>

      {/* Modal / Inline Form for Adding/Editing Posto */}
      {showAddForm && (
        <div className="bg-white border border-blue-200 p-6 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              {editingId ? `Editar Posto / Origem: ${editingId}` : 'Cadastrar Novo Posto / Origem para a Lista Suspensa'}
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="posto-id-input">
                Código ID (Ex: P01, P02) <span className="text-rose-500">*</span>
              </label>
              <input
                id="posto-id-input"
                type="text"
                required
                disabled={!!editingId}
                value={formId}
                onChange={(e) => setFormId(e.target.value.toUpperCase())}
                placeholder="Ex: P06"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="posto-codigo-input">
                Identificador / Código
              </label>
              <input
                id="posto-codigo-input"
                type="text"
                value={formCodigo}
                onChange={(e) => setFormCodigo(e.target.value)}
                placeholder="Ex: POSTO-06"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="posto-origem-input">
                Origem / Nome da Unidade de Saúde <span className="text-rose-500">*</span>
              </label>
              <input
                id="posto-origem-input"
                type="text"
                required
                value={formOrigem}
                onChange={(e) => setFormOrigem(e.target.value)}
                placeholder="Ex: UBS Parque das Nações - Zona Sul"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Atualizar Posto' : 'Salvar na Lista Suspensa'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Postos List Grid - Bento Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {postos.map(posto => {
          const metrics = getPostoMetrics(posto.id);
          const isQuotaLimitReached = metrics.activeApps >= rules.maxVagasPorId;

          return (
            <div 
              key={posto.id} 
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                    ID: {posto.id}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {posto.codigo}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-3 leading-snug">
                  {posto.origem}
                </h3>
                {posto.cidade && (
                  <p className="text-xs text-slate-500 mt-0.5">{posto.cidade}</p>
                )}
              </div>

              {/* Usage & Quota Info */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Operadores vinculados:
                  </span>
                  <span className="font-semibold text-slate-800">{metrics.totalOps}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Vagas ocupadas pelo ID:
                  </span>
                  <span className={`font-bold ${isQuotaLimitReached ? 'text-amber-600 font-extrabold' : 'text-slate-800'}`}>
                    {metrics.activeApps} / {rules.maxVagasPorId} vagas
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isQuotaLimitReached ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, (metrics.activeApps / rules.maxVagasPorId) * 100)}%` }}
                  />
                </div>

                {isQuotaLimitReached && (
                  <p className="text-[10px] text-amber-700 font-medium">
                    ⚠️ Limite de cota atingido para este ID
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 pt-2">
                  <button
                    onClick={() => handleStartEdit(posto)}
                    className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Editar informações do posto"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (metrics.activeApps > 0) {
                        alert(`Não é possível excluir o posto ${posto.id} pois existem ${metrics.activeApps} agendamentos vinculados a ele.`);
                        return;
                      }
                      if (window.confirm(`Tem certeza que deseja excluir o Posto ${posto.id} - ${posto.origem}?`)) {
                        onDeletePosto(posto.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir posto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
