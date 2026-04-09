
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, User, Sparkles } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
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
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charger l'historique Firestore
  useEffect(() => {
    if (!user || !db) return;
    
    logActivity(db, user.uid, 'chat_opened');

    const q = query(
      collection(db, 'chats', user.uid, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const firestoreMsgs = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Message));
      
      if (firestoreMsgs.length > 0) {
        setMessages(firestoreMsgs);
      }
    });
    
    return () => unsubscribe();
  }, [user, db]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || !user) return;

    const userContent = input;
    const userName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Élève';

    // 1. ACTION IMMÉDIATE : Mise à jour UI locale + Vidage input
    const tempUserMsg: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userContent,
      timestamp: new Date()
    };

    setInput('');
    setMessages(prev => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      // 2. SAUVEGARDE FIRESTORE (USER)
      await addDoc(collection(db, 'chats', user.uid, 'messages'), {
        userId: user.uid,
        userName: userName,
        role: 'user',
        content: userContent,
        timestamp: serverTimestamp()
      });

      // 3. SIMULATION RÉFLEXION (1.5s)
      setTimeout(async () => {
        const aiResponseText = "Merci pour votre question ! Le service de chat interactif n'est pas encore disponible. Nous finalisons la configuration pour vous offrir une expérience optimale. Revenez vers moi ultérieurement pour un coaching complet.";
        
        const aiMsg: Message = {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: aiResponseText,
          timestamp: new Date()
        };

        // 4. AFFICHAGE RÉPONSE + FIN TYPING
        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);

        // Sauvegarde Firestore (AI)
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
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header Large */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-[32px] shadow-xl border-2 shrink-0">
        <div className="bg-indigo-500/10 p-4 rounded-2xl">
          <MessageSquare className="h-8 w-8 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Assistant Coaching</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1.5 italic">Intelligence Artificielle Simu-lux • Mode Préparation</p>
        </div>
      </div>

      {/* Zone de Chat Large */}
      <Card className="flex-1 flex flex-col rounded-[48px] shadow-2xl border-none overflow-hidden bg-white min-h-0">
        <CardContent 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar scroll-smooth"
        >
          {/* Message de Bienvenue */}
          <div className="flex items-start gap-5 animate-slide-up">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="max-w-[85%] p-8 rounded-[40px] text-lg font-bold italic leading-relaxed shadow-sm bg-indigo-50 text-indigo-900 rounded-tl-none border-2 border-indigo-100">
              Bonjour {profile?.firstName || 'Candidat'} ! Je suis votre coach Simu-lux. Prêt à dominer l'examen ? Posez-moi vos questions sur le Mindset PMP, les processus du PMBOK ou les approches Agiles.
            </div>
          </div>

          {/* Liste des messages */}
          {messages.map((m) => (
            <div key={m.id} className={cn(
              "flex items-start gap-5 animate-slide-up",
              m.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                m.role === 'user' ? "bg-slate-900" : "bg-indigo-500"
              )}>
                {m.role === 'user' ? <User className="h-6 w-6 text-white" /> : <Sparkles className="h-6 w-6 text-white" />}
              </div>
              <div className={cn(
                "max-w-[75%] p-8 rounded-[40px] text-base font-bold italic leading-relaxed shadow-sm",
                m.role === 'user' ? "bg-slate-50 text-slate-800 rounded-tr-none border-2 border-slate-100" : "bg-indigo-50 text-indigo-900 rounded-tl-none border-2 border-indigo-100"
              )}>
                {m.content}
              </div>
            </div>
          ))}
          
          {/* Animation de réflexion */}
          {isTyping && (
            <div className="flex items-start gap-5 animate-slide-up">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-[32px] rounded-tl-none flex items-center gap-2 shadow-sm">
                <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce"></div>
                <span className="text-xs font-black text-indigo-400 uppercase italic ml-4 tracking-[0.2em]">Simu-lux réfléchit...</span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Input Bar Large */}
        <CardFooter className="p-8 border-t bg-slate-50/50 shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="w-full relative flex items-center gap-4"
          >
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décrivez une situation ou posez votre question ici..."
              className="flex-1 h-16 pl-8 pr-20 rounded-[24px] border-4 border-white shadow-2xl bg-white font-bold italic text-slate-700 text-lg focus-visible:ring-indigo-500"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isTyping}
              className="absolute right-3 top-3 h-10 w-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 shadow-lg transition-all active:scale-90"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
