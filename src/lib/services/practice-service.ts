
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
  writeBatch
} from 'firebase/firestore';

export interface PracticeFilters {
  domain?: string;
  approach?: string;
  difficulty?: string;
}

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
    
    const pool = [];
    for(const id of kmIds) {
      const d = await getDoc(doc(db, 'questions', id));
      if (d.exists()) pool.push({...d.data(), id: d.id});
    }
    return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? pool.length : questionCount);
  } else {
    let questionsRef = collection(db, 'questions');
    let constraints = [where('isActive', '==', true)];
    if (filters.domain && filters.domain !== 'all') constraints.push(where('tags.domain', '==', filters.domain));
    if (filters.approach && filters.approach !== 'all') constraints.push(where('tags.approach', '==', filters.approach));
    
    const q = query(questionsRef, ...constraints, limit(200));
    const snap = await getDocs(q);
    const pool = snap.docs.map(d => ({...d.data(), id: d.id}));
    return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? pool.length : questionCount);
  }
}

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

  // Validation : must match exactly the correct set
  const isCorrect = userChoices.length === correctOptionIds.length && 
                    userChoices.every(id => correctOptionIds.includes(id));

  // Log Attempt
  const attemptRef = doc(collection(db, 'users', userId, 'attempts'));
  await setDoc(attemptRef, {
    questionId,
    selectedChoiceIds: userChoices,
    isCorrect,
    context,
    tags: qData.tags || {},
    answeredAt: serverTimestamp()
  });

  // Update KillMistakes
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

export async function logExamAttempts(
  db: Firestore,
  userId: string,
  results: { questionId: string, selectedChoiceIds: string[], isCorrect: boolean, tags?: any }[]
) {
  const batch = writeBatch(db);
  
  for (const res of results) {
    const attemptRef = doc(collection(db, 'users', userId, 'attempts'));
    
    batch.set(attemptRef, {
      questionId: res.questionId,
      selectedChoiceIds: res.selectedChoiceIds,
      isCorrect: res.isCorrect,
      context: 'exam',
      tags: res.tags || {},
      answeredAt: serverTimestamp()
    });

    const kmRef = doc(db, 'users', userId, 'killMistakes', res.questionId);
    if (!res.isCorrect) {
      batch.set(kmRef, {
        status: 'wrong',
        wrongCount: increment(1),
        lastWrongAt: serverTimestamp(),
        questionId: res.questionId,
        lastSelectedChoiceIds: res.selectedChoiceIds,
        tags: res.tags || {}
      }, { merge: true });
    } else {
      batch.set(kmRef, {
        status: 'corrected',
        lastCorrectAt: serverTimestamp(),
        questionId: res.questionId,
        tags: res.tags || {}
      }, { merge: true });
    }
  }
  
  await batch.commit();
}
