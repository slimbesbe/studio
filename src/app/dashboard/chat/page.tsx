
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, User, Sparkles } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: any;
}

export default function ChatPage() {
  const { profile, user } = useUser();
  const db = useFirestore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charger l'historique en temps réel
  useEffect(() => {
    if (!user || !db) return;
    const q = query(
      collection(db, 'chats', user.uid, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [user, db]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userContent = input;
    setInput('');
    setIsLoading(true);

    try {
      // 1. Sauvegarder le message utilisateur
      await addDoc(collection(db, 'chats', user.uid, 'messages'), {
        userId: user.uid,
        userName: `${profile?.firstName} ${profile?.lastName}`,
        role: 'user',
        content: userContent,
        timestamp: serverTimestamp()
      });

      // 2. Simulation IA avec délai de 12 secondes (Mode Préparation)
      setTimeout(async () => {
        await addDoc(collection(db, 'chats', user.uid, 'messages'), {
          userId: user.uid,
          userName: 'Assistant Simu-lux',
          role: 'assistant',
          content: "Merci pour votre question ! Le service de chat interactif n'est pas encore disponible. Nous finalisons la configuration pour vous offrir une expérience optimale. Revenez vers nous ultérieurement pour un coaching complet.",
          timestamp: serverTimestamp()
        });
        setIsLoading(false);
      }, 12000);

    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center gap-4 bg-white p-6 rounded-[32px] shadow-xl border-2 shrink-0">
        <div className="bg-indigo-500/10 p-3 rounded-2xl">
          <MessageSquare className="h-8 w-8 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Chat Assistant PMP</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-1 italic">Votre coach IA personnel disponible 24/7.</p>
        </div>
      </div>

      <Card className="flex-1 rounded-[40px] shadow-2xl border-none overflow-hidden bg-white flex flex-col min-h-0">
        <CardContent 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
        >
          {/* Bulle de Bienvenue Initiale (toujours visible si pas de messages ou en haut) */}
          <div className="flex items-start gap-4 animate-slide-up">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="max-w-[80%] p-6 rounded-[32px] text-sm font-bold italic leading-relaxed shadow-sm bg-indigo-50 text-indigo-900 rounded-tl-none border-2 border-indigo-100">
              Bonjour {profile?.firstName || 'Candidat'} ! Je suis votre coach Simu-lux. Prêt à dominer l'examen ? Posez-moi vos questions sur le Mindset PMP, les processus du PMBOK ou les approches Agiles.
            </div>
          </div>

          {messages.map((m) => (
            <div key={m.id} className={cn(
              "flex items-start gap-4 animate-slide-up",
              m.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                m.role === 'user' ? "bg-slate-900" : "bg-indigo-500"
              )}>
                {m.role === 'user' ? <User className="h-5 w-5 text-white" /> : <Sparkles className="h-5 w-5 text-white" />}
              </div>
              <div className={cn(
                "max-w-[80%] p-6 rounded-[32px] text-sm font-bold italic leading-relaxed shadow-sm",
                m.role === 'user' ? "bg-slate-50 text-slate-800 rounded-tr-none" : "bg-indigo-50 text-indigo-900 rounded-tl-none border-2 border-indigo-100"
              )}>
                {m.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-[24px] rounded-tl-none flex items-center gap-1.5">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <span className="text-[10px] font-black text-indigo-400 uppercase italic ml-2">Réflexion du coach...</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-8 border-t bg-slate-50/50 shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="w-full relative"
          >
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décrivez une situation ou posez votre question ici..."
              className="h-16 pl-8 pr-20 rounded-[24px] border-4 border-white shadow-xl bg-white font-bold italic text-slate-700 focus-visible:ring-indigo-500"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-3 h-10 w-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 shadow-lg transition-transform active:scale-95"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
