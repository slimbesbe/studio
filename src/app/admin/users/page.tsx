
"use client";

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, getDoc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, 
  UserPlus, 
  ChevronLeft, 
  Users, 
  ShieldCheck, 
  Clock, 
  Key, 
  Trash2, 
  BarChart,
  TrendingUp,
  Target
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
      await updateDoc(doc(db, 'users', userId), { 
        status: newStatus,
        updatedAt: Timestamp.now()
      });
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
      toast({ title: "Mise à jour réussie" });
      setPasswordChangeUser(null);
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
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (isUserLoading || isAdmin === null || isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/admin/dashboard"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-accent" /> Suivi Global en Temps Réel
            </h1>
            <p className="text-muted-foreground">Performances et activité des participants en direct</p>
          </div>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90">
          <Link href="/admin/users/new"><UserPlus className="mr-2 h-4 w-4" /> Créer un Utilisateur</Link>
        </Button>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead className="text-center"><BarChart className="h-4 w-4 inline mr-1" /> Moyenne</TableHead>
                <TableHead className="text-center"><Target className="h-4 w-4 inline mr-1" /> Simulations</TableHead>
                <TableHead className="text-center"><TrendingUp className="h-4 w-4 inline mr-1" /> Progression</TableHead>
                <TableHead className="text-center"><Clock className="h-4 w-4 inline mr-1" /> Temps Total</TableHead>
                <TableHead>Première Connexion</TableHead>
                <TableHead>Dernière Connexion</TableHead>
                <TableHead className="text-right px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.sort((a,b) => (b.lastLoginAt?.seconds || 0) - (a.lastLoginAt?.seconds || 0)).map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-sm truncate">{u.firstName} {u.lastName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-black ${u.averageScore >= 80 ? 'text-emerald-600' : u.averageScore >= 65 ? 'text-blue-600' : 'text-slate-500'}`}>
                      {u.averageScore || 0}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">{u.simulationsCount || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full transition-all" style={{ width: `${Math.min(100, Math.round((u.simulationsCount || 0) / 5 * 100))}%` }} />
                      </div>
                      <span className="text-[10px] font-bold">{Math.min(100, Math.round((u.simulationsCount || 0) / 5 * 100))}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs font-medium">
                    {formatTime(u.totalTimeSpent)}
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {formatDate(u.firstLoginAt)}
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {formatDate(u.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><Users className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => toggleStatus(u.id, u.status || 'active')}>
                          {u.status === 'disabled' ? 'Réactiver le compte' : 'Désactiver le compte'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPasswordChangeUser(u)}>
                          <Key className="mr-2 h-4 w-4" /> Voir/Modifier mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(u)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer définitivement
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
        <DialogContent>
          <DialogHeader><DialogTitle>Gérer le mot de passe</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/30 rounded-lg text-center font-mono text-xl font-bold border-2 border-dashed border-primary/20">
               {passwordChangeUser?.password || '---'}
            </div>
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6 caractères minimum" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordChangeUser(null)}>Annuler</Button>
            <Button onClick={handleUpdatePassword} disabled={isChangingPassword}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible pour {userToDelete?.firstName} {userToDelete?.lastName}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
