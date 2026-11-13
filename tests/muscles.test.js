import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMuscles, exerciseMuscleActivation, muscleGroups, muscleMapSvg } from '../src/muscles.js';
import { exerciseById } from '../src/exercises.js';

const now = new Date('2026-11-13T12:00:00.000Z');
const sessions = [
  { id: 'recent', completedAt: '2026-11-12T10:00:00.000Z', exercises: [
    { exerciseId: 'pushups', name: 'Pompes', sets: [{ reps: 5, completed: true }, { reps: 100, completed: false }] },
    { exerciseId: 'backpack-row', name: 'Rowing avec sac', sets: [{ reps: 8, completed: true }] }
  ] },
  { id: 'old', completedAt: '2026-07-01T10:00:00.000Z', exercises: [
    { exerciseId: 'squats', name: 'Squats', sets: [{ reps: 12, completed: true }] }
  ] }
];

test('la carte couvre les groupes avant/arrière requis et ne compte que les séries validées de la période', () => {
  assert.equal(muscleGroups.length, 18);
  for (const id of ['pectorals', 'deltoid-front', 'biceps', 'forearms', 'abs', 'obliques', 'quadriceps', 'tibialis', 'trapezius', 'posterior-deltoid', 'lats', 'upper-back', 'lower-back', 'triceps', 'glutes', 'hamstrings', 'calves']) assert.ok(muscleGroups.some(group => group.id === id), id);
  const report = analyzeMuscles(sessions, '30days', now);
  const pecs = report.muscles.find(group => group.id === 'pectorals');
  const lats = report.muscles.find(group => group.id === 'lats');
  assert.equal(report.includedSessions, 1);
  assert.equal(pecs.validatedSets, 1);
  assert.deepEqual(pecs.exercises, ['Pompes']);
  assert.deepEqual(pecs.exerciseDetails.map(item => [item.name, item.intensity, item.validatedSets]), [['Pompes', 3, 1]]);
  assert.equal(pecs.recentSessions[0].id, 'recent');
  assert.equal(pecs.recentSessions[0].setCount, 1);
  assert.ok(exerciseById['tibialis-raises']);
  assert.equal(exerciseMuscleActivation['tibialis-raises'].tibialis, 3);
  assert.equal(lats.validatedSets, 1);
  assert.equal(report.muscles.find(group => group.id === 'quadriceps').validatedSets, 0);
});

test('l’activité musculaire ne compte pas une série non validée et le filtre tout garde l’historique', () => {
  const recent = analyzeMuscles(sessions, '7days', now);
  assert.equal(recent.muscles.find(group => group.id === 'pectorals').score, 3);
  const all = analyzeMuscles(sessions, 'all', now);
  assert.equal(all.muscles.find(group => group.id === 'quadriceps').validatedSets, 1);
  assert.equal(all.balance.frontBack.ratio >= 0, true);
});

test('une séance terminée avec un exercice personnalisé est comptée sans lui attribuer un muscle', () => {
  const custom = [{ id: 'custom', completedAt: '2026-11-12T10:00:00.000Z', exercises: [{ exerciseId: 'my-variant', name: 'Variante perso', sets: [{ reps: 4, completed: true }] }] }];
  const report = analyzeMuscles(custom, '30days', now);
  assert.equal(report.includedSessions, 1);
  assert.equal(report.muscles.reduce((sum, group) => sum + group.validatedSets, 0), 0);
});

test('la carte SVG expose des groupes sélectionnables et une étiquette accessible', () => {
  const svg = muscleMapSvg('front', analyzeMuscles(sessions, 'all', now).muscles, 'pectorals');
  assert.match(svg, /role="button"/);
  assert.match(svg, /aria-label="Pectoraux/);
  assert.match(svg, /data-muscle="pectorals"/);
});
