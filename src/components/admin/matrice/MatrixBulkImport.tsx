
"use client";

import { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  CheckCircle2, 
  FileSpreadsheet, 
  XCircle, 
  Upload, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

const SHEET_MAPPING = [
  { name: 'people_predictive', domain: 'People', approach: 'Predictive' },
  { name: 'people_agile', domain: 'People', approach: 'Agile' },
  { name: 'people_hybrid', domain: 'People', approach: 'Hybrid' },
  { name: 'process_predictive', domain: 'Process', approach: 'Predictive' },
  { name: 'process_agile', domain: 'Process', approach: 'Agile' },
  { name: 'process_hybrid', domain: 'Process', approach: 'Hybrid' },
  { name: 'business_predictive', domain: 'Business', approach: 'Predictive' },
  { name: 'business_agile', domain: 'Business', approach: 'Agile' },
  { name: 'business_hybrid', domain: 'Business', approach: 'Hybrid' },
];

export function MatrixBulkImport({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedSheets, setParsedSheets] = useState<Record<string, any[]>>({});
  const [errors, setErrors] = useState<string[]>([]);
  
  const { firestore: db } = useFirebase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setErrors([]);
    setParsedSheets({});
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const results: Record<string, any[]> = {};
        const missingSheets: string[] = [];

        SHEET_MAPPING.forEach(m => {
          const sheet = workbook.Sheets[m.name];
          if (sheet) {
            const json = XLSX.utils.sheet_to_json(sheet);
            results[m.name] = json.map(row => ({
              ...row,
              domain: m.domain,
              approach: m.approach
            }));
          } else {
            missingSheets.push(m.name);
          }
        });

        if (missingSheets.length > 0) {
          setErrors([`Feuilles manquantes : ${missingSheets.join(', ')}`]);
        } else {
          setParsedSheets(results);
        }
      } catch (err) {
        setErrors(["Erreur critique lors de la lecture du fichier."]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (Object.keys(parsedSheets).length === 0) return;
    setIsImporting(true);
    setProgress(0);

    try {
      const allRows = Object.values(parsedSheets).flat();
      const total = allRows.length;
      const batchSize = 50;
      
      for (let i = 0; i < total; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = allRows.slice(i, i + batchSize);
        
        chunk.forEach((row: any) => {
          const statement = row["Énoncé"] || row.statement;
          const code = row["Code"] || row.questionCode;
          const correct = String(row.correct || row.Answer || "");
          
          if (!statement) return;

          const options = [];
          for (let k = 1; k <= 4; k++) {
            const optVal = row[`option${k}`];
            if (optVal) options.push({ id: String(k), text: String(optVal) });
          }

          const correctIds = [];
          const firstChar = correct.trim().toUpperCase()[0];
          if (['A','B','C','D'].includes(firstChar)) {
            correctIds.push((firstChar.charCodeAt(0) - 64).toString());
          } else {
            correctIds.push(correct.trim() || "1");
          }

          const id = code ? `q_matrice_${code.replace(/[^a-zA-Z0-9]/g, '_')}` : `q_matrice_${Math.random().toString(36).substr(2, 9)}`;
          const qRef = doc(db, 'questions', id);

          batch.set(qRef, {
            id,
            statement,
            text: statement,
            options,
            choices: options.map(o => o.text),
            correctOptionIds: correctIds,
            correctChoice: correctIds[0],
            explanation: row["Justification"] || row.explanation || "",
            isActive: true,
            questionCode: code || id,
            updatedAt: serverTimestamp(),
            tags: {
              domain: row.domain,
              approach: row.approach,
              difficulty: row["Difficulté"] || "Medium"
            },
            sourceIds: ['general']
          }, { merge: true });
        });

        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / total) * 100));
      }

      toast({ title: "Importation Matrice Réussie", description: `${total} questions synchronisées.` });
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur import" });
    } finally {
      setIsImporting(false);
    }
  };

  const totalQuestionsReady = Object.values(parsedSheets).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isImporting && !val && onClose()}>
      <DialogContent className="max-w-3xl rounded-[40px] p-10 border-4 shadow-3xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-emerald-600 flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8" /> Importation Matrice (9 Feuilles)
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500 italic uppercase text-[10px] tracking-widest mt-2">
            Importation massive par domaines et approches.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed rounded-[32px] p-16 text-center cursor-pointer hover:bg-slate-50 transition-all group border-slate-200 hover:border-emerald-500"
            >
              <Upload className="h-16 w-16 mx-auto text-slate-300 group-hover:text-emerald-500 mb-4 transition-transform group-hover:-translate-y-2" />
              <p className="font-black uppercase italic text-slate-400 group-hover:text-emerald-600">Sélectionnez le fichier global</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); parseFile(f); }
              }} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500 p-2 rounded-xl"><CheckCircle2 className="text-white h-6 w-6" /></div>
                  <div>
                    <p className="font-black italic text-emerald-900 text-lg leading-tight">{file.name}</p>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{totalQuestionsReady} questions prêtes</p>
                  </div>
                </div>
                <Button variant="ghost" className="font-black uppercase text-xs text-emerald-700" onClick={() => { setFile(null); setParsedSheets({}); setErrors([]); }}>Changer</Button>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-100 space-y-3">
                  <p className="text-xs font-black text-red-600 uppercase flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Structure invalide :</p>
                  {errors.map((err, i) => <p key={i} className="text-xs font-bold text-red-500 italic">• {err}</p>)}
                </div>
              )}

              {Object.keys(parsedSheets).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {SHEET_MAPPING.map(m => (
                    <div key={m.name} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <p className="text-[8px] font-black uppercase text-slate-400 italic mb-1">{m.name}</p>
                      <p className="text-sm font-black text-slate-700 italic">{parsedSheets[m.name]?.length || 0} Q</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isImporting && (
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-1">
                <p className="text-[10px] font-black uppercase text-emerald-600 italic">Progression</p>
                <p className="text-lg font-black text-emerald-600 italic">{progress}%</p>
              </div>
              <Progress value={progress} className="h-4 rounded-full bg-emerald-100" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-4">
          <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={onClose} disabled={isImporting}>Annuler</Button>
          <Button disabled={Object.keys(parsedSheets).length === 0 || isImporting || isParsing || errors.length > 0} onClick={handleImport} className="h-16 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 flex-1 shadow-2xl uppercase text-lg">
            {isImporting ? <Loader2 className="animate-spin h-6 w-6" /> : "Lancer la Synchronisation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
