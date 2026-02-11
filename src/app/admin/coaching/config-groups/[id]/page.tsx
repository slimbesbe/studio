
"use client";

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Loader2, ChevronLeft, ShieldCheck, Mail, Lock, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ManageGroupUsers() {
  const params = useParams();
  const groupId = params.id as string;
  const db = useFirestore();
  const { toast } = useToast();

  const groupRef = useMemoFirebase(() => doc(db, 'coachingGroups', groupId), [db, groupId]);
  const { data: group, isLoading: isGroupLoading } = useDoc(groupRef);

  const usersQuery = useMemoFirebase(() => {
    if (!groupId) return null;
    return query(collection(db, 'users'), where('groupId', '==', groupId));
  }, [db, groupId]);
  const { data: participants, isLoading: isUsersLoading } = useCollection(usersQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({ variant: "destructive", title: "Erreur", description: "Le mot de passe doit faire au moins 6 caractères." });
      return;
    }

    setIsSubmitting(true);
    
    const secondaryApp = initializeApp(firebaseConfig, "secondary_admin");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const newUid = userCredential.user.uid;

      await setDoc(doc(db, 'users', newUid), {
        id: newUid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'user',
        accessType: 'coaching_simulation',
        groupId: groupId,
        status: 'active',
        password: formData.password,
        createdAt: serverTimestamp(),
        simulationsCount: 0,
        averageScore: 0,
        totalTimeSpent: 0
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ title: "Participant ajouté", description: `${formData.firstName} a rejoint le groupe.` });
      setFormData({ firstName: '', lastName: '', email: '', password: '' });
      setIsModalOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de créer le compte." });
      await deleteApp(secondaryApp);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isGroupLoading || isUsersLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/admin/coaching/config-groups"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Groupe : {group?.name}</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Gestion des participants de la cohorte.</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl scale-105 transition-transform hover:bg-emerald-700">
          <UserPlus className="mr-2 h-6 w-6" /> Ajouter Participant
        </Button>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Participant</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs">Email</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Mot de Passe</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants?.map((u) => (
                <TableRow key={u.id} className="h-20 hover:bg-slate-50 transition-all border-b last:border-0">
                  <TableCell className="px-10">
                    <span className="font-black text-lg italic uppercase tracking-tight text-slate-800">{u.firstName} {u.lastName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-bold text-slate-500">{u.email}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <code className="bg-slate-100 px-3 py-1 rounded-lg font-mono text-sm font-bold text-primary">{u.password || '******'}</code>
                  </TableCell>
                  <TableCell className="text-right px-10 text-xs font-bold text-slate-400 italic">
                    {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {(!participants || participants.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-4">
                      <User className="h-16 w-16 opacity-20" />
                      <p className="font-black uppercase italic tracking-widest">Aucun participant dans ce groupe</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-[40px] p-12 border-4 shadow-3xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-emerald-600">Nouveau Participant</DialogTitle>
            <DialogDescription className="font-bold text-slate-500 italic mt-2 uppercase text-xs tracking-widest">Créez un compte d'accès pour cet utilisateur.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="py-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Prénom</Label>
                <div className="relative">
                  <User className="absolute left-4 top-4 h-5 w-5 text-slate-300" />
                  <Input 
                    required 
                    value={formData.firstName} 
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="h-14 rounded-xl font-bold italic pl-12 border-2" 
                    placeholder="Prénom..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Nom</Label>
                <Input 
                  required 
                  value={formData.lastName} 
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="h-14 rounded-xl font-bold italic border-2" 
                  placeholder="Nom..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Email Professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-300" />
                <Input 
                  type="email"
                  required 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="h-14 rounded-xl font-bold italic pl-12 border-2" 
                  placeholder="email@pmp.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Mot de Passe Temporaire</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-300" />
                <Input 
                  required 
                  min={6}
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="h-14 rounded-xl font-black italic pl-12 border-2" 
                  placeholder="6 caractères min."
                />
              </div>
            </div>

            <DialogFooter className="gap-4 pt-6">
              <Button type="button" variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting} className="h-16 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 flex-1 shadow-2xl uppercase">
                {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <><ShieldCheck className="mr-2 h-6 w-6" /> Activer l'accès</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
