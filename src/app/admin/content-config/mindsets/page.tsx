
"use client";

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Pencil, 
  Download, 
  Upload, 
  Brain,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function ManageMindsets() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const mindsetsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'mindsets');
  }, [db, user]);
  const { data: mindsets, isLoading } = useCollection(mindsetsQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States pour réinitialisation
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ text: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ text: item.text });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.text.trim()) return;
    setIsSubmitting(true);
    try {
      const ref = editingItem ? doc(db, 'mindsets', editingItem.id) : doc(collection(db, 'mindsets'));
      await setDoc(ref, {
        id: ref.id,
        text: formData.text,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: editingItem ? "Mindset mis à jour" : "Mindset créé" });
      setIsModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce mindset ?")) return;
    await deleteDoc(doc(db, 'mindsets', id));
    toast({ title: "Supprimé" });
  };

  const handleOpenReset = () => {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    setSecurityCode(code);
    setUserInputCode('');
    setIsResetModalOpen(true);
  };

  const performReset = async () => {
    if (userInputCode !== securityCode) return;
    setIsResetting(true);
    try {
      const snap = await getDocs(collection(db, 'mindsets'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      toast({ title: "Tous les mindsets ont été effacés." });
      setIsResetModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsResetting(false);
    }
  };

  const exportModel = () => {
    const ws = XLSX.utils.json_to_sheet([{ "Mindset_Text": "Analysez toujours l'impact avant toute action." }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mindsets");
    XLSX.writeFile(wb, "modele_mindsets.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        
        const batch = writeBatch(db);
        json.forEach((row) => {
          const text = row["Mindset_Text"] || row.text;
          if (text) {
            const ref = doc(collection(db, 'mindsets'));
            batch.set(ref, { id: ref.id, text, updatedAt: serverTimestamp() });
          }
        });
        await batch.commit();
        toast({ title: "Import réussi" });
      } catch (err) {
        toast({ variant: "destructive", title: "Erreur import" });
      }
    };
    reader.readAsBinaryString(file);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm"><Link href="/admin/content-config"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Mindsets PMI®</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Gérez les conseils affichés sur le dashboard.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportModel} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2"><Download className="mr-2 h-4 w-4" /> Modèle</Button>
          <div className="relative">
            <Button variant="outline" className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 bg-emerald-50 text-emerald-600 border-emerald-100"><Upload className="mr-2 h-4 w-4" /> Import</Button>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx,.xls" onChange={handleImport} />
          </div>
          <Button variant="outline" onClick={handleOpenReset} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 text-destructive border-destructive/20 hover:bg-destructive/5"><Trash2 className="mr-2 h-4 w-4" /> Vider tout</Button>
          <Button onClick={handleOpenCreate} className="bg-primary h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl"><Plus className="mr-2 h-5 w-5" /> Ajouter</Button>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Texte du Mindset</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mindsets?.map((m) => (
                <TableRow key={m.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                  <TableCell className="px-10">
                    <p className="font-bold text-slate-700 italic text-lg leading-relaxed">"{m.text}"</p>
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(m)} className="h-12 w-12 rounded-xl border-2 hover:bg-indigo-50 text-indigo-600 border-indigo-50"><Pencil className="h-5 w-5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} className="h-12 w-12 rounded-xl border-2 hover:bg-red-50 text-red-600 border-red-50"><Trash2 className="h-5 w-5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!mindsets || mindsets.length === 0) && (
                <TableRow><TableCell colSpan={2} className="h-64 text-center text-slate-300 font-black uppercase italic tracking-widest">Aucun mindset configuré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-[40px] p-12 border-4 shadow-3xl max-w-2xl">
          <DialogHeader><DialogTitle className="text-3xl font-black uppercase italic text-primary">{editingItem ? "Modifier" : "Nouveau"} Mindset</DialogTitle></DialogHeader>
          <div className="py-8 space-y-4">
            <Label className="font-black uppercase text-[10px] text-slate-400 italic">Contenu du conseil</Label>
            <Input value={formData.text} onChange={(e) => setFormData({ text: e.target.value })} className="h-16 rounded-xl font-bold italic border-2 text-lg" placeholder="Ex: Face à un conflit, privilégiez la collaboration..." />
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="h-16 rounded-2xl font-black bg-primary flex-1 shadow-2xl uppercase">
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <CheckCircle2 className="mr-2 h-6 w-6" />} Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetModalOpen} onOpenChange={(val) => !isResetting && setIsResetModalOpen(val)}>
        <DialogContent className="rounded-[40px] p-12 border-8 border-destructive shadow-3xl max-w-xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="bg-destructive p-4 rounded-full shadow-lg"><AlertTriangle className="h-12 w-12 text-white" /></div>
            <DialogTitle className="text-4xl font-black uppercase italic text-destructive tracking-tighter">Action Critique</DialogTitle>
            <DialogDescription className="text-lg font-bold text-slate-600 leading-relaxed uppercase italic">Voulez-vous supprimer TOUS les mindsets enregistrés ?</DialogDescription>
          </DialogHeader>
          <div className="py-10 space-y-8">
            <div className="bg-slate-50 p-8 rounded-3xl border-4 border-dashed text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Code de sécurité</p>
              <p className="text-6xl font-black tracking-widest text-primary tabular-nums">{securityCode}</p>
            </div>
            <div className="space-y-3">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic ml-2">Confirmez par le code</Label>
              <Input value={userInputCode} onChange={(e) => setUserInputCode(e.target.value)} maxLength={8} className="h-16 rounded-2xl border-4 font-black text-center text-3xl italic tracking-widest" />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsResetModalOpen(false)} disabled={isResetting}>Annuler</Button>
            <Button variant="destructive" disabled={userInputCode !== securityCode || isResetting} onClick={performReset} className="h-16 rounded-2xl font-black uppercase flex-1 shadow-2xl text-lg italic">
              {isResetting ? <Loader2 className="animate-spin h-6 w-6" /> : <><CheckCircle2 className="mr-2 h-6 w-6" /> CONFIRMER</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
