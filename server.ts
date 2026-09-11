import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import http from 'http';
import next from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { connectDB } from './src/lib/db';
import {
  Game,
  Round,
  Question,
  Candidate,
  AnswerSubmission,
  BuzzerSession,
  BuzzerEvent,
} from './src/lib/models';
import { SOCKET_EVENTS, IBuzzerEvent, IAnswerSubmission, IQuestion } from './src/types';
import { formatServerTimestamp, formatElapsedSeconds } from './src/lib/timeUtils';
import { PRESET_QUESTIONS } from './src/lib/questionsData';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-Memory state caches for sub-millisecond atomic locks and high-concurrency race protection
interface ActiveGameState {
  gameId: string;
  code: string;
  currentRoundId: string | null;
  currentRoundNumber: number;
  candidatesMap: Map<string, { id: string; name: string }>;
  // Buzzer session state
  activeBuzzerSessionId: string | null;
  buzzerStatus: 'DISABLED' | 'ACTIVE' | 'CLOSED';
  buzzerEnabledAt: number | null;
  buzzedCandidateIds: Set<string>;
  buzzerEvents: IBuzzerEvent[];
  // Round 1 state
  activeQuestionId: string | null;
  questionStartedAt: number | null;
  questionEndedAt: number | null;
  submittedCandidateIds: Set<string>;
  round1Submissions: IAnswerSubmission[];
}

const gameStates = new Map<string, ActiveGameState>();

function getOrCreateGameState(gameId: string, code: string): ActiveGameState {
  let state = gameStates.get(gameId);
  if (!state) {
    state = {
      gameId,
      code,
      currentRoundId: null,
      currentRoundNumber: 1,
      candidatesMap: new Map(),
      activeBuzzerSessionId: null,
      buzzerStatus: 'DISABLED',
      buzzerEnabledAt: null,
      buzzedCandidateIds: new Set<string>(),
      buzzerEvents: [],
      activeQuestionId: null,
      questionStartedAt: null,
      questionEndedAt: null,
      submittedCandidateIds: new Set<string>(),
      round1Submissions: [],
    };
    gameStates.set(gameId, state);
  }
  return state;
}

// Verify DB has required game data — NO auto-creation of dummy data
async function verifyDBData() {
  try {
    const game = await Game.findOne({ code: 'KBC-2026' });
    if (!game) {
      console.warn('[Server] ⚠️  No game found with code KBC-2026 in MongoDB. Run the seed script to initialise.');
      return;
    }

    const rounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 });
    console.log(`[Server] ✅ Loaded game "${game.title}" (${game.code}) with ${rounds.length} rounds from MongoDB.`);

    // Ensure currentRoundId is set (repair only if broken)
    if (!game.currentRoundId && rounds.length > 0) {
      game.currentRoundId = rounds[0]._id as unknown as string;
      game.currentRoundNumber = rounds[0].roundNumber;
      await game.save();
      console.log(`[Server] ℹ️  currentRoundId was null — repaired to Round ${rounds[0].roundNumber}.`);
    }

    rounds.forEach((r) => console.log(`  - Round ${r.roundNumber}: ${r.title} [${r.type}] (${r.status})`));
  } catch (err) {
    console.error('[Server] Failed to verify DB data:', err);
  }
}

app.prepare().then(async () => {
  await connectDB();
  await verifyDBData();


  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    // ----------------------------------------------------
    // HOST AUTHENTICATION & CONNECTION
    // ----------------------------------------------------
    socket.on(SOCKET_EVENTS.HOST_AUTH, async (data: { gameCode: string; hostEmail: string }) => {
      try {
        const { gameCode, hostEmail } = data;
        if (!hostEmail || hostEmail.toLowerCase() !== 'rahul@admin.com') {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized host email. Access restricted to rahul@admin.com.' });
          return;
        }

        const game = await Game.findOne({ code: gameCode.toUpperCase() });
        if (!game) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Game not found with code: ' + gameCode });
          return;
        }

        const roomName = `game_${game._id.toString()}`;
        socket.join(roomName);
        socket.join(`host_${game._id.toString()}`);

        const gameState = getOrCreateGameState(game._id.toString(), game.code);
        gameState.currentRoundNumber = game.currentRoundNumber;
        gameState.currentRoundId = game.currentRoundId ? game.currentRoundId.toString() : null;

        // Fetch full state for host
        const rounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 }).lean();
        const currentRound = rounds.find((r) => r._id.toString() === gameState.currentRoundId) || rounds[0];
        const candidates = await Candidate.find({ gameId: game._id }).sort({ joinedAt: 1 }).lean();
        const question = await Question.findOne({ gameId: game._id, roundId: currentRound?._id }).lean();

        // Populate candidates map
        candidates.forEach((c) => {
          gameState.candidatesMap.set(c._id.toString(), { id: c._id.toString(), name: c.name });
        });

        // Fetch Round 1 saved question bank
        const round1 = rounds.find((r) => r.roundNumber === 1 || r.type === 'QUESTION');
        let savedQuestions: unknown[] = [];
        if (round1) {
          savedQuestions = await Question.find({ gameId: game._id, roundId: round1._id }).sort({ createdAt: -1 }).lean();
        }

        socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, {
          game,
          rounds,
          currentRound,
          activeQuestion: question,
          buzzerSession: {
            status: gameState.buzzerStatus,
            enabledAt: gameState.buzzerEnabledAt,
            events: gameState.buzzerEvents,
          },
          candidates,
          round1Submissions: gameState.round1Submissions,
          serverTime: Date.now(),
        });

        socket.emit(SOCKET_EVENTS.ROUND1_QUESTIONS_LIST, savedQuestions);

        console.log(`[Host Connected] Host rahul@admin.com joined room ${roomName} (${savedQuestions.length} saved questions)`);
      } catch (err: unknown) {
        console.error('[Host Auth Error]', err);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Internal error during host auth' });
      }
    });

    // ----------------------------------------------------
    // CANDIDATE JOIN & RECONNECT
    // ----------------------------------------------------
    socket.on(SOCKET_EVENTS.CANDIDATE_JOIN, async (data: { gameCode: string; name: string; avatarSeed?: string }) => {
      try {
        const { gameCode, name, avatarSeed } = data;
        if (!name || !gameCode) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Candidate name and game code are required.' });
          return;
        }

        const game = await Game.findOne({ code: gameCode.toUpperCase() });
        if (!game) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: `Game "${gameCode}" not found.` });
          return;
        }

        const gameIdStr = game._id.toString();
        const roomName = `game_${gameIdStr}`;

        // Find or create candidate atomically (strictly prevents duplicates)
        const cleanName = name.trim();
        const candidate = await Candidate.findOneAndUpdate(
          { gameId: game._id, name: cleanName },
          {
            $set: {
              socketId: socket.id,
              isOnline: true,
              lastActiveAt: new Date(),
              ...(avatarSeed ? { avatarSeed } : {}),
            },
            $setOnInsert: {
              gameId: game._id,
              name: cleanName,
              joinedAt: new Date(),
              score: 0,
              correctCount: 0,
              buzzCount: 0,
            },
          },
          { upsert: true, new: true }
        );

        socket.join(roomName);

        const gameState = getOrCreateGameState(gameIdStr, game.code);
        gameState.candidatesMap.set(candidate._id.toString(), { id: candidate._id.toString(), name: candidate.name });

        const rounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 }).lean();
        const currentRound = rounds.find((r) => r._id.toString() === (game.currentRoundId?.toString() || gameState.currentRoundId)) || rounds[0];
        const question = await Question.findOne({ gameId: game._id, roundId: currentRound?._id }).lean();

        // Check if candidate already submitted or buzzed
        const candidateSub = gameState.round1Submissions.find((s) => s.candidateId === candidate._id.toString()) || null;
        const candidateBuzz = gameState.buzzerEvents.find((b) => b.candidateId === candidate._id.toString()) || null;

        // Sanitize question for candidate (hide correctAnswerId before reveal)
        const sanitizedQuestion = question
          ? {
              ...question,
              correctAnswerId: question.status === 'CLOSED' ? question.correctAnswerId : undefined,
            }
          : null;

        // Send full state to joining candidate
        socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, {
          game,
          rounds,
          currentRound,
          activeQuestion: sanitizedQuestion,
          buzzerSession: {
            status: gameState.buzzerStatus,
            enabledAt: gameState.buzzerEnabledAt,
            events: gameState.buzzerEvents,
          },
          candidateId: candidate._id.toString(),
          candidateName: candidate.name,
          candidateSubmission: candidateSub,
          candidateBuzzerEvent: candidateBuzz,
          serverTime: Date.now(),
        });

        // Broadcast updated candidates list to host & room
        const allCandidates = await Candidate.find({ gameId: game._id }).sort({ joinedAt: 1 }).lean();
        io.to(roomName).emit(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, allCandidates);

        console.log(`[Candidate Joined] ${name} joined game ${game.code} (${allCandidates.length} total)`);
      } catch (err) {
        console.error('[Candidate Join Error]', err);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join game' });
      }
    });

    socket.on(SOCKET_EVENTS.CANDIDATE_RECONNECT, async (data: { gameCode: string; candidateId: string }) => {
      try {
        const { gameCode, candidateId } = data;
        const game = await Game.findOne({ code: gameCode.toUpperCase() });
        if (!game) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Game not found' });
          return;
        }

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Candidate session not found' });
          return;
        }

        candidate.socketId = socket.id;
        candidate.isOnline = true;
        candidate.lastActiveAt = new Date();
        await candidate.save();

        const gameIdStr = game._id.toString();
        const roomName = `game_${gameIdStr}`;
        socket.join(roomName);

        const gameState = getOrCreateGameState(gameIdStr, game.code);
        gameState.candidatesMap.set(candidate._id.toString(), { id: candidate._id.toString(), name: candidate.name });

        const rounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 }).lean();
        const currentRound = rounds.find((r) => r._id.toString() === (game.currentRoundId?.toString() || gameState.currentRoundId)) || rounds[0];
        const question = await Question.findOne({ gameId: game._id, roundId: currentRound?._id }).lean();

        const candidateSub = gameState.round1Submissions.find((s) => s.candidateId === candidate._id.toString()) || null;
        const candidateBuzz = gameState.buzzerEvents.find((b) => b.candidateId === candidate._id.toString()) || null;

        const sanitizedQuestion = question
          ? {
              ...question,
              correctAnswerId: question.status === 'CLOSED' ? question.correctAnswerId : undefined,
            }
          : null;

        socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, {
          game,
          rounds,
          currentRound,
          activeQuestion: sanitizedQuestion,
          buzzerSession: {
            status: gameState.buzzerStatus,
            enabledAt: gameState.buzzerEnabledAt,
            events: gameState.buzzerEvents,
          },
          candidateId: candidate._id.toString(),
          candidateName: candidate.name,
          candidateSubmission: candidateSub,
          candidateBuzzerEvent: candidateBuzz,
          serverTime: Date.now(),
        });

        const allCandidates = await Candidate.find({ gameId: game._id }).sort({ joinedAt: 1 }).lean();
        io.to(roomName).emit(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, allCandidates);
        console.log(`[Candidate Reconnected] ${candidate.name}`);
      } catch (err) {
        console.error('[Candidate Reconnect Error]', err);
      }
    });

    // ----------------------------------------------------
    // BIG SCREEN / VIEWER JOIN (NO CANDIDATE CREATION)
    // ----------------------------------------------------
    socket.on(SOCKET_EVENTS.SCREEN_JOIN, async (data: { gameCode: string }) => {
      try {
        const { gameCode } = data;
        const game = await Game.findOne({ code: (gameCode || 'KBC-2026').toUpperCase() });
        if (!game) return;

        const gameIdStr = game._id.toString();
        const roomName = `game_${gameIdStr}`;
        socket.join(roomName);

        const gameState = getOrCreateGameState(gameIdStr, game.code);
        const rounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 }).lean();
        const currentRound = rounds.find((r) => r._id.toString() === (game.currentRoundId?.toString() || gameState.currentRoundId)) || rounds[0];
        const question = await Question.findOne({ gameId: game._id, roundId: currentRound?._id }).lean();
        const allCandidates = await Candidate.find({ gameId: game._id }).sort({ joinedAt: 1 }).lean();

        socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, {
          game,
          rounds,
          currentRound,
          activeQuestion: question,
          buzzerSession: {
            status: gameState.buzzerStatus,
            enabledAt: gameState.buzzerEnabledAt,
            events: gameState.buzzerEvents,
          },
          candidates: allCandidates,
          serverTime: Date.now(),
        });

        console.log(`[Screen Joined] Big Screen connected to room ${roomName}`);
      } catch (err) {
        console.error('[Screen Join Error]', err);
      }
    });

    // ----------------------------------------------------
    // DYNAMIC ROUND CONTROLS (HOST ONLY)
    // ----------------------------------------------------
    socket.on(SOCKET_EVENTS.ADD_ROUND, async (data: { gameId: string; title?: string; type?: 'QUESTION' | 'BUZZER' }) => {
      try {
        const { gameId, title, type = 'BUZZER' } = data;
        const game = await Game.findById(gameId);
        if (!game) return;

        const existingCount = await Round.countDocuments({ gameId: game._id });
        const newRoundNumber = existingCount + 1;
        const roundTitle = title || `Round ${newRoundNumber}: Buzzer Challenge`;

        const newRound = await Round.create({
          gameId: game._id,
          roundNumber: newRoundNumber,
          title: roundTitle,
          type,
          status: 'PENDING',
          prompt: 'Listen carefully to Host Rahul before buzzing!',
        });

        game.totalRounds = newRoundNumber;
        await game.save();

        const rounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 }).lean();
        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUNDS_UPDATED, { rounds, totalRounds: game.totalRounds });
        console.log(`[Dynamic Round Added] Added Round ${newRoundNumber} to Game ${game.code}`);
      } catch (err) {
        console.error('[Add Round Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.ROUND_SELECTED, async (data: { gameId: string; roundId: string }) => {
      try {
        const { gameId, roundId } = data;
        const game = await Game.findById(gameId);
        const round = await Round.findById(roundId);
        if (!game || !round) return;

        game.currentRoundId = round._id as unknown as string;
        game.currentRoundNumber = round.roundNumber;
        await game.save();

        // Reset buzzer state for new round
        const gameState = getOrCreateGameState(gameId, game.code);
        gameState.currentRoundId = round._id.toString();
        gameState.currentRoundNumber = round.roundNumber;
        gameState.buzzerStatus = 'DISABLED';
        gameState.buzzerEnabledAt = null;
        gameState.buzzedCandidateIds.clear();
        gameState.buzzerEvents = [];
        gameState.submittedCandidateIds.clear();
        gameState.round1Submissions = [];

        // Check or create question if Round 1
        let question = await Question.findOne({ gameId: game._id, roundId: round._id }).lean();
        if (round.type === 'QUESTION' && !question) {
          const preset = PRESET_QUESTIONS[0];
          question = await Question.create({
            gameId: game._id,
            roundId: round._id,
            questionText: preset.questionText,
            options: preset.options,
            correctAnswerId: preset.correctAnswerId,
            timeLimitSeconds: preset.timeLimitSeconds,
            category: preset.category,
            explanation: preset.explanation,
            status: 'PENDING',
          });
        }

        const rounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 }).lean();

        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND_SELECTED, {
          game,
          rounds,
          currentRound: round,
          activeQuestion: question,
          buzzerSession: {
            status: 'DISABLED',
            enabledAt: null,
            events: [],
          },
          serverTime: Date.now(),
        });
        console.log(`[Round Selected] Game ${game.code} switched to Round ${round.roundNumber} (${round.type})`);
      } catch (err) {
        console.error('[Round Select Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.ROUND_STARTED, async (data: { gameId: string; roundId: string }) => {
      try {
        const { gameId, roundId } = data;
        const round = await Round.findById(roundId);
        if (!round) return;

        round.status = 'ACTIVE';
        round.startedAt = new Date();
        await round.save();

        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND_STARTED, {
          roundId,
          status: 'ACTIVE',
          startedAt: round.startedAt.getTime(),
        });
      } catch (err) {
        console.error('[Round Start Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.ROUND_ENDED, async (data: { gameId: string; roundId: string }) => {
      try {
        const { gameId, roundId } = data;
        const round = await Round.findById(roundId);
        if (!round) return;

        round.status = 'COMPLETED';
        round.endedAt = new Date();
        await round.save();

        const gameState = getOrCreateGameState(gameId, '');
        gameState.buzzerStatus = 'CLOSED';

        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND_ENDED, {
          roundId,
          status: 'COMPLETED',
          endedAt: round.endedAt.getTime(),
        });
      } catch (err) {
        console.error('[Round End Error]', err);
      }
    });

    // ----------------------------------------------------
    // ROUND 1: COMMON QUESTION & SPEED/ACCURACY RANKING
    // ----------------------------------------------------
    socket.on(SOCKET_EVENTS.ROUND1_START_QUESTION, async (data: { gameId: string; roundId: string; questionData?: Partial<IQuestion> }) => {
      try {
        const { gameId, roundId, questionData } = data;
        const game = await Game.findById(gameId);
        if (!game) return;

        let question = await Question.findOne({ gameId, roundId });
        if (questionData && questionData.questionText) {
          if (question) {
            question.questionText = questionData.questionText;
            question.options = questionData.options || question.options;
            question.correctAnswerId = questionData.correctAnswerId || question.correctAnswerId;
            question.timeLimitSeconds = questionData.timeLimitSeconds || 30;
            question.explanation = questionData.explanation || '';
            question.category = questionData.category || 'General Knowledge';
          } else {
            question = new Question({
              gameId,
              roundId,
              questionText: questionData.questionText,
              options: questionData.options,
              correctAnswerId: questionData.correctAnswerId,
              timeLimitSeconds: questionData.timeLimitSeconds || 30,
              explanation: questionData.explanation || '',
              category: questionData.category || 'General Knowledge',
            });
          }
        }

        if (!question) {
          const preset = PRESET_QUESTIONS[0];
          question = new Question({
            gameId,
            roundId,
            ...preset,
          });
        }

        const now = Date.now();
        question.status = 'ACTIVE';
        question.startedAt = now;
        question.endedAt = undefined;
        await question.save();

        // Clear in-memory submissions for this question
        const gameState = getOrCreateGameState(gameId, game.code);
        gameState.activeQuestionId = question._id.toString();
        gameState.questionStartedAt = now;
        gameState.questionEndedAt = null;
        gameState.submittedCandidateIds.clear();
        gameState.round1Submissions = [];

        // Delete old submissions in DB for fresh attempt
        await AnswerSubmission.deleteMany({ questionId: question._id });

        // Broadcast to candidates (without exposing correctAnswerId)
        const candidatePayload = {
          _id: question._id.toString(),
          gameId,
          roundId,
          questionText: question.questionText,
          options: question.options,
          timeLimitSeconds: question.timeLimitSeconds,
          category: question.category,
          status: 'ACTIVE',
          startedAt: now,
        };

        // Broadcast full question to host (with correctAnswerId)
        io.to(`host_${gameId}`).emit(SOCKET_EVENTS.ROUND1_QUESTION_STARTED, question.toObject());
        // Broadcast candidate version to the whole room
        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND1_QUESTION_STARTED, candidatePayload);

        console.log(`[Round 1 Question Started] "${question.questionText.slice(0, 30)}..." in game ${game.code}`);
      } catch (err) {
        console.error('[Round 1 Start Question Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.ROUND1_UPDATE_QUESTION, async (data: { gameId: string; roundId: string; questionData: Partial<IQuestion> }) => {
      try {
        const { gameId, roundId, questionData } = data;
        const game = await Game.findById(gameId);
        if (!game) return;

        let question = await Question.findOne({ gameId, roundId });
        if (question) {
          if (questionData.questionText) question.questionText = questionData.questionText;
          if (questionData.options) question.options = questionData.options;
          if (questionData.correctAnswerId) question.correctAnswerId = questionData.correctAnswerId;
          if (questionData.timeLimitSeconds) question.timeLimitSeconds = questionData.timeLimitSeconds;
          if (questionData.explanation !== undefined) question.explanation = questionData.explanation;
          if (questionData.category) question.category = questionData.category;
          await question.save();
        } else {
          question = await Question.create({
            gameId,
            roundId,
            questionText: questionData.questionText || PRESET_QUESTIONS[0].questionText,
            options: questionData.options || PRESET_QUESTIONS[0].options,
            correctAnswerId: questionData.correctAnswerId || PRESET_QUESTIONS[0].correctAnswerId,
            timeLimitSeconds: questionData.timeLimitSeconds || 30,
            explanation: questionData.explanation || '',
            category: questionData.category || 'General Knowledge',
            status: 'PENDING',
          });
        }

        const candidatePayload = {
          _id: question._id.toString(),
          gameId,
          roundId,
          questionText: question.questionText,
          options: question.options,
          timeLimitSeconds: question.timeLimitSeconds,
          category: question.category,
          status: question.status,
          startedAt: question.startedAt,
        };

        io.to(`host_${gameId}`).emit(SOCKET_EVENTS.ROUND1_QUESTION_STARTED, question.toObject());
        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND1_QUESTION_STARTED, candidatePayload);
        console.log(`[Round 1 Question Live Updated] Host updated question for game ${game.code}`);
      } catch (err) {
        console.error('[Round 1 Update Question Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.ROUND1_SAVE_QUESTION, async (data: { gameId: string; roundId: string; questionData: Partial<IQuestion> }) => {
      try {
        const { gameId, roundId, questionData } = data;
        const newQuestion = await Question.create({
          gameId,
          roundId,
          questionText: questionData.questionText || 'New Question',
          options: questionData.options || [
            { id: 'A', text: 'Option A' },
            { id: 'B', text: 'Option B' },
            { id: 'C', text: 'Option C' },
            { id: 'D', text: 'Option D' },
          ],
          correctAnswerId: questionData.correctAnswerId || 'A',
          timeLimitSeconds: questionData.timeLimitSeconds || 30,
          category: questionData.category || 'Round 1 Common Question',
          explanation: questionData.explanation || '',
          status: 'PENDING',
        });

        const allQuestions = await Question.find({ gameId, roundId }).sort({ createdAt: -1 }).lean();
        io.to(`host_${gameId}`).emit(SOCKET_EVENTS.ROUND1_QUESTIONS_LIST, allQuestions);
        console.log(`[New Question Saved for Round 1] "${newQuestion.questionText.slice(0, 30)}..."`);
      } catch (err) {
        console.error('[Save Question Error]', err);
      }
    });

    // ----------------------------------------------------
    // CANDIDATE & TEAM POINTS MANAGEMENT (STORED IN DB)
    // ----------------------------------------------------
    socket.on(SOCKET_EVENTS.AWARD_POINTS, async (data: { gameId: string; candidateId: string; deltaPoints: number }) => {
      try {
        const { gameId, candidateId, deltaPoints } = data;
        const candidate = await Candidate.findByIdAndUpdate(
          candidateId,
          { $inc: { score: deltaPoints } },
          { new: true }
        );
        if (!candidate) return;

        const allCandidates = await Candidate.find({ gameId }).sort({ score: -1, joinedAt: 1 }).lean();
        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, allCandidates);
        console.log(`[Points Awarded in DB] ${candidate.name} (${candidate.team || 'Team'}): ${deltaPoints > 0 ? '+' : ''}${deltaPoints} pts -> Total: ${candidate.score}`);
      } catch (err) {
        console.error('[Award Points Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.UPDATE_TEAM, async (data: { gameId: string; candidateId: string; team: string }) => {
      try {
        const { gameId, candidateId, team } = data;
        const candidate = await Candidate.findByIdAndUpdate(
          candidateId,
          { team: team.trim() },
          { new: true }
        );
        if (!candidate) return;

        const allCandidates = await Candidate.find({ gameId }).sort({ score: -1, joinedAt: 1 }).lean();
        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, allCandidates);
      } catch (err) {
        console.error('[Update Team Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.ROUND1_SUBMIT_ANSWER, async (data: { gameId: string; roundId: string; questionId: string; candidateId: string; selectedOptionId: 'A' | 'B' | 'C' | 'D' }) => {
      try {
        const { gameId, roundId, questionId, candidateId, selectedOptionId } = data;
        const serverTimestamp = Date.now();

        const gameState = getOrCreateGameState(gameId, '');
        // Validate question active and candidate not already answered
        if (gameState.submittedCandidateIds.has(candidateId)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Answer already submitted for this question.' });
          return;
        }

        const question = await Question.findById(questionId);
        if (!question || question.status !== 'ACTIVE') {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Question is not active.' });
          return;
        }

        // Mark as submitted synchronously in memory to prevent double submit
        gameState.submittedCandidateIds.add(candidateId);

        const candidateName = gameState.candidatesMap.get(candidateId)?.name || 'Candidate';
        const startedAt = gameState.questionStartedAt || question.startedAt || serverTimestamp;
        const responseTimeMs = Math.max(1, serverTimestamp - startedAt);
        const isCorrect = selectedOptionId === question.correctAnswerId;

        const submissionRecord: IAnswerSubmission = {
          gameId,
          roundId,
          questionId,
          candidateId,
          candidateName,
          selectedOptionId,
          isCorrect,
          serverTimestamp,
          responseTimeMs,
          rank: 0,
        };

        gameState.round1Submissions.push(submissionRecord);

        // Async persist to DB
        AnswerSubmission.create({
          gameId,
          roundId,
          questionId,
          candidateId,
          candidateName,
          selectedOptionId,
          isCorrect,
          serverTimestamp,
          responseTimeMs,
        }).catch((e) => console.error('[DB Submission Save Error]', e));

        // Send confirmation back to candidate
        socket.emit(SOCKET_EVENTS.ROUND1_ANSWER_RECORDED, {
          candidateId,
          selectedOptionId,
          responseTimeMs,
          serverTimestamp,
        });

        // Notify host of live submission count
        io.to(`host_${gameId}`).emit(SOCKET_EVENTS.ROUND1_RESULTS_UPDATED, {
          submissions: gameState.round1Submissions,
          totalSubmissions: gameState.round1Submissions.length,
          isRevealed: false,
        });

        console.log(`[Round 1 Answer] ${candidateName} selected ${selectedOptionId} in ${(responseTimeMs / 1000).toFixed(3)}s (Correct: ${isCorrect})`);
      } catch (err) {
        console.error('[Submit Answer Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.ROUND1_STOP_QUESTION, async (data: { gameId: string; questionId: string }) => {
      try {
        const { gameId, questionId } = data;
        const question = await Question.findById(questionId);
        if (question) {
          question.status = 'CLOSED';
          question.endedAt = Date.now();
          await question.save();
        }

        const gameState = getOrCreateGameState(gameId, '');
        gameState.questionEndedAt = Date.now();

        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND1_STOP_QUESTION, { questionId });
      } catch (err) {
        console.error('[Stop Question Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.ROUND1_REVEAL_RESULTS, async (data: { gameId: string; questionId: string }) => {
      try {
        const { gameId, questionId } = data;
        const question = await Question.findById(questionId);
        if (!question) return;

        question.status = 'CLOSED';
        await question.save();

        const gameState = getOrCreateGameState(gameId, '');

        // Sort: Correct answers first sorted by responseTimeMs ASC, then incorrect answers by responseTimeMs ASC
        const sortedSubmissions = [...gameState.round1Submissions].sort((a, b) => {
          if (a.isCorrect && !b.isCorrect) return -1;
          if (!a.isCorrect && b.isCorrect) return 1;
          return a.responseTimeMs - b.responseTimeMs;
        });

        // Assign ranks
        sortedSubmissions.forEach((sub, index) => {
          sub.rank = index + 1;
        });

        gameState.round1Submissions = sortedSubmissions;

        // Broadcast results with correct answer revealed
        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND1_RESULTS_UPDATED, {
          questionId,
          correctAnswerId: question.correctAnswerId,
          explanation: question.explanation,
          submissions: sortedSubmissions,
          totalSubmissions: sortedSubmissions.length,
          isRevealed: true,
        });

        console.log(`[Round 1 Results Revealed] ${sortedSubmissions.length} candidate results calculated and broadcasted.`);
      } catch (err) {
        console.error('[Reveal Results Error]', err);
      }
    });

    // ----------------------------------------------------
    // ROUND 2+ : BUZZER ENGINE (ATOMIC SERVER AUTHORITY)
    // ----------------------------------------------------
    socket.on(SOCKET_EVENTS.ROUND2_START_BUZZER, async (data: { gameId: string; roundId: string; prompt?: string }) => {
      try {
        const { gameId, roundId, prompt } = data;
        const serverTimestamp = Date.now();

        const gameState = getOrCreateGameState(gameId, '');
        gameState.buzzerStatus = 'ACTIVE';
        gameState.buzzerEnabledAt = serverTimestamp;
        gameState.buzzedCandidateIds.clear();
        gameState.buzzerEvents = [];

        // Create DB BuzzerSession
        const session = await BuzzerSession.create({
          gameId,
          roundId,
          status: 'ACTIVE',
          enabledAt: serverTimestamp,
          questionPrompt: prompt || '',
        });

        gameState.activeBuzzerSessionId = session._id.toString();

        // Broadcast BUZZER_ENABLED to ALL connected candidates and host
        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND2_START_BUZZER, {
          buzzerSessionId: session._id.toString(),
          roundId,
          status: 'ACTIVE',
          enabledAt: serverTimestamp,
          prompt: prompt || '',
        });

        console.log(`[Buzzer Started] Buzzer activated at ${formatServerTimestamp(serverTimestamp)} for Game ID ${gameId}`);
      } catch (err) {
        console.error('[Start Buzzer Error]', err);
      }
    });

    // PURE SYNCHRONOUS ATOMIC MUTEX FOR BUZZER PRESS
    socket.on(SOCKET_EVENTS.ROUND2_PRESS_BUZZER, (data: { gameId: string; roundId: string; candidateId: string }) => {
      const serverTimestamp = Date.now();
      const { gameId, roundId, candidateId } = data;

      const gameState = getOrCreateGameState(gameId, '');

      // 1. Strict Validation: Buzzer must be ACTIVE
      if (gameState.buzzerStatus !== 'ACTIVE' || !gameState.buzzerEnabledAt) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Buzzer is not active.' });
        return;
      }

      // 2. Strict Duplicate Check: Candidate can only buzz once per buzzer session
      if (gameState.buzzedCandidateIds.has(candidateId)) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'You have already pressed the buzzer for this round.' });
        return;
      }

      // Lock candidate synchronously
      gameState.buzzedCandidateIds.add(candidateId);

      // 3. Millisecond calculations & synchronous atomic rank assignment
      const elapsedMilliseconds = Math.max(0, serverTimestamp - gameState.buzzerEnabledAt);
      const sequenceNumber = gameState.buzzerEvents.length + 1;
      const rank = sequenceNumber;
      const serverTimeFormatted = formatServerTimestamp(serverTimestamp);
      const elapsedSecondsFormatted = formatElapsedSeconds(elapsedMilliseconds);

      const candidateName = gameState.candidatesMap.get(candidateId)?.name || 'Candidate';

      const buzzerEventRecord: IBuzzerEvent = {
        gameId,
        roundId,
        buzzerSessionId: gameState.activeBuzzerSessionId || '',
        candidateId,
        candidateName,
        serverTimestamp,
        serverTimeFormatted,
        elapsedMilliseconds,
        elapsedSecondsFormatted,
        sequenceNumber,
        rank,
      };

      // Push into synchronous event array immediately
      gameState.buzzerEvents.push(buzzerEventRecord);

      // 4. Async MongoDB Persistence (non-blocking)
      if (gameState.activeBuzzerSessionId) {
        BuzzerEvent.create({
          gameId,
          roundId,
          buzzerSessionId: new mongoose.Types.ObjectId(gameState.activeBuzzerSessionId),
          candidateId: new mongoose.Types.ObjectId(candidateId),
          candidateName,
          serverTimestamp,
          serverTimeFormatted,
          elapsedMilliseconds,
          elapsedSecondsFormatted,
          sequenceNumber,
          rank,
        }).catch((e) => console.error('[DB BuzzerEvent Save Error]', e));
      }

      // 5. Send personal confirmation to the candidate socket
      socket.emit(SOCKET_EVENTS.ROUND2_BUZZER_RECORDED, buzzerEventRecord);

      // 6. Broadcast updated live ranking table to host & room
      io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND2_RANKING_UPDATED, {
        events: gameState.buzzerEvents,
        latestEvent: buzzerEventRecord,
      });

      console.log(`[Buzzer Pressed] Rank #${rank} | ${candidateName} | Buzz Time: ${serverTimeFormatted} | Elapsed: ${elapsedSecondsFormatted}`);
    });

    socket.on(SOCKET_EVENTS.ROUND2_STOP_BUZZER, async (data: { gameId: string; roundId: string }) => {
      try {
        const { gameId, roundId } = data;
        const serverTimestamp = Date.now();
        const gameState = getOrCreateGameState(gameId, '');
        gameState.buzzerStatus = 'CLOSED';

        if (gameState.activeBuzzerSessionId) {
          await BuzzerSession.findByIdAndUpdate(gameState.activeBuzzerSessionId, {
            status: 'CLOSED',
            disabledAt: serverTimestamp,
          });
        }

        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND2_STOP_BUZZER, {
          roundId,
          status: 'CLOSED',
          disabledAt: serverTimestamp,
        });

        console.log(`[Buzzer Stopped] Buzzer closed at ${formatServerTimestamp(serverTimestamp)}`);
      } catch (err) {
        console.error('[Stop Buzzer Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.ROUND2_RESET_BUZZER, async (data: { gameId: string; roundId: string }) => {
      try {
        const { gameId, roundId } = data;
        const gameState = getOrCreateGameState(gameId, '');
        gameState.buzzerStatus = 'DISABLED';
        gameState.buzzerEnabledAt = null;
        gameState.buzzedCandidateIds.clear();
        gameState.buzzerEvents = [];

        io.to(`game_${gameId}`).emit(SOCKET_EVENTS.ROUND2_RESET_BUZZER, {
          roundId,
          status: 'DISABLED',
        });

        console.log(`[Buzzer Reset] Buzzer reset to DISABLED for Round ${roundId}`);
      } catch (err) {
        console.error('[Reset Buzzer Error]', err);
      }
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      try {
        const candidate = await Candidate.findOneAndUpdate(
          { socketId: socket.id },
          { isOnline: false, lastActiveAt: new Date() },
          { returnDocument: 'after' }
        );
        if (candidate) {
          const roomName = `game_${candidate.gameId.toString()}`;
          const allCandidates = await Candidate.find({ gameId: candidate.gameId }).sort({ joinedAt: 1 }).lean();
          io.to(roomName).emit(SOCKET_EVENTS.CANDIDATE_LIST_UPDATE, allCandidates);
        }
      } catch {
        // ignore
      }
    });
  });

  server.listen(port, () => {
    console.log(`> KBC Quiz Game Server ready on http://${hostname}:${port}`);
    console.log(`> WebSocket real-time engine running with millisecond accuracy`);
  });
});
