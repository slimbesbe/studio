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
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, FileSpreadsheet, XCircle, Upload, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface CoachingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any | null;
}

interface ParsedQuestion {
  text: string;
  choices: string[];
  correctChoice: string;
  correctOptionIds: string[];
  explanation: string;
  index: number;
  tags: {
    domain: string;
    approach: string;
    difficulty: string;
  };
}

export function CoachingImportModal({ isOpen, onClose, session }: CoachingImportModalProps) {
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

  const parseFile = async (file: File) => {
    if (!session) return;
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

        // Limiter aux 35 premières questions pour respecter la plage de la séance
        const dataToProcess = json.slice(0, 35);

        dataToProcess.forEach((row, index) => {
          const lineNum = index + 2;
          const text = row["Énoncé"] || row.statement || row.text;
          const explanation = row["Justification"] || row.explanation || "";
          const correct = String(row.correct || "");
          
          if (!text) {
            parseErrors.push({ line: lineNum, msg: "Énoncé manquant." });
            return;
          }

          const choices: string[] = [];
          const choiceIds: string[] = [];
          for (let i = 1; i <= 4; i++) {
            const optVal = row[`option${i}`] || row[`choice${i}`];
            if (optVal) {
              choices.push(String(optVal));
              choiceIds.push(String(i));
            }
          }

          if (choices.length < 2) {
            parseErrors.push({ line: lineNum, msg: "Moins de 2 options." });
            return;
          }

          // Mapper la réponse correcte (A,B,C,D vers 1,2,3,4)
          let correctIdx = "1";
          const firstChar = correct.trim().toUpperCase()[0];
          if (['A','B','C','D'].includes(firstChar)) {
            correctIdx = (firstChar.charCodeAt(0) - 64).toString();
          } else {
            correctIdx = correct.trim();
          }

          results.push({
            text,
            choices,
            correctChoice: correctIdx,
            correctOptionIds: [correctIdx],
            explanation,
            index: session.questionStart + index,
            tags: {
              domain: row["Domaine"] || "Process",
              approach: row["Approche"] || "Agile",
              difficulty: row["Difficulté"] || "Medium"
            }
          });
        });

        setParsedData(results);
        setErrors(parseErrors);
      } catch (err) {
        toast({ variant: "destructive", title: "Erreur lecture" });
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0 || !session) return;
    setIsImporting(true);
    setProgress(0);

    try {
      const batch = writeBatch(db);
      
      parsedData.forEach((q) => {
        const qRef = doc(db, 'questions', `COACHING_Q_${q.index}`);
        batch.set(qRef, {
          ...q,
          id: qRef.id,
          isActive: true,
          updatedAt: serverTimestamp(),
          source: 'coaching_import',
          sessionId: session.id
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Importation terminée", description: `${parsedData.length} questions ajoutées à la séance ${session.index}.` });
      onClose();
      setFile(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur import" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isImporting && !val && onClose()}>
      <DialogContent className="max-w-2xl rounded-[40px] p-10 border-4 shadow-3xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-emerald-600 flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8" /> Import {session?.title}
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500 italic uppercase text-[10px] tracking-widest mt-2">
            Importation automatique des index {session?.questionStart} à {session?.questionEnd}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="bg-amber-50 p-4 rounded-2xl border-2 border-dashed border-amber-200 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-700 leading-relaxed italic">
              Le fichier doit contenir les colonnes : <span className="underline">Énoncé</span>, <span className="underline">option1</span>, <span className="underline">option2</span>, <span className="underline">option3</span>, <span className="underline">option4</span>, <span className="underline">Justification</span> et <span className="underline">correct</span> (A, B, C ou D).
            </p>
          </div>

          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed rounded-3xl p-12 text-center cursor-pointer hover:bg-slate-50 transition-colors group"
            >
              <Upload className="h-12 w-12 mx-auto text-slate-300 group-hover:text-emerald-500 transition-colors mb-4" />
              <p className="font-black uppercase italic text-slate-400 group-hover:text-slate-600">Sélectionnez le fichier Excel</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); parseFile(f); }
              }} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500 h-6 w-6" />
                  <div>
                    <p className="font-black italic text-slate-700">{file.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{parsedData.length} questions prêtes à l'import</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="font-black uppercase text-[10px]" onClick={() => { setFile(null); setParsedData([]); }}>Changer</Button>
              </div>

              {isParsing && (
                <div className="flex flex-col items-center py-4 gap-2">
                  <Loader2 className="animate-spin h-8 w-8 text-primary" />
                  <p className="font-black text-[10px] uppercase text-slate-400 italic">Analyse du contenu...</p>
                </div>
              )}
            </div>
          )}

          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-3 rounded-full" />
              <p className="text-[10px] text-center font-black uppercase italic text-slate-400">Synchronisation avec la base de données...</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-4">
          <Button variant="outline" className="h-14 rounded-xl font-black uppercase flex-1 border-4" onClick={onClose} disabled={isImporting}>Annuler</Button>
          <Button disabled={parsedData.length === 0 || isImporting || isParsing} onClick={handleImport} className="h-14 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 flex-1 shadow-2xl uppercase">
            {isImporting ? <Loader2 className="animate-spin h-5 w-5" /> : "Lancer l'Importation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
