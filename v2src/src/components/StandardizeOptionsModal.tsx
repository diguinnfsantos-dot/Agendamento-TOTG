import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  X,
  Stethoscope,
  Building2,
  UserCheck
} from 'lucide-react';
import { db } from '../storage/db';

export type StandardizeType = 'SPECIALTY' | 'ROOM' | 'DOCTOR';

interface StandardizeOptionsModalProps {
  type: StandardizeType;
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated: () => void;
  onSelectOption?: (val: string) => void;
}

export const StandardizeOptionsModal: React.FC<StandardizeOptionsModalProps> = ({
  type,
  isOpen,
  onClose,
  onDataUpdated,
  onSelectOption,
}) => {
  const [items, setItems] = useState<string[]>(() => {
    if (type === 'SPECIALTY') return db.getSpecialties();
    if (type === 'ROOM') return db.getRooms();
    return db.getDoctors();
  });

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [mergeConflict, setMergeConflict] = useState<{
    original: string;
    target: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Synchronize items list whenever modal opens or type changes
  useEffect(() => {
    if (isOpen) {
      if (type === 'SPECIALTY') setItems(db.getSpecialties());
      else if (type === 'ROOM') setItems(db.getRooms());
      else setItems(db.getDoctors());
      setEditingItem(null);
      setEditValue('');
      setNewItemValue('');
      setMergeConflict(null);
      setSuccessMessage(null);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const getTitle = () => {
    if (type === 'SPECIALTY') return 'Padronizar & Gerenciar Especialidades';
    if (type === 'ROOM') return 'Padronizar & Gerenciar Salas / Consultórios';
    return 'Padronizar & Gerenciar Médicos / Especialistas';
  };

  const getIcon = () => {
    if (type === 'SPECIALTY') return <Stethoscope className="w-5 h-5 text-blue-600" />;
    if (type === 'ROOM') return <Building2 className="w-5 h-5 text-emerald-600" />;
    return <UserCheck className="w-5 h-5 text-purple-600" />;
  };

  const refreshList = () => {
    if (type === 'SPECIALTY') setItems(db.getSpecialties());
    else if (type === 'ROOM') setItems(db.getRooms());
    else setItems(db.getDoctors());
  };

  const handleStartEdit = (item: string) => {
    setEditingItem(item);
    setEditValue(item);
    setMergeConflict(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
    setMergeConflict(null);
  };

  const handleSaveEdit = (original: string) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === original) {
      handleCancelEdit();
      return;
    }

    // Check if target already exists in list (case-insensitive check)
    const existing = items.find(
      i => i.toLowerCase() === trimmed.toLowerCase() && i.toLowerCase() !== original.toLowerCase()
    );

    if (existing) {
      // Conflict: item already exists! Trigger merge prompt
      setMergeConflict({
        original,
        target: existing,
      });
      return;
    }

    // Direct rename
    applyRename(original, trimmed);
  };

  const applyRename = (original: string, targetName: string) => {
    let result: { slotsUpdated?: number; appsUpdated?: number } = {};
    if (type === 'SPECIALTY') {
      result = db.renameOrMergeSpecialty(original, targetName);
    } else if (type === 'ROOM') {
      result = db.renameOrMergeRoom(original, targetName);
    } else {
      result = db.renameOrMergeDoctor(original, targetName);
    }

    refreshList();
    handleCancelEdit();
    onDataUpdated();

    const msg = `Atualizado com sucesso! Grafia "${original}" corrigida para "${targetName}" (${result.slotsUpdated || 0} vagas e ${result.appsUpdated || 0} agendamentos sincronizados).`;
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleConfirmMerge = () => {
    if (!mergeConflict) return;
    applyRename(mergeConflict.original, mergeConflict.target);
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newItemValue.trim();
    if (!clean) return;

    const currentFromDb = type === 'SPECIALTY' 
      ? db.getSpecialties() 
      : type === 'ROOM' 
        ? db.getRooms() 
        : db.getDoctors();

    const exists = currentFromDb.some(i => i.toLowerCase() === clean.toLowerCase());
    if (exists) {
      setSuccessMessage(`O item "${clean}" já existe na lista.`);
      if (onSelectOption) onSelectOption(clean);
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    const updated = [...currentFromDb, clean];
    if (type === 'SPECIALTY') db.saveSpecialties(updated);
    else if (type === 'ROOM') db.saveRooms(updated);
    else db.saveDoctors(updated);

    refreshList();
    setNewItemValue('');
    onDataUpdated();
    if (onSelectOption) onSelectOption(clean);

    setSuccessMessage(`"${clean}" adicionado à lista com sucesso.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteItem = (itemToDelete: string) => {
    if (!confirm(`Tem certeza que deseja remover "${itemToDelete}" da lista de opções sugeridas? (Vagas já criadas permanecerão intactas).`)) {
      return;
    }

    if (type === 'SPECIALTY') {
      const updated = db.getSpecialties().filter(i => i.toLowerCase() !== itemToDelete.toLowerCase());
      db.saveSpecialties(updated);
    } else if (type === 'ROOM') {
      const updated = db.getRooms().filter(i => i.toLowerCase() !== itemToDelete.toLowerCase());
      db.saveRooms(updated);
    } else {
      db.deleteDoctor(itemToDelete);
    }

    refreshList();
    onDataUpdated();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{getTitle()}</h3>
              <p className="text-xs text-slate-500">
                Corrija erros de grafia, remova duplicidades e padronize a lista do sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 shrink-0 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Merge Conflict Alert */}
        {mergeConflict && (
          <div className="mt-3 p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold">
                  O item <span className="underline decoration-amber-500 font-mono">"{mergeConflict.target}"</span> já existe na lista!
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Deseja unificar todos os agendamentos e vagas com a grafia incorreta (<strong className="text-rose-700">"{mergeConflict.original}"</strong>) para o nome correto (<strong className="text-emerald-700">"{mergeConflict.target}"</strong>) e remover o erro de duplicidade?
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleConfirmMerge}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Sim, Unificar e Corrigir Tudo</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium rounded-lg text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Form */}
        <form onSubmit={handleAddNew} className="mt-4 flex gap-2 shrink-0">
          <input
            type="text"
            placeholder={
              type === 'SPECIALTY'
                ? 'Nova especialidade (ex: Cardiologia)...'
                : type === 'ROOM'
                ? 'Novo consultório (ex: Consultório 06)...'
                : 'Novo médico (ex: Dra. Mariana Costa)...'
            }
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-medium"
          />
          <button
            type="submit"
            disabled={!newItemValue.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar</span>
          </button>
        </form>

        {/* Items List */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Itens Cadastrados ({items.length})
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhum item cadastrado nesta lista.
            </div>
          ) : (
            items.map((item) => {
              const isEditing = editingItem === item;

              return (
                <div
                  key={item}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-600 font-semibold text-slate-900"
                      />
                      <button
                        onClick={() => handleSaveEdit(item)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                        title="Salvar alteração"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 truncate pr-2">
                      <span className="font-semibold text-xs text-slate-800 truncate">
                        {item}
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {onSelectOption && (
                        <button
                          onClick={() => {
                            onSelectOption(item);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                        >
                          Usar
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Alterar / Corrigir grafia"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover da lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
