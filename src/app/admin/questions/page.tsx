
"use client";

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  BookCopy, 
  ChevronLeft,
  Upload,
  Download
} from 'lucide-react';
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette question ?")) return;
    try {
      await deleteDoc(doc(db, 'exams', activeExamId, 'questions', id));
      toast({ title: "Supprimé", description: "Question supprimée." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        statement: "Énoncez votre question PMP ici.",
        option1: "Option A",
        option2: "Option B",
        option3: "Option C",
        option4: "Option D",
        option5: "",
        explanation: "Justification du mindset PMI.",
        correct: "A"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "template_questions_simovex.xlsx");
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
            <p className="text-muted-foreground">Gestion par examen</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadTemplate} className="rounded-md">
            <Download className="mr-2 h-4 w-4" /> Modèle Excel
          </Button>
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="rounded-md">
            <Upload className="mr-2 h-4 w-4" /> Importer Excel
          </Button>
          <Button asChild className="rounded-md">
            <Link href={`/admin/questions/new?examId=${activeExamId}`}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Question
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeExamId} onValueChange={setActiveExamId} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12 bg-muted/50">
          {EXAMS.map(exam => (
            <TabsTrigger key={exam.id} value={exam.id} className="font-bold">
              {exam.title}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {EXAMS.map(exam => (
          <TabsContent key={exam.id} value={exam.id} className="mt-6">
            <Card className="border-none shadow-xl">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-32">ID Question</TableHead>
                      <TableHead className="w-[45%]">Énoncé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="animate-spin inline" /></TableCell></TableRow>
                    ) : questions?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Aucune question dans cet examen.</TableCell></TableRow>
                    ) : (
                      questions?.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((q) => (
                        <TableRow key={q.id}>
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {q.questionCode || '---'}
                          </TableCell>
                          <TableCell className="py-4">
                            <p className="line-clamp-2 text-sm">{q.statement}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={q.isMultipleCorrect ? "secondary" : "outline"}>
                              {q.isMultipleCorrect ? "Multiple" : "Unique"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={q.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                              {q.isActive !== false ? "Actif" : "Inactif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2 px-6">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/manage-question/${activeExamId}/${q.id}`}><Pencil className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <ImportQuestionsModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        examId={activeExamId}
      />
    </div>
  );
}
