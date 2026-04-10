// app.js의 주요 변경 사항만 설명합니다.

// 1. 탭 전환 기능
function renderView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  qs(`view-${view}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === view));
  
  // 탭 이동 시 렌더링 호출
  if (view === 'home') renderDashboard();
  if (view === 'log') renderCombinedList();
  if (view === 'stats') renderGlucose();
  if (view === 'roadmap') { renderRoadmap(); renderDiagnosis(); }
}

// 2. 기록 탭 내 서브 폼 전환
function showLogForm(type) {
  document.querySelectorAll('.log-form').forEach(f => f.style.display = 'none');
  document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
  qs(`${type}Form`).style.display = 'grid';
  event.target.classList.add('active');
}

// 3. 통합 리스트 출력 (기록 탭용)
function renderCombinedList() {
  const all = [
    ...state.glucose.map(x => ({...x, tag: '혈당', val: `${x.value}mg/dL`})),
    ...state.diet.map(x => ({...x, tag: '식단', val: x.mealType})),
    ...state.exercise.map(x => ({...x, tag: '운동', val: `${x.minutes}분`}))
  ];
  qs('combinedList').innerHTML = sortDesc(all).slice(0, 10).map(item => `
    <div class="list-item">
      <div class="list-item-top"><strong>${item.tag}: ${item.val}</strong><small>${item.date}</small></div>
    </div>
  `).join('');
}
