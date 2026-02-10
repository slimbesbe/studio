
"use client";

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Users, ArrowRight, Loader2, ChevronLeft, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminCoachingGroups() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const groupsQuery = useMemoFirebase(() => query(collection(db, 'coachingGroups'), orderBy('createdAt', 'desc')), [db]);
  const { data: groups, isLoading: isGroupsLoading } = useCollection(groupsQuery);

  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: allUsers } = useCollection(usersQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setIsSubmitting(true);
    try {
      const gRef = doc(collection(db, 'coachingGroups'));
      await setDoc(gRef, {
        id: gRef.id,
        name: newGroupName,
        isActive: true,
        createdAt: serverTimestamp()
      });
      toast({ title: "Groupe créé" });
      setNewGroupName('');
      setIsModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur création" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getParticipantsCount = (groupId: string) => {
    return allUsers?.filter(u => u.groupId === groupId).length || 0;
  };

  if (isGroupsLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/admin/coaching"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Cohortes Coaching</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Suivez les performances de vos différents groupes d'étude.</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-accent h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl scale-105 transition-transform">
          <Plus className="mr-2 h-6 w-6" /> Nouveau Groupe
        </Button>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Nom du groupe</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Participants</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Statut</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Créé le</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups?.map((g) => (
                <TableRow key={g.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                  <TableCell className="px-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Users className="h-6 w-6" />
                      </div>
                      <span className="font-black text-xl italic uppercase tracking-tight text-slate-800">{g.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-black text-slate-500 text-lg">
                    {getParticipantsCount(g.id)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <div className={cn("px-4 py-1.5 rounded-full font-black uppercase italic text-[10px] tracking-widest", g.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                        {g.isActive ? "Actif" : "Archivé"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs font-bold text-slate-400 italic">
                    {g.createdAt?.toDate ? g.createdAt.toDate().toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <Button variant="ghost" asChild className="h-12 w-12 rounded-2xl hover:bg-slate-200 border-2">
                      <Link href={`/admin/coaching/groups/${g.id}`}><ArrowRight className="h-6 w-6" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!groups || groups.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-4">
                      <Users className="h-16 w-16 opacity-20" />
                      <p className="font-black uppercase italic tracking-widest">Aucun groupe créé</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-[40px] p-12 border-4 shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-primary">Nouveau Groupe</DialogTitle>
            <DialogDescription className="font-bold text-slate-500 italic mt-2 uppercase text-xs tracking-widest">Identifiez votre cohorte pour les statistiques.</DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-4">
            <Label className="font-black uppercase text-xs text-slate-400">Nom de la cohorte (ex: Session Octobre 2023)</Label>
            <Input 
              value={newGroupName} 
              onChange={(e) => setNewGroupName(e.target.value)} 
              className="h-16 rounded-2xl font-black text-xl italic border-2" 
              placeholder="Entrez le nom..."
            />
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateGroup} disabled={isSubmitting || !newGroupName.trim()} className="h-16 rounded-2xl font-black bg-primary flex-1 shadow-2xl uppercase">
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <><ShieldCheck className="mr-2 h-6 w-6" /> Créer</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
