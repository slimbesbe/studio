
"use client";

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, limit, writeBatch } from 'firebase/firestore';
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
  ChevronLeft,
  Filter,
  BookOpen,
  Trophy,
  Layers,
  Globe,
  LayoutGrid
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
  
  const contextType = searchParams.get('type') as 'practice' | 'exams' | 'matrix' || 'practice';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubSource, setFilterSubSource] = useState(
    contextType === 'practice' ? 'practice' : contextType === 'matrix' ? 'matrix' : 'exam1'
  );
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterApproach, setFilterApproach] = useState('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    if (contextType === 'practice') setFilterSubSource('practice');
    else if (contextType === 'matrix') setFilterSubSource('matrix');
    else if (contextType === 'exams') setFilterSubSource('exam1');
  }, [contextType]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

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
      
      // FILTRAGE STRICT PAR SILO
      if (contextType === 'practice') {
        if (!sources.includes('practice')) return false;
      } else if (contextType === 'matrix') {
        if (!sources.includes('matrix')) return false;
      } else {
        if (!sources.some(s => s.startsWith('exam'))) return false;
      }

      // Filtrage par sous-catégorie pour les examens
      if (contextType === 'exams' && filterSubSource !== 'all_exams') {
        if (!sources.includes(filterSubSource)) return false;
      }

      // Filtrage par Domaine/Approche
      const matchDomain = filterDomain === 'all' || q.tags?.domain === filterDomain;
      const matchApproach = filterApproach === 'all' || q.tags?.approach === filterApproach;
      
      return (textMatch || codeMatch) && matchDomain && matchApproach;
    });
  }, [questions, searchTerm, filterSubSource, filterDomain, filterApproach, contextType]);

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
      const batch = writeBatch(db);
      filteredQuestions.forEach(q => batch.delete(doc(db, 'questions', q.id)));
      await batch.commit();
      toast({ title: `Le silo a été vidé.` });
      setIsResetModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsResetting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [{
      "Code": "Q-001",
      "Domaine": "PEOPLE",
      "Approche": "Agile",
      "Énoncé": "Lors de la phase d'exécution...",
      "Option A": "Choix 1",
      "Option B": "Choix 2",
      "Option C": "Choix 3",
      "Option D": "Choix 4",
      "Réponse Correcte": "B",
      "Justification": "Explication Mindset...",
      "Difficulté": "Medium"
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, `modele_simulux_${contextType}.xlsx`);
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  if (!isAdmin) return null;

  const PageIcon = contextType === 'exams' ? Trophy : contextType === 'matrix' ? LayoutGrid : BookOpen;
  const PageTitle = contextType === 'exams' ? 'Banque Examens Blancs' : contextType === 'matrix' ? 'Banque Matrice Magique' : 'Banque Pratique Libre';
  const siloColor = contextType === 'exams' ? 'bg-primary' : contextType === 'matrix' ? 'bg-indigo-600' : 'bg-emerald-600';

  return (
    <div className="space-y-8 animate-fade-in p-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm"><Link href="/admin/content-config"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div>
            <h1 className={cn("text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3", contextType === 'practice' ? "text-emerald-600" : contextType === 'matrix' ? "text-indigo-600" : "text-primary")}>
              <PageIcon className="h-8 w-8" />
              {PageTitle}
            </h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">
              Gestion étanche du silo {contextType.toUpperCase()}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadTemplate} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2">
            <Download className="mr-2 h-4 w-4" /> Modèle
          </Button>
          <Button variant="outline" onClick={handleOpenReset} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 text-destructive border-destructive/20 hover:bg-destructive/5">
            <Trash2 className="mr-2 h-4 w-4" /> Vider Silo
          </Button>
          <Button onClick={() => setIsImportModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs italic shadow-xl">
            <Upload className="mr-2 h-5 w-5" /> Importer
          </Button>
          <Button asChild className={cn("h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs italic shadow-xl", siloColor)}>
            <Link href={`/admin/manage-question/${filterSubSource === 'all_exams' ? 'exam1' : filterSubSource}/new`}>
              <Plus className="mr-2 h-5 w-5" /> Créer Question
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center bg-white p-6 rounded-[32px] shadow-sm border-2">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Rechercher par énoncé ou code..." 
            className="h-14 rounded-2xl pl-12 font-bold italic border-2 bg-slate-50/50"
          />
        </div>
        
        {contextType === 'exams' && (
          <div className="w-full md:w-64">
            <Select value={filterSubSource} onValueChange={setFilterSubSource}>
              <SelectTrigger className="h-14 rounded-2xl border-2 font-black italic bg-white text-primary">
                <div className="flex items-center gap-2"><Filter className="h-4 w-4" /><SelectValue /></div>
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

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Select value={filterDomain} onValueChange={setFilterDomain}>
            <SelectTrigger className="h-14 w-48 rounded-2xl border-2 font-black italic bg-white">
              <div className="flex items-center gap-2"><Layers className="h-4 w-4" /><SelectValue placeholder="Domaine" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous Domaines</SelectItem>
              <SelectItem value="People">People</SelectItem>
              <SelectItem value="Process">Processus</SelectItem>
              <SelectItem value="Business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterApproach} onValueChange={setFilterApproach}>
            <SelectTrigger className="h-14 w-48 rounded-2xl border-2 font-black italic bg-white">
              <div className="flex items-center gap-2"><Globe className="h-4 w-4" /><SelectValue placeholder="Approche" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes Approches</SelectItem>
              <SelectItem value="Predictive">Waterfall</SelectItem>
              <SelectItem value="Agile">Agile</SelectItem>
              <SelectItem value="Hybrid">Hybride</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs w-32">Code</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs min-w-[400px]">Question</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Tags</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center font-black uppercase italic tracking-widest text-slate-300">Aucune question dans ce silo.</TableCell></TableRow>
              ) : filteredQuestions.map((q) => (
                <TableRow key={q.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0">
                  <TableCell className="px-10">
                    <Badge variant="outline" className="font-mono text-[10px] py-1 border-2">{q.questionCode || '---'}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-slate-700 italic line-clamp-2 max-w-xl">{q.statement || q.text}</p>
                    <div className="flex gap-1 mt-1">
                      {q.sourceIds?.map((s: string) => (
                        <span key={s} className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-slate-100 rounded text-slate-400">
                          {s}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center space-y-1">
                    <Badge variant="secondary" className="text-[8px] font-black uppercase italic bg-slate-100 border-none">{q.tags?.domain || '?'}</Badge>
                    <Badge variant="secondary" className="text-[8px] font-black uppercase italic bg-slate-100 border-none">{q.tags?.approach || '?'}</Badge>
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl border-2 hover:bg-indigo-50 text-indigo-600">
                        <Link href={`/admin/manage-question/${filterSubSource === 'all_exams' ? 'exam1' : filterSubSource}/${q.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="h-10 w-10 rounded-xl border-2 hover:bg-red-50 text-red-600">
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
        examId={filterSubSource === 'all_exams' ? 'exam1' : filterSubSource}
      />

      <Dialog open={isResetModalOpen} onOpenChange={(val) => !isResetting && setIsResetModalOpen(val)}>
        <DialogContent className="rounded-[40px] p-12 border-8 border-destructive shadow-3xl max-w-xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <DialogTitle className="text-4xl font-black uppercase italic text-destructive tracking-tighter">Action Critique</DialogTitle>
            <DialogDescription className="text-lg font-bold text-slate-600 leading-relaxed uppercase italic mt-4">
              Vider totalement le silo <span className="text-destructive underline">{contextType.toUpperCase()}</span> ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-10 space-y-8">
            <div className="bg-slate-50 p-8 rounded-3xl border-4 border-dashed text-center">
              <p className="text-[10px] font-black uppercase text-slate-400">Code de sécurité</p>
              <p className="text-6xl font-black text-primary tabular-nums">{securityCode}</p>
            </div>
            <Input value={userInputCode} onChange={(e) => setUserInputCode(e.target.value)} maxLength={8} className="h-16 rounded-2xl border-4 font-black text-center text-3xl italic" placeholder="Recopiez le code" />
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsResetModalOpen(false)}>Annuler</Button>
            <Button variant="destructive" disabled={userInputCode !== securityCode || isResetting} onClick={performReset} className="h-16 rounded-2xl font-black uppercase flex-1 shadow-2xl">
              {isResetting ? <Loader2 className="animate-spin h-6 w-6" /> : "Vider Silo"}
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
