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
import { Loader2, CheckCircle2, FileSpreadsheet, XCircle, Upload, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, runTransaction } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId?: string;
}

interface ParsedQuestion {
  statement: string;
  options: { id: string, text: string }[];
  correctOptionIds: string[];
  isMultipleCorrect: boolean;
  explanation: string;
  tags: {
    domain: string;
    approach: string;
    difficulty: string;
  };
}

export function ImportQuestionsModal({ isOpen, onClose, examId = 'general' }: ImportQuestionsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedQuestion[]>([]);
  const [errors, setErrors] = useState<{line: number, msg: string}[]>([]);
  
  const { firestore: db } = useFirebase();
  const { profile } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to generate a simple hash for deduplication
  const generateId = (text: string, exam: string) => {
    let hash = 0;
    const str = text + exam;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `q_${exam}_${Math.abs(hash).toString(36)}`;
  };

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setErrors([]);
    setParsedData([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

        const results: ParsedQuestion[] = [];
        const parseErrors: {line: number, msg: string}[] = [];

        json.forEach((row, index) => {
          const lineNum = index + 2;
          const statement = row["Énoncé"] || row.statement || row.text;
          const justification = row["Justification"] || row.explanation || "";
          const correct = String(row.correct || "");
          
          if (!statement) {
            parseErrors.push({ line: lineNum, msg: "Énoncé manquant." });
            return;
          }

          const options: { id: string, text: string }[] = [];
          for (let i = 1; i <= 5; i++) {
            const optVal = row[`option${i}`] || row[`choice${i}`];
            if (optVal) options.push({ id: String(i), text: String(optVal) });
          }

          if (options.length < 2) {
            parseErrors.push({ line: lineNum, msg: "Moins de 2 options." });
            return;
          }

          const correctIds = correct.split(',').map(s => s.trim().toUpperCase());
          const mappedIds: string[] = [];
          
          let isValidLine = true;
          correctIds.forEach(cid => {
             let id = cid;
             if (['A','B','C','D','E'].includes(cid)) {
               id = (cid.charCodeAt(0) - 64).toString();
             }
             if (options.find(o => o.id === id)) mappedIds.push(id);
             else {
               isValidLine = false;
               parseErrors.push({ line: lineNum, msg: `Réponse '${cid}' non trouvée dans les options.` });
             }
          });

          if (isValidLine) {
            results.push({
              statement,
              options,
              correctOptionIds: mappedIds,
              isMultipleCorrect: mappedIds.length > 1,
              explanation: justification,
              tags: {
                domain: row["Domaine"] || "Process",
                approach: row["Approche"] || "Agile",
                difficulty: row["Difficulté"] || "Medium",
              }
            });
          }
        });

        setParsedData(results);
        setErrors(parseErrors);
      } catch (err) {
        toast({ variant: "destructive", title: "Erreur lecture fichier" });
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsImporting(true);
    setProgress(0);

    try {
      const total = parsedData.length;
      const batchSize = 50;
      
      for (let i = 0; i < total; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = parsedData.slice(i, i + batchSize);
        
        chunk.forEach((q) => {
          // Use deterministic ID based on content to avoid duplicates
          const questionId = generateId(q.statement, examId);
          const qRef = doc(db, 'questions', questionId);

          const finalData = {
            ...q,
            id: questionId,
            questionCode: questionId,
            isActive: true,
            createdBy: profile?.id || 'admin',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            examId: examId
          };

          batch.set(qRef, finalData, { merge: true });
        });

        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / total) * 100));
      }

      toast({ title: "Importation terminée", description: `${total} questions ont été synchronisées.` });
      onClose();
      setFile(null);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur lors de l'import" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isImporting && !val && onClose()}>
      <DialogContent className="max-w-3xl rounded-[40px] p-10 border-4 shadow-3xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-emerald-600 flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8" /> Importation Massive
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500 italic uppercase text-[10px] tracking-widest mt-2">
            Ajoutez des centaines de questions en quelques secondes.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed rounded-3xl p-16 text-center cursor-pointer hover:bg-slate-50 transition-all group border-slate-200 hover:border-emerald-500"
            >
              <Upload className="h-16 w-16 mx-auto text-slate-300 group-hover:text-emerald-500 mb-4 transition-transform group-hover:-translate-y-2" />
              <p className="font-black uppercase italic text-slate-400 group-hover:text-emerald-600">Cliquez pour choisir votre fichier Excel</p>
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
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{parsedData.length} questions prêtes</p>
                  </div>
                </div>
                <Button variant="ghost" className="font-black uppercase text-xs text-emerald-700 hover:bg-emerald-100" onClick={() => { setFile(null); setParsedData([]); }}>Changer</Button>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-xl border-2 border-red-100 max-h-40 overflow-y-auto space-y-1">
                  <p className="text-xs font-black text-red-600 uppercase mb-2 flex items-center gap-2"><XCircle className="h-4 w-4" /> Erreurs détectées :</p>
                  {errors.map((err, i) => <p key={i} className="text-[10px] font-bold text-red-500 italic">Ligne {err.line}: {err.msg}</p>)}
                </div>
              )}

              {isParsing && (
                <div className="flex flex-col items-center py-4 gap-3">
                  <Loader2 className="animate-spin h-10 w-10 text-emerald-500" />
                  <p className="font-black text-[10px] uppercase text-emerald-600 italic tracking-widest animate-pulse">Analyse des données en cours...</p>
                </div>
              )}
            </div>
          )}

          {isImporting && (
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-1">
                <p className="text-[10px] font-black uppercase text-emerald-600 italic">Progression de l'import</p>
                <p className="text-lg font-black text-emerald-600 italic">{progress}%</p>
              </div>
              <Progress value={progress} className="h-4 rounded-full bg-emerald-100" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-4">
          <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={onClose} disabled={isImporting}>Annuler</Button>
          <Button disabled={parsedData.length === 0 || isImporting || isParsing} onClick={handleImport} className="h-16 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 flex-1 shadow-2xl uppercase tracking-widest text-lg">
            {isImporting ? <Loader2 className="animate-spin h-6 w-6" /> : "Lancer l'Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
