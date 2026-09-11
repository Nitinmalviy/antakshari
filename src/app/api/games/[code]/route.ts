import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Game, Round, Question, Candidate, AnswerSubmission, BuzzerEvent } from '@/lib/models';

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await connectDB();
    const { code } = await params;

    const game = await Game.findOne({ code: code.toUpperCase() }).lean();
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const rounds = await Round.find({ gameId: game._id }).sort({ roundNumber: 1 }).lean();
    const candidates = await Candidate.find({ gameId: game._id }).sort({ joinedAt: 1 }).lean();
    const questions = await Question.find({ gameId: game._id }).lean();
    const round1Submissions = await AnswerSubmission.find({ gameId: game._id }).lean();
    const buzzerEvents = await BuzzerEvent.find({ gameId: game._id }).sort({ rank: 1 }).lean();

    return NextResponse.json({
      game,
      rounds,
      candidates,
      questions,
      round1Submissions,
      buzzerEvents,
    });
  } catch (err) {
    console.error('[Get Game Details Error]', err);
    return NextResponse.json({ error: 'Failed to fetch game details' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await connectDB();
    const { code } = await params;
    const body = await req.json();

    const game = await Game.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $set: body },
      { returnDocument: 'after' }
    );
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, game });
  } catch (err) {
    console.error('[Update Game Error]', err);
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }
}
