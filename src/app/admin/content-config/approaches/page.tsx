
"use client";

import { useState, useEffect, useRef } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  BookOpen, 
  Zap, 
  Plus, 
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function ManageApproaches() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('predictive');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [data, setData] = useState<any>({
    title: '',
    description: '',
    jargon: [],
    quiz: []
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      setIsLoading(true);
      try {
        const docRef = doc(db, 'concepts_approaches', activeTab);
        const d = await getDoc(docRef);
        if (d.exists()) {
          setData(d.data());
        } else {
          setData({ title: activeTab.toUpperCase(), description: '', jargon: [], quiz: [] });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [db, activeTab, user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'concepts_approaches', activeTab), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Configuration sauvegardée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur sauvegarde" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Parsing Jargon
        const jargonSheet = wb.Sheets["Jargon"];
        const jargonData = jargonSheet ? XLSX.utils.sheet_to_json(jargonSheet) : [];
        const parsedJargon = jargonData.map((row: any) => ({
          term: row.term || row.Terme || "",
          def: row.def || row.Définition || ""
        }));

        // Parsing Quiz
        const quizSheet = wb.Sheets["Quiz"];
        const quizData = quizSheet ? XLSX.utils.sheet_to_json(quizSheet) : [];
        const parsedQuiz = quizData.map((row: any) => ({
          q: row.q || row.Question || "",
          a: [row.a1 || "", row.a2 || "", row.a3 || "", row.a4 || ""].filter(x => x !== ""),
          c: parseInt(row.correct_idx || row.index_correct || "0"),
          exp: row.exp || row.Explication || ""
        }));

        setData((prev: any) => ({
          ...prev,
          jargon: parsedJargon.length > 0 ? parsedJargon : prev.jargon,
          quiz: parsedQuiz.length > 0 ? parsedQuiz : prev.quiz
        }));

        toast({ title: "Import réussi", description: "Données chargées. N'oubliez pas d'enregistrer." });
      } catch (err) {
        toast({ variant: "destructive", title: "Erreur import", description: "Format de fichier invalide." });
      }
    };
    reader.readAsBinaryString(file);
  };

  const addJargon = () => setData({...data, jargon: [...data.jargon, { term: '', def: '' }]});
  const removeJargon = (idx: number) => setData({...data, jargon: data.jargon.filter((_:any, i:number) => i !== idx)});
  const updateJargon = (idx: number, field: string, val: string) => {
    const next = [...data.jargon];
    next[idx][field] = val;
    setData({...data, jargon: next});
  };

  const addQuiz = () => setData({...data, quiz: [...data.quiz, { q: '', a: ['', '', ''], c: 0, exp: '' }]});
  const removeQuiz = (idx: number) => setData({...data, quiz: data.quiz.filter((_:any, i:number) => i !== idx)});
  const updateQuiz = (idx: number, field: string, val: any) => {
    const next = [...data.quiz];
    if (field.startsWith('a.')) {
      const optIdx = parseInt(field.split('.')[1]);
      next[idx].a[optIdx] = val;
    } else {
      next[idx][field] = val;
    }
    setData({...data, quiz: next});
  };

  const exportModel = () => {
    const jargonWs = XLSX.utils.json_to_sheet([{ term: "WBS", def: "Work Breakdown Structure" }]);
    const quizWs = XLSX.utils.json_to_sheet([{ q: "Ma question ?", a1: "Opt 1", a2: "Opt 2", a3: "Opt 3", a4: "Opt 4", correct_idx: 0, exp: "Justification" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, jargonWs, "Jargon");
    XLSX.utils.book_append_sheet(wb, quizWs, "Quiz");
    XLSX.writeFile(wb, `modele_${activeTab}.xlsx`);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm"><Link href="/admin/content-config"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Vision Approches</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Configurez les cycles de vie projet.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportModel} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2"><Download className="mr-2 h-4 w-4" /> Modèle</Button>
          <div className="relative">
            <Button variant="outline" className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 bg-emerald-50 text-emerald-600 border-emerald-100" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import Excel</Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl">
            {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />} Enregistrer {activeTab}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 h-16 bg-white p-2 rounded-[24px] shadow-lg border-2">
          <TabsTrigger value="predictive" className="rounded-xl font-black italic uppercase text-xs">Waterfall</TabsTrigger>
          <TabsTrigger value="agile" className="rounded-xl font-black italic uppercase text-xs">Agile</TabsTrigger>
          <TabsTrigger value="hybrid" className="rounded-xl font-black italic uppercase text-xs">Hybride</TabsTrigger>
        </TabsList>

        <div className="mt-10 space-y-8">
          <Card className="rounded-[40px] shadow-2xl border-none p-10 bg-white space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Titre affiché</Label>
                <Input value={data.title} onChange={(e) => setData({...data, title: e.target.value})} className="h-14 rounded-xl border-2 font-black italic" />
              </div>
              <div className="md:col-span-2 space-y-3">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Description du Focus (Texte d'introduction)</Label>
                <Textarea value={data.description} onChange={(e) => setData({...data, description: e.target.value})} className="min-h-[120px] rounded-xl border-2 font-bold italic" />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* JARGON */}
            <Card className="rounded-[40px] shadow-xl border-none p-10 bg-white flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black italic uppercase text-indigo-600 flex items-center gap-3"><BookOpen className="h-6 w-6" /> Jargon Clé</h3>
                <Button variant="outline" size="sm" onClick={addJargon} className="rounded-xl border-2 font-black uppercase text-[10px] italic"><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>
              </div>
              <div className="space-y-4 flex-1">
                {data.jargon.map((j:any, idx:number) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed relative group">
                    <Button variant="ghost" size="icon" onClick={() => removeJargon(idx)} className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white border-2 text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><Trash2 className="h-4 w-4" /></Button>
                    <div className="space-y-4">
                      <Input placeholder="Terme (ex: Backlog)" value={j.term} onChange={(e) => updateJargon(idx, 'term', e.target.value)} className="h-10 bg-white rounded-lg font-black italic border-2" />
                      <Textarea placeholder="Définition..." value={j.def} onChange={(e) => updateJargon(idx, 'def', e.target.value)} className="h-20 bg-white rounded-lg font-bold italic border-2" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* QUIZ */}
            <Card className="rounded-[40px] shadow-xl border-none p-10 bg-white flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black italic uppercase text-amber-600 flex items-center gap-3"><Zap className="h-6 w-6" /> Quiz Rapide</h3>
                <Button variant="outline" size="sm" onClick={addQuiz} className="rounded-xl border-2 font-black uppercase text-[10px] italic"><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>
              </div>
              <div className="space-y-6 flex-1">
                {data.quiz.map((q:any, idx:number) => (
                  <div key={idx} className="p-6 bg-amber-50/30 rounded-3xl border-2 border-amber-100 relative group space-y-4">
                    <Button variant="ghost" size="icon" onClick={() => removeQuiz(idx)} className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white border-2 text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><Trash2 className="h-4 w-4" /></Button>
                    <Input placeholder="Question ?" value={q.q} onChange={(e) => updateQuiz(idx, 'q', e.target.value)} className="h-10 bg-white rounded-lg font-black italic border-2 border-amber-200" />
                    <div className="grid grid-cols-1 gap-2">
                      {q.a.map((opt:string, optIdx:number) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <button onClick={() => updateQuiz(idx, 'c', optIdx)} className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center font-black text-[10px]", q.c === optIdx ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-amber-200 text-amber-200")}>{String.fromCharCode(65 + optIdx)}</button>
                          <Input placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} value={opt} onChange={(e) => updateQuiz(idx, `a.${optIdx}`, e.target.value)} className="h-9 bg-white rounded-lg font-bold italic text-xs border-2 border-amber-100" />
                        </div>
                      ))}
                    </div>
                    <Textarea placeholder="Justification Mindset..." value={q.exp} onChange={(e) => updateQuiz(idx, 'exp', e.target.value)} className="h-20 bg-white rounded-lg font-bold italic text-xs border-2 border-amber-100" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
