/* ==============================================
   router.js — 탭 화면 전환 (라우터)
   ✏️ 탭 추가/삭제 시 이 파일
   ============================================== */

/* 탭 전환 */
function switchTab(tabId) {
  // 모든 탭 화면 숨기기
  document.querySelectorAll('.tab-screen').forEach(el => el.classList.remove('active'));
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  // 대상 탭 활성화
  const screen = document.getElementById(`screen-${tabId}`);
  const btn    = document.getElementById(`tab-${tabId}`);
  if (screen) screen.classList.add('active');
  if (btn)    btn.classList.add('active');

  ACTIVE_TAB = tabId;
}

/* 홈 탭 */
function goHome() {
  switchTab('home');
}

/* 채팅 탭 — 기존 대화 또는 빈 화면 */
function goChat(convId, convTitle) {
  switchTab('chat');
  if (convId) {
    openConversation(convId, convTitle);
  }
}

/* 새 채팅 */
async function goNewChat() {
  const res = await api('POST', '/api/chats/new');
  if (!res.id) return;
  CURRENT_CONV_ID = res.id;
  document.getElementById('messages-area').innerHTML = '';
  document.getElementById('chat-topbar-title').textContent = '새 채팅';
  document.getElementById('chat-input').value = '';
  autoResize(document.getElementById('chat-input'));
  switchTab('chat');
  document.getElementById('chat-input').focus();
  await loadConversations();
}

/* 대화목록 탭 */
function goHistory() {
  switchTab('history');
}

/* 프로필 탭 */
function goProfile() {
  switchTab('profile');
}
