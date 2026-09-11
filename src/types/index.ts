export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
export type RoundType = 'QUESTION' | 'BUZZER';
export type RoundStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';
export type BuzzerStatus = 'DISABLED' | 'ACTIVE' | 'CLOSED';

export interface IQuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface IQuestion {
  _id?: string;
  gameId: string;
  roundId: string;
  questionText: string;
  options: IQuestionOption[];
  correctAnswerId: 'A' | 'B' | 'C' | 'D';
  timeLimitSeconds: number;
  explanation?: string;
  category?: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED';
  startedAt?: number | null;
  endedAt?: number | null;
}

export interface IRound {
  _id: string;
  gameId: string;
  roundNumber: number;
  title: string;
  type: RoundType;
  status: RoundStatus;
  prompt?: string;
  createdAt: string | number;
  startedAt?: number | null;
  endedAt?: number | null;
  question?: IQuestion | null;
}

export interface IGame {
  _id: string;
  code: string;
  title: string;
  hostEmail: string;
  status: GameStatus;
  currentRoundId?: string | null;
  currentRoundNumber: number;
  totalRounds: number;
  qualifyingCount: number;
  createdAt: string | number;
  startedAt?: number | null;
  endedAt?: number | null;
}

export interface ICandidate {
  _id: string;
  gameId: string;
  name: string;
  socketId?: string;
  isOnline: boolean;
  avatarSeed?: string;
  score?: number;
  team?: string;
  correctCount?: number;
  buzzCount?: number;
  joinedAt: number;
  lastActiveAt: number;
}

export interface IAnswerSubmission {
  _id?: string;
  gameId: string;
  roundId: string;
  questionId: string;
  candidateId: string;
  candidateName: string;
  selectedOptionId: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  serverTimestamp: number;
  responseTimeMs: number;
  rank?: number;
}

export interface IBuzzerEvent {
  _id?: string;
  gameId: string;
  roundId: string;
  buzzerSessionId: string;
  candidateId: string;
  candidateName: string;
  serverTimestamp: number;
  serverTimeFormatted: string; // HH:MM:SS.mmm
  elapsedMilliseconds: number;
  elapsedSecondsFormatted: string; // X.XXXs
  sequenceNumber: number;
  rank: number;
}

export interface IBuzzerSession {
  _id: string;
  gameId: string;
  roundId: string;
  status: BuzzerStatus;
  enabledAt?: number | null;
  disabledAt?: number | null;
  questionPrompt?: string;
  events: IBuzzerEvent[];
}

export interface GameFullState {
  game: IGame;
  rounds: IRound[];
  currentRound?: IRound | null;
  activeQuestion?: IQuestion | null;
  buzzerSession?: IBuzzerSession | null;
  candidates: ICandidate[];
  round1Submissions?: IAnswerSubmission[];
  candidateSubmission?: IAnswerSubmission | null;
  candidateBuzzerEvent?: IBuzzerEvent | null;
  serverTime: number;
}

export const SOCKET_EVENTS = {
  // Connection & Auth
  HOST_AUTH: 'host:auth',
  CANDIDATE_JOIN: 'candidate:join',
  CANDIDATE_RECONNECT: 'candidate:reconnect',
  CANDIDATE_LIST_UPDATE: 'candidate:list_update',
  SCREEN_JOIN: 'screen:join',

  // Game & Round Control
  GAME_STATE_UPDATE: 'game:state_update',
  GAME_STATUS_CHANGED: 'game:status_changed',
  ROUNDS_UPDATED: 'rounds:updated',
  ROUND_SELECTED: 'round:selected',
  ROUND_STARTED: 'round:started',
  ROUND_ENDED: 'round:ended',
  ADD_ROUND: 'round:add',
  REMOVE_ROUND: 'round:remove',

  // Candidate & Points Management
  AWARD_POINTS: 'candidate:award_points',
  UPDATE_TEAM: 'candidate:update_team',

  // Round 1 - Common Question
  ROUND1_START_QUESTION: 'round1:start_question',
  ROUND1_UPDATE_QUESTION: 'round1:update_question',
  ROUND1_SAVE_QUESTION: 'round1:save_question',
  ROUND1_QUESTIONS_LIST: 'round1:questions_list',
  ROUND1_QUESTION_STARTED: 'round1:question_started',
  ROUND1_SUBMIT_ANSWER: 'round1:submit_answer',
  ROUND1_ANSWER_RECORDED: 'round1:answer_recorded',
  ROUND1_STOP_QUESTION: 'round1:stop_question',
  ROUND1_REVEAL_RESULTS: 'round1:reveal_results',
  ROUND1_RESULTS_UPDATED: 'round1:results_updated',

  // Round 2+ - Buzzer Only
  ROUND2_START_BUZZER: 'round2:start_buzzer',
  ROUND2_STOP_BUZZER: 'round2:stop_buzzer',
  ROUND2_RESET_BUZZER: 'round2:reset_buzzer',
  ROUND2_PRESS_BUZZER: 'round2:press_buzzer',
  ROUND2_BUZZER_RECORDED: 'round2:buzzer_recorded',
  ROUND2_RANKING_UPDATED: 'round2:ranking_updated',

  // Timer
  TIMER_SYNC: 'timer:sync',
  ERROR: 'system:error'
} as const;
