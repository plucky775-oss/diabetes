// 1. 차트 렌더링 함수 개선 (부드러운 곡선 및 그라데이션)
function renderRoadmapChart() {
  const svg = qs('roadmapChart');
  const items = sortDesc(state.glucose).slice(0, 10).reverse();
  if (!items.length) { svg.innerHTML = ''; return; }
  
  const w = 360, h = 180, p = 30;
  const values = items.map(x => Number(x.value));
  const min = Math.min(...values) - 10;
  const max = Math.max(...values) + 10;

  // 곡선(Polyline 대신 Path) 계산 로직을 간단히 적용하거나 
  // 여기서는 가독성을 위해 기존 포인트를 유지하되 스타일을 강화합니다.
  const points = items.map((item, i) => {
    const x = p + (i * (w - p * 2) / (items.length - 1));
    const y = h - p - ((item.value - min) / (max - min)) * (h - p * 2);
    return `${x},${y}`;
  }).join(' ');

  svg.innerHTML = `
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" stroke="rgba(255,255,255,0.05)" />
    
    <polyline points="${p},${h-p} ${points} ${w-p},${h-p}" fill="url(#chartGrad)" />
    
    <polyline fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
    
    ${items.map((item, i) => {
      const x = p + (i * (w - p * 2) / (items.length - 1));
      const y = h - p - ((item.value - min) / (max - min)) * (h - p * 2);
      const color = item.value >= 140 ? '#ef4444' : '#22c55e';
      return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="#0b0f1a" stroke-width="2" />`;
    }).join('')}
  `;
}

// 2. 피드백 알림 기능 추가
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
    background: var(--accent); color: white; padding: 12px 24px;
    border-radius: 20px; font-weight: bold; z-index: 1000;
    box-shadow: 0 10px 20px rgba(0,0,0,0.3); animation: fadeInUp 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 2000);
}

// 3. 폼 제출 후 알림 연결
// 예시: glucoseForm 이벤트 리스너 내부
// qs('glucoseForm').addEventListener('submit', e => { ... showToast('혈당 기록이 저장되었습니다! 🩸'); });
