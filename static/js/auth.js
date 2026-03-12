/* =====================================================
   auth.js  —  로그인 / 로그아웃 / 세션 확인
   ✏️  인증 관련 로직을 수정하고 싶으면 여기를 수정하세요
   ===================================================== */

// ── 로그인 ──────────────────────────────────────────────
async function doLogin() {
  const usernameEl = document.getElementById('login-username');
  const passwordEl = document.getElementById('login-password');
  const errEl      = document.getElementById('login-error');
  const btn        = document.getElementById('login-btn');

  const username = usernameEl.value.trim();
  const password = passwordEl.value;

  if (!username || !password) {
    showLoginError('아이디와 비밀번호를 입력해주세요');
    return;
  }

  btn.disabled    = true;
  btn.textContent = '로그인 중...';
  errEl.style.display = 'none';

  try {
    const res  = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.token) {
      TOKEN    = data.token;
      USERNAME = data.username;
      localStorage.setItem('mygpt_token', TOKEN);
      localStorage.setItem('mygpt_user', USERNAME);
      enterApp();
    } else {
      showLoginError(data.error || '로그인 실패');
    }
  } catch (e) {
    showLoginError('서버 연결 실패. 서버가 실행 중인지 확인하세요.');
  } finally {
    btn.disabled    = false;
    btn.textContent = '시작하기 →';
  }
}

// ── 에러 메시지 표시 ────────────────────────────────────
function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent    = msg;
  el.style.display  = 'block';
}

// ── 로그아웃 ────────────────────────────────────────────
async function doLogout() {
  await api('POST', '/api/logout');
  TOKEN    = '';
  USERNAME = '';
  localStorage.removeItem('mygpt_token');
  localStorage.removeItem('mygpt_user');
  CURRENT_CONV_ID = null;

  closeProfile();
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('login-password').value = '';
}

// ── 세션 유효성 검사 (페이지 로드 시 호출) ──────────────
async function checkSession() {
  if (!TOKEN) return;
  try {
    const res = await api('GET', '/api/me');
    if (res.username) {
      USERNAME = res.username;
      enterApp();
    }
  } catch (e) {
    // 토큰 만료 등 → 로그인 페이지 유지
  }
}

// ── 앱 진입 (로그인 성공 후) ─────────────────────────────
async function enterApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  document.getElementById('greeting-name').textContent  = USERNAME;
  document.getElementById('profile-username').textContent = USERNAME;
  await loadConversations();
  goHome();
}

// ── 키보드 이벤트 (로그인 폼) ───────────────────────────
document.getElementById('login-username').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('login-password').focus();
});
document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
