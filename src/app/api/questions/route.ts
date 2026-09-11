import { NextResponse } from 'next/server';
import { PRESET_QUESTIONS } from '@/lib/questionsData';
import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models';

export async function GET() {
  return NextResponse.json({
    presets: PRESET_QUESTIONS,
  });
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { gameId, roundId, questionText, options, correctAnswerId, timeLimitSeconds, category, explanation } = body;

    let question = await Question.findOne({ gameId, roundId });
    if (question) {
      question.questionText = questionText;
      question.options = options;
      question.correctAnswerId = correctAnswerId;
      question.timeLimitSeconds = timeLimitSeconds || 30;
      question.category = category || 'General Knowledge';
      question.explanation = explanation || '';
      await question.save();
    } else {
      question = await Question.create({
        gameId,
        roundId,
        questionText,
        options,
        correctAnswerId,
        timeLimitSeconds: timeLimitSeconds || 30,
        category: category || 'General Knowledge',
        explanation: explanation || '',
        status: 'PENDING',
      });
    }

    return NextResponse.json({ success: true, question });
  } catch (err) {
    console.error('[Save Question Error]', err);
    return NextResponse.json({ error: 'Failed to save question' }, { status: 500 });
  }
}
