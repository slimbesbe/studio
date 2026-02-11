"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, getDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
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
  Hash,
  Tags
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  text: string;
}

export default function ManageQuestionPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const examId = params.examId as string;
  const questionId = params.id as string;
  const isNew = questionId === 'new';

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

  // PMP Tags
  const [domain, setDomain] = useState("Process");
  const [approach, setApproach] = useState("Predictive");
  const [difficulty, setDifficulty] = useState("Medium");

  const questionRef = useMemoFirebase(() => !isNew ? doc(db, 'questions', questionId) : null, [db, questionId, isNew]);
  const { data: questionData, isLoading: isQuestionLoading } = useDoc(questionRef);

  useEffect(() => {
    if (questionData && !isNew) {
      setStatement(questionData.statement || questionData.text || "");
      setExplanation(questionData.explanation || "");
      setIsMultipleCorrect(questionData.isMultipleCorrect || false);
      
      if (questionData.options) {
        setOptions(questionData.options);
      } else if (questionData.choices) {
        setOptions(questionData.choices.map((c: string, i: number) => ({ id: String(i + 1), text: c })));
      }

      setCorrectOptionIds(questionData.correctOptionIds || [String(questionData.correctChoice)]);
      setIsActive(questionData.isActive !== false);
      setQuestionCode(questionData.questionCode || "");
      if (questionData.tags) {
        setDomain(questionData.tags.domain || "Process");
        setApproach(questionData.tags.approach || "Predictive");
        setDifficulty(questionData.tags.difficulty || "Medium");
      }
    }
  }, [questionData, isNew]);

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
      const finalData = {
        statement,
        text: statement,
        options,
        choices: options.map(o => o.text),
        correctOptionIds,
        correctChoice: correctOptionIds[0],
        isMultipleCorrect,
        explanation,
        isActive,
        updatedAt: serverTimestamp(),
        tags: {
          domain,
          approach,
          difficulty
        },
        examId: examId === 'general' ? null : examId,
        questionCode: questionCode || `Q-${Date.now()}`
      };

      if (isNew) {
        const newRef = doc(collection(db, 'questions'));
        await setDoc(newRef, { ...finalData, id: newRef.id });
      } else {
        await updateDoc(doc(db, 'questions', questionId), finalData);
      }

      toast({ title: "Succès", description: "Question enregistrée." });
      router.push('/admin/questions');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || (!isNew && isQuestionLoading)) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/admin/questions"><ArrowLeft /></Link></Button>
        <div className="flex flex-col">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">
            {isNew ? 'Nouvelle Question' : 'Édition Question'}
          </h1>
          <div className="flex items-center gap-2 text-primary font-mono text-sm mt-1">
            <Hash className="h-3 w-3" /> {questionCode || 'Nouveau'}
          </div>
        </div>
      </div>

      <Card className="border-t-8 border-t-primary shadow-2xl rounded-3xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <CardTitle className="text-xl flex items-center gap-2 uppercase tracking-widest">
            <HelpCircle className="h-5 w-5 text-primary" /> Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] text-slate-400 italic">Énoncé de la question</Label>
            <Textarea 
              id="statement" 
              className="min-h-[120px] text-lg font-bold italic border-2 rounded-xl"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Saisissez l'énoncé de la question..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50 rounded-2xl border-2 border-dashed">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 italic"><Tags className="h-3 w-3" /> Domaine</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger className="h-12 rounded-lg font-bold italic border-2 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="People">People</SelectItem>
                  <SelectItem value="Process">Processus</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 italic"><Tags className="h-3 w-3" /> Approche</Label>
              <Select value={approach} onValueChange={setApproach}>
                <SelectTrigger className="h-12 rounded-lg font-bold italic border-2 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Predictive">Prédictif</SelectItem>
                  <SelectItem value="Agile">Agile</SelectItem>
                  <SelectItem value="Hybrid">Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 italic"><Tags className="h-3 w-3" /> Niveau</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-12 rounded-lg font-bold italic border-2 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Facile</SelectItem>
                  <SelectItem value="Medium">Moyen</SelectItem>
                  <SelectItem value="Hard">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border-2 border-dashed">
            <div className="space-y-0.5">
              <Label className="text-base font-black italic uppercase tracking-tight text-slate-700">Réponses multiples</Label>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Autoriser plusieurs bons choix.</p>
            </div>
            <Switch checked={isMultipleCorrect} onCheckedChange={setIsMultipleCorrect} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Options de réponse</Label>
              <Button variant="outline" size="sm" onClick={handleAddOption} disabled={options.length >= 10} className="rounded-xl border-2 font-black uppercase text-[10px]">
                <Plus className="mr-2 h-4 w-4" /> Ajouter Option
              </Button>
            </div>

            <div className="grid gap-4">
              {options.map((opt, index) => (
                <div key={opt.id} className="flex gap-4 items-start group">
                  <div className="pt-3">
                    <div 
                      onClick={() => toggleCorrect(opt.id)}
                      className={cn(
                        "h-8 w-8 rounded-full border-4 cursor-pointer flex items-center justify-center transition-all",
                        correctOptionIds.includes(opt.id) ? 'border-primary bg-primary' : 'border-slate-200 bg-white hover:border-primary/50'
                      )}
                    >
                      {correctOptionIds.includes(opt.id) && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                  </div>
                  <Input 
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                    className={cn(
                      "h-14 font-bold italic border-2 rounded-xl transition-all",
                      correctOptionIds.includes(opt.id) ? "border-emerald-500 bg-emerald-50/50" : "bg-white"
                    )}
                    placeholder={`Texte de l'option ${String.fromCharCode(65 + index)}...`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(opt.id)} disabled={options.length <= 2} className="h-14 w-14 rounded-xl border-2 hover:bg-red-50 text-red-500 border-red-50">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Label className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 italic"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Justification Mindset PMI®</Label>
            <Textarea 
              className="min-h-[150px] italic font-bold text-slate-700 border-2 rounded-xl bg-slate-50/30"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Expliquez pourquoi c'est la bonne réponse..."
            />
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border-2 border-dashed">
            <div className="space-y-0.5"><Label className="text-base font-black italic uppercase tracking-tight text-slate-700">Statut Actif</Label></div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t p-8 flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="px-12 rounded-2xl h-16 font-black uppercase tracking-widest shadow-xl bg-primary hover:scale-105 transition-transform">
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Enregistrer la Question
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}