export interface PresetQuestion {
  questionText: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswerId: string; // Sequence format e.g. 'B-D-A-C'
  correctSequence?: string[];
  timeLimitSeconds: number;
  category: string;
  explanation: string;
}

export const PRESET_QUESTIONS: PresetQuestion[] = [
  {
    questionText: 'Starting from North to South, arrange these Indian cities in correct geographical order:',
    options: [
      { id: 'A', text: 'Bhopal' },
      { id: 'B', text: 'Srinagar' },
      { id: 'C', text: 'Chennai' },
      { id: 'D', text: 'New Delhi' },
    ],
    correctAnswerId: 'B-D-A-C',
    correctSequence: ['B', 'D', 'A', 'C'],
    timeLimitSeconds: 30,
    category: 'Fastest Finger First • Geography',
    explanation: 'Srinagar (B in J&K) is in North India, followed southwards by New Delhi (D), Bhopal (A in Madhya Pradesh), and Chennai (C in Tamil Nadu).',
  },
  {
    questionText: 'Arrange these digital storage units in ascending order from smallest to largest:',
    options: [
      { id: 'A', text: 'Gigabyte (GB)' },
      { id: 'B', text: 'Kilobyte (KB)' },
      { id: 'C', text: 'Terabyte (TB)' },
      { id: 'D', text: 'Megabyte (MB)' },
    ],
    correctAnswerId: 'B-D-A-C',
    correctSequence: ['B', 'D', 'A', 'C'],
    timeLimitSeconds: 30,
    category: 'Fastest Finger First • Technology',
    explanation: '1 Kilobyte (B) < 1 Megabyte (D) < 1 Gigabyte (A) < 1 Terabyte (C).',
  },
  {
    questionText: 'Starting from earliest to latest, arrange these historical Indian events in chronological order:',
    options: [
      { id: 'A', text: 'Quit India Movement (1942)' },
      { id: 'B', text: 'India becomes a Republic (1950)' },
      { id: 'C', text: 'Dandi March (1930)' },
      { id: 'D', text: 'Indian Independence (1947)' },
    ],
    correctAnswerId: 'C-A-D-B',
    correctSequence: ['C', 'A', 'D', 'B'],
    timeLimitSeconds: 30,
    category: 'Fastest Finger First • History',
    explanation: 'Dandi March (C, 1930) ➔ Quit India Movement (A, 1942) ➔ Indian Independence (D, August 1947) ➔ India becomes a Republic (B, January 1950).',
  },
  {
    questionText: 'Starting closest to the Sun, arrange these planets in order of their orbital distance:',
    options: [
      { id: 'A', text: 'Earth' },
      { id: 'B', text: 'Mars' },
      { id: 'C', text: 'Mercury' },
      { id: 'D', text: 'Venus' },
    ],
    correctAnswerId: 'C-D-A-B',
    correctSequence: ['C', 'D', 'A', 'B'],
    timeLimitSeconds: 30,
    category: 'Fastest Finger First • Astronomy',
    explanation: 'The 4 inner rocky planets in order from the Sun are Mercury (C), Venus (D), Earth (A), and Mars (B).',
  },
  {
    questionText: 'Starting from morning to night, arrange these periods of the day in chronological sequence:',
    options: [
      { id: 'A', text: 'Dusk / Sunset' },
      { id: 'B', text: 'Dawn / Sunrise' },
      { id: 'C', text: 'Midnight' },
      { id: 'D', text: 'Solar Noon' },
    ],
    correctAnswerId: 'B-D-A-C',
    correctSequence: ['B', 'D', 'A', 'C'],
    timeLimitSeconds: 30,
    category: 'Fastest Finger First • General Knowledge',
    explanation: 'The daylight cycle progresses from Dawn at sunrise (B), to Solar Noon (D), followed by Dusk at sunset (A), and concludes at Midnight (C).',
  },
  {
    questionText: 'Arrange these Indian currency notes in ascending order of their denomination value:',
    options: [
      { id: 'A', text: '₹500 Note' },
      { id: 'B', text: '₹20 Note' },
      { id: 'C', text: '₹200 Note' },
      { id: 'D', text: '₹50 Note' },
    ],
    correctAnswerId: 'B-D-C-A',
    correctSequence: ['B', 'D', 'C', 'A'],
    timeLimitSeconds: 30,
    category: 'Fastest Finger First • Economy',
    explanation: 'Ascending value: ₹20 Note (B) < ₹50 Note (D) < ₹200 Note (C) < ₹500 Note (A).',
  },
  {
    questionText: 'Starting from earliest stage of human life, arrange these developmental phases:',
    options: [
      { id: 'A', text: 'Adulthood' },
      { id: 'B', text: 'Infancy' },
      { id: 'C', text: 'Old Age' },
      { id: 'D', text: 'Childhood' },
    ],
    correctAnswerId: 'B-D-A-C',
    correctSequence: ['B', 'D', 'A', 'C'],
    timeLimitSeconds: 30,
    category: 'Fastest Finger First • Science',
    explanation: 'Natural human growth progresses from Infancy (B) ➔ Childhood (D) ➔ Adulthood (A) ➔ Old Age (C).',
  },
  {
    questionText: 'Arrange these cricket batting scores in ascending order of runs:',
    options: [
      { id: 'A', text: 'Century (100 runs)' },
      { id: 'B', text: 'Half-Century (50 runs)' },
      { id: 'C', text: 'Triple Century (300 runs)' },
      { id: 'D', text: 'Double Century (200 runs)' },
    ],
    correctAnswerId: 'B-A-D-C',
    correctSequence: ['B', 'A', 'D', 'C'],
    timeLimitSeconds: 30,
    category: 'Fastest Finger First • Sports',
    explanation: 'Ascending runs: Half-Century (B, 50) < Century (A, 100) < Double Century (D, 200) < Triple Century (C, 300).',
  },
];

/**
 * Randomly shuffles the 4 options and recomputes the matching correct sequence.
 * Ensures the resulting correct sequence is NEVER simply 'A-B-C-D'.
 */
export function shuffleQuestionOptions(
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[],
  currentSequenceStr: string
): {
  shuffledOptions: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  newCorrectSequence: string;
} {
  const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const optMap: Record<string, string> = {};
  options.forEach((o) => {
    optMap[o.id] = o.text;
  });

  // Extract items in their current correct order
  const seqLetters = currentSequenceStr.replace(/[^A-D]/gi, '').toUpperCase().split('');
  const validSeq = seqLetters.length === 4 ? seqLetters : ['A', 'B', 'C', 'D'];
  const itemsInCorrectOrder = validSeq.map((letter) => optMap[letter] || '');

  // Generate a random permutation of ['A', 'B', 'C', 'D'] that is not 'A-B-C-D' and not equal to current sequence
  let targetPermutation: ('A' | 'B' | 'C' | 'D')[] = ['B', 'C', 'A', 'D'];
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidatePerm = [...letters].sort(() => Math.random() - 0.5);
    const candidateStr = candidatePerm.join('-');
    if (candidateStr !== 'A-B-C-D' && candidateStr !== currentSequenceStr) {
      targetPermutation = candidatePerm;
      break;
    }
  }

  // targetPermutation[i] is the option letter where item (i + 1) will be located.
  // Build the new options array for slots A, B, C, D:
  const newOptions: { id: 'A' | 'B' | 'C' | 'D'; text: string }[] = letters.map((slotLetter) => {
    // Find which item in itemsInCorrectOrder was assigned to slotLetter
    const itemIndex = targetPermutation.findIndex((l) => l === slotLetter);
    return {
      id: slotLetter,
      text: itemIndex !== -1 ? itemsInCorrectOrder[itemIndex] : optMap[slotLetter] || '',
    };
  });

  return {
    shuffledOptions: newOptions,
    newCorrectSequence: targetPermutation.join('-'),
  };
}
