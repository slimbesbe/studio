
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Sparkles, Mail, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function CoachHubPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in py-16 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Parler au Coach</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Choisissez votre mode d'assistance Simu-lux</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Option 1: Direct Message */}
        <Card className="rounded-[60px] border-none shadow-2xl bg-white p-12 space-y-8 group hover:scale-[1.02] transition-all overflow-hidden relative">
          <div className="absolute -top-10 -right-10 bg-indigo-50 h-40 w-40 rounded-full" />
          <div className="bg-indigo-500/10 w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto shadow-inner relative z-10">
            <Mail className="h-10 w-10 text-indigo-600" />
          </div>
          <div className="space-y-4 text-center relative z-10">
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
              1/ Message Direct
            </CardTitle>
            <CardDescription className="text-slate-500 font-bold italic leading-relaxed text-sm">
              Envoyez un message à nos formateurs experts. Vous recevrez une réponse sous 24h ouvrées directement sur la plateforme.
            </CardDescription>
          </div>
          <Button asChild className="w-full h-16 rounded-[24px] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl">
            <Link href="/dashboard/message-admin" className="flex items-center gap-2">
              Envoyer un message <ChevronRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </Button>
        </Card>

        {/* Option 2: AI Chat */}
        <Card className="rounded-[60px] border-none shadow-2xl bg-slate-900 p-12 space-y-8 group hover:scale-[1.02] transition-all text-white overflow-hidden relative">
          <div className="absolute -top-10 -right-10 bg-white/5 h-40 w-40 rounded-full" />
          <div className="bg-white/10 w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto shadow-inner relative z-10">
            <Sparkles className="h-10 w-10 text-indigo-400" />
          </div>
          <div className="space-y-4 text-center relative z-10">
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter leading-tight">
              2/ Chat Assistant
            </CardTitle>
            <CardDescription className="text-slate-400 font-bold italic leading-relaxed text-sm">
              Coaching instantané disponible 24/7. Idéal pour éclaircir un concept du PMBOK® ou affiner votre mindset PMI®.
            </CardDescription>
          </div>
          <Button asChild className="w-full h-16 rounded-[24px] bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-widest shadow-xl">
            <Link href="/dashboard/chat" className="flex items-center gap-2">
              Lancer l'IA <ChevronRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
