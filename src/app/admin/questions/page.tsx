
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
      statement: "Question ?",
      option1: "A", option2: "B", option3: "C", option4: "D", option5: "",
      explanation: "Mindset...",
      correct: "A"
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_questions.xlsx");
  };

  if (isUserLoading || isAdmin === null) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/admin/dashboard"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookCopy className="h-8 w-8 text-primary" /> Banque de Questions
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" /> Modèle</Button>
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}><Upload className="mr-2 h-4 w-4" /> Importer</Button>
          <Button asChild><Link href={`/admin/questions/new?examId=${activeExamId}`}><PlusCircle className="mr-2 h-4 w-4" /> Nouvelle</Link></Button>
        </div>
      </div>

      <Tabs value={activeExamId} onValueChange={setActiveExamId} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          {EXAMS.map(exam => <TabsTrigger key={exam.id} value={exam.id} className="font-bold">{exam.title}</TabsTrigger>)}
        </TabsList>
        
        {EXAMS.map(exam => (
          <TabsContent key={exam.id} value={exam.id} className="mt-6">
            <Card className="border-none shadow-xl">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Code</TableHead>
                      <TableHead>Énoncé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="animate-spin inline" /></TableCell></TableRow>
                    ) : questions?.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-xs font-bold text-primary">{q.questionCode || '---'}</TableCell>
                        <TableCell><p className="line-clamp-1">{q.statement}</p></TableCell>
                        <TableCell><Badge variant={q.isMultipleCorrect ? "secondary" : "outline"}>{q.isMultipleCorrect ? "Multiple" : "Unique"}</Badge></TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/manage-question/${activeExamId}/${q.id}`}><Pencil className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="text-destructive">
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

