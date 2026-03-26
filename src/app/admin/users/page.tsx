"use client";

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, Timestamp, deleteDoc, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, UserPlus, ChevronLeft, Users, User, Clock, Key, 
  Trash2, BarChart, Target, Mail, Pencil, CalendarDays, 
  ShieldCheck, Filter, Building2, GraduationCap, LayerWide 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UsersListPage() {
  const { user: currentUser, profile, isUserLoading } = useUser();
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

  const isSA = profile?.role === 'super_admin';
  const isAdmin = isSA || profile?.role === 'admin';
  const isPartner = profile?.role === 'partner';

  const usersQuery = useMemoFirebase(() => {
    if (isSA || isAdmin) return collection(db, 'users');
    if (isPartner) return query(collection(db, 'users'), where('partnerId', '==', currentUser?.uid));
    return null;
  }, [db, isSA, isAdmin, isPartner, currentUser?.uid]);

  const { data: users, isLoading: isCollectionLoading } = useCollection(usersQuery);

  const groupsQuery = useMemoFirebase(() => collection(db, 'coachingGroups'), [db]);
  const { data: groups } = useCollection(groupsQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const matchesSearch = (u.firstName + ' ' + u.lastName + ' ' + u.email).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesGroup = groupFilter === 'all' || u.groupId === groupFilter;
      return matchesSearch && matchesRole && matchesGroup;
    });
  }, [users, searchTerm, roleFilter, groupFilter]);

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

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'super_admin': return <Badge className="bg-purple-600">Super Admin</Badge>;
      case 'admin': return <Badge className="bg-blue-600">Admin</Badge>;
      case 'coach': return <Badge className="bg-emerald-600">Coach</Badge>;
      case 'partner': return <Badge className="bg-amber-600">Partenaire</Badge>;
      default: return <Badge variant="outline">Élève</Badge>;
    }
  };

  if (isUserLoading || isCollectionLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10 animate-fade-in">
      <div className="flex flex-col lg:flex-row items-center justify-between bg-white p-8 rounded-[40px] shadow-xl border-2 gap-6">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" asChild className="h-16 w-16 rounded-3xl border-2 shadow-sm">
            <Link href="/admin/dashboard"><ChevronLeft className="h-8 w-8" /></Link>
          </Button>
          <div>
            <h1 className="text-4xl font-black flex items-center gap-4 text-primary italic uppercase tracking-tighter">
              <Users className="h-12 w-12 text-accent" /> Gestion des Comptes
            </h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm">Contrôle des accès, rôles et affectations de groupes.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border-2">
            {/* Filtre Rôle */}
            <div className="relative w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-12 rounded-xl border-none font-black italic text-xs uppercase bg-white">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <SelectValue placeholder="Rôle" />
                  </div>
                </SelectTrigger>
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

            {/* Filtre Groupe */}
            <div className="relative w-56">
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="h-12 rounded-xl border-none font-black italic text-xs uppercase bg-white">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-accent" />
                    <SelectValue placeholder="Groupe" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les groupes</SelectItem>
                  {groups?.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button asChild className="bg-accent hover:bg-accent/90 h-16 px-12 rounded-[24px] font-black uppercase tracking-widest shadow-2xl">
            <Link href="/admin/users/new">
              <UserPlus className="mr-3 h-7 w-7" /> Créer Participant
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-lg border-2 mb-6">
        <div className="relative">
          <User className="absolute left-4 top-4 h-6 w-6 text-slate-300" />
          <Input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Rechercher un nom, un email..." 
            className="h-14 rounded-2xl pl-14 font-bold italic border-2"
          />
        </div>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden bg-white rounded-[40px]">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Utilisateur</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Rôle</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Groupe / Entité</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Dernière Connexion</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-4">
                      <Users className="h-16 w-16 opacity-20" />
                      <p className="font-black uppercase italic tracking-widest">Aucun utilisateur trouvé</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => {
                  const groupName = groups?.find(g => g.id === u.groupId)?.name || '-';
                  return (
                    <TableRow key={u.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                      <TableCell className="px-10">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary italic">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-black text-lg text-slate-800 italic uppercase tracking-tight">{u.firstName} {u.lastName}</div>
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase italic"><Mail className="h-3 w-3" /> {u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getRoleBadge(u.role)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-600 text-sm italic">{groupName}</span>
                          {u.partnerId && <Badge variant="outline" className="text-[8px] mt-1"><Building2 className="h-2 w-2 mr-1" /> PARTNER</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-slate-400 italic">
                        {u.lastLoginAt ? new Date(u.lastLoginAt.seconds * 1000).toLocaleString() : 'Jamais'}
                      </TableCell>
                      <TableCell className="text-right px-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl border-2"><Pencil className="h-5 w-5 text-slate-400" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-4">
                            <DropdownMenuItem asChild className="h-12 rounded-xl font-black uppercase text-xs italic">
                              <Link href={`/admin/users/${u.id}/edit`}><Pencil className="mr-3 h-4 w-4" /> Modifier Profil</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(u.id, u.status)} className="h-12 rounded-xl font-black uppercase text-xs italic">
                              {u.status === 'active' ? '🚫 Suspendre' : '✅ Réactiver'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setPasswordChangeUser(u); setNewPassword(''); }} className="h-12 rounded-xl font-black uppercase text-xs italic">
                              <Key className="mr-3 h-4 w-4" /> Mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-2" />
                            <DropdownMenuItem onClick={() => setUserToDelete(u)} className="h-12 rounded-xl font-black uppercase text-xs italic text-destructive focus:bg-red-50 focus:text-destructive">
                              <Trash2 className="mr-3 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Password Dialog */}
      <Dialog open={!!passwordChangeUser} onOpenChange={() => setPasswordChangeUser(null)}>
        <DialogContent className="rounded-[40px] max-w-lg p-12 border-4 shadow-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-black uppercase italic text-primary">Accès Sécurisé</DialogTitle></DialogHeader>
          <div className="space-y-6 py-6">
            <div className="p-6 bg-slate-50 rounded-2xl text-center border-2 border-dashed">
              <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Mot de passe actuel</p>
              <code className="text-2xl font-black text-primary">{passwordChangeUser?.password || '---'}</code>
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Nouveau mot de passe</Label>
              <Input 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="6 caractères min." 
                className="h-14 rounded-xl font-black italic border-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-14 rounded-xl font-black uppercase flex-1" onClick={() => setPasswordChangeUser(null)}>Annuler</Button>
            <Button className="h-14 rounded-xl font-black bg-primary flex-1 shadow-xl" onClick={handleUpdatePassword} disabled={isChangingPassword}>
              {isChangingPassword ? <Loader2 className="animate-spin h-5 w-5" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent className="rounded-[40px] p-12 border-4 shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black uppercase text-destructive italic tracking-tighter">Action Irréversible</AlertDialogTitle>
            <AlertDialogDescription className="text-xl font-bold pt-4 text-slate-600 leading-relaxed uppercase tracking-tight italic">
              Voulez-vous supprimer <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> ? Toutes ses données de progression seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="h-14 rounded-xl font-black uppercase border-4">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="h-14 rounded-xl font-black bg-destructive hover:bg-red-700 shadow-xl">
              Confirmer Suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
