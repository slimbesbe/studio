
'use client';

import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface ExamState {
  examId: string;
  status: 'not_started' | 'in_progress';
  currentIndex: number;
  answers: Record<string, string[]>;
  flagged: Record<string, boolean>;
  timeLeft: number;
  currentSection: number;
  lastUpdatedAt?: any;
}

/**
 * Sauvegarde l'état actuel d'une simulation pour un utilisateur.
 */
export function saveExamState(db: Firestore, userId: string, state: Omit<ExamState, 'lastUpdatedAt'>) {
  if (!userId || !db) return;
  const stateRef = doc(db, 'users', userId, 'activeSimulation', 'current');
  const data = {
    ...state,
    lastUpdatedAt: serverTimestamp()
  };

  // On utilise setDoc sans await pour la fluidité UI
  setDoc(stateRef, data, { merge: true }).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: stateRef.path,
      operation: 'write',
      requestResourceData: data
    }));
  });
}

/**
 * Récupère l'état de la simulation en cours pour un utilisateur.
 */
export async function getExamState(db: Firestore, userId: string): Promise<ExamState | null> {
  if (!userId || !db) return null;
  const stateRef = doc(db, 'users', userId, 'activeSimulation', 'current');
  const snap = await getDoc(stateRef);
  if (snap.exists()) {
    return snap.data() as ExamState;
  }
  return null;
}

/**
 * Supprime l'état de la simulation (appelé lors de la fin de l'examen ou abandon).
 */
export function clearExamState(db: Firestore, userId: string) {
  if (!userId || !db) return;
  const stateRef = doc(db, 'users', userId, 'activeSimulation', 'current');
  deleteDoc(stateRef).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: stateRef.path,
      operation: 'delete'
    }));
  });
}
