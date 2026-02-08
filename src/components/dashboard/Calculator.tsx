
'use client';

import { useState } from 'react';
import { X, Hash } from 'lucide-react';

/**
 * Calculator component mimicking the TI-108 style.
 * Used during PMP simulations.
 */
export function Calculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState('0');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [value, setValue] = useState<number | null>(null);

  const calculate = (nextValue: number, operator: string) => {
    const prevValue = value ?? 0;
    switch (operator) {
      case '+': return prevValue + nextValue;
      case '-': return prevValue - nextValue;
      case '*': return prevValue * nextValue;
      case '/': return prevValue / nextValue;
      default: return nextValue;
    }
  };

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDot = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
      setWaitingForOperand(false);
    }
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (value === null) {
      setValue(inputValue);
    } else if (pendingOperator) {
      const currentValue = value || 0;
      const newValue = calculate(inputValue, pendingOperator);
      setValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setPendingOperator(nextOperator);
  };

  const clearAll = () => {
    setValue(null);
    setDisplay('0');
    setPendingOperator(null);
    setWaitingForOperand(false);
  };

  return (
    <div className="fixed top-24 right-8 z-[100] w-64 bg-[#006699] rounded-t-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border-4 border-slate-300 select-none animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center bg-[#004d73] px-4 py-2 text-white font-bold text-xs uppercase tracking-widest">
        <span className="flex items-center gap-2"><Hash className="h-3 w-3" /> Calculator</span>
        <button onClick={onClose} className="hover:bg-red-500 rounded p-1 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="p-5 bg-[#006699] space-y-5">
        {/* LCD Screen */}
        <div className="bg-[#c2d1c2] p-3 rounded-md border-[3px] border-[#004d73] text-right font-mono text-3xl text-slate-900 h-16 flex items-center justify-end overflow-hidden shadow-inner">
          {display.substring(0, 10)}
        </div>
        
        <div className="text-white text-[9px] font-black text-center tracking-[0.2em] opacity-60 uppercase italic flex items-center justify-center gap-2">
          <div className="h-px w-4 bg-white/30" />
          Texas Instruments TI-108
          <div className="h-px w-4 bg-white/30" />
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-3">
          <CalcBtn label="+/-" onClick={() => setDisplay(String(parseFloat(display) * -1))} color="bg-[#e62e00] text-white" />
          <CalcBtn label="√" onClick={() => setDisplay(String(Math.sqrt(parseFloat(display))))} color="bg-[#e62e00] text-white" />
          <CalcBtn label="%" onClick={() => setDisplay(String(parseFloat(display) / 100))} color="bg-[#e62e00] text-white" />
          <CalcBtn label="÷" onClick={() => performOperation('/')} color="bg-[#e62e00] text-white" />
          
          <CalcBtn label="MRC" onClick={() => {}} color="bg-[#e62e00] text-white text-[10px]" />
          <CalcBtn label="M-" onClick={() => {}} color="bg-[#e62e00] text-white" />
          <CalcBtn label="M+" onClick={() => {}} color="bg-[#e62e00] text-white" />
          <CalcBtn label="x" onClick={() => performOperation('*')} color="bg-[#e62e00] text-white" />

          <CalcBtn label="7" onClick={() => inputDigit('7')} />
          <CalcBtn label="8" onClick={() => inputDigit('8')} />
          <CalcBtn label="9" onClick={() => inputDigit('9')} />
          <CalcBtn label="-" onClick={() => performOperation('-')} color="bg-[#e62e00] text-white" />

          <CalcBtn label="4" onClick={() => inputDigit('4')} />
          <CalcBtn label="5" onClick={() => inputDigit('5')} />
          <CalcBtn label="6" onClick={() => inputDigit('6')} />
          <CalcBtn label="+" onClick={() => performOperation('+')} color="bg-[#e62e00] text-white" />

          <CalcBtn label="1" onClick={() => inputDigit('1')} />
          <CalcBtn label="2" onClick={() => inputDigit('2')} />
          <CalcBtn label="3" onClick={() => inputDigit('3')} />
          <CalcBtn label="=" onClick={() => performOperation('=')} color="bg-[#e62e00] text-white" span="row-span-2 h-[104px]" />

          <CalcBtn label="ON/C" onClick={clearAll} color="bg-[#e62e00] text-white text-[10px]" />
          <CalcBtn label="0" onClick={() => inputDigit('0')} />
          <CalcBtn label="." onClick={inputDot} />
        </div>
      </div>
      <div className="h-4 bg-[#004d73]" />
    </div>
  );
}

function CalcBtn({ label, onClick, color = "bg-white text-slate-800", span = "" }: any) {
  return (
    <button 
      onClick={onClick}
      className={`${color} ${span} h-11 rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.2)] font-black text-sm active:translate-y-1 active:shadow-none transition-all flex items-center justify-center border-b-2 border-black/10`}
    >
      {label}
    </button>
  );
}
