'use client';

import React, { useState } from 'react';
import { BuzzerStatus, IBuzzerEvent } from '@/types';
import { Bell, Lock, CheckCircle, Zap } from 'lucide-react';
import { sounds } from '@/lib/audio';

interface BuzzerButtonProps {
  status: BuzzerStatus; // 'DISABLED' | 'ACTIVE' | 'CLOSED'
  onBuzz: () => void;
  buzzerEvent?: IBuzzerEvent | null;
  disabled?: boolean;
}

export const BuzzerButton: React.FC<BuzzerButtonProps> = ({
  status,
  onBuzz,
  buzzerEvent,
  disabled = false,
}) => {
  const [isPressing, setIsPressing] = useState(false);

  const isBuzzerActive = status === 'ACTIVE' && !buzzerEvent;
  const isBuzzed = !!buzzerEvent;

  const handlePress = () => {
    if (!isBuzzerActive || disabled || isBuzzed) return;

    sounds.playBuzzer();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    onBuzz();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-md mx-auto select-none">
      {/* Live Status Pill */}
      <div
        className={`px-5 py-2 rounded-full flex items-center gap-2.5 font-bold tracking-wider text-sm sm:text-base uppercase border transition-all ${
          isBuzzed
            ? 'bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
            : isBuzzerActive
            ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 animate-pulse shadow-[0_0_25px_rgba(16,185,129,0.5)]'
            : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
        }`}
      >
        {isBuzzed ? (
          <>
            <CheckCircle className="w-5 h-5 text-amber-400" />
            <span>BUZZ RECORDED</span>
          </>
        ) : isBuzzerActive ? (
          <>
            <Zap className="w-5 h-5 text-emerald-400 animate-bounce" />
            <span>🟢 BUZZER ACTIVE - BUZZ NOW!</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 text-rose-400" />
            <span>🔴 BUZZER DISABLED</span>
          </>
        )}
      </div>

      {/* Massive 3D Tactile Buzzer Button */}
      <div className="relative p-6 sm:p-8 flex items-center justify-center">
        {/* Outer Ring & Glow */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-300 ${
            isBuzzerActive
              ? 'bg-gradient-to-b from-amber-400/20 to-amber-600/5 buzzer-active-glow'
              : 'bg-slate-900/30'
          }`}
        />

        {/* 3D Base Bezel */}
        <div
          className={`w-60 h-60 sm:w-72 sm:h-72 rounded-full p-4 flex items-center justify-center transition-all ${
            isBuzzerActive
              ? 'bg-gradient-to-b from-amber-400 via-amber-600 to-amber-950 shadow-2xl'
              : 'bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 shadow-inner'
          }`}
        >
          {/* Main Button Surface */}
          <button
            onClick={handlePress}
            onMouseDown={() => setIsPressing(true)}
            onMouseUp={() => setIsPressing(false)}
            onTouchStart={() => setIsPressing(true)}
            onTouchEnd={() => setIsPressing(false)}
            disabled={!isBuzzerActive || isBuzzed}
            aria-label="Press Buzzer"
            className={`w-full h-full rounded-full flex flex-col items-center justify-center relative transition-transform duration-100 font-black tracking-widest ${
              isBuzzed
                ? 'bg-gradient-to-b from-amber-600 to-amber-900 text-amber-200 border-4 border-amber-400/60 shadow-inner cursor-default'
                : isBuzzerActive
                ? `bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-slate-950 border-4 border-amber-200 cursor-pointer ${
                    isPressing ? 'scale-95 shadow-inner' : 'scale-100 shadow-[0_15px_35px_rgba(217,119,6,0.6)]'
                  }`
                : 'bg-gradient-to-b from-slate-700 to-slate-900 text-slate-500 border-4 border-slate-700/60 cursor-not-allowed buzzer-disabled'
            }`}
          >
            {isBuzzed ? (
              <div className="flex flex-col items-center gap-1">
                <CheckCircle className="w-12 h-12 text-amber-300" />
                <span className="text-xl sm:text-2xl font-black">BUZZED ✓</span>
                <span className="text-xs uppercase text-amber-200/80 font-bold">Locked</span>
              </div>
            ) : isBuzzerActive ? (
              <div className="flex flex-col items-center gap-2">
                <Bell className="w-14 h-14 sm:w-16 sm:h-16 animate-bounce text-slate-950" />
                <span className="text-3xl sm:text-4xl font-black drop-shadow-md">BUZZ</span>
                <span className="text-xs uppercase tracking-wider font-extrabold text-slate-900/80">Press Fast!</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Lock className="w-12 h-12 text-slate-500" />
                <span className="text-2xl sm:text-3xl font-bold">BUZZ</span>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Locked</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Buzzed Result Confirmation Card */}
      {isBuzzed && buzzerEvent && (
        <div className="w-full p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 text-center animate-fade-in space-y-2 shadow-lg">
          <div className="text-xs uppercase tracking-wider text-slate-400">Your Official Buzzer Record</div>
          <div className="flex items-center justify-center gap-6">
            <div>
              <div className="text-[11px] text-slate-400">Assigned Rank</div>
              <div className="text-2xl sm:text-3xl font-black gold-gradient-text">
                #{buzzerEvent.rank}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <div className="text-[11px] text-slate-400">Elapsed Time</div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                {buzzerEvent.elapsedSecondsFormatted}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Server Timestamp: {buzzerEvent.serverTimeFormatted}
          </div>
          <p className="text-xs text-slate-500 italic pt-1">Waiting for the host to review rankings...</p>
        </div>
      )}

      {/* Default Instruction Banner */}
      {!isBuzzerActive && !isBuzzed && (
        <div className="text-center text-slate-400 text-xs sm:text-sm bg-slate-900/60 py-2.5 px-4 rounded-xl border border-slate-800">
          Listen carefully to the host. The button will activate as soon as the host enables the buzzer!
        </div>
      )}
    </div>
  );
};
