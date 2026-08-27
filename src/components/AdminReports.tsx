import React, { useState } from 'react';
import { Slot, Appointment, Posto } from '../types';
import { 
  FileText, 
  Download, 
  Copy, 
  ExternalLink, 
  Check, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Layers,
  Sparkles,
  Table
} from 'lucide-react';
import { buildFullSlotsExportData, exportToCSV, copyTableToClipboard, ExportRow } from '../utils/exportSheets';
import { formatDateBR } from '../utils/formatters';

interface AdminReportsProps {
  slots: Slot[];
  appointments: Appointment[];
  postos: Posto[];
  onOpenWorkspace?: () => void;
}

export const AdminReports: React.FC<AdminReportsProps> = ({
  slots,
  appointments,
  postos,
  onOpenWorkspace,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AGENDADA' | 'DISPONÍVEL'>('ALL');
  const [filterSpec, setFilterSpec] = useState('ALL');
  const [filterPosto, setFilterPosto] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const exportRows = buildFullSlotsExportData(slots, appointments);

  const filteredRows = exportRows.filter(row => {
    const matchesStatus = filterStatus === 'ALL' || row.statusVaga === filterStatus;
    const matchesSpec = filterSpec === 'ALL' || row.especialidade === filterSpec;
    const matchesPosto = filterPosto === 'ALL' || row.postoId === filterPosto;
    const matchesSearch = 
      row.pacienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.especialidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.data.includes(searchTerm) ||
      row.operador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.origem.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSpec && matchesPosto && matchesSearch;
  });

  const totalVagas = exportRows.length;
  const vagasAgendadas = exportRows.filter(r => r.statusVaga === 'AGENDADA').length;
  const vagasLivres = exportRows.filter(r => r.statusVaga === 'DISPONÍVEL').length;
  const taxaOcupacao = totalVagas > 0 ? Math.round((vagasAgendadas / totalVagas) * 100) : 0;

  const handleExportCSV = () => {
    exportToCSV(filteredRows, `relatorio_geral_vagas_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleCopyClipboard = async () => {
    await copyTableToClipboard(filteredRows);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenGoogleSheets = () => {
    window.open('https://sheets.new', '_blank', 'noopener,noreferrer');
  };

  const uniqueSpecs = Array.from(new Set(slots.map(s => s.especialidade))).sort();

  return (
    <div className="space-y-6">
      {/* Top Banner with Google Sheets Integration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Table className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Relatório Geral de Vagas & Integração com Google Planilhas
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Visualize o panorama consolidado de todas as vagas reguladas (agendadas e livres). Exporte diretamente para o <strong>Google Planilhas</strong> ou faça download do arquivo compatível com Excel e LibreOffice.
            </p>
          </div>

          {/* Action Buttons for Google Sheets & CSV */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onOpenWorkspace && (
              <button
                id="btn-open-sheets-workspace"
                onClick={onOpenWorkspace}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Sincronizar dados diretamente via Google Sheets API"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Sincronizar no Google Sheets API</span>
              </button>
            )}

            <button
              id="btn-copy-for-sheets"
              onClick={handleCopyClipboard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Copiar dados formatados para colar direto no Google Sheets"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copiado! Pressione Ctrl+V no Sheets</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copiar para Google Planilhas</span>
                </>
              )}
            </button>

            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Planilha (.CSV)</span>
            </button>

            <button
              id="btn-open-google-sheets-new"
              onClick={handleOpenGoogleSheets}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Criar uma nova planilha em branco no Google Drive"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Google Planilhas (sheets.new)</span>
            </button>
          </div>
        </div>

        {/* Quick Instructions box */}
        <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Como visualizar no Google Planilhas:</strong> Clique em <em>"Copiar para Google Planilhas"</em>, abra o Google Sheets pelo botão ao lado e cole diretamente com <strong>Ctrl + V</strong> (ou importe o arquivo .CSV em <em>Arquivo &gt; Importar</em>).
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Total de Vagas na Grade</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalVagas}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
          <p className="text-xs font-medium text-emerald-800">Vagas Agendadas / Ocupadas</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{vagasAgendadas}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-200 bg-teal-50/30">
          <p className="text-xs font-medium text-teal-800">Vagas Livres / Disponíveis</p>
          <p className="text-2xl font-bold text-teal-900 mt-1">{vagasLivres}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Taxa Geral de Ocupação</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{taxaOcupacao}%</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por paciente, operador, especialidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Status da Vaga: Todas ({exportRows.length})</option>
              <option value="AGENDADA">Apenas Vagas Agendadas ({vagasAgendadas})</option>
              <option value="DISPONÍVEL">Apenas Vagas Disponíveis ({vagasLivres})</option>
            </select>
          </div>

          <div>
            <select
              value={filterSpec}
              onChange={(e) => setFilterSpec(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Todas as Especialidades</option>
              {uniqueSpecs.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterPosto}
              onChange={(e) => setFilterPosto(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Todos os Postos (IDs)</option>
              {postos.map(p => (
                <option key={p.id} value={p.id}>ID {p.id} - {p.origem}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Data / Hora</th>
                <th className="py-3 px-3">Especialidade / Médico</th>
                <th className="py-3 px-3">ID Posto / Origem</th>
                <th className="py-3 px-3">Paciente</th>
                <th className="py-3 px-3">CPF</th>
                <th className="py-3 px-3">Cartão SUS</th>
                <th className="py-3 px-3">Telefone</th>
                <th className="py-3 px-3">Operador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-normal">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-50 transition-colors ${
                      row.statusVaga === 'AGENDADA' ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      {row.statusVaga === 'AGENDADA' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Agendada
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Disponível
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{row.data}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{row.horario}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-teal-900">{row.especialidade}</div>
                      <div className="text-[10px] text-slate-500">{row.medico}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      {row.postoId !== '-' ? (
                        <div>
                          <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">
                            {row.postoId}
                          </span>
                          <div className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[120px]" title={row.origem}>
                            {row.origem}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {row.pacienteNome}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {row.pacienteCpf}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {row.pacienteSus}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {row.pacienteTel}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {row.operador}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
