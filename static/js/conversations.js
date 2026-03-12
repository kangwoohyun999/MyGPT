/* ==============================================
   conversations.js — 대화 목록 관리
   ============================================== */

async function loadConversations() {
  try {
    const res = await api('GET', '/api/chats');
    ALL_CONVS = res.conversations || [];
    renderConvList(ALL_CONVS);
  } catch (e) {}
}

function renderConvList(convs) {
  const el = document.getElementById('conv-list');
  if (!convs.length) {
    el.innerHTML = `
      <div class="conv-empty">
        <div class="conv-empty-icon">💬</div>
        아직 대화가 없어요.<br/>새 채팅을 시작해보세요!
      </div>`;
    return;
  }
  el.innerHTML = convs.map(c => `
    <div class="conv-item ${c.id === CURRENT_CONV_ID ? 'active' : ''}"
         id="ci-${c.id}"
         onclick="goChat('${c.id}','${escapeHtml(c.title)}')">
      <div class="conv-icon">💬</div>
      <div class="conv-info">
        <div class="conv-title">${escapeHtml(c.title)}</div>
      </div>
      <button class="conv-del"
              onclick="event.stopPropagation(); deleteConv('${c.id}')"
              title="삭제">✕</button>
    </div>
  `).join('');
}

function filterConvs(q) {
  if (!q) { renderConvList(ALL_CONVS); return; }
  renderConvList(ALL_CONVS.filter(c =>
    c.title.toLowerCase().includes(q.toLowerCase())
  ));
}

async function openConversation(id, title) {
  CURRENT_CONV_ID = id;
  document.getElementById('chat-topbar-title').textContent = title;
  document.querySelectorAll('.conv-item')
    .forEach(el => el.classList.toggle('active', el.id === `ci-${id}`));

  const res  = await api('GET', `/api/chats/${id}`);
  const area = document.getElementById('messages-area');
  area.innerHTML = '';
  (res.messages || []).forEach(m => appendMessage(m.role, m.content, m.timestamp));
  area.scrollTop = area.scrollHeight;
}

async function deleteConv(id) {
  if (!confirm('이 대화를 삭제할까요?')) return;
  await api('POST', `/api/chats/${id}/delete`);
  if (CURRENT_CONV_ID === id) {
    CURRENT_CONV_ID = null;
    document.getElementById('messages-area').innerHTML = '';
    document.getElementById('chat-topbar-title').textContent = '새 채팅';
  }
  await loadConversations();
  showToast('대화가 삭제됐습니다');
}
