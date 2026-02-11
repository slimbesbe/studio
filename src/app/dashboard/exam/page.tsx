"use client";

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle, 
  Loader2, 
  Trophy, 
  FileQuestion, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const ALL_EXAMS = [
  { id: 'exam1', title: 'Simulation Examen 1', description: 'Examen complet de 180 questions couvrant tous les domaines.' },
  { id: 'exam2', title: 'Simulation Examen 2', description: 'Deuxième examen blanc pour tester votre préparation.' },
  { id: 'exam3', title: 'Simulation Examen 3', description: 'Troisième mise en situation réelle avant l\'examen.' },
  { id: 'exam4', title: 'Simulation Examen 4', description: 'Quatrième test de haut niveau pour affiner vos réflexes.' },
  { id: 'exam5', title: 'Simulation Examen 5', description: 'Ultime simulation pour valider votre certification.' },
];

export default function ExamPage() {
  const { profile, user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Récupérer toutes les questions actives pour compter par examen
  const questionsQuery = useMemoFirebase(() => {
    return query(collection(db, 'questions'), where('isActive', '==', true));
  }, [db]);

  const { data: allQuestions, isLoading: isQuestionsLoading } = useCollection(questionsQuery);

  // Calculer le nombre réel de questions par examen
  const examCounts = useMemo(() => {
    if (!allQuestions) return {};
    const counts: Record<string, number> = {};
    allQuestions.forEach(q => {
      if (q.examId) {
        counts[q.examId] = (counts[q.examId] || 0) + 1;
      }
    });
    return counts;
  }, [allQuestions]);

  // Filtrer les examens à afficher (doit avoir accès ET avoir des questions)
  const availableExams = useMemo(() => {
    if (!profile) return [];
    
    return ALL_EXAMS.filter(exam => {
      // Condition 1: L'examen doit contenir des questions dans la banque
      const hasQuestions = (examCounts[exam.id] || 0) > 0;
      
      // Condition 2: L'utilisateur doit avoir le droit d'accès
      const hasAccess = profile.role === 'admin' || 
                        profile.role === 'super_admin' || 
                        profile.allowedExams?.includes(exam.id);
      
      return hasQuestions && hasAccess;
    });
  }, [profile, examCounts]);

  if (isUserLoading || isQuestionsLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-10 animate-fade-in">
      <div className="bg-white p-10 rounded-[40px] shadow-xl border-2 border-primary/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-8 text-center md:text-left">
          <div className="bg-primary/10 p-5 rounded-3xl">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Simulations d'Examen</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-1">Validez vos connaissances dans les conditions réelles du PMP®.</p>
          </div>
        </div>
      </div>

      {availableExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-white rounded-[40px] shadow-inner border-4 border-dashed border-slate-100">
          <div className="bg-slate-50 p-6 rounded-full">
            <FileQuestion className="h-16 w-16 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-400 italic uppercase tracking-tight">Aucune simulation disponible</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic max-w-md mx-auto">
              Les examens apparaîtront ici dès que l'administrateur aura ajouté des questions dans la banque.
            </p>
          </div>
          {profile?.role === 'admin' || profile?.role === 'super_admin' ? (
            <Button asChild className="bg-primary hover:bg-primary/90 font-black uppercase tracking-widest">
              <Link href="/admin/questions">Aller à la Banque de Questions</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {availableExams.map((exam) => (
            <Card 
              key={exam.id} 
              className={cn(
                "rounded-[40px] border-4 transition-all relative overflow-hidden group cursor-pointer",
                selectedExamId === exam.id ? "border-primary bg-primary/5 shadow-2xl scale-[1.02]" : "bg-white border-white shadow-xl hover:border-primary/20"
              )}
              onClick={() => setSelectedExamId(exam.id)}
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="h-20 w-20" />
              </div>
              
              <CardHeader className="p-8 pb-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600 shadow-inner">
                  <FileQuestion className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-black uppercase italic tracking-tight">{exam.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-emerald-100 text-emerald-600 border-none font-black italic px-3 py-1">
                    {examCounts[exam.id] || 0} QUESTIONS
                  </Badge>
                  <Badge variant="outline" className="font-bold border-2 text-[10px] uppercase">
                    230 MIN
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-8 pt-0">
                <p className="text-sm font-bold italic text-slate-500 leading-relaxed min-h-[60px]">
                  {exam.description}
                </p>
                
                <Button 
                  asChild
                  disabled={!selectedExamId || selectedExamId !== exam.id}
                  className={cn(
                    "w-full h-14 rounded-2xl mt-6 font-black uppercase tracking-widest text-sm shadow-lg",
                    selectedExamId === exam.id ? "bg-primary hover:bg-primary/90" : "bg-slate-200"
                  )}
                >
                  <Link href={`/dashboard/exam/run?id=${exam.id}`}>
                    Lancer la simulation <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedExamId && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[32px] flex items-start gap-4 animate-slide-up">
          <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
          <div>
            <h4 className="font-black uppercase italic text-amber-800 text-sm">Informations Importantes</h4>
            <p className="text-xs font-bold text-amber-700/80 italic mt-1">
              Cette simulation contient exactement {examCounts[selectedExamId]} questions. Vous disposez de 230 minutes pour terminer l'examen. Votre progression est sauvegardée automatiquement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}