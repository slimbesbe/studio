
"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useFirebaseApp } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  UserPlus, 
  ArrowLeft, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  AlertCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function NewUserPage() {
  const { user: adminUser, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    async function checkAdmin() {
      if (adminUser) {
        const adminDoc = await getDoc(doc(db, 'roles_admin', adminUser.uid));
        if (!adminDoc.exists()) router.push('/dashboard');
        else setIsAdmin(true);
      } else if (!isUserLoading) router.push('/login');
    }
    checkAdmin();
  }, [adminUser, isUserLoading, db, router]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({ variant: "destructive", title: "Erreur", description: "Le mot de passe doit faire au moins 6 caractères." });
      return;
    }

    setIsSubmitting(true);
    
    // Solution sécurisée côté client : utiliser une instance secondaire de Firebase Auth
    // pour créer l'utilisateur sans déconnecter l'admin actuel.
    const secondaryApp = initializeApp(firebaseConfig, "secondary");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 1. Création dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const newUid = userCredential.user.uid;

      // 2. Création du profil dans Firestore
      await setDoc(doc(db, 'users', newUid), {
        id: newUid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // 3. Si c'est un admin, ajouter l'entrée dans roles_admin
      if (formData.role === 'super_admin' || formData.role === 'admin') {
        await setDoc(doc(db, 'roles_admin', newUid), { createdAt: serverTimestamp() });
      }

      // 4. Nettoyage
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ title: "Utilisateur créé", description: `Le compte de ${formData.firstName} a été activé.` });
      router.push('/admin/users');
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de créer l'utilisateur." });
      await deleteApp(secondaryApp);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isAdmin === null) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste</Link>
      </Button>

      <Card className="border-t-4 border-t-accent shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 p-2 rounded-lg">
              <UserPlus className="h-6 w-6 text-accent" />
            </div>
            <div>
              <CardTitle>Nouveau Compte Utilisateur</CardTitle>
              <CardDescription>Créez un accès pour un participant ou un administrateur.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="firstName" 
                    placeholder="Jean" 
                    className="pl-10"
                    required 
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input 
                  id="lastName" 
                  placeholder="Dupont" 
                  required 
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email / Login</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="jean.dupont@simovex.com" 
                  className="pl-10"
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe temporaire</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10"
                  required 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">L'utilisateur pourra modifier ce mot de passe ultérieurement.</p>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Rôle du compte</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Participant (Standard)</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="super_admin">Super Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 mt-6">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Attention :</strong> La création d'un compte Super Admin donne un accès total à la banque de questions et à la gestion des utilisateurs.
              </p>
            </div>

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 h-12 font-bold mt-4" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création en cours...</>
              ) : (
                <><ShieldCheck className="mr-2 h-4 w-4" /> Activer le compte</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
