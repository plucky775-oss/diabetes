const STORAGE_KEY = ‘metabolic-reset-v3’;
const today = new Date();
const nowDate = new Date().toISOString().slice(0,10);

const defaultData = {
diagnosis: [
{ date: ‘2026-04-10’, fasting: 102, insulin: 11.8, a1c: 5.8, weight: 76.4, waist: 91, note: ‘초기 기준값’ }
],
glucose: [
{ date: ‘2026-04-06’, time: ‘07:20’, type: ‘fasting’, value: 101, food: ‘’, note: ‘수면 6시간’ },
{ date: ‘2026-04-07’, time: ‘07:10’, type: ‘fasting’, value: 97, food: ‘’, note: ‘저녁 탄수 적음’ },
{ date: ‘2026-04-08’, time: ‘13:10’, type: ‘post1’, value: 144, food: ‘냉면’, note: ‘걷기 없음’ },
{ date: ‘2026-04-08’, time: ‘14:10’, type: ‘post2’, value: 116, food: ‘냉면’, note: ‘’ },
{ date: ‘2026-04-09’, time: ‘12:55’, type: ‘post1’, value: 128, food: ‘현미밥’, note: ‘식후 15분 걷기’ },
{ date: ‘2026-04-09’, time: ‘13:55’, type: ‘post2’, value: 108, food: ‘현미밥’, note: ‘’ },
{ date: ‘2026-04-10’, time: ‘07:15’, type: ‘fasting’, value: 95, food: ‘’, note: ‘아침 공복’ }
],
diet: [
{ date: ‘2026-04-10’, mealType: ‘점심’, reverseMeal: true, chopsticksOnly: true, carbFood: ‘백미’, giSwap: ‘백미 → 현미’, note: ‘액상과당 음료 없음’ }
],
exercise: [
{ date: ‘2026-04-08’, kind: ‘squat’, minutes: 18, intensity: ‘중강도’, goldenTime: false, note: ‘하체 근력’ },
{ date: ‘2026-04-09’, kind: ‘walking’, minutes: 20, intensity: ‘가벼움’, goldenTime: true, note: ‘점심 후 걷기’ }
],
hormone: [
{ date: ‘2026-04-09’, sleep: 7.5, stress: 2, meditation: 10, sevenHours: true, caffeineCut: true },
{ date: ‘2026-04-10’, sleep: 6.5, stress: 3, meditation: 5, sevenHours: false, caffeineCut: true }
],
missionIndex: 0,
missionDoneToday: false,
week: 1
};

const missions = [
{ title: ‘식후 15분 걷기’, text: ‘식사 종료 후 30분 안에 15분 걷기를 완료해 보세요.’, phase: ‘Phase 1’, icon: ‘🏃’ },
{ title: ‘거꾸로 식사법’, text: ‘채소 → 단백질 → 탄수화물 순서를 한 끼라도 실천해 보세요.’, phase: ‘Phase 1’, icon: ‘🥗’ },
{ title: ‘하체 근력 루틴’, text: ‘스쿼트 또는 런지를 10분 이상 수행해 GLUT4 자극을 주세요.’, phase: ‘Phase 2’, icon: ‘💪’ },
{ title: ‘수면 7시간’, text: ‘오늘은 7시간 이상 수면 확보를 목표로 해보세요.’, phase: ‘Phase 3’, icon: ‘😴’ }
];

const giSwaps = [
[‘백미’, ‘현미’], [‘식빵’, ‘통밀빵’], [‘시리얼’, ‘오트밀’],
[‘떡’, ‘삶은 고구마’], [‘설탕음료’, ‘무가당 차’], [‘과자’, ‘견과류’]
];

const roadmapPhases = [
{ phase: ‘Phase 1’, weeks: ‘1~4주’, goal: ‘기반 재설정’, actions: ‘거꾸로 식사 적응 · 액상과당 완전 차단’ },
{ phase: ‘Phase 2’, weeks: ’5~8주’, goal: ‘집중 연소’, actions: ‘하체 저항성 운동 루틴화 · 초기 체중 3% 감량’ },
{ phase: ‘Phase 3’, weeks: ‘9~12주’, goal: ‘대사 안착’, actions: ’목표 체중 5~7% 달성 · 대사 유연성 지표 정상화’ }
];

let state = load();
let currentView = ‘home’;
let currentRange = 7;
let currentType = ‘fasting’;
let timerInterval = null;
let timerSeconds = 300;
let timerStageIndex = 0;
const timerStages = [
{ name: ‘채소’, seconds: 300, guide: ‘채소 5분부터 시작하세요.’ },
{ name: ‘단백질’, seconds: 300, guide: ‘단백질 5분 단계입니다.’ },
{ name: ‘탄수화물’, seconds: 600, guide: ‘이제 탄수화물을 천천히 드세요.’ }
];

function load() {
const raw = localStorage.getItem(STORAGE_KEY);
if (!raw) return structuredClone(defaultData);
try { return { …structuredClone(defaultData), …JSON.parse(raw) }; }
catch { return structuredClone(defaultData); }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function qs(id) { return document.getElementById(id); }
function avg(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function sortDesc(items, key=‘date’) {
return […items].sort((a,b) => (`${b[key]}${b.time||''}`).localeCompare(`${a[key]}${a.time||''}`));
}
function recentWithinDays(items, days) {
const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (days - 1));
return items.filter(item => new Date(item.date) >= cutoff);
}
function calculateHoma(fasting, insulin) {
return fasting && insulin ? (Number(fasting) * Number(insulin)) / 405 : 0;
}
function classifyPrediabetes(fasting, a1c) {
if (Number(a1c) >= 6.5 || Number(fasting) >= 126) return ‘당뇨병 범위’;
if ((Number(a1c) >= 5.7 && Number(a1c) <= 6.4) || (Number(fasting) >= 100 && Number(fasting) <= 125)) return ‘당뇨전단계’;
return ‘정상 범위’;
}
function metabolicState(score) {
if (score >= 75) return ‘대사 유연성 회복 구간’;
if (score >= 50) return ‘전환 구간’;
return ‘혈당 스파이크 경계 구간’;
}
function getMetabolicScore() {
const latestDx = sortDesc(state.diagnosis)[0];
const fastingAvg = avg(recentWithinDays(state.glucose.filter(x=>x.type===‘fasting’), 7).map(x=>x.value)) || (latestDx?.fasting || 100);
const postAvg = avg(recentWithinDays(state.glucose.filter(x=>x.type!==‘fasting’), 7).map(x=>x.value)) || 130;
const sleepAvg = avg(recentWithinDays(state.hormone, 7).map(x=>x.sleep)) || 7;
const exerciseMins = recentWithinDays(state.exercise, 7).reduce((a,b)=>a+Number(b.minutes),0);
let score = 100;
score -= Math.max(0, fastingAvg - 90) * 0.9;
score -= Math.max(0, postAvg - 120) * 0.45;
score += Math.min(10, (sleepAvg - 6) * 4);
score += Math.min(10, exerciseMins / 20);
return Math.max(15, Math.min(98, Math.round(score)));
}
function getExerciseGap() {
const latest = sortDesc(state.exercise)[0];
if (!latest) return 99;
return Math.floor((today - new Date(latest.date)) / (1000*60*60*24));
}
function getRiskFoods() {
const foods = {};
state.glucose.filter(x => x.food && x.type !== ‘fasting’).forEach(x => {
if (!foods[x.food]) foods[x.food] = [];
foods[x.food].push(Number(x.value));
});
return Object.entries(foods)
.map(([food, vals]) => ({ food, avg: avg(vals), count: vals.length }))
.sort((a,b) => b.avg - a.avg);
}

function renderView(view) {
currentView = view;
document.querySelectorAll(’.view’).forEach(v => v.classList.remove(‘active’));
qs(`view-${view}`).classList.add(‘active’);
document.querySelectorAll(’.nav-btn’).forEach(btn =>
btn.classList.toggle(‘active’, btn.dataset.nav === view)
);
window.scrollTo({ top: 0, behavior: ‘smooth’ });
}

function setDefaults() {
document.querySelectorAll(‘input[type=“date”]’).forEach(i => { if (!i.value) i.value = nowDate; });
const glucoseTime = document.querySelector(’#glucoseForm input[name=“time”]’);
if (glucoseTime && !glucoseTime.value) {
glucoseTime.value = `${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`;
}
}

function renderDashboard() {
const score = getMetabolicScore();
qs(‘metabolicScore’).textContent = score;
qs(‘rangeFill’).style.width = `${score}%`;
qs(‘statusLabel’).textContent = score >= 75 ? ‘대사 유연성 구역’ : score >= 50 ? ‘전환 구역’ : ‘스파이크 경계’;
const dot = qs(‘statusDot’);
dot.style.background = score >= 75 ? ‘#22c55e’ : score >= 50 ? ‘#f59e0b’ : ‘#ef4444’;
dot.style.boxShadow = `0 0 10px ${score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}`;
qs(‘metabolicSummary’).textContent = metabolicState(score);

const mission = missions[state.missionIndex % missions.length];
qs(‘todayMissionTitle’).textContent = mission.title;
qs(‘todayMissionText’).textContent = mission.text;
qs(‘phasePill’).textContent = mission.phase + (state.missionDoneToday ? ’ · ✓ 완료’ : ‘’);
document.querySelector(’.mission-icon’).textContent = mission.icon;

// Show badge dot if mission not done
const badgeDot = qs(‘missionDotBadge’);
if (badgeDot) badgeDot.classList.toggle(‘visible’, !state.missionDoneToday);

const fastingList = sortDesc(state.glucose.filter(x=>x.type===‘fasting’));
const latestDx = sortDesc(state.diagnosis)[0];
const homa = latestDx ? calculateHoma(latestDx.fasting, latestDx.insulin) : 0;
const gap = getExerciseGap();
const riskFood = getRiskFoods()[0];

qs(‘homeFasting’).textContent = fastingList[0] ? `${fastingList[0].value}` : ‘—’;
qs(‘homeHoma’).textContent = homa ? homa.toFixed(2) : ‘—’;
qs(‘homeExerciseGap’).textContent = `${gap}일`;
qs(‘homeRiskFood’).textContent = riskFood?.food || ‘데이터 필요’;

renderHomeChart();
}

function renderHomeChart() {
const svg = qs(‘roadmapChart’);
const items = sortDesc(state.glucose).slice(0, 12).reverse();
if (!items.length) { svg.innerHTML = ‘’; return; }
const w = 360, h = 160, px = 20, py = 16;
const values = items.map(x => Number(x.value));
const min = Math.max(60, Math.min(…values) - 10);
const max = Math.max(180, Math.max(…values) + 10);
const stepX = (w - px * 2) / Math.max(1, items.length - 1);
const toY = v => h - py - ((v - min) / (max - min)) * (h - py * 2);
const pts = items.map((item, i) => [px + i * stepX, toY(item.value), item]);
const polyline = pts.map(([x,y]) => `${x},${y}`).join(’ ‘);
const dots = pts.map(([x,y,item]) => {
const col = item.value >= 140 ? ‘#ef4444’ : item.value >= 110 ? ‘#f59e0b’ : ‘#22c55e’;
return `<circle cx="${x}" cy="${y}" r="4.5" fill="${col}" opacity="0.9"/>`;
}).join(’’);
// Filled area
const area = `${px},${h - py} ${pts.map(([x,y])=>`${x},${y}`).join(' ')} ${px + (items.length-1)*stepX},${h - py}`;
svg.innerHTML = ` <defs> <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.15"/> <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/> </linearGradient> </defs> <polygon points="${area}" fill="url(#areaGrad)"/> <polyline fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round" points="${polyline}"/> ${dots} <text x="${px}" y="14" fill="#94a3b8" font-size="11" font-family="DM Sans,sans-serif">최근 혈당 흐름</text>`;
}

function renderDiagnosis() {
const latest = sortDesc(state.diagnosis)[0];
if (!latest) return;
const homa = calculateHoma(latest.fasting, latest.insulin);
const risk = classifyPrediabetes(latest.fasting, latest.a1c);
const score = getMetabolicScore();
qs(‘diagnosisDatePill’).textContent = latest.date;
qs(‘diagHoma’).textContent = homa.toFixed(2);
qs(‘diagPrediabetes’).textContent = risk;
qs(‘diagState’).textContent = metabolicState(score);
qs(‘diagInsight’).textContent = homa >= 2.5
? `HOMA-R ${homa.toFixed(2)}로 인슐린 저항성 관리가 필요합니다. 식후 걷기와 하체 근력 루틴을 우선 강화하세요.`
: `HOMA-R ${homa.toFixed(2)}로 비교적 양호합니다. 식후 스파이크와 수면 패턴도 같이 관리하면 좋습니다.`;
qs(‘diagnosisList’).innerHTML = sortDesc(state.diagnosis).map(item => {
const h = calculateHoma(item.fasting, item.insulin);
return `<div class="list-item"> <div class="list-item-top"><strong>${item.date}</strong><small>HOMA-R ${h.toFixed(2)}</small></div> <div style="font-size:14px;color:#8ba0bd">공복 ${item.fasting} · 인슐린 ${item.insulin} · HbA1c ${item.a1c}%</div> ${item.note ? `<small>${item.note}</small>` : ''} </div>`;
}).join(’’);
}

function renderGlucose() {
const source = recentWithinDays(state.glucose.filter(x=>x.type===currentType), currentRange)
.sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
const svg = qs(‘glucoseChart’);
const summaryEl = qs(‘glucoseSummaryText’);
if (!source.length) {
svg.innerHTML = ‘<text x="50%" y="50%" text-anchor="middle" fill="#6a85a4" font-size="14">기록이 없습니다</text>’;
summaryEl.textContent = ‘기록이 부족합니다.’;
qs(‘riskFoodList’).innerHTML = ‘<div class="list-item"><strong>아직 음식별 데이터가 부족합니다.</strong></div>’;
return;
}
const w=360, h=200, px=28, py=24;
const values = source.map(x=>Number(x.value));
const min = Math.max(60, Math.min(…values, 90) - 10);
const max = Math.max(…values, 160) + 10;
const stepX = (w - px*2) / Math.max(1, source.length - 1);
const target = currentType===‘fasting’ ? 100 : currentType===‘post1’ ? 140 : 120;
const toY = v => h - py - ((v - min) / (max - min)) * (h - py*2);
const targetY = toY(target);
const pts = source.map((item,i) => [px + i * stepX, toY(item.value), item]);
const polyline = pts.map(([x,y]) => `${x},${y}`).join(’ ‘);
const area = `${px},${h-py} ${pts.map(([x,y])=>`${x},${y}`).join(' ')} ${px+(source.length-1)*stepX},${h-py}`;
const dots = pts.map(([x,y,item]) =>
`<circle cx="${x}" cy="${y}" r="5" fill="${item.value > target ? '#ef4444' : '#22c55e'}"/>`
).join(’’);
svg.innerHTML = ` <defs> <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stop-color="#22c55e" stop-opacity="0.12"/> <stop offset="100%" stop-color="#22c55e" stop-opacity="0"/> </linearGradient> </defs> <line x1="${px}" y1="${targetY}" x2="${w-px}" y2="${targetY}" stroke="#f59e0b" stroke-dasharray="5 5" stroke-opacity="0.6"/> <polygon points="${area}" fill="url(#gGrad)"/> <polyline fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linejoin="round" points="${polyline}"/> ${dots} <text x="${px}" y="18" fill="#94a3b8" font-size="11" font-family="DM Sans,sans-serif">${currentType==='fasting'?'공복':'식후'} ${currentRange}일</text> <text x="${w-px}" y="${targetY-6}" text-anchor="end" fill="#f59e0b" font-size="11" font-family="DM Sans,sans-serif">기준 ${target}</text>`;
const average = avg(values);
const maxVal = Math.max(…values);
summaryEl.textContent = `평균 ${average.toFixed(1)} mg/dL · 최고 ${maxVal} mg/dL · 기준 ${target} mg/dL`;
qs(‘riskFoodList’).innerHTML = getRiskFoods().map(item =>
`<div class="list-item"> <div class="list-item-top"><strong>${item.food}</strong><small>평균 ${item.avg.toFixed(1)} mg/dL</small></div> <small>${item.count}회 기록</small> </div>`
).join(’’) || ‘<div class="list-item"><strong>아직 음식별 데이터가 부족합니다.</strong></div>’;
}

function renderDiet() {
qs(‘giSwapList’).innerHTML = giSwaps.map(([from,to]) =>
`<div class="chip"><span>${from}</span><strong>→ ${to}</strong></div>`
).join(’’);
const latest = sortDesc(state.diet).slice(0,8);
const score = latest.reduce((s,x) => s + (x.reverseMeal?2:0) + (x.chopsticksOnly?1:0) + (x.giSwap?1:0), 0);
qs(‘dietScorePill’).textContent = `${score}점`;
qs(‘dietList’).innerHTML = latest.map(item =>
`<div class="list-item"> <div class="list-item-top"><strong>${item.date} · ${item.mealType}</strong><small>${item.giSwap || '대안 없음'}</small></div> <div style="font-size:13px;color:#8ba0bd">${item.reverseMeal?'거꾸로 ✓':'—'} · ${item.chopsticksOnly?'젓가락 ✓':'—'}</div> ${item.note ? `<small>${item.note}</small>` : ''} </div>`
).join(’’);
}

function renderExercise() {
const recent = recentWithinDays(state.exercise, 7);
const aerobic = recent.filter(x => [‘walking’,‘cardio’].includes(x.kind)).reduce((a,b)=>a+Number(b.minutes),0);
const strength = recent.filter(x => [‘squat’,‘lunge’].includes(x.kind)).length;
const gap = getExerciseGap();
qs(‘exerciseAerobic’).textContent = `${aerobic}분`;
qs(‘exerciseStrength’).textContent = `${strength}회`;
qs(‘exerciseGap’).textContent = `${gap}일`;
qs(‘homeExerciseGap’).textContent = `${gap}일`;
qs(‘gapPill’).textContent = gap >= 2 ? ‘⚠ 경고’ : ‘정상’;
qs(‘gapPill’).classList.toggle(‘warn’, gap >= 2);
qs(‘gapMessage’).textContent = gap >= 2
? `연속 ${gap}일 공백입니다. 오늘 하체 근력 또는 식후 걷기를 넣어주세요.`
: ‘운동 공백 관리가 잘 되고 있습니다. 이 흐름을 유지하세요.’;
const labelEx = k => ({walking:‘식후 걷기’, squat:‘스쿼트’, lunge:‘런지’, cardio:‘유산소’})[k] || k;
qs(‘exerciseList’).innerHTML = sortDesc(state.exercise).map(item =>
`<div class="list-item"> <div class="list-item-top"><strong>${item.date} · ${labelEx(item.kind)}</strong><small>${item.minutes}분</small></div> <div style="font-size:13px;color:#8ba0bd">${item.intensity} · ${item.goldenTime?'🟢 골든타임':'일반'}</div> ${item.note ? `<small>${item.note}</small>` : ''} </div>`
).join(’’);
}

function renderHormone() {
const recent = recentWithinDays(state.hormone, 7);
const sleepAvg = avg(recent.map(x=>x.sleep));
const stressAvg = avg(recent.map(x=>x.stress));
const medAvg = avg(recent.map(x=>x.meditation));
qs(‘avgSleep’).textContent = recent.length ? `${sleepAvg.toFixed(1)}h` : ‘—’;
qs(‘avgStress’).textContent = recent.length ? stressAvg.toFixed(1) : ‘—’;
qs(‘avgMeditation’).textContent = recent.length ? `${medAvg.toFixed(0)}분` : ‘—’;
qs(‘hormonePill’).textContent = sleepAvg >= 7 && stressAvg <= 2.5 ? ‘안정적’ : ‘조정 필요’;
const insights = [];
if (sleepAvg && sleepAvg < 7) insights.push(‘최근 평균 수면이 7시간 미만입니다. 공복혈당 안정화를 위해 취침 시간을 앞당겨 보세요.’);
if (stressAvg && stressAvg >= 3) insights.push(‘스트레스가 높은 편입니다. 10분 호흡 또는 명상 루틴을 고정해 두면 좋습니다.’);
if (medAvg && medAvg < 10) insights.push(‘명상 루틴이 짧습니다. 최소 10분을 목표로 설정해 보세요.’);
if (!insights.length) insights.push(‘수면과 스트레스 관리가 안정적입니다. 이 흐름을 유지하면 대사 회복에 유리합니다.’);
qs(‘hormoneInsights’).innerHTML = insights.map(t => `<div class="insight-card">${t}</div>`).join(’’);
}

function renderRoadmap() {
const week = Number(state.week || 1);
qs(‘weekRange’).value = week;
qs(‘roadmapWeekPill’).textContent = `${week}주차`;
qs(‘roadmapProgressFill’).style.width = `${(week/12)*100}%`;
let phaseText = ‘’;
if (week <= 4) phaseText = ‘Phase 1 · 기반 재설정: 거꾸로 식사 적응, 액상과당 차단에 집중하는 시기입니다.’;
else if (week <= 8) phaseText = ‘Phase 2 · 집중 연소: 하체 저항성 운동을 루틴화하고 초기 체중 3% 감량을 노립니다.’;
else phaseText = ‘Phase 3 · 대사 안착: 목표 체중 5~7%와 대사 유연성 안정화에 집중하는 단계입니다.’;
qs(‘roadmapSummary’).textContent = phaseText;
qs(‘phaseGrid’).innerHTML = roadmapPhases.map(phase =>
`<div class="card"> <div class="section-title-row"> <h3>${phase.phase}</h3> <span class="pill">${phase.weeks}</span> </div> <div class="insight-card"> <strong style="font-size:15px;display:block;margin-bottom:6px">${phase.goal}</strong> <span style="font-size:13px">${phase.actions}</span> </div> </div>`
).join(’’);
}

function renderAll() {
renderDashboard();
renderDiagnosis();
renderGlucose();
renderDiet();
renderExercise();
renderHormone();
renderRoadmap();
setDefaults();
save();
}

// ── BIND NAVIGATION ──
document.querySelectorAll(’[data-nav]’).forEach(btn =>
btn.addEventListener(‘click’, () => renderView(btn.dataset.nav))
);

// ── BIND FORMS ──
qs(‘diagnosisForm’).addEventListener(‘submit’, e => {
e.preventDefault();
state.diagnosis.unshift(Object.fromEntries(new FormData(e.target)));
renderAll(); e.target.reset(); setDefaults(); renderView(‘diagnosis’);
});
qs(‘glucoseForm’).addEventListener(‘submit’, e => {
e.preventDefault();
const entry = Object.fromEntries(new FormData(e.target));
entry.value = Number(entry.value);
state.glucose.unshift(entry);
renderAll(); e.target.reset(); setDefaults(); renderView(‘glucose’);
});
qs(‘dietForm’).addEventListener(‘submit’, e => {
e.preventDefault();
const fd = new FormData(e.target);
const entry = Object.fromEntries(fd);
entry.reverseMeal = fd.get(‘reverseMeal’) === ‘on’;
entry.chopsticksOnly = fd.get(‘chopsticksOnly’) === ‘on’;
state.diet.unshift(entry);
renderAll(); e.target.reset(); setDefaults(); renderView(‘diet’);
});
qs(‘exerciseForm’).addEventListener(‘submit’, e => {
e.preventDefault();
const fd = new FormData(e.target);
const entry = Object.fromEntries(fd);
entry.minutes = Number(entry.minutes);
entry.goldenTime = fd.get(‘goldenTime’) === ‘on’;
state.exercise.unshift(entry);
renderAll(); e.target.reset(); setDefaults(); renderView(‘exercise’);
});
qs(‘hormoneForm’).addEventListener(‘submit’, e => {
e.preventDefault();
const fd = new FormData(e.target);
const entry = Object.fromEntries(fd);
entry.sleep = Number(entry.sleep);
entry.stress = Number(entry.stress);
entry.meditation = Number(entry.meditation);
entry.sevenHours = fd.get(‘sevenHours’) === ‘on’;
entry.caffeineCut = fd.get(‘caffeineCut’) === ‘on’;
state.hormone.unshift(entry);
renderAll(); e.target.reset(); setDefaults(); renderView(‘hormone’);
});

// ── CHART CONTROLS ──
document.querySelectorAll(’.seg-btn’).forEach(btn => btn.addEventListener(‘click’, () => {
document.querySelectorAll(’.seg-btn’).forEach(b => b.classList.remove(‘active’));
btn.classList.add(‘active’);
currentRange = Number(btn.dataset.range);
renderGlucose();
}));
document.querySelectorAll(’.type-btn’).forEach(btn => btn.addEventListener(‘click’, () => {
document.querySelectorAll(’.type-btn’).forEach(b => b.classList.remove(‘active’));
btn.classList.add(‘active’);
currentType = btn.dataset.type;
renderGlucose();
}));

// ── MISSION ──
qs(‘missionCompleteBtn’).addEventListener(‘click’, () => {
state.missionDoneToday = true;
renderAll();
});
qs(‘missionSkipBtn’).addEventListener(‘click’, () => {
state.missionIndex = (state.missionIndex + 1) % missions.length;
state.missionDoneToday = false;
renderAll();
});
qs(‘todayMissionBtn’).addEventListener(‘click’, () => renderView(‘home’));

// ── TIMER ──
function updateTimerDisplay() {
const mins = String(Math.floor(timerSeconds / 60)).padStart(2, ‘0’);
const secs = String(timerSeconds % 60).padStart(2, ‘0’);
qs(‘timerDisplay’).textContent = `${mins}:${secs}`;
qs(‘timerStage’).textContent = timerStages[timerStageIndex].name;
qs(‘timerGuide’).textContent = timerStages[timerStageIndex].guide;
}
updateTimerDisplay();
qs(‘timerStartBtn’).addEventListener(‘click’, () => {
clearInterval(timerInterval);
timerInterval = setInterval(() => {
if (timerSeconds > 0) { timerSeconds–; }
else {
clearInterval(timerInterval);
qs(‘timerGuide’).textContent = `${timerStages[timerStageIndex].name} 단계 완료!`;
}
updateTimerDisplay();
}, 1000);
});
qs(‘timerNextBtn’).addEventListener(‘click’, () => {
timerStageIndex = (timerStageIndex + 1) % timerStages.length;
timerSeconds = timerStages[timerStageIndex].seconds;
updateTimerDisplay();
});
qs(‘timerResetBtn’).addEventListener(‘click’, () => {
clearInterval(timerInterval);
timerStageIndex = 0;
timerSeconds = timerStages[0].seconds;
updateTimerDisplay();
});

// ── GOLDEN ALARM ──
qs(‘goldenAlarmBtn’).addEventListener(‘click’, () => {
const value = qs(‘mealEndTime’).value;
if (!value) { qs(‘goldenAlarmText’).textContent = ‘먼저 식사 종료 시간을 입력해 주세요.’; return; }
const [hh, mm] = value.split(’:’).map(Number);
const total = hh * 60 + mm + 30;
const tH = String(Math.floor((total % (24*60)) / 60)).padStart(2,‘0’);
const tM = String(total % 60).padStart(2,‘0’);
qs(‘goldenAlarmStatus’).textContent = ‘계산 완료’;
qs(‘goldenAlarmText’).textContent = `추천 걷기 시작: ${tH}:${tM} — 최소 15분 가볍게 걷기`;
});

// ── ROADMAP WEEK ──
qs(‘weekRange’).addEventListener(‘input’, e => {
state.week = Number(e.target.value);
renderRoadmap();
save();
});

// ── INIT ──
renderAll();
renderView(‘home’);