/* =====================================================
   conversations.js  —  대화 목록 관리
   ✏️  사이드바 대화 목록·검색·삭제 수정 시 여기
   ===================================================== */

// ── 대화 목록 불러오기 ──────────────────────────────────
async function loadConversations() {
  try {
    const res = await api('GET', '/api/chats');
    ALL_CONVS = res.conversations || [];
    renderChatList(ALL_CONVS);
  } catch (e) {
    console.error('대화 목록 로드 실패:', e);
  }
}

// ── 사이드바 목록 렌더링 ────────────────────────────────
function renderChatList(convs) {
  const el = document.getElementById('chat-list');

  if (!convs.length) {
    el.innerHTML = '<div class="sidebar-empty">아직 대화가 없어요.<br/>새 채팅을 시작해보세요! 💬</div>';
    return;
  }

  el.innerHTML = convs.map(c => `
    <div class="chat-item ${c.id === CURRENT_CONV_ID ? 'active' : ''}"
         id="ci-${c.id}"
         onclick="openConversation('${c.id}', '${escapeHtml(c.title)}')">
      <div class="chat-item-icon">💬</div>
      <div class="chat-item-title">${escapeHtml(c.title)}</div>
      <button class="chat-item-del"
              onclick="event.stopPropagation(); deleteConv('${c.id}')"
              title="삭제">✕</button>
    </div>
  `).join('');
}

// ── 검색 필터 ───────────────────────────────────────────
function filterChats(q) {
  if (!q) {
    renderChatList(ALL_CONVS);
    return;
  }
  const filtered = ALL_CONVS.filter(c =>
    c.title.toLowerCase().includes(q.toLowerCase())
  );
  renderChatList(filtered);
}

// ── 대화 열기 ───────────────────────────────────────────
async function openConversation(id, title) {
  CURRENT_CONV_ID = id;
  document.getElementById('chat-title').textContent = title;

  // 사이드바 하이라이트 갱신
  document.querySelectorAll('.chat-item').forEach(el => {
    el.classList.toggle('active', el.id === `ci-${id}`);
  });

  // 메시지 불러오기
  const res  = await api('GET', `/api/chats/${id}`);
  const msgs = res.messages || [];
  const area = document.getElementById('messages-area');
  area.innerHTML = '';
  msgs.forEach(m => appendMessage(m.role, m.content, m.timestamp));
  area.scrollTop = area.scrollHeight;

  showChatScreen();
  setNavActive('nav-chat');
}

// ── 새 대화 시작 ─────────────────────────────────────────
async function newChat() {
  const res = await api('POST', '/api/chats/new');
  if (!res.id) return;

  CURRENT_CONV_ID = res.id;
  document.getElementById('messages-area').innerHTML = '';
  document.getElementById('chat-title').textContent  = '새 채팅';

  showChatScreen();
  document.getElementById('chat-input').focus();
  setNavActive('nav-chat');
  await loadConversations();
}

// ── 대화 삭제 ───────────────────────────────────────────
async function deleteConv(id) {
  if (!confirm('이 대화를 삭제할까요?')) return;

  await api('POST', `/api/chats/${id}/delete`);

  if (CURRENT_CONV_ID === id) {
    CURRENT_CONV_ID = null;
    goHome();
  }

  await loadConversations();
  showToast('대화가 삭제되었습니다');
}
