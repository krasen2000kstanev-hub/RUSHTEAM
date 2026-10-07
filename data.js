// Слой за данни: вход с Google и връзка с Cloudflare Worker-а.
// Дава на app.js същия интерфейс (db, user, downloads, mcp), с който е писано приложението,
// така че логиката на екраните не знае къде живеят данните.
(function () {
  "use strict";
  const CFG = window.TEAM_HUB_CONFIG || {};
  const API = String(CFG.apiBase || "").replace(/\/+$/, "");
  const POLL_MS = Math.max(5, +CFG.pollSeconds || 15) * 1000;
  const KEY = "team_hub_session";
  const $ = (id) => document.getElementById(id);

  let token = null;
  try { token = localStorage.getItem(KEY); } catch (e) { /* без запомняне на сесията */ }
  let me = null;
  let users = {};
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  function setToken(value) {
    token = value;
    try { if (value) localStorage.setItem(KEY, value); else localStorage.removeItem(KEY); } catch (e) { /* игнорира се */ }
  }

  async function api(path, options) {
    const opt = options || {};
    let response;
    try {
      response = await fetch(API + path, {
        method: opt.method || "GET",
        headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}),
        body: opt.body === undefined ? undefined : JSON.stringify(opt.body),
      });
    } catch (e) { throw { code: "unavailable", message: "Няма връзка със сървъра" }; }
    let body = null;
    try { body = await response.json(); } catch (e) { /* празен отговор */ }
    if (response.status === 401 && !opt.noAuthRedirect) { signOut(); throw { code: "not_granted", message: "Сесията е изтекла" }; }
    if (!response.ok) throw { code: (body && body.code) || "unavailable", message: (body && body.error) || String(response.status) };
    return body;
  }

  // ---------- вход ----------
  function showLogin(message) {
    const box = $("login");
    if (!box) return;
    box.hidden = false;
    if (message) $("login-msg").textContent = message;
    if (!API || !CFG.googleClientId || /REPLACE_WITH/.test(CFG.googleClientId)) {
      $("login-note").textContent = "Платформата още не е настроена: попълнете apiBase и googleClientId в config.js.";
      return;
    }
    const render = () => {
      window.google.accounts.id.initialize({ client_id: CFG.googleClientId, callback: onCredential, auto_select: true });
      window.google.accounts.id.renderButton($("gbtn"), { theme: "filled_blue", size: "large", shape: "pill", text: "signin_with", locale: "bg" });
    };
    if (window.google && window.google.accounts) { render(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    script.onerror = () => { $("login-note").textContent = "Бутонът на Google не се зареди. Проверете връзката или блокиране на реклами."; };
    document.head.appendChild(script);
  }

  async function onCredential(result) {
    $("login-note").textContent = "Влизане…";
    try {
      const out = await api("/api/auth/google", { method: "POST", body: { credential: result.credential }, noAuthRedirect: true });
      setToken(out.token);
      await start(out.user);
    } catch (e) {
      $("login-note").textContent = "Входът не успя. " + (e && e.message ? e.message : "Опитайте пак.");
    }
  }

  function signOut() {
    setToken(null);
    try { if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect(); } catch (e) { /* игнорира се */ }
    if (me) { location.reload(); return; }
    showLogin("Влезте с Google акаунта си, за да видите задачите на вашия екип.");
  }

  async function loadUsers() {
    try {
      const out = await api("/api/users");
      const map = {};
      (out.users || []).forEach((u) => { map[u.id] = u; });
      users = map;
    } catch (e) { /* имената ще се появят при следващия опит */ }
  }

  async function start(user) {
    me = user;
    await loadUsers();
    const box = $("login"); if (box) box.hidden = true;
    const out = $("signout"); if (out) { out.hidden = false; out.onclick = signOut; }
    resolveReady();
    setInterval(() => { if (document.visibilityState === "visible") sync(); }, POLL_MS);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(); });
  }

  // ---------- абонаменти: една заявка за всички отворени списъци ----------
  const subs = [];
  let syncing = false, again = false, soon = 0, lastUsers = 0;

  function snapshot(docs) {
    const list = docs.map((d) => ({ id: d.id, exists: true, data: () => d.data }));
    return { docs: list, size: list.length, empty: !list.length };
  }

  async function sync() {
    if (!me || !subs.length) return;
    if (syncing) { again = true; return; }
    syncing = true;
    const batch = subs.slice();
    try {
      const out = await api("/api/sync", { method: "POST", body: { queries: batch.map((s) => ({ collection: s.collection, where: s.where })) } });
      if (out.user && (out.user.role !== me.role || JSON.stringify(out.user.teams) !== JSON.stringify(me.teams))) { location.reload(); return; }
      (out.results || []).forEach((result, i) => {
        const sub = batch[i];
        if (!sub || subs.indexOf(sub) < 0) return;
        const docs = result.docs || [];
        const signature = JSON.stringify(docs);
        if (signature === sub.last) return;
        sub.last = signature;
        try { sub.fn(snapshot(docs)); } catch (e) { console.error(e); }
      });
      if (Date.now() - lastUsers > 60000) { lastUsers = Date.now(); loadUsers(); }
    } catch (e) {
      batch.forEach((sub) => { if (sub.last === undefined) { sub.last = "[]"; try { sub.fn(snapshot([])); } catch (x) { console.error(x); } } });
    } finally {
      syncing = false;
      if (again) { again = false; syncSoon(); }
    }
  }
  function syncSoon() { clearTimeout(soon); soon = setTimeout(sync, 40); }

  const newId = () => {
    const bytes = new Uint8Array(15); crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
  };
  const docUrl = (path) => "/api/doc?path=" + encodeURIComponent(path);

  function docRef(path) {
    const id = path.slice(path.lastIndexOf("/") + 1);
    return {
      id: id, path: path,
      async get() { const out = await api(docUrl(path)); return { id: id, exists: !!out.exists, data: () => (out.exists ? out.data : undefined) }; },
      async set(data) { await api(docUrl(path), { method: "PUT", body: data }); syncSoon(); },
      async update(data) { await api(docUrl(path), { method: "PATCH", body: data }); syncSoon(); },
      async delete() { await api(docUrl(path), { method: "DELETE" }); syncSoon(); },
      onSnapshot() { return function () {}; },
    };
  }

  function collectionRef(collection, where) {
    const filters = where || [];
    const query = {
      path: collection,
      where(field, op, value) { return collectionRef(collection, filters.concat([[field, op, value]])); },
      orderBy() { return query; },
      limit() { return query; },
      async get() { const out = await api("/api/sync", { method: "POST", body: { queries: [{ collection: collection, where: filters }] } }); return snapshot((out.results[0] || {}).docs || []); },
      onSnapshot(fn) {
        const sub = { collection: collection, where: filters, fn: fn, last: undefined };
        subs.push(sub); syncSoon();
        return function () { const i = subs.indexOf(sub); if (i >= 0) subs.splice(i, 1); };
      },
      doc(id) { return docRef(collection + "/" + (id || newId())); },
      async add(data) { const ref = query.doc(); await ref.set(data); return ref; },
    };
    return query;
  }

  const db = { doc: docRef, collection: (path) => collectionRef(path) };

  const user = {
    id: async () => me.id,
    isOwner: async () => me.role === "admin",
    canEdit: async () => me.role === "admin",
    can: async () => true,
    me: async () => ({ id: me.id, name: me.name, email: me.email }),
    profiles: async (ids) => {
      // Нов колега, който още не е в списъка: презарежда имената веднъж.
      if ([].concat(ids || []).some((id) => !users[id]) && Date.now() - lastUsers > 3000) { lastUsers = Date.now(); await loadUsers(); }
      const out = {};
      [].concat(ids || []).forEach((id) => { const u = users[id]; out[id] = { id: id, name: (u && u.name) || "", avatarUrl: (u && u.picture) || "", isMe: id === me.id }; });
      return out;
    },
  };

  const downloads = {
    async save(file) {
      const blob = file.data instanceof Blob ? file.data : new Blob([file.data], { type: /\.csv$/i.test(file.filename) ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = file.filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { status: "saved" };
    },
  };

  // Таблиците на „Подбор“ се четат от Worker-а със сервизен акаунт.
  const mcp = {
    async callTool(server, tool, input) {
      const out = await api("/api/sheets/" + encodeURIComponent((input || {}).fileId || ""));
      return { payload: { content: out.content } };
    },
  };

  const caps = { db: db, user: user, downloads: downloads, mcp: mcp };
  window.claude = { use: async (name) => { await ready; return caps[name] || null; } };

  (async function init() {
    if (!API) { showLogin(); return; }
    if (token) {
      try { const out = await api("/api/me", { noAuthRedirect: true }); await start(out.user); return; }
      catch (e) { setToken(null); }
    }
    showLogin();
  })();

  // За локални тестове: вход без Google срещу wrangler.test.toml.
  window.__teamHubTestLogin = async (email, name) => {
    const out = await api("/api/auth/test", { method: "POST", body: { email: email, name: name }, noAuthRedirect: true });
    setToken(out.token); await start(out.user);
  };
})();
