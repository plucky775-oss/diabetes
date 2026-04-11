const STORAGE_KEY = 'diabetes-care-v2';
const LEGACY_KEYS = ['metabolic-reset-v3'];

const today = new Date();
const todayDate = toDateInputValue(today);
const nowTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

function field(form, name) {
  return form.elements.namedItem(name);
}

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
  graphType: 'fasting'
};

let state = loadState();

const els = {
  views: document.querySelectorAll('.view'),
  navButtons: document.querySelectorAll('.nav-button'),
  heroDateText: document.getElementById('heroDateText'),
  summaryTitle: document.getElementById('summaryTitle'),
  summaryBadge: document.getElementById('summaryBadge'),
  summaryCopy: document.getElementById('summaryCopy'),
  homeFasting: document.getElementById('homeFasting'),
  homePostMax: document.getElementById('homePostMax'),
  homeA1c: document.getElementById('homeA1c'),
  homeHoma: document.getElementById('homeHoma'),
  homeHomaStatus: document.getElementById('homeHomaStatus'),
  homeChart: document.getElementById('homeChart'),
  homeMiniNote: document.getElementById('homeMiniNote'),
  goToRecordBtn: document.getElementById('goToRecordBtn'),
  recordForm: document.getElementById('recordForm'),
  recordFormTitle: document.getElementById('recordFormTitle'),
  recordSubmitBtn: document.getElementById('recordSubmitBtn'),
  recordCancelBtn: document.getElementById('recordCancelBtn'),
  recordList: document.getElementById('recordList'),
  recordCountPill: document.getElementById('recordCountPill'),
  graphChart: document.getElementById('graphChart'),
  graphSummary: document.getElementById('graphSummary'),
  graphPointList: document.getElementById('graphPointList'),
  graphCountPill: document.getElementById('graphCountPill'),
  rangeButtons: document.querySelectorAll('[data-range]'),
  typeButtons: document.querySelectorAll('[data-type]'),
  labForm: document.getElementById('labForm'),
  labFormTitle: document.getElementById('labFormTitle'),
  labSubmitBtn: document.getElementById('labSubmitBtn'),
  labCancelBtn: document.getElementById('labCancelBtn'),
  labLatestDate: document.getElementById('labLatestDate'),
  labLatestFasting: document.getElementById('labLatestFasting'),
  labLatestA1c: document.getElementById('labLatestA1c'),
  labLatestHoma: document.getElementById('labLatestHoma'),
  labLatestHomaText: document.getElementById('labLatestHomaText'),
  labInsight: document.getElementById('labInsight'),
  labList: document.getElementById('labList'),
  labCountPill: document.getElementById('labCountPill')
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

  els.labForm.addEventListener('submit', onSubmitLab);
  els.labCancelBtn.addEventListener('click', resetLabForm);

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
        glucoseRecords: Array.isArray(parsed.glucose)
          ? parsed.glucose.map((item) => ({
              id: item.id || uid(),
              date: item.date || todayDate,
              time: item.time || '07:00',
              type: item.type || 'fasting',
              value: Number(item.value || 0),
              food: item.food || '',
              note: item.note || ''
            }))
          : defaultState.glucoseRecords,
        labRecords: Array.isArray(parsed.diagnosis)
          ? parsed.diagnosis.map((item) => ({
              id: item.id || uid(),
              date: item.date || todayDate,
              fasting: Number(item.fasting || 0),
              insulin: Number(item.insulin || 0),
              a1c: Number(item.a1c || 0),
              note: item.note || ''
            }))
          : defaultState.labRecords,
        graphRange: 7,
        graphType: 'fasting'
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
    glucoseRecords: Array.isArray(raw.glucoseRecords) ? raw.glucoseRecords.map((item) => ({
      id: item.id || uid(),
      date: item.date || todayDate,
      time: item.time || '07:00',
      type: item.type || 'fasting',
      value: Number(item.value || 0),
      food: item.food || '',
      note: item.note || ''
    })) : structuredClone(defaultState.glucoseRecords),
    labRecords: Array.isArray(raw.labRecords) ? raw.labRecords.map((item) => ({
      id: item.id || uid(),
      date: item.date || todayDate,
      fasting: Number(item.fasting || 0),
      insulin: Number(item.insulin || 0),
      a1c: Number(item.a1c || 0),
      note: item.note || ''
    })) : structuredClone(defaultState.labRecords),
    graphRange: Number(raw.graphRange) || 7,
    graphType: raw.graphType || 'fasting'
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setDefaultFormValues() {
  if (!field(els.recordForm, 'date').value) field(els.recordForm, 'date').value = todayDate;
  if (!field(els.recordForm, 'time').value) field(els.recordForm, 'time').value = nowTime;
  if (!field(els.labForm, 'date').value) field(els.labForm, 'date').value = todayDate;
}

function openView(viewName) {
  els.views.forEach((view) => view.classList.toggle('active', view.id === `view-${viewName}`));
  els.navButtons.forEach((button) => button.classList.toggle('active', button.dataset.nav === viewName));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderHome();
  renderRecordList();
  renderGraph();
  renderLab();
  syncGraphButtons();
  setDefaultFormValues();
}

function renderHome() {
  els.heroDateText.textContent = `${todayDate} 기준으로 오늘 기록을 관리할 수 있어요.`;

  const latestFasting = getLatestGlucoseByType('fasting');
  const recentPostMax = getRecentPostMax(30);
  const latestLab = getLatestLab();
  const homa = latestLab ? calculateHoma(latestLab.fasting, latestLab.insulin) : null;

  els.homeFasting.textContent = latestFasting ? formatNumber(latestFasting.value) : '—';
  els.homePostMax.textContent = recentPostMax ? formatNumber(recentPostMax.value) : '—';
  els.homeA1c.textContent = latestLab ? formatFixed(latestLab.a1c, 1) : '—';
  els.homeHoma.textContent = homa !== null ? formatFixed(homa, 2) : '—';
  els.homeHomaStatus.textContent = homa !== null ? `${classifyHoma(homa).label} 수준` : '인슐린저항성 지표';

  const summary = makeSummary(latestFasting?.value, recentPostMax?.value, latestLab?.a1c, homa);
  els.summaryTitle.textContent = summary.title;
  els.summaryCopy.textContent = summary.body;
  els.summaryBadge.textContent = summary.badge;
  els.summaryBadge.className = `status-badge ${summary.badgeClass}`;

  renderMiniChart();
}

function makeSummary(fastingValue, postMaxValue, a1cValue, homaValue) {
  const fastingStatus = fastingValue != null ? classifyFasting(fastingValue) : null;
  const postStatus = postMaxValue != null ? classifyPost(postMaxValue) : null;
  const a1cStatus = a1cValue != null ? classifyA1c(a1cValue) : null;
  const homaStatus = homaValue != null ? classifyHoma(homaValue) : null;

  const statuses = [fastingStatus, postStatus, a1cStatus, homaStatus].filter(Boolean);
  const worst = statuses.reduce((max, item) => Math.max(max, item.level), 0);

  let title = '기록을 더 입력하면 정확한 흐름을 보여드릴게요';
  let badge = '데이터 확인';
  let badgeClass = 'status-caution';

  if (!statuses.length) {
    return {
      title,
      badge,
      badgeClass,
      body: '아직 충분한 기록이 없습니다. 공복혈당과 검사를 입력하면 홈 요약이 자동으로 업데이트됩니다.'
    };
  }

  if (worst === 0) {
    title = '지금 흐름은 비교적 안정적입니다';
    badge = '안정적';
    badgeClass = 'status-stable';
  } else if (worst === 1) {
    title = homaStatus && homaStatus.level === 1 && [fastingStatus, postStatus, a1cStatus].every((item) => !item || item.level === 0)
      ? '혈당은 안정적이지만 인슐린저항성 관리가 필요합니다'
      : '지금 흐름은 관리가 필요한 구간입니다';
    badge = '주의 필요';
    badgeClass = 'status-caution';
  } else {
    title = '지금 수치는 빠른 점검이 필요합니다';
    badge = '점검 필요';
    badgeClass = 'status-high';
  }

  const parts = [];
  if (fastingValue != null) parts.push(`최근 공복은 ${formatNumber(fastingValue)}mg/dL입니다.`);
  if (postMaxValue != null) parts.push(`최근 식후 최고는 ${formatNumber(postMaxValue)}mg/dL입니다.`);
  if (a1cValue != null) parts.push(`최신 HbA1c는 ${formatFixed(a1cValue, 1)}%입니다.`);
  if (homaValue != null) parts.push(`HOMA-IR는 ${formatFixed(homaValue, 2)}로 ${classifyHoma(homaValue).label} 수준입니다.`);

  return { title, badge, badgeClass, body: parts.join(' ') };
}

function renderMiniChart() {
  const source = getSortedGlucose().filter((item) => item.type === 'fasting').slice(0, 7).reverse();
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
    topLabel: '최근 공복혈당 7회',
    bottomLabels: source.map((item) => shortDate(item.date))
  });

  const avgValue = average(source.map((item) => item.value));
  els.homeMiniNote.textContent = `최근 공복 평균은 ${formatFixed(avgValue, 1)}mg/dL입니다.`;
}

function onSubmitRecord(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const record = {
    id: formData.get('id') || uid(),
    date: formData.get('date') || todayDate,
    time: formData.get('time') || nowTime,
    type: formData.get('type') || 'fasting',
    value: Number(formData.get('value')),
    food: String(formData.get('food') || '').trim(),
    note: String(formData.get('note') || '').trim()
  };

  const existingIndex = state.glucoseRecords.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) {
    state.glucoseRecords[existingIndex] = record;
  } else {
    state.glucoseRecords.push(record);
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
}

function renderRecordList() {
  const items = getSortedGlucose();
  els.recordCountPill.textContent = `${items.length}건`;

  if (!items.length) {
    els.recordList.innerHTML = '<div class="empty-state">아직 저장된 혈당 기록이 없습니다.</div>';
    return;
  }

  els.recordList.innerHTML = items.map((item) => {
    return `
      <article class="list-item">
        <div class="list-top">
          <div>
            <div class="list-title">${typeLabel(item.type)} · ${formatNumber(item.value)}mg/dL</div>
            <div class="list-meta">${item.date} · ${item.time}</div>
          </div>
          <div class="row-actions">
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteRecord(id) {
  state.glucoseRecords = state.glucoseRecords.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

window.editRecord = editRecord;
window.deleteRecord = deleteRecord;

function renderGraph() {
  const rangeDays = state.graphRange;
  const targetType = state.graphType;
  const source = getFilteredGraphData(targetType, rangeDays);
  const target = targetType === 'fasting' ? 100 : targetType === 'post1' ? 140 : 120;

  if (!source.length) {
    els.graphChart.innerHTML = emptySvg('그래프 데이터가 없습니다');
    els.graphSummary.textContent = '해당 기간에 표시할 기록이 없습니다.';
    els.graphPointList.innerHTML = '<div class="empty-state">표시할 포인트가 없습니다.</div>';
    els.graphCountPill.textContent = '0개';
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
  els.graphSummary.textContent = `평균 ${formatFixed(averageValue, 1)}mg/dL · 최근 ${formatNumber(latest.value)}mg/dL · 최고 ${formatNumber(highest)}mg/dL`;
  els.graphCountPill.textContent = `${source.length}개`;

  els.graphPointList.innerHTML = source.slice().reverse().map((item) => `
    <article class="list-item">
      <div class="list-top">
        <div>
          <div class="list-title">${formatNumber(item.value)}mg/dL</div>
          <div class="list-meta">${item.date} · ${item.time}</div>
        </div>
        <span class="inline-pill">${typeLabel(item.type)}</span>
      </div>
      ${item.food ? `<div class="list-sub">음식: ${escapeHtml(item.food)}</div>` : ''}
      ${item.note ? `<div class="list-note">${escapeHtml(item.note)}</div>` : ''}
    </article>
  `).join('');
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
  const lab = {
    id: formData.get('id') || uid(),
    date: formData.get('date') || todayDate,
    fasting: Number(formData.get('fasting')),
    insulin: Number(formData.get('insulin')),
    a1c: Number(formData.get('a1c')),
    note: String(formData.get('note') || '').trim()
  };

  const existingIndex = state.labRecords.findIndex((item) => item.id === lab.id);
  if (existingIndex >= 0) {
    state.labRecords[existingIndex] = lab;
  } else {
    state.labRecords.push(lab);
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
    els.labList.innerHTML = '<div class="empty-state">아직 저장된 검사 기록이 없습니다.</div>';
    return;
  }

  const homa = calculateHoma(latest.fasting, latest.insulin);
  const homaStatus = classifyHoma(homa);
  const fastingStatus = classifyFasting(latest.fasting);
  const a1cStatus = classifyA1c(latest.a1c);

  els.labLatestDate.textContent = latest.date;
  els.labLatestFasting.textContent = formatNumber(latest.fasting);
  els.labLatestA1c.textContent = formatFixed(latest.a1c, 1);
  els.labLatestHoma.textContent = formatFixed(homa, 2);
  els.labLatestHomaText.textContent = homaStatus.label;

  els.labInsight.textContent = `공복혈당은 ${fastingStatus.label} 구간, HbA1c는 ${a1cStatus.label} 구간, HOMA-IR는 ${formatFixed(homa, 2)}로 ${homaStatus.label} 수준입니다.`;

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
            <button class="line-button" type="button" onclick="editLab('${item.id}')">수정</button>
            <button class="ghost-button" type="button" onclick="deleteLab('${item.id}')">삭제</button>
          </div>
        </div>
        <div class="list-sub">HOMA-IR ${formatFixed(itemHoma, 2)} · ${itemStatus.label}</div>
        ${item.note ? `<div class="list-note">${escapeHtml(item.note)}</div>` : ''}
      </article>
    `;
  }).join('');
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteLab(id) {
  state.labRecords = state.labRecords.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

window.editLab = editLab;
window.deleteLab = deleteLab;

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
  return target.reduce((max, item) => (item.value > max.value ? item : max), target[0]);
}

function getFilteredGraphData(type, days) {
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
  if (value >= 126) return { level: 2, label: '점검 필요' };
  if (value >= 100) return { level: 1, label: '주의' };
  return { level: 0, label: '안정' };
}

function classifyPost(value) {
  if (value > 180) return { level: 2, label: '점검 필요' };
  if (value > 140) return { level: 1, label: '주의' };
  return { level: 0, label: '안정' };
}

function classifyA1c(value) {
  if (value >= 6.5) return { level: 2, label: '점검 필요' };
  if (value >= 5.7) return { level: 1, label: '주의' };
  return { level: 0, label: '안정' };
}

function classifyHoma(value) {
  if (value >= 3) return { level: 2, label: '점검 필요' };
  if (value >= 2.5) return { level: 1, label: '주의' };
  if (value >= 2) return { level: 1, label: '경계' };
  return { level: 0, label: '안정' };
}

function typeLabel(type) {
  if (type === 'post1') return '식후 1시간';
  if (type === 'post2') return '식후 2시간';
  return '공복';
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
  const [year, month, day] = dateString.split('-');
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

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
  }
}
