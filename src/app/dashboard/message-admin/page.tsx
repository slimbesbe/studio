"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, Loader2, ChevronLeft, CheckCircle2, Info } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function MessageAdminPage() {
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'supportMessages'), {
        userId: profile.id,
        userEmail: profile.email,
        userName: `${profile.firstName} ${profile.lastName}`,
        subject: formData.subject,
        message: formData.message,
        status: 'unread',
        createdAt: serverTimestamp()
      });
      
      setIsSent(true);
      toast({ title: "Message envoyé", description: "L'équipe Simu-lux a bien reçu votre demande." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'envoyer le message." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-10 animate-fade-in px-4">
        <Card className="rounded-[60px] shadow-2xl border-none p-16 space-y-10 bg-white">
          <div className="bg-emerald-50 h-24 w-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Message Envoyé !</h1>
            <p className="text-lg font-bold text-slate-500 italic">
              Merci {profile?.firstName}. Votre message a été transmis à l'équipe pédagogique ainsi qu'au support technique. Nous reviendrons vers vous très prochainement.
            </p>
          </div>
          <Button asChild className="h-16 w-full rounded-2xl bg-slate-900 text-white font-black uppercase italic tracking-widest shadow-xl">
            <Link href="/dashboard">Retour au Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-2xl border-2 shadow-sm">
          <Link href="/dashboard/coach"><ChevronLeft /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
            <Mail className="h-8 w-8 text-indigo-600" /> Nous contacter
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-1 italic">Assistance personnalisée Simu-lux</p>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 p-8 border-b">
          <CardTitle className="text-xl font-black uppercase italic tracking-tight">Formulaire de support</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Objet du message</Label>
              <Input 
                required
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Ex: Question sur la facturation, Bug simulation..."
                className="h-14 rounded-xl font-bold italic border-2 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic">Votre message</Label>
              <Textarea 
                required
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Décrivez votre besoin en détail..."
                className="min-h-[200px] rounded-xl font-bold italic border-2 bg-white"
              />
            </div>
            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <Info className="h-5 w-5 text-indigo-500 shrink-0" />
              <p className="text-[10px] font-bold text-indigo-600 leading-relaxed italic">
                Une copie de ce message sera envoyée à <span className="underline font-black">support@simu-lux.com</span> pour garantir un suivi réactif.
              </p>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[24px] bg-primary hover:bg-primary/90 text-white font-black uppercase italic tracking-widest shadow-xl text-lg">
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <><Send className="mr-3 h-6 w-6" /> Envoyer le message</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
