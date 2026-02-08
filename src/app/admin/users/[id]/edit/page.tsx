
"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, ShieldCheck, Mail, User, Clock, Calendar, Trophy, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
    validityDays: '30',
    fixedDate: ''
  });

  const userRef = useMemoFirebase(() => doc(db, 'users', userId), [db, userId]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userRef);

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

    if (selectedExams.length === 0 && formData.role === 'user') {
      toast({ variant: "destructive", title: "Accès requis", description: "Veuillez sélectionner au moins un examen pour le participant." });
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
        validityType,
        validityDays: validityType === 'days' ? parseInt(formData.validityDays) : null,
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        allowedExams: selectedExams,
        updatedAt: Timestamp.now(),
      });

      // Update role in roles_admin if needed
      if (formData.role !== 'user') {
        await updateDoc(doc(db, 'roles_admin', userId), { updatedAt: Timestamp.now() });
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
            </div>

            <div className="space-y-4 border-t pt-6">
              <Label className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Accès aux Simulations
              </Label>
              <p className="text-xs text-muted-foreground mb-4">Cochez les examens auxquels ce participant pourra accéder.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_EXAMS.map((exam) => (
                  <div 
                    key={exam.id} 
                    onClick={() => toggleExam(exam.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleExam(exam.id);
                      }
                    }}
                    role="checkbox"
                    aria-checked={selectedExams.includes(exam.id)}
                    tabIndex={0}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedExams.includes(exam.id) ? 'bg-primary/5 border-primary shadow-sm' : 'bg-muted/10 border-transparent hover:border-muted-foreground/20'}`}
                  >
                    <Checkbox checked={selectedExams.includes(exam.id)} className="h-5 w-5 pointer-events-none" />
                    <span className={`text-sm font-black italic uppercase ${selectedExams.includes(exam.id) ? 'text-primary' : 'text-slate-500'}`}>{exam.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <Label className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Validité du compte
              </Label>
              <Tabs value={validityType} onValueChange={setValidityType} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/20">
                  <TabsTrigger value="days" className="font-bold italic uppercase text-xs"><Clock className="mr-2 h-4 w-4" /> Durée (Jours)</TabsTrigger>
                  <TabsTrigger value="fixedDate" className="font-bold italic uppercase text-xs"><Calendar className="mr-2 h-4 w-4" /> Date Fixe</TabsTrigger>
                </TabsList>
                <TabsContent value="days" className="pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Nombre de jours d'accès (à partir d'aujourd'hui)</Label>
                    <Input type="number" min="1" value={formData.validityDays} onChange={(e) => setFormData({...formData, validityDays: e.target.value})} className="h-12 text-lg font-black italic" />
                  </div>
                </TabsContent>
                <TabsContent value="fixedDate" className="pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Expire le</Label>
                    <Input type="date" value={formData.fixedDate} onChange={(e) => setFormData({...formData, fixedDate: e.target.value})} className="h-12 text-lg font-black italic" />
                  </div>
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
