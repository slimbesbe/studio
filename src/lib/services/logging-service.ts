
'use client';

import { 
  Firestore, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
  // On ne met pas de 'await' ici pour ne pas bloquer l'interface
  addDoc(logsRef, logData).catch(async (error) => {
    // Création d'une erreur contextuelle pour le débogage agentive
    const permissionError = new FirestorePermissionError({
      path: logsRef.path,
      operation: 'create',
      requestResourceData: logData
    } satisfies SecurityRuleContext);

    // Émission de l'erreur vers le listener central
    errorEmitter.emit('permission-error', permissionError);
  });
}
