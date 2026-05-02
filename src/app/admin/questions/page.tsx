
"use client";

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, limit, getDocs, writeBatch } from 'firebase/firestore';
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
  Filter,
  AlertTriangle,
  BookOpen,
  Trophy
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ImportQuestionsModal } from '@/components/admin/ImportQuestionsModal';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

function QuestionsList() {
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  // Détection du contexte (obligatoire)
  const contextType = searchParams.get('type') as 'practice' | 'exams' || 'practice';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterExam, setFilterExam] = useState(contextType === 'practice' ? 'general' : 'exam1');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Sécurité : Réinitialiser le filtre si le contexte change
  useEffect(() => {
    if (contextType === 'practice') setFilterExam('general');
    else if (contextType === 'exams') setFilterExam('exam1');
  }, [contextType]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  // Chargement des questions avec une limite de sécurité
  const questionsQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'questions'), orderBy('updatedAt', 'desc'), limit(2000));
  }, [db, isAdmin]);

  const { data: questions, isLoading } = useCollection(questionsQuery);

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      const textMatch = (q.statement || q.text || '').toLowerCase().includes(searchTerm.toLowerCase());
      const codeMatch = (q.questionCode || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const sources = q.sourceIds || [];
      
      // FILTRAGE STRICT PAR CONTEXTE
      // On ne veut JAMAIS voir de questions d'examen en mode pratique et vice-versa
      if (contextType === 'practice') {
        if (!sources.includes('general')) return false;
      } else {
        if (!sources.some(s => s.startsWith('exam'))) return false;
      }

      // Filtrage par sous-catégorie (ex: Examen 1, Examen 2...)
      let matchSubFilter = false;
      if (filterExam === 'all_exams') {
        matchSubFilter = sources.some(s => s.startsWith('exam'));
      } else {
        matchSubFilter = sources.includes(filterExam);
      }
      
      return (textMatch || codeMatch) && matchSubFilter;
    });
  }, [questions, searchTerm, filterExam, contextType]);

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette question ?')) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
      toast({ title: "Question supprimée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const handleOpenReset = () => {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    setSecurityCode(code);
    setUserInputCode('');
    setIsResetModalOpen(true);
  };

  const performReset = async () => {
    if (userInputCode !== securityCode) return;
    setIsResetting(true);
    try {
      // RESET CIBLÉ : On ne vide que les questions du contexte actuel !
      const batch = writeBatch(db);
      filteredQuestions.forEach(q => batch.delete(doc(db, 'questions', q.id)));
      await batch.commit();
      toast({ title: `La banque ${contextType === 'practice' ? 'Pratique' : 'Examens'} a été vidée.` });
      setIsResetModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsResetting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [{
      "Code": "PMP-001",
      "Énoncé": "Exemple de question...",
      "option1": "Choix A",
      "option2": "Choix B",
      "option3": "Choix C",
      "option4": "Choix D",
      "Justification": "Explication PMI mindset...",
      "correct": "C",
      "Domaine": "People",
      "Approche": "Agile",
      "Difficulté": "Medium"
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, `modele_import_${contextType}.xlsx`);
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="space-y-8 animate-fade-in p-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm"><Link href="/admin/content-config"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div>
            <h1 className={cn(
              "text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3",
              contextType === 'practice' ? "text-emerald-600" : "text-primary"
            )}>
              {contextType === 'practice' ? <BookOpen className="h-8 w-8" /> : <Trophy className="h-8 w-8" />}
              {contextType === 'practice' ? 'Banque Pratique Libre' : 'Banque Simulations d\'Examen'}
            </h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">
              Gestion isolée du contenu {contextType === 'practice' ? 'pour la matrice et l\'entraînement.' : 'pour les examens blancs.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadTemplate} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2">
            <Download className="mr-2 h-4 w-4" /> Modèle
          </Button>
          <Button variant="outline" onClick={handleOpenReset} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 text-destructive border-destructive/20 hover:bg-destructive/5">
            <Trash2 className="mr-2 h-4 w-4" /> Vider la base
          </Button>
          <Button onClick={() => setIsImportModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs italic shadow-xl">
            <Upload className="mr-2 h-5 w-5" /> Importer
          </Button>
          <Button asChild className={cn("h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs italic shadow-xl", contextType === 'practice' ? 'bg-emerald-600' : 'bg-primary')}>
            <Link href={`/admin/manage-question/${contextType === 'practice' ? 'general' : filterExam === 'all_exams' ? 'exam1' : filterExam}/new`}>
              <Plus className="mr-2 h-5 w-5" /> Créer Question
            </Link>
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
        
        {contextType === 'exams' && (
          <div className="w-full md:w-72">
            <Select value={filterExam} onValueChange={setFilterExam}>
              <SelectTrigger className="h-16 rounded-[24px] border-2 font-black italic shadow-sm bg-white text-primary">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_exams">Toutes les Simulations</SelectItem>
                <SelectItem value="exam1">Examen 1</SelectItem>
                <SelectItem value="exam2">Examen 2</SelectItem>
                <SelectItem value="exam3">Examen 3</SelectItem>
                <SelectItem value="exam4">Examen 4</SelectItem>
                <SelectItem value="exam5">Examen 5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs w-32">Code</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs min-w-[400px]">Énoncé de la question</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Axe / Niveau</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center font-black uppercase italic tracking-widest text-slate-300">Aucune question dans cette base.</TableCell></TableRow>
              ) : filteredQuestions.map((q) => (
                <TableRow key={q.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                  <TableCell className="px-10">
                    <span className="font-mono font-black text-primary text-[10px] bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                      {q.questionCode || '---'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-slate-700 italic line-clamp-2 leading-relaxed max-w-2xl">{q.statement || q.text}</p>
                    <div className="flex gap-2 mt-1">
                      {q.sourceIds?.map((s: string) => (
                        <Badge key={s} className={cn("text-[7px] font-black uppercase italic py-0 border-none", s === 'general' ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600")}>
                          {s === 'general' ? 'PRATIQUE' : s.replace('exam', 'SIMU ')}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center space-y-1">
                    <div className="flex flex-wrap justify-center gap-1">
                      <Badge variant="secondary" className="text-[8px] font-black uppercase italic py-0 bg-slate-100 border-none">{q.tags?.domain || 'Process'}</Badge>
                      <Badge variant="secondary" className="text-[8px] font-black uppercase italic py-0 bg-slate-100 border-none">{q.tags?.approach || 'Agile'}</Badge>
                    </div>
                    <Badge variant="outline" className="text-[7px] font-black uppercase italic py-0 border-slate-200">{q.tags?.difficulty || 'Medium'}</Badge>
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl hover:bg-indigo-50 text-indigo-600 border-2 border-indigo-50">
                        <Link href={`/admin/manage-question/${q.examId || 'general'}/${q.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-600 border-2 border-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ImportQuestionsModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        examId={contextType === 'practice' ? 'general' : filterExam === 'all_exams' ? 'exam1' : filterExam} 
      />

      <Dialog open={isResetModalOpen} onOpenChange={(val) => !isResetting && setIsResetModalOpen(val)}>
        <DialogContent className="rounded-[40px] p-12 border-8 border-destructive shadow-3xl max-w-xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <DialogTitle className="text-4xl font-black uppercase italic text-destructive tracking-tighter">Réinitialisation</DialogTitle>
            <DialogDescription className="text-lg font-bold text-slate-600 leading-relaxed uppercase italic">
              Vider la base <span className="text-destructive underline">{contextType === 'practice' ? 'PRATIQUE' : 'EXAMENS'}</span> ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-10 space-y-8">
            <div className="bg-slate-50 p-8 rounded-3xl border-4 border-dashed text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Code de sécurité</p>
              <p className="text-6xl font-black tracking-widest text-primary tabular-nums">{securityCode}</p>
            </div>
            <div className="space-y-3">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic ml-2">Saisissez le code pour confirmer</Label>
              <Input value={userInputCode} onChange={(e) => setUserInputCode(e.target.value)} maxLength={8} className="h-16 rounded-2xl border-4 font-black text-center text-3xl italic tracking-widest" />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsResetModalOpen(false)} disabled={isResetting}>Annuler</Button>
            <Button variant="destructive" disabled={userInputCode !== securityCode || isResetting} onClick={performReset} className="h-16 rounded-2xl font-black uppercase flex-1 shadow-2xl text-lg italic">
              {isResetting ? <Loader2 className="animate-spin h-6 w-6" /> : "Vider la base"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>}>
      <QuestionsList />
    </Suspense>
  );
}
