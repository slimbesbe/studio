
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
    const kmSnap = await getDocs(query(collection(db, 'users', userId, 'killMistakes'), where('status', '==', 'wrong'), limit(100)));
    const kmIds = kmSnap.docs.map(d => d.id);
    if (kmIds.length === 0) throw new Error("Aucune erreur à corriger !");
    
    const pool = [];
    for(const id of kmIds) {
      const d = await getDoc(doc(db, 'questions', id));
      if (d.exists()) pool.push({...d.data(), id: d.id});
    }
    return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? pool.length : questionCount);
  } else {
    let questionsRef = collection(db, 'questions');
    let constraints = [where('isActive', '==', true)];
    if (filters.domain) constraints.push(where('tags.domain', '==', filters.domain));
    if (filters.approach) constraints.push(where('tags.approach', '==', filters.approach));
    
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
  selectedChoiceId: string,
  context: "training" | "exam" = "training"
) {
  const qDoc = await getDoc(doc(db, 'questions', questionId));
  if (!qDoc.exists()) throw new Error("Question non trouvée");
  
  const qData = qDoc.data();
  const isCorrect = qData.correctOptionIds ? qData.correctOptionIds.includes(selectedChoiceId) : qData.correctChoice === selectedChoiceId;

  // Log Attempt with metadata for KPIs
  const attemptRef = doc(collection(db, 'users', userId, 'attempts'));
  await setDoc(attemptRef, {
    questionId,
    selectedChoiceId,
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
      lastSelectedChoiceId: selectedChoiceId
    }, { merge: true });
  } else {
    await setDoc(kmRef, {
      status: 'corrected',
      lastCorrectAt: serverTimestamp(),
      questionId
    }, { merge: true });
  }

  return { 
    isCorrect, 
    explanation: qData.explanation,
    correctOptionIds: qData.correctOptionIds || [qData.correctChoice]
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
    const selectedChoiceId = res.selectedChoiceIds.length > 0 ? res.selectedChoiceIds[0] : 'unanswered';
    
    batch.set(attemptRef, {
      questionId: res.questionId,
      selectedChoiceId: selectedChoiceId,
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
        lastSelectedChoiceId: selectedChoiceId
      }, { merge: true });
    } else {
      batch.set(kmRef, {
        status: 'corrected',
        lastCorrectAt: serverTimestamp(),
        questionId: res.questionId
      }, { merge: true });
    }
  }
  
  await batch.commit();
}
