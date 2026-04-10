// app.js 주요 수정 사항
function renderView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  qs(`view-${view}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === view));
  
  // 탭 이동 시 해당 탭에 필요한 데이터만 렌더링 (성능 최적화)
  if (view === 'home') renderDashboard();
  if (view === 'stats') { renderGlucose(); }
  if (view === 'roadmap') { renderRoadmap(); renderDiagnosis(); }
}

// 통합된 저장 후 피드백 기능
function handleFormSubmit(e, type) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  
  [span_6](start_span)// 데이터 타입별 처리 로직 생략 (기존 로직 유지)[span_6](end_span)
  
  save();
  renderAll();
  alert(`${type} 기록이 완료되었습니다!`);
  e.target.reset();
  setDefaults();
}
