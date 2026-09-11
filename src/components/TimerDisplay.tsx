'use client';

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatTimerDisplay } from '@/lib/timeUtils';
import { sounds } from '@/lib/audio';

interface TimerDisplayProps {
  startedAt?: number | null;
  timeLimitSeconds?: number;
  isActive: boolean;
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  startedAt,
  timeLimitSeconds = 30,
  isActive,
  onExpire,
  size = 'md',
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(timeLimitSeconds * 1000);
  const [lastSecond, setLastSecond] = useState<number>(timeLimitSeconds);

  useEffect(() => {
    if (!isActive || !startedAt) {
      setRemainingMs(timeLimitSeconds * 1000);
      return;
    }

    const totalDurationMs = timeLimitSeconds * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startedAt;
      const left = Math.max(0, totalDurationMs - elapsed);

      setRemainingMs(left);

      const currentSec = Math.ceil(left / 1000);
      if (currentSec !== lastSecond && left > 0) {
        setLastSecond(currentSec);
        if (currentSec <= 10) {
          sounds.playTick();
        }
      }

      if (left <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 40); // 25 fps precision updates

    return () => clearInterval(interval);
  }, [isActive, startedAt, timeLimitSeconds, lastSecond, onExpire]);

  const percentage = Math.max(0, Math.min(100, (remainingMs / (timeLimitSeconds * 1000)) * 100));
  const isUrgent = remainingMs <= 5000 && isActive;

  const sizeClasses = {
    sm: 'text-sm py-1 px-2.5',
    md: 'text-base py-1.5 px-4',
    lg: 'text-2xl sm:text-3xl py-2 px-6 font-mono font-black',
    xl: 'text-3xl sm:text-5xl py-3 px-8 font-mono font-black',
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`inline-flex items-center gap-2 rounded-xl border backdrop-blur-md transition-all ${
          isUrgent
            ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.5)]'
            : isActive
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            : 'bg-slate-900/60 border-slate-700/60 text-slate-400'
        } ${sizeClasses[size]}`}
      >
        <Clock className={`${size === 'xl' ? 'w-8 h-8' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} ${isActive ? 'animate-spin-slow' : ''}`} />
        <span>{formatTimerDisplay(remainingMs)}</span>
      </div>

      {/* Mini Progress Bar */}
      {isActive && (
        <div className="w-full max-w-[200px] h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden border border-slate-700">
          <div
            className={`h-full transition-all duration-75 ${
              isUrgent ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-amber-300'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
