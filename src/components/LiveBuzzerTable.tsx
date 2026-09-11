'use client';

import React, { useState } from 'react';
import { IBuzzerEvent } from '@/types';
import { Trophy, Medal, Search, Zap, Clock, Plus, Minus, Check } from 'lucide-react';

interface LiveBuzzerTableProps {
  events: IBuzzerEvent[];
  qualifyingCount?: number;
  onQualifyingCountChange?: (count: number) => void;
  isHost?: boolean;
  candidatesMap?: Record<string, { score?: number; team?: string }>;
  onAwardPoints?: (candidateId: string, deltaPoints: number) => void;
}

// Per-row point counter component
function PointCounter({
  candidateId,
  currentScore,
  onAwardPoints,
}: {
  candidateId: string;
  currentScore: number;
  onAwardPoints: (candidateId: string, delta: number) => void;
}) {
  const [delta, setDelta] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const increment = () => setDelta((d) => d + 1);
  const decrement = () => setDelta((d) => d - 1);

  const handleConfirm = () => {
    if (delta === 0) return;
    onAwardPoints(candidateId, delta);
    setConfirmed(true);
    setTimeout(() => {
      setDelta(0);
      setConfirmed(false);
    }, 1200);
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      {/* Current Total Score */}
      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black font-mono text-xs min-w-[44px] text-center">
        {currentScore}
      </span>

      {/* Counter: − delta + */}
      <div className="flex items-center gap-1">
        <button
          onClick={decrement}
          className="w-6 h-6 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 flex items-center justify-center cursor-pointer transition-all hover:scale-110"
          title="Decrease"
        >
          <Minus className="w-3 h-3" />
        </button>

        <span
          className={`w-8 text-center font-black font-mono text-sm ${
            delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400'
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>

        <button
          onClick={increment}
          className="w-6 h-6 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 flex items-center justify-center cursor-pointer transition-all hover:scale-110"
          title="Increase"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={delta === 0}
        className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
          confirmed
            ? 'bg-emerald-500 text-white border border-emerald-400 scale-110'
            : delta !== 0
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 hover:scale-105'
            : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
        }`}
        title="Apply points"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export const LiveBuzzerTable: React.FC<LiveBuzzerTableProps> = ({
  events = [],
  qualifyingCount = 5,
  onQualifyingCountChange,
  isHost = false,
  candidatesMap = {},
  onAwardPoints,
}) => {
  const [search, setSearch] = useState('');

  const filteredEvents = events.filter((e) =>
    e.candidateName.toLowerCase().includes(search.toLowerCase())
  );

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-[0_0_12px_#f59e0b]">
            <Trophy className="w-3.5 h-3.5 fill-current" /> 1st Gold
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-300 text-slate-950 font-black text-xs shadow-[0_0_10px_#e2e8f0]">
            <Medal className="w-3.5 h-3.5 fill-current" /> 2nd Silver
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-700 text-white font-black text-xs shadow-[0_0_8px_#b45309]">
            <Medal className="w-3.5 h-3.5 fill-current" /> 3rd Bronze
          </span>
        );
      default:
        return (
          <span
            className={`font-mono font-bold text-sm ${
              rank <= qualifyingCount ? 'text-amber-400' : 'text-slate-500'
            }`}
          >
            #{rank}
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-[#0d1322]/90 rounded-2xl border border-amber-500/30 overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-4 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold gold-gradient-text">
              Live Buzzer Ranking ({events.length})
            </h3>
            <p className="text-xs text-slate-400">
              Millisecond-precision rankings • Use counter to award points manually
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Configurable Qualifying Limit for Host */}
          {isHost && onQualifyingCountChange && (
            <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <span>Top:</span>
              <select
                value={qualifyingCount}
                onChange={(e) => onQualifyingCountChange(Number(e.target.value))}
                className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
              >
                <option value={3} className="bg-slate-900 text-white">3</option>
                <option value={5} className="bg-slate-900 text-white">5 (Default)</option>
                <option value={8} className="bg-slate-900 text-white">8</option>
                <option value={10} className="bg-slate-900 text-white">10</option>
                <option value={50} className="bg-slate-900 text-white">All</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Buzzer Records List */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Clock className="w-8 h-8 text-slate-600 animate-pulse" />
          <p className="text-sm font-medium">No buzzer presses recorded yet for this session.</p>
          <p className="text-xs text-slate-500">
            When candidates press BUZZ, they appear here instantly with millisecond timing.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="py-3 px-4 sm:px-6">Rank</th>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Server Time</th>
                <th className="py-3 px-4 text-right">Elapsed Time</th>
                {isHost && <th className="py-3 px-4 text-center">Total Score</th>}
                {isHost && onAwardPoints && (
                  <th className="py-3 px-4 text-center">Award Points  [− delta +] ✓</th>
                )}
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm font-medium">
              {filteredEvents.map((event) => {
                const isTopQualified = event.rank <= qualifyingCount;
                const candidateMeta = candidatesMap[event.candidateId];
                const currentScore = candidateMeta?.score ?? 0;

                return (
                  <tr
                    key={event.candidateId + '_' + event.serverTimestamp}
                    className={`transition-colors ${
                      event.rank === 1
                        ? 'bg-amber-500/10 hover:bg-amber-500/15'
                        : isTopQualified
                        ? 'bg-slate-900/40 hover:bg-slate-900/70'
                        : 'hover:bg-slate-900/30'
                    }`}
                  >
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      {getRankBadge(event.rank)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-amber-400 font-bold">
                          {event.candidateName.charAt(0).toUpperCase()}
                        </span>
                        <div>{event.candidateName}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-300">
                      {event.serverTimeFormatted}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-right text-base text-amber-400">
                      {event.elapsedSecondsFormatted}
                    </td>

                    {/* Total Score Column – host only */}
                    {isHost && (
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black font-mono text-xs">
                          {currentScore} pts
                        </span>
                      </td>
                    )}

                    {/* Host Points Counter [− delta +] ✓ */}
                    {isHost && onAwardPoints && (
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <PointCounter
                          candidateId={event.candidateId}
                          currentScore={currentScore}
                          onAwardPoints={onAwardPoints}
                        />
                      </td>
                    )}

                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      {isTopQualified ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                          QUALIFIED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400">
                          Participant
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
