export function createRestTimer(durationSeconds = 75) {
  const duration = clampDuration(durationSeconds);
  return { status: 'idle', durationSeconds: duration, remainingSeconds: duration, endsAt: null };
}

export function clampDuration(value) {
  return Math.min(300, Math.max(15, Math.round(Number(value) || 75)));
}

export function remainingSeconds(timer, now = Date.now()) {
  if (!timer) return 0;
  if (timer.status !== 'running' || !Number.isFinite(timer.endsAt)) return timer.remainingSeconds;
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function startTimer(timer, now = Date.now()) {
  const seconds = remainingSeconds(timer, now);
  return { ...timer, status: seconds <= 0 ? 'finished' : 'running', remainingSeconds: seconds, endsAt: seconds <= 0 ? null : now + seconds * 1000 };
}

export function pauseTimer(timer, now = Date.now()) {
  const seconds = remainingSeconds(timer, now);
  return { ...timer, status: seconds <= 0 ? 'finished' : 'paused', remainingSeconds: seconds, endsAt: null };
}

export function resetTimer(timer, durationSeconds = timer?.durationSeconds || 75) {
  return createRestTimer(durationSeconds);
}

export function tickTimer(timer, now = Date.now()) {
  if (timer?.status !== 'running') return timer;
  const seconds = remainingSeconds(timer, now);
  return seconds <= 0
    ? { ...timer, status: 'finished', remainingSeconds: 0, endsAt: null }
    : { ...timer, remainingSeconds: seconds };
}
