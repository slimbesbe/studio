
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
  orderBy
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
  let questionsRef = collection(db, 'questions');
  let q;

  if (mode === 'kill_mistake') {
    const kmSnap = await getDocs(query(collection(db, 'users', userId, 'killMistakes'), where('status', '==', 'wrong')));
    const kmIds = kmSnap.docs.map(d => d.id);
    if (kmIds.length === 0) throw new Error("Aucune erreur à corriger !");
    
    // Pour Firestore, on doit souvent fetch les docs par ID car "in" est limité à 30
    const pool = [];
    for(const id of kmIds.slice(0, 100)) {
      const d = await getDoc(doc(db, 'questions', id));
      if (d.exists()) pool.push({...d.data(), id: d.id});
    }
    return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount);
  } else {
    let constraints = [where('isActive', '==', true)];
    if (filters.domain) constraints.push(where('tags.domain', '==', filters.domain));
    if (filters.approach) constraints.push(where('tags.approach', '==', filters.approach));
    
    q = query(questionsRef, ...constraints, limit(200));
    const snap = await getDocs(q);
    const pool = snap.docs.map(d => ({...d.data(), id: d.id}));
    return pool.sort(() => 0.5 - Math.random()).slice(0, questionCount === 0 ? pool.length : questionCount);
  }
}

export async function submitPracticeAnswer(
  db: Firestore,
  userId: string,
  questionId: string,
  selectedChoice: string,
  context: "training" | "exam" = "training"
) {
  const qDoc = await getDoc(doc(db, 'questions', questionId));
  if (!qDoc.exists()) throw new Error("Question non trouvée");
  
  const qData = qDoc.data();
  const isCorrect = qData.correctOptionIds ? qData.correctOptionIds.includes(selectedChoice) : qData.correctChoice === selectedChoice;

  // Log Attempt
  const attemptRef = doc(collection(db, 'users', userId, 'attempts'));
  await setDoc(attemptRef, {
    questionId,
    selectedChoice,
    isCorrect,
    context,
    answeredAt: serverTimestamp()
  });

  // Update KillMistakes
  const kmRef = doc(db, 'users', userId, 'killMistakes', questionId);
  if (!isCorrect) {
    await setDoc(kmRef, {
      status: 'wrong',
      wrongCount: increment(1),
      lastWrongAt: serverTimestamp(),
      questionId
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
