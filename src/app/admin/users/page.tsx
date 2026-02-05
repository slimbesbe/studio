
"use client";

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Loader2, 
  UserPlus, 
  ChevronLeft,
  Users,
  ShieldCheck,
  User,
  MoreHorizontal
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function UsersListPage() {
  const { user: currentUser, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      if (currentUser) {
        const adminDoc = await getDoc(doc(db, 'roles_admin', currentUser.uid));
        if (!adminDoc.exists()) router.push('/dashboard');
        else setIsAdmin(true);
      } else if (!isUserLoading) router.push('/login');
    }
    checkAdmin();
  }, [currentUser, isUserLoading, db, router]);

  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: users, isLoading } = useCollection(usersQuery);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      toast({ title: "Statut mis à jour", description: `L'utilisateur est maintenant ${newStatus}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier le statut." });
    }
  };

  if (isUserLoading || isAdmin === null || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/dashboard"><ChevronLeft /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-accent" />
              Gestion des Utilisateurs
            </h1>
            <p className="text-muted-foreground">{users?.length || 0} comptes enregistrés</p>
          </div>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90">
          <Link href="/admin/users/new">
            <UserPlus className="mr-2 h-4 w-4" /> Créer un Utilisateur
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.role === 'super_admin' ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 flex w-fit gap-1 items-center">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex w-fit gap-1 items-center">
                        <User className="h-3 w-3" /> Participant
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'inactive' ? 'destructive' : 'default'} className={u.status !== 'inactive' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                      {u.status === 'inactive' ? 'Désactivé' : 'Actif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleStatus(u.id, u.status || 'active')}>
                          {u.status === 'inactive' ? 'Réactiver le compte' : 'Désactiver le compte'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Réinitialiser le mot de passe</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
