
"use client";

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Users, ArrowRight, Loader2, ChevronLeft, 
  ShieldCheck, GraduationCap, Building2, 
  Pencil
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function ConfigGroupsPage() {
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const isSA = profile?.role === 'super_admin';
  const isAdmin = isSA || profile?.role === 'admin';
  const isCoach = profile?.role === 'coach';
  const isPartner = profile?.role === 'partner';

  const groupsQuery = useMemoFirebase(() => {
    const base = collection(db, 'coachingGroups');
    if (isSA || isAdmin) return query(base, orderBy('createdAt', 'desc'));
    if (isCoach) return query(base, where('coachId', '==', profile?.id), orderBy('createdAt', 'desc'));
    if (isPartner) return query(base, where('partnerId', '==', profile?.id), orderBy('createdAt', 'desc'));
    return null;
  }, [db, isSA, isAdmin, isCoach, isPartner, profile?.id]);

  const { data: groups, isLoading } = useCollection(groupsQuery);

  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: allUsers } = useCollection(usersQuery);

  const coaches = useMemo(() => allUsers?.filter(u => u.role === 'coach') || [], [allUsers]);
  const partners = useMemo(() => allUsers?.filter(u => u.role === 'partner') || [], [allUsers]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coachId: '',
    partnerId: '',
    maxUsers: 25,
    status: 'active'
  });

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '', coachId: '', partnerId: '', maxUsers: 25, status: 'active' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: any) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      coachId: group.coachId || '',
      partnerId: group.partnerId || '',
      maxUsers: group.maxUsers || 25,
      status: group.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const gRef = editingGroup ? doc(db, 'coachingGroups', editingGroup.id) : doc(collection(db, 'coachingGroups'));
      const data = {
        ...formData,
        id: gRef.id,
        updatedAt: serverTimestamp(),
        createdAt: editingGroup ? editingGroup.createdAt : serverTimestamp()
      };
      
      if (isPartner && !isSA) data.partnerId = profile!.id;

      await setDoc(gRef, data, { merge: true });
      toast({ title: editingGroup ? "Groupe mis à jour" : "Groupe créé" });
      setIsModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2"><Link href="/admin/coaching"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Gestion des Groupes</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Cohortes, promotions et partenaires B2B.</p>
          </div>
        </div>
        {(isAdmin || isPartner) && (
          <Button onClick={handleOpenCreate} className="bg-indigo-600 h-16 px-10 rounded-2xl font-black uppercase tracking-widest shadow-2xl scale-105 transition-transform hover:bg-indigo-700">
            <Plus className="mr-3 h-6 w-6" /> Nouveau Groupe
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups?.map((g) => {
          const membersCount = allUsers?.filter(u => u.groupId === g.id).length || 0;
          const coachName = coaches.find(c => c.id === g.coachId) ? `${coaches.find(c => c.id === g.coachId).firstName} ${coaches.find(c => c.id === g.coachId).lastName}` : 'Non assigné';
          const partnerName = partners.find(p => p.id === g.partnerId) ? `${partners.find(p => p.id === g.partnerId).firstName} ${partners.find(p => p.id === g.partnerId).lastName}` : 'Libre';

          return (
            <Card key={g.id} className="rounded-[40px] shadow-xl border-none overflow-hidden bg-white group hover:shadow-2xl transition-all">
              <div className={cn("h-3 w-full", g.status === 'active' ? "bg-emerald-500" : "bg-slate-300")} />
              <CardHeader className="p-8 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                    <Users className="h-7 w-7" />
                  </div>
                  <Badge variant={g.status === 'active' ? 'default' : 'secondary'} className="font-black italic uppercase text-[10px]">
                    {g.status}
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-black italic uppercase tracking-tight text-slate-800 line-clamp-1">{g.name}</CardTitle>
                <CardDescription className="font-bold text-slate-400 text-[10px] uppercase tracking-widest mt-1 italic">{g.description || 'Pas de description.'}</CardDescription>
              </CardHeader>
              
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><GraduationCap className="h-2 w-2" /> Coach</p>
                    <p className="font-bold text-xs italic text-slate-700 truncate">{coachName}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Building2 className="h-2 w-2" /> Partenaire</p>
                    <p className="font-bold text-xs italic text-slate-700 truncate">{partnerName}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-y-2 border-dashed border-slate-100 py-4">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic">Membres</p>
                    <p className="text-2xl font-black text-primary italic">{membersCount}<span className="text-xs text-slate-300 font-bold ml-1">/ {g.maxUsers || '∞'}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(g)} className="h-10 w-10 rounded-xl border-2 hover:bg-indigo-50 text-indigo-600">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button asChild className="h-10 px-4 rounded-xl bg-slate-900 font-black uppercase text-[10px] shadow-lg">
                      <Link href={`/admin/coaching/config-groups/${g.id}`}>Gérer <ArrowRight className="ml-2 h-3 w-3" /></Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-[40px] p-12 border-4 shadow-3xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase italic text-indigo-600">
              {editingGroup ? "Editer le Groupe" : "Nouvelle Cohorte"}
            </DialogTitle>
            <DialogDescription className="font-bold text-slate-500 italic uppercase text-xs tracking-widest mt-2">Paramétrez votre périmètre de coaching.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-8">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Nom de la Cohorte</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Mars 2026 - PMP Masterclass" 
                className="h-14 rounded-xl font-black text-lg italic border-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Coach Responsable</Label>
                <Select value={formData.coachId} onValueChange={(val) => setFormData({...formData, coachId: val})}>
                  <SelectTrigger className="h-14 rounded-xl border-2 font-bold italic">
                    <SelectValue placeholder="Choisir un coach" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Partenaire B2B</Label>
                <Select value={formData.partnerId} onValueChange={(val) => setFormData({...formData, partnerId: val})} disabled={isPartner && !isSA}>
                  <SelectTrigger className="h-14 rounded-xl border-2 font-bold italic">
                    <SelectValue placeholder="Libre / Individuel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun Partenaire</SelectItem>
                    {partners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Capacité Max (Licences)</Label>
                <Input 
                  type="number" 
                  value={formData.maxUsers} 
                  onChange={(e) => setFormData({...formData, maxUsers: parseInt(e.target.value) || 0})}
                  className="h-14 rounded-xl font-black text-center text-lg italic border-2"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Statut</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                  <SelectTrigger className="h-14 rounded-xl border-2 font-bold italic">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveGroup} disabled={isSubmitting || !formData.name.trim()} className="h-16 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700 flex-1 shadow-2xl uppercase">
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <><ShieldCheck className="mr-2 h-6 w-6" /> Enregistrer</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
