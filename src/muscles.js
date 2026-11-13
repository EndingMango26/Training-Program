export const muscleGroups = [
  { id: 'pectorals', label: 'Pectoraux', view: 'front', area: 'Haut du corps · poussée', function: 'Participent surtout aux mouvements de poussée horizontale.', side: 'anterior', zone: 'upper' },
  { id: 'deltoid-front', label: 'Épaules avant', view: 'front', area: 'Épaules · poussée', function: 'Aident à lever le bras vers l’avant et accompagnent les poussées.', side: 'anterior', zone: 'upper' },
  { id: 'biceps', label: 'Biceps', view: 'front', area: 'Bras · flexion du coude', function: 'Aident à plier le coude et à tirer.', side: 'anterior', zone: 'upper' },
  { id: 'forearms', label: 'Avant-bras', view: 'front', area: 'Bras · prise', function: 'Contribuent à la prise et à la stabilité du poignet.', side: 'anterior', zone: 'upper' },
  { id: 'abs', label: 'Abdominaux', view: 'front', area: 'Tronc · gainage', function: 'Aident à stabiliser le tronc et à contrôler le bassin.', side: 'anterior', zone: 'upper' },
  { id: 'obliques', label: 'Obliques', view: 'front', area: 'Tronc · côtés', function: 'Participent au contrôle latéral et à la rotation du tronc.', side: 'anterior', zone: 'upper' },
  { id: 'hip-flexors', label: 'Fléchisseurs de hanche', view: 'front', area: 'Hanches · flexion', function: 'Aident à rapprocher la cuisse du tronc.', side: 'anterior', zone: 'lower' },
  { id: 'quadriceps', label: 'Quadriceps', view: 'front', area: 'Cuisses · extension du genou', function: 'Contribuent à tendre le genou, notamment en se relevant.', side: 'anterior', zone: 'lower' },
  { id: 'tibialis', label: 'Tibiaux antérieurs', view: 'front', area: 'Avant des jambes · cheville', function: 'Aident à relever l’avant du pied et à contrôler la cheville.', side: 'anterior', zone: 'lower' },
  { id: 'triceps', label: 'Triceps', view: 'back', area: 'Bras · extension du coude', function: 'Aident à tendre le coude lors des poussées.', side: 'posterior', zone: 'upper' },
  { id: 'trapezius', label: 'Trapèzes', view: 'back', area: 'Haut du dos · cou et omoplates', function: 'Aident à stabiliser et déplacer les omoplates.', side: 'posterior', zone: 'upper' },
  { id: 'posterior-deltoid', label: 'Épaules arrière', view: 'back', area: 'Épaules · tirage', function: 'Participent aux mouvements de tirage et au déplacement du bras vers l’arrière.', side: 'posterior', zone: 'upper' },
  { id: 'upper-back', label: 'Rhomboïdes et milieu du dos', view: 'back', area: 'Omoplates · tirage', function: 'Aident à rapprocher et contrôler les omoplates.', side: 'posterior', zone: 'upper' },
  { id: 'lats', label: 'Grand dorsal', view: 'back', area: 'Dos · tirage', function: 'Participe aux tirages et au mouvement du bras vers le tronc.', side: 'posterior', zone: 'upper' },
  { id: 'lower-back', label: 'Bas du dos', view: 'back', area: 'Tronc · stabilité', function: 'Contribue à maintenir une position stable du tronc.', side: 'posterior', zone: 'upper' },
  { id: 'glutes', label: 'Fessiers', view: 'back', area: 'Hanches · extension', function: 'Participent à l’extension de hanche et à la stabilité du bassin.', side: 'posterior', zone: 'lower' },
  { id: 'hamstrings', label: 'Ischio-jambiers', view: 'back', area: 'Cuisses · chaîne postérieure', function: 'Aident à plier le genou et à étendre la hanche.', side: 'posterior', zone: 'lower' },
  { id: 'calves', label: 'Mollets', view: 'back', area: 'Jambes · cheville', function: 'Participent à la poussée du pied et à la stabilité de la cheville.', side: 'posterior', zone: 'lower' }
];

// Valeur 1–3 = contribution indicative par série validée, jamais une mesure physiologique.
export const exerciseMuscleActivation = {
  pushups: { pectorals: 3, triceps: 2, 'deltoid-front': 2, abs: 1, obliques: 1 },
  'backpack-row': { lats: 3, 'upper-back': 3, trapezius: 2, 'posterior-deltoid': 2, biceps: 2, forearms: 1, abs: 1 },
  squats: { quadriceps: 3, glutes: 2, hamstrings: 1, abs: 1, 'hip-flexors': 1 },
  plank: { abs: 3, obliques: 2, 'deltoid-front': 1, glutes: 1 },
  'glute-bridge': { glutes: 3, hamstrings: 2, abs: 1 },
  'calf-raises': { calves: 3 },
  'tibialis-raises': { tibialis: 3 },
  'dead-bug': { abs: 3, obliques: 2, 'hip-flexors': 2 },
  'incline-pushups': { pectorals: 3, triceps: 2, 'deltoid-front': 2, abs: 1 },
  'reverse-snow-angels': { 'posterior-deltoid': 3, 'upper-back': 2, trapezius: 1 },
  'bird-dog': { 'lower-back': 2, glutes: 2, abs: 2, 'posterior-deltoid': 1 },
  superman: { 'lower-back': 3, glutes: 2, 'posterior-deltoid': 1 },
  'prone-y-raise': { 'posterior-deltoid': 3, 'upper-back': 2, trapezius: 2 },
  'backpack-curl': { biceps: 3, forearms: 2 },
  'close-grip-incline': { triceps: 3, pectorals: 2, 'deltoid-front': 1 }
};

export function analyzeMuscles(sessions, range = '30days', now = new Date()) {
  const days = ({ '7days': 7, '30days': 30, '90days': 90 })[range];
  const start = days ? now.getTime() - days * 86400000 : -Infinity;
  const rows = Object.fromEntries(muscleGroups.map(group => [group.id, { ...group, score: 0, validatedSets: 0, sessions: 0, exercises: new Set(), exerciseDetails: new Map(), recentSessions: new Map() }]));
  const pairs = { push: 0, pull: 0, anterior: 0, posterior: 0, upper: 0, lower: 0 };
  let includedSessions = 0;
  for (const session of sessions) {
    if (!Number.isFinite(Date.parse(session.completedAt)) || Date.parse(session.completedAt) < start) continue;
    let sessionHasValidatedSet = false;
    const counted = new Set();
    for (const exercise of session.exercises || []) {
      if ((exercise.sets || []).some(set => set.completed === true)) sessionHasValidatedSet = true;
      const activations = exerciseMuscleActivation[exercise.exerciseId];
      if (!activations) continue;
      for (const set of exercise.sets || []) {
        if (set.completed !== true) continue;
        for (const [muscleId, intensity] of Object.entries(activations)) {
          const row = rows[muscleId];
          row.score += intensity;
          row.validatedSets += 1;
          row.exercises.add(exercise.name);
          if (!counted.has(muscleId)) { row.sessions += 1; counted.add(muscleId); }
          const detail = row.exerciseDetails.get(exercise.exerciseId) || { id: exercise.exerciseId, name: exercise.name, intensity, validatedSets: 0 };
          detail.validatedSets += 1;
          row.exerciseDetails.set(exercise.exerciseId, detail);
          const recentSession = row.recentSessions.get(session.id) || { id: session.id, date: session.completedAt, type: session.type, setCount: 0 };
          recentSession.setCount += 1;
          row.recentSessions.set(session.id, recentSession);
          if (['pushups', 'incline-pushups', 'close-grip-incline'].includes(exercise.exerciseId)) pairs.push += intensity;
          if (['backpack-row', 'backpack-curl', 'reverse-snow-angels', 'prone-y-raise'].includes(exercise.exerciseId)) pairs.pull += intensity;
          pairs[row.side] += intensity;
          pairs[row.zone] += intensity;
        }
      }
    }
    if (sessionHasValidatedSet) includedSessions += 1;
  }
  const muscles = muscleGroups.map(group => {
    const row = rows[group.id];
    return { ...row, exercises: [...row.exercises], exerciseDetails: [...row.exerciseDetails.values()], recentSessions: [...row.recentSessions.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3), lastWorkedAt: [...row.recentSessions.values()].reduce((latest, item) => !latest || Date.parse(item.date) > Date.parse(latest) ? item.date : latest, null), level: row.score >= 12 ? 'high' : row.score >= 5 ? 'medium' : row.score > 0 ? 'low' : 'none' };
  });
  return { muscles, includedSessions, pairs, balance: {
    pushPull: balanceRow(pairs.push, pairs.pull, 'Poussée / tirage', 'la poussée', 'le tirage'),
    frontBack: balanceRow(pairs.anterior, pairs.posterior, 'Avant / arrière', 'le travail avant', 'le travail arrière'),
    upperLower: balanceRow(pairs.upper, pairs.lower, 'Haut / bas du corps', 'le haut du corps', 'le bas du corps')
  } };
}

function balanceRow(first, second, label, firstName, secondName) {
  const total = first + second;
  if (!total) return { label, first: 0, second: 0, ratio: null, message: 'Pas encore assez de séries validées sur cette période.' };
  const ratio = Math.round(Math.min(first, second) / Math.max(first, second) * 100);
  const message = ratio >= 70 ? 'Répartition assez proche dans les séances enregistrées.' : first > second ? `${firstName} est plus présent dans les données.` : `${secondName} est plus présent dans les données.`;
  return { label, first, second, ratio, message };
}

const art = {
  front: [
    ['deltoid-front', 'M 64 68 Q 72 59 82 68 L 78 88 Q 68 90 62 81 Z M 156 68 Q 148 59 138 68 L 142 88 Q 152 90 158 81 Z'],
    ['pectorals', 'M 78 75 Q 91 68 107 77 L 106 105 Q 91 110 77 99 Z M 142 75 Q 129 68 113 77 L 114 105 Q 129 110 143 99 Z'],
    ['biceps', 'M 54 94 Q 62 88 68 94 L 65 119 Q 59 125 54 117 Z M 166 94 Q 158 88 152 94 L 155 119 Q 161 125 166 117 Z'],
    ['forearms', 'M 52 126 Q 58 123 64 127 L 57 159 Q 53 166 48 161 Z M 168 126 Q 162 123 156 127 L 163 159 Q 167 166 172 161 Z'],
    ['obliques', 'M 78 108 Q 84 105 89 111 L 85 151 Q 80 156 75 151 Z M 142 108 Q 136 105 131 111 L 135 151 Q 140 156 145 151 Z'],
    ['abs', 'M 94 108 L 126 108 L 128 151 Q 110 158 92 151 Z M 98 113v33 M 122 113v33 M 96 130h28'],
    ['hip-flexors', 'M 88 151 Q 97 147 106 154 L 103 174 Q 94 180 86 172 Z M 132 151 Q 123 147 114 154 L 117 174 Q 126 180 134 172 Z'],
    ['quadriceps', 'M 84 179 Q 97 172 107 181 L 104 244 Q 98 259 87 248 Z M 136 179 Q 123 172 113 181 L 116 244 Q 122 259 133 248 Z'],
    ['tibialis', 'M 91 267 Q 97 262 103 267 L 99 307 Q 95 313 91 306 Z M 129 267 Q 123 262 117 267 L 121 307 Q 125 313 129 306 Z']
  ],
  back: [
    ['trapezius', 'M 99 52 Q 110 61 121 52 L 137 71 L 129 90 Q 110 83 91 90 L 83 71 Z'],
    ['posterior-deltoid', 'M 62 68 Q 72 59 82 68 L 78 90 Q 68 91 61 81 Z M 158 68 Q 148 59 138 68 L 142 90 Q 152 91 159 81 Z'],
    ['triceps', 'M 54 94 Q 61 89 68 94 L 65 121 Q 58 126 53 117 Z M 166 94 Q 159 89 152 94 L 155 121 Q 162 126 167 117 Z'],
    ['upper-back', 'M 88 88 Q 110 81 132 88 L 132 111 Q 110 123 88 111 Z'],
    ['lats', 'M 83 105 Q 91 101 97 111 L 94 151 Q 85 156 78 145 Z M 137 105 Q 129 101 123 111 L 126 151 Q 135 156 142 145 Z'],
    ['lower-back', 'M 96 113 Q 110 120 124 113 L 127 155 Q 110 164 93 155 Z'],
    ['glutes', 'M 88 158 Q 99 151 109 160 L 108 189 Q 96 197 86 185 Z M 132 158 Q 121 151 111 160 L 112 189 Q 124 197 134 185 Z'],
    ['hamstrings', 'M 86 193 Q 98 189 108 197 L 103 248 Q 96 258 86 248 Z M 134 193 Q 122 189 112 197 L 117 248 Q 124 258 134 248 Z'],
    ['calves', 'M 88 263 Q 97 257 104 264 L 101 304 Q 96 313 90 306 Z M 132 263 Q 123 257 116 264 L 119 304 Q 124 313 130 306 Z']
  ]
};

export function muscleMapSvg(view, muscleState = [], selectedId = '') {
  const present = new Set(art[view].map(([id]) => id));
  const states = new Map(muscleState.map(item => [item.id, item.level]));
  const shapes = art[view].map(([id, path]) => {
    const group = muscleGroups.find(item => item.id === id);
    const selected = selectedId === id;
    const attr = `data-action="select-muscle" data-muscle="${id}" role="button" tabindex="0" aria-label="${group.label}${states.get(id) && states.get(id) !== 'none' ? `, activation ${states.get(id)}` : ', aucune série validée sur la période'}" aria-pressed="${selected}"`;
    return `<path class="muscle-shape muscle-${states.get(id) || 'none'} ${selected ? 'selected' : ''}" ${attr} d="${path}"/>`;
  }).join('');
  const details = view === 'front'
    ? 'M 99 52 Q 110 61 121 52 M 78 104 Q 110 116 142 104 M 94 111h32 M 94 131h32 M 94 151h32 M 86 174h48 M 88 252h44 M 86 310h15 M 119 310h15'
    : 'M 99 52 Q 110 61 121 52 M 110 65v94 M 82 78 Q 91 96 110 101 Q 129 96 138 78 M 82 111 Q 94 120 103 118 M 138 111 Q 126 120 117 118 M 92 157 Q 110 166 128 157 M 88 252h44 M 86 310h15 M 119 310h15';
  const body = `<circle class="body-base" cx="110" cy="31" r="17"/><path class="body-base" d="M 99 51 Q 87 52 77 62 L 63 72 L 48 120 L 49 128 L 57 130 L 72 92 L 80 84 L 78 113 L 83 159 L 87 174 L 82 249 L 87 258 L 85 310 L 84 351 L 96 353 L 102 312 L 109 274 L 112 274 L 119 312 L 125 353 L 137 351 L 136 310 L 133 258 L 138 249 L 133 174 L 137 159 L 142 113 L 140 84 L 148 92 L 163 130 L 171 128 L 172 120 L 157 72 L 143 62 L 121 51 Z"/><path class="body-detail" d="${details}"/>`;
  return `<svg class="muscle-map-svg" viewBox="0 0 220 390" role="group" aria-label="Carte musculaire ${view === 'front' ? 'de face' : 'de dos'}"><g class="muscle-body">${body}${shapes}</g><text x="110" y="381" text-anchor="middle">${view === 'front' ? 'VUE AVANT' : 'VUE ARRIÈRE'}</text></svg>`;
}

export function muscleVisibleInView(id, view) {
  return muscleGroups.some(group => group.id === id && group.view === view);
}
