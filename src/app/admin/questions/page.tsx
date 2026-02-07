
"use client";

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Pencil, Trash2, BookCopy, ChevronLeft, Upload, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ImportQuestionsModal } from '@/components/admin/ImportQuestionsModal';
import * as XLSX from 'xlsx';

const EXAMS = [
  { id: 'exam1', title: 'Examen 1' },
  { id: 'exam2', title: 'Examen 2' },
  { id: 'exam3', title: 'Examen 3' },
  { id: 'exam4', title: 'Examen 4' },
  { id: 'exam5', title: 'Examen 5' },
];

export default function QuestionsListPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeExamId, setActiveExamId] = useState('exam1');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const adminDoc = await getDoc(doc(db, 'roles_admin', user.uid));
        if (!adminDoc.exists()) router.push('/dashboard');
        else {
          setIsAdmin(true);
          // Auto-provision exams if needed
          EXAMS.forEach(async (e) => {
            await setDoc(doc(db, 'exams', e.id), { id: e.id, title: e.title, isActive: true }, { merge: true });
          });
        }
      } else if (!isUserLoading) router.push('/login');
    }
    checkAdmin();
  }, [user, isUserLoading, db, router]);

  const questionsQuery = useMemoFirebase(() => collection(db, 'exams', activeExamId, 'questions'), [db, activeExamId]);
  const { data: questions, isLoading } = useCollection(questionsQuery);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette question ?")) return;
    try {
      await deleteDoc(doc(db, 'exams', activeExamId, 'questions', id));
      toast({ title: "Supprimé" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const downloadTemplate = () => {
    const templateData = [{
      statement: "Enoncé de la question ?",
      option1: "Réponse A", 
      option2: "Réponse B", 
      option3: "Réponse C", 
      option4: "Réponse D", 
      option5: "",
      explanation: "Mindset PMI : L'explication détaillée ici.",
      correct: "A"
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_questions_simovex.xlsx");
  };

  if (isUserLoading || isAdmin === null) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/admin/dashboard"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-2">
              <BookCopy className="h-8 w-8 text-primary" /> Banque de Questions
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadTemplate} className="font-bold border-2"><Download className="mr-2 h-4 w-4" /> Modèle</Button>
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="font-bold border-2"><Upload className="mr-2 h-4 w-4" /> Importer</Button>
          <Button asChild className="font-black uppercase tracking-widest"><Link href={`/admin/questions/new?examId=${activeExamId}`}><PlusCircle className="mr-2 h-4 w-4" /> Nouvelle</Link></Button>
        </div>
      </div>

      <Tabs value={activeExamId} onValueChange={setActiveExamId} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-16 bg-muted/20 border-2 rounded-2xl p-1">
          {EXAMS.map(exam => (
            <TabsTrigger key={exam.id} value={exam.id} className="font-black uppercase tracking-tighter text-xs data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl">
              {exam.title}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {EXAMS.map(exam => (
          <TabsContent key={exam.id} value={exam.id} className="mt-6">
            <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="h-16">
                      <TableHead className="w-32 px-8 font-black uppercase text-[10px] tracking-widest">Code</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Énoncé</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Type</TableHead>
                      <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-24"><Loader2 className="animate-spin inline h-10 w-10 text-primary" /></TableCell></TableRow>
                    ) : questions?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-24 font-bold text-muted-foreground uppercase tracking-widest italic">Aucune question dans cet examen.</TableCell></TableRow>
                    ) : questions?.map((q) => (
                      <TableRow key={q.id} className="h-20 hover:bg-slate-50 transition-colors">
                        <TableCell className="px-8 font-mono text-xs font-black text-primary">{q.questionCode || '---'}</TableCell>
                        <TableCell><p className="line-clamp-1 font-medium">{q.statement}</p></TableCell>
                        <TableCell><Badge variant={q.isMultipleCorrect ? "secondary" : "outline"} className="font-bold italic">{q.isMultipleCorrect ? "Multiple" : "Unique"}</Badge></TableCell>
                        <TableCell className="text-right px-8 space-x-2">
                          <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl border-2 hover:bg-primary hover:text-white transition-colors">
                            <Link href={`/admin/manage-question/${activeExamId}/${q.id}`}><Pencil className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="h-10 w-10 rounded-xl border-2 border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <ImportQuestionsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} examId={activeExamId} />
    </div>
  );
}
