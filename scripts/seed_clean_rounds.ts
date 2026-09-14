import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

async function run() {
  if (!uri) throw new Error('MONGODB_URI not found');
  const m = await mongoose.connect(uri);
  if (!m.connection.db) {
    console.error('No database handle');
    process.exit(1);
  }
  console.log('Connected to Atlas DB:', m.connection.name);

  // Clear existing broken game and rounds in Atlas to reset cleanly
  await m.connection.db.collection('games').deleteMany({ code: 'KBC-2026' });
  await m.connection.db.collection('rounds').deleteMany({});
  await m.connection.db.collection('questions').deleteMany({});
  await m.connection.db.collection('buzzersessions').deleteMany({});
  await m.connection.db.collection('buzzerevents').deleteMany({});
  await m.connection.db.collection('answersubmissions').deleteMany({});

  // Create clean Game
  const gameRes = await m.connection.db.collection('games').insertOne({
    code: 'KBC-2026',
    title: 'Vardhman KBC Grand Championship',
    hostEmail: 'rahul@admin.com',
    status: 'WAITING',
    currentRoundNumber: 1,
    totalRounds: 5,
    qualifyingCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0
  });

  const gameId = gameRes.insertedId;

  // Create Round 1
  const round1Res = await m.connection.db.collection('rounds').insertOne({
    gameId: gameId,
    roundNumber: 1,
    title: 'Round 1: Fastest Finger / Common Question',
    type: 'QUESTION',
    status: 'ACTIVE',
    prompt: 'Select the correct answer as quickly as possible',
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0
  });

  const round1Id = round1Res.insertedId;

  // Create Question for Round 1 (Fastest Finger First)
  await m.connection.db.collection('questions').insertOne({
    gameId: gameId,
    roundId: round1Id,
    questionText: 'Starting from North to South, arrange these Indian cities in correct geographical order:',
    options: [
      { id: 'A', text: 'Bhopal' },
      { id: 'B', text: 'Srinagar' },
      { id: 'C', text: 'Chennai' },
      { id: 'D', text: 'New Delhi' }
    ],
    correctAnswerId: 'B-D-A-C',
    timeLimitSeconds: 30,
    category: 'Fastest Finger First • Geography',
    explanation: 'Srinagar (B in J&K) is in North India, followed southwards by New Delhi (D), Bhopal (A in Madhya Pradesh), and Chennai (C in Tamil Nadu).',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0
  });

  // Create Rounds 2 to 5
  for (let i = 2; i <= 5; i++) {
    await m.connection.db.collection('rounds').insertOne({
      gameId: gameId,
      roundNumber: i,
      title: `Round ${i}: Buzzer Face-Off`,
      type: 'BUZZER',
      status: 'PENDING',
      prompt: 'Listen carefully to Host Rahul before buzzing!',
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });
  }

  // Update game currentRoundId to round 1
  await m.connection.db.collection('games').updateOne(
    { _id: gameId },
    { $set: { currentRoundId: round1Id, currentRoundNumber: 1, totalRounds: 5 } }
  );

  console.log('\n✅ Cleanly seeded Vardhman KBC on MongoDB Atlas:');
  const rounds = await m.connection.db.collection('rounds').find({}).sort({ roundNumber: 1 }).toArray();
  rounds.forEach(r => console.log(` - Circle ${r.roundNumber}: ${r.title} (${r.type})`));
  
  const question = await m.connection.db.collection('questions').findOne({});
  console.log(`\n✅ Round 1 Question: "${question?.questionText}"`);

  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
