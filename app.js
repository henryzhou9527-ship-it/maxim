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
  const md = `${d.getMonth()+1}月${d.getDate()}日`;
  const n = daysUntil(iso);
  let tail;
  if (n < 0) tail = `已经过了 ${-n} 天`;
  else if (n === 0) tail = '就在今天';
  else if (n === 1) tail = '明天';
  else tail = `还剩 ${n} 天`;
  return `${md} · ${tail}`;
}
function addDaysIso(iso, n){ const d = new Date((iso||todayKey())+'T00:00:00'); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

/* ---------- seed (first run only) ---------- */
function defaultState(){
  return {
    view: 'home',
    name: 'Zhang',
    selDate: todayKey(),
    usage: { last: '', streak: 0, best: 0 },
    inbox: [
      { id: uid('ib_'), text: '买个新的枕头', at: todayKey() },
      { id: uid('ib_'), text: '以后想学点摄影', at: todayKey() },
    ],
    principles: [
      { id: uid('pr_'), text: '晚上不吃零食', status:'on', note:'不是为了减肥，是想避开夜里失控、第二天后悔。' },
      { id: uid('pr_'), text: 'no porn', status:'on', note:'' },
      { id: uid('pr_'), text: '睡前不刷短视频', status:'on', note:'' },
      { id: uid('pr_'), text: '少喝奶茶', status:'paused', note:'' },
    ],
    todos: [
      { id: uid('td_'), text: '拿快递', done:false },
      { id: uid('td_'), text: '回 Alex 的消息', done:false },
    ],
    projects: [
      { id: uid('pj_'), title:'雅思', deadline:null, note:'先稳到 6.5，再冲 7。',
        subs:[ {id:uid('s_'),text:'背完 List 1',done:true}, {id:uid('s_'),text:'做一次听力模考',done:true},
               {id:uid('s_'),text:'整理错题',done:false}, {id:uid('s_'),text:'精听一篇 Section 3',done:false},
               {id:uid('s_'),text:'练口语 Part 2',done:false}, {id:uid('s_'),text:'写一篇 Task 2',done:false} ], status:'active' },
      { id: uid('pj_'), title:'作品集', deadline:null, note:'',
        subs:[ {id:uid('s_'),text:'选 8 张主图',done:true}, {id:uid('s_'),text:'整理 reference',done:false},
               {id:uid('s_'),text:'排版',done:false} ], status:'active' },
      { id: uid('pj_'), title:'Essay', deadline: addDaysIso(todayKey(), 3), note:'',
        subs:[ {id:uid('s_'),text:'找 3 篇文献',done:true}, {id:uid('s_'),text:'写 outline',done:true},
               {id:uid('s_'),text:'写 introduction',done:false}, {id:uid('s_'),text:'写 body',done:false},
               {id:uid('s_'),text:'写 conclusion',done:false}, {id:uid('s_'),text:'检查引用',done:false} ], status:'active' },
      { id: uid('pj_'), title:'Presentation slides', deadline: addDaysIso(todayKey(), 1), note:'',
        subs:[ {id:uid('s_'),text:'列大纲',done:true}, {id:uid('s_'),text:'做 10 页',done:false} ], status:'active' },
    ],
    someday: [
      { id: uid('sd_'), text:'练字', note:'' },
      { id: uid('sd_'), text:'整理相册', note:'' },
      { id: uid('sd_'), text:'看那本小说', note:'' },
      { id: uid('sd_'), text:'试试做蛋糕', note:'' },
    ],
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
  ['inbox','principles','todos','projects','someday','archive'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
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
  if (!res.ok){ const e = new Error(data.error || '账号服务暂不可用'); e.status = res.status; throw e; }
  return data;
}
async function fetchAccount(username){
  const res = await fetch(`${ACCOUNTS_API}?username=${encodeURIComponent(normUser(username))}`, { cache:'no-store' });
  const data = await res.json().catch(()=>({}));
  if (!res.ok){ const e = new Error(data.error || '账号不存在'); e.status = res.status; throw e; }
  return data.account || null;
}
async function storeSessionKey(key){ const raw = await crypto.subtle.exportKey('raw', key); sessionStorage.setItem(MX_SESSION_KEY, b64enc(raw)); }

function accountError(error, action='登录'){
  const raw = String(error?.message || error || '');
  if (error?.status === 409 || /already exists/i.test(raw)) return '这个用户名已经被注册了，直接登录或换一个。';
  if (error?.status === 404 || /not found/i.test(raw)) return '云端没有这个账号，先创建一个。';
  if (error?.status === 401 || /incorrect|invalid login/i.test(raw)) return '用户名或密码不对。';
  if (error?.status === 503 || /not configured|unavailable|Failed to fetch/i.test(raw)) return '云服务暂时连不上（线上需要配置存储）。';
  return `${action}失败：${raw}`;
}

async function accountRegister(username, password){
  const user = normUser(username);
  if (!user) throw new Error('用户名用 3-40 位小写字母、数字、下划线或连字符。');
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
  if (!user) return { ok:false, error:'请输入 3-40 位用户名' };
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
  sessionStorage.removeItem(MX_SESSION_KEY);
  persistLocal();   // write current state back as plaintext local
  syncStatus = ''; render();
}
async function trySessionRestore(){
  const stored = sessionStorage.getItem(MX_SESSION_KEY);
  const auth = loadAuth();
  if (!stored || !auth) return false;
  try {
    const key = await crypto.subtle.importKey('raw', b64dec(stored), { name:'AES-GCM', length:256 }, true, ['encrypt','decrypt']);
    if (await maximCreateVerifier(key) !== auth.verifier){ sessionStorage.removeItem(MX_SESSION_KEY); return false; }
    maximEncKey = key; maximAuthUser = auth.username; return true;
  } catch (e){ sessionStorage.removeItem(MX_SESSION_KEY); return false; }
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
  setSync('正在从云端同步…');
  try {
    const res = await fetch(`${SETTINGS_API}?key=${SYNC_KEY}&user=${encodeURIComponent(currentUsername())}`, { cache:'no-store', headers:cloudHeaders() });
    if (res.ok){
      const data = await res.json();
      if (data.value){ const cloud = await stateFromCloudValue(data.value); if (cloud){ state = cloud; await persistLocal(); bumpStreak(); setSync('已与云端同步。'); render(); return; } }
      if (seedIfEmpty){ await pushCloud(true); setSync('已把本机数据上传到云端。'); }
      else setSync('云端暂无数据，用的是本机。');
    } else if (res.status === 401) setSync('云端登录失效，请重新登录。');
    else setSync('云端暂时不可用，用的是本机。');
  } catch (error){
    if (/decrypt|envelope/i.test(String(error.message||error))){ cloudBlocked = true; setSync('云端数据无法用当前密码解开，已停止覆盖。'); }
    else setSync('云端暂时连不上，用的是本机。');
  }
}
function schedulePush(){
  if (!canSync() || cloudBlocked) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushCloud().catch(()=>{}); }, 1400);
}
async function pushCloud(immediate){
  if (!canSync() || cloudBlocked) return;
  setSync('正在保存到云端…');
  try {
    const res = await fetch(SETTINGS_API, { method:'POST', headers:{ 'Content-Type':'application/json', ...cloudHeaders() }, body:JSON.stringify({ key:SYNC_KEY, user:currentUsername(), value: await cloudValueFromState() }) });
    setSync(res.ok ? '已保存并同步。' : '本机已存，云端同步被拒绝。');
  } catch (e){ setSync('本机已存，云端暂时连不上。'); }
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
/* DATA ACTIONS  (the only things that mutate state)                     */
/* ===================================================================== */
function archivePush(type, title, payload){ state.archive.unshift({ id: uid('ar_'), type, title, payload, at: todayKey() }); }

function addInbox(text){ if(!text.trim()) return; state.inbox.unshift({ id:uid('ib_'), text:text.trim(), at:todayKey() }); save(); render(); flash('放进 Inbox 了'); }
function deleteInbox(id){ state.inbox = state.inbox.filter(x => x.id !== id); save(); render(); }
function inboxSkip(id){ const i=state.inbox.findIndex(x=>x.id===id); if(i>=0){ const [it]=state.inbox.splice(i,1); state.inbox.push(it); save(); render(); } }

function classifyInbox(id, type){
  const it = state.inbox.find(x => x.id === id); if (!it) return;
  const drop = () => { state.inbox = state.inbox.filter(x => x.id !== id); };
  if (type === 'principle'){ state.principles.push({ id:uid('pr_'), text:it.text, status:'on', note:'' }); drop(); save(); render(); flash('放进原则'); }
  else if (type === 'todo'){ state.todos.push({ id:uid('td_'), text:it.text, done:false }); drop(); save(); render(); flash('放进 Todo'); }
  else if (type === 'someday'){ state.someday.push({ id:uid('sd_'), text:it.text, note:'' }); drop(); save(); render(); flash('放进有空做'); }
  else if (type === 'project'){ const pid = addProject(it.text, null); drop(); save(); render(); openDetail('project', pid); }
  else if (type === 'deadline'){ const pid = addProject(it.text, addDaysIso(todayKey(),7)); drop(); save(); render(); openDetail('project', pid); }
}

function addPrinciple(text){ if(!text.trim()) return; state.principles.push({ id:uid('pr_'), text:text.trim(), status:'on', note:'' }); save(); render(); }
function pausePrinciple(id){ const p=state.principles.find(x=>x.id===id); if(p){ p.status='paused'; save(); render(); } }
function resumePrinciple(id){ const p=state.principles.find(x=>x.id===id); if(p){ p.status='on'; save(); render(); } }
function editPrinciple(id, text){ const p=state.principles.find(x=>x.id===id); if(p && text.trim()){ p.text=text.trim(); save(); render(); } }
function setPrincipleNote(id, note){ const p=state.principles.find(x=>x.id===id); if(p){ p.note=note; save(); render(); } }
function archivePrinciple(id){ const p=state.principles.find(x=>x.id===id); if(!p) return; archivePush('principle', p.text, p); state.principles=state.principles.filter(x=>x.id!==id); save(); render(); }

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
function somedayToTodo(id){ const s=state.someday.find(x=>x.id===id); if(!s) return; state.todos.push({ id:uid('td_'), text:s.text, done:false }); state.someday=state.someday.filter(x=>x.id!==id); save(); render(); flash('放进 Todo'); }
function somedayToProject(id){ const s=state.someday.find(x=>x.id===id); if(!s) return; const pid=addProject(s.text,null); state.someday=state.someday.filter(x=>x.id!==id); save(); render(); openDetail('project', pid); }
function archiveSomeday(id){ const s=state.someday.find(x=>x.id===id); if(!s) return; archivePush('someday', s.text, s); state.someday=state.someday.filter(x=>x.id!==id); save(); render(); }

function restore(arId){
  const a = state.archive.find(x=>x.id===arId); if(!a) return;
  const p = a.payload;
  if (a.type==='todo'){ p.done=false; state.todos.push(p); }
  else if (a.type==='principle'){ state.principles.push(p); }
  else if (a.type==='someday'){ state.someday.push(p); }
  else { state.projects.push(p); }
  state.archive = state.archive.filter(x=>x.id!==arId); save(); render(); flash('拿回来了');
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
  if (typeof renderCalendar==='function') renderCalendar();
  if (typeof renderInbox==='function') renderInbox();
  if (typeof renderItems==='function') renderItems();
  if (typeof renderMe==='function') renderMe();
  applyView();
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
  $('#tabbar').addEventListener('click', e => { const b=e.target.closest('[data-view]'); if(b) setView(b.dataset.view); });
  $('#fab').addEventListener('click', openCapture);
  ['capture','detail','sortflow'].forEach(id => { const el=$('#'+id); if(el) el.addEventListener('click', e=>{ if(e.target===el) closeOverlay(id); }); });
  const tick=()=>{ const n=new Date(); $('#clock').textContent=`${n.getHours()}:${String(n.getMinutes()).padStart(2,'0')}`; };
  tick(); setInterval(tick, 60000);
}
document.addEventListener('DOMContentLoaded', init);

/* =====================================================================
   PAGE VIEW FUNCTIONS  (appended below — one block per page)
   ===================================================================== */

/* ---------- HOME ---------- */
function hmSec(t){ return `<div class="hm-sec">${t}</div>`; }
function renderHome(){
  const root = $('#v-home');
  const wd = ['周日','周一','周二','周三','周四','周五','周六'];
  const now = new Date();
  const dateLabel = `${now.getMonth()+1}月${now.getDate()}日 ${wd[now.getDay()]}`;
  const u = state.usage || { streak:0 };
  let html = '';

  // header: date + brand + usage streak
  html += `<header class="hm-head">
    <div><div class="hm-date">${escapeHtml(dateLabel)}</div><div class="hm-brand">Maxim</div></div>
    <div class="hm-streak"><b>${u.streak||0}</b><span>天连续打开</span></div>
  </header>`;

  // 留意 (nearest assignment deadlines, up to 2)
  const atts = state.projects.filter(p => isAssignment(p)).sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline)).slice(0,2);
  if (atts.length){
    html += hmSec('留意') + '<div class="hm-list">';
    atts.forEach(p => { const soon = daysUntil(p.deadline)<=2?' hm-soon':''; html += `<div class="hm-att${soon}" data-proj="${p.id}"><span>${escapeHtml(p.title)}</span><em>${escapeHtml(fmtDeadline(p.deadline))}</em></div>`; });
    html += '</div>';
  }

  // Todo (open, up to 3)
  const todos = state.todos.filter(t=>!t.done).slice(0,3);
  html += hmSec('Todo');
  if (todos.length){ html += '<div class="hm-list">'; todos.forEach(t => html += `<div class="hm-todo"><button class="hm-check" data-todo="${t.id}" aria-label="完成"></button><span>${escapeHtml(t.text)}</span></div>`); html += '</div>'; }
  else html += '<div class="empty">没有待办了。</div>';

  // 正在推进 (projects without deadline, up to 2)
  const projs = state.projects.filter(p=>!isAssignment(p)).slice(0,2);
  if (projs.length){
    html += hmSec('正在推进') + '<div class="hm-list">';
    projs.forEach(p => { const pr=progress(p); const ns=nextSub(p); html += `<div class="hm-proj" data-proj="${p.id}"><div class="hm-proj-t"><span>${escapeHtml(p.title)}</span><em>${pr.done}/${pr.total}</em></div><div class="hm-proj-n">下一步：${escapeHtml(ns?ns.text:'还没定')}</div></div>`; });
    html += '</div>';
  }

  // 原则 (on, up to 3) — compact chips
  const prins = state.principles.filter(p=>p.status==='on').slice(0,3);
  if (prins.length){
    html += hmSec('原则') + '<div class="hm-prins">' + prins.map(p=>`<span class="hm-prin" data-prin="${p.id}">${escapeHtml(p.text)}</span>`).join('') + '</div>';
  }

  root.innerHTML = html;
  $$('.hm-att', root).forEach(el => el.addEventListener('click', () => openDetail('project', el.dataset.proj)));
  $$('.hm-proj', root).forEach(el => el.addEventListener('click', () => openDetail('project', el.dataset.proj)));
  $$('.hm-prin', root).forEach(el => el.addEventListener('click', () => openDetail('principle', el.dataset.prin)));
  $$('.hm-check', root).forEach(el => el.addEventListener('click', e => { e.stopPropagation(); toggleTodo(el.dataset.todo); }));
}

/* ---------- INBOX + CAPTURE + SORT ---------- */
function renderInbox() {
  const root = $('#v-inbox');
  const n = state.inbox.length;
  let html = '';
  html += '<header class="viewhead"><h1>Inbox</h1><div class="sub">脑子里冒出来的东西，先丢这儿，回头再分。</div></header>';
  if (n) {
    html += '<div class="ib-bar">';
    html += '<span class="ib-count">未整理 ' + n + ' 条</span>';
    html += '<button class="ib-tidy" type="button">理一理</button>';
    html += '</div>';
    html += '<div class="ib-list">';
    for (const item of state.inbox) html += ibCard(item);
    html += '</div>';
  } else {
    html += '<div class="empty">这里空着。想到什么，点右下角的 ＋ 丢进来。</div>';
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
      '<button class="del" type="button" aria-label="删掉">✕</button>' +
      '<div class="ib-card-text">' + escapeHtml(item.text) + '</div>' +
      ibActs('ib-acts') + '</div>';
}
function ibActs(cls) {
  const types = [['principle','原则'],['todo','Todo'],['project','Project'],['someday','有空做'],['deadline','加 deadline']];
  let h = '<div class="' + cls + '">';
  for (const [type, label] of types) h += '<button class="ib-pill" type="button" data-type="' + type + '">' + label + '</button>';
  return h + '</div>';
}
function renderCapture() {
  const root = $('#capture');
  let html = '<div class="sheet">';
  html += '<div class="grip"></div>';
  html += '<h4>想到什么？</h4>';
  html += '<textarea class="cap-text" placeholder="随便写一句，待会儿再分类。"></textarea>';
  html += '<button class="cap-save" type="button">先放进 Inbox</button>';
  html += '<div class="cap-or">或者直接分到</div>';
  html += '<div class="cap-chips">';
  html += '<button class="cap-chip" type="button" data-act="principle">原则</button>';
  html += '<button class="cap-chip" type="button" data-act="todo">Todo</button>';
  html += '<button class="cap-chip" type="button" data-act="project">Project</button>';
  html += '<button class="cap-chip" type="button" data-act="someday">有空做</button>';
  html += '<button class="cap-chip" type="button" data-act="deadline">加 deadline</button>';
  html += '</div></div>';
  root.innerHTML = html;
  $('.cap-save', root).addEventListener('click', () => { addInbox($('.cap-text', root).value); closeOverlay('capture'); });
  $$('.cap-chip', root).forEach((chip) => {
    chip.addEventListener('click', () => {
      const t = $('.cap-text', root).value.trim();
      if (!t) { closeOverlay('capture'); return; }
      switch (chip.dataset.act) {
        case 'principle': addPrinciple(t); closeOverlay('capture'); flash('放进原则'); break;
        case 'todo': addTodo(t); closeOverlay('capture'); flash('放进 Todo'); break;
        case 'someday': addSomeday(t); closeOverlay('capture'); flash('放进有空做'); break;
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
    html += '<div class="sort-empty">都整理完了。</div>';
    html += '<button class="sort-done" type="button">好</button></div>';
    root.innerHTML = html;
    const done = $('.sort-done', root); if (done) done.addEventListener('click', () => closeOverlay('sortflow'));
    return;
  }
  const it = state.inbox[0];
  html += '<div class="sheet"><div class="grip"></div>';
  html += '<button class="sort-x" type="button" aria-label="关闭">✕</button>';
  html += '<div class="sort-left">还剩 ' + state.inbox.length + ' 条</div>';
  html += '<div class="sort-text">' + escapeHtml(it.text) + '</div>';
  html += '<div class="sort-acts">';
  html += '<button class="sort-pill" type="button" data-type="principle">原则</button>';
  html += '<button class="sort-pill" type="button" data-type="todo">Todo</button>';
  html += '<button class="sort-pill" type="button" data-type="project">Project</button>';
  html += '<button class="sort-pill" type="button" data-type="someday">有空做</button>';
  html += '<button class="sort-pill" type="button" data-type="deadline">加 deadline</button>';
  html += '</div>';
  html += '<div class="sort-minor"><button class="sort-skip" type="button">跳过</button><button class="sort-del" type="button">删掉</button></div>';
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
        <span class="it-tag ${p.status === 'paused' ? 'it-tag-paused' : 'it-tag-on'}">${p.status === 'paused' ? '暂停中' : '开启中'}</span>
      </div>`).join('')
    : `<div class="empty">还没有。写下一条你想守的原则。</div>`;

  const todos = state.todos;
  const todoRows = todos.length
    ? todos.map(t => `
      <div class="it-todo${t.done ? ' it-done' : ''}" data-id="${t.id}">
        <button class="it-check${t.done ? ' on' : ''}" data-act="toggle-todo" data-id="${t.id}" aria-label="完成"></button>
        <span class="it-todo-text">${escapeHtml(t.text)}</span>
        <button class="del" data-act="rm-todo" data-id="${t.id}" aria-label="删除">×</button>
      </div>`).join('')
    : `<div class="empty">还没有。</div>`;

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
    : `<div class="empty">还没有项目。</div>`;

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
    : `<div class="empty">还没有。</div>`;

  const sds = state.someday;
  const sdRows = sds.length
    ? sds.map(s => `
      <div class="it-sd" data-id="${s.id}">
        <span class="it-sd-text">${escapeHtml(s.text)}</span>
        <div class="it-sd-acts">
          <button class="it-mini" data-act="sd-today" data-id="${s.id}">今天做</button>
          <button class="it-mini" data-act="sd-proj" data-id="${s.id}">做成 Project</button>
          <button class="del" data-act="sd-arch" data-id="${s.id}" aria-label="归档">×</button>
        </div>
      </div>`).join('')
    : `<div class="empty">还没有。想到什么以后想做的，丢这儿。</div>`;

  root.innerHTML = `
    <header class="viewhead"><h1>事项</h1><div class="sub">你存的所有东西，都在这儿管理。</div></header>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>原则</h3><span class="count">${prins.length}</span></div></div>
      <div class="it-list">${prinRows}</div>
      <div class="addrow"><input type="text" placeholder="写一条原则…" data-add="prin"><button data-add-btn="prin">＋</button></div>
    </section>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>Todo</h3><span class="count">${todos.length}</span></div></div>
      <div class="it-list">${todoRows}</div>
      <div class="addrow"><input type="text" placeholder="加一件要做的事…" data-add="todo"><button data-add-btn="todo">＋</button></div>
    </section>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>Project</h3><span class="count">${projects.length}</span></div></div>
      <div class="it-list">${projRows}</div>
      <div class="addrow"><input type="text" placeholder="新建一个项目…" data-add="proj"><button data-add-btn="proj">＋</button></div>
    </section>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>Assignment</h3><span class="count">${asgs.length}</span></div></div>
      <div class="it-list">${asgRows}</div>
      <div class="addrow"><input type="text" placeholder="新建有截止的事项…" data-add="asg"><button data-add-btn="asg">＋</button></div>
    </section>
    <section class="it-block">
      <div class="sec"><div class="l"><h3>有空做</h3><span class="count">${sds.length}</span></div></div>
      <div class="it-list">${sdRows}</div>
      <div class="addrow"><input type="text" placeholder="以后有空再说…" data-add="sd"><button data-add-btn="sd">＋</button></div>
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
  wireAdd('todo', v => addTodo(v));
  wireAdd('proj', v => addProject(v, null));
  wireAdd('asg', v => { const id = addProject(v, addDaysIso(todayKey(), 7)); openDetail('project', id); });
  wireAdd('sd', v => addSomeday(v));

  root.querySelectorAll('.it-prin').forEach(el => el.addEventListener('click', () => openDetail('principle', el.dataset.id)));
  root.querySelectorAll('.it-proj, .it-asg').forEach(el => el.addEventListener('click', () => openDetail('project', el.dataset.id)));
  root.querySelectorAll('[data-act="toggle-todo"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); toggleTodo(el.dataset.id); }));
  root.querySelectorAll('[data-act="rm-todo"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); removeTodo(el.dataset.id); }));
  root.querySelectorAll('[data-act="sd-today"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); somedayToTodo(el.dataset.id); }));
  root.querySelectorAll('[data-act="sd-proj"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); somedayToProject(el.dataset.id); }));
  root.querySelectorAll('[data-act="sd-arch"]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); archiveSomeday(el.dataset.id); }));
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
        <div class="dt-head"><span class="dt-kind">原则</span><button class="dt-close" data-act="close">完成</button></div>
        <input class="dt-title" value="${escapeHtml(p.text)}">
        <div class="dt-status ${paused ? 'paused' : 'on'}">${paused ? '暂停中' : '开启中'}</div>
        <textarea class="dt-note" placeholder="为什么要守这条？（可不填）">${escapeHtml(p.note || '')}</textarea>
        <div class="dt-actions">
          ${paused ? `<button class="dt-btn" data-act="resume">重新开启</button>` : `<button class="dt-btn" data-act="pause">暂停</button>`}
          <button class="dt-btn dt-ghost" data-act="archive">归档</button>
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
  if (kind === 'project') {
    const p = getProject(id);
    if (!p) { closeOverlay('detail'); return; }
    const asg = isAssignment(p); const pr = progress(p); const pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0; const full = pr.total > 0 && pr.done === pr.total; const next = nextSub(p);
    const subRows = (p.subs && p.subs.length)
      ? p.subs.map(s => `
        <div class="dt-sub${s.done ? ' done' : ''}" data-sid="${s.id}">
          <button class="dt-check${s.done ? ' on' : ''}" data-act="toggle-sub" data-sid="${s.id}" aria-label="完成"></button>
          <span class="dt-sub-text">${escapeHtml(s.text)}</span>
          <button class="del" data-act="rm-sub" data-sid="${s.id}" aria-label="删除">×</button>
        </div>`).join('')
      : `<div class="empty">还没有子任务。把它拆成下一步。</div>`;
    const doneBanner = full ? `
      <div class="dt-done">
        <div class="dt-done-msg">看着像是做完了。</div>
        <div class="dt-done-acts"><button class="dt-btn" data-act="done-archive">归档</button><button class="dt-btn dt-ghost" data-act="done-keep">还要继续</button></div>
      </div>` : '';
    root.innerHTML = `
      <div class="sheet dt-sheet">
        <div class="grip"></div>
        <div class="dt-head"><span class="dt-kind">${asg ? '有截止的事项' : '项目'}</span><button class="dt-close" data-act="close">完成</button></div>
        <h3 class="dt-ptitle">${escapeHtml(p.title)}</h3>
        <div class="dt-type">${asg ? '有截止的事项 · ' + escapeHtml(fmtDeadline(p.deadline)) : '项目（没有截止）'}</div>
        <div class="dt-progress"><div class="it-bar"><i class="${full ? 'full' : ''}" style="width:${pct}%"></i></div><span class="it-frac">${pr.done}/${pr.total}</span></div>
        <div class="dt-next">下一步：${escapeHtml(next ? next.text : '还没定')}</div>
        ${doneBanner}
        <div class="dt-subs">${subRows}</div>
        <div class="addrow"><input type="text" placeholder="加一个子任务…" data-add="sub"><button data-add-btn="sub">＋</button></div>
        <textarea class="dt-note" placeholder="备注（可不填）">${escapeHtml(p.note || '')}</textarea>
        <div class="dt-date-row"><label class="dt-date-lbl">截止</label><input type="date" class="dt-date" value="${p.deadline || ''}">${p.deadline ? `<button class="dt-btn dt-ghost dt-sm" data-act="rm-deadline">移除 deadline</button>` : ''}</div>
        <div class="dt-actions"><button class="dt-btn dt-ghost" data-act="archive">归档</button></div>
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
  const WD = ['一','二','三','四','五','六','日'];
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
  const dayLabel = `${selD.getMonth()+1}月${selD.getDate()}日 周${WD[(selD.getDay()+6)%7]}`;
  const items = dueOn(sel).slice().sort((a,b)=>0);

  let agenda = `<div class="cal-dayhead">${dayLabel}${sel===todayKey()?' · 今天':''}</div>`;
  if (items.length){
    agenda += '<div class="cal-agenda">';
    items.forEach(p => { const pr=progress(p); const soon=daysUntil(p.deadline)<=2?' cal-soon':''; agenda += `<div class="cal-item${soon}" data-proj="${p.id}"><span class="cal-rail"></span><div class="cal-item-b"><div class="cal-item-t">${escapeHtml(p.title)}</div><div class="cal-item-m">截止 · ${pr.done}/${pr.total}</div></div></div>`; });
    agenda += '</div>';
  } else {
    agenda += '<div class="empty">这天没有截止的事。轻松点。</div>';
  }

  root.innerHTML = `<header class="viewhead"><h1>日历</h1><div class="sub">这一周有什么截止，挑一天看看。</div></header>` + strip + agenda;
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
      <div class="me-acc-top"><div><div class="me-acc-u">${escapeHtml(uname)}</div><div class="me-acc-s" id="sync-status">${escapeHtml(syncStatus||'已登录 · 云端同步开启')}</div></div>
      <button class="me-btn ghost" id="logout">退出</button></div></div>`;
  } else {
    acc = `<div class="me-card me-acc">
      <h4>账号 <span>登录后，数据端到端加密同步到云端</span></h4>
      <input class="me-in" id="ac-user" placeholder="用户名（3-40 位小写字母/数字）" autocapitalize="off" />
      <input class="me-in" id="ac-pass" type="password" placeholder="密码" />
      <div class="me-acc-btns"><button class="me-btn" id="do-login">登录</button><button class="me-btn ghost" id="do-register">注册</button></div>
      <div class="me-hint">密码只在本机参与加密，服务器看不到你的内容。换设备用同一账号登录即可。</div></div>`;
  }

  const streak = `<div class="me-card me-streak"><div class="me-stat"><b>${u.streak||0}</b><span>天连续打开</span></div><div class="me-stat"><b>${u.best||0}</b><span>最佳</span></div></div>`;

  const profile = `<div class="me-card"><h4>名字</h4><input class="me-in" id="me-name" value="${escapeHtml(state.name||'')}" maxlength="24" /></div>`;

  const painting = `<div class="me-card me-paint">
    <img src="assets/friedrich.jpg" alt="Wanderer above the Sea of Fog"/>
    <div class="me-paint-cap"><div>《雾海上的旅人》</div><div class="me-paint-sub">Caspar David Friedrich · 1818</div></div>
  </div>`;

  const items = state.archive || [];
  const archive = `<div class="me-card"><h4>归档 <span>${items.length} 条</span></h4>` +
    (items.length ? '<div class="arc-list">' + items.map(arcCard).join('') + '</div>' : '<div class="empty">这里还空着。做完或收起来的东西会留在这。</div>') +
    '</div>';

  root.innerHTML = `<header class="viewhead"><h1>我</h1></header>` + acc + streak + profile + painting + archive;

  // wire
  if (logged){ $('#logout').addEventListener('click', accountLogout); }
  else {
    const doAuth = async (fn) => {
      const user = $('#ac-user').value, pass = $('#ac-pass').value;
      if (!pass){ flash('请输入密码'); return; }
      flash('处理中…');
      const r = await fn(user, pass);
      if (r.ok){ flash('好了'); render(); } else { flash(r.error || '失败'); }
    };
    $('#do-login').addEventListener('click', () => doAuth(accountLogin));
    $('#do-register').addEventListener('click', () => doAuth(accountRegister));
  }
  const nameEl = $('#me-name'); if (nameEl) nameEl.addEventListener('change', () => { state.name = nameEl.value.trim() || 'You'; save(); renderHome(); });
  $$('.arc-restore', root).forEach(btn => btn.addEventListener('click', () => restore(btn.getAttribute('data-id'))));
  $$('.arc-card .del', root).forEach(btn => btn.addEventListener('click', () => deleteArchive(btn.getAttribute('data-id'))));
}
function arcTypeLabel(type){
  switch(type){ case 'todo': return 'Todo'; case 'principle': return '原则'; case 'project': return 'Project'; case 'assignment': return 'Assignment'; case 'someday': return '有空做'; default: return '记录'; }
}
function arcCard(entry){
  const id = escapeHtml(String(entry.id));
  return '<article class="arc-card"><div class="arc-main"><div class="arc-meta">' +
    '<span class="arc-tag">' + escapeHtml(arcTypeLabel(entry.type)) + '</span>' +
    '<span class="arc-date">' + escapeHtml(entry.at || '') + '</span></div>' +
    '<div class="arc-title">' + escapeHtml(entry.title || '') + '</div></div>' +
    '<div class="arc-actions"><button class="arc-restore" data-id="' + id + '" type="button">拿回来</button>' +
    '<button class="del" data-id="' + id + '" type="button" aria-label="删除">✕</button></div></article>';
}
