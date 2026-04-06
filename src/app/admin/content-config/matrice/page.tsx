"use client";

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Download, 
  Upload, 
  RotateCcw, 
  Loader2, 
  LayoutGrid, 
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Table as TableIcon,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { MatrixCellDialog } from '@/components/admin/matrice/MatrixCellDialog';
import { MatrixBulkImport } from '@/components/admin/matrice/MatrixBulkImport';

const DOMAINS = [
  { id: 'People', label: 'People', key: 'people' },
  { id: 'Process', label: 'Process', key: 'process' },
  { id: 'Business', label: 'Business Environment', key: 'business' }
];

const APPROACHES = [
  { id: 'Predictive', label: 'Predictive', key: 'predictive' },
  { id: 'Agile', label: 'Agile', key: 'agile' },
  { id: 'Hybrid', label: 'Hybrid', key: 'hybrid' }
];

export default function AdminMatriceConfig() {
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedCell, setSelectedCell] = useState<{domain: string, approach: string} | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Fetch all questions to build matrix overview
  const questionsQuery = useMemoFirebase(() => {
    return query(collection(db, 'questions'));
  }, [db]);
  const { data: allQuestions, isLoading } = useCollection(questionsQuery);

  const matrixStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allQuestions?.forEach(q => {
      const d = q.tags?.domain === 'Processus' ? 'Process' : (q.tags?.domain || 'Process');
      const a = q.tags?.approach || 'Predictive';
      const key = `${d}-${a}`;
      stats[key] = (stats[key] || 0) + 1;
    });
    return stats;
  }, [allQuestions]);

  const downloadModel = () => {
    const wb = XLSX.utils.book_new();
    DOMAINS.forEach(d => {
      APPROACHES.forEach(a => {
        const sheetName = `${d.key}_${a.key}`;
        const ws = XLSX.utils.json_to_sheet([
          { 
            "Code": `PMP-${sheetName.toUpperCase()}-001`,
            "Énoncé": "Exemple de question...",
            "option1": "Choix A",
            "option2": "Choix B",
            "option3": "Choix C",
            "option4": "Choix D",
            "correct": "B",
            "Justification": "Explication PMI mindset...",
            "Difficulté": "Medium"
          }
        ]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    });
    XLSX.writeFile(wb, "modele_matrice_9_feuilles.xlsx");
    toast({ title: "Modèle téléchargé" });
  };

  const handleResetAll = async () => {
    if (!confirm("ACTION CRITIQUE : Voulez-vous vider TOUTE la banque de questions ?")) return;
    setIsResetting(true);
    try {
      const batch = writeBatch(db);
      allQuestions?.forEach(q => batch.delete(doc(db, 'questions', q.id)));
      await batch.commit();
      toast({ title: "Banque de questions réinitialisée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur reset" });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-10 animate-fade-in pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm">
            <Link href="/admin/content-config"><ChevronLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-4">
              <LayoutGrid className="h-10 w-10 text-accent" /> Configuration Matrice
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Gestion granulaire par intersection (9 cellules).</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadModel} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 gap-2">
            <Download className="h-4 w-4" /> Modèle Excel
          </Button>
          <Button onClick={() => setIsBulkImportOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs italic shadow-lg gap-2">
            <Upload className="h-4 w-4" /> Import Global
          </Button>
          <Button variant="outline" onClick={handleResetAll} disabled={isResetting} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 text-destructive border-destructive/20 hover:bg-red-50 gap-2">
            {isResetting ? <Loader2 className="animate-spin h-4 w-4" /> : <RotateCcw className="h-4 w-4" />} Reset
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <Card className="rounded-[48px] border-none shadow-2xl bg-white p-12 overflow-hidden">
        <div className="grid grid-cols-4 gap-8">
          {/* Header row */}
          <div />
          {APPROACHES.map(a => (
            <div key={a.id} className="text-center py-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic flex items-center justify-center gap-2">
                <Settings2 className="h-3 w-3" /> {a.label}
              </span>
            </div>
          ))}

          {/* Data rows */}
          {DOMAINS.map(d => (
            <div key={d.id} className="contents">
              <div className="flex items-center justify-end pr-8">
                <span className="text-sm font-black uppercase italic text-slate-600 text-right leading-tight">
                  {d.label}
                </span>
              </div>
              {APPROACHES.map(a => {
                const count = matrixStats[`${d.id}-${a.id}`] || 0;
                const sheetName = `${d.key}_${a.key}`;
                const status = count > 0 ? 'ready' : 'empty';

                return (
                  <button 
                    key={sheetName}
                    onClick={() => setSelectedCell({ domain: d.id, approach: a.id })}
                    className={cn(
                      "group relative rounded-[32px] border-4 p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center hover:scale-[1.03] hover:shadow-2xl",
                      status === 'ready' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-slate-50 border-slate-100 text-slate-300"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-4xl font-black italic tracking-tighter leading-none">{count}</span>
                      <span className="text-[9px] font-black uppercase opacity-60">Questions</span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase tracking-widest italic">{sheetName}.xlsx</p>
                      <Badge className={cn(
                        "font-black italic uppercase text-[8px] border-none px-3",
                        status === 'ready' ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                      )}>
                        {status === 'ready' ? 'READY' : 'NOT CONFIGURED'}
                      </Badge>
                    </div>

                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TableIcon className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Info Card */}
      <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-8 rounded-[32px] flex items-start gap-6 animate-slide-up">
        <Info className="h-8 w-8 text-primary shrink-0" />
        <div className="space-y-2">
          <h4 className="font-black uppercase italic text-primary">Architecture multi-feuilles</h4>
          <p className="text-sm font-bold text-slate-600 italic leading-relaxed">
            L'import global attend un fichier Excel contenant précisément 9 onglets nommés d'après les clés techniques (ex: people_agile). 
            Le système remplace ou ajoute les questions selon votre choix lors de l'import.
          </p>
        </div>
      </div>

      <MatrixCellDialog 
        isOpen={!!selectedCell} 
        onClose={() => setSelectedCell(null)} 
        domain={selectedCell?.domain || ''} 
        approach={selectedCell?.approach || ''} 
      />

      <MatrixBulkImport 
        isOpen={isBulkImportOpen} 
        onClose={() => setIsBulkImportOpen(false)} 
      />
    </div>
  );
}
