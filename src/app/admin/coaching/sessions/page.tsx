"use client";

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GraduationCap, Save, Loader2, Video, FileQuestion, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminCoachingSessions() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const sessionsQuery = useMemoFirebase(() => query(collection(db, 'coachingSessions'), orderBy('index', 'asc')), [db]);
  const { data: sessions, isLoading } = useCollection(sessionsQuery);

  const [editSessions, setEditSessions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      setEditSessions(sessions);
    } else if (sessions && sessions.length === 0) {
      const init = Array.from({ length: 6 }, (_, i) => ({
        id: `S${i+1}`,
        index: i + 1,
        title: `Séance ${i+1}`,
        type: i === 0 ? 'MEET' : 'QUIZ',
        meetLink: i === 0 ? '' : null,
        questionStart: i === 0 ? null : i * 35 + 1,
        questionEnd: i === 0 ? null : (i + 1) * 35,
        isPublished: false
      }));
      setEditSessions(init);
    }
  }, [sessions]);

  const handleSave = async (id: string) => {
    const s = editSessions.find(x => x.id === id);
    if (!s) return;
    
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'coachingSessions', id), {
        ...s,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Session mise à jour", description: `Les modifications pour ${s.title} ont été enregistrées.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur sauvegarde" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/admin/coaching"><ChevronLeft /></Link></Button>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Contenu des Sessions</h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Configurez les liens Meet et les plages de quiz pour S1..S6.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {editSessions.map((s) => (
          <Card key={s.id} className="rounded-3xl border-2 border-slate-100 shadow-lg overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", s.type === 'MEET' ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600")}>
                  {s.type === 'MEET' ? <Video className="h-5 w-5" /> : <FileQuestion className="h-5 w-5" />}
                </div>
                <CardTitle className="text-xl font-black italic uppercase tracking-tight">{s.title}</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs font-black uppercase italic text-slate-400">Publié</Label>
                <Switch 
                  checked={s.isPublished} 
                  onCheckedChange={(val) => setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, isPublished: val} : x))}
                />
              </div>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {s.type === 'MEET' ? (
                <div className="md:col-span-2 space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Lien Google Meet</Label>
                  <Input 
                    value={s.meetLink || ''} 
                    onChange={(e) => setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, meetLink: e.target.value} : x))}
                    placeholder="https://meet.google.com/..."
                    className="font-bold italic h-12 border-2 rounded-xl"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Index Début (Questions)</Label>
                    <Input 
                      type="number"
                      value={s.questionStart || ''} 
                      onChange={(e) => setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, questionStart: parseInt(e.target.value)} : x))}
                      className="font-black italic h-12 border-2 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-slate-400">Index Fin (Questions)</Label>
                    <Input 
                      type="number"
                      value={s.questionEnd || ''} 
                      onChange={(e) => setEditSessions(prev => prev.map(x => x.id === s.id ? {...x, questionEnd: parseInt(e.target.value)} : x))}
                      className="font-black italic h-12 border-2 rounded-xl"
                    />
                  </div>
                </>
              )}
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={() => handleSave(s.id)} disabled={isSaving} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest bg-primary text-white shadow-md">
                  {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />} Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
