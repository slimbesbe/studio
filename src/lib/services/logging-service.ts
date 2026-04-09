'use client';

import { 
  Firestore, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Enregistre une activité utilisateur dans la collection userLogs.
 */
export async function logActivity(
  db: Firestore, 
  userId: string, 
  action: string, 
  metadata: any = {}
) {
  if (!userId || !db) return;
  
  try {
    await addDoc(collection(db, 'userLogs'), {
      userId,
      action,
      timestamp: serverTimestamp(),
      ...metadata
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}
