const STORAGE_KEY = 'metabolic-reset-v2';
const state = {
  currentPage: 'home',
  recordPanel: 'glucose',
  glucoseType: 'fasting',
  missionIndex: 0,
  week: 1,
  timer: { stageIndex: 0, seconds: 300, running: false, interval: null },
  data: loadState(),
};

const missions = [
  { week: '1주차', title: '식후 15분 걷기', text: '식사가 끝난 뒤 30분 안에 가볍게 걸어보세요.' },
  { week: '2주차', title: '저녁 탄수화물 줄이기', text: '오늘 저녁은 밥 양을 평소보다 조금만 줄여보세요.' },
  { week: '3주차', title: '7시간 수면 챙기기', text: '수면을 안정적으로 확보하면 다음날 혈당 흐름도 편해집니다.' },
  { week: '4주차', title: '하체 운동 10분', text: '스쿼트나 런지를 가볍게 시작해 보세요.' }
];

const programPhases = {
  1: { phase: 'Phase 1', title: '기반 재설정', goal: '거꾸로 식사법 적응, 액상과당 완전 차단', items: ['채소 먼저 먹기', '단 음료 끊기', '식후 걷기 시작'] },
  2: { phase: 'Phase 1', title: '기반 재설정', goal: '식사 흐름 안정화', items: ['젓가락 위주 식사', '저녁 과식 줄이기', '수면시간 기록 시작'] },
  3: { phase: 'Phase 1', title: '기반 재설정', goal: '기록 습관 만들기', items: ['공복혈당 자주 기록', '식후 반응 음식 메모', '주 3회 걷기'] },
  4: { phase: 'Phase 1', title: '기반 재설정', goal: '기초 생활패턴 완성', items: ['늦은 야식 피하기', '하루 물 섭취 점검', '기본 루틴 유지'] },
  5: { phase: 'Phase 2', title: '집중 연소', goal: '하체 근력운동 루틴화, 초기 체중 3% 감량', items: ['주 2회 하체운동', '식후 걷기 고정', '고GI 음식 대체하기'] },
  6: { phase: 'Phase 2', title: '집중 연소', goal: '에너지 소비 늘리기', items: ['걷기 시간 늘리기', '근력운동 기록하기', '식후 2시간 혈당 점검'] },
  7: { phase: 'Phase 2', title: '집중 연소', goal: '혈당 스파이크 줄이기', items: ['위험 음식 줄이기', '단백질 먼저 먹기', '주 150분 움직이기'] },
  8: { phase: 'Phase 2', title: '집중 연소', goal: '몸의 반응 이해하기', items: ['나만의 위험 음식 정리', '수면 부족 패턴 보기', '식후 운동 유지'] },
  9: { phase: 'Phase 3', title: '대사 안착', goal: '목표 체중 5~7% 달성, 대사 유연성 지표 안정화', items: ['실천 루틴 자동화', '늦은 식사 최소화', '주간 리포트 확인'] },
  10: { phase: 'Phase 3', title: '대사 안착', goal: '리듬 유지', items: ['공백 없이 운동하기', '식사 순서 유지', '식후 혈당 안정화'] },
  11: { phase: 'Phase 3', title: '대사 안착', goal: '장기 유지 습관 만들기', items: ['좋았던 식사 반복', '체중과 허리둘레 점검', '회복 루틴 유지'] },
  12: { phase: 'Phase 3', title: '대사 안착', goal: '내 몸에 맞는 관리 방식 정착', items: ['개인 맞춤 패턴 확정', '정기 검사 확인', '다음 12주 계획 세우기'] }
};

const timerStages = [
  { label: '채소', seconds: 300, guide: '채소부터 천천히 시작하세요.' },
  { label: '단백질', seconds: 300, guide: '이제 단백질을 편하게 드세요.' },
  { label: '탄수화물', seconds: 300, guide: '마지막으로 탄수화물을 천천히 드세요.' }
];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch (e) {}
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return fmt(d);
  };
  return {
    glucose: [
      { date: daysAgo(6), time: '07:20', type: 'fasting', value: 97, food: '', note: '' },
      { date: daysAgo(5), time: '07:10', type: 'fasting', value: 94, food: '', note: '' },
      { date: daysAgo(4), time: '13:10', type: 'post1', value: 129, food: '현미밥', note: '식후 15분 걷기' },
      { date: daysAgo(3), time: '07:30', type: 'fasting', value: 92, food: '', note: '' },
      { date: daysAgo(2), time: '13:20', type: 'post1', value: 141, food: '냉면', note: '걷기 못함' },
      { date: daysAgo(1), time: '07:25', type: 'fasting', value: 89, food: '', note: '' },
      { date: daysAgo(0), time: '07:18', type: 'fasting', value: 91, food: '', note: '' },
      { date: daysAgo(0), time: '13:30', type: 'post2', value: 118, food: '샐러드+단백질', note: '안정적' },
    ],
    meals: [
      { date: daysAgo(1), mealType: '점심', reverseMeal: true, chopsticksOnly: true, foods: '샐러드, 계란, 현미밥', swap: '백미 대신 현미' },
      { date: daysAgo(0), mealType: '저녁', reverseMeal: true, chopsticksOnly: false, foods: '채소, 소고기, 소량 밥', swap: '면 대신 밥 소량' },
    ],
    exercise: [
      { date: daysAgo(5), kind: 'walking', minutes: 20, intensity: '중간', afterMeal: true, note: '점심 후 걷기' },
      { date: daysAgo(3), kind: 'strength', minutes: 15, intensity: '중간', afterMeal: false, note: '스쿼트, 런지' },
      { date: daysAgo(1), kind: 'walking', minutes: 25, intensity: '가벼움', afterMeal: true, note: '저녁 후 걷기' },
    ],
    routine: [
      { date: daysAgo(1), sleep: 7.5, stress: 2, water: 7, meditation: true, supplements: true },
      { date: daysAgo(0), sleep: 6.5, stress: 3, water: 6, meditation: false, supplements: true },
    ],
    diagnosis: [
      { date: daysAgo(0), fasting: 91, insulin: 8.2, a1c: 5.4 }
    ]
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function qs(id) { return document.getElementById(id); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }
function num(v) { return typeof v === 'number' ? v : Number(v); }
function average(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
function todayStr() { return new Date().toISOString().slice(0,10); }
function fmtDate(dateStr) { const [y,m,d] = dateStr.split('-'); return `${m}.${d}`; }
function sortByDateDesc(arr) { return [...arr].sort((a,b) => `${b.date} ${b.time||''}`.localeCompare(`${a.date} ${a.time||''}`)); }
function latestOf(arr) { return sortByDateDesc(arr)[0]; }
function lastDays(arr, days) {
  const cutoff = new Date();
  cutoff.setHours(0,0,0,0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return arr.filter(item => new Date(item.date) >= cutoff);
}

function render() {
  renderHome();
  renderGlucose();
  renderMeals();
  renderExercise();
  renderRoutine();
  renderDiagnosis();
  renderProgram();
  renderRiskFoods();
  renderReport();
  updatePage();
  saveState();
}

function renderHome() {
  const fastingLatest = latestOf(state.data.glucose.filter(x => x.type === 'fasting'));
  const postLatest = latestOf(state.data.glucose.filter(x => x.type !== 'fasting'));
  const weeklyWalk = lastDays(state.data.exercise, 7).filter(x => x.kind === 'walking').reduce((sum, x) => sum + num(x.minutes), 0);
  const fastingAvg = average(lastDays(state.data.glucose, 7).filter(x => x.type === 'fasting').map(x => num(x.value))) || 0;
  const postAvg = average(lastDays(state.data.glucose, 7).filter(x => x.type !== 'fasting').map(x => num(x.value))) || 0;

  let score = 84;
  if (fastingAvg > 100) score -= 10;
  else if (fastingAvg > 95) score -= 5;
  if (postAvg > 140) score -= 10;
  else if (postAvg > 125) score -= 5;
  if (weeklyWalk < 60) score -= 8;
  if (latestRoutineScore() < 60) score -= 6;
  score = Math.max(45, Math.min(96, Math.round(score)));

  let stateLabel = '안정 흐름';
  let headline = '지금 흐름은 비교적 안정적이에요';
  let desc = '지금처럼 식후 걷기와 수면을 유지하면 도움이 됩니다.';
  if (score < 70) {
    stateLabel = '조심 구간';
    headline = '조금만 다듬으면 더 편안해질 수 있어요';
    desc = '최근 식후 혈당이나 운동 공백을 먼저 점검해보세요.';
  }
  if (score < 58) {
    stateLabel = '집중 관리';
    headline = '이번 주는 생활리듬 정비가 먼저예요';
    desc = '늦은 식사, 걷기 공백, 수면 부족부터 가볍게 줄여보세요.';
  }

  qs('heroState').textContent = stateLabel;
  qs('heroHeadline').textContent = headline;
  qs('heroDescription').textContent = desc;
  qs('heroScore').textContent = score;
  qs('heroFasting').textContent = fastingLatest ? `${fastingLatest.value}` : '-';
  qs('heroPost').textContent = postLatest ? `${postLatest.value}` : '-';
  qs('heroWalking').textContent = `${weeklyWalk}분`;
  qs('todaySummary').textContent = fastingLatest ? `${fmtDate(fastingLatest.date)} 기준 공복혈당 ${fastingLatest.value}mg/dL, 생활관리 중심으로 쉽게 볼 수 있게 정리했어요.` : '첫 기록을 남기면 오늘 흐름을 부드럽게 요약해드려요.';

  const good = weeklyWalk >= 60 ? '식후 걷기가 꾸준해요' : '작은 걸음부터 다시 시작해보면 좋아요';
  const care = postAvg > 135 ? '식후 혈당을 올리는 음식이 있는지 확인해보세요' : '늦은 저녁이나 수면 부족만 조심하면 좋아요';
  qs('goodPoint').textContent = good;
  qs('carePoint').textContent = care;

  drawLineChart('homeChart', lastDays(state.data.glucose, 7).slice(-7), { includeAxis: false, type: 'mixed' });
}

function renderGlucose() {
  const data = sortByDateDesc(state.data.glucose.filter(x => x.type === state.glucoseType)).slice(0, 8);
  const list = qs('glucoseList');
  list.innerHTML = data.length ? data.map(item => `
    <article class="log-item">
      <div class="log-item-head">
        <strong>${labelType(item.type)} · ${item.value}mg/dL</strong>
        <span class="badge">${fmtDate(item.date)}</span>
      </div>
      <p>${item.food ? `음식: ${escapeHtml(item.food)} · ` : ''}${item.note ? escapeHtml(item.note) : '간단 기록'}</p>
      <div class="meta-line">${item.time || ''}</div>
    </article>
  `).join('') : emptyState('아직 혈당 기록이 없어요.');

  const chartData = sortByDateDesc(state.data.glucose.filter(x => x.type === state.glucoseType)).slice(0,7).reverse();
  drawLineChart('glucoseChart', chartData, { includeAxis: true, type: state.glucoseType });
  const avg = average(chartData.map(x => num(x.value)));
  qs('glucoseSummary').textContent = avg ? `${labelType(state.glucoseType)} 평균은 ${avg.toFixed(0)}mg/dL입니다.` : '기록을 추가하면 흐름이 보입니다.';
}

function renderMeals() {
  const list = qs('mealList');
  const data = sortByDateDesc(state.data.meals).slice(0, 8);
  list.innerHTML = data.length ? data.map(item => `
    <article class="log-item">
      <div class="log-item-head">
        <strong>${item.mealType}</strong>
        <span class="badge">${fmtDate(item.date)}</span>
      </div>
      <p>${escapeHtml(item.foods || '기록 없음')}</p>
      <div class="meta-line">${item.reverseMeal ? '식사순서 지킴' : '식사순서 미체크'} · ${item.chopsticksOnly ? '젓가락 위주' : '일반 식사'}${item.swap ? ` · ${escapeHtml(item.swap)}` : ''}</div>
    </article>
  `).join('') : emptyState('아직 식사 기록이 없어요.');
}

function renderExercise() {
  const weekly = lastDays(state.data.exercise, 7);
  const walking = weekly.filter(x => x.kind === 'walking').reduce((s, x) => s + num(x.minutes), 0);
  const strength = weekly.filter(x => x.kind === 'strength').length;
  const total = weekly.reduce((s, x) => s + num(x.minutes), 0);
  const gap = computeExerciseGap();
  qs('walkMinutes').textContent = `${walking}분`;
  qs('strengthCount').textContent = `${strength}회`;
  qs('totalExercise').textContent = `${total}분`;
  qs('heroWalking').textContent = `${walking}분`;
  qs('exerciseGapBadge').textContent = `공백 ${gap}일`;
  qs('exerciseSummary').textContent = gap >= 2 ? '연속 2일 이상 비면 다시 리듬을 만들기 어려워질 수 있어요.' : '운동 흐름이 끊기지 않도록 잘 관리 중이에요.';
  const list = qs('exerciseList');
  const data = sortByDateDesc(state.data.exercise).slice(0, 8);
  list.innerHTML = data.length ? data.map(item => `
    <article class="log-item">
      <div class="log-item-head">
        <strong>${exerciseLabel(item.kind)} · ${item.minutes}분</strong>
        <span class="badge">${fmtDate(item.date)}</span>
      </div>
      <p>${escapeHtml(item.note || '운동 기록')}</p>
      <div class="meta-line">${item.intensity}${item.afterMeal ? ' · 식후 운동' : ''}</div>
    </article>
  `).join('') : emptyState('아직 운동 기록이 없어요.');
}

function renderRoutine() {
  const data = sortByDateDesc(state.data.routine).slice(0, 8);
  const list = qs('routineList');
  list.innerHTML = data.length ? data.map(item => `
    <article class="log-item">
      <div class="log-item-head">
        <strong>수면 ${item.sleep}시간 · 스트레스 ${item.stress}/5</strong>
        <span class="badge">${fmtDate(item.date)}</span>
      </div>
      <p>${item.meditation ? '명상함' : '명상 없음'} · ${item.supplements ? '루틴 지킴' : '루틴 미체크'} · 물 ${item.water}컵</p>
    </article>
  `).join('') : emptyState('아직 생활습관 기록이 없어요.');
  const latest = latestOf(state.data.routine);
  if (!latest) {
    qs('routineSummary').textContent = '기록을 추가하면 수면과 스트레스 흐름을 보여드려요.';
    return;
  }
  qs('routineSummary').textContent = latest.sleep >= 7 && latest.stress <= 3 ? '최근 생활리듬이 비교적 안정적이에요.' : '수면이나 스트레스 관리에 조금 더 신경 써보면 좋아요.';
}

function renderDiagnosis() {
  const latest = latestOf(state.data.diagnosis);
  if (!latest) return;
  const homa = (num(latest.fasting) * num(latest.insulin)) / 405;
  qs('diagHoma').textContent = homa.toFixed(2);
  let risk = '양호';
  if (num(latest.a1c) >= 6.5 || num(latest.fasting) >= 126) risk = '당뇨 의심';
  else if (num(latest.a1c) >= 5.7 || num(latest.fasting) >= 100) risk = '당뇨전단계';
  qs('diagRisk').textContent = risk;
  let stateText = '안정적';
  if (homa >= 2.5) stateText = '저항성 높음';
  else if (homa >= 1.8) stateText = '주의 필요';
  qs('diagState').textContent = stateText;
}

function renderProgram() {
  const info = programPhases[state.week];
  qs('missionWeek').textContent = missions[state.missionIndex].week;
  qs('missionTitle').textContent = missions[state.missionIndex].title;
  qs('missionText').textContent = missions[state.missionIndex].text;
  qs('programPhase').textContent = info.phase;
  qs('programTitle').textContent = `${info.phase} · ${info.title}`;
  qs('programGoal').textContent = info.goal;
  qs('programList').innerHTML = info.items.map(i => `<li>${escapeHtml(i)}</li>`).join('');
  qs('weekSlider').value = state.week;
}

function renderRiskFoods() {
  const foods = {};
  state.data.glucose.filter(x => x.food && x.type !== 'fasting').forEach(item => {
    const key = item.food.trim();
    foods[key] = foods[key] || [];
    foods[key].push(num(item.value));
  });
  const ranked = Object.entries(foods)
    .map(([food, vals]) => ({ food, avg: average(vals), count: vals.length }))
    .sort((a,b) => b.avg - a.avg)
    .slice(0, 6);
  const html = ranked.length ? ranked.map(item => `
    <article class="log-item">
      <div class="log-item-head">
        <strong>${escapeHtml(item.food)}</strong>
        <span class="badge">평균 ${item.avg.toFixed(0)}mg/dL</span>
      </div>
      <p>${item.count}회 기록 기준으로 비교적 혈당을 높였어요.</p>
    </article>
  `).join('') : emptyState('식후 혈당과 음식 기록이 쌓이면 자동으로 정리됩니다.');
  qs('riskFoodList').innerHTML = html;
}

function renderReport() {
  const last7Glucose = lastDays(state.data.glucose, 7);
  const fastingAvg = average(last7Glucose.filter(x => x.type === 'fasting').map(x => num(x.value)));
  const postAvg = average(last7Glucose.filter(x => x.type !== 'fasting').map(x => num(x.value)));
  const last7Walk = lastDays(state.data.exercise, 7).filter(x => x.kind === 'walking').reduce((s, x) => s + num(x.minutes), 0);
  const routines = lastDays(state.data.routine, 7);
  const sleepAvg = average(routines.map(x => num(x.sleep)));

  qs('reportFasting').textContent = fastingAvg ? `${fastingAvg.toFixed(0)} mg/dL` : '-';
  qs('reportPost').textContent = postAvg ? `${postAvg.toFixed(0)} mg/dL` : '-';
  qs('reportWalk').textContent = `${last7Walk}분`;
  qs('reportSleep').textContent = sleepAvg ? `${sleepAvg.toFixed(1)}시간` : '-';

  const insights = [];
  if (fastingAvg) insights.push(fastingAvg <= 95 ? '공복혈당 흐름이 비교적 안정적이에요.' : '공복혈당이 조금 높게 유지되는 날이 있어요. 저녁 식사량과 수면을 함께 보세요.');
  if (postAvg) insights.push(postAvg <= 125 ? '식후 혈당이 큰 폭으로 오르지 않는 편입니다.' : '식후 혈당을 올리는 음식이 있을 수 있어요. 음식 기록을 확인해보세요.');
  insights.push(last7Walk >= 90 ? '걷기 루틴이 잘 유지되고 있어요.' : '이번 주엔 걷기 시간을 조금 더 늘리면 흐름이 편안해질 수 있어요.');
  if (sleepAvg) insights.push(sleepAvg >= 7 ? '수면 시간은 비교적 괜찮아요.' : '수면이 짧은 날에는 다음날 혈당 흐름이 흔들릴 수 있어요.');
  qs('insightList').innerHTML = insights.map(text => `<article class="insight-item"><p>${escapeHtml(text)}</p></article>`).join('');
}

function updatePage() {
  qsa('.page').forEach(page => page.classList.remove('active'));
  qs(`page-${state.currentPage}`).classList.add('active');
  qsa('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === state.currentPage));
  qsa('.panel').forEach(panel => panel.classList.toggle('active', panel.id === `panel-${state.recordPanel}`));
  qsa('#recordTabs .seg-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.panel === state.recordPanel));
  qsa('#glucoseTypeTabs .seg-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type === state.glucoseType));
}

function setPage(page) {
  state.currentPage = page;
  updatePage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupEvents() {
  qsa('.nav-btn').forEach(btn => btn.addEventListener('click', () => setPage(btn.dataset.nav)));
  qsa('[data-nav]:not(.nav-btn)').forEach(btn => btn.addEventListener('click', () => setPage(btn.dataset.nav)));
  qsa('[data-care-target]').forEach(btn => btn.addEventListener('click', () => {
    setPage('care');
    const target = document.getElementById(btn.dataset.careTarget);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }));
  qsa('[data-open-panel]').forEach(btn => btn.addEventListener('click', () => {
    state.recordPanel = btn.dataset.openPanel;
    setPage('record');
  }));
  qs('openAdvancedBtn').addEventListener('click', () => setPage('care'));

  qsa('#recordTabs .seg-btn').forEach(btn => btn.addEventListener('click', () => {
    state.recordPanel = btn.dataset.panel;
    updatePage();
  }));
  qsa('#glucoseTypeTabs .seg-btn').forEach(btn => btn.addEventListener('click', () => {
    state.glucoseType = btn.dataset.type;
    renderGlucose();
    updatePage();
  }));

  setupForm('glucoseForm', (fd) => {
    state.data.glucose.unshift({
      date: fd.get('date'), time: fd.get('time'), type: fd.get('type'), value: num(fd.get('value')),
      food: fd.get('food').trim(), note: fd.get('note').trim()
    });
  });
  setupForm('mealForm', (fd) => {
    state.data.meals.unshift({
      date: fd.get('date'), mealType: fd.get('mealType'), reverseMeal: fd.get('reverseMeal') === 'on',
      chopsticksOnly: fd.get('chopsticksOnly') === 'on', foods: fd.get('foods').trim(), swap: fd.get('swap').trim()
    });
  });
  setupForm('exerciseForm', (fd) => {
    state.data.exercise.unshift({
      date: fd.get('date'), kind: fd.get('kind'), minutes: num(fd.get('minutes')), intensity: fd.get('intensity'),
      afterMeal: fd.get('afterMeal') === 'on', note: fd.get('note').trim()
    });
  });
  setupForm('routineForm', (fd) => {
    state.data.routine.unshift({
      date: fd.get('date'), sleep: num(fd.get('sleep')), stress: num(fd.get('stress')), water: num(fd.get('water')),
      meditation: fd.get('meditation') === 'on', supplements: fd.get('supplements') === 'on'
    });
  });
  setupForm('diagnosisForm', (fd) => {
    state.data.diagnosis.unshift({
      date: fd.get('date'), fasting: num(fd.get('fasting')), insulin: num(fd.get('insulin')), a1c: num(fd.get('a1c'))
    });
  });

  qs('missionDoneBtn').addEventListener('click', () => {
    state.missionIndex = (state.missionIndex + 1) % missions.length;
    state.week = Math.min(12, state.week + 1);
    renderProgram();
  });
  qs('missionNextBtn').addEventListener('click', () => {
    state.missionIndex = (state.missionIndex + 1) % missions.length;
    renderProgram();
  });
  qs('weekSlider').addEventListener('input', (e) => {
    state.week = Number(e.target.value);
    renderProgram();
  });

  qs('timerStartBtn').addEventListener('click', startTimer);
  qs('timerNextBtn').addEventListener('click', nextTimerStage);
  qs('timerResetBtn').addEventListener('click', resetTimer);
}

function setupForm(id, onSubmit) {
  const form = qs(id);
  if (!form) return;
  if (form.querySelector('input[type="date"]')) {
    const dateInput = form.querySelector('input[type="date"]');
    if (!dateInput.value) dateInput.value = todayStr();
  }
  if (form.querySelector('input[type="time"]')) {
    const t = new Date();
    form.querySelector('input[type="time"]').value = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    onSubmit(fd);
    form.reset();
    const dateInput = form.querySelector('input[type="date"]');
    if (dateInput) dateInput.value = todayStr();
    render();
  });
}

function latestRoutineScore() {
  const latest = latestOf(state.data.routine);
  if (!latest) return 70;
  let s = 100;
  if (num(latest.sleep) < 7) s -= 20;
  if (num(latest.stress) >= 4) s -= 20;
  if (!latest.meditation) s -= 10;
  if (!latest.supplements) s -= 5;
  return s;
}

function computeExerciseGap() {
  const latest = latestOf(state.data.exercise);
  if (!latest) return 99;
  const then = new Date(latest.date);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function startTimer() {
  if (state.timer.running) return;
  state.timer.running = true;
  state.timer.interval = setInterval(() => {
    state.timer.seconds -= 1;
    if (state.timer.seconds <= 0) {
      nextTimerStage();
      return;
    }
    renderTimer();
  }, 1000);
}

function nextTimerStage() {
  clearInterval(state.timer.interval);
  state.timer.running = false;
  state.timer.stageIndex = (state.timer.stageIndex + 1) % timerStages.length;
  state.timer.seconds = timerStages[state.timer.stageIndex].seconds;
  renderTimer();
}

function resetTimer() {
  clearInterval(state.timer.interval);
  state.timer.running = false;
  state.timer.stageIndex = 0;
  state.timer.seconds = timerStages[0].seconds;
  renderTimer();
}

function renderTimer() {
  const stage = timerStages[state.timer.stageIndex];
  const m = String(Math.floor(state.timer.seconds / 60)).padStart(2, '0');
  const s = String(state.timer.seconds % 60).padStart(2, '0');
  qs('timerStage').textContent = stage.label;
  qs('timerDisplay').textContent = `${m}:${s}`;
  qs('timerGuide').textContent = stage.guide;
}

function drawLineChart(id, rows, opts = {}) {
  const svg = qs(id);
  if (!svg) return;
  if (!rows || !rows.length) {
    svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#90a7b0" font-size="13">기록이 쌓이면 그래프가 보입니다.</text>`;
    return;
  }
  const values = rows.map(r => num(r.value));
  const min = Math.min(...values, 70);
  const max = Math.max(...values, 150);
  const padX = 18, padY = 18, width = 340, height = opts.includeAxis ? 180 : 160;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const points = rows.map((row, idx) => {
    const x = padX + (rows.length === 1 ? innerW / 2 : (innerW * idx / (rows.length - 1)));
    const y = padY + innerH - ((num(row.value) - min) / (max - min || 1)) * innerH;
    return { x, y, row };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const labels = points.map(p => `<text x="${p.x}" y="${height - 6}" text-anchor="middle" fill="#90a7b0" font-size="11">${fmtDate(p.row.date)}</text>`).join('');
  const dots = points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#4fb7ad"></circle>`).join('');
  let bands = '';
  if (opts.includeAxis || opts.type === 'mixed') {
    bands += `<line x1="${padX}" y1="${padY + innerH * 0.35}" x2="${width - padX}" y2="${padY + innerH * 0.35}" stroke="#ffd7a8" stroke-dasharray="4 4"></line>`;
    bands += `<line x1="${padX}" y1="${padY + innerH * 0.18}" x2="${width - padX}" y2="${padY + innerH * 0.18}" stroke="#ffc1bb" stroke-dasharray="4 4"></line>`;
  }
  svg.innerHTML = `
    <defs>
      <linearGradient id="fill-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(79,183,173,0.26)"></stop>
        <stop offset="100%" stop-color="rgba(79,183,173,0.02)"></stop>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="100%" height="100%" rx="22" fill="transparent"></rect>
    ${bands}
    <path d="${path} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z" fill="url(#fill-${id})"></path>
    <path d="${path}" fill="none" stroke="#4fb7ad" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
    ${dots}
    ${labels}
  `;
}

function labelType(type) {
  return ({ fasting: '공복', post1: '식후 1시간', post2: '식후 2시간' })[type] || type;
}
function exerciseLabel(kind) {
  return ({ walking: '걷기', strength: '하체 근력', cardio: '유산소', stretch: '스트레칭' })[kind] || kind;
}
function emptyState(text) { return `<div class="empty-state">${escapeHtml(text)}</div>`; }
function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}

window.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  renderTimer();
  render();
});
