
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
import { Loader2, CheckCircle2, FileSpreadsheet, XCircle, Upload, Info, Layers, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId?: string; // Represents the target silo ID (e.g., 'practice', 'matrix', or 'exam1')
}

interface ParsedQuestion {
  statement: string;
  options: { id: string, text: string }[];
  correctOptionIds: string[];
  isMultipleCorrect: boolean;
  explanation: string;
  questionCode: string;
  tags: {
    domain: string;
    approach: string;
    difficulty: string;
  };
}

export function ImportQuestionsModal({ isOpen, onClose, examId = 'practice' }: ImportQuestionsModalProps) {
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

  const normalizeTag = (type: 'domain' | 'approach' | 'difficulty', value: any): string => {
    const val = String(value || '').trim().toLowerCase();
    if (!val) {
      if (type === 'domain') return 'Process';
      if (type === 'approach') return 'Agile';
      return 'Medium';
    }

    if (type === 'domain') {
      if (val.includes('peop') || val.includes('gens')) return 'People';
      if (val.includes('proc')) return 'Process';
      if (val.includes('busi') || val.includes('affair')) return 'Business';
      return 'Process';
    }

    if (type === 'approach') {
      if (val.includes('pred') || val.includes('water') || val.includes('casc')) return 'Predictive';
      if (val.includes('agile')) return 'Agile';
      if (val.includes('hybr')) return 'Hybrid';
      return 'Agile';
    }

    if (type === 'difficulty') {
      if (val.includes('eas') || val.includes('faci')) return 'Easy';
      if (val.includes('med') || val.includes('moy')) return 'Medium';
      if (val.includes('har') || val.includes('diff')) return 'Hard';
      return 'Medium';
    }

    return val;
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
          const statement = row["Scénario / Question"] || row["Énoncé"] || row["statement"] || row["text"] || row["Question"];
          const justification = row["Justification"] || row["explanation"] || row["Rationale"] || "";
          const correctValue = String(row["Réponse Correcte"] || row["correct"] || row["Correct"] || row["Answer"] || "");
          const code = row["Numéro"] || row["Code"] || row["questionCode"];
          
          if (!statement) return;

          const options: { id: string, text: string }[] = [];
          ['A', 'B', 'C', 'D', 'E'].forEach((letter, i) => {
            const optVal = row[`Option ${letter}`] || row[`option ${i+1}`] || row[`option${i+1}`] || row[`choice${i+1}`];
            if (optVal) options.push({ id: String(i + 1), text: String(optVal) });
          });

          if (options.length < 2) return;

          const rawCorrects = correctValue.split(',').map(s => s.trim().toUpperCase());
          const mappedIds: string[] = [];
          
          rawCorrects.forEach(cid => {
             if (!cid) return;
             let id = ['A','B','C','D','E'].includes(cid[0]) ? (cid.charCodeAt(0) - 64).toString() : cid;
             if (options.find(o => o.id === id)) mappedIds.push(id);
          });

          if (mappedIds.length > 0) {
            results.push({
              statement: String(statement).trim(),
              options,
              correctOptionIds: mappedIds,
              isMultipleCorrect: mappedIds.length > 1,
              explanation: String(justification).trim(),
              questionCode: code ? String(code).trim() : '',
              tags: {
                domain: normalizeTag('domain', row["Domaine"] || row["Domain"]),
                approach: normalizeTag('approach', row["Approche"] || row["Approach"]),
                difficulty: normalizeTag('difficulty', row["Difficulté"] || row["Difficulty"]),
              }
            });
          }
        });

        setParsedData(results);
      } catch (err) {
        toast({ variant: "destructive", title: "Erreur lecture" });
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
      
      // DETERMINATION DU SILO CIBLE
      const targetSilo = examId === 'practice' ? 'practice' : examId === 'matrix' ? 'matrix' : 'exams';

      for (let i = 0; i < total; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = parsedData.slice(i, i + batchSize);
        
        chunk.forEach((q) => {
          const questionId = q.questionCode ? `q_${targetSilo}_${String(q.questionCode).replace(/[^a-zA-Z0-9]/g, '_')}` : `q_${targetSilo}_${Math.random().toString(36).substr(2, 9)}`;
          const qRef = doc(db, 'questions', questionId);

          batch.set(qRef, {
            ...q,
            id: questionId,
            text: q.statement, 
            choices: q.options.map(o => o.text),
            correctChoice: q.correctOptionIds[0],
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            silo: targetSilo, // ISOLATION PHYSIQUE
            sourceIds: [examId],
            examId: targetSilo === 'exams' ? examId : null
          }, { merge: true });
        });

        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / total) * 100));
      }

      toast({ title: "Importation terminée", description: `${total} questions injectées dans le silo ${targetSilo.toUpperCase()}.` });
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
          <DialogTitle className="text-3xl font-black uppercase italic text-emerald-600 flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8" /> Importation Silo : {examId.toUpperCase()}
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500 italic uppercase text-[10px] mt-2">
            Isolation garantie. Les données ne seront visibles que dans ce silo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed rounded-3xl p-16 text-center cursor-pointer hover:bg-slate-50 transition-all group border-slate-200"
            >
              <Upload className="h-16 w-16 mx-auto text-slate-300 group-hover:text-emerald-500 mb-4" />
              <p className="font-black uppercase italic text-slate-400">Sélectionnez le fichier Excel</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); parseFile(f); }
              }} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500 p-2 rounded-xl"><CheckCircle2 className="text-white h-6 w-6" /></div>
                  <div>
                    <p className="font-black italic text-emerald-900">{file.name}</p>
                    <p className="text-[10px] font-black text-emerald-600 uppercase">{parsedData.length} questions prêtes</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => { setFile(null); setParsedData([]); }}>Changer</Button>
              </div>
              {isParsing && <div className="flex flex-col items-center py-4 gap-2"><Loader2 className="animate-spin h-10 w-10 text-emerald-500" /><p className="font-black text-[10px] uppercase text-emerald-600 italic">Analyse...</p></div>}
            </div>
          )}
          {isImporting && <Progress value={progress} className="h-4 rounded-full" />}
        </div>

        <DialogFooter className="gap-4">
          <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={onClose} disabled={isImporting}>Annuler</Button>
          <Button disabled={parsedData.length === 0 || isImporting || isParsing} onClick={handleImport} className="h-16 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 flex-1 shadow-2xl uppercase">
            Lancer l'Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
