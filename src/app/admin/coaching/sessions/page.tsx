
"use client";

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Save, 
  Loader2, 
  Video, 
  FileQuestion, 
  ChevronLeft, 
  Users, 
  Upload, 
  Eye, 
  PlusCircle,
  ShieldCheck,
  Sparkles,
  RefreshCw 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CoachingImportModal } from '@/components/admin/CoachingImportModal';
import { CoachingGenerateModal } from '@/components/admin/CoachingGenerateModal';

export default function AdminCoachingSessions() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const sessionsQuery = useMemoFirebase(() => query(collection(db, 'coachingSessions'), orderBy('index', 'asc')), [db]);
  const { data: sessions, isLoading } = useCollection(sessionsQuery);

  const groupsQuery = useMemoFirebase(() => query(collection(db, 'coachingGroups')), [db]);
  const { data: groups } = useCollection(groupsQuery);

  const [editSessions, setEditSessions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [importSession, setImportSession] = useState<any | null>(null);
  const [generateSession, setGenerateSession] = useState<any | null>(null);

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      setEditSessions(sessions);
    } else if (sessions && sessions.length === 0) {
      setEditSessions(getDefaultSessions());
    }
  }, [sessions]);

  const getDefaultSessions = () => [
    { id: 'S1', index: 1, title: 'Séance 1', type: 'MEET', meetLinks: {}, isPublished: false },
    { id: 'S2', index: 2, title: 'Séance 2', type: 'QUIZ', questionStart: 1, questionEnd: 35, isPublished: false },
    { id: 'S3', index: 3, title: 'Séance 3', type: 'QUIZ', questionStart: 36, questionEnd: 70, isPublished: false },
    { id: 'S4', index: 4, title: 'Séance 4', type: 'QUIZ', questionStart: 71, questionEnd: 105, isPublished: false },
    { id: 'S5', index: 5, title: 'Séance 5', type: 'QUIZ', questionStart: 106, questionEnd: 140, isPublished: false },
    { id: 'S6', index: 6, title: 'Séance 6', type: 'QUIZ', questionStart: 141, questionEnd: 175, isPublished: false },
  ];

  const handleInitializeAll = async () => {
    setIsInitializing(true);
    try {
      const batch = writeBatch(db);
      const init = getDefaultSessions();
      init.forEach(s => {
        batch.set(doc(db, 'coachingSessions', s.id), { ...s, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      toast({ title: "Programme initialisé", description: "Les 6 séances ont été créées avec leurs plages de 35 questions." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur d'initialisation" });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleResetRanges = () => {
    if (!confirm("Voulez-vous réinitialiser toutes les plages de questions aux valeurs standards (35 Q par séance) ?")) return;
    const defaults = getDefaultSessions();
    setEditSessions(prev => prev.map(s => {
      const d = defaults.find(x => x.id === s.id);
      if (d && d.type === 'QUIZ') {
        return { ...s, questionStart: d.questionStart, questionEnd: d.questionEnd };
      }
      return s;
    }));
    toast({ title: "Plages réinitialisées localement", description: "Cliquez sur Sauver pour appliquer." });
  };

  const handleSave = async (id: string) => {
    const s = editSessions.find(x => x.id === id);
    if (!s) return;
    
    setIsSaving(id);
    try {
      await setDoc(doc(db, 'coachingSessions', id), {
        ...s,
        questionStart: s.questionStart ? parseInt(String(s.questionStart)) : null,
        questionEnd: s.questionEnd ? parseInt(String(s.questionEnd)) : null,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Session enregistrée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur sauvegarde" });
    } finally {
      setIsSaving(null);
    }
  };

  const updateMeetLink = (sessionId: string, groupId: string, link: string) => {
    setEditSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const meetLinks = { ...(s.meetLinks || {}), [groupId]: link };
        return { ...s, meetLinks };
      }
      return s;
    }));
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2"><Link href="/admin/coaching"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Configuration Sessions</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Pilotez vos 5 micro-simulations de 35 questions (S2-S6).</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleResetRanges} className="h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-xs italic border-2 hover:bg-amber-50">
            <RefreshCw className="mr-2 h-4 w-4" /> Reset Plages
          </Button>
          {(!sessions || sessions.length === 0) && (
            <Button onClick={handleInitializeAll} disabled={isInitializing} className="bg-emerald-600 h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl scale-105 transition-transform hover:bg-emerald-700">
              {isInitializing ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />} Initialiser S1-S6
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8">
        {editSessions.map((s) => (
          <Card key={s.id} className="rounded-[40px] border-none shadow-xl overflow-hidden bg-white group hover:shadow-2xl transition-all">
            <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("h-14 w-14 rounded-3xl flex items-center justify-center shadow-inner", s.type === 'MEET' ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600")}>
                  {s.type === 'MEET' ? <Video className="h-7 w-7" /> : <FileQuestion className="h-7 w-7" />}
                </div>
                <div>
                  <CardTitle className="text-2xl font-black italic uppercase tracking-tight">{s.title}</CardTitle>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{s.type === 'MEET' ? 'Visioconférence par groupe' : 'Simulation 35 Questions'}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Label className="text-[10px] font-black uppercase italic text-slate-400">Visibilité</Label>
                  <Switch 
                    checked={s.isPublished} 
                    onCheckedChange={(val) => setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, isPublished: val} : x))}
                  />
                </div>
                <Button onClick={() => handleSave(s.id)} disabled={isSaving === s.id} size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 px-8 font-black uppercase tracking-widest shadow-lg">
                  {isSaving === s.id ? <Loader2 className="animate-spin h-5 w-5" /> : <><Save className="mr-2 h-5 w-5" /> Sauver</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {s.type === 'MEET' ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-xs italic">
                    <Users className="h-4 w-4" /> Liens Google Meet par Groupe
                  </div>
                  <div className="grid gap-4">
                    {groups?.map(g => (
                      <div key={g.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-slate-50 rounded-2xl border-2 border-dashed">
                        <span className="font-black italic uppercase text-sm text-slate-700">{g.name}</span>
                        <div className="md:col-span-2">
                          <Input 
                            value={s.meetLinks?.[g.id] || ''} 
                            onChange={(e) => updateMeetLink(s.id, g.id, e.target.value)}
                            placeholder="https://meet.google.com/..."
                            className="font-bold italic h-12 bg-white rounded-xl border-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 font-black uppercase text-xs italic">
                      <RefreshCw className="h-4 w-4" /> Plage de la Simulation (35 Q)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-indigo-50/30 p-8 rounded-[32px] border-4 border-dashed border-indigo-100">
                      <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Index Début (Q#)</Label>
                        <Input 
                          type="number"
                          value={s.questionStart ?? ''} 
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, questionStart: val} : x));
                          }}
                          className="font-black italic h-16 border-2 rounded-2xl text-2xl bg-white text-center"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Index Fin (Q#)</Label>
                        <Input 
                          type="number"
                          value={s.questionEnd ?? ''} 
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, questionEnd: val} : x));
                          }}
                          className="font-black italic h-16 border-2 rounded-2xl text-2xl bg-white text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Button onClick={() => setGenerateSession(s)} className="h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 font-black uppercase tracking-widest text-sm italic shadow-xl scale-105 transition-transform">
                      <Sparkles className="mr-2 h-6 w-6" /> Générer via IA
                    </Button>
                    <Button onClick={() => setImportSession(s)} variant="outline" className="h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-sm italic hover:bg-emerald-50">
                      <Upload className="mr-2 h-6 w-6" /> Importer Simulation
                    </Button>
                    <Button asChild variant="outline" className="h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-sm italic hover:bg-indigo-50">
                      <Link href={`/admin/coaching/sessions/${s.id}/questions`}>
                        <Eye className="mr-2 h-6 w-6" /> Visualiser Questions
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <CoachingImportModal 
        isOpen={!!importSession} 
        onClose={() => setImportSession(null)} 
        session={importSession}
      />

      <CoachingGenerateModal 
        isOpen={!!generateSession} 
        onClose={() => setGenerateSession(null)} 
        session={generateSession}
      />
    </div>
  );
}
