'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { Header } from '@/components/Header';
import { TimerDisplay } from '@/components/TimerDisplay';
import { LiveBuzzerTable } from '@/components/LiveBuzzerTable';
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
  OptionId,
} from '@/types';
import { sounds } from '@/lib/audio';
import { formatOrder } from '@/lib/orderQuestion';
import { Trophy, Zap, Users, Lock, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

function BigScreenArena() {
  const searchParams = useSearchParams();
  const { socket, isConnected, isReconnecting, latency } = useSocket();

  const codeParam = searchParams.get('code') || 'KBC-2026';
  const [gameCode] = useState(codeParam.toUpperCase());

  const [game, setGame] = useState<IGame | null>(null);
  const [rounds, setRounds] = useState<IRound[]>([]);
  const [currentRound, setCurrentRound] = useState<IRound | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<IQuestion | null>(null);
  const [candidates, setCandidates] = useState<ICandidate[]>([]);
  const [buzzerSession, setBuzzerSession] = useState<IBuzzerSession | null>(null);
  const [buzzerEvents, setBuzzerEvents] = useState<IBuzzerEvent[]>([]);

  const [round1Results, setRound1Results] = useState<{
    correctAnswerId?: 'A' | 'B' | 'C' | 'D';
    correctOrder?: OptionId[];
    explanation?: string;
    submissions?: IAnswerSubmission[];
  } | null>(null);
  const [isRound1Revealed, setIsRound1Revealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit(SOCKET_EVENTS.SCREEN_JOIN, {
      gameCode,
    });
  }, [socket, isConnected, gameCode]);

  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (data: {
      game: IGame;
      rounds: IRound[];
      currentRound: IRound;
      activeQuestion: IQuestion | null;
      buzzerSession: IBuzzerSession;
    }) => {
      setGame(data.game);
      setRounds(data.rounds);
      setCurrentRound(data.currentRound);
      setActiveQuestion(data.activeQuestion);
      setBuzzerSession(data.buzzerSession);
      setBuzzerEvents(data.buzzerSession?.events || []);
    };

    const handleCandidateListUpdate = (candidateList: ICandidate[]) => {
      setCandidates(candidateList);
    };

    const handleQuestionStarted = (question: IQuestion) => {
      setActiveQuestion(question);
      setIsRound1Revealed(false);
      setRound1Results(null);
      sounds.playLock();
    };

    const handleRound1Results = (data: {
      correctAnswerId: 'A' | 'B' | 'C' | 'D';
      correctOrder?: OptionId[];
      explanation?: string;
      submissions: IAnswerSubmission[];
    }) => {
      setIsRound1Revealed(true);
      setRound1Results(data);
      sounds.playCorrect();
      setShowConfetti(true);
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
    };

    const handleBuzzerRankingUpdate = (data: { events: IBuzzerEvent[]; latestEvent: IBuzzerEvent }) => {
      setBuzzerEvents(data.events || []);
      sounds.playBuzzer();
    };

    const handleBuzzerStopped = () => {
      setBuzzerSession((prev) => (prev ? { ...prev, status: 'CLOSED' } : null));
    };

    const handleBuzzerReset = () => {
      setBuzzerSession((prev) => (prev ? { ...prev, status: 'DISABLED', events: [] } : null));
      setBuzzerEvents([]);
    };

    const handleRoundSelected = (data: {
      game: IGame;
      rounds: IRound[];
      currentRound: IRound;
      activeQuestion: IQuestion | null;
      buzzerSession: IBuzzerSession;
    }) => {
      if (data.game) setGame(data.game);
      if (data.rounds) setRounds(data.rounds);
      if (data.currentRound) setCurrentRound(data.currentRound);
      if (data.activeQuestion) setActiveQuestion(data.activeQuestion);
      if (data.buzzerSession) {
        setBuzzerSession(data.buzzerSession);
        setBuzzerEvents(data.buzzerSession.events || []);
      }
    };

    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, handleStateUpdate);
    socket.on(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, handleCandidateListUpdate);
    socket.on(SOCKET_EVENTS.ROUND_SELECTED, handleRoundSelected);
    socket.on(SOCKET_EVENTS.ROUND1_QUESTION_STARTED, handleQuestionStarted);
    socket.on(SOCKET_EVENTS.ROUND1_RESULTS_UPDATED, handleRound1Results);
    socket.on(SOCKET_EVENTS.ROUND2_START_BUZZER, handleBuzzerStarted);
    socket.on(SOCKET_EVENTS.ROUND2_RANKING_UPDATED, handleBuzzerRankingUpdate);
    socket.on(SOCKET_EVENTS.ROUND2_STOP_BUZZER, handleBuzzerStopped);
    socket.on(SOCKET_EVENTS.ROUND2_RESET_BUZZER, handleBuzzerReset);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE, handleStateUpdate);
      socket.off(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, handleCandidateListUpdate);
      socket.off(SOCKET_EVENTS.ROUND_SELECTED, handleRoundSelected);
      socket.off(SOCKET_EVENTS.ROUND1_QUESTION_STARTED, handleQuestionStarted);
      socket.off(SOCKET_EVENTS.ROUND1_RESULTS_UPDATED, handleRound1Results);
      socket.off(SOCKET_EVENTS.ROUND2_START_BUZZER, handleBuzzerStarted);
      socket.off(SOCKET_EVENTS.ROUND2_RANKING_UPDATED, handleBuzzerRankingUpdate);
      socket.off(SOCKET_EVENTS.ROUND2_STOP_BUZZER, handleBuzzerStopped);
      socket.off(SOCKET_EVENTS.ROUND2_RESET_BUZZER, handleBuzzerReset);
    };
  }, [socket]);

  const candidatesMap = React.useMemo(() => {
    const map: Record<string, { score?: number; team?: string }> = {};
    candidates.forEach((c) => {
      map[c._id] = { score: c.score || 0, team: c.team || 'Team' };
    });
    return map;
  }, [candidates]);

  const isRound1 = currentRound?.type === 'QUESTION' || currentRound?.roundNumber === 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e]">
      <Header
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        latency={latency}
        gameCode={gameCode}
        role="SCREEN"
      />

      {showConfetti && <ConfettiCelebration trigger={showConfetti} />}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col justify-between space-y-8">
        {/* Stage Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Trophy className="w-4 h-4" />
            <span>Vardhman KBC • Mahaveer Dham Dewas Championship</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black gold-gradient-text uppercase">
            {currentRound?.title || `Round ${game?.currentRoundNumber || 1}`}
          </h1>
          <p className="text-sm text-slate-400">
            Room Code: <strong className="text-amber-400 font-mono">{gameCode}</strong> • {candidates.length} Live Candidates
          </p>
        </div>

        {/* ROUND 1: COMMON QUESTION SCREEN */}
        {isRound1 && (
          <div className="w-full max-w-5xl mx-auto space-y-8 my-auto">
            {activeQuestion ? (
              <>
                {/* Stage Timer */}
                {activeQuestion.status === 'ACTIVE' && (
                  <div className="flex justify-center">
                    <TimerDisplay
                      startedAt={activeQuestion.startedAt}
                      timeLimitSeconds={activeQuestion.timeLimitSeconds}
                      isActive={activeQuestion.status === 'ACTIVE'}
                      size="xl"
                    />
                  </div>
                )}

                {/* Grand Question Frame */}
                <div className="kbc-frame p-8 sm:p-12 text-center relative overflow-hidden">
                  <div className="text-xs uppercase tracking-wider text-amber-400/60 font-bold mb-2">
                    {activeQuestion.category || 'General Knowledge'}
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100 leading-snug">
                    {activeQuestion.questionText}
                  </h2>
                  {activeQuestion.questionType === 'ORDER' && (
                    <div className="mt-4 inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 text-sm font-bold uppercase tracking-wider">
                      Arrange in the correct order
                    </div>
                  )}
                </div>

                {/* Correct sequence reveal for ORDER questions */}
                {activeQuestion.questionType === 'ORDER' && isRound1Revealed && round1Results?.correctOrder && (
                  <div className="p-6 rounded-2xl bg-emerald-950/40 border-2 border-emerald-400 shadow-[0_0_30px_rgba(34,197,94,0.35)] space-y-4">
                    <div className="text-center text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
                      Correct Order: {formatOrder(round1Results.correctOrder)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {round1Results.correctOrder.map((id, position) => (
                        <div key={id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-950/60 border border-emerald-500/40">
                          <span className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-black text-lg">
                            {position + 1}
                          </span>
                          <span className="text-emerald-300 font-black text-xl">{id}.</span>
                          <span className="text-xl font-bold text-slate-100">
                            {activeQuestion.options.find((o) => o.id === id)?.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {activeQuestion.options.map((opt) => {
                    const isThisCorrect =
                      isRound1Revealed && activeQuestion.questionType !== 'ORDER' && round1Results?.correctAnswerId === opt.id;

                    return (
                      <div
                        key={opt.id}
                        className={`p-6 rounded-2xl border-2 flex items-center gap-5 transition-all ${
                          isThisCorrect
                            ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 shadow-[0_0_30px_rgba(34,197,94,0.5)] scale-102'
                            : 'bg-slate-900/80 border-amber-500/30 text-slate-200'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                            isThisCorrect
                              ? 'bg-emerald-400 text-slate-950 shadow-[0_0_15px_#22c55e]'
                              : 'bg-slate-800 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {opt.id}
                        </div>
                        <span className="text-xl sm:text-2xl font-bold flex-1">{opt.text}</span>
                        {isThisCorrect && (
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Top Correct Speed Rankings Table on Reveal */}
                {isRound1Revealed && round1Results && (
                  <div className="p-6 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-2xl space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <h3 className="text-xl font-black gold-gradient-text uppercase">
                          Round 1 Speed & Accuracy Results
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400">
                        Ranked by Correctness first, then fastest response time
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {round1Results.submissions?.map((sub, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border flex items-center justify-between ${
                            sub.isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-black text-base text-amber-400">
                              #{sub.rank || idx + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-200 truncate">
                              {sub.candidateName}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-xs font-bold text-amber-400">
                              {(sub.responseTimeMs / 1000).toFixed(3)}s
                            </div>
                            <div className="text-[10px]">
                              {sub.submittedOrder && <span className="font-mono mr-1">{sub.submittedOrder.join('')}</span>}
                              {sub.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="kbc-frame p-12 text-center space-y-3">
                <Sparkles className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
                <h2 className="text-2xl font-bold text-slate-100">Preparing Next Question</h2>
                <p className="text-sm text-slate-400">
                  Host Rahul will launch the next common question shortly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ROUND 2+ : BUZZER ARENA SCREEN */}
        {!isRound1 && (
          <div className="w-full max-w-5xl mx-auto space-y-8 my-auto">
            {/* Host Presented Question Box */}
            <div className="kbc-frame p-8 sm:p-10 text-center space-y-2">
              <div className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                Host Question Prompt
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
                {buzzerSession?.questionPrompt || 'Listen carefully to Host Rahul!'}
              </h2>
            </div>

            {/* Live Buzzer Status Banner */}
            <div className="flex justify-center">
              <div
                className={`px-8 py-3.5 rounded-full border-2 text-lg sm:text-xl font-black uppercase tracking-wider flex items-center gap-3 transition-all ${
                  buzzerSession?.status === 'ACTIVE'
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300 animate-pulse shadow-[0_0_30px_#10b981]'
                    : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                }`}
              >
                {buzzerSession?.status === 'ACTIVE' ? (
                  <>
                    <Zap className="w-6 h-6 fill-current animate-bounce" />
                    <span>🟢 BUZZER ACTIVE • CANDIDATES BUZZ NOW!</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>🔴 BUZZER DISABLED</span>
                  </>
                )}
              </div>
            </div>

            {/* Big Screen Buzzer Leaderboard */}
            <LiveBuzzerTable
              events={buzzerEvents}
              qualifyingCount={5}
              isHost={false}
              candidatesMap={candidatesMap}
            />
          </div>
        )}

        {/* Stage Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>KBC Real-Time Quiz Championship Arena</div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>{candidates.length} Registered Players</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BigScreenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-amber-400 font-bold">
          Loading Big Screen Arena...
        </div>
      }
    >
      <BigScreenArena />
    </Suspense>
  );
}
