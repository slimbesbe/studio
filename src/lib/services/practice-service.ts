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
  writeBatch,
  documentId
} from 'firebase/firestore';

export interface PracticeFilters {
  domain?: string;
  approach?: string;
  difficulty?: string;
  sourceType?: 'matrix' | 'practice' | 'exam' | 'all';
}

/**
 * Charge un pool de questions pour une session d'entraînement.
 * ENFORCE L'ISOLATION STRICTE DES SILOS : matrix, practice, exam.
 */
export async function startTrainingSession(
  db: Firestore, 
  userId: string, 
  mode: 'domain' | 'approach' | 'matrix' | 'kill_mistake', 
  filters: PracticeFilters, 
  questionCount: number
) {
  if (mode === 'kill_mistake') {
    let constraints = [where('status', '==', 'wrong')];
    if (filters.domain && filters.domain !== 'all') constraints.push(where('tags.domain', '==', filters.domain));
    if (filters.approach && filters.approach !== 'all') constraints.push(where('tags.approach', '==', filters.approach));
    if (filters.sourceType && filters.sourceType !== 'all') constraints.push(where('sourceType', '==', filters.sourceType));

    const kmSnap = await getDocs(query(collection(db, 'users', userId, 'killMistakes'), ...constraints, limit(100)));
    const kmIds = kmSnap.docs.map(d => d.id);
    if (kmIds.length === 0) throw new Error("Aucune erreur correspondant à ces critères !");
    return fetchQuestionsByIds(db, kmIds, questionCount);
  }

  // --- SILO ENFORCEMENT (CRITIQUE) ---
  // On définit la source cible de manière exclusive
  const targetSilo = mode === 'matrix' ? 'matrix' : 'practice';
  
  let questionsRef = collection(db, 'questions');
  
  // Requête initiale avec le filtre de silo obligatoire
  let constraints: any[] = [
    where('isActive', '==', true),
    where('sourceIds', 'array-contains', targetSilo)
  ];

  if (filters.domain && filters.domain !== 'all') {
    const d = filters.domain === 'Processus' ? 'Process' : filters.domain;
    constraints.push(where('tags.domain', 'in', [d, 'Process', 'Processus']));
  }
  
  if (filters.approach && filters.approach !== 'all') {
    const a = (filters.approach === 'Waterfall' || filters.approach === 'Cascad') ? 'Predictive' : filters.approach;
    constraints.push(where('tags.approach', 'in', [a, 'Predictive', 'Waterfall', 'cascad']));
  }

  try {
    const q = query(questionsRef, ...constraints, limit(100));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const pool = snap.docs.map(d => ({...d.data(), id: d.id}));
      // On mélange et on limite
      return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? pool.length : questionCount);
    }
  } catch (e) {
    console.warn("Direct query failed, indexing might be required", e);
  }

  // --- FALLBACK AVEC FILTRAGE MANUEL POUR GARANTIR L'ISOLEMENT ---
  // On récupère un échantillon plus large mais on vérifie l'étanchéité manuellement
  const fallbackSnap = await getDocs(query(questionsRef, where('isActive', '==', true), limit(500)));
  if (fallbackSnap.empty) throw new Error("Banque de questions vide.");

  const filteredPool = fallbackSnap.docs.map(d => ({...d.data(), id: d.id})).filter((q: any) => {
    // 1. ISOLATION SILO (Vérification manuelle stricte)
    const sources = q.sourceIds || [];
    if (!sources.includes(targetSilo)) return false;

    // 2. Filtres optionnels (Tags)
    if (filters.domain && filters.domain !== 'all') {
      const targetD = filters.domain.toLowerCase();
      const questionD = String(q.tags?.domain || '').toLowerCase();
      const match = questionD.includes(targetD) || (targetD.includes('proc') && questionD.includes('proc'));
      if (!match) return false;
    }

    if (filters.approach && filters.approach !== 'all') {
      const targetA = filters.approach.toLowerCase();
      const questionA = String(q.tags?.approach || '').toLowerCase();
      const isTargetWater = targetA.includes('pred') || targetA.includes('water');
      const isQuestionWater = questionA.includes('pred') || questionA.includes('water');
      
      if (isTargetWater && !isQuestionWater) return false;
      if (!isTargetWater && !questionA.includes(targetA)) return false;
    }

    return true;
  });

  if (filteredPool.length === 0) {
    throw new Error(`Aucune question disponible dans le silo [${targetSilo.toUpperCase()}] pour ces critères.`);
  }

  return filteredPool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? filteredPool.length : questionCount);
}

/**
 * Helper pour récupérer des questions par IDs en respectant les limites de Firestore (30 par query)
 */
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
  return count > 0 ? finalPool.slice(0, count) : finalPool;
}

/**
 * Soumet une réponse et met à jour la base Kill Mistake avec l'origine de la question.
 */
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
  
  // On détermine le type de source pour le cloisonnement dans Kill Mistake
  let sourceType: string = 'practice';
  if (qData.sourceIds?.includes('matrix')) sourceType = 'matrix';
  else if (qData.sourceIds?.some((s: string) => s.startsWith('exam'))) sourceType = 'exam';

  if (!isCorrect) {
    await setDoc(kmRef, {
      status: 'wrong',
      wrongCount: increment(1),
      lastWrongAt: serverTimestamp(),
      questionId,
      lastSelectedChoiceIds: userChoices,
      tags: qData.tags || {},
      sourceType // On garde l'origine pour filtrer les révisions
    }, { merge: true });
  } else {
    // Si c'est correct, on marque comme corrigé (ne sera plus dans le pool "wrong")
    await setDoc(kmRef, { 
      status: 'corrected', 
      lastCorrectAt: serverTimestamp(), 
      questionId, 
      tags: qData.tags || {} 
    }, { merge: true });
  }

  return { isCorrect, explanation: qData.explanation, correctOptionIds };
}
