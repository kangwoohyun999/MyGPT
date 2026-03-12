"""
MyGPT Server - Pure Python (no external dependencies required)
Local:   python3 server.py  →  http://localhost:8080
Railway: 환경변수 OPENAI_API_KEY_1 ~ OPENAI_API_KEY_N 설정 후 자동 배포
"""

import json
import os
import time
import hashlib
import secrets
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

# ─── CONFIG ───────────────────────────────────────────────────────────────────
# Railway는 PORT 환경변수를 자동 주입함
PORT = int(os.environ.get("PORT", 8080))

# API 키를 환경변수에서 읽음
# Railway 대시보드 Variables에 OPENAI_API_KEY_1, OPENAI_API_KEY_2 ... 형식으로 추가
def _load_api_keys():
    keys = []
    # 번호 붙은 키 (OPENAI_API_KEY_1, OPENAI_API_KEY_2 ...)
    for i in range(1, 20):
        k = os.environ.get(f"OPENAI_API_KEY_{i}", "").strip()
        if k and k.startswith("sk-"):
            keys.append(k)
    # 단일 키 (OPENAI_API_KEY)
    single = os.environ.get("OPENAI_API_KEY", "").strip()
    if single and single.startswith("sk-") and single not in keys:
        keys.insert(0, single)
    # 로컬 테스트용 하드코딩 폴백 (배포 시엔 환경변수 사용 권장)
    if not keys:
        hardcoded = [
           "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"
        ]
        keys = [k for k in hardcoded if k.startswith("sk-")]
    return keys

API_KEYS = _load_api_keys()
current_key_index = 0
key_lock = threading.Lock()

# Simple in-memory user store (no DB needed)
USERS = {
    "admin": hashlib.sha256("1234".encode()).hexdigest(),
}

# Session store: token -> {username, created_at}
SESSIONS = {}

# Chat history store: username -> [{role, content, timestamp}]
CHAT_HISTORIES = {}

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def get_next_api_key():
    global current_key_index
    with key_lock:
        if not API_KEYS or API_KEYS[0].startswith("sk-your"):
            return None
        key = API_KEYS[current_key_index % len(API_KEYS)]
        current_key_index += 1
        return key

def make_session_token():
    return secrets.token_hex(32)

def get_username_from_token(token):
    session = SESSIONS.get(token)
    if not session:
        return None
    # Sessions expire after 7 days
    if time.time() - session["created_at"] > 7 * 86400:
        del SESSIONS[token]
        return None
    return session["username"]

def call_openai(messages, api_key):
    """Call OpenAI chat completions API."""
    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": messages,
        "max_tokens": 2048,
        "stream": False,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def load_html():
    """Load the frontend HTML file."""
    path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

# MIME 타입 매핑
MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".ico":  "image/x-icon",
    ".svg":  "image/svg+xml",
    ".woff2":"font/woff2",
}

def serve_static(handler, rel_path):
    """static/ 폴더 아래 파일을 서빙한다."""
    base = os.path.join(os.path.dirname(__file__), "static")
    # 경로 탈출 방지
    full = os.path.normpath(os.path.join(base, rel_path.lstrip("/")))
    if not full.startswith(base):
        handler.send_response(403)
        handler.end_headers()
        return
    if not os.path.isfile(full):
        handler.send_response(404)
        handler.end_headers()
        return
    ext = os.path.splitext(full)[1].lower()
    mime = MIME_TYPES.get(ext, "application/octet-stream")
    with open(full, "rb") as f:
        body = f.read()
    handler.send_response(200)
    handler.send_header("Content-Type", mime)
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "public, max-age=3600")
    handler.end_headers()
    handler.wfile.write(body)

# ─── HTTP HANDLER ─────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # suppress noisy logs

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, code, html):
        body = html.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def get_token(self):
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:]
        return None

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "/index.html":
            self.send_html(200, load_html())

        # ── 정적 파일 (css, js, 이미지 등) ──────────────────────────────────
        elif path.startswith("/css/") or path.startswith("/js/") \
                or path.startswith("/static/"):
            serve_static(self, path)

        elif path == "/api/me":
            token = self.get_token()
            username = get_username_from_token(token) if token else None
            if username:
                self.send_json(200, {"username": username})
            else:
                self.send_json(401, {"error": "Unauthorized"})

        elif path == "/api/chats":
            token = self.get_token()
            username = get_username_from_token(token)
            if not username:
                return self.send_json(401, {"error": "Unauthorized"})
            history = CHAT_HISTORIES.get(username, {})
            # Return list of conversations sorted by last message time
            convs = []
            for cid, msgs in history.items():
                if msgs:
                    convs.append({
                        "id": cid,
                        "title": msgs[0]["content"][:40] if msgs else "New Chat",
                        "updated_at": msgs[-1]["timestamp"],
                    })
            convs.sort(key=lambda x: x["updated_at"], reverse=True)
            self.send_json(200, {"conversations": convs})

        elif path.startswith("/api/chats/"):
            token = self.get_token()
            username = get_username_from_token(token)
            if not username:
                return self.send_json(401, {"error": "Unauthorized"})
            cid = path.split("/api/chats/")[1]
            msgs = CHAT_HISTORIES.get(username, {}).get(cid, [])
            self.send_json(200, {"messages": msgs})

        else:
            self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_body()

        # ── Login ──────────────────────────────────────────────────────────────
        if path == "/api/login":
            username = body.get("username", "").strip()
            password = body.get("password", "")
            pw_hash = hashlib.sha256(password.encode()).hexdigest()

            # Auto-register new users
            if username not in USERS:
                if len(username) < 2:
                    return self.send_json(400, {"error": "아이디는 2자 이상이어야 합니다"})
                USERS[username] = pw_hash
                CHAT_HISTORIES[username] = {}

            if USERS.get(username) != pw_hash:
                return self.send_json(401, {"error": "비밀번호가 틀렸습니다"})

            token = make_session_token()
            SESSIONS[token] = {"username": username, "created_at": time.time()}
            if username not in CHAT_HISTORIES:
                CHAT_HISTORIES[username] = {}
            self.send_json(200, {"token": token, "username": username})

        # ── Logout ─────────────────────────────────────────────────────────────
        elif path == "/api/logout":
            token = self.get_token()
            if token and token in SESSIONS:
                del SESSIONS[token]
            self.send_json(200, {"ok": True})

        # ── New Chat ───────────────────────────────────────────────────────────
        elif path == "/api/chats/new":
            token = self.get_token()
            username = get_username_from_token(token)
            if not username:
                return self.send_json(401, {"error": "Unauthorized"})
            cid = secrets.token_hex(8)
            CHAT_HISTORIES[username][cid] = []
            self.send_json(200, {"id": cid})

        # ── Send Message ───────────────────────────────────────────────────────
        elif path == "/api/chat":
            token = self.get_token()
            username = get_username_from_token(token)
            if not username:
                return self.send_json(401, {"error": "Unauthorized"})

            cid = body.get("conversation_id")
            user_msg = body.get("message", "").strip()
            if not user_msg:
                return self.send_json(400, {"error": "메시지를 입력하세요"})

            # Ensure conversation exists
            if username not in CHAT_HISTORIES:
                CHAT_HISTORIES[username] = {}
            if cid not in CHAT_HISTORIES[username]:
                CHAT_HISTORIES[username][cid] = []

            history = CHAT_HISTORIES[username][cid]

            # Build OpenAI messages array
            openai_msgs = [{"role": "system", "content": "당신은 친절하고 유능한 AI 어시스턴트입니다. 한국어로 답변해주세요."}]
            for m in history[-20:]:  # Keep last 20 messages for context
                openai_msgs.append({"role": m["role"], "content": m["content"]})
            openai_msgs.append({"role": "user", "content": user_msg})

            # Save user message
            ts = time.time()
            history.append({"role": "user", "content": user_msg, "timestamp": ts})

            # Try API keys in rotation
            api_key = get_next_api_key()
            if not api_key:
                # No valid API key configured
                assistant_msg = "⚠️ API 키가 설정되지 않았습니다. server.py의 API_KEYS 목록에 OpenAI API 키를 추가해주세요."
                history.append({"role": "assistant", "content": assistant_msg, "timestamp": time.time()})
                return self.send_json(200, {"reply": assistant_msg, "conversation_id": cid})

            # Try each key until one works
            tried = 0
            last_error = None
            while tried < len(API_KEYS):
                try:
                    result = call_openai(openai_msgs, api_key)
                    assistant_msg = result["choices"][0]["message"]["content"]
                    history.append({"role": "assistant", "content": assistant_msg, "timestamp": time.time()})
                    return self.send_json(200, {"reply": assistant_msg, "conversation_id": cid})
                except urllib.error.HTTPError as e:
                    err_body = e.read().decode()
                    if e.code == 429 or e.code == 401:
                        # Rate limit or invalid key → try next key
                        tried += 1
                        api_key = get_next_api_key()
                        last_error = f"HTTP {e.code}: {err_body}"
                    else:
                        last_error = f"HTTP {e.code}: {err_body}"
                        break
                except Exception as ex:
                    last_error = str(ex)
                    break

            error_msg = f"❌ API 오류: {last_error}"
            history.append({"role": "assistant", "content": error_msg, "timestamp": time.time()})
            self.send_json(500, {"error": error_msg, "conversation_id": cid})

        # ── Delete conversation ─────────────────────────────────────────────
        elif path.startswith("/api/chats/") and path.endswith("/delete"):
            token = self.get_token()
            username = get_username_from_token(token)
            if not username:
                return self.send_json(401, {"error": "Unauthorized"})
            cid = path.split("/api/chats/")[1].replace("/delete", "")
            if username in CHAT_HISTORIES and cid in CHAT_HISTORIES[username]:
                del CHAT_HISTORIES[username][cid]
            self.send_json(200, {"ok": True})

        # ── Update profile ──────────────────────────────────────────────────
        elif path == "/api/profile":
            token = self.get_token()
            username = get_username_from_token(token)
            if not username:
                return self.send_json(401, {"error": "Unauthorized"})
            new_pw = body.get("new_password", "")
            if new_pw:
                if len(new_pw) < 4:
                    return self.send_json(400, {"error": "비밀번호는 4자 이상이어야 합니다"})
                USERS[username] = hashlib.sha256(new_pw.encode()).hexdigest()
            self.send_json(200, {"ok": True, "username": username})

        else:
            self.send_json(404, {"error": "Not found"})


# ─── ENTRY POINT ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Railway 배포 시 0.0.0.0 바인딩 필수
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    key_count = len(API_KEYS)
    print(f"[MyGPT] 서버 시작 — PORT={PORT}, API 키 {key_count}개 로드됨")
    if key_count == 0:
        print("[MyGPT] 경고: API 키 없음! Railway Variables에 OPENAI_API_KEY_1 을 추가하세요.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n서버 종료")
