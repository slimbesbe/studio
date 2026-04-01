
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
  { id: 'exam1', label: 'Examen 1' },
  { id: 'exam2', label: 'Examen 2' },
  { id: 'exam3', label: 'Examen 3' },
  { id: 'exam4', label: 'Examen 4' },
  { id: 'exam5', label: 'Examen 5' },
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
      setExplanation(questionData.explanation || "");
      setChoices(questionData.choices || ["", "", "", ""]);
      setCorrectChoice(String(questionData.correctChoice || "1"));
      setIsActive(questionData.isActive !== false);
      setIndex(questionData.index || 0);
      setQuestionCode(questionData.questionCode || "");
      
      // Load sources
      let loadedSources = questionData.sourceIds || [];
      if (loadedSources.length === 0) {
        if (questionData.sessionId) loadedSources.push(questionData.sessionId);
        if (questionData.examId) loadedSources.push(questionData.examId);
      }
      setSourceIds(loadedSources);

      if (questionData.tags) {
        setDomain(questionData.tags.domain || "Process");
        setApproach(questionData.tags.approach || "Predictive");
        setDifficulty(questionData.tags.difficulty || "Medium");
      }
    }
  }, [questionData, isNew]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        toast({ variant: "destructive", title: "Image trop lourde", description: "Veuillez choisir une image de moins de 800 Ko." });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSource = (id: string) => {
    setSourceIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleAllSources = () => {
    if (sourceIds.length === ALL_SOURCES.length) {
      setSourceIds([]);
    } else {
      setSourceIds(ALL_SOURCES.map(s => s.id));
    }
  };

  const handleChoiceChange = (idx: number, val: string) => {
    const newChoices = [...choices];
    newChoices[idx] = val;
    setChoices(newChoices);
  };

  const validate = () => {
    if (!text.trim()) return "L'énoncé est obligatoire.";
    if (choices.some(c => !c.trim())) return "Toutes les options doivent être remplies.";
    if (index === 0) return "L'index est requis.";
    if (!questionCode.trim()) return "Le code de question est obligatoire.";
    if (sourceIds.length === 0) return "Veuillez assigner au moins une source.";
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
      const firstExam = sourceIds.find(s => s.startsWith('exam'));
      const firstSession = sourceIds.find(s => s.startsWith('S'));

      const finalData = {
        text,
        imageUrl,
        choices,
        correctChoice,
        correctOptionIds: [correctChoice],
        explanation,
        isActive,
        index,
        questionCode,
        sourceIds,
        examId: firstExam || null,
        sessionId: firstSession || null,
        updatedAt: serverTimestamp(),
        tags: {
          domain,
          approach,
          difficulty
        }
      };

      if (isNew) {
        // Pour les questions de coaching, on utilise une nomenclature fixe si c'est nouveau
        const newId = `COACHING_Q_${index}`;
        const newRef = doc(db, 'questions', newId);
        await setDoc(newRef, { ...finalData, id: newRef.id }, { merge: true });
      } else {
        await updateDoc(doc(db, 'questions', questionId), finalData);
      }
      
      toast({ title: "Succès", description: "Question de coaching enregistrée." });
      router.back();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || (!isNew && isQuestionLoading)) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;
  }

  const selectedCount = sourceIds.length;
  const sourceLabel = selectedCount === 0 
    ? "Assigner à..." 
    : selectedCount === ALL_SOURCES.length 
      ? "Toutes les sources" 
      : `${selectedCount} source(s)`;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
        <div className="flex flex-col">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">
            {isNew ? 'Nouvelle Question Coaching' : 'Éditer Question Coaching'}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1 text-primary font-mono text-sm">
              <Hash className="h-3 w-3" /> Index Q-{index}
            </div>
          </div>
        </div>
      </div>

      <Card className="border-t-8 border-t-primary shadow-2xl rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-8"><CardTitle className="text-xl flex items-center gap-2 uppercase tracking-widest"><HelpCircle className="h-5 w-5 text-primary" /> Configuration Question</CardTitle></CardHeader>
        <CardContent className="p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Code Question (Unique)</Label>
              <Input 
                value={questionCode} 
                onChange={(e) => setQuestionCode(e.target.value.toUpperCase())}
                placeholder="Ex: COACH-S2-Q1"
                className="h-14 rounded-xl border-2 font-black italic text-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 italic">
                <Layers className="h-3 w-3" /> Sources d'Assignation
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-14 justify-between border-2 rounded-xl px-4 font-bold italic bg-white text-slate-700">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className={cn("h-5 w-5", selectedCount > 0 ? "text-emerald-500" : "text-slate-300")} />
                      {sourceLabel}
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-2 rounded-2xl shadow-2xl border-4" align="start">
                  <div className="space-y-1">
                    <div 
                      onClick={toggleAllSources}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors border-b mb-1"
                    >
                      <Checkbox checked={selectedCount === ALL_SOURCES.length} onCheckedChange={toggleAllSources} />
                      <span className="font-black italic text-primary uppercase text-xs">Toutes les sources ({ALL_SOURCES.length})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {ALL_SOURCES.map((source) => (
                        <div 
                          key={source.id} 
                          onClick={() => toggleSource(source.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors",
                            sourceIds.includes(source.id) && "bg-emerald-50/50"
                          )}
                        >
                          <Checkbox checked={sourceIds.includes(source.id)} onCheckedChange={() => toggleSource(source.id)} />
                          <span className="font-bold italic text-xs text-slate-700">{source.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Énoncé de la question</Label>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 rounded-lg font-black uppercase text-[10px] gap-2 border-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-3 w-3" /> Insérer une image
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
              />
            </div>
            <Textarea 
              id="text" 
              className="min-h-[120px] text-lg font-bold italic border-2 rounded-xl"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {imageUrl && (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Illustration</Label>
                <Button variant="ghost" size="sm" className="h-6 text-destructive font-black uppercase text-[10px]" onClick={() => setImageUrl('')}>
                  <X className="h-3 w-3 mr-1" /> Supprimer
                </Button>
              </div>
              <div className="relative aspect-video w-full max-w-2xl mx-auto rounded-2xl overflow-hidden border-4 border-dashed border-primary/20 bg-slate-50 group">
                <img 
                  src={imageUrl} 
                  alt="Aperçu" 
                  className="object-contain w-full h-full"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="secondary" className="font-black uppercase text-xs" onClick={() => fileInputRef.current?.click()}>Changer l'image</Button>
                </div>
              </div>
            </div>
          )}

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
            {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />} {isNew ? 'Créer Question' : 'Enregistrer les modifications'}
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
