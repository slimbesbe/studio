"use client";

import { useState, useEffect, useRef } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
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
  Upload,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function ManageDomains() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('people');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [data, setData] = useState<any>({
    title: '',
    description: '',
    mindset: '',
    jargon: [],
    quiz: []
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      setIsLoading(true);
      const snap = await getDoc(doc(db, 'concepts_domains', activeTab));
      if (snap.exists()) {
        setData(snap.data());
      } else {
        setData({ title: activeTab.toUpperCase(), description: '', mindset: '', jargon: [], quiz: [] });
      }
      setIsLoading(false);
    }
    load();
  }, [db, activeTab, user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'concepts_domains', activeTab), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Domaine sauvegardé" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenReset = () => {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    setSecurityCode(code);
    setUserInputCode('');
    setIsResetModalOpen(true);
  };

  const performReset = async () => {
    if (userInputCode !== securityCode) return;
    setIsResetting(true);
    try {
      await deleteDoc(doc(db, 'concepts_domains', activeTab));
      setData({ title: activeTab.toUpperCase(), description: '', mindset: '', jargon: [], quiz: [] });
      toast({ title: `Domaine ${activeTab} réinitialisé` });
      setIsResetModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsResetting(false);
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
        
        // 1. Jargon
        const jargonSheet = wb.Sheets["Jargon"];
        const jargonData = jargonSheet ? XLSX.utils.sheet_to_json(jargonSheet) : [];
        const parsedJargon = jargonData.map((row: any) => ({
          term: String(row.term || row.Terme || row.Term || Object.values(row)[0] || "").trim(),
          def: String(row.def || row.Définition || row.Definition || Object.values(row)[1] || "").trim()
        })).filter(j => j.term.length > 0);

        // 2. Quiz - Extraction intelligente
        const quizSheet = wb.Sheets["Quiz"];
        const quizData = quizSheet ? XLSX.utils.sheet_to_json(quizSheet) : [];
        
        const parsedQuiz = quizData.map((row: any) => {
          const q = String(row.q || row.Question || row.Énoncé || Object.values(row)[0] || "").trim();
          
          const a: string[] = [];
          // Colonnes candidates pour les choix
          const choiceKeys = Object.keys(row).filter(key => {
            const k = key.toLowerCase();
            return k.startsWith('a') || k.startsWith('opt') || k.startsWith('choix') || k.startsWith('choice') || k.startsWith('r') || k === 'vrai' || k === 'faux';
          }).filter(k => !['index', 'explication', 'justification', 'explanation', 'correct', 'c', 'id'].includes(k.toLowerCase()));

          choiceKeys.forEach(k => {
            const val = row[k];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              a.push(String(val).trim());
            }
          });

          if (a.length === 0) {
            if (row.Vrai !== undefined) a.push("Vrai");
            if (row.Faux !== undefined) a.push("Faux");
          }

          let cVal = row.c || row.correct_idx || row.index_correct || row.correct || "1";
          let c = 0;
          if (typeof cVal === 'string') {
            const firstChar = cVal.trim().toUpperCase();
            if (['A','B','C','D'].includes(firstChar)) c = firstChar.charCodeAt(0) - 65;
            else if (firstChar === "VRAI") c = 0;
            else if (firstChar === "FAUX") c = 1;
            else c = Math.max(0, (parseInt(cVal) || 1) - 1);
          } else {
            c = Math.max(0, (Number(cVal) || 1) - 1);
          }

          const exp = String(row.exp || row.Explication || row.Justification || row.Explanation || "").trim();

          return { q, a, c, exp };
        }).filter(item => item.q.length > 2 && item.a.length > 0);

        setData((prev: any) => ({
          ...prev,
          jargon: parsedJargon.length > 0 ? parsedJargon : prev.jargon,
          quiz: parsedQuiz.length > 0 ? parsedQuiz : prev.quiz
        }));

        toast({ title: "Import réussi", description: `${parsedQuiz.length} questions chargées.` });
      } catch (err) {
        toast({ variant: "destructive", title: "Erreur import" });
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

  const addQuiz = () => setData({...data, quiz: [...data.quiz, { q: '', a: ['Vrai', 'Faux'], c: 0, exp: '' }]});
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
    const jargonWs = XLSX.utils.json_to_sheet([{ term: "Conflit", def: "Désaccord entre deux parties." }]);
    const quizWs = XLSX.utils.json_to_sheet([{ q: "Domaine People ?", a1: "Choix 1", a2: "Choix 2", correct: 1, exp: "Explication" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, jargonWs, "Jargon");
    XLSX.utils.book_append_sheet(wb, quizWs, "Quiz");
    XLSX.writeFile(wb, `modele_domaine_${activeTab}.xlsx`);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm"><Link href="/admin/content-config"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Vision Domaines</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Configurez les 3 piliers du PMP.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportModel} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2"><Download className="mr-2 h-4 w-4" /> Modèle</Button>
          <div className="relative">
            <Button variant="outline" className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 bg-emerald-50 text-emerald-600 border-emerald-100" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import Excel</Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
          </div>
          <Button variant="outline" onClick={handleOpenReset} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 text-destructive border-destructive/20 hover:bg-destructive/5"><Trash2 className="mr-2 h-4 w-4" /> Réinitialiser {activeTab}</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl">
            {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />} Enregistrer
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 h-16 bg-white p-2 rounded-[24px] shadow-lg border-2">
          <TabsTrigger value="people" className="rounded-xl font-black italic uppercase text-xs">People</TabsTrigger>
          <TabsTrigger value="process" className="rounded-xl font-black italic uppercase text-xs">Processus</TabsTrigger>
          <TabsTrigger value="business" className="rounded-xl font-black italic uppercase text-xs">Business</TabsTrigger>
        </TabsList>

        <div className="mt-10 space-y-8">
          <Card className="rounded-[40px] shadow-2xl border-none p-10 bg-white space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Titre affiché</Label>
                <Input value={data.title} onChange={(e) => setData({...data, title: e.target.value})} className="h-14 rounded-xl border-2 font-black italic" />
              </div>
              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Mindset principal (Accroche)</Label>
                <Input value={data.mindset} onChange={(e) => setData({...data, mindset: e.target.value})} className="h-14 rounded-xl border-2 font-black italic text-emerald-600" placeholder="Ex: Leader Serviteur..." />
              </div>
              <div className="md:col-span-2 space-y-3">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Description Focus</Label>
                <Textarea value={data.description} onChange={(e) => setData({...data, description: e.target.value})} className="min-h-[120px] rounded-xl border-2 font-bold italic" />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[40px] shadow-xl border-none p-10 bg-white flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black italic uppercase text-indigo-600 flex items-center gap-3"><BookOpen className="h-6 w-6" /> Jargon Clé</h3>
                <Button variant="outline" size="sm" onClick={addJargon} className="rounded-xl border-2 font-black uppercase text-[10px] italic"><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>
              </div>
              <div className="space-y-4 flex-1">
                {data.jargon?.map((j:any, idx:number) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed relative group">
                    <Button variant="ghost" size="icon" onClick={() => removeJargon(idx)} className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white border-2 text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><Trash2 className="h-4 w-4" /></Button>
                    <div className="space-y-4">
                      <Input placeholder="Terme..." value={j.term} onChange={(e) => updateJargon(idx, 'term', e.target.value)} className="h-10 bg-white rounded-lg font-black italic border-2" />
                      <Textarea placeholder="Définition..." value={j.def} onChange={(e) => updateJargon(idx, 'def', e.target.value)} className="h-20 bg-white rounded-lg font-bold italic border-2" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-[40px] shadow-xl border-none p-10 bg-white flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black italic uppercase text-emerald-600 flex items-center gap-3"><Zap className="h-6 w-6" /> Quiz Rapide</h3>
                <Button variant="outline" size="sm" onClick={addQuiz} className="rounded-xl border-2 font-black uppercase text-[10px] italic"><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>
              </div>
              <div className="space-y-6 flex-1">
                {data.quiz?.map((q:any, idx:number) => (
                  <div key={idx} className="p-6 bg-emerald-50/30 rounded-3xl border-2 border-emerald-100 relative group space-y-4">
                    <Button variant="ghost" size="icon" onClick={() => removeQuiz(idx)} className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white border-2 text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><Trash2 className="h-4 w-4" /></Button>
                    <Input placeholder="Question ?" value={q.q} onChange={(e) => updateQuiz(idx, 'q', e.target.value)} className="h-10 bg-white rounded-lg font-black italic border-2 border-emerald-200" />
                    <div className="grid grid-cols-1 gap-2">
                      {q.a?.map((opt:string, optIdx:number) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <button onClick={() => updateQuiz(idx, 'c', optIdx)} className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center font-black text-[10px]", q.c === optIdx ? "bg-black border-black text-white" : "bg-white border-slate-200 text-slate-300")}>{String.fromCharCode(65 + optIdx)}</button>
                          <Input placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} value={opt} onChange={(e) => updateQuiz(idx, `a.${optIdx}`, e.target.value)} className="h-9 bg-white rounded-lg font-bold italic text-xs border-2 border-emerald-100" />
                        </div>
                      ))}
                    </div>
                    <Textarea placeholder="Justification..." value={q.exp} onChange={(e) => updateQuiz(idx, 'exp', e.target.value)} className="h-20 bg-white rounded-lg font-bold italic text-xs border-2 border-emerald-100" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Tabs>

      <Dialog open={isResetModalOpen} onOpenChange={(val) => !isResetting && setIsResetModalOpen(val)}>
        <DialogContent className="rounded-[40px] p-12 border-8 border-destructive shadow-3xl max-w-xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="bg-destructive p-4 rounded-full shadow-lg"><AlertTriangle className="h-12 w-12 text-white" /></div>
            <DialogTitle className="text-4xl font-black uppercase italic text-destructive tracking-tighter">Réinitialisation</DialogTitle>
            <DialogDescription className="text-lg font-bold text-slate-600 leading-relaxed uppercase italic">Voulez-vous vider le domaine <span className="text-destructive">{activeTab}</span> ?</DialogDescription>
          </DialogHeader>
          <div className="py-10 space-y-8">
            <div className="bg-slate-50 p-8 rounded-3xl border-4 border-dashed text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Code de sécurité</p>
              <p className="text-6xl font-black tracking-widest text-primary tabular-nums">{securityCode}</p>
            </div>
            <div className="space-y-3">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic ml-2">Recopiez le code</Label>
              <Input value={userInputCode} onChange={(e) => setUserInputCode(e.target.value)} maxLength={8} className="h-16 rounded-2xl border-4 font-black text-center text-3xl italic tracking-widest" />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsResetModalOpen(false)} disabled={isResetting}>Annuler</Button>
            <Button variant="destructive" disabled={userInputCode !== securityCode || isResetting} onClick={performReset} className="h-16 rounded-2xl font-black uppercase flex-1 shadow-2xl text-lg italic">
              {isResetting ? <Loader2 className="animate-spin h-6 w-6" /> : <><CheckCircle2 className="mr-2 h-6 w-6" /> CONFIRMER</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
