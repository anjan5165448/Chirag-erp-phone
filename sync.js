/* CHIRAG ENTERPRISES ERP — Google Drive backup and multi-device sync (v1.3.0).
 *
 * Local first: every entry is already committed on this device (local.js) before anything here runs.
 * Nothing is uploaded until the owner connects Google Drive and sets / enters the recovery key.
 *
 * Google     OAuth 2.0 for browser apps (Google's documented redirect flow, response_type=token), scope
 *            drive.file ONLY: the ERP sees only the files it created itself, never the rest of the Drive.
 *            The access token lives in this tab's sessionStorage, expires after about 1 hour, is never
 *            written to logs, and is never sent anywhere except Google's API servers.
 * Drive      Folder "CHIRAG ENTERPRISES ERP BACKUP" with
 *              Change logs/   chg-<device>-<seq>.cee   append-only: each device only CREATES new files
 *              Full backups/  full-<date>-<device>.cee daily + after many changes, 35 days kept
 *              Devices/       device-<device>.cee      written only by that device
 *              sync-key-check.json                     salt + encrypted test value (no secret)
 *            No file is ever written by two devices, so simultaneous uploads cannot overwrite each other.
 *            Record-level merge and conflict detection is done by local.js using revision lineage.
 * Encryption AES-GCM 256, key derived (PBKDF2-SHA256, 210,000 rounds) from the owner's recovery key.
 *            The recovery key is never stored; the derived key is kept as a non-extractable browser key.
 */
(function () {
  'use strict';
  var L = window.ERP_LOCAL;
  var T = window.__ERP_TEST_GOOGLE__ || null;   /* only ever set by the automated test harness */
  var G = {
    auth: T ? T.auth : 'https://accounts.google.com/o/oauth2/v2/auth',
    api: T ? T.api : 'https://www.googleapis.com/drive/v3',
    upload: T ? T.upload : 'https://www.googleapis.com/upload/drive/v3',
    revoke: T ? T.revoke : 'https://oauth2.googleapis.com/revoke',
  };
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var ROOT_NAME = 'CHIRAG ENTERPRISES ERP BACKUP';
  var FOLDER = 'application/vnd.google-apps.folder';
  var KDF_ITER = 210000;
  var KEEP_DAYS = 35;
  var S = window.ERP_SYNC = {};
  var listeners = [];
  var st = { status: 'off', pending: 0, error: '', busy: false, account: null, needs: null, preview: null, lastRun: null };
  var cfg = null;     // persisted sync settings (meta 'sync')
  var key = null;     // CryptoKey (non-extractable)

  var now = function () { return new Date().toISOString(); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function emit() { listeners.forEach(function (f) { try { f(S.state()); } catch (e) { /* ignore */ } }); }
  S.onChange = function (f) { listeners.push(f); };
  function err(code, msg, extra) { var e = new Error(msg); e.code = code; if (extra) e.extra = extra; return e; }
  var saveCfg = function () { return L.meta.set('sync', cfg); };
  function log(kind, msg) {
    /* local sync history (no tokens, no keys, no record contents) */
    cfg.log = (cfg.log || []).concat([{ at: now(), kind: kind, msg: String(msg).slice(0, 300) }]).slice(-200);
  }
  var auditP = Promise.resolve();
  /* sync can start before the ERP screens have opened their database: wait for it (max 15 s), the store
     queues the entry itself if it is still not ready, so no audit entry is ever lost */
  function storeReady() { return new Promise(function (res) { var n = 0; (function chk() { if ((window.ST && ST.ready && ST.db) || n++ > 60) return res(); setTimeout(chk, 250); })(); }); }
  function auditEvent(action, note, snap) { auditP = auditP.then(storeReady).then(function () { if (window.ST && ST.logEvent) return ST.logEvent(action, note, snap); }).catch(function () {}); return auditP; }
  var auditFlush = function () { return auditP; };

  /* ---------------- token (this tab only) ---------------- */
  var TOK = 'ce.g.tok';
  function token() { try { var t = JSON.parse(sessionStorage.getItem(TOK) || 'null'); if (t && t.exp > Date.now() + 30000) return t.t; } catch (e) { /* none */ } return null; }
  function setToken(t, sec) { try { sessionStorage.setItem(TOK, JSON.stringify({ t: t, exp: Date.now() + Math.max(60, (sec || 3600) - 60) * 1000 })); } catch (e) { /* ignore */ } }
  function dropToken() { try { sessionStorage.removeItem(TOK); } catch (e) { /* ignore */ } }
  var redirectUri = function () { return location.origin + location.pathname.replace(/[^/]*$/, ''); };
  S.redirectUri = redirectUri;

  function randStr(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return (x + 256).toString(16).slice(1); }).join(''); }
  /* go to Google; comes back to this page with #access_token=… (handled by handleReturn below) */
  function goToGoogle(mode) {
    if (!cfg || !cfg.clientId) throw err('noclient', 'Google Client ID is not set yet.');
    var state = randStr(16);
    var stv = JSON.stringify({ s: state, at: Date.now(), mode: mode, back: location.hash && !/access_token|error=/.test(location.hash) ? location.hash : '#dashboard' });
    sessionStorage.setItem('ce.g.state', stv);
    /* iPhone Home Screen apps may not keep tab storage across the trip to Google: also keep it here (single use, 15 min) */
    try { localStorage.setItem('ce.g.state', stv); } catch (e) { /* ignore */ }
    var p = { client_id: cfg.clientId, redirect_uri: redirectUri(), response_type: 'token', scope: SCOPE, include_granted_scopes: 'true', state: state };
    if (mode === 'silent') { p.prompt = 'none'; if (cfg.account && cfg.account.email) p.login_hint = cfg.account.email; }
    else p.prompt = 'select_account';
    try { localStorage.setItem('ce.g.lastRedirect', String(Date.now())); } catch (e) { /* ignore */ }
    location.assign(G.auth + '?' + Object.keys(p).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&'));
  }
  /* runs before the ERP screens read the address: removes the token from the address bar at once */
  var returned = null;
  (function handleReturn() {
    var h = location.hash || '';
    if (!/(^#|&)(access_token|error)=/.test(h) || h.indexOf('state=') < 0) return;
    var q = {}; h.replace(/^#/, '').split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem('ce.g.state') || 'null') || JSON.parse(localStorage.getItem('ce.g.state') || 'null'); } catch (e) { saved = null; }
    try { sessionStorage.removeItem('ce.g.state'); localStorage.removeItem('ce.g.state'); } catch (e) { /* ignore */ }
    history.replaceState(null, '', location.pathname + location.search + ((saved && saved.back) || '#dashboard'));
    if (!saved || saved.s !== q.state || Date.now() - saved.at > 15 * 60000) { returned = { ok: false, error: 'state' }; return; }
    if (q.access_token) {
      var scopes = String(q.scope || SCOPE).split(/\s+/);
      if (scopes.indexOf(SCOPE) < 0) { returned = { ok: false, error: 'scope', mode: saved.mode }; return; }
      setToken(q.access_token, +q.expires_in || 3600); returned = { ok: true, mode: saved.mode };
    } else returned = { ok: false, error: q.error || 'unknown', mode: saved.mode };
  })();

  /* ---------------- Drive REST client ---------------- */
  async function call(method, url, opts) {
    opts = opts || {};
    var t = token(); if (!t) throw err('auth', 'Google sign-in has expired.');
    var tries = 0;
    for (;;) {
      var r;
      try { r = await fetch(url, { method: method, headers: Object.assign({ Authorization: 'Bearer ' + t }, opts.headers || {}), body: opts.body, cache: 'no-store' }); }
      catch (e) { throw err('offline', 'No internet connection to Google Drive.'); }
      if (r.ok) return opts.raw ? r : (r.status === 204 ? null : (opts.binary ? r.arrayBuffer() : r.json()));
      var body = null; try { body = await r.json(); } catch (e) { body = null; }
      var reason = body && body.error && body.error.errors && body.error.errors[0] ? body.error.errors[0].reason : '';
      if (r.status === 401) { dropToken(); throw err('auth', 'Google sign-in has expired or was removed.'); }
      if (r.status === 404) throw err('notfound', 'File not found on Google Drive.');
      var retry = r.status === 429 || r.status >= 500 || (r.status === 403 && /rateLimit|userRateLimit|backendError/.test(reason));
      if (retry && tries < 3) { tries++; await sleep(500 * Math.pow(2, tries) + Math.random() * 300); continue; }
      if (retry) throw err('retry', 'Google Drive is busy (' + r.status + '). Will try again.');
      if (r.status === 403 && /storageQuota/.test(reason)) throw err('fatal', 'Your Google Drive is full. Free some space in Google Drive.');
      throw err('fatal', 'Google Drive refused the request (' + r.status + (reason ? ' ' + reason : '') + ').');
    }
  }
  var qs = function (o) { return Object.keys(o).filter(function (k) { return o[k] != null; }).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&'); };
  async function list(q, orderBy) {
    var out = [], pageToken = null;
    do {
      var r = await call('GET', G.api + '/files?' + qs({ q: q, spaces: 'drive', fields: 'nextPageToken,files(id,name,createdTime,appProperties,size,parents)', pageSize: 1000, orderBy: orderBy || 'createdTime', pageToken: pageToken }));
      out = out.concat(r.files || []); pageToken = r.nextPageToken;
    } while (pageToken);
    return out;
  }
  async function create(meta, bytes, mime) {
    var boundary = 'cee' + randStr(8);
    var body = new Blob(['--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + boundary + '\r\nContent-Type: ' + (mime || 'application/octet-stream') + '\r\n\r\n', bytes, '\r\n--' + boundary + '--']);
    return call('POST', G.upload + '/files?uploadType=multipart&fields=id,name,createdTime,appProperties', { headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body });
  }
  async function overwrite(id, bytes, appProperties) {
    var boundary = 'cee' + randStr(8);
    var body = new Blob(['--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(appProperties ? { appProperties: appProperties } : {}) + '\r\n--' + boundary + '\r\nContent-Type: application/octet-stream\r\n\r\n', bytes, '\r\n--' + boundary + '--']);
    return call('PATCH', G.upload + '/files/' + id + '?uploadType=multipart&fields=id', { headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body });
  }
  var download = function (id) { return call('GET', G.api + '/files/' + id + '?alt=media', { binary: true }); };
  var patchMeta = function (id, m) { return call('PATCH', G.api + '/files/' + id + '?fields=id', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) }); };
  var remove = function (id) { return call('DELETE', G.api + '/files/' + id); };
  var appQ = function (v) { return "appProperties has { key='erp' and value='" + v + "' } and trashed = false"; };

  /* ---------------- encryption ---------------- */
  var enc = new TextEncoder(), dec = new TextDecoder();
  var b64 = function (u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
  var unb64 = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newRecoveryKey() { var a = new Uint8Array(24); crypto.getRandomValues(a); var s = ''; for (var i = 0; i < 24; i++) s += ALPHA[a[i] % 32]; return s.match(/.{4}/g).join('-'); }
  var normKey = function (k) { return String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  async function deriveKey(recovery, salt, iter) {
    var base = await crypto.subtle.importKey('raw', enc.encode(normKey(recovery)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function gz(u8, way) {
    if (typeof CompressionStream === 'undefined') return null;
    var s = new Blob([u8]).stream().pipeThrough(way === 'in' ? new CompressionStream('gzip') : new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  /* file = "CEE1" + flags(1: gzip) + iv(12) + AES-GCM(ciphertext+tag); the file name is bound in as extra data */
  async function seal(obj, aad, k) {
    var plain = enc.encode(JSON.stringify(obj)); var flags = 0;
    var z = await gz(plain, 'in'); if (z) { plain = z; flags = 1; }
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: enc.encode(aad) }, k || key, plain));
    var out = new Uint8Array(17 + ct.length); out.set(enc.encode('CEE1'), 0); out[4] = flags; out.set(iv, 5); out.set(ct, 17);
    return out;
  }
  async function open(buf, aad, k) {
    var u = new Uint8Array(buf);
    if (u.length < 30 || dec.decode(u.slice(0, 4)) !== 'CEE1') throw err('damaged', 'Not an ERP file, or the file is damaged.');
    var plain;
    try { plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(5, 17), additionalData: enc.encode(aad) }, k || key, u.slice(17))); }
    catch (e) { throw err('damaged', 'Could not unlock this file: wrong recovery key, or the file is damaged.'); }
    if (u[4] & 1) { var z = await gz(plain, 'out'); if (!z) throw err('damaged', 'This browser cannot unpack this file.'); plain = z; }
    try { return JSON.parse(dec.decode(plain)); } catch (e) { throw err('damaged', 'The file content is damaged.'); }
  }
  var aadOf = function (kind, name) { return 'chirag-erp|' + kind + '|' + name; };

  /* ---------------- state ---------------- */
  S.available = function () { return L.syncAvailable(); };
  S.state = function () {
    return {
      available: S.available(), configured: !!(cfg && cfg.clientId), connected: !!(cfg && cfg.connected), hasToken: !!token(), hasKey: !!key,
      status: st.status, pending: st.pending, error: st.error, busy: st.busy, needs: st.needs, preview: st.preview,
      account: cfg && cfg.account, lastSync: cfg && cfg.lastSync, lastBackup: cfg && cfg.lastBackup, deviceCode: cfg && cfg.deviceCode,
      conflicts: L.conflictCount ? L.conflictCount() : 0, clientId: cfg && cfg.clientId, log: (cfg && cfg.log) || [], deviceId: L.deviceId,
      redirectUri: redirectUri(), devices: (cfg && cfg.devices) || [],
    };
  };
  async function refreshPending() {
    if (!cfg || !cfg.connected || !cfg.joined) { st.pending = 0; return 0; }
    var rows = await L.changesAfter(cfg.uploadedSeq || 0, 100000);
    var paths = {}; rows.forEach(function (r) { if (r.origin === 'local' && L.syncable(r.path)) paths[r.path] = 1; });
    st.pending = Object.keys(paths).length; return st.pending;
  }
  function setStatus(s, e) { st.status = s; st.error = e || ''; emit(); }

  /* ---------------- setup ---------------- */
  S.setClientId = async function (id) {
    id = String(id || '').trim();
    if (!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(id)) throw err('bad', 'This does not look like a Google OAuth Client ID (it ends with .apps.googleusercontent.com).');
    cfg.clientId = id; await saveCfg(); emit();
  };
  S.connect = function () { if (!S.available()) throw err('unavailable', 'Google Drive sync needs the ERP to be opened through its launcher or its https address.'); cfg.wantConnect = true; return saveCfg().then(function () { goToGoogle('connect'); }); };
  S.reconnect = function () { return goToGoogle('connect'); };
  S.disconnect = async function () {
    var t = token();
    if (t) { try { await fetch(G.revoke, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'token=' + encodeURIComponent(t) }); } catch (e) { /* offline: token simply expires */ } }
    dropToken();
    /* forget this device's Google Drive state (records, Client ID and number-series letter stay). Connecting again
       re-joins cleanly: records already on Drive simply match, so nothing is duplicated. */
    ['folders', 'keyGen', 'applied', 'listSince', 'fullListAt', 'bad', 'repairWait', 'account', 'lastBackup', 'lastBackupDay', 'devSeenAt', 'devices'].forEach(function (k) { delete cfg[k]; });
    cfg.joined = false; cfg.uploadedSeq = 0; cfg.changesSinceBackup = 0; key = null; st.needs = null; st.preview = null;
    await L.meta.set('syncKey', null);
    cfg.connected = false; cfg.wantConnect = false; log('disconnect', 'Google Drive disconnected on this device');
    await saveCfg(); auditEvent('sync-disconnect', 'Google Drive disconnected on this device (records stay on this device)');
    setStatus('off'); return true;
  };

  async function ensureFolders() {
    if (cfg.folders && cfg.folders.root) return cfg.folders;
    var pick = async function (kind, name, parent) {
      var q = appQ(kind) + " and mimeType = '" + FOLDER + "'";
      var f = await list(q);
      if (!f.length) {
        var meta = { name: name, mimeType: FOLDER, appProperties: { erp: kind } }; if (parent) meta.parents = [parent];
        await call('POST', G.api + '/files?fields=id,createdTime', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) });
        f = await list(q);   /* two devices may create it at the same moment: everyone uses the oldest */
      }
      f.sort(function (a, b) { return a.createdTime < b.createdTime ? -1 : a.createdTime > b.createdTime ? 1 : (a.id < b.id ? -1 : 1); });
      return f[0].id;
    };
    var root = await pick('root', ROOT_NAME, null);
    var fo = { root: root, changes: await pick('dir-changes', 'Change logs (do not edit)', root), backups: await pick('dir-backups', 'Full backups', root), devices: await pick('dir-devices', 'Devices', root) };
    if (!(await list(appQ('readme'))).length) {
      var txt = 'CHIRAG ENTERPRISES ERP BACKUP\r\n\r\nThis folder is created and used by the Chirag Enterprises ERP for backup and sync between your devices.\r\nAll business files here are ENCRYPTED with your recovery key. Without the recovery key nobody (including you) can open them.\r\nDo not edit, rename or move files in this folder. Do not delete it.\r\nTo restore: open the ERP, Dashboard > Google Drive > Restore from Drive.\r\n\r\nYeh folder Chirag Enterprises ERP ka backup hai. Isme koi file na badlein, na hatayein.\r\n';
      await create({ name: 'READ ME - ERP BACKUP.txt', parents: [root], appProperties: { erp: 'readme' } }, enc.encode(txt), 'text/plain');
    }
    cfg.folders = fo; await saveCfg(); return fo;
  }

  /* recovery key: the first device creates it; every other device must enter the same key */
  async function keyStatus() {
    var files = await list(appQ('keycheck'));
    files.sort(function (a, b) { return a.createdTime < b.createdTime ? -1 : 1; });
    if (!files.length) return { exists: false };
    var j = JSON.parse(dec.decode(new Uint8Array(await download(files[0].id))));
    return { exists: true, id: files[0].id, kc: j };
  }
  S.createKey = async function () {
    var ks = await keyStatus(); if (ks.exists) throw err('exists', 'A recovery key already exists for this Google Drive. Enter that key instead.');
    var rk = newRecoveryKey(); var salt = crypto.getRandomValues(new Uint8Array(16));
    var k = await deriveKey(rk, salt, KDF_ITER);
    var gen = 'G' + randStr(4);
    var check = await seal({ ok: 'chirag-erp-key', gen: gen }, aadOf('keycheck', gen), k);
    var kc = { app: 'chirag-erp', fmt: 1, kdf: 'PBKDF2-SHA256', iter: KDF_ITER, salt: b64(salt), gen: gen, check: b64(check), createdAt: now(), createdBy: L.deviceId };
    await create({ name: 'sync-key-check.json', parents: [cfg.folders.root], appProperties: { erp: 'keycheck', gen: gen } }, enc.encode(JSON.stringify(kc, null, 1)), 'application/json');
    var again = await keyStatus();   /* another device created one first? then that one counts */
    if (again.kc.gen !== gen) throw err('race', 'Another device set up the recovery key at the same moment. Please enter the key shown on that device.');
    key = k; await L.meta.set('syncKey', { k: k, gen: gen }); cfg.keyGen = gen; log('key', 'Recovery key created'); await saveCfg();
    auditEvent('sync-key-created', 'Encryption recovery key created for Google Drive backups');
    return rk;
  };
  S.enterKey = async function (rk) {
    var ks = await keyStatus(); if (!ks.exists) throw err('nokey', 'No recovery key exists yet on this Google Drive.');
    var k = await deriveKey(rk, unb64(ks.kc.salt), ks.kc.iter || KDF_ITER);
    try { var c = await open(unb64(ks.kc.check), aadOf('keycheck', ks.kc.gen), k); if (c.ok !== 'chirag-erp-key') throw 0; }
    catch (e) { throw err('wrongkey', 'This recovery key is not correct. Check each letter and try again.'); }
    key = k; await L.meta.set('syncKey', { k: k, gen: ks.kc.gen }); cfg.keyGen = ks.kc.gen; log('key', 'Recovery key entered'); await saveCfg();
    auditEvent('sync-key-joined', 'Recovery key entered on this device');
    return true;
  };

  /* device registry and the per-device number series (W, M, I, A …) */
  function platformCode() { var u = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(u) ? 'I' : /Android/.test(u) ? 'A' : /Macintosh|Mac OS X/.test(u) ? 'M' : /Windows/.test(u) ? 'W' : 'D'; }
  function platformName() { var u = navigator.userAgent || ''; return /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Macintosh|Mac OS X/.test(u) ? 'MacBook' : /Windows/.test(u) ? 'Windows PC' : 'Computer'; }
  async function registerDevice(force) {
    var files = await list(appQ('device'));
    var mine = files.filter(function (f) { return f.appProperties && f.appProperties.dev === L.deviceId; })[0];
    var others = files.filter(function (f) { return f.appProperties && f.appProperties.dev !== L.deviceId; });
    cfg.devices = files.map(function (f) { return { dev: f.appProperties.dev, code: f.appProperties.code, name: f.appProperties.pname || '', seen: f.appProperties.seen || '' }; });
    if (!cfg.deviceCode) {
      var taken = {}; others.forEach(function (f) { taken[f.appProperties.code] = 1; });
      var pref = platformCode(); var order = (pref + 'WMIABCEFGHJKLNPQRSTUVXYZ').split('');
      cfg.deviceCode = order.filter(function (c) { return !taken[c]; })[0] || 'Z';
    }
    var info = { dev: L.deviceId, code: cfg.deviceCode, name: platformName(), app: L.version, ua: navigator.userAgent, lastSync: cfg.lastSync || '', at: now() };
    var name = 'device-' + L.deviceId + '.cee';
    var ap = { erp: 'device', dev: L.deviceId, code: cfg.deviceCode, pname: platformName(), seen: now().slice(0, 16), gen: cfg.keyGen };
    var sealed = await seal(info, aadOf('device', name));
    if (mine) { if (force || !cfg.devSeenAt || Date.now() - Date.parse(cfg.devSeenAt) > 3600000) await overwrite(mine.id, sealed, ap); }
    else await create({ name: name, parents: [cfg.folders.devices], appProperties: ap }, sealed);
    cfg.devSeenAt = now();
    /* same letter chosen by two devices at the same moment: the later one moves to a free letter */
    var clash = others.filter(function (f) { return f.appProperties.code === cfg.deviceCode && f.createdTime < (mine ? mine.createdTime : now()); });
    if (clash.length) { var used = {}; others.forEach(function (f) { used[f.appProperties.code] = 1; }); cfg.deviceCode = 'BCEFGHJKLNPQRSTUVXYZ'.split('').filter(function (c) { return !used[c]; })[0] || 'Z'; log('device', 'Number series changed to ' + cfg.deviceCode + ' (letter already used)'); }
  }
  S.seriesCode = function () { return cfg && cfg.joined && cfg.series !== 'single' && cfg.deviceCode ? cfg.deviceCode : ''; };
  S.setSeries = async function (mode) { cfg.series = mode === 'single' ? 'single' : 'device'; await saveCfg(); emit(); };

  /* ---------------- pulling changes from other devices ---------------- */
  function covered(ranges, a, b) { return (ranges || []).some(function (r) { return r[0] <= a && r[1] >= b; }); }
  function addRange(ranges, a, b) {
    var rs = (ranges || []).concat([[a, b]]).sort(function (x, y) { return x[0] - y[0]; }), out = [];
    rs.forEach(function (r) { var l = out[out.length - 1]; if (l && r[0] <= l[1] + 1) l[1] = Math.max(l[1], r[1]); else out.push([r[0], r[1]]); });
    return out;
  }
  async function remoteSegments(full) {
    var q = appQ('chg');
    var since = cfg.listSince && !full ? new Date(Date.parse(cfg.listSince) - 2 * 3600000).toISOString() : null;
    if (since) q += " and createdTime > '" + since + "'";
    var files = await list(q);
    return files.filter(function (f) { var a = f.appProperties || {}; return a.dev && a.dev !== L.deviceId && (!cfg.keyGen || a.gen === cfg.keyGen); });
  }
  async function readSegment(f) { var a = f.appProperties; var seg = await open(await download(f.id), aadOf('chg', f.name)); if (seg.dev !== a.dev || seg.from !== +a.from || seg.to !== +a.to) throw err('damaged', 'Change file ' + f.name + ' does not match its label.'); return seg; }
  async function pull(full) {
    var files = await remoteSegments(full);
    var stats = { files: 0, business: 0, conflicts: 0, skipped: [] };
    cfg.applied = cfg.applied || {};
    var maxCreated = cfg.listSince || '';
    cfg.bad = cfg.bad || {}; cfg.repairWait = cfg.repairWait || {};
    for (var i = 0; i < files.length; i++) {
      var f = files[i], a = f.appProperties, from = +a.from, to = +a.to;
      if (f.createdTime > maxCreated) maxCreated = f.createdTime;
      if (cfg.bad[f.id] || covered(cfg.applied[a.dev], from, to)) continue;
      var seg;
      try { seg = await readSegment(f); }
      catch (e) {
        if (e.code !== 'damaged') throw e;
        /* cannot read it: ask the device that made it to send those records again, and do not try this file again */
        stats.skipped.push(f.name); log('error', e.message);
        var rname = 'repair-' + L.deviceId + '-' + a.dev + '-' + from + '-' + to + '.json';
        if (!(await list(appQ('repair') + " and name = '" + rname + "'")).length) await create({ name: rname, parents: [cfg.folders.changes], appProperties: { erp: 'repair', dev: a.dev, by: L.deviceId, from: String(from), to: String(to), gen: cfg.keyGen } }, enc.encode('{}'), 'application/json');
        cfg.bad[f.id] = 1; cfg.applied[a.dev] = addRange(cfg.applied[a.dev], from, to); cfg.repairWait[a.dev] = now();
        auditEvent('sync-damaged', 'Change file ' + f.name + ' could not be read; asked device ' + a.dev + ' to send those records again');
        await saveCfg(); continue;
      }
      if (cfg.repairWait[a.dev] && f.createdTime > cfg.repairWait[a.dev]) delete cfg.repairWait[a.dev];
      var r = await L.applyRemote(seg.ops.map(function (o) { o.devName = seg.devName || ''; return o; }));
      cfg.applied[a.dev] = addRange(cfg.applied[a.dev], from, to);
      stats.files++; stats.business += seg.ops.filter(function (o) { return o.path.indexOf('audit/') !== 0; }).length; stats.conflicts += r.conflicts.length;
      if (r.conflicts.length) auditEvent('sync-conflict', r.conflicts.length + ' record(s) changed on two devices: ' + r.conflicts.slice(0, 5).join(', '));
      cfg.changesSinceBackup = (cfg.changesSinceBackup || 0) + seg.ops.length;
      await saveCfg();
    }
    if (maxCreated) cfg.listSince = maxCreated;
    if (full) cfg.fullListAt = now();
    return stats;
  }

  /* another device could not read one of this device's change files: queue those records again */
  async function handleRepairs() {
    var reqs = (await list(appQ('repair'))).filter(function (f) { return (f.appProperties || {}).dev === L.deviceId; });
    for (var i = 0; i < reqs.length; i++) {
      var a = reqs[i].appProperties;
      var rows = await L.changesRange(+a.from, +a.to);
      var paths = {}; rows.forEach(function (r) { if (r.origin === 'local') paths[r.path] = 1; });
      var n = await L.enqueuePaths(Object.keys(paths), 'resend');
      log('repair', 'Sent ' + n + ' record(s) again for device ' + a.by);
      try { await remove(reqs[i].id); } catch (e) { /* another copy of this device may have handled it */ }
    }
    return reqs.length;
  }

  /* ---------------- pushing this device's changes ---------------- */
  async function push() {
    var stats = { files: 0, business: 0 };
    for (;;) {
      var rows = await L.changesAfter(cfg.uploadedSeq || 0, 5000);
      if (!rows.length) break;
      var seqTo = rows[rows.length - 1].seq, paths = [], seen = {};
      rows.forEach(function (r) { if (r.origin === 'local' && L.syncable(r.path) && !seen[r.path]) { seen[r.path] = 1; paths.push(r.path); } });
      var ops = paths.map(L.opFor).filter(Boolean);
      if (!ops.length) { cfg.uploadedSeq = seqTo; await saveCfg(); continue; }
      /* very large first uploads are split into files of 400 records. Labels: file c covers queue numbers
         [from+c, from+c], the last file covers [from+c, seqTo] — disjoint, contiguous, increasing, so a retry
         produces the same names and other devices can tell exactly which numbers they already have. */
      var chunks = []; for (var i = 0; i < ops.length; i += 400) chunks.push(ops.slice(i, i + 400));
      var from = rows[0].seq;
      for (var c = 0; c < chunks.length; c++) {
        var to = c === chunks.length - 1 ? seqTo : from + c;   /* unique, increasing labels */
        var cfrom = c === 0 ? from : from + c;
        var name = 'chg-' + L.deviceId + '-' + String(to).padStart(12, '0') + '.cee';
        var exists = await list(appQ('chg') + " and name = '" + name + "'");   /* uploaded before but the reply was lost: do not upload twice */
        /* a dropped connection can make Google store the same upload twice (the browser resends it): keep the oldest */
        for (var x = 1; x < exists.length; x++) { if ((exists[x].appProperties || {}).dev === L.deviceId) { try { await remove(exists[x].id); } catch (e) { /* tidy-up only */ } } }
        if (!exists.length) {
          var seg = { app: 'chirag-erp', fmt: 1, dev: L.deviceId, devName: platformName() + ' (' + (cfg.deviceCode || '?') + ')', from: cfrom, to: to, at: now(), appVersion: L.version, ops: chunks[c] };
          await create({ name: name, parents: [cfg.folders.changes], appProperties: { erp: 'chg', dev: L.deviceId, from: String(cfrom), to: String(to), gen: cfg.keyGen, n: String(chunks[c].length) } }, await seal(seg, aadOf('chg', name)));
        }
        stats.files++; stats.business += chunks[c].filter(function (o) { return o.path.indexOf('audit/') !== 0; }).length;
        if (c === chunks.length - 1) { cfg.uploadedSeq = seqTo; cfg.changesSinceBackup = (cfg.changesSinceBackup || 0) + ops.length; await saveCfg(); }
      }
    }
    return stats;
  }

  /* ---------------- full encrypted backups on Drive ---------------- */
  var localDay = function (d) { var x = d ? new Date(d) : new Date(); return x.getFullYear() + String(x.getMonth() + 1).padStart(2, '0') + String(x.getDate()).padStart(2, '0'); };
  async function fullBackupNow(reason) {
    if (!window.ST || !ST.fullBackup) return null;
    var o = await ST.fullBackup(); o.sync = { device: L.deviceId, code: cfg.deviceCode, uploadedSeq: cfg.uploadedSeq, applied: cfg.applied, reason: reason };
    var t = new Date(); var stamp = localDay(t) + '-' + String(t.getHours()).padStart(2, '0') + String(t.getMinutes()).padStart(2, '0') + String(t.getSeconds()).padStart(2, '0');
    var name = 'full-' + stamp + '-' + L.deviceId + '.cee';
    var records = ST.COLLS.reduce(function (a, c) { return a + (o.data[c] || []).length; }, 0);
    var f = await create({ name: name, parents: [cfg.folders.backups], appProperties: { erp: 'full', dev: L.deviceId, at: o.createdAt, records: String(records), chk: o.checksum, gen: cfg.keyGen, pname: platformName() } }, await seal(o, aadOf('full', name)));
    /* read it back and check it before counting it as a good backup */
    var back = await open(await download(f.id), aadOf('full', name));
    var v = ST.verifyBackup(back);
    if (!v.ok || back.checksum !== o.checksum) throw err('backup_bad', 'The backup on Google Drive did not pass the check. It will be made again.');
    await patchMeta(f.id, { appProperties: { ok: '1' } });
    cfg.lastBackup = { at: o.createdAt, name: name, records: records }; cfg.lastBackupDay = localDay(); cfg.changesSinceBackup = 0;
    log('backup', 'Full backup ' + name + ' (' + records + ' records)'); await saveCfg();
    auditEvent('drive-backup', 'Encrypted full backup on Google Drive: ' + name + ' · ' + records + ' records · checksum ' + o.checksum);
    await prune();
    return cfg.lastBackup;
  }
  async function prune() {
    var all = await list(appQ('full'));
    var good = all.filter(function (f) { return f.appProperties && f.appProperties.ok === '1'; });
    var cut = Date.now() - KEEP_DAYS * 86400000;
    var recentGood = good.filter(function (f) { return Date.parse(f.appProperties.at) >= cut; });
    if (recentGood.length < 3) return 0;   /* never delete old backups unless at least 3 checked recent ones exist */
    var old = all.filter(function (f) { return f.appProperties && f.appProperties.dev === L.deviceId && Date.parse(f.appProperties.at) < cut; });
    for (var i = 0; i < old.length; i++) await remove(old[i].id);
    if (old.length) log('backup', old.length + ' backups older than ' + KEEP_DAYS + ' days removed');
    return old.length;
  }
  function backupDue() { return !cfg.lastBackupDay || cfg.lastBackupDay !== localDay() || ((cfg.changesSinceBackup || 0) >= 100 && Date.now() - Date.parse(cfg.lastBackup.at) > 3600000); }
  S.backupNow = function () { return runExclusive(async function () { await ready(); return fullBackupNow('manual'); }); };
  S.listDriveBackups = async function () {
    await ready();
    var all = await list(appQ('full'), 'createdTime desc');
    return all.filter(function (f) { return !cfg.keyGen || (f.appProperties || {}).gen === cfg.keyGen; }).map(function (f) { var a = f.appProperties || {}; return { id: f.id, name: f.name, at: a.at, records: +a.records || 0, dev: a.dev, device: a.pname || a.dev, ok: a.ok === '1', size: +f.size || 0 }; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
  };
  S.readDriveBackup = async function (b) {
    await ready();
    var o = await open(await download(b.id), aadOf('full', b.name));
    var v = ST.verifyBackup(o); if (!v.ok) throw err('damaged', 'This backup failed the check: ' + v.problems.slice(0, 2).join('; '));
    o.fromDrive = b.name; return o;
  };

  /* ---------------- the sync cycle ---------------- */
  async function ready() {
    if (!S.available()) throw err('unavailable', 'Sync is not available when the ERP is opened this way.');
    if (!cfg.connected) throw err('off', 'Google Drive is not connected.');
    if (!token()) throw err('auth', 'Please connect to Google again.');
    if (!key) throw err('nokey', 'Recovery key needed.');
    await ensureFolders();
  }
  var running = null;
  function runExclusive(fn) {
    var go = function () { st.busy = true; emit(); return Promise.resolve().then(fn).finally(function () { st.busy = false; emit(); }); };
    if (navigator.locks && navigator.locks.request) return navigator.locks.request('chirag-erp-sync', go);
    return go();
  }
  /* first connection on this device: look before mixing two sets of records */
  async function firstJoin() {
    var files = await remoteSegments(true);
    var ops = [];
    for (var i = 0; i < files.length; i++) { try { (await readSegment(files[i])).ops.forEach(function (o) { ops.push(o); }); } catch (e) { if (e.code !== 'damaged') throw e; } }
    var clash = [], seenP = {};
    ops.forEach(function (o) { var k = L.classify(o); if (k === 'conflict' && !seenP[o.path]) { seenP[o.path] = 1; clash.push({ path: o.path, dev: o.devName || o.dev }); } });
    var remoteBiz = {}; ops.forEach(function (o) { if (!/^(audit|settings)\//.test(o.path)) remoteBiz[o.path] = 1; });
    st.preview = { localRecords: L.businessCount(), driveRecords: Object.keys(remoteBiz).length, clashes: clash.length, clashList: clash.slice(0, 50) };
    if (st.preview.clashes && st.preview.localRecords) { st.needs = 'merge'; setStatus('setup'); return false; }
    await finishJoin('merge');
    return true;
  }
  async function finishJoin(choice) {
    if (choice === 'replace') { var n = await L.clearBusinessData(); log('join', 'This device\'s ' + n + ' records were replaced by Google Drive records (backup file was downloaded first)'); }
    cfg.joined = true; cfg.uploadedSeq = await L.maxSeq(); await saveCfg();
    await pull(true);
    await L.enqueueAll();   /* everything this device has goes up once (re-sending a record is harmless) */
    st.needs = null; st.preview = null;
    auditEvent('sync-connect', 'Google Drive connected (' + (cfg.account && cfg.account.email || '') + '), device series ' + cfg.deviceCode + (choice === 'replace' ? ', this device replaced by Drive data' : choice === 'resolve' ? ', clashes to be resolved one by one' : ''));
    await saveCfg();
  }
  S.chooseJoin = function (choice) {
    return runExclusive(async function () {
      if (choice === 'separate') { cfg.connected = false; st.needs = null; st.preview = null; log('join', 'Owner kept this device separate'); await saveCfg(); setStatus('off'); return; }
      await finishJoin(choice); await cycle();
    });
  };

  async function cycle() {
    if (!cfg.joined) { if (!(await firstJoin())) return; }
    await registerDevice(false);
    var full = !cfg.fullListAt || Date.now() - Date.parse(cfg.fullListAt) > 24 * 3600000;
    var pin = await pull(full);
    await handleRepairs();
    var pout = await push();
    if (backupDue()) { try { await fullBackupNow(cfg.lastBackupDay ? 'daily' : 'first'); } catch (e) { if (e.code === 'backup_bad') log('error', e.message); else throw e; } }
    cfg.lastSync = now(); cfg.lastError = ''; await refreshPending();
    log('sync', 'Received ' + pin.files + ' file(s), sent ' + pout.files + ' file(s)' + (pin.conflicts ? ', ' + pin.conflicts + ' conflict(s)' : '') + (pin.skipped.length ? ', ' + pin.skipped.length + ' unreadable' : ''));
    if (pin.business || pout.business) await auditEvent('sync', 'Google Drive sync: received ' + pin.business + ', sent ' + pout.business + ' record change(s)' + (pin.conflicts ? ', ' + pin.conflicts + ' conflict(s) need a decision' : ''));
    await auditFlush();
    await push();   /* also send the audit entries written during this sync */
    await refreshPending();
    await saveCfg();
    if (pin.skipped.length) setStatus('error', pin.skipped.length + ' change file(s) on Google Drive could not be read (damaged or made with another recovery key).');
    else setStatus(st.pending ? 'pending' : 'synced');
  }
  var backoff = 0, timer = null;
  S.syncNow = function (why) {
    if (!cfg || !cfg.connected) return Promise.resolve(S.state());
    if (running) return running;
    running = runExclusive(async function () {
      await refreshPending();
      if (!navigator.onLine) { setStatus('offline'); return; }
      if (!token()) { setStatus('reauth'); return; }
      if (!key) { st.needs = 'key'; setStatus('setup'); return; }
      setStatus('syncing');
      try {
        if (!cfg.account) { var ab = await call('GET', G.api + '/about?fields=user(emailAddress,displayName)'); cfg.account = { email: ab.user.emailAddress, name: ab.user.displayName }; }
        await ensureFolders();
        await cycle(); backoff = 0;
      } catch (e) {
        await refreshPending();
        cfg.lastError = e.message; cfg.lastErrorAt = now(); log('error', e.message); await saveCfg();
        if (e.code === 'auth') setStatus('reauth', e.message);
        else if (e.code === 'offline') setStatus('offline', e.message);
        else { setStatus('error', e.message); backoff = Math.min(backoff ? backoff * 2 : 30000, 300000); schedule(backoff); }
      }
    }).finally(function () { running = null; });
    return running;
  };
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(function () { S.syncNow('timer'); }, ms); }

  /* ---------------- start-up ---------------- */
  var lastSilentKey = 'ce.g.silentAt';
  function maySilentReauth() {
    if (!cfg || !cfg.connected || !cfg.clientId || token() || !navigator.onLine) return false;
    if (document.querySelector && document.querySelector('.modal')) return false;     /* never leave a form that is open */
    var last = +(localStorage.getItem(lastSilentKey) || 0); if (Date.now() - last < 10 * 60000) return false;
    try { localStorage.setItem(lastSilentKey, String(Date.now())); } catch (e) { /* ignore */ }
    return true;
  }
  S.init = (async function () {
    await L.ready;
    cfg = (await L.meta.get('sync')) || { connected: false, uploadedSeq: 0, applied: {}, log: [], series: 'device' };
    var sk = await L.meta.get('syncKey'); if (sk && sk.k) { key = sk.k; cfg.keyGen = cfg.keyGen || sk.gen; }
    if (returned) {
      if (returned.ok) { cfg.connected = true; cfg.wantConnect = false; log('auth', 'Signed in to Google'); }
      else if (returned.mode === 'silent') { log('auth', 'Automatic Google sign-in needs a tap (' + returned.error + ')'); }
      else { cfg.wantConnect = false; log('auth', 'Google sign-in was not completed (' + returned.error + ')'); st.error = returned.error === 'access_denied' ? 'Google sign-in was cancelled.' : returned.error === 'scope' ? 'Please allow the Google Drive permission to use sync.' : 'Google sign-in did not finish (' + returned.error + ').'; }
      await saveCfg();
    }
    if (!S.available()) { st.status = 'off'; emit(); return; }
    if (cfg.connected && !token() && maySilentReauth()) { goToGoogle('silent'); return; }
    await refreshPending();
    st.status = !cfg.connected ? 'off' : !token() ? 'reauth' : !key ? 'setup' : st.pending ? 'pending' : 'synced';
    if (cfg.connected && token() && !key) { try { await ensureFolders(); var ks = await keyStatus(); st.needs = ks.exists ? 'key' : 'newkey'; if (!cfg.account) { var ab = await call('GET', G.api + '/about?fields=user(emailAddress,displayName)'); cfg.account = { email: ab.user.emailAddress, name: ab.user.displayName }; await saveCfg(); } } catch (e) { st.error = e.message; } }
    emit();
    if (cfg.connected && token() && key) S.syncNow('open');
  })();

  /* sync when a change is saved (a few seconds later, to batch), when the network returns,
     when the owner comes back to the app, and every minute while it is open */
  var debounce = null;
  L.onWrite(function () { st.pending++; emit(); if (!cfg || !cfg.connected) return; clearTimeout(debounce); debounce = setTimeout(function () { S.syncNow('write'); }, 4000); });
  window.addEventListener('online', function () {
    /* the app may have been reopened while offline (no Google sign-in in this session yet): sign in first */
    if (cfg && cfg.connected && !token() && maySilentReauth()) { goToGoogle('silent'); return; }
    S.syncNow('online');
  });
  window.addEventListener('offline', function () { if (cfg && cfg.connected) setStatus('offline'); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !cfg || !cfg.connected) return;
    if (!token() && maySilentReauth()) { goToGoogle('silent'); return; }
    S.syncNow('foreground');
  });
  setInterval(function () { if (document.visibilityState === 'visible' && cfg && cfg.connected) S.syncNow('timer'); }, 60000);
  S.newRecoveryKeyForTest = newRecoveryKey;
})();
