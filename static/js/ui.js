/* =====================================================
   ui.js  —  화면 전환 / 사이드바 / 네비게이션 / 프로필
   ✏️  화면 이동·패널 동작 수정 시 여기
   ===================================================== */

// ══════════════════════════════
// 화면 전환
// ══════════════════════════════

/** 채팅 화면으로 전환 */
function showChatScreen() {
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('chat-screen').classList.add('visible');
}

/** 홈 화면으로 돌아가기 */
function goHome() {
  CURRENT_CONV_ID = null;
  document.getElementById('home-screen').style.display = '';
  document.getElementById('chat-screen').classList.remove('visible');
  document.getElementById('messages-area').innerHTML = '';
  setNavActive('nav-home');
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
}

/** 하단 "채팅" 탭 클릭 — 가장 최근 대화 열기 or 새 대화 */
function showChatNav() {
  if (ALL_CONVS.length > 0) {
    openConversation(ALL_CONVS[0].id, ALL_CONVS[0].title);
  } else {
    newChat();
  }
}

// ══════════════════════════════
// 하단 네비게이션
// ══════════════════════════════

/** 활성 탭 표시 */
function setNavActive(id) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// ══════════════════════════════
// 사이드바
// ══════════════════════════════

function toggleSidebar() {
  SIDEBAR_OPEN = !SIDEBAR_OPEN;
  document.getElementById('sidebar').classList.toggle('collapsed', !SIDEBAR_OPEN);
  document.getElementById('sidebar-toggle-btn').classList.toggle('active', SIDEBAR_OPEN);
}

// ══════════════════════════════
// 프로필 패널
// ══════════════════════════════

function openProfile() {
  document.getElementById('profile-panel').classList.add('open');
  setNavActive('nav-profile');
}

function closeProfile() {
  document.getElementById('profile-panel').classList.remove('open');
}

/** 비밀번호 변경 저장 */
async function saveProfile() {
  const pw = document.getElementById('new-password').value;
  if (!pw) {
    showToast('변경할 비밀번호를 입력하세요');
    return;
  }

  const res = await api('POST', '/api/profile', { new_password: pw });

  if (res.ok) {
    document.getElementById('new-password').value = '';
    const msg = document.getElementById('panel-msg');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
  } else {
    showToast(res.error || '오류 발생');
  }
}
