import React, { useState, useEffect } from 'react';
import { DoctorProfile, Slot, Appointment } from '../types';
import { db } from '../storage/db';
import { 
  Stethoscope, 
  UserCheck, 
  Building2, 
  Tag, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Search, 
  Sparkles, 
  Layers, 
  Calendar, 
  RefreshCw, 
  Lock, 
  ArrowRight,
  Info,
  Check,
  Phone,
  AlertTriangle
} from 'lucide-react';

interface AdminClinicalRegistryProps {
  slots?: Slot[];
  appointments?: Appointment[];
  onSlotsUpdated?: (newSlots: Slot[]) => void;
  onAppointmentsUpdated?: (newApps: Appointment[]) => void;
  onNavigateTab?: (tab: 'AGENDA' | 'AGENDAMENTOS' | 'OPERADORES' | 'POSTOS' | 'PAINEL' | 'CADASTROS' | 'RELATORIO' | 'FERRAMENTAS' | 'GERENCIADOR') => void;
  onDataUpdated?: () => void;
  onNavigateToAgenda?: () => void;
}

export const AdminClinicalRegistry: React.FC<AdminClinicalRegistryProps> = ({
  slots = [],
  appointments = [],
  onSlotsUpdated,
  onAppointmentsUpdated,
  onNavigateTab,
  onDataUpdated,
  onNavigateToAgenda,
}) => {
  const [activeTab, setActiveTab] = useState<'DOCTORS' | 'SPECIALTIES' | 'ROOMS'>('DOCTORS');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [doctors, setDoctors] = useState<DoctorProfile[]>(() => db.getDoctorProfiles());
  const [specialties, setSpecialties] = useState<string[]>(() => db.getSpecialties());
  const [rooms, setRooms] = useState<string[]>(() => db.getRooms());

  // Feedback States
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Doctor Form Modal
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorProfile | null>(null);
  const [doctorForm, setDoctorForm] = useState({
    nome: '',
    especialidade: specialties[0] || 'TOTG',
    crm: '',
    salaPadrao: rooms[0] || 'Sala de Coleta',
    telefone: '',
    ativo: true,
  });

  // Specialty Form Modal
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<string | null>(null);
  const [specInputValue, setSpecInputValue] = useState('');

  // Room Form Modal
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [roomInputValue, setRoomInputValue] = useState('');

  // Delete Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'DOCTOR' | 'SPECIALTY' | 'ROOM';
    idOrName: string;
    label: string;
  } | null>(null);

  // Sync / Refresh Lists
  const reloadAll = () => {
    const freshDocs = db.getDoctorProfiles();
    const freshSpecs = db.getSpecialties();
    const freshRooms = db.getRooms();
    setDoctors(freshDocs);
    setSpecialties(freshSpecs);
    setRooms(freshRooms);
    if (onSlotsUpdated) onSlotsUpdated(db.getSlots());
    if (onAppointmentsUpdated) onAppointmentsUpdated(db.getAppointments());
    if (onDataUpdated) onDataUpdated();
  };

  useEffect(() => {
    reloadAll();
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const notifyError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // ----------------------------------------------------
  // DOCTOR HANDLERS
  // ----------------------------------------------------
  const handleOpenAddDoctor = () => {
    setEditingDoctor(null);
    setDoctorForm({
      nome: '',
      especialidade: specialties[0] || 'Clínica Geral',
      crm: '',
      salaPadrao: rooms[0] || 'Consultório 01',
      telefone: '',
      ativo: true,
    });
    setIsDoctorModalOpen(true);
  };

  const handleOpenEditDoctor = (doc: DoctorProfile) => {
    setEditingDoctor(doc);
    setDoctorForm({
      nome: doc.nome,
      especialidade: doc.especialidade || specialties[0] || 'Clínica Geral',
      crm: doc.crm || '',
      salaPadrao: doc.salaPadrao || rooms[0] || 'Consultório 01',
      telefone: doc.telefone || '',
      ativo: doc.ativo !== false,
    });
    setIsDoctorModalOpen(true);
  };

  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNome = doctorForm.nome.trim();
    const cleanSpec = doctorForm.especialidade.trim();

    if (!cleanNome) {
      notifyError('Por favor, informe o nome do médico.');
      return;
    }
    if (!cleanSpec) {
      notifyError('Por favor, selecione ou informe a especialidade médica vinculada.');
      return;
    }

    if (editingDoctor) {
      // Update Doctor
      const oldName = editingDoctor.nome;
      const updated = db.saveDoctorProfile({
        ...editingDoctor,
        nome: cleanNome,
        especialidade: cleanSpec,
        crm: doctorForm.crm.trim(),
        salaPadrao: doctorForm.salaPadrao.trim(),
        telefone: doctorForm.telefone.trim(),
        ativo: doctorForm.ativo,
      });

      // If name changed, rename in slots/appointments
      if (oldName.toLowerCase() !== cleanNome.toLowerCase()) {
        db.renameOrMergeDoctor(oldName, cleanNome);
      }

      // Enforce the new specialty linkage in existing slots
      db.fixSlotsWithDoctorSpecialties();

      notifySuccess(`Médico "${updated.nome}" e seu vínculo com "${updated.especialidade}" foram salvos e sincronizados com sucesso!`);
    } else {
      // Create Doctor
      const existing = doctors.some(d => d.nome.toLowerCase() === cleanNome.toLowerCase());
      if (existing) {
        notifyError(`Já existe um médico cadastrado com o nome "${cleanNome}".`);
        return;
      }

      const created = db.saveDoctorProfile({
        nome: cleanNome,
        especialidade: cleanSpec,
        crm: doctorForm.crm.trim(),
        salaPadrao: doctorForm.salaPadrao.trim(),
        telefone: doctorForm.telefone.trim(),
        ativo: doctorForm.ativo,
      });

      notifySuccess(`Médico "${created.nome}" cadastrado com sucesso e vinculado à especialidade "${created.especialidade}"!`);
    }

    setIsDoctorModalOpen(false);
    reloadAll();
  };

  // ----------------------------------------------------
  // SPECIALTY HANDLERS
  // ----------------------------------------------------
  const handleOpenAddSpec = () => {
    setEditingSpec(null);
    setSpecInputValue('');
    setIsSpecModalOpen(true);
  };

  const handleOpenEditSpec = (spec: string) => {
    setEditingSpec(spec);
    setSpecInputValue(spec);
    setIsSpecModalOpen(true);
  };

  const handleSaveSpec = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = specInputValue.trim();
    if (!clean) {
      notifyError('Informe o nome da especialidade médica.');
      return;
    }

    if (editingSpec) {
      // Rename or merge
      const result = db.renameOrMergeSpecialty(editingSpec, clean);
      // Also update any doctor profiles using this specialty
      const updatedDocs = doctors.map(d => {
        if (d.especialidade.toLowerCase() === editingSpec.toLowerCase()) {
          return { ...d, especialidade: clean };
        }
        return d;
      });
      db.saveDoctorProfiles(updatedDocs);

      notifySuccess(`Especialidade renomeada para "${clean}" com sucesso (${result.slotsUpdated} vagas e ${result.appsUpdated} agendamentos atualizados).`);
    } else {
      // Add new
      const exists = specialties.some(s => s.toLowerCase() === clean.toLowerCase());
      if (exists) {
        notifyError(`A especialidade "${clean}" já está cadastrada.`);
        return;
      }
      db.saveSpecialties([...specialties, clean]);
      notifySuccess(`Especialidade "${clean}" cadastrada com sucesso.`);
    }

    setIsSpecModalOpen(false);
    reloadAll();
  };

  // ----------------------------------------------------
  // ROOM HANDLERS
  // ----------------------------------------------------
  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomInputValue('');
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: string) => {
    setEditingRoom(room);
    setRoomInputValue(room);
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomInputValue.trim();
    if (!clean) {
      notifyError('Informe o nome da sala ou consultório.');
      return;
    }

    if (editingRoom) {
      const result = db.renameOrMergeRoom(editingRoom, clean);
      // Update doctor default rooms
      const updatedDocs = doctors.map(d => {
        if (d.salaPadrao && d.salaPadrao.toLowerCase() === editingRoom.toLowerCase()) {
          return { ...d, salaPadrao: clean };
        }
        return d;
      });
      db.saveDoctorProfiles(updatedDocs);

      notifySuccess(`Sala renomeada para "${clean}" (${result.slotsUpdated} vagas atualizadas).`);
    } else {
      const exists = rooms.some(r => r.toLowerCase() === clean.toLowerCase());
      if (exists) {
        notifyError(`A sala "${clean}" já está cadastrada.`);
        return;
      }
      db.saveRooms([...rooms, clean]);
      notifySuccess(`Sala "${clean}" cadastrada com sucesso.`);
    }

    setIsRoomModalOpen(false);
    reloadAll();
  };

  // ----------------------------------------------------
  // DELETE HANDLERS
  // ----------------------------------------------------
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'DOCTOR') {
      db.deleteDoctorProfile(itemToDelete.idOrName);
      notifySuccess(`Médico "${itemToDelete.label}" removido do cadastro com sucesso.`);
    } else if (itemToDelete.type === 'SPECIALTY') {
      const updated = specialties.filter(s => s.toLowerCase() !== itemToDelete.idOrName.toLowerCase());
      db.saveSpecialties(updated);
      notifySuccess(`Especialidade "${itemToDelete.label}" excluída com sucesso.`);
    } else if (itemToDelete.type === 'ROOM') {
      const updated = rooms.filter(r => r.toLowerCase() !== itemToDelete.idOrName.toLowerCase());
      db.saveRooms(updated);
      notifySuccess(`Sala "${itemToDelete.label}" excluída com sucesso.`);
    }

    setItemToDelete(null);
    reloadAll();
  };

  // ----------------------------------------------------
  // FIX & RE-LINK ALL EXISTING SLOTS
  // ----------------------------------------------------
  const handleFixAllSlotsLinkage = () => {
    const result = db.fixSlotsWithDoctorSpecialties();
    reloadAll();
    if (result.slotsFixed > 0 || result.appointmentsFixed > 0) {
      notifySuccess(`Varredura concluída: ${result.slotsFixed} vagas e ${result.appointmentsFixed} agendamentos foram corrigidos e alinhados perfeitamente com a especialidade oficial de cada médico!`);
    } else {
      notifySuccess('Varredura concluída: Todos os médicos e especialidades na agenda já estão 100% consistentes e corretos!');
    }
  };

  // Filtered lists
  const filteredDoctors = doctors.filter(d => 
    d.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.especialidade.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.crm && d.crm.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSpecialties = specialties.filter(s =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = rooms.filter(r =>
    r.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white border border-slate-800 shadow-xs">
            <Stethoscope className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                Gestão Institucional
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                🔒 Regra de Vínculo Ativa
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Cadastros Clínicos & Vínculos Médicos
            </h2>
            <p className="text-xs text-slate-500">
              Ambiente dedicado para cadastrar, corrigir e vincular Médicos, Especialidades e Salas de Atendimento
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-fix-linkages"
            onClick={handleFixAllSlotsLinkage}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Verificar e corrigir especialidades inconsistentes em todas as vagas existentes da agenda"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Corrigir Vínculos na Agenda</span>
          </button>

          {(onNavigateToAgenda || onNavigateTab) && (
            <button
              onClick={() => {
                if (onNavigateToAgenda) onNavigateToAgenda();
                else if (onNavigateTab) onNavigateTab('AGENDA');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Ir para Agenda & Vagas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Info Callout explaining the automatic linkage rule */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-700 space-y-1">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            Segurança Operacional & Vínculo Automático Obrigatório
            <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">CFM / Regulação</span>
          </h4>
          <p className="leading-relaxed text-slate-600">
            Cada profissional médico cadastrado possui sua respectiva especialidade oficial vinculada (ex: <strong>Dr. Floriano Peixoto ➔ Clínica Geral</strong>, <strong>Dr. Fernando Dias ➔ Cardiologia</strong>).
            Ao disponibilizar novas vagas na agenda, ao escolher o médico, o sistema <strong>seleciona e trava automaticamente a especialidade correta</strong>, impedindo a geração de escalas com especialidades indevidas.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => { setActiveTab('DOCTORS'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'DOCTORS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Corpo Clínico & Médicos</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
              {doctors.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('SPECIALTIES'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'SPECIALTIES'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            <span>Especialidades</span>
            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px]">
              {specialties.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('ROOMS'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'ROOMS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Salas & Consultórios</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
              {rooms.length}
            </span>
          </button>
        </div>

        {/* Search & Add Action */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Buscar ${activeTab === 'DOCTORS' ? 'médico ou especialidade...' : activeTab === 'SPECIALTIES' ? 'especialidade...' : 'sala...'}`}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          {activeTab === 'DOCTORS' && (
            <button
              id="btn-add-doctor"
              onClick={handleOpenAddDoctor}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Médico</span>
            </button>
          )}

          {activeTab === 'SPECIALTIES' && (
            <button
              id="btn-add-specialty"
              onClick={handleOpenAddSpec}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Especialidade</span>
            </button>
          )}

          {activeTab === 'ROOMS' && (
            <button
              id="btn-add-room"
              onClick={handleOpenAddRoom}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Sala</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* TAB 1: CORPO CLÍNICO & VÍNCULOS COM ESPECIALIDADES              */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'DOCTORS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Profissional Médico</th>
                  <th className="px-5 py-3.5">Especialidade Vinculada</th>
                  <th className="px-5 py-3.5">CRM / Registro</th>
                  <th className="px-5 py-3.5">Consultório Padrão</th>
                  <th className="px-5 py-3.5">Vagas na Agenda</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      Nenhum profissional médico encontrado para o filtro informado.
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doc) => {
                    const totalSlots = slots.filter(s => s.medico && s.medico.toLowerCase() === doc.nome.toLowerCase()).length;
                    return (
                      <tr key={doc.id || doc.nome} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                              {doc.nome.includes('Dra.') ? '👩‍⚕️' : '👨‍⚕️'}
                            </div>
                            <div>
                              <p className="text-slate-900 font-bold">{doc.nome}</p>
                              {doc.telefone && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {doc.telefone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Lock className="w-3 h-3 text-blue-500" />
                            {doc.especialidade}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-slate-600 font-semibold">
                          {doc.crm || <span className="text-slate-400 text-[11px] italic">Não informado</span>}
                        </td>

                        <td className="px-5 py-3.5 text-slate-700 font-medium">
                          {doc.salaPadrao || <span className="text-slate-400 text-[11px]">Consultório Geral</span>}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-xs">
                            {totalSlots} {totalSlots === 1 ? 'vaga' : 'vagas'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.ativo !== false 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {doc.ativo !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditDoctor(doc)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors cursor-pointer"
                              title="Editar médico e vínculo com especialidade"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setItemToDelete({
                                type: 'DOCTOR',
                                idOrName: doc.id || doc.nome,
                                label: doc.nome,
                              })}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Excluir cadastro do médico"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 2: ESPECIALIDADES MÉDICAS                                    */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'SPECIALTIES' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredSpecialties.map((spec) => {
            const doctorsWithSpec = doctors.filter(d => d.especialidade.toLowerCase() === spec.toLowerCase());
            const slotsWithSpec = slots.filter(s => s.especialidade.toLowerCase() === spec.toLowerCase()).length;

            return (
              <div 
                key={spec}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Tag className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm text-slate-900">{spec}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditSpec(spec)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                        title="Renomear ou unificar especialidade"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setItemToDelete({
                          type: 'SPECIALTY',
                          idOrName: spec,
                          label: spec,
                        })}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Excluir especialidade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                    <p className="flex items-center justify-between">
                      <span>Médicos vinculados:</span>
                      <strong className="text-slate-800 font-mono">{doctorsWithSpec.length}</strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Total de vagas na agenda:</span>
                      <strong className="text-slate-800 font-mono">{slotsWithSpec}</strong>
                    </p>
                  </div>
                </div>

                {doctorsWithSpec.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    {doctorsWithSpec.map(d => (
                      <span key={d.nome} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                        {d.nome}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 3: SALAS & CONSULTÓRIOS                                      */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'ROOMS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const slotsInRoom = slots.filter(s => s.sala && s.sala.toLowerCase() === room.toLowerCase()).length;
            const doctorsDefaultInRoom = doctors.filter(d => d.salaPadrao && d.salaPadrao.toLowerCase() === room.toLowerCase());

            return (
              <div 
                key={room}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm text-slate-900">{room}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditRoom(room)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                        title="Renomear sala"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setItemToDelete({
                          type: 'ROOM',
                          idOrName: room,
                          label: room,
                        })}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Excluir sala"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                    <p className="flex items-center justify-between">
                      <span>Vagas alocadas nesta sala:</span>
                      <strong className="text-slate-800 font-mono">{slotsInRoom}</strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Médicos com sala padrão aqui:</span>
                      <strong className="text-slate-800 font-mono">{doctorsDefaultInRoom.length}</strong>
                    </p>
                  </div>
                </div>

                {doctorsDefaultInRoom.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    {doctorsDefaultInRoom.map(d => (
                      <span key={d.nome} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                        {d.nome}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MODAL: CADASTRO / EDIÇÃO DE MÉDICO COM VÍNCULO                   */}
      {/* ---------------------------------------------------------------- */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingDoctor ? 'Editar Profissional Médico' : 'Cadastrar Novo Profissional Médico'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina o nome oficial e a especialidade vinculada
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDoctorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs">
              {/* Nome do Médico */}
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="doc-nome">
                  Nome do Médico (com prefixo Dr. ou Dra.) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="doc-nome"
                  type="text"
                  required
                  value={doctorForm.nome}
                  onChange={(e) => setDoctorForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Dr. Floriano Peixoto ou Dra. Camila Ramos"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Especialidade Vinculada */}
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="doc-especialidade">
                  Especialidade Médica Vinculada <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="doc-especialidade"
                    required
                    value={doctorForm.especialidade}
                    onChange={(e) => setDoctorForm(prev => ({ ...prev, especialidade: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                  >
                    {specialties.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-[11px] text-blue-600 flex items-center gap-1 font-medium">
                  <Lock className="w-3 h-3 text-blue-500" />
                  Esta especialidade será vinculada de forma fixa à agenda deste médico.
                </p>
              </div>

              {/* CRM & Consultório Padrão Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="doc-crm">
                    CRM / Registro (Opcional)
                  </label>
                  <input
                    id="doc-crm"
                    type="text"
                    value={doctorForm.crm}
                    onChange={(e) => setDoctorForm(prev => ({ ...prev, crm: e.target.value }))}
                    placeholder="Ex: CRM/SP 142857"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="doc-sala">
                    Sala ou Consultório Padrão
                  </label>
                  <select
                    id="doc-sala"
                    value={doctorForm.salaPadrao}
                    onChange={(e) => setDoctorForm(prev => ({ ...prev, salaPadrao: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                  >
                    {rooms.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Ativo / Inativo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="doc-ativo"
                  type="checkbox"
                  checked={doctorForm.ativo}
                  onChange={(e) => setDoctorForm(prev => ({ ...prev, ativo: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="doc-ativo" className="font-semibold text-slate-700 cursor-pointer">
                  Profissional ativo e disponível para novas escalas na agenda
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDoctorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingDoctor ? 'Salvar Alterações' : 'Cadastrar Médico'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MODAL: ESPECIALIDADE (NOVA / EDITAR)                            */}
      {/* ---------------------------------------------------------------- */}
      {isSpecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingSpec ? 'Editar Especialidade Médica' : 'Nova Especialidade Médica'}
              </h3>
              <button
                onClick={() => setIsSpecModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSpec} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="spec-name">
                  Nome da Especialidade <span className="text-rose-500">*</span>
                </label>
                <input
                  id="spec-name"
                  type="text"
                  required
                  value={specInputValue}
                  onChange={(e) => setSpecInputValue(e.target.value)}
                  placeholder="Ex: Cardiologia, Oftalmologia..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              {editingSpec && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  ⚠️ Ao renomear, todas as vagas, agendamentos e médicos cadastrados com esta especialidade serão atualizados automaticamente.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSpecModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer shadow-xs"
                >
                  Salvar Especialidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MODAL: SALA (NOVA / EDITAR)                                     */}
      {/* ---------------------------------------------------------------- */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingRoom ? 'Editar Sala ou Consultório' : 'Nova Sala ou Consultório'}
              </h3>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="room-name">
                  Nome da Sala ou Consultório <span className="text-rose-500">*</span>
                </label>
                <input
                  id="room-name"
                  type="text"
                  required
                  value={roomInputValue}
                  onChange={(e) => setRoomInputValue(e.target.value)}
                  placeholder="Ex: Consultório 01, Sala de Triagem..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer shadow-xs"
                >
                  Salvar Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO                                  */}
      {/* ---------------------------------------------------------------- */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Confirmar Exclusão
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja realmente remover <strong>"{itemToDelete.label}"</strong>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
