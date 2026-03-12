/* =====================================================
   chat.js  —  메시지 전송 & 버블 렌더링
   ✏️  채팅 동작·말풍선 디자인 수정 시 여기
   ===================================================== */

// ── 메시지 전송 ──────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg || IS_SENDING) return;

  // 대화가 없으면 새로 생성
  if (!CURRENT_CONV_ID) {
    const res = await api('POST', '/api/chats/new');
    if (!res.id) return;
    CURRENT_CONV_ID = res.id;
    showChatScreen();
  }

  IS_SENDING = true;
  document.getElementById('send-btn').disabled = true;
  input.value = '';
  autoResize(input);

  // 사용자 메시지 즉시 표시
  appendMessage('user', msg, Date.now() / 1000);

  // 타이핑 인디케이터 표시
  const typingEl = showTypingIndicator();

  try {
    const res = await api('POST', '/api/chat', {
      conversation_id: CURRENT_CONV_ID,
      message: msg,
    });

    typingEl.remove();

    if (res.reply) {
      appendMessage('assistant', res.reply, Date.now() / 1000);

      // 첫 메시지라면 헤더 제목 업데이트
      if (document.getElementById('chat-title').textContent === '새 채팅') {
        document.getElementById('chat-title').textContent = msg.slice(0, 30);
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
    document.getElementById('messages-area').scrollTop = 99999;
  }
}

// ── 메시지 버블 추가 ─────────────────────────────────────
function appendMessage(role, content, timestamp) {
  const area = document.getElementById('messages-area');
  const row  = document.createElement('div');
  row.className = `msg-row ${role}`;

  const time = formatTime(timestamp);
  const html = role === 'assistant'
    ? renderMarkdown(content)
    : `<p>${escapeHtml(content)}</p>`;

  if (role === 'assistant') {
    row.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div>
        <div class="msg-bubble">${html}</div>
        <div class="msg-time">${time}</div>
      </div>`;
  } else {
    row.innerHTML = `
      <div>
        <div class="msg-bubble">${html}</div>
        <div class="msg-time">${time}</div>
      </div>
      <div class="msg-avatar"
           style="background:var(--bg3);border:1px solid var(--border);font-size:14px">👤</div>`;
  }

  area.appendChild(row);
  area.scrollTop = area.scrollHeight;
}

// ── 타이핑 인디케이터 ───────────────────────────────────
function showTypingIndicator() {
  const area   = document.getElementById('messages-area');
  const typing = document.createElement('div');
  typing.className = 'typing-row';
  typing.id        = 'typing-indicator';
  typing.innerHTML = `
    <div class="msg-avatar"
         style="background:linear-gradient(135deg,var(--accent),var(--accent2));margin-right:10px">🤖</div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  area.appendChild(typing);
  area.scrollTop = area.scrollHeight;
  return typing;
}

// ── 제안 프롬프트 클릭 ───────────────────────────────────
async function startWithPrompt(prompt) {
  await newChat();
  document.getElementById('chat-input').value = prompt;
  await sendMessage();
}

// ── 입력창 키보드 이벤트 ────────────────────────────────
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ── 입력창 자동 높이 조절 ───────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}
