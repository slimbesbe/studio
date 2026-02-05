
"use client";

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { collection, doc, getDoc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserPlus, ChevronLeft, Users, ShieldCheck, User, MoreHorizontal, Clock, AlertTriangle, Key, Trash2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
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
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // State for password change dialog
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
      toast({ title: "Statut mis à jour", description: `Le compte est maintenant ${newStatus === 'active' ? 'activé' : 'désactivé'}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier le statut." });
    }
  };

  const handleSendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ 
        title: "Email envoyé", 
        description: `Un lien de réinitialisation a été envoyé à ${email}.` 
      });
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Erreur", 
        description: "Impossible d'envoyer l'email." 
      });
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

      toast({ 
        title: "Record SIMOVEX mis à jour", 
        description: `Note: Pour que l'utilisateur puisse se connecter avec ce nouveau mot de passe, il doit utiliser le lien de réinitialisation email.` 
      });
      setPasswordChangeUser(null);
      setNewPassword('');
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le record." });
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
      toast({ title: "Supprimé", description: "Le profil utilisateur a été supprimé." });
      setUserToDelete(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer." });
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const getStatusBadge = (user: any) => {
    const expiresAt = user.expiresAt?.seconds ? new Date(user.expiresAt.seconds * 1000) : null;
    const isExpired = expiresAt && expiresAt < new Date();
    
    if (user.status === 'disabled') return <Badge variant="destructive">Désactivé</Badge>;
    if (isExpired) return <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700"><Clock className="mr-1 h-3 w-3" /> Expiré</Badge>;
    
    const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
    if (daysLeft && daysLeft <= 7) return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200"><AlertTriangle className="mr-1 h-3 w-3" /> J-{daysLeft}</Badge>;
    
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">Actif</Badge>;
  };

  if (isUserLoading || isAdmin === null || isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/admin/dashboard"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-accent" /> Gestion des Utilisateurs
            </h1>
            <p className="text-muted-foreground">{users?.length || 0} comptes enregistrés</p>
          </div>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90">
          <Link href="/admin/users/new"><UserPlus className="mr-2 h-4 w-4" /> Créer un Utilisateur</Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Mot de passe (Record)</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm text-primary">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-bold">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.role === 'super_admin' || u.role === 'admin' ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 gap-1"><ShieldCheck className="h-3 w-3" /> {u.role === 'super_admin' ? 'Super Admin' : 'Admin'}</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><User className="h-3 w-3" /> User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {showPasswords[u.id] ? u.password || 'Non défini' : '••••••••'}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePasswordVisibility(u.id)}>
                        {showPasswords[u.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(u)}</TableCell>
                  <TableCell className="text-xs">
                    {u.expiresAt ? new Date(u.expiresAt.seconds * 1000).toLocaleDateString() : 'Illimitée'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuItem onClick={() => toggleStatus(u.id, u.status || 'active')}>
                          {u.status === 'disabled' ? 'Réactiver le compte' : 'Désactiver le compte'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-primary" onClick={() => handleSendResetEmail(u.email)}>
                          <Mail className="mr-2 h-4 w-4" /> Envoyer Reset Email (Recommandé)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPasswordChangeUser(u)}>
                          <Key className="mr-2 h-4 w-4" /> Modifier Record Password
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

      {/* Password Change Dialog */}
      <Dialog open={!!passwordChangeUser} onOpenChange={() => setPasswordChangeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le record de mot de passe</DialogTitle>
            <DialogDescription>
              Mettre à jour le mot de passe visible dans SIMOVEX pour <strong>{passwordChangeUser?.firstName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>Attention: Changer cette valeur ne change pas le mot de passe réel de l'utilisateur dans le système d'authentification. Utilisez <strong>l'envoi d'email</strong> pour une réinitialisation effective.</p>
            </div>
            <div className="space-y-2">
              <Label>Nouveau mot de passe (SIMOVEX)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Nouveau mot de passe" 
                  className="pl-10" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordChangeUser(null)}>Annuler</Button>
            <Button onClick={handleUpdatePassword} disabled={isChangingPassword}>
              {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre à jour le record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera le profil de <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>.
              L'utilisateur ne pourra plus accéder à SIMOVEX. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
