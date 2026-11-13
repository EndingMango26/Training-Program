import { categories, exercises, exerciseById, workouts } from './exercises.js';
import { emptyData, loadData, makeBackup, restoreDataSafely, saveData, validateBackup } from './storage.js';
import { barChart, lineChart, performancePoints, weeklyPoints } from './charts.js';
import { analyzeMuscles, exerciseMuscleActivation, muscleGroups, muscleMapSvg } from './muscles.js';
import { compareExerciseProgress, exerciseProgress, exerciseRecords, mentionsPain, recommendExercise, recordsBeaten } from './analytics.js';
import { clampDuration, createRestTimer, pauseTimer, remainingSeconds, resetTimer, startTimer, tickTimer } from './timer.js';

const app = document.querySelector('#app');
let { data, warning } = loadData();
let page = 'home';
let libraryCategory = 'Tous';
let libraryQuery = '';
let range = 'month';
let selectedExercise = 'pushups';
let selectedSession = null;
let editingSessionId = null;
let editingJournalId = null;
let selectedMuscle = 'pectorals';
let muscleView = 'front';
let muscleRange = '30days';
let exerciseRange = 'all';
let recordsExercise = 'pushups';
let recoveryMode = 'warmup';
let recoveryStep = 0;
let recoveryCategory = 'Tous';
let routineTimer = createRestTimer(60);
let cooldownSessionId = null;
let journalSessionId = null;
let cooldownHighlights = [];
let finishReviewOpen = false;
let calendarCursor = new Date();
let calendarSelectedDate = '';
let toastTimer;
let timerInterval;
let routineTimerInterval;

const navItems = [
  ['home', 'Vue d’ensemble', '⌂'], ['program', 'Programme', '▤'], ['exercises', 'Exercices', '◉'],
  ['progress', 'Progression', '↗'], ['muscles', 'Carte musculaire', '♧'], ['records', 'Records', '★'], ['recovery', 'Échauffement & retour au calme', '◌'],
  ['history', 'Historique', '▦'], ['journal', 'Journal', '✎'], ['settings', 'Paramètres', '⚙']
];
const pageTitles = { home: 'Vue d’ensemble', program: 'Ton programme', exercises: 'Bibliothèque d’exercices', progress: 'Ta progression', muscles: 'Carte musculaire', records: 'Records personnels', recovery: 'Échauffement & retour au calme', warmup: 'Échauffement guidé', cooldown: 'Retour au calme', history: 'Historique', journal: 'Journal sportif', settings: 'Paramètres', training: 'Séance en cours' };
const h = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const formatDate = (value, options = { day: 'numeric', month: 'long', year: 'numeric' }) => new Intl.DateTimeFormat('fr-FR', options).format(new Date(value));
const dateTimeLocalValue = value => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const formatDuration = seconds => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return total < 60 ? `${total} s` : `${Math.floor(total / 60)} min${total % 60 ? ` ${String(total % 60).padStart(2, '0')} s` : ''}`;
};
const dayKey = value => new Date(value).toLocaleDateString('sv-SE');
const startOfWeek = (date = new Date()) => { const result = new Date(date); result.setHours(0, 0, 0, 0); result.setDate(result.getDate() - (result.getDay() + 6) % 7); return result; };
const thisWeekCount = () => data.sessions.filter(session => new Date(session.completedAt) >= startOfWeek()).length;
const completedCount = () => data.sessions.length;
const nextType = () => completedCount() % 2 === 0 ? 'A' : 'B';
const nextDate = () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const trainingDays = [1, 3, 5];
  for (let offset = 0; offset < 7; offset++) {
    const candidate = new Date(today); candidate.setDate(today.getDate() + offset);
    if (trainingDays.includes(candidate.getDay()) && !data.sessions.some(session => dayKey(session.completedAt) === dayKey(candidate))) return candidate;
  }
  return today;
};
const getExercise = id => exerciseById[id] || { id, name: 'Exercice personnalisé', category: 'Autre', muscles: [], description: '', steps: [], errors: [], tips: [], easier: '', harder: '', illustration: '' };

function persist(next = data) {
  try { data = saveData(next); return true; }
  catch (error) { showToast(`Enregistrement impossible : ${error.message}`, 'error'); return false; }
}

function showToast(message, kind = 'success') {
  let element = document.querySelector('.toast');
  if (!element) { element = document.createElement('div'); element.className = 'toast'; document.body.append(element); }
  element.className = `toast ${kind === 'error' ? 'toast-error' : ''}`;
  element.textContent = message;
  element.classList.add('toast-visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('toast-visible'), 3600);
}

function showChartTooltip(point) {
  const shell = point.closest('.chart-shell');
  const tooltip = shell?.querySelector('.chart-tooltip');
  if (!shell || !tooltip) return;
  tooltip.textContent = point.dataset.chartTooltip || '';
  tooltip.hidden = false;
  const shellRect = shell.getBoundingClientRect();
  const marker = point.querySelector('.chart-marker') || point;
  const pointRect = marker.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth;
  const center = pointRect.left - shellRect.left + pointRect.width / 2;
  const left = Math.min(shellRect.width - tooltipWidth / 2 - 6, Math.max(tooltipWidth / 2 + 6, center));
  const above = pointRect.top - shellRect.top > tooltip.offsetHeight + 18;
  tooltip.classList.toggle('below', !above);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${above ? pointRect.top - shellRect.top - 8 : pointRect.bottom - shellRect.top + 8}px`;
}

function chartPointFrom(target) {
  return target instanceof Element ? target.closest('[data-chart-tooltip]') : null;
}

function icon(label) {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z"/>',
    program: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    exercises: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    progress: '<path d="M3 17 9 11l4 4 8-9M15 6h6v6"/>',
    history: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18M8 13h3M8 17h6"/>',
    journal: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4z"/>',
    muscles: '<path d="M7 4c2 0 3 2 3 4v2m4-6c2 0 3 2 3 4v2M5 13c2-2 4-2 6 0l1 2 1-2c2-2 4-2 6 0l2 3-4 4H7l-4-4z"/>',
    records: '<path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"/>',
    recovery: '<path d="M12 22c4 0 7-3 7-7 0-4-3-7-7-12-1 4-7 7-7 13 0 3 3 6 7 6z"/><path d="M9 17c0-2 1-3 3-5 1 2 3 3 3 5a3 3 0 0 1-6 0z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-.1-.1-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[label] || paths.home}</svg>`;
}

function navMarkup() {
  return navItems.map(([key, label, glyph]) => `<button class="nav-link ${page === key ? 'active' : ''}" data-action="navigate" data-page="${key}" aria-current="${page === key ? 'page' : 'false'}"><span class="nav-icon">${icon(key)}</span><span>${label}</span>${key === 'history' && data.sessions.length ? `<span class="nav-count">${data.sessions.length}</span>` : ''}</button>`).join('');
}

function shell(content) {
  const active = data.activeWorkout;
  return `<div class="app-shell ${data.preferences.theme === 'light' ? 'theme-light' : ''}">
    <aside class="sidebar"><a class="brand" href="#" data-action="navigate" data-page="home"><span class="brand-mark">C.</span><span><strong>cadence</strong><small>TON ESPACE D’ENTRAÎNEMENT</small></span></a>
      <div class="sidebar-label">ESPACE PERSONNEL</div><nav class="side-nav">${navMarkup()}</nav>
      <div class="sidebar-bottom"><div class="privacy-card"><span class="privacy-dot"></span><div><strong>Tes données restent ici</strong><small>Stockage privé sur cet appareil</small></div></div><button class="profile-chip" data-action="navigate" data-page="settings"><span class="avatar">C</span><span><b>Mon espace</b><small>Débutant · poids du corps</small></span>${icon('settings')}</button></div>
    </aside>
    <main class="main-area"><header class="topbar"><div><span class="eyebrow">${formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>${pageTitles[page] || 'Cadence'}</h1></div><div class="top-actions"><span class="save-indicator"><i></i> Enregistré localement</span><button class="icon-button" data-action="theme" aria-label="Changer de thème" title="Changer de thème">${data.preferences.theme === 'dark' ? '☼' : '☾'}</button><span class="avatar avatar-small">C</span></div></header><div class="page-content">${content}</div></main>
    <nav class="mobile-nav" aria-label="Navigation principale">${navItems.filter(item => ['home', 'program', 'exercises', 'muscles', 'records', 'progress', 'history', 'recovery', 'settings'].includes(item[0])).map(([key, label]) => `<button class="mobile-nav-link ${page === key ? 'active' : ''}" data-action="navigate" data-page="${key}" aria-current="${page === key ? 'page' : 'false'}">${icon(key)}<span>${({ home: 'Accueil', program: 'Programme', exercises: 'Exercices', muscles: 'Muscles', records: 'Records', progress: 'Progrès', history: 'Historique', recovery: 'Récupération', settings: 'Plus' })[key]}</span></button>`).join('')}</nav>
    ${active && !['training', 'warmup'].includes(page) ? `<button class="resume-banner" data-action="resume">${icon('play')} Reprendre ${active.phase === 'warmup' ? 'l’échauffement' : `ta séance ${h(active.type)}`} <span>En cours</span>${active.restTimer?.status === 'running' ? `<small id="rest-dock-clock">${formatClock(remainingSeconds(active.restTimer))}</small>` : ''}</button>` : ''}
    ${modalMarkup()}
    </div>`;
}

function formatClock(seconds) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }

function exerciseProgressPanel(exerciseId) {
  const records = exerciseRecords(data.sessions, exerciseId);
  const points = exerciseProgress(data.sessions, exerciseId, exerciseRange);
  const timed = records?.metric === 'duration';
  const unit = timed ? ' s' : ' rép.';
  const comparison = compareExerciseProgress(data.sessions, exerciseId);
  const recommendation = records ? recommendExercise(data.sessions, data.journalEntries, exerciseId, { targetReps: workoutDose(exerciseId).reps }) : '';
  const chartPoints = points.map(point => ({ date: point.date, value: point.value }));
  return `<section class="exercise-progress"><div class="section-header"><div><span class="section-kicker">SÉRIES VALIDÉES UNIQUEMENT</span><h3>Progression de cet exercice</h3></div><div class="period-switch small-period">${[['7days', '7 j'], ['30days', '30 j'], ['90days', '90 j'], ['all', 'Tout']].map(([id, label]) => `<button class="${exerciseRange === id ? 'selected' : ''}" data-action="exercise-range" data-range="${id}">${label}</button>`).join('')}</div></div>${records ? `<div class="record-kpis"><div><small>DERNIÈRE SÉANCE</small><strong>${records.last.value}${unit}</strong><span>${formatDate(records.last.date, { day: 'numeric', month: 'short' })}</span></div><div><small>MEILLEURE SÉRIE</small><strong>${records.bestSet.value}${unit}</strong><span>${formatDate(records.bestSet.date, { day: 'numeric', month: 'short' })}</span></div>${records.bestSession ? `<div><small>MEILLEUR TOTAL SÉANCE</small><strong>${records.bestSession.value} rép.</strong><span>${formatDate(records.bestSession.date, { day: 'numeric', month: 'short' })}</span></div>` : ''}${records.bestLoad.value > 0 ? `<div><small>CHARGE LA PLUS ÉLEVÉE</small><strong>${records.bestLoad.value} kg</strong><span>${formatDate(records.bestLoad.date, { day: 'numeric', month: 'short' })}</span></div>` : ''}</div>${comparison ? `<p class="comparison-note">Dernière séance vs précédente : ${comparison.change > 0 ? '+' : ''}${comparison.change}${unit}${comparison.loadChange ? ` · charge ${comparison.loadChange > 0 ? '+' : ''}${comparison.loadChange} kg` : ''}. Comparaison de ${h(getExercise(exerciseId).name)} uniquement.</p>` : ''}<div class="training-recommendation record-recommendation"><span>✳</span>${h(recommendation)}</div><div class="exercise-history-chart">${lineChart(chartPoints, `Progression de ${getExercise(exerciseId).name}`, unit)}</div>` : `<div class="empty-state compact-empty"><span>↗</span><h3>Aucun repère validé pour cet exercice.</h3><p>Les variantes restent séparées. Une première série validée créera son propre historique.</p></div>`}</section>`;
}

function modalMarkup() {
  if (finishReviewOpen && data.activeWorkout) {
    const draft = data.activeWorkout;
    const validated = draft.exercises.reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
    const lines = draft.exercises.map(exercise => {
      const sets = exercise.sets.filter(set => set.completed);
      const detail = sets.map(set => `${Number(set.reps) || 0}${exercise.duration ? ' s' : ' rép.'}${Number(set.load) ? ` · ${Number(set.load)} kg` : ''}`).join(' · ');
      return `<div class="detail-exercise"><div><strong>${h(exercise.name)}</strong><small>${sets.length} / ${exercise.sets.length} séries validées</small></div><div class="detail-set-list">${detail || '<span>Aucune série validée</span>'}</div>${exercise.note ? `<p>${h(exercise.note)}</p>` : ''}</div>`;
    }).join('');
    return `<div class="modal-backdrop"><section class="modal-card finish-review" role="dialog" aria-modal="true" aria-labelledby="finish-review-title"><div class="modal-kicker">VÉRIFICATION AVANT ENREGISTREMENT · SÉANCE ${h(draft.type)}</div><h2 id="finish-review-title">Récapitulatif de ta séance</h2><p class="muted">${draft.exercises.length} exercices · ${validated} séries validées. Les valeurs non cochées ne seront pas comptées.</p><div class="detail-list">${lines}</div><div class="training-footer"><button class="button button-secondary" data-action="close-modal">Retour à la séance</button><button class="button button-primary" data-action="finish-confirm" ${validated ? '' : 'disabled'}>Enregistrer et terminer ${icon('check')}</button></div></section></div>`;
  }
  if (selectedSession) {
    const session = data.sessions.find(item => item.id === selectedSession);
    if (!session) return '';
    if (editingSessionId === session.id) return sessionEditMarkup(session);
    const performed = session.exercises.map(item => `<div class="detail-exercise"><div><strong>${h(item.name)}</strong><small>${(item.sets || []).filter(set => set.completed).length} série(s) validée(s)</small></div><div class="detail-set-list">${(item.sets || []).map((set, index) => `<span>S${index + 1} · ${Number(set.reps) || 0}${item.duration ? ' s' : ' rép.'}${Number(set.load) ? ` · ${Number(set.load)} kg` : ''}${set.completed ? ' ✓' : ''}</span>`).join('')}</div>${item.note ? `<p>${h(item.note)}</p>` : ''}</div>`).join('');
    const journal = data.journalEntries.find(item => item.sessionId === session.id);
    const journalDetails = journal ? `<div class="note-block"><b>Ressenti · ${h(journal.mood || 'non renseigné')}</b><div class="journal-badges">${journal.difficulty ? `<span>Effort : ${h(journal.difficulty)}</span>` : ''}${journal.energy ? `<span>Énergie : ${h(journal.energy)}</span>` : ''}</div>${journal.pain ? `<p class="pain-note">Gêne : ${h(journal.pain)}</p>` : ''}${journal.notes ? `<p>${h(journal.notes)}</p>` : ''}${journal.nextGoal ? `<p><b>Prochaine intention</b> · ${h(journal.nextGoal)}</p>` : ''}<button class="button button-small button-secondary" data-action="edit-journal" data-id="${h(journal.id)}">Modifier le ressenti</button></div>` : `<div class="note-block"><b>Ressenti</b><p>Aucune note n’est encore associée à cette séance.</p><button class="button button-small button-secondary" data-action="open-journal-for-session" data-id="${h(session.id)}">Ajouter un ressenti</button></div>`;
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" aria-label="Fermer">${icon('close')}</button><div class="modal-kicker">BILAN DE SÉANCE · ${h(session.type)}</div><h2 id="modal-title">Séance ${h(session.type)} du ${h(formatDate(session.completedAt, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</h2><p class="muted">${formatDuration(session.durationSeconds)} · ${session.exercises.length} exercices · ${session.exercises.reduce((sum, exercise) => sum + (exercise.sets || []).filter(set => set.completed).length, 0)} séries validées</p><div class="detail-list">${performed || '<p class="muted">Aucun exercice enregistré.</p>'}</div>${session.note ? `<div class="note-block"><b>Note de séance</b><p>${h(session.note)}</p></div>` : ''}${journalDetails}<div class="session-detail-actions"><button class="button button-secondary" data-action="edit-session" data-id="${h(session.id)}">Modifier la séance</button><button class="button button-danger" data-action="delete-session" data-id="${h(session.id)}">Supprimer la séance</button></div></section></div>`;
  }
  if (selectedExercise) {
    const exercise = getExercise(selectedExercise);
    const activeDialog = document.querySelector('.exercise-detail-modal-open');
    if (!activeDialog) return '';
    return `<div class="modal-backdrop" data-action="close-exercise"><section class="modal-card exercise-modal" role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title"><button class="modal-close" data-action="close-exercise">${icon('close')}</button><div class="exercise-modal-art">${exercise.illustration}</div><div class="modal-kicker">${h(exercise.category)} · ${h(exercise.dosage)}</div><h2 id="exercise-modal-title">${h(exercise.name)}</h2><p class="muted">${h(exercise.description)}</p><div class="muscle-row">${exercise.muscles.map(muscle => `<span>${h(muscle)}</span>`).join('')}</div><div class="detail-columns"><div><h3>Comment faire</h3><ol>${exercise.steps.map(step => `<li>${h(step)}</li>`).join('')}</ol></div><div><h3>À garder en tête</h3><ul>${exercise.tips.map(tip => `<li>${h(tip)}</li>`).join('')}</ul></div></div><div class="variant-grid"><div><small>VARIANTE PLUS FACILE</small><p>${h(exercise.easier)}</p></div><div><small>POUR PROGRESSER</small><p>${h(exercise.harder)}</p></div></div><div class="note-block"><b>Erreurs fréquentes</b><p>${exercise.errors.map(error => h(error)).join(' · ')}</p></div>${exerciseProgressPanel(exercise.id)}</section></div>`;
  }
  return '';
}

function sessionEditMarkup(session) {
  const exerciseFields = session.exercises.map((exercise, exerciseIndex) => `<fieldset class="session-edit-exercise"><legend>${h(exercise.name)}</legend><div class="session-edit-sets">${exercise.sets.map((set, setIndex) => `<div class="session-edit-set"><b>Série ${setIndex + 1}</b><label>${exercise.duration ? 'Secondes' : 'Répétitions'}<input type="number" min="0" step="1" name="reps-${exerciseIndex}-${setIndex}" value="${Math.max(0, Number(set.reps) || 0)}" required></label><label>Charge (kg)<input type="number" min="0" step="0.5" name="load-${exerciseIndex}-${setIndex}" value="${Math.max(0, Number(set.load) || 0)}"></label><label class="session-set-check"><input type="checkbox" name="completed-${exerciseIndex}-${setIndex}" ${set.completed ? 'checked' : ''}> Validée</label></div>`).join('')}</div></fieldset>`).join('');
  return `<div class="modal-backdrop" data-action="close-modal"><form class="modal-card session-edit-form" data-form="edit-session" data-id="${h(session.id)}" role="dialog" aria-modal="true" aria-labelledby="session-edit-title"><button type="button" class="modal-close" data-action="cancel-session-edit" aria-label="Fermer">${icon('close')}</button><div class="modal-kicker">HISTORIQUE · MODIFICATION</div><h2 id="session-edit-title">Modifier la séance</h2><div class="session-edit-meta"><label class="field-label">Type<select name="type"><option value="A" ${session.type === 'A' ? 'selected' : ''}>Séance A</option><option value="B" ${session.type === 'B' ? 'selected' : ''}>Séance B</option></select></label><label class="field-label">Date et heure<input type="datetime-local" name="completedAt" value="${h(dateTimeLocalValue(session.completedAt))}" required></label><label class="field-label">Durée (secondes)<input type="number" min="0" step="1" name="durationSeconds" value="${Math.max(0, Number(session.durationSeconds) || 0)}" required></label></div><label class="field-label session-note-field">Note de séance<textarea name="note" rows="2" placeholder="Ajouter une note…">${h(session.note || '')}</textarea></label><div class="session-edit-exercises">${exerciseFields}</div><div class="session-edit-actions"><button type="button" class="button button-ghost" data-action="cancel-session-edit">Annuler</button><button type="submit" class="button button-primary">Enregistrer les modifications</button></div></form></div>`;
}

function homePage() {
  const total = completedCount(), week = thisWeekCount(), upcomingType = data.activeWorkout?.type || nextType();
  const recent = [...data.sessions].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))[0];
  const completedWeeks = weeklyPoints(data.sessions, 'month').filter(point => point.value >= data.goals.weeklyTarget).length;
  const consistency = completedWeeks ? `${completedWeeks} semaine${completedWeeks > 1 ? 's' : ''} / 8 à l’objectif` : total ? 'La régularité se construit' : 'Commence à ton rythme';
  const recentPerf = recent?.exercises?.find(exercise => exercise.sets?.some(set => set.completed));
  const quick = recentPerf ? `${recentPerf.name} · ${recentPerf.sets.filter(set => set.completed).reduce((sum, set) => sum + Number(set.reps || 0), 0)} répétitions cumulées` : 'Tes dernières performances apparaîtront après la séance';
  const nextTrainingDate = nextDate();
  return `<section class="welcome-row"><div><div class="welcome-kicker"><span class="sun-icon">✳</span> Un pas après l’autre</div><h2>Construis ta régularité,<br><em>à ton rythme.</em></h2><p>Des séances simples, une progression posée et un suivi qui t’appartient.</p><button class="button button-primary" data-action="start-workout" data-type="${upcomingType}">${icon('play')} ${data.activeWorkout ? 'Reprendre ma séance' : `Commencer la séance ${upcomingType}`}</button></div><div class="welcome-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="hero-disc"><span>3×</span><small>PAR SEMAINE</small></div><div class="hero-spark spark-a">✳</div><div class="hero-spark spark-b">·</div><div class="hero-ribbon">LE PROGRÈS EST UNE PRATIQUE</div></div></section>
    <section class="stats-grid"><article class="stat-card"><div class="stat-top"><span>Cette semaine</span><span class="stat-icon">◷</span></div><strong>${week}<small> / ${data.goals.weeklyTarget}</small></strong><p>séance${week === 1 ? '' : 's'} réalisée${week === 1 ? '' : 's'}</p><div class="mini-progress"><i style="width:${Math.min(100, week / data.goals.weeklyTarget * 100)}%"></i></div></article><article class="stat-card"><div class="stat-top"><span>Au compteur</span><span class="stat-icon">↗</span></div><strong>${total}</strong><p>${total === 1 ? 'séance au total' : 'séances au total'}</p><div class="stat-caption">Tes efforts, gardés en privé</div></article><article class="stat-card stat-card-wide"><div class="stat-top"><span>Ta régularité</span><span class="stat-icon">✳</span></div><strong class="stat-text">${h(consistency)}</strong><p>Objectif : ${data.goals.weeklyTarget} séances par semaine</p><button class="text-link" data-action="navigate" data-page="progress">Voir ma progression ${icon('arrow')}</button></article></section>
    <section class="dashboard-grid"><article class="panel next-session"><div class="panel-heading"><div><span class="section-kicker">À VENIR</span><h3>Ta prochaine séance</h3></div><span class="type-pill type-${upcomingType.toLowerCase()}">Séance ${upcomingType}</span></div><div class="next-date"><span class="date-day">${nextTrainingDate.getDate()}</span><span><b>${formatDate(nextTrainingDate, { weekday: 'long' })}</b><small>${formatDate(nextTrainingDate, { month: 'long' })} · environ 25 min</small></span></div><div class="next-exercises">${(workouts[upcomingType] || []).slice(0, 4).map(id => { const exercise = getExercise(id); return `<span>${h(exercise.name)}</span>`; }).join('')}</div><button class="button button-primary button-full" data-action="start-workout" data-type="${upcomingType}">${icon('play')} Lancer cette séance</button></article><article class="panel recent-panel"><div class="panel-heading"><div><span class="section-kicker">DERNIÈRE ACTIVITÉ</span><h3>Ton dernier repère</h3></div><button class="text-link" data-action="navigate" data-page="history">Tout voir ${icon('arrow')}</button></div>${recent ? `<button class="recent-summary" data-action="open-session" data-id="${h(recent.id)}"><span class="recent-mark">${h(recent.type)}</span><span><b>Séance ${h(recent.type)} · ${formatDate(recent.completedAt, { day: 'numeric', month: 'short' })}</b><small>${h(quick)}</small></span><span class="recent-arrow">${icon('arrow')}</span></button><div class="recent-quote"><span>“</span><p>${recent.note ? h(recent.note) : 'Tu as pris le temps de faire ta séance. C’est déjà une belle victoire.'}</p></div>` : `<div class="first-session"><div class="first-session-icon">✳</div><strong>Ton premier repère t’attend.</strong><p>Les performances se construiront avec tes vraies séances, sans chiffres inventés.</p></div>`}</article></section>
    <section class="bottom-grid"><article class="panel focus-panel"><span class="section-kicker">ÉQUILIBRE AVANT TOUT</span><div class="focus-head"><h3>Tout le corps compte.</h3><span>✳</span></div><p>Le programme fait une place au dos, aux épaules arrière, aux jambes et au tronc à chaque rotation.</p><div class="balance-tags"><span>↗ Dos</span><span>◌ Jambes & fessiers</span><span>◎ Sangle abdominale</span></div></article><article class="panel reminder-panel"><span class="section-kicker">PETIT RAPPEL</span><h3>La qualité avant la quantité.</h3><p>Échauffe-toi quelques minutes. Garde une répétition en réserve et arrête l’exercice si tu ressens une douleur.</p><button class="text-link" data-action="navigate" data-page="program">Revoir le programme ${icon('arrow')}</button></article></section>`;
}

function exerciseCard(exercise, compact = false) {
  return `<article class="exercise-card ${compact ? 'exercise-card-compact' : ''}"><button class="exercise-art-button" data-action="open-exercise" data-id="${h(exercise.id)}" aria-label="Voir la fiche ${h(exercise.name)}">${exercise.illustration}</button><div class="exercise-card-content"><div class="exercise-meta"><span>${h(exercise.category)}</span><span>${h(exercise.dosage)}</span></div><h3>${h(exercise.name)}</h3><p>${h(exercise.description)}</p><div class="muscle-row">${exercise.muscles.slice(0, 3).map(muscle => `<span>${h(muscle)}</span>`).join('')}</div><button class="text-link" data-action="open-exercise" data-id="${h(exercise.id)}">Voir les consignes ${icon('arrow')}</button></div></article>`;
}

function homePageV2() {
  const lastRecord = exercises.map(exercise => ({ exercise, record: exerciseRecords(data.sessions, exercise.id) })).filter(item => item.record).map(item => ({ ...item, best: item.record.bestSet })).sort((a, b) => Date.parse(b.best.date) - Date.parse(a.best.date))[0];
  const latestMuscle = analyzeMuscles(data.sessions, 'all').muscles.filter(item => item.lastWorkedAt).sort((a, b) => Date.parse(b.lastWorkedAt) - Date.parse(a.lastWorkedAt))[0];
  const recentMuscleSession = latestMuscle?.recentSessions[0];
  const insights = `<section class="home-insights"><article class="panel home-insight-card"><span class="section-kicker">DERNIER RECORD PERSONNEL</span>${lastRecord ? `<h3>${h(lastRecord.exercise.name)}</h3><strong>${lastRecord.best.value}${lastRecord.record.metric === 'duration' ? ' s' : ' rép.'}</strong><p>Meilleure série · ${lastRecord.best.sessionType ? `Séance ${h(lastRecord.best.sessionType)} · ` : ''}${formatDate(lastRecord.best.date, { day: 'numeric', month: 'short' })}</p><button class="text-link" data-action="navigate" data-page="records">Voir mes records ${icon('arrow')}</button>` : `<h3>Le premier repère viendra</h3><p>Les records apparaîtront après des séries validées.</p>`}</article><article class="panel home-insight-card"><span class="section-kicker">GROUPE RÉCEMMENT TRAVAILLÉ</span>${latestMuscle ? `<h3>${h(latestMuscle.label)}</h3><p>${recentMuscleSession?.setCount || 0} série(s) validée(s) · ${recentMuscleSession?.type ? `Séance ${h(recentMuscleSession.type)} · ` : ''}${formatDate(latestMuscle.lastWorkedAt, { day: 'numeric', month: 'short' })}</p>` : `<h3>Pas encore de repère musculaire</h3><p>La carte se remplira à partir de tes séances terminées.</p>`}<button class="text-link" data-action="navigate" data-page="muscles">Explorer la carte musculaire ${icon('arrow')}</button></article></section>`;
  return homePage().replace('<section class="bottom-grid">', `${insights}<section class="bottom-grid">`).replace('</div></article><article class="panel reminder-panel">', `<button class="text-link home-muscle-link" data-action="navigate" data-page="muscles">Explorer la carte musculaire ${icon('arrow')}</button></div></article><article class="panel reminder-panel">`);
}

function programPage() {
  return `<section class="page-intro"><div><span class="section-kicker">ROUTINE DÉBUTANT · 3 JOURS / SEMAINE</span><h2>Simple, équilibré,<br><em>progressif.</em></h2><p>Alterne les séances A et B, avec un jour de repos entre chaque entraînement. La rotation continue d’une semaine à l’autre.</p></div><div class="program-orbit"><span>REPOS</span><b>A</b><span>REPOS</span><b>B</b><span>REPOS</span><b>A</b></div></section><div class="program-note"><span>✳</span><p><b>Pour démarrer :</b> garde 1 à 2 répétitions en réserve. Si une gêne apparaît, arrête l’exercice et choisis une variante plus facile.</p></div><section class="workout-cards">${['A', 'B'].map(type => `<article class="workout-card"><div class="workout-card-head"><span class="type-pill type-${type.toLowerCase()}">SÉANCE ${type}</span><span class="workout-duration">◷ 20–30 min</span></div><h3>${type === 'A' ? 'Force & stabilité' : 'Dos & chaîne postérieure'}</h3><p>${type === 'A' ? 'Un équilibre entre poussée, tirage, jambes et maintien.' : 'Un accent sur le dos, les fessiers et le contrôle du tronc.'}</p><div class="workout-exercise-list">${workouts[type].map((id, index) => { const exercise = getExercise(id); const dose = workoutDose(id); return `<button class="workout-exercise-row" data-action="open-exercise" data-id="${id}"><span class="exercise-number">0${index + 1}</span><span><b>${h(exercise.name)}</b><small>${h(dose.label)}</small></span><span class="row-chevron">›</span></button>`; }).join('')}</div><button class="button ${type === nextType() ? 'button-primary' : 'button-secondary'} button-full" data-action="start-workout" data-type="${type}">${icon('play')} Commencer la séance ${type}</button></article>`).join('')}</section><section class="complement-section"><div class="section-header"><div><span class="section-kicker">EN COMPLÉMENT</span><h3>Renforcer les zones oubliées</h3><p>Des mouvements légers pour le haut du dos et le contrôle du tronc.</p></div><button class="text-link" data-action="navigate" data-page="exercises">Toute la bibliothèque ${icon('arrow')}</button></div><div class="complement-grid">${['reverse-snow-angels', 'bird-dog', 'superman'].map(id => exerciseCard(getExercise(id), true)).join('')}</div></section>`;
}

function workoutDose(id) {
  const dose = {
    pushups: { reps: 5, label: '2 × 4–6 répétitions' }, 'backpack-row': { reps: 10, load: 0, label: '2 × 8–12 répétitions' }, squats: { reps: 12, label: '2 × 12 répétitions' }, plank: { reps: 20, duration: true, label: '2 × 20 secondes' }, 'glute-bridge': { reps: 12, label: '2 × 12 répétitions' }, 'calf-raises': { reps: 15, label: '2 × 15 répétitions' }, 'dead-bug': { reps: 8, perSide: true, label: '2 × 8 par côté' }, 'incline-pushups': { reps: 5, label: '2 × 5 répétitions' }, 'reverse-snow-angels': { reps: 8, label: '2 × 8 répétitions' }, 'bird-dog': { reps: 6, perSide: true, label: '2 × 6 par côté' }
  };
  const recommendedRest = { pushups: 90, 'backpack-row': 90, squats: 75, plank: 45, 'glute-bridge': 60, 'calf-raises': 60, 'dead-bug': 45, 'incline-pushups': 75, 'reverse-snow-angels': 60, 'bird-dog': 45 }[id] || 75;
  return { ...(dose[id] || { reps: 8, label: '2 séries contrôlées' }), restSeconds: recommendedRest };
}

function libraryPage() {
  const filtered = exercises.filter(exercise => (libraryCategory === 'Tous' || exercise.category === libraryCategory) && (`${exercise.name} ${exercise.muscles.join(' ')}`).toLocaleLowerCase('fr').includes(libraryQuery.toLocaleLowerCase('fr')));
  const categoryCounts = new Map(categories.map(category => [category, category === 'Tous' ? exercises.length : exercises.filter(exercise => exercise.category === category).length]));
  return `<section class="page-intro library-intro"><div><span class="section-kicker">MOUVEMENTS GUIDÉS</span><h2>Apprends le geste,<br><em>à ton rythme.</em></h2><p>Des consignes simples, une illustration du mouvement et des variantes adaptées à ton niveau.</p></div><div class="library-count"><b>${exercises.length.toString().padStart(2, '0')}</b><span>exercices<br>illustrés</span></div></section><section class="library-tools"><label class="search-field">${icon('search')}<input id="library-search" type="search" value="${h(libraryQuery)}" placeholder="Chercher un exercice ou un muscle…" autocomplete="off"></label><div class="category-scroller">${categories.map(category => `<button class="filter-chip ${libraryCategory === category ? 'selected' : ''}" data-action="category" data-category="${h(category)}">${h(category)} <small>${categoryCounts.get(category)}</small></button>`).join('')}</div></section><div class="exercise-grid">${filtered.map(exercise => exerciseCard(exercise)).join('') || `<div class="empty-state"><span>⌕</span><h3>Aucun exercice trouvé</h3><p>Essaie un autre nom ou un autre groupe musculaire.</p></div>`}</div>`;
}

const warmupSteps = [
  ['Marche dynamique', '60 s', 'Marche sur place, monte progressivement les genoux et laisse les bras accompagner le rythme.', 'Corps entier'],
  ['Cercles d’épaules', '60 s', 'Fais de petits cercles vers l’avant puis vers l’arrière, sans hausser les épaules.', 'Haut du corps'],
  ['Mobilité des poignets', '60 s', 'Ouvre et ferme doucement les mains, puis dessine de petits cercles avec les poignets.', 'Haut du corps'],
  ['Mobilité des hanches', '60 s', 'Fais de petits cercles confortables avec le bassin, sans forcer l’amplitude.', 'Dos et hanches'],
  ['Squats faciles', '60 s', 'Enchaîne des demi-squats confortables, en gardant les pieds bien ancrés.', 'Bas du corps'],
  ['Répétitions spécifiques', '60 s', 'Répète lentement une variante facile du premier exercice et vérifie que le mouvement reste confortable.', 'Corps entier']
];
const cooldownSteps = [
  ['Marche lente', '60 s', 'Continue à marcher tranquillement et laisse le souffle redescendre.', 'Retour au calme'],
  ['Respiration calme', '60 s', 'Inspire sans forcer puis expire un peu plus longtemps, épaules relâchées.', 'Retour au calme'],
  ['Ouverture douce de la poitrine', '60 s', 'Place les mains derrière le dos ou sur les hanches et ouvre doucement la poitrine, sans tirer.', 'Retour au calme'],
  ['Mobilité des hanches', '60 s', 'Fais quelques déplacements confortables du bassin et des jambes. Arrête si une gêne apparaît.', 'Retour au calme']
];

function warmupRoutine(type = 'A') {
  const steps = warmupSteps.map(step => [...step]);
  steps[5] = type === 'B'
    ? ['Répéter doucement le tirage', '60 s', 'Sans charge, ramène les coudes vers les côtes puis relâche. Termine par quelques mouvements confortables de hanches.', 'Dos et hanches']
    : ['Répéter doucement la poussée', '60 s', 'Fais quelques pompes au mur ou sur un support haut, puis relâche les poignets et les épaules.', 'Haut du corps'];
  return steps;
}

const routineDuration = step => Math.max(15, Number.parseInt(step?.[1], 10) || 60);
function routineTimerMarkup(step) {
  const remaining = remainingSeconds(routineTimer);
  const status = routineTimer.status === 'running' ? 'En cours' : routineTimer.status === 'finished' ? 'Étape terminée' : 'Facultatif';
  return `<div class="routine-timer"><span><small>MINUTEUR FACULTATIF</small><b id="routine-clock">${formatClock(remaining)}</b><small class="routine-timer-status" aria-live="polite">${status}</small></span><div><button class="button button-secondary button-small" data-action="routine-timer-toggle">${icon(routineTimer.status === 'running' ? 'pause' : 'play')} ${routineTimer.status === 'running' ? 'Pause' : routineTimer.status === 'finished' ? 'Relancer' : 'Démarrer'}</button><button class="button button-ghost button-small" data-action="routine-timer-reset" data-duration="${routineDuration(step)}">Réinitialiser</button></div></div>`;
}

function musclesPage() {
  const analysis = analyzeMuscles(data.sessions, muscleRange);
  const selected = analysis.muscles.find(item => item.id === selectedMuscle) || analysis.muscles[0];
  const selectedAllTime = analyzeMuscles(data.sessions, 'all').muscles.find(item => item.id === selected.id) || selected;
  const available = muscleGroups.filter(group => group.view === muscleView);
  const libraryRows = exercises.map(exercise => ({ exercise, intensity: exerciseMuscleActivation[exercise.id]?.[selected.id] })).filter(item => item.intensity).sort((a, b) => b.intensity - a.intensity);
  const intensityLabel = intensity => intensity >= 3 ? 'Principale' : intensity === 2 ? 'Secondaire' : 'En appui';
  return `<section class="page-intro muscle-intro"><div><span class="section-kicker">VOLUME VALIDÉ DANS TES SÉANCES</span><h2>Où ton entraînement<br><em>se concentre.</em></h2><p>La carte compte les séries terminées de chaque séance. Les couleurs indiquent un volume relatif, pas une mesure médicale.</p></div><div class="period-switch">${[['7days', '7 jours'], ['30days', '30 jours'], ['90days', '90 jours'], ['all', 'Tout']].map(([id, label]) => `<button class="${muscleRange === id ? 'selected' : ''}" data-action="muscle-range" data-range="${id}">${label}</button>`).join('')}</div></section><section class="muscle-balance-grid">${Object.values(analysis.balance).map(row => `<article class="panel balance-card"><div><span class="section-kicker">${h(row.label.toUpperCase())}</span><strong>${row.ratio === null ? '—' : `${row.ratio}%`}</strong></div><div class="balance-bar"><i style="width:${row.ratio ?? 0}%"></i></div><p>${h(row.message)}</p></article>`).join('')}</section><section class="muscle-layout"><article class="panel muscle-map-panel"><div class="section-header"><div><span class="section-kicker">${analysis.includedSessions} SÉANCE(S) AVEC SÉRIES VALIDÉES</span><h3>Carte interactive</h3></div><div class="view-switch"><button class="${muscleView === 'front' ? 'selected' : ''}" data-action="muscle-view" data-view="front">Avant</button><button class="${muscleView === 'back' ? 'selected' : ''}" data-action="muscle-view" data-view="back">Arrière</button></div></div><div class="muscle-map-and-detail"><div class="muscle-map-figure">${muscleMapSvg(muscleView, analysis.muscles, selectedMuscle)}<div class="muscle-legend"><span><i class="muscle-dot low"></i>Léger</span><span><i class="muscle-dot medium"></i>Modéré</span><span><i class="muscle-dot high"></i>Plus présent</span></div></div><aside class="muscle-detail"><span class="section-kicker">GROUPE SÉLECTIONNÉ</span><h3>${h(selected.label)}</h3><p>${h(selected.area)}</p><p class="muted">${h(selected.function)}</p><div class="muscle-detail-stats"><span><b>${selected.validatedSets}</b><small>séries validées</small></span><span><b>${selected.sessions}</b><small>séances</small></span></div><div class="muscle-detail-exercises"><b>Exercices de la bibliothèque</b>${libraryRows.length ? libraryRows.map(({ exercise, intensity }) => `<span class="muscle-exercise-level"><b>${h(exercise.name)}</b> · ${intensityLabel(intensity)}</span>`).join('') : '<span>Aucune association dans la bibliothèque actuelle.</span>'}</div><div class="muscle-detail-exercises"><b>Dernières séances · tout l’historique</b>${selectedAllTime.recentSessions.length ? selectedAllTime.recentSessions.map(session => `<button class="muscle-recent-session" data-action="open-session" data-id="${h(session.id)}">Séance ${h(session.type || '')} · ${formatDate(session.date, { day: 'numeric', month: 'short' })}</button>`).join('') : '<span>Aucune séance validée pour ce groupe.</span>'}</div></aside></div><div class="muscle-chip-list" aria-label="Choisir un groupe musculaire">${available.map(group => { const row = analysis.muscles.find(item => item.id === group.id); return `<button class="muscle-select-chip ${selectedMuscle === group.id ? 'selected' : ''}" data-action="select-muscle" data-muscle="${group.id}" aria-pressed="${selectedMuscle === group.id}"><i class="muscle-dot ${row.level}"></i>${h(group.label)} <small>${row.validatedSets}</small></button>`; }).join('')}</div></article><aside class="panel balance-explainer"><span class="section-kicker">COMMENT LIRE LA CARTE</span><h3>Des repères simples.</h3><p>Les groupes sont associés aux exercices de Cadence avec une contribution indicative. Chaque série cochée ajoute un point d’activité à ces groupes.</p><p>Les exercices personnalisés ou les séances sans séries validées ne sont pas attribués à un groupe.</p><button class="text-link" data-action="navigate" data-page="records">Voir les records ${icon('arrow')}</button></aside></section>`;
}

function recordsPage() {
  const records = exercises.map(exercise => ({ exercise, record: exerciseRecords(data.sessions, exercise.id) })).filter(item => item.record);
  const selected = getExercise(recordsExercise);
  const record = exerciseRecords(data.sessions, selected.id);
  const comparison = compareExerciseProgress(data.sessions, selected.id);
  const metricUnit = record?.metric === 'duration' ? ' s' : ' rép.';
  const points = record?.points || [];
  const recommendation = record ? recommendExercise(data.sessions, data.journalEntries, selected.id, { targetReps: workoutDose(selected.id).reps }) : '';
  return `<section class="page-intro records-intro"><div><span class="section-kicker">TES MEILLEURS REPÈRES</span><h2>Des records réels,<br><em>exercice par exercice.</em></h2><p>Chaque variante garde son propre historique. Seules les séries validées entrent dans les records et comparaisons.</p></div><label class="record-exercise-select">Choisir un exercice<select id="records-exercise">${exercises.map(item => `<option value="${item.id}" ${item.id === recordsExercise ? 'selected' : ''}>${h(item.name)}</option>`).join('')}</select></label></section>${record ? `<section class="record-focus panel"><div class="record-focus-heading"><div><span class="section-kicker">${h(selected.category.toUpperCase())}</span><h3>${h(selected.name)}</h3></div><button class="button button-secondary button-small" data-action="open-exercise" data-id="${h(selected.id)}">Fiche & progression</button></div><div class="record-kpis"><div><small>DERNIÈRE PERFORMANCE</small><strong>${record.last.value}${metricUnit}</strong><span>${record.last.sessionType ? `Séance ${h(record.last.sessionType)} · ` : ''}${formatDate(record.last.date, { day: 'numeric', month: 'short', year: 'numeric' })} · ${record.last.setCount} séries</span></div><div><small>MEILLEURE SÉRIE</small><strong>${record.bestSet.value}${metricUnit}</strong><span>${record.bestSet.sessionType ? `Séance ${h(record.bestSet.sessionType)} · ` : ''}${formatDate(record.bestSet.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>${record.bestSession ? `<div><small>MEILLEUR TOTAL SUR UNE SÉANCE</small><strong>${record.bestSession.value} rép.</strong><span>${record.bestSession.sessionType ? `Séance ${h(record.bestSession.sessionType)} · ` : ''}${formatDate(record.bestSession.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>` : ''}${record.bestLoad.value > 0 ? `<div><small>CHARGE MAXIMALE</small><strong>${record.bestLoad.value} kg</strong><span>${record.bestLoad.sessionType ? `Séance ${h(record.bestLoad.sessionType)} · ` : ''}${formatDate(record.bestLoad.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>` : ''}</div>${comparison ? `<p class="comparison-note">Évolution depuis la séance précédente : <b>${comparison.change > 0 ? '+' : ''}${comparison.change}${metricUnit}</b>${comparison.loadChange ? ` · charge ${comparison.loadChange > 0 ? '+' : ''}${comparison.loadChange} kg` : ''} (${formatDate(comparison.previous.date, { day: 'numeric', month: 'short' })} → ${formatDate(comparison.current.date, { day: 'numeric', month: 'short' })}).</p>` : `<p class="comparison-note">Deux séances validées sont nécessaires pour afficher une comparaison.</p>`}<div class="training-recommendation record-recommendation"><span>✳</span>${h(recommendation)}</div><div class="records-table"><div><b>Séance</b><b>Performance</b><b>Séries</b><b>Charge la plus haute</b></div>${points.slice().reverse().map(point => `<div><span>${point.sessionType ? `Séance ${h(point.sessionType)} · ` : ''}${formatDate(point.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><b>${point.value}${metricUnit}</b><span>${point.setCount}</span><span>${point.maxLoad ? `${point.maxLoad} kg` : '—'}</span></div>`).join('')}</div></section>` : `<section class="panel empty-records"><span class="empty-icon">★</span><h3>Aucun record enregistré pour cet exercice.</h3><p>Les repères apparaîtront après validation d’une série pendant une séance.</p></section>`}<section class="records-overview"><div class="section-header"><div><span class="section-kicker">HISTORIQUE VALIDÉ</span><h3>${records.length} exercice${records.length === 1 ? '' : 's'} avec des repères</h3></div></div><div class="record-card-grid">${records.length ? records.map(({ exercise, record: item }) => `<button class="record-card ${exercise.id === recordsExercise ? 'selected' : ''}" data-action="records-select" data-id="${exercise.id}"><span class="section-kicker">${h(exercise.category)}</span><b>${h(exercise.name)}</b><strong>${item.last.value}${item.metric === 'duration' ? ' s' : ' rép.'}</strong><small>Dernière · record ${item.bestSet.value}${item.metric === 'duration' ? ' s' : ' rép.'}</small></button>`).join('') : `<div class="empty-state compact-empty"><span>★</span><h3>Le premier repère viendra après une séance.</h3><p>Aucune valeur de départ n’est inventée.</p></div>`}</div></section>`;
}

function recoveryLibraryPage() {
  const steps = recoveryMode === 'warmup' ? warmupSteps : cooldownSteps;
  const minutes = recoveryMode === 'warmup' ? 6 : 4;
  const categories = [...new Set(steps.map(step => step[3]))];
  const selectedCategory = categories.includes(recoveryCategory) ? recoveryCategory : 'Tous';
  const filtered = selectedCategory === 'Tous' ? steps : steps.filter(step => step[3] === selectedCategory);
  const index = Math.min(recoveryStep, filtered.length - 1);
  const step = filtered[index] || steps[0];
  const categoriesMarkup = ['Tous', ...categories].map(category => `<button class="filter-chip ${category === selectedCategory ? 'selected' : ''}" data-action="recovery-category" data-category="${h(category)}">${h(category)}</button>`).join('');
  return `<section class="page-intro recovery-intro"><div><span class="section-kicker">MOBILITÉ SANS MATÉRIEL</span><h2>Prépare le mouvement,<br><em>puis redescends doucement.</em></h2><p>Routines courtes, adaptables et skippables. Reste dans une amplitude confortable.</p></div><div class="recovery-duration"><b>${minutes}</b><span>minutes<br>indicatives</span></div></section><section class="recovery-mode-switch"><button class="${recoveryMode === 'warmup' ? 'selected' : ''}" data-action="recovery-mode" data-mode="warmup">Échauffement · 6 min</button><button class="${recoveryMode === 'cooldown' ? 'selected' : ''}" data-action="recovery-mode" data-mode="cooldown">Retour au calme · 4 min</button></section><div class="category-scroller recovery-categories" aria-label="Classer les mouvements">${categoriesMarkup}</div><section class="recovery-guide panel"><div class="recovery-step-head"><span class="step-badge">${String(index + 1).padStart(2, '0')}</span><div><span class="section-kicker">${h(step[3].toUpperCase())} · ${h(step[1])}</span><h3>${h(step[0])}</h3></div></div><div class="warmup-art" aria-hidden="true">${stepIllustration(index)}</div><p>${h(step[2])}</p>${routineTimerMarkup(step)}<div class="progress-track"><i style="width:${(index + 1) / filtered.length * 100}%"></i></div><div class="training-footer"><button class="button button-secondary" data-action="recovery-prev" ${index === 0 ? 'disabled' : ''}>← Précédente</button><button class="button button-primary" data-action="recovery-next">${index === filtered.length - 1 ? 'Recommencer' : 'Étape suivante'} ${icon('arrow')}</button></div></section><section class="recovery-list">${filtered.map((item, stepIndex) => `<article class="recovery-step ${stepIndex === index ? 'active' : ''}"><span>${String(stepIndex + 1).padStart(2, '0')}</span><div><b>${h(item[0])}</b><small>${h(item[3])} · ${h(item[1])} · ${h(item[2])}</small></div></article>`).join('')}</section>`;
}

function warmupPage() {
  const draft = data.activeWorkout;
  if (!draft) return recoveryLibraryPage();
  const steps = warmupRoutine(draft.type);
  const index = Math.min(Number(draft.warmupStep) || 0, steps.length - 1);
  const step = steps[index];
  return `<section class="warmup-top"><button class="back-link" data-action="navigate" data-page="home">← Accueil</button><span class="type-pill type-${draft.type.toLowerCase()}">SÉANCE ${h(draft.type)}</span></section><section class="warmup-card panel"><div class="recovery-step-head"><span class="step-badge">${String(index + 1).padStart(2, '0')}</span><div><span class="section-kicker">ÉCHAUFFEMENT ${h(step[3].toUpperCase())} · 6 MINUTES</span><h2>${h(step[0])}</h2></div></div><div class="warmup-art" aria-hidden="true">${stepIllustration(index)}</div><p>${h(step[2])}</p><span class="warmup-duration">Durée conseillée · ${h(step[1])}</span>${routineTimerMarkup(step)}<div class="progress-track"><i style="width:${(index + 1) / steps.length * 100}%"></i></div><div class="training-footer"><button class="button button-secondary" data-action="warmup-prev" ${index === 0 ? 'disabled' : ''}>← Précédente</button><button class="button button-ghost" data-action="skip-warmup">Passer l’échauffement</button><button class="button button-primary" data-action="warmup-next">${index === steps.length - 1 ? 'Commencer la séance' : 'Étape suivante'} ${icon('arrow')}</button></div><p class="muted">Tu peux passer cette routine. Adapte ou arrête tout mouvement qui crée une gêne.</p></section><section class="recovery-list">${steps.map((item, stepIndex) => `<article class="recovery-step ${stepIndex === index ? 'active' : ''}"><span>${String(stepIndex + 1).padStart(2, '0')}</span><div><b>${h(item[0])}</b><small>${h(item[3])} · ${h(item[1])} · ${h(item[2])}</small></div></article>`).join('')}</section>`;
}

function stepIllustration(index) {
  const shapes = [
    '<circle cx="56" cy="24" r="8"/><path d="M56 33v28m0-19L38 53m18-10 18 11m-18 7L43 83m13-22 16 22"/>',
    '<circle cx="56" cy="24" r="8"/><path d="M56 33v31m0-19L34 37m22 8 22-8m-22 19L42 83m14-19 14 19"/>',
    '<circle cx="56" cy="24" r="8"/><path d="M56 33v34m0-21L36 52m20-6 20 6M56 67 43 83m13-16 13 16"/>',
    '<circle cx="56" cy="24" r="8"/><path d="M56 33v20m0-12L39 52m17-11 18 9m-18 3L43 68l13 15m0-30 17 15-4 15"/>',
    '<circle cx="56" cy="24" r="8"/><path d="M56 33v16m0-9L38 50m18-10 18 10m-18-1L43 61l2 20m11-33 14 13-5 20"/>',
    '<circle cx="56" cy="24" r="8"/><path d="M56 33v29m0-18L37 55m19-11 20 11m-20 7L44 82m12-20 15 20"/>'
  ];
  return `<svg class="routine-figure" viewBox="0 0 112 100" role="img" aria-label="Illustration de mobilité">${index === 0 ? '<path class="routine-ground" d="M14 86h84"/>' : ''}<g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${shapes[index]}</g><path class="routine-arrow" d="M91 43a19 19 0 0 1-2 20m2-20 4 5m-4-5-5 4"/></svg>`;
}

const completedSetCount = session => (session?.exercises || []).reduce((sum, exercise) => sum + (exercise.sets || []).filter(set => set.completed === true).length, 0);
const totalSessionReps = session => (session?.exercises || []).filter(exercise => exercise.duration !== true).reduce((sum, exercise) => sum + (exercise.sets || []).filter(set => set.completed === true).reduce((subtotal, set) => subtotal + (Number(set.reps) || 0), 0), 0);
const sessionLoads = session => (session?.exercises || []).map(exercise => ({ name: exercise.name, load: Math.max(0, ...(exercise.sets || []).filter(set => set.completed === true).map(set => Number(set.load) || 0)) })).filter(item => item.load > 0);

function cooldownPage() {
  const session = data.sessions.find(item => item.id === cooldownSessionId);
  const steps = cooldownSteps;
  const index = Math.min(recoveryStep, steps.length - 1);
  const step = steps[index];
  if (!session) return recoveryLibraryPage();
  const sets = completedSetCount(session);
  const completedExercises = session.exercises.filter(exercise => exercise.sets.some(set => set.completed === true)).length;
  const reps = totalSessionReps(session);
  const loads = sessionLoads(session);
  const previous = data.sessions.filter(item => item.id !== session.id && item.type === session.type).sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))[0];
  const previousDelta = previous ? reps - totalSessionReps(previous) : null;
  const newRecords = cooldownHighlights.map(record => `<span>${h(record.name)} · ${record.kind === 'load' ? `${record.value} kg` : record.kind === 'duration' ? `${record.value} s` : record.kind === 'session' ? `${record.value} rép. sur la séance` : `${record.value} rép. sur une série`}</span>`).join('');
  const loadSummary = loads.length ? loads.map(item => `${h(item.name)} : ${item.load} kg`).join(' · ') : 'Aucune charge externe enregistrée.';
  return `<section class="cooldown-summary"><span class="section-kicker">SÉANCE ${h(session.type)} ENREGISTRÉE</span><h2>Tu as terminé<br><em>à ton rythme.</em></h2><div class="cooldown-summary-stats"><span><b>${formatDuration(session.durationSeconds)}</b><small>durée</small></span><span><b>${completedExercises}</b><small>exercices réalisés</small></span><span><b>${sets}</b><small>séries validées</small></span><span><b>${reps}</b><small>répétitions</small></span></div><div class="session-finish-details"><p><b>Charges utilisées</b><span>${loadSummary}</span></p>${previous ? `<p><b>Comparaison avec ta dernière séance ${h(session.type)}</b><span>${previousDelta > 0 ? '+' : ''}${previousDelta} répétition(s) · ${sets - completedSetCount(previous) > 0 ? '+' : ''}${sets - completedSetCount(previous)} série(s) validée(s)</span></p>` : `<p><b>Comparaison</b><span>Ce sera ton premier repère pour la séance ${h(session.type)}.</span></p>`}<p><b>Records battus</b><span>${newRecords || 'Aucun nouveau record cette fois. La séance compte quand même.'}</span></p></div><div class="button-row"><button class="button button-secondary" data-action="open-session" data-id="${h(session.id)}">Voir le détail</button><button class="button button-primary" data-action="open-journal-for-session" data-id="${h(session.id)}">Noter mon ressenti ${icon('arrow')}</button></div></section><section class="warmup-card panel"><div class="recovery-step-head"><span class="step-badge">${String(index + 1).padStart(2, '0')}</span><div><span class="section-kicker">RETOUR AU CALME · 4 MINUTES · OPTIONNEL</span><h3>${h(step[0])}</h3></div></div><div class="warmup-art">${stepIllustration(index)}</div><p>${h(step[2])}</p><span class="warmup-duration">Durée conseillée · ${h(step[1])}</span>${routineTimerMarkup(step)}<div class="progress-track"><i style="width:${(index + 1) / steps.length * 100}%"></i></div><div class="training-footer"><button class="button button-secondary" data-action="cooldown-prev" ${index === 0 ? 'disabled' : ''}>← Précédente</button><button class="button button-ghost" data-action="skip-cooldown">Terminer ici</button><button class="button button-primary" data-action="cooldown-next">${index === steps.length - 1 ? 'Terminer' : 'Étape suivante'} ${icon('arrow')}</button></div></section>`;
}

function trainingPage() {
  const draft = data.activeWorkout;
  if (!draft) return `<section class="empty-state"><span>✳</span><h2>Aucune séance en cours</h2><p>Choisis la séance A ou B pour commencer.</p><div class="button-row"><button class="button button-primary" data-action="start-workout" data-type="${nextType()}">Commencer la séance ${nextType()}</button><button class="button button-secondary" data-action="navigate" data-page="program">Voir le programme</button></div></section>`;
  const exercise = draft.exercises[draft.currentExerciseIndex];
  if (!exercise) return '';
  const detail = getExercise(exercise.exerciseId);
  const completedSets = draft.exercises.reduce((sum, item) => sum + item.sets.filter(set => set.completed).length, 0);
  const plannedSets = draft.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const restTimer = draft.restTimer || createRestTimer(data.preferences.restSeconds);
  const previous = exerciseRecords(data.sessions, exercise.exerciseId)?.last;
  const lastPerformance = previous ? `Dernière séance (${formatDate(previous.date, { day: 'numeric', month: 'short' })}) : ${previous.value}${exercise.duration ? ' s tenues' : ' répétitions cumulées'} sur ${previous.setCount} série(s) validée(s)${previous.maxLoad ? ` · charge max ${previous.maxLoad} kg` : ''}.` : 'Premier repère pour cet exercice : tes séries validées apparaîtront ici.';
  const doneExercises = draft.exercises.filter(item => item.sets.every(set => set.completed)).length;
  const remainingExercises = draft.exercises.length - doneExercises;
  const progressPercent = Math.round(completedSets / Math.max(1, plannedSets) * 100);
  const restOptions = [...new Set([30, 45, 60, 75, 90, 120, 150, 180, 240, 300, exercise.recommendedRestSeconds, restTimer.durationSeconds].filter(Boolean))].sort((a, b) => a - b);
  return `<section class="training-top"><button class="back-link" data-action="navigate" data-page="program">← Quitter le mode guidé</button><div class="training-controls"><span class="type-pill type-${draft.type.toLowerCase()}">SÉANCE ${draft.type}</span><span class="training-elapsed">● EN COURS</span><button class="button button-small button-secondary" data-action="pause-workout">${icon(draft.paused ? 'play' : 'pause')} ${draft.paused ? 'Reprendre' : 'Mettre en pause'}</button><button class="button button-small button-ghost" data-action="cancel-workout">Annuler</button></div></section><div class="training-layout"><div class="training-main"><div class="training-progress-row"><div><span class="section-kicker">EXERCICE ${draft.currentExerciseIndex + 1} / ${draft.exercises.length} · ${doneExercises} TERMINÉ(S) · ${remainingExercises} RESTANT(S)</span><h2>${h(exercise.name)}</h2></div><span class="training-set-count">${completedSets} / ${plannedSets} séries · ${progressPercent}%</span></div><div class="progress-track"><i style="width:${Math.max(3, progressPercent)}%"></i></div><div class="training-art">${detail.illustration}</div><div class="training-description"><div class="muscle-row">${detail.muscles.map(muscle => `<span>${h(muscle)}</span>`).join('')}</div><p>${h(detail.description)}</p><div class="last-performance">${h(lastPerformance)}</div>${exercise.recommendation ? `<div class="training-recommendation"><span>✳</span>${h(exercise.recommendation)}</div>` : ''}<button class="text-link" data-action="open-exercise" data-id="${h(detail.id)}">Voir la fiche complète ${icon('arrow')}</button></div>
       <div class="sets-panel"><div class="sets-heading"><div><span class="section-kicker">TES SÉRIES</span><h3>${h(workoutDose(exercise.exerciseId).label)}</h3></div><span class="rest-status">Repos conseillé · ${formatDuration(exercise.recommendedRestSeconds || exercise.restSeconds)} · réglable</span></div><div class="sets-table"><div class="sets-table-head"><span>SÉRIE</span><span>${exercise.duration ? 'SECONDES' : 'RÉPÉTITIONS'}</span><span>CHARGE (KG)</span><span>FAIT</span></div>${exercise.sets.map((set, index) => `<div class="set-row ${set.completed ? 'set-complete' : ''}"><span class="set-index">0${index + 1}</span><label><span class="sr-only">${exercise.duration ? 'Secondes' : 'Répétitions'} pour la série ${index + 1}</span><input class="set-input" type="number" min="0" step="1" data-set-reps="${index}" value="${Number(set.reps) || 0}" aria-label="${exercise.duration ? 'Secondes' : 'Répétitions'} série ${index + 1}"></label><label><span class="sr-only">Charge en kilogrammes série ${index + 1}</span><input class="set-input" type="number" min="0" step="0.5" data-set-load="${index}" value="${Number(set.load) || 0}" aria-label="Charge en kilogrammes série ${index + 1}"></label><button class="set-check ${set.completed ? 'checked' : ''}" data-action="toggle-set" data-set="${index}" aria-label="${set.completed ? 'Dévalider' : 'Valider'} la série ${index + 1}">${set.completed ? icon('check') : ''}</button></div>`).join('')}</div><label class="field-label">Note sur cet exercice<textarea class="exercise-note-input" rows="2" placeholder="Comment tu t’es senti ? Une charge à noter ?">${h(exercise.note || '')}</textarea></label><label class="field-label">Commentaire pour la séance<textarea class="workout-note-input" rows="2" placeholder="Un mot pour garder une trace de cette séance…">${h(draft.note || '')}</textarea></label></div>
      <div class="training-footer"><button class="button button-secondary" data-action="previous-exercise" ${draft.currentExerciseIndex === 0 ? 'disabled' : ''}>← Précédent</button>${draft.currentExerciseIndex < draft.exercises.length - 1 ? `<button class="button button-primary" data-action="next-exercise">Exercice suivant ${icon('arrow')}</button>` : `<button class="button button-primary" data-action="finish-workout">Terminer la séance ${icon('check')}</button>`}</div></div><aside class="training-aside"><div class="panel session-outline"><div class="panel-heading"><div><span class="section-kicker">SÉANCE ${draft.type}</span><h3>En un coup d’œil</h3></div><span class="outline-count">${draft.exercises.length}</span></div>${draft.exercises.map((item, index) => `<button class="outline-item ${index === draft.currentExerciseIndex ? 'current' : ''} ${item.sets.every(set => set.completed) ? 'done' : ''}" data-action="jump-exercise" data-index="${index}"><span class="outline-dot">${item.sets.every(set => set.completed) ? '✓' : `0${index + 1}`}</span><span><b>${h(item.name)}</b><small>${item.sets.filter(set => set.completed).length}/${item.sets.length} séries</small></span></button>`).join('')}</div><div class="panel timer-panel"><span class="section-kicker">RÉCUPÉRATION</span><h3>Prends ton temps.</h3><div class="timer-display" id="rest-clock">${formatClock(remainingSeconds(restTimer))}</div><label class="field-label timer-duration-field">Durée du repos<select id="active-rest-duration">${restOptions.map(seconds => `<option value="${seconds}" ${restTimer.durationSeconds === seconds ? 'selected' : ''}>${formatDuration(seconds)}</option>`).join('')}</select></label><div class="timer-actions"><button class="button button-secondary button-small" data-action="timer-toggle">${icon(restTimer.status === 'running' ? 'pause' : 'play')} ${restTimer.status === 'running' ? 'Pause' : restTimer.status === 'finished' ? 'Relancer' : 'Démarrer'}</button><button class="button button-ghost button-small" data-action="timer-reset">Réinitialiser</button></div><label class="timer-sound-toggle"><input id="active-sound-enabled" type="checkbox" ${data.preferences.soundEnabled ? 'checked' : ''}/> Son à la fin</label><small class="muted" aria-live="polite">${restTimer.status === 'finished' ? 'Repos terminé. Reprends quand tu es prêt·e.' : 'Le compte à rebours continue quand tu changes de page.'}</small></div><div class="safety-note"><span>✳</span><p>Arrête si tu ressens une douleur. Tu pourras toujours reprendre plus tard.</p></div></aside></div>${draft.paused ? `<div class="paused-overlay"><div><span>Ⅱ</span><h2>Séance en pause</h2><p>Ta progression est enregistrée sur cet appareil.</p><button class="button button-primary" data-action="pause-workout">${icon('play')} Reprendre</button></div></div>` : ''}`;
}

function progressPage() {
  const pushPoints = performancePoints(data.sessions, 'pushups', range);
  // Charge maximale réellement saisie par séance pour le rowing.
  const rowLoads = data.sessions.filter(session => new Date(session.completedAt) >= Date.now() - (range === 'week' ? 7 : range === 'year' ? 365 : 30) * 86400000).flatMap(session => {
    const sets = session.exercises.filter(exercise => exercise.exerciseId === 'backpack-row').flatMap(exercise => exercise.sets).filter(set => set.completed);
    return sets.length ? [{ date: new Date(session.completedAt), value: Math.max(...sets.map(set => Number(set.load) || 0)) }] : [];
  }).sort((a, b) => a.date - b.date);
  const plankPoints = data.sessions.filter(session => new Date(session.completedAt) >= Date.now() - (range === 'week' ? 7 : range === 'year' ? 365 : 30) * 86400000).flatMap(session => session.exercises.filter(exercise => exercise.exerciseId === 'plank').flatMap(exercise => exercise.sets.filter(set => set.completed).map(set => ({ date: new Date(session.completedAt), value: Number(set.reps) || 0 })))).sort((a, b) => a.date - b.date);
  const weeks = weeklyPoints(data.sessions, range);
  const rangeLabel = range === 'week' ? '7 jours' : range === 'year' ? '12 mois' : '30 jours';
  return `<section class="progress-summary"><div><span class="section-kicker">DONNÉES RÉELLES · ${rangeLabel.toUpperCase()}</span><h2>Les progrès se voient<br><em>dans la constance.</em></h2><p>Chaque point vient d’une séance que tu as enregistrée. Rien n’est prérempli.</p></div><div class="period-switch">${[['week', 'Semaine'], ['month', 'Mois'], ['year', 'Année']].map(([id, label]) => `<button class="${range === id ? 'selected' : ''}" data-action="range" data-range="${id}">${label}</button>`).join('')}</div></section><section class="progress-kpis"><div><small>SÉANCES AU TOTAL</small><strong>${data.sessions.length}</strong></div><div><small>OBJECTIF HEBDOMADAIRE</small><strong>${data.goals.weeklyTarget}<span> / sem.</span></strong></div><div><small>DERNIÈRE SÉANCE</small><strong class="kpi-date">${data.sessions.length ? formatDate([...data.sessions].sort((a,b) => Date.parse(b.completedAt)-Date.parse(a.completedAt))[0].completedAt, { day: 'numeric', month: 'short' }) : '—'}</strong></div></section><section class="charts-grid"><article class="panel chart-card chart-wide"><div class="chart-heading"><div><span class="section-kicker">FORCE & RÉPÉTITIONS</span><h3>Pompes cumulées par séance</h3><small>Répétitions réellement validées · total par séance</small></div><span class="chart-mark">↗</span></div>${lineChart(pushPoints, 'Évolution des pompes cumulées par séance', ' rép.')}</article><article class="panel chart-card"><div class="chart-heading"><div><span class="section-kicker">TIRAGE</span><h3>Charge au rowing</h3><small>Charge maximale saisie par séance</small></div><span class="chart-mark">↗</span></div>${lineChart(rowLoads, 'Évolution de la charge au rowing', ' kg')}</article><article class="panel chart-card"><div class="chart-heading"><div><span class="section-kicker">GAINAGE</span><h3>Durée du gainage</h3><small>Secondes par série</small></div><span class="chart-mark">◷</span></div>${lineChart(plankPoints, 'Durée du gainage', ' s')}</article><article class="panel chart-card chart-wide"><div class="chart-heading"><div><span class="section-kicker">RÉGULARITÉ</span><h3>${range === 'week' ? 'Séances par jour' : range === 'year' ? 'Séances par mois' : 'Séances par semaine'}</h3><small>${range === 'week' ? 'Nombre de séances sur les 7 derniers jours' : range === 'year' ? 'Repère mensuel indicatif' : `Objectif hebdomadaire : ${data.goals.weeklyTarget} séances`}</small></div><span class="chart-mark">▥</span></div>${barChart(weeks, range === 'year' ? Math.round(data.goals.weeklyTarget * 52 / 12) : range === 'week' ? 0 : data.goals.weeklyTarget)}<div class="chart-legend"><span><i></i> Séances terminées</span>${range !== 'week' ? `<span><b></b> Repère ${range === 'year' ? 'mensuel' : 'hebdomadaire'}</span>` : ''}</div></article></section>`;
}

function calendarMarkup() {
  const year = calendarCursor.getFullYear(), month = calendarCursor.getMonth();
  const first = new Date(year, month, 1), offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const workoutCounts = new Map();
  data.sessions.forEach(session => { const key = dayKey(session.completedAt); workoutCounts.set(key, (workoutCounts.get(key) || 0) + 1); });
  const blanks = Array.from({ length: offset }, () => '<span class="calendar-blank"></span>').join('');
  const cells = Array.from({ length: days }, (_, index) => {
    const day = index + 1, date = new Date(year, month, day, 12), key = dayKey(date);
    const today = key === dayKey(new Date()), count = workoutCounts.get(key) || 0;
    const label = `${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${count ? `${count} séance(s)` : 'aucune séance'}`;
    return `<button class="calendar-day ${count ? 'has-workout' : 'no-workout'} ${today ? 'is-today' : ''} ${calendarSelectedDate === key ? 'is-selected' : ''}" ${count ? `data-action="calendar-day" data-date="${key}"` : 'disabled'} aria-label="${h(label)}" ${count ? `title="${h(label)}"` : ''}>${day}${count ? `<span class="calendar-count">${count > 1 ? count : '•'}</span>` : ''}</button>`;
  }).join('');
  const monthTotal = data.sessions.filter(session => { const date = new Date(session.completedAt); return date.getMonth() === month && date.getFullYear() === year; }).length;
  const monthValue = `${year}-${String(month + 1).padStart(2, '0')}`;
  return `<div class="calendar-top"><div class="calendar-heading"><h3>${formatDate(first, { month: 'long', year: 'numeric' })}</h3><label class="calendar-jump"><span>Aller à un mois</span><input type="month" id="history-month-picker" value="${monthValue}" aria-label="Choisir un mois"></label></div><div class="calendar-controls"><button class="button button-small button-secondary calendar-today" data-action="calendar-today">Aujourd’hui</button><div class="calendar-arrows"><button class="calendar-arrow" data-action="calendar-month" data-delta="-1" aria-label="Mois précédent">‹</button><button class="calendar-arrow" data-action="calendar-month" data-delta="1" aria-label="Mois suivant">›</button></div></div></div><div class="calendar-weekdays">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${blanks}${cells}</div><div class="calendar-legend"><span><i></i> Jour avec séance</span><span>${monthTotal} séance(s) ce mois</span></div>`;
}

function historyPage() {
  const sessions = [...data.sessions].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  const visibleSessions = calendarSelectedDate ? sessions.filter(session => dayKey(session.completedAt) === calendarSelectedDate) : sessions;
  const selectedDate = calendarSelectedDate ? new Date(`${calendarSelectedDate}T12:00:00`) : null;
  const listTitle = selectedDate ? `Séances du ${formatDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Tes séances';
  const sessionCards = visibleSessions.map(session => `<button class="history-item" data-action="open-session" data-id="${h(session.id)}" aria-label="Ouvrir la séance ${h(session.type)} du ${h(formatDate(session.completedAt))}"><span class="history-date-badge"><b>${new Date(session.completedAt).getDate()}</b><small>${formatDate(session.completedAt, { month: 'short' })}</small></span><span class="history-item-main"><span class="history-line"><b>Séance ${h(session.type)}</b><span class="type-pill type-${h(session.type).toLowerCase()}">${h(session.type)}</span></span><small>${session.exercises.length} exercices · ${formatDuration(session.durationSeconds)} · ${session.exercises.reduce((sum, ex) => sum + ex.sets.filter(set => set.completed).length, 0)} séries</small><span class="history-exercises">${session.exercises.map(exercise => h(exercise.name)).join(' · ')}</span></span><span class="row-chevron">›</span></button>`).join('');
  const emptyMessage = selectedDate
    ? `<div class="empty-state compact-empty"><span>▦</span><h3>Aucune séance ce jour-là.</h3><button class="button button-secondary" data-action="clear-calendar-filter">Voir tout l’historique</button></div>`
    : `<div class="empty-state compact-empty"><span>▦</span><h3>Ton historique commence ici.</h3><p>Une séance terminée apparaîtra dans ce journal.</p><button class="button button-primary" data-action="start-workout" data-type="${nextType()}">Commencer la séance ${nextType()}</button></div>`;
  return `<section class="history-summary"><div><span class="section-kicker">TON PARCOURS</span><h2>Chaque séance<br><em>compte.</em></h2><p>Retrouve tes entraînements et tes notes personnelles.</p></div><div class="history-total"><strong>${sessions.length}</strong><span>${sessions.length === 1 ? 'séance enregistrée' : 'séances enregistrées'}</span></div></section><div class="history-layout"><section class="panel calendar-panel">${calendarMarkup()}</section><section class="history-list"><div class="section-header"><div><span class="section-kicker">${selectedDate ? 'JOUR SÉLECTIONNÉ' : 'RÉCENTES'}</span><h3>${h(listTitle)}</h3></div><div class="history-list-actions">${selectedDate ? '<button class="button button-small button-ghost" data-action="clear-calendar-filter">Tout voir</button>' : ''}<button class="button button-small button-secondary" data-action="export">Exporter</button></div></div><p class="history-filter-count">${visibleSessions.length} séance${visibleSessions.length === 1 ? '' : 's'} affichée${visibleSessions.length === 1 ? '' : 's'}</p>${visibleSessions.length ? sessionCards : emptyMessage}</section></div>`;
}

function journalPage() {
  const linkedSession = data.sessions.find(session => session.id === journalSessionId);
  const linkedEntry = linkedSession ? data.journalEntries.find(entry => entry.sessionId === linkedSession.id) : null;
  const editingEntry = editingJournalId ? data.journalEntries.find(entry => entry.id === editingJournalId) : null;
  const currentEntry = editingEntry || linkedEntry || null;
  const currentSession = linkedSession || data.sessions.find(session => session.id === currentEntry?.sessionId);
  const editing = Boolean(currentEntry);
  const entries = [...data.journalEntries].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const selectField = (name, label, options) => `<label class="field-label">${label}<select name="${name}"><option value="" ${currentEntry?.[name] ? '' : 'selected'}>Choisir…</option>${options.map(option => `<option value="${h(option)}" ${currentEntry?.[name] === option ? 'selected' : ''}>${h(option)}</option>`).join('')}</select></label>`;
  const formMarkup = `<form class="panel journal-form ${editing ? 'journal-editing' : ''}" data-form="journal" data-entry-id="${h(currentEntry?.id || '')}"><div class="panel-heading"><div><span class="section-kicker">${editing ? 'MODIFIER LE RESSENTI' : 'NOUVELLE NOTE'}</span><h3>${editing ? 'Mettre à jour cette note' : 'Comment tu te sens aujourd’hui ?'}</h3></div><span class="journal-spark">✳</span></div><div class="journal-fields">${selectField('difficulty', 'Difficulté ressentie', ['Très facile', 'Facile', 'Modérée', 'Difficile', 'Très difficile'])}${selectField('energy', 'Niveau d’énergie', ['Bas', 'Correct', 'Bon', 'Excellent'])}${selectField('mood', 'Ressenti général', ['Motivé·e', 'Serein·e', 'Fatigué·e', 'Fier·e', 'Mitigé·e'])}<label class="field-label">Douleur ou gêne éventuelle<input name="pain" placeholder="Aucune, ou décris la gêne" value="${h(currentEntry?.pain || '')}" /></label><label class="field-label field-full">Mes observations<textarea name="notes" rows="3" placeholder="Ce qui a bien marché, ce que tu veux retenir…">${h(currentEntry?.notes || '')}</textarea></label><label class="field-label field-full">Mon intention pour la prochaine séance<textarea name="nextGoal" rows="2" placeholder="Un objectif simple et réaliste…">${h(currentEntry?.nextGoal || '')}</textarea></label></div><div class="form-footer"><small>Enregistré uniquement dans ce navigateur.</small><div class="journal-form-actions">${editing ? '<button type="button" class="button button-ghost" data-action="cancel-journal-edit">Annuler</button>' : ''}<button class="button button-primary">${editing ? 'Enregistrer les modifications' : `Enregistrer cette note ${icon('arrow')}`}</button></div></div></form>`;
  const entriesMarkup = entries.length ? entries.map(entry => `<article class="journal-entry"><div class="journal-entry-date"><b>${formatDate(entry.date, { day: 'numeric' })}</b><span>${formatDate(entry.date, { month: 'short', year: 'numeric' })}</span></div><div class="journal-entry-body"><div class="journal-badges">${entry.sessionType ? `<span>Séance ${h(entry.sessionType)}</span>` : ''}${entry.difficulty ? `<span>Effort : ${h(entry.difficulty)}</span>` : ''}${entry.energy ? `<span>Énergie : ${h(entry.energy)}</span>` : ''}${entry.mood ? `<span>${h(entry.mood)}</span>` : ''}</div>${entry.pain ? `<p class="pain-note">Gêne : ${h(entry.pain)}</p>` : ''}<p>${h(entry.notes || 'Aucune observation ajoutée.')}</p>${entry.nextGoal ? `<small>À suivre · ${h(entry.nextGoal)}</small>` : ''}<button type="button" class="button button-small button-secondary journal-edit-button" data-action="edit-journal" data-id="${h(entry.id)}">Modifier le ressenti</button></div></article>`).join('') : `<div class="empty-state compact-empty"><span>✎</span><h3>Fais une première note.</h3><p>Quelques mots suffisent pour mieux écouter ton corps.</p></div>`;
  const linkedNote = currentSession ? `<p class="journal-link-note">Cette note est associée à la séance ${h(currentSession.type)} du ${h(formatDate(currentSession.completedAt, { day: 'numeric', month: 'long' }))}.</p>` : '';
  return `<section class="page-intro journal-intro"><div><span class="section-kicker">ÉCOUTE & RÉCUPÉRATION</span><h2>Note ce que tu<br><em>ressens.</em></h2><p>Ton énergie, ton effort, tes observations et la suite que tu souhaites donner à ton entraînement.</p></div><div class="journal-icon-large">✎<small>TON JOURNAL PERSONNEL</small></div></section>${linkedNote}${formMarkup}<section class="journal-history"><div class="section-header"><div><span class="section-kicker">TES REPÈRES</span><h3>Notes précédentes</h3></div><span class="muted">${entries.length} note${entries.length === 1 ? '' : 's'}</span></div>${entriesMarkup}</section>`;
}

function settingsPage() {
  return `<section class="settings-intro"><span class="section-kicker">TON ESPACE, TES CHOIX</span><h2>Des réglages<br><em>tout simples.</em></h2><p>Cadence fonctionne sans compte, sans serveur et sans envoyer tes performances ailleurs.</p></section><div class="settings-layout"><div class="settings-main"><section class="panel settings-card"><div class="settings-icon">◉</div><div class="settings-card-content"><span class="section-kicker">OBJECTIF HEBDOMADAIRE</span><h3>Choisis un rythme réaliste</h3><p>Le programme est pensé pour trois séances. Tu peux ajuster le repère selon ton emploi du temps.</p><label class="field-label inline-field">Séances par semaine<select id="weekly-target"><option value="2" ${data.goals.weeklyTarget === 2 ? 'selected' : ''}>2 séances</option><option value="3" ${data.goals.weeklyTarget === 3 ? 'selected' : ''}>3 séances</option><option value="4" ${data.goals.weeklyTarget === 4 ? 'selected' : ''}>4 séances</option></select></label></div></section><section class="panel settings-card"><div class="settings-icon">☼</div><div class="settings-card-content"><span class="section-kicker">APPARENCE</span><h3>Un thème qui te convient</h3><p>Choisis l’apparence de ton espace. Le réglage est gardé sur cet appareil.</p><div class="theme-options"><button class="theme-option ${data.preferences.theme === 'dark' ? 'selected' : ''}" data-action="set-theme" data-theme="dark"><span>◐</span><b>Sombre</b></button><button class="theme-option ${data.preferences.theme === 'light' ? 'selected' : ''}" data-action="set-theme" data-theme="light"><span>☼</span><b>Clair</b></button></div></div></section><section class="panel settings-card data-settings"><div class="settings-icon data-icon">⇄</div><div class="settings-card-content"><span class="section-kicker">GESTION DES DONNÉES</span><h3>Une copie que tu contrôles.</h3><p>Exporte ou restaure l’ensemble de ton historique, tes séances, tes notes, objectifs et préférences. Rien ne quitte ton appareil.</p><div class="data-actions"><button class="button button-primary" data-action="export">↓ Exporter mes données</button><button class="button button-secondary" data-action="choose-import">↑ Importer une sauvegarde</button><input id="backup-file" type="file" accept="application/json,.json" hidden /><span id="import-status" class="import-status" aria-live="polite"></span></div><div class="data-footnote"><span>i</span> Une restauration valide remplacera les données présentes. Une confirmation sera demandée avant toute modification.</div></div></section><section class="panel settings-card"><div class="settings-icon">⌂</div><div class="settings-card-content"><span class="section-kicker">STOCKAGE PRIVÉ</span><h3>Conservé dans ce navigateur.</h3><p>Les entraînements sont enregistrés automatiquement dans le stockage local de l’appareil. Effacer les données du navigateur les supprimera.</p><div class="storage-details"><span>Format des données <b>Cadence v1</b></span><span>Historique actuel <b>${data.sessions.length} séance(s) · ${data.journalEntries.length} note(s)</b></span></div></div></section></div><aside class="settings-aside"><div class="privacy-illustration"><div class="privacy-lock">⌑</div><span>TES DONNÉES</span><strong>Restent<br>les tiennes.</strong><p>Aucun compte. Aucun serveur. Aucun suivi publicitaire.</p></div><div class="safety-note"><span>✳</span><p>Les recommandations restent prudentes. Ne poursuis pas un mouvement si tu ressens une douleur.</p></div></aside></div>`;
}

function settingsPageV2() {
  const timerPanel = `<section class="panel settings-card"><div class="settings-icon">◷</div><div class="settings-card-content"><span class="section-kicker">MINUTEUR DE REPOS</span><h3>Un réglage à ta mesure</h3><p>La durée choisie sert de valeur par défaut et est enregistrée avec la séance en cours.</p><label class="field-label inline-field">Repos par défaut<select id="default-rest-duration">${[30,45,60,75,90,120,150,180,240,300].map(seconds => `<option value="${seconds}" ${data.preferences.restSeconds === seconds ? 'selected' : ''}>${formatDuration(seconds)}</option>`).join('')}</select></label><label class="timer-sound-toggle"><input id="default-sound-enabled" type="checkbox" ${data.preferences.soundEnabled ? 'checked' : ''}/> Son de rappel à la fin</label></div></section>`;
  return settingsPage().replace('<section class="panel settings-card data-settings">', `${timerPanel}<section class="panel settings-card data-settings">`).replace('Cadence v1', 'Cadence v2');
}

function render() {
  clearInterval(timerInterval); timerInterval = null;
  clearInterval(routineTimerInterval); routineTimerInterval = null;
  const pages = { home: homePageV2, program: programPage, exercises: libraryPage, progress: progressPage, muscles: musclesPage, records: recordsPage, recovery: recoveryLibraryPage, warmup: warmupPage, cooldown: cooldownPage, history: historyPage, journal: journalPage, settings: settingsPageV2, training: trainingPage };
  app.innerHTML = shell((pages[page] || homePage)());
  if (data.activeWorkout?.restTimer?.status === 'running') {
    timerInterval = setInterval(() => {
      const current = data.activeWorkout?.restTimer;
      if (!current || current.status !== 'running') { clearInterval(timerInterval); return; }
      const nextTimer = tickTimer(current);
      if (nextTimer.status === 'finished') {
        data = { ...data, activeWorkout: { ...data.activeWorkout, restTimer: nextTimer } };
        persist(); clearInterval(timerInterval); timerInterval = null;
        if (data.preferences.soundEnabled) playRestSound();
        const message = document.querySelector('.timer-panel .muted');
        if (message) message.textContent = 'Repos terminé. Reprends quand tu es prêt·e.';
        showToast('Temps de repos terminé. Reprends quand tu te sens prêt·e.');
      } else {
        const clock = document.querySelector('#rest-clock');
        const dock = document.querySelector('#rest-dock-clock');
        if (clock) clock.textContent = formatClock(nextTimer.remainingSeconds);
        if (dock) dock.textContent = formatClock(nextTimer.remainingSeconds);
      }
    }, 250);
  }
  if (routineTimer.status === 'running') {
    routineTimerInterval = setInterval(() => {
      routineTimer = tickTimer(routineTimer);
      const clock = document.querySelector('#routine-clock');
      if (clock) clock.textContent = formatClock(remainingSeconds(routineTimer));
      if (routineTimer.status === 'finished') { clearInterval(routineTimerInterval); routineTimerInterval = null; render(); showToast('Temps indicatif terminé. Passe à la suite quand tu es prêt·e.'); }
    }, 250);
  }
}

function playRestSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660; gain.gain.value = 0.06;
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.22);
    oscillator.onended = () => context.close();
  } catch (error) { /* Le rappel visuel reste disponible si l’audio est bloqué. */ }
}

function startWorkout(type) {
  if (data.activeWorkout) { page = data.activeWorkout.phase === 'warmup' ? 'warmup' : 'training'; render(); return; }
  const exercisesForWorkout = (workouts[type] || workouts.A).map(exerciseId => {
    const dose = workoutDose(exerciseId);
    const recommendation = recommendExercise(data.sessions, data.journalEntries, exerciseId, { targetReps: dose.reps });
    return { exerciseId, name: getExercise(exerciseId).name, duration: Boolean(dose.duration), repsPerSide: Boolean(dose.perSide), restSeconds: data.preferences.restSeconds, recommendedRestSeconds: dose.restSeconds, recommendation, note: '', sets: Array.from({ length: 2 }, () => ({ reps: dose.reps, load: dose.load || 0, completed: false })) };
  });
  data = { ...data, activeWorkout: { id: uid(), type, phase: 'warmup', warmupStep: 0, startedAt: new Date().toISOString(), currentExerciseIndex: 0, paused: false, pausedSeconds: 0, pauseStartedAt: null, restTimer: createRestTimer(data.preferences.restSeconds), exercises: exercisesForWorkout, note: '' } };
  routineTimer = createRestTimer(60);
  finishReviewOpen = false;
  if (persist()) { page = 'warmup'; render(); }
}

function finishWorkout() {
  const draft = data.activeWorkout;
  if (!draft) return;
  if (!draft.exercises.some(exercise => exercise.sets.some(set => set.completed === true))) { showToast('Valide au moins une série avant de terminer ta séance.', 'error'); return; }
  finishReviewOpen = true;
  render();
}

function commitWorkout() {
  const draft = data.activeWorkout;
  if (!draft) return;
  const completedAt = new Date().toISOString();
  const durationSeconds = Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(draft.startedAt)) / 1000) - (draft.pausedSeconds || 0));
  const session = { ...structuredClone(draft), completedAt, durationSeconds, paused: undefined };
  delete session.currentExerciseIndex;
  delete session.startedAt;
  delete session.phase; delete session.warmupStep; delete session.restTimer; delete session.pausedSeconds; delete session.pauseStartedAt;
  cooldownHighlights = recordsBeaten(session, data.sessions);
  data = { ...data, sessions: [...data.sessions, session], activeWorkout: null };
  finishReviewOpen = false;
  routineTimer = createRestTimer(60);
  if (persist()) { selectedSession = null; cooldownSessionId = session.id; journalSessionId = null; recoveryStep = 0; page = 'cooldown'; render(); showToast('Séance enregistrée. Beau travail, la régularité se construit !'); }
}

function cancelWorkout() {
  if (!data.activeWorkout || !confirm('Annuler cette séance ? La séance en cours sera supprimée et ne sera pas ajoutée à l’historique.')) return;
  data = { ...data, activeWorkout: null };
  if (persist()) { page = 'home'; render(); showToast('Séance annulée.'); }
}

function exportBackup() {
  try {
    const backup = makeBackup(data);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `sauvegarde-musculation-${dayKey(new Date())}.json`;
    document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Sauvegarde téléchargée sur ton appareil.');
  } catch (error) { showToast(`Export impossible : ${error.message}`, 'error'); }
}

async function importBackup(file) {
  const status = document.querySelector('#import-status');
  const setStatus = (message, isError = false) => { if (status) { status.textContent = message; status.className = `import-status ${isError ? 'status-error' : 'status-success'}`; } };
  if (!file) return;
  try {
    const text = await file.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new Error('Le fichier ne contient pas de JSON lisible.'); }
    const incoming = validateBackup(parsed);
    const dateText = formatDate(parsed.exportedAt, { day: 'numeric', month: 'long', year: 'numeric' });
    const confirmed = confirm(`Restaurer la sauvegarde du ${dateText} ?\n\nCette restauration remplacera toutes les données actuellement présentes (${data.sessions.length} séance(s), ${data.journalEntries.length} note(s)). Une copie de l’état actuel est conservée le temps de l’opération.`);
    if (!confirmed) { setStatus('Import annulé. Tes données n’ont pas changé.'); return; }
    const restored = restoreDataSafely(incoming);
    data = { ...emptyData(), ...restored, goals: { ...emptyData().goals, ...restored.goals }, preferences: { ...emptyData().preferences, ...restored.preferences } };
    selectedSession = null; editingSessionId = null; editingJournalId = null; journalSessionId = null; page = 'home';
    render();
    showToast('Restauration réussie. Toutes les données ont été restaurées.');
  } catch (error) { setStatus(error.message, true); showToast(error.message, 'error'); }
  finally { const input = document.querySelector('#backup-file'); if (input) input.value = ''; }
}

function saveJournal(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const existing = data.journalEntries.find(item => item.id === form.dataset.entryId) || null;
  const linkedSession = data.sessions.find(session => session.id === (existing?.sessionId || journalSessionId));
  const entry = { id: existing?.id || uid(), date: existing?.date || new Date().toISOString(), sessionId: linkedSession?.id || existing?.sessionId || '', sessionType: linkedSession?.type || existing?.sessionType || '', ...values };
  const existingIndex = existing ? data.journalEntries.findIndex(item => item.id === existing.id) : -1;
  const journalEntries = existingIndex >= 0 ? data.journalEntries.map((item, index) => index === existingIndex ? entry : item) : [...data.journalEntries, entry];
  data = { ...data, journalEntries };
  if (persist()) { journalSessionId = null; editingJournalId = null; render(); showToast(existing ? 'Ton ressenti a été mis à jour.' : 'Ta note a été enregistrée.'); }
}

function saveEditedSession(form) {
  const current = data.sessions.find(session => session.id === form.dataset.id);
  if (!current) return;
  const fields = new FormData(form);
  const completedAt = new Date(String(fields.get('completedAt') || ''));
  const durationSeconds = Number(fields.get('durationSeconds'));
  const type = String(fields.get('type') || '');
  if (Number.isNaN(completedAt.getTime()) || !['A', 'B'].includes(type) || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    showToast('Vérifie la date, le type et la durée de la séance.', 'error');
    return;
  }
  let exercises;
  try {
    exercises = current.exercises.map((exercise, exerciseIndex) => ({
      ...exercise,
      sets: exercise.sets.map((set, setIndex) => {
        const reps = Number(fields.get(`reps-${exerciseIndex}-${setIndex}`));
        const load = Number(fields.get(`load-${exerciseIndex}-${setIndex}`) || 0);
        if (!Number.isFinite(reps) || reps < 0 || !Number.isFinite(load) || load < 0) throw new Error('Les répétitions et les charges doivent être des nombres positifs.');
        return { ...set, reps, load, completed: fields.has(`completed-${exerciseIndex}-${setIndex}`) };
      })
    }));
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }
  const updated = { ...current, type, completedAt: completedAt.toISOString(), durationSeconds: Math.round(durationSeconds), note: String(fields.get('note') || '').trim(), exercises };
  const nextData = {
    ...data,
    sessions: data.sessions.map(session => session.id === current.id ? updated : session),
    journalEntries: data.journalEntries.map(entry => entry.sessionId === current.id ? { ...entry, date: updated.completedAt, sessionType: type } : entry)
  };
  if (persist(nextData)) {
    editingSessionId = null;
    if (page === 'history') { calendarCursor = new Date(updated.completedAt); calendarSelectedDate = dayKey(updated.completedAt); }
    render();
    showToast('La séance a été mise à jour.');
  }
}

function deleteSession(sessionId) {
  const session = data.sessions.find(item => item.id === sessionId);
  if (!session) return;
  const linkedJournal = data.journalEntries.some(entry => entry.sessionId === sessionId);
  const detail = linkedJournal ? '\n\nLa note de ressenti associée restera dans ton journal, sans lien avec cette séance.' : '';
  if (!confirm(`Supprimer la séance ${session.type} du ${formatDate(session.completedAt)} ?${detail}`)) return;
  const journalEntries = data.journalEntries.map(entry => {
    if (entry.sessionId !== sessionId) return entry;
    const { sessionId: removedSessionId, ...keptEntry } = entry;
    return { ...keptEntry, sessionType: '' };
  });
  if (persist({ ...data, sessions: data.sessions.filter(item => item.id !== sessionId), journalEntries })) {
    selectedSession = null;
    editingSessionId = null;
    render();
    showToast('La séance a été supprimée.');
  }
}

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (['close-modal', 'close-exercise'].includes(action) && event.target !== target && !target.classList.contains('modal-close')) return;
  if (action === 'navigate') { event.preventDefault(); page = target.dataset.page; selectedSession = null; editingSessionId = null; editingJournalId = null; journalSessionId = null; selectedExercise = null; finishReviewOpen = false; document.body.classList.remove('exercise-detail-modal-open'); window.scrollTo({ top: 0, behavior: 'instant' }); render(); }
  if (action === 'start-workout') startWorkout(target.dataset.type || nextType());
  if (action === 'resume') { page = data.activeWorkout?.phase === 'warmup' ? 'warmup' : 'training'; render(); }
  if (action === 'pause-workout') {
    const draft = { ...data.activeWorkout };
    if (draft.paused) { draft.pausedSeconds = (draft.pausedSeconds || 0) + Math.round((Date.now() - Date.parse(draft.pauseStartedAt)) / 1000); draft.pauseStartedAt = null; draft.paused = false; }
    else { if (draft.restTimer?.status === 'running') draft.restTimer = pauseTimer(draft.restTimer); draft.pauseStartedAt = new Date().toISOString(); draft.paused = true; }
    data = { ...data, activeWorkout: draft }; persist(); page = draft.phase === 'warmup' ? 'warmup' : 'training'; render();
  }
  if (action === 'cancel-workout') cancelWorkout();
  if (action === 'previous-exercise' || action === 'next-exercise' || action === 'jump-exercise') {
    const index = action === 'previous-exercise' ? data.activeWorkout.currentExerciseIndex - 1 : action === 'next-exercise' ? data.activeWorkout.currentExerciseIndex + 1 : Number(target.dataset.index);
    if (index >= 0 && index < data.activeWorkout.exercises.length) { data = { ...data, activeWorkout: { ...data.activeWorkout, currentExerciseIndex: index } }; persist(); render(); }
  }
  if (action === 'toggle-set') {
    const draft = structuredClone(data.activeWorkout), exercise = draft.exercises[draft.currentExerciseIndex], set = exercise.sets[Number(target.dataset.set)];
    set.completed = !set.completed;
    const restSeconds = exercise.restSeconds || data.preferences.restSeconds;
    draft.restTimer = set.completed ? startTimer(createRestTimer(restSeconds)) : resetTimer(draft.restTimer, restSeconds);
    data = { ...data, activeWorkout: draft }; if (persist()) render();
  }
  if (action === 'finish-workout') finishWorkout();
  if (action === 'finish-confirm') commitWorkout();
  if (action === 'timer-toggle') { const draft = structuredClone(data.activeWorkout); const timer = draft.restTimer || createRestTimer(data.preferences.restSeconds); draft.restTimer = timer.status === 'running' ? pauseTimer(timer) : startTimer(timer); data = { ...data, activeWorkout: draft }; if (persist()) render(); }
  if (action === 'timer-reset') { const draft = structuredClone(data.activeWorkout); draft.restTimer = resetTimer(draft.restTimer, draft.exercises[draft.currentExerciseIndex]?.restSeconds || data.preferences.restSeconds); data = { ...data, activeWorkout: draft }; if (persist()) render(); }
  if (action === 'routine-timer-toggle') { routineTimer = routineTimer.status === 'running' ? pauseTimer(routineTimer) : startTimer(routineTimer); render(); }
  if (action === 'routine-timer-reset') { routineTimer = resetTimer(routineTimer, target.dataset.duration || 60); render(); }
  if (action === 'warmup-prev' || action === 'warmup-next') {
    const draft = structuredClone(data.activeWorkout); const steps = warmupRoutine(draft.type); const next = (Number(draft.warmupStep) || 0) + (action === 'warmup-prev' ? -1 : 1);
    if (action === 'warmup-next' && (Number(draft.warmupStep) || 0) >= steps.length - 1) { draft.phase = 'training'; page = 'training'; routineTimer = createRestTimer(60); }
    else { draft.warmupStep = Math.max(0, next); routineTimer = resetTimer(routineTimer, routineDuration(steps[draft.warmupStep])); page = 'warmup'; }
    data = { ...data, activeWorkout: draft }; if (persist()) render();
  }
  if (action === 'skip-warmup') { data = { ...data, activeWorkout: { ...data.activeWorkout, phase: 'training' } }; routineTimer = createRestTimer(60); if (persist()) { page = 'training'; render(); } }
  if (action === 'muscle-range') { muscleRange = target.dataset.range; render(); }
  if (action === 'muscle-view') { muscleView = target.dataset.view; selectedMuscle = muscleGroups.find(group => group.view === muscleView)?.id || selectedMuscle; render(); }
  if (action === 'select-muscle') { selectedMuscle = target.dataset.muscle; render(); }
  if (action === 'exercise-range') { exerciseRange = target.dataset.range; render(); }
  if (action === 'records-select') { recordsExercise = target.dataset.id; render(); }
  if (action === 'recovery-mode') { recoveryMode = target.dataset.mode; recoveryStep = 0; recoveryCategory = 'Tous'; routineTimer = resetTimer(routineTimer, 60); render(); }
  if (action === 'recovery-category') { recoveryCategory = target.dataset.category; recoveryStep = 0; routineTimer = resetTimer(routineTimer, 60); render(); }
  if (action === 'recovery-prev' || action === 'recovery-next') { const steps = recoveryMode === 'warmup' ? warmupSteps : cooldownSteps; const filtered = recoveryCategory === 'Tous' ? steps : steps.filter(step => step[3] === recoveryCategory); const count = filtered.length || 1; recoveryStep = action === 'recovery-prev' ? Math.max(0, recoveryStep - 1) : (recoveryStep + 1) % count; routineTimer = resetTimer(routineTimer, routineDuration(filtered[recoveryStep] || steps[0])); render(); }
  if (action === 'cooldown-prev' || action === 'cooldown-next') { if (action === 'cooldown-prev') { recoveryStep = Math.max(0, recoveryStep - 1); routineTimer = resetTimer(routineTimer, routineDuration(cooldownSteps[recoveryStep])); render(); } else if (recoveryStep < cooldownSteps.length - 1) { recoveryStep += 1; routineTimer = resetTimer(routineTimer, routineDuration(cooldownSteps[recoveryStep])); render(); } else { routineTimer = createRestTimer(60); selectedSession = cooldownSessionId; page = 'history'; render(); } }
  if (action === 'skip-cooldown') { routineTimer = createRestTimer(60); selectedSession = cooldownSessionId; page = 'history'; render(); }
  if (action === 'open-exercise') { selectedExercise = target.dataset.id; document.body.classList.add('exercise-detail-modal-open'); render(); }
  if (action === 'close-exercise' || action === 'close-modal') { selectedSession = null; editingSessionId = null; selectedExercise = null; finishReviewOpen = false; document.body.classList.remove('exercise-detail-modal-open'); render(); }
  if (action === 'category') { libraryCategory = target.dataset.category; render(); }
  if (action === 'range') { range = target.dataset.range; render(); }
  if (action === 'open-session') { selectedSession = target.dataset.id; editingSessionId = null; selectedExercise = null; document.body.classList.remove('exercise-detail-modal-open'); render(); }
  if (action === 'edit-session') { selectedSession = target.dataset.id || selectedSession; editingSessionId = selectedSession; render(); }
  if (action === 'cancel-session-edit') { editingSessionId = null; render(); }
  if (action === 'delete-session') deleteSession(target.dataset.id || selectedSession);
  if (action === 'open-journal-for-session') { journalSessionId = target.dataset.id; editingJournalId = data.journalEntries.find(entry => entry.sessionId === journalSessionId)?.id || null; selectedSession = null; page = 'journal'; window.scrollTo({ top: 0, behavior: 'instant' }); render(); }
  if (action === 'edit-journal') { editingJournalId = target.dataset.id; journalSessionId = null; selectedSession = null; page = 'journal'; window.scrollTo({ top: 0, behavior: 'instant' }); render(); }
  if (action === 'cancel-journal-edit') { editingJournalId = null; journalSessionId = null; render(); }
  if (action === 'calendar-month') { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + Number(target.dataset.delta), 1); calendarSelectedDate = ''; render(); }
  if (action === 'calendar-today') { calendarCursor = new Date(); calendarSelectedDate = ''; render(); }
  if (action === 'clear-calendar-filter') { calendarSelectedDate = ''; render(); }
  if (action === 'calendar-day') { calendarSelectedDate = target.dataset.date; render(); }
  if (action === 'theme') { data = { ...data, preferences: { ...data.preferences, theme: data.preferences.theme === 'dark' ? 'light' : 'dark' } }; persist(); render(); }
  if (action === 'set-theme') { data = { ...data, preferences: { ...data.preferences, theme: target.dataset.theme } }; persist(); render(); }
  if (action === 'export') exportBackup();
  if (action === 'choose-import') document.querySelector('#backup-file')?.click();
});

app.addEventListener('pointerover', event => {
  const point = chartPointFrom(event.target);
  if (point && !(event.relatedTarget instanceof Node && point.contains(event.relatedTarget))) showChartTooltip(point);
});

app.addEventListener('pointerout', event => {
  const point = chartPointFrom(event.target);
  if (!point || (event.relatedTarget instanceof Node && point.contains(event.relatedTarget)) || point.contains(document.activeElement)) return;
  const tooltip = point.closest('.chart-shell')?.querySelector('.chart-tooltip');
  if (tooltip) tooltip.hidden = true;
});

app.addEventListener('focusin', event => {
  const point = chartPointFrom(event.target);
  if (point) showChartTooltip(point);
});

app.addEventListener('focusout', event => {
  const point = chartPointFrom(event.target);
  if (!point || (event.relatedTarget instanceof Node && point.contains(event.relatedTarget))) return;
  const tooltip = point.closest('.chart-shell')?.querySelector('.chart-tooltip');
  if (tooltip) tooltip.hidden = true;
});

app.addEventListener('keydown', event => {
  const muscle = event.target.closest('.muscle-shape[role="button"]');
  if (muscle && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    selectedMuscle = muscle.dataset.muscle;
    render();
  }
});

app.addEventListener('input', event => {
  if (event.target.id === 'library-search') { libraryQuery = event.target.value; const start = event.target.selectionStart; const end = event.target.selectionEnd; render(); const input = document.querySelector('#library-search'); input.focus(); input.setSelectionRange(start, end); return; }
  if (page !== 'training' || !data.activeWorkout) return;
  const draft = structuredClone(data.activeWorkout), exercise = draft.exercises[draft.currentExerciseIndex];
  if (event.target.matches('[data-set-reps]')) exercise.sets[Number(event.target.dataset.setReps)].reps = Math.max(0, Number(event.target.value) || 0);
  else if (event.target.matches('[data-set-load]')) exercise.sets[Number(event.target.dataset.setLoad)].load = Math.max(0, Number(event.target.value) || 0);
  else if (event.target.matches('.exercise-note-input')) exercise.note = event.target.value;
  else if (event.target.matches('.workout-note-input')) draft.note = event.target.value;
  else return;
  data = { ...data, activeWorkout: draft }; persist();
});

app.addEventListener('change', event => {
  if (event.target.id === 'history-month-picker') {
    const [year, month] = event.target.value.split('-').map(Number);
    if (year && month >= 1 && month <= 12) { calendarCursor = new Date(year, month - 1, 1); calendarSelectedDate = ''; render(); }
    return;
  }
  if (event.target.id === 'weekly-target') { data = { ...data, goals: { ...data.goals, weeklyTarget: Number(event.target.value) } }; if (persist()) { render(); showToast('Objectif hebdomadaire mis à jour.'); } }
  if (event.target.id === 'records-exercise') { recordsExercise = event.target.value; render(); }
  if (event.target.id === 'default-rest-duration') { data = { ...data, preferences: { ...data.preferences, restSeconds: clampDuration(event.target.value) } }; if (persist()) { render(); showToast('Durée de repos enregistrée.'); } }
  if (event.target.id === 'active-rest-duration' && data.activeWorkout) {
    const duration = clampDuration(event.target.value);
    const draft = structuredClone(data.activeWorkout);
    draft.exercises[draft.currentExerciseIndex].restSeconds = duration;
    draft.restTimer = resetTimer(draft.restTimer, duration);
    data = { ...data, preferences: { ...data.preferences, restSeconds: duration }, activeWorkout: draft };
    if (persist()) render();
  }
  if (['default-sound-enabled', 'active-sound-enabled'].includes(event.target.id)) {
    data = { ...data, preferences: { ...data.preferences, soundEnabled: event.target.checked } };
    if (persist()) { render(); showToast(event.target.checked ? 'Rappel sonore activé.' : 'Rappel sonore désactivé.'); }
  }
  if (event.target.id === 'backup-file') importBackup(event.target.files?.[0]);
});

app.addEventListener('submit', event => {
  if (event.target.matches('[data-form="journal"]')) { event.preventDefault(); saveJournal(event.target); }
  if (event.target.matches('[data-form="edit-session"]')) { event.preventDefault(); saveEditedSession(event.target); }
});

render();
if (warning) showToast(warning, 'error');
