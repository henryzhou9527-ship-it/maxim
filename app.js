/* =====================================================================
   Maxim — a quiet personal console.  (core)
   Catch a thought in the Inbox first; sort it into a Principle, a Todo,
   a Project / Assignment (same shape, told apart by a deadline), or a
   Someday. The Home screen shows only what's worth remembering right now.
   No push, no check-ins, no streaks. Plain vanilla JS + localStorage.

   This file = the shared CORE: state model, every data action, helpers,
   overlays, and the render dispatcher. The per-page view functions
   (renderHome / renderInbox / renderCapture / renderSort / renderItems /
   renderDetail / renderArchive) are defined further below.
   ===================================================================== */

const STORE_KEY = 'maxim.console.v1';
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const uid = (p='id') => p + Math.random().toString(36).slice(2, 9);
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- dates ---------- */
const todayKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
function daysUntil(iso){
  if (!iso) return null;
  const a = new Date(iso + 'T00:00:00'); const b = new Date(todayKey() + 'T00:00:00');
  return Math.round((a - b) / 864e5);
}
function fmtDeadline(iso){
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const md = `${MON[d.getMonth()]} ${d.getDate()}`;
  const n = daysUntil(iso);
  let tail;
  if (n < 0) tail = `${-n}d overdue`;
  else if (n === 0) tail = 'today';
  else if (n === 1) tail = 'tomorrow';
  else tail = `${n}d left`;
  return `${md} · ${tail}`;
}
function addDaysIso(iso, n){ const d = new Date((iso||todayKey())+'T00:00:00'); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

/* ---------- seed (first run only) ---------- */
function defaultState(){
  return {
    view: 'home',
    name: 'You',
    selDate: todayKey(),
    usage: { last: '', streak: 0, best: 0 },
    inbox: [
      { id: uid('ib_'), text: 'Buy a new pillow', at: todayKey() },
      { id: uid('ib_'), text: 'Maybe learn photography', at: todayKey() },
    ],
    principles: [
      { id: uid('pr_'), text: 'No snacking after dinner', status:'on', note:'Not about weight — about not losing the evening.' },
      { id: uid('pr_'), text: 'Phone out of the bedroom', status:'on', note:'' },
      { id: uid('pr_'), text: 'In bed by midnight', status:'on', note:'' },
      { id: uid('pr_'), text: 'No doomscrolling', status:'paused', note:'' },
    ],
    tips: [
      { id: uid('tp_'), text: 'Lock the water bottle before it goes in the bag', note:'Learned the soggy-notebook way.' },
      { id: uid('tp_'), text: 'A glass of water first thing in the morning', note:'' },
      { id: uid('tp_'), text: 'Two minutes tidying the desk before you start', note:'' },
    ],
    todos: [
      { id: uid('td_'), text: 'Pick up the package', done:false },
      { id: uid('td_'), text: 'Reply to Alex', done:false },
    ],
    projects: [
      { id: uid('pj_'), title:'Learn French', deadline:null, start: addDaysIso(todayKey(), -28), note:'Conversational by spring.',
        subs:[ {id:uid('s_'),text:'Finish unit 1',done:true}, {id:uid('s_'),text:'First speaking session',done:true},
               {id:uid('s_'),text:'Review mistakes',done:false}, {id:uid('s_'),text:'Listen to one podcast',done:false},
               {id:uid('s_'),text:'Practice 20 phrases',done:false}, {id:uid('s_'),text:'Write a short diary',done:false} ], status:'active' },
      { id: uid('pj_'), title:'Portfolio', deadline: addDaysIso(todayKey(), 24), start: addDaysIso(todayKey(), -10), note:'',
        subs:[ {id:uid('s_'),text:'Pick 8 key shots',done:true}, {id:uid('s_'),text:'Gather references',done:false},
               {id:uid('s_'),text:'Lay it out',done:false} ], status:'active' },
      { id: uid('pj_'), title:'Essay', deadline: addDaysIso(todayKey(), 3), start: addDaysIso(todayKey(), -4), note:'',
        subs:[ {id:uid('s_'),text:'Find 3 sources',done:true}, {id:uid('s_'),text:'Write outline',done:true},
               {id:uid('s_'),text:'Write intro',done:false}, {id:uid('s_'),text:'Write body',done:false},
               {id:uid('s_'),text:'Write conclusion',done:false}, {id:uid('s_'),text:'Check citations',done:false} ], status:'active' },
      { id: uid('pj_'), title:'Slides', deadline: addDaysIso(todayKey(), 1), start: addDaysIso(todayKey(), -2), note:'',
        subs:[ {id:uid('s_'),text:'Outline',done:true}, {id:uid('s_'),text:'Build 10 pages',done:false} ], status:'active' },
    ],
    someday: [
      { id: uid('sd_'), text:'Learn to sketch', note:'' },
      { id: uid('sd_'), text:'Sort old photos', note:'' },
      { id: uid('sd_'), text:'Read that novel', note:'' },
      { id: uid('sd_'), text:'Try baking', note:'' },
    ],
    routines: [
      { id: uid('rt_'), title:'Morning pages', cat:'reflection', days:[1,2,3,4,5], start:480, end:510 },
      { id: uid('rt_'), title:'Workout', cat:'workout', days:[1,3,5], start:1080, end:1140 },
    ],
    blocks: [
      { id: uid('bk_'), date: todayKey(), start:540,  end:660,  title:'Deep work — Essay',   cat:'deep',  plan:true, status:'done',    actual:{start:545,end:675}, routine:null, note:'' },
      { id: uid('bk_'), date: todayKey(), start:780,  end:840,  title:'Lunch + walk',         cat:'life',  plan:true, status:'done',    actual:null, routine:null, note:'' },
      { id: uid('bk_'), date: todayKey(), start:900,  end:1020, title:'French + review',      cat:'study', plan:true, status:'planned', actual:null, routine:null, note:'' },
      { id: uid('bk_'), date: todayKey(), start:1080, end:1140, title:'Workout',              cat:'workout', plan:true, status:'planned', actual:null, routine:'seed', note:'' },
    ],
    diary: [
      { id: uid('dy_'), at: new Date().toISOString(), text:'Kept all three lines today. The deep-work block in the morning is doing most of the work — protect it.', images:[] },
    ],
    reminders: { enabled:false, everyMin:60, from:'09:00', to:'22:00', lastFired:'' },
    archive: [],
  };
}

/* ---------- persistence (account-aware) ---------- */
let state;
function normalizeState(s){
  if (!s || typeof s !== 'object') s = defaultState();
  if (!s.view) s.view = 'home';
  if (!s.selDate) s.selDate = todayKey();
  if (!s.usage) s.usage = { last:'', streak:0, best:0 };
  if (!s.name) s.name = 'You';
  ['inbox','principles','tips','todos','projects','someday','archive','routines','blocks','diary'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  if (!s.reminders || typeof s.reminders!=='object') s.reminders = { enabled:false, everyMin:60, from:'09:00', to:'22:00', lastFired:'' };
  s.projects.forEach(p => { if (p.start === undefined) p.start = null; });
  if (['home','schedule','timeline','diary','items','me'].indexOf(s.view) < 0) s.view = 'home';
  return s;
}
async function loadLocalState(){
  if (maximEncKey){
    try { const enc = JSON.parse(localStorage.getItem(MX_ENC_KEY)); if (enc) return await maximDecrypt(maximEncKey, enc); } catch (e){}
    return defaultState();
  }
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : defaultState(); } catch (e){ return defaultState(); }
}
async function bootLoad(){ state = normalizeState(await loadLocalState()); }
async function persistLocal(){
  if (maximEncKey){ try { localStorage.setItem(MX_ENC_KEY, JSON.stringify(await maximEncrypt(maximEncKey, state))); } catch (e){} }
  else { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e){} }
}
function save(){ persistLocal().catch(()=>{}); schedulePush(); }

/* ===================================================================== */
/* ACCOUNT + END-TO-END ENCRYPTED CLOUD SYNC                             */
/* (ported from time-architect: PBKDF2 → AES-GCM, verifier = SHA-256 of  */
/*  the raw key; the server only ever stores ciphertext.)                */
/* ===================================================================== */
const MX_AUTH_KEY = 'maxim_auth_v1';
const MX_ENC_KEY  = 'maxim_enc_state_v1';
const MX_SESSION_KEY = 'maxim_session_key';
const MX_PBKDF2_ITERS = 100000;
const ACCOUNTS_API = '/api/accounts';
const SETTINGS_API = '/api/settings';
const SYNC_KEY = 'maxim_state';

let maximEncKey = null;     // in-memory AES-GCM CryptoKey, null when logged out / local-only
let maximAuthUser = '';
let cloudBlocked = false;   // a cloud blob failed to decrypt (wrong password) → don't overwrite it
let syncStatus = '';
let pushTimer = null;

function b64enc(buf){ const b=new Uint8Array(buf); let s=''; for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s); }
function b64dec(str){ const bin=atob(str); const b=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) b[i]=bin.charCodeAt(i); return b.buffer; }
function normUser(v){ const u=String(v||'').trim().toLowerCase(); return /^[a-z0-9_-]{3,40}$/.test(u)?u:''; }

async function maximDeriveKey(password, salt){
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:MX_PBKDF2_ITERS, hash:'SHA-256' }, km, { name:'AES-GCM', length:256 }, true, ['encrypt','decrypt']);
}
async function maximCreateVerifier(key){ const raw = await crypto.subtle.exportKey('raw', key); const h = await crypto.subtle.digest('SHA-256', raw); return b64enc(h); }
async function maximEncrypt(key, obj){ const iv = crypto.getRandomValues(new Uint8Array(12)); const data = new TextEncoder().encode(JSON.stringify(obj)); const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, data); return { iv:b64enc(iv), ct:b64enc(ct) }; }
async function maximDecrypt(key, env){ const iv = new Uint8Array(b64dec(env.iv)); const ct = new Uint8Array(b64dec(env.ct)); const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct); return JSON.parse(new TextDecoder().decode(plain)); }

function loadAuth(){ try { const a = JSON.parse(localStorage.getItem(MX_AUTH_KEY)); if (!a || !normUser(a.username) || !a.salt || !a.verifier) return null; return { ...a, username:normUser(a.username) }; } catch (e){ return null; } }
function saveAuth(meta){ localStorage.setItem(MX_AUTH_KEY, JSON.stringify({ ...meta, username:normUser(meta.username), savedAt:new Date().toISOString() })); }

async function accountRequest(action, payload){
  const res = await fetch(ACCOUNTS_API, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ action, ...payload }) });
  const data = await res.json().catch(()=>({}));
  if (!res.ok){ const e = new Error(data.error || 'Account service unavailable'); e.status = res.status; throw e; }
  return data;
}
async function fetchAccount(username){
  const res = await fetch(`${ACCOUNTS_API}?username=${encodeURIComponent(normUser(username))}`, { cache:'no-store' });
  const data = await res.json().catch(()=>({}));
  if (!res.ok){ const e = new Error(data.error || 'Account not found'); e.status = res.status; throw e; }
  return data.account || null;
}
async function storeSessionKey(key){ const raw = await crypto.subtle.exportKey('raw', key); localStorage.setItem(MX_SESSION_KEY, b64enc(raw)); }

function accountError(error){
  const raw = String(error?.message || error || '');
  if (error?.status === 409 || /already exists/i.test(raw)) return 'That username is taken. Log in or pick another.';
  if (error?.status === 404 || /not found/i.test(raw)) return 'No such account — sign up first.';
  if (error?.status === 401 || /incorrect|invalid login/i.test(raw)) return 'Wrong username or password.';
  if (error?.status === 503 || /not configured|unavailable|Failed to fetch/i.test(raw)) return 'Cloud service unavailable right now.';
  return raw || 'Something went wrong.';
}

async function accountRegister(username, password){
  const user = normUser(username);
  if (!user) throw new Error('Username: 3-40 lowercase letters, digits, _ or -.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await maximDeriveKey(password, salt);
  const saltText = b64enc(salt);
  const verifier = await maximCreateVerifier(key);
  await accountRequest('register', { username:user, salt:saltText, verifier });
  saveAuth({ username:user, salt:saltText, verifier, cloud:true });
  maximEncKey = key; maximAuthUser = user; cloudBlocked = false;
  await storeSessionKey(key);
  // migrate current local (plaintext) data up, then push to cloud
  localStorage.removeItem(STORE_KEY);
  await persistLocal();
  await pushCloud(true);
  return { ok:true };
}
async function accountLogin(username, password){
  const user = normUser(username);
  if (!user) return { ok:false, error:'Enter a 3-40 character username' };
  try {
    const account = await fetchAccount(user);
    const salt = new Uint8Array(b64dec(account.salt));
    const key = await maximDeriveKey(password, salt);
    const verifier = await maximCreateVerifier(key);
    await accountRequest('login', { username:user, verifier });
    saveAuth({ username:user, salt:account.salt, verifier, cloud:true });
    maximEncKey = key; maximAuthUser = user; cloudBlocked = false;
    await storeSessionKey(key);
    localStorage.removeItem(STORE_KEY);
    await pullCloud(true);   // cloud wins; if empty, seed it
    return { ok:true };
  } catch (error){ return { ok:false, error: accountError(error) }; }
}
function accountLogout(){
  maximEncKey = null; maximAuthUser = ''; cloudBlocked = false;
  localStorage.removeItem(MX_AUTH_KEY); localStorage.removeItem(MX_ENC_KEY);
  localStorage.removeItem(MX_SESSION_KEY); sessionStorage.removeItem(MX_SESSION_KEY);
  persistLocal();   // write current state back as plaintext local
  syncStatus = ''; render();
}
async function trySessionRestore(){
  // session key lives in localStorage so login survives closing the app;
  // (fall back to the old sessionStorage location for already-logged-in users)
  const stored = localStorage.getItem(MX_SESSION_KEY) || sessionStorage.getItem(MX_SESSION_KEY);
  const auth = loadAuth();
  if (!stored || !auth) return false;
  try {
    const key = await crypto.subtle.importKey('raw', b64dec(stored), { name:'AES-GCM', length:256 }, true, ['encrypt','decrypt']);
    if (await maximCreateVerifier(key) !== auth.verifier){ localStorage.removeItem(MX_SESSION_KEY); sessionStorage.removeItem(MX_SESSION_KEY); return false; }
    localStorage.setItem(MX_SESSION_KEY, stored);   // migrate/persist
    maximEncKey = key; maximAuthUser = auth.username; return true;
  } catch (e){ localStorage.removeItem(MX_SESSION_KEY); sessionStorage.removeItem(MX_SESSION_KEY); return false; }
}

function currentUsername(){ return maximAuthUser || loadAuth()?.username || ''; }
function isLoggedIn(){ return !!maximEncKey && !!currentUsername(); }
function canSync(){ const a = loadAuth(); return !!maximEncKey && !!a?.cloud && a.username === currentUsername(); }
function cloudHeaders(){ const a = loadAuth(); if (!a?.verifier || !canSync()) return {}; return { 'X-Maxim-User':a.username, 'X-Maxim-Proof':a.verifier }; }

async function cloudValueFromState(){ return { encrypted:true, algorithm:'AES-GCM', envelope: await maximEncrypt(maximEncKey, state) }; }
async function stateFromCloudValue(value){
  if (!value) return null;
  if (value.encrypted){ const env = value.envelope || value.value; if (!env?.iv || !env?.ct) throw new Error('envelope invalid'); return normalizeState(await maximDecrypt(maximEncKey, env)); }
  if (value.plan && typeof value.plan==='object') return normalizeState(value.plan);
  return null;
}

function setSync(msg){ syncStatus = msg; if (state && state.view === 'me' && typeof renderMe==='function') { const el = $('#sync-status'); if (el) el.textContent = msg; } }

async function pullCloud(seedIfEmpty){
  if (!canSync()) return;
  setSync('Syncing…');
  try {
    const res = await fetch(`${SETTINGS_API}?key=${SYNC_KEY}&user=${encodeURIComponent(currentUsername())}`, { cache:'no-store', headers:cloudHeaders() });
    if (res.ok){
      const data = await res.json();
      if (data.value){ const cloud = await stateFromCloudValue(data.value); if (cloud){ state = cloud; await persistLocal(); bumpStreak(); setSync('Synced'); render(); return; } }
      if (seedIfEmpty){ await pushCloud(true); setSync('Synced'); }
      else setSync('Using local data');
    } else if (res.status === 401) setSync('Session expired — log in again.');
    else setSync('Cloud unavailable — using local.');
  } catch (error){
    if (/decrypt|envelope/i.test(String(error.message||error))){ cloudBlocked = true; setSync("Can't decrypt cloud data with this password — sync paused."); }
    else setSync('Cloud unreachable — using local.');
  }
}
function schedulePush(){
  if (!canSync() || cloudBlocked) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushCloud().catch(()=>{}); }, 1400);
}
async function pushCloud(immediate){
  if (!canSync() || cloudBlocked) return;
  setSync('Saving…');
  try {
    const res = await fetch(SETTINGS_API, { method:'POST', headers:{ 'Content-Type':'application/json', ...cloudHeaders() }, body:JSON.stringify({ key:SYNC_KEY, user:currentUsername(), value: await cloudValueFromState() }) });
    setSync(res.ok ? 'Synced' : 'Saved locally — cloud rejected it.');
  } catch (e){ setSync('Saved locally — cloud unreachable.'); }
}

/* ---------- usage streak (daily-open; principles stay non-habit) ---------- */
function bumpStreak(){
  const t = todayKey();
  const u = state.usage || (state.usage = { last:'', streak:0, best:0 });
  if (u.last === t) return;
  u.streak = (u.last === addDaysIso(t, -1)) ? (u.streak||0)+1 : 1;
  u.last = t;
  u.best = Math.max(u.best||0, u.streak);
  save();
}

/* ---------- helpers exposed to view layer ---------- */
const getProject = (id) => state.projects.find(p => p.id === id);
const nextSub = (p) => (p.subs || []).find(s => !s.done) || null;
const progress = (p) => { const t=(p.subs||[]).length, d=(p.subs||[]).filter(s=>s.done).length; return {done:d, total:t}; };
const isAssignment = (p) => !!p.deadline;

/* ===================================================================== */
/* v0.9 — schedule / routines / diary / reminders / stats               */
/* ===================================================================== */
const nowMin = () => { const n=new Date(); return n.getHours()*60 + n.getMinutes(); };
const hhmm = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.round(m)%60).padStart(2,'0')}`;
const parseHM = (s) => { const m=/^(\d{1,2}):(\d{2})$/.exec((s||'').trim()); return m? (+m[1])*60+(+m[2]) : null; };
const DAY_START = 360, DAY_END = 1440, HOURPX = 46;
const minToPx = (m) => (m - DAY_START)/60*HOURPX;
const CATS = {
  deep:{label:'Deep work',cls:'c-deep'}, study:{label:'Study',cls:'c-study'}, admin:{label:'Admin',cls:'c-admin'},
  life:{label:'Life',cls:'c-life'}, workout:{label:'Workout',cls:'c-workout'}, reflection:{label:'Reflect',cls:'c-reflect'},
  reward:{label:'Reward',cls:'c-reward'}, rest:{label:'Rest',cls:'c-rest'},
};
const CAT_KEYS = ['deep','study','admin','life','workout','reflection','reward','rest'];

/* schedule blocks (a day's plan; blocks carry plan + optional actual) */
function blocksOn(date){ return state.blocks.filter(b => b.date===date).slice().sort((a,b)=>a.start-b.start); }
function layoutDay(items){
  items.sort((a,b)=> a.start-b.start || a.end-b.end);
  let group=[], groupEnd=-1;
  const flush=()=>{ const cols=[]; group.forEach(b=>{ let placed=false; for(let c=0;c<cols.length;c++){ if(cols[c]<=b.start){ b._col=c; cols[c]=b.end; placed=true; break; } } if(!placed){ b._col=cols.length; cols.push(b.end); } }); group.forEach(b=>b._cols=cols.length); group=[]; groupEnd=-1; };
  items.forEach(b=>{ if(group.length && b.start>=groupEnd) flush(); group.push(b); groupEnd=Math.max(groupEnd,b.end); });
  if(group.length) flush();
  return items;
}
const overlaps=(aS,aE,bS,bE)=> aS<bE && bS<aE;
function findFreeSlot(date,dur,after){ let s=Math.max(DAY_START,Math.ceil((after??DAY_START)/15)*15); while(s+dur<=DAY_END){ if(!blocksOn(date).some(b=>overlaps(s,s+dur,b.start,b.end))) return s; s+=15; } return null; }
function blockAdd(o){ const b={ id:uid('bk_'), date:o.date||state.selDate||todayKey(), start:o.start, end:o.end, title:(o.title||'Block').trim(), cat:o.cat||'deep', plan:true, status:'planned', actual:null, routine:o.routine||null, note:o.note||'' }; state.blocks.push(b); save(); render(); return b.id; }
function blockUpdate(id,patch){ const b=state.blocks.find(x=>x.id===id); if(b){ Object.assign(b,patch); save(); render(); } }
function blockCycleStatus(id){ const b=state.blocks.find(x=>x.id===id); if(!b) return; b.status = b.status==='planned'?'done':b.status==='done'?'skipped':'planned'; save(); render(); }
function blockDelete(id){ state.blocks=state.blocks.filter(x=>x.id!==id); save(); render(); }
function scheduleNext(title,dur,cat){ const date=state.selDate||todayKey(); const after=(date===todayKey())?nowMin():DAY_START; const s=findFreeSlot(date,dur||60,after); if(s==null){ flash('No free slot today'); return; } blockAdd({date,start:s,end:s+(dur||60),title,cat:cat||'deep'}); }

/* routines (recurring templates that fill a day) */
function routineAdd(o){ if(!o.title||o.start==null||o.end==null) return; state.routines.push({ id:uid('rt_'), title:o.title.trim(), cat:o.cat||'deep', days:o.days&&o.days.length?o.days:[1,2,3,4,5], start:o.start, end:o.end }); save(); render(); }
function routineDelete(id){ state.routines=state.routines.filter(x=>x.id!==id); save(); render(); }
function applyRoutinesToDay(date){
  date = date || state.selDate || todayKey();
  const wd=new Date(date+'T00:00:00').getDay();
  let added=0;
  state.routines.forEach(r=>{ if(r.days.includes(wd)){ if(!state.blocks.some(b=>b.date===date && b.routine===r.id)){ state.blocks.push({ id:uid('bk_'), date, start:r.start, end:r.end, title:r.title, cat:r.cat, plan:true, status:'planned', actual:null, routine:r.id, note:'' }); added++; } } });
  save(); render(); flash(added?`Added ${added} routine block${added===1?'':'s'}`:'Routines already in');
}

/* diary (notes + images, newest first) */
function diaryAdd(text,images){ text=(text||'').trim(); images=images||[]; if(!text && !images.length) return; state.diary.unshift({ id:uid('dy_'), at:new Date().toISOString(), text, images }); save(); render(); }
function diaryDelete(id){ state.diary=state.diary.filter(x=>x.id!==id); save(); render(); }

/* reminders — web Notification while the app is open (Capacitor LocalNotifications on device, see build note) */
function notifReady(){ return typeof Notification!=='undefined' && Notification.permission==='granted'; }
async function remindersEnable(){
  if (typeof Notification==='undefined'){ flash('Notifications not supported here'); return; }
  let perm = Notification.permission;
  if (perm!=='granted') perm = await Notification.requestPermission();
  state.reminders.enabled = (perm==='granted'); save(); render();
  flash(state.reminders.enabled?'Reminders on':'Permission denied');
}
function remindersDisable(){ state.reminders.enabled=false; save(); render(); }
function reminderTick(){
  const r=state.reminders; if(!r || !r.enabled || !notifReady()) return;
  const m=nowMin(); const from=parseHM(r.from)??540, to=parseHM(r.to)??1320;
  if(m<from || m>to) return;
  const tag=`${todayKey()}#${Math.floor(m/(r.everyMin||60))}`;
  if(r.lastFired===tag) return;
  r.lastFired=tag; save();
  try{ new Notification('Maxim', { body:'What did you get done? Log it on your schedule.', tag:'maxim-update' }); }catch(e){}
}

/* stats */
function statRange(n){ const a=[]; for(let i=n-1;i>=0;i--) a.push(addDaysIso(todayKey(),-i)); return a; }
function blockStatsOn(date){ const bs=blocksOn(date); const done=bs.filter(b=>b.status==='done'); return { total:bs.length, done:done.length, mins:done.reduce((s,b)=>s+(b.end-b.start),0) }; }
function stats(){
  const u=state.usage||{streak:0,best:0};
  return {
    streak:u.streak||0, best:u.best||0,
    principlesOn:state.principles.filter(p=>p.status==='on').length,
    projectsActive:state.projects.filter(p=>p.status==='active').length,
    todosOpen:state.todos.filter(t=>!t.done).length,
    focusToday:Math.round(blockStatsOn(todayKey()).mins/60*10)/10,
    diaryCount:state.diary.length,
    week:statRange(7).map(d=>({date:d, mins:blockStatsOn(d).mins})),
  };
}

/* ===================================================================== */
/* DATA ACTIONS  (the only things that mutate state)                     */
/* ===================================================================== */
function archivePush(type, title, payload){ state.archive.unshift({ id: uid('ar_'), type, title, payload, at: todayKey() }); }

function addInbox(text){ if(!text.trim()) return; state.inbox.unshift({ id:uid('ib_'), text:text.trim(), at:todayKey() }); save(); render(); flash('Added to Inbox'); }
function deleteInbox(id){ state.inbox = state.inbox.filter(x => x.id !== id); save(); render(); }
function inboxSkip(id){ const i=state.inbox.findIndex(x=>x.id===id); if(i>=0){ const [it]=state.inbox.splice(i,1); state.inbox.push(it); save(); render(); } }

function classifyInbox(id, type){
  const it = state.inbox.find(x => x.id === id); if (!it) return;
  const drop = () => { state.inbox = state.inbox.filter(x => x.id !== id); };
  if (type === 'principle'){ state.principles.push({ id:uid('pr_'), text:it.text, status:'on', note:'' }); drop(); save(); render(); flash('Moved to Principles'); }
  else if (type === 'tip'){ state.tips.push({ id:uid('tp_'), text:it.text, note:'' }); drop(); save(); render(); flash('Moved to Tips'); }
  else if (type === 'todo'){ state.todos.push({ id:uid('td_'), text:it.text, done:false }); drop(); save(); render(); flash('Moved to To-do'); }
  else if (type === 'someday'){ state.someday.push({ id:uid('sd_'), text:it.text, note:'' }); drop(); save(); render(); flash('Moved to Someday'); }
  else if (type === 'project'){ const pid = addProject(it.text, null); drop(); save(); render(); openDetail('project', pid); }
  else if (type === 'deadline'){ const pid = addProject(it.text, addDaysIso(todayKey(),7)); drop(); save(); render(); openDetail('project', pid); }
}

function addPrinciple(text){ if(!text.trim()) return; state.principles.push({ id:uid('pr_'), text:text.trim(), status:'on', note:'' }); save(); render(); }
function pausePrinciple(id){ const p=state.principles.find(x=>x.id===id); if(p){ p.status='paused'; save(); render(); } }
function resumePrinciple(id){ const p=state.principles.find(x=>x.id===id); if(p){ p.status='on'; save(); render(); } }
function editPrinciple(id, text){ const p=state.principles.find(x=>x.id===id); if(p && text.trim()){ p.text=text.trim(); save(); render(); } }
function setPrincipleNote(id, note){ const p=state.principles.find(x=>x.id===id); if(p){ p.note=note; save(); render(); } }
function archivePrinciple(id){ const p=state.principles.find(x=>x.id===id); if(!p) return; archivePush('principle', p.text, p); state.principles=state.principles.filter(x=>x.id!==id); save(); render(); }

/* tips — a softer sibling of principles: not required, but help when kept */
function addTip(text){ if(!text.trim()) return; state.tips.push({ id:uid('tp_'), text:text.trim(), note:'' }); save(); render(); }
function editTip(id,text){ const t=state.tips.find(x=>x.id===id); if(t && text.trim()){ t.text=text.trim(); save(); render(); } }
function setTipNote(id,note){ const t=state.tips.find(x=>x.id===id); if(t){ t.note=note; save(); render(); } }
function removeTip(id){ const t=state.tips.find(x=>x.id===id); if(!t) return; archivePush('tip', t.text, t); state.tips=state.tips.filter(x=>x.id!==id); save(); render(); }

function addTodo(text){ if(!text.trim()) return; state.todos.push({ id:uid('td_'), text:text.trim(), done:false }); save(); render(); }
function toggleTodo(id){ const t=state.todos.find(x=>x.id===id); if(!t) return; t.done=true; archivePush('todo', t.text, t); state.todos=state.todos.filter(x=>x.id!==id); save(); render(); }
function removeTodo(id){ state.todos=state.todos.filter(x=>x.id!==id); save(); render(); }

function addProject(title, deadline=null){ if(!title.trim()) return null; const id=uid('pj_'); state.projects.push({ id, title:title.trim(), deadline:deadline||null, note:'', subs:[], status:'active' }); save(); render(); return id; }
function projectSetDeadline(id, iso){ const p=getProject(id); if(p){ p.deadline=iso||null; save(); render(); } }
function projectAddSub(id, text){ const p=getProject(id); if(p && text.trim()){ p.subs.push({ id:uid('s_'), text:text.trim(), done:false }); save(); render(); } }
function toggleSub(pid, sid){ const p=getProject(pid); if(!p) return; const s=p.subs.find(x=>x.id===sid); if(s){ s.done=!s.done; save(); render(); } }
function removeSub(pid, sid){ const p=getProject(pid); if(p){ p.subs=p.subs.filter(x=>x.id!==sid); save(); render(); } }
function setProjectNote(id, note){ const p=getProject(id); if(p){ p.note=note; save(); render(); } }
function archiveProject(id){ const p=getProject(id); if(!p) return; archivePush(p.deadline?'assignment':'project', p.title, p); state.projects=state.projects.filter(x=>x.id!==id); save(); render(); }

function addSomeday(text){ if(!text.trim()) return; state.someday.push({ id:uid('sd_'), text:text.trim(), note:'' }); save(); render(); }
function somedayToTodo(id){ const s=state.someday.find(x=>x.id===id); if(!s) return; state.todos.push({ id:uid('td_'), text:s.text, done:false }); state.someday=state.someday.filter(x=>x.id!==id); save(); render(); flash('Moved to To-do'); }
function somedayToProject(id){ const s=state.someday.find(x=>x.id===id); if(!s) return; const pid=addProject(s.text,null); state.someday=state.someday.filter(x=>x.id!==id); save(); render(); openDetail('project', pid); }
function archiveSomeday(id){ const s=state.someday.find(x=>x.id===id); if(!s) return; archivePush('someday', s.text, s); state.someday=state.someday.filter(x=>x.id!==id); save(); render(); }

function restore(arId){
  const a = state.archive.find(x=>x.id===arId); if(!a) return;
  const p = a.payload;
  if (a.type==='todo'){ p.done=false; state.todos.push(p); }
  else if (a.type==='principle'){ state.principles.push(p); }
  else if (a.type==='someday'){ state.someday.push(p); }
  else if (a.type==='tip'){ state.tips.push(p); }
  else { state.projects.push(p); }
  state.archive = state.archive.filter(x=>x.id!==arId); save(); render(); flash('Restored');
}
function deleteArchive(id){ state.archive=state.archive.filter(x=>x.id!==id); save(); render(); }

/* ===================================================================== */
/* OVERLAYS + VIEW                                                       */
/* ===================================================================== */
function showOverlay(id){ const el=$('#'+id); if(el) el.classList.add('open'); }
function closeOverlay(id){ const el=$('#'+id); if(el) el.classList.remove('open'); }
function openCapture(){ if (typeof renderCapture==='function'){ renderCapture(); showOverlay('capture'); } }
function openSort(){ if (typeof renderSort==='function'){ renderSort(); showOverlay('sortflow'); } }
function openDetail(kind, id){ if (typeof renderDetail==='function'){ renderDetail(kind, id); showOverlay('detail'); } }
function openBlockSheet(id){ if (typeof renderBlockSheet==='function'){ renderBlockSheet(id); showOverlay('blocksheet'); } }
function openRoutines(){ if (typeof renderRoutines==='function'){ renderRoutines(); showOverlay('routinesheet'); } }
function openDiaryComposer(){ if (typeof renderDiaryComposer==='function'){ renderDiaryComposer(); showOverlay('diarycomposer'); } }
function openDiaryView(id){ if (typeof renderDiaryView==='function'){ renderDiaryView(id); showOverlay('diaryview'); } }

function applyView(){
  $$('.view').forEach(v => v.classList.toggle('on', v.dataset.view === state.view));
  $$('.tabbar .tab').forEach(t => t.classList.toggle('on', t.dataset.view === state.view));
}
function setView(v){ state.view=v; save(); applyView(); const sc=$('#scroll'); if(sc) sc.scrollTop=0; }

/* ---------- flash (quiet, brief) ---------- */
let flashTimer=null;
function flash(msg){ const el=$('#flash'); if(!el) return; el.textContent=msg; el.classList.add('on'); clearTimeout(flashTimer); flashTimer=setTimeout(()=>el.classList.remove('on'), 1900); }

/* ---------- render dispatcher ---------- */
function render(){
  if (typeof renderHome==='function') renderHome();
  if (typeof renderSchedule==='function') renderSchedule();
  if (typeof renderTimeline==='function') renderTimeline();
  if (typeof renderDiary==='function') renderDiary();
  if (typeof renderItems==='function') renderItems();
  if (typeof renderMe==='function') renderMe();
  applyView();
}

/* ---------- auto-update: reload when a new deploy is detected ---------- */
let __bootSig = null;
async function fetchSig(){
  try {
    const r = await fetch('version.json?t=' + Math.floor(Date.now()/30000), { cache:'no-store' });
    if (r.ok){ const j = await r.json().catch(()=>null); if (j && j.build != null) return 'v:' + j.build; }
  } catch(e){}
  try { const r = await fetch('app-views.js', { method:'HEAD', cache:'no-store' }); const tag = r.headers.get('etag') || r.headers.get('last-modified'); if (tag) return 'e:' + tag; } catch(e){}
  return null;
}
async function checkUpdate(){
  const sig = await fetchSig();
  if (sig == null) return;
  if (__bootSig == null){ __bootSig = sig; return; }
  if (sig !== __bootSig){
    const busy = document.querySelector('.overlay.open') || (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName));
    if (busy){ flash('New version ready — reopen to update'); return; }
    flash('Updating…');
    setTimeout(() => { try { location.reload(); } catch(e){} }, 700);
  }
}

/* ===================================================================== */
/* INIT                                                                  */
/* ===================================================================== */
async function init(){
  await trySessionRestore();
  await bootLoad();
  bumpStreak();
  render();
  if (canSync()) pullCloud();
  checkUpdate();
  setInterval(checkUpdate, 5*60*1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });
  $('#tabbar').addEventListener('click', e => { const b=e.target.closest('[data-view]'); if(b) setView(b.dataset.view); });
  $('#fab').addEventListener('click', onFab);
  $$('.overlay').forEach(el => el.addEventListener('click', e => { if(e.target===el) el.classList.remove('open'); }));
  // reminders + live now-line on the schedule
  setInterval(() => { reminderTick(); if (state.view==='schedule' && typeof renderSchedule==='function') renderSchedule(); }, 30000);
}
/* the FAB is contextual: capture on most screens, a new diary entry on Diary, a new block on Schedule */
function onFab(){
  if (state.view==='diary' && typeof openDiaryComposer==='function') return openDiaryComposer();
  if (state.view==='schedule' && typeof openBlockSheet==='function') return openBlockSheet();
  openCapture();
}
document.addEventListener('DOMContentLoaded', init);

/* =====================================================================
   PAGE VIEW FUNCTIONS  (appended below — one block per page)
   ===================================================================== */

/* ---------- HOME ---------- */
function hmSec(t, extra){ return `<div class="hm-sec"><span>${t}</span>${extra?`<em>${extra}</em>`:''}</div>`; }
function renderHome(){
  const root = $('#v-home');
  const WD = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const MO = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const now = new Date();
  const dateLabel = `${WD[now.getDay()]} · ${MO[now.getMonth()]} ${now.getDate()}`;
  const u = state.usage || { streak:0 };
  const streakBit = (u.streak||0) > 0 ? ` · ${u.streak}-DAY STREAK` : '';
  let html = '';

  // painting hero — canvas + scrim + wordmark
  html += `
    <div class="hm-hero">
      <img class="hm-img" src="assets/friedrich.jpg" alt="Wanderer above the Sea of Fog"/>
      <div class="hm-scrim"></div>
      <div class="hm-cap">
        <div class="hm-ey">${dateLabel}${streakBit}</div>
        <h2>Maxim</h2>
      </div>
    </div>`;

  // 留意 (nearest assignment deadlines, up to 2)
  const atts = state.projects.filter(p => isAssignment(p)).sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline)).slice(0,2);
  if (atts.length){
    html += hmSec('Due') + '<div class="hm-list">';
    atts.forEach(p => { const soon = daysUntil(p.deadline)<=2?' hm-soon':''; html += `<div class="hm-att${soon}" data-proj="${p.id}"><span>${escapeHtml(p.title)}</span><em>${escapeHtml(fmtDeadline(p.deadline))}</em></div>`; });
    html += '</div>';
  }

  // Principles (on, up to 4) — the dark "rock" you stand on
  const prins = state.principles.filter(p=>p.status==='on').slice(0,4);
  if (prins.length){
    html += hmSec('Principles') + '<div class="hm-rocks">';
    prins.forEach(p => html += `<div class="hm-rock" data-prin="${p.id}"><span class="hm-rock-dot"></span><span class="hm-rock-t">${escapeHtml(p.text)}</span></div>`);
    html += '</div>';
  }

  // Tips (soft, optional — lighter than principles)
  const tips = state.tips.slice(0,3);
  if (tips.length){
    html += hmSec('Tips') + '<div class="hm-tips">';
    tips.forEach(t => html += `<div class="hm-tip" data-tip="${t.id}"><span class="hm-tip-dot"></span><span class="hm-tip-t">${escapeHtml(t.text)}</span></div>`);
    html += '</div>';
  }

  // To-do (open, up to 3)
  const todos = state.todos.filter(t=>!t.done).slice(0,3);
  html += hmSec('To-do');
  if (todos.length){ html += '<div class="hm-list">'; todos.forEach(t => html += `<div class="hm-todo"><button class="hm-check" data-todo="${t.id}" aria-label="done"></button><span>${escapeHtml(t.text)}</span></div>`); html += '</div>'; }
  else html += '<div class="empty">Nothing to do.</div>';

  // In progress (projects without deadline, up to 2)
  const projs = state.projects.filter(p=>!isAssignment(p)).slice(0,2);
  if (projs.length){
    html += hmSec('In progress') + '<div class="hm-list">';
    projs.forEach(p => { const pr=progress(p); const ns=nextSub(p); const pct=pr.total?Math.round(pr.done/pr.total*100):0; html += `<div class="hm-proj" data-proj="${p.id}"><div class="hm-proj-t"><span>${escapeHtml(p.title)}</span><em>${pr.done}/${pr.total}</em></div><div class="hm-pbar"><i style="width:${pct}%"></i></div><div class="hm-proj-n">Next — ${escapeHtml(ns?ns.text:'set a next step')}</div></div>`; });
    html += '</div>';
  }

  root.innerHTML = html;
  $$('.hm-att', root).forEach(el => el.addEventListener('click', () => openDetail('project', el.dataset.proj)));
  $$('.hm-proj', root).forEach(el => el.addEventListener('click', () => openDetail('project', el.dataset.proj)));
  $$('.hm-rock', root).forEach(el => el.addEventListener('click', () => openDetail('principle', el.dataset.prin)));
  $$('.hm-tip', root).forEach(el => el.addEventListener('click', () => openDetail('tip', el.dataset.tip)));
  $$('.hm-check', root).forEach(el => el.addEventListener('click', e => { e.stopPropagation(); toggleTodo(el.dataset.todo); }));
  const hero = $('.hm-hero', root); if (hero){ hero.style.cursor='pointer'; hero.setAttribute('title','You · stats'); hero.addEventListener('click', () => setView('me')); }
}

/* ---------- INBOX + CAPTURE + SORT ---------- */
function renderInbox() {
  const root = $('#v-inbox');
  const n = state.inbox.length;
  let html = '';
  html += '<header class="viewhead"><h1>Inbox</h1></header>';
  if (n) {
    html += '<div class="ib-bar">';
    html += '<span class="ib-count">' + n + ' unsorted</span>';
    html += '<button class="ib-tidy" type="button">Sort</button>';
    html += '</div>';
    html += '<div class="ib-list">';
    for (const item of state.inbox) html += ibCard(item);
    html += '</div>';
  } else {
    html += '<div class="empty">Nothing here yet.</div>';
  }
  root.innerHTML = html;
  const tidy = $('.ib-tidy', root);
  if (tidy) tidy.addEventListener('click', () => openSort());
  $$('.ib-card', root).forEach((card) => {
    const id = card.dataset.id;
    $$('.ib-acts [data-type]', card).forEach((btn) => btn.addEventListener('click', () => classifyInbox(id, btn.dataset.type)));
    const del = $('.del', card);
    if (del) del.addEventListener('click', () => deleteInbox(id));
  });
}
function ibCard(item) {
  return '<div class="ib-card" data-id="' + escapeHtml(String(item.id)) + '">' +
      '<button class="del" type="button" aria-label="delete">✕</button>' +
      '<div class="ib-card-text">' + escapeHtml(item.text) + '</div>' +
      ibActs('ib-acts') + '</div>';
}
function ibActs(cls) {
  const types = [['principle','Principle'],['tip','Tip'],['todo','To-do'],['project','Project'],['someday','Someday'],['deadline','+ Deadline']];
  let h = '<div class="' + cls + '">';
  for (const [type, label] of types) h += '<button class="ib-pill" type="button" data-type="' + type + '">' + label + '</button>';
  return h + '</div>';
}
function renderCapture() {
  const root = $('#capture');
  let html = '<div class="sheet">';
  html += '<div class="grip"></div>';
  html += '<h4>Capture</h4>';
  html += '<textarea class="cap-text" placeholder="Write it down…"></textarea>';
  html += '<button class="cap-save" type="button">Add to Inbox</button>';
  html += '<div class="cap-or">or file as</div>';
  html += '<div class="cap-chips">';
  html += '<button class="cap-chip" type="button" data-act="principle">Principle</button>';
  html += '<button class="cap-chip" type="button" data-act="tip">Tip</button>';
  html += '<button class="cap-chip" type="button" data-act="todo">To-do</button>';
  html += '<button class="cap-chip" type="button" data-act="project">Project</button>';
  html += '<button class="cap-chip" type="button" data-act="someday">Someday</button>';
  html += '<button class="cap-chip" type="button" data-act="deadline">+ Deadline</button>';
  html += '</div></div>';
  root.innerHTML = html;
  $('.cap-save', root).addEventListener('click', () => { addInbox($('.cap-text', root).value); closeOverlay('capture'); });
  $$('.cap-chip', root).forEach((chip) => {
    chip.addEventListener('click', () => {
      const t = $('.cap-text', root).value.trim();
      if (!t) { closeOverlay('capture'); return; }
      switch (chip.dataset.act) {
        case 'principle': addPrinciple(t); closeOverlay('capture'); flash('Saved'); break;
        case 'tip': addTip(t); closeOverlay('capture'); flash('Saved'); break;
        case 'todo': addTodo(t); closeOverlay('capture'); flash('Saved'); break;
        case 'someday': addSomeday(t); closeOverlay('capture'); flash('Saved'); break;
        case 'project': { const id = addProject(t, null); closeOverlay('capture'); openDetail('project', id); break; }
        case 'deadline': { const id = addProject(t, addDaysIso(todayKey(), 7)); closeOverlay('capture'); openDetail('project', id); break; }
      }
    });
  });
  setTimeout(() => { const ta = $('.cap-text', root); if (ta) { ta.value = ''; ta.focus(); } }, 50);
}
function renderSort() {
  const root = $('#sortflow');
  let html = '';
  if (!state.inbox.length) {
    html += '<div class="sheet"><div class="grip"></div>';
    html += '<div class="sort-empty">All sorted.</div>';
    html += '<button class="sort-done" type="button">Done</button></div>';
    root.innerHTML = html;
    const done = $('.sort-done', root); if (done) done.addEventListener('click', () => closeOverlay('sortflow'));
    return;
  }
  const it = state.inbox[0];
  html += '<div class="sheet"><div class="grip"></div>';
  html += '<button class="sort-x" type="button" aria-label="close">✕</button>';
  html += '<div class="sort-left">' + state.inbox.length + ' left</div>';
  html += '<div class="sort-text">' + escapeHtml(it.text) + '</div>';
  html += '<div class="sort-acts">';
  html += '<button class="sort-pill" type="button" data-type="principle">Principle</button>';
  html += '<button class="sort-pill" type="button" data-type="tip">Tip</button>';
  html += '<button class="sort-pill" type="button" data-type="todo">To-do</button>';
  html += '<button class="sort-pill" type="button" data-type="project">Project</button>';
  html += '<button class="sort-pill" type="button" data-type="someday">Someday</button>';
  html += '<button class="sort-pill" type="button" data-type="deadline">+ Deadline</button>';
  html += '</div>';
  html += '<div class="sort-minor"><button class="sort-skip" type="button">Skip</button><button class="sort-del" type="button">Delete</button></div>';
  html += '</div>';
  root.innerHTML = html;
  $$('.sort-acts [data-type]', root).forEach((btn) => btn.addEventListener('click', () => { classifyInbox(it.id, btn.dataset.type); renderSort(); }));
  $('.sort-skip', root).addEventListener('click', () => { inboxSkip(it.id); renderSort(); });
  $('.sort-del', root).addEventListener('click', () => { deleteInbox(it.id); renderSort(); });
  $('.sort-x', root).addEventListener('click', () => closeOverlay('sortflow'));
}

/* ---------- ITEMS + DETAIL ---------- */
function renderItems() {
  const root = $('#v-items');
  const prins = state.principles;
  const prinRows = prins.length
    ? prins.map(p => `
      <div class="it-prin${p.status === 'paused' ? ' it-muted' : ''}" data-id="${p.id}">
        <span class="it-prin-text">${escapeHtml(p.text)}</span>
        <span class="it-tag ${p.status === 'paused' ? 'it-tag-paused' : 'it-tag-on'}">${p.status === 'paused' ? 'Paused' : 'On'}</span>
      </div>`).join('')
    : `<div class="empty">No principles yet.</div>`;

  const tipRows = state.tips.length
    ? state.tips.map(t => `<div class="it-tip" data-id="${t.id}"><span class="it-tip-dot"></span><span class="it-tip-text">${escapeHtml(t.text)}</span></div>`).join('')
    : `<div class="empty">No tips yet.</div>`;

  const todos = state.todos;
  const todoRows = todos.length
    ? todos.map(t => `
      <div class="it-todo${t.done ? ' it-done' : ''}" data-id="${t.id}">
        <button class="it-check${t.done ? ' on' : ''}" data-act="toggle-todo" data-id="${t.id}" aria-label="done"></button>
        <span class="it-todo-text">${escapeHtml(t.text)}</span>
        <button class="del" data-act="rm-todo" data-id="${t.id}" aria-label="delete">×</button>
      </div>`).join('')
    : `<div class="empty">Nothing here.</div>`;

  const projects = state.projects.filter(p => p.status === 'active' && !isAssignment(p));
  const projRows = projects.length
    ? projects.map(p => {
        const pr = progress(p); const pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0; const full = pr.total > 0 && pr.done === pr.total;
        return `
        <div class="it-proj" data-id="${p.id}">
          <div class="it-proj-top"><span class="it-proj-title">${escapeHtml(p.title)}</span><span class="it-frac">${pr.done}/${pr.total}</span></div>
          <div class="it-bar"><i class="${full ? 'full' : ''}" style="width:${pct}%"></i></div>
        </div>`;
      }).join('')
    : `<div class="empty">No projects yet.</div>`;

  const asgs = state.projects.filter(p => p.status === 'active' && isAssignment(p)).sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline));
  const asgRows = asgs.length
    ? asgs.map(p => {
        const soon = daysUntil(p.deadline) <= 2;
        return `
        <div class="it-asg" data-id="${p.id}">
          <span class="it-asg-title">${escapeHtml(p.title)}</span>
          <span class="it-deadline${soon ? ' it-soon' : ''}">${escapeHtml(fmtDeadline(p.deadline))}</span>
        </div>`;
      }).join('')
    : `<div class="empty">Nothing due.</div>`;

  const sds = state.someday;
  const sdRows = sds.length
    ? sds.map(s => `
      <div class="it-sd" data-id="${s.id}">
        <span class="it-sd-text">${escapeHtml(s.text)}</span>
        <div class="it-sd-acts">
          <button class="it-mini" data-act="sd-today" data-id="${s.id}">Today</button>
          <button class="it-mini" data-act="sd-proj" data-id="${s.id}">Project</button>
          <button class="del" data-act="sd-arch" data-id="${s.id}" aria-label="archive">×</button>
        </div>
      </div>`).join('')
    : `<div class="empty">Nothing here yet.</div>`;

  root.innerHTML = `
    <header class="viewhead"><h1>Items</h1></header>
    ${state.inbox.length ? `<section class="it-block"><div class="sec"><div class="l"><h3>Inbox</h3><span class="count">${state.inbox.length}</span></div><button class="ib-tidy" id="it-sort" type="button">Sort</button></div><div class="ib-list">${state.inbox.map(ibCard).join('')}</div></section>` : ''}
    <section class="it-block">
      <div class="sec"><div class="l"><h3>Principles</h3><span class="count">${prins.length}</span></div></div>
      <div class="it-list">${prinRows}</div>
      <div class="addrow"><input type="text" placeholder="Add a principle" data-add="prin"><button data-add-btn="prin">＋</button></div>
    </section>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>Tips</h3><span class="count">${state.tips.length}</span></div><span class="hint">optional, but they help</span></div>
      <div class="it-list">${tipRows}</div>
      <div class="addrow"><input type="text" placeholder="Add a tip" data-add="tip"><button data-add-btn="tip">＋</button></div>
    </section>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>To-do</h3><span class="count">${todos.length}</span></div></div>
      <div class="it-list">${todoRows}</div>
      <div class="addrow"><input type="text" placeholder="Add a to-do" data-add="todo"><button data-add-btn="todo">＋</button></div>
    </section>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>Projects</h3><span class="count">${projects.length}</span></div></div>
      <div class="it-list">${projRows}</div>
      <div class="addrow"><input type="text" placeholder="New project" data-add="proj"><button data-add-btn="proj">＋</button></div>
    </section>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>Assignments</h3><span class="count">${asgs.length}</span></div></div>
      <div class="it-list">${asgRows}</div>
      <div class="addrow"><input type="text" placeholder="New, with a deadline" data-add="asg"><button data-add-btn="asg">＋</button></div>
    </section>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>Someday</h3><span class="count">${sds.length}</span></div></div>
      <div class="it-list">${sdRows}</div>
      <div class="addrow"><input type="text" placeholder="Someday…" data-add="sd"><button data-add-btn="sd">＋</button></div>
    </section>`;

  const wireAdd = (key, fn) => {
    const input = root.querySelector(`[data-add="${key}"]`);
    const btn = root.querySelector(`[data-add-btn="${key}"]`);
    if (!input || !btn) return;
    const go = () => { const v = input.value.trim(); if (!v) return; input.value = ''; fn(v); };
    btn.addEventListener('click', go);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  };
  wireAdd('prin', v => addPrinciple(v));
  wireAdd('tip', v => addTip(v));
  wireAdd('todo', v => addTodo(v));
  wireAdd('proj', v => addProject(v, null));
  wireAdd('asg', v => { const id = addProject(v, addDaysIso(todayKey(), 7)); openDetail('project', id); });
  wireAdd('sd', v => addSomeday(v));

  root.querySelectorAll('.it-prin').forEach(el => el.addEventListener('click', () => openDetail('principle', el.dataset.id)));
  root.querySelectorAll('.it-tip').forEach(el => el.addEventListener('click', () => openDetail('tip', el.dataset.id)));
  root.querySelectorAll('.it-proj, .it-asg').forEach(el => el.addEventListener('click', () => openDetail('project', el.dataset.id)));
  root.querySelectorAll('[data-act="toggle-todo"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); toggleTodo(el.dataset.id); }));
  root.querySelectorAll('[data-act="rm-todo"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); removeTodo(el.dataset.id); }));
  root.querySelectorAll('[data-act="sd-today"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); somedayToTodo(el.dataset.id); }));
  root.querySelectorAll('[data-act="sd-proj"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); somedayToProject(el.dataset.id); }));
  root.querySelectorAll('[data-act="sd-arch"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); archiveSomeday(el.dataset.id); }));
  const itSort = root.querySelector('#it-sort'); if (itSort) itSort.addEventListener('click', () => openSort());
  root.querySelectorAll('.ib-card').forEach(card => { const id = card.dataset.id; card.querySelectorAll('.ib-acts [data-type]').forEach(btn => btn.addEventListener('click', () => classifyInbox(id, btn.dataset.type))); const del = card.querySelector('.del'); if (del) del.addEventListener('click', () => deleteInbox(id)); });
}

function renderDetail(kind, id) {
  const root = $('#detail');
  if (kind === 'principle') {
    const p = state.principles.find(x => x.id === id);
    if (!p) { closeOverlay('detail'); return; }
    const paused = p.status === 'paused';
    root.innerHTML = `
      <div class="sheet dt-sheet">
        <div class="grip"></div>
        <div class="dt-head"><span class="dt-kind">Principle</span><button class="dt-close" data-act="close">Done</button></div>
        <input class="dt-title" value="${escapeHtml(p.text)}">
        <div class="dt-status ${paused ? 'paused' : 'on'}">${paused ? 'Paused' : 'On'}</div>
        <textarea class="dt-note" placeholder="Why this one? (optional)">${escapeHtml(p.note || '')}</textarea>
        <div class="dt-actions">
          ${paused ? `<button class="dt-btn" data-act="resume">Resume</button>` : `<button class="dt-btn" data-act="pause">Pause</button>`}
          <button class="dt-btn dt-ghost" data-act="archive">Archive</button>
        </div>
      </div>`;
    root.querySelector('[data-act="close"]').addEventListener('click', () => closeOverlay('detail'));
    root.querySelector('.dt-title').addEventListener('change', function () { const v = this.value.trim(); if (v) editPrinciple(id, v); });
    root.querySelector('.dt-note').addEventListener('change', function () { setPrincipleNote(id, this.value); });
    const pauseBtn = root.querySelector('[data-act="pause"]'); if (pauseBtn) pauseBtn.addEventListener('click', () => { pausePrinciple(id); renderDetail('principle', id); });
    const resumeBtn = root.querySelector('[data-act="resume"]'); if (resumeBtn) resumeBtn.addEventListener('click', () => { resumePrinciple(id); renderDetail('principle', id); });
    root.querySelector('[data-act="archive"]').addEventListener('click', () => { archivePrinciple(id); closeOverlay('detail'); });
    return;
  }
  if (kind === 'tip') {
    const t = state.tips.find(x => x.id === id);
    if (!t) { closeOverlay('detail'); return; }
    root.innerHTML = `
      <div class="sheet dt-sheet">
        <div class="grip"></div>
        <div class="dt-head"><span class="dt-kind">Tip</span><button class="dt-close" data-act="close">Done</button></div>
        <input class="dt-title" value="${escapeHtml(t.text)}">
        <div class="dt-tipnote">A gentle nudge — not required, but things go smoother when you keep it.</div>
        <textarea class="dt-note" placeholder="Why it helps (optional)">${escapeHtml(t.note || '')}</textarea>
        <div class="dt-actions"><button class="dt-btn dt-ghost" data-act="remove">Remove</button></div>
      </div>`;
    root.querySelector('[data-act="close"]').addEventListener('click', () => closeOverlay('detail'));
    root.querySelector('.dt-title').addEventListener('change', function(){ const v=this.value.trim(); if(v) editTip(id, v); });
    root.querySelector('.dt-note').addEventListener('change', function(){ setTipNote(id, this.value); });
    root.querySelector('[data-act="remove"]').addEventListener('click', () => { removeTip(id); closeOverlay('detail'); });
    return;
  }
  if (kind === 'project') {
    const p = getProject(id);
    if (!p) { closeOverlay('detail'); return; }
    const asg = isAssignment(p); const pr = progress(p); const pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0; const full = pr.total > 0 && pr.done === pr.total; const next = nextSub(p);
    const subRows = (p.subs && p.subs.length)
      ? p.subs.map(s => `
        <div class="dt-sub${s.done ? ' done' : ''}" data-sid="${s.id}">
          <button class="dt-check${s.done ? ' on' : ''}" data-act="toggle-sub" data-sid="${s.id}" aria-label="done"></button>
          <span class="dt-sub-text">${escapeHtml(s.text)}</span>
          <button class="del" data-act="rm-sub" data-sid="${s.id}" aria-label="delete">×</button>
        </div>`).join('')
      : `<div class="empty">No steps yet.</div>`;
    const doneBanner = full ? `
      <div class="dt-done">
        <div class="dt-done-msg">Looks done.</div>
        <div class="dt-done-acts"><button class="dt-btn" data-act="done-archive">Archive</button><button class="dt-btn dt-ghost" data-act="done-keep">Keep going</button></div>
      </div>` : '';
    root.innerHTML = `
      <div class="sheet dt-sheet">
        <div class="grip"></div>
        <div class="dt-head"><span class="dt-kind">${asg ? 'Assignment' : 'Project'}</span><button class="dt-close" data-act="close">Done</button></div>
        <h3 class="dt-ptitle">${escapeHtml(p.title)}</h3>
        <div class="dt-type">${asg ? 'Due ' + escapeHtml(fmtDeadline(p.deadline)) : 'No deadline'}</div>
        <div class="dt-progress"><div class="it-bar"><i class="${full ? 'full' : ''}" style="width:${pct}%"></i></div><span class="it-frac">${pr.done}/${pr.total}</span></div>
        <div class="dt-next">Next — ${escapeHtml(next ? next.text : 'set a next step')}</div>
        ${doneBanner}
        <div class="dt-subs">${subRows}</div>
        <div class="addrow"><input type="text" placeholder="Add a step" data-add="sub"><button data-add-btn="sub">＋</button></div>
        <textarea class="dt-note" placeholder="Notes (optional)">${escapeHtml(p.note || '')}</textarea>
        <div class="dt-date-row"><label class="dt-date-lbl">Due</label><input type="date" class="dt-date" value="${p.deadline || ''}">${p.deadline ? `<button class="dt-btn dt-ghost dt-sm" data-act="rm-deadline">Remove deadline</button>` : ''}</div>
        <div class="dt-actions"><button class="dt-btn dt-ghost" data-act="archive">Archive</button></div>
      </div>`;
    root.querySelector('[data-act="close"]').addEventListener('click', () => closeOverlay('detail'));
    root.querySelectorAll('[data-act="toggle-sub"]').forEach(el => el.addEventListener('click', () => { toggleSub(id, el.dataset.sid); renderDetail('project', id); }));
    root.querySelectorAll('[data-act="rm-sub"]').forEach(el => el.addEventListener('click', () => { removeSub(id, el.dataset.sid); renderDetail('project', id); }));
    const subInput = root.querySelector('[data-add="sub"]'); const subBtn = root.querySelector('[data-add-btn="sub"]');
    const addSub = () => { const v = subInput.value.trim(); if (!v) return; subInput.value = ''; projectAddSub(id, v); renderDetail('project', id); };
    subBtn.addEventListener('click', addSub); subInput.addEventListener('keydown', e => { if (e.key === 'Enter') addSub(); });
    root.querySelector('.dt-note').addEventListener('change', function () { setProjectNote(id, this.value); });
    root.querySelector('.dt-date').addEventListener('change', function () { projectSetDeadline(id, this.value || null); renderDetail('project', id); });
    const rmDl = root.querySelector('[data-act="rm-deadline"]'); if (rmDl) rmDl.addEventListener('click', () => { projectSetDeadline(id, null); renderDetail('project', id); });
    root.querySelector('[data-act="archive"]').addEventListener('click', () => { archiveProject(id); closeOverlay('detail'); });
    const dA = root.querySelector('[data-act="done-archive"]'); if (dA) dA.addEventListener('click', () => { archiveProject(id); closeOverlay('detail'); });
    const dK = root.querySelector('[data-act="done-keep"]'); if (dK) dK.addEventListener('click', () => closeOverlay('detail'));
    return;
  }
}

/* ---------- CALENDAR (week strip + day agenda) ---------- */
function keyOfDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function renderCalendar(){
  const root = $('#v-calendar'); if (!root) return;
  const sel = state.selDate || todayKey();
  const base = new Date(sel + 'T00:00:00');
  const dow = (base.getDay()+6)%7;
  const mon = new Date(base); mon.setDate(base.getDate()-dow);
  const WD = ['M','T','W','T','F','S','S'];
  const WDF = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const MOC = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = []; for (let i=0;i<7;i++){ const d=new Date(mon); d.setDate(mon.getDate()+i); days.push(keyOfDate(d)); }

  // assignments due, by day
  const dueOn = (k) => state.projects.filter(p => isAssignment(p) && p.deadline === k);

  let strip = '<div class="cal-week">';
  days.forEach((k, i) => {
    const d = new Date(k+'T00:00:00');
    const selCls = k===sel?' sel':''; const todCls = k===todayKey()?' tdy':''; const has = dueOn(k).length?' has':'';
    strip += `<button class="cal-day${selCls}${todCls}${has}" data-day="${k}"><span class="cal-wd">${WD[i]}</span><span class="cal-num">${d.getDate()}</span><span class="cal-pip"></span></button>`;
  });
  strip += '</div>';

  const selD = new Date(sel+'T00:00:00');
  const dayLabel = `${WDF[(selD.getDay()+6)%7]}, ${MOC[selD.getMonth()]} ${selD.getDate()}`;
  const items = dueOn(sel).slice().sort((a,b)=>0);

  let agenda = `<div class="cal-dayhead">${dayLabel}${sel===todayKey()?' · Today':''}</div>`;
  if (items.length){
    agenda += '<div class="cal-agenda">';
    items.forEach(p => { const pr=progress(p); const soon=daysUntil(p.deadline)<=2?' cal-soon':''; agenda += `<div class="cal-item${soon}" data-proj="${p.id}"><span class="cal-rail"></span><div class="cal-item-b"><div class="cal-item-t">${escapeHtml(p.title)}</div><div class="cal-item-m">Due · ${pr.done}/${pr.total}</div></div></div>`; });
    agenda += '</div>';
  } else {
    agenda += '<div class="empty">Nothing due.</div>';
  }

  root.innerHTML = `<header class="viewhead"><h1>Calendar</h1></header>` + strip + agenda;
  $$('.cal-day', root).forEach(el => el.addEventListener('click', () => { state.selDate = el.dataset.day; save(); renderCalendar(); }));
  $$('.cal-item', root).forEach(el => el.addEventListener('click', () => openDetail('project', el.dataset.proj)));
}

/* ---------- ME (account + sync + streak + painting + archive) ---------- */
function renderMe(){
  const root = $('#v-me'); if (!root) return;
  const u = state.usage || { streak:0, best:0 };
  const logged = isLoggedIn();
  const uname = currentUsername();

  let acc;
  if (logged){
    acc = `<div class="me-card me-acc">
      <div class="me-acc-top"><div><div class="me-acc-u">${escapeHtml(uname)}</div><div class="me-acc-s" id="sync-status">${escapeHtml(syncStatus||'Signed in · synced')}</div></div>
      <button class="me-btn ghost" id="logout">Log out</button></div></div>`;
  } else {
    acc = `<div class="me-card me-acc">
      <h4>Account <span>End-to-end encrypted sync</span></h4>
      <input class="me-in" id="ac-user" placeholder="Username" autocapitalize="off" />
      <input class="me-in" id="ac-pass" type="password" placeholder="Password" />
      <div class="me-acc-btns"><button class="me-btn" id="do-login">Log in</button><button class="me-btn ghost" id="do-register">Sign up</button></div>
      <div class="me-hint">Your password never leaves this device. Sign in on another device to sync.</div></div>`;
  }

  const streak = `<div class="me-card me-streak"><div class="me-stat"><b>${u.streak||0}</b><span>day streak</span></div><div class="me-stat"><b>${u.best||0}</b><span>best</span></div></div>`;

  const profile = `<div class="me-card"><h4>Name</h4><input class="me-in" id="me-name" value="${escapeHtml(state.name||'')}" maxlength="24" /></div>`;

  const painting = `<div class="me-card me-paint">
    <img src="assets/friedrich.jpg" alt="Wanderer above the Sea of Fog"/>
    <div class="me-paint-cap"><div>Wanderer above the Sea of Fog</div><div class="me-paint-sub">Caspar David Friedrich · 1818</div></div>
  </div>`;

  const items = state.archive || [];
  const archive = `<div class="me-card"><h4>Archive <span>${items.length}</span></h4>` +
    (items.length ? '<div class="arc-list">' + items.map(arcCard).join('') + '</div>' : '<div class="empty">Nothing archived yet.</div>') +
    '</div>';

  root.innerHTML = `<header class="viewhead"><h1>You</h1></header>` + acc + streak + profile + painting + archive;

  // wire
  if (logged){ $('#logout').addEventListener('click', accountLogout); }
  else {
    const doAuth = async (fn) => {
      const user = $('#ac-user').value, pass = $('#ac-pass').value;
      if (!pass){ flash('Enter a password'); return; }
      flash('Working…');
      const r = await fn(user, pass);
      if (r.ok){ flash('Done'); render(); } else { flash(r.error || 'Failed'); }
    };
    $('#do-login').addEventListener('click', () => doAuth(accountLogin));
    $('#do-register').addEventListener('click', () => doAuth(accountRegister));
  }
  const nameEl = $('#me-name'); if (nameEl) nameEl.addEventListener('change', () => { state.name = nameEl.value.trim() || 'You'; save(); renderHome(); });
  $$('.arc-restore', root).forEach(btn => btn.addEventListener('click', () => restore(btn.getAttribute('data-id'))));
  $$('.arc-card .del', root).forEach(btn => btn.addEventListener('click', () => deleteArchive(btn.getAttribute('data-id'))));
}
function arcTypeLabel(type){
  switch(type){ case 'todo': return 'To-do'; case 'principle': return 'Principle'; case 'project': return 'Project'; case 'assignment': return 'Assignment'; case 'someday': return 'Someday'; default: return 'Item'; }
}
function arcCard(entry){
  const id = escapeHtml(String(entry.id));
  return '<article class="arc-card"><div class="arc-main"><div class="arc-meta">' +
    '<span class="arc-tag">' + escapeHtml(arcTypeLabel(entry.type)) + '</span>' +
    '<span class="arc-date">' + escapeHtml(entry.at || '') + '</span></div>' +
    '<div class="arc-title">' + escapeHtml(entry.title || '') + '</div></div>' +
    '<div class="arc-actions"><button class="arc-restore" data-id="' + id + '" type="button">Restore</button>' +
    '<button class="del" data-id="' + id + '" type="button" aria-label="delete">✕</button></div></article>';
}
