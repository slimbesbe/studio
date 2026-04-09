'use client';

import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

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
export async function saveExamState(db: Firestore, userId: string, state: Omit<ExamState, 'lastUpdatedAt'>) {
  if (!userId || !db) return;
  const stateRef = doc(db, 'users', userId, 'activeSimulation', 'current');
  // On utilise setDoc sans await pour la fluidité UI (le SDK gère la file d'attente)
  setDoc(stateRef, {
    ...state,
    lastUpdatedAt: serverTimestamp()
  }, { merge: true });
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
export async function clearExamState(db: Firestore, userId: string) {
  if (!userId || !db) return;
  const stateRef = doc(db, 'users', userId, 'activeSimulation', 'current');
  await deleteDoc(stateRef);
}
