
"use client";

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { collection, doc, getDoc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserPlus, ChevronLeft, Users, ShieldCheck, User, MoreHorizontal, Clock, AlertTriangle, Key, Trash2, Eye, EyeOff, Lock, Mail, TrendingUp, BarChart } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

export default function UsersListPage() {
  const { user: currentUser, isUserLoading } = useUser();
  const auth = useAuth();
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

  const handleSendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Email envoyé" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordChangeUser || newPassword.length < 6) {
      toast({ variant: "destructive", title: "Erreur", description: "Le mot de passe doit faire au moins 6 caractères." });
      return;
    }

    setIsChangingPassword(true);
    try {
      await updateDoc(doc(db, 'users', passwordChangeUser.id), {
        password: newPassword,
        updatedAt: Timestamp.now()
      });
      toast({ title: "Mot de passe record mis à jour" });
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
      if (userToDelete.role === 'admin' || userToDelete.role === 'super_admin') {
        await deleteDoc(doc(db, 'roles_admin', userToDelete.id));
      }
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
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (user: any) => {
    const expiresAt = user.expiresAt?.seconds ? new Date(user.expiresAt.seconds * 1000) : null;
    const isExpired = expiresAt && expiresAt < new Date();
    if (user.status === 'disabled') return <Badge variant="destructive">Désactivé</Badge>;
    if (isExpired) return <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700"><Clock className="mr-1 h-3 w-3" /> Expiré</Badge>;
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">Actif</Badge>;
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
              <Users className="h-8 w-8 text-accent" /> Gestion Globale Utilisateurs
            </h1>
            <p className="text-muted-foreground">{users?.length || 0} participants enregistrés</p>
          </div>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90">
          <Link href="/admin/users/new"><UserPlus className="mr-2 h-4 w-4" /> Créer un Utilisateur</Link>
        </Button>
      </div>

      <Card className="shadow-lg border-none overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead className="text-center"><BarChart className="h-4 w-4 inline mr-1" /> Moyenne</TableHead>
                <TableHead className="text-center"><TrendingUp className="h-4 w-4 inline mr-1" /> Simulations</TableHead>
                <TableHead className="text-center"><Clock className="h-4 w-4 inline mr-1" /> Temps Total</TableHead>
                <TableHead>Dernière Connexion</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.sort((a,b) => (b.lastLoginAt?.seconds || 0) - (a.lastLoginAt?.seconds || 0)).map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{u.firstName} {u.lastName}</div>
                        <div className="text-[10px] text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${u.averageScore >= 80 ? 'text-emerald-600' : u.averageScore >= 65 ? 'text-blue-600' : 'text-slate-500'}`}>
                      {u.averageScore || 0}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">{u.simulationsCount || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs font-medium">
                    {formatTime(u.totalTimeSpent)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(u.lastLoginAt)}
                  </TableCell>
                  <TableCell>{getStatusBadge(u)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuItem onClick={() => toggleStatus(u.id, u.status || 'active')}>
                          {u.status === 'disabled' ? 'Réactiver le compte' : 'Désactiver le compte'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleSendResetEmail(u.email)}>
                          <Mail className="mr-2 h-4 w-4" /> Envoyer Reset Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPasswordChangeUser(u)}>
                          <Key className="mr-2 h-4 w-4" /> Voir/Modif Password record
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(u)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer le profil
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
          <DialogHeader><DialogTitle>Record de mot de passe</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg font-mono text-center text-lg font-bold">
               {passwordChangeUser?.password || 'N/A'}
            </div>
            <div className="space-y-2">
              <Label>Modifier le record SIMOVEX</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordChangeUser(null)}>Fermer</Button>
            <Button onClick={handleUpdatePassword} disabled={isChangingPassword}>Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>Action irréversible pour {userToDelete?.firstName}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
