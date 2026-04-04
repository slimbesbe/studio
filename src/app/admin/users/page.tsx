"use client";

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, updateDoc, Timestamp, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, UserPlus, ChevronLeft, Users, User, Clock, Key, 
  Trash2, BarChart, Target, Mail, Pencil, CalendarDays, 
  ShieldCheck, Filter, Building2, GraduationCap, MailWarning,
  CheckCircle2, RefreshCw, Info, MoreHorizontal, LayoutDashboard,
  Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [passwordChangeUser, setPasswordChangeUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const isSA = profile?.role === 'super_admin';
  const isAdmin = isSA || profile?.role === 'admin';
  const isPartner = profile?.role === 'partner';

  const usersQuery = useMemoFirebase(() => {
    if (isSA || isAdmin) return collection(db, 'users');
    if (isPartner) return query(collection(db, 'users'), where('partnerId', '==', currentUser?.uid));
    return null;
  }, [db, isSA, isAdmin, isPartner, currentUser?.uid]);

  const { data: users, isLoading: isCollectionLoading } = useCollection(usersQuery);

  const groupsQuery = useMemoFirebase(() => {
    if (!isAdmin && !isPartner) return null;
    return collection(db, 'coachingGroups');
  }, [db, isAdmin, isPartner]);
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
      toast({ title: "Statut mis à jour", description: `Le compte est désormais ${newStatus === 'active' ? 'actif' : 'suspendu'}.` });
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
      toast({ title: "Mémo mis à jour", description: "Référence enregistrée. N'oubliez pas d'envoyer l'email pour synchroniser l'accès réel." });
      setPasswordChangeUser(null);
      setNewPassword('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!passwordChangeUser?.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, passwordChangeUser.email);
      toast({ title: "Email envoyé", description: `Lien de synchronisation envoyé à ${passwordChangeUser.email}` });
      setPasswordChangeUser(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur d'envoi", description: e.message });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      toast({ title: "Utilisateur supprimé", description: "Profil retiré de la base de données." });
      setUserToDelete(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'super_admin': return <Badge className="bg-purple-600 font-black italic uppercase text-[10px]">Super Admin</Badge>;
      case 'admin': return <Badge className="bg-blue-600 font-black italic uppercase text-[10px]">Admin</Badge>;
      case 'coach': return <Badge className="bg-emerald-600 font-black italic uppercase text-[10px]">Coach</Badge>;
      case 'partner': return <Badge className="bg-amber-600 font-black italic uppercase text-[10px]">Partenaire</Badge>;
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
            <div className="relative w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-12 rounded-xl border-none font-black italic text-xs uppercase bg-white"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><SelectValue placeholder="Rôle" /></div></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="partner">Partenaire</SelectItem>
                  <SelectItem value="user">Utilisateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-56">
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="h-12 rounded-xl border-none font-black italic text-xs uppercase bg-white"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-accent" /><SelectValue placeholder="Groupe" /></div></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les groupes</SelectItem>
                  {groups?.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button asChild className="bg-accent hover:bg-accent/90 h-16 px-12 rounded-[24px] font-black uppercase tracking-widest shadow-2xl scale-105 transition-transform"><Link href="/admin/users/new"><UserPlus className="mr-3 h-7 w-7" /> Créer Participant</Link></Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-lg border-2 mb-6">
        <div className="relative">
          <User className="absolute left-4 top-4 h-6 w-6 text-slate-300" />
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
                <TableRow><TableCell colSpan={5} className="h-64 text-center"><div className="flex flex-col items-center justify-center text-slate-300 gap-4"><Users className="h-16 w-16 opacity-20" /><p className="font-black uppercase italic tracking-widest">Aucun utilisateur trouvé</p></div></TableCell></TableRow>
              ) : (
                filteredUsers.map((u) => {
                  const groupName = groups?.find(g => g.id === u.groupId)?.name || '-';
                  return (
                    <TableRow key={u.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                      <TableCell className="px-10">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary italic">{u.firstName?.[0] || '?'}{u.lastName?.[0] || '?'}</div>
                          <div className="space-y-0.5"><div className="font-black text-lg text-slate-800 italic uppercase tracking-tight">{u.firstName} {u.lastName}</div><div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase italic"><Mail className="h-3 w-3" /> {u.email}</div></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{getRoleBadge(u.role)}</TableCell>
                      <TableCell className="text-center"><span className="font-bold text-slate-600 text-sm italic">{groupName}</span></TableCell>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border-2 hover:bg-slate-50"><MoreHorizontal className="h-4 w-4 text-slate-400" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-4">
                              <DropdownMenuItem onClick={() => toggleStatus(u.id, u.status)} className="h-12 rounded-xl font-black uppercase text-xs italic cursor-pointer">{u.status === 'active' ? '🚫 Suspendre' : '✅ Réactiver'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setPasswordChangeUser(u); setNewPassword(''); }} className="h-12 rounded-xl font-black uppercase text-xs italic cursor-pointer"><Key className="mr-3 h-4 w-4" /> Accès & Sync</DropdownMenuItem>
                              <DropdownMenuSeparator className="my-2" />
                              <DropdownMenuItem onClick={() => setUserToDelete(u)} className="h-12 rounded-xl font-black uppercase text-xs italic text-destructive focus:bg-red-50 cursor-pointer"><Trash2 className="mr-3 h-4 w-4" /> Supprimer</DropdownMenuItem>
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

      <Dialog open={!!passwordChangeUser} onOpenChange={(val) => !val && setPasswordChangeUser(null)}>
        <DialogContent className="rounded-[40px] max-w-lg p-12 border-4 shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase italic text-primary">Gestion des Accès</DialogTitle>
            <DialogDescription className="font-bold text-slate-400 uppercase text-[10px] italic">Synchronisation réelle ou mémo admin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="p-6 bg-slate-50 rounded-2xl text-center border-2 border-dashed">
              <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Mémo actuel (Firestore)</p>
              <code className="text-2xl font-black text-primary">{passwordChangeUser?.password || '---'}</code>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Modifier le mémo (Admin uniquement)</Label>
                <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe mémo..." className="h-14 rounded-xl font-black italic border-2 bg-white" />
                <p className="text-[9px] font-bold text-slate-400 leading-tight italic">
                  Note : Modifier ce champ ne change pas l'accès réel de l'utilisateur. Utilisez le bouton de synchronisation ci-dessous.
                </p>
              </div>
              
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
                <div className="relative flex justify-center text-[9px] uppercase"><span className="bg-white px-2 text-primary font-black italic tracking-widest">Action Réelle</span></div>
              </div>

              <Button variant="outline" className="w-full h-16 rounded-xl font-black uppercase italic text-xs gap-3 border-4 border-amber-200 text-amber-700 hover:bg-amber-50 shadow-sm" onClick={handleSendResetEmail} disabled={isSendingReset}>
                {isSendingReset ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
                Envoyer Lien de Synchronisation
              </Button>
              <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-blue-600 leading-relaxed italic">
                  C'est la seule méthode pour mettre à jour l'accès réel de l'utilisateur. Il recevra un email pour définir son nouveau mot de passe.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-14 rounded-xl font-black uppercase flex-1 border-2" onClick={() => setPasswordChangeUser(null)}>Annuler</Button>
            <Button className="h-14 rounded-xl font-black bg-primary flex-1 shadow-xl uppercase text-xs" onClick={handleUpdatePasswordMemo} disabled={isChangingPassword || !newPassword}>
              {isChangingPassword ? <Loader2 className="animate-spin h-5 w-5" /> : "Mettre à jour Mémo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent className="rounded-[40px] p-12 border-4 shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black uppercase text-destructive italic tracking-tighter">Action Irréversible</AlertDialogTitle>
            <AlertDialogDescription className="text-xl font-bold pt-4 text-slate-600 leading-relaxed uppercase tracking-tight italic">Voulez-vous supprimer <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="h-14 rounded-xl font-black uppercase border-4">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="h-14 rounded-xl font-black bg-destructive hover:bg-red-700 shadow-xl">Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
