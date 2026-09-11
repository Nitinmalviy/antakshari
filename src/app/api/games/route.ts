import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Game, Round, Question } from '@/lib/models';
import { PRESET_QUESTIONS } from '@/lib/questionsData';

export async function GET() {
  try {
    await connectDB();
    const games = await Game.find().sort({ createdAt: -1 }).limit(10).lean();
    return NextResponse.json({ games });
  } catch (err) {
    console.error('[Get Games Error]', err);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { title = 'KBC Quiz Championship', totalRounds = 5, qualifyingCount = 5 } = body;

    // Generate random 4-digit code e.g. KBC-7391
    const randomCode = 'KBC-' + Math.floor(1000 + Math.random() * 9000);

    const game = await Game.create({
      code: randomCode,
      title,
      hostEmail: 'rahul@admin.com',
      status: 'WAITING',
      currentRoundNumber: 1,
      totalRounds: Math.max(1, totalRounds),
      qualifyingCount: Math.max(1, qualifyingCount),
    });

    const rounds = [];
    for (let i = 1; i <= game.totalRounds; i++) {
      const round = await Round.create({
        gameId: game._id,
        roundNumber: i,
        title: i === 1 ? 'Round 1: Common Question' : `Round ${i}: Buzzer Only`,
        type: i === 1 ? 'QUESTION' : 'BUZZER',
        status: i === 1 ? 'ACTIVE' : 'PENDING',
        prompt: i === 1 ? 'Select the correct answer as quickly as possible' : `Listen to the host!`,
      });
      rounds.push(round);

      if (i === 1) {
        game.currentRoundId = round._id as unknown as string;
        await game.save();

        // Create initial question for Round 1
        const preset = PRESET_QUESTIONS[0];
        await Question.create({
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
    }

    return NextResponse.json({
      success: true,
      game,
      rounds,
    });
  } catch (err) {
    console.error('[Create Game Error]', err);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
