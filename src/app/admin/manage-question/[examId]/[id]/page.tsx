
"use client";

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
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
  Tags,
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
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  text: string;
}

const SOURCES_PRACTICE = [{ id: 'general', label: 'Pratique Libre' }];
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
  const { toast } = useToast();
  const examIdParam = params.examId as string;
  const questionId = params.id as string;
  const isNew = questionId === 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Détermination automatique de la banque (Practice vs Exam)
  const isPracticeContext = examIdParam === 'general';
  const currentAvailableSources = isPracticeContext ? SOURCES_PRACTICE : SOURCES_EXAMS;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statement, setStatement] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isMultipleCorrect, setIsMultipleCorrect] = useState(false);
  const [options, setOptions] = useState<Option[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [questionCode, setQuestionCode] = useState("");
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  // PMP Tags
  const [domain, setDomain] = useState("Process");
  const [approach, setApproach] = useState("Predictive");
  const [difficulty, setDifficulty] = useState("Medium");

  const questionRef = useMemoFirebase(() => !isNew ? doc(db, 'questions', questionId) : null, [db, questionId, isNew]);
  const { data: questionData, isLoading: isQuestionLoading } = useDoc(questionRef);

  useEffect(() => {
    if (isNew) {
      setSourceIds([examIdParam]);
    }
  }, [isNew, examIdParam]);

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
      
      // Sécurité : Ne charger que les sources compatibles avec le contexte actuel
      const loadedSources = questionData.sourceIds || (questionData.examId ? [questionData.examId] : ['general']);
      setSourceIds(loadedSources.filter(s => currentAvailableSources.some(avail => avail.id === s)));
      
      if (questionData.tags) {
        setDomain(questionData.tags.domain || "Process");
        setApproach(questionData.tags.approach || "Predictive");
        setDifficulty(questionData.tags.difficulty || "Medium");
      }
    }
  }, [questionData, isNew, currentAvailableSources]);

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
    if (sourceIds.length === currentAvailableSources.length) {
      setSourceIds([]);
    } else {
      setSourceIds(currentAvailableSources.map(s => s.id));
    }
  };

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
    if (sourceIds.length === 0) return "Veuillez assigner la question à au moins une source.";
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
        imageUrl,
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
        sourceIds,
        examId: sourceIds.find(s => s.startsWith('exam')) || null,
        questionCode: questionCode || `Q-${Date.now()}`
      };

      if (isNew) {
        const newRef = doc(collection(db, 'questions'));
        await setDoc(newRef, { ...finalData, id: newRef.id });
      } else {
        await updateDoc(doc(db, 'questions', questionId), finalData);
      }

      toast({ title: "Succès", description: "Question enregistrée." });
      router.push(`/admin/questions?type=${isPracticeContext ? 'practice' : 'exams'}`);
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

  const selectedCount = sourceIds.length;
  const sourceLabel = selectedCount === 0 
    ? "Choisir les sources..." 
    : selectedCount === currentAvailableSources.length 
      ? "Toutes les sources" 
      : `${selectedCount} source(s) sélectionnée(s)`;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
          <div className="flex flex-col">
            <h1 className={cn(
              "text-3xl font-black italic uppercase tracking-tighter",
              isPracticeContext ? "text-emerald-600" : "text-primary"
            )}>
              {isNew ? 'Nouvelle Question' : 'Édition Question'}
            </h1>
            <div className="flex items-center gap-3 font-mono text-[10px] mt-1 uppercase font-bold text-slate-400">
              <Badge variant="outline" className="border-2">{isPracticeContext ? 'BANQUE PRATIQUE' : 'BANQUE EXAMENS'}</Badge>
              {questionCode && <span><Hash className="h-3 w-3 inline mr-1" /> {questionCode}</span>}
            </div>
          </div>
        </div>
      </div>

      <Card className="border-t-8 border-t-primary shadow-2xl rounded-3xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <CardTitle className="text-xl flex items-center gap-2 uppercase tracking-widest italic">
            <HelpCircle className="h-5 w-5 text-primary" /> Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          
          <div className="space-y-4">
            <Label className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 italic">
              <Layers className="h-3 w-3" /> Assignation des Sources (Silo {isPracticeContext ? 'Pratique' : 'Examens'})
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
              <PopoverContent className="w-80 p-2 rounded-2xl shadow-2xl border-4" align="start">
                <div className="space-y-1">
                  {currentAvailableSources.length > 1 && (
                    <div 
                      onClick={toggleAllSources}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors border-b mb-1"
                    >
                      <Checkbox checked={selectedCount === currentAvailableSources.length} onCheckedChange={toggleAllSources} />
                      <span className="font-black italic text-primary uppercase text-xs">Tout sélectionner</span>
                    </div>
                  )}
                  {currentAvailableSources.map((source) => (
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
              </PopoverContent>
            </Popover>
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
                <ImageIcon className="h-3 w-3" /> Insérer image
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
            <Textarea 
              className="min-h-[120px] text-lg font-bold italic border-2 rounded-xl"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Étude de cas ou énoncé..."
            />
          </div>

          {imageUrl && (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-4 border-dashed border-primary/20 bg-slate-50 group">
              <img src={imageUrl} alt="Preview" className="object-contain w-full h-full" />
              <Button variant="destructive" size="icon" className="absolute top-4 right-4 h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setImageUrl('')}><Trash2 /></Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50 rounded-2xl border-2 border-dashed">
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
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Options de réponse (Cochez la/les bonne(s))</Label>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-slate-400 italic">Multi-choix ?</span>
                <Switch checked={isMultipleCorrect} onCheckedChange={setIsMultipleCorrect} />
              </div>
            </div>

            <div className="grid gap-3">
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
                      {correctOptionIds.includes(opt.id) && <Check className="h-4 w-4 text-white" strokeWidth={4} />}
                    </div>
                  </div>
                  <Input 
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                    className={cn(
                      "h-14 font-bold italic border-2 rounded-xl transition-all",
                      correctOptionIds.includes(opt.id) ? "border-emerald-500 bg-emerald-50/50" : "bg-white"
                    )}
                    placeholder={`Option ${String.fromCharCode(65 + index)}...`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(opt.id)} disabled={options.length <= 2} className="h-14 w-14 rounded-xl border-2 hover:bg-red-50 text-red-500">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddOption} disabled={options.length >= 6} className="h-12 border-dashed border-2 rounded-xl font-black uppercase italic text-[10px]">
                <Plus className="mr-2 h-4 w-4" /> Ajouter une option
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Label className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-400 italic"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Justification Mindset PMI®</Label>
            <Textarea 
              className="min-h-[150px] italic font-bold text-slate-700 border-2 rounded-xl bg-slate-50/30"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Expliquez le raisonnement officiel..."
            />
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t p-8 flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="px-12 rounded-2xl h-16 font-black uppercase tracking-widest shadow-xl bg-primary hover:scale-105 transition-transform italic">
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Enregistrer la Question
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
