const completed = set => set?.completed === true;
const validSets = exercise => (exercise?.sets || []).filter(completed);

export function exerciseProgress(sessions, exerciseId, range = 'all', now = new Date()) {
  const days = ({ week: 7, '7days': 7, month: 30, '30days': 30, '90days': 90 })[range];
  const start = days ? now.getTime() - days * 86400000 : -Infinity;
  return sessions
    .filter(session => Date.parse(session.completedAt) >= start)
    .map(session => {
      const records = session.exercises.filter(item => item.exerciseId === exerciseId);
      const sets = records.flatMap(validSets);
      if (!sets.length) return null;
      const timed = records.some(item => item.duration === true);
      const reps = sets.map(set => Number(set.reps) || 0);
      const loads = sets.map(set => Number(set.load) || 0);
      return {
        sessionId: session.id,
        sessionType: session.type,
        date: new Date(session.completedAt),
        metric: timed ? 'duration' : 'repetitions',
        value: timed ? Math.max(...reps) : reps.reduce((sum, n) => sum + n, 0),
        setCount: sets.length,
        totalReps: timed ? null : reps.reduce((sum, n) => sum + n, 0),
        maxLoad: Math.max(...loads)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);
}

export function exerciseRecords(sessions, exerciseId) {
  const points = exerciseProgress(sessions, exerciseId, 'all');
  const appearances = sessions.flatMap(session => session.exercises
    .filter(item => item.exerciseId === exerciseId)
    .map(item => ({ session, item, sets: validSets(item) })))
    .filter(entry => entry.sets.length)
    .sort((a, b) => Date.parse(a.session.completedAt) - Date.parse(b.session.completedAt));
  if (!appearances.length) return null;
  const timed = appearances.some(({ item }) => item.duration === true);
  const perSet = appearances.flatMap(({ session, item, sets }) => sets.map(set => ({
    value: Number(set.reps) || 0,
    load: Number(set.load) || 0,
    date: session.completedAt,
    sessionId: session.id,
    sessionType: session.type,
    name: item.name
  })));
  const highest = Math.max(...perSet.map(item => item.value));
  const heaviest = Math.max(...perSet.map(item => item.load));
  const latest = appearances.at(-1);
  return {
    metric: timed ? 'duration' : 'repetitions',
    last: { date: latest.session.completedAt, sessionId: latest.session.id, sessionType: latest.session.type, value: timed ? Math.max(...latest.sets.map(set => Number(set.reps) || 0)) : latest.sets.reduce((sum, set) => sum + (Number(set.reps) || 0), 0), setCount: latest.sets.length, maxLoad: Math.max(...latest.sets.map(set => Number(set.load) || 0)) },
    bestSet: { ...perSet.find(item => item.value === highest), value: highest },
    bestLoad: { ...perSet.find(item => item.load === heaviest), value: heaviest },
    bestSession: timed ? null : points.reduce((best, point) => !best || point.value > best.value ? { value: point.value, date: point.date, sessionId: point.sessionId, sessionType: point.sessionType } : best, null),
    sessionCount: appearances.length,
    points
  };
}

export function compareExerciseProgress(sessions, exerciseId) {
  const points = exerciseProgress(sessions, exerciseId);
  if (points.length < 2) return null;
  const previous = points.at(-2), current = points.at(-1);
  return {
    metric: current.metric,
    previous,
    current,
    change: current.value - previous.value,
    loadChange: current.maxLoad - previous.maxLoad
  };
}

export function recordsBeaten(session, previousSessions) {
  return (session?.exercises || []).flatMap(exercise => {
    const sets = validSets(exercise);
    if (!sets.length || !exercise.exerciseId) return [];
    const prior = exerciseRecords(previousSessions, exercise.exerciseId);
    if (!prior) return [];
    const timed = exercise.duration === true;
    const values = sets.map(set => Number(set.reps) || 0);
    const load = Math.max(...sets.map(set => Number(set.load) || 0));
    const currentBest = Math.max(...values);
    const currentTotal = values.reduce((sum, value) => sum + value, 0);
    const records = [];
    if (currentBest > prior.bestSet.value) records.push({ exerciseId: exercise.exerciseId, name: exercise.name, kind: timed ? 'duration' : 'set', value: currentBest });
    if (!timed && prior.bestSession && currentTotal > prior.bestSession.value) records.push({ exerciseId: exercise.exerciseId, name: exercise.name, kind: 'session', value: currentTotal });
    if (load > 0 && load > prior.bestLoad.value) records.push({ exerciseId: exercise.exerciseId, name: exercise.name, kind: 'load', value: load });
    return records;
  });
}

export function recommendExercise(sessions, journalEntries, exerciseId, { targetReps = 8, now = Date.now() } = {}) {
  const points = exerciseProgress(sessions, exerciseId);
  if (!points.length) return 'Premier repère pour cet exercice : commence avec une variante confortable et garde une répétition en réserve.';
  const last = points.at(-1);
  const priorSession = sessions.find(session => session.id === last.sessionId);
  const item = priorSession?.exercises.find(exercise => exercise.exerciseId === exerciseId);
  const linkedJournal = (journalEntries || []).find(entry => entry.sessionId === last.sessionId);
  const latestJournal = linkedJournal || [...(journalEntries || [])].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  const painText = `${latestJournal?.pain || ''} ${item?.note || ''}`;
  const unit = last.metric === 'duration' ? 'seconde' : 'répétition';
  const loadHint = last.maxLoad > 0 ? ' Garde la charge actuelle pour le moment.' : '';
  if (mentionsPain(painText)) return 'Tu as signalé une douleur ou une gêne. Priorité au repos ou à une variante confortable; arrête si elle persiste et ne cherche pas à progresser aujourd’hui.';
  if (Date.parse(last.date) < now - 14 * 86400000) return 'Cela fait un moment depuis ta dernière séance : reprends tranquillement avec la même charge ou une variante plus facile.';
  const difficulty = latestJournal?.difficulty || '';
  const lowEnergy = latestJournal?.energy === 'Bas' || latestJournal?.mood === 'Fatigué·e';
  if (/difficile/i.test(difficulty) || lowEnergy) return 'Tu avais trouvé la séance difficile ou tu manquais d’énergie. Garde le même objectif, allège si besoin et privilégie une exécution confortable.';
  if (points.length >= 2) {
    const change = last.value - points.at(-2).value;
    if (change < 0) return 'Les dernières séries étaient un peu plus difficiles. Tu peux conserver le même objectif et te concentrer sur le geste.';
    if (change === 0) return `Tes résultats sont proches de la séance précédente. Continue à travailler la technique sans te presser.${loadHint}`;
    if (points.length >= 3 && points.at(-2).value > points.at(-3).value) return `Tu progresses régulièrement. Une ${unit} supplémentaire sur une seule série reste facultative si la forme est bonne.${loadHint}`;
  }
  if (last.value >= targetReps) return `Tu avais validé ton objectif. Répète-le proprement; si tout reste confortable, tu peux ajouter une ${unit} sur une seule série.${loadHint}`;
  return `Garde le même objectif et privilégie une exécution contrôlée. Tu n’as pas besoin d’augmenter la charge à chaque séance.${loadHint}`;
}

export function mentionsPain(text) {
  const value = String(text || '').trim().replace(/[.!?,;:]+$/g, '');
  if (!value || /^(aucun(?:e)?(?: douleur| g[eê]ne)?|non|rien|ras|pas de (?:douleur|g[eê]ne)|sans (?:douleur|g[eê]ne))$/i.test(value)) return false;
  return /douleur|douloureux|douloureuse|g[eê]ne|mal\b/i.test(value);
}

export function periodStart(range, now = new Date()) {
  const days = ({ week: 7, '7days': 7, month: 30, '30days': 30, '90days': 90 })[range];
  return days ? now.getTime() - days * 86400000 : -Infinity;
}
