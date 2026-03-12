/* ==============================================
   state.js — 전역 상태 & 공통 유틸
   ============================================== */

let TOKEN           = localStorage.getItem('mygpt_token') || '';
let USERNAME        = localStorage.getItem('mygpt_user')  || '';
let CURRENT_CONV_ID = null;
let ALL_CONVS       = [];
let IS_SENDING      = false;
let ACTIVE_TAB      = 'home';   // 현재 활성 탭

/* API 요청 */
async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  return r.json();
}

/* 토스트 */
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

/* 시간 포맷 */
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* HTML 이스케이프 */
function escapeHtml(t) {
  return String(t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* 간이 마크다운 렌더러 */
function renderMarkdown(text) {
  let h = escapeHtml(text);
  h = h.replace(/```[\s\S]*?```/g, m => {
    const code = m.slice(3,-3).replace(/^\w+\n/,'');
    return `<pre><code>${code}</code></pre>`;
  });
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  h = h.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm,  '<h1>$1</h1>');
  h = h.replace(/^\- (.+)$/gm, '<li>$1</li>');
  h = h.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  h = h.split('\n\n').map(p => p.trim() ? `<p>${p.replace(/\n/g,'<br>')}</p>` : '').join('');
  return h || escapeHtml(text);
}
