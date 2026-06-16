/* =====================================================================
   Maxim — v0.9 feature views (loaded after app.js).
   Schedule (day timeline) · Timeline (project Gantt) · Diary · You/Stats.
   These define renderSchedule/renderTimeline/renderDiary/renderMe and the
   sheet renderers; the core render() dispatcher calls them.
   ===================================================================== */

/* ============================ SCHEDULE ============================ */
function renderSchedule() {
  const root = $('#v-schedule');
  if (!root) return;

  const sel = state.selDate;
  const today = todayKey();
  const isToday = sel === today;

  const selD = parseIso(sel);
  const dayLabel = `${WD_LONG[selD.getDay()]}, ${MON_SHORT[selD.getMonth()]} ${selD.getDate()}` +
    (isToday ? ' · Today' : (sel === addDaysIso(today, 1) ? ' · Tomorrow' : (sel === addDaysIso(today, -1) ? ' · Yesterday' : '')));

  const weekDays = weekOf(sel);
  const stripHtml = weekDays.map(iso => {
    const d = parseIso(iso);
    const has = blocksOn(iso).length > 0;
    const cls = ['sched-day'];
    if (iso === sel) cls.push('is-sel');
    if (iso === today) cls.push('is-today');
    return `<button class="${cls.join(' ')}" data-day="${iso}" type="button">
      <span class="sched-day-w">${WD_LETTER[d.getDay()]}</span>
      <span class="sched-day-n">${d.getDate()}</span>
      <span class="sched-day-dot${has ? ' on' : ''}"></span>
    </button>`;
  }).join('');

  const items = layoutDay(blocksOn(sel).map(b => Object.assign({}, b)));
  const tlH = minToPx(DAY_END);

  let grid = '';
  for (let m = DAY_START; m <= DAY_END; m += 60) {
    const top = minToPx(m);
    grid += `<div class="sched-hr" style="top:${top}px"></div>`;
    if (m < DAY_END) grid += `<div class="sched-hrlab" style="top:${top}px">${hhmm(m)}</div>`;
  }

  const blocksHtml = items.map(b => blockEl(b)).join('');

  let nowLine = '';
  if (isToday) {
    const nm = nowMin();
    if (nm >= DAY_START && nm <= DAY_END) {
      nowLine = `<div class="sched-now" style="top:${minToPx(nm)}px"><span class="sched-now-dot"></span></div>`;
    }
  }

  const emptyHint = items.length ? '' :
    `<div class="sched-empty empty">Nothing planned.<br><span class="sched-empty-sub">＋ Block or Apply routines.</span></div>`;

  root.innerHTML = `
    <header class="viewhead"><h1>Schedule</h1></header>
    <div class="sched-daynav">
      <button class="sched-arrow" data-nav="-1" type="button" aria-label="Previous day">‹</button>
      <div class="sched-daylabel">${escapeHtml(dayLabel)}</div>
      <button class="sched-arrow" data-nav="1" type="button" aria-label="Next day">›</button>
    </div>
    <div class="sched-strip">${stripHtml}</div>
    <div class="sched-toolbar">
      <button class="sched-tool sched-tool-pri" data-act="add" type="button">＋ Block</button>
      <button class="sched-tool" data-act="routines" type="button">Routines</button>
      <button class="sched-tool" data-act="apply" type="button">Apply routines</button>
    </div>
    <div class="sched-tlwrap">
      <div class="sched-tl" style="height:${tlH}px">
        ${grid}
        ${nowLine}
        ${blocksHtml}
        ${emptyHint}
      </div>
    </div>
  `;

  root.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => { state.selDate = addDaysIso(state.selDate, parseInt(btn.dataset.nav, 10)); renderSchedule(); });
  });
  root.querySelectorAll('[data-day]').forEach(btn => {
    btn.addEventListener('click', () => { state.selDate = btn.dataset.day; renderSchedule(); });
  });
  root.querySelector('[data-act="add"]').addEventListener('click', () => openBlockSheet());
  root.querySelector('[data-act="routines"]').addEventListener('click', () => openRoutines());
  root.querySelector('[data-act="apply"]').addEventListener('click', () => applyRoutinesToDay(state.selDate));

  root.querySelectorAll('.sched-block').forEach(el => {
    const id = el.dataset.id;
    el.addEventListener('click', (e) => { if (e.target.closest('.sched-check')) return; openBlockSheet(id); });
    const chk = el.querySelector('.sched-check');
    if (chk) chk.addEventListener('click', (e) => { e.stopPropagation(); blockCycleStatus(id); });
  });
}

function blockEl(b) {
  const top = minToPx(b.start);
  const h = Math.max(24, minToPx(b.end) - minToPx(b.start));
  const cols = b._cols || 1;
  const col = b._col || 0;
  const gap = 6, railLeft = 40;
  const wPct = 100 / cols;
  const left = `calc(${railLeft}px + ${col * wPct}% - ${railLeft * col / cols}px)`;
  const width = `calc(${wPct}% - ${railLeft / cols}px - ${gap}px)`;
  const cat = CATS[b.cat] || { label: b.cat || '', cls: 'c-life' };
  const status = b.status || 'planned';
  const stCls = status === 'done' ? 'is-done' : status === 'skipped' ? 'is-skipped' : 'is-planned';
  const tight = h < 40 ? ' is-tight' : '';
  let actual = '';
  if (b.actual && b.actual.start != null && b.actual.end != null) {
    const aTop = minToPx(b.actual.start) - top;
    const aH = Math.max(8, minToPx(b.actual.end) - minToPx(b.actual.start));
    actual = `<div class="sched-actual" style="top:${aTop}px;height:${aH}px" title="Actual ${hhmm(b.actual.start)}–${hhmm(b.actual.end)}"></div>`;
  }
  const checkGlyph = status === 'done' ? '✓' : status === 'skipped' ? '–' : '';
  return `<div class="sched-block ${stCls}${tight}" data-id="${b.id}" style="top:${top}px;height:${h}px;left:${left};width:${width}">
    <span class="sched-bar ${cat.cls}"></span>
    ${actual}
    <div class="sched-body">
      <div class="sched-title">${escapeHtml(b.title || 'Untitled')}</div>
      <div class="sched-meta">${hhmm(b.start)}–${hhmm(b.end)} · ${escapeHtml(cat.label)}</div>
    </div>
    <button class="sched-check ${stCls}" type="button" aria-label="Cycle status">${checkGlyph}</button>
  </div>`;
}

function renderBlockSheet(id) {
  const host = $('#blocksheet');
  if (!host) return;
  const editing = id != null;
  const existing = editing ? state.blocks.find(b => b.id === id) : null;
  const seedStart = editing && existing ? existing.start : nextFreeStart(state.selDate);
  const draft = editing && existing
    ? { title: existing.title || '', cat: existing.cat || 'deep', start: existing.start, end: existing.end, status: existing.status || 'planned', aStart: existing.actual ? existing.actual.start : null, aEnd: existing.actual ? existing.actual.end : null }
    : { title: '', cat: 'deep', start: seedStart, end: Math.min(DAY_END, seedStart + 60), status: 'planned', aStart: null, aEnd: null };

  const chips = CAT_KEYS.map(k => { const c = CATS[k] || { label: k, cls: 'c-life' }; return `<button class="bs-chip ${c.cls}${k === draft.cat ? ' is-on' : ''}" data-cat="${k}" type="button">${escapeHtml(c.label)}</button>`; }).join('');
  const seg = ['planned', 'done', 'skipped'].map(s => `<button class="bs-seg-btn${draft.status === s ? ' is-on' : ''}" data-status="${s}" type="button">${s[0].toUpperCase() + s.slice(1)}</button>`).join('');

  host.innerHTML = `
    <div class="sheet bs-sheet" role="dialog" aria-label="${editing ? 'Edit block' : 'New block'}">
      <div class="grip"></div>
      <div class="bs-head"><h2>${editing ? 'Edit block' : 'New block'}</h2><button class="bs-close" data-bs="close" type="button" aria-label="Close">Done</button></div>
      <label class="bs-field"><span class="bs-lab">Title</span><input class="bs-input" id="bs-title" type="text" placeholder="What's the plan?" value="${escapeHtml(draft.title)}" /></label>
      <div class="bs-field"><span class="bs-lab">Category</span><div class="bs-chips">${chips}</div></div>
      <div class="bs-times">
        <label class="bs-field bs-half"><span class="bs-lab">Start</span><input class="bs-input" id="bs-start" type="time" value="${hhmm(draft.start)}" /></label>
        <label class="bs-field bs-half"><span class="bs-lab">End</span><input class="bs-input" id="bs-end" type="time" value="${hhmm(draft.end)}" /></label>
      </div>
      <div class="bs-field"><span class="bs-lab">Status</span><div class="bs-seg">${seg}</div></div>
      <div class="bs-times">
        <label class="bs-field bs-half"><span class="bs-lab">Actual start</span><input class="bs-input" id="bs-astart" type="time" value="${draft.aStart != null ? hhmm(draft.aStart) : ''}" /></label>
        <label class="bs-field bs-half"><span class="bs-lab">Actual end</span><input class="bs-input" id="bs-aend" type="time" value="${draft.aEnd != null ? hhmm(draft.aEnd) : ''}" /></label>
      </div>
      <div class="bs-actions">${editing ? `<button class="bs-btn bs-del del" data-bs="delete" type="button">Delete</button>` : `<span></span>`}<button class="bs-btn bs-save" data-bs="save" type="button">Save</button></div>
    </div>`;

  host.querySelectorAll('[data-cat]').forEach(ch => ch.addEventListener('click', () => { draft.cat = ch.dataset.cat; stash(); renderBlockSheet(id); }));
  host.querySelectorAll('[data-status]').forEach(sg => sg.addEventListener('click', () => { draft.status = sg.dataset.status; stash(); renderBlockSheet(id); }));
  function stash() { const t = $('#bs-title'); if (t) draft.title = t.value; const s = $('#bs-start'); if (s && s.value) draft.start = parseHM(s.value); const e = $('#bs-end'); if (e && e.value) draft.end = parseHM(e.value); const as = $('#bs-astart'); draft.aStart = (as && as.value) ? parseHM(as.value) : null; const ae = $('#bs-aend'); draft.aEnd = (ae && ae.value) ? parseHM(ae.value) : null; }
  function collect() { stash(); let start = draft.start, end = draft.end; if (end <= start) end = Math.min(DAY_END, start + 30); let actual = null; if (draft.aStart != null && draft.aEnd != null) actual = { start: draft.aStart, end: Math.max(draft.aStart + 5, draft.aEnd) }; return { start, end, title: draft.title.trim() || 'Untitled', cat: draft.cat, status: draft.status, actual }; }
  host.querySelector('[data-bs="save"]').addEventListener('click', () => {
    const p = collect();
    if (editing) blockUpdate(id, { title: p.title, cat: p.cat, start: p.start, end: p.end, status: p.status, actual: p.actual });
    else { const newId = blockAdd({ date: state.selDate, start: p.start, end: p.end, title: p.title, cat: p.cat }); if (newId && (p.status !== 'planned' || p.actual)) blockUpdate(newId, { status: p.status, actual: p.actual }); }
    closeOverlay('blocksheet');
  });
  const delBtn = host.querySelector('[data-bs="delete"]');
  if (delBtn) delBtn.addEventListener('click', () => { blockDelete(id); closeOverlay('blocksheet'); });
  host.querySelector('[data-bs="close"]').addEventListener('click', () => closeOverlay('blocksheet'));
}

function renderRoutines() {
  const host = $('#routinesheet');
  if (!host) return;
  const draft = renderRoutines._draft || (renderRoutines._draft = { cat: 'deep', days: [] });
  const list = state.routines.length
    ? state.routines.map(r => { const c = CATS[r.cat] || { label: r.cat, cls: 'c-life' }; const dayStr = ROUTINE_ORDER.map(d => `<span class="rt-d${r.days.includes(d) ? ' on' : ''}">${WD_LETTER[d]}</span>`).join(''); return `<div class="rt-row"><span class="sched-bar ${c.cls} rt-bar"></span><div class="rt-info"><div class="rt-title">${escapeHtml(r.title || 'Untitled')}</div><div class="rt-sub">${hhmm(r.start)}–${hhmm(r.end)} · ${escapeHtml(c.label)}</div><div class="rt-days">${dayStr}</div></div><button class="rt-del del" data-rt-del="${r.id}" type="button" aria-label="Delete routine">✕</button></div>`; }).join('')
    : `<div class="rt-empty empty">No routines yet.</div>`;
  const chips = CAT_KEYS.map(k => { const c = CATS[k] || { label: k, cls: 'c-life' }; return `<button class="rt-chip ${c.cls}${k === draft.cat ? ' is-on' : ''}" data-rt-cat="${k}" type="button">${escapeHtml(c.label)}</button>`; }).join('');
  const dayToggles = ROUTINE_ORDER.map(d => `<button class="rt-toggle${draft.days.includes(d) ? ' is-on' : ''}" data-rt-day="${d}" type="button">${WD_LETTER[d]}</button>`).join('');
  host.innerHTML = `
    <div class="sheet rt-sheet" role="dialog" aria-label="Routines">
      <div class="grip"></div>
      <div class="rt-head"><h2>Routines</h2><button class="rt-close" data-rt="close" type="button" aria-label="Close">Done</button></div>
      <div class="rt-list">${list}</div>
      <div class="rt-add addrow">
        <div class="rt-add-title">New routine</div>
        <input class="rt-input" id="rt-title" type="text" placeholder="Title" />
        <div class="rt-chips">${chips}</div>
        <div class="rt-toggles">${dayToggles}</div>
        <div class="rt-times"><label class="rt-field"><span class="rt-lab">Start</span><input class="rt-input rt-time" id="rt-start" type="time" value="${hhmm(540)}" /></label><label class="rt-field"><span class="rt-lab">End</span><input class="rt-input rt-time" id="rt-end" type="time" value="${hhmm(600)}" /></label></div>
        <button class="rt-btn rt-save" data-rt="save" type="button">Add routine</button>
      </div>
    </div>`;
  host.querySelectorAll('[data-rt-del]').forEach(b => b.addEventListener('click', () => routineDelete(b.dataset.rtDel)));
  host.querySelectorAll('[data-rt-cat]').forEach(ch => ch.addEventListener('click', () => { stashRt(); draft.cat = ch.dataset.rtCat; renderRoutines(); }));
  host.querySelectorAll('[data-rt-day]').forEach(tg => tg.addEventListener('click', () => { stashRt(); const d = parseInt(tg.dataset.rtDay, 10); const i = draft.days.indexOf(d); if (i >= 0) draft.days.splice(i, 1); else draft.days.push(d); renderRoutines(); }));
  function stashRt() { const t = $('#rt-title'); if (t) draft.title = t.value; const s = $('#rt-start'); if (s) draft.start = s.value; const e = $('#rt-end'); if (e) draft.end = e.value; }
  if (draft.title != null) { const t = $('#rt-title'); if (t) t.value = draft.title; }
  if (draft.start != null) { const s = $('#rt-start'); if (s) s.value = draft.start; }
  if (draft.end != null) { const e = $('#rt-end'); if (e) e.value = draft.end; }
  host.querySelector('[data-rt="save"]').addEventListener('click', () => {
    stashRt();
    const title = ($('#rt-title').value || '').trim();
    const startV = $('#rt-start').value, endV = $('#rt-end').value;
    if (!title) { flash('Add a title'); return; }
    if (!draft.days.length) { flash('Pick at least one day'); return; }
    if (!startV || !endV) { flash('Set start and end'); return; }
    let start = parseHM(startV), end = parseHM(endV);
    if (end <= start) end = Math.min(DAY_END, start + 30);
    routineAdd({ title, cat: draft.cat, days: draft.days.slice().sort((a, b) => a - b), start, end });
    renderRoutines._draft = { cat: 'deep', days: [] };
    renderRoutines();
  });
  host.querySelector('[data-rt="close"]').addEventListener('click', () => { renderRoutines._draft = { cat: 'deep', days: [] }; closeOverlay('routinesheet'); });
}

const WD_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WD_LONG = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROUTINE_ORDER = [1, 2, 3, 4, 5, 6, 0];
function parseIso(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function weekOf(iso) { const d = parseIso(iso); const monOffset = (d.getDay() + 6) % 7; const monIso = addDaysIso(iso, -monOffset); const out = []; for (let i = 0; i < 7; i++) out.push(addDaysIso(monIso, i)); return out; }
function nextFreeStart(iso) { const bs = blocksOn(iso); if (bs.length) { const latestEnd = bs.reduce((mx, b) => Math.max(mx, b.end), DAY_START); const snapped = Math.ceil(latestEnd / 60) * 60; if (snapped + 30 <= DAY_END) return snapped; } if (iso === todayKey()) { const snapped = Math.ceil(nowMin() / 60) * 60; if (snapped >= DAY_START && snapped + 30 <= DAY_END) return snapped; } return DAY_START + 180; }

/* ============================ TIMELINE (project Gantt) ============================ */
const LABEL_W = 168;
function renderTimeline() {
  const root = $('#v-timeline');
  const active = (state.projects || []).filter(p => p.status === 'active');
  if (!active.length) {
    root.innerHTML = `<header class="viewhead"><h1>Timeline</h1></header><div class="empty tl-empty"><div class="tl-empty-mark"></div><p>No active projects yet.</p><p class="tl-empty-sub">Start something and watch it stretch across the weeks.</p></div>`;
    return;
  }
  const sorted = active.slice().sort((a, b) => {
    const aA = isAssignment(a), bA = isAssignment(b);
    if (aA !== bA) return aA ? -1 : 1;
    if (aA && bA) return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0;
    const as = a.start || '9999', bs = b.start || '9999';
    return as < bs ? -1 : as > bs ? 1 : 0;
  });
  const today = todayKey();
  const dayDiff = (a, b) => Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000);
  const ONGOING_LOOKBACK = 14;
  let minIso = addDaysIso(today, -7);
  let maxIso = addDaysIso(today, 21);
  active.forEach(p => { const s = p.start || addDaysIso(today, -ONGOING_LOOKBACK); if (s < minIso) minIso = s; const e = p.deadline || today; if (e > maxIso) maxIso = e; });
  const startDow = (new Date(minIso + 'T00:00:00').getDay() + 6) % 7;
  let winStart = addDaysIso(minIso, -startDow);
  const endDow = (new Date(maxIso + 'T00:00:00').getDay() + 6) % 7;
  let winEnd = addDaysIso(maxIso, 6 - endDow);
  let totalDays = dayDiff(winEnd, winStart) + 1;
  const MIN_DAYS = 56;
  if (totalDays < MIN_DAYS) { winEnd = addDaysIso(winStart, MIN_DAYS - 1); totalDays = MIN_DAYS; }
  const PPD = totalDays <= 84 ? 13 : totalDays <= 140 ? 10 : 8;
  const chartW = totalDays * PPD;
  const x = (iso) => dayDiff(iso, winStart) * PPD;
  let gridHtml = '';
  for (let d = 0; d <= totalDays; d += 7) gridHtml += `<div class="tl-week" style="left:${d * PPD}px"></div>`;
  let monthHtml = '';
  { const sd = new Date(winStart + 'T00:00:00'); let cur = new Date(sd.getFullYear(), sd.getMonth(), 1); if (cur < sd) cur = new Date(sd.getFullYear(), sd.getMonth() + 1, 1);
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    monthHtml += `<div class="tl-month-label" style="left:2px">${MONTHS[sd.getMonth()]}</div>`;
    while (true) { const iso = keyOfDate(cur); if (iso > winEnd) break; const left = x(iso); monthHtml += `<div class="tl-month" style="left:${left}px"></div>`; monthHtml += `<div class="tl-month-label" style="left:${left + 5}px">${MONTHS[cur.getMonth()]}</div>`; cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); } }
  const todayX = x(today);
  const todayInRange = today >= winStart && today <= winEnd;
  const rowsHtml = sorted.map(p => {
    const ass = isAssignment(p); const pr = progress(p); const ratio = pr.total ? pr.done / pr.total : 0;
    const sIso = p.start || addDaysIso(today, -ONGOING_LOOKBACK); const eIso = ass ? p.deadline : today;
    const bx = Math.max(0, x(sIso < winStart ? winStart : sIso));
    const ex = Math.min(chartW, x(eIso > winEnd ? winEnd : eIso));
    const barW = Math.max(PPD * 1.2, ex - bx);
    const du = ass ? daysUntil(p.deadline) : null;
    const urgent = ass && du !== null && du <= 2; const overdue = ass && du !== null && du < 0;
    const barCls = ['tl-bar', ass ? 'is-assignment' : 'is-ongoing', urgent ? 'is-urgent' : '', overdue ? 'is-overdue' : ''].filter(Boolean).join(' ');
    const fillPct = Math.round(ratio * 100); const progLabel = pr.total ? `${pr.done}/${pr.total}` : '';
    let flagHtml = '';
    if (ass && p.deadline >= winStart && p.deadline <= winEnd) flagHtml = `<div class="tl-flag ${urgent ? 'is-urgent' : ''}" style="left:${x(p.deadline)}px"><span class="tl-flag-dot"></span><span class="tl-flag-label">${escapeHtml(fmtDeadline(p.deadline))}</span></div>`;
    return `<div class="tl-row" role="button" tabindex="0" data-id="${escapeHtml(String(p.id))}" aria-label="${escapeHtml(p.title || 'Untitled')}">
        <div class="tl-label"><span class="tl-label-dot ${ass ? 'is-assignment' : 'is-ongoing'}"></span><span class="tl-label-text"><span class="tl-title">${escapeHtml(p.title || 'Untitled')}</span>${progLabel ? `<span class="tl-prog">${progLabel}</span>` : ''}</span></div>
        <div class="tl-track"><div class="${barCls}" style="left:${bx}px;width:${barW}px" title="${escapeHtml(p.title || '')}${ass ? ' · ' + escapeHtml(fmtDeadline(p.deadline)) : ' · ongoing'}"><div class="tl-bar-fill" style="width:${fillPct}%"></div>${!ass ? '<div class="tl-bar-open"></div>' : ''}<span class="tl-bar-cap">${progLabel || (ass ? '' : 'ongoing')}</span></div>${flagHtml}</div>
      </div>`;
  }).join('');
  root.innerHTML = `
    <header class="viewhead"><h1>Timeline</h1><div class="tl-legend"><span class="tl-leg"><i class="tl-leg-sw is-assignment"></i>Assignment</span><span class="tl-leg"><i class="tl-leg-sw is-ongoing"></i>Ongoing</span><span class="tl-leg"><i class="tl-leg-sw is-done"></i>Done</span></div></header>
    <div class="tl-wrap"><div class="tl-scroll"><div class="tl-canvas" style="--chart-w:${chartW}px;--ppd:${PPD}px">
      <div class="tl-axis" style="width:${chartW}px">${monthHtml}</div>
      <div class="tl-grid-layer" style="width:${chartW}px">${gridHtml}${monthHtml.replace(/tl-month-label[^]*?<\/div>/g, '')}${todayInRange ? `<div class="tl-today" style="left:${todayX}px"><span class="tl-today-badge">today</span></div>` : ''}</div>
      <div class="tl-rows" style="width:${chartW}px">${rowsHtml}</div>
    </div></div></div>`;
  $$('.tl-row', root).forEach(row => { const open = () => openDetail('project', row.dataset.id); row.addEventListener('click', open); row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); });
  const scroller = $('.tl-scroll', root);
  if (scroller && todayInRange) requestAnimationFrame(() => { const target = todayX - scroller.clientWidth * 0.4 + LABEL_W; scroller.scrollLeft = Math.max(0, target); });
}

/* ============================ DIARY ============================ */
var dcImages = [];
function dyFmtDateTime(at) { var d = new Date(at); if (isNaN(d)) return ''; var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; var h = d.getHours(); var ampm = h >= 12 ? 'PM' : 'AM'; var h12 = h % 12; if (h12 === 0) h12 = 12; var mm = d.getMinutes(); if (mm < 10) mm = '0' + mm; return mon + ' ' + d.getDate() + ' · ' + h12 + ':' + mm + ' ' + ampm; }
function dyFmtTime(at) { var d = new Date(at); if (isNaN(d)) return ''; var h = d.getHours(); var ampm = h >= 12 ? 'PM' : 'AM'; var h12 = h % 12; if (h12 === 0) h12 = 12; var mm = d.getMinutes(); if (mm < 10) mm = '0' + mm; return h12 + ':' + mm + ' ' + ampm; }
function dyFmtDay(at) { var d = new Date(at); if (isNaN(d)) return ''; var today = new Date(); var startOf = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); }; var diff = Math.round((startOf(today) - startOf(d)) / 86400000); if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'; var wd = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]; var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; return wd + ', ' + mon + ' ' + d.getDate(); }
function dyDayKey(at) { var d = new Date(at); if (isNaN(d)) return 'x'; return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
function dyDownscaleImage(file, cb) { var MAX = 1280, Q = 0.82; var reader = new FileReader(); reader.onload = function () { var img = new Image(); img.onload = function () { var w = img.width, h = img.height; if (!w || !h) { cb(null); return; } var scale = Math.min(1, MAX / Math.max(w, h)); var cw = Math.max(1, Math.round(w * scale)); var ch = Math.max(1, Math.round(h * scale)); var canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch; var ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, cw, ch); var out; try { out = canvas.toDataURL('image/jpeg', Q); } catch (e) { out = null; } cb(out); }; img.onerror = function () { cb(null); }; img.src = reader.result; }; reader.onerror = function () { cb(null); }; reader.readAsDataURL(file); }
function renderDiary() {
  var root = $('#v-diary'); if (!root) return;
  var entries = (state.diary || []);
  var html = '<header class="viewhead"><h1>Diary</h1></header>';
  if (!entries.length) { html += '<div class="empty dy-empty"><div class="dy-empty-mark">“</div><p>Nothing written yet.</p><p class="dy-empty-sub">Tap ＋ to start.</p></div>'; root.innerHTML = html; return; }
  html += '<div class="dy-list">'; var lastDay = null;
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]; var key = dyDayKey(e.at);
    if (key !== lastDay) { html += '<div class="dy-day"><span>' + escapeHtml(dyFmtDay(e.at)) + '</span></div>'; lastDay = key; }
    var imgs = (e.images || []).slice(0, 3); var thumbs = '';
    if (imgs.length) { thumbs += '<div class="dy-thumbs" data-count="' + imgs.length + '">'; for (var j = 0; j < imgs.length; j++) thumbs += '<span class="dy-thumb"><img src="' + escapeHtml(imgs[j]) + '" alt="" loading="lazy"></span>'; if ((e.images || []).length > 3) thumbs += '<span class="dy-more">+' + ((e.images.length) - 3) + '</span>'; thumbs += '</div>'; }
    var text = (e.text || '').trim();
    var body = text ? '<p class="dy-text">' + escapeHtml(text) + '</p>' : '<p class="dy-text dy-text-empty">No words — just images.</p>';
    html += '<article class="dy-entry" data-id="' + escapeHtml(e.id) + '" role="button" tabindex="0"><div class="dy-rail"><time class="dy-time">' + escapeHtml(dyFmtTime(e.at)) + '</time></div><div class="dy-card">' + body + thumbs + '</div><button class="del dy-del" data-id="' + escapeHtml(e.id) + '" aria-label="Delete entry" title="Delete">✕</button></article>';
  }
  html += '</div>'; root.innerHTML = html;
  $$('.dy-entry', root).forEach(function (el) { var id = el.getAttribute('data-id'); el.addEventListener('click', function () { openDiaryView(id); }); el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openDiaryView(id); } }); });
  $$('.dy-del', root).forEach(function (el) { el.addEventListener('click', function (ev) { ev.stopPropagation(); diaryDelete(el.getAttribute('data-id')); }); });
}
function renderDiaryComposer() {
  var host = $('#diarycomposer'); if (!host) return; dcImages = [];
  host.innerHTML = '<div class="sheet dc-sheet"><div class="grip"></div><div class="dc-head"><span class="dc-title">New entry</span><button class="dc-close" aria-label="Close">Close</button></div><textarea class="dc-text" placeholder="What’s on your mind?" rows="6"></textarea><div class="dc-previews" hidden></div><input type="file" accept="image/*" multiple class="dc-file" hidden><div class="dc-actions"><button class="dc-photo" type="button">＋ Photo</button><button class="dc-save" type="button">Save</button></div></div>';
  var ta = $('.dc-text', host); var file = $('.dc-file', host); var previews = $('.dc-previews', host);
  function paintPreviews() { if (!dcImages.length) { previews.hidden = true; previews.innerHTML = ''; return; } previews.hidden = false; var s = ''; for (var i = 0; i < dcImages.length; i++) s += '<span class="dc-prev" data-i="' + i + '"><img src="' + escapeHtml(dcImages[i]) + '" alt=""><button class="dc-prev-x" data-i="' + i + '" type="button" aria-label="Remove image">✕</button></span>'; previews.innerHTML = s; $$('.dc-prev-x', previews).forEach(function (btn) { btn.addEventListener('click', function (ev) { ev.stopPropagation(); var idx = parseInt(btn.getAttribute('data-i'), 10); dcImages.splice(idx, 1); paintPreviews(); }); }); }
  $('.dc-photo', host).addEventListener('click', function () { file.click(); });
  file.addEventListener('change', function () { var list = file.files ? Array.prototype.slice.call(file.files) : []; file.value = ''; if (!list.length) return; var pending = list.length; list.forEach(function (f) { dyDownscaleImage(f, function (dataURL) { if (dataURL) dcImages.push(dataURL); pending--; paintPreviews(); }); }); });
  $('.dc-save', host).addEventListener('click', function () { var txt = ta.value; if (!txt.trim() && !dcImages.length) { flash('Write something first.'); return; } diaryAdd(txt, dcImages.slice()); dcImages = []; closeOverlay('diarycomposer'); });
  $('.dc-close', host).addEventListener('click', function () { dcImages = []; closeOverlay('diarycomposer'); });
  ta.value = ''; paintPreviews(); setTimeout(function () { try { ta.focus(); } catch (e) {} }, 30);
}
function renderDiaryView(id) {
  var host = $('#diaryview'); if (!host) return;
  var entries = (state.diary || []); var e = null;
  for (var i = 0; i < entries.length; i++) if (entries[i].id === id) { e = entries[i]; break; }
  if (!e) { host.innerHTML = '<div class="sheet dv-sheet"><div class="grip"></div><p class="dv-missing">This entry is gone.</p><div class="dv-actions"><button class="dv-close" type="button">Close</button></div></div>'; $('.dv-close', host).addEventListener('click', function () { closeOverlay('diaryview'); }); return; }
  var imgs = (e.images || []); var imgHtml = '';
  if (imgs.length) { imgHtml += '<div class="dv-images">'; for (var k = 0; k < imgs.length; k++) imgHtml += '<img class="dv-img" src="' + escapeHtml(imgs[k]) + '" alt="" loading="lazy">'; imgHtml += '</div>'; }
  var text = (e.text || ''); var textHtml = text.trim() ? '<div class="dv-text">' + escapeHtml(text) + '</div>' : '';
  host.innerHTML = '<div class="sheet dv-sheet"><div class="grip"></div><time class="dv-when">' + escapeHtml(dyFmtDateTime(e.at)) + '</time>' + textHtml + imgHtml + '<div class="dv-actions"><button class="del dv-del" type="button">Delete</button><button class="dv-close" type="button">Close</button></div></div>';
  $('.dv-close', host).addEventListener('click', function () { closeOverlay('diaryview'); });
  $('.dv-del', host).addEventListener('click', function () { diaryDelete(e.id); closeOverlay('diaryview'); });
}

/* ============================ YOU / STATS (overrides core renderMe) ============================ */
function renderMe(){
  const root = $('#v-me'); if (!root) return;
  const s = stats();
  const r = state.reminders || (state.reminders = { enabled:false, everyMin:60, from:'09:00', to:'21:00' });
  const logged = isLoggedIn(); const uname = currentUsername();
  const WD = ['S','M','T','W','T','F','S'];
  let html = '<header class="viewhead"><h1>You</h1></header>';
  const week = Array.isArray(s.week) ? s.week : [];
  const peak = Math.max(1, ...week.map(d => d.mins || 0));
  const todayIso = week.length ? week[week.length - 1].date : '';
  const bars = week.map(d => { const mins = d.mins || 0; const h = Math.round((mins / peak) * 100); const dt = new Date((d.date || '') + 'T00:00:00'); const letter = isNaN(dt) ? '·' : WD[dt.getDay()]; const isTop = mins > 0 && mins === peak; const isToday = d.date === todayIso; const cls = 'me-bar' + (isTop ? ' me-bar-top' : '') + (isToday ? ' me-bar-today' : ''); const hrs = mins >= 60 ? (mins / 60).toFixed(mins % 60 ? 1 : 0) + 'h' : mins + 'm'; const title = mins > 0 ? hrs + ' focus' : 'no focus logged'; return `<div class="me-bcol" title="${escapeHtml(title)}"><div class="me-btrack"><span class="${cls}" style="height:${mins > 0 ? Math.max(h, 6) : 0}%"></span></div><span class="me-blbl">${letter}</span></div>`; }).join('');
  const grid = [['Principles', s.principlesOn, 'on'],['Projects', s.projectsActive, 'active'],['To-dos', s.todosOpen, 'open'],['Focus', (s.focusToday || 0).toFixed(1) + 'h', 'today'],['Diary', s.diaryCount, 'entries']].map(([k, v, sub]) => `<div class="me-gcell"><b>${escapeHtml(String(v))}</b><span>${k}</span><em>${sub}</em></div>`).join('');
  html += `<div class="me-card me-hero"><div class="me-hero-top"><div class="me-streak-main"><b class="me-streak-n">${s.streak || 0}</b><span class="me-streak-lbl">day streak</span></div><div class="me-streak-best"><b>${s.best || 0}</b><span>best</span></div></div><div class="me-chart"><div class="me-chart-head">Focus · last 7 days</div><div class="me-bars">${bars}</div></div><div class="me-grid">${grid}</div></div>`;
  if (logged){ html += `<div class="me-card me-acc"><div class="me-acc-top"><div class="me-acc-id"><div class="me-acc-u">${escapeHtml(uname)}</div><div class="me-acc-s" id="sync-status">${escapeHtml(syncStatus || 'Signed in · cloud sync on')}</div></div><button class="me-btn ghost" id="me-logout" type="button">Log out</button></div></div>`; }
  else { html += `<div class="me-card me-acc"><h4>Account</h4><input class="me-in" id="me-user" placeholder="Username" autocapitalize="off" autocomplete="username" spellcheck="false" /><input class="me-in" id="me-pass" type="password" placeholder="Password" autocomplete="current-password" /><div class="me-acc-btns"><button class="me-btn" id="me-login" type="button">Log in</button><button class="me-btn ghost" id="me-register" type="button">Sign up</button></div><div class="me-hint">End-to-end encrypted. Your password never leaves this device.</div></div>`; }
  if (r.enabled){ const chips = [30, 60, 90, 120].map(n => `<button class="me-chip${r.everyMin === n ? ' on' : ''}" type="button" data-every="${n}">${n < 60 ? n + 'm' : (n / 60) + 'h'}</button>`).join(''); html += `<div class="me-card me-rem"><div class="me-rem-top"><div><div class="me-rem-t">Reminders <em class="me-rem-on">On</em></div><div class="me-rem-s">A nudge to log what you did.</div></div><button class="me-btn ghost" id="me-rem-off" type="button">Turn off</button></div><div class="me-rem-ctl"><div class="me-rem-lbl">Every</div><div class="me-chips">${chips}</div></div><div class="me-rem-ctl"><div class="me-rem-lbl">Window</div><div class="me-times"><input type="time" class="me-time" id="me-from" value="${escapeHtml(r.from || '09:00')}" /><span class="me-time-sep">to</span><input type="time" class="me-time" id="me-to" value="${escapeHtml(r.to || '21:00')}" /></div></div></div>`; }
  else { html += `<div class="me-card me-rem"><div class="me-rem-top"><div><div class="me-rem-t">Reminders</div><div class="me-rem-s">Get a nudge to log what you did.</div></div><button class="me-btn" id="me-rem-on" type="button">Turn on</button></div></div>`; }
  html += `<div class="me-card"><h4>Name</h4><input class="me-in" id="me-name" value="${escapeHtml(state.name || '')}" maxlength="24" placeholder="You" /></div>`;
  html += `<div class="me-card me-paint"><img src="assets/friedrich.jpg" alt="Wanderer above the Sea of Fog" /><div class="me-paint-cap"><div class="me-paint-t">Wanderer above the Sea of Fog</div><div class="me-paint-sub">Caspar David Friedrich · 1818</div></div></div>`;
  const items = Array.isArray(state.archive) ? state.archive : [];
  html += `<div class="me-card me-arc"><h4>Archive <span>${items.length}</span></h4>` + (items.length ? '<div class="me-arc-list">' + items.map(meArcCard).join('') + '</div>' : '<div class="empty">Nothing archived yet.</div>') + '</div>';
  root.innerHTML = html;
  if (logged){ const out = $('#me-logout', root); if (out) out.addEventListener('click', accountLogout); }
  else { const doAuth = async (fn) => { const user = ($('#me-user', root).value || '').trim(); const pass = $('#me-pass', root).value || ''; if (!user){ flash('Enter a username'); return; } if (!pass){ flash('Enter a password'); return; } flash('Working…'); const res = await fn(user, pass); if (res && res.ok){ render(); } else { flash((res && res.error) || 'Something went wrong'); } }; $('#me-login', root).addEventListener('click', () => doAuth(accountLogin)); $('#me-register', root).addEventListener('click', () => doAuth(accountRegister)); $('#me-pass', root).addEventListener('keydown', e => { if (e.key === 'Enter') doAuth(accountLogin); }); }
  const remOn = $('#me-rem-on', root); if (remOn) remOn.addEventListener('click', async () => { remOn.disabled = true; try { await remindersEnable(); } catch (e){} renderMe(); });
  const remOff = $('#me-rem-off', root); if (remOff) remOff.addEventListener('click', () => { remindersDisable(); renderMe(); });
  $$('.me-chip', root).forEach(chip => chip.addEventListener('click', () => { state.reminders.everyMin = +chip.dataset.every; save(); renderMe(); }));
  const fromEl = $('#me-from', root); if (fromEl) fromEl.addEventListener('change', () => { state.reminders.from = fromEl.value || '09:00'; save(); renderMe(); });
  const toEl = $('#me-to', root); if (toEl) toEl.addEventListener('change', () => { state.reminders.to = toEl.value || '21:00'; save(); renderMe(); });
  const nameEl = $('#me-name', root); if (nameEl) nameEl.addEventListener('change', () => { state.name = nameEl.value.trim() || 'You'; save(); render(); });
  $$('.me-arc-list .arc-restore', root).forEach(btn => btn.addEventListener('click', () => restore(btn.getAttribute('data-id'))));
  $$('.me-arc-list .del', root).forEach(btn => btn.addEventListener('click', () => deleteArchive(btn.getAttribute('data-id'))));
}
function meArcType(type){ const map = { todo:'To-do', principle:'Principle', project:'Project', assignment:'Assignment', someday:'Someday' }; return map[type] || 'Item'; }
function meArcCard(entry){ const id = escapeHtml(String(entry.id)); return '<article class="arc-card"><div class="arc-main"><div class="arc-meta"><span class="arc-tag">' + escapeHtml(meArcType(entry.type)) + '</span><span class="arc-date">' + escapeHtml(entry.at || '') + '</span></div><div class="arc-title">' + escapeHtml(entry.title || '') + '</div></div><div class="arc-actions"><button class="arc-restore" data-id="' + id + '" type="button">Restore</button><button class="del" data-id="' + id + '" type="button" aria-label="Delete">✕</button></div></article>'; }
