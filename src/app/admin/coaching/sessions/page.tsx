
"use client";

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Video, FileQuestion, ChevronLeft, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminCoachingSessions() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const sessionsQuery = useMemoFirebase(() => query(collection(db, 'coachingSessions'), orderBy('index', 'asc')), [db]);
  const { data: sessions, isLoading } = useCollection(sessionsQuery);

  const groupsQuery = useMemoFirebase(() => query(collection(db, 'coachingGroups')), [db]);
  const { data: groups } = useCollection(groupsQuery);

  const [editSessions, setEditSessions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      setEditSessions(sessions);
    } else if (sessions && sessions.length === 0) {
      const init = [
        { id: 'S1', index: 1, title: 'Séance 1', type: 'MEET', meetLinks: {}, isPublished: false },
        { id: 'S2', index: 2, title: 'Séance 2', type: 'QUIZ', questionStart: 1, questionEnd: 35, isPublished: false },
        { id: 'S3', index: 3, title: 'Séance 3', type: 'QUIZ', questionStart: 36, questionEnd: 70, isPublished: false },
        { id: 'S4', index: 4, title: 'Séance 4', type: 'QUIZ', questionStart: 71, questionEnd: 105, isPublished: false },
        { id: 'S5', index: 5, title: 'Séance 5', type: 'QUIZ', questionStart: 106, questionEnd: 140, isPublished: false },
        { id: 'S6', index: 6, title: 'Séance 6', type: 'QUIZ', questionStart: 141, questionEnd: 175, isPublished: false },
      ];
      setEditSessions(init);
    }
  }, [sessions]);

  const handleSave = async (id: string) => {
    const s = editSessions.find(x => x.id === id);
    if (!s) return;
    
    setIsSaving(id);
    try {
      await setDoc(doc(db, 'coachingSessions', id), {
        ...s,
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/admin/coaching"><ChevronLeft /></Link></Button>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Configuration Sessions</h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Liens Meet personnalisés et plages de quiz fixes.</p>
        </div>
      </div>

      <div className="grid gap-8">
        {editSessions.map((s) => (
          <Card key={s.id} className="rounded-[40px] border-none shadow-xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner", s.type === 'MEET' ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600")}>
                  {s.type === 'MEET' ? <Video className="h-6 w-6" /> : <FileQuestion className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle className="text-2xl font-black italic uppercase tracking-tight">{s.title}</CardTitle>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{s.type === 'MEET' ? 'Visioconférence' : 'Simulation Quiz'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-[10px] font-black uppercase italic text-slate-400">Publié</Label>
                <Switch 
                  checked={s.isPublished} 
                  onCheckedChange={(val) => setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, isPublished: val} : x))}
                />
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {s.type === 'MEET' ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-xs italic">
                    <Users className="h-4 w-4" /> Configuration des liens par groupe
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
                    {(!groups || groups.length === 0) && (
                      <p className="text-center py-4 text-slate-400 font-bold italic text-xs uppercase">Créez d'abord des groupes dans la section "Config Groupes".</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Index Début (Banque Questions)</Label>
                    <Input 
                      type="number"
                      value={s.questionStart || ''} 
                      onChange={(e) => setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, questionStart: parseInt(e.target.value)} : x))}
                      className="font-black italic h-14 border-2 rounded-2xl text-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Index Fin (Banque Questions)</Label>
                    <Input 
                      type="number"
                      value={s.questionEnd || ''} 
                      onChange={(e) => setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, questionEnd: parseInt(e.target.value)} : x))}
                      className="font-black italic h-14 border-2 rounded-2xl text-xl"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave(s.id)} disabled={isSaving === s.id} className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest bg-primary text-white shadow-xl scale-105 transition-transform">
                  {isSaving === s.id ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />} Enregistrer S{s.index}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
