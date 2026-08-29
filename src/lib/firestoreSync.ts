import { 
  firestoreDb, 
  testFirestoreConnection 
} from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { 
  User, 
  Posto, 
  Slot, 
  Appointment, 
  RegisteredPatient, 
  SystemRule, 
  AuditLog 
} from '../types';

let isInitialized = false;

// Notify React components of real-time cloud data updates
export function broadcastCloudUpdate(collectionName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('clinica_db_updated', { 
      detail: { collection: collectionName, timestamp: Date.now() } 
    }));
  }
}

// -------------------------------------------------------------
// FIRESTORE ASYNC WRITE HELPERS
// -------------------------------------------------------------
export async function syncSlotToFirestore(slot: Slot): Promise<void> {
  try {
    if (!slot || !slot.id) return;
    await setDoc(doc(firestoreDb, 'slots', slot.id), slot, { merge: true });
  } catch (err) {
    console.warn('[Firestore] syncSlot error:', err);
  }
}

export async function deleteSlotFromFirestore(slotId: string): Promise<void> {
  try {
    if (!slotId) return;
    await deleteDoc(doc(firestoreDb, 'slots', slotId));
  } catch (err) {
    console.warn('[Firestore] deleteSlot error:', err);
  }
}

export async function syncSlotsBatchToFirestore(slots: Slot[]): Promise<void> {
  try {
    if (!Array.isArray(slots) || slots.length === 0) return;
    // Batch in chunks of 450 (Firestore limit is 500)
    const chunkSize = 400;
    for (let i = 0; i < slots.length; i += chunkSize) {
      const chunk = slots.slice(i, i + chunkSize);
      const batch = writeBatch(firestoreDb);
      chunk.forEach(s => {
        if (s && s.id) {
          batch.set(doc(firestoreDb, 'slots', s.id), s, { merge: true });
        }
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('[Firestore] syncSlotsBatch error:', err);
  }
}

export async function syncAppointmentToFirestore(app: Appointment): Promise<void> {
  try {
    if (!app || !app.id) return;
    await setDoc(doc(firestoreDb, 'appointments', app.id), app, { merge: true });
  } catch (err) {
    console.warn('[Firestore] syncAppointment error:', err);
  }
}

export async function deleteAppointmentFromFirestore(appId: string): Promise<void> {
  try {
    if (!appId) return;
    await deleteDoc(doc(firestoreDb, 'appointments', appId));
  } catch (err) {
    console.warn('[Firestore] deleteAppointment error:', err);
  }
}

export async function syncAppointmentsBatchToFirestore(apps: Appointment[]): Promise<void> {
  try {
    if (!Array.isArray(apps) || apps.length === 0) return;
    const chunkSize = 400;
    for (let i = 0; i < apps.length; i += chunkSize) {
      const chunk = apps.slice(i, i + chunkSize);
      const batch = writeBatch(firestoreDb);
      chunk.forEach(a => {
        if (a && a.id) {
          batch.set(doc(firestoreDb, 'appointments', a.id), a, { merge: true });
        }
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('[Firestore] syncAppointmentsBatch error:', err);
  }
}

export async function syncPatientToFirestore(patient: RegisteredPatient): Promise<void> {
  try {
    if (!patient) return;
    const cleanCpf = (patient.cpf || '').replace(/\D/g, '');
    const docId = patient.id || (cleanCpf ? `pat_${cleanCpf}` : `pat_${Date.now()}`);
    await setDoc(doc(firestoreDb, 'patients', docId), { ...patient, id: docId }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] syncPatient error:', err);
  }
}

export async function deletePatientFromFirestore(patientId: string): Promise<void> {
  try {
    if (!patientId) return;
    await deleteDoc(doc(firestoreDb, 'patients', patientId));
  } catch (err) {
    console.warn('[Firestore] deletePatient error:', err);
  }
}

export async function syncPatientsBatchToFirestore(patients: RegisteredPatient[]): Promise<void> {
  try {
    if (!Array.isArray(patients) || patients.length === 0) return;
    const chunkSize = 400;
    for (let i = 0; i < patients.length; i += chunkSize) {
      const chunk = patients.slice(i, i + chunkSize);
      const batch = writeBatch(firestoreDb);
      chunk.forEach(p => {
        if (p) {
          const cleanCpf = (p.cpf || '').replace(/\D/g, '');
          const docId = p.id || (cleanCpf ? `pat_${cleanCpf}` : `pat_${Date.now()}`);
          batch.set(doc(firestoreDb, 'patients', docId), { ...p, id: docId }, { merge: true });
        }
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('[Firestore] syncPatientsBatch error:', err);
  }
}

export async function syncUserToFirestore(user: User): Promise<void> {
  try {
    if (!user || !user.id) return;
    await setDoc(doc(firestoreDb, 'users', user.id), user, { merge: true });
  } catch (err) {
    console.warn('[Firestore] syncUser error:', err);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    if (!userId) return;
    await deleteDoc(doc(firestoreDb, 'users', userId));
  } catch (err) {
    console.warn('[Firestore] deleteUser error:', err);
  }
}

export async function syncPostoToFirestore(posto: Posto): Promise<void> {
  try {
    if (!posto || !posto.id) return;
    await setDoc(doc(firestoreDb, 'postos', posto.id), posto, { merge: true });
  } catch (err) {
    console.warn('[Firestore] syncPosto error:', err);
  }
}

export async function deletePostoFromFirestore(postoId: string): Promise<void> {
  try {
    if (!postoId) return;
    await deleteDoc(doc(firestoreDb, 'postos', postoId));
  } catch (err) {
    console.warn('[Firestore] deletePosto error:', err);
  }
}

export async function syncRulesToFirestore(rules: SystemRule): Promise<void> {
  try {
    if (!rules) return;
    await setDoc(doc(firestoreDb, 'rules', 'main'), rules, { merge: true });
  } catch (err) {
    console.warn('[Firestore] syncRules error:', err);
  }
}

export async function syncLogToFirestore(log: AuditLog): Promise<void> {
  try {
    if (!log || !log.id) return;
    await setDoc(doc(firestoreDb, 'logs', log.id), log, { merge: true });
  } catch (err) {
    console.warn('[Firestore] syncLog error:', err);
  }
}

// -------------------------------------------------------------
// FIRESTORE HARD RESET / CLEAN PURGE HELPER
// -------------------------------------------------------------
export async function purgeAndResetFirestoreProductionData(initialSeed: {
  users: User[];
  postos: Posto[];
  rules: SystemRule;
}): Promise<void> {
  try {
    console.log('[Firestore] Purging all test residues and resetting to clean production...');

    // 1. Purge all slots
    const slotsSnap = await getDocs(collection(firestoreDb, 'slots'));
    const slotBatch = writeBatch(firestoreDb);
    slotsSnap.forEach(d => slotBatch.delete(d.ref));
    await slotBatch.commit().catch(e => console.warn(e));

    // 2. Purge all appointments
    const appsSnap = await getDocs(collection(firestoreDb, 'appointments'));
    const appBatch = writeBatch(firestoreDb);
    appsSnap.forEach(d => appBatch.delete(d.ref));
    await appBatch.commit().catch(e => console.warn(e));

    // 3. Purge all patients
    const patSnap = await getDocs(collection(firestoreDb, 'patients'));
    const patBatch = writeBatch(firestoreDb);
    patSnap.forEach(d => patBatch.delete(d.ref));
    await patBatch.commit().catch(e => console.warn(e));

    // 4. Reset Users: Delete non-master users from Firestore, ensure master exists
    const usersSnap = await getDocs(collection(firestoreDb, 'users'));
    const userBatch = writeBatch(firestoreDb);
    const masterIds = new Set(initialSeed.users.map(u => u.id));
    usersSnap.forEach(d => {
      if (!masterIds.has(d.id)) {
        userBatch.delete(d.ref);
      }
    });
    initialSeed.users.forEach(u => {
      userBatch.set(doc(firestoreDb, 'users', u.id), u);
    });
    await userBatch.commit().catch(e => console.warn(e));

    // 5. Reset Postos (P202 to P230)
    const postosBatch = writeBatch(firestoreDb);
    initialSeed.postos.forEach(p => {
      postosBatch.set(doc(firestoreDb, 'postos', p.id), p);
    });
    await postosBatch.commit().catch(e => console.warn(e));

    // 6. Reset Rules
    await setDoc(doc(firestoreDb, 'rules', 'main'), initialSeed.rules).catch(e => console.warn(e));

    console.log('[Firestore] Production database reset complete.');
    broadcastCloudUpdate('all');
  } catch (err) {
    console.error('[Firestore] purgeAndResetFirestoreProductionData error:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// REAL-TIME FIRESTORE SUBSCRIPTIONS & SEEDING
// -------------------------------------------------------------
export function setupFirestoreRealtimeSync(callbacks: {
  onUsersUpdate: (users: User[]) => void;
  onPostosUpdate: (postos: Posto[]) => void;
  onSlotsUpdate: (slots: Slot[]) => void;
  onAppointmentsUpdate: (apps: Appointment[]) => void;
  onPatientsUpdate: (patients: RegisteredPatient[]) => void;
  onRulesUpdate: (rules: SystemRule) => void;
  onLogsUpdate: (logs: AuditLog[]) => void;
  initialSeed: {
    users: User[];
    postos: Posto[];
    rules: SystemRule;
  };
}) {
  if (isInitialized) return;
  isInitialized = true;

  testFirestoreConnection();

  // 1. Subscribe to USERS
  onSnapshot(collection(firestoreDb, 'users'), async (snapshot) => {
    if (snapshot.empty) {
      // First boot: Seed initial users into Firestore
      console.log('[Firestore] Seeding initial users into Firestore...');
      const batch = writeBatch(firestoreDb);
      callbacks.initialSeed.users.forEach(u => {
        batch.set(doc(firestoreDb, 'users', u.id), u);
      });
      await batch.commit().catch(e => console.warn('Seed users error:', e));
      callbacks.onUsersUpdate(callbacks.initialSeed.users);
    } else {
      const users: User[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as User;
        if (data && data.id && data.email) {
          users.push(data);
        }
      });
      callbacks.onUsersUpdate(users);
      broadcastCloudUpdate('users');
    }
  }, (err) => {
    console.warn('[Firestore Users listener notice]:', err.message);
  });

  // 2. Subscribe to POSTOS
  onSnapshot(collection(firestoreDb, 'postos'), async (snapshot) => {
    if (snapshot.empty) {
      console.log('[Firestore] Seeding 26 initial postos into Firestore...');
      const batch = writeBatch(firestoreDb);
      callbacks.initialSeed.postos.forEach(p => {
        batch.set(doc(firestoreDb, 'postos', p.id), p);
      });
      await batch.commit().catch(e => console.warn('Seed postos error:', e));
      callbacks.onPostosUpdate(callbacks.initialSeed.postos);
    } else {
      const postos: Posto[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Posto;
        if (data && data.id) {
          postos.push(data);
        }
      });
      callbacks.onPostosUpdate(postos);
      broadcastCloudUpdate('postos');
    }
  }, (err) => {
    console.warn('[Firestore Postos listener notice]:', err.message);
  });

  // 3. Subscribe to SLOTS
  onSnapshot(collection(firestoreDb, 'slots'), (snapshot) => {
    const slots: Slot[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Slot;
      if (data && data.id) {
        slots.push(data);
      }
    });
    callbacks.onSlotsUpdate(slots);
    broadcastCloudUpdate('slots');
  }, (err) => {
    console.warn('[Firestore Slots listener notice]:', err.message);
  });

  // 4. Subscribe to APPOINTMENTS
  onSnapshot(collection(firestoreDb, 'appointments'), (snapshot) => {
    const apps: Appointment[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Appointment;
      if (data && data.id) {
        apps.push(data);
      }
    });
    callbacks.onAppointmentsUpdate(apps);
    broadcastCloudUpdate('appointments');
  }, (err) => {
    console.warn('[Firestore Appointments listener notice]:', err.message);
  });

  // 5. Subscribe to PATIENTS
  onSnapshot(collection(firestoreDb, 'patients'), (snapshot) => {
    const patients: RegisteredPatient[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as RegisteredPatient;
      if (data && data.id) {
        patients.push(data);
      }
    });
    callbacks.onPatientsUpdate(patients);
    broadcastCloudUpdate('patients');
  }, (err) => {
    console.warn('[Firestore Patients listener notice]:', err.message);
  });

  // 6. Subscribe to RULES
  onSnapshot(doc(firestoreDb, 'rules', 'main'), async (docSnap) => {
    if (!docSnap.exists()) {
      console.log('[Firestore] Seeding default rules into Firestore...');
      await setDoc(doc(firestoreDb, 'rules', 'main'), callbacks.initialSeed.rules).catch(e => console.warn(e));
      callbacks.onRulesUpdate(callbacks.initialSeed.rules);
    } else {
      const data = docSnap.data() as SystemRule;
      if (data) {
        callbacks.onRulesUpdate(data);
        broadcastCloudUpdate('rules');
      }
    }
  }, (err) => {
    console.warn('[Firestore Rules listener notice]:', err.message);
  });

  // 7. Subscribe to LOGS
  onSnapshot(collection(firestoreDb, 'logs'), (snapshot) => {
    const logs: AuditLog[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as AuditLog;
      if (data && data.id) {
        logs.push(data);
      }
    });
    callbacks.onLogsUpdate(logs);
    broadcastCloudUpdate('logs');
  }, (err) => {
    console.warn('[Firestore Logs listener notice]:', err.message);
  });
}
