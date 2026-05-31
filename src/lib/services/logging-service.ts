'use client';

import { 
  Firestore, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Enregistre une activité utilisateur dans la collection userLogs.
 * Cette fonction est non-bloquante et sécurisée contre les appels non-authentifiés.
 */
export function logActivity(
  db: Firestore, 
  userId: string, 
  action: string, 
  metadata: any = {}
) {
  if (!userId || !db) return;

  // Sécurité supplémentaire : On vérifie si l'utilisateur est authentifié au niveau SDK
  // pour éviter des erreurs de permission inutiles lors de transitions d'état.
  const auth = getAuth();
  if (!auth.currentUser) return;
  
  const logsRef = collection(db, 'userLogs');
  const logData = {
    userId,
    action,
    timestamp: serverTimestamp(),
    ...metadata
  };

  // On initie l'écriture sans 'await' pour garder l'UI réactive.
  addDoc(logsRef, logData).catch(async (serverError) => {
    // Si l'écriture échoue (ex: règles de sécurité), on émet une erreur contextuelle
    const permissionError = new FirestorePermissionError({
      path: logsRef.path,
      operation: 'create',
      requestResourceData: logData
    } satisfies SecurityRuleContext);

    errorEmitter.emit('permission-error', permissionError);
  });
}
