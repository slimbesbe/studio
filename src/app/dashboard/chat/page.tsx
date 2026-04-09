"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, User, Sparkles } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/services/logging-service';

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
  
  // État local pour garantir l'affichage instantané
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charger l'historique Firestore et synchroniser
  useEffect(() => {
    if (!user || !db) return;
    
    logActivity(db, user.uid, 'chat_opened');

    const q = query(
      collection(db, 'chats', user.uid, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const firestoreMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      
      // On met à jour l'état uniquement si on a des messages en base
      // Cela évite d'écraser les messages locaux "en attente" si Firestore est lent
      if (firestoreMsgs.length > 0) {
        setMessages(firestoreMsgs);
      }
    });
    
    return () => unsubscribe();
  }, [user, db]);

  // Auto-scroll à chaque nouveau message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userContent = input;
    const userName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Élève';

    // ÉTAPE 1 : Affichage LOCAL IMMÉDIAT (Feedback instantané)
    const tempUserMsg: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userContent,
      timestamp: new Date()
    };

    setInput('');
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      // ÉTAPE 2 : Sauvegarde Firestore (Background)
      addDoc(collection(db, 'chats', user.uid, 'messages'), {
        userId: user.uid,
        userName: userName,
        role: 'user',
        content: userContent,
        timestamp: serverTimestamp()
      });

      // ÉTAPE 3 : Simulation de Réflexion du Coach
      setTimeout(async () => {
        const aiResponseText = "Merci pour votre question ! Le service de chat interactif n'est pas encore disponible. Nous finalisons la configuration pour vous offrir une expérience optimale. Revenez vers moi ultérieurement pour un coaching complet.";
        
        const aiMsg: Message = {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: aiResponseText,
          timestamp: new Date()
        };

        // Mise à jour de l'UI locale
        setMessages(prev => [...prev, aiMsg]);
        setIsLoading(false);

        // Sauvegarde de la réponse AI en base
        await addDoc(collection(db, 'chats', user.uid, 'messages'), {
          userId: user.uid,
          userName: 'Assistant Simu-lux',
          role: 'assistant',
          content: aiResponseText,
          timestamp: serverTimestamp()
        });
      }, 1500);

    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header compact */}
      <div className="flex items-center gap-4 bg-white p-5 rounded-[28px] shadow-lg border-2 shrink-0">
        <div className="bg-indigo-500/10 p-3 rounded-2xl">
          <MessageSquare className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Assistant Coaching</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] mt-1 italic">Intelligence Artificielle Simu-lux</p>
        </div>
      </div>

      {/* Zone de Chat */}
      <Card className="flex-1 flex flex-col rounded-[40px] shadow-2xl border-none overflow-hidden bg-white min-h-0">
        <CardContent 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar scroll-smooth"
        >
          {/* Message de Bienvenue (Statique si vide) */}
          {messages.length === 0 && !isLoading && (
            <div className="flex items-start gap-4 animate-slide-up">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="max-w-[85%] p-6 rounded-[32px] text-sm font-bold italic leading-relaxed shadow-sm bg-indigo-50 text-indigo-900 rounded-tl-none border-2 border-indigo-100">
                Bonjour {profile?.firstName || 'Candidat'} ! Je suis votre coach Simu-lux. Posez-moi vos questions sur le Mindset PMP, les processus ou l'Agilité.
              </div>
            </div>
          )}

          {/* Liste des messages */}
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
          
          {/* Animation de réflexion */}
          {isLoading && (
            <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="bg-indigo-50 border-2 border-indigo-100 p-5 rounded-[24px] rounded-tl-none flex items-center gap-1.5">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <span className="text-[10px] font-black text-indigo-400 uppercase italic ml-3 tracking-widest">Réflexion...</span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Input Fixe en bas */}
        <CardFooter className="p-6 border-t bg-slate-50/50 shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="w-full relative flex items-center gap-3"
          >
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décrivez une situation ou posez votre question..."
              className="flex-1 h-14 pl-6 pr-14 rounded-[20px] border-4 border-white shadow-xl bg-white font-bold italic text-slate-700 focus-visible:ring-indigo-500"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 shadow-lg transition-all active:scale-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
