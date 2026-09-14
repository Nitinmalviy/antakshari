export interface PresetQuestion {
  questionText: string;
  questionType?: 'MCQ' | 'ORDER';
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswerId: 'A' | 'B' | 'C' | 'D';
  correctOrder?: ('A' | 'B' | 'C' | 'D')[];
  timeLimitSeconds: number;
  category: string;
  explanation: string;
}

export const PRESET_QUESTIONS: PresetQuestion[] = [
  {
    questionText: 'Which city is officially known as the capital of India?',
    options: [
      { id: 'A', text: 'Mumbai' },
      { id: 'B', text: 'New Delhi' },
      { id: 'C', text: 'Bengaluru' },
      { id: 'D', text: 'Chennai' },
    ],
    correctAnswerId: 'B',
    timeLimitSeconds: 30,
    category: 'Geography & Politics',
    explanation: 'New Delhi was inaugurated as the capital of India in February 1931 by Viceroy Lord Irwin.',
  },
  {
    questionText: 'Which planet in our solar system is known as the "Red Planet"?',
    options: [
      { id: 'A', text: 'Venus' },
      { id: 'B', text: 'Saturn' },
      { id: 'C', text: 'Mars' },
      { id: 'D', text: 'Jupiter' },
    ],
    correctAnswerId: 'C',
    timeLimitSeconds: 30,
    category: 'Astronomy',
    explanation: 'Mars is known as the Red Planet due to the prevalent iron oxide on its surface.',
  },
  {
    questionText: 'Who was the first Indian woman to win an Olympic medal?',
    options: [
      { id: 'A', text: 'Karnam Malleswari' },
      { id: 'B', text: 'P.T. Usha' },
      { id: 'C', text: 'Saina Nehwal' },
      { id: 'D', text: 'Mary Kom' },
    ],
    correctAnswerId: 'A',
    timeLimitSeconds: 30,
    category: 'Sports',
    explanation: 'Karnam Malleswari won a bronze medal in weightlifting at the 2000 Sydney Olympics.',
  },
  {
    questionText: 'What is the chemical symbol for Gold in the periodic table?',
    options: [
      { id: 'A', text: 'Ag' },
      { id: 'B', text: 'Au' },
      { id: 'C', text: 'Pt' },
      { id: 'D', text: 'Fe' },
    ],
    correctAnswerId: 'B',
    timeLimitSeconds: 30,
    category: 'Science',
    explanation: 'The chemical symbol Au originates from the Latin word "Aurum" meaning shining dawn.',
  },
  {
    questionText: 'Which Indian river is famously known as the "Sorrow of Bihar"?',
    options: [
      { id: 'A', text: 'Yamuna' },
      { id: 'B', text: 'Brahmaputra' },
      { id: 'C', text: 'Kosi' },
      { id: 'D', text: 'Godavari' },
    ],
    correctAnswerId: 'C',
    timeLimitSeconds: 30,
    category: 'Indian Geography',
    explanation: 'The Kosi river causes devastating floods and channel shifting during monsoons.',
  },
  {
    // Options are listed in the correct order; the server shuffles them before players see them
    questionText: 'Arrange these planets by distance from the Sun, starting with the nearest.',
    questionType: 'ORDER',
    options: [
      { id: 'A', text: 'Mercury' },
      { id: 'B', text: 'Venus' },
      { id: 'C', text: 'Earth' },
      { id: 'D', text: 'Mars' },
    ],
    correctAnswerId: 'A',
    correctOrder: ['A', 'B', 'C', 'D'],
    timeLimitSeconds: 20,
    category: 'Fastest Finger First',
    explanation: 'Mercury, Venus, Earth and Mars are the four inner rocky planets, in that order from the Sun.',
  },
];
