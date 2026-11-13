import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_VERSION, STORAGE_KEY, emptyData, loadData, makeBackup, restoreDataSafely, saveData, validateBackup } from '../src/storage.js';

class MemoryStorage {
  values = new Map();
  failNextWrite = false;
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    if (this.failNextWrite) { this.failNextWrite = false; throw new Error('quota exceeded'); }
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
}

globalThis.localStorage = new MemoryStorage();
const sample = () => {
  const data = emptyData();
  data.sessions = [
    { id: 'session-1', type: 'A', completedAt: '2026-11-10T10:00:00.000Z', durationSeconds: 1500, exercises: [{ exerciseId: 'pushups', name: 'Pompes', sets: [{ reps: 5, load: 0, completed: true }] }], note: 'Bonne forme' },
    { id: 'session-2', type: 'B', completedAt: '2026-11-12T10:00:00.000Z', durationSeconds: 1650, exercises: [{ exerciseId: 'backpack-row', name: 'Rowing', sets: [{ reps: 10, load: 2, completed: true }] }] }
  ];
  data.journalEntries = [{ id: 'note-1', date: '2026-11-12T10:00:00.000Z', notes: 'Énergie correcte', pain: '', nextGoal: 'Rester régulier' }];
  data.goals.weeklyTarget = 3;
  data.preferences.theme = 'light';
  return data;
};

test('export JSON conserve plusieurs séances, notes, objectifs et préférences', () => {
  const backup = JSON.parse(JSON.stringify(makeBackup(sample(), new Date('2026-11-13T12:30:00.000Z'))));
  const restored = validateBackup(backup);
  assert.equal(backup.type, 'cadence-musculation-backup');
  assert.equal(backup.version, BACKUP_VERSION);
  assert.equal(backup.exportedAt, '2026-11-13T12:30:00.000Z');
  assert.equal(restored.sessions.length, 2);
  assert.equal(restored.sessions[0].exercises[0].sets[0].reps, 5);
  assert.equal(restored.journalEntries[0].nextGoal, 'Rester régulier');
  assert.equal(restored.preferences.theme, 'light');
  assert.equal(restored.preferences.restSeconds, 75);
});

test('les sauvegardes v1 restent importables et sont migrées sans perdre l’historique', () => {
  const legacy = sample();
  legacy.schemaVersion = 1;
  legacy.preferences = { theme: 'light' };
  legacy.activeWorkout = {
    id: 'draft-v1', type: 'A', startedAt: '2026-11-13T10:00:00.000Z', currentExerciseIndex: 0,
    paused: false, exercises: [{ exerciseId: 'pushups', name: 'Pompes', sets: [{ reps: 4, load: 0, completed: false }] }], note: 'Brouillon conservé'
  };
  const restored = validateBackup({ type: 'cadence-musculation-backup', version: 1, exportedAt: '2026-11-13T12:00:00.000Z', data: legacy });
  assert.equal(restored.schemaVersion, 2);
  assert.equal(restored.sessions.length, 2);
  assert.equal(restored.preferences.theme, 'light');
  assert.equal(restored.preferences.restSeconds, 75);
  assert.equal(restored.activeWorkout.phase, 'training');
  assert.equal(restored.activeWorkout.restTimer.status, 'idle');
  assert.equal(restored.activeWorkout.note, 'Brouillon conservé');
});

test('le stockage local v1 migre en place et conserve sa séance en cours', () => {
  const legacy = sample();
  legacy.schemaVersion = 1;
  legacy.preferences = { theme: 'dark' };
  legacy.activeWorkout = {
    id: 'draft-storage-v1', type: 'B', startedAt: '2026-11-13T10:00:00.000Z', currentExerciseIndex: 0,
    paused: false, exercises: [{ exerciseId: 'backpack-row', name: 'Rowing avec sac', sets: [{ reps: 8, load: 2, completed: true }] }]
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
  const migrated = loadData().data;
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.sessions.length, 2);
  assert.equal(migrated.activeWorkout.type, 'B');
  assert.equal(migrated.activeWorkout.exercises[0].sets[0].completed, true);
  assert.equal(saved.schemaVersion, 2);
  assert.equal(saved.activeWorkout.phase, 'training');
});

test('une écriture bloquée pendant la migration garde la version lue disponible en mémoire', () => {
  const legacy = sample();
  legacy.schemaVersion = 1;
  legacy.preferences = { theme: 'dark' };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
  localStorage.failNextWrite = true;
  const loaded = loadData();
  assert.equal(loaded.data.schemaVersion, 2);
  assert.equal(loaded.data.sessions.length, 2);
  assert.match(loaded.warning, /chargée et migrée en mémoire/i);
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).schemaVersion, 1);
});

test('la restauration remplace l’état et vérifie les données écrites', () => {
  const previous = sample(); previous.sessions = [];
  saveData(previous);
  const restored = restoreDataSafely(sample());
  assert.equal(restored.sessions.length, 2);
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).sessions.length, 2);
});

test('une sauvegarde invalide ou incompatible est refusée avant toute restauration', () => {
  const before = localStorage.getItem(STORAGE_KEY);
  assert.throws(() => validateBackup('{not-json'), /sauvegarde Cadence|JSON/i);
  assert.throws(() => validateBackup({ ...makeBackup(sample()), version: 99 }), /incompatible/);
  assert.throws(() => validateBackup({ ...makeBackup(sample()), data: { sessions: [] } }), /incomplète/);
  assert.equal(localStorage.getItem(STORAGE_KEY), before);
});

test('une sauvegarde avec un historique ou un journal mal formé est refusée', () => {
  const backupWithBadJournal = makeBackup(sample());
  backupWithBadJournal.data.journalEntries = [{ id: 'broken', date: 'pas-une-date' }];
  const backupWithBadSet = makeBackup(sample());
  backupWithBadSet.data.sessions[0].exercises[0].sets[0].reps = 'cinq';
  assert.throws(() => validateBackup(backupWithBadJournal), /incomplète/);
  assert.throws(() => validateBackup(backupWithBadSet), /incomplète/);
});

test('une erreur d’écriture restaure automatiquement l’état local précédent', () => {
  const previous = sample(); previous.sessions = previous.sessions.slice(0, 1);
  saveData(previous);
  const before = localStorage.getItem(STORAGE_KEY);
  localStorage.failNextWrite = true;
  assert.throws(() => restoreDataSafely(sample()), /quota exceeded/);
  assert.equal(localStorage.getItem(STORAGE_KEY), before);
});
