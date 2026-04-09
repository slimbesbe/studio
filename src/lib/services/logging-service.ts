
'use client';

import { 
  Firestore, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Enregistre une activité utilisateur dans la collection userLogs.
 */
export function logActivity(
  db: Firestore, 
  userId: string, 
  action: string, 
  metadata: any = {}
) {
  if (!userId || !db) return;
  
  const logsRef = collection(db, 'userLogs');
  const logData = {
    userId,
    action,
    timestamp: serverTimestamp(),
    ...metadata
  };

  // Pattern non-bloquant conformément aux instructions
  addDoc(logsRef, logData).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: logsRef.path,
      operation: 'create',
      requestResourceData: logData
    }));
  });
}
