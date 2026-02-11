
"use client";

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, limit, where, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Upload, 
  Download, 
  Trash2, 
  Pencil, 
  Loader2, 
  BookCopy, 
  ChevronLeft,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ImportQuestionsModal } from '@/components/admin/ImportQuestionsModal';
import * as XLSX from 'xlsx';

function QuestionsList() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExam, setFilterExam] = useState('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const questionsQuery = useMemoFirebase(() => {
    // ON RÉCUPÈRE LES QUESTIONS ACTIVES UNIQUEMENT POUR CORRESPONDRE AU SIMULATEUR
    return query(collection(db, 'questions'), where('isActive', '==', true), orderBy('updatedAt', 'desc'), limit(1000));
  }, [db]);

  const { data: questions, isLoading } = useCollection(questionsQuery);

  // CALCUL DES COMPTEURS POUR LE FILTRE
  useEffect(() => {
    if (questions) {
      const newCounts: Record<string, number> = {};
      questions.forEach(q => {
        const id = q.examId || q.sessionId || 'other';
        newCounts[id] = (newCounts[id] || 0) + 1;
      });
      setCounts(newCounts);
    }
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      const matchSearch = (q.statement || q.text || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (q.questionCode || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchExam = filterExam === 'all' || 
                       (filterExam.startsWith('S') ? q.sessionId === filterExam : q.examId === filterExam);
      
      return matchSearch && matchExam;
    });
  }, [questions, searchTerm, filterExam]);

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette question ?')) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
      toast({ title: "Question supprimée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        "Domaine ECO": "Process",
        "Approche": "Agile",
        "Niveau": "Medium",
        "Énoncé": "Un membre de l'équipe agile ne participe pas aux stand-ups. Que fait le Scrum Master ?",
        "option1": "Il l'ignore car l'équipe est auto-organisée.",
        "option2": "Il lui ordonne de venir immédiatement.",
        "option3": "Il discute avec lui en privé pour comprendre les obstacles.",
        "option4": "Il demande son remplacement au manager.",
        "Justification": "Le Scrum Master est un leader serviteur qui cherche à résoudre les problèmes par la communication.",
        "correct": "C"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "modèle_banque_simovex.xlsx");
    toast({ title: "Modèle téléchargé", description: "Remplissez ce fichier et uploadez-le." });
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2"><Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
              <BookCopy className="h-8 w-8" /> Banque de Questions
            </h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Gérez les questions des 5 examens et des coachings S2-S6.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadTemplate} className="h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-xs italic border-2 hover:bg-slate-50">
            <Download className="mr-2 h-4 w-4" /> Modèle Excel
          </Button>
          <Button onClick={() => setIsImportModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-transform hover:scale-105">
            <Upload className="mr-2 h-5 w-5" /> Importer Excel
          </Button>
          <Button asChild className="bg-primary h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-transform hover:scale-105">
            <Link href="/admin/manage-question/general/new"><Plus className="mr-2 h-5 w-5" /> Créer Question</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Rechercher par énoncé ou code..." 
            className="h-16 rounded-[24px] pl-12 font-bold italic border-2 shadow-sm bg-white"
          />
        </div>
        <div className="w-full md:w-72">
          <Select value={filterExam} onValueChange={setFilterExam}>
            <SelectTrigger className="h-16 rounded-[24px] border-2 font-black italic shadow-sm bg-white">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <SelectValue placeholder="Toutes les simulations" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes ({questions?.length || 0})</SelectItem>
              <SelectItem value="exam1">Examen 1 ({counts['exam1'] || 0})</SelectItem>
              <SelectItem value="exam2">Examen 2 ({counts['exam2'] || 0})</SelectItem>
              <SelectItem value="exam3">Examen 3 ({counts['exam3'] || 0})</SelectItem>
              <SelectItem value="exam4">Examen 4 ({counts['exam4'] || 0})</SelectItem>
              <SelectItem value="exam5">Examen 5 ({counts['exam5'] || 0})</SelectItem>
              <SelectItem value="S2">Coaching S2 ({counts['S2'] || 0})</SelectItem>
              <SelectItem value="S3">Coaching S3 ({counts['S3'] || 0})</SelectItem>
              <SelectItem value="S4">Coaching S4 ({counts['S4'] || 0})</SelectItem>
              <SelectItem value="S5">Coaching S5 ({counts['S5'] || 0})</SelectItem>
              <SelectItem value="S6">Coaching S6 ({counts['S6'] || 0})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs w-32">Code</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs">Énoncé de la question</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Source</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((q) => (
                <TableRow key={q.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                  <TableCell className="px-10">
                    <span className="font-mono font-black text-primary text-xs bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                      {q.questionCode || `Q-${q.index || '---'}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-slate-700 italic line-clamp-2 leading-relaxed max-w-2xl">{q.statement || q.text}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-[8px] font-black uppercase italic py-0 bg-slate-100 border-none">{q.tags?.domain || 'Process'}</Badge>
                      <Badge variant="secondary" className="text-[8px] font-black uppercase italic py-0 bg-slate-100 border-none">{q.tags?.approach || 'Agile'}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {q.examId ? (
                      <Badge className="bg-indigo-100 text-indigo-600 border-none font-black text-[9px] uppercase italic">Examen {q.examId.replace('exam','')}</Badge>
                    ) : q.sessionId ? (
                      <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[9px] uppercase italic">Coaching {q.sessionId}</Badge>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-300">LIBRE</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl hover:bg-indigo-50 text-indigo-600 border-2 border-indigo-50">
                        <Link href={q.sessionId ? `/admin/manage-question/coaching/${q.id}` : `/admin/manage-question/${q.examId || 'general'}/${q.id}`}><Pencil className="h-4 w-4" /></Link>
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
                      <BookCopy className="h-16 w-16 opacity-20" />
                      <p className="font-black uppercase italic tracking-widest">Aucune question trouvée</p>
                      <p className="text-[10px] font-bold text-slate-400">Ajustez vos filtres ou importez des données.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ImportQuestionsModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        examId={filterExam !== 'all' && !filterExam.startsWith('S') ? filterExam : 'general'} 
      />
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <section className="p-8 max-w-7xl mx-auto space-y-10">
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>}>
        <QuestionsList />
      </Suspense>
    </section>
  );
}
