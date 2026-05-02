
'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Edit2, Zap } from 'lucide-react';
import { TargetExamDateModal } from './TargetExamDateModal';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { isValid } from 'date-fns';

interface TargetExamDateCardProps {
  profile: any;
}

export function TargetExamDateCard({ profile }: TargetExamDateCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const targetDate = profile?.targetExamDate;
  
  const safeParseDate = (input: any): Date | null => {
    if (!input) return null;
    try {
      if (input instanceof Timestamp) return input.toDate();
      if (input.seconds) return new Timestamp(input.seconds, input.nanoseconds || 0).toDate();
      const date = new Date(input);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  };

  const dateStats = useMemo(() => {
    const target = safeParseDate(targetDate);
    if (!target) return { status: 'missing', days: null, label: null };
    
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const status = diffDays < 0 ? 'overdue' : diffDays <= 14 ? 'urgent' : 'on_track';
    const label = target.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    return { status, days: diffDays, label };
  }, [targetDate]);

  return (
    <>
      <Card className={cn(
        "rounded-2xl border-none shadow-sm p-4 h-full flex flex-col justify-between transition-all",
        dateStats.status === 'missing' ? "bg-slate-50 border-2 border-dashed border-slate-200" :
        dateStats.status === 'overdue' ? "bg-red-50 border-l-4 border-red-500" :
        dateStats.status === 'urgent' ? "bg-amber-50 border-l-4 border-amber-500" :
        "bg-emerald-50 border-l-4 border-emerald-500"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className={cn(
              "h-4 w-4",
              dateStats.status === 'missing' ? "text-slate-400" :
              dateStats.status === 'overdue' ? "text-red-600" :
              dateStats.status === 'urgent' ? "text-amber-600" :
              "text-emerald-600"
            )} />
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Date d'examen</h3>
          </div>
          {dateStats.status !== 'missing' && (
            <Badge className={cn(
              "text-[8px] font-black uppercase italic",
              dateStats.status === 'overdue' ? "bg-red-100 text-red-700" :
              dateStats.status === 'urgent' ? "bg-amber-100 text-amber-700" :
              "bg-emerald-100 text-emerald-700"
            )}>
              {dateStats.status === 'overdue' ? 'Dépassée' : dateStats.status === 'urgent' ? 'Urgent' : 'En cours'}
            </Badge>
          )}
        </div>

        <div className="py-2">
          {dateStats.status === 'missing' ? (
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 italic">Aucune date définie</p>
              <p className="text-[9px] text-slate-400 leading-tight">Définissez une cible pour activer le suivi intelligent.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-lg font-black italic text-slate-900 leading-none">{dateStats.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className={cn(
                  "text-xl font-black italic tracking-tighter",
                  dateStats.days! <= 7 ? "text-red-600" : "text-slate-700"
                )}>
                  {dateStats.days! > 0 ? `J-${dateStats.days}` : `Jour J`}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          {dateStats.status === 'missing' ? (
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-black uppercase rounded-xl h-10 px-6 text-[10px] tracking-widest shadow-lg scale-105 transition-transform"
            >
              <Zap className="h-3.5 w-3.5 mr-2 fill-white" /> 
              Définir ma date
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsModalOpen(true)}
              className="h-8 px-3 rounded-lg font-black uppercase text-[9px] tracking-widest italic hover:bg-black/5"
            >
              <Edit2 className="h-3 w-3 mr-1.5" /> 
              Mettre à jour
            </Button>
          )}
        </div>
      </Card>

      <TargetExamDateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        currentDate={targetDate}
      />
    </>
  );
}
