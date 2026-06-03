
"use client";

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
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
  Image as ImageIcon,
  X,
  ChevronDown,
  Check,
  Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  text: string;
}

const SOURCES_EXAMS = [
  { id: 'exam1', label: 'Examen 1' },
  { id: 'exam2', label: 'Examen 2' },
  { id: 'exam3', label: 'Examen 3' },
  { id: 'exam4', label: 'Examen 4' },
  { id: 'exam5', label: 'Examen 5' },
];

export default function ManageQuestionPage() {
  const { profile, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const sourceIdParam = params.examId as string; 
  const questionId = params.id as string;
  const isNew = questionId === 'new';

  // SILO DETECTION STRICTE
  const contextType = searchParams.get('type') || (sourceIdParam === 'matrix' ? 'matrix' : sourceIdParam === 'practice' ? 'practice' : 'exams');

  const isExamSilo = contextType === 'exams' || sourceIdParam.startsWith('exam');
  const isPracticeSilo = contextType === 'practice' || sourceIdParam === 'practice';
  const isMatrixSilo = contextType === 'matrix' || sourceIdParam === 'matrix';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statement, setStatement] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isMultipleCorrect, setIsMultipleCorrect] = useState(false);
  const [options, setOptions] = useState<Option[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
    { id: '3', text: '' },
    { id: '4', text: '' }
  ]);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [questionCode, setQuestionCode] = useState("");
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);

  // PMP Tags
  const [domain, setDomain] = useState(searchParams.get('domain') || "Process");
  const [approach, setApproach] = useState(searchParams.get('approach') || "Predictive");
  const [difficulty, setDifficulty] = useState("Medium");

  const questionRef = useMemoFirebase(() => !isNew ? doc(db, 'questions', questionId) : null, [db, questionId, isNew]);
  const { data: questionData, isLoading: isQuestionLoading } = useDoc(questionRef);

  useEffect(() => {
    if (isNew && isExamSilo) {
      setSelectedExamIds([sourceIdParam.startsWith('exam') ? sourceIdParam : 'exam1']);
    }
  }, [isNew, isExamSilo, sourceIdParam]);

  useEffect(() => {
    if (questionData && !isNew) {
      setStatement(questionData.statement || questionData.text || "");
      setImageUrl(questionData.imageUrl || "");
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
      
      const sources = questionData.sourceIds || [];
      setSelectedExamIds(sources.filter(s => s.startsWith('exam')));
      
      if (questionData.tags) {
        setDomain(questionData.tags.domain || "Process");
        setApproach(questionData.tags.approach || "Predictive");
        setDifficulty(questionData.tags.difficulty || "Medium");
      }
    }
  }, [questionData, isNew]);

  const toggleExamSource = (id: string) => {
    setSelectedExamIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleUpdate = async () => {
    if (!statement.trim() || correctOptionIds.length === 0) {
      toast({ variant: "destructive", title: "Formulaire incomplet" });
      return;
    }

    setIsSubmitting(true);
    try {
      let finalSources: string[] = [];
      let finalSilo = contextType;

      if (isPracticeSilo) {
        finalSources = ['practice'];
        finalSilo = 'practice';
      } else if (isMatrixSilo) {
        finalSources = ['matrix'];
        finalSilo = 'matrix';
      } else if (isExamSilo) {
        finalSources = selectedExamIds.length > 0 ? selectedExamIds : ['exam1'];
        finalSilo = 'exams';
      }

      const finalData = {
        statement, 
        text: statement, 
        imageUrl, 
        options, 
        choices: options.map(o => o.text),
        correctOptionIds, 
        correctChoice: correctOptionIds[0], 
        isMultipleCorrect,
        explanation, 
        isActive, 
        updatedAt: serverTimestamp(),
        tags: { domain, approach, difficulty },
        sourceIds: finalSources,
        silo: finalSilo, // FORCE LE SILO POUR L'ÉTANCHÉITÉ
        examId: isExamSilo ? finalSources[0] : null,
        questionCode: questionCode || `Q-${Date.now()}`
      };

      if (isNew) {
        const newRef = doc(collection(db, 'questions'));
        await setDoc(newRef, { ...finalData, id: newRef.id });
      } else {
        await updateDoc(doc(db, 'questions', questionId), finalData);
      }

      toast({ title: "Sauvegarde réussie", description: `Question enregistrée dans le silo [${finalSilo.toUpperCase()}].` });
      router.back();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de l'enregistrement" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || (!isNew && isQuestionLoading)) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;
  }

  const siloName = isPracticeSilo ? 'PRATIQUE LIBRE' : isMatrixSilo ? 'MATRICE MAGIQUE' : 'SIMULATIONS EXAMENS';
  const siloColor = isPracticeSilo ? 'text-emerald-600' : isMatrixSilo ? 'text-indigo-600' : 'text-primary';

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
          <div>
            <h1 className={cn("text-3xl font-black italic uppercase tracking-tighter", siloColor)}>
              {isNew ? 'Nouvelle Question' : 'Édition Question'}
            </h1>
            <Badge variant="outline" className="mt-1 font-black uppercase italic tracking-widest text-[9px] border-2">
              SILO : {siloName}
            </Badge>
          </div>
        </div>
      </div>

      <Card className="border-t-8 border-t-slate-900 shadow-2xl rounded-3xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <CardTitle className="text-xl flex items-center gap-2 uppercase tracking-widest italic">
            <HelpCircle className="h-5 w-5 text-primary" /> Configuration Silo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Code Question</Label>
              <Input value={questionCode} onChange={(e) => setQuestionCode(e.target.value)} placeholder="EX: Q-101" className="h-14 rounded-xl border-2 font-black italic" />
            </div>
            {isExamSilo && (
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Assignation Examens</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-14 justify-between border-2 rounded-xl px-4 font-bold italic">
                      {selectedExamIds.length} Simulation(s) <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 rounded-xl shadow-xl border-2 bg-white">
                    {SOURCES_EXAMS.map(ex => (
                      <div key={ex.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer rounded-lg" onClick={() => toggleExamSource(ex.id)}>
                        <Checkbox checked={selectedExamIds.includes(ex.id)} />
                        <span className="text-xs font-bold">{ex.label}</span>
                      </div>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label className="font-black uppercase text-[10px] text-slate-400 italic">Énoncé</Label>
            <Textarea 
              className="min-h-[120px] text-lg font-bold italic border-2 rounded-xl"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Décrivez le scénario..."
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
            <div className="flex items-center justify-between">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Options (Cochez la bonne)</Label>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-slate-400 italic">Multi-choix ?</span>
                <Switch checked={isMultipleCorrect} onCheckedChange={setIsMultipleCorrect} />
              </div>
            </div>

            <div className="grid gap-3">
              {options.map((opt, index) => (
                <div key={opt.id} className="flex gap-4 items-center group">
                  <div 
                    onClick={() => {
                      if(isMultipleCorrect) {
                        setCorrectOptionIds(prev => prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id]);
                      } else {
                        setCorrectOptionIds([opt.id]);
                      }
                    }}
                    className={cn(
                      "h-8 w-8 rounded-full border-4 cursor-pointer flex items-center justify-center transition-all",
                      correctOptionIds.includes(opt.id) ? 'border-primary bg-primary' : 'border-slate-200'
                    )}
                  >
                    {correctOptionIds.includes(opt.id) && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <Input 
                    value={opt.text}
                    onChange={(e) => setOptions(options.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o))}
                    className="h-14 font-bold italic border-2 rounded-xl bg-white"
                    placeholder={`Option ${String.fromCharCode(65 + index)}...`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Label className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 italic">Justification Mindset PMI®</Label>
            <Textarea 
              className="min-h-[150px] italic font-bold text-slate-700 border-2 rounded-xl bg-slate-50/30"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Pourquoi cette réponse est-elle la meilleure ?"
            />
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t p-8 flex justify-end">
          <Button onClick={handleUpdate} disabled={isSubmitting} size="lg" className="px-12 rounded-2xl h-16 font-black uppercase tracking-widest shadow-xl bg-primary">
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Enregistrer dans {contextType.toUpperCase()}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
