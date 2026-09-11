'use client';

import React from 'react';
import { IQuestion, IQuestionOption } from '@/types';
import { CheckCircle2, XCircle, Sparkles, Send } from 'lucide-react';
import { sounds } from '@/lib/audio';

interface QuestionCardProps {
  question: IQuestion;
  selectedOption?: 'A' | 'B' | 'C' | 'D' | null;
  onSelectOption?: (optionId: 'A' | 'B' | 'C' | 'D') => void;
  onSubmitAnswer?: () => void;
  isSubmitted?: boolean;
  isRevealed?: boolean;
  correctAnswerId?: 'A' | 'B' | 'C' | 'D' | null;
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
  const handleOptionClick = (optionId: 'A' | 'B' | 'C' | 'D') => {
    if (disabled || isSubmitted || !onSelectOption) return;
    sounds.playLock();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
    onSelectOption(optionId);
  };

  const handleSubmit = () => {
    if (disabled || isSubmitted || !selectedOption || !onSubmitAnswer) return;
    sounds.playLock();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50, 100]);
    }
    onSubmitAnswer();
  };

  const actualCorrect = correctAnswerId || (isRevealed ? question.correctAnswerId : null);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Question Box */}
      <div className="kbc-frame p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Subtle decorative sparkles */}
        <div className="absolute top-2 left-4 text-amber-400/50 flex items-center gap-1 text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{question.category || 'Round 1 Common Question'}</span>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-100 leading-relaxed max-w-3xl mx-auto pt-2">
          {question.questionText}
        </h2>
      </div>

      {/* 4 Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((opt: IQuestionOption) => {
          const isSelected = selectedOption === opt.id;
          const isThisCorrect = actualCorrect === opt.id;
          const isThisIncorrect = isRevealed && isSelected && !isThisCorrect;

          let cardStyle = 'kbc-option-btn';
          if (isRevealed) {
            if (isThisCorrect) cardStyle += ' correct';
            else if (isThisIncorrect) cardStyle += ' incorrect';
          } else if (isSelected) {
            cardStyle += ' selected';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleOptionClick(opt.id)}
              disabled={disabled || isSubmitted}
              className={`w-full p-4 sm:p-5 rounded-xl flex items-center gap-4 text-left transition-all ${cardStyle} ${
                disabled || isSubmitted ? 'cursor-default' : 'cursor-pointer hover:border-amber-400'
              }`}
            >
              {/* Option Letter Diamond Badge */}
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 transition-colors ${
                  isRevealed && isThisCorrect
                    ? 'bg-emerald-500 text-black shadow-[0_0_10px_#22c55e]'
                    : isRevealed && isThisIncorrect
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

              {/* Status Icons */}
              {isRevealed && isThisCorrect && (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 animate-bounce" />
              )}
              {isRevealed && isThisIncorrect && (
                <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
              )}
              {!isRevealed && isSelected && (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
              )}
            </button>
          );
        })}
      </div>

      {/* EXPLICIT SUBMIT BUTTON (Candidates can change selection until clicking Submit!) */}
      {showSubmitButton && !isSubmitted && !isRevealed && (
        <div className="flex flex-col items-center gap-2 pt-2 animate-fade-in">
          <button
            onClick={handleSubmit}
            disabled={!selectedOption || disabled}
            className={`w-full max-w-md py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl ${
              selectedOption
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:scale-105 shadow-amber-500/30 cursor-pointer animate-pulse'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>
              {selectedOption ? `LOCK & SUBMIT OPTION ${selectedOption}` : 'SELECT AN OPTION (A, B, C, D)'}
            </span>
          </button>
          {selectedOption ? (
            <span className="text-xs text-amber-400/80 font-medium">
              Option {selectedOption} selected. You can click another option above to change it before submitting.
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Click an option above to select your answer, then click Submit.
            </span>
          )}
        </div>
      )}

      {/* Submission & Response Status Banner */}
      {isSubmitted && !isRevealed && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-center animate-fade-in flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm sm:text-base">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <span>ANSWER SUBMITTED & LOCKED</span>
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
