import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { connectDB } from '../src/lib/db';
import { Candidate } from '../src/lib/models';

async function cleanupDuplicates() {
  await connectDB();
  const all = await Candidate.find({}).sort({ score: -1, lastActiveAt: -1 });
  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const c of all) {
    const key = (c.name || '').trim().toLowerCase();
    if (seen.has(key)) {
      toDelete.push(c._id.toString());
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    console.log('Deleting duplicate candidate IDs:', toDelete);
    await Candidate.deleteMany({ _id: { $in: toDelete } });
  }

  // Create unique index
  try {
    await Candidate.collection.createIndex({ gameId: 1, name: 1 }, { unique: true });
    console.log('Successfully created unique index on { gameId: 1, name: 1 }');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log('Index note:', message);
  }

  const remaining = await Candidate.find({}).lean();
  console.log('Remaining clean candidates:', remaining.map((x) => ({ id: x._id, name: x.name, score: x.score })));
  process.exit(0);
}

cleanupDuplicates().catch((e) => {
  console.error(e);
  process.exit(1);
});
