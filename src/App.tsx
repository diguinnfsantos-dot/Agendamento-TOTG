import React, { useState, useEffect } from 'react';
import { User, Posto, Slot, Appointment, SystemRule, ActiveTab, RegisteredPatient } from './types';
import { db, sessionBroadcast } from './storage/db';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAgenda } from './components/AdminAgenda';
import { AdminAppointments } from './components/AdminAppointments';
import { AdminPatients } from './components/AdminPatients';
import { AdminOperators } from './components/AdminOperators';
import { AdminPostos } from './components/AdminPostos';
import { AdminReports } from './components/AdminReports';
import { AdminTools } from './components/AdminTools';
import { AdminManager } from './components/AdminManager';
import { AdminClinicalRegistry } from './components/AdminClinicalRegistry';
import { OperatorBooking } from './components/OperatorBooking';
import { WhatsAppModal } from './components/WhatsAppModal';
import { ReceiptModal } from './components/ReceiptModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { Building, ShieldCheck, Calendar, Phone, CheckCircle2, RotateCcw, ShieldAlert, Laptop, LogIn, ArrowRight, Edit3, Check, X } from 'lucide-react';
import { formatPhone } from './utils/formatters';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => db.getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [postos, setPostos] = useState<Posto[]>(() => db.getPostos());
  const [slots, setSlots] = useState<Slot[]>(() => db.getSlots());
  const [appointments, setAppointments] = useState<Appointment[]>(() => db.getAppointments());
  const [patients, setPatients] = useState<RegisteredPatient[]>(() => db.getPatients());
  const [rules, setRules] = useState<SystemRule>(() => db.getRules());

  // Modal for Remote Disconnection ("Sua conta foi conectada em outro equipamento")
  const [disconnectedSessionModal, setDisconnectedSessionModal] = useState<{
    show: boolean;
    message: string;
    deviceHint?: string;
  } | null>(null);

  // Current active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const user = db.getCurrentUser();
    return user && user.role === 'ADMIN' ? 'PAINEL' : 'AGENDAMENTOS';
  });

  // Modals for WhatsApp, Receipts, and Google Workspace
  const [whatsAppModalState, setWhatsAppModalState] = useState<{
    appointment: Appointment;
    isCustomPhoneMode?: boolean;
  } | null>(null);
  const [receiptApp, setReceiptApp] = useState<Appointment | null>(null);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [editingOperatorPhone, setEditingOperatorPhone] = useState(false);
  const [phoneEditInput, setPhoneEditInput] = useState('');
  const [phoneSaveMsg, setPhoneSaveMsg] = useState('');

  const handleOpenWhatsApp = (app: Appointment, isCustomPhoneMode: boolean = false) => {
    setWhatsAppModalState({ appointment: app, isCustomPhoneMode });
  };

  // Sync users, rules, postos, slots, and appointments with Cloud API on mount and background interval
  useEffect(() => {
    db.fetchServerUsers().then(serverUsers => {
      if (serverUsers && serverUsers.length > 0) {
        setUsers(serverUsers);
      }
    });

    db.fetchServerRules().then(serverRules => {
      if (serverRules) {
        setRules(serverRules);
      }
    });

    db.fetchServerPostos().then(serverPostos => {
      if (serverPostos && serverPostos.length > 0) {
        setPostos(serverPostos);
      }
    });

    db.fetchServerSlots().then(serverSlots => {
      if (serverSlots) {
        setSlots(serverSlots);
      }
    });

    db.fetchServerAppointments().then(serverApps => {
      if (serverApps) {
        setAppointments(serverApps);
      }
    });

    const interval = setInterval(() => {
      db.fetchServerUsers().then(serverUsers => {
        if (serverUsers && serverUsers.length > 0) {
          setUsers(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(serverUsers)) {
              return serverUsers;
            }
            return prev;
          });
        }
      });

      db.fetchServerPostos().then(serverPostos => {
        if (serverPostos && serverPostos.length > 0) {
          setPostos(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(serverPostos)) {
              return serverPostos;
            }
            return prev;
          });
        }
      });

      db.fetchServerSlots().then(serverSlots => {
        if (serverSlots) {
          setSlots(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(serverSlots)) {
              return serverSlots;
            }
            return prev;
          });
        }
      });

      db.fetchServerAppointments().then(serverApps => {
        if (serverApps) {
          setAppointments(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(serverApps)) {
              return serverApps;
            }
            return prev;
          });
        }
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Session and active tab sync
  useEffect(() => {
    db.setCurrentUser(currentUser);
    if (currentUser) {
      if (currentUser.role === 'ADMIN') {
        setActiveTab(prev => (prev === 'ENTRADA' ? 'PAINEL' : prev));
      } else {
        setActiveTab('AGENDAMENTOS');
      }
    }
  }, [currentUser]);

  // Session Heartbeat & Concurrent Login Detection Loop
  useEffect(() => {
    if (!currentUser) return;

    // Ensure session ID exists
    let sessionId = db.getSessionId();
    if (!sessionId) {
      sessionId = `sess_${currentUser.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      db.setSessionId(sessionId);
    }

    const handleRemoteDisconnect = (noticeMsg: string, newDevice?: string) => {
      db.setCurrentUser(null);
      db.setSessionId(null);
      db.setDisconnectedNotice(noticeMsg);
      setDisconnectedSessionModal({
        show: true,
        message: noticeMsg,
        deviceHint: newDevice,
      });
      setCurrentUser(null);
    };

    const checkHeartbeat = async () => {
      try {
        const currentSessId = db.getSessionId();
        if (!currentSessId || !currentUser) return;

        const res = await db.sendHeartbeatApi(
          currentUser.id,
          currentSessId,
          currentUser.email,
          currentUser.nome,
          currentUser.role,
          db.getDeviceHint()
        );

        if (res && res.valid === false) {
          // This session was invalidated by new login, pending supervisor approval or admin block!
          const noticeMsg = res.message || 'Sua sessão foi encerrada.';
          handleRemoteDisconnect(noticeMsg, res.newDeviceHint);
        }
      } catch (err) {
        // Silent network failure tolerance
      }
    };

    // Immediate initial heartbeat ping
    checkHeartbeat();

    // Heartbeat every 3.5 seconds
    const interval = setInterval(checkHeartbeat, 3500);

    // Cross-tab broadcast listener for instant disconnection
    const handleBroadcast = (event: MessageEvent) => {
      if (!currentUser) return;
      const data = event.data;
      if (data?.type === 'FORCE_LOGIN_DISCONNECT') {
        const isSameEmail = data.userEmail && currentUser.email.toLowerCase() === data.userEmail.toLowerCase();
        const currentSessId = db.getSessionId();
        if (isSameEmail && currentSessId && currentSessId !== data.newSessionId) {
          const noticeMsg = `Sua sessão foi encerrada porque sua conta foi conectada em outro equipamento (${data.deviceHint || 'Outro dispositivo'}).`;
          handleRemoteDisconnect(noticeMsg, data.deviceHint);
        }
      }
    };

    if (sessionBroadcast) {
      sessionBroadcast.addEventListener('message', handleBroadcast);
    }

    // Cross-tab localStorage storage listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'clinica_latest_session_owner_v1' && e.newValue && currentUser) {
        try {
          const owner = JSON.parse(e.newValue);
          if (owner.email && owner.email.toLowerCase() === currentUser.email.toLowerCase()) {
            const currentSessId = db.getSessionId();
            if (currentSessId && owner.sessionId && currentSessId !== owner.sessionId) {
              const noticeMsg = `Sua sessão foi encerrada porque sua conta foi conectada em outro equipamento (${owner.deviceHint || 'Outro dispositivo'}).`;
              handleRemoteDisconnect(noticeMsg, owner.deviceHint);
            }
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);

    // Re-verify immediately when user refocuses the tab / window
    const handleFocus = () => {
      checkHeartbeat();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      if (sessionBroadcast) {
        sessionBroadcast.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [currentUser]);

  // Ensure any pending or blocked operator is never active
  useEffect(() => {
    if (currentUser && currentUser.role === 'OPERATOR' && (currentUser.status === 'PENDING' || currentUser.status === 'BLOCKED')) {
      db.setCurrentUser(null);
      db.setSessionId(null);
      setCurrentUser(null);
    }
  }, [currentUser]);

  // Auth Handlers
  const handleLogin = (user: User) => {
    if (user.role === 'OPERATOR') {
      if (user.status === 'PENDING') {
        alert('ACESSO BLOQUEADO: Seu cadastro está PENDENTE de autorização pelo Administrador Master. Por motivos de segurança, aguarde a supervisão e desbloqueio do Administrador.');
        db.setCurrentUser(null);
        db.setSessionId(null);
        setCurrentUser(null);
        return;
      }
      if (user.status === 'BLOCKED') {
        alert('ACESSO BLOQUEADO: Seu usuário foi bloqueado pela administração da clínica.');
        db.setCurrentUser(null);
        db.setSessionId(null);
        setCurrentUser(null);
        return;
      }
    }
    db.setCurrentUser(user);
    const freshUsers = db.getUsers();
    setUsers(freshUsers);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    const sessId = db.getSessionId();
    if (currentUser && sessId) {
      try {
        await db.logoutSessionApi(currentUser.id, sessId, currentUser.email);
      } catch (err) {
        // Silent fail
      }
    }
    db.setCurrentUser(null);
    db.setSessionId(null);
    setCurrentUser(null);
  };

  const handleRegisterUser = (newUser: Omit<User, 'id' | 'criadoEm'>) => {
    const emailExists = users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
    if (emailExists) {
      return { success: false, message: 'Já existe um operador cadastrado com este email institucional.' };
    }

    const created: User = {
      ...newUser,
      id: `usr_op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      criadoEm: new Date().toISOString(),
    };

    setUsers(prev => {
      const updated = [created, ...prev];
      db.saveUsers(updated);
      return updated;
    });

    // Also persist to backend API
    db.registerUserApi(newUser).catch(() => {});

    // Audit log
    db.addLog(
      created.nome,
      created.email,
      'NOVO_OPERADOR_CADASTRADO',
      `Novo operador ${created.nome} (${created.email}) cadastrado para o posto ${created.postoId} (${created.origem}). Status: ${created.status === 'PENDING' ? 'PENDENTE de autorização' : 'ATIVO'}.`,
      'INFO'
    );

    return { success: true, message: 'Cadastro registrado com sucesso!' };
  };

  const handleRecoverOperators = async (searchName?: string) => {
    const result = await db.recoverAndSyncOperators(searchName);
    if (result.users && result.users.length > 0) {
      setUsers(result.users);
    }
    return result;
  };

  const handleApproveAllPending = async () => {
    const pending = users.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING');
    if (pending.length === 0) return;

    setUsers(prev => {
      const updated = prev.map(u => (u.role === 'OPERATOR' && u.status === 'PENDING') ? { ...u, status: 'ACTIVE' as const } : u);
      db.saveUsers(updated);
      return updated;
    });

    for (const op of pending) {
      db.updateUserStatusApi(op.id, 'ACTIVE').catch(() => {});
    }

    db.addLog(
      currentUser?.nome || 'Administrador Master',
      currentUser?.email || 'admin@klinica.com',
      'TODOS_OPERADORES_AUTORIZADOS',
      `Todos os ${pending.length} operadores pendentes foram autorizados em lote pelo Administrador Master.`,
      'SUCESSO'
    );
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => {
      const exists = prev.some(u => u.id === updatedUser.id);
      const updated = exists
        ? prev.map(u => (u.id === updatedUser.id || (u.role === 'ADMIN' && updatedUser.role === 'ADMIN')) ? updatedUser : u)
        : [...prev, updatedUser];
      db.saveUsers(updated);
      return updated;
    });

    // Persist to backend API (Cloud SQL and server memory)
    db.updateUserApi(updatedUser).catch(err => {
      console.warn('Backend user update error:', err);
    });

    if (currentUser?.id === updatedUser.id || (currentUser?.role === 'ADMIN' && updatedUser.role === 'ADMIN')) {
      db.setCurrentUser(updatedUser);
      setCurrentUser(updatedUser);
    }
  };

  const handleUpdateUserStatus = (userId: string, status: 'ACTIVE' | 'BLOCKED') => {
    setUsers(prev => {
      const updated = prev.map(u => u.id === userId ? { ...u, status } : u);
      db.saveUsers(updated);
      return updated;
    });

    db.updateUserStatusApi(userId, status).catch(() => {});

    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      db.addLog(
        currentUser?.nome || 'Administrador Master',
        currentUser?.email || 'admin@klinica.com',
        status === 'ACTIVE' ? 'OPERADOR_AUTORIZADO' : 'OPERADOR_BLOQUEADO',
        `Acesso do operador ${targetUser.nome} (${targetUser.email}) foi ${status === 'ACTIVE' ? 'AUTORIZADO (Ativo)' : 'BLOQUEADO'}.`,
        status === 'ACTIVE' ? 'SUCESSO' : 'AVISO'
      );
    }
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    setUsers(prev => {
      const updated = prev.filter(u => u.id !== userId);
      db.saveUsers(updated);
      return updated;
    });

    db.deleteUserApi(userId, targetUser?.email).catch(() => {});

    if (targetUser) {
      db.addLog(
        currentUser?.nome || 'Administrador Master',
        currentUser?.email || 'admin@klinica.com',
        'OPERADOR_EXCLUIDO',
        `Operador ${targetUser.nome} (${targetUser.email}) foi excluído do sistema.`,
        'AVISO'
      );
    }
  };

  // Admin Postos Actions
  const handleSavePosto = (newPosto: Posto) => {
    setPostos(prev => {
      const exists = prev.some(p => p.id === newPosto.id);
      const updated = exists ? prev.map(p => p.id === newPosto.id ? newPosto : p) : [...prev, newPosto];
      db.savePostos(updated);
      return updated;
    });
    db.saveSinglePostoApi(newPosto).catch(() => {});
  };

  const handleDeletePosto = (postoId: string) => {
    setPostos(prev => {
      const updated = prev.filter(p => p.id !== postoId);
      db.savePostos(updated);
      return updated;
    });
    db.deletePostoApi(postoId).catch(() => {});
  };

  // Admin Agenda Actions
  const handleAddSlots = (newSlots: Slot[]) => {
    setSlots(prev => {
      const updated = [...prev, ...newSlots];
      db.saveSlots(updated);
      return updated;
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    setSlots(prev => {
      const updated = prev.filter(s => s.id !== slotId);
      db.saveSlots(updated);
      return updated;
    });
  };

  const handleUpdateRules = (newRules: SystemRule) => {
    db.saveRules(newRules);
    setRules(newRules);
  };

  // Appointment & Booking Actions
  const handleSaveAppointment = (newApp: Appointment) => {
    // 1. Marca slot como AGENDADO
    setSlots(prev => {
      const updatedSlots = prev.map(s => {
        if (s.id === newApp.slotId) {
          return { ...s, status: 'AGENDADO' as const, agendamentoId: newApp.id };
        }
        return s;
      });
      db.saveSlots(updatedSlots);
      return updatedSlots;
    });

    // 2. Insere novo agendamento
    setAppointments(prev => {
      const updatedApps = [newApp, ...prev];
      db.saveAppointments(updatedApps);
      return updatedApps;
    });
  };

  const handleRequestCancel = (appointmentId: string, motivo: string) => {
    setAppointments(prev => {
      const updated = prev.map(a => {
        if (a.id === appointmentId) {
          return {
            ...a,
            status: 'CANCEL_REQUESTED' as const,
            motivoCancelamento: motivo,
            atualizadoEm: new Date().toISOString(),
          };
        }
        return a;
      });
      db.saveAppointments(updated);
      return updated;
    });
  };

  const handleApproveCancel = (appointmentId: string) => {
    const targetApp = appointments.find(a => a.id === appointmentId);
    if (!targetApp) return;

    // 1. Libera o slot imediatamente
    setSlots(prev => {
      const updatedSlots = prev.map(s => {
        if (s.id === targetApp.slotId) {
          return { ...s, status: 'DISPONIVEL' as const, agendamentoId: undefined };
        }
        return s;
      });
      db.saveSlots(updatedSlots);
      return updatedSlots;
    });

    // 2. Marca o agendamento como CANCELLED
    setAppointments(prev => {
      const updatedApps = prev.map(a => {
        if (a.id === appointmentId) {
          return {
            ...a,
            status: 'CANCELLED' as const,
            atualizadoEm: new Date().toISOString(),
          };
        }
        return a;
      });
      db.saveAppointments(updatedApps);
      return updatedApps;
    });
  };

  const handleRejectCancel = (appointmentId: string) => {
    setAppointments(prev => {
      const updated = prev.map(a => {
        if (a.id === appointmentId) {
          return {
            ...a,
            status: 'CONFIRMED' as const,
            motivoCancelamento: undefined,
            atualizadoEm: new Date().toISOString(),
          };
        }
        return a;
      });
      db.saveAppointments(updated);
      return updated;
    });
  };

  // Pending badges
  const pendingOperatorsCount = users.filter(u => u.role === 'OPERATOR' && u.status === 'PENDING').length;
  const pendingCancelsCount = appointments.filter(a => a.status === 'CANCEL_REQUESTED').length;

  // Unauthenticated view
  if (!currentUser) {
    return (
      <>
        <AuthScreen
          postos={postos}
          users={users}
          onLogin={handleLogin}
          onRegister={handleRegisterUser}
        />

        {/* Remote Disconnect Modal Alert */}
        {disconnectedSessionModal && (
          <div 
            id="modal-disconnected-notice"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
          >
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-amber-300 overflow-hidden animate-scaleIn">
              <div className="bg-amber-600 p-5 text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-amber-100 block">
                    Aviso de Segurança e Desconexão
                  </span>
                  <h3 className="text-base font-black text-white leading-tight">
                    Sua Conexão Foi Encerrada
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 leading-relaxed">
                  {disconnectedSessionModal.message}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-800">
                    💡 Por que isso aconteceu?
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Para garantir a estabilidade do sistema e impedir que operadores fiquem logados simultaneamente em múltiplos aparelhos (computador, celular ou tablet), o sistema mantém apenas <strong>uma sessão ativa por conta</strong>.
                  </p>
                  {disconnectedSessionModal.deviceHint && (
                    <p className="text-[11px] font-mono text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                      Novo equipamento autenticado: <strong>{disconnectedSessionModal.deviceHint}</strong>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  id="btn-dismiss-disconnected-modal"
                  onClick={() => {
                    setDisconnectedSessionModal(null);
                    db.clearDisconnectedNotice();
                  }}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-blue-400" />
                  <span>Compreendido, Fazer Login Neste Aparelho</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOperatorsCount={pendingOperatorsCount}
        pendingCancelsCount={pendingCancelsCount}
        onLogout={handleLogout}
        onOpenWorkspace={currentUser.role === 'ADMIN' && currentUser.email.toLowerCase().trim() === 'diguinnfsantos@gmail.com' ? () => setShowWorkspaceModal(true) : undefined}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ADMINISTRATOR VIEWS */}
        {currentUser.role === 'ADMIN' && (
          <>
            {activeTab === 'PAINEL' && (
              <AdminDashboard
                slots={slots}
                appointments={appointments}
                postos={postos}
                users={users}
                rules={rules}
              />
            )}

            {activeTab === 'AGENDA' && (
              <AdminAgenda
                slots={slots}
                appointments={appointments}
                rules={rules}
                onUpdateRules={handleUpdateRules}
                onAddSlots={handleAddSlots}
                onDeleteSlot={handleDeleteSlot}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSlotsUpdated={(newSlots) => setSlots(newSlots)}
                onAppointmentsUpdated={(newApps) => setAppointments(newApps)}
              />
            )}

            {activeTab === 'CADASTROS' && (
              <AdminClinicalRegistry
                slots={slots}
                appointments={appointments}
                onSlotsUpdated={(newSlots) => setSlots(newSlots)}
                onAppointmentsUpdated={(newApps) => setAppointments(newApps)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'AGENDAMENTOS' && (
              <AdminAppointments
                appointments={appointments}
                slots={slots}
                postos={postos}
                rules={rules}
                onApproveCancel={handleApproveCancel}
                onRejectCancel={handleRejectCancel}
                onOpenWhatsApp={handleOpenWhatsApp}
                onOpenReceipt={(app) => setReceiptApp(app)}
              />
            )}

            {activeTab === 'PACIENTES' && (
              <AdminPatients
                patients={patients}
                postos={postos}
                appointments={appointments}
                rules={rules}
                currentUser={currentUser}
                onPatientsUpdated={(newPatients) => setPatients(newPatients)}
                onOpenWhatsApp={handleOpenWhatsApp}
                onOpenReceipt={(app) => setReceiptApp(app)}
              />
            )}

            {activeTab === 'OPERADORES' && (
              <AdminOperators
                users={users}
                postos={postos}
                onUpdateUserStatus={handleUpdateUserStatus}
                onDeleteUser={handleDeleteUser}
                onUpdateUser={handleUpdateUser}
                onRegisterUser={handleRegisterUser}
                onRecoverOperators={handleRecoverOperators}
                onApproveAllPending={handleApproveAllPending}
              />
            )}

            {activeTab === 'POSTOS' && (
              <AdminPostos
                postos={postos}
                users={users}
                appointments={appointments}
                rules={rules}
                onSavePosto={handleSavePosto}
                onDeletePosto={handleDeletePosto}
              />
            )}

            {activeTab === 'RELATORIO' && (
              <AdminReports
                slots={slots}
                appointments={appointments}
                postos={postos}
                onOpenWorkspace={() => setShowWorkspaceModal(true)}
              />
            )}

            {activeTab === 'FERRAMENTAS' && (
              <AdminTools
                users={users}
                postos={postos}
                slots={slots}
                appointments={appointments}
                rules={rules}
                onOpenWorkspace={() => setShowWorkspaceModal(true)}
              />
            )}

            {activeTab === 'GERENCIADOR' && (
              <AdminManager
                currentUser={currentUser}
                users={users}
                postos={postos}
                slots={slots}
                appointments={appointments}
                rules={rules}
                onUpdateRules={(newRules) => setRules(newRules)}
                onUpdateUser={handleUpdateUser}
                onSlotsUpdated={(newSlots) => setSlots(newSlots)}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onUpdateUserStatus={handleUpdateUserStatus}
              />
            )}
          </>
        )}

        {/* OPERATOR VIEWS */}
        {currentUser.role === 'OPERATOR' && (
          <>
            {activeTab === 'AGENDAMENTOS' && (
              <OperatorBooking
                currentUser={currentUser}
                slots={slots}
                appointments={appointments}
                rules={rules}
                onSaveAppointment={handleSaveAppointment}
                onRequestCancel={handleRequestCancel}
                onOpenWhatsApp={handleOpenWhatsApp}
                onOpenReceipt={(app) => setReceiptApp(app)}
              />
            )}

            {activeTab === 'ENTRADA' && (
              <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-5 text-center">
                <div className="w-16 h-16 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center mx-auto">
                  <Building className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{currentUser.nome}</h2>
                  <p className="text-sm text-slate-500">{currentUser.email}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-3 max-w-md mx-auto">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Código ID do Posto:</span>
                    <span className="font-bold text-teal-800 font-mono bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{currentUser.postoId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Origem Vinculada:</span>
                    <span className="font-bold text-slate-800">{currentUser.origem}</span>
                  </div>

                  {/* Telefone / WhatsApp do Operador */}
                  <div className="border-t border-b border-slate-200 py-2.5 my-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp do Operador:</span>
                      </span>
                      {!editingOperatorPhone ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            {currentUser.telefone || 'Não cadastrado'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPhoneEditInput(currentUser.telefone || '');
                              setEditingOperatorPhone(true);
                              setPhoneSaveMsg('');
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
                            title="Editar número de WhatsApp"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingOperatorPhone(false)}
                          className="text-slate-400 hover:text-slate-600 text-[11px] font-bold"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    {editingOperatorPhone && (
                      <div className="p-3 bg-white border border-emerald-300 rounded-xl space-y-2 animate-fadeIn">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                          Novo número de contato (com DDD):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="tel"
                            placeholder="(21) 99999-9999"
                            value={phoneEditInput}
                            onChange={(e) => setPhoneEditInput(formatPhone(e.target.value))}
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const clean = phoneEditInput.trim();
                              const updatedUser: User = { ...currentUser, telefone: clean };
                              handleUpdateUser(updatedUser);
                              try {
                                await db.updateUserPhone(updatedUser.id, clean);
                              } catch {}
                              setEditingOperatorPhone(false);
                              setPhoneSaveMsg('WhatsApp do Operador atualizado com sucesso!');
                              setTimeout(() => setPhoneSaveMsg(''), 4000);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Este número será usado para canais de contato e lembretes de WhatsApp enviados pelo seu posto.
                        </p>
                      </div>
                    )}

                    {phoneSaveMsg && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{phoneSaveMsg}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Status da Conta:</span>
                    <span className="font-bold text-emerald-700">✓ Ativo & Autorizado</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cota Geral de Vagas:</span>
                    <span className="font-bold text-slate-800">{rules.maxVagasPorId} vagas por ID</span>
                  </div>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('AGENDAMENTOS')}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Ir para Tela de Agendamento</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Sair da Conta
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{rules.nomeClinica}</span>
            <span>•</span>
            <span>Regulação de Vagas Médicas & Lembretes WhatsApp</span>
          </div>

          {currentUser?.role === 'ADMIN' && currentUser?.email?.toLowerCase().trim() === 'diguinnfsantos@gmail.com' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (window.confirm('Deseja redefinir todos os dados de demonstração (postos, agenda e agendamentos)?')) {
                    db.resetAllData();
                    window.location.reload();
                  }
                }}
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                title="Restaurar dados iniciais para demonstração"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Demonstração</span>
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* WhatsApp Modal */}
      {whatsAppModalState && (
        <WhatsAppModal
          appointment={whatsAppModalState.appointment}
          isCustomPhoneMode={whatsAppModalState.isCustomPhoneMode}
          rules={rules}
          onClose={() => setWhatsAppModalState(null)}
          onAppointmentUpdated={(updated) => {
            setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
            setWhatsAppModalState(prev => prev ? { ...prev, appointment: updated } : null);
          }}
        />
      )}

      {/* Receipt Modal */}
      {receiptApp && (
        <ReceiptModal
          appointment={receiptApp}
          rules={rules}
          onClose={() => setReceiptApp(null)}
        />
      )}

      {/* Google Workspace & Cloud SQL Modal (Exclusivo Administrador Master) */}
      {currentUser.role === 'ADMIN' && (
        <GoogleWorkspaceModal
          isOpen={showWorkspaceModal}
          onClose={() => setShowWorkspaceModal(false)}
          currentUser={currentUser}
          appointments={appointments}
          postos={postos}
          slots={slots}
          rules={rules}
          onRefreshData={() => {
            setAppointments(db.getAppointments());
            setSlots(db.getSlots());
          }}
        />
      )}
    </div>
  );
}
