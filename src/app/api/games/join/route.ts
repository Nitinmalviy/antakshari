import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Game, Round, Question, Candidate } from '@/lib/models';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { gameCode, name, avatarSeed } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Candidate name is required' }, { status: 400 });
    }

    const cleanCode = (gameCode || 'KBC-2026').trim().toUpperCase();
    const cleanName = name.trim();

    const game = await Game.findOne({ code: cleanCode });
    if (!game) {
      return NextResponse.json({ error: `Game "${cleanCode}" not found` }, { status: 404 });
    }

    // Atomically find existing candidate or create new (guarantees no duplicates)
    const candidate = await Candidate.findOneAndUpdate(
      { gameId: game._id, name: cleanName },
      {
        $set: {
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

    const rounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 }).lean();
    const currentRound = rounds.find((r) => r._id.toString() === game.currentRoundId?.toString()) || rounds[0];
    const question = currentRound ? await Question.findOne({ gameId: game._id, roundId: currentRound._id }).lean() : null;
    const allCandidates = await Candidate.find({ gameId: game._id }).sort({ joinedAt: 1 }).lean();

    return NextResponse.json({
      success: true,
      candidateId: candidate._id.toString(),
      candidateName: candidate.name,
      game,
      rounds,
      currentRound,
      activeQuestion: question ? { ...question, correctAnswerId: question.status === 'CLOSED' ? question.correctAnswerId : undefined } : null,
      allCandidates,
    });
  } catch (err) {
    console.error('[API Candidate Join Error]', err);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
