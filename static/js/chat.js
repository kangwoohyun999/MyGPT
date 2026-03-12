/* ==============================================
   chat.js — 메시지 전송 & 렌더링
   ============================================== */

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg || IS_SENDING) return;

  // 대화 없으면 새로 생성
  if (!CURRENT_CONV_ID) {
    const res = await api('POST', '/api/chats/new');
    if (!res.id) return;
    CURRENT_CONV_ID = res.id;
    await loadConversations();
  }

  IS_SENDING = true;
  document.getElementById('send-btn').disabled = true;
  input.value = ''; autoResize(input);

  appendMessage('user', msg, Date.now() / 1000);
  const typingEl = showTyping();

  try {
    const res = await api('POST', '/api/chat', {
      conversation_id: CURRENT_CONV_ID, message: msg,
    });
    typingEl.remove();

    if (res.reply) {
      appendMessage('assistant', res.reply, Date.now() / 1000);
      if (document.getElementById('chat-topbar-title').textContent === '새 채팅') {
        document.getElementById('chat-topbar-title').textContent = msg.slice(0,32);
      }
      await loadConversations();
    } else {
      appendMessage('assistant', res.error || '오류가 발생했습니다', Date.now() / 1000);
    }
  } catch (e) {
    typingEl.remove();
    appendMessage('assistant', '⚠️ 서버 오류: ' + e.message, Date.now() / 1000);
  } finally {
    IS_SENDING = false;
    document.getElementById('send-btn').disabled = false;
    scrollBottom();
  }
}

function appendMessage(role, content, ts) {
  const area = document.getElementById('messages-area');
  const row  = document.createElement('div');
  row.className = `msg-row ${role}`;
  const time = formatTime(ts);
  const html = role === 'assistant' ? renderMarkdown(content) : `<p>${escapeHtml(content)}</p>`;

  if (role === 'assistant') {
    row.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-col">
        <div class="msg-bubble">${html}</div>
        <div class="msg-time">${time}</div>
      </div>`;
  } else {
    row.innerHTML = `
      <div class="msg-col">
        <div class="msg-bubble">${html}</div>
        <div class="msg-time">${time}</div>
      </div>
      <div class="msg-avatar" style="background:var(--bg3);border:1px solid var(--border)">👤</div>`;
  }
  area.appendChild(row);
  scrollBottom();
}

function showTyping() {
  const area = document.getElementById('messages-area');
  const el   = document.createElement('div');
  el.className = 'typing-row';
  el.innerHTML = `
    <div class="msg-avatar" style="background:linear-gradient(135deg,var(--accent),var(--accent2));margin-right:7px">🤖</div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  area.appendChild(el);
  scrollBottom();
  return el;
}

function scrollBottom() {
  const area = document.getElementById('messages-area');
  area.scrollTop = area.scrollHeight;
}

async function startWithPrompt(prompt) {
  await goNewChat();
  document.getElementById('chat-input').value = prompt;
  await sendMessage();
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
}
