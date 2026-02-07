
"use client";

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, getDoc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserPlus, ChevronLeft, Users, Clock, Key, Trash2, BarChart, TrendingUp, Target, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function UsersListPage() {
  const { user: currentUser, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [passwordChangeUser, setPasswordChangeUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (currentUser) {
        const adminDoc = await getDoc(doc(db, 'roles_admin', currentUser.uid));
        if (!adminDoc.exists()) router.push('/dashboard');
        else setIsAdmin(true);
      } else if (!isUserLoading) router.push('/');
    }
    checkAdmin();
  }, [currentUser, isUserLoading, db, router]);

  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: users, isLoading } = useCollection(usersQuery);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus, updatedAt: Timestamp.now() });
      toast({ title: "Statut mis à jour", description: `L'utilisateur est désormais ${newStatus}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordChangeUser || newPassword.length < 6) {
      toast({ variant: "destructive", title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }
    setIsChangingPassword(true);
    try {
      await updateDoc(doc(db, 'users', passwordChangeUser.id), { password: newPassword });
      toast({ title: "Mot de passe mis à jour" });
      setPasswordChangeUser(null);
      setNewPassword('');
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      toast({ title: "Utilisateur supprimé" });
      setUserToDelete(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0M';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}H ${m}M` : `${m}M`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).toUpperCase();
  };

  if (isUserLoading || isAdmin === null || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center justify-between bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl hover:bg-slate-50 border shadow-sm">
            <Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <h1 className="text-4xl font-black flex items-center gap-4 text-primary italic uppercase tracking-tighter">
              <Users className="h-10 w-10 text-accent" /> Suivi Global Participants
            </h1>
            <p className="text-slate-500 font-medium mt-1">Surveillez les performances et l'activité en temps réel.</p>
          </div>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 h-16 px-10 rounded-2xl font-black uppercase tracking-widest shadow-xl">
          <Link href="/admin/users/new">
            <UserPlus className="mr-3 h-6 w-6" /> Créer Participant
          </Link>
        </Button>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden bg-white rounded-[40px]">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-2">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Participant</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs"><BarChart className="h-4 w-4 inline mr-2 text-primary" /> Score Moyen</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs"><Target className="h-4 w-4 inline mr-2 text-primary" /> Simulations</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs"><TrendingUp className="h-4 w-4 inline mr-2 text-primary" /> Progression</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs"><Clock className="h-4 w-4 inline mr-2 text-primary" /> Temps Étude</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs">Première Connexion</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs">Dernière Connexion</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.sort((a,b) => (b.lastLoginAt?.seconds || 0) - (a.lastLoginAt?.seconds || 0)).map((u) => (
                <TableRow key={u.id} className="h-24 hover:bg-slate-50/80 transition-colors border-b last:border-0 group">
                  <TableCell className="px-10">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-lg shadow-inner group-hover:scale-110 transition-transform">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div className="space-y-1">
                        <div className="font-black text-lg text-slate-800 leading-none">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-slate-400 font-bold flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-2xl font-black ${u.averageScore >= 80 ? 'text-emerald-500' : u.averageScore >= 60 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {u.averageScore || 0}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="px-5 py-2 text-sm font-black rounded-xl border-2">
                      {u.simulationsCount || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner border">
                        <div 
                          className="bg-primary h-full transition-all duration-1000" 
                          style={{ width: `${Math.min(100, Math.round((u.simulationsCount || 0) / 5 * 100))}%` }} 
                        />
                      </div>
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                        {Math.min(100, Math.round((u.simulationsCount || 0) / 5 * 100))}% PRÊT
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-black text-slate-600">{formatTime(u.totalTimeSpent)}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-500">{formatDate(u.firstLoginAt)}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-500">{formatDate(u.lastLoginAt)}</TableCell>
                  <TableCell className="text-right px-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl hover:bg-slate-200"><Users className="h-5 w-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl">
                        <DropdownMenuItem className="h-12 rounded-xl font-bold px-4" onClick={() => toggleStatus(u.id, u.status || 'active')}>
                          {u.status === 'disabled' ? '✅ Réactiver le compte' : '🚫 Désactiver le compte'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-12 rounded-xl font-bold px-4" onClick={() => { setPasswordChangeUser(u); setNewPassword(''); }}>
                          <Key className="mr-3 h-5 w-5" /> Gérer mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem className="h-12 rounded-xl font-bold px-4 text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setUserToDelete(u)}>
                          <Trash2 className="mr-3 h-5 w-5" /> Supprimer définitivement
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!passwordChangeUser} onOpenChange={() => setPasswordChangeUser(null)}>
        <DialogContent className="rounded-[32px] max-w-md p-10">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Gérer les accès</DialogTitle></DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="font-bold text-muted-foreground uppercase text-xs tracking-widest">Mot de passe actuel (Visible par l'admin)</Label>
              <div className="p-6 bg-primary/5 rounded-2xl text-center font-mono text-2xl font-black border-2 border-dashed border-primary/20 text-primary">
                {passwordChangeUser?.password || '---'}
              </div>
            </div>
            <div className="space-y-3">
              <Label className="font-bold uppercase text-xs tracking-widest">Nouveau mot de passe</Label>
              <Input 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="6 caractères minimum" 
                className="h-14 rounded-2xl font-bold text-lg"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" className="h-14 rounded-2xl font-bold flex-1" onClick={() => setPasswordChangeUser(null)}>Annuler</Button>
            <Button className="h-14 rounded-2xl font-black bg-primary flex-1 shadow-lg" onClick={handleUpdatePassword} disabled={isChangingPassword}>
              {isChangingPassword ? <Loader2 className="animate-spin h-5 w-5" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent className="rounded-[32px] p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive">Confirmer la suppression ?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-medium pt-4">
              Toutes les données de <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> seront définitivement effacées du système. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="h-14 rounded-2xl font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="h-14 rounded-2xl font-black bg-destructive hover:bg-destructive/90 shadow-xl">
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
