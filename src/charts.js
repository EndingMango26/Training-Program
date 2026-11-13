const fmtShort = date => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
const fmtLong = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
const fmtMonth = date => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fmtValue = value => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
let chartSequence = 0;

export function performancePoints(sessions, exerciseId, range) {
  const days = range === 'week' ? 7 : range === '90days' ? 90 : range === 'all' ? Infinity : range === 'year' ? 365 : 30;
  const cutoff = days === Infinity ? -Infinity : Date.now() - days * 86400000;
  return sessions.filter(session => Date.parse(session.completedAt) >= cutoff)
    .flatMap(session => (session.exercises || []).filter(exercise => exercise.exerciseId === exerciseId)
      .filter(exercise => exercise.sets.some(set => set.completed === true))
      .map(exercise => ({ date: new Date(session.completedAt), value: exercise.sets.filter(set => set.completed === true).reduce((sum, set) => sum + (Number(set.reps) || 0), 0), label: exercise.name })))
    .sort((a, b) => a.date - b.date);
}

export function weeklyPoints(sessions, range = 'month') {
  const periods = range === 'week' ? 7 : range === 'year' ? 12 : 8;
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (range === 'week') {
    start.setDate(start.getDate() - 6);
    return Array.from({ length: periods }, (_, index) => {
      const day = new Date(start); day.setDate(start.getDate() + index);
      const next = new Date(day); next.setDate(day.getDate() + 1);
      return { date: day, value: sessions.filter(session => { const date = new Date(session.completedAt); return date >= day && date < next; }).length };
    });
  }
  if (range === 'year') {
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - (periods - 1), 1);
    return Array.from({ length: periods }, (_, index) => {
      const monthStart = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
      const next = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      return { date: monthStart, value: sessions.filter(session => { const date = new Date(session.completedAt); return date >= monthStart && date < next; }).length };
    });
  }
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset - (periods - 1) * 7);
  return Array.from({ length: periods }, (_, index) => {
    const weekStart = new Date(start); weekStart.setDate(start.getDate() + index * 7);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
    return { date: weekStart, value: sessions.filter(session => { const date = new Date(session.completedAt); return date >= weekStart && date < weekEnd; }).length };
  });
}

export function lineChart(points, title, unit = '') {
  if (!points.length) return `<div class="empty-chart"><span class="empty-icon">↗</span><strong>Les tendances apparaîtront ici</strong><p>Enregistre une vraie séance pour afficher tes performances.</p></div>`;
  const gradientId = `chartFade${++chartSequence}`;
  const width = 640, height = 220, left = 38, right = 14, top = 20, bottom = 32;
  const values = points.map(point => point.value);
  const min = Math.min(...values), max = Math.max(...values), spread = Math.max(1, max - min);
  const x = index => left + (points.length === 1 ? (width - left - right) / 2 : index * (width - left - right) / (points.length - 1));
  const y = value => top + (height - top - bottom) * (1 - (value - min) / spread);
  const coords = points.map((point, index) => [x(index), y(point.value)]);
  const path = coords.map(([px, py], index) => `${index ? 'L' : 'M'} ${px} ${py}`).join(' ');
  const area = `${path} L ${coords.at(-1)[0]} ${height - bottom} L ${coords[0][0]} ${height - bottom} Z`;
  const ticks = [...new Set([min, Math.round((min + max) / 2), max])];
  const grid = ticks.map(value => `<g><line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" stroke="#2e3a31" stroke-dasharray="3 6"/><text x="${left - 9}" y="${y(value) + 4}" fill="#829083" text-anchor="end" font-size="11">${value}${unit}</text></g>`).join('');
  const labelStep = Math.max(1, Math.ceil((points.length - 1) / 7));
  const labels = points.map((point, index) => index % labelStep === 0 || index === points.length - 1 ? `<text x="${x(index)}" y="${height - 8}" fill="#829083" text-anchor="middle" font-size="10">${fmtShort(point.date)}</text>` : '').join('');
  const dots = coords.map(([px, py], index) => {
    const point = points[index];
    const tooltip = `${fmtLong(point.date)} · ${fmtValue(point.value)}${unit}`;
    return `<g class="chart-point" tabindex="0" role="img" aria-label="${escapeHtml(tooltip)}" data-chart-tooltip="${escapeHtml(tooltip)}"><circle class="chart-marker" cx="${px}" cy="${py}" r="5" fill="#b9ec62" stroke="#18201a" stroke-width="3"/><title>${escapeHtml(tooltip)}</title></g>`;
  }).join('');
  return `<div class="chart-shell"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="${escapeHtml(title)}"><defs><linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#b9ec62" stop-opacity=".20"/><stop offset="100%" stop-color="#b9ec62" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#${gradientId})"/><path d="${path}" fill="none" stroke="#b9ec62" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${dots}${labels}</svg><div class="chart-tooltip" role="status" aria-live="polite" hidden></div></div>`;
}

export function barChart(points, target, period = 'month') {
  if (!points.some(point => point.value > 0)) return `<div class="empty-chart"><span class="empty-icon">▥</span><strong>Ton rythme se dessinera avec le temps</strong><p>Aucune séance enregistrée sur cette période.</p></div>`;
  const width = 640, height = 220, left = 38, bottom = 32, top = 20, right = 14;
  const max = Math.max(target, ...points.map(point => point.value), 1);
  const slot = (width - left - right) / points.length;
  const chartPeriod = points.length === 12 ? 'year' : points.length === 7 ? 'week' : period;
  const bars = points.map((point, index) => {
    const barHeight = (height - top - bottom) * point.value / max;
    const bx = left + index * slot + slot * .24;
    const dateLabel = chartPeriod === 'year' ? fmtMonth(point.date) : chartPeriod === 'week' ? fmtLong(point.date) : `Semaine du ${fmtShort(point.date)}`;
    const tooltip = `${dateLabel} · ${fmtValue(point.value)} séance${point.value === 1 ? '' : 's'}`;
    return `<g class="chart-point chart-bar" tabindex="0" role="img" aria-label="${escapeHtml(tooltip)}" data-chart-tooltip="${escapeHtml(tooltip)}"><rect class="chart-bar-hit-area" x="${left + index * slot}" y="${top}" width="${slot}" height="${height - top - bottom}" aria-hidden="true"/><rect class="chart-marker" x="${bx}" y="${height - bottom - Math.max(2, barHeight)}" width="${slot * .52}" height="${Math.max(2, barHeight)}" rx="5" fill="#b9ec62"/><title>${escapeHtml(tooltip)}</title><text x="${bx + slot * .26}" y="${height - 8}" fill="#829083" text-anchor="middle" font-size="10">${fmtShort(point.date)}</text></g>`;
  }).join('');
  const targetLine = target > 0 ? `<line x1="${left}" y1="${height - bottom - (height - top - bottom) * target / max}" x2="${width - right}" y2="${height - bottom - (height - top - bottom) * target / max}" stroke="#8d9a8e" stroke-dasharray="4 5"/>` : '';
  return `<div class="chart-shell"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="Séances réalisées par période"><text x="${left - 9}" y="${top + 4}" fill="#829083" text-anchor="end" font-size="11">${max}</text>${targetLine}${bars}</svg><div class="chart-tooltip" role="status" aria-live="polite" hidden></div></div>`;
}
