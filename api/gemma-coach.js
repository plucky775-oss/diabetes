const DEFAULT_MODEL = 'gemma-4-26b-a4b-it';

function getSystemPrompt() {
  return [
    '당신은 당뇨 전단계 및 대사 건강 생활관리 코치입니다.',
    '진단, 처방, 약물 변경 지시는 하지 말고 사용자가 입력한 수치의 추세와 생활관리 우선순위를 한국어로 설명하세요.',
    '공복혈당, 식후 1시간, 식후 2시간, HbA1c, HOMA-IR를 구분해서 해석하세요.',
    '위험 신호가 있으면 의료진 상담을 권하세요.',
    '오늘 바로 할 수 있는 행동 3가지를 짧게 제안하세요.'
  ].join(' ');
}

function makePrompt(payload) {
  return `아래 당뇨관리 앱 데이터를 분석해 주세요.\n\n요청 형식:\n1) 한 줄 요약\n2) 가장 중요한 위험/주의 포인트\n3) 수치별 해석: 공복, 식후, HbA1c, HOMA-IR\n4) 오늘 할 행동 3가지\n5) 다음 기록 추천\n\n데이터(JSON):\n${JSON.stringify(payload, null, 2)}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Vercel Environment Variables에 GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  const { model = DEFAULT_MODEL, payload } = req.body || {};
  if (!payload) {
    return res.status(400).json({ error: 'payload가 필요합니다.' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: getSystemPrompt() }]
      },
      contents: [{
        role: 'user',
        parts: [{ text: makePrompt(payload) }]
      }],
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 1200
      }
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return res.status(upstream.status).json({
      error: data?.error?.message || 'Gemma API 요청에 실패했습니다.'
    });
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
  return res.status(200).json({ text: text || 'Gemma4 응답이 비어 있습니다.' });
}
