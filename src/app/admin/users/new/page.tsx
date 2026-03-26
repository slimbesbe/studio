
"use client";

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, Timestamp, collection, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, ArrowLeft, ShieldCheck, Mail, Lock, User, Clock, Trophy, Check, Plus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const AVAILABLE_EXAMS = [
  { id: 'exam1', title: 'Examen 1' },
  { id: 'exam2', title: 'Examen 2' },
  { id: 'exam3', title: 'Examen 3' },
  { id: 'exam4', title: 'Examen 4' },
  { id: 'exam5', title: 'Examen 5' },
];

export default function NewUserPage() {
  const { isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validityType, setValidityType] = useState('days');
  const [selectedExams, setSelectedExams] = useState<string[]>(['exam1']); 
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user',
    accessType: 'simulation_and_coaching',
    groupId: 'none',
    newGroupName: '',
    validityDays: '30',
    fixedDate: ''
  });

  const groupsQuery = useMemoFirebase(() => collection(db, 'coachingGroups'), [db]);
  const { data: groups } = useCollection(groupsQuery);

  const toggleExam = (id: string) => {
    setSelectedExams(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({ variant: "destructive", title: "Erreur", description: "Le mot de passe doit faire au moins 6 caractères." });
      return;
    }

    if (!isCreatingNewGroup && formData.groupId === 'none' && formData.role === 'user') {
      toast({ variant: "destructive", title: "Groupe requis", description: "Veuillez sélectionner un groupe pour l'utilisateur." });
      return;
    }

    setIsSubmitting(true);
    
    const secondaryAppName = "secondary_user_creation_" + Date.now();
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      let finalGroupId = formData.groupId === 'none' ? null : formData.groupId;
      if (isCreatingNewGroup && formData.newGroupName.trim()) {
        const newGroupRef = doc(collection(db, 'coachingGroups'));
        await setDoc(newGroupRef, {
          id: newGroupRef.id,
          name: formData.newGroupName,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          maxUsers: 25
        });
        finalGroupId = newGroupRef.id;
      }

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const newUid = userCredential.user.uid;

      let expiresAt: Date | null = null;
      if (validityType === 'days') {
        const days = Number(formData.validityDays) || 30;
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
        accessType: formData.accessType,
        groupId: finalGroupId,
        status: 'active',
        password: formData.password,
        validityType,
        validityDays: validityType === 'days' ? (Number(formData.validityDays) || 30) : null,
        expiresAt: (expiresAt && !isNaN(expiresAt.getTime())) ? Timestamp.fromDate(expiresAt) : null,
        allowedExams: selectedExams,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        simulationsCount: 0,
        averageScore: 0,
        totalTimeSpent: 0
      });

      if (formData.role === 'admin' || formData.role === 'super_admin') {
        await setDoc(doc(db, 'roles_admin', newUid), { 
          createdAt: serverTimestamp(), 
          email: formData.email,
          isSuperAdmin: formData.role === 'super_admin'
        });
      }

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      toast({ title: "Utilisateur créé", description: `Le compte de ${formData.firstName} est opérationnel.` });
      router.push('/admin/users');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de créer le compte." });
      try { await deleteApp(secondaryApp); } catch(e) {}
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Button variant="ghost" asChild className="rounded-xl"><Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste</Link></Button>

      <Card className="border-t-8 border-t-primary shadow-2xl rounded-[32px] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl"><UserPlus className="h-8 w-8 text-primary" /></div>
            <div>
              <CardTitle className="text-2xl font-black uppercase italic tracking-tight">Nouveau Participant</CardTitle>
              <CardDescription className="font-bold text-slate-400 uppercase text-[10px] tracking-widest italic">Configuration des accès et de la cohorte.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleCreateUser} className="space-y-10">
            <div className="space-y-6">
              <Label className="text-primary font-black uppercase italic text-xs tracking-widest flex items-center gap-2">
                <User className="h-4 w-4" /> 1. Identité & Sécurité
              </Label>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prénom</Label>
                  <Input placeholder="Ex: Jean" className="h-12 rounded-xl font-bold italic border-2" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom</Label>
                  <Input placeholder="Ex: Dupont" className="h-12 rounded-xl font-bold italic border-2" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email Professionnel</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-300" />
                    <Input type="email" placeholder="votre@email.com" className="pl-12 h-12 rounded-xl font-bold italic border-2" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mot de passe temporaire</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-4 w-4 text-slate-300" />
                    <Input type="text" placeholder="6 caractères min." className="pl-12 h-12 rounded-xl font-bold italic border-2" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t">
              <Label className="text-primary font-black uppercase italic text-xs tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> 2. Rôle & Affectation
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rôle sur la plateforme</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                    <SelectTrigger className="h-14 rounded-xl border-2 font-black italic shadow-sm bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Élève / Candidat</SelectItem>
                      <SelectItem value="coach">Coach / Formateur</SelectItem>
                      <SelectItem value="partner">Partenaire B2B</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Groupe / Cohorte</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-6 text-[9px] font-black uppercase rounded-lg", isCreatingNewGroup ? "text-primary bg-primary/5" : "text-slate-400")}
                      onClick={() => setIsCreatingNewGroup(!isCreatingNewGroup)}
                    >
                      {isCreatingNewGroup ? <><Check className="h-3 w-3 mr-1" /> Sélectionner existant</> : <><Plus className="h-3 w-3 mr-1" /> Créer nouveau</>}
                    </Button>
                  </div>

                  {isCreatingNewGroup ? (
                    <div className="relative animate-slide-up">
                      <Users className="absolute left-4 top-5 h-4 w-4 text-primary" />
                      <Input 
                        placeholder="Nom du nouveau groupe..." 
                        className="pl-12 h-14 rounded-xl border-2 font-black italic border-primary/30 bg-primary/5" 
                        value={formData.newGroupName}
                        onChange={(e) => setFormData({...formData, newGroupName: e.target.value})}
                      />
                    </div>
                  ) : (
                    <Select value={formData.groupId} onValueChange={(val) => setFormData({...formData, groupId: val})}>
                      <SelectTrigger className="h-14 rounded-xl border-2 font-black italic shadow-sm bg-white">
                        <SelectValue placeholder="Choisir un groupe..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sans groupe</SelectItem>
                        {groups?.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t">
              <Label className="text-primary font-black uppercase italic text-xs tracking-widest flex items-center gap-2">
                <Trophy className="h-4 w-4" /> 3. Périmètre des Examens
              </Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {AVAILABLE_EXAMS.map((exam) => {
                  const isChecked = selectedExams.includes(exam.id);
                  return (
                    <div 
                      key={exam.id} 
                      onClick={() => toggleExam(exam.id)}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-sm group",
                        isChecked ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                        isChecked ? "bg-primary border-primary" : "bg-white border-slate-200 group-hover:border-primary/50"
                      )}>
                        {isChecked && <Check className="h-4 w-4 text-white" strokeWidth={4} />}
                      </div>
                      <span className={cn("text-xs font-black uppercase italic", isChecked ? "text-primary" : "text-slate-500")}>{exam.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t">
              <Label className="text-primary font-black uppercase italic text-xs tracking-widest flex items-center gap-2">
                <Clock className="h-4 w-4" /> 4. Période de Validité
              </Label>
              <Card className="border-2 rounded-2xl overflow-hidden bg-slate-50/50">
                <Tabs value={validityType} onValueChange={setValidityType} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-100 rounded-none border-b-2">
                    <TabsTrigger value="days" className="font-black italic uppercase text-[10px]">Durée limitée (Jours)</TabsTrigger>
                    <TabsTrigger value="fixedDate" className="font-black italic uppercase text-[10px]">Date d'expiration fixe</TabsTrigger>
                  </TabsList>
                  <CardContent className="p-6">
                    <TabsContent value="days" className="mt-0">
                      <div className="flex items-center gap-4">
                        <Input type="number" min="1" value={formData.validityDays} onChange={(e) => setFormData({...formData, validityDays: e.target.value})} className="h-12 font-black italic border-2 rounded-xl text-center text-xl w-32" />
                        <span className="font-black italic uppercase text-slate-400 text-xs">Jours d'accès</span>
                      </div>
                    </TabsContent>
                    <TabsContent value="fixedDate" className="mt-0">
                      <Input type="date" value={formData.fixedDate} onChange={(e) => setFormData({...formData, fixedDate: e.target.value})} className="h-12 font-black italic border-2 rounded-xl" />
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-20 rounded-[24px] font-black uppercase tracking-widest text-xl shadow-2xl scale-105 transition-transform" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-3 h-8 w-8 animate-spin" /> Création en cours...</> : <><ShieldCheck className="mr-3 h-8 w-8" /> Activer l'accès</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
