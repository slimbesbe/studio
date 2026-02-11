"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ChevronLeft, 
  Loader2, 
  Trash2, 
  Pencil, 
  Search, 
  FileQuestion
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function SessionQuestionsList() {
  const params = useParams();
  const sessionId = params.id as string;
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const sessionRef = useMemoFirebase(() => doc(db, 'coachingSessions', sessionId), [db, sessionId]);
  const { data: session, isLoading: isSessionLoading } = useDoc(sessionRef);

  const questionsQuery = useMemoFirebase(() => {
    if (!session) return null;
    return query(
      collection(db, 'questions'),
      where('index', '>=', session.questionStart),
      where('index', '<=', session.questionEnd),
      orderBy('index', 'asc')
    );
  }, [db, session]);

  const { data: questions, isLoading: isQuestionsLoading } = useCollection(questionsQuery);

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => 
      q.text?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      q.index?.toString().includes(searchTerm)
    );
  }, [questions, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement cette question ?")) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
      toast({ title: "Question supprimée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur suppression" });
    }
  };

  if (isSessionLoading || isQuestionsLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2"><Link href="/admin/coaching/sessions"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Contenu : {session?.title}</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Visualisation des questions Q{session?.questionStart} à Q{session?.questionEnd}.</p>
          </div>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Rechercher par index ou texte..." 
            className="h-14 rounded-2xl pl-12 font-bold italic border-2 shadow-sm bg-white"
          />
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs w-24 text-center">Index</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs">Question</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Réponse</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((q) => (
                <TableRow key={q.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                  <TableCell className="px-10 text-center">
                    <span className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-primary italic mx-auto">{q.index}</span>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-slate-700 italic line-clamp-2 leading-relaxed">{q.text}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-[8px] font-black uppercase italic py-0 bg-slate-100 border-none">{q.tags?.domain || 'Process'}</Badge>
                      <Badge variant="secondary" className="text-[8px] font-black uppercase italic py-0 bg-slate-100 border-none">{q.tags?.approach || 'Agile'}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-emerald-100 text-emerald-600 border-none font-black italic rounded-lg px-3 py-1">
                      Choix {q.correctChoice || '1'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl hover:bg-indigo-50 text-indigo-600 border-2 border-indigo-50">
                        <Link href={`/admin/manage-question/coaching/${q.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-600 border-2 border-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredQuestions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-4">
                      <FileQuestion className="h-16 w-16 opacity-20" />
                      <p className="font-black uppercase italic tracking-widest">Aucune question trouvée</p>
                      <p className="text-[10px] font-bold text-slate-400">Importez une simulation dans la configuration session.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
