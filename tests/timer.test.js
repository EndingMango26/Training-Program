import test from 'node:test';
import assert from 'node:assert/strict';
import { createRestTimer, pauseTimer, remainingSeconds, resetTimer, startTimer, tickTimer } from '../src/timer.js';

test('un minuteur démarre, compte avec une date de fin persistante et se termine à zéro', () => {
  const start = 1_000_000;
  const running = startTimer(createRestTimer(60), start);
  assert.equal(running.endsAt, start + 60_000);
  assert.equal(remainingSeconds(running, start + 12_100), 48);
  assert.equal(tickTimer(running, start + 60_000).status, 'finished');
});

test('pause et reprise conservent le temps restant', () => {
  const running = startTimer(createRestTimer(90), 10_000);
  const paused = pauseTimer(running, 35_000);
  assert.equal(paused.remainingSeconds, 65);
  assert.equal(paused.endsAt, null);
  const resumed = startTimer(paused, 50_000);
  assert.equal(resumed.endsAt, 115_000);
});

test('réinitialisation reprend la durée définie', () => {
  assert.deepEqual(resetTimer(createRestTimer(60), 120), {
    status: 'idle', durationSeconds: 120, remainingSeconds: 120, endsAt: null
  });
});
