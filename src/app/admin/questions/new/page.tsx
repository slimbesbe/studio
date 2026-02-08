
"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, runTransaction } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
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
  AlertCircle,
  HelpCircle,
  Tags
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

interface Option {
  id: string;
  text: string;
}

export default function NewQuestionPage() {
  const { user, isUserLoading, profile } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [examId, setExamId] = useState(searchParams.get('examId') || 'exam1');
  const [statement, setStatement] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isMultipleCorrect, setIsMultipleCorrect] = useState(false);
  const [options, setOptions] = useState<Option[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PMP Tags
  const [domain, setDomain] = useState("Process");
  const [approach, setApproach] = useState("Predictive");
  const [difficulty, setDifficulty] = useState("Medium");

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const adminDoc = await getDoc(doc(db, 'roles_admin', user.uid));
        if (!adminDoc.exists()) router.push('/dashboard');
        else setIsAdmin(true);
      } else if (!isUserLoading) router.push('/login');
    }
    checkAdmin();
  }, [user, isUserLoading, db, router]);

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
    if (!isMultipleCorrect && correctOptionIds.length > 1) return "Une seule réponse autorisée pour ce mode.";
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
      const counterRef = doc(db, 'counters', 'questions');
      const questionCode = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextVal = 1;
        if (counterDoc.exists()) {
          nextVal = (counterDoc.data().current || 0) + 1;
        }
        transaction.set(counterRef, { current: nextVal }, { merge: true });
        return `Q-${nextVal.toString().padStart(6, '0')}`;
      });

      const qRef = doc(collection(db, 'exams', examId, 'questions'));
      const qData = {
        id: qRef.id,
        questionCode,
        statement,
        options,
        correctOptionIds,
        isMultipleCorrect,
        explanation,
        isActive: true,
        createdByRole: profile?.role || 'admin',
        createdAt: serverTimestamp(),
        examId,
        tags: {
          domain,
          approach,
          difficulty
        }
      };

      await setDoc(qRef, qData);
      
      // Also sync to global questions collection for practice filtering
      await setDoc(doc(db, 'questions', qRef.id), qData);

      toast({ title: "Succès", description: `Question ${questionCode} ajoutée.` });
      router.push('/admin/questions');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer la question." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isAdmin === null) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/questions"><ArrowLeft /></Link>
        </Button>
        <h1 className="text-3xl font-bold">Nouvelle Question</h1>
      </div>

      <Card className="border-t-4 border-t-primary shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> Configuration
            </CardTitle>
            <div className="flex items-center gap-4">
               <Label>Examen Cible :</Label>
               <Select value={examId} onValueChange={setExamId}>
                 <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="exam1">Examen 1</SelectItem>
                   <SelectItem value="exam2">Examen 2</SelectItem>
                   <SelectItem value="exam3">Examen 3</SelectItem>
                   <SelectItem value="exam4">Examen 4</SelectItem>
                   <SelectItem value="exam5">Examen 5</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="statement">Énoncé de la question</Label>
            <Textarea 
              id="statement" 
              placeholder="Saisissez l'énoncé ici..." 
              className="min-h-[120px] text-lg"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl border border-dashed">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-black uppercase"><Tags className="h-3 w-3" /> Domaine</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="People">People</SelectItem>
                  <SelectItem value="Process">Processus</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-black uppercase"><Tags className="h-3 w-3" /> Approche</Label>
              <Select value={approach} onValueChange={setApproach}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Predictive">Prédictif</SelectItem>
                  <SelectItem value="Agile">Agile</SelectItem>
                  <SelectItem value="Hybrid">Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-black uppercase"><Tags className="h-3 w-3" /> Niveau</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Facile</SelectItem>
                  <SelectItem value="Medium">Moyen</SelectItem>
                  <SelectItem value="Hard">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-0.5">
              <Label className="text-base">Réponses multiples</Label>
              <p className="text-sm text-muted-foreground">Permettre à l'utilisateur de sélectionner plusieurs bonnes réponses.</p>
            </div>
            <Switch 
              checked={isMultipleCorrect} 
              onCheckedChange={(val) => {
                setIsMultipleCorrect(val);
                setCorrectOptionIds([]);
              }} 
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Options de réponse</Label>
              <Button variant="outline" size="sm" onClick={handleAddOption} disabled={options.length >= 10}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter un choix
              </Button>
            </div>

            <div className="space-y-3">
              {options.map((opt, index) => (
                <div key={opt.id} className="flex gap-3 items-start animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="pt-2">
                    {isMultipleCorrect ? (
                      <Checkbox 
                        checked={correctOptionIds.includes(opt.id)} 
                        onCheckedChange={() => toggleCorrect(opt.id)}
                        className="h-6 w-6"
                      />
                    ) : (
                      <div 
                        onClick={() => toggleCorrect(opt.id)}
                        className={`h-6 w-6 rounded-full border-2 cursor-pointer flex items-center justify-center transition-colors ${correctOptionIds.includes(opt.id) ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}
                      >
                        {correctOptionIds.includes(opt.id) && <div className="h-2.5 w-2.5 bg-white rounded-full" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input 
                      placeholder={`Option ${index + 1}`} 
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                      className={correctOptionIds.includes(opt.id) ? "border-emerald-500 bg-emerald-50/30 font-bold" : ""}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveOption(opt.id)} 
                    disabled={options.length <= 2}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Label htmlFor="explanation" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Explication / Justification
            </Label>
            <Textarea 
              id="explanation" 
              placeholder="Expliquez pourquoi la réponse est correcte..." 
              className="min-h-[100px]"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t p-6 flex justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Vérifiez tout avant d'enregistrer la question.
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="px-8">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer la Question
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
