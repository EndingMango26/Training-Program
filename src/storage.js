export const STORAGE_KEY = 'cadence.training-data';
export const STORAGE_VERSION = 2;
export const BACKUP_TYPE = 'cadence-musculation-backup';
export const BACKUP_VERSION = 2;

export function emptyData() {
  return {
    schemaVersion: STORAGE_VERSION,
    sessions: [],
    activeWorkout: null,
    journalEntries: [],
    goals: { weeklyTarget: 3, focus: 'Construire une routine régulière et équilibrée' },
    preferences: { theme: 'dark', restSeconds: 75, soundEnabled: false }
  };
}

const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const validDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const validSet = value => isRecord(value) && Number.isFinite(value.reps) && value.reps >= 0 &&
  (value.load === undefined || (Number.isFinite(value.load) && value.load >= 0)) &&
  (value.completed === undefined || typeof value.completed === 'boolean');
const validExerciseRecord = value => isRecord(value) && typeof value.exerciseId === 'string' &&
  typeof value.name === 'string' && Array.isArray(value.sets) && value.sets.every(validSet);
const validSession = value => isRecord(value) && typeof value.id === 'string' &&
  ['A', 'B'].includes(value.type) && validDate(value.completedAt) && Array.isArray(value.exercises) &&
  value.exercises.every(validExerciseRecord) &&
  (value.durationSeconds === undefined || (Number.isFinite(value.durationSeconds) && value.durationSeconds >= 0));
const validJournalEntry = value => isRecord(value) && typeof value.id === 'string' && validDate(value.date) &&
  (value.sessionId === undefined || typeof value.sessionId === 'string') &&
  (value.sessionType === undefined || value.sessionType === '' || ['A', 'B'].includes(value.sessionType)) &&
  ['difficulty', 'energy', 'mood', 'pain', 'notes', 'nextGoal'].every(key => value[key] === undefined || typeof value[key] === 'string');
const validTimer = value => value === undefined || (isRecord(value) &&
  ['idle', 'running', 'paused', 'finished'].includes(value.status) &&
  Number.isInteger(value.durationSeconds) && value.durationSeconds >= 1 && value.durationSeconds <= 900 &&
  Number.isInteger(value.remainingSeconds) && value.remainingSeconds >= 0 && value.remainingSeconds <= 900 &&
  (value.endsAt === null || value.endsAt === undefined || Number.isFinite(value.endsAt)));

export function validateData(value) {
  if (!isRecord(value) || !Array.isArray(value.sessions) || !value.sessions.every(validSession) ||
      !Array.isArray(value.journalEntries) || !value.journalEntries.every(validJournalEntry) ||
      !isRecord(value.goals) || !isRecord(value.preferences)) return false;
  if (value.schemaVersion !== undefined && (!Number.isInteger(value.schemaVersion) || value.schemaVersion > STORAGE_VERSION || value.schemaVersion < 1)) return false;
  if (value.goals.weeklyTarget !== undefined && ![2, 3, 4].includes(value.goals.weeklyTarget)) return false;
  if (value.preferences.theme !== undefined && !['dark', 'light'].includes(value.preferences.theme)) return false;
  if (value.preferences.restSeconds !== undefined && (!Number.isInteger(value.preferences.restSeconds) || value.preferences.restSeconds < 15 || value.preferences.restSeconds > 300)) return false;
  if (value.preferences.soundEnabled !== undefined && typeof value.preferences.soundEnabled !== 'boolean') return false;
  if (value.activeWorkout !== undefined && value.activeWorkout !== null) {
    const active = value.activeWorkout;
    if (!isRecord(active) || typeof active.id !== 'string' || !['A', 'B'].includes(active.type) ||
        !validDate(active.startedAt) || !Number.isInteger(active.currentExerciseIndex) ||
        !Array.isArray(active.exercises) || !active.exercises.every(validExerciseRecord) || !validTimer(active.restTimer) ||
        (active.phase !== undefined && !['warmup', 'training', 'cooldown'].includes(active.phase))) return false;
  }
  return true;
}

export function migrateData(value) {
  if (!validateData(value)) throw new Error('Les données ne respectent pas la structure attendue.');
  const defaults = emptyData();
  const activeWorkout = value.activeWorkout ? {
    phase: 'training',
    ...value.activeWorkout,
    restTimer: value.activeWorkout.restTimer || {
      status: 'idle', durationSeconds: Number(value.preferences.restSeconds) || 75,
      remainingSeconds: Number(value.preferences.restSeconds) || 75, endsAt: null
    }
  } : null;
  return {
    ...defaults,
    ...value,
    schemaVersion: STORAGE_VERSION,
    goals: { ...defaults.goals, ...value.goals },
    preferences: { ...defaults.preferences, ...value.preferences },
    activeWorkout
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: emptyData(), warning: '' };
    const parsed = JSON.parse(raw);
    if (!validateData(parsed)) return { data: emptyData(), warning: 'Les données locales étaient incomplètes. Une structure saine a été chargée; restaure une sauvegarde si tu en as une.' };
    const data = migrateData(parsed);
    if (parsed.schemaVersion !== STORAGE_VERSION || !parsed.preferences.restSeconds || (parsed.activeWorkout && !parsed.activeWorkout.restTimer)) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
      catch { return { data, warning: 'La version précédente a été chargée et migrée en mémoire, mais le navigateur ne peut pas encore enregistrer la migration. Exporte une sauvegarde dès que possible.' }; }
    }
    return { data, warning: '' };
  } catch (error) {
    return { data: emptyData(), warning: 'Les données locales n’ont pas pu être lues. Tu peux restaurer une sauvegarde depuis les paramètres.' };
  }
}

export function saveData(data) {
  const migrated = migrateData(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

export function makeBackup(data, now = new Date()) {
  return { type: BACKUP_TYPE, version: BACKUP_VERSION, exportedAt: now.toISOString(), data: structuredClone(migrateData(data)) };
}

export function validateBackup(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { throw new Error('Le fichier ne contient pas de JSON lisible.'); }
  }
  if (!value || typeof value !== 'object' || value.type !== BACKUP_TYPE) throw new Error('Ce fichier ne correspond pas à une sauvegarde Cadence.');
  if (![1, BACKUP_VERSION].includes(value.version)) throw new Error(`Version de sauvegarde incompatible (${String(value.version)}).`);
  if (!value.exportedAt || Number.isNaN(Date.parse(value.exportedAt))) throw new Error('La date de sauvegarde est absente ou invalide.');
  if (!validateData(value.data)) throw new Error('La sauvegarde est incomplète : des données essentielles sont absentes.');
  if (!Object.hasOwn(value.data, 'activeWorkout')) throw new Error('La sauvegarde est incomplète : la séance en cours et son état doivent être présents.');
  return migrateData(value.data);
}

export function restoreDataSafely(incoming) {
  const oldRaw = localStorage.getItem(STORAGE_KEY);
  const rollback = oldRaw;
  try {
    const normalized = saveData(incoming);
    const verified = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!validateData(verified) || verified.sessions.length !== normalized.sessions.length) throw new Error('La vérification après restauration a échoué.');
    return verified;
  } catch (error) {
    try {
      if (rollback === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, rollback);
    } catch (rollbackError) {
      throw new Error('La restauration a échoué et le retour à l’état précédent a aussi échoué. Exporte tes données avant toute autre action.');
    }
    throw error;
  }
}
