import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Game, Round } from '@/lib/models';

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await connectDB();
    const { code } = await params;
    const body = await req.json();

    const game = await Game.findOne({ code: code.toUpperCase() });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const nextRoundNumber = game.totalRounds + 1;
    const title = body.title || `Round ${nextRoundNumber}: Buzzer Only`;
    const type = body.type || 'BUZZER';

    const round = await Round.create({
      gameId: game._id,
      roundNumber: nextRoundNumber,
      title,
      type,
      status: 'PENDING',
      prompt: 'Listen to the host.',
    });

    game.totalRounds = nextRoundNumber;
    await game.save();

    const allRounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 }).lean();

    return NextResponse.json({
      success: true,
      round,
      rounds: allRounds,
      totalRounds: game.totalRounds,
    });
  } catch (err) {
    console.error('[Add Round Route Error]', err);
    return NextResponse.json({ error: 'Failed to add round' }, { status: 500 });
  }
}
