
"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Save, 
  ArrowLeft, 
  CheckCircle2, 
  HelpCircle,
  Hash
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Option {
  id: string;
  text: string;
}

export default function EditQuestionPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const examId = params.examId as string;
  const questionId = params.id as string;

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [statement, setStatement] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isMultipleCorrect, setIsMultipleCorrect] = useState(false);
  const [options, setOptions] = useState<Option[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [questionCode, setQuestionCode] = useState("");

  const questionRef = useMemoFirebase(() => doc(db, 'exams', examId, 'questions', questionId), [db, examId, questionId]);
  const { data: questionData, isLoading: isQuestionLoading } = useDoc(questionRef);

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const adminDoc = await getDoc(doc(db, 'roles_admin', user.uid));
        if (!adminDoc.exists()) router.push('/dashboard');
        else setIsAdmin(true);
      } else if (!isUserLoading) router.push('/');
    }
    checkAdmin();
  }, [user, isUserLoading, db, router]);

  useEffect(() => {
    if (questionData) {
      setStatement(questionData.statement || "");
      setExplanation(questionData.explanation || "");
      setIsMultipleCorrect(questionData.isMultipleCorrect || false);
      setOptions(questionData.options || [{ id: '1', text: '' }, { id: '2', text: '' }]);
      setCorrectOptionIds(questionData.correctOptionIds || []);
      setIsActive(questionData.isActive !== false);
      setQuestionCode(questionData.questionCode || "");
    }
  }, [questionData]);

  const handleAddOption = () => {
    if (options.length >= 10) return;
    const maxId = options.length > 0 ? Math.max(...options.map(o => parseInt(o.id) || 0)) : 0;
    const newId = (maxId + 1).toString();
    setOptions([...options, { id: newId, text: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter(o => o.id !== id));
    setCorrectOptionIds(correctOptionIds.filter(cid => cid !== id));
  };

  const handleOptionTextChange = (id: string, text: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };

  const toggleCorrect = (id: string) => {
    if (isMultipleCorrect) {
      if (correctOptionIds.includes(id)) {
        setCorrectOptionIds(correctOptionIds.filter(cid => cid !== id));
      } else {
        setCorrectOptionIds([...correctOptionIds, id]);
      }
    } else {
      setCorrectOptionIds([id]);
    }
  };

  const validate = () => {
    if (!statement.trim()) return "L'énoncé est obligatoire.";
    if (options.some(o => !o.text.trim())) return "Toutes les options doivent avoir un texte.";
    if (correctOptionIds.length === 0) return "Au moins une bonne réponse est requise.";
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast({ variant: "destructive", title: "Validation échouée", description: error });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'exams', examId, 'questions', questionId), {
        statement,
        options,
        correctOptionIds,
        isMultipleCorrect,
        explanation,
        isActive,
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Succès", description: "Question mise à jour." });
      router.push('/admin/questions');
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isAdmin === null || isQuestionLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/admin/questions"><ArrowLeft /></Link></Button>
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold italic uppercase tracking-tighter">Modifier la Question</h1>
          {questionCode && (
            <div className="flex items-center gap-1 text-primary font-mono text-sm mt-1">
              <Hash className="h-3 w-3" /> {questionCode}
            </div>
          )}
        </div>
      </div>

      <Card className="border-t-8 border-t-primary shadow-2xl rounded-3xl">
        <CardHeader><CardTitle className="text-xl flex items-center gap-2 uppercase tracking-widest"><HelpCircle className="h-5 w-5 text-primary" /> Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="statement" className="font-bold">Énoncé</Label>
            <Textarea 
              id="statement" 
              className="min-h-[120px] text-lg font-medium"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl border-2">
            <div className="space-y-0.5">
              <Label className="text-base font-bold">Réponses multiples</Label>
              <p className="text-sm text-muted-foreground uppercase tracking-tight font-medium">Autoriser plusieurs bons choix.</p>
            </div>
            <Switch checked={isMultipleCorrect} onCheckedChange={setIsMultipleCorrect} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-bold">Options</Label>
              <Button variant="outline" size="sm" onClick={handleAddOption} disabled={options.length >= 10}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {options.map((opt, index) => (
                <div key={opt.id} className="flex gap-4 items-start">
                  <div className="pt-2">
                    {isMultipleCorrect ? (
                      <Checkbox checked={correctOptionIds.includes(opt.id)} onCheckedChange={() => toggleCorrect(opt.id)} className="h-6 w-6" />
                    ) : (
                      <div 
                        onClick={() => toggleCorrect(opt.id)}
                        className={`h-6 w-6 rounded-full border-4 cursor-pointer flex items-center justify-center ${correctOptionIds.includes(opt.id) ? 'border-primary bg-primary' : 'border-muted'}`}
                      >
                        {correctOptionIds.includes(opt.id) && <div className="h-2 w-2 bg-white rounded-full" />}
                      </div>
                    )}
                  </div>
                  <Input 
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                    className={correctOptionIds.includes(opt.id) ? "border-emerald-500 bg-emerald-50/50 font-bold" : "font-medium"}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(opt.id)} disabled={options.length <= 2}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Label className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Explication Mindset PMI</Label>
            <Textarea 
              className="min-h-[120px] italic font-medium"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border-2 border-dashed">
            <div className="space-y-0.5"><Label className="text-base font-bold">Statut Actif</Label></div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t p-8 flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="px-12 rounded-xl h-14 font-black uppercase tracking-widest shadow-xl">
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Enregistrer
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
