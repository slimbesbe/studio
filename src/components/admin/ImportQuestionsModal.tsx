
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
import { Loader2, AlertCircle, CheckCircle2, FileSpreadsheet, XCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, runTransaction } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
}

interface ParsedQuestion {
  statement: string;
  options: { id: string, text: string }[];
  correctOptionIds: string[];
  isMultipleCorrect: boolean;
  explanation: string;
  isValid: boolean;
  error?: string;
}

export function ImportQuestionsModal({ isOpen, onClose, examId }: ImportQuestionsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedQuestion[]>([]);
  const [errors, setErrors] = useState<{line: number, msg: string}[]>([]);
  
  const { firestore: db } = useFirebase();
  const { profile, user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
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
          const statement = row.statement || row.statement;
          const explanation = row.explanation || "";
          const correct = String(row.correct || "");
          
          if (!statement) {
            parseErrors.push({ line: lineNum, msg: "Énoncé manquant." });
            return;
          }

          const options: { id: string, text: string }[] = [];
          for (let i = 1; i <= 5; i++) {
            const optVal = row[`option${i}`];
            if (optVal) options.push({ id: String(i), text: String(optVal) });
          }

          if (options.length < 2) {
            parseErrors.push({ line: lineNum, msg: "Moins de 2 options fournies." });
            return;
          }

          if (!correct) {
            parseErrors.push({ line: lineNum, msg: "Réponse correcte manquante." });
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
             
             if (options.find(o => o.id === id)) {
               mappedIds.push(id);
             } else {
               isValidLine = false;
               parseErrors.push({ line: lineNum, msg: `La réponse '${cid}' ne correspond à aucune option.` });
             }
          });

          if (isValidLine) {
            results.push({
              statement,
              options,
              correctOptionIds: mappedIds,
              isMultipleCorrect: mappedIds.length > 1,
              explanation,
              isValid: true
            });
          }
        });

        setParsedData(results);
        setErrors(parseErrors);
      } catch (err) {
        toast({ variant: "destructive", title: "Erreur lecture", description: "Format de fichier invalide." });
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
      const batchSize = 100;
      
      const counterRef = doc(db, 'counters', 'questions');
      let startCounter = 0;
      
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        startCounter = counterDoc.exists() ? counterDoc.data().current || 0 : 0;
        transaction.set(counterRef, { current: startCounter + total }, { merge: true });
      });

      for (let i = 0; i < total; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = parsedData.slice(i, i + batchSize);
        
        chunk.forEach((q, idx) => {
          const qRef = doc(collection(db, 'exams', examId, 'questions'));
          const currentCode = startCounter + i + idx + 1;
          const questionCode = `Q-${currentCode.toString().padStart(6, '0')}`;

          batch.set(qRef, {
            ...q,
            id: qRef.id,
            questionCode,
            isActive: true,
            createdByRole: profile?.role || 'admin',
            createdAt: serverTimestamp(),
            examId
          });
        });

        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / total) * 100));
      }

      toast({ title: "Import réussi", description: `${total} questions ajoutées à l'examen.` });
      onClose();
      setFile(null);
      setParsedData([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur import", description: "Une erreur est survenue lors de l'écriture." });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isImporting && !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" />
            Importer des questions vers {examId.replace('exam', 'Examen ')}
          </DialogTitle>
          <DialogDescription>
            Uploadez un fichier Excel (.xlsx) avec les colonnes : statement, option1-5, explanation, correct.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-bold">Cliquez pour choisir votre fichier Excel</p>
              <p className="text-sm text-muted-foreground mt-1">Format supporté : .xlsx, .xls, .csv</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500 h-6 w-6" />
                  <div>
                    <p className="font-bold">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{parsedData.length} questions prêtes à l'import</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Changer</Button>
              </div>

              {errors.length > 0 && (
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-2">
                  <h4 className="text-sm font-bold text-destructive flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> Erreurs détectées ({errors.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                    {errors.map((err, i) => (
                      <p key={i}>Ligne {err.line} : {err.msg}</p>
                    ))}
                  </div>
                </div>
              )}

              {parsedData.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-sm">Aperçu des questions valides :</h4>
                  <div className="border rounded-xl divide-y">
                    {parsedData.slice(0, 5).map((q, i) => (
                      <div key={i} className="p-3 text-xs">
                        <p className="font-bold line-clamp-1">{q.statement}</p>
                        <p className="text-muted-foreground mt-1">{q.options.length} options • Réponse: {q.correctOptionIds.join(', ')}</p>
                      </div>
                    ))}
                    {parsedData.length > 5 && (
                      <div className="p-2 text-center text-[10px] text-muted-foreground">Et {parsedData.length - 5} autres questions...</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Importation en cours...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClose={onClose} disabled={isImporting}>Annuler</Button>
          <Button 
            disabled={parsedData.length === 0 || isImporting} 
            onClick={handleImport}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isImporting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Importer {parsedData.length} questions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useFirebase } from '@/firebase';
