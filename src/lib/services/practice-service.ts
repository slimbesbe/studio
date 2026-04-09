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
    if (filters.domain && filters.domain !== 'all') constraints.push(where('tags.domain', '==', filters.domain));
    if (filters.approach && filters.approach !== 'all') constraints.push(where('tags.approach', '==', filters.approach));

    const kmSnap = await getDocs(query(collection(db, 'users', userId, 'killMistakes'), ...constraints, limit(100)));
    const kmIds = kmSnap.docs.map(d => d.id);
    if (kmIds.length === 0) throw new Error("Aucune erreur correspondant à ces critères !");
    
    // Fetch current question details in batches
    return fetchQuestionsByIds(db, kmIds, questionCount);
  } else {
    let questionsRef = collection(db, 'questions');
    let constraints = [
      where('isActive', '==', true),
      where('sourceIds', 'array-contains', 'general')
    ];
    
    if (filters.domain && filters.domain !== 'all') constraints.push(where('tags.domain', '==', filters.domain));
    if (filters.approach && filters.approach !== 'all') constraints.push(where('tags.approach', '==', filters.approach));
    
    const q = query(questionsRef, ...constraints, limit(200));
    const snap = await getDocs(q);
    
    if (snap.empty) {
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
 * Note: On ne stocke plus le score ou l'explication dans la tentative.
 */
export async function submitPracticeAnswer(
  db: Firestore,
  userId: string,
  questionId: string,
  selectedChoiceIds: string | string[],
  context: "training" | "exam" = "training"
) {
  const qDoc = await getDoc(doc(db, 'questions', questionId));
  if (!qDoc.exists()) throw new Error("Question non trouvée");
  
  const qData = qDoc.data();
  const userChoices = Array.isArray(selectedChoiceIds) ? selectedChoiceIds : [selectedChoiceIds];
  const correctOptionIds = qData.correctOptionIds || [String(qData.correctChoice)];

  const isCorrect = userChoices.length === correctOptionIds.length && 
                    userChoices.every(id => correctOptionIds.includes(id));

  // Log minimal attempt
  const attemptRef = doc(collection(db, 'users', userId, 'attempts'));
  await setDoc(attemptRef, {
    questionId,
    selectedChoiceIds: userChoices,
    context,
    answeredAt: serverTimestamp()
  });

  // Update KillMistakes (Base de données dynamique)
  const kmRef = doc(db, 'users', userId, 'killMistakes', questionId);
  if (!isCorrect) {
    await setDoc(kmRef, {
      status: 'wrong',
      wrongCount: increment(1),
      lastWrongAt: serverTimestamp(),
      questionId,
      lastSelectedChoiceIds: userChoices,
      tags: qData.tags || {}
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
