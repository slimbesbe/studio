
"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, getDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  Tags,
  Image as ImageIcon,
  X,
  ChevronDown,
  Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const ALL_SOURCES = [
  { id: 'S1', label: 'Coaching S1' },
  { id: 'S2', label: 'Coaching S2' },
  { id: 'S3', label: 'Coaching S3' },
  { id: 'S4', label: 'Coaching S4' },
  { id: 'S5', label: 'Coaching S5' },
  { id: 'S6', label: 'Coaching S6' },
];

function ManageCoachingQuestionContent() {
  const { profile, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const questionId = params.id as string;
  const isNew = questionId === 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [choices, setChoices] = useState<string[]>(["", "", "", ""]);
  const [correctChoice, setCorrectChoice] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [index, setIndex] = useState(parseInt(searchParams.get('index') || '0'));
  const [questionCode, setQuestionCode] = useState("");
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  // PMP Tags
  const [domain, setDomain] = useState("Process");
  const [approach, setApproach] = useState("Predictive");
  const [difficulty, setDifficulty] = useState("Medium");

  const questionRef = useMemoFirebase(() => !isNew ? doc(db, 'questions', questionId) : null, [db, questionId, isNew]);
  const { data: questionData, isLoading: isQuestionLoading } = useDoc(questionRef);

  useEffect(() => {
    const sessionUrl = searchParams.get('sessionId');
    if (isNew && sessionUrl) {
      setSourceIds([sessionUrl]);
    }
  }, [isNew, searchParams]);

  useEffect(() => {
    if (questionData && !isNew) {
      setText(questionData.text || "");
      setImageUrl(questionData.imageUrl || "");
      if (questionData.imageUrl) setShowImageInput(true);
      setExplanation(questionData.explanation || "");
      setChoices(questionData.choices || ["", "", "", ""]);
      setCorrectChoice(String(questionData.correctChoice || "1"));
      setIsActive(questionData.isActive !== false);
      setIndex(questionData.index || 0);
      setQuestionCode(questionData.questionCode || "");
      setSourceIds(questionData.sourceIds || []);

      if (questionData.tags) {
        setDomain(questionData.tags.domain || "Process");
        setApproach(questionData.tags.approach || "Predictive");
        setDifficulty(questionData.tags.difficulty || "Medium");
      }
    }
  }, [questionData, isNew]);

  const handleChoiceChange = (idx: number, val: string) => {
    const newChoices = [...choices];
    newChoices[idx] = val;
    setChoices(newChoices);
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast({ variant: "destructive", title: "Énoncé obligatoire" });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalData = {
        text,
        imageUrl,
        choices,
        correctChoice,
        correctOptionIds: [correctChoice],
        explanation,
        isActive,
        index,
        questionCode: questionCode || `COACH-Q-${Date.now()}`,
        sourceIds,
        silo: 'coaching', // ISOLEMENT PHYSIQUE
        updatedAt: serverTimestamp(),
        tags: { domain, approach, difficulty }
      };

      if (isNew) {
        const newRef = doc(collection(db, 'questions'));
        await setDoc(newRef, { ...finalData, id: newRef.id });
      } else {
        await updateDoc(doc(db, 'questions', questionId), finalData);
      }
      
      toast({ title: "Sauvegardé", description: "Question de coaching enregistrée avec succès." });
      router.back();
    } catch (e) {
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
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
        <div className="flex flex-col">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">
            {isNew ? 'Nouvelle Question Coaching' : 'Éditer Question Coaching'}
          </h1>
          <Badge variant="outline" className="mt-1 font-black uppercase italic text-[9px] border-2">SILO : COACHING</Badge>
        </div>
      </div>

      <Card className="border-t-8 border-t-primary shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-8"><CardTitle className="text-xl flex items-center gap-2 uppercase tracking-widest italic">Configuration Coaching</CardTitle></CardHeader>
        <CardContent className="p-8 space-y-8">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Code Question</Label>
              <Input 
                value={questionCode} 
                onChange={(e) => setQuestionCode(e.target.value)}
                placeholder="Ex: COACH-S2-Q1"
                className="h-14 rounded-xl border-2 font-black italic"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Index d'ordre</Label>
              <Input 
                type="number"
                value={index} 
                onChange={(e) => setIndex(parseInt(e.target.value))}
                className="h-14 rounded-xl border-2 font-black italic"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Énoncé</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowImageInput(!showImageInput)}
                className="h-10 px-4 rounded-xl border-2 font-black uppercase text-[10px] italic flex items-center gap-2 shadow-sm"
              >
                <ImageIcon className="h-4 w-4" /> 
                {imageUrl ? "Modifier Image" : "Insérer Image"}
              </Button>
            </div>

            {showImageInput && (
              <div className="animate-slide-up p-6 bg-slate-50 rounded-2xl border-2 border-dashed space-y-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-primary italic">URL de l'image (Firebase Storage, etc.)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={imageUrl} 
                      onChange={(e) => setImageUrl(e.target.value)} 
                      placeholder="https://..." 
                      className="h-12 rounded-xl border-2 font-bold italic bg-white"
                    />
                    {imageUrl && (
                      <Button variant="ghost" size="icon" onClick={() => setImageUrl("")} className="h-12 w-12 rounded-xl text-red-500 border-2 bg-white">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {imageUrl && (
                  <div className="border-2 rounded-xl overflow-hidden bg-white p-2 flex justify-center max-h-48 shadow-inner">
                    <img src={imageUrl} alt="Preview" className="h-full object-contain rounded-lg" />
                  </div>
                )}
              </div>
            )}

            <Textarea 
              className="min-h-[120px] text-lg font-bold italic border-2 rounded-xl"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 rounded-2xl border-2 border-dashed">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 italic">Domaine</Label>
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
              <Label className="text-[10px] font-black uppercase text-slate-400 italic">Approche</Label>
              <Select value={approach} onValueChange={setApproach}>
                <SelectTrigger className="h-12 rounded-lg font-bold italic border-2 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Predictive">Waterfall</SelectItem>
                  <SelectItem value="Agile">Agile</SelectItem>
                  <SelectItem value="Hybrid">Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 italic">Niveau</Label>
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
            <Label className="font-black uppercase text-[10px] text-slate-400 italic">Options (Cochez la bonne)</Label>
            <div className="grid gap-3">
              {choices.map((choice, idx) => (
                <div key={idx} className="flex gap-4 items-center group">
                  <div 
                    onClick={() => setCorrectChoice(String(idx + 1))}
                    className={cn(
                      "h-8 w-8 rounded-full border-4 cursor-pointer flex items-center justify-center transition-all",
                      correctChoice === String(idx + 1) ? 'border-primary bg-primary' : 'border-slate-200'
                    )}
                  >
                    {correctChoice === String(idx + 1) && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  <Input 
                    value={choice}
                    onChange={(e) => handleChoiceChange(idx, e.target.value)}
                    className="h-14 font-bold italic border-2 rounded-xl bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] text-slate-400 italic">Justification Mindset PMI®</Label>
            <Textarea 
              className="min-h-[150px] italic font-bold text-slate-700 border-2 rounded-xl bg-slate-50/30"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t p-8 flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="px-12 rounded-2xl h-16 font-black uppercase tracking-widest shadow-xl bg-primary">
            {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />} Sauvegarder dans COACHING
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ManageCoachingQuestionPage() {
  return (
    <Suspense fallback={<Loader2 className="animate-spin" />}>
      <ManageCoachingQuestionContent />
    </Suspense>
  );
}
