import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

async function run() {
  if (!uri) throw new Error('MONGODB_URI not found');
  const m = await mongoose.connect(uri);
  console.log('Connected to Atlas DB:', m.connection.name);

  const game = await m.connection.db?.collection('games').findOne({ code: 'KBC-2026' });
  if (!game) {
    console.error('Game KBC-2026 not found');
    process.exit(1);
  }

  const round1 = await m.connection.db?.collection('rounds').findOne({ gameId: game._id, roundNumber: 1 });
  if (!round1) {
    console.error('Round 1 not found');
    process.exit(1);
  }

  // Update Question 1 with randomized options and sequence B-D-A-C
  const result = await m.connection.db?.collection('questions').updateMany(
    { gameId: game._id, roundId: round1._id },
    {
      $set: {
        questionText: 'Starting from North to South, arrange these Indian cities in correct geographical order:',
        options: [
          { id: 'A', text: 'Bhopal' },
          { id: 'B', text: 'Srinagar' },
          { id: 'C', text: 'Chennai' },
          { id: 'D', text: 'New Delhi' },
        ],
        correctAnswerId: 'B-D-A-C',
        explanation: 'Srinagar (B in J&K) is in North India, followed southwards by New Delhi (D), Bhopal (A in Madhya Pradesh), and Chennai (C in Tamil Nadu).',
        updatedAt: new Date(),
      },
    }
  );

  console.log('Successfully updated questions in MongoDB Atlas:', result?.modifiedCount);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
