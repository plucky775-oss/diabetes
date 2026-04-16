const DEFAULT_MODEL = 'gemma-4-26b-a4b-it';

function getSystemPrompt() {
  return [
    '당신은 당뇨 전단계 및 혈당 생활관리 상담 챗봇입니다.',
    '한국어로 친절하고 이해하기 쉽게 답변하세요.',
    '진단, 처방, 약물 변경, 약물 중단, 약물 용량 조절 지시는 하지 마세요.',
    '저혈당 증상, 300mg/dL 이상 고혈당, 반복적인 이상 수치, 흉통/호흡곤란/의식저하 같은 위험 신호는 의료진 상담 또는 응급 진료를 안내하세요.',
    '앱 데이터가 있으면 공복혈당, 식후혈당, HbA1c, HOMA-IR와 연결해서 설명하세요.',
    '답변은 1) 핵심 답변 2) 수치와 연결한 해석 3) 오늘 할 행동 으로 짧게 구성하세요.'
  ].join(' ');
}

function makePrompt(payload) {
  return `아래는 당뇨관리 앱 사용자의 질문과 저장 데이터입니다. 상담 챗봇처럼 답변해 주세요.\n\n질문:\n${payload?.question || ''}\n\n데이터(JSON):\n${JSON.stringify(payload, null, 2)}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Vercel Environment Variables에 GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  const { model = DEFAULT_MODEL, payload } = req.body || {};
  if (!payload?.question) {
    return res.status(400).json({ error: 'question이 필요합니다.' });
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
        temperature: 0.35,
        maxOutputTokens: 900
      }
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return res.status(upstream.status).json({
      error: data?.error?.message || 'Gemma API 상담 요청에 실패했습니다.'
    });
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
  return res.status(200).json({ text: text || 'Gemma4 상담 응답이 비어 있습니다.' });
}
