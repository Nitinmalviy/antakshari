import mongoose, { Schema, Model, Document } from 'mongoose';

// ==================== GAME MODEL ====================
export interface IGameDoc extends Document {
  code: string;
  title: string;
  hostEmail: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  currentRoundId?: mongoose.Types.ObjectId | string | null;
  currentRoundNumber: number;
  totalRounds: number;
  qualifyingCount: number;
  createdAt: Date;
  startedAt?: Date | null;
  endedAt?: Date | null;
}

const GameSchema = new Schema<IGameDoc>(
  {
    code: { type: String, required: true, unique: true, index: true, uppercase: true },
    title: { type: String, required: true, default: 'KBC Grand Championship' },
    hostEmail: { type: String, required: true, default: 'rahul@admin.com', index: true },
    status: { type: String, enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED'], default: 'WAITING' },
    currentRoundId: { type: Schema.Types.ObjectId, ref: 'Round', default: null },
    currentRoundNumber: { type: Number, default: 1 },
    totalRounds: { type: Number, default: 5 },
    qualifyingCount: { type: Number, default: 5 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ==================== ROUND MODEL ====================
export interface IRoundDoc extends Document {
  gameId: mongoose.Types.ObjectId;
  roundNumber: number;
  title: string;
  type: 'QUESTION' | 'BUZZER';
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  prompt?: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
}

const RoundSchema = new Schema<IRoundDoc>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    roundNumber: { type: Number, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['QUESTION', 'BUZZER'], required: true },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'COMPLETED'], default: 'PENDING' },
    prompt: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RoundSchema.index({ gameId: 1, roundNumber: 1 }, { unique: true });

// ==================== QUESTION MODEL (ROUND 1) ====================
export interface IQuestionDoc extends Document {
  gameId: mongoose.Types.ObjectId;
  roundId: mongoose.Types.ObjectId;
  questionText: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswerId: 'A' | 'B' | 'C' | 'D';
  timeLimitSeconds: number;
  explanation?: string;
  category?: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED';
  startedAt?: number | null;
  endedAt?: number | null;
}

const QuestionSchema = new Schema<IQuestionDoc>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    roundId: { type: Schema.Types.ObjectId, ref: 'Round', required: true, index: true },
    questionText: { type: String, required: true },
    options: [
      {
        id: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
        text: { type: String, required: true },
      },
    ],
    correctAnswerId: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    timeLimitSeconds: { type: Number, default: 30 },
    explanation: { type: String, default: '' },
    category: { type: String, default: 'General Knowledge' },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'CLOSED'], default: 'PENDING' },
    startedAt: { type: Number, default: null },
    endedAt: { type: Number, default: null },
  },
  { timestamps: true }
);

// ==================== CANDIDATE MODEL ====================
export interface ICandidateDoc extends Document {
  gameId: mongoose.Types.ObjectId;
  name: string;
  socketId?: string | null;
  isOnline: boolean;
  avatarSeed?: string;
  score: number;
  team?: string;
  correctCount: number;
  buzzCount: number;
  joinedAt: Date;
  lastActiveAt: Date;
}

const CandidateSchema = new Schema<ICandidateDoc>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    name: { type: String, required: true, trim: true },
    socketId: { type: String, default: null },
    isOnline: { type: Boolean, default: true },
    avatarSeed: { type: String, default: '1' },
    score: { type: Number, default: 0 },
    team: { type: String, default: 'Team Alpha' },
    correctCount: { type: Number, default: 0 },
    buzzCount: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicate candidates with the same name in the same game
CandidateSchema.index({ gameId: 1, name: 1 }, { unique: true });

// ==================== ANSWER SUBMISSION MODEL (ROUND 1) ====================
export interface IAnswerSubmissionDoc extends Document {
  gameId: mongoose.Types.ObjectId;
  roundId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  candidateName: string;
  selectedOptionId: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  serverTimestamp: number;
  responseTimeMs: number;
  rank?: number;
}

const AnswerSubmissionSchema = new Schema<IAnswerSubmissionDoc>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    roundId: { type: Schema.Types.ObjectId, ref: 'Round', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    candidateName: { type: String, required: true },
    selectedOptionId: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    isCorrect: { type: Boolean, required: true },
    serverTimestamp: { type: Number, required: true },
    responseTimeMs: { type: Number, required: true },
    rank: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AnswerSubmissionSchema.index({ questionId: 1, candidateId: 1 }, { unique: true });

// ==================== BUZZER SESSION MODEL (ROUND 2+) ====================
export interface IBuzzerSessionDoc extends Document {
  gameId: mongoose.Types.ObjectId;
  roundId: mongoose.Types.ObjectId;
  status: 'DISABLED' | 'ACTIVE' | 'CLOSED';
  enabledAt?: number | null;
  disabledAt?: number | null;
  questionPrompt?: string;
}

const BuzzerSessionSchema = new Schema<IBuzzerSessionDoc>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    roundId: { type: Schema.Types.ObjectId, ref: 'Round', required: true, index: true },
    status: { type: String, enum: ['DISABLED', 'ACTIVE', 'CLOSED'], default: 'DISABLED' },
    enabledAt: { type: Number, default: null },
    disabledAt: { type: Number, default: null },
    questionPrompt: { type: String, default: '' },
  },
  { timestamps: true }
);

// ==================== BUZZER EVENT MODEL (ROUND 2+) ====================
export interface IBuzzerEventDoc extends Document {
  gameId: mongoose.Types.ObjectId;
  roundId: mongoose.Types.ObjectId;
  buzzerSessionId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  candidateName: string;
  serverTimestamp: number;
  serverTimeFormatted: string;
  elapsedMilliseconds: number;
  elapsedSecondsFormatted: string;
  sequenceNumber: number;
  rank: number;
}

const BuzzerEventSchema = new Schema<IBuzzerEventDoc>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    roundId: { type: Schema.Types.ObjectId, ref: 'Round', required: true, index: true },
    buzzerSessionId: { type: Schema.Types.ObjectId, ref: 'BuzzerSession', required: true, index: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    candidateName: { type: String, required: true },
    serverTimestamp: { type: Number, required: true },
    serverTimeFormatted: { type: String, required: true },
    elapsedMilliseconds: { type: Number, required: true },
    elapsedSecondsFormatted: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    rank: { type: Number, required: true },
  },
  { timestamps: true }
);

BuzzerEventSchema.index({ buzzerSessionId: 1, candidateId: 1 }, { unique: true });

// Export Models
export const Game: Model<IGameDoc> = mongoose.models.Game || mongoose.model<IGameDoc>('Game', GameSchema);
export const Round: Model<IRoundDoc> = mongoose.models.Round || mongoose.model<IRoundDoc>('Round', RoundSchema);
export const Question: Model<IQuestionDoc> = mongoose.models.Question || mongoose.model<IQuestionDoc>('Question', QuestionSchema);
export const Candidate: Model<ICandidateDoc> = mongoose.models.Candidate || mongoose.model<ICandidateDoc>('Candidate', CandidateSchema);
export const AnswerSubmission: Model<IAnswerSubmissionDoc> =
  mongoose.models.AnswerSubmission || mongoose.model<IAnswerSubmissionDoc>('AnswerSubmission', AnswerSubmissionSchema);
export const BuzzerSession: Model<IBuzzerSessionDoc> =
  mongoose.models.BuzzerSession || mongoose.model<IBuzzerSessionDoc>('BuzzerSession', BuzzerSessionSchema);
export const BuzzerEvent: Model<IBuzzerEventDoc> =
  mongoose.models.BuzzerEvent || mongoose.model<IBuzzerEventDoc>('BuzzerEvent', BuzzerEventSchema);
