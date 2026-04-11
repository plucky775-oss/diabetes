const STORAGE_KEY = 'diabetes-care-v4';
const LEGACY_KEYS = ['diabetes-care-v3', 'diabetes-care-v2', 'metabolic-reset-v3'];

const today = new Date();
const todayDate = toDateInputValue(today);
const nowTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

const defaultState = {
  glucoseRecords: [
    { id: uid(), date: '2026-04-09', time: '07:10', type: 'fasting', value: 97, food: '', note: '' },
    { id: uid(), date: '2026-04-10', time: '07:15', type: 'fasting', value: 95, food: '', note: '아침 공복' },
    { id: uid(), date: '2026-04-09', time: '12:55', type: 'post1', value: 128, food: '현미밥', note: '식후 15분 걷기' },
    { id: uid(), date: '2026-04-09', time: '13:55', type: 'post2', value: 108, food: '현미밥', note: '' }
  ],
  labRecords: [
    { id: uid(), date: '2026-04-11', fasting: 95, insulin: 11.8, a1c: 5.3, note: '최신 검사' }
  ],
  graphRange: 7,
  graphType: 'fasting',
  recordFilter: 'all'
};

let state = loadState();
let toastTimer = null;

const els = {
  views: document.querySelectorAll('.view'),
  navButtons: document.querySelectorAll('.nav-button'),
  heroDateText: document.getElementById('heroDateText'),
  summaryTitle: document.getElementById('summaryTitle'),
  summaryBadge: document.getElementById('summaryBadge'),
  summaryCopy: document.getElementById('summaryCopy'),
  homeFasting: document.getElementById('homeFasting'),
  homeFastingAvg: document.getElementById('homeFastingAvg'),
  homePostMax: document.getElementById('homePostMax'),
  homeHoma: document.getElementById('homeHoma'),
  homeHomaStatus: document.getElementById('homeHomaStatus'),
  homeActionTitle: document.getElementById('homeActionTitle'),
  homeActionBody: document.getElementById('homeActionBody'),
  homeTrendTitle: document.getElementById('homeTrendTitle'),
  homeTrendCopy: document.getElementById('homeTrendCopy'),
  homeChart: document.getElementById('homeChart'),
  homeMiniNote: document.getElementById('homeMiniNote'),
  goToRecordBtn: document.getElementById('goToRecordBtn'),
  recordForm: document.getElementById('recordForm'),
  recordFormTitle: document.getElementById('recordFormTitle'),
  recordSubmitBtn: document.getElementById('recordSubmitBtn'),
  recordCancelBtn: document.getElementById('recordCancelBtn'),
  recordPreview: document.getElementById('recordPreview'),
  recordList: document.getElementById('recordList'),
  recordCountPill: document.getElementById('recordCountPill'),
  recordTypeButtons: document.querySelectorAll('[data-record-type]'),
  recordFilterButtons: document.querySelectorAll('[data-record-filter]'),
  graphChart: document.getElementById('graphChart'),
  graphSummary: document.getElementById('graphSummary'),
  graphPointList: document.getElementById('graphPointList'),
  graphCountPill: document.getElementById('graphCountPill'),
  graphAvg: document.getElementById('graphAvg'),
  graphLatest: document.getElementById('graphLatest'),
  graphHigh: document.getElementById('graphHigh'),
  graphTrend: document.getElementById('graphTrend'),
  rangeButtons: document.querySelectorAll('[data-range]'),
  typeButtons: document.querySelectorAll('[data-type]'),
  labForm: document.getElementById('labForm'),
  labFormTitle: document.getElementById('labFormTitle'),
  labSubmitBtn: document.getElementById('labSubmitBtn'),
  labCancelBtn: document.getElementById('labCancelBtn'),
  labFormHoma: document.getElementById('labFormHoma'),
  labFormStatus: document.getElementById('labFormStatus'),
  labLatestDate: document.getElementById('labLatestDate'),
  labLatestFasting: document.getElementById('labLatestFasting'),
  labLatestA1c: document.getElementById('labLatestA1c'),
  labLatestHoma: document.getElementById('labLatestHoma'),
  labLatestHomaText: document.getElementById('labLatestHomaText'),
  labInsight: document.getElementById('labInsight'),
  labCompare: document.getElementById('labCompare'),
  labList: document.getElementById('labList'),
  labCountPill: document.getElementById('labCountPill'),
  analysisOverallTitle: document.getElementById('analysisOverallTitle'),
  analysisOverallBadge: document.getElementById('analysisOverallBadge'),
  analysisOverallCopy: document.getElementById('analysisOverallCopy'),
  analysisPatternTitle: document.getElementById('analysisPatternTitle'),
  analysisPatternCopy: document.getElementById('analysisPatternCopy'),
  analysisFocusTitle: document.getElementById('analysisFocusTitle'),
  analysisFocusCopy: document.getElementById('analysisFocusCopy'),
  analysisMissionTitle: document.getElementById('analysisMissionTitle'),
  analysisMissionCopy: document.getElementById('analysisMissionCopy'),
  analysisChecklist: document.getElementById('analysisChecklist'),
  toast: document.getElementById('toast')
};

bindEvents();
setDefaultFormValues();
renderAll();
registerServiceWorker();

function bindEvents() {
  els.navButtons.forEach((button) => {
    button.addEventListener('click', () => openView(button.dataset.nav));
  });

  document.querySelectorAll('[data-nav]').forEach((button) => {
    if (!button.classList.contains('nav-button')) {
      button.addEventListener('click', () => openView(button.dataset.nav));
    }
  });

  els.goToRecordBtn.addEventListener('click', () => openView('record'));

  els.recordForm.addEventListener('submit', onSubmitRecord);
  els.recordCancelBtn.addEventListener('click', resetRecordForm);
  ['value', 'food', 'note', 'date', 'time'].forEach((name) => {
    field(els.recordForm, name).addEventListener('input', renderRecordPreview);
  });

  els.recordTypeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      field(els.recordForm, 'type').value = button.dataset.recordType;
      syncRecordTypeButtons();
      renderRecordPreview();
    });
  });

  els.recordFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.recordFilter = button.dataset.recordFilter;
      saveState();
      syncRecordFilterButtons();
      renderRecordList();
    });
  });

  els.labForm.addEventListener('submit', onSubmitLab);
  els.labCancelBtn.addEventListener('click', resetLabForm);
  ['fasting', 'insulin', 'a1c'].forEach((name) => {
    field(els.labForm, name).addEventListener('input', renderLabFormPreview);
  });

  els.rangeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.graphRange = Number(button.dataset.range);
      saveState();
      renderGraph();
      syncGraphButtons();
    });
  });

  els.typeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.graphType = button.dataset.type;
      saveState();
      renderGraph();
      syncGraphButtons();
    });
  });
}

function loadState() {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) {
    try {
      return normalizeState(JSON.parse(current));
    } catch (error) {
      console.error(error);
    }
  }

  for (const key of LEGACY_KEYS) {
    const legacy = localStorage.getItem(key);
    if (!legacy) continue;
    try {
      const parsed = JSON.parse(legacy);
      const migrated = {
        ...defaultState,
        glucoseRecords: Array.isArray(parsed.glucoseRecords || parsed.glucose)
          ? (parsed.glucoseRecords || parsed.glucose).map(normalizeGlucose)
          : structuredClone(defaultState.glucoseRecords),
        labRecords: Array.isArray(parsed.labRecords || parsed.diagnosis)
          ? (parsed.labRecords || parsed.diagnosis).map(normalizeLab)
          : structuredClone(defaultState.labRecords),
        graphRange: Number(parsed.graphRange) || 7,
        graphType: parsed.graphType || 'fasting',
        recordFilter: parsed.recordFilter || 'all'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return normalizeState(migrated);
    } catch (error) {
      console.error(error);
    }
  }

  return structuredClone(defaultState);
}

function normalizeState(raw) {
  return {
    glucoseRecords: Array.isArray(raw.glucoseRecords) ? raw.glucoseRecords.map(normalizeGlucose) : structuredClone(defaultState.glucoseRecords),
    labRecords: Array.isArray(raw.labRecords) ? raw.labRecords.map(normalizeLab) : structuredClone(defaultState.labRecords),
    graphRange: Number(raw.graphRange) || 7,
    graphType: raw.graphType || 'fasting',
    recordFilter: raw.recordFilter || 'all'
  };
}

function normalizeGlucose(item) {
  return {
    id: item.id || uid(),
    date: item.date || todayDate,
    time: item.time || '07:00',
    type: item.type || 'fasting',
    value: Number(item.value || 0),
    food: item.food || '',
    note: item.note || ''
  };
}

function normalizeLab(item) {
  return {
    id: item.id || uid(),
    date: item.date || todayDate,
    fasting: Number(item.fasting || 0),
    insulin: Number(item.insulin || 0),
    a1c: Number(item.a1c || 0),
    note: item.note || ''
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function field(form, name) {
  return form.elements.namedItem(name);
}

function setDefaultFormValues() {
  if (!field(els.recordForm, 'date').value) field(els.recordForm, 'date').value = todayDate;
  if (!field(els.recordForm, 'time').value) field(els.recordForm, 'time').value = nowTime;
  if (!field(els.recordForm, 'type').value) field(els.recordForm, 'type').value = 'fasting';
  if (!field(els.labForm, 'date').value) field(els.labForm, 'date').value = todayDate;
}

function openView(viewName) {
  els.views.forEach((view) => view.classList.toggle('active', view.id === `view-${viewName}`));
  els.navButtons.forEach((button) => button.classList.toggle('active', button.dataset.nav === viewName));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderHome();
  renderRecordPreview();
  renderRecordList();
  renderGraph();
  renderLabFormPreview();
  renderLab();
  renderAnalysis();
  syncGraphButtons();
  syncRecordTypeButtons();
  syncRecordFilterButtons();
  setDefaultFormValues();
}

function renderHome() {
  const latestFasting = getLatestGlucoseByType('fasting');
  const fasting7 = getGraphSource('fasting', 7);
  const recentPostMax = getRecentPostMax(30);
  const latestLab = getLatestLab();
  const homa = latestLab ? calculateHoma(latestLab.fasting, latestLab.insulin) : null;
  const trend = summarizeTrend(fasting7);
  const plan = buildCarePlan(latestFasting?.value, recentPostMax?.value, latestLab?.a1c, homa);

  els.heroDateText.textContent = `${todayDate} 기준 요약입니다. 지금 가장 중요한 관리 포인트를 먼저 보여드립니다.`;
  els.homeFasting.textContent = latestFasting ? formatNumber(latestFasting.value) : '—';
  els.homeFastingAvg.textContent = fasting7.length ? formatFixed(average(fasting7.map((item) => item.value)), 1) : '—';
  els.homePostMax.textContent = recentPostMax ? formatNumber(recentPostMax.value) : '—';
  els.homeHoma.textContent = homa !== null ? formatFixed(homa, 2) : '—';
  els.homeHomaStatus.textContent = homa !== null ? `${classifyHoma(homa).label} 단계` : '인슐린저항성 지표';

  els.summaryTitle.textContent = plan.overallTitle;
  els.summaryCopy.textContent = plan.overallCopy;
  els.summaryBadge.textContent = plan.badge;
  els.summaryBadge.className = `status-badge ${plan.badgeClass}`;
  els.homeActionTitle.textContent = plan.actionTitle;
  els.homeActionBody.textContent = plan.actionCopy;
  els.homeTrendTitle.textContent = trend.title;
  els.homeTrendCopy.textContent = trend.copy;

  renderMiniChart();
}

function renderMiniChart() {
  const source = getGraphSource('fasting', 7);
  if (!source.length) {
    els.homeChart.innerHTML = emptySvg('공복 기록이 없습니다');
    els.homeMiniNote.textContent = '최근 공복혈당 기록이 아직 없습니다.';
    return;
  }

  els.homeChart.innerHTML = buildChartSvg(source, {
    width: 360,
    height: 170,
    target: 100,
    valueAccessor: (item) => item.value,
    topLabel: '최근 공복혈당',
    bottomLabels: source.map((item) => shortDate(item.date))
  });

  const trend = summarizeTrend(source);
  els.homeMiniNote.textContent = `최근 7일 평균 ${formatFixed(average(source.map((item) => item.value)), 1)}mg/dL · ${trend.copy}`;
}

function renderRecordPreview() {
  const type = field(els.recordForm, 'type').value || 'fasting';
  const rawValue = field(els.recordForm, 'value').value;
  if (!rawValue) {
    els.recordPreview.textContent = '값을 입력하면 현재 범위를 바로 보여드립니다.';
    return;
  }

  const value = Number(rawValue);
  const status = classifyByType(type, value);
  const thresholdText = type === 'fasting'
    ? '공복 기준 100 미만이면 안정 범위에 가깝습니다.'
    : type === 'post1'
      ? '식후 1시간은 보통 140 이하를 목표로 봅니다.'
      : '식후 2시간은 보통 120 전후를 목표로 관리합니다.';

  els.recordPreview.textContent = `${typeLabel(type)} ${formatNumber(value)}mg/dL · ${status.label} ${status.level > 0 ? '구간' : '흐름'}입니다. ${thresholdText}`;
}

function onSubmitRecord(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const record = normalizeGlucose({
    id: formData.get('id') || uid(),
    date: formData.get('date') || todayDate,
    time: formData.get('time') || nowTime,
    type: formData.get('type') || 'fasting',
    value: Number(formData.get('value')),
    food: String(formData.get('food') || '').trim(),
    note: String(formData.get('note') || '').trim()
  });

  const existingIndex = state.glucoseRecords.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) {
    state.glucoseRecords[existingIndex] = record;
    showToast('혈당 기록을 수정했습니다.');
  } else {
    state.glucoseRecords.push(record);
    showToast('혈당 기록을 저장했습니다.');
  }

  saveState();
  resetRecordForm();
  renderAll();
  openView('record');
}

function resetRecordForm() {
  els.recordForm.reset();
  field(els.recordForm, 'id').value = '';
  field(els.recordForm, 'date').value = todayDate;
  field(els.recordForm, 'time').value = nowTime;
  field(els.recordForm, 'type').value = 'fasting';
  els.recordFormTitle.textContent = '혈당 입력';
  els.recordSubmitBtn.textContent = '혈당 저장';
  els.recordCancelBtn.classList.add('hidden');
  syncRecordTypeButtons();
  renderRecordPreview();
}

function renderRecordList() {
  const filter = state.recordFilter || 'all';
  const items = getSortedGlucose().filter((item) => filter === 'all' ? true : item.type === filter);
  els.recordCountPill.textContent = `${items.length}건`;

  if (!items.length) {
    els.recordList.innerHTML = '<div class="empty-state">아직 표시할 혈당 기록이 없습니다. 첫 기록을 남기면 추세를 바로 보여드릴게요.</div>';
    return;
  }

  els.recordList.innerHTML = items.map((item) => {
    const status = classifyByType(item.type, item.value);
    return `
      <article class="list-item">
        <div class="list-top">
          <div>
            <div class="list-title">${typeLabel(item.type)} · ${formatNumber(item.value)}mg/dL</div>
            <div class="list-meta">${item.date} · ${item.time}</div>
          </div>
          <div class="row-actions">
            <span class="tiny-status ${status.badgeClass}">${status.label}</span>
            <button class="line-button" type="button" onclick="editRecord('${item.id}')">수정</button>
            <button class="ghost-button" type="button" onclick="deleteRecord('${item.id}')">삭제</button>
          </div>
        </div>
        <div class="list-sub">${item.food ? `음식: ${escapeHtml(item.food)}` : '음식 기록 없음'}</div>
        ${item.note ? `<div class="list-note">${escapeHtml(item.note)}</div>` : ''}
      </article>
    `;
  }).join('');
}

function editRecord(id) {
  const record = state.glucoseRecords.find((item) => item.id === id);
  if (!record) return;
  openView('record');
  field(els.recordForm, 'id').value = record.id;
  field(els.recordForm, 'date').value = record.date;
  field(els.recordForm, 'time').value = record.time;
  field(els.recordForm, 'type').value = record.type;
  field(els.recordForm, 'value').value = record.value;
  field(els.recordForm, 'food').value = record.food;
  field(els.recordForm, 'note').value = record.note;
  els.recordFormTitle.textContent = '혈당 수정';
  els.recordSubmitBtn.textContent = '혈당 수정 저장';
  els.recordCancelBtn.classList.remove('hidden');
  syncRecordTypeButtons();
  renderRecordPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteRecord(id) {
  if (!window.confirm('이 혈당 기록을 삭제할까요?')) return;
  state.glucoseRecords = state.glucoseRecords.filter((item) => item.id !== id);
  saveState();
  renderAll();
  showToast('혈당 기록을 삭제했습니다.');
}

window.editRecord = editRecord;
window.deleteRecord = deleteRecord;

function renderGraph() {
  const rangeDays = state.graphRange;
  const targetType = state.graphType;
  const source = getGraphSource(targetType, rangeDays);
  const target = targetValueForType(targetType);

  if (!source.length) {
    els.graphChart.innerHTML = emptySvg('그래프 데이터가 없습니다');
    els.graphSummary.textContent = '해당 기간에 표시할 기록이 없습니다.';
    els.graphPointList.innerHTML = '<div class="empty-state">표시할 포인트가 없습니다.</div>';
    els.graphCountPill.textContent = '0개';
    els.graphAvg.textContent = '—';
    els.graphLatest.textContent = '—';
    els.graphHigh.textContent = '—';
    els.graphTrend.textContent = '—';
    return;
  }

  els.graphChart.innerHTML = buildChartSvg(source, {
    width: 360,
    height: 220,
    target,
    valueAccessor: (item) => item.value,
    topLabel: `${typeLabel(targetType)} · ${rangeLabel(rangeDays)}`,
    bottomLabels: source.map((item) => shortDate(item.date))
  });

  const values = source.map((item) => item.value);
  const averageValue = average(values);
  const latest = source[source.length - 1];
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const trend = summarizeTrend(source);
  const latestStatus = classifyByType(targetType, latest.value);

  els.graphAvg.textContent = `${formatFixed(averageValue, 1)}`;
  els.graphLatest.textContent = `${formatNumber(latest.value)}`;
  els.graphHigh.textContent = `${formatNumber(highest)}`;
  els.graphTrend.textContent = trend.short;
  els.graphSummary.textContent = `${rangeLabel(rangeDays)} ${typeLabel(targetType)} 평균은 ${formatFixed(averageValue, 1)}mg/dL입니다. 최근 값은 ${formatNumber(latest.value)}mg/dL로 ${latestStatus.label} 흐름이며, 최저 ${formatNumber(lowest)} / 최고 ${formatNumber(highest)}mg/dL 범위입니다.`;
  els.graphCountPill.textContent = `${source.length}개`;

  els.graphPointList.innerHTML = source.slice().reverse().map((item) => {
    const status = classifyByType(item.type, item.value);
    return `
      <article class="list-item">
        <div class="list-top">
          <div>
            <div class="list-title">${formatNumber(item.value)}mg/dL</div>
            <div class="list-meta">${item.date} · ${item.time}</div>
          </div>
          <span class="tiny-status ${status.badgeClass}">${typeLabel(item.type)}</span>
        </div>
        ${item.food ? `<div class="list-sub">음식: ${escapeHtml(item.food)}</div>` : ''}
        ${item.note ? `<div class="list-note">${escapeHtml(item.note)}</div>` : ''}
      </article>
    `;
  }).join('');
}

function syncGraphButtons() {
  els.rangeButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.range) === Number(state.graphRange));
  });
  els.typeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.type === state.graphType);
  });
}

function onSubmitLab(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const lab = normalizeLab({
    id: formData.get('id') || uid(),
    date: formData.get('date') || todayDate,
    fasting: Number(formData.get('fasting')),
    insulin: Number(formData.get('insulin')),
    a1c: Number(formData.get('a1c')),
    note: String(formData.get('note') || '').trim()
  });

  const existingIndex = state.labRecords.findIndex((item) => item.id === lab.id);
  if (existingIndex >= 0) {
    state.labRecords[existingIndex] = lab;
    showToast('검사 기록을 수정했습니다.');
  } else {
    state.labRecords.push(lab);
    showToast('검사 기록을 저장했습니다.');
  }

  saveState();
  resetLabForm();
  renderAll();
  openView('lab');
}

function resetLabForm() {
  els.labForm.reset();
  field(els.labForm, 'id').value = '';
  field(els.labForm, 'date').value = todayDate;
  els.labFormTitle.textContent = '검사 입력';
  els.labSubmitBtn.textContent = '검사 저장';
  els.labCancelBtn.classList.add('hidden');
  renderLabFormPreview();
}

function renderLabFormPreview() {
  const fasting = Number(field(els.labForm, 'fasting').value || 0);
  const insulin = Number(field(els.labForm, 'insulin').value || 0);
  if (!fasting || !insulin) {
    els.labFormHoma.textContent = 'HOMA-IR —';
    els.labFormStatus.textContent = '공복혈당과 인슐린을 입력하면 자동 계산됩니다.';
    return;
  }

  const homa = calculateHoma(fasting, insulin);
  const status = classifyHoma(homa);
  els.labFormHoma.textContent = `HOMA-IR ${formatFixed(homa, 2)}`;
  els.labFormStatus.textContent = `현재 계산값은 ${status.label} 단계입니다.`;
}

function renderLab() {
  const latest = getLatestLab();
  const items = getSortedLabs();
  els.labCountPill.textContent = `${items.length}건`;

  if (!latest) {
    els.labLatestDate.textContent = '—';
    els.labLatestFasting.textContent = '—';
    els.labLatestA1c.textContent = '—';
    els.labLatestHoma.textContent = '—';
    els.labLatestHomaText.textContent = '상태';
    els.labInsight.textContent = '검사를 입력하면 자동으로 분석해드려요.';
    els.labCompare.textContent = '이전 검사와의 비교도 함께 표시됩니다.';
    els.labList.innerHTML = '<div class="empty-state">아직 저장된 검사 기록이 없습니다.</div>';
    return;
  }

  const homa = calculateHoma(latest.fasting, latest.insulin);
  const homaStatus = classifyHoma(homa);
  const fastingStatus = classifyFasting(latest.fasting);
  const a1cStatus = classifyA1c(latest.a1c);
  const previous = items[1] || null;

  els.labLatestDate.textContent = latest.date;
  els.labLatestFasting.textContent = formatNumber(latest.fasting);
  els.labLatestA1c.textContent = formatFixed(latest.a1c, 1);
  els.labLatestHoma.textContent = formatFixed(homa, 2);
  els.labLatestHomaText.textContent = homaStatus.label;
  els.labInsight.textContent = `공복혈당은 ${fastingStatus.label} 구간, HbA1c는 ${a1cStatus.label} 구간, HOMA-IR는 ${formatFixed(homa, 2)}로 ${homaStatus.label} 단계입니다.`;
  els.labCompare.textContent = previous
    ? buildLabComparison(latest, previous)
    : '아직 비교할 이전 검사 기록이 없습니다.';

  els.labList.innerHTML = items.map((item) => {
    const itemHoma = calculateHoma(item.fasting, item.insulin);
    const itemStatus = classifyHoma(itemHoma);
    return `
      <article class="list-item">
        <div class="list-top">
          <div>
            <div class="list-title">${item.date}</div>
            <div class="list-meta">공복 ${formatNumber(item.fasting)}mg/dL · 인슐린 ${formatFixed(item.insulin, 2)} · HbA1c ${formatFixed(item.a1c, 1)}%</div>
          </div>
          <div class="row-actions">
            <span class="tiny-status ${itemStatus.badgeClass}">${itemStatus.label}</span>
            <button class="line-button" type="button" onclick="editLab('${item.id}')">수정</button>
            <button class="ghost-button" type="button" onclick="deleteLab('${item.id}')">삭제</button>
          </div>
        </div>
        <div class="list-sub">HOMA-IR ${formatFixed(itemHoma, 2)} · ${itemStatus.label} 단계</div>
        ${item.note ? `<div class="list-note">${escapeHtml(item.note)}</div>` : ''}
      </article>
    `;
  }).join('');
}

function buildLabComparison(latest, previous) {
  const homaLatest = calculateHoma(latest.fasting, latest.insulin);
  const homaPrevious = calculateHoma(previous.fasting, previous.insulin);
  const fastingDiff = latest.fasting - previous.fasting;
  const a1cDiff = latest.a1c - previous.a1c;
  const homaDiff = homaLatest - homaPrevious;
  return `이전 검사 대비 공복혈당 ${signedNumber(fastingDiff)}mg/dL, HbA1c ${signedFixed(a1cDiff, 1)}%p, HOMA-IR ${signedFixed(homaDiff, 2)} 변화입니다.`;
}

function editLab(id) {
  const lab = state.labRecords.find((item) => item.id === id);
  if (!lab) return;
  openView('lab');
  field(els.labForm, 'id').value = lab.id;
  field(els.labForm, 'date').value = lab.date;
  field(els.labForm, 'fasting').value = lab.fasting;
  field(els.labForm, 'insulin').value = lab.insulin;
  field(els.labForm, 'a1c').value = lab.a1c;
  field(els.labForm, 'note').value = lab.note;
  els.labFormTitle.textContent = '검사 수정';
  els.labSubmitBtn.textContent = '검사 수정 저장';
  els.labCancelBtn.classList.remove('hidden');
  renderLabFormPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteLab(id) {
  if (!window.confirm('이 검사 기록을 삭제할까요?')) return;
  state.labRecords = state.labRecords.filter((item) => item.id !== id);
  saveState();
  renderAll();
  showToast('검사 기록을 삭제했습니다.');
}

window.editLab = editLab;
window.deleteLab = deleteLab;

function renderAnalysis() {
  const latestFasting = getLatestGlucoseByType('fasting');
  const recentPostMax = getRecentPostMax(30);
  const latestLab = getLatestLab();
  const homa = latestLab ? calculateHoma(latestLab.fasting, latestLab.insulin) : null;
  const plan = buildCarePlan(latestFasting?.value, recentPostMax?.value, latestLab?.a1c, homa);
  const pattern = buildPatternInsight();
  const checklist = buildChecklist();

  els.analysisOverallTitle.textContent = plan.overallTitle;
  els.analysisOverallBadge.textContent = plan.badge;
  els.analysisOverallBadge.className = `status-badge ${plan.badgeClass}`;
  els.analysisOverallCopy.textContent = plan.analysisCopy;
  els.analysisPatternTitle.textContent = pattern.title;
  els.analysisPatternCopy.textContent = pattern.copy;
  els.analysisFocusTitle.textContent = plan.focusTitle;
  els.analysisFocusCopy.textContent = plan.focusCopy;
  els.analysisMissionTitle.textContent = plan.actionTitle;
  els.analysisMissionCopy.textContent = plan.actionCopy;
  els.analysisChecklist.innerHTML = checklist.map((item) => `
    <div class="check-item"><span class="check-dot">✓</span><span>${escapeHtml(item)}</span></div>
  `).join('');
}

function buildCarePlan(fastingValue, postMaxValue, a1cValue, homaValue) {
  const fastingStatus = fastingValue != null ? classifyFasting(fastingValue) : null;
  const postStatus = postMaxValue != null ? classifyPost(postMaxValue) : null;
  const a1cStatus = a1cValue != null ? classifyA1c(a1cValue) : null;
  const homaStatus = homaValue != null ? classifyHoma(homaValue) : null;
  const statuses = [fastingStatus, postStatus, a1cStatus, homaStatus].filter(Boolean);
  const worst = statuses.reduce((max, item) => Math.max(max, item.level), 0);

  let badge = '데이터 확인';
  let badgeClass = 'status-caution';
  let overallTitle = '기록을 더 모으면 더 정확한 상태를 보여드릴게요';
  let overallCopy = '아직 충분한 데이터가 없어서 한 가지 행동 미션부터 먼저 제안합니다.';
  let analysisCopy = overallCopy;
  let actionTitle = '오늘 공복 또는 식후 기록 1건 입력';
  let actionCopy = '기록이 있어야 주간 평균과 추세를 더 정확하게 계산할 수 있습니다.';
  let focusTitle = '기록을 채우는 것이 먼저입니다';
  let focusCopy = '공복과 식후 기록이 함께 있어야 어느 구간을 우선 관리할지 분명해집니다.';

  if (!statuses.length) {
    return { badge, badgeClass, overallTitle, overallCopy, analysisCopy, actionTitle, actionCopy, focusTitle, focusCopy };
  }

  if (worst === 0) {
    badge = '안정적';
    badgeClass = 'status-stable';
    overallTitle = '지금 흐름은 비교적 안정적입니다';
    overallCopy = `최근 공복 ${withUnit(fastingValue, 'mg/dL')}, 식후 최고 ${withUnit(postMaxValue, 'mg/dL')}, HbA1c ${withUnit(a1cValue, '%', 1)} 기준으로는 안정 흐름에 가깝습니다.`;
    analysisCopy = '큰 경고 신호보다는 지금의 루틴을 꾸준히 유지하는 것이 더 중요해 보입니다.';
    actionTitle = '현재 루틴을 유지하고 식후 15분 걷기 이어가기';
    actionCopy = '특히 식후 최고 혈당이 안정 범위를 유지하도록 가벼운 걷기와 기록을 이어가세요.';
    focusTitle = '안정 흐름을 계속 유지하는 것이 핵심입니다';
    focusCopy = '공복과 식후 모두 크게 흔들리지 않도록 현재 식사 패턴과 활동량을 유지하는 것이 좋습니다.';
  } else if ((postStatus?.level || 0) >= (fastingStatus?.level || 0) && (postStatus?.level || 0) >= (homaStatus?.level || 0)) {
    badge = postStatus?.level === 2 ? '점검 필요' : '주의 필요';
    badgeClass = postStatus?.level === 2 ? 'status-high' : 'status-caution';
    overallTitle = '식후 혈당 관리에 먼저 집중하는 편이 좋습니다';
    overallCopy = `최근 식후 최고 ${withUnit(postMaxValue, 'mg/dL')}가 반복되어 식후 반응을 먼저 다듬는 편이 좋습니다.`;
    analysisCopy = '점심이나 저녁 식후에 상승이 반복되면 공복보다 식후 관리 루틴의 효과가 더 크게 느껴질 수 있습니다.';
    actionTitle = '가장 높은 식후 구간에 15분 걷기 붙이기';
    actionCopy = '특히 식후 1시간 수치가 높다면 식사 직후 가벼운 걷기와 탄수량 조절을 우선 적용해보세요.';
    focusTitle = '식후 스파이크를 줄이는 것이 1순위입니다';
    focusCopy = '식후 혈당이 안정되면 주간 평균과 공복 흐름도 함께 좋아질 가능성이 큽니다.';
  } else if ((homaStatus?.level || 0) >= (fastingStatus?.level || 0)) {
    badge = homaStatus?.level === 2 ? '점검 필요' : '주의 필요';
    badgeClass = homaStatus?.level === 2 ? 'status-high' : 'status-caution';
    overallTitle = '혈당보다 인슐린저항성 관리가 더 중요한 구간입니다';
    overallCopy = `HOMA-IR ${withUnit(homaValue, '', 2)}가 ${homaStatus.label} 단계여서 혈당이 무난해 보여도 대사 관리가 필요합니다.`;
    analysisCopy = '지금은 숫자 하나보다 흐름이 중요합니다. 공복 유지, 식전 준비, 식후 활동 같은 루틴이 더 큰 도움이 됩니다.';
    actionTitle = '공복 유지와 식전 준비 루틴 지키기';
    actionCopy = '아침 공복 유지, 식전 준비, 식후 가벼운 활동처럼 인슐린 감수성에 도움이 되는 루틴을 우선 유지하세요.';
    focusTitle = '인슐린저항성 개선이 우선입니다';
    focusCopy = '당장 혈당이 크게 높지 않아도 HOMA-IR가 높으면 생활 루틴을 정교하게 유지하는 것이 좋습니다.';
  } else {
    badge = fastingStatus?.level === 2 ? '점검 필요' : '주의 필요';
    badgeClass = fastingStatus?.level === 2 ? 'status-high' : 'status-caution';
    overallTitle = '공복혈당 관리에 조금 더 집중할 필요가 있습니다';
    overallCopy = `최근 공복 ${withUnit(fastingValue, 'mg/dL')}가 ${fastingStatus.label} 구간이어서 아침 전후 루틴을 점검하는 것이 좋습니다.`;
    analysisCopy = '공복이 먼저 흔들리면 하루 전체 흐름도 불안정해질 수 있어서 기상 후 루틴과 전날 저녁 패턴을 함께 살펴보는 편이 좋습니다.';
    actionTitle = '아침 공복 패턴 점검하기';
    actionCopy = '전날 저녁 탄수량과 야식 여부, 기상 후 활동량을 함께 확인해 공복 변화를 줄여보세요.';
    focusTitle = '공복 변동폭을 줄이는 것이 중요합니다';
    focusCopy = '공복이 안정되면 그래프 전체가 훨씬 부드럽게 바뀌는 경우가 많습니다.';
  }

  return { badge, badgeClass, overallTitle, overallCopy, analysisCopy, actionTitle, actionCopy, focusTitle, focusCopy };
}

function buildPatternInsight() {
  const recentPost1 = getGraphSource('post1', 30);
  const recentPost2 = getGraphSource('post2', 30);
  const recentFasting = getGraphSource('fasting', 14);

  if (!recentPost1.length && !recentPost2.length && !recentFasting.length) {
    return {
      title: '아직 패턴을 읽을 데이터가 부족합니다',
      copy: '공복과 식후 기록을 며칠만 이어서 입력해도 어떤 구간이 자주 높은지 보이기 시작합니다.'
    };
  }

  const post1Avg = recentPost1.length ? average(recentPost1.map((item) => item.value)) : null;
  const post2Avg = recentPost2.length ? average(recentPost2.map((item) => item.value)) : null;
  const fastingAvg = recentFasting.length ? average(recentFasting.map((item) => item.value)) : null;

  if (post1Avg != null && post2Avg != null && post1Avg > post2Avg + 10) {
    return {
      title: '식후 1시간 수치가 더 높게 나타나는 패턴입니다',
      copy: `최근 식후 1시간 평균 ${formatFixed(post1Avg, 1)}mg/dL, 식후 2시간 평균 ${formatFixed(post2Avg, 1)}mg/dL로 초기 스파이크 관리가 중요해 보입니다.`
    };
  }

  if (fastingAvg != null && fastingAvg >= 100) {
    return {
      title: '아침 공복이 조금 높게 유지되는 패턴입니다',
      copy: `최근 2주 공복 평균이 ${formatFixed(fastingAvg, 1)}mg/dL로 보입니다. 저녁 식사와 기상 후 루틴을 함께 점검하는 편이 좋습니다.`
    };
  }

  return {
    title: '기록 흐름이 비교적 안정적으로 이어지고 있습니다',
    copy: '특정 한 구간만 크게 튀는 패턴은 아직 두드러지지 않습니다. 지금의 기록 루틴을 계속 이어가세요.'
  };
}

function buildChecklist() {
  const latestFasting = getLatestGlucoseByType('fasting');
  const recentPostMax = getRecentPostMax(30);
  const latestLab = getLatestLab();
  const items = [];

  if (!latestFasting) items.push('최근 공복 기록 1건을 입력해 주간 평균의 기준점을 만들어보세요.');
  else items.push(`최근 공복 ${formatNumber(latestFasting.value)}mg/dL를 기준으로 같은 시간대 기록을 이어가세요.`);

  if (recentPostMax && recentPostMax.value > 140) items.push('가장 높았던 식후 기록 시간대에 식후 10~15분 걷기를 붙여보세요.');
  else items.push('식후 1시간과 2시간을 번갈아 기록해 반응 패턴을 더 선명하게 보세요.');

  if (latestLab) items.push(`최신 HOMA-IR와 HbA1c를 기준으로 검사 추세를 이어서 비교하세요.`);
  else items.push('검사 결과를 넣으면 HOMA-IR와 HbA1c 해석이 함께 표시됩니다.');

  return items;
}

function syncRecordTypeButtons() {
  const selected = field(els.recordForm, 'type').value || 'fasting';
  els.recordTypeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.recordType === selected);
  });
}

function syncRecordFilterButtons() {
  const selected = state.recordFilter || 'all';
  els.recordFilterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.recordFilter === selected);
  });
}

function getSortedGlucose() {
  return [...state.glucoseRecords].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

function getSortedLabs() {
  return [...state.labRecords].sort((a, b) => b.date.localeCompare(a.date));
}

function getLatestGlucoseByType(type) {
  return getSortedGlucose().find((item) => item.type === type) || null;
}

function getLatestLab() {
  return getSortedLabs()[0] || null;
}

function getRecentPostMax(days) {
  const items = getSortedGlucose().filter((item) => item.type !== 'fasting');
  const filtered = items.filter((item) => isWithinDays(item.date, days));
  const target = filtered.length ? filtered : items;
  if (!target.length) return null;
  return target.reduce((max, item) => item.value > max.value ? item : max, target[0]);
}

function getGraphSource(type, days) {
  const items = getSortedGlucose()
    .filter((item) => item.type === type)
    .filter((item) => isWithinDays(item.date, days))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  if (items.length) return items;

  return getSortedGlucose()
    .filter((item) => item.type === type)
    .slice(0, days === 365 ? 24 : days === 30 ? 12 : 7)
    .reverse();
}

function buildChartSvg(items, options) {
  const width = options.width;
  const height = options.height;
  const paddingX = 30;
  const paddingTop = 24;
  const paddingBottom = 34;
  const values = items.map((item) => Number(options.valueAccessor(item)));
  const min = Math.max(60, Math.min(...values) - 12);
  const max = Math.max(options.target + 20, Math.max(...values) + 12);
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;
  const stepX = items.length > 1 ? innerWidth / (items.length - 1) : 0;
  const toY = (value) => paddingTop + innerHeight - ((value - min) / (max - min || 1)) * innerHeight;
  const points = items.map((item, index) => ({
    x: paddingX + stepX * index,
    y: toY(options.valueAccessor(item)),
    value: options.valueAccessor(item)
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${paddingX},${height - paddingBottom} ${points.map((point) => `${point.x},${point.y}`).join(' ')} ${paddingX + stepX * (items.length - 1)},${height - paddingBottom}`;
  const targetY = toY(options.target);

  const gridLines = [0, 0.5, 1].map((ratio) => {
    const y = paddingTop + innerHeight * ratio;
    return `<line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="#dbe6f6" stroke-width="1" />`;
  }).join('');

  const labelStep = Math.max(1, Math.ceil(options.bottomLabels.length / 6));
  const xLabels = options.bottomLabels.map((label, index) => {
    if (index % labelStep !== 0 && index !== options.bottomLabels.length - 1) return '';
    const x = paddingX + stepX * index;
    return `<text x="${x}" y="${height - 10}" text-anchor="middle" fill="#7b8ba5" font-size="11" font-weight="700">${escapeSvg(label)}</text>`;
  }).join('');

  const dots = points.map((point) => {
    const severity = point.value > options.target ? '#d69a13' : '#2f6fe5';
    return `<circle cx="${point.x}" cy="${point.y}" r="4.5" fill="${severity}" />`;
  }).join('');

  return `
    <defs>
      <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#6c9dff" stop-opacity="0.28" />
        <stop offset="100%" stop-color="#6c9dff" stop-opacity="0" />
      </linearGradient>
    </defs>
    ${gridLines}
    <line x1="${paddingX}" y1="${targetY}" x2="${width - paddingX}" y2="${targetY}" stroke="#d69a13" stroke-width="1.5" stroke-dasharray="5 5" />
    <polygon points="${area}" fill="url(#lineFill)" />
    <polyline points="${polyline}" fill="none" stroke="#2f6fe5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    ${dots}
    <text x="${paddingX}" y="14" fill="#6a7d98" font-size="12" font-weight="800">${escapeSvg(options.topLabel)}</text>
    <text x="${width - paddingX}" y="14" text-anchor="end" fill="#d69a13" font-size="12" font-weight="800">기준 ${options.target}</text>
    ${xLabels}
  `;
}

function emptySvg(message) {
  return `<text x="50%" y="50%" text-anchor="middle" fill="#7b8ba5" font-size="14" font-weight="700">${escapeSvg(message)}</text>`;
}

function calculateHoma(fasting, insulin) {
  return (Number(fasting) * Number(insulin)) / 405;
}

function classifyFasting(value) {
  if (value >= 126) return { level: 2, label: '점검 필요', badgeClass: 'status-high' };
  if (value >= 100) return { level: 1, label: '주의', badgeClass: 'status-caution' };
  return { level: 0, label: '안정', badgeClass: 'status-stable' };
}

function classifyPost(value) {
  if (value > 180) return { level: 2, label: '점검 필요', badgeClass: 'status-high' };
  if (value > 140) return { level: 1, label: '주의', badgeClass: 'status-caution' };
  return { level: 0, label: '안정', badgeClass: 'status-stable' };
}

function classifyA1c(value) {
  if (value >= 6.5) return { level: 2, label: '점검 필요', badgeClass: 'status-high' };
  if (value >= 5.7) return { level: 1, label: '주의', badgeClass: 'status-caution' };
  return { level: 0, label: '안정', badgeClass: 'status-stable' };
}

function classifyHoma(value) {
  if (value >= 3) return { level: 2, label: '점검 필요', badgeClass: 'status-high' };
  if (value >= 2.5) return { level: 1, label: '주의', badgeClass: 'status-caution' };
  if (value >= 2) return { level: 1, label: '경계', badgeClass: 'status-caution' };
  return { level: 0, label: '안정', badgeClass: 'status-stable' };
}

function classifyByType(type, value) {
  if (type === 'post1' || type === 'post2') return classifyPost(value);
  return classifyFasting(value);
}

function summarizeTrend(source) {
  if (!source.length) {
    return { title: '추세를 계산하는 중입니다', copy: '데이터가 더 쌓이면 변화 방향을 보여드릴게요.', short: '—' };
  }
  if (source.length === 1) {
    return { title: '기준점을 만드는 중입니다', copy: '같은 유형 기록이 더 쌓이면 상승·하락 흐름을 보여드릴게요.', short: '기준점' };
  }

  const start = source[0].value;
  const end = source[source.length - 1].value;
  const diff = end - start;
  if (Math.abs(diff) <= 4) {
    return { title: '큰 변동 없이 비교적 안정적인 흐름입니다', copy: `처음과 최근 값 차이가 ${Math.abs(diff)}mg/dL 안쪽입니다.`, short: '안정' };
  }
  if (diff < 0) {
    return { title: '완만하게 내려가는 흐름입니다', copy: `최근 값이 시작점보다 ${Math.abs(diff)}mg/dL 낮습니다.`, short: `${Math.abs(diff)}↓` };
  }
  return { title: '조금 올라가는 흐름입니다', copy: `최근 값이 시작점보다 ${Math.abs(diff)}mg/dL 높습니다.`, short: `${Math.abs(diff)}↑` };
}

function typeLabel(type) {
  if (type === 'post1') return '식후 1시간';
  if (type === 'post2') return '식후 2시간';
  return '공복';
}

function targetValueForType(type) {
  if (type === 'post1') return 140;
  if (type === 'post2') return 120;
  return 100;
}

function rangeLabel(days) {
  if (Number(days) === 7) return '주간';
  if (Number(days) === 30) return '월간';
  return '연간';
}

function toDateInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function isWithinDays(dateString, days) {
  const targetDate = new Date(`${dateString}T00:00:00`);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return targetDate >= cutoff;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
}

function shortDate(dateString) {
  const [, month, day] = dateString.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function formatNumber(value) {
  return Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 });
}

function formatFixed(value, digits) {
  return Number(value).toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function signedNumber(value) {
  const number = Number(value);
  if (number === 0) return '0';
  return `${number > 0 ? '+' : ''}${formatNumber(number)}`;
}

function signedFixed(value, digits) {
  const number = Number(value);
  if (number === 0) return Number(0).toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${number > 0 ? '+' : ''}${Number(number).toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function withUnit(value, unit, digits = 0) {
  if (value == null) return '—';
  const text = digits ? formatFixed(value, digits) : formatNumber(value);
  return `${text}${unit}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeSvg(value) {
  return escapeHtml(value);
}

function uid() {
  return `id-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove('show');
  }, 1800);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then(() => navigator.serviceWorker.ready).then(() => {}).catch(() => {});
    });
  }
}
