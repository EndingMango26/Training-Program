import test from 'node:test';
import assert from 'node:assert/strict';
import { performancePoints, weeklyPoints } from '../src/charts.js';

test('les performances excluent les séries non validées', () => {
  const session = {
    id: 'test-session', type: 'A', completedAt: new Date().toISOString(),
    exercises: [{ exerciseId: 'pushups', name: 'Pompes', sets: [
      { reps: 5, load: 0, completed: true }, { reps: 40, load: 0, completed: false }
    ] }]
  };
  const points = performancePoints([session], 'pushups', 'month');
  assert.equal(points.length, 1);
  assert.equal(points[0].value, 5);
});

test('la vue annuelle regroupe les séances réelles par mois', () => {
  const sessions = [{ completedAt: new Date().toISOString() }, { completedAt: new Date().toISOString() }];
  const points = weeklyPoints(sessions, 'year');
  assert.equal(points.length, 12);
  assert.equal(points.reduce((sum, point) => sum + point.value, 0), 2);
});
