/* ==============================================
   profile.js — 프로필 탭 동작
   ============================================== */

async function savePassword() {
  const pw = document.getElementById('new-pw-input').value;
  if (!pw) { showToast('변경할 비밀번호를 입력하세요'); return; }
  const res = await api('POST', '/api/profile', { new_password: pw });
  if (res.ok) {
    document.getElementById('new-pw-input').value = '';
    const msg = document.getElementById('pw-msg');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2200);
  } else {
    showToast(res.error || '오류가 발생했습니다');
  }
}
