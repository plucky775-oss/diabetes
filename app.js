const STORAGE_KEYS = {
  glucose: 'diabetes_app_glucose',
  meals: 'diabetes_app_meals',
  exercise: 'diabetes_app_exercise',
  labs: 'diabetes_app_labs',
  lifestyle: 'diabetes_app_lifestyle',
};

const defaultData = {
  glucose: [
    { id: uid(), date: daysAgo(6), time: '07:20', type: 'fasting', value: 94, note: '전날 저녁 일찍 식사' },
    { id: uid(), date: daysAgo(5), time: '07:35', type: 'fasting', value: 91, note: '' },
    { id: uid(), date: daysAgo(4), time: '13:10', type: 'post1', value: 132, note: '점심 후' },
    { id: uid(), date: daysAgo(4), time: '14:10', type: 'post2', value: 118, note: '식후 산책 20분' },
    { id: uid(), date: daysAgo(3), time: '07:25', type: 'fasting', value: 89, note: '' },
    { id: uid(), date: daysAgo(2), time: '13:15', type: 'post1', value: 138, note: '밥 양 많음' },
    { id: uid(), date: daysAgo(2), time: '14:15', type: 'post2', value: 123, note: '' },
    { id: uid(), date: daysAgo(1), time: '07:30', type: 'fasting', value: 93, note: '' },
    { id: uid(), date: todayStr(), time: '07:28', type: 'fasting', value: 92, note: '아침 공복' },
  ],
  meals: [
    { id: uid(), date: todayStr(), mealType: '점심', veggieFirst: true, proteinNext: true, carbLast: true, fiber: 12, sugaryDrink: 'no', note: '채소→고기→밥' }
  ],
  exercise: [
    { id: uid(), date: daysAgo(2), kind: 'walking', minutes: 25, intensity: '중강도', afterMeal: true, note: '점심 후 걷기' },
    { id: uid(), date: daysAgo(1), kind: 'strength', minutes: 20, intensity: '중강도', afterMeal: false, note: '스쿼트, 런지' },
    { id: uid(), date: todayStr(), kind: 'walking', minutes: 30, intensity: '중강도', afterMeal: true, note: '저녁 후 걷기' }
  ],
  labs: [
    { id: uid(), date: '2025-06-28', a1c: 5.3, fasting: 85, insulin: 12.57, weight: 76.5, waist: 88.0, note: '정기검진' }
  ],
  lifestyle: [
    { id: uid(), date: todayStr(), sleep: 7.5, stress: 2, water: 7, meditation: true, supplements: true }
  ]
};

let state = loadState();
let currentView = 'home';
let chartRange = 7;
let chartType = 'fasting';

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function loadState() {
  const loaded = {};
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    const raw = localStorage.getItem(storageKey);
    loaded[key] = raw ? JSON.parse(raw) : defaultData[key];
  }
  return loaded;
}

function saveState() {
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    localStorage.setItem(storageKey, JSON.stringify(state[key]));
  }
}

function init() {
  bindNavigation();
  bindForms();
  bindButtons();
  seedDefaultsIfEmpty();
  setDefaultFormValues();
  updateClock();
  renderAll();
  setInterval(updateClock, 1000);
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  }
}

function seedDefaultsIfEmpty() {
  let changed = false;
  Object.keys(defaultData).forEach((key) => {
    if (!Array.isArray(state[key]) || state[key].length === 0) {
      state[key] = defaultData[key];
      changed = true;
    }
  });
  if (changed) saveState();
}

function setDefaultFormValues() {
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = todayStr();
  });
  document.querySelector('input[name="time"]')?.setAttribute('value', currentTimeHHMM());
}

function currentTimeHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function updateClock() {
  const now = new Date();
  document.getElementById('currentTime').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
  document.getElementById('currentDate').textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 (${weekday})`;
}

function bindNavigation() {
  document.querySelectorAll('[data-nav]').forEach((element) => {
    element.addEventListener('click', () => showView(element.dataset.nav));
  });
  document.getElementById('homeButton').addEventListener('click', () => showView('home'));
}

function showView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${name}`));
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.nav === name));
  if (name === 'report') renderReport();
}

function bindButtons() {
  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      chartRange = Number(btn.dataset.range);
      document.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderGlucoseChart();
    });
  });
  document.querySelectorAll('.type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      chartType = btn.dataset.type;
      document.querySelectorAll('.type-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderGlucoseChart();
    });
  });
  document.getElementById('clearGlucoseBtn').addEventListener('click', () => {
    if (!confirm('혈당 기록을 모두 삭제할까요?')) return;
    state.glucose = [];
    saveState();
    renderAll();
  });
}

function bindForms() {
  document.getElementById('glucoseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    state.glucose.unshift({ id: uid(), ...data, value: Number(data.value) });
    saveState();
    form.reset();
    setDefaultFormValues();
    renderAll();
    showView('glucose');
  });

  document.getElementById('mealForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    state.meals.unshift({
      id: uid(),
      date: fd.get('date'),
      mealType: fd.get('mealType'),
      veggieFirst: fd.get('veggieFirst') === 'on',
      proteinNext: fd.get('proteinNext') === 'on',
      carbLast: fd.get('carbLast') === 'on',
      fiber: Number(fd.get('fiber')),
      sugaryDrink: fd.get('sugaryDrink'),
      note: fd.get('note')
    });
    saveState();
    e.currentTarget.reset();
    setDefaultFormValues();
    renderAll();
    showView('meal');
  });

  document.getElementById('exerciseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    state.exercise.unshift({
      id: uid(),
      date: fd.get('date'),
      kind: fd.get('kind'),
      minutes: Number(fd.get('minutes')),
      intensity: fd.get('intensity'),
      afterMeal: fd.get('afterMeal') === 'on',
      note: fd.get('note')
    });
    saveState();
    e.currentTarget.reset();
    setDefaultFormValues();
    renderAll();
    showView('exercise');
  });

  document.getElementById('labForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    state.labs.unshift({
      id: uid(),
      date: data.date,
      a1c: numberOrNull(data.a1c),
      fasting: numberOrNull(data.fasting),
      insulin: numberOrNull(data.insulin),
      weight: numberOrNull(data.weight),
      waist: numberOrNull(data.waist),
      note: data.note,
    });
    saveState();
    e.currentTarget.reset();
    setDefaultFormValues();
    renderAll();
    showView('labs');
  });

  document.getElementById('lifestyleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    state.lifestyle.unshift({
      id: uid(),
      date: fd.get('date'),
      sleep: Number(fd.get('sleep')),
      stress: Number(fd.get('stress')),
      water: Number(fd.get('water')),
      meditation: fd.get('meditation') === 'on',
      supplements: fd.get('supplements') === 'on',
    });
    saveState();
    e.currentTarget.reset();
    setDefaultFormValues();
    renderAll();
    showView('lifestyle');
  });
}

function numberOrNull(v) {
  return v === '' ? null : Number(v);
}

function renderAll() {
  renderHome();
  renderGlucose();
  renderMeals();
  renderExercise();
  renderLabs();
  renderLifestyle();
  renderReport();
}

function renderHome() {
  const today = todayStr();
  const latestFasting = latestByType('fasting');
  const latestPost1 = latestByType('post1');
  const latestPost2 = latestByType('post2');
  const latestLab = sortedByDate(state.labs)[0];

  document.getElementById('metricFasting').textContent = latestFasting ? `${latestFasting.value}` : '-';
  document.getElementById('metricPost1').textContent = latestPost1 ? `${latestPost1.value}` : '-';
  document.getElementById('metricPost2').textContent = latestPost2 ? `${latestPost2.value}` : '-';
  document.getElementById('metricA1c').textContent = latestLab?.a1c ? `${latestLab.a1c}%` : '-';

  const last7Fasting = recentEntries(state.glucose.filter(x => x.type === 'fasting'), 7).map(x => x.value);
  const avg = average(last7Fasting);
  document.getElementById('heroAvgValue').textContent = avg ? Math.round(avg) : '-';

  const status = glucoseStatus(avg);
  document.getElementById('statusEmoji').textContent = status.emoji;
  document.getElementById('heroStatusText').textContent = status.label;
  document.getElementById('heroStatusSub').textContent = '최근 공복혈당 평균';

  const score = calculateDailyScore(today);
  document.getElementById('dailyScorePill').textContent = `실천점수 ${score}점`;
}

function renderGlucose() {
  renderGlucoseChart();
  const container = document.getElementById('glucoseList');
  const items = sortedByDateTime(state.glucose).slice(0, 12);
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">혈당 기록이 아직 없습니다.</div>`;
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="list-item">
      <div>
        <strong>${typeLabel(item.type)} · ${item.value} mg/dL</strong>
        <span>${item.date} ${item.time || ''}</span>
        ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}
      </div>
      <div class="list-meta">
        <small>${statusBadge(item.type, item.value)}</small>
      </div>
    </div>
  `).join('');
}

function renderGlucoseChart() {
  const data = recentEntries(sortedByDateTime(state.glucose).filter(x => x.type === chartType), chartRange);
  const svg = document.getElementById('glucoseChart');
  const summary = document.getElementById('glucoseSummaryText');

  if (!data.length) {
    svg.innerHTML = `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8aa" font-size="14">기록을 추가하면 그래프가 표시됩니다.</text>`;
    summary.textContent = '기록이 없습니다.';
    return;
  }

  const values = data.map(d => Number(d.value));
  const maxValue = Math.max(...values, targetLine(chartType) + 15, 140);
  const minValue = Math.min(...values, chartType === 'fasting' ? 70 : 80);

  const width = 340;
  const height = 220;
  const pad = { top: 18, right: 16, bottom: 38, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW / 2;

  const mapY = (value) => pad.top + ((maxValue - value) / (maxValue - minValue || 1)) * innerH;
  const points = data.map((d, i) => `${pad.left + i * xStep},${mapY(d.value)}`).join(' ');
  const targetY = mapY(targetLine(chartType));

  const gridLines = 4;
  let gridSvg = '';
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (innerH / gridLines) * i;
    const value = Math.round(maxValue - ((maxValue - minValue) / gridLines) * i);
    gridSvg += `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#e6eef5" stroke-width="1" />`;
    gridSvg += `<text x="8" y="${y + 4}" fill="#7c8da0" font-size="11">${value}</text>`;
  }

  const labelSvg = data.map((d, i) => {
    const x = pad.left + i * xStep;
    const label = chartRange === 365 ? d.date.slice(5) : d.date.slice(5).replace('-', '/');
    return `<text x="${x}" y="${height - 14}" fill="#7c8da0" font-size="10" text-anchor="middle">${label}</text>`;
  }).join('');

  const pointSvg = data.map((d, i) => {
    const x = pad.left + i * xStep;
    const y = mapY(d.value);
    return `<g>
      <circle cx="${x}" cy="${y}" r="4.5" fill="#3f6f92" />
      <text x="${x}" y="${y - 10}" fill="#1d2d44" font-size="11" text-anchor="middle">${d.value}</text>
    </g>`;
  }).join('');

  svg.innerHTML = `
    <rect x="0" y="0" width="340" height="220" fill="transparent" />
    ${gridSvg}
    <line x1="${pad.left}" y1="${targetY}" x2="${width - pad.right}" y2="${targetY}" stroke="#ee8e63" stroke-width="2" stroke-dasharray="6 5" />
    <polyline points="${points}" fill="none" stroke="#3f6f92" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
    ${pointSvg}
    ${labelSvg}
  `;

  const avg = average(values);
  summary.textContent = `${typeLabel(chartType)} 최근 ${data.length}건 평균 ${avg.toFixed(1)} mg/dL · 기준선 ${targetLine(chartType)} mg/dL`;
}

function renderMeals() {
  const todayMeals = state.meals.filter(x => x.date === todayStr());
  const score = calculateMealScore(todayMeals);
  document.getElementById('mealScorePill').textContent = `${score}점`;
  const container = document.getElementById('mealList');
  const items = sortedByDate(state.meals).slice(0, 10);
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">식사 기록이 아직 없습니다.</div>`;
    return;
  }
  container.innerHTML = items.map(item => {
    const steps = [item.veggieFirst && '채소먼저', item.proteinNext && '단백질', item.carbLast && '탄수화물 마지막'].filter(Boolean).join(' · ') || '일반식';
    return `
      <div class="list-item">
        <div>
          <strong>${item.date} · ${item.mealType}</strong>
          <span>${steps}</span>
          <small>식이섬유 ${item.fiber}g · 당음료 ${item.sugaryDrink === 'yes' ? '있음' : '없음'}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</small>
        </div>
        <div class="list-meta"><small>${mealEntryScore(item)}점</small></div>
      </div>
    `;
  }).join('');
}

function renderExercise() {
  const recentWeek = withinDays(state.exercise, 7);
  const aerobic = recentWeek.filter(x => ['walking', 'cardio'].includes(x.kind)).reduce((sum, x) => sum + x.minutes, 0);
  const strength = recentWeek.filter(x => x.kind === 'strength').length;
  document.getElementById('exerciseSummaryPill').textContent = `${aerobic}분`;
  document.getElementById('weeklyAerobic').textContent = `${aerobic}분`;
  document.getElementById('weeklyStrength').textContent = `${strength}회`;

  const container = document.getElementById('exerciseList');
  const items = sortedByDate(state.exercise).slice(0, 10);
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">운동 기록이 아직 없습니다.</div>`;
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="list-item">
      <div>
        <strong>${item.date} · ${exerciseLabel(item.kind)} ${item.minutes}분</strong>
        <span>${item.intensity}${item.afterMeal ? ' · 식후 운동' : ''}</span>
        ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}
      </div>
      <div class="list-meta"><small>${exerciseBadge(item)}</small></div>
    </div>
  `).join('');
}

function renderLabs() {
  const latest = sortedByDate(state.labs)[0];
  document.getElementById('labLatestDate').textContent = latest?.date || '-';
  document.getElementById('latestA1c').textContent = latest?.a1c != null ? `${latest.a1c}%` : '-';
  document.getElementById('latestInsulin').textContent = latest?.insulin != null ? `${latest.insulin}` : '-';
  document.getElementById('latestWeight').textContent = latest?.weight != null ? `${latest.weight}kg` : '-';
  document.getElementById('latestWaist').textContent = latest?.waist != null ? `${latest.waist}cm` : '-';

  const container = document.getElementById('labList');
  const items = sortedByDate(state.labs).slice(0, 8);
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">검사 기록이 아직 없습니다.</div>`;
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="list-item">
      <div>
        <strong>${item.date} · HbA1c ${valueText(item.a1c, '%')}</strong>
        <span>공복혈당 ${valueText(item.fasting)} · 인슐린 ${valueText(item.insulin)} </span>
        <small>체중 ${valueText(item.weight, 'kg')} · 허리둘레 ${valueText(item.waist, 'cm')}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</small>
      </div>
      <div class="list-meta"><small>${labBadge(item)}</small></div>
    </div>
  `).join('');
}

function renderLifestyle() {
  const container = document.getElementById('lifestyleList');
  const items = sortedByDate(state.lifestyle).slice(0, 10);
  const latest = items[0];
  document.getElementById('lifestylePill').textContent = latest ? lifestyleBadge(latest) : '미입력';
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">생활습관 기록이 아직 없습니다.</div>`;
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="list-item">
      <div>
        <strong>${item.date} · 수면 ${item.sleep}시간</strong>
        <span>스트레스 ${item.stress}/5 · 물 ${item.water}컵</span>
        <small>${item.meditation ? '명상 완료' : '명상 미완료'} · ${item.supplements ? '영양제 완료' : '영양제 미완료'}</small>
      </div>
      <div class="list-meta"><small>${lifestyleBadge(item)}</small></div>
    </div>
  `).join('');
}

function renderReport() {
  const fastingAvg = average(withinDays(state.glucose.filter(x => x.type === 'fasting'), 7).map(x => x.value));
  const postValues = withinDays(state.glucose.filter(x => ['post1', 'post2'].includes(x.type)), 7).map(x => x.value);
  const postAvg = average(postValues);
  const exerciseWeek = withinDays(state.exercise, 7);
  const aerobic = exerciseWeek.filter(x => ['walking', 'cardio'].includes(x.kind)).reduce((sum, x) => sum + x.minutes, 0);
  const lifestyleWeek = withinDays(state.lifestyle, 7);
  const goodLifestyleDays = lifestyleWeek.filter(x => x.sleep >= 7 && x.sleep <= 8.5 && x.stress <= 3).length;

  document.getElementById('reportFastingAvg').textContent = fastingAvg ? `${fastingAvg.toFixed(1)}` : '-';
  document.getElementById('reportPostAvg').textContent = postAvg ? `${postAvg.toFixed(1)}` : '-';
  document.getElementById('reportExerciseProgress').textContent = `${Math.min(100, Math.round((aerobic / 150) * 100))}%`;
  document.getElementById('reportLifestyleProgress').textContent = `${goodLifestyleDays}/${Math.max(lifestyleWeek.length, 1)}일`;

  const insights = [];
  if (fastingAvg) {
    insights.push({
      title: '공복혈당 흐름',
      text: fastingAvg < 100 ? `최근 공복혈당 평균이 ${fastingAvg.toFixed(1)}로 비교적 안정적입니다.` : `최근 공복혈당 평균이 ${fastingAvg.toFixed(1)}로 높게 유지됩니다. 저녁 식사 시간과 수면을 다시 점검해보세요.`
    });
  }
  if (postAvg) {
    insights.push({
      title: '식후혈당 흐름',
      text: postAvg <= 140 ? `식후혈당 평균이 ${postAvg.toFixed(1)}로 목표 범위에 가깝습니다.` : `식후혈당 평균이 ${postAvg.toFixed(1)}입니다. 식사 순서와 식후 걷기를 더 늘려보세요.`
    });
  }
  insights.push({
    title: '운동 달성도',
    text: aerobic >= 150 ? `최근 7일 유산소 ${aerobic}분으로 목표를 달성했습니다.` : `최근 7일 유산소 ${aerobic}분입니다. 주간 목표 150분까지 ${150 - aerobic}분 남았습니다.`
  });
  insights.push({
    title: '생활습관 점검',
    text: `${goodLifestyleDays}일이 수면·스트레스 기준을 만족했습니다. 수면 7~8시간과 스트레스 완화는 혈당 관리에 도움이 됩니다.`
  });

  document.getElementById('reportInsights').innerHTML = insights.map(item => `
    <div class="insight">
      <strong>${item.title}</strong>
      <p>${item.text}</p>
    </div>
  `).join('');
}

function latestByType(type) {
  return sortedByDateTime(state.glucose).find(x => x.type === type);
}

function glucoseStatus(avg) {
  if (!avg) return { emoji: '⚪️', label: '기록 필요' };
  if (avg < 100) return { emoji: '🟢', label: '안정적' };
  if (avg < 126) return { emoji: '🟡', label: '주의 단계' };
  return { emoji: '🔴', label: '관리 필요' };
}

function statusBadge(type, value) {
  const target = targetLine(type);
  if (value <= target) return '목표범위';
  if (value <= target + 15) return '약간 높음';
  return '상승';
}

function mealEntryScore(item) {
  let score = 0;
  if (item.veggieFirst) score += 25;
  if (item.proteinNext) score += 20;
  if (item.carbLast) score += 20;
  score += Math.min(20, item.fiber);
  if (item.sugaryDrink === 'no') score += 15;
  return score;
}

function calculateMealScore(items) {
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + mealEntryScore(item), 0) / items.length);
}

function calculateDailyScore(date) {
  const mealScore = calculateMealScore(state.meals.filter(x => x.date === date));
  const exerciseEntries = state.exercise.filter(x => x.date === date);
  const exerciseScore = Math.min(30, exerciseEntries.reduce((sum, x) => sum + x.minutes, 0) / 2);
  const life = state.lifestyle.find(x => x.date === date);
  let lifestyleScore = 0;
  if (life) {
    if (life.sleep >= 7 && life.sleep <= 8.5) lifestyleScore += 15;
    if (life.stress <= 3) lifestyleScore += 10;
    if (life.meditation) lifestyleScore += 5;
    if (life.supplements) lifestyleScore += 5;
  }
  return Math.round(Math.min(100, mealScore * 0.5 + exerciseScore + lifestyleScore));
}

function exerciseBadge(item) {
  if (item.kind === 'strength') return '근력';
  if (item.afterMeal) return '식후 운동';
  if (item.minutes >= 30) return '좋음';
  return '기록';
}

function labBadge(item) {
  if (item.a1c != null && item.a1c < 5.7) return '양호';
  if (item.a1c != null && item.a1c < 6.5) return '주의';
  return '확인';
}

function lifestyleBadge(item) {
  if (item.sleep >= 7 && item.sleep <= 8.5 && item.stress <= 3) return '좋음';
  if (item.sleep < 6 || item.stress >= 4) return '주의';
  return '보통';
}

function typeLabel(type) {
  return { fasting: '공복혈당', post1: '식후 1시간', post2: '식후 2시간' }[type] || type;
}

function exerciseLabel(kind) {
  return { walking: '걷기', cardio: '유산소', strength: '근력운동', stretch: '스트레칭' }[kind] || kind;
}

function targetLine(type) {
  return type === 'fasting' ? 100 : 140;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
}

function recentEntries(items, limit) {
  return sortedByDateTime(items).slice(0, limit).reverse();
}

function withinDays(items, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  return items.filter(item => new Date(item.date) >= new Date(cutoff.toISOString().slice(0, 10)));
}

function sortedByDate(items) {
  return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function sortedByDateTime(items) {
  return [...items].sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`));
}

function valueText(value, suffix = '') {
  return value == null ? '-' : `${value}${suffix}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

document.addEventListener('DOMContentLoaded', init);
