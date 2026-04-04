"use client";

import { useState, useMemo, Suspense } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
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
  CheckCircle2
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

function QuestionsList() {
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExam, setFilterExam] = useState('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // States pour réinitialisation
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  const questionsQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'questions'), orderBy('updatedAt', 'desc'), limit(1000));
  }, [db, isAdmin]);

  const { data: questions, isLoading } = useCollection(questionsQuery);

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      const textMatch = (q.statement || q.text || '').toLowerCase().includes(searchTerm.toLowerCase());
      const codeMatch = (q.questionCode || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const sources = q.sourceIds || [];
      const matchExam = filterExam === 'all' || 
                       sources.includes(filterExam) || 
                       (filterExam === 'general' && (!q.examId || q.examId === 'general'));
      
      return (textMatch || codeMatch) && matchExam;
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
      const snap = await getDocs(collection(db, 'questions'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      toast({ title: "La banque de questions a été vidée." });
      setIsResetModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsResetting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        "Code": "PMP-AGILE-001",
        "Énoncé": "Un membre de l'équipe agile ne participe pas aux stand-ups. Que fait le Scrum Master ?",
        "option1": "Il l'ignore car l'équipe est auto-organisée.",
        "option2": "Il lui ordonne de venir immédiatement.",
        "option3": "Il discute avec lui en privé pour comprendre les obstacles.",
        "option4": "Il demande son remplacement au manager.",
        "Justification": "Le Scrum Master est un leader serviteur qui cherche à résoudre les problèmes par la communication.",
        "correct": "C",
        "Domaine": "People",
        "Approche": "Agile",
        "Difficulté": "Medium"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "modele_import_pmp.xlsx");
    toast({ title: "Modèle téléchargé" });
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  if (!isAdmin) return null;

  return (
    <div className="space-y-8 animate-fade-in p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2"><Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
              <BookCopy className="h-8 w-8" /> Banque de Questions
            </h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Gérez séparément les questions de pratique et d'examens.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadTemplate} className="h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-xs italic border-2 hover:bg-slate-50">
            <Download className="mr-2 h-4 w-4" /> Modèle
          </Button>
          <Button variant="outline" onClick={handleOpenReset} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 text-destructive border-destructive/20 hover:bg-destructive/5"><Trash2 className="mr-2 h-4 w-4" /> Vider la banque</Button>
          <Button onClick={() => setIsImportModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-transform">
            <Upload className="mr-2 h-5 w-5" /> Importer Excel
          </Button>
          <Button asChild className="bg-primary h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-transform">
            <Link href="/admin/manage-question/general/new"><Plus className="mr-2 h-5 w-5" /> Créer</Link>
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
                <SelectValue placeholder="Toutes les bases" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les questions</SelectItem>
              <SelectItem value="general">Pratique Libre</SelectItem>
              <SelectItem value="exam1">Simulation Examen 1</SelectItem>
              <SelectItem value="exam2">Simulation Examen 2</SelectItem>
              <SelectItem value="exam3">Simulation Examen 3</SelectItem>
              <SelectItem value="exam4">Simulation Examen 4</SelectItem>
              <SelectItem value="exam5">Simulation Examen 5</SelectItem>
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
                <TableHead className="font-black uppercase tracking-widest text-xs min-w-[400px]">Énoncé de la question</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Source(s)</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((q) => (
                <TableRow key={q.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                  <TableCell className="px-10">
                    <span className="font-mono font-black text-primary text-xs bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                      {q.questionCode || '---'}
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
                    <div className="flex flex-wrap justify-center gap-1 max-w-[150px] mx-auto">
                      {(q.sourceIds || []).map((s: string) => (
                        <Badge key={s} className={cn("text-[7px] font-black uppercase italic py-0 border-none", s === 'general' ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600")}>
                          {s === 'general' ? 'PRATIQUE' : s.replace('exam', 'E')}
                        </Badge>
                      ))}
                    </div>
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
        examId={filterExam !== 'all' ? filterExam : 'general'} 
      />

      <Dialog open={isResetModalOpen} onOpenChange={(val) => !isResetting && setIsResetModalOpen(val)}>
        <DialogContent className="rounded-[40px] p-12 border-8 border-destructive shadow-3xl max-w-xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="bg-destructive p-4 rounded-full shadow-lg"><AlertTriangle className="h-12 w-12 text-white" /></div>
            <DialogTitle className="text-4xl font-black uppercase italic text-destructive tracking-tighter">Action Critique</DialogTitle>
            <DialogDescription className="text-lg font-bold text-slate-600 leading-relaxed uppercase italic">Voulez-vous vider l'intégralité de la banque de questions ?</DialogDescription>
          </DialogHeader>
          <div className="py-10 space-y-8">
            <div className="bg-slate-50 p-8 rounded-3xl border-4 border-dashed text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Code de sécurité</p>
              <p className="text-6xl font-black tracking-widest text-primary tabular-nums">{securityCode}</p>
            </div>
            <div className="space-y-3">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic ml-2">Recopiez le code</Label>
              <Input value={userInputCode} onChange={(e) => setUserInputCode(e.target.value)} maxLength={8} className="h-16 rounded-2xl border-4 font-black text-center text-3xl italic tracking-widest" />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsResetModalOpen(false)} disabled={isResetting}>Annuler</Button>
            <Button variant="destructive" disabled={userInputCode !== securityCode || isResetting} onClick={performReset} className="h-16 rounded-2xl font-black uppercase flex-1 shadow-2xl text-lg italic">
              {isResetting ? <Loader2 className="animate-spin h-6 w-6" /> : <><CheckCircle2 className="mr-2 h-6 w-6" /> CONFIRMER</>}
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
