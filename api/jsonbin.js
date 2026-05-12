<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<title>PsychCat Component 2</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&family=DM+Serif+Display&display=swap');
:root {
  --bg: #0a0a0f; --sf: #13131a; --sf2: #1c1c28; --bd: #2a2a3e; --tx: #e8e8f0;
  --mu: #6b6b85; --ac: #ff9f43; --ac2: #f368e0; --gr: #22c55e; --am: #f59e0b; --re: #ef4444;
}
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
body { font-family: 'Space Grotesk', sans-serif; background: var(--bg); color: var(--tx); min-height: 100vh; overflow-x: hidden; }
.screen { display: none; min-height: 100vh; flex-direction: column; }
.screen.active { display: flex; }
.hdr { padding: 16px; display: flex; justify-content: space-between; align-items: center; background: var(--sf); border-bottom: 1px solid var(--bd); position: sticky; top: 0; z-index: 100; }
.logo { font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: var(--ac); }
.nav { display: flex; background: var(--sf); border-top: 1px solid var(--bd); padding: 10px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); position: fixed; bottom: 0; width: 100%; gap: 5px; z-index: 100; }
.ntab { flex: 1; border: none; background: none; color: var(--mu); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
.ntab.on { color: var(--ac); }
.hcontent { flex: 1; padding: 20px; padding-bottom: 120px; overflow-y: auto; }
.card { background: var(--sf); border: 1px solid var(--bd); border-radius: 20px; padding: 20px; margin-bottom: 15px; }
.clickable:hover { border-color: var(--ac); transform: translateY(-2px); cursor: pointer; }
.pbar-container { width: 100%; height: 8px; background: var(--bd); border-radius: 4px; overflow: hidden; margin: 10px 0; }
.pbar-fill { height: 100%; background: var(--ac); transition: width 0.4s ease; }
.btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-family: inherit; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1rem; }
.btn-p { background: var(--ac); color: #000; }
.btn-o { background: transparent; border: 1px solid var(--bd); color: var(--tx); }
.f-input { width: 100%; padding: 12px; background: var(--sf2); border: 1px solid var(--bd); border-radius: 10px; color: var(--tx); font-family: inherit; margin-bottom: 10px; outline: none; }
.q-tag { display: inline-flex; gap: 6px; align-items: center; padding: 4px 10px; border-radius: 20px; background: var(--sf2); color: var(--ac); font-size: 0.7rem; font-weight: 700; margin-bottom: 10px; }
.ao-badge { padding: 2px 6px; border-radius: 4px; background: var(--ac); color: #000; font-size: 0.6rem; }
.q-main { font-family: 'DM Serif Display', serif; font-size: 1.6rem; line-height: 1.2; margin-bottom: 15px; color: var(--tx); }
.q-hint-box { font-size: 0.9rem; color: var(--mu); background: var(--sf2); padding: 15px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid var(--ac); display: none; font-style: italic; }
.tarea { width: 100%; min-height: 60px; background: var(--sf2); border: 1px solid var(--bd); border-radius: 12px; padding: 15px; color: var(--tx); font-family: inherit; font-size: 1.2rem; margin-bottom: 15px; outline: none; }
.fb-box { border-radius: 15px; padding: 18px; margin-top: 10px; display: none; text-align: center; }
.fb-box.ok { background: rgba(34,197,94,0.15); border: 1px solid var(--gr); color: var(--gr); }
.fb-box.ng { background: rgba(239,68,68,0.15); border: 1px solid var(--re); color: var(--re); }
.fb-concept { font-family: 'DM Serif Display', serif; font-size: 2rem; display: block; margin-top: 5px; }
.spinner { width: 18px; height: 18px; border: 3px solid rgba(255,159,67,0.3); border-top-color: var(--ac); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>

<div id="splash" style="position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;">
  <div style="font-size:4rem;">😽</div>
  <div style="font-family:'DM Serif Display',serif;font-size:2rem;color:var(--ac);">PsychCat</div>
</div>

<!-- LOGIN / SIGNUP -->
<div class="screen active" id="loginScreen">
  <div style="padding:40px 20px; text-align:center;">
    <div style="font-size:4rem;">😺</div>
    <div style="font-family:'DM Serif Display',serif; font-size:2.5rem; margin-bottom:30px;">PsychCat</div>
    
    <div id="loginStep1" class="card" style="text-align:left;">
      <label style="font-size:0.65rem; font-weight:800; color:var(--mu); letter-spacing:1px;">ENTER REAL FULL NAME</label>
      <input type="text" id="iName" class="tarea" style="min-height:50px; margin-top:5px;" placeholder="e.g. Emma Clarke">
      <button class="btn btn-p" onclick="handleLookup()">Continue 🐾</button>
      <button class="btn btn-o" onclick="goTeacher()" style="margin-top:15px; border:none; font-size:0.75rem;">Teacher Access</button>
    </div>

    <div id="loginNew" class="card" style="display:none; text-align:left;">
      <div style="font-weight:700; color:var(--ac); margin-bottom:15px;">Welcome! New student detected.</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div><label style="font-size:0.6rem;">YEAR</label><select id="sYear" class="f-input"><option value="1">Year 1</option><option value="2">Year 2</option></select></div>
        <div><label style="font-size:0.6rem;">GROUP</label><select id="sGroup" class="f-input"><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option><option>F</option></select></div>
        <div><label style="font-size:0.6rem;">TEACHER</label><select id="sTeacher" class="f-input"><option>S</option><option>J</option></select></div>
        <div><label style="font-size:0.6rem;">ACAD YEAR</label><select id="sAcad" class="f-input"><option>2024/25</option><option>2025/26</option></select></div>
      </div>
      <label style="font-size:0.6rem; margin-top:10px; display:block;">CHOOSE 4-DIGIT PIN</label>
      <input type="password" id="nPin" class="f-input" maxlength="4" style="text-align:center; letter-spacing:10px;" inputmode="numeric">
      <button class="btn btn-p" onclick="createAccount()">Create Account 😼</button>
    </div>

    <div id="loginPin" class="card" style="display:none; text-align:left;">
      <div id="pinMsg" style="font-weight:700; color:var(--ac); margin-bottom:10px;"></div>
      <input type="password" id="iPin" class="tarea" style="text-align:center; letter-spacing:10px;" maxlength="4" inputmode="numeric" placeholder="PIN">
      <button class="btn btn-p" onclick="verifyPin()">Sign In 😼</button>
    </div>
  </div>
</div>

<!-- HOME DASHBOARD -->
<div class="screen" id="homeScreen">
  <div class="hdr"><div class="logo">🐾 PsychCat</div><div id="uBadge" style="font-size:1.5rem;">🌱</div></div>
  <div class="hcontent">
    <div class="card" style="background: linear-gradient(135deg, rgba(255,159,67,0.1), transparent);">
      <div id="uNick" style="font-family:'DM Serif Display',serif; font-size:1.8rem; color:var(--ac);">...</div>
      <div id="uMeta" style="font-size:0.75rem; color:var(--mu); margin-bottom:12px;">...</div>
      <div class="pbar-container"><div id="totalPbar" class="pbar-fill"></div></div>
      <div style="display:flex; justify-content:space-between; font-size:0.7rem; font-weight:800; color:var(--mu);">
        <span id="uAccuracy">Accuracy: 0%</span><span id="uAnswered">0 Answered</span>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
      <button class="btn btn-p" onclick="startQuiz('all')">🎲 Random Quiz</button>
      <button class="btn btn-o" onclick="startQuiz('tricky')">🔥 Focus Mode</button>
    </div>
    <div style="display:flex; gap:10px; margin-bottom:20px;">
       <div class="scard"><div class="s-num" id="statG" style="color:var(--gr)">0</div><div style="font-size:0.6rem;">Mastered</div></div>
       <div class="scard"><div class="s-num" id="statA" style="color:var(--am)">0</div><div style="font-size:0.6rem;">Learning</div></div>
       <div class="scard"><div class="s-num" id="statR" style="color:var(--re)">0</div><div style="font-size:0.6rem;">Weakness</div></div>
    </div>
    <div id="topicGrid" style="display:grid; grid-template-columns:1fr; gap:8px;"></div>
  </div>
  <div class="nav">
    <button class="ntab on" onclick="showHome()">🏠<br>Home</button>
    <button class="ntab" onclick="goRank()">🏆<br>Rank</button>
    <button class="ntab" onclick="handleSignOut()">😼<br>Reset</button>
  </div>
</div>

<!-- QUIZ SCREEN -->
<div class="screen" id="quizScreen">
  <div class="hdr">
    <button onclick="exitQuiz()" style="background:none; border:none; color:var(--mu); font-weight:700;">✕ EXIT</button>
    <div style="flex:1; margin:0 20px;"><div class="pbar-container"><div id="qPbar" class="pbar-fill"></div></div></div>
    <div id="qCount" style="font-size:0.8rem; font-weight:800;">1/10</div>
  </div>
  <div class="hcontent" id="qContent"></div>
  <div id="qActions" style="padding:20px; background:var(--sf); border-top:1px solid var(--bd); display:flex; flex-direction:column; gap:10px;">
     <button id="btnCheck" class="btn btn-p" onclick="handleCheck()">Check Answer 😼</button>
     <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <button id="btnSkip" class="btn btn-o" onclick="handleSkip()">Skip 😿</button>
        <button id="btnNext" class="btn btn-p" style="display:none;" onclick="handleNext()">Next →</button>
     </div>
  </div>
</div>

<!-- RANK / TEACHER VIEW -->
<div class="screen" id="rankScreen">
  <div class="hdr"><div class="logo">🏆 Top Kittens</div><button onclick="showHome()" style="background:none; border:none; color:var(--ac);">✕</button></div>
  <div class="hcontent" id="rankContent"></div>
</div>

<script>
// --- CORE UTILS ---
const ADJ=['Bold','Brave','Clever','Daring','Epic','Fierce','Golden','Happy','Jolly','Mighty','Noble','Quick','Rapid','Swift','Wise'];
const CAT=['Lion','Tiger','Panther','Cougar','Leopard','Lynx','Cheetah','Jaguar','Wildcat','Tomcat'];
function genNick(name){
  let h=0; for(let i=0;i<name.length;i++) h=((h<<5)-h)+name.charCodeAt(i);
  const a=Math.abs(h); return ADJ[a%ADJ.length]+' '+CAT[Math.floor(a/ADJ.length)%CAT.length];
}
function calcAcc(c, a, s) { 
    const totalWeight = (a||0) + ((s||0)*0.5);
    return totalWeight===0?0:Math.round((c/totalWeight)*100); 
}

// --- STATE ---
let S = null; let QUESTIONS = []; let QZ = null; let APPROVED = {};

async function api(method, data = {}) {
  const res = await fetch("/api/jsonbin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method, ...data }) });
  return res.json();
}

window.addEventListener('load', async () => {
  const qData = await api('GET_QUESTIONS');
  QUESTIONS = (qData.questions || []).filter(q => q && q.concept);
  APPROVED = qData.approvedAnswers || {};
  document.getElementById('splash').style.display = 'none';
});

// --- AUTH SYSTEM ---
async function handleLookup() {
  const name = document.getElementById('iName').value.trim(); if (!name) return;
  const d = await api('GET_STUDENT', { name });
  document.getElementById('loginStep1').style.display = 'none';
  if (d.student) {
    S = d.student; 
    document.getElementById('loginPin').style.display = 'block';
    document.getElementById('pinMsg').textContent = `Hi, ${S.nickname}! Enter your PIN:`;
  } else {
    document.getElementById('loginNew').style.display = 'block';
  }
}

async function verifyPin() {
  if (S.pin === document.getElementById('iPin').value) showHome(); else alert("Wrong PIN!");
}

async function createAccount() {
  const name = document.getElementById('iName').value.trim();
  const pin = document.getElementById('nPin').value;
  if (pin.length !== 4) return alert("PIN must be 4 digits");
  S = { 
    name, pin, nickname: genNick(name), 
    year: document.getElementById('sYear').value,
    group: document.getElementById('sGroup').value,
    teacher: document.getElementById('sTeacher').value,
    acadYear: document.getElementById('sAcad').value,
    totalAnswered: 0, totalCorrect: 0, totalSkipped: 0, termStats: {} 
  };
  await api('PUT_STUDENT', { student: S });
  showHome();
}

// --- DASHBOARD ---
function showHome() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('homeScreen').classList.add('active'); renderHome();
}

function renderHome() {
  const acc = calcAcc(S.totalCorrect, S.totalAnswered, S.totalSkipped);
  document.getElementById('uNick').textContent = S.nickname;
  document.getElementById('uMeta').textContent = `Year ${S.year} · Group ${S.group} · T:${S.teacher}`;
  document.getElementById('totalPbar').style.width = acc + "%";
  document.getElementById('uAnswered').textContent = `${S.totalAnswered} Answered`;
  document.getElementById('uAccuracy').textContent = `Accuracy: ${acc}%`;
  
  const tags = [...new Set(QUESTIONS.map(q => q.tag))];
  const grid = document.getElementById('topicGrid'); grid.innerHTML = "";
  let g=0, a=0, r=0;

  tags.forEach(tag => {
    const qs = QUESTIONS.filter(q => q.tag === tag);
    let tC=0, tA=0, tS=0;
    qs.forEach(q => { const st = S.termStats[q.concept] || {correct:0, answered:0, skipped:0}; tC+=st.correct; tA+=st.answered; tS+=st.skipped; });
    const pct = calcAcc(tC, tA, tS);
    if (tA > 0) { if(pct >= 75) g++; else if(pct >= 50) a++; else r++; }
    grid.innerHTML += `<div class="card clickable" onclick="startQuiz('${tag}')">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
           <b style="font-size:0.9rem;">${tag}</b>
           <span style="font-size:0.7rem; color:var(--mu);">${pct}%</span>
        </div>
        <div class="pbar-container" style="height:5px;"><div class="pbar-fill" style="width:${pct}%; background:${pct>=75?'var(--gr)':pct>=50?'var(--am)':'var(--re)'}"></div></div>
        <div style="font-size:0.6rem; color:var(--mu);">${qs.length} terms total</div>
    </div>`;
  });
  document.getElementById('statG').textContent = g; document.getElementById('statA').textContent = a; document.getElementById('statR').textContent = r;
}

// --- QUIZ ENGINE ---
function startQuiz(mode) {
  let pool = QUESTIONS;
  if (mode === 'tricky') pool = QUESTIONS.filter(q => calcAcc(S.termStats[q.concept]?.correct, S.termStats[q.concept]?.answered, S.termStats[q.concept]?.skipped) < 50);
  else if (mode !== 'all') pool = QUESTIONS.filter(q => q.tag === mode);
  QZ = { questions: pool.sort(() => 0.5 - Math.random()).slice(0, 10), currentIdx: 0, score: 0, results: [] };
  document.getElementById('homeScreen').classList.remove('active');
  document.getElementById('quizScreen').classList.add('active'); renderQuestion();
}

function renderQuestion() {
  const q = QZ.questions[QZ.currentIdx];
  const types = []; 
  if (q.definition) types.push('AO1'); 
  if (q.scenario) types.push('AO2');
  if (q.scenario_strength || q.scenario_weakness) types.push('AO3');
  
  const task = types[Math.floor(Math.random() * types.length)];
  QZ.currentTask = task;

  let prompt = ""; let mainText = "";
  if (task === 'AO1') {
      prompt = "Identify the concept based on this definition:";
      mainText = q.definition;
  } else if (task === 'AO2') {
      prompt = "Based on this scenario, identify the concept:";
      mainText = q.scenario;
  } else {
      const isStr = q.scenario_strength && Math.random() > 0.5;
      QZ.evalType = isStr ? 'strength' : 'weakness';
      prompt = `Identify one ${QZ.evalType} of:`;
      mainText = q.concept;
  }

  document.getElementById('qPbar').style.width = (QZ.currentIdx / QZ.questions.length * 100) + "%";
  document.getElementById('qCount').textContent = `${QZ.currentIdx+1}/10`;
  document.getElementById('qContent').innerHTML = `
    <div class="q-tag"><span class="ao-badge">${task}</span> 🐾 ${q.tag}</div>
    <div class="q-prompt">${prompt}</div>
    <div class="q-main">${mainText}</div>
    ${(task !== 'AO2' && q.scenario) ? `<button class="btn btn-o" style="width:auto; font-size:0.7rem; padding:8px; margin-bottom:15px;" onclick="document.getElementById('qHint').style.display='block'; this.style.display='none'">Get Hint 🐾</button>` : ''}
    <div id="qHint" class="q-hint-box">${q.scenario}</div>
    <input type="text" id="qAns" class="tarea" placeholder="Type answer here..." autocomplete="off">
    <div id="qFeedback" class="fb-box"></div>
  `;
  document.getElementById('btnCheck').innerHTML = "Check Answer 😼";
  document.getElementById('btnCheck').style.display="flex"; 
  document.getElementById('btnSkip').style.display="flex"; 
  document.getElementById('btnNext').style.display="none";
  document.getElementById('qAns').focus();
}

async function handleCheck() {
  const q = QZ.questions[QZ.currentIdx]; const ans = document.getElementById('qAns').value.trim();
  if(!ans) return;
  const btn = document.getElementById('btnCheck');
  btn.innerHTML = '<span class="spinner"></span> Marking...';
  
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const input = clean(ans);
  let ok = false;

  // STAGE 1 & 2: Direct or Database Check
  if (QZ.currentTask === 'AO1' || QZ.currentTask === 'AO2') {
      const target = clean(q.concept);
      ok = (input === target);
      if(!ok && APPROVED[q.concept]?.some(a => clean(a) === input)) ok = true;
  }

  // STAGE 3: AI Check
  if(!ok) {
    const ai = await api('AI_CHECK', { 
        concept: q.concept, 
        target: QZ.currentTask === 'AO3' ? (QZ.evalType === 'strength' ? q.scenario_strength : q.scenario_weakness) : q.concept,
        studentAnswer: ans,
        type: QZ.currentTask
    });
    if(ai.correct) { 
        ok = true; 
        if (QZ.currentTask !== 'AO3') api('ADD_APPROVED', { concept: q.concept, answer: ans }); 
    }
  }

  const fb = document.getElementById('qFeedback'); fb.style.display="block"; fb.className = `fb-box ${ok?'ok':'ng'}`;
  fb.innerHTML = `<b>${ok?'😼 Correct!':'😿 Not quite'}</b><span class="fb-concept">${q.concept}</span>`;
  if(ok) QZ.score++; QZ.results.push({concept:q.concept, ok});
  btn.style.display="none"; document.getElementById('btnSkip').style.display="none"; document.getElementById('btnNext').style.display="flex";
}

function handleSkip() { S.totalSkipped++; QZ.results.push({concept:QZ.questions[QZ.currentIdx].concept, ok:false, skipped:true}); handleNext(); }
function handleNext() { QZ.currentIdx++; if(QZ.currentIdx >= QZ.questions.length) finishQuiz(); else renderQuestion(); }

async function finishQuiz() {
  QZ.results.forEach(r => {
    S.totalAnswered++; if(r.ok) S.totalCorrect++;
    if(!S.termStats[r.concept]) S.termStats[r.concept]={answered:0,correct:0,skipped:0};
    S.termStats[r.concept].answered++; if(r.ok) S.termStats[r.concept].correct++;
    if(r.skipped) S.termStats[r.concept].skipped++;
  });
  await api('PUT_STUDENT', { student: S });
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('resultScreen').classList.add('active');
  document.getElementById('resScore').textContent = `You scored ${QZ.score} / 10`;
}

// --- RANKINGS ---
async function goRank() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('rankScreen').classList.add('active');
    document.getElementById('rankContent').innerHTML = `<div style="text-align:center; padding:40px;"><div class="spinner"></div></div>`;
    const data = await api('GET_ALL');
    const sorted = Object.values(data.students).sort((a,b) => calcAcc(b.totalCorrect, b.totalAnswered, b.totalSkipped) - calcAcc(a.totalCorrect, a.totalAnswered, a.totalSkipped));
    document.getElementById('rankContent').innerHTML = `<h3>Top Accuracy</h3>` + sorted.map((s,i) => `<div class="card" style="display:flex; justify-content:space-between;"><span>#${i+1} ${s.nickname}</span><b>${calcAcc(s.totalCorrect, s.totalAnswered, s.totalSkipped)}%</b></div>`).join('');
}

async function goTeacher() {
  const pin = prompt("Teacher PIN:");
  const d = await api('AUTH', { pin });
  if (d.ok) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('rankScreen').classList.add('active');
    const data = await api('GET_ALL');
    document.getElementById('rankContent').innerHTML = `<h3>Student Records</h3>` + Object.values(data.students).map(s => `<div class="card" style="font-size:0.8rem;"><b>${s.name}</b> (${s.nickname})<br>Grp ${s.group} &middot; Teacher ${s.teacher}<br>Accuracy: ${calcAcc(s.totalCorrect, s.totalAnswered, s.totalSkipped)}%</div>`).join('');
  } else alert("Access Denied");
}

function handleSignOut() { if(confirm("Sign out? Your progress is saved.")) location.reload(); }
function exitQuiz() { if(confirm("Progress in this quiz will be lost. Exit?")) showHome(); }
</script>
</body>
</html>
