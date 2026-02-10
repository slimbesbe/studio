
"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, getDoc, updateDoc, Timestamp, collection, setDoc } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, ShieldCheck, Mail, User, Clock, Calendar, Trophy, Pencil, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

const AVAILABLE_EXAMS = [
  { id: 'exam1', title: 'Examen 1' },
  { id: 'exam2', title: 'Examen 2' },
  { id: 'exam3', title: 'Examen 3' },
  { id: 'exam4', title: 'Examen 4' },
  { id: 'exam5', title: 'Examen 5' },
];

export default function EditUserPage() {
  const { user: adminUser, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validityType, setValidityType] = useState('days');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
    accessType: 'simulation',
    groupId: '',
    validityDays: '30',
    fixedDate: ''
  });

  const userRef = useMemoFirebase(() => doc(db, 'users', userId), [db, userId]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userRef);

  const groupsQuery = useMemoFirebase(() => collection(db, 'coachingGroups'), [db]);
  const { data: groups } = useCollection(groupsQuery);

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

  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        role: userData.role || 'user',
        accessType: userData.accessType || 'simulation',
        groupId: userData.groupId || '',
        validityDays: String(userData.validityDays || '30'),
        fixedDate: userData.expiresAt ? new Date(userData.expiresAt.seconds * 1000).toISOString().split('T')[0] : ''
      });
      setSelectedExams(userData.allowedExams || []);
      setValidityType(userData.validityType || 'days');
    }
  }, [userData]);

  const toggleExam = (id: string) => {
    setSelectedExams(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((formData.accessType === 'coaching' || formData.accessType === 'coaching_simulation') && !formData.groupId) {
      toast({ variant: "destructive", title: "Groupe requis", description: "Veuillez sélectionner un groupe pour le coaching." });
      return;
    }

    setIsSubmitting(true);
    
    try {
      let expiresAt: Date | null = null;
      if (validityType === 'days') {
        const days = parseInt(formData.validityDays);
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      } else if (validityType === 'fixedDate' && formData.fixedDate) {
        expiresAt = new Date(formData.fixedDate);
      }

      await updateDoc(doc(db, 'users', userId), {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        accessType: formData.accessType,
        groupId: formData.groupId || null,
        validityType,
        validityDays: validityType === 'days' ? parseInt(formData.validityDays) : null,
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        allowedExams: selectedExams,
        updatedAt: Timestamp.now(),
      });

      if (formData.role !== 'user') {
        const adminRolesRef = doc(db, 'roles_admin', userId);
        const adminDoc = await getDoc(adminRolesRef);
        if (!adminDoc.exists()) {
          await setDoc(adminRolesRef, { createdAt: Timestamp.now(), email: formData.email });
        }
      }

      toast({ title: "Utilisateur mis à jour", description: `Le compte de ${formData.firstName} a été modifié.` });
      router.push('/admin/users');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de modifier le compte." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isAdmin === null || isUserDataLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" asChild><Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link></Button>

      <Card className="border-t-4 border-t-primary shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg"><Pencil className="h-6 w-6 text-primary" /></div>
            <div>
              <CardTitle>Modifier le Participant</CardTitle>
              <CardDescription>Mettez à jour les accès et la validité du compte de {formData.firstName}.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateUser} className="space-y-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input placeholder="Prénom" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input placeholder="Nom" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemple.com" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="space-y-6 border-t pt-6">
              <Label className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Configuration des Accès
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Type d'accès plateforme</Label>
                  <Select value={formData.accessType} onValueChange={(val) => setFormData({...formData, accessType: val})}>
                    <SelectTrigger className="font-bold h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simulation">Simulation Uniquement</SelectItem>
                      <SelectItem value="coaching">Coaching Uniquement</SelectItem>
                      <SelectItem value="coaching_simulation">Hybride (Coaching + Simulation)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.accessType === 'coaching' || formData.accessType === 'coaching_simulation') && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Groupe de Coaching</Label>
                    <Select value={formData.groupId} onValueChange={(val) => setFormData({...formData, groupId: val})}>
                      <SelectTrigger className="font-bold h-12"><SelectValue placeholder="Choisir un groupe" /></SelectTrigger>
                      <SelectContent>
                        {groups?.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {(formData.accessType === 'simulation' || formData.accessType === 'coaching_simulation') && (
              <div className="space-y-4 border-t pt-6">
                <Label className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" /> Accès aux Simulations
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {AVAILABLE_EXAMS.map((exam) => {
                    const isChecked = selectedExams.includes(exam.id);
                    return (
                      <div 
                        key={exam.id} 
                        onClick={() => toggleExam(exam.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${isChecked ? 'bg-primary/5 border-primary' : 'bg-muted/10 border-transparent'}`}
                      >
                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${isChecked ? 'bg-primary border-primary' : 'bg-white'}`}>
                          {isChecked && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <span className="text-xs font-black uppercase italic">{exam.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 border-t pt-6">
              <Label className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Validité du compte
              </Label>
              <Tabs value={validityType} onValueChange={setValidityType} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="days" className="font-bold italic uppercase text-xs">Durée (Jours)</TabsTrigger>
                  <TabsTrigger value="fixedDate" className="font-bold italic uppercase text-xs">Date Fixe</TabsTrigger>
                </TabsList>
                <TabsContent value="days" className="pt-4">
                  <Input type="number" min="1" value={formData.validityDays} onChange={(e) => setFormData({...formData, validityDays: e.target.value})} className="h-12 font-black italic" />
                </TabsContent>
                <TabsContent value="fixedDate" className="pt-4">
                  <Input type="date" value={formData.fixedDate} onChange={(e) => setFormData({...formData, fixedDate: e.target.value})} className="h-12 font-black italic" />
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2 border-t pt-6">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Rôle du compte</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                <SelectTrigger className="h-12 font-black italic"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Participant Standard</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-14 font-black uppercase tracking-widest text-lg shadow-xl" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mise à jour...</> : <><ShieldCheck className="mr-2 h-5 w-5" /> Enregistrer les modifications</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
