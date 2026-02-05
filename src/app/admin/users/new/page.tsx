
"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, ArrowLeft, ShieldCheck, Mail, Lock, User, Clock, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function NewUserPage() {
  const { user: adminUser, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validityType, setValidityType] = useState('days');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user',
    validityDays: '30',
    fixedDate: ''
  });

  useEffect(() => {
    async function checkAdmin() {
      if (adminUser) {
        const adminDoc = await getDoc(doc(db, 'roles_admin', adminUser.uid));
        if (!adminDoc.exists()) router.push('/dashboard');
        else setIsAdmin(true);
      } else if (!isUserLoading) router.push('/');
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
    
    const secondaryApp = initializeApp(firebaseConfig, "secondary");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const newUid = userCredential.user.uid;

      // Calcul de la date d'expiration
      let expiresAt: Date | null = null;
      if (validityType === 'days') {
        const days = parseInt(formData.validityDays);
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      } else if (validityType === 'fixedDate' && formData.fixedDate) {
        expiresAt = new Date(formData.fixedDate);
      }

      await setDoc(doc(db, 'users', newUid), {
        id: newUid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        status: 'active',
        validityType,
        validityDays: validityType === 'days' ? parseInt(formData.validityDays) : null,
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        createdAt: Timestamp.now(),
      });

      if (formData.role !== 'user') {
        await setDoc(doc(db, 'roles_admin', newUid), { createdAt: Timestamp.now() });
      }

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ title: "Utilisateur créé", description: `Le compte de ${formData.firstName} est prêt.` });
      router.push('/admin/users');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de créer le compte." });
      await deleteApp(secondaryApp);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isAdmin === null) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" asChild><Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link></Button>

      <Card className="border-t-4 border-t-accent shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 p-2 rounded-lg"><UserPlus className="h-6 w-6 text-accent" /></div>
            <div>
              <CardTitle>Nouveau Compte Utilisateur</CardTitle>
              <CardDescription>Configurez l'accès et la validité du compte.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Prénom" className="pl-10" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input placeholder="Nom" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="email@exemple.com" className="pl-10" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mot de passe temporaire</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" className="pl-10" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <Label className="text-lg font-bold">Validité du compte</Label>
              <Tabs value={validityType} onValueChange={setValidityType} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="days"><Clock className="mr-2 h-4 w-4" /> Nombre de jours</TabsTrigger>
                  <TabsTrigger value="fixedDate"><Calendar className="mr-2 h-4 w-4" /> Date fixe</TabsTrigger>
                </TabsList>
                <TabsContent value="days" className="pt-4">
                  <div className="space-y-2">
                    <Label>Durée de l'accès (en jours)</Label>
                    <Input type="number" min="1" value={formData.validityDays} onChange={(e) => setFormData({...formData, validityDays: e.target.value})} />
                  </div>
                </TabsContent>
                <TabsContent value="fixedDate" className="pt-4">
                  <div className="space-y-2">
                    <Label>Expire le</Label>
                    <Input type="date" value={formData.fixedDate} onChange={(e) => setFormData({...formData, fixedDate: e.target.value})} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label>Rôle du compte</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Participant (Standard)</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 h-12 font-bold" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Créer et Activer</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
