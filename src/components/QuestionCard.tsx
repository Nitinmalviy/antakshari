'use client';

import React, { useState, useEffect } from 'react';
import { IQuestion, IQuestionOption } from '@/types';
import { CheckCircle2, XCircle, Sparkles, Send, RotateCcw, ArrowRight } from 'lucide-react';
import { sounds } from '@/lib/audio';

interface QuestionCardProps {
  question: IQuestion;
  selectedOption?: string | null;
  onSelectOption?: (optionId: string) => void;
  onSubmitAnswer?: (sequenceStr?: string) => void;
  isSubmitted?: boolean;
  isRevealed?: boolean;
  correctAnswerId?: string | null;
  responseTimeMs?: number;
  disabled?: boolean;
  showSubmitButton?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOption,
  onSelectOption,
  onSubmitAnswer,
  isSubmitted = false,
  isRevealed = false,
  correctAnswerId,
  responseTimeMs,
  disabled = false,
  showSubmitButton = true,
}) => {
  // Candidate's arranged sequence of option IDs e.g. ['A', 'C', 'B', 'D']
  const [sequence, setSequence] = useState<string[]>([]);

  // Sync sequence if selectedOption is passed from outside
  useEffect(() => {
    if (selectedOption) {
      if (selectedOption.includes('-')) {
        setSequence(selectedOption.split('-'));
      } else if (selectedOption.length === 4) {
        setSequence(selectedOption.split(''));
      } else if (!sequence.includes(selectedOption)) {
        setSequence((prev) => (prev.length < 4 ? [...prev, selectedOption] : prev));
      }
    }
  }, [selectedOption]);

  const handleOptionClick = (optId: string) => {
    if (disabled || isSubmitted) return;

    sounds.playLock();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }

    let nextSequence: string[];
    if (sequence.includes(optId)) {
      // If already selected, tap removes it from sequence
      nextSequence = sequence.filter((id) => id !== optId);
    } else {
      if (sequence.length >= 4) {
        return;
      }
      nextSequence = [...sequence, optId];
    }

    setSequence(nextSequence);
    if (onSelectOption) {
      onSelectOption(nextSequence.join('-'));
    }
  };

  const handleResetSequence = () => {
    if (disabled || isSubmitted) return;
    setSequence([]);
    if (onSelectOption) {
      onSelectOption('');
    }
    sounds.playLock();
  };

  const handleSubmit = () => {
    if (disabled || isSubmitted || sequence.length < 4 || !onSubmitAnswer) return;
    sounds.playLock();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50, 100]);
    }
    onSubmitAnswer(sequence.join('-'));
  };

  // Determine correct sequence array
  const rawCorrect = correctAnswerId || (isRevealed ? question.correctAnswerId : null);
  const correctSequenceArr = rawCorrect
    ? rawCorrect.includes('-')
      ? rawCorrect.split('-')
      : rawCorrect.length === 4
      ? rawCorrect.split('')
      : [rawCorrect]
    : [];

  const candidateSequenceStr = sequence.join('-');
  const normalizedCandidateSeq = sequence.join('');
  const normalizedCorrectSeq = correctSequenceArr.join('');
  const isCandidateExactMatch =
    normalizedCorrectSeq.length > 0 &&
    normalizedCandidateSeq.toUpperCase() === normalizedCorrectSeq.toUpperCase();

  const getOptionText = (optId: string) => {
    const opt = question.options.find((o) => o.id === optId);
    return opt ? opt.text : optId;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Question Header Box */}
      <div className="kbc-frame p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute top-2.5 left-4 text-amber-400/70 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{question.category || 'Fastest Finger First'}</span>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-100 leading-relaxed max-w-3xl mx-auto pt-3">
          {question.questionText}
        </h2>
        <p className="text-xs text-amber-400/90 font-semibold mt-2">
          Arrange all 4 options in the correct sequence by tapping them in order (1st ➔ 2nd ➔ 3rd ➔ 4th)
        </p>
      </div>

      {/* Live Sequence Building Indicator (Before Reveal) */}
      {!isRevealed && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-300">
              Your Chosen Sequence ({sequence.length}/4)
            </span>
            {sequence.length > 0 && !isSubmitted && !disabled && (
              <button
                onClick={handleResetSequence}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Order</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((slotIdx) => {
              const optId = sequence[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    optId
                      ? 'bg-amber-500/10 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-600 border-dashed'
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono font-bold">
                    Slot {slotIdx + 1}
                  </div>
                  <div className="text-sm font-black mt-0.5 truncate">
                    {optId ? `${optId}: ${getOptionText(optId)}` : 'Tap option'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Correct Sequence Banner on Reveal */}
      {isRevealed && correctSequenceArr.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-2 border-emerald-500/60 text-center space-y-3 shadow-2xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Official Correct Sequence</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base font-bold">
            {correctSequenceArr.map((optId, idx) => (
              <React.Fragment key={idx}>
                <div className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center gap-2 shadow-lg shadow-emerald-500/30">
                  <span className="w-5 h-5 rounded-full bg-slate-950 text-emerald-400 text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span>{optId}: {getOptionText(optId)}</span>
                </div>
                {idx < correctSequenceArr.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Candidate's verdict */}
          <div className="pt-2">
            {isCandidateExactMatch ? (
              <div className="text-emerald-400 font-black text-sm flex items-center justify-center gap-1.5 animate-bounce">
                <CheckCircle2 className="w-5 h-5" />
                <span>PERFECT MATCH! You arranged all 4 options in exact sequence!</span>
              </div>
            ) : (
              <div className="text-rose-400 font-bold text-xs">
                Your submission: {sequence.length > 0 ? sequence.join(' ➔ ') : 'No sequence submitted'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((opt: IQuestionOption) => {
          const selectedSlot = sequence.indexOf(opt.id);
          const isSelected = selectedSlot !== -1;

          const correctSlot = correctSequenceArr.indexOf(opt.id);
          const isSlotCorrect = isRevealed && isSelected && selectedSlot === correctSlot;
          const isSlotIncorrect = isRevealed && isSelected && selectedSlot !== correctSlot;

          let cardStyle = 'kbc-option-btn';
          if (isRevealed) {
            if (isSlotCorrect) cardStyle += ' correct';
            else if (isSlotIncorrect) cardStyle += ' incorrect';
          } else if (isSelected) {
            cardStyle += ' selected';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleOptionClick(opt.id)}
              disabled={disabled || isSubmitted || isRevealed}
              className={`w-full p-4 sm:p-5 rounded-xl flex items-center gap-4 text-left transition-all relative overflow-hidden ${cardStyle} ${
                disabled || isSubmitted || isRevealed
                  ? 'cursor-default'
                  : 'cursor-pointer hover:border-amber-400'
              }`}
            >
              {/* Option Letter Badge */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-base flex-shrink-0 transition-colors ${
                  isRevealed && isSlotCorrect
                    ? 'bg-emerald-500 text-black shadow-[0_0_10px_#22c55e]'
                    : isRevealed && isSlotIncorrect
                    ? 'bg-rose-500 text-white'
                    : isSelected
                    ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_10px_#f59e0b]'
                    : 'bg-slate-800 text-amber-400 border border-amber-500/30'
                }`}
              >
                {opt.id}
              </div>

              {/* Option Text */}
              <span className="flex-1 text-base sm:text-lg font-medium text-slate-200">
                {opt.text}
              </span>

              {/* Sequence Order Position Badge */}
              {isSelected && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs uppercase shadow-md">
                  <span>Order: #{selectedSlot + 1}</span>
                </div>
              )}

              {/* Correct order badge on reveal */}
              {isRevealed && correctSlot !== -1 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs uppercase shadow-md">
                  <span>Correct: #{correctSlot + 1}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* EXPLICIT SUBMIT BUTTON */}
      {showSubmitButton && !isSubmitted && !isRevealed && (
        <div className="flex flex-col items-center gap-2 pt-2 animate-fade-in">
          <button
            onClick={handleSubmit}
            disabled={sequence.length < 4 || disabled}
            className={`w-full max-w-md py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl ${
              sequence.length === 4
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:scale-105 shadow-amber-500/30 cursor-pointer animate-pulse'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>
              {sequence.length === 4
                ? `LOCK & SUBMIT SEQUENCE (${sequence.join('-')})`
                : `TAP ${4 - sequence.length} MORE OPTION(S) IN ORDER`}
            </span>
          </button>
          <span className="text-xs text-amber-400/80 font-medium">
            {sequence.length === 4
              ? 'Sequence ready! Click button to lock and submit your sequence.'
              : 'Tap options in the sequence you believe is correct.'}
          </span>
        </div>
      )}

      {/* Submission & Response Status Banner */}
      {isSubmitted && !isRevealed && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-center animate-fade-in flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm sm:text-base">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <span>SEQUENCE SUBMITTED & LOCKED ({sequence.join(' ➔ ')})</span>
          </div>
          {responseTimeMs && (
            <span className="text-xs text-amber-400/80 font-mono font-bold">
              Response Time: {(responseTimeMs / 1000).toFixed(3)}s
            </span>
          )}
          <span className="text-xs text-slate-400">Waiting for host to reveal results...</span>
        </div>
      )}

      {/* Explanation Box on Reveal */}
      {isRevealed && question.explanation && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 text-sm">
          <strong className="text-amber-400">Fact / Explanation: </strong>
          {question.explanation}
        </div>
      )}
    </div>
  );
};
