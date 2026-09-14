'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/useSocket';
import { Header } from '@/components/Header';
import { QuestionCard } from '@/components/QuestionCard';
import { BuzzerButton } from '@/components/BuzzerButton';
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
import { sounds } from '@/lib/audio';
import { Users, AlertTriangle, Trophy, Sparkles, CheckCircle2, Wifi, Loader2, ArrowRight } from 'lucide-react';

function CandidateArena() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { socket, isConnected, isReconnecting, latency, emit } = useSocket();

  const codeParam = searchParams.get('code') || 'KBC-2026';
  const nameParam = searchParams.get('name') || '';

  const [gameCode, setGameCode] = useState(codeParam.toUpperCase());
  const [candidateName, setCandidateName] = useState(nameParam);
  const [isJoined, setIsJoined] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [candidateId, setCandidateId] = useState<string>('');
  const [allCandidates, setAllCandidates] = useState<ICandidate[]>([]);

  // Game state from server
  const [game, setGame] = useState<IGame | null>(null);
  const [rounds, setRounds] = useState<IRound[]>([]);
  const [currentRound, setCurrentRound] = useState<IRound | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<IQuestion | null>(null);
  const [buzzerSession, setBuzzerSession] = useState<IBuzzerSession | null>(null);

  // Candidate personal state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isRound1Revealed, setIsRound1Revealed] = useState(false);
  const [round1Results, setRound1Results] = useState<{
    correctAnswerId?: string;
    explanation?: string;
    submissions?: IAnswerSubmission[];
  } | null>(null);

  const [candidateBuzzerEvent, setCandidateBuzzerEvent] = useState<IBuzzerEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [winnerData, setWinnerData] = useState<{ winner: ICandidate; standings: ICandidate[] } | null>(null);

  // Direct Join Function via REST API + WebSocket
  const performJoin = async (nameToJoin: string, codeToJoin: string) => {
    if (!nameToJoin.trim() || !codeToJoin.trim()) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Instant REST Registration
      const res = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: codeToJoin, name: nameToJoin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to join game.');
        setIsSubmitting(false);
        sounds.playWrong();
        return;
      }

      // 2. Immediately Transition to Player Board
      setCandidateId(data.candidateId);
      setCandidateName(data.candidateName);
      setGame(data.game);
      setRounds(data.rounds);
      setCurrentRound(data.currentRound);
      setActiveQuestion(data.activeQuestion);
      setAllCandidates(data.allCandidates || []);
      setIsJoined(true);
      setIsSubmitting(false);

      // Save per-tab session
      sessionStorage.setItem(`kbc_candidate_id_${codeToJoin}`, data.candidateId);
      sessionStorage.setItem(`kbc_candidate_name_${codeToJoin}`, data.candidateName);

      sounds.playLock();

      // 3. Connect/Sync via WebSocket using the obtained candidateId
      emit(SOCKET_EVENTS.CANDIDATE_RECONNECT, {
        gameCode: codeToJoin,
        candidateId: data.candidateId,
      });
    } catch (err) {
      console.error('[Join Error]', err);
      // Fallback: emit via socket only if REST totally failed
      emit(SOCKET_EVENTS.CANDIDATE_JOIN, {
        gameCode: codeToJoin,
        name: nameToJoin,
      });
      setIsJoined(true);
      setIsSubmitting(false);
    }
  };

  // Auto-login if nameParam or existing sessionStorage exists
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessionSavedId = sessionStorage.getItem(`kbc_candidate_id_${gameCode}`);
    const sessionSavedName = sessionStorage.getItem(`kbc_candidate_name_${gameCode}`);

    if (nameParam && !isJoined) {
      setCandidateName(nameParam);
      performJoin(nameParam, gameCode);
    } else if (sessionSavedName && sessionSavedId && !isJoined) {
      setCandidateName(sessionSavedName);
      setCandidateId(sessionSavedId);
      performJoin(sessionSavedName, gameCode);
    }
  }, [nameParam, gameCode]);

  // Connect or Reconnect to game via WebSocket
  useEffect(() => {
    if (!socket || !isConnected || !isJoined) return;

    if (candidateId) {
      emit(SOCKET_EVENTS.CANDIDATE_RECONNECT, {
        gameCode,
        candidateId,
      });
    } else if (candidateName.trim()) {
      emit(SOCKET_EVENTS.CANDIDATE_JOIN, {
        gameCode,
        name: candidateName.trim(),
      });
    }
  }, [socket, isConnected, isJoined, candidateId, gameCode, candidateName, emit]);

  // WebSocket Event Handlers
  useEffect(() => {
    if (!socket) return;

    // Full Game State Update (on join/reconnect/round switch)
    const handleStateUpdate = (data: {
      game: IGame;
      rounds: IRound[];
      currentRound: IRound;
      activeQuestion: IQuestion | null;
      buzzerSession: IBuzzerSession;
      candidateId?: string;
      candidateName?: string;
      candidateSubmission?: IAnswerSubmission | null;
      candidateBuzzerEvent?: IBuzzerEvent | null;
    }) => {
      setGame(data.game);
      setRounds(data.rounds);
      setCurrentRound(data.currentRound);
      setActiveQuestion(data.activeQuestion);
      setBuzzerSession(data.buzzerSession);

      if (data.candidateId) {
        setCandidateId(data.candidateId);
        setIsJoined(true);
        sessionStorage.setItem(`kbc_candidate_id_${data.game.code}`, data.candidateId);
        if (data.candidateName) {
          setCandidateName(data.candidateName);
          sessionStorage.setItem(`kbc_candidate_name_${data.game.code}`, data.candidateName);
        }
      }

      if (data.candidateSubmission) {
        setSelectedOption(data.candidateSubmission.selectedOptionId);
        setIsAnswerSubmitted(true);
      } else {
        setSelectedOption(null);
        setIsAnswerSubmitted(false);
      }

      if (data.candidateBuzzerEvent) {
        setCandidateBuzzerEvent(data.candidateBuzzerEvent);
      } else {
        setCandidateBuzzerEvent(null);
      }

      setIsRound1Revealed(false);
      setRound1Results(null);
      setErrorMessage('');
    };

    const handleCandidateListUpdate = (candidateList: ICandidate[]) => {
      setAllCandidates(candidateList);
    };

    // Round 1 Events
    const handleQuestionStarted = (question: IQuestion) => {
      setActiveQuestion(question);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setIsRound1Revealed(false);
      setRound1Results(null);
      sounds.playLock();
    };

    const handleAnswerRecorded = (data: { selectedOptionId: 'A' | 'B' | 'C' | 'D'; responseTimeMs: number }) => {
      setSelectedOption(data.selectedOptionId);
      setIsAnswerSubmitted(true);
      sounds.playLock();
    };

    const handleRound1Results = (data: {
      questionId: string;
      correctAnswerId: string;
      explanation?: string;
      submissions: IAnswerSubmission[];
    }) => {
      setIsRound1Revealed(true);
      setRound1Results(data);

      const mySub = data.submissions.find((s) => s.candidateId === candidateId);
      if (mySub?.isCorrect) {
        sounds.playCorrect();
        setShowConfetti(true);
      } else {
        sounds.playWrong();
      }
    };

    // Round 2+ Buzzer Events
    const handleBuzzerStarted = (data: { status: 'ACTIVE'; enabledAt: number; prompt?: string; timeLimitSeconds?: number }) => {
      setBuzzerSession((prev) => ({
        _id: prev?._id || '',
        gameId: prev?.gameId || '',
        roundId: prev?.roundId || '',
        events: [],
        status: 'ACTIVE',
        enabledAt: data.enabledAt,
        timeLimitSeconds: data.timeLimitSeconds || 30,
        questionPrompt: data.prompt,
      }));
      setCandidateBuzzerEvent(null);
      sounds.playBuzzerEnabled();
    };

    const handleBuzzerRecorded = (event: IBuzzerEvent) => {
      setCandidateBuzzerEvent(event);
      sounds.playBuzzer();
    };

    const handleBuzzerStopped = () => {
      setBuzzerSession((prev) => (prev ? { ...prev, status: 'CLOSED' } : null));
    };

    const handleBuzzerReset = () => {
      setBuzzerSession((prev) => (prev ? { ...prev, status: 'DISABLED', events: [] } : null));
      setCandidateBuzzerEvent(null);
    };

    const handleRoundSelected = (data: {
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
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setIsRound1Revealed(false);
      setRound1Results(null);
      setCandidateBuzzerEvent(null);
    };

    const handleWinnerDeclared = (data: { winner: ICandidate; standings: ICandidate[] }) => {
      setWinnerData(data);
      setShowConfetti(true);
      sounds.playCorrect();
    };

    const handleError = (data: { message: string }) => {
      setErrorMessage(data.message);
      sounds.playWrong();
    };

    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, handleStateUpdate);
    socket.on(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, handleCandidateListUpdate);
    socket.on(SOCKET_EVENTS.ROUND1_QUESTION_STARTED, handleQuestionStarted);
    socket.on(SOCKET_EVENTS.ROUND1_ANSWER_RECORDED, handleAnswerRecorded);
    socket.on(SOCKET_EVENTS.ROUND1_RESULTS_UPDATED, handleRound1Results);
    socket.on(SOCKET_EVENTS.ROUND2_START_BUZZER, handleBuzzerStarted);
    socket.on(SOCKET_EVENTS.ROUND2_BUZZER_RECORDED, handleBuzzerRecorded);
    socket.on(SOCKET_EVENTS.ROUND2_STOP_BUZZER, handleBuzzerStopped);
    socket.on(SOCKET_EVENTS.ROUND2_RESET_BUZZER, handleBuzzerReset);
    socket.on(SOCKET_EVENTS.ROUND_SELECTED, handleRoundSelected);
    socket.on(SOCKET_EVENTS.WINNER_DECLARED, handleWinnerDeclared);
    socket.on(SOCKET_EVENTS.DECLARE_WINNER, handleWinnerDeclared);
    socket.on(SOCKET_EVENTS.ERROR, handleError);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE, handleStateUpdate);
      socket.off(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, handleCandidateListUpdate);
      socket.off(SOCKET_EVENTS.ROUND1_QUESTION_STARTED, handleQuestionStarted);
      socket.off(SOCKET_EVENTS.ROUND1_ANSWER_RECORDED, handleAnswerRecorded);
      socket.off(SOCKET_EVENTS.ROUND1_RESULTS_UPDATED, handleRound1Results);
      socket.off(SOCKET_EVENTS.ROUND2_START_BUZZER, handleBuzzerStarted);
      socket.off(SOCKET_EVENTS.ROUND2_BUZZER_RECORDED, handleBuzzerRecorded);
      socket.off(SOCKET_EVENTS.ROUND2_STOP_BUZZER, handleBuzzerStopped);
      socket.off(SOCKET_EVENTS.ROUND2_RESET_BUZZER, handleBuzzerReset);
      socket.off(SOCKET_EVENTS.ROUND_SELECTED, handleRoundSelected);
      socket.off(SOCKET_EVENTS.WINNER_DECLARED, handleWinnerDeclared);
      socket.off(SOCKET_EVENTS.DECLARE_WINNER, handleWinnerDeclared);
      socket.off(SOCKET_EVENTS.ERROR, handleError);
    };
  }, [socket, candidateId]);

  // Round 1: Select Option or Sequence
  const handleSelectOption = (optionId: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(optionId);
  };

  // Round 1: Explicit Lock & Submit Answer Action
  const handleSubmitAnswer = (sequenceStr?: string) => {
    const finalAnswer = sequenceStr || selectedOption;
    if (!game || !currentRound || !activeQuestion || isAnswerSubmitted || !finalAnswer || !candidateId) return;

    setIsAnswerSubmitted(true);
    emit(SOCKET_EVENTS.ROUND1_SUBMIT_ANSWER, {
      gameId: game._id,
      roundId: currentRound._id,
      questionId: activeQuestion._id,
      candidateId,
      selectedOptionId: finalAnswer,
    });
  };

  // Round 2+: Press Buzzer
  const handlePressBuzzer = () => {
    if (!game || !currentRound || !candidateId) return;

    emit(SOCKET_EVENTS.ROUND2_PRESS_BUZZER, {
      gameId: game._id,
      roundId: currentRound._id,
      candidateId,
    });
  };

  // Candidate Join Form Submit Handler
  const handleJoinFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !gameCode.trim()) return;

    const cleanCode = gameCode.trim().toUpperCase();
    const cleanName = candidateName.trim();

    router.replace(`/candidate?code=${encodeURIComponent(cleanCode)}&name=${encodeURIComponent(cleanName)}`);
    performJoin(cleanName, cleanCode);
  };

  const isRound1 = currentRound?.type === 'QUESTION' || currentRound?.roundNumber === 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e]">
      <Header
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        latency={latency}
        gameCode={gameCode}
        role="CANDIDATE"
      />

      {showConfetti && <ConfettiCelebration trigger={showConfetti} />}

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 sm:py-8 flex flex-col items-center justify-between">
        {/* If not joined, show Join Form */}
        {!isJoined ? (
          <div className="w-full max-w-md my-auto kbc-frame p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black mx-auto shadow-lg shadow-amber-500/20">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black gold-gradient-text uppercase">
                Join Quiz Arena
              </h1>
              <p className="text-xs text-slate-400">
                Enter your name to connect to the live championship server.
              </p>
            </div>

            <form onSubmit={handleJoinFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Your Full Name / Account Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Amit Verma"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-700 text-slate-100 placeholder:text-slate-500 font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Game Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KBC-2026"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-700 font-mono font-bold text-amber-400 text-lg uppercase placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-base uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>ENTERING ARENA...</span>
                  </>
                ) : (
                  <>
                    <span>JOIN ARENA NOW</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Candidate Active Arena Screen (PLAYER BOARD) */
          <div className="w-full space-y-6 flex-1 flex flex-col justify-between">
            {/* Top Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-sm text-slate-950 shadow-md">
                  {candidateName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                    <span>{candidateName}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  </div>
                  <div className="text-[10px] text-amber-400/80 font-mono font-bold flex items-center gap-1.5">
                    <span>{game?.title || 'KBC Live'} • Room {gameCode}</span>
                    {allCandidates.find((c) => c._id === candidateId || c.name === candidateName)?.team && (
                      <span className="text-slate-400 font-normal">
                        (Team {allCandidates.find((c) => c._id === candidateId || c.name === candidateName)?.team})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Candidate Score & Connected Status */}
              <div className="flex items-center gap-3">
                {/* Live Personal Score Badge */}
                <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Score:{' '}
                    <strong className="font-mono text-sm text-amber-200">
                      {allCandidates.find((c) => c._id === candidateId || c.name === candidateName)?.score || 0}
                    </strong>{' '}
                    pts
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wide">
                    {currentRound?.title || `Round ${game?.currentRoundNumber || 1}`}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isRound1 ? 'Fastest Finger First' : 'Buzzer Face-Off'}
                  </div>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 text-xs flex items-center justify-between gap-2 animate-fade-in">
                <span>{errorMessage}</span>
                <button
                  onClick={() => setErrorMessage('')}
                  className="text-rose-400 hover:text-rose-200 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* ROUND 1: COMMON QUESTION MODE */}
            {isRound1 && (
              <div className="space-y-6 my-auto w-full">
                {activeQuestion ? (
                  <>
                    {/* Timer */}
                    {activeQuestion.status === 'ACTIVE' && (
                      <div className="flex justify-center">
                        <TimerDisplay
                          startedAt={activeQuestion.startedAt}
                          timeLimitSeconds={activeQuestion.timeLimitSeconds}
                          isActive={activeQuestion.status === 'ACTIVE' && !isAnswerSubmitted}
                          size="lg"
                        />
                      </div>
                    )}

                    {/* Question Card */}
                    <QuestionCard
                      question={activeQuestion}
                      selectedOption={selectedOption}
                      onSelectOption={handleSelectOption}
                      onSubmitAnswer={handleSubmitAnswer}
                      showSubmitButton={true}
                      isSubmitted={isAnswerSubmitted}
                      isRevealed={isRound1Revealed}
                      correctAnswerId={round1Results?.correctAnswerId}
                    />

                    {/* Personal Rank on Reveal */}
                    {isRound1Revealed && round1Results && (
                      <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 text-center space-y-3 animate-fade-in">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>Round 1 Results Revealed</span>
                        </div>

                        {(() => {
                          const mySub = round1Results.submissions?.find((s) => s.candidateId === candidateId);
                          if (!mySub) {
                            return <p className="text-slate-400 text-xs">No submission recorded for this question.</p>;
                          }
                          return (
                            <div className="space-y-2">
                              <div className="text-xl font-bold flex items-center justify-center gap-2">
                                {mySub.isCorrect ? (
                                  <span className="text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-5 h-5" /> CORRECT SEQUENCE!
                                  </span>
                                ) : (
                                  <span className="text-rose-400">INCORRECT SEQUENCE</span>
                                )}
                              </div>
                              <div className="text-xs text-amber-400 font-mono font-bold">
                                Your Submitted Sequence: {mySub.selectedOptionId}
                              </div>
                              <div className="flex items-center justify-center gap-6 text-sm pt-1">
                                <div>
                                  <div className="text-[11px] text-slate-400">Your Rank</div>
                                  <div className="text-2xl font-black gold-gradient-text">
                                    #{mySub.rank || '-'}
                                  </div>
                                </div>
                                <div className="h-8 w-px bg-slate-700" />
                                <div>
                                  <div className="text-[11px] text-slate-400">Response Time</div>
                                  <div className="text-2xl font-black font-mono text-amber-400">
                                    {(mySub.responseTimeMs / 1000).toFixed(3)}s
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="kbc-frame p-8 sm:p-12 text-center space-y-4">
                    <Sparkles className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
                    <h3 className="text-xl font-bold text-slate-100">Waiting for Question</h3>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                      Host Rahul is preparing the Fastest Finger First sequence question. It will appear on your screen automatically!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ROUND 2+ : BUZZER ONLY MODE */}
            {!isRound1 && (
              <div className="space-y-6 my-auto w-full py-4">
                {/* Host Prompt display */}
                <div className="kbc-frame p-5 text-center space-y-1">
                  <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">
                    Host Question / Prompt
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-100">
                    {buzzerSession?.questionPrompt || 'Listen carefully to the host!'}
                  </h3>
                </div>

                {/* ⏱ Timer for Buzzer Round (matching Round 1) */}
                {buzzerSession?.status === 'ACTIVE' && (
                  <div className="flex justify-center animate-fade-in">
                    <TimerDisplay
                      startedAt={buzzerSession.enabledAt}
                      timeLimitSeconds={buzzerSession.timeLimitSeconds || 30}
                      isActive={buzzerSession.status === 'ACTIVE' && !candidateBuzzerEvent}
                      size="lg"
                    />
                  </div>
                )}

                {/* Massive 3D Tactile Buzzer Component */}
                <BuzzerButton
                  status={buzzerSession?.status || 'DISABLED'}
                  onBuzz={handlePressBuzzer}
                  buzzerEvent={candidateBuzzerEvent}
                />
              </div>
            )}

            {/* 🏆 GRAND CHAMPION / WINNER CELEBRATION MODAL */}
            {winnerData && (
              <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                <div className="w-full max-w-lg kbc-frame p-6 sm:p-8 text-center space-y-6 shadow-2xl relative border-amber-500/60">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 mx-auto shadow-[0_0_30px_#f59e0b] animate-bounce">
                    <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-amber-400">
                      <Trophy className="w-10 h-10 fill-current" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-widest">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>KBC Championship Final Results</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black gold-gradient-text uppercase">
                      {winnerData.winner?._id === candidateId ? '👑 YOU ARE THE CHAMPION! 🏆' : 'CHAMPION DECLARED!'}
                    </h2>
                    <p className="text-slate-300 text-sm font-medium">
                      {winnerData.winner?._id === candidateId
                        ? 'Congratulations! You secured 1st Place in the Vardhman KBC Championship!'
                        : `Winner: ${winnerData.winner?.name || 'Top Candidate'}`}
                    </p>
                  </div>

                  {/* Champion Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/40 space-y-1">
                    <div className="text-xs text-amber-400 font-bold uppercase">1st Place Champion</div>
                    <div className="text-xl sm:text-2xl font-black text-slate-100">{winnerData.winner?.name}</div>
                    <div className="text-xs font-mono text-amber-400 font-bold">
                      Total Score: {winnerData.winner?.score || 0} pts
                    </div>
                  </div>

                  {/* Candidate's Own Final Standing */}
                  {(() => {
                    const myRankIdx = winnerData.standings?.findIndex((c) => c._id === candidateId);
                    const myStanding = winnerData.standings?.[myRankIdx];
                    if (myRankIdx === -1 || !myStanding) return null;
                    return (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs flex items-center justify-between">
                        <span className="text-slate-400">Your Final Standing:</span>
                        <span className="font-black text-amber-400 text-sm">
                          Rank #{myRankIdx + 1} ({myStanding.score || 0} pts)
                        </span>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => setWinnerData(null)}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Close Celebration
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Live Lobby Strip */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected as <strong className="text-slate-200">{candidateName}</strong></span>
              </div>
              <div className="text-slate-400 flex items-center gap-1.5">
                <span>Total in Game:</span>
                <span className="text-amber-400 font-bold font-mono">{allCandidates.length || 1}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CandidatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-amber-400 font-bold">
          Loading Vardhman KBC Arena...
        </div>
      }
    >
      <CandidateArena />
    </Suspense>
  );
}
