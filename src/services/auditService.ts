import {
  collection,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLog } from '../types';

export const auditService = {
  subscribeAuditLogs(callback: (logs: AuditLog[]) => void) {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as AuditLog[];
        callback(logs);
      },
      (err) => console.error('Audit logs error:', err)
    );
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const snap = await getDocs(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AuditLog[];
    } catch {
      return [];
    }
  },

  async logAction(data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const id = `aud-${Date.now()}`;
    const newLog: AuditLog = {
      ...data,
      id,
      timestamp: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'auditLogs', id), {
        ...newLog,
        createdAt: serverTimestamp(),
      });
      return newLog;
    } catch {
      return newLog;
    }
  },
};
