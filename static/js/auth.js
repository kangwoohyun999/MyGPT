/* ==============================================
   auth.js — 로그인 / 로그아웃 / 세션
   ============================================== */

async function doLogin() {
  const uEl  = document.getElementById('login-username');
  const pEl  = document.getElementById('login-password');
  const errEl = document.getElementById('login-error');
  const btn  = document.getElementById('login-btn');

  const username = uEl.value.trim();
  const password = pEl.value;

  if (!username || !password) {
    showLoginErr('아이디와 비밀번호를 모두 입력해주세요');
    return;
  }
  btn.disabled = true; btn.textContent = '로그인 중...';
  errEl.style.display = 'none';

  try {
    const data = await api('POST', '/api/login', { username, password });
    if (data.token) {
      TOKEN = data.token; USERNAME = data.username;
      localStorage.setItem('mygpt_token', TOKEN);
      localStorage.setItem('mygpt_user', USERNAME);
      enterApp();
    } else {
      showLoginErr(data.error || '로그인 실패');
    }
  } catch (e) {
    showLoginErr('서버 연결 실패. 서버가 실행 중인지 확인하세요.');
  } finally {
    btn.disabled = false; btn.textContent = '시작하기 →';
  }
}

function showLoginErr(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg; el.style.display = 'block';
}

async function doLogout() {
  await api('POST', '/api/logout');
  TOKEN = ''; USERNAME = '';
  localStorage.removeItem('mygpt_token');
  localStorage.removeItem('mygpt_user');
  CURRENT_CONV_ID = null;

  // 앱 숨기고 로그인 페이지 표시
  document.getElementById('page-app').classList.remove('visible');
  const login = document.getElementById('page-login');
  login.classList.remove('hidden');
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').style.display = 'none';
}

async function enterApp() {
  // 로그인 페이지 숨기기
  document.getElementById('page-login').classList.add('hidden');
  // 앱 표시
  const app = document.getElementById('page-app');
  app.classList.add('visible');
  // 이름 채우기
  document.getElementById('header-username').textContent = USERNAME;
  document.getElementById('profile-display-name').textContent = USERNAME;
  // 대화 목록 로드 후 홈으로
  await loadConversations();
  switchTab('home');
}

async function checkSession() {
  if (!TOKEN) return;
  try {
    const res = await api('GET', '/api/me');
    if (res.username) { USERNAME = res.username; enterApp(); }
  } catch (e) {}
}

// 로그인 폼 키 이벤트
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-username')
    .addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('login-password').focus(); });
  document.getElementById('login-password')
    .addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
});
