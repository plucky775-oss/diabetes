# 당뇨 AI 코치 - Gemma4 Vercel 버전

혈당, HbA1c, 공복 인슐린, HOMA-IR을 기록하고 Gemma4가 생활관리 코칭을 제공하는 PWA입니다.

## 이번 버전에서 눈에 보이는 변화
- 첫 화면 제목이 `당뇨 AI 코치`로 바뀜
- 첫 화면에 `AI 코칭` 버튼 추가
- 분석 탭 맨 위에 `Gemma4 맞춤 코칭` 카드 표시
- 앱 화면에 API 키 입력 없이 Vercel의 `GEMINI_API_KEY` 환경변수를 사용
- Gemma 연결 실패 시에도 앱 내부 기준 예비 코칭 표시

## Vercel 환경변수
Vercel Project Settings → Environment Variables에 아래 이름으로 키를 등록하세요.

```text
GEMINI_API_KEY
```

등록 후 반드시 Redeploy 해야 적용됩니다.

## GitHub 업로드 방법
이 ZIP을 압축 해제한 뒤, 안에 있는 파일과 폴더를 GitHub 저장소 루트에 모두 올리세요.

반드시 포함되어야 하는 파일:

```text
index.html
app.js
styles.css
manifest.webmanifest
service-worker.js
api/gemma-coach.js
```

GitHub에 올린 뒤 Vercel이 자동 배포되면 `https://k-diabetes.vercel.app`에서 확인하세요.

## 테스트
1. 앱 접속
2. 하단 `분석` 탭 선택
3. `Gemma4 AI 코칭 받기` 클릭

## 주의
AI 코칭은 생활관리 참고용입니다. 진단, 처방, 약물 변경은 의료진에게 확인해야 합니다.


## v8 업데이트: 상담 챗봇
- 하단 메뉴에 `상담` 탭을 추가했습니다.
- `/api/gemma-chat.js` 서버 함수를 추가해 Vercel 환경변수 `GEMINI_API_KEY`로 당뇨 관련 질문에 답변합니다.
- Gemma 연결 실패 시 앱 내부 기본 상담 답변을 표시합니다.
- 상담은 생활관리 참고용이며 진단·처방 용도가 아닙니다.
