const STORAGE_KEY = 'diabetes-care-v3';
const LEGACY_KEY = 'metabolic-reset-v3';

const defaultState = {
  diagnosis: [
    { id: createId(), date: '2026-04-10', fasting: 102, insulin: 11.8, a1c: 5.8, weight: 76.4, waist: 91, note: '초기 기준값' }
  ],
  glucose: [
    { id: createId(), date: '2026-04-06', time: '07:20', type: 'fasting', value: 101, food: '', note: '수면 6시간' },
    { id: createId(), date: '2026-04-07', time: '07:10', type: 'fasting', value: 97, food: '', note: '저녁 탄수 적음' },
    { id: createId(), date: '2026-04-08', time: '13:10', type: 'post1', value: 144, food: '냉면', note: '걷기 없음' },
    { id: createId(), date: '2026-04-08', time: '14:10', type: 'post2', value: 116, food: '냉면', note: '' },
    { id: createId(), date: '2026-04-09', time: '12:55', type: 'post1', value: 128, food: '현미밥', note: '식후 15분 걷기' },
    { id: createId(), date: '2026-04-09', time: '13:55', type: 'post2', value: 108, food: '현미밥', note: '' },
    { id: createId(), date: '2026-04-10', time: '07:15', type: 'fasting', value: 95, food: '', note: '아침 공복' }
  ]
};

let state = loadState();
let currentView = 'home';
let chartRange = 7;
let chartType = 'fasting';
const editState = { glucoseId: null, labId: null };

function createId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function qs(id) {
  return document.getElementById(id);
}

function sortByDateTimeDesc(items) {
  return [...items].sort((a, b) => `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`));
}

function normalizeGlucoseItem(item = {}) {
  return {
    id: item.id || createId(),
    date: item.date || nowParts().date,
    time: item.time || '',
    type: item.type || 'fasting',
    value: Number(item.value || 0),
    food: (item.food || '').toString(),
    note: (item.note || '').toString()
  };
}

function normalizeDiagnosisItem(item = {}) {
  return {
    id: item.id || createId(),
    date: item.date || nowParts().date,
    fasting: Number(item.fasting || 0),
    insulin: Number(item.insulin || 0),
    a1c: Number(item.a1c || 0),
    weight: item.weight === '' || item.weight === undefined || item.weight === null ? '' : Number(item.weight),
    waist: item.waist === '' || item.waist === undefined || item.waist === null ? '' : Number(item.waist),
    note: (item.note || '').toString()
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  if (!raw) {
    return {
      diagnosis: defaultState.diagnosis.map(normalizeDiagnosisItem),
      glucose: defaultState.glucose.map(normalizeGlucoseItem)
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const glucose = Array.isArray(parsed.glucose) ? parsed.glucose.map(normalizeGlucoseItem).filter(item => item.date && item.value) : [];
    const diagnosis = Array.isArray(parsed.diagnosis) ? parsed.diagnosis.map(normalizeDiagnosisItem).filter(item => item.date && item.fasting && item.insulin && item.a1c) : [];
    return {
      diagnosis: diagnosis.length ? diagnosis : defaultState.diagnosis.map(normalizeDiagnosisItem),
      glucose: glucose.length ? glucose : defaultState.glucose.map(normalizeGlucoseItem)
    };
  } catch (error) {
    return {
      diagnosis: defaultState.diagnosis.map(normalizeDiagnosisItem),
      glucose: defaultState.glucose.map(normalizeGlucoseItem)
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nowParts() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : 0;
}

function recentDaysFilter(items, days) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return items.filter(item => new Date(item.date) >= cutoff);
}

function glucoseTypeLabel(type) {
  return ({ fasting: '공복', post1: '식후 1시간', post2: '식후 2시간' })[type] || type;
}

function classifyGlucose(value, type) {
  const num = Number(value);
  if (type === 'fasting') {
    if (num < 100) return { text: '양호', level: 'good' };
    if (num <= 125) return { text: '주의', level: 'warn' };
    return { text: '높음', level: 'danger' };
  }
  const target = type === 'post1' ? 140 : 120;
  if (num <= target) return { text: '양호', level: 'good' };
  if (num <= target + 20) return { text: '주의', level: 'warn' };
  return { text: '높음', level: 'danger' };
}

function classifyLab(fasting, a1c) {
  const fastingNum = Number(fasting);
  const a1cNum = Number(a1c);
  if (fastingNum >= 126 || a1cNum >= 6.5) return { text: '집중관리', level: 'danger' };
  if (fastingNum >= 100 || a1cNum >= 5.7) return { text: '주의관리', level: 'warn' };
  return { text: '안정적', level: 'good' };
}

function calculateHoma(fasting, insulin) {
  if (!fasting || !insulin) return 0;
  return (Number(fasting) * Number(insulin)) / 405;
}

function latestGlucose(type) {
  return sortByDateTimeDesc(state.glucose.filter(item => item.type === type))[0] || null;
}

function latestLab() {
  return sortByDateTimeDesc(state.diagnosis)[0] || null;
}

function formatValue(value, suffix = '') {
  if (value === undefined || value === null || value === '') return '—';
  return `${value}${suffix}`;
}

function setTodayDefaults() {
  const { date } = nowParts();
  if (qs('glucoseDate') && !editState.glucoseId) qs('glucoseDate').value = date;
  if (qs('labDate') && !editState.labId) qs('labDate').value = date;
  qs('todayText').textContent = `${date} 기준 기록을 관리할 수 있어요.`;
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(section => {
    section.classList.toggle('active', section.id === `view-${view}`);
  });
  document.querySelectorAll('.nav-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

function renderHome() {
  const latestFasting = latestGlucose('fasting');
  const latestPost1 = latestGlucose('post1');
  const latestPost2 = latestGlucose('post2');
  const lab = latestLab();

  const latestPostValues = [latestPost1?.value, latestPost2?.value].filter(Boolean).map(Number);
  const latestPostPeak = latestPostValues.length ? Math.max(...latestPostValues) : null;
  const statusBase = lab ? classifyLab(lab.fasting, lab.a1c) : (latestFasting ? classifyGlucose(latestFasting.value, 'fasting') : { text: '준비중', level: '' });

  qs('statusTitle').textContent = statusBase.level === 'good' ? '지금 흐름은 비교적 안정적입니다' : statusBase.level === 'warn' ? '혈당 흐름을 조금 더 관리해 주세요' : statusBase.level === 'danger' ? '기록을 보며 집중 관리가 필요합니다' : '기록을 시작해 주세요';
  qs('statusChip').textContent = statusBase.text;
  qs('statusChip').className = `status-chip ${statusBase.level || ''}`.trim();

  const messageParts = [];
  if (latestFasting) messageParts.push(`최근 공복은 ${latestFasting.value}mg/dL입니다.`);
  if (latestPostPeak) messageParts.push(`최근 식후 최고는 ${latestPostPeak}mg/dL입니다.`);
  if (lab?.a1c) messageParts.push(`최신 HbA1c는 ${lab.a1c}%입니다.`);
  qs('statusMessage').textContent = messageParts.length ? messageParts.join(' ') : '공복혈당, 식후혈당, HbA1c를 기록하면 한눈에 보기 쉽게 정리됩니다.';

  qs('homeFasting').textContent = latestFasting ? `${latestFasting.value}` : '—';
  qs('homePostPeak').textContent = latestPostPeak ? `${latestPostPeak}` : '—';
  qs('homeA1c').textContent = lab?.a1c ? `${lab.a1c}%` : '—';
  qs('homeHoma').textContent = lab ? calculateHoma(lab.fasting, lab.insulin).toFixed(2) : '—';

  const fasting7 = recentDaysFilter(state.glucose.filter(item => item.type === 'fasting'), 7);
  const post7 = recentDaysFilter(state.glucose.filter(item => item.type !== 'fasting'), 7);
  const fastingAvg = average(fasting7.map(item => item.value));
  const postAvg = average(post7.map(item => item.value));

  qs('avgFasting7').textContent = fastingAvg ? `${fastingAvg.toFixed(1)}` : '—';
  qs('avgPost7').textContent = postAvg ? `${postAvg.toFixed(1)}` : '—';
  qs('fastingTrend').textContent = fasting7.length >= 2 ? trendText(fasting7.map(item => item.value), 'fasting') : '기록이 더 필요합니다';
  qs('postTrend').textContent = post7.length >= 2 ? trendText(post7.map(item => item.value), 'post') : '기록이 더 필요합니다';

  const recentGlucose = sortByDateTimeDesc(state.glucose).slice(0, 3);
  qs('homeRecentGlucoseList').innerHTML = recentGlucose.length ? recentGlucose.map(item => renderGlucoseItem(item, false)).join('') : emptyState('아직 혈당 기록이 없습니다.');

  const recentLabs = sortByDateTimeDesc(state.diagnosis).slice(0, 2);
  qs('homeRecentLabList').innerHTML = recentLabs.length ? recentLabs.map(item => renderLabItem(item, false)).join('') : emptyState('아직 혈액검사 기록이 없습니다.');
}

function trendText(values, kind) {
  if (values.length < 2) return '기록이 더 필요합니다';
  const sorted = values.map(Number);
  const delta = sorted[sorted.length - 1] - sorted[0];
  if (Math.abs(delta) < 3) return '큰 변화 없이 유지 중';
  if (delta < 0) return kind === 'fasting' ? '최근 공복이 내려가는 흐름' : '최근 식후 반응이 완만해지는 흐름';
  return kind === 'fasting' ? '최근 공복이 올라가는 흐름' : '최근 식후 반응이 높아지는 흐름';
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function renderGlucoseItem(item, withActions = true) {
  const status = classifyGlucose(item.value, item.type);
  const detailText = [item.food, item.note].filter(Boolean).join(' · ');
  return `
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">
          <span class="list-tag">${glucoseTypeLabel(item.type)}</span>
          <strong>${item.value} mg/dL</strong>
          <span class="list-meta">${item.date}</span>
        </div>
        <p>${detailText || '추가 메모 없음'}</p>
      </div>
      ${withActions
        ? `<div class="list-actions"><button class="edit-btn" type="button" data-edit-glucose="${item.id}">수정</button><button class="delete-btn" type="button" data-delete-glucose="${item.id}">삭제</button></div>`
        : `<span class="list-tag">${status.text}</span>`}
    </div>
  `;
}

function renderLog() {
  const items = sortByDateTimeDesc(state.glucose);
  qs('glucoseList').innerHTML = items.length ? items.map(item => renderGlucoseItem(item, true)).join('') : emptyState('아직 저장된 혈당 기록이 없습니다.');
}

function renderChart() {
  const target = chartType === 'fasting' ? 100 : chartType === 'post1' ? 140 : 120;
  const source = sortByDateTimeDesc(recentDaysFilter(state.glucose.filter(item => item.type === chartType), chartRange)).reverse();
  const svg = qs('glucoseChart');

  document.querySelectorAll('#rangeButtons .seg-btn').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.range) === chartRange);
  });
  document.querySelectorAll('#typeButtons .seg-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.type === chartType);
  });

  if (!source.length) {
    svg.innerHTML = `<rect x="0" y="0" width="360" height="220" rx="16" fill="rgba(255,255,255,0.02)"></rect><text x="180" y="110" text-anchor="middle" fill="#94a3b8" font-size="14">기록이 없습니다</text>`;
    qs('chartAvg').textContent = '—';
    qs('chartMax').textContent = '—';
    qs('chartMin').textContent = '—';
    qs('chartNote').textContent = '선택한 기간에 데이터가 없습니다.';
    return;
  }

  const values = source.map(item => Number(item.value));
  const minValue = Math.max(60, Math.min(...values, target) - 10);
  const maxValue = Math.max(...values, target) + 10;
  const w = 360;
  const h = 220;
  const px = 26;
  const py = 24;
  const graphW = w - px * 2;
  const graphH = h - py * 2;
  const stepX = source.length === 1 ? 0 : graphW / (source.length - 1);
  const toY = value => h - py - ((value - minValue) / (maxValue - minValue || 1)) * graphH;
  const points = source.map((item, index) => ({
    x: px + stepX * index,
    y: toY(Number(item.value)),
    item
  }));
  const pathPoints = points.map(point => `${point.x},${point.y}`).join(' ');
  const areaPoints = `${px},${h - py} ${points.map(point => `${point.x},${point.y}`).join(' ')} ${points[points.length - 1].x},${h - py}`;
  const targetY = toY(target);
  const dots = points.map(point => {
    const stateClass = classifyGlucose(point.item.value, chartType);
    const fill = stateClass.level === 'good' ? '#22c55e' : stateClass.level === 'warn' ? '#f59e0b' : '#ef4444';
    return `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${fill}"></circle>`;
  }).join('');
  const labels = points.map(point => `<text x="${point.x}" y="204" text-anchor="middle" fill="#94a3b8" font-size="10">${point.item.date.slice(5)}</text>`).join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.28"></stop>
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="360" height="220" rx="18" fill="rgba(255,255,255,0.02)"></rect>
    <line x1="${px}" y1="${targetY}" x2="${w - px}" y2="${targetY}" stroke="#f59e0b" stroke-dasharray="5 5" stroke-opacity="0.7"></line>
    <polygon points="${areaPoints}" fill="url(#areaFill)"></polygon>
    <polyline points="${pathPoints}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
    ${dots}
    ${labels}
    <text x="${w - px}" y="${targetY - 8}" text-anchor="end" fill="#fbbf24" font-size="11">기준 ${target}</text>
  `;

  qs('chartAvg').textContent = `${average(values).toFixed(1)}`;
  qs('chartMax').textContent = `${Math.max(...values)}`;
  qs('chartMin').textContent = `${Math.min(...values)}`;
  qs('chartNote').textContent = `${glucoseTypeLabel(chartType)} ${chartRange}일 기준으로 ${source.length}개 기록을 반영했습니다.`;
}

function renderLabItem(item, withActions = true) {
  const homa = calculateHoma(item.fasting, item.insulin);
  const status = classifyLab(item.fasting, item.a1c);
  const detail = [`공복 ${item.fasting}`, `인슐린 ${item.insulin}`, `HbA1c ${item.a1c}%`].join(' · ');
  return `
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">
          <strong>${item.date}</strong>
          <span class="list-tag">${status.text}</span>
        </div>
        <p>${detail} · HOMA-IR ${homa.toFixed(2)}${item.note ? ` · ${item.note}` : ''}</p>
      </div>
      ${withActions
        ? `<div class="list-actions"><button class="edit-btn" type="button" data-edit-lab="${item.id}">수정</button><button class="delete-btn" type="button" data-delete-lab="${item.id}">삭제</button></div>`
        : `<span class="list-tag">${homa.toFixed(2)}</span>`}
    </div>
  `;
}

function renderLabs() {
  const latest = latestLab();
  if (!latest) {
    qs('labHoma').textContent = '—';
    qs('labFasting').textContent = '—';
    qs('labA1c').textContent = '—';
    qs('labInsight').textContent = '검사결과를 입력하면 해석이 표시됩니다.';
  } else {
    const homa = calculateHoma(latest.fasting, latest.insulin);
    const status = classifyLab(latest.fasting, latest.a1c);
    qs('labHoma').textContent = homa.toFixed(2);
    qs('labFasting').textContent = `${latest.fasting}`;
    qs('labA1c').textContent = `${latest.a1c}%`;
    qs('labInsight').textContent = status.level === 'good'
      ? `최신 검사 기준으로는 비교적 안정적인 편입니다. 현재 루틴을 유지하면서 공복과 식후 흐름을 같이 보시면 좋습니다.`
      : status.level === 'warn'
        ? `당뇨전단계 범위에 걸쳐 있을 수 있습니다. 공복혈당과 식후혈당 기록을 함께 보면서 변화를 확인해 보세요.`
        : `당화혈색소 또는 공복혈당이 높은 편입니다. 검사 수치 추세를 꾸준히 확인하고 필요 시 의료진과 상담하는 것이 좋습니다.`;
  }

  const items = sortByDateTimeDesc(state.diagnosis);
  qs('labList').innerHTML = items.length ? items.map(item => renderLabItem(item, true)).join('') : emptyState('아직 혈액검사 기록이 없습니다.');
}


function setGlucoseFormMode() {
  const isEdit = Boolean(editState.glucoseId);
  qs('glucoseSubmitBtn').textContent = isEdit ? '혈당 기록 수정' : '혈당 저장';
  qs('glucoseCancelEditBtn').hidden = !isEdit;
  qs('glucoseFormStatus').classList.toggle('hidden', !isEdit);
  qs('glucoseFormStatus').textContent = isEdit ? '혈당 기록 수정 중입니다. 수정 후 저장을 누르세요.' : '';
}

function setLabFormMode() {
  const isEdit = Boolean(editState.labId);
  qs('labSubmitBtn').textContent = isEdit ? '검사기록 수정' : '검사결과 저장';
  qs('labCancelEditBtn').hidden = !isEdit;
  qs('labFormStatus').classList.toggle('hidden', !isEdit);
  qs('labFormStatus').textContent = isEdit ? '혈액검사 기록 수정 중입니다. 수정 후 저장을 누르세요.' : '';
}

function resetGlucoseForm() {
  editState.glucoseId = null;
  qs('glucoseForm').reset();
  setTodayDefaults();
  setGlucoseFormMode();
}

function resetLabForm() {
  editState.labId = null;
  qs('labForm').reset();
  setTodayDefaults();
  setLabFormMode();
}

function startEditGlucose(id) {
  const item = state.glucose.find(entry => entry.id === id);
  if (!item) return;
  editState.glucoseId = id;
  const form = qs('glucoseForm');
  form.elements.date.value = item.date || '';
  form.elements.type.value = item.type || 'fasting';
  form.elements.value.value = item.value ?? '';
  form.elements.food.value = item.food || '';
  form.elements.note.value = item.note || '';
  setGlucoseFormMode();
  switchView('log');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function startEditLab(id) {
  const item = state.diagnosis.find(entry => entry.id === id);
  if (!item) return;
  editState.labId = id;
  const form = qs('labForm');
  form.elements.date.value = item.date || '';
  form.elements.fasting.value = item.fasting ?? '';
  form.elements.insulin.value = item.insulin ?? '';
  form.elements.a1c.value = item.a1c ?? '';
  form.elements.weight.value = item.weight ?? '';
  form.elements.waist.value = item.waist ?? '';
  form.elements.note.value = item.note || '';
  setLabFormMode();
  switchView('labs');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAll() {
  renderHome();
  renderLog();
  renderChart();
  renderLabs();
  setGlucoseFormMode();
  setLabFormMode();
  saveState();
}

function bindNavigation() {
  document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });
  document.querySelectorAll('[data-jump]').forEach(button => {
    button.addEventListener('click', () => switchView(button.dataset.jump));
  });
  qs('todayShortcutBtn').addEventListener('click', () => {
    setTodayDefaults();
    switchView('log');
  });
}

function bindForms() {
  qs('glucoseForm').addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = normalizeGlucoseItem({
      id: editState.glucoseId || createId(),
      date: formData.get('date'),
      type: formData.get('type'),
      value: Number(formData.get('value')),
      food: (formData.get('food') || '').toString().trim(),
      note: (formData.get('note') || '').toString().trim()
    });

    if (editState.glucoseId) {
      state.glucose = state.glucose.map(item => item.id === editState.glucoseId ? payload : item);
    } else {
      state.glucose.unshift(payload);
    }

    resetGlucoseForm();
    renderAll();
    switchView('log');
  });

  qs('labForm').addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = normalizeDiagnosisItem({
      id: editState.labId || createId(),
      date: formData.get('date'),
      fasting: Number(formData.get('fasting')),
      insulin: Number(formData.get('insulin')),
      a1c: Number(formData.get('a1c')),
      weight: formData.get('weight') ? Number(formData.get('weight')) : '',
      waist: formData.get('waist') ? Number(formData.get('waist')) : '',
      note: (formData.get('note') || '').toString().trim()
    });

    if (editState.labId) {
      state.diagnosis = state.diagnosis.map(item => item.id === editState.labId ? payload : item);
    } else {
      state.diagnosis.unshift(payload);
    }

    resetLabForm();
    renderAll();
    switchView('labs');
  });

  qs('glucoseCancelEditBtn').addEventListener('click', () => {
    resetGlucoseForm();
  });

  qs('labCancelEditBtn').addEventListener('click', () => {
    resetLabForm();
  });
}

function bindChartControls() {
  document.querySelectorAll('#rangeButtons .seg-btn').forEach(button => {
    button.addEventListener('click', () => {
      chartRange = Number(button.dataset.range);
      renderChart();
    });
  });

  document.querySelectorAll('#typeButtons .seg-btn').forEach(button => {
    button.addEventListener('click', () => {
      chartType = button.dataset.type;
      renderChart();
    });
  });
}

function bindDeleteActions() {
  document.body.addEventListener('click', event => {
    const glucoseDeleteId = event.target.getAttribute('data-delete-glucose');
    const labDeleteId = event.target.getAttribute('data-delete-lab');
    const glucoseEditId = event.target.getAttribute('data-edit-glucose');
    const labEditId = event.target.getAttribute('data-edit-lab');

    if (glucoseEditId) {
      startEditGlucose(glucoseEditId);
      return;
    }

    if (labEditId) {
      startEditLab(labEditId);
      return;
    }

    if (glucoseDeleteId) {
      state.glucose = state.glucose.filter(item => item.id !== glucoseDeleteId);
      if (editState.glucoseId === glucoseDeleteId) resetGlucoseForm();
      renderAll();
      return;
    }

    if (labDeleteId) {
      state.diagnosis = state.diagnosis.filter(item => item.id !== labDeleteId);
      if (editState.labId === labDeleteId) resetLabForm();
      renderAll();
    }
  });
}

function registerServiceWorker() {
  // 캐시 문제를 줄이기 위해 서비스워커를 더 이상 등록하지 않습니다.
}

function init() {
  setTodayDefaults();
  bindNavigation();
  bindForms();
  bindChartControls();
  bindDeleteActions();
  renderAll();
  switchView(currentView);
  registerServiceWorker();
}

init();
