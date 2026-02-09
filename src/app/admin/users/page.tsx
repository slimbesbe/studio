
"use client";

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, getDoc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserPlus, ChevronLeft, Users, User, Clock, Key, Trash2, BarChart, TrendingUp, Target, Mail, Pencil, CalendarDays } from 'lucide-react';
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
      toast({ title: "Statut mis à jour" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordChangeUser || newPassword.length < 6) {
      toast({ variant: "destructive", title: "Erreur", description: "6 caractères min." });
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
    const s = seconds || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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

  const formatShortDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
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
      <div className="flex items-center justify-between bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" asChild className="h-16 w-16 rounded-3xl hover:bg-slate-50 border-2 shadow-sm">
            <Link href="/admin/dashboard"><ChevronLeft className="h-8 w-8" /></Link>
          </Button>
          <div>
            <h1 className="text-4xl font-black flex items-center gap-4 text-primary italic uppercase tracking-tighter">
              <Users className="h-12 w-12 text-accent" /> Suivi Global Participants
            </h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm">Gestion des accès et analyse des performances en temps réel.</p>
          </div>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 h-16 px-12 rounded-[24px] font-black uppercase tracking-widest shadow-2xl scale-105">
          <Link href="/admin/users/new">
            <UserPlus className="mr-3 h-7 w-7" /> Créer Participant
          </Link>
        </Button>
      </div>

      <Card className="shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border-none overflow-hidden bg-white rounded-[60px]">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-24 border-b-4">
                <TableHead className="px-12 font-black uppercase tracking-widest text-xs">
                  <User className="h-4 w-4 inline mr-2" /> Participant
                </TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs"><BarChart className="h-4 w-4 inline mr-2" /> Score Moyen</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs"><Target className="h-4 w-4 inline mr-2" /> Simulations</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs"><Clock className="h-4 w-4 inline mr-2" /> Temps Étude</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs"><CalendarDays className="h-4 w-4 inline mr-2" /> Inscrit le</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs">Dernière Connexion</TableHead>
                <TableHead className="text-right px-12 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.sort((a,b) => (b.lastLoginAt?.seconds || 0) - (a.lastLoginAt?.seconds || 0)).map((u) => (
                <TableRow key={u.id} className="h-28 hover:bg-slate-50/80 transition-all border-b last:border-0 group">
                  <TableCell className="px-12">
                    <div className="flex items-center gap-5">
                      <div className="h-16 w-16 rounded-[22px] bg-primary/10 flex items-center justify-center font-black text-primary text-xl shadow-inner group-hover:rotate-6 transition-transform">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div className="space-y-1">
                        <div className="font-black text-xl text-slate-800 leading-none">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-slate-400 font-black flex items-center gap-1 uppercase italic tracking-tighter"><Mail className="h-3 w-3" /> {u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-3xl font-black italic tracking-tighter ${u.averageScore >= 80 ? 'text-emerald-500' : u.averageScore >= 60 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {u.averageScore || 0}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="px-6 py-3 text-lg font-black rounded-2xl border-2 shadow-sm italic">
                      {u.simulationsCount || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-black text-slate-600 italic text-lg">{formatTime(u.totalTimeSpent)}</TableCell>
                  <TableCell className="text-xs font-black text-primary italic uppercase tracking-tighter">
                    {formatShortDate(u.firstLoginAt || u.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs font-black text-slate-500 italic uppercase tracking-tighter">{formatDate(u.lastLoginAt)}</TableCell>
                  <TableCell className="text-right px-12">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl hover:bg-slate-200 border-2"><Users className="h-6 w-6" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72 p-3 rounded-[28px] shadow-2xl border-4">
                        <DropdownMenuItem asChild className="h-14 rounded-2xl font-black uppercase tracking-widest px-6 italic">
                          <Link href={`/admin/users/${u.id}/edit`}>
                            <Pencil className="mr-3 h-6 w-6" /> Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-14 rounded-2xl font-black uppercase tracking-widest px-6 italic" onClick={() => toggleStatus(u.id, u.status || 'active')}>
                          {u.status === 'disabled' ? '✅ Réactiver' : '🚫 Désactiver'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-14 rounded-2xl font-black uppercase tracking-widest px-6 italic" onClick={() => { setPasswordChangeUser(u); setNewPassword(''); }}>
                          <Key className="mr-3 h-6 w-6" /> Accès
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-3 border-2" />
                        <DropdownMenuItem className="h-14 rounded-2xl font-black uppercase tracking-widest px-6 text-destructive focus:bg-destructive/10 focus:text-destructive italic" onClick={() => setUserToDelete(u)}>
                          <Trash2 className="mr-3 h-6 w-6" /> Supprimer
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

      {/* Password Dialog */}
      <Dialog open={!!passwordChangeUser} onOpenChange={() => setPasswordChangeUser(null)}>
        <DialogContent className="rounded-[40px] max-w-lg p-12 border-4 shadow-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-primary">Gestion des accès</DialogTitle></DialogHeader>
          <div className="space-y-8 py-8">
            <div className="space-y-3">
              <Label className="font-black text-muted-foreground uppercase text-xs tracking-widest italic">Mot de passe actuel</Label>
              <div className="p-8 bg-primary/5 rounded-[32px] text-center font-mono text-3xl font-black border-4 border-dashed border-primary/20 text-primary shadow-inner">
                {passwordChangeUser?.password || '---'}
              </div>
            </div>
            <div className="space-y-4">
              <Label className="font-black uppercase text-xs tracking-widest italic">Nouveau mot de passe</Label>
              <Input 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="6 caractères min." 
                className="h-16 rounded-[24px] font-black text-xl border-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase tracking-widest flex-1 border-4" onClick={() => setPasswordChangeUser(null)}>Annuler</Button>
            <Button className="h-16 rounded-2xl font-black bg-primary flex-1 shadow-2xl uppercase tracking-widest" onClick={handleUpdatePassword} disabled={isChangingPassword}>
              {isChangingPassword ? <Loader2 className="animate-spin h-6 w-6" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent className="rounded-[40px] p-12 border-4 shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black uppercase text-destructive italic tracking-tighter">Suppression Définitive ?</AlertDialogTitle>
            <AlertDialogDescription className="text-xl font-bold pt-6 text-slate-600 leading-relaxed uppercase tracking-tight">
              Toutes les données de <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> seront effacées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-6">
            <AlertDialogCancel className="h-16 rounded-2xl font-black uppercase tracking-widest border-4">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="h-16 rounded-2xl font-black bg-destructive hover:bg-destructive/90 shadow-2xl uppercase tracking-widest">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
