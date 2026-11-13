import test from 'node:test';
import assert from 'node:assert/strict';
import { compareExerciseProgress, exerciseProgress, exerciseRecords, mentionsPain, recommendExercise, recordsBeaten } from '../src/analytics.js';

const sessions = [
  { id: 's1', completedAt: '2026-10-01T10:00:00.000Z', exercises: [
    { exerciseId: 'pushups', name: 'Pompes', sets: [{ reps: 5, load: 0, completed: true }, { reps: 99, load: 0, completed: false }] },
    { exerciseId: 'incline-pushups', name: 'Pompes inclinées', sets: [{ reps: 25, load: 0, completed: true }] }
  ] },
  { id: 's2', completedAt: '2026-10-08T10:00:00.000Z', exercises: [
    { exerciseId: 'pushups', name: 'Pompes', sets: [{ reps: 6, load: 0, completed: true }, { reps: 4, load: 0, completed: true }] }
  ] }
];

test('les performances restent isolées par exerciseId et ignorent les séries non validées', () => {
  const points = exerciseProgress(sessions, 'pushups');
  assert.deepEqual(points.map(point => point.value), [5, 10]);
  assert.equal(exerciseProgress(sessions, 'incline-pushups')[0].value, 25);
});

test('les filtres 7, 30 et 90 jours de la fiche exercice appliquent bien leur période', () => {
  const now = new Date('2026-10-15T10:00:00.000Z');
  assert.equal(exerciseProgress(sessions, 'pushups', '7days', now).length, 1);
  assert.equal(exerciseProgress(sessions, 'pushups', '30days', now).length, 2);
  assert.equal(exerciseProgress(sessions, 'pushups', '90days', now).length, 2);
  assert.equal(exerciseProgress(sessions, 'pushups', 'all', now).length, 2);
});

test('les records donnent dernière performance et meilleure série sur les seules séries validées', () => {
  const records = exerciseRecords(sessions, 'pushups');
  assert.equal(records.last.value, 10);
  assert.equal(records.last.setCount, 2);
  assert.equal(records.bestSet.value, 6);
  assert.equal(records.bestSession.value, 10);
  assert.equal(records.sessionCount, 2);
});

test('les records battus distinguent répétitions par série, total séance, charge et durée', () => {
  const previous = [{ id: 'old', completedAt: '2026-11-01T10:00:00.000Z', exercises: [
    { exerciseId: 'pushups', name: 'Pompes', sets: [{ reps: 5, load: 0, completed: true }, { reps: 5, load: 0, completed: true }] },
    { exerciseId: 'backpack-row', name: 'Rowing', sets: [{ reps: 8, load: 4, completed: true }] },
    { exerciseId: 'plank', name: 'Gainage', duration: true, sets: [{ reps: 30, completed: true }] }
  ] }];
  const current = { id: 'new', exercises: [
    { exerciseId: 'pushups', name: 'Pompes', sets: [{ reps: 6, load: 0, completed: true }, { reps: 6, load: 0, completed: true }] },
    { exerciseId: 'backpack-row', name: 'Rowing', sets: [{ reps: 8, load: 5, completed: true }] },
    { exerciseId: 'plank', name: 'Gainage', duration: true, sets: [{ reps: 35, completed: true }] }
  ] };
  assert.deepEqual(recordsBeaten(current, previous).map(item => [item.exerciseId, item.kind, item.value]), [
    ['pushups', 'set', 6], ['pushups', 'session', 12], ['backpack-row', 'load', 5], ['plank', 'duration', 35]
  ]);
});

test('les recommandations tiennent compte de la douleur et de la difficulté ressentie', () => {
  const recent = [{ id: 'today', completedAt: '2026-11-13T09:00:00.000Z', exercises: [{ exerciseId: 'pushups', name: 'Pompes', sets: [{ reps: 6, completed: true }], note: '' }] }];
  assert.match(recommendExercise(recent, [{ sessionId: 'today', pain: 'poignet douloureux' }], 'pushups', { now: Date.parse('2026-11-13T12:00:00.000Z') }), /Priorité au repos/);
  assert.match(recommendExercise(recent, [{ sessionId: 'today', difficulty: 'Très difficile' }], 'pushups', { now: Date.parse('2026-11-13T12:00:00.000Z') }), /Garde le même objectif/);
  assert.equal(mentionsPain('Pas de gêne.'), false);
  assert.equal(mentionsPain('Aucune douleur'), false);
});

test('la comparaison utilise les deux dernières séances du même exercice', () => {
  const comparison = compareExerciseProgress(sessions, 'pushups');
  assert.equal(comparison.previous.value, 5);
  assert.equal(comparison.current.value, 10);
  assert.equal(comparison.change, 5);
  assert.equal(compareExerciseProgress(sessions.slice(0, 1), 'pushups'), null);
});

test('les exercices chronométrés comparent les secondes et non les répétitions cumulées', () => {
  const data = [
    { id: 'p1', completedAt: '2026-10-01T10:00:00.000Z', exercises: [{ exerciseId: 'plank', name: 'Gainage', duration: true, sets: [{ reps: 20, completed: true }, { reps: 34, completed: true }] }] },
    { id: 'p2', completedAt: '2026-10-02T10:00:00.000Z', exercises: [{ exerciseId: 'plank', name: 'Gainage', duration: true, sets: [{ reps: 40, completed: true }] }] }
  ];
  const records = exerciseRecords(data, 'plank');
  assert.equal(records.metric, 'duration');
  assert.equal(records.last.value, 40);
  assert.equal(records.bestSet.value, 40);
});
