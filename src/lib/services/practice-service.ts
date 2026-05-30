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
 */
export async function startTrainingSession(
  db: Firestore, 
  userId: string, 
  mode: string, 
  filters: PracticeFilters, 
  questionCount: number
) {
  if (mode === 'kill_mistake') {
    let constraints = [where('status', '==', 'wrong')];
    
    // Filtres par Axe (PMP)
    if (filters.domain && filters.domain !== 'all') {
      const domainVal = filters.domain === 'Processus' ? 'Process' : filters.domain;
      constraints.push(where('tags.domain', 'in', [domainVal, 'Processus', 'Process']));
    }
    if (filters.approach && filters.approach !== 'all') constraints.push(where('tags.approach', '==', filters.approach));
    
    // Filtres par Thème d'activité (Idem Historique)
    if (filters.sourceType && filters.sourceType !== 'all') {
      constraints.push(where('sourceType', '==', filters.sourceType));
    }

    const kmSnap = await getDocs(query(collection(db, 'users', userId, 'killMistakes'), ...constraints, limit(100)));
    const kmIds = kmSnap.docs.map(d => d.id);
    if (kmIds.length === 0) throw new Error("Aucune erreur correspondant à ces critères !");
    
    return fetchQuestionsByIds(db, kmIds, questionCount);
  } else {
    let questionsRef = collection(db, 'questions');
    
    // Pour la matrice, on est plus souple sur la source pour éviter de bloquer si l'import n'a pas mis 'general'
    const isMatrix = mode === 'matrix';
    
    let constraints: any[] = [
      where('isActive', '==', true)
    ];

    // Si on n'est pas en mode matrice, on force le silo 'general' (Pratique Libre)
    if (!isMatrix) {
      constraints.push(where('sourceIds', 'array-contains', 'general'));
    }
    
    // Gestion robuste du domaine (Process vs Processus)
    if (filters.domain && filters.domain !== 'all') {
      if (filters.domain === 'Process' || filters.domain === 'Processus') {
        constraints.push(where('tags.domain', 'in', ['Process', 'Processus']));
      } else {
        constraints.push(where('tags.domain', '==', filters.domain));
      }
    }
    
    if (filters.approach && filters.approach !== 'all') {
      constraints.push(where('tags.approach', '==', filters.approach));
    }
    
    const q = query(questionsRef, ...constraints, limit(200));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      // Fallback : si on cherchait dans 'general' et qu'on n'a rien, on essaie sans le filtre de silo
      if (!isMatrix) {
        const fallbackQ = query(questionsRef, where('isActive', '==', true), limit(200));
        const fallbackSnap = await getDocs(fallbackQ);
        if (fallbackSnap.empty) {
          throw new Error("Aucune question disponible dans la base de données.");
        }
        // Filtrage manuel pour les tags
        const pool = fallbackSnap.docs.map(d => ({...d.data(), id: d.id})).filter((q: any) => {
          const dMatch = filters.domain === 'all' || q.tags?.domain === filters.domain || (filters.domain === 'Process' && q.tags?.domain === 'Processus');
          const aMatch = filters.approach === 'all' || q.tags?.approach === filters.approach;
          return dMatch && aMatch;
        });
        
        if (pool.length === 0) throw new Error("Aucune question trouvée pour ces critères.");
        return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? pool.length : questionCount);
      }
      
      throw new Error("Aucune question de pratique disponible pour ces critères.");
    }

    const pool = snap.docs.map(d => ({...d.data(), id: d.id}));
    return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? pool.length : questionCount);
  }
}

/**
 * Helper pour récupérer des questions par IDs en respectant les limites de Firestore (30 par query)
 */
export async function fetchQuestionsByIds(db: Firestore, ids: string[], count: number = 0) {
  if (!ids || ids.length === 0) return [];
  
  const results: any[] = [];
  const batchSize = 30;
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    const q = query(collection(db, 'questions'), where(documentId(), 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => results.push({ ...d.data(), id: d.id }));
  }

  const finalPool = results.sort(() => 0.5 - Math.random());
  return count > 0 ? finalPool.slice(0, count) : finalPool;
}

/**
 * Soumet une réponse et met à jour la base Kill Mistake.
 */
export async function submitPracticeAnswer(
  db: Firestore,
  userId: string,
  questionId: string,
  selectedChoiceIds: string | string[],
  context: "training" | "exam" | "matrix" = "training"
) {
  const qDoc = await getDoc(doc(db, 'questions', questionId));
  if (!qDoc.exists()) throw new Error("Question non trouvée");
  
  const qData = qDoc.data();
  const userChoices = (Array.isArray(selectedChoiceIds) ? selectedChoiceIds : [selectedChoiceIds]).map(id => String(id));
  
  const correctOptionIds = (qData.correctOptionIds || [String(qData.correctChoice || "1")]).map(id => String(id));

  const isCorrect = userChoices.length === correctOptionIds.length && 
                    userChoices.every(id => correctOptionIds.includes(id));

  // Update KillMistakes
  const kmRef = doc(db, 'users', userId, 'killMistakes', questionId);
  const sourceType = context === 'matrix' ? 'matrix' : context === 'exam' ? 'exam' : 'practice';

  if (!isCorrect) {
    await setDoc(kmRef, {
      status: 'wrong',
      wrongCount: increment(1),
      lastWrongAt: serverTimestamp(),
      questionId,
      lastSelectedChoiceIds: userChoices,
      tags: qData.tags || {},
      sourceType // On enregistre le thème de l'erreur
    }, { merge: true });
  } else {
    await setDoc(kmRef, {
      status: 'corrected',
      lastCorrectAt: serverTimestamp(),
      questionId,
      tags: qData.tags || {},
      // On ne change pas le sourceType initial s'il existe déjà
    }, { merge: true });
  }

  return { 
    isCorrect, 
    explanation: qData.explanation,
    correctOptionIds
  };
}
