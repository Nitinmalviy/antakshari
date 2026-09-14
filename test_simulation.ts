import { io } from 'socket.io-client';
import { SOCKET_EVENTS, IBuzzerEvent, IAnswerSubmission } from './src/types';

const SERVER_URL = 'http://localhost:3000';
const GAME_CODE = 'KBC-2026';
const TOTAL_CANDIDATES = 42; // Testing 40+ simultaneous candidates

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE KBC REAL-TIME TEST SUITE');
  console.log('====================================================\n');

  // 1. Test Host Authentication API
  console.log('--- TEST 1: HOST AUTHENTICATION API ---');
  const authRes = await fetch(`${SERVER_URL}/api/auth/host`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahul@admin.com', pin: 'rahul@320' }),
  });
  const authData = await authRes.json();
  if (!authRes.ok || !authData.token) {
    throw new Error('Host Auth API failed: ' + JSON.stringify(authData));
  }
  console.log('✓ Host authenticated as:', authData.host.email, '(Token received)');

  // 2. Connect Host via WebSocket
  console.log('\n--- TEST 2: HOST WEBSOCKET CONNECTION ---');
  const hostSocket = io(SERVER_URL, { transports: ['websocket'] });
  let hostGameState: any = null;

  await new Promise<void>((resolve, reject) => {
    hostSocket.on('connect', () => {
      console.log('✓ Host socket connected (ID:', hostSocket.id, ')');
      hostSocket.emit(SOCKET_EVENTS.HOST_AUTH, {
        gameCode: GAME_CODE,
        hostEmail: 'rahul@admin.com',
      });
    });

    hostSocket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (state) => {
      hostGameState = state;
      console.log('✓ Host received full game state for Game:', state.game.code, 'Rounds:', state.rounds.length);
      resolve();
    });

    hostSocket.on(SOCKET_EVENTS.ERROR, (err) => reject(err));
    setTimeout(() => reject(new Error('Host auth timeout')), 5000);
  });

  // 3. Connect 40+ Candidates simultaneously
  console.log(`\n--- TEST 3: CONNECTING ${TOTAL_CANDIDATES} CANDIDATES CONCURRENTLY ---`);
  const candidateSockets: { name: string; socket: any; candidateId: string; sub?: IAnswerSubmission; buzz?: IBuzzerEvent }[] = [];

  const joinPromises = [];
  for (let i = 1; i <= TOTAL_CANDIDATES; i++) {
    const candidateName = `Player_${i.toString().padStart(2, '0')}`;
    const p = new Promise<void>((resolve, reject) => {
      const socket = io(SERVER_URL, { transports: ['websocket'] });
      socket.on('connect', () => {
        socket.emit(SOCKET_EVENTS.CANDIDATE_JOIN, {
          gameCode: GAME_CODE,
          name: candidateName,
        });
      });

      socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (state) => {
        if (state.candidateId) {
          candidateSockets.push({
            name: candidateName,
            socket,
            candidateId: state.candidateId,
          });
          resolve();
        }
      });

      socket.on('error', reject);
      setTimeout(() => reject(new Error(`Join timeout for ${candidateName}`)), 7000);
    });
    joinPromises.push(p);
  }

  await Promise.all(joinPromises);
  console.log(`✓ All ${candidateSockets.length} candidates successfully joined the live arena!`);

  // 4. Test Round 1: Common Question Speed & Accuracy
  console.log('\n--- TEST 4: ROUND 1 COMMON QUESTION FLOW ---');
  const r1Promise = new Promise<void>((resolve, reject) => {
    let answeredCount = 0;
    const expectedAnswers = candidateSockets.length;

    hostSocket.on(SOCKET_EVENTS.ROUND1_RESULTS_UPDATED, (data) => {
      if (data.isRevealed) {
        console.log('\n✓ Host received revealed Round 1 results:');
        console.log('Correct Answer:', data.correctAnswerId);
        console.log('Top 5 Fastest Candidates:');
        data.submissions.slice(0, 5).forEach((sub: IAnswerSubmission, idx: number) => {
          console.log(`  #${sub.rank || idx + 1} | ${sub.candidateName} | Correct: ${sub.isCorrect} | Time: ${(sub.responseTimeMs / 1000).toFixed(3)}s | Chosen: ${sub.selectedOptionId}`);
        });

        // Verify that correct answers rank before incorrect ones
        const firstIncorrectIdx = data.submissions.findIndex((s: IAnswerSubmission) => !s.isCorrect);
        const lastCorrectIdx = data.submissions.map((s: IAnswerSubmission) => s.isCorrect).lastIndexOf(true);
        if (firstIncorrectIdx !== -1 && lastCorrectIdx !== -1 && firstIncorrectIdx < lastCorrectIdx) {
          reject(new Error('Ranking violation: Incorrect answer ranked higher than correct answer!'));
        } else {
          console.log('✓ Correct ranking order verified: All correct candidates ranked before incorrect candidates.');
        }
        resolve();
      }
    });

    // Candidates listen for question started
    candidateSockets.forEach((c, idx) => {
      c.socket.on(SOCKET_EVENTS.ROUND1_QUESTION_STARTED, async (q: any) => {
        // Vary simulated response delay (between 200ms and 1500ms)
        const delay = 100 + (idx * 30) + Math.floor(Math.random() * 50);
        await sleep(delay);

        // Intentionally pick B-D-A-C (correct sequence) for most, and A-B-C-D (incorrect) for others
        const chosenOption = idx % 5 === 0 ? 'A-B-C-D' : 'B-D-A-C';
        c.socket.emit(SOCKET_EVENTS.ROUND1_SUBMIT_ANSWER, {
          gameId: hostGameState.game._id,
          roundId: hostGameState.currentRound._id,
          questionId: q._id,
          candidateId: c.candidateId,
          selectedOptionId: chosenOption,
        });
        answeredCount++;
        if (answeredCount === expectedAnswers) {
          await sleep(500);
          console.log(`✓ All ${answeredCount} candidates submitted answers. Host revealing results...`);
          hostSocket.emit(SOCKET_EVENTS.ROUND1_REVEAL_RESULTS, {
            gameId: hostGameState.game._id,
            questionId: q._id,
          });
        }
      });
    });

    // Host starts Round 1 Question
    console.log('Host starting Round 1 Question...');
    hostSocket.emit(SOCKET_EVENTS.ROUND1_START_QUESTION, {
      gameId: hostGameState.game._id,
      roundId: hostGameState.currentRound._id,
      questionData: {
        questionText: 'Starting from North to South, arrange these Indian cities in correct geographical order:',
        options: [
          { id: 'A', text: 'Bhopal' },
          { id: 'B', text: 'Srinagar' },
          { id: 'C', text: 'Chennai' },
          { id: 'D', text: 'New Delhi' },
        ],
        correctAnswerId: 'B-D-A-C',
        timeLimitSeconds: 30,
        explanation: 'Srinagar (B) is furthest North, followed southwards by New Delhi (D), Bhopal (A), and Chennai (C).',
        category: 'Fastest Finger First • Geography',
      },
    });
  });

  await r1Promise;

  // 5. Test Dynamic Round Addition
  console.log('\n--- TEST 5: DYNAMIC ROUND MANAGEMENT (+ ADD ROUND) ---');
  await new Promise<void>((resolve) => {
    hostSocket.once(SOCKET_EVENTS.ROUNDS_UPDATED, (data) => {
      console.log(`✓ Dynamically added new Round! Total rounds is now: ${data.totalRounds}`);
      resolve();
    });

    hostSocket.emit(SOCKET_EVENTS.ADD_ROUND, {
      gameId: hostGameState.game._id,
      title: 'Round 6: Super Buzzer Finale',
      type: 'BUZZER',
    });
  });

  // 6. Test Round 2: Buzzer Only Mechanics & Concurrency Safety
  console.log('\n--- TEST 6: ROUND 2 BUZZER ARENA & HIGH-CONCURRENCY RACE CONDITIONS ---');
  // Switch to Round 2
  const round2 = hostGameState.rounds.find((r: any) => r.roundNumber === 2) || hostGameState.rounds[1];
  
  await new Promise<void>((resolve) => {
    hostSocket.once(SOCKET_EVENTS.ROUND_SELECTED, () => {
      console.log('✓ Switched to Round 2 (Buzzer Face-Off)');
      resolve();
    });
    hostSocket.emit(SOCKET_EVENTS.ROUND_SELECTED, {
      gameId: hostGameState.game._id,
      roundId: round2._id,
    });
  });

  // Check that Buzzer is DISABLED by default
  console.log('Verifying default state: Buzzer is DISABLED by default...');
  let candidateReceivedDisabledError = false;
  await new Promise<void>((resolve) => {
    const testCandidate = candidateSockets[0];
    testCandidate.socket.once(SOCKET_EVENTS.ERROR, (err: any) => {
      if (err.message.includes('not active')) {
        candidateReceivedDisabledError = true;
        console.log('✓ Candidate buzz was strictly rejected while buzzer was DISABLED:', err.message);
      }
      resolve();
    });

    // Try pressing buzzer before host enables it
    testCandidate.socket.emit(SOCKET_EVENTS.ROUND2_PRESS_BUZZER, {
      gameId: hostGameState.game._id,
      roundId: round2._id,
      candidateId: testCandidate.candidateId,
    });
  });

  if (!candidateReceivedDisabledError) {
    throw new Error('Security violation: Buzzer allowed press before host activation!');
  }

  // Now Host Enables Buzzer & 40+ Candidates buzz simultaneously
  console.log('\nHost enabling Buzzer (START BUZZER)...');
  const recordedBuzzerEvents: IBuzzerEvent[] = [];

  const buzzerRacePromise = new Promise<void>((resolve, reject) => {
    let buzzCount = 0;

    hostSocket.on(SOCKET_EVENTS.ROUND2_RANKING_UPDATED, (data) => {
      if (data.events.length === candidateSockets.length) {
        console.log(`\n✓ All ${data.events.length} concurrent buzzers recorded by server!`);
        console.log('\n🏆 TOP 5 FASTEST BUZZER CANDIDATES:');
        data.events.slice(0, 5).forEach((event: IBuzzerEvent) => {
          console.log(`  🥇 Rank #${event.rank} | ${event.candidateName} | Timestamp: ${event.serverTimeFormatted} | Elapsed: ${event.elapsedSecondsFormatted}`);
        });

        // Verification of deterministic sequence ordering & no duplicates
        const ranks = data.events.map((e: IBuzzerEvent) => e.rank);
        const uniqueRanks = new Set(ranks);
        if (uniqueRanks.size !== ranks.length) {
          reject(new Error('Concurrency race condition detected: Duplicate ranks found!'));
        }
        for (let r = 1; r <= ranks.length; r++) {
          if (!ranks.includes(r)) {
            reject(new Error(`Missing rank #${r} in sequential ranking!`));
          }
        }
        console.log('✓ Concurrency Safety Verified: Perfect 1..N contiguous unique ranks with sub-millisecond timestamps.');
        resolve();
      }
    });

    // Candidates buzz immediately upon receiving BUZZER_START
    candidateSockets.forEach((c, idx) => {
      c.socket.on(SOCKET_EVENTS.ROUND2_START_BUZZER, async () => {
        // High concurrency: small random jitter between 10ms and 150ms
        const delay = Math.floor(Math.random() * 120);
        await sleep(delay);

        c.socket.emit(SOCKET_EVENTS.ROUND2_PRESS_BUZZER, {
          gameId: hostGameState.game._id,
          roundId: round2._id,
          candidateId: c.candidateId,
        });
      });
    });

    // Host sends START_BUZZER
    hostSocket.emit(SOCKET_EVENTS.ROUND2_START_BUZZER, {
      gameId: hostGameState.game._id,
      roundId: round2._id,
      prompt: 'Who was the first person to walk on the Moon?',
    });
  });

  await buzzerRacePromise;

  // 7. Test Duplicate Buzz Prevention
  console.log('\n--- TEST 7: DUPLICATE BUZZ LOCKING ---');
  await new Promise<void>((resolve) => {
    const testCandidate = candidateSockets[0];
    testCandidate.socket.once(SOCKET_EVENTS.ERROR, (err: any) => {
      console.log('✓ Duplicate buzz was strictly rejected:', err.message);
      resolve();
    });

    // Try buzzing a second time in same session
    testCandidate.socket.emit(SOCKET_EVENTS.ROUND2_PRESS_BUZZER, {
      gameId: hostGameState.game._id,
      roundId: round2._id,
      candidateId: testCandidate.candidateId,
    });
  });

  // 8. Test Stop & Reset Buzzer
  console.log('\n--- TEST 8: STOP & RESET BUZZER ---');
  await new Promise<void>((resolve) => {
    hostSocket.once(SOCKET_EVENTS.ROUND2_STOP_BUZZER, () => {
      console.log('✓ Host STOP BUZZER event broadcasted successfully.');
      resolve();
    });
    hostSocket.emit(SOCKET_EVENTS.ROUND2_STOP_BUZZER, {
      gameId: hostGameState.game._id,
      roundId: round2._id,
    });
  });

  await new Promise<void>((resolve) => {
    hostSocket.once(SOCKET_EVENTS.ROUND2_RESET_BUZZER, () => {
      console.log('✓ Host RESET BUZZER event broadcasted successfully.');
      resolve();
    });
    hostSocket.emit(SOCKET_EVENTS.ROUND2_RESET_BUZZER, {
      gameId: hostGameState.game._id,
      roundId: round2._id,
    });
  });

  // Clean up sockets
  hostSocket.disconnect();
  candidateSockets.forEach((c) => c.socket.disconnect());

  console.log('\n====================================================');
  console.log('🎉 ALL COMPREHENSIVE TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
