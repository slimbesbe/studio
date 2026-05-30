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
 * Rendu extrêmement robuste pour la Matrice Magique.
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
    
    if (filters.domain && filters.domain !== 'all') {
      const domainVal = filters.domain === 'Processus' ? 'Process' : filters.domain;
      constraints.push(where('tags.domain', 'in', [domainVal, 'Processus', 'Process']));
    }
    if (filters.approach && filters.approach !== 'all') constraints.push(where('tags.approach', '==', filters.approach));
    
    if (filters.sourceType && filters.sourceType !== 'all') {
      constraints.push(where('sourceType', '==', filters.sourceType));
    }

    const kmSnap = await getDocs(query(collection(db, 'users', userId, 'killMistakes'), ...constraints, limit(100)));
    const kmIds = kmSnap.docs.map(d => d.id);
    if (kmIds.length === 0) throw new Error("Aucune erreur correspondant à ces critères !");
    
    return fetchQuestionsByIds(db, kmIds, questionCount);
  } else {
    let questionsRef = collection(db, 'questions');
    const isMatrix = mode === 'matrix';
    
    // Normalisation des filtres pour la recherche Firestore
    const domainSearch = filters.domain || 'all';
    const approachSearch = filters.approach || 'all';

    // 1. TENTATIVE DE REQUÊTE DIRECTE OPTIMISÉE
    let constraints: any[] = [where('isActive', '==', true)];

    if (!isMatrix) {
      constraints.push(where('sourceIds', 'array-contains', 'general'));
    }
    
    // Ajout des filtres si spécifiés
    if (domainSearch !== 'all') {
      const d = domainSearch === 'Processus' ? 'Process' : domainSearch;
      constraints.push(where('tags.domain', 'in', [d, 'Process', 'Processus']));
    }
    
    if (approachSearch !== 'all') {
      const a = (approachSearch === 'Waterfall' || approachSearch === 'Cascad') ? 'Predictive' : approachSearch;
      constraints.push(where('tags.approach', 'in', [a, 'Predictive', 'Waterfall', 'cascad']));
    }
    
    try {
      const q = query(questionsRef, ...constraints, limit(100));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const pool = snap.docs.map(d => ({...d.data(), id: d.id}));
        return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? pool.length : questionCount);
      }
    } catch (e) {
      console.warn("Direct query failed or indices missing, switching to manual fallback", e);
    }

    // 2. STRATÉGIE DE REPLI (FALLBACK) : SCAN LARGE + FILTRAGE MÉMOIRE
    // Indispensable si l'index Firestore n'est pas encore prêt ou si les tags sont mixtes
    const fallbackQ = query(questionsRef, where('isActive', '==', true), limit(500));
    const fallbackSnap = await getDocs(fallbackQ);
    
    if (fallbackSnap.empty) {
      throw new Error("La banque de questions est vide. Veuillez importer des questions.");
    }

    const filteredPool = fallbackSnap.docs.map(d => ({...d.data(), id: d.id})).filter((q: any) => {
      if (!q.tags) return false;
      
      // Filtrage Domaine (Souple)
      let domainMatch = true;
      if (domainSearch !== 'all') {
        const targetD = domainSearch.toLowerCase();
        const questionD = String(q.tags.domain || '').toLowerCase();
        domainMatch = questionD.includes(targetD) || 
                      (targetD.includes('proc') && questionD.includes('proc')) ||
                      (targetD.includes('peop') && questionD.includes('peop')) ||
                      (targetD.includes('busi') && questionD.includes('busi'));
      }

      // Filtrage Approche (Souple)
      let approachMatch = true;
      if (approachSearch !== 'all') {
        const targetA = approachSearch.toLowerCase();
        const questionA = String(q.tags.approach || '').toLowerCase();
        approachMatch = questionA.includes(targetA) || 
                        ((targetA.includes('pred') || targetA.includes('water')) && (questionA.includes('pred') || questionA.includes('water'))) ||
                        (targetA.includes('agile') && questionA.includes('agile')) ||
                        (targetA.includes('hybr') && questionA.includes('hybr'));
      }

      // Filtrage Silo (Optionnel pour Matrix)
      let siloMatch = isMatrix ? true : (q.sourceIds?.includes('general'));

      return domainMatch && approachMatch && siloMatch;
    });

    if (filteredPool.length === 0) {
      throw new Error(`Aucune question trouvée pour le segment : ${domainSearch} / ${approachSearch}. Vérifiez vos tags dans la banque de questions.`);
    }

    return filteredPool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? filteredPool.length : questionCount);
  }
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

  return { 
    isCorrect, 
    explanation: qData.explanation,
    correctOptionIds
  };
}
