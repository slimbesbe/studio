"use client";

import { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Loader2, 
  X,
  FileQuestion,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface MatrixCellDialogProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  approach: string;
}

export function MatrixCellDialog({ isOpen, onClose, domain, approach }: MatrixCellDialogProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const questionsQuery = useMemoFirebase(() => {
    if (!domain || !approach) return null;
    return query(
      collection(db, 'questions'),
      where('tags.domain', '==', domain),
      where('tags.approach', '==', approach)
    );
  }, [db, domain, approach]);

  const { data: questions, isLoading } = useCollection(questionsQuery);

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => 
      (q.statement || q.text || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.questionCode || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [questions, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette question ?")) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
      toast({ title: "Supprimée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl rounded-[40px] p-0 border-none shadow-3xl overflow-hidden bg-slate-50 h-[85vh] flex flex-col">
        <DialogHeader className="bg-white p-10 border-b shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-[24px] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <FileQuestion className="h-8 w-8" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
                {domain} x {approach}
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-400 uppercase text-[10px] tracking-widest italic mt-1">
                Gestion des questions du segment • {questions?.length || 0} Total
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild className="h-12 px-6 rounded-xl bg-primary font-black uppercase text-xs italic shadow-lg">
              <Link href={`/admin/manage-question/general/new?domain=${domain}&approach=${approach}`}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter Question
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10 border-2"><X /></Button>
          </div>
        </DialogHeader>

        <div className="p-10 flex-1 flex flex-col min-h-0 space-y-6">
          <div className="relative shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par énoncé ou code..."
              className="h-14 rounded-2xl pl-12 border-2 bg-white font-bold italic"
            />
          </div>

          <Card className="flex-1 rounded-[32px] border-none shadow-xl bg-white overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow className="h-16 border-b-2">
                    <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest w-32">Code</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Question</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Réponse</TableHead>
                    <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
                  ) : filteredQuestions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-64 text-center font-black uppercase italic text-slate-300">Aucune question trouvée.</TableCell></TableRow>
                  ) : filteredQuestions.map((q) => (
                    <TableRow key={q.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                      <TableCell className="px-8">
                        <span className="font-mono text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded-lg border">{q.questionCode || '---'}</span>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-slate-700 italic text-sm line-clamp-2 leading-relaxed">{q.statement || q.text}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 text-emerald-600 border-none font-black italic rounded-lg">
                          {q.correctOptionIds?.join(',') || q.correctChoice || '1'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl border-2 hover:bg-indigo-50 text-indigo-600 border-indigo-50">
                            <Link href={`/admin/manage-question/general/${q.id}`}><Pencil className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="h-10 w-10 rounded-xl border-2 hover:bg-red-50 text-red-600 border-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}