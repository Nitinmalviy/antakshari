'use client';

import React from 'react';
import { IQuestion, OptionId } from '@/types';
import { CheckCircle2, XCircle, Sparkles, Send, RotateCcw, ListOrdered, Clock } from 'lucide-react';
import { sounds } from '@/lib/audio';
import { formatOrder } from '@/lib/orderQuestion';

interface OrderQuestionCardProps {
  question: IQuestion;
  arrangedOrder: OptionId[];
  onChangeOrder?: (order: OptionId[]) => void;
  onSubmitOrder?: () => void;
  isSubmitted?: boolean;
  isRevealed?: boolean;
  isTimeUp?: boolean;
  correctOrder?: OptionId[] | null;
}

// KBC "Fastest Finger First": players tap the jumbled options in the correct sequence
export const OrderQuestionCard: React.FC<OrderQuestionCardProps> = ({
  question,
  arrangedOrder,
  onChangeOrder,
  onSubmitOrder,
  isSubmitted = false,
  isRevealed = false,
  isTimeUp = false,
  correctOrder,
}) => {
  const totalSlots = question.options.length;
  const isLocked = isSubmitted || isRevealed || isTimeUp;
  const isComplete = arrangedOrder.length === totalSlots;
  const textFor = (id: OptionId) => question.options.find((o) => o.id === id)?.text || '';

  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  };

  const handlePickOption = (id: OptionId) => {
    if (isLocked || !onChangeOrder || arrangedOrder.includes(id)) return;
    sounds.playLock();
    vibrate(30);
    onChangeOrder([...arrangedOrder, id]);
  };

  const handleRemoveFromSlot = (id: OptionId) => {
    if (isLocked || !onChangeOrder) return;
    onChangeOrder(arrangedOrder.filter((x) => x !== id));
  };

  const handleSubmit = () => {
    if (isLocked || !isComplete || !onSubmitOrder) return;
    sounds.playLock();
    vibrate([50, 50, 100]);
    onSubmitOrder();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Question Box */}
      <div className="kbc-frame p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute top-2 left-4 text-amber-400/50 flex items-center gap-1 text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{question.category || 'Fastest Finger First'}</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-100 leading-relaxed max-w-3xl mx-auto pt-2">
          {question.questionText}
        </h2>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Arrange in the correct order</span>
        </div>
      </div>

      {/* Your Sequence: numbered slots */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/25 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Your Order</span>
          {!isLocked && arrangedOrder.length > 0 && (
            <button
              onClick={() => onChangeOrder?.([])}
              className="text-[11px] font-bold text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: totalSlots }).map((_, position) => {
            const id = arrangedOrder[position];
            const isRightHere = isRevealed && !!correctOrder && id === correctOrder[position];
            const isWrongHere = isRevealed && !!correctOrder && !!id && id !== correctOrder[position];

            return (
              <button
                key={position}
                onClick={() => id && handleRemoveFromSlot(id)}
                disabled={isLocked || !id}
                className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${
                  isRightHere
                    ? 'bg-emerald-950/50 border-emerald-500/60'
                    : isWrongHere
                    ? 'bg-rose-950/50 border-rose-500/60'
                    : id
                    ? 'bg-amber-950/30 border-amber-500/50'
                    : 'bg-slate-950/60 border-dashed border-slate-700'
                } ${!isLocked && id ? 'cursor-pointer hover:border-rose-400' : 'cursor-default'}`}
                title={!isLocked && id ? 'Tap to remove' : undefined}
              >
                <span className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xs flex-shrink-0">
                  {position + 1}
                </span>
                {id ? (
                  <>
                    <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs flex-shrink-0">
                      {id}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-100 truncate">{textFor(id)}</span>
                    {isRightHere && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                    {isWrongHere && <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
                  </>
                ) : (
                  <span className="text-xs text-slate-500">Empty</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Jumbled options: tap in sequence */}
      {!isRevealed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const placedAt = arrangedOrder.indexOf(opt.id);
            const isPlaced = placedAt >= 0;

            return (
              <button
                key={opt.id}
                onClick={() => handlePickOption(opt.id)}
                disabled={isLocked || isPlaced}
                className={`kbc-option-btn w-full p-4 sm:p-5 rounded-xl flex items-center gap-4 text-left ${
                  isPlaced ? 'selected opacity-60' : ''
                } ${isLocked || isPlaced ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    isPlaced ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {opt.id}
                </div>
                <span className="flex-1 text-base sm:text-lg font-medium text-slate-200">{opt.text}</span>
                {isPlaced && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black">
                    #{placedAt + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Submit */}
      {!isLocked && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={!isComplete}
            className={`w-full max-w-md py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl ${
              isComplete
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:scale-105 shadow-amber-500/30 cursor-pointer animate-pulse'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>{isComplete ? `LOCK ORDER ${arrangedOrder.join(' → ')}` : `TAP OPTIONS IN ORDER (${arrangedOrder.length}/${totalSlots})`}</span>
          </button>
          <span className="text-xs text-slate-400">
            Tap the options from first to last. Tap a filled slot to remove it.
          </span>
        </div>
      )}

      {isSubmitted && !isRevealed && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-center flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm sm:text-base">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <span>ORDER LOCKED: {formatOrder(arrangedOrder)}</span>
          </div>
          <span className="text-xs text-slate-400">Waiting for host to reveal results...</span>
        </div>
      )}

      {isTimeUp && !isSubmitted && !isRevealed && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/50 text-center flex items-center justify-center gap-2 text-rose-300 font-bold text-sm">
          <Clock className="w-5 h-5" />
          <span>TIME UP! Your order was not submitted.</span>
        </div>
      )}

      {/* Correct order on reveal */}
      {isRevealed && correctOrder && correctOrder.length > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Correct Order: {formatOrder(correctOrder)}
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {correctOrder.map((id, position) => (
              <li key={id} className="flex items-center gap-2 text-sm text-emerald-100">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">
                  {position + 1}
                </span>
                <span className="font-bold text-emerald-300">{id}.</span>
                <span>{textFor(id)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {isRevealed && question.explanation && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 text-sm">
          <strong className="text-amber-400">Fact / Explanation: </strong>
          {question.explanation}
        </div>
      )}
    </div>
  );
};
