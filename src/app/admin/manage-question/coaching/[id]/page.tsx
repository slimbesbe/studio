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
  Hash,
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

export default function ManageCoachingQuestionPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const questionId = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [choices, setChoices] = useState<string[]>(["", "", "", ""]);
  const [correctChoice, setCorrectChoice] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [index, setIndex] = useState(0);

  // PMP Tags
  const [domain, setDomain] = useState("Process");
  const [approach, setApproach] = useState("Predictive");
  const [difficulty, setDifficulty] = useState("Medium");

  const questionRef = useMemoFirebase(() => doc(db, 'questions', questionId), [db, questionId]);
  const { data: questionData, isLoading: isQuestionLoading } = useDoc(questionRef);

  useEffect(() => {
    if (questionData) {
      setText(questionData.text || "");
      setExplanation(questionData.explanation || "");
      setChoices(questionData.choices || ["", "", "", ""]);
      setCorrectChoice(String(questionData.correctChoice || "1"));
      setIsActive(questionData.isActive !== false);
      setIndex(questionData.index || 0);
      if (questionData.tags) {
        setDomain(questionData.tags.domain || "Process");
        setApproach(questionData.tags.approach || "Predictive");
        setDifficulty(questionData.tags.difficulty || "Medium");
      }
    }
  }, [questionData]);

  const handleChoiceChange = (idx: number, val: string) => {
    const newChoices = [...choices];
    newChoices[idx] = val;
    setChoices(newChoices);
  };

  const validate = () => {
    if (!text.trim()) return "L'énoncé est obligatoire.";
    if (choices.some(c => !c.trim())) return "Toutes les options doivent être remplies.";
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
      const updateData = {
        text,
        choices,
        correctChoice,
        correctOptionIds: [correctChoice],
        explanation,
        isActive,
        index,
        updatedAt: serverTimestamp(),
        tags: {
          domain,
          approach,
          difficulty
        }
      };

      await updateDoc(doc(db, 'questions', questionId), updateData);
      toast({ title: "Succès", description: "Question de coaching mise à jour." });
      router.back();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isQuestionLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
        <div className="flex flex-col">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Éditer Question Coaching</h1>
          <div className="flex items-center gap-1 text-primary font-mono text-sm mt-1">
            <Hash className="h-3 w-3" /> Index Q-{index}
          </div>
        </div>
      </div>

      <Card className="border-t-8 border-t-primary shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-8"><CardTitle className="text-xl flex items-center gap-2 uppercase tracking-widest"><HelpCircle className="h-5 w-5 text-primary" /> Configuration Question</CardTitle></CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] text-slate-400 italic">Énoncé de la question</Label>
            <Textarea 
              id="text" 
              className="min-h-[120px] text-lg font-bold italic border-2 rounded-xl"
              value={text}
              onChange={(e) => setText(e.target.value)}
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

          <div className="space-y-4">
            <Label className="font-black uppercase text-[10px] text-slate-400 italic">Options de réponse (Cochez la bonne)</Label>
            <div className="grid gap-4">
              {choices.map((choice, idx) => (
                <div key={idx} className="flex gap-4 items-start group">
                  <div className="pt-3">
                    <div 
                      onClick={() => setCorrectChoice(String(idx + 1))}
                      className={cn(
                        "h-8 w-8 rounded-full border-4 cursor-pointer flex items-center justify-center transition-all",
                        correctChoice === String(idx + 1) ? 'border-primary bg-primary' : 'border-slate-200 bg-white hover:border-primary/50'
                      )}
                    >
                      {correctChoice === String(idx + 1) && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                  </div>
                  <Input 
                    value={choice}
                    onChange={(e) => handleChoiceChange(idx, e.target.value)}
                    className={cn(
                      "h-14 font-bold italic border-2 rounded-xl transition-all",
                      correctChoice === String(idx + 1) ? "border-emerald-500 bg-emerald-50/50" : "bg-white"
                    )}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                  />
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
              placeholder="Expliquez pourquoi c'est la bonne réponse selon le mindset PMP..."
            />
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border-2 border-dashed">
            <div className="space-y-0.5">
              <Label className="text-base font-black italic uppercase tracking-tight text-slate-700">Statut de la question</Label>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Désactiver pour masquer de la simulation.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t p-8 flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="px-12 rounded-2xl h-16 font-black uppercase tracking-widest shadow-xl bg-primary hover:scale-105 transition-transform">
            {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />} Enregistrer les modifications
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
