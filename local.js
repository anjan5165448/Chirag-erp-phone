/* CHIRAG ENTERPRISES ERP — device-local database (v1.3.0-local).
 *
 * Same window.claude.use('db' | 'user' | 'downloads') interface as v1.2.0, so erp/store.js and erp/app.js
 * (all business screens and calculations) work unchanged.
 *
 * Storage   IndexedDB "chirag-erp-local", SAME layout as v1.2.0 (stores docs / changes / meta, version 1).
 *           v1.2.0 can still open it, which is the rollback path.
 * Records   A business record is stored exactly as before (row.doc). Sync information lives NEXT to it
 *           (row.sync = revision, revision history, device, time, created) and never inside the record.
 * Writes    A save reports success only after IndexedDB has committed BOTH the record and its queue entry
 *           (one transaction), so a saved entry can never be missing from the upload queue.
 * Deletes   Permanent deletes leave a tombstone ("~tomb/<path>") so the delete reaches other devices and
 *           an older copy from a device that was offline cannot bring the record back.
 * Remote    applyRemote() merges records from other devices by revision lineage:
 *             same revision → nothing to do · newer descendant → take it · older ancestor → ignore ·
 *             two different edits → CONFLICT: this device's version stays, the other is kept in
 *             "~conflict/<path>" until the owner chooses. Nothing is overwritten silently.
 * Upgrade   First start of v1.3.0: a full copy of the v1.2.0 database is written to a separate database
 *           ("chirag-erp-before-1.3.0") before anything is changed; record counts before/after are kept
 *           as a migration report.
 */
(function () {
  'use strict';
  var DB_NAME = 'chirag-erp-local', DB_VER = 1, COPY_DB = 'chirag-erp-before-1.3.0';
  var VERSION = '1.3.0-local';
  var LEGACY_TABLES = ['purchases', 'unloading', 'production', 'sales', 'mistri', 'expenses', 'payments', 'adjustments', 'parties', 'settings', 'audit', 'attachments', 'backups'];
  var BUSINESS = ['purchases', 'unloading', 'production', 'sales', 'mistri', 'expenses', 'payments', 'adjustments', 'parties'];
  var LEGACY_KEY = function (t) { return 'chirag_local_' + t; };

  var L = window.ERP_LOCAL = { version: VERSION, backend: 'starting', persisted: null, migrated: null, upgrade: null, deviceId: null, error: '', docs: 0 };
  window.ERP_HOST = 'local';

  function uid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* not a secure context */ }
    var b = new Uint8Array(16);
    try { crypto.getRandomValues(b); } catch (e) { for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  L.uid = uid;
  var clone = function (v) { return v == null ? v : JSON.parse(JSON.stringify(v)); };
  function fail(code, msg, cause) { var e = new Error(msg); e.code = code; if (cause) e.cause = cause; return e; }
  var STORAGE_MSG = 'Could not save on this device. The browser refused to store the entry (storage full, private browsing, or storage blocked). Nothing was saved. Download a backup file, free some space, and try again.';

  /* canonical JSON (sorted keys) and a 64-bit content hash: equal content → equal hash on every device */
  function canon(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
  }
  function hash(str) {
    var h1 = 0x811c9dc5, h2 = 0x01000193 ^ str.length;
    for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822507) ^ (h2 >>> 13); }
    return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
  }
  L.canon = canon; L.hash = hash;
  var META_KEYS = { v: 1, updatedAt: 1, updatedBy: 1, createdAt: 1, createdBy: 1, restoredFromBackup: 1, _pending: 1 };
  /* business content only (no version / timestamps), used to see whether two copies really differ */
  function bodyHash(doc) { if (!doc) return 'none'; var o = {}; Object.keys(doc).forEach(function (k) { if (!META_KEYS[k]) o[k] = doc[k]; }); return hash(canon(o)); }
  L.bodyHash = bodyHash;
  var revOf = function (doc) { return (doc && doc.v != null ? doc.v : 0) + '.' + hash(canon(doc)); };

  /* which records travel to other devices */
  function syncable(path) {
    if (!path || path.charAt(0) === '~') return false;
    var c = path.split('/')[0];
    if (c === 'backups') return false;
    if (c === 'settings') return path === 'settings/main';
    return BUSINESS.indexOf(c) >= 0 || c === 'attachments' || c === 'audit';
  }
  L.syncable = syncable;

  /* ---------------- in-memory mirror ---------------- */
  var mem = new Map();      // path -> record (business view, exactly as v1.2.0)
  var smeta = new Map();    // path -> sync info for live records and tombstones
  var tombs = new Map();    // path -> tombstone {path, rev, hist, dev, at}
  var conflicts = new Map();// path -> conflict {path, coll, local, remotes[], detectedAt}
  var listeners = new Set();
  var writeHooks = [];
  var notifyQueued = false;
  function notify() { if (notifyQueued) return; notifyQueued = true; setTimeout(function () { notifyQueued = false; listeners.forEach(function (l) { try { l(); } catch (e) { console.error(e); } }); }, 0); }
  L.onWrite = function (fn) { writeHooks.push(fn); };
  function fireWrite(info) { writeHooks.forEach(function (f) { try { f(info); } catch (e) { /* hook errors never block saving */ } }); }

  /* ---------------- IndexedDB ---------------- */
  var idb = null;
  function openDb(name, ver, upgrade) {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(fail('no_idb', 'IndexedDB not available'));
      var rq;
      try { rq = indexedDB.open(name, ver); } catch (e) { return rej(e); }
      rq.onupgradeneeded = function () { upgrade(rq.result); };
      rq.onsuccess = function () { var d = rq.result; d.onversionchange = function () { d.close(); }; res(d); };
      rq.onerror = function () { rej(rq.error || fail('no_idb', 'IndexedDB open failed')); };
      rq.onblocked = function () { rej(fail('no_idb', 'IndexedDB blocked by another open window')); };
    });
  }
  function mainUpgrade(d) {
    if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs', { keyPath: 'path' }).createIndex('coll', 'coll');
    if (!d.objectStoreNames.contains('changes')) d.createObjectStore('changes', { keyPath: 'seq', autoIncrement: true });
    if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' });
  }
  function tx(db, stores, mode, fn) {
    return new Promise(function (res, rej) {
      var t;
      try { t = db.transaction(stores, mode); } catch (e) { return rej(e); }
      var out;
      t.oncomplete = function () { res(out); };
      t.onerror = function () { rej(t.error); };
      t.onabort = function () { rej(t.error || fail('aborted', 'Transaction aborted')); };
      try { out = fn(t); } catch (e) { try { t.abort(); } catch (x) { /* finished */ } rej(e); }
    });
  }
  function reqP(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  var collOf = function (path) { return path.split('/').slice(0, -1).join('/'); };

  var meta = {
    get: function (k) { if (!idb) return Promise.resolve(lsMeta.get(k)); return tx(idb, ['meta'], 'readonly', function (t) { return reqP(t.objectStore('meta').get(k)); }).then(function (r) { return r ? r.v : undefined; }); },
    set: function (k, v) { if (!idb) { lsMeta.set(k, v); return Promise.resolve(); } return tx(idb, ['meta'], 'readwrite', function (t) { t.objectStore('meta').put({ k: k, v: v }); }); },
  };
  var lsMeta = {
    get: function (k) { try { var v = localStorage.getItem('chirag_meta_' + k); return v == null ? undefined : JSON.parse(v); } catch (e) { return undefined; } },
    set: function (k, v) { try { localStorage.setItem('chirag_meta_' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  L.meta = meta;

  /* ---------------- localStorage fallback (earlier Windows format, no sync) ---------------- */
  var lsBackend = {
    loadAll: function () {
      var out = [];
      LEGACY_TABLES.forEach(function (t) {
        var o = {}; try { o = JSON.parse(localStorage.getItem(LEGACY_KEY(t)) || '{}'); } catch (e) { o = {}; }
        Object.keys(o).forEach(function (id) { out.push({ path: t + '/' + id, coll: t, doc: o[id] }); });
      });
      return Promise.resolve(out);
    },
    put: function (path, rec) {
      var parts = path.split('/'), t = parts[0], id = parts.slice(1).join('/');
      var o = {}; try { o = JSON.parse(localStorage.getItem(LEGACY_KEY(t)) || '{}'); } catch (e) { o = {}; }
      if (rec == null) delete o[id]; else o[id] = rec;
      try { localStorage.setItem(LEGACY_KEY(t), JSON.stringify(o)); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    },
  };

  /* ---------------- one-time copy from the earlier localStorage build ---------------- */
  function legacyRecords() {
    var out = [];
    LEGACY_TABLES.forEach(function (t) {
      var raw = null; try { raw = localStorage.getItem(LEGACY_KEY(t)); } catch (e) { raw = null; }
      if (!raw) return;
      var o = {}; try { o = JSON.parse(raw) || {}; } catch (e) { o = {}; }
      Object.keys(o).forEach(function (id) { out.push({ path: t + '/' + id, coll: t, doc: o[id] }); });
    });
    return out;
  }
  async function migrateLegacy() {
    var done = await meta.get('legacyMigration');
    if (done) { L.migrated = done; return; }
    var recs = legacyRecords();
    var info = { at: new Date().toISOString(), found: recs.length, copied: 0, skipped: 0 };
    await tx(idb, ['docs', 'changes', 'meta'], 'readwrite', function (t) {
      var docs = t.objectStore('docs'), ch = t.objectStore('changes');
      recs.forEach(function (r) {
        if (mem.has(r.path)) { info.skipped++; return; }
        var s = stampLegacy(r.doc); docs.put({ path: r.path, coll: r.coll, doc: r.doc, sync: s });
        ch.add({ path: r.path, op: 'migrate', v: r.doc && r.doc.v != null ? r.doc.v : null, at: info.at, device: L.deviceId, origin: 'migrate', rev: s.rev });
        mem.set(r.path, r.doc); smeta.set(r.path, s); info.copied++;
      });
      t.objectStore('meta').put({ k: 'legacyMigration', v: info });
    });
    L.migrated = info;
  }
  function stampLegacy(doc) { return { rev: revOf(doc), hist: [], dev: 'legacy', at: (doc && (doc.updatedAt || doc.createdAt)) || '', created: (doc && doc.createdAt) || '', hash: hash(canon(doc)) }; }

  /* ---------------- upgrade from v1.2.0: copy first, then add sync information ---------------- */
  function countsOf(rows) { var c = {}; rows.forEach(function (r) { if (r.path.charAt(0) === '~') return; var k = r.coll || collOf(r.path); c[k] = (c[k] || 0) + 1; }); return c; }
  async function upgradeTo13(rows) {
    var rep = await meta.get('upgrade13');
    if (rep && rep.ok) { L.upgrade = rep; return rows; }
    rep = { from: '1.2.0-local', to: VERSION, startedAt: new Date().toISOString(), before: countsOf(rows), copyDb: COPY_DB, copyRows: 0, ok: false };
    /* 1. untouched copy of every row and every setting, in its own database */
    var allMeta = await tx(idb, ['meta'], 'readonly', function (t) { return reqP(t.objectStore('meta').getAll()); });
    var cdb = await openDb(COPY_DB, 1, function (d) { if (!d.objectStoreNames.contains('rows')) d.createObjectStore('rows', { keyPath: 'path' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' }); });
    var existing = await tx(cdb, ['rows'], 'readonly', function (t) { return reqP(t.objectStore('rows').count()); });
    if (!existing) {
      await tx(cdb, ['rows', 'meta'], 'readwrite', function (t) {
        rows.forEach(function (r) { t.objectStore('rows').put(r); });
        allMeta.forEach(function (m) { if (m.k !== 'syncKey') t.objectStore('meta').put(m); });
        t.objectStore('meta').put({ k: '__copiedAt', v: new Date().toISOString() });
      });
    }
    rep.copyRows = await tx(cdb, ['rows'], 'readonly', function (t) { return reqP(t.objectStore('rows').count()); });
    cdb.close();
    if (rep.copyRows < rows.length) { rep.error = 'The safety copy is incomplete (' + rep.copyRows + ' of ' + rows.length + '). Upgrade stopped; nothing was changed.'; await meta.set('upgrade13', rep); L.upgrade = rep; throw fail('upgrade_failed', rep.error); }
    /* 2. add sync information next to each record (the records themselves are not modified) */
    var stampAt = new Date().toISOString();
    await tx(idb, ['docs', 'changes'], 'readwrite', function (t) {
      rows.forEach(function (r) {
        if (r.path.charAt(0) === '~' || r.sync) return; r.sync = stampLegacy(r.doc); t.objectStore('docs').put(r);
        /* remembered locally (never uploaded) so a later edit made by v1.2.0 after a rollback can be linked to it */
        t.objectStore('changes').add({ path: r.path, op: 'stamp', v: r.doc && r.doc.v != null ? r.doc.v : null, at: stampAt, device: L.deviceId, origin: 'migrate', rev: r.sync.rev });
      });
    });
    var after = await tx(idb, ['docs'], 'readonly', function (t) { return reqP(t.objectStore('docs').getAll()); });
    rep.after = countsOf(after);
    rep.ok = canon(rep.before) === canon(rep.after);
    rep.finishedAt = new Date().toISOString();
    if (!rep.ok) rep.error = 'Record counts differ after the upgrade. Use "Undo upgrade" in Settings.';
    await meta.set('upgrade13', rep);
    L.upgrade = rep;
    return after;
  }
  /* rollback: put the untouched v1.2.0 copy back (a backup file of the current state is taken by the screen first) */
  L.rollbackUpgrade = async function () {
    var cdb = await openDb(COPY_DB, 1, function () { /* exists */ });
    var rows = await tx(cdb, ['rows'], 'readonly', function (t) { return reqP(t.objectStore('rows').getAll()); });
    cdb.close();
    if (!rows.length) throw fail('no_copy', 'No pre-upgrade copy was found on this device.');
    await tx(idb, ['docs', 'meta'], 'readwrite', function (t) {
      t.objectStore('docs').clear();
      rows.forEach(function (r) { t.objectStore('docs').put({ path: r.path, coll: r.coll, doc: r.doc }); });
      t.objectStore('meta').delete('upgrade13');
      t.objectStore('meta').put({ k: 'rolledBackAt', v: new Date().toISOString() });
    });
    return rows.length;
  };
  L.preUpgradeCopy = async function () {
    try {
      var cdb = await openDb(COPY_DB, 1, function (d) { if (!d.objectStoreNames.contains('rows')) d.createObjectStore('rows', { keyPath: 'path' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' }); });
      var rows = await tx(cdb, ['rows'], 'readonly', function (t) { return reqP(t.objectStore('rows').getAll()); });
      cdb.close(); return rows;
    } catch (e) { return []; }
  };

  /* ---------------- start-up ---------------- */
  var lsMode = false;
  var readyP = (async function start() {
    try { idb = await openDb(DB_NAME, DB_VER, mainUpgrade); }
    catch (e) { console.warn('IndexedDB unavailable, using localStorage', e); lsMode = true; L.error = 'This browser blocked the device database when the file is opened directly. Records are kept in the older, smaller browser storage and Google Drive sync is not available. Please start the ERP with the launcher (see the guide) and download a backup file regularly.'; }
    L.backend = lsMode ? 'localstorage' : 'indexeddb';
    try {
      if (lsMode) {
        (await lsBackend.loadAll()).forEach(function (r) { mem.set(r.path, r.doc); });
        var d0 = lsMeta.get('deviceId'); if (!d0) { d0 = 'D-' + uid().slice(0, 8).toUpperCase(); lsMeta.set('deviceId', d0); } L.deviceId = d0;
      } else {
        var dev = await meta.get('deviceId');
        if (!dev) { dev = 'D-' + uid().slice(0, 8).toUpperCase(); await meta.set('deviceId', dev); }
        L.deviceId = dev;
        if (!(await meta.get('createdAt'))) await meta.set('createdAt', new Date().toISOString());
        var rows = await tx(idb, ['docs'], 'readonly', function (t) { return reqP(t.objectStore('docs').getAll()); });
        if (rows.length) rows = await upgradeTo13(rows); else await meta.set('upgrade13', L.upgrade = { from: 'new', to: VERSION, ok: true, before: {}, after: {}, at: new Date().toISOString() });
        var restamp = [], unstamped = [];
        rows.forEach(function (r) {
          if (r.path.indexOf('~tomb/') === 0) { tombs.set(r.doc.path, r.doc); return; }
          if (r.path.indexOf('~conflict/') === 0) { conflicts.set(r.doc.path, r.doc); return; }
          mem.set(r.path, r.doc);
          var s = r.sync || stampLegacy(r.doc);
          /* record changed by v1.2.0 after a rollback/downgrade: give it a new revision so the change is sent */
          if (r.sync && r.sync.hash && r.sync.hash !== hash(canon(r.doc))) restamp.push(r.path);
          if (!r.sync && r.path.charAt(0) !== '~') unstamped.push(r.path);
          smeta.set(r.path, s);
        });
        /* v1.2.0 saves a row without the sync information. If this database was already upgraded, such a row was
           written by v1.2.0 after a rollback: its last known revision is found in the change log, so the edit
           reaches other devices as a normal update (not as a clash). */
        if (unstamped.length && L.upgrade && L.upgrade.from === '1.2.0-local' && L.upgrade.finishedAt) {
          var lastRev = {};
          var log = await tx(idb, ['changes'], 'readonly', function (t) { return reqP(t.objectStore('changes').getAll()); });
          log.forEach(function (c) { if (c.rev) lastRev[c.path] = c.rev; });
          unstamped.forEach(function (p) {
            var lr = lastRev[p]; if (!lr || lr === revOf(mem.get(p))) return;
            smeta.set(p, { rev: lr, hist: [], dev: L.deviceId, at: '', created: (mem.get(p) || {}).createdAt || '', hash: '' });
            restamp.push(p);
          });
        }
        await migrateLegacy();
        for (var i = 0; i < restamp.length; i++) await write(restamp[i], mem.get(restamp[i]), 'restamp', { noReady: true });
      }
      L.docs = mem.size;
    } catch (e) { console.error(e); L.error = 'The device database could not be read: ' + (e && e.message ? e.message : e); }
    try { if (navigator.storage && navigator.storage.persist) L.persisted = (navigator.storage.persisted ? await navigator.storage.persisted() : false) || (await navigator.storage.persist()); } catch (e) { L.persisted = null; }
  })();
  L.ready = readyP;

  /* ---------------- local writes ---------------- */
  function nextSync(path, doc, extraHist) {
    var prev = smeta.get(path) || tombs.get(path) || null;
    var hist = [];
    if (prev) { hist.push(prev.rev); (prev.hist || []).forEach(function (h) { hist.push(h); }); }
    (extraHist || []).forEach(function (h) { if (hist.indexOf(h) < 0) hist.push(h); });
    var seen = {}; hist = hist.filter(function (h) { if (seen[h]) return false; seen[h] = 1; return true; }).slice(0, 80);
    var now = new Date().toISOString();
    var rev = doc ? revOf(doc) : 'del.' + hash(path + '|' + now + '|' + L.deviceId);
    return { rev: rev, hist: hist, dev: L.deviceId, at: now, created: (prev && prev.created) || (doc && doc.createdAt) || now, hash: doc ? hash(canon(doc)) : '' };
  }
  async function write(path, rec, op, opts) {
    opts = opts || {};
    if (!opts.noReady) await readyP;
    var json;
    try { json = rec == null ? null : JSON.parse(JSON.stringify(rec)); } catch (e) { throw fail('invalid_argument', 'This entry could not be saved (invalid data).'); }
    if (lsMode) {
      try { await lsBackend.put(path, json); } catch (e) { throw fail('storage_failed', STORAGE_MSG, e); }
      if (json == null) mem.delete(path); else mem.set(path, json);
      notify(); return;
    }
    var s = nextSync(path, json, opts.extraHist);
    var tomb = json == null && (mem.has(path) || (opts.forceTomb && tombs.has(path))) ? { path: path, rev: s.rev, hist: s.hist, dev: s.dev, at: s.at } : null;
    var seq;
    try {
      await tx(idb, ['docs', 'changes'], 'readwrite', function (t) {
        var docs = t.objectStore('docs');
        if (json == null) { docs.delete(path); if (tomb) docs.put({ path: '~tomb/' + path, coll: '~tomb', doc: tomb }); }
        else { docs.put({ path: path, coll: collOf(path), doc: json, sync: s }); if (tombs.has(path)) docs.delete('~tomb/' + path); }
        if (opts.clearConflict) docs.delete('~conflict/' + path);
        var rq = t.objectStore('changes').add({ path: path, op: op, v: json && json.v != null ? json.v : null, at: s.at, device: L.deviceId, origin: 'local', rev: s.rev });
        rq.onsuccess = function () { seq = rq.result; };
      });
    } catch (e) {
      console.error('local write failed', e && e.name);
      throw fail('storage_failed', STORAGE_MSG, e);
    }
    /* memory is updated only after the disk commit, so the screen never shows an unsaved entry */
    if (json == null) { mem.delete(path); smeta.delete(path); if (tomb) tombs.set(path, tomb); }
    else { mem.set(path, json); smeta.set(path, s); tombs.delete(path); }
    if (opts.clearConflict) conflicts.delete(path);
    notify();
    if (syncable(path)) fireWrite({ path: path, seq: seq, op: op });
  }

  /* ---------------- remote changes from other devices ---------------- */
  function stateOf(path) {
    if (mem.has(path)) return { doc: mem.get(path), sync: smeta.get(path) || stampLegacy(mem.get(path)) };
    if (tombs.has(path)) { var t = tombs.get(path); return { doc: null, del: true, sync: t }; }
    return null;
  }
  L.stateOf = function (path) { var s = stateOf(path); return s ? clone(s) : null; };
  function inHist(sync, rev) { return !!sync && (sync.rev === rev || (sync.hist || []).indexOf(rev) >= 0); }
  function mergeAudit(a, b) {
    var seen = {}, out = [];
    (a.entries || []).concat(b.entries || []).forEach(function (e) { var k = e.at + '|' + e.action + '|' + e.coll + '|' + e.id + '|' + (e.note || ''); if (!seen[k]) { seen[k] = 1; out.push(e); } });
    out.sort(function (x, y) { return String(x.at).localeCompare(String(y.at)); });
    var m = clone(a); m.entries = out; return m;
  }
  /* classify one incoming op against this device: used both to apply and to preview a first connection */
  function classify(op) {
    var cur = stateOf(op.path);
    if (!cur) return op.del ? 'tomb-new' : 'insert';
    if (cur.sync.rev === op.rev) return 'same';
    if ((op.hist || []).indexOf(cur.sync.rev) >= 0) return 'forward';
    if (inHist(cur.sync, op.rev)) return 'stale';
    if (!op.del && !cur.del && bodyHash(cur.doc) === bodyHash(op.doc)) return 'equal';
    if (op.del && cur.del) return 'equal';
    if (op.path.indexOf('audit/') === 0 && !op.del && !cur.del) return 'audit-merge';
    return 'conflict';
  }
  L.classify = function (op) { return classify(op); };

  /* reload memory from disk (used if a batch transaction fails half-way) */
  async function reloadFromDisk() {
    var rows = await tx(idb, ['docs'], 'readonly', function (t) { return reqP(t.objectStore('docs').getAll()); });
    mem.clear(); smeta.clear(); tombs.clear(); conflicts.clear();
    rows.forEach(function (r) {
      if (r.path.indexOf('~tomb/') === 0) tombs.set(r.doc.path, r.doc);
      else if (r.path.indexOf('~conflict/') === 0) conflicts.set(r.doc.path, r.doc);
      else { mem.set(r.path, r.doc); smeta.set(r.path, r.sync || stampLegacy(r.doc)); }
    });
    notify();
  }
  var uniq = function (a) { var s = {}; return a.filter(function (x) { if (!x || s[x]) return false; s[x] = 1; return true; }); };

  /* ops are applied one by one, each against the state left by the previous one, in ONE transaction */
  L.applyRemote = async function (ops) {
    await readyP;
    if (lsMode) throw fail('no_sync', 'Sync needs the device database.');
    var res = { inserted: 0, forwarded: 0, same: 0, stale: 0, merged: 0, conflicts: [], deleted: 0, resolvedElsewhere: 0 };
    var localMerges = [], touched = false;
    try {
      await tx(idb, ['docs', 'changes'], 'readwrite', function (t) {
        var docs = t.objectStore('docs'), ch = t.objectStore('changes');
        ops.forEach(function (op) {
          if (!op || !syncable(op.path)) return;
          var kind = classify(op), cur = stateOf(op.path);
          var rsync = { rev: op.rev, hist: (op.hist || []).slice(0, 80), dev: op.dev, at: op.at, created: op.created || op.at, hash: op.doc ? hash(canon(op.doc)) : '' };
          var putLive = function (doc, sy) { docs.put({ path: op.path, coll: collOf(op.path), doc: doc, sync: sy }); docs.delete('~tomb/' + op.path); mem.set(op.path, doc); smeta.set(op.path, sy); tombs.delete(op.path); touched = true; };
          var putTomb = function (tb) { docs.delete(op.path); docs.put({ path: '~tomb/' + op.path, coll: '~tomb', doc: tb }); mem.delete(op.path); smeta.delete(op.path); tombs.set(op.path, tb); touched = true; };
          var takeRemote = function () {
            if (op.del) { putTomb({ path: op.path, rev: op.rev, hist: rsync.hist, dev: op.dev, at: op.at }); res.deleted++; }
            else putLive(op.doc, rsync);
            ch.add({ path: op.path, op: op.del ? 'remote-delete' : 'remote', v: op.doc && op.doc.v != null ? op.doc.v : null, at: new Date().toISOString(), device: op.dev, origin: 'remote', rev: op.rev });
            /* an open conflict is settled when the incoming version already contains every competing version */
            var cf = conflicts.get(op.path);
            if (cf && (op.hist || []).indexOf(cf.local.rev) >= 0 && cf.remotes.every(function (r) { return r.rev === op.rev || (op.hist || []).indexOf(r.rev) >= 0; })) { docs.delete('~conflict/' + op.path); conflicts.delete(op.path); res.resolvedElsewhere++; }
          };
          if (kind === 'insert' || kind === 'tomb-new') { takeRemote(); res.inserted++; }
          else if (kind === 'forward') { takeRemote(); res.forwarded++; }
          else if (kind === 'same') res.same++;
          else if (kind === 'stale') res.stale++;
          else if (kind === 'equal') {
            /* same content made independently: every device settles on the higher revision */
            var win = op.rev > cur.sync.rev;
            var top = win ? op.rev : cur.sync.rev;
            var h = uniq((cur.sync.hist || []).concat([cur.sync.rev], op.hist || [], [op.rev])).filter(function (x) { return x !== top; }).slice(0, 80);
            if (op.del && cur.del) putTomb({ path: op.path, rev: top, hist: h, dev: win ? op.dev : cur.sync.dev, at: win ? op.at : cur.sync.at });
            else { var d = win ? op.doc : cur.doc; putLive(d, { rev: top, hist: h, dev: win ? op.dev : cur.sync.dev, at: win ? op.at : cur.sync.at, created: cur.sync.created || op.created, hash: hash(canon(d)) }); }
            res.merged++;
          } else if (kind === 'audit-merge') { localMerges.push({ path: op.path, doc: mergeAudit(cur.doc, op.doc), extra: [op.rev].concat(op.hist || []) }); res.merged++; }
          else {
            var c = clone(conflicts.get(op.path) || { path: op.path, coll: collOf(op.path), local: null, remotes: [], detectedAt: new Date().toISOString() });
            c.local = { rev: cur.sync.rev, dev: cur.sync.dev, at: cur.sync.at, del: !!cur.del, doc: cur.doc ? clone(cur.doc) : null };
            if (!c.remotes.some(function (r) { return r.rev === op.rev; })) c.remotes.push({ rev: op.rev, hist: (op.hist || []).slice(0, 80), dev: op.dev, devName: op.devName || '', at: op.at, del: !!op.del, doc: op.doc ? clone(op.doc) : null });
            c.remotes = c.remotes.filter(function (r) { return !c.remotes.some(function (o) { return o !== r && (o.hist || []).indexOf(r.rev) >= 0; }); });
            docs.put({ path: '~conflict/' + op.path, coll: '~conflict', doc: c }); conflicts.set(op.path, c); touched = true;
            res.conflicts.push(op.path);
          }
        });
      });
    } catch (e) { await reloadFromDisk(); throw fail('apply_failed', 'Could not save records received from Google Drive on this device: ' + (e && e.message ? e.message : e)); }
    for (var i = 0; i < localMerges.length; i++) await write(localMerges[i].path, localMerges[i].doc, 'merge', { extraHist: localMerges[i].extra });
    if (touched) notify();
    return res;
  };

  /* ---------------- conflicts ---------------- */
  L.conflicts = function () { return Array.from(conflicts.values()).map(clone); };
  L.conflictCount = function () { return conflicts.size; };
  /* choice: 'local' (keep this device's version) or a remote rev (take that version). Both versions' lineage is kept. */
  L.resolveConflict = async function (path, choice) {
    await readyP;
    var c = conflicts.get(path); if (!c) throw fail('not_found', 'This conflict was already settled.');
    var extra = [];
    c.remotes.forEach(function (r) { extra.push(r.rev); (r.hist || []).forEach(function (h) { extra.push(h); }); });
    var cur = stateOf(path);
    var keep, discarded;
    if (choice === 'local') { keep = cur ? cur.doc : null; discarded = c.remotes; }
    else {
      var r = c.remotes.filter(function (x) { return x.rev === choice; })[0]; if (!r) throw fail('not_found', 'That version is no longer available.');
      keep = r.del ? null : r.doc;
      discarded = [{ rev: cur ? cur.sync.rev : '', dev: cur ? cur.sync.dev : '', at: cur ? cur.sync.at : '', del: !cur || !!cur.del, doc: cur ? cur.doc : null }].concat(c.remotes.filter(function (x) { return x.rev !== choice; }));
      if (cur) extra.push(cur.sync.rev);
    }
    if (keep) {
      /* a new revision that descends from every competing version, so all devices take it */
      var d = clone(keep); d.v = Math.max.apply(null, [d.v || 0, cur && cur.doc ? cur.doc.v || 0 : 0].concat(c.remotes.map(function (x) { return x.doc ? x.doc.v || 0 : 0; }))) + 1;
      d.updatedAt = new Date().toISOString();
      await write(path, d, 'resolve', { extraHist: extra, clearConflict: true });
    } else {
      /* "keep it deleted": a new delete marker that descends from every competing version, so every device settles */
      if (mem.has(path) || tombs.has(path)) await write(path, null, 'resolve', { extraHist: extra, clearConflict: true, forceTomb: true });
      else { await tx(idb, ['docs'], 'readwrite', function (t) { t.objectStore('docs').delete('~conflict/' + path); }); conflicts.delete(path); notify(); }
    }
    return { kept: keep ? 'record' : 'deleted', discarded: discarded };
  };

  /* ---------------- queue for upload ---------------- */
  L.maxSeq = async function () { await readyP; if (lsMode) return 0; return tx(idb, ['changes'], 'readonly', function (t) { return new Promise(function (res) { var c = t.objectStore('changes').openCursor(null, 'prev'); c.onsuccess = function () { res(c.result ? c.result.key : 0); }; }); }).then(function (p) { return p; }); };
  L.changesAfter = async function (seq, limit) {
    await readyP; if (lsMode) return [];
    var rows = await tx(idb, ['changes'], 'readonly', function (t) { return reqP(t.objectStore('changes').getAll(IDBKeyRange.lowerBound(seq || 0, true), limit || 2000)); });
    return rows;
  };
  /* everything this device has that other devices need: used once on the first connection */
  L.enqueueAll = async function () {
    await readyP;
    var paths = [];
    mem.forEach(function (d, p) { if (syncable(p)) paths.push(p); });
    tombs.forEach(function (t, p) { if (syncable(p)) paths.push(p); });
    var at = new Date().toISOString();
    await tx(idb, ['changes'], 'readwrite', function (t) { paths.forEach(function (p) { var s = smeta.get(p) || tombs.get(p); t.objectStore('changes').add({ path: p, op: 'enqueue', v: null, at: at, device: L.deviceId, origin: 'local', rev: s ? s.rev : '' }); }); });
    return paths.length;
  };
  /* send these records again (repair of a change file another device could not read) */
  L.enqueuePaths = async function (paths, op) {
    await readyP; var at = new Date().toISOString();
    paths = paths.filter(function (p) { return syncable(p) && (mem.has(p) || tombs.has(p)); });
    if (!paths.length) return 0;
    await tx(idb, ['changes'], 'readwrite', function (t) { paths.forEach(function (p) { var s = smeta.get(p) || tombs.get(p); t.objectStore('changes').add({ path: p, op: op || 'resend', v: null, at: at, device: L.deviceId, origin: 'local', rev: s ? s.rev : '' }); }); });
    return paths.length;
  };
  L.changesRange = async function (from, to) { await readyP; return tx(idb, ['changes'], 'readonly', function (t) { return reqP(t.objectStore('changes').getAll(IDBKeyRange.bound(from, to))); }); };
  /* the op to upload for a path = its CURRENT state (earlier revisions are in its history) */
  L.opFor = function (path) {
    var s = stateOf(path); if (!s) return null;
    return { path: path, doc: s.doc ? clone(s.doc) : null, del: !!s.del, rev: s.sync.rev, hist: (s.sync.hist || []).slice(0, 80), dev: s.sync.dev === 'legacy' ? L.deviceId : s.sync.dev, at: s.sync.at, created: s.sync.created || '' };
  };
  L.syncablePaths = function () { var out = []; mem.forEach(function (d, p) { if (syncable(p)) out.push(p); }); tombs.forEach(function (t, p) { if (syncable(p)) out.push(p); }); return out; };
  L.isEmpty = function () { var n = 0; mem.forEach(function (d, p) { if (BUSINESS.indexOf(p.split('/')[0]) >= 0) n++; }); return n === 0; };
  L.businessCount = function () { var n = 0; mem.forEach(function (d, p) { if (BUSINESS.indexOf(p.split('/')[0]) >= 0) n++; }); return n; };
  /* "Replace this device's data with Google Drive data" (only after a backup file was taken by the screen) */
  L.clearBusinessData = async function () {
    await readyP;
    var paths = []; mem.forEach(function (d, p) { if (syncable(p) && p.indexOf('audit/') !== 0) paths.push(p); });   /* this device's audit history is kept */
    await tx(idb, ['docs'], 'readwrite', function (t) { paths.forEach(function (p) { t.objectStore('docs').delete(p); t.objectStore('docs').delete('~tomb/' + p); }); });
    paths.forEach(function (p) { mem.delete(p); smeta.delete(p); tombs.delete(p); });
    notify(); return paths.length;
  };

  /* ---------------- Firestore-style API used by erp/store.js (unchanged) ---------------- */
  var snapDoc = function (path) { var d = mem.get(path); return { id: path.split('/').pop(), exists: d != null, data: function () { return d != null ? clone(d) : undefined; }, metadata: { fromCache: false, hasPendingWrites: false } }; };
  function compare(a, op, v) {
    switch (op) {
      case '==': return a === v || (a != null && v != null && String(a) === String(v));
      case '!=': return !(a === v || (a != null && v != null && String(a) === String(v)));
      case '>': return a > v; case '>=': return a >= v; case '<': return a < v; case '<=': return a <= v;
      case 'in': return Array.isArray(v) && v.map(String).indexOf(String(a)) >= 0;
      default: return true;
    }
  }
  function query(coll, filters, order, lim) {
    filters = filters || []; order = order || null; lim = lim || 0;
    var depth = coll.split('/').length + 1;
    function run() {
      var docs = [];
      mem.forEach(function (d, p) { if (p.split('/').length === depth && p.indexOf(coll + '/') === 0) docs.push(snapDoc(p)); });
      filters.forEach(function (f) { docs = docs.filter(function (d) { return compare((d.data() || {})[f[0]], f[1], f[2]); }); });
      if (order) docs.sort(function (a, b) { var x = (a.data() || {})[order[0]], y = (b.data() || {})[order[0]]; return (x > y ? 1 : x < y ? -1 : 0) * (order[1] === 'desc' ? -1 : 1); });
      else docs.sort(function (a, b) { return a.id > b.id ? 1 : a.id < b.id ? -1 : 0; });
      if (lim) docs = docs.slice(0, lim);
      return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: { fromCache: false, hasPendingWrites: false } };
    }
    return {
      path: coll,
      where: function (f, op, v) { return query(coll, filters.concat([[f, op, v]]), order, lim); },
      orderBy: function (f, d) { return query(coll, filters, [f, d || 'asc'], lim); },
      limit: function (n) { return query(coll, filters, order, n); },
      get: function () { return readyP.then(run); },
      onSnapshot: function (next) { var l = function () { next(run()); }; readyP.then(function () { listeners.add(l); l(); }); return function () { listeners.delete(l); }; },
      doc: function (id) { return docRef(coll + '/' + (id || uid())); },
      add: function (data) { var r = docRef(coll + '/' + uid()); return r.set(data).then(function () { return r; }); },
    };
  }
  function docRef(path) {
    return {
      id: path.split('/').pop(), path: path,
      get: function () { return readyP.then(function () { return snapDoc(path); }); },
      set: function (d) { return write(path, d, 'set'); },
      update: function (d) { return readyP.then(function () { var cur = mem.get(path); if (cur == null) throw fail('invalid_argument', 'Record missing'); var n = clone(cur); Object.keys(d || {}).forEach(function (k) { n[k] = d[k]; }); return write(path, n, 'update'); }); },
      delete: function () { return write(path, null, 'delete'); },
      acquire: function () { return Promise.resolve({ acquired: true }); },
      onSnapshot: function (next) { var l = function () { next(snapDoc(path)); }; readyP.then(function () { listeners.add(l); l(); }); return function () { listeners.delete(l); }; },
      collection: function (c) { return query(path + '/' + c); },
    };
  }
  var db = { doc: docRef, collection: function (c) { return query(c); } };

  var OWNER = 'local-owner';
  var user = {
    id: function () { return Promise.resolve(OWNER); },
    me: function () { return Promise.resolve({ id: OWNER, name: 'CHIRAG ENTERPRISES OWNER' }); },
    isOwner: function () { return true; }, canEdit: function () { return true; }, can: function () { return true; }, role: function () { return 'admin'; },
    profiles: function (ids) { var o = {}; ids.forEach(function (i) { o[i] = { name: i === OWNER ? 'Owner' : i }; }); return Promise.resolve(o); },
  };
  var downloads = {
    save: function (o) {
      var data = o.data, filename = o.filename;
      var blob = data instanceof Blob ? data : new Blob([data], { type: /\.json$/i.test(filename) ? 'application/json' : /\.csv$/i.test(filename) ? 'text/csv' : 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename; a.rel = 'noopener'; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
      return Promise.resolve({ status: 'saved' });
    },
  };
  L.allIn = function (coll) { return readyP.then(function () { var out = []; mem.forEach(function (d, p) { if (collOf(p) === coll) out.push({ id: p.split('/').pop(), doc: clone(d) }); }); return out; }); };
  L.estimate = function () { try { return navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null); } catch (e) { return Promise.resolve(null); } };
  /* Google sign-in cannot return to a file:// page, so sync needs http://localhost (launcher) or https */
  L.syncAvailable = function () { return !lsMode && location.protocol !== 'file:' && !!(window.crypto && crypto.subtle) && window.isSecureContext !== false; };

  /* ---------------- moving records between two addresses of this ERP on the same device ---------------- */
  L.dumpRows = async function () {
    await readyP; var out = [];
    mem.forEach(function (d, p) { if (p.indexOf('backups/') !== 0 && p !== 'settings/restoreLog') out.push({ path: p, doc: clone(d) }); });
    return out;
  };
  /* adds every record this database does not have yet; a record that exists here with other content is NOT
     overwritten (counted as "kept") — so moving can never destroy anything */
  L.importRows = async function (rows, note) {
    await readyP; if (lsMode) throw fail('no_idb', 'The device database is not available.');
    var r = { added: 0, same: 0, kept: 0, keptList: [] }, puts = [];
    rows.forEach(function (x) {
      if (!x || !x.path || x.path.charAt(0) === '~' || !x.doc) return;
      if (!mem.has(x.path)) { puts.push(x); r.added++; }
      else if (hash(canon(mem.get(x.path))) === hash(canon(x.doc))) r.same++;
      else { r.kept++; r.keptList.push(x.path); }
    });
    await tx(idb, ['docs', 'changes'], 'readwrite', function (t) {
      puts.forEach(function (x) { var s = stampLegacy(x.doc); t.objectStore('docs').put({ path: x.path, coll: collOf(x.path), doc: x.doc, sync: s }); t.objectStore('changes').add({ path: x.path, op: 'import', v: x.doc.v != null ? x.doc.v : null, at: new Date().toISOString(), device: L.deviceId, origin: 'local', rev: s.rev, note: note || '' }); });
    });
    puts.forEach(function (x) { mem.set(x.path, x.doc); smeta.set(x.path, stampLegacy(x.doc)); });
    if (puts.length) notify();
    return r;
  };

  window.claude = { use: function (n) { return readyP.then(function () { return n === 'db' ? db : n === 'user' ? user : n === 'downloads' ? downloads : null; }); } };
})();
