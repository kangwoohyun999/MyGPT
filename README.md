# MyGPT — Railway 배포 가이드

외부 패키지 없음. Python 표준 라이브러리만 사용.

---

## 📁 파일 구조

```
my-gpt-app/
├── server.py          # Python 서버
├── static/
│   └── index.html     # 프론트엔드
├── Procfile           # Railway 시작 명령
├── railway.toml       # Railway 설정
├── runtime.txt        # Python 버전
├── requirements.txt   # 빈 파일 (Python 감지용)
└── README.md
```

---

## 🚀 Railway 배포 순서

### 1단계 — GitHub에 올리기

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/유저명/레포명.git
git push -u origin main
```

### 2단계 — Railway 프로젝트 생성

1. https://railway.app 접속 → 로그인
2. New Project → Deploy from GitHub repo
3. 레포 선택 → 자동 빌드 & 배포

### 3단계 — 환경변수(API 키) 설정 ⚠️ 필수

Railway 대시보드 → 프로젝트 → Variables 탭:

| 변수명              | 값                        |
|---------------------|---------------------------|
| OPENAI_API_KEY_1    | sk-proj-xxxxxxxxxxxx      |
| OPENAI_API_KEY_2    | sk-proj-yyyyyyyyyyyy (선택)|
| OPENAI_API_KEY_3    | sk-proj-zzzzzzzzzzzz (선택)|

키 여러 개 = Rate Limit 초과 시 자동 전환 (무제한에 가까워짐)

### 4단계 — 도메인으로 접속

Railway → Settings → Domains에서 URL 확인:
https://my-gpt-app-xxxx.railway.app

---

## 💻 로컬 실행

```bash
export OPENAI_API_KEY_1="sk-proj-xxxx"
python3 server.py
# → http://localhost:8080
```

기본 계정: admin / 1234  (새 아이디 로그인 시 자동 가입)
