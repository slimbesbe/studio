
"use client";

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Download, 
  Upload, 
  Loader2, 
  LayoutGrid, 
  Table as TableIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { MatrixCellDialog } from '@/components/admin/matrice/MatrixCellDialog';
import { MatrixBulkImport } from '@/components/admin/matrice/MatrixBulkImport';

const DOMAINS = [
  { id: 'People', label: 'PEOPLE', key: 'people' },
  { id: 'Process', label: 'PROCESS', key: 'process' },
  { id: 'Business', label: 'BUSINESS ENVIRONMENT', key: 'business' }
];

const APPROACHES = [
  { id: 'Predictive', label: 'PREDICTIVE', key: 'predictive' },
  { id: 'Agile', label: 'AGILE', key: 'agile' },
  { id: 'Hybrid', label: 'HYBRID', key: 'hybrid' }
];

export default function AdminMatriceConfig() {
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedCell, setSelectedCell] = useState<{domain: string, approach: string} | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // FETCH ÉTANCHE : Uniquement les questions marquées avec silo: 'matrix'
  const questionsQuery = useMemoFirebase(() => {
    return query(
      collection(db, 'questions'),
      where('silo', '==', 'matrix')
    );
  }, [db]);
  const { data: allQuestions, isLoading } = useCollection(questionsQuery);

  const matrixStats = useMemo(() => {
    const stats: Record<string, number> = {};
    if (!allQuestions) return stats;

    allQuestions.forEach(q => {
      // SÉCURITÉ ABSOLUE : On ignore tout ce qui n'est pas silo matrix
      if (q.silo !== 'matrix') return;

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
        const ws = XLSX.utils.json_to_sheet([{ "Code": `Q-${sheetName}`, "Énoncé": "...", "option 1": "A", "option 2": "B", "correct": "A", "Justification": "..." }]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    });
    XLSX.writeFile(wb, "modele_matrice_9_feuilles.xlsx");
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-10 animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm">
            <Link href="/admin/content-config"><ChevronLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-indigo-600 flex items-center gap-4">
              <LayoutGrid className="h-10 w-10 text-emerald-500" /> Matrice Magique
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Partitionnement Physique (Silo : MATRIX).</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadModel} className="h-14 px-6 rounded-2xl font-black uppercase text-xs italic border-2 gap-2"><Download className="h-4 w-4" /> Modèle</Button>
          <Button onClick={() => setIsBulkImportOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg gap-2 text-white">
            <Upload className="h-4 w-4" /> Import Silo Matrix
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[60px] p-12 lg:p-20 shadow-2xl border-2 border-slate-50 overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* HEADERS COLONNES */}
          <div className="grid grid-cols-4 gap-8 mb-12">
            <div />
            {APPROACHES.map(a => (
              <div key={a.id} className="text-center flex flex-col items-center justify-center gap-2">
                <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 italic">
                   {a.label}
                </span>
              </div>
            ))}
          </div>

          {/* GRILLE 3x3 */}
          <div className="space-y-8">
            {DOMAINS.map(d => (
              <div key={d.id} className="grid grid-cols-4 gap-8 items-stretch">
                <div className="flex items-center justify-end pr-10">
                  <span className="text-sm font-black uppercase italic text-slate-800 text-right leading-tight tracking-widest">
                    {d.label}
                  </span>
                </div>
                
                {APPROACHES.map(a => {
                  const key = `${d.id}-${a.id}`;
                  const count = matrixStats[key] || 0;
                  const filename = `${d.id}_${a.id}.xlsx`.toUpperCase();

                  return (
                    <button 
                      key={`${d.key}_${a.key}`}
                      onClick={() => setSelectedCell({ domain: d.id, approach: a.id })}
                      className={cn(
                        "group relative rounded-[40px] border-none p-10 transition-all duration-300 flex flex-col items-center justify-center gap-2 text-center hover:scale-[1.03] hover:shadow-2xl shadow-sm bg-[#f0fdf4] hover:bg-[#dcfce7]"
                      )}
                    >
                      <div className="flex flex-col items-center gap-0">
                        <span className="text-6xl font-black italic tracking-tighter text-emerald-800 leading-none">{count}</span>
                        <span className="text-[11px] font-black uppercase text-emerald-700/60 tracking-[0.2em] mt-2">QUESTIONS</span>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest italic opacity-80">
                          {filename}
                        </p>
                      </div>

                      <div className="mt-4">
                        <Badge className="bg-emerald-600 text-white border-none font-black italic uppercase text-[9px] px-6 py-2 rounded-full tracking-[0.3em] shadow-md">
                          READY
                        </Badge>
                      </div>

                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TableIcon className="h-5 w-5 text-emerald-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <MatrixCellDialog isOpen={!!selectedCell} onClose={() => setSelectedCell(null)} domain={selectedCell?.domain || ''} approach={selectedCell?.approach || ''} />
      <MatrixBulkImport isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} />
    </div>
  );
}
