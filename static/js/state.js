/* =====================================================
   state.js  —  전역 상태 & 공통 유틸리티
   ✏️  앱 전체에서 공유하는 변수·헬퍼 함수 모음
   ===================================================== */

// ── 전역 상태 변수 ──────────────────────────────────────
let TOKEN          = localStorage.getItem('mygpt_token') || '';
let USERNAME       = localStorage.getItem('mygpt_user')  || '';
let CURRENT_CONV_ID = null;   // 현재 열려 있는 대화 ID
let ALL_CONVS       = [];     // 전체 대화 목록 캐시
let IS_SENDING      = false;  // 메시지 전송 중 여부
let SIDEBAR_OPEN    = true;   // 사이드바 열림 여부

// ── API 베이스 (같은 오리진) ─────────────────────────────
const API_BASE = '';

// ── fetch 래퍼 ──────────────────────────────────────────
/**
 * @param {'GET'|'POST'|'DELETE'} method
 * @param {string} path  - e.g. '/api/chat'
 * @param {object} [body] - JSON body (POST 전용)
 */
async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API_BASE + path, opts);
  return r.json();
}

// ── 토스트 알림 ─────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── 시간 포맷 (HH:MM) ───────────────────────────────────
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ── HTML 이스케이프 ─────────────────────────────────────
function escapeHtml(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── 간이 마크다운 → HTML ─────────────────────────────────
/**
 * GPT 응답의 마크다운을 간단히 HTML로 변환합니다.
 * ✏️  더 복잡한 렌더링이 필요하면 marked.js 등으로 교체하세요.
 */
function renderMarkdown(text) {
  let h = escapeHtml(text);

  // 코드 블록
  h = h.replace(/```[\s\S]*?```/g, m => {
    const code = m.slice(3, -3).replace(/^\w+\n/, '');
    return `<pre><code>${code}</code></pre>`;
  });
  // 인라인 코드
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 굵게
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 기울임
  h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // 헤더
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
  // 목록
  h = h.replace(/^\- (.+)$/gm, '<li>$1</li>');
  h = h.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // 단락
  h = h.split('\n\n')
       .map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '')
       .join('');

  return h || escapeHtml(text);
}
