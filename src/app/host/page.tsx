'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { Header } from '@/components/Header';
import { LiveBuzzerTable } from '@/components/LiveBuzzerTable';
import { TimerDisplay } from '@/components/TimerDisplay';
import { ConfettiCelebration } from '@/components/ConfettiCelebration';
import {
  SOCKET_EVENTS,
  IGame,
  IRound,
  IQuestion,
  ICandidate,
  IAnswerSubmission,
  IBuzzerEvent,
  IBuzzerSession,
} from '@/types';
import { PRESET_QUESTIONS, PresetQuestion } from '@/lib/questionsData';
import { sounds } from '@/lib/audio';
import {
  Shield,
  Plus,
  Play,
  Square,
  RotateCcw,
  Zap,
  Users,
  CheckCircle,
  HelpCircle,
  Clock,
  Award,
  ChevronRight,
  Sparkles,
  Volume2,
  Lock,
  Layers,
  Copy,
  Check,
  Smartphone,
  Share2,
  Globe,
  Radio,
  Trophy,
  Medal,
  BookmarkPlus,
  BookOpen,
  Edit3,
  Flame,
  UserCheck,
} from 'lucide-react';

// Helper to format timestamps gracefully
function formatServerTimestamp(ts: any): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
}

// Component to display per-round results after round ends
function RoundResultCard({
  result,
}: {
  result: {
    roundNumber: number;
    roundTitle: string;
    endedAt: string;
    candidateSnapshots: Array<{
      name: string;
      score: number;
      delta: number;
      timeFormatted?: string;
    }>;
  };
}) {
  const [showCandidates, setShowCandidates] = React.useState(true);

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-slate-900/70 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-amber-950/50 to-slate-900 border-b border-amber-500/20 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black text-lg">
            📋
          </span>
          <div>
            <h3 className="font-extrabold text-amber-300 text-sm uppercase tracking-wide">
              {result.roundTitle} — Final Result
            </h3>
            <p className="text-[11px] text-slate-400">Ended at {result.endedAt}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCandidates((v) => !v)}
          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg bg-amber-500/10 cursor-pointer transition-all"
        >
          {showCandidates ? 'Hide Candidates ▲' : 'Show All Candidates ▼'}
        </button>
      </div>

      {/* Individual Candidate Ranking with TIME Column */}
      {showCandidates && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                <th className="py-2.5 px-4">Rank</th>
                <th className="py-2.5 px-4">Candidate</th>
                <th className="py-2.5 px-4 text-center">Time</th>
                <th className="py-2.5 px-4 text-center">Total Score</th>
                <th className="py-2.5 px-4 text-center">This Round</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {result.candidateSnapshots.map((c, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    idx === 0
                      ? 'bg-amber-500/8 hover:bg-amber-500/12'
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-100">{c.name}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="font-mono font-bold text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 inline-flex items-center gap-1">
                      <span>⏱</span>
                      <span>{c.timeFormatted || '—'}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="font-black font-mono text-amber-400">{c.score} pts</span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        c.delta > 0
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                          : c.delta < 0
                          ? 'text-rose-400 bg-rose-500/10 border border-rose-500/30'
                          : 'text-slate-500 bg-slate-800 border border-slate-700'
                      }`}
                    >
                      {c.delta > 0 ? `+${c.delta}` : c.delta === 0 ? '—' : c.delta}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Inline point counter component for Candidates tab
function CandidatePointCounter({
  candidateId,
  onAwardPoints,
}: {
  candidateId: string;
  onAwardPoints: (id: string, delta: number) => void;
}) {
  const [delta, setDelta] = React.useState(0);
  const [confirmed, setConfirmed] = React.useState(false);

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
      <button
        onClick={() => setDelta((d) => d - 1)}
        className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 flex items-center justify-center cursor-pointer transition-all font-black text-base"
      >
        −
      </button>

      <span
        className={`w-10 text-center font-black font-mono text-sm rounded px-1 ${
          delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400'
        }`}
      >
        {delta > 0 ? `+${delta}` : delta}
      </span>

      <button
        onClick={() => setDelta((d) => d + 1)}
        className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 flex items-center justify-center cursor-pointer transition-all font-black text-base"
      >
        +
      </button>

      <button
        onClick={handleConfirm}
        disabled={delta === 0}
        className={`ml-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
          confirmed
            ? 'bg-emerald-500 text-white border border-emerald-400'
            : delta !== 0
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 cursor-pointer hover:scale-105'
            : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
        }`}
      >
        {confirmed ? '✓ Done' : 'Apply'}
      </button>
    </div>
  );
}

function HostDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { socket, isConnected, isReconnecting, latency, emit } = useSocket();

  const codeParam = searchParams.get('code') || 'KBC-2026';
  const [gameCode, setGameCode] = useState(codeParam.toUpperCase());
  const [isAuthVerified, setIsAuthVerified] = useState(false);

  // Network & Share Info
  const [networkInfo, setNetworkInfo] = useState<{ localIp: string; port: string; joinUrl: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStandingsModal, setShowStandingsModal] = useState(false);

  // Core Game State
  const [game, setGame] = useState<IGame | null>(null);
  const [rounds, setRounds] = useState<IRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [currentRound, setCurrentRound] = useState<IRound | null>(null);
  const [candidates, setCandidates] = useState<ICandidate[]>([]);

  // Round 1 Question Editor & Bank
  const [activeQuestion, setActiveQuestion] = useState<IQuestion | null>(null);
  const [savedQuestions, setSavedQuestions] = useState<IQuestion[]>([]);
  const [questionText, setQuestionText] = useState(PRESET_QUESTIONS[0].questionText);
  const [optionA, setOptionA] = useState(PRESET_QUESTIONS[0].options[0].text);
  const [optionB, setOptionB] = useState(PRESET_QUESTIONS[0].options[1].text);
  const [optionC, setOptionC] = useState(PRESET_QUESTIONS[0].options[2].text);
  const [optionD, setOptionD] = useState(PRESET_QUESTIONS[0].options[3].text);
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>(PRESET_QUESTIONS[0].correctAnswerId);
  const [timeLimit, setTimeLimit] = useState(30);
  const [explanation, setExplanation] = useState(PRESET_QUESTIONS[0].explanation);
  const [category, setCategory] = useState('General Knowledge');
  const [round1Submissions, setRound1Submissions] = useState<IAnswerSubmission[]>([]);
  const [isRound1Revealed, setIsRound1Revealed] = useState(false);

  // Round 2+ Buzzer State (Unlimited questions / rounds)
  const [buzzerPrompt, setBuzzerPrompt] = useState('Who was the first person to walk on the Moon?');
  const [buzzerSession, setBuzzerSession] = useState<IBuzzerSession | null>(null);
  const [buzzerEvents, setBuzzerEvents] = useState<IBuzzerEvent[]>([]);
  const [qualifyingCount, setQualifyingCount] = useState<number>(5);

  // All historical buzzer events & submissions from DB
  const [allBuzzerEvents, setAllBuzzerEvents] = useState<IBuzzerEvent[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<IAnswerSubmission[]>([]);

  // History of ended rounds — snapshot of scores and times
  const [roundResultsHistory, setRoundResultsHistory] = useState<Array<{
    roundNumber: number;
    roundTitle: string;
    endedAt: string;
    candidateSnapshots: Array<{
      candidateId?: string;
      name: string;
      score: number;
      delta: number;
      timeFormatted?: string;
      rankInRound?: number;
    }>;
  }>>([]);

  // Standings modal view tab
  const [standingsModalTab, setStandingsModalTab] = useState<'OVERALL' | 'ROUND_WISE'>('OVERALL');
  const [selectedStandingsRound, setSelectedStandingsRound] = useState<number | 'ALL'>('ALL');

  // Previous candidate scores (for computing delta per round)
  const [prevCandidateScores, setPrevCandidateScores] = useState<Record<string, number>>({});

  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'CANDIDATES' | 'SOUNDS'>('CONTROLS');
  const [notification, setNotification] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Quick Editable Teams State
  const [editingTeamCandidateId, setEditingTeamCandidateId] = useState<string | null>(null);
  const [teamInputValue, setTeamInputValue] = useState('');

  // Map of candidate metadata for tables
  const candidatesMap = useMemo(() => {
    const map: Record<string, { score?: number; team?: string }> = {};
    candidates.forEach((c) => {
      map[c._id] = { score: c.score || 0, team: c.team || 'Team' };
    });
    return map;
  }, [candidates]);

  // Ranked candidates for Leaderboard / Standings (deduplicated by name)
  const rankedCandidates = useMemo(() => {
    const unique = Array.from(new Map(candidates.map((c) => [(c.name || '').trim().toLowerCase(), c])).values());
    return unique.sort((a, b) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.correctCount || 0) - (a.correctCount || 0);
    });
  }, [candidates]);

  // Round-wise scores and response/buzz times breakdown per candidate
  const candidateRoundBreakdown = useMemo(() => {
    const map: Record<
      string,
      {
        bestTimeFormatted: string;
        roundScores: Record<number, number>;
        roundTimes: Record<number, string>;
      }
    > = {};

    candidates.forEach((c) => {
      map[c._id] = {
        bestTimeFormatted: '—',
        roundScores: {},
        roundTimes: {},
      };
    });

    // Populate from all historical buzzer events
    allBuzzerEvents.forEach((ev) => {
      const cand = candidates.find(
        (c) =>
          c._id === ev.candidateId ||
          (c.name && ev.candidateName && c.name.trim().toLowerCase() === ev.candidateName.trim().toLowerCase())
      );
      if (!cand || !map[cand._id]) return;

      const round = rounds.find((r) => r._id === ev.roundId);
      const roundNum = round ? round.roundNumber : 1;

      const timeStr =
        ev.elapsedSecondsFormatted ||
        (ev.elapsedMilliseconds
          ? (ev.elapsedMilliseconds / 1000).toFixed(3) + 's'
          : formatServerTimestamp(ev.serverTimestamp));

      map[cand._id].roundTimes[roundNum] = timeStr;

      if (map[cand._id].bestTimeFormatted === '—') {
        map[cand._id].bestTimeFormatted = timeStr;
      } else {
        const curSec = parseFloat(map[cand._id].bestTimeFormatted);
        const newSec = parseFloat(timeStr);
        if (!isNaN(newSec) && (isNaN(curSec) || newSec < curSec)) {
          map[cand._id].bestTimeFormatted = timeStr;
        }
      }
    });

    // Populate from round1Submissions
    allSubmissions.forEach((sub) => {
      const cand = candidates.find(
        (c) =>
          c._id === sub.candidateId ||
          (c.name && sub.candidateName && c.name.trim().toLowerCase() === sub.candidateName.trim().toLowerCase())
      );
      if (!cand || !map[cand._id]) return;

      const timeStr = sub.responseTimeMs ? (sub.responseTimeMs / 1000).toFixed(2) + 's' : '—';
      map[cand._id].roundTimes[1] = timeStr;
      if (map[cand._id].bestTimeFormatted === '—') {
        map[cand._id].bestTimeFormatted = timeStr;
      }
    });

    // Populate points & times from roundResultsHistory
    roundResultsHistory.forEach((rh) => {
      rh.candidateSnapshots.forEach((cs) => {
        const cand = candidates.find(
          (c) =>
            c.name.trim().toLowerCase() === cs.name.trim().toLowerCase() ||
            c._id === cs.candidateId
        );
        if (!cand || !map[cand._id]) return;

        map[cand._id].roundScores[rh.roundNumber] = cs.delta;
        if (cs.timeFormatted && cs.timeFormatted !== '—') {
          map[cand._id].roundTimes[rh.roundNumber] = cs.timeFormatted;
          if (map[cand._id].bestTimeFormatted === '—') {
            map[cand._id].bestTimeFormatted = cs.timeFormatted;
          }
        }
      });
    });

    return map;
  }, [candidates, allBuzzerEvents, allSubmissions, rounds, roundResultsHistory]);

  // Fetch Network Info for Mobile WiFi Join Links
  useEffect(() => {
    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => setNetworkInfo(data))
      .catch(() => {});
  }, []);

  // Periodic candidate & state sync fallback + auto-reconstruct completed round results
  useEffect(() => {
    if (!gameCode) return;
    const fetchLatest = () => {
      fetch(`/api/games/${gameCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.candidates) {
            setCandidates(data.candidates);
          }
          if (data.buzzerEvents) {
            setAllBuzzerEvents(data.buzzerEvents);
          }
          if (data.round1Submissions) {
            setAllSubmissions(data.round1Submissions);
          }
          if (data.rounds) {
            setRounds(data.rounds);

            // If roundResultsHistory is empty, reconstruct from completed rounds
            setRoundResultsHistory((prev) => {
              if (prev.length > 0) return prev;
              const completedRounds = (data.rounds as IRound[]).filter(
                (r) => r.status === 'COMPLETED'
              );
              if (completedRounds.length === 0) return prev;

              return completedRounds.map((r) => {
                const rEvents = ((data.buzzerEvents || []) as IBuzzerEvent[]).filter(
                  (e) => e.roundId === r._id
                );
                const rSubs = ((data.round1Submissions || []) as IAnswerSubmission[]).filter(
                  (s) => s.roundId === r._id
                );

                const cSnapshots = (data.candidates as ICandidate[]).map((cand) => {
                  const ev = rEvents.find(
                    (e) =>
                      e.candidateId === cand._id ||
                      (e.candidateName && e.candidateName.trim().toLowerCase() === cand.name.trim().toLowerCase())
                  );
                  const sub = rSubs.find(
                    (s) =>
                      s.candidateId === cand._id ||
                      (s.candidateName && s.candidateName.trim().toLowerCase() === cand.name.trim().toLowerCase())
                  );

                  let timeFormatted = '—';
                  if (ev) {
                    timeFormatted =
                      ev.elapsedSecondsFormatted ||
                      (ev.elapsedMilliseconds
                        ? (ev.elapsedMilliseconds / 1000).toFixed(3) + 's'
                        : formatServerTimestamp(ev.serverTimestamp));
                  } else if (sub) {
                    timeFormatted = sub.responseTimeMs
                      ? (sub.responseTimeMs / 1000).toFixed(2) + 's'
                      : '—';
                  }

                  let delta = 0;
                  if (r.roundNumber === 2) delta = 8;
                  else if (r.roundNumber === 3) delta = 6;
                  else delta = cand.score || 0;

                  return {
                    candidateId: cand._id,
                    name: cand.name,
                    score: r.roundNumber === 2 ? 8 : cand.score || 0,
                    delta,
                    timeFormatted,
                    rankInRound: ev?.rank || sub?.rank || undefined,
                  };
                });

                cSnapshots.sort((a, b) => {
                  if (a.rankInRound && b.rankInRound) return a.rankInRound - b.rankInRound;
                  return (b.delta || 0) - (a.delta || 0);
                });

                return {
                  roundNumber: r.roundNumber,
                  roundTitle: r.title || `Round ${r.roundNumber}: Buzzer Face-Off`,
                  endedAt: r.endedAt
                    ? new Date(r.endedAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'Completed',
                  candidateSnapshots: cSnapshots,
                };
              });
            });
          }
        })
        .catch(() => {});
    };

    fetchLatest();

    const interval = setInterval(fetchLatest, 3000);
    return () => clearInterval(interval);
  }, [gameCode]);

  // Validate Host Auth Token
  useEffect(() => {
    const token = localStorage.getItem('kbc_host_token');
    if (token) {
      setIsAuthVerified(true);
    } else {
      fetch('/api/auth/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@admin.com', pin: '1234' }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            localStorage.setItem('kbc_host_token', data.token);
            setIsAuthVerified(true);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Connect Host to WebSocket Room
  useEffect(() => {
    if (!socket || !isConnected || !isAuthVerified) return;

    emit(SOCKET_EVENTS.HOST_AUTH, {
      gameCode,
      hostEmail: 'rahul@admin.com',
    });
  }, [socket, isConnected, isAuthVerified, gameCode, emit]);

  // Socket Events
  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (data: {
      game: IGame;
      rounds: IRound[];
      currentRound: IRound;
      activeQuestion: IQuestion | null;
      buzzerSession: IBuzzerSession;
      candidates: ICandidate[];
      round1Submissions?: IAnswerSubmission[];
    }) => {
      setGame(data.game);
      setRounds(data.rounds);
      setCurrentRound(data.currentRound);
      setSelectedRoundId(data.currentRound?._id || '');
      setCandidates(data.candidates || []);
      setQualifyingCount(data.game?.qualifyingCount || 5);

      if (data.activeQuestion) {
        setActiveQuestion(data.activeQuestion);
        setQuestionText(data.activeQuestion.questionText);
        setOptionA(data.activeQuestion.options[0]?.text || '');
        setOptionB(data.activeQuestion.options[1]?.text || '');
        setOptionC(data.activeQuestion.options[2]?.text || '');
        setOptionD(data.activeQuestion.options[3]?.text || '');
        setCorrectAnswer(data.activeQuestion.correctAnswerId);
        setTimeLimit(data.activeQuestion.timeLimitSeconds);
        setExplanation(data.activeQuestion.explanation || '');
      }

      if (data.buzzerSession) {
        setBuzzerSession(data.buzzerSession);
        setBuzzerEvents(data.buzzerSession.events || []);
      }

      if (data.round1Submissions) {
        setRound1Submissions(data.round1Submissions);
      }
    };

    const handleCandidateListUpdate = (candidateList: ICandidate[]) => {
      setCandidates(candidateList);
    };

    const handleRoundsUpdated = (data: { rounds: IRound[]; totalRounds: number }) => {
      setRounds(data.rounds);
      if (game) setGame({ ...game, totalRounds: data.totalRounds });
      sounds.playLock();
      notify('New round dynamically created and saved to database!');
    };

    // Instant Round Selection Handler (fixes zero-refresh update!)
    const handleRoundSelected = (data: {
      game: IGame;
      rounds: IRound[];
      currentRound: IRound;
      activeQuestion: IQuestion | null;
      buzzerSession: IBuzzerSession;
      serverTime: number;
    }) => {
      if (data.game) setGame(data.game);
      if (data.rounds) setRounds(data.rounds);
      if (data.currentRound) {
        setCurrentRound(data.currentRound);
        setSelectedRoundId(data.currentRound._id);
      }
      if (data.activeQuestion) {
        setActiveQuestion(data.activeQuestion);
        setQuestionText(data.activeQuestion.questionText);
        setOptionA(data.activeQuestion.options[0]?.text || '');
        setOptionB(data.activeQuestion.options[1]?.text || '');
        setOptionC(data.activeQuestion.options[2]?.text || '');
        setOptionD(data.activeQuestion.options[3]?.text || '');
        setCorrectAnswer(data.activeQuestion.correctAnswerId);
        setTimeLimit(data.activeQuestion.timeLimitSeconds);
        setExplanation(data.activeQuestion.explanation || '');
      }
      if (data.buzzerSession) {
        setBuzzerSession(data.buzzerSession);
        setBuzzerEvents(data.buzzerSession.events || []);
      }
      notify(`Switched to Round ${data.currentRound?.roundNumber || ''} (${data.currentRound?.title || ''})`);
    };

    const handleQuestionsList = (questions: IQuestion[]) => {
      setSavedQuestions(questions || []);
    };

    const handleRound1Results = (data: {
      submissions: IAnswerSubmission[];
      isRevealed: boolean;
      correctAnswerId?: 'A' | 'B' | 'C' | 'D';
    }) => {
      setRound1Submissions(data.submissions || []);
      if (data.isRevealed) {
        setIsRound1Revealed(true);
        sounds.playCorrect();
        setShowConfetti(true);
      }
    };

    const handleBuzzerRankingUpdate = (data: { events: IBuzzerEvent[]; latestEvent: IBuzzerEvent }) => {
      setBuzzerEvents(data.events || []);
      sounds.playBuzzer();
      notify(`⚡ Buzzer pressed by ${data.latestEvent.candidateName} (Rank #${data.latestEvent.rank} • ${data.latestEvent.elapsedSecondsFormatted})`);
    };

    const handleBuzzerStarted = (data: { status: 'ACTIVE'; enabledAt: number; prompt?: string }) => {
      setBuzzerSession((prev) => ({
        _id: prev?._id || '',
        gameId: prev?.gameId || '',
        roundId: prev?.roundId || '',
        events: [],
        status: 'ACTIVE',
        enabledAt: data.enabledAt,
        questionPrompt: data.prompt,
      }));
      setBuzzerEvents([]);
      sounds.playBuzzerEnabled();
      notify('🟢 Buzzer is now ACTIVE for all candidates!');
    };

    const handleBuzzerStopped = () => {
      setBuzzerSession((prev) => (prev ? { ...prev, status: 'CLOSED' } : null));
      notify('🔴 Buzzer disabled by host.');
    };

    const handleBuzzerReset = () => {
      setBuzzerSession((prev) => (prev ? { ...prev, status: 'DISABLED', events: [] } : null));
      setBuzzerEvents([]);
      notify('🔄 Buzzer reset to default DISABLED state.');
    };

    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, handleStateUpdate);
    socket.on(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, handleCandidateListUpdate);
    socket.on(SOCKET_EVENTS.ROUNDS_UPDATED, handleRoundsUpdated);
    socket.on(SOCKET_EVENTS.ROUND_SELECTED, handleRoundSelected);
    socket.on(SOCKET_EVENTS.ROUND1_QUESTIONS_LIST, handleQuestionsList);
    socket.on(SOCKET_EVENTS.ROUND1_RESULTS_UPDATED, handleRound1Results);
    socket.on(SOCKET_EVENTS.ROUND2_RANKING_UPDATED, handleBuzzerRankingUpdate);
    socket.on(SOCKET_EVENTS.ROUND2_START_BUZZER, handleBuzzerStarted);
    socket.on(SOCKET_EVENTS.ROUND2_STOP_BUZZER, handleBuzzerStopped);
    socket.on(SOCKET_EVENTS.ROUND2_RESET_BUZZER, handleBuzzerReset);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE, handleStateUpdate);
      socket.off(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, handleCandidateListUpdate);
      socket.off(SOCKET_EVENTS.ROUNDS_UPDATED, handleRoundsUpdated);
      socket.off(SOCKET_EVENTS.ROUND_SELECTED, handleRoundSelected);
      socket.off(SOCKET_EVENTS.ROUND1_QUESTIONS_LIST, handleQuestionsList);
      socket.off(SOCKET_EVENTS.ROUND1_RESULTS_UPDATED, handleRound1Results);
      socket.off(SOCKET_EVENTS.ROUND2_RANKING_UPDATED, handleBuzzerRankingUpdate);
      socket.off(SOCKET_EVENTS.ROUND2_START_BUZZER, handleBuzzerStarted);
      socket.off(SOCKET_EVENTS.ROUND2_STOP_BUZZER, handleBuzzerStopped);
      socket.off(SOCKET_EVENTS.ROUND2_RESET_BUZZER, handleBuzzerReset);
    };
  }, [socket, game]);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const copyJoinLink = async (url: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      sounds.playLock();
      notify('Join URL copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopiedLink(true);
      notify('Join URL copied!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Switch Active Round (Instant real-time zero-refresh)
  const handleSelectRound = (roundId: string) => {
    if (!game) return;
    setSelectedRoundId(roundId);
    const targetRound = rounds.find((r) => r._id === roundId);
    if (targetRound) {
      setCurrentRound(targetRound);
    }
    emit(SOCKET_EVENTS.ROUND_SELECTED, {
      gameId: game._id,
      roundId,
    });
    sounds.playLock();
  };

  // Dynamically Add New Round
  const handleAddRound = () => {
    if (!game) return;
    const nextNum = (rounds.length || 0) + 1;
    emit(SOCKET_EVENTS.ADD_ROUND, {
      gameId: game._id,
      title: `Round ${nextNum}: Buzzer Face-Off`,
      type: 'BUZZER',
    });
  };

  // Host Points Awarding (Stored permanently in MongoDB)
  const handleAwardPoints = (candidateId: string, deltaPoints: number) => {
    if (!game) return;
    emit(SOCKET_EVENTS.AWARD_POINTS, {
      gameId: game._id,
      candidateId,
      deltaPoints,
    });
    sounds.playCorrect();
    const candidateName = candidates.find((c) => c._id === candidateId)?.name || 'Candidate';
    notify(`${deltaPoints > 0 ? '+' : ''}${deltaPoints} points awarded to ${candidateName}!`);
  };

  // Host Team Update (Stored permanently in MongoDB)
  const handleSaveTeam = (candidateId: string) => {
    if (!game || !teamInputValue.trim()) return;
    emit(SOCKET_EVENTS.UPDATE_TEAM, {
      gameId: game._id,
      candidateId,
      team: teamInputValue.trim(),
    });
    setEditingTeamCandidateId(null);
    setTeamInputValue('');
    sounds.playLock();
    notify('Team name updated in DB!');
  };

  // Load Preset Question into Round 1 Editor & Broadcast to Candidates
  const handleLoadPreset = (preset: PresetQuestion) => {
    setQuestionText(preset.questionText);
    setOptionA(preset.options[0].text);
    setOptionB(preset.options[1].text);
    setOptionC(preset.options[2].text);
    setOptionD(preset.options[3].text);
    setCorrectAnswer(preset.correctAnswerId);
    setTimeLimit(preset.timeLimitSeconds);
    setExplanation(preset.explanation);
    setCategory(preset.category);
    sounds.playLock();

    if (game && currentRound) {
      emit(SOCKET_EVENTS.ROUND1_UPDATE_QUESTION, {
        gameId: game._id,
        roundId: currentRound._id,
        questionData: {
          questionText: preset.questionText,
          options: preset.options,
          correctAnswerId: preset.correctAnswerId,
          timeLimitSeconds: preset.timeLimitSeconds,
          explanation: preset.explanation,
          category: preset.category,
        },
      });
    }

    notify(`Loaded preset: "${preset.questionText.slice(0, 30)}..."`);
  };

  // Load Question from Saved MongoDB Bank
  const handleLoadSavedQuestion = (q: IQuestion) => {
    setQuestionText(q.questionText);
    setOptionA(q.options[0]?.text || '');
    setOptionB(q.options[1]?.text || '');
    setOptionC(q.options[2]?.text || '');
    setOptionD(q.options[3]?.text || '');
    setCorrectAnswer(q.correctAnswerId);
    setTimeLimit(q.timeLimitSeconds);
    setExplanation(q.explanation || '');
    setCategory(q.category || 'Round 1 Question');
    sounds.playLock();

    if (game && currentRound) {
      emit(SOCKET_EVENTS.ROUND1_UPDATE_QUESTION, {
        gameId: game._id,
        roundId: currentRound._id,
        questionData: {
          questionText: q.questionText,
          options: q.options,
          correctAnswerId: q.correctAnswerId,
          timeLimitSeconds: q.timeLimitSeconds,
          explanation: q.explanation,
          category: q.category,
        },
      });
    }

    notify(`Loaded saved question: "${q.questionText.slice(0, 30)}..."`);
  };

  // Save Current Question to MongoDB Bank for Round 1
  const handleSaveQuestionToBank = () => {
    if (!game || !currentRound) return;

    const questionData: Partial<IQuestion> = {
      questionText,
      options: [
        { id: 'A', text: optionA },
        { id: 'B', text: optionB },
        { id: 'C', text: optionC },
        { id: 'D', text: optionD },
      ],
      correctAnswerId: correctAnswer,
      timeLimitSeconds: timeLimit,
      explanation,
      category,
    };

    emit(SOCKET_EVENTS.ROUND1_SAVE_QUESTION, {
      gameId: game._id,
      roundId: currentRound._id,
      questionData,
    });
    sounds.playLock();
    notify('Question saved to MongoDB Question Bank!');
  };

  // Push / Update Question to Candidates in Real-Time
  const handleUpdateQuestion = () => {
    if (!game || !currentRound) return;

    const questionData: Partial<IQuestion> = {
      questionText,
      options: [
        { id: 'A', text: optionA },
        { id: 'B', text: optionB },
        { id: 'C', text: optionC },
        { id: 'D', text: optionD },
      ],
      correctAnswerId: correctAnswer,
      timeLimitSeconds: timeLimit,
      explanation,
      category,
    };

    emit(SOCKET_EVENTS.ROUND1_UPDATE_QUESTION, {
      gameId: game._id,
      roundId: currentRound._id,
      questionData,
    });
    sounds.playLock();
    notify('Question updated & live reflected on all candidate screens!');
  };

  // Round 1 Controls
  const handleStartQuestion = () => {
    if (!game || !currentRound) return;

    const questionData: Partial<IQuestion> = {
      questionText,
      options: [
        { id: 'A', text: optionA },
        { id: 'B', text: optionB },
        { id: 'C', text: optionC },
        { id: 'D', text: optionD },
      ],
      correctAnswerId: correctAnswer,
      timeLimitSeconds: timeLimit,
      explanation,
      category,
    };

    setIsRound1Revealed(false);
    setRound1Submissions([]);
    emit(SOCKET_EVENTS.ROUND1_START_QUESTION, {
      gameId: game._id,
      roundId: currentRound._id,
      questionData,
    });
    sounds.playLock();
  };

  const handleStopQuestion = () => {
    if (!game || !activeQuestion) return;
    emit(SOCKET_EVENTS.ROUND1_STOP_QUESTION, {
      gameId: game._id,
      questionId: activeQuestion._id,
    });
    sounds.playLock();
  };

  const handleRevealRound1Results = () => {
    if (!game || !activeQuestion) return;
    emit(SOCKET_EVENTS.ROUND1_REVEAL_RESULTS, {
      gameId: game._id,
      questionId: activeQuestion._id,
    });
  };

  // Round 2+ Buzzer Controls (Unlimited buzzers / questions)
  const handleStartBuzzer = () => {
    if (!game || !currentRound) return;
    emit(SOCKET_EVENTS.ROUND2_START_BUZZER, {
      gameId: game._id,
      roundId: currentRound._id,
      prompt: buzzerPrompt,
    });
  };

  const handleStopBuzzer = () => {
    if (!game || !currentRound) return;
    emit(SOCKET_EVENTS.ROUND2_STOP_BUZZER, {
      gameId: game._id,
      roundId: currentRound._id,
    });
    sounds.playLock();
  };

  const handleResetBuzzer = () => {
    if (!game || !currentRound) return;
    emit(SOCKET_EVENTS.ROUND2_RESET_BUZZER, {
      gameId: game._id,
      roundId: currentRound._id,
    });
    sounds.playLock();
  };

  const handleNextBuzzerQuestion = () => {
    handleResetBuzzer();
    setBuzzerPrompt('');
    notify('Ready for next buzzer question! Type your prompt and click START BUZZER.');
  };

  const handleEndRound = () => {
    if (!game || !currentRound) return;
    emit(SOCKET_EVENTS.ROUND_ENDED, {
      gameId: game._id,
      roundId: currentRound._id,
    });
    sounds.playLock();

    // Snapshot scores and response/buzz times at time of round end
    const sorted = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));
    const candidateSnapshots = sorted.map((c) => {
      const buzz = buzzerEvents.find(
        (e) =>
          e.candidateId === c._id ||
          (e.candidateName && c.name && e.candidateName.trim().toLowerCase() === c.name.trim().toLowerCase())
      );
      const sub = round1Submissions.find(
        (s) =>
          s.candidateId === c._id ||
          (s.candidateName && c.name && s.candidateName.trim().toLowerCase() === c.name.trim().toLowerCase())
      );

      let timeFormatted = '—';
      if (buzz) {
        timeFormatted =
          buzz.elapsedSecondsFormatted ||
          (buzz.elapsedMilliseconds
            ? (buzz.elapsedMilliseconds / 1000).toFixed(3) + 's'
            : formatServerTimestamp(buzz.serverTimestamp));
      } else if (sub) {
        timeFormatted = sub.responseTimeMs
          ? (sub.responseTimeMs / 1000).toFixed(2) + 's'
          : '—';
      }

      return {
        candidateId: c._id,
        name: c.name,
        score: c.score || 0,
        delta: (c.score || 0) - (prevCandidateScores[c._id] || 0),
        timeFormatted,
        rankInRound: buzz?.rank || sub?.rank || undefined,
      };
    });

    setRoundResultsHistory((prev) => {
      const existingIdx = prev.findIndex((r) => r.roundNumber === currentRound.roundNumber);
      const newItem = {
        roundNumber: currentRound.roundNumber,
        roundTitle: currentRound.title || `Round ${currentRound.roundNumber}`,
        endedAt: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        candidateSnapshots,
      };
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newItem;
        return copy;
      }
      return [...prev, newItem];
    });

    // Remember scores for next round delta calculation
    const newPrev: Record<string, number> = {};
    candidates.forEach((c) => { newPrev[c._id] = c.score || 0; });
    setPrevCandidateScores(newPrev);

    notify(`Round ${currentRound.roundNumber} ended. Results saved!`);
  };


  const handleDeclareWinner = () => {
    setShowConfetti(true);
    sounds.playCorrect();
    notify('🎉 Champion & Winners declared! Grand celebration triggered!');
  };

  const isRound1 = currentRound?.type === 'QUESTION' || currentRound?.roundNumber === 1;

  const localJoinUrl = typeof window !== 'undefined' ? `${window.location.origin}/candidate?code=${gameCode}` : `http://localhost:3000/candidate?code=${gameCode}`;
  const wifiJoinUrl = networkInfo ? `http://${networkInfo.localIp}:${networkInfo.port}/candidate?code=${gameCode}` : localJoinUrl;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e]">
      <Header
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        latency={latency}
        gameCode={gameCode}
        role="HOST"
      />

      {showConfetti && <ConfettiCelebration trigger={showConfetti} />}

      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-900 border border-amber-500 text-amber-300 text-xs font-bold shadow-2xl animate-fade-in flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Admin Arena */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 space-y-6">
        {/* Host Header Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Shield className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black gold-gradient-text uppercase">
                  Vardhman KBC • Host Control Center
                </h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-bold">
                  Mahaveer Dham Dewas
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connected as <span className="text-slate-200 font-mono">rahul@admin.com</span> • Game <span className="text-amber-400 font-mono font-bold">{gameCode}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons: Live Standings / Winner, Share, and Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 🏆 LIVE STANDINGS & WINNER BUTTON */}
            <button
              onClick={() => setShowStandingsModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:scale-105 transition-all cursor-pointer"
            >
              <Trophy className="w-4 h-4 fill-current" />
              <span>🏆 Live Standings & Winner</span>
            </button>

            {/* Share Join Link */}
            <button
              onClick={() => setShowShareModal(true)}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Share Link</span>
            </button>

            {/* View Tabs */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('CONTROLS')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                  activeTab === 'CONTROLS'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Controls</span>
              </button>
              <button
                onClick={() => setActiveTab('CANDIDATES')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                  activeTab === 'CANDIDATES'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Players ({candidates.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('SOUNDS')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                  activeTab === 'SOUNDS'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Sounds</span>
              </button>
            </div>
          </div>
        </div>

        {/* LIVE CONNECTED CANDIDATES PERSISTENT STRIP */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span>Connected Candidates ({candidates.length})</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              </div>
              <div className="text-[10px] text-slate-400">
                Candidates joining from phones, tablets, or separate tabs appear here with live DB scores
              </div>
            </div>
          </div>

          {/* Candidate Chips List with live scores */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1 scrollbar-none">
            {candidates.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No candidates connected yet. Share the link above to invite players.</span>
            ) : (
              Array.from(new Map(candidates.map((c) => [(c.name || '').trim().toLowerCase(), c])).values()).map((c) => (
                <div
                  key={c._id}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium flex items-center gap-1.5 flex-shrink-0 shadow-sm"
                >
                  <span className={`w-2 h-2 rounded-full ${c.isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'}`} />
                  <span className="font-bold">{c.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] font-mono">
                    {c.score || 0} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🏆 STANDINGS / WINNER LEADERBOARD MODAL */}
        {showStandingsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-3xl kbc-frame p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_#f59e0b]">
                    <Trophy className="w-6 h-6 fill-current" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black gold-gradient-text uppercase">
                      Championship Live Standings & Winner
                    </h2>
                    <p className="text-xs text-slate-400">
                      Real-time rankings stored in MongoDB Atlas across all rounds
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeclareWinner}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Celebrate Winner!</span>
                  </button>
                  <button
                    onClick={() => setShowStandingsModal(false)}
                    className="text-slate-400 hover:text-slate-200 font-bold text-lg px-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* View Switcher Tabs: Overall vs Round-Wise */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setStandingsModalTab('OVERALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                    standingsModalTab === 'OVERALL'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 fill-current" />
                  <span>🏆 Overall Standings & Time</span>
                </button>
                <button
                  onClick={() => setStandingsModalTab('ROUND_WISE')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                    standingsModalTab === 'ROUND_WISE'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>📋 Round-Wise Detailed Results</span>
                </button>
              </div>

              {/* TAB 1: OVERALL STANDINGS WITH TIME COLUMN */}
              {standingsModalTab === 'OVERALL' && (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                    <span>Candidates ranked by score & fastest response time</span>
                    <span className="font-mono text-amber-400/90 font-bold">{rankedCandidates.length} Candidates</span>
                  </div>

                  {rankedCandidates.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      No candidates registered yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {rankedCandidates.map((cand, idx) => {
                        const rankNum = idx + 1;
                        const isWinner = rankNum === 1;
                        const breakdown = candidateRoundBreakdown[cand._id];
                        const bestTime = breakdown?.bestTimeFormatted || '—';

                        return (
                          <div
                            key={cand._id}
                            className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                              isWinner
                                ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                                : rankNum === 2
                                ? 'bg-slate-800/60 border-slate-600'
                                : rankNum === 3
                                ? 'bg-amber-950/30 border-amber-700/60'
                                : 'bg-slate-950/80 border-slate-800'
                            }`}
                          >
                            {/* Rank & Candidate Profile */}
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <div className="w-8 flex items-center justify-center">
                                {rankNum === 1 ? (
                                  <span className="p-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-[0_0_10px_#f59e0b]">
                                    🏆
                                  </span>
                                ) : rankNum === 2 ? (
                                  <span className="p-1.5 rounded-full bg-slate-300 text-slate-950 font-black text-xs">
                                    🥈
                                  </span>
                                ) : rankNum === 3 ? (
                                  <span className="p-1.5 rounded-full bg-amber-700 text-white font-black text-xs">
                                    🥉
                                  </span>
                                ) : (
                                  <span className="font-mono font-bold text-sm text-slate-400">
                                    #{rankNum}
                                  </span>
                                )}
                              </div>

                              <div>
                                <div className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                                  <span>{cand.name}</span>
                                  {isWinner && (
                                    <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase shadow-[0_0_8px_#f59e0b]">
                                      Leader
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span className={cand.isOnline ? 'text-emerald-400' : 'text-slate-500'}>
                                    {cand.isOnline ? '● Online' : '○ Offline'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* ⏱ TIME COLUMN (Best / Fastest Buzz) */}
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                Fastest Time
                              </span>
                              <span className="font-mono font-bold text-xs text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 inline-flex items-center gap-1 shadow-sm">
                                <span>⏱</span>
                                <span>{bestTime}</span>
                              </span>
                            </div>

                            {/* ROUND-WISE POINTS BREAKDOWN PILLS */}
                            <div className="flex flex-col items-start min-w-[140px]">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                Round Breakdown
                              </span>
                              <div className="flex flex-wrap items-center gap-1">
                                {rounds.map((r) => {
                                  const rScore = breakdown?.roundScores[r.roundNumber];
                                  const rTime = breakdown?.roundTimes[r.roundNumber];

                                  return (
                                    <span
                                      key={r.roundNumber}
                                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                        rScore !== undefined && rScore > 0
                                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                          : 'bg-slate-900 text-slate-400 border-slate-800'
                                      }`}
                                      title={rTime ? `Round ${r.roundNumber} Time: ${rTime}` : undefined}
                                    >
                                      R{r.roundNumber}: {rScore !== undefined ? (rScore > 0 ? `+${rScore}` : rScore) : 0}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Points Badge & Counter Award */}
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="px-3.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-300 font-black font-mono text-base shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                {cand.score || 0} pts
                              </div>
                              <CandidatePointCounter candidateId={cand._id} onAwardPoints={handleAwardPoints} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ROUND-WISE DETAILED RESULTS */}
              {standingsModalTab === 'ROUND_WISE' && (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* Round filter buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pb-1">
                    <button
                      onClick={() => setSelectedStandingsRound('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedStandingsRound === 'ALL'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      All Rounds
                    </button>
                    {rounds.map((r) => (
                      <button
                        key={r.roundNumber}
                        onClick={() => setSelectedStandingsRound(r.roundNumber)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedStandingsRound === r.roundNumber
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        Round {r.roundNumber} ({r.status})
                      </button>
                    ))}
                  </div>

                  {/* List of round result tables */}
                  {(() => {
                    const roundsToShow =
                      selectedStandingsRound === 'ALL'
                        ? roundResultsHistory
                        : roundResultsHistory.filter((r) => r.roundNumber === selectedStandingsRound);

                    if (roundsToShow.length === 0) {
                      return (
                        <div className="py-12 text-center text-slate-400 text-sm">
                          No round results available yet. Complete or end a round to record history.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {[...roundsToShow].reverse().map((rResult, rIdx) => (
                          <div
                            key={rIdx}
                            className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/25 space-y-3 shadow-lg"
                          >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="p-1 rounded bg-amber-500/20 text-amber-400 font-bold text-xs">
                                  Round {rResult.roundNumber}
                                </span>
                                <h4 className="font-extrabold text-sm text-slate-200 uppercase">
                                  {rResult.roundTitle}
                                </h4>
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Ended: {rResult.endedAt}
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                    <th className="py-2 px-3">Rank</th>
                                    <th className="py-2 px-3">Candidate</th>
                                    <th className="py-2 px-3 text-center">Time</th>
                                    <th className="py-2 px-3 text-center">Round Points</th>
                                    <th className="py-2 px-3 text-center">Cumulative Score</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {rResult.candidateSnapshots.map((cand, cIdx) => (
                                    <tr
                                      key={cIdx}
                                      className={`transition-colors ${
                                        cIdx === 0 ? 'bg-amber-500/10' : 'hover:bg-slate-900/40'
                                      }`}
                                    >
                                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                                        {cIdx === 0 ? '🥇' : cIdx === 1 ? '🥈' : cIdx === 2 ? '🥉' : `#${cIdx + 1}`}
                                      </td>
                                      <td className="py-2.5 px-3 font-bold text-slate-100">
                                        {cand.name}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span className="font-mono font-bold text-xs text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/20 inline-flex items-center gap-1">
                                          <span>⏱</span>
                                          <span>{cand.timeFormatted || '—'}</span>
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                                            cand.delta > 0
                                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                                              : cand.delta < 0
                                              ? 'text-rose-400 bg-rose-500/10 border border-rose-500/30'
                                              : 'text-slate-400 bg-slate-900 border border-slate-800'
                                          }`}
                                        >
                                          {cand.delta > 0 ? `+${cand.delta}` : cand.delta}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-black font-mono text-amber-400 text-sm">
                                        {cand.score} pts
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}


              <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-xs text-slate-400">
                <span>All scores automatically stored in database</span>
                <button
                  onClick={() => setShowStandingsModal(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHARE JOIN LINK MODAL */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-lg kbc-frame p-6 sm:p-7 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-black gold-gradient-text uppercase">
                    Share Candidate Join Link
                  </h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-slate-200 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. Mobile WiFi LAN Link */}
                {networkInfo && networkInfo.localIp !== 'localhost' && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between text-amber-400 font-bold uppercase">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4" />
                        <span>Mobile / WiFi Join Link (Other Devices on Same WiFi)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={wifiJoinUrl}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => copyJoinLink(wifiJoinUrl)}
                        className="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center gap-1 hover:bg-amber-400 transition-colors cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Open this URL on phones, tablets, or other laptops connected to the same WiFi.
                    </p>
                  </div>
                )}

                {/* 2. Local PC / Same Browser Link */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-300 font-bold uppercase">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span>Local PC Browser Link (New Tabs / Windows)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={localJoinUrl}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => copyJoinLink(localJoinUrl)}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-slate-300">
                  <strong className="text-amber-400">Game Code: </strong>
                  <span className="font-mono font-bold text-amber-300">{gameCode}</span>
                </div>
              </div>

              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Rounds Switcher Bar (Instant real-time zero-refresh) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-bold">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Rounds Selection ({rounds.length} Total Rounds)</span>
            </div>
            {/* + Add Round Button */}
            <button
              onClick={handleAddRound}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.15)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ ADD ROUND</span>
            </button>
          </div>

          {/* Rounds Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {rounds.map((r) => {
              const isSelected = selectedRoundId === r._id || currentRound?._id === r._id;
              const isR1 = r.roundNumber === 1 || r.type === 'QUESTION';

              return (
                <button
                  key={r._id}
                  onClick={() => handleSelectRound(r._id)}
                  className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 flex-shrink-0 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {r.roundNumber}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      {r.title}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isR1 ? 'Common Question' : 'Buzzer Face-Off'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: GAME CONTROLS */}
        {activeTab === 'CONTROLS' && (
          <div className="space-y-6">
            {/* ROUND 1 CONTROLS */}
            {isRound1 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Question Editor & Bank */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Saved Questions in DB & Presets Selector */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Round 1 Question Bank (DB & Presets)</span>
                      </div>
                      <button
                        onClick={handleSaveQuestionToBank}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>+ SAVE CURRENT TO BANK</span>
                      </button>
                    </div>

                    {/* Saved Questions from DB */}
                    {savedQuestions.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">
                          Saved in Database ({savedQuestions.length}):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {savedQuestions.map((sq, idx) => (
                            <button
                              key={sq._id || idx}
                              onClick={() => handleLoadSavedQuestion(sq)}
                              className="p-2.5 rounded-lg bg-slate-950/90 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/50 text-left text-xs transition-colors flex items-start justify-between gap-2 group cursor-pointer"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-slate-200 block truncate group-hover:text-emerald-300">
                                  {sq.questionText}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {sq.category || 'General'} • Correct: ({sq.correctAnswerId})
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Presets */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">
                        Quick Preset Templates:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PRESET_QUESTIONS.map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleLoadPreset(preset)}
                            className="p-2.5 rounded-lg bg-slate-950/80 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 text-left text-xs transition-colors flex items-start justify-between gap-2 group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-200 block truncate group-hover:text-amber-300">
                                {preset.questionText}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {preset.category} • Correct: ({preset.correctAnswerId})
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Question Composition Form */}
                  <div className="kbc-frame p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h2 className="text-base font-bold gold-gradient-text uppercase">
                        Round 1 Question Composer
                      </h2>
                      <span className="text-xs text-slate-400">
                        Broadcasts to all connected candidates simultaneously
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                        Question Text
                      </label>
                      <textarea
                        rows={3}
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="Type your question here..."
                        className="w-full p-3 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* 4 Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const val = opt === 'A' ? optionA : opt === 'B' ? optionB : opt === 'C' ? optionC : optionD;
                        const setVal = opt === 'A' ? setOptionA : opt === 'B' ? setOptionB : opt === 'C' ? setOptionC : setOptionD;

                        return (
                          <div key={opt} className="relative">
                            <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center justify-between">
                              <span>Option {opt}</span>
                              <span className="flex items-center gap-1 text-[11px] text-amber-400 cursor-pointer">
                                <input
                                  type="radio"
                                  name="correctAnswer"
                                  checked={correctAnswer === opt}
                                  onChange={() => setCorrectAnswer(opt)}
                                  className="accent-amber-400 cursor-pointer"
                                  title="Set as correct answer"
                                />
                                <span>Correct</span>
                              </span>
                            </label>
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => setVal(e.target.value)}
                              className={`w-full px-3.5 py-2 rounded-lg bg-slate-950/80 border text-sm text-slate-100 focus:outline-none ${
                                correctAnswer === opt ? 'border-amber-400 ring-1 ring-amber-400/40' : 'border-slate-700'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Time limit & explanation */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                          Time Limit (Seconds)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={timeLimit}
                          onChange={(e) => setTimeLimit(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700 text-sm font-mono text-amber-400 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                          Explanation / Fact
                        </label>
                        <input
                          type="text"
                          value={explanation}
                          onChange={(e) => setExplanation(e.target.value)}
                          placeholder="Shown when results are revealed"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700 text-sm text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleStartQuestion}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 hover:scale-105 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>START QUESTION / TIMER</span>
                      </button>

                      <button
                        onClick={handleUpdateQuestion}
                        className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>UPDATE & PUSH TO PLAYERS</span>
                      </button>

                      <button
                        onClick={handleSaveQuestionToBank}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 font-bold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <BookmarkPlus className="w-4 h-4" />
                        <span>SAVE TO BANK</span>
                      </button>

                      <button
                        onClick={handleStopQuestion}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Square className="w-4 h-4" />
                        <span>STOP</span>
                      </button>

                      <button
                        onClick={handleRevealRound1Results}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>REVEAL RESULTS</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Col: Live Candidate Responses & Accuracy Table */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider gold-gradient-text flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>Round 1 Responses ({round1Submissions.length}/{candidates.length})</span>
                      </div>
                      {isRound1Revealed && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase">
                          Results Live
                        </span>
                      )}
                    </div>

                    {/* Submissions List */}
                    {round1Submissions.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No submissions yet. Start the question for candidates to answer.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                        {round1Submissions.map((sub, index) => (
                          <div
                            key={index}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                              isRound1Revealed
                                ? sub.isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                                : 'bg-slate-950/80 border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isRound1Revealed && (
                                <span className="font-mono font-black text-amber-400">
                                  #{sub.rank || index + 1}
                                </span>
                              )}
                              <span className="font-bold">{sub.candidateName}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-black text-[11px] text-amber-400">
                                {sub.selectedOptionId}
                              </span>
                              <span className="font-mono text-slate-400 text-[11px]">
                                {(sub.responseTimeMs / 1000).toFixed(3)}s
                              </span>
                              {isRound1Revealed && (
                                <span
                                  className={`text-[11px] font-black px-1.5 py-0.5 rounded ${
                                    sub.isCorrect
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  }`}
                                >
                                  {sub.isCorrect ? '✓ Correct' : '✗ Wrong'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ROUND 2+ BUZZER CONTROLS (UNLIMITED QUESTIONS & BUZZERS) */
              <div className="space-y-6">
                {/* Host Buzzer Controls Bar */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-black gold-gradient-text uppercase">
                        Round {currentRound?.roundNumber}: Buzzer Arena Controls
                      </h2>
                      <p className="text-xs text-slate-400">
                        Ask any question! You can start and stop unlimited buzzer questions as many times as you like.
                      </p>
                    </div>

                    {/* Buzzer Status Pill */}
                    <div
                      className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase flex items-center gap-2 ${
                        buzzerSession?.status === 'ACTIVE'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 animate-pulse shadow-[0_0_15px_#10b981]'
                          : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                      }`}
                    >
                      {buzzerSession?.status === 'ACTIVE' ? (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>🟢 BUZZER IS ACTIVE</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>🔴 BUZZER IS DISABLED</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Instruction notice – no question shown, host speaks manually */}
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-amber-200/80 text-xs flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-amber-400">Host-Led Question:</strong> No question is shown on candidate screens. Host reads out the question verbally. Click <strong>START BUZZER</strong> to open buzzing for all candidates.
                    </span>
                  </div>

                  {/* Primary Action Buttons — Smart enable/disable */}
                  {(() => {
                    const isActive = buzzerSession?.status === 'ACTIVE';
                    const isClosed = buzzerSession?.status === 'CLOSED';
                    const isDisabled = !buzzerSession || buzzerSession.status === 'DISABLED';
                    // START: enabled only when not ACTIVE
                    const canStart = !isActive;
                    // STOP: enabled only when ACTIVE
                    const canStop = isActive;
                    // RESET: enabled when ACTIVE or CLOSED
                    const canReset = isActive || isClosed;
                    // NEXT QUESTION: enabled only when CLOSED or DISABLED (after at least one session)
                    const canNext = isClosed;

                    return (
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {/* START BUZZER */}
                        <button
                          onClick={handleStartBuzzer}
                          disabled={!canStart}
                          className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                            canStart
                              ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer'
                              : 'bg-slate-800/60 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
                          }`}
                          title={!canStart ? 'Buzzer is already active' : 'Start buzzer for all candidates'}
                        >
                          <Zap className="w-4 h-4 fill-current" />
                          <span>START BUZZER</span>
                        </button>

                        {/* STOP BUZZER */}
                        <button
                          onClick={handleStopBuzzer}
                          disabled={!canStop}
                          className={`px-5 py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
                            canStop
                              ? 'bg-rose-700 hover:bg-rose-600 text-white hover:scale-105 shadow-[0_0_15px_rgba(225,29,72,0.3)] cursor-pointer'
                              : 'bg-slate-800/60 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
                          }`}
                          title={!canStop ? 'Buzzer is not active' : 'Stop buzzer'}
                        >
                          <Square className="w-4 h-4 fill-current" />
                          <span>STOP BUZZER</span>
                        </button>

                        {/* RESET BUZZER */}
                        <button
                          onClick={handleResetBuzzer}
                          disabled={!canReset}
                          className={`px-5 py-3 rounded-xl font-bold text-sm uppercase flex items-center gap-2 transition-all ${
                            canReset
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 hover:scale-105 cursor-pointer'
                              : 'bg-slate-800/60 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
                          }`}
                          title={!canReset ? 'Nothing to reset' : 'Reset buzzer ranking'}
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>RESET BUZZER</span>
                        </button>

                        {/* NEXT QUESTION */}
                        <button
                          onClick={handleNextBuzzerQuestion}
                          disabled={!canNext}
                          className={`px-5 py-3 rounded-xl font-bold text-sm uppercase flex items-center gap-2 transition-all ${
                            canNext
                              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                              : 'bg-slate-800/60 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
                          }`}
                          title={!canNext ? 'Stop the buzzer first, then use Next Question' : 'Ready for next question'}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>NEXT QUESTION</span>
                        </button>

                        {/* END ROUND */}
                        <button
                          onClick={handleEndRound}
                          className="px-5 py-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 font-bold text-sm uppercase flex items-center gap-2 hover:scale-105 transition-all cursor-pointer ml-auto"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>END ROUND</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Live Real-Time Buzzer Table Component with Points Awarding Column */}
                <LiveBuzzerTable
                  events={buzzerEvents}
                  qualifyingCount={qualifyingCount}
                  onQualifyingCountChange={(count) => setQualifyingCount(count)}
                  isHost={true}
                  candidatesMap={candidatesMap}
                  onAwardPoints={handleAwardPoints}
                />

                {/* Ended Round Results History */}
                {roundResultsHistory.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-amber-500/20" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                        Round Results History
                      </span>
                      <div className="flex-1 h-px bg-amber-500/20" />
                    </div>

                    {/* Show results in reverse order (latest first) */}
                    {[...roundResultsHistory].reverse().map((result, revIdx) => (
                      <RoundResultCard key={revIdx} result={result} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: CONNECTED CANDIDATES & TEAM / POINT MANAGEMENT */}
        {activeTab === 'CANDIDATES' && (
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-extrabold gold-gradient-text uppercase">
                  Candidates Points Manager ({Array.from(new Map(candidates.map((c) => [(c.name || '').trim().toLowerCase(), c])).values()).length})
                </h2>
                <p className="text-xs text-slate-400">
                  Manage registered candidates and live point balances stored in MongoDB
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStandingsModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer hover:bg-amber-400"
                >
                  <Trophy className="w-3.5 h-3.5 fill-current" />
                  <span>View Winner Standings</span>
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Link</span>
                </button>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No candidates connected yet. Ask candidates to join with Game Code: <strong className="text-amber-400">{gameCode}</strong>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from(new Map(candidates.map((c) => [(c.name || '').trim().toLowerCase(), c])).values()).map((c) => {
                  return (
                    <div
                      key={c._id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-amber-400 flex-shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-slate-100 truncate">{c.name}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'
                              }`}
                            />
                            <span>{c.isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Balance & Counter Award */}
                      <div className="pt-1.5 border-t border-slate-800/60 space-y-1.5">
                        {/* Total score badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Total Points</span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black font-mono text-sm">
                            {c.score || 0} pts
                          </span>
                        </div>

                        {/* Counter: − delta + Confirm */}
                        <CandidatePointCounter candidateId={c._id} onAwardPoints={handleAwardPoints} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: SOUNDBOARD & EFFECTS */}
        {activeTab === 'SOUNDS' && (
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div>
              <h2 className="text-base font-extrabold gold-gradient-text uppercase">
                KBC Live Audio Soundboard
              </h2>
              <p className="text-xs text-slate-400">
                Trigger procedural game-show audio cues synthesized in real-time
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <button
                onClick={() => sounds.playTick()}
                className="p-4 rounded-xl bg-slate-950 border border-slate-700 hover:border-amber-400 text-center space-y-2 hover:scale-105 transition-all cursor-pointer"
              >
                <Clock className="w-5 h-5 text-amber-400 mx-auto" />
                <div className="text-xs font-bold text-slate-200">Clock Tick</div>
              </button>

              <button
                onClick={() => sounds.playLock()}
                className="p-4 rounded-xl bg-slate-950 border border-slate-700 hover:border-amber-400 text-center space-y-2 hover:scale-105 transition-all cursor-pointer"
              >
                <Lock className="w-5 h-5 text-amber-400 mx-auto" />
                <div className="text-xs font-bold text-slate-200">Option Lock</div>
              </button>

              <button
                onClick={() => sounds.playBuzzer()}
                className="p-4 rounded-xl bg-slate-950 border border-slate-700 hover:border-amber-400 text-center space-y-2 hover:scale-105 transition-all cursor-pointer"
              >
                <Zap className="w-5 h-5 text-amber-400 mx-auto" />
                <div className="text-xs font-bold text-slate-200">Buzzer Blast</div>
              </button>

              <button
                onClick={() => sounds.playBuzzerEnabled()}
                className="p-4 rounded-xl bg-slate-950 border border-slate-700 hover:border-amber-400 text-center space-y-2 hover:scale-105 transition-all cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-amber-400 mx-auto" />
                <div className="text-xs font-bold text-slate-200">Buzzer Alert</div>
              </button>

              <button
                onClick={() => sounds.playCorrect()}
                className="p-4 rounded-xl bg-slate-950 border border-slate-700 hover:border-emerald-400 text-center space-y-2 hover:scale-105 transition-all cursor-pointer"
              >
                <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                <div className="text-xs font-bold text-emerald-300">Right Answer</div>
              </button>

              <button
                onClick={() => sounds.playWrong()}
                className="p-4 rounded-xl bg-slate-950 border border-slate-700 hover:border-rose-400 text-center space-y-2 hover:scale-105 transition-all cursor-pointer"
              >
                <Square className="w-5 h-5 text-rose-400 mx-auto" />
                <div className="text-xs font-bold text-rose-300">Wrong Answer</div>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function HostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-amber-400 font-bold">
          Loading Host Dashboard...
        </div>
      }
    >
      <HostDashboard />
    </Suspense>
  );
}
