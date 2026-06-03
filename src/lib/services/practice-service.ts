
'use client';

import { 
  Firestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  increment,
  limit,
  documentId
} from 'firebase/firestore';

export interface PracticeFilters {
  domain?: string;
  approach?: string;
  difficulty?: string;
  sourceType?: 'matrix' | 'practice' | 'exams' | 'all';
}

/**
 * Charge un pool de questions pour une session d'entraînement.
 * ENFORCE L'ISOLATION STRICTE DES SILOS PAR CHAMP 'silo'.
 */
export async function startTrainingSession(
  db: Firestore, 
  userId: string, 
  mode: 'domain' | 'approach' | 'matrix' | 'kill_mistake', 
  filters: PracticeFilters, 
  questionCount: number
) {
  if (mode === 'kill_mistake') {
    // On récupère toutes les erreurs 'wrong' pour filtrage intelligent en JS
    const kmSnap = await getDocs(query(
      collection(db, 'users', userId, 'killMistakes'), 
      where('status', '==', 'wrong'),
      limit(500)
    ));
    
    let kmDocs = kmSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    // Filtrage par Source (Silo) - On accepte training comme alias de practice pour la compatibilité
    if (filters.sourceType && filters.sourceType !== 'all') {
      kmDocs = kmDocs.filter(m => {
        if (filters.sourceType === 'practice') {
          return m.sourceType === 'practice' || m.sourceType === 'training' || !m.sourceType;
        }
        return m.sourceType === filters.sourceType;
      });
    }

    // Filtrage par Domaine
    if (filters.domain && filters.domain !== 'all') {
      kmDocs = kmDocs.filter(m => m.tags?.domain === filters.domain);
    }

    // Filtrage par Approche
    if (filters.approach && filters.approach !== 'all') {
      kmDocs = kmDocs.filter(m => m.tags?.approach === filters.approach);
    }

    const kmIds = kmDocs.map(d => d.id);
    if (kmIds.length === 0) return []; // On renvoie vide plutôt que de throw pour laisser le front gérer l'UI
    
    return fetchQuestionsByIds(db, kmIds, questionCount);
  }

  // --- SILO ENFORCEMENT STRICT POUR MODES STANDARDS ---
  const targetSilo = mode === 'matrix' ? 'matrix' : 'practice';
  
  let questionsRef = collection(db, 'questions');
  let constraints: any[] = [
    where('isActive', '==', true),
    where('silo', '==', targetSilo)
  ];

  if (filters.domain && filters.domain !== 'all') {
    const d = filters.domain === 'Processus' ? 'Process' : filters.domain;
    constraints.push(where('tags.domain', 'in', [d, 'Process', 'Processus', 'Business Environment']));
  }
  
  if (filters.approach && filters.approach !== 'all') {
    const a = (filters.approach === 'Waterfall' || filters.approach === 'Cascad' || filters.approach === 'Predictive') ? 'Predictive' : filters.approach;
    constraints.push(where('tags.approach', 'in', [a, 'Predictive', 'Agile', 'Hybrid', 'Waterfall']));
  }

  try {
    const q = query(questionsRef, ...constraints, limit(200));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const pool = snap.docs.map(d => ({...d.data(), id: d.id}));
      return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? pool.length : questionCount);
    }
  } catch (e) {
    console.warn("Direct query failed", e);
  }

  // FALLBACK
  const fallbackSnap = await getDocs(query(questionsRef, where('silo', '==', targetSilo), where('isActive', '==', true), limit(1000)));
  const filteredPool = fallbackSnap.docs.map(d => ({...d.data(), id: d.id})).filter((q: any) => {
    if (q.silo !== targetSilo) return false;
    return true;
  });

  return filteredPool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? filteredPool.length : questionCount);
}

export async function fetchQuestionsByIds(db: Firestore, ids: string[], count: number = 0) {
  if (!ids || ids.length === 0) return [];
  const results: any[] = [];
  const batchSize = 30;
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const chunk = uniqueIds.slice(i, i + batchSize);
    const snap = await getDocs(query(collection(db, 'questions'), where(documentId(), 'in', chunk)));
    snap.docs.forEach(d => results.push({ ...d.data(), id: d.id }));
  }
  
  const finalPool = results.sort(() => 0.5 - Math.random());
  const finalCount = count === 0 ? finalPool.length : Math.min(count, finalPool.length);
  return finalPool.slice(0, finalCount);
}

export async function submitPracticeAnswer(
  db: Firestore,
  userId: string,
  questionId: string,
  selectedChoiceIds: string | string[],
  context: "training" | "exam" | "matrix" = "training"
) {
  const qDoc = await getDoc(doc(db, 'questions', questionId));
  if (!qDoc.exists()) throw new Error("Question introuvable.");
  
  const qData = qDoc.data();
  const userChoices = (Array.isArray(selectedChoiceIds) ? selectedChoiceIds : [selectedChoiceIds]).map(id => String(id));
  const correctOptionIds = (qData.correctOptionIds || [String(qData.correctChoice || "1")]).map(id => String(id));
  const isCorrect = userChoices.length === correctOptionIds.length && userChoices.every(id => correctOptionIds.includes(id));
  
  const kmRef = doc(db, 'users', userId, 'killMistakes', questionId);
  let sourceType: string = qData.silo || (context === 'matrix' ? 'matrix' : context === 'exam' ? 'exams' : 'practice');

  if (!isCorrect) {
    await setDoc(kmRef, {
      status: 'wrong',
      wrongCount: increment(1),
      lastWrongAt: serverTimestamp(),
      questionId,
      lastSelectedChoiceIds: userChoices,
      tags: qData.tags || {},
      sourceType
    }, { merge: true });
  } else {
    await setDoc(kmRef, { 
      status: 'corrected', 
      lastCorrectAt: serverTimestamp(), 
      questionId, 
      tags: qData.tags || {} 
    }, { merge: true });
  }

  return { isCorrect, explanation: qData.explanation, correctOptionIds };
}
