
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, UserPlus, ChevronLeft, Users, Key, 
  Trash2, Mail, Pencil, ShieldCheck, GraduationCap, 
  MoreHorizontal, LayoutDashboard, RefreshCw, Search,
  AlertTriangle, Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
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
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function UsersListPage() {
  const { user: currentUser, profile, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordChangeUser, setPasswordChangeUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const isSA = profile?.role === 'super_admin';
  const isAdmin = isSA || profile?.role === 'admin';

  const usersQuery = useMemoFirebase(() => {
    if (isAdmin) return collection(db, 'users');
    return null;
  }, [db, isAdmin]);

  const { data: users, isLoading: isCollectionLoading } = useCollection(usersQuery);

  const groupsQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return collection(db, 'coachingGroups');
  }, [db, isAdmin]);
  const { data: groups } = useCollection(groupsQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const name = (u.firstName || '') + ' ' + (u.lastName || '');
      const email = u.email || '';
      const matchesSearch = (name + email).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesGroup = groupFilter === 'all' || u.groupId === groupFilter;
      return matchesSearch && matchesRole && matchesGroup;
    });
  }, [users, searchTerm, roleFilter, groupFilter]);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus, updatedAt: serverTimestamp() });
      toast({ title: "Statut mis à jour" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  const handleUpdatePasswordMemo = async () => {
    if (!passwordChangeUser || newPassword.length < 6) {
      toast({ variant: "destructive", title: "Erreur", description: "Le mot de passe doit faire 6 caractères minimum." });
      return;
    }
    setIsChangingPassword(true);
    try {
      await updateDoc(doc(db, 'users', passwordChangeUser.id), { 
        password: newPassword,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Mémo mis à jour", description: "Attention: ce changement est visuel uniquement pour vous." });
      setPasswordChangeUser(null);
      setNewPassword('');
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    if (!passwordChangeUser?.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, passwordChangeUser.email);
      toast({ title: "Email envoyé", description: "L'élève recevra un lien pour choisir son nouveau mot de passe." });
      setPasswordChangeUser(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur d'envoi" });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      toast({ title: "Utilisateur supprimé" });
      setUserToDelete(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'super_admin': return <Badge className="bg-purple-600 font-black italic uppercase text-[10px]">Super Admin</Badge>;
      case 'admin': return <Badge className="bg-blue-600 font-black italic uppercase text-[10px]">Admin</Badge>;
      case 'coach': return <Badge className="bg-emerald-600 font-black italic uppercase text-[10px]">Coach</Badge>;
      case 'demo': return <Badge className="bg-amber-600 font-black italic uppercase text-[10px]">Démo</Badge>;
      default: return <Badge variant="outline" className="font-black italic uppercase text-[10px]">Élève</Badge>;
    }
  };

  if (isUserLoading || isCollectionLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10 animate-fade-in pb-32">
      <div className="flex flex-col lg:flex-row items-center justify-between bg-white p-8 rounded-[40px] shadow-xl border-2 gap-6">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" asChild className="h-16 w-16 rounded-3xl border-2 shadow-sm"><Link href="/admin/dashboard"><ChevronLeft className="h-8 w-8" /></Link></Button>
          <div>
            <h1 className="text-4xl font-black flex items-center gap-4 text-primary italic uppercase tracking-tighter"><Users className="h-12 w-12 text-accent" /> Gestion des Comptes</h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm italic">Accès, rôles et affectations.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-12 w-48 rounded-xl border-none font-black italic text-xs uppercase bg-white"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><SelectValue placeholder="Rôle" /></div></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="demo">Démo</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-12 w-56 rounded-xl border-none font-black italic text-xs uppercase bg-white"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-accent" /><SelectValue placeholder="Groupe" /></div></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les groupes</SelectItem>
                <SelectItem value="DEMO">Groupe DEMO</SelectItem>
                {groups?.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild className="bg-accent hover:bg-accent/90 h-16 px-12 rounded-[24px] font-black uppercase tracking-widest shadow-2xl scale-105 transition-transform"><Link href="/admin/users/new"><UserPlus className="mr-3 h-7 w-7" /> Créer Participant</Link></Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-lg border-2 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-4 h-6 w-6 text-slate-300" />
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher par nom ou email..." className="h-14 rounded-2xl pl-14 font-bold italic border-2 bg-white" />
        </div>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden bg-white rounded-[40px]">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs min-w-[250px]">Utilisateur</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Rôle</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Groupe</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Statut</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-300 font-black italic uppercase tracking-widest">Aucun utilisateur trouvé</TableCell></TableRow>
              ) : (
                filteredUsers.map((u) => {
                  const groupName = u.groupId === 'DEMO' ? 'DEMO' : (groups?.find(g => g.id === u.groupId)?.name || '-');
                  return (
                    <TableRow key={u.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                      <TableCell className="px-10">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center font-black italic shadow-sm",
                            u.role === 'demo' ? "bg-slate-100 text-slate-400" : "bg-primary/10 text-primary"
                          )}>{u.firstName?.[0] || '?'}{u.lastName?.[0] || '?'}</div>
                          <div className="space-y-0.5">
                            <div className="font-black text-lg text-slate-800 italic uppercase tracking-tight">{u.firstName} {u.lastName}</div>
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase italic"><Mail className="h-3 w-3" /> {u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{getRoleBadge(u.role)}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-bold text-sm italic",
                          u.groupId === 'DEMO' ? "text-amber-600 bg-amber-50 px-3 py-1 rounded-lg" : "text-slate-600"
                        )}>{groupName}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={u.status === 'active' ? 'default' : 'destructive'} className="font-black italic uppercase text-[9px] px-3">{u.status === 'active' ? 'Actif' : 'Suspendu'}</Badge>
                      </TableCell>
                      <TableCell className="text-right px-10">
                        <div className="flex justify-end gap-2">
                          {u.role === 'user' && (
                            <Button variant="outline" size="sm" asChild className="h-10 px-4 rounded-xl border-2 font-black uppercase text-[10px] italic text-primary hover:bg-primary/5">
                              <Link href={`/admin/users/${u.id}/dashboard`}><LayoutDashboard className="mr-2 h-3.5 w-3.5" /> Dashboard</Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl border-2 hover:bg-slate-50"><Link href={`/admin/users/${u.id}/edit`}><Pencil className="h-4 w-4 text-slate-400" /></Link></Button>
                          
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border-2 hover:bg-slate-50">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-2 bg-white">
                              <DropdownMenuItem className="rounded-xl font-bold italic text-xs uppercase cursor-pointer" onClick={() => toggleStatus(u.id, u.status)}>
                                {u.status === 'active' ? <><ShieldCheck className="mr-2 h-4 w-4 text-red-500" /> Suspendre</> : <><ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" /> Activer</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-xl font-bold italic text-xs uppercase cursor-pointer text-blue-600" onClick={() => setPasswordChangeUser(u)}>
                                <Key className="mr-2 h-4 w-4" /> Gérer mot de passe
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="rounded-xl font-bold italic text-xs uppercase cursor-pointer text-red-600" onClick={() => setUserToDelete(u)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer compte
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOG MOT DE PASSE */}
      <Dialog open={!!passwordChangeUser} onOpenChange={(val) => !val && setPasswordChangeUser(null)}>
        <DialogContent className="rounded-[40px] p-12 border-4 shadow-3xl max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase italic text-primary flex items-center gap-3">
              <Lock className="h-8 w-8 text-blue-500" /> Sécurité du compte
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-500 italic mt-2 uppercase text-xs tracking-widest leading-relaxed">
              Le mot de passe stocké ici est un <span className="text-primary font-black">mémo visuel</span> pour votre suivi.
            </DialogDescription>
          </DialogHeader>

          <div className="py-8 space-y-8">
             <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 text-amber-600 font-black uppercase text-[10px] italic">
                   <AlertTriangle className="h-4 w-4" /> Note Technique
                </div>
                <p className="text-xs font-bold text-amber-800 italic leading-relaxed">
                   Modifier le champ ci-dessous n'affecte pas les identifiants réels de connexion. Pour changer réellement le mot de passe de l'élève, utilisez le bouton de réinitialisation par email.
                </p>
             </div>

             <div className="space-y-3">
               <Label className="font-black uppercase text-[10px] text-slate-400 italic ml-2">Mot de passe mémo</Label>
               <Input 
                 value={newPassword} 
                 onChange={(e) => setNewPassword(e.target.value)} 
                 placeholder="Nouveau mot de passe..."
                 className="h-14 rounded-xl border-2 font-black italic text-lg text-primary"
               />
             </div>
             
             <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleUpdatePasswordMemo} 
                  disabled={isChangingPassword || !newPassword.trim()}
                  className="h-14 rounded-xl bg-slate-900 font-black uppercase italic tracking-widest text-xs"
                >
                  {isChangingPassword ? <Loader2 className="animate-spin" /> : "Mettre à jour le mémo"}
                </Button>
                
                <div className="relative py-2">
                   <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
                   <div className="relative flex justify-center text-[8px] uppercase"><span className="bg-white px-2 text-slate-300 font-black italic">OU ACTION RÉELLE</span></div>
                </div>

                <Button 
                  variant="outline"
                  onClick={handleSendPasswordResetEmail}
                  disabled={isSendingReset}
                  className="h-14 rounded-xl border-2 border-blue-100 text-blue-600 hover:bg-blue-50 font-black uppercase italic tracking-widest text-xs"
                >
                  {isSendingReset ? <Loader2 className="animate-spin" /> : <><RefreshCw className="mr-2 h-4 w-4" /> Envoyer lien de réinitialisation</>}
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG SUPPRESSION */}
      <AlertDialog open={!!userToDelete} onOpenChange={(val) => !val && setUserToDelete(null)}>
        <AlertDialogContent className="rounded-[40px] border-4 border-destructive p-12 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-4xl font-black uppercase italic text-destructive tracking-tighter text-center">Suppression</AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-bold text-slate-500 italic mt-4 leading-relaxed text-center">
              Voulez-vous supprimer le compte de <br/>
              <span className="text-destructive font-black underline underline-offset-4 text-2xl">{userToDelete?.firstName} {userToDelete?.lastName}</span> ? 
              <br/><br/>
              <span className="text-xs uppercase font-black text-slate-300 tracking-widest">Cette action est irréversible.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4 mt-8">
            <AlertDialogCancel className="h-16 rounded-2xl font-black uppercase flex-1 border-4">Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="h-16 rounded-2xl bg-destructive hover:bg-red-700 font-black uppercase flex-1 shadow-2xl"
            >
              {isDeleting ? <Loader2 className="animate-spin" /> : "CONFIRMER SUPPRESSION"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
