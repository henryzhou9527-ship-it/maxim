/* =====================================================================
   Maxim — app logic (v0.5)
   Principle-driven calendar, now with time-architect's engine woven in:
   intent (principles → goals → tasks → to-dos) flows DOWN into time
   (a day timeline of blocks). Tasks schedule into blocks; principles
   become guard bands the schedule must respect; a local "ask → draft →
   confirm" planner places work in natural language — no AI, no cloud.
   Plain vanilla JS, persisted to localStorage. No build step.
   ===================================================================== */

const STORE_KEY = 'maxim.state.v2';
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const uid = (p='id') => p + Math.random().toString(36).slice(2, 9);

/* ---------- dates / time ---------- */
const dkey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
};
const TODAY = dkey(new Date());
const addDays = (key, n) => { const d = new Date(key + 'T00:00:00'); d.setDate(d.getDate()+n); return dkey(d); };
const nowMin = () => { const n = new Date(); return n.getHours()*60 + n.getMinutes(); };
const hhmm = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const parseHM = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec((s||'').trim()); return m ? (+m[1])*60 + (+m[2]) : null; };

/* timeline window */
const DAY_START = 360;   // 06:00
const DAY_END   = 1440;  // 24:00
const HOURPX    = 46;
const minToPx   = (m) => (m - DAY_START) / 60 * HOURPX;

/* categories (palette tuned to the Friedrich theme) */
const CATS = {
  deep:    { label:'Deep work', cls:'c-deep' },
  study:   { label:'Study',     cls:'c-study' },
  admin:   { label:'Admin',     cls:'c-admin' },
  life:    { label:'Life',      cls:'c-life' },
  workout: { label:'Workout',   cls:'c-workout' },
  reward:  { label:'Reward',    cls:'c-reward' },
  rest:    { label:'Rest',      cls:'c-rest' },
};

/* ---------- seed (first run only) ---------- */
function seedHeldHistory(days){
  const h = {};
  for (let i = 1; i <= days; i++){
    const d = new Date(); d.setDate(d.getDate() - i);
    h[dkey(d)] = 'held';
  }
  return h;
}
function defaultState(){
  const gid = uid('goal_');
  const t1 = uid('task_'), t2 = uid('task_');
  return {
    view: 'today',
    selDate: TODAY,
    name: 'Zhang',
    profile: {
      wake: '07:30', sleep: '23:30',
      weeklyCapacityHours: 12,
      energyHigh: 'Mornings', energyLow: 'After lunch',
      planningStyle: 'hybrid',
    },
    maxims: [
      { id: uid(), text: 'No snacking after dinner',      history: seedHeldHistory(12), guard:{kind:'none'} },
      { id: uid(), text: 'Phone face-down while working', history: seedHeldHistory(6),  guard:{kind:'protect', category:'deep'} },
      { id: uid(), text: 'In bed by 12:00',               history: seedHeldHistory(3),  guard:{kind:'sleep'} },
    ],
    goals: [
      { id: gid, title: 'Pass IELTS — band 7', deadline: addDays(TODAY, 60),
        realisticHours: 60, weeklyTargetHours: 8, why: 'grad-school applications', status:'active', createdAt: TODAY },
    ],
    tasks: [
      { id: t1, text: 'Send Q2 deal memo to mentor', due:'today · 18:00', urgency:'now',  done:false, est:60,  goalId:'' },
      { id: t2, text: 'Finish market-comps sheet',   due:'Wed · 10:00',   urgency:'soon', done:false, est:90,  goalId:'' },
      { id: uid('task_'), text: 'Read the SPA draft', due:'Fri',          urgency:'',     done:false, est:45,  goalId:'' },
      { id: uid('task_'), text: 'IELTS writing mock', due:'this week',     urgency:'',     done:false, est:60,  goalId:gid },
    ],
    todos: [
      { id: uid(), text: 'Reply to onboarding email', done:false },
      { id: uid(), text: 'Book the small meeting room', done:true },
      { id: uid(), text: 'Refill metro card', done:false },
    ],
    blocks: [
      { id: uid('blk_'), title:'Read filings', date:TODAY, start:540, end:600, category:'deep', taskId:'', goalId:'', source:'seed', status:'planned' },
      { id: uid('blk_'), title:'Send Q2 deal memo to mentor', date:TODAY, start:1020, end:1080, category:'admin', taskId:t1, goalId:'', source:'seed', status:'planned' },
    ],
    sparks: [
      { id: uid(), text: 'Block 30 min every morning to read filings.' },
    ],
  };
}

/* ---------- persistence ---------- */
let state;
let draft = null;   // transient draft block awaiting confirm
function load(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    state = raw ? JSON.parse(raw) : defaultState();
  } catch (e){ state = defaultState(); }
  if (!state.view) state.view = 'today';
  if (!state.selDate) state.selDate = TODAY;
  if (!state.blocks) state.blocks = [];
  if (!state.goals) state.goals = [];
  if (!state.profile) state.profile = defaultState().profile;
}
function save(){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e){}
}

/* ---------- streak maths ---------- */
function streakOf(history){
  let s = 0; const d = new Date();
  if (history[dkey(d)] !== 'held') d.setDate(d.getDate() - 1);
  while (history[dkey(d)] === 'held'){ s++; d.setDate(d.getDate() - 1); }
  return s;
}
function bestStreakOf(history){
  const keys = Object.keys(history).filter(k => history[k] === 'held').sort();
  if (!keys.length) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < keys.length; i++){
    const prev = new Date(keys[i-1]); prev.setDate(prev.getDate() + 1);
    if (dkey(prev) === keys[i]){ run++; best = Math.max(best, run); } else run = 1;
  }
  return best;
}
function heldTotal(history){ return Object.values(history).filter(v => v === 'held').length; }

/* ---------- schedule helpers ---------- */
function blocksOn(date){ return state.blocks.filter(b => b.date === date).slice().sort((a,b)=>a.start-b.start); }
function taskScheduled(t){ return state.blocks.some(b => b.taskId === t.id); }

// guard bands for a day, derived from profile + sleep-type maxims
function guardsOn(date){
  const g = [];
  const wake = parseHM(state.profile.wake) ?? 450;
  const sleep = parseHM(state.profile.sleep) ?? 1410;
  const hasSleepMaxim = state.maxims.some(m => m.guard && m.guard.kind === 'sleep');
  const sleepLabel = hasSleepMaxim ? '「In bed」 rest' : 'Rest';
  if (wake > DAY_START) g.push({ start: DAY_START, end: wake, label: sleepLabel, kind:'sleep' });
  if (sleep < DAY_END)  g.push({ start: sleep, end: DAY_END, label: sleepLabel, kind:'sleep' });
  return g;
}
function overlaps(aS, aE, bS, bE){ return aS < bE && bS < aE; }
function slotFree(date, s, e){
  if (s < DAY_START || e > DAY_END) return false;
  for (const g of guardsOn(date)) if (overlaps(s, e, g.start, g.end)) return false;
  for (const b of blocksOn(date)) if (overlaps(s, e, b.start, b.end)) return false;
  if (draft && draft.date === date && overlaps(s, e, draft.start, draft.end)) return false;
  return true;
}
function findFreeSlot(date, dur, after){
  let s = Math.max(DAY_START, Math.ceil((after ?? DAY_START)/15)*15);
  while (s + dur <= DAY_END){
    if (slotFree(date, s, s + dur)) return s;
    s += 15;
  }
  return null;
}

/* natural-language → draft block (local, no AI) */
const WD = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6,
             sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
function parseSchedule(input){
  let s = ' ' + input.trim() + ' ';
  let date = state.selDate;
  // date words
  if (/\b(today|今天)\b/i.test(s)) { date = TODAY; s = s.replace(/\b(today|今天)\b/i,' '); }
  else if (/(后天|day after tomorrow)/i.test(s)) { date = addDays(TODAY,2); s = s.replace(/(后天|day after tomorrow)/i,' '); }
  else if (/\b(tomorrow|明天)\b/i.test(s)) { date = addDays(TODAY,1); s = s.replace(/\b(tomorrow|明天)\b/i,' '); }
  else {
    const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(s);
    if (iso){ date = iso[1]; s = s.replace(iso[1],' '); }
    else {
      const wd = /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i.exec(s);
      if (wd){
        const target = WD[wd[2].toLowerCase()];
        let d = new Date(TODAY+'T00:00:00');
        do { d.setDate(d.getDate()+1); } while (d.getDay() !== target);
        date = dkey(d); s = s.replace(wd[0],' ');
      }
    }
  }
  // duration
  let dur = null;
  let m = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|小时|个小时)\b/i.exec(s);
  if (m){ dur = Math.round(parseFloat(m[1])*60); s = s.replace(m[0],' '); }
  m = /(\d+)\s*(m|min|mins|minute|minutes|分钟|分)\b/i.exec(s);
  if (m){ dur = (dur||0) + parseInt(m[1],10); s = s.replace(m[0],' '); }
  if (!dur) dur = 60;
  // time
  let start = null;
  m = /\b(\d{1,2}):(\d{2})\b/.exec(s);
  if (m){ start = (+m[1])*60 + (+m[2]); s = s.replace(m[0],' '); }
  else {
    m = /\b(\d{1,2})\s*(am|pm)\b/i.exec(s);
    if (m){ let h = +m[1] % 12; if (/pm/i.test(m[2])) h += 12; start = h*60; s = s.replace(m[0],' '); }
    else {
      m = /(上午|早上|下午|晚上|中午)?\s*(\d{1,2})\s*点(半|\d{1,2})?/.exec(s);
      if (m){
        let h = +m[2]; const ap = m[1]||'';
        if ((ap==='下午'||ap==='晚上') && h < 12) h += 12;
        if (ap==='中午' && h < 12) h += 12;
        let mm = 0; if (m[3]==='半') mm = 30; else if (m[3]) mm = +m[3];
        start = h*60 + mm; s = s.replace(m[0],' ');
      }
    }
  }
  const title = s.replace(/\s+/g,' ').trim() || 'New block';
  return { title, date, start, dur };
}
function makeDraft(parsed, opts={}){
  let { title, date, start, dur } = parsed;
  if (start == null){
    const after = (date === TODAY) ? nowMin() : DAY_START;
    start = findFreeSlot(date, dur, after);
    if (start == null){ return { error: 'No free slot that day — the day is full or blocked by a guard.' }; }
  }
  const end = start + dur;
  draft = { id:'draft', title, date, start, end, category: opts.category || 'deep', taskId: opts.taskId||'', goalId: opts.goalId||'', source:'plan', status:'planned' };
  const clash = !slotFree(date, start, end);
  state.selDate = date; state.view = 'today';
  return { draft, clash };
}

/* ===================================================================== */
/* RENDER                                                                */
/* ===================================================================== */

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const CLOCKADD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M12 2h0"/></svg>';
const CREDIT = 'Caspar David Friedrich · Wanderer above the Sea of Fog · 1818';
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function render(){
  renderHero();
  renderTodayMaxims();
  renderWeek();
  renderDraftbar();
  renderTimeline();
  renderTodayTasks();
  renderTodayTodos();
  renderSparkChip();
  renderLayers();
  renderStreaks();
  renderMe();
  applyView();
}

/* ---------- view switching ---------- */
function applyView(){
  $$('.view').forEach(v => v.classList.toggle('on', v.dataset.view === state.view));
  $$('.tabbar .tab').forEach(t => t.classList.toggle('on', t.dataset.view === state.view));
}
function setView(v){
  state.view = v; save(); applyView();
  const sc = $('#scroll'); if (sc) sc.scrollTop = 0;
}

/* ---------- hero ---------- */
function renderHero(){
  const today = new Date();
  $('#today').textContent = today.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
  const date = today.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  $('#hero-cap').innerHTML =
    `<div class="ey">${date}</div>` +
    `<h2>Above the fog, <em>${escapeHtml(state.name)}.</em><br/>Hold the line today.</h2>` +
    `<div class="credit">${CREDIT}</div>`;
}

/* ---------- week (day selector) ---------- */
function renderWeek(){
  const wrap = $('#week'); if (!wrap) return; wrap.innerHTML = '';
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay()+6)%7));
  const DOW = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  for (let i = 0; i < 7; i++){
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const key = dkey(d);
    const sel = key === state.selDate;
    const has = state.blocks.some(b => b.date === key);
    const el = document.createElement('div');
    el.className = 'day' + (sel ? ' sel' : '') + (has ? ' has' : '') + (key===TODAY ? ' tdy' : '');
    el.innerHTML = `<span class="dow">${DOW[i]}</span><span class="num">${d.getDate()}</span><span class="pip"></span>`;
    el.addEventListener('click', () => { state.selDate = key; save(); renderWeek(); renderTimeline(); });
    wrap.appendChild(el);
  }
}

/* ---------- TODAY: maxims to honour ---------- */
function renderTodayMaxims(){
  fillList($('#t-maxims'), state.maxims, buildMaxim, 'No maxims yet — add a line in Layers.');
  const held = state.maxims.filter(m => m.history[TODAY] === 'held').length;
  $('#t-mx-count').textContent = `${held}/${state.maxims.length} held`;
}

/* ---------- TODAY: the day timeline ---------- */
function renderDraftbar(){
  const bar = $('#draftbar');
  if (!draft){ bar.hidden = true; bar.innerHTML = ''; return; }
  bar.hidden = false;
  const when = `${dateLabel(draft.date)} · ${hhmm(draft.start)}–${hhmm(draft.end)}`;
  bar.innerHTML = `
    <div class="db-info"><b>Draft</b><span>${escapeHtml(draft.title)} · ${when}</span></div>
    <div class="db-act"><button class="db-discard" id="db-discard">Discard</button><button class="db-apply" id="db-apply">Apply</button></div>`;
  $('#db-apply').addEventListener('click', applyDraft);
  $('#db-discard').addEventListener('click', () => { draft = null; render(); });
}

function dateLabel(key){
  if (key === TODAY) return 'Today';
  if (key === addDays(TODAY,1)) return 'Tomorrow';
  const d = new Date(key+'T00:00:00');
  return d.toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric' });
}

function layoutDay(items){
  items.sort((a,b)=> a.start-b.start || a.end-b.end);
  let group = [], groupEnd = -1;
  const flush = () => {
    const cols = [];
    group.forEach(b => {
      let placed = false;
      for (let c = 0; c < cols.length; c++){ if (cols[c] <= b.start){ b._col = c; cols[c] = b.end; placed = true; break; } }
      if (!placed){ b._col = cols.length; cols.push(b.end); }
    });
    group.forEach(b => b._cols = cols.length);
    group = []; groupEnd = -1;
  };
  items.forEach(b => {
    if (group.length && b.start >= groupEnd) flush();
    group.push(b); groupEnd = Math.max(groupEnd, b.end);
  });
  if (group.length) flush();
  return items;
}

function renderTimeline(){
  const tl = $('#timeline'); if (!tl) return;
  const date = state.selDate;
  tl.style.height = minToPx(DAY_END) + 'px';
  let html = '';
  // hour grid + labels
  for (let m = DAY_START; m <= DAY_END; m += 60){
    const y = minToPx(m);
    html += `<div class="hr" style="top:${y}px"></div>`;
    if (m < DAY_END) html += `<div class="hrlabel" style="top:${y}px">${String(m/60).padStart(2,'0')}</div>`;
  }
  // guard bands
  guardsOn(date).forEach(g => {
    html += `<div class="guard" style="top:${minToPx(g.start)}px;height:${minToPx(g.end)-minToPx(g.start)}px"><span>${g.label}</span></div>`;
  });
  tl.innerHTML = html;

  // blocks (+ draft) laid out
  const items = blocksOn(date).map(b => ({...b}));
  if (draft && draft.date === date) items.push({...draft, _isDraft:true});
  layoutDay(items);
  const GAP = 3, INSET = 40;
  items.forEach(b => {
    const top = minToPx(b.start), h = Math.max(22, minToPx(b.end) - minToPx(b.start));
    const colW = (100) / (b._cols||1);
    const el = document.createElement('div');
    const cat = CATS[b.category] || CATS.admin;
    el.className = `tblock ${cat.cls}` + (b._isDraft?' draft':'') + (b.status==='done'?' done':'');
    el.style.cssText = `top:${top}px;height:${h}px;left:calc(${INSET}px + ${(b._col||0)*colW}% );width:calc(${colW}% - ${INSET*colW/100}px - ${GAP}px)`;
    el.innerHTML = `
      <div class="tb-bar"></div>
      <div class="tb-body"><div class="tb-title"></div><div class="tb-time">${hhmm(b.start)}–${hhmm(b.end)} · ${cat.label}</div></div>
      ${b._isDraft ? '' : '<button class="tb-x" title="Unschedule">✕</button>'}`;
    el.querySelector('.tb-title').textContent = b.title;
    if (!b._isDraft){
      el.addEventListener('click', e => { if (e.target.closest('.tb-x')) return; toggleBlockDone(b.id); });
      el.querySelector('.tb-x').addEventListener('click', () => unschedule(b.id));
    }
    tl.appendChild(el);
  });

  // now line
  if (date === TODAY){
    const y = minToPx(nowMin());
    if (y >= 0 && y <= minToPx(DAY_END)){
      const now = document.createElement('div'); now.className = 'nowline'; now.style.top = y + 'px';
      tl.appendChild(now);
    }
  }
}

/* ---------- TODAY: unscheduled tasks + todos ---------- */
const URGRANK = { now:0, soon:1, '':2 };
function renderTodayTasks(){
  const open = state.tasks.filter(t => !t.done && !taskScheduled(t))
    .sort((a,b)=> (URGRANK[a.urgency]??2) - (URGRANK[b.urgency]??2));
  fillList($('#t-tasks'), open, t => buildTask(t, true), 'All scheduled or clear ✓');
  $('#t-tk-count').textContent = open.length ? `${open.length} to place` : 'clear';
}
function renderTodayTodos(){
  const open = state.todos.filter(t => !t.done);
  fillList($('#t-todos'), open, buildTodo, 'Nothing here — capture one with ✦.');
  $('#t-td-count').textContent = open.length ? `${open.length} left` : 'done';
}

function renderSparkChip(){
  const chip = $('#spark-chip'); const n = state.sparks.length;
  chip.hidden = n === 0;
  if (n){
    chip.innerHTML = `<span>${n} spark${n===1?'':'s'} waiting to be sorted</span><span class="go">Sort →</span>`;
    chip.onclick = () => setView('layers');
  }
}

/* ---------- element builders ---------- */
function buildMaxim(m){
  const st = m.history[TODAY] || '';
  const s = streakOf(m.history);
  const today = st === 'held' ? ' · held today' : st === 'broke' ? ' · broke today' : '';
  const guardTag = m.guard && m.guard.kind === 'sleep' ? '<span class="gtag">sleep guard</span>'
                 : m.guard && m.guard.kind === 'protect' ? '<span class="gtag">protects deep work</span>' : '';
  const el = document.createElement('div');
  el.className = 'maxim'; el.setAttribute('data-state', st); el.tabIndex = 0; el.setAttribute('role','button');
  el.innerHTML = `
    <div class="seal">${CHECK}</div>
    <div class="txt"><div class="rule"></div><div class="streak">held ${s} day${s===1?'':'s'}${today} ${guardTag}</div></div>
    <button class="del" title="Remove" aria-label="Remove maxim">✕</button>`;
  el.querySelector('.rule').textContent = m.text;
  const cycle = () => {
    const cur = m.history[TODAY] || '';
    const next = cur === '' ? 'held' : cur === 'held' ? 'broke' : '';
    if (next === '') delete m.history[TODAY]; else m.history[TODAY] = next;
    save(); render();
  };
  el.addEventListener('click', (e) => { if (e.target.closest('.del')) return; cycle(); });
  el.addEventListener('keydown', (e) => { if (e.key==='Enter'||e.key===' '){ e.preventDefault(); cycle(); }});
  el.querySelector('.del').addEventListener('click', () => remove('maxims', m.id));
  return el;
}

function goalTitleOf(id){ const g = state.goals.find(x=>x.id===id); return g ? g.title : ''; }

function buildTask(t, schedulable){
  const el = document.createElement('div');
  el.className = 'task' + (t.done ? ' done' : '');
  const dueClass = t.done ? '' : (t.urgency || '');
  const gtitle = t.goalId ? goalTitleOf(t.goalId) : '';
  const meta = [ t.est ? `${t.est}m` : '', gtitle ? '◆ '+gtitle : '' ].filter(Boolean).join(' · ');
  el.innerHTML = `
    <div class="tick ${t.done?'done':''}" role="checkbox" aria-checked="${t.done}" tabindex="0">${t.done?CHECK:''}</div>
    <div class="ti"><div class="t"></div>${(t.due||meta)?`<div class="w">${escapeHtml([t.due, meta].filter(Boolean).join(' · '))}</div>`:''}</div>
    ${schedulable && !t.done ? `<button class="sched-btn" title="Schedule into today">${CLOCKADD}</button>` : ''}
    ${t.due && !t.done && !schedulable ? `<div class="due ${dueClass}">${escapeHtml(t.due.split('·')[0].trim())}</div>` : ''}
    <button class="del" title="Remove" aria-label="Remove task">✕</button>`;
  el.querySelector('.t').textContent = t.text;
  const toggle = () => { t.done = !t.done; save(); render(); };
  el.querySelector('.tick').addEventListener('click', toggle);
  el.querySelector('.tick').addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
  el.querySelector('.del').addEventListener('click', () => remove('tasks', t.id));
  const sb = el.querySelector('.sched-btn');
  if (sb) sb.addEventListener('click', () => scheduleTask(t));
  return el;
}

function buildTodo(t){
  const el = document.createElement('div');
  el.className = 'todo' + (t.done ? ' done' : '');
  el.innerHTML = `<div class="dot" role="checkbox" aria-checked="${t.done}" tabindex="0"></div><span class="tx"></span><button class="del" title="Remove" aria-label="Remove to-do">✕</button>`;
  el.querySelector('.tx').textContent = t.text;
  const toggle = () => { t.done = !t.done; save(); render(); };
  el.querySelector('.dot').addEventListener('click', toggle);
  el.querySelector('.dot').addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
  el.querySelector('.del').addEventListener('click', () => remove('todos', t.id));
  return el;
}

function fillList(wrap, items, builder, emptyMsg){
  wrap.innerHTML = '';
  if (!items.length){ wrap.innerHTML = `<div class="empty">${emptyMsg}</div>`; return; }
  items.forEach(it => wrap.appendChild(builder(it)));
}

/* ---------- LAYERS ---------- */
function renderLayers(){
  fillList($('#l-maxims'), state.maxims, buildMaxim, 'No maxims yet.');
  $('#l-mx-count').textContent = `${state.maxims.length}`;
  fillList($('#l-goals'), state.goals, buildGoal, 'No goals yet — aim at something.');
  $('#l-gl-count').textContent = `${state.goals.filter(g=>g.status==='active').length} active`;
  fillList($('#l-tasks'), state.tasks, t => buildTask(t, false), 'No tasks.');
  const openT = state.tasks.filter(t=>!t.done).length;
  $('#l-tk-count').textContent = openT ? `${openT} open` : 'all done';
  fillList($('#l-todos'), state.todos, buildTodo, 'No to-dos.');
  const openTd = state.todos.filter(t=>!t.done).length;
  $('#l-td-count').textContent = openTd ? `${openTd} left` : 'done';
  renderSparks();
}

function buildGoal(g){
  const weeks = Math.max(1, Math.ceil((new Date(g.deadline) - new Date(TODAY)) / (7*864e5)));
  const cap = (state.profile.weeklyCapacityHours || 10) * weeks;
  const feas = Math.min(100, Math.round((cap / (g.realisticHours||1)) * 100));
  const feasClass = feas >= 100 ? 'ok' : feas >= 70 ? 'tight' : 'risk';
  const el = document.createElement('div');
  el.className = 'goal';
  el.innerHTML = `
    <div class="g-top"><div class="g-title"></div><button class="del" title="Remove" aria-label="Remove goal">✕</button></div>
    <div class="g-meta">due ${dateLabel(g.deadline)} · ${weeks}w left · ~${g.realisticHours}h needed · ${g.weeklyTargetHours}h/wk</div>
    <div class="g-feas ${feasClass}"><span style="width:${Math.min(100,feas)}%"></span></div>
    <div class="g-foot">${feas>=100?'feasible within capacity':feas>=70?'tight — protect the hours':'over capacity — cut scope or extend'}</div>`;
  el.querySelector('.g-title').textContent = g.title;
  el.querySelector('.del').addEventListener('click', () => remove('goals', g.id));
  return el;
}

function renderSparks(){
  const wrap = $('#l-sparks'); wrap.innerHTML = '';
  $('#l-sp-count').textContent = state.sparks.length ? `${state.sparks.length}` : 'empty';
  if (!state.sparks.length){ wrap.innerHTML = '<div class="empty">No loose ideas. Tap ✦ to catch one.</div>'; return; }
  state.sparks.forEach(sp => {
    const el = document.createElement('div');
    el.className = 'spark';
    el.innerHTML = `
      <div class="st"></div>
      <div class="sort">
        <button data-to="maxim">Maxim</button>
        <button data-to="goal">Goal</button>
        <button data-to="task">Task</button>
        <button data-to="todo">To-do</button>
        <button class="drop" title="Discard">✕</button>
      </div>`;
    el.querySelector('.st').textContent = '“' + sp.text + '”';
    el.querySelectorAll('.sort [data-to]').forEach(btn => btn.addEventListener('click', () => sortSpark(sp, btn.dataset.to)));
    el.querySelector('.drop').addEventListener('click', () => remove('sparks', sp.id));
    wrap.appendChild(el);
  });
}

/* ---------- STREAKS ---------- */
function startOfWeek(){
  const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay()+6)%7));
  return dkey(mon);
}
function goalHoursThisWeek(goalId){
  const wk = startOfWeek();
  let mins = 0;
  state.blocks.forEach(b => {
    if (b.date >= wk && b.date <= addDays(wk,6)){
      const linkedGoal = b.goalId === goalId || (b.taskId && state.tasks.find(t=>t.id===b.taskId)?.goalId === goalId);
      if (linkedGoal) mins += (b.end - b.start);
    }
  });
  return mins/60;
}
function renderStreaks(){
  const wrap = $('#s-list'); wrap.innerHTML = '';
  if (!state.maxims.length){ wrap.innerHTML = '<div class="empty">Add a maxim to start a streak.</div>'; }
  state.maxims.forEach(m => {
    const cur = streakOf(m.history), best = bestStreakOf(m.history);
    const st = m.history[TODAY] || '';
    let dots = '';
    for (let i = 13; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const v = m.history[dkey(d)] || '';
      const cls = v === 'held' ? 'h' : v === 'broke' ? 'b' : 'o';
      dots += `<span class="cell ${cls}${i===0?' tdy':''}"></span>`;
    }
    const card = document.createElement('div');
    card.className = 'streakcard' + (st ? ' s-'+st : '');
    card.innerHTML = `
      <div class="sc-top"><div class="sc-name"></div><div class="sc-now"><b>${cur}</b><span>day${cur===1?'':'s'}</span></div></div>
      <div class="sc-grid">${dots}</div>
      <div class="sc-foot"><span>best ${best} day${best===1?'':'s'}</span><span>${heldTotal(m.history)} kept total</span></div>`;
    card.querySelector('.sc-name').textContent = m.text;
    wrap.appendChild(card);
  });

  const gw = $('#s-goals'); gw.innerHTML = '';
  const active = state.goals.filter(g=>g.status==='active');
  if (!active.length){ gw.innerHTML = '<div class="empty">No active goals.</div>'; return; }
  active.forEach(g => {
    const done = goalHoursThisWeek(g.id), target = g.weeklyTargetHours || 1;
    const pct = Math.min(100, Math.round(done/target*100));
    const el = document.createElement('div');
    el.className = 'goalprog';
    el.innerHTML = `
      <div class="gp-top"><div class="gp-name"></div><div class="gp-num">${done.toFixed(1)}<span>/${target}h</span></div></div>
      <div class="gp-bar ${pct>=100?'ok':''}"><span style="width:${pct}%"></span></div>`;
    el.querySelector('.gp-name').textContent = g.title;
    gw.appendChild(el);
  });
}

/* ---------- ME (profile) ---------- */
function renderMe(){
  const wrap = $('#me-body'); wrap.innerHTML = '';
  const initial = (state.name || '?').trim().charAt(0).toUpperCase() || '?';
  const bestAll = state.maxims.reduce((mx,m) => Math.max(mx, streakOf(m.history)), 0);
  const keptAll = state.maxims.reduce((s,m) => s + heldTotal(m.history), 0);
  const tasksDone = state.tasks.filter(t=>t.done).length;
  const p = state.profile;

  const prof = document.createElement('div');
  prof.className = 'profile';
  prof.innerHTML = `
    <div class="avatar">${escapeHtml(initial)}</div>
    <div class="pf">
      <input id="name-input" class="name-input" value="${escapeHtml(state.name)}" maxlength="24" aria-label="Your name" />
      <div class="pf-sub">Keeper of ${state.maxims.length} line${state.maxims.length===1?'':'s'} · ${state.goals.filter(g=>g.status==='active').length} goal${state.goals.length===1?'':'s'} in flight</div>
    </div>`;
  wrap.appendChild(prof);

  const stats = document.createElement('div'); stats.className = 'stats';
  const tile = (n,l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
  stats.innerHTML = tile(bestAll,'longest streak') + tile(keptAll,'days kept') + tile(`${tasksDone}/${state.tasks.length}`,'tasks done') + tile(`${p.weeklyCapacityHours}h`,'weekly capacity');
  wrap.appendChild(stats);

  const form = document.createElement('div'); form.className = 'profcard';
  form.innerHTML = `
    <h4>Rhythm <span>what the schedule respects</span></h4>
    <div class="prow"><label>Wake</label><input data-p="wake" value="${escapeHtml(p.wake)}" placeholder="07:30" /></div>
    <div class="prow"><label>In bed by</label><input data-p="sleep" value="${escapeHtml(p.sleep)}" placeholder="23:30" /></div>
    <div class="prow"><label>Weekly capacity</label><input data-p="weeklyCapacityHours" value="${p.weeklyCapacityHours}" placeholder="12" /><span class="unit">h</span></div>
    <div class="prow"><label>High energy</label><input data-p="energyHigh" value="${escapeHtml(p.energyHigh)}" placeholder="Mornings" /></div>
    <div class="prow"><label>Low energy</label><input data-p="energyLow" value="${escapeHtml(p.energyLow)}" placeholder="After lunch" /></div>
    <p class="pnote">Wake / in-bed set the rest guards on your day timeline; capacity drives goal feasibility.</p>`;
  wrap.appendChild(form);

  const about = document.createElement('div'); about.className = 'about';
  about.innerHTML = `
    <h4>About Maxim</h4>
    <p>A calendar that runs on your principles. Set a line once and hold it; aim at a few goals; let the day get built around both. Planning is local — type it in plain words, preview the draft, apply.</p>
    <div class="credit-line">${CREDIT}</div>`;
  wrap.appendChild(about);

  const ni = $('#name-input');
  ni.addEventListener('change', () => { state.name = ni.value.trim() || 'You'; save(); renderHero(); renderMe(); });
  ni.addEventListener('keydown', e => { if (e.key === 'Enter') ni.blur(); });
  $$('#me-body [data-p]').forEach(inp => {
    inp.addEventListener('change', () => {
      const k = inp.dataset.p;
      state.profile[k] = (k === 'weeklyCapacityHours') ? (parseInt(inp.value,10)||0) : inp.value.trim();
      save(); render();
    });
  });
}

/* ===================================================================== */
/* ACTIONS                                                               */
/* ===================================================================== */
function remove(layer, id){
  state[layer] = state[layer].filter(x => x.id !== id);
  if (layer === 'tasks') state.blocks = state.blocks.filter(b => b.taskId !== id);
  save(); render();
}
function addMaxim(text){ if(!text.trim()) return; state.maxims.push({ id:uid(), text:text.trim(), history:{}, guard:{kind:'none'} }); save(); render(); }
function addGoal(text){
  if(!text.trim()) return;
  const [title, dl] = text.split('·').map(s=>s.trim());
  let deadline = addDays(TODAY, 56);
  if (dl && /^\d{4}-\d{2}-\d{2}$/.test(dl)) deadline = dl;
  state.goals.push({ id:uid('goal_'), title, deadline, realisticHours:40, weeklyTargetHours:5, why:'', status:'active', createdAt:TODAY });
  save(); render();
}
function addTask(text){
  if(!text.trim()) return;
  // "title · due · 60m"
  const parts = text.split('·').map(s=>s.trim());
  const title = parts[0]; let due = '', est = 60;
  parts.slice(1).forEach(p => {
    const dm = /(\d+)\s*(m|min|分钟)/i.exec(p) || /(\d+(?:\.\d+)?)\s*(h|小时)/i.exec(p);
    if (dm){ est = /h|小时/i.test(dm[2]) ? Math.round(parseFloat(dm[1])*60) : parseInt(dm[1],10); }
    else due = p;
  });
  state.tasks.push({ id:uid('task_'), text:title, due, urgency:'', done:false, est, goalId:'' });
  save(); render();
}
function addTodo(text){ if(!text.trim()) return; state.todos.push({ id:uid(), text:text.trim(), done:false }); save(); render(); }

function sortSpark(sp, to){
  if (to === 'maxim') addMaxim(sp.text);
  else if (to === 'goal') addGoal(sp.text);
  else if (to === 'task') addTask(sp.text);
  else addTodo(sp.text);
  state.sparks = state.sparks.filter(x => x.id !== sp.id);
  save(); render();
}

/* scheduling */
function scheduleTask(t){
  const date = (state.selDate < TODAY) ? TODAY : state.selDate;
  const after = (date === TODAY) ? nowMin() : DAY_START;
  const start = findFreeSlot(date, t.est || 60, after);
  if (start == null){ flash('No free slot — that day is full or guarded.'); return; }
  const cat = t.goalId ? 'study' : 'deep';
  draft = { id:'draft', title:t.text, date, start, end:start+(t.est||60), category:cat, taskId:t.id, goalId:t.goalId||'', source:'plan', status:'planned' };
  state.selDate = date; setView('today'); render();
}
function planFromInput(text){
  if (!text.trim()) return;
  const res = makeDraft(parseSchedule(text));
  if (res.error){ flash(res.error); return; }
  if (res.clash) flash('Heads up: overlaps something — adjust or apply anyway.');
  render();
}
function applyDraft(){
  if (!draft) return;
  state.blocks.push({ ...draft, id: uid('blk_') });
  draft = null; save(); render();
}
function unschedule(blockId){ state.blocks = state.blocks.filter(b => b.id !== blockId); save(); render(); }
function toggleBlockDone(blockId){
  const b = state.blocks.find(x=>x.id===blockId); if(!b) return;
  b.status = b.status === 'done' ? 'planned' : 'done';
  if (b.taskId){ const t = state.tasks.find(x=>x.id===b.taskId); if (t) t.done = (b.status==='done'); }
  save(); render();
}

let flashTimer = null;
function flash(msg){
  let el = $('#flash');
  if (!el){ el = document.createElement('div'); el.id = 'flash'; $('.screen').appendChild(el); }
  el.textContent = msg; el.classList.add('on');
  clearTimeout(flashTimer); flashTimer = setTimeout(()=>el.classList.remove('on'), 2600);
}

/* ===================================================================== */
/* WIRE UP                                                               */
/* ===================================================================== */
function init(){
  load();
  render();

  $('#tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]'); if (!b) return; setView(b.dataset.view);
  });

  // schedule input
  $('#sched-go').addEventListener('click', () => { const i=$('#sched-input'); planFromInput(i.value); i.value=''; });
  $('#sched-input').addEventListener('keydown', e => { if(e.key==='Enter'){ planFromInput(e.target.value); e.target.value=''; }});

  // add rows
  const bindAdd = (inputSel, fn) => { const inp = $(inputSel); return () => { fn(inp.value); inp.value=''; inp.focus(); }; };
  $('#mx-add').addEventListener('click', bindAdd('#mx-input', addMaxim));
  $('#gl-add').addEventListener('click', bindAdd('#gl-input', addGoal));
  $('#tk-add').addEventListener('click', bindAdd('#tk-input', addTask));
  $('#td-add').addEventListener('click', bindAdd('#td-input', addTodo));
  $('#mx-input').addEventListener('keydown', e => { if(e.key==='Enter'){ addMaxim(e.target.value); e.target.value=''; }});
  $('#gl-input').addEventListener('keydown', e => { if(e.key==='Enter'){ addGoal(e.target.value); e.target.value=''; }});
  $('#tk-input').addEventListener('keydown', e => { if(e.key==='Enter'){ addTask(e.target.value); e.target.value=''; }});
  $('#td-input').addEventListener('keydown', e => { if(e.key==='Enter'){ addTodo(e.target.value); e.target.value=''; }});

  // spark composer
  const composer = $('#composer'), spText = $('#sp-text');
  const openC = () => { composer.classList.add('open'); spText.value=''; setTimeout(()=>spText.focus(), 50); };
  const closeC = () => composer.classList.remove('open');
  $('#fab').addEventListener('click', openC);
  composer.addEventListener('click', e => { if (e.target === composer) closeC(); });
  $('#sp-keep').addEventListener('click', () => {
    const t = spText.value.trim(); if (t){ state.sparks.push({ id:uid(), text:t }); save(); render(); }
    closeC();
  });
  $$('.composer .choose button').forEach(btn => btn.addEventListener('click', () => {
    const t = spText.value.trim(); if (!t){ closeC(); return; }
    const to = btn.dataset.make;
    if (to==='maxim') addMaxim(t); else if (to==='goal') addGoal(t); else if (to==='task') addTask(t); else addTodo(t);
    closeC();
  }));

  // live clock + now line refresh
  const tick = () => { const n=new Date(); $('#clock').textContent = `${n.getHours()}:${String(n.getMinutes()).padStart(2,'0')}`; if(state.view==='today') renderTimeline(); };
  tick(); setInterval(tick, 60000);
}

document.addEventListener('DOMContentLoaded', init);
