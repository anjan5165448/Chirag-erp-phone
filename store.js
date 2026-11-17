/* Cloud data layer: live subscriptions, versioned writes with conflict checks,
   audit trail, offline outbox, soft delete / restore / permanent delete, snapshots. */
(function (G) {
  'use strict';
  const COLLS = ['purchases', 'unloading', 'production', 'sales', 'mistri', 'expenses', 'payments', 'adjustments', 'parties'];
  const ST = G.ST = {
    db: null, user: null, downloads: null, me: { id: null, name: '' }, role: 'viewer', ready: false, status: 'connecting', statusNote: '',
    data: Object.fromEntries(COLLS.map((c) => [c, []])), loaded: new Set(), settings: {}, outbox: [], ver: 0, names: {}, listeners: [], device: null,
  };
  const emit = () => { ST.ver++; ST.listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); };
  ST.onChange = (f) => ST.listeners.push(f);
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
  const safeSeg = (s) => String(s || '').replace(/[^A-Za-z0-9_\-.~:@+]/g, '-').slice(0, 150) || 'x';
  ST.safeSeg = safeSeg;
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  ST.today = today;
  const rid = (p) => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  ST.rid = rid;

  async function init(useFn) {
    ST.device = ls.get('ce.device', null) || rid('D'); ls.set('ce.device', ST.device);
    ST.outbox = ls.get('ce.outbox', []);
    const timer = setTimeout(() => { if (!ST.ready) { ST.status = 'slow'; ST.statusNote = 'Cloud database not reachable yet. Showing nothing rather than stale data.'; emit(); } }, 10000);
    let db = null, user = null;
    try { [db, user, ST.downloads] = await Promise.all([useFn('db'), useFn('user'), useFn('downloads')]); } catch (e) { console.error(e); }
    ST.db = db; ST.user = user;
    if (!db) { clearTimeout(timer); ST.status = 'nodb'; ST.statusNote = 'Cloud database unavailable in this view. Open the app from claude.ai while signed in.'; ST.role = 'viewer'; emit(); return; }
    try {
      const me = user ? await user.me() : null; ST.me = { id: user ? await user.id() : null, name: (me && me.name) || '' };
      let canW = user ? await user.can('data.write') : null;
      ST.role = user && (await user.canEdit()) ? 'admin' : canW === false ? 'viewer' : 'operator';
    } catch (e) { ST.role = 'operator'; }
    const done = (c) => { ST.loaded.add(c); if (ST.loaded.size >= COLLS.length + 1 && !ST.ready) { ST.ready = true; clearTimeout(timer); ST.status = ST.outbox.length ? 'pending' : 'live'; ST.statusNote = ''; } emit(); };
    COLLS.forEach((c) => {
      db.collection(c).onSnapshot((snap) => { ST.data[c] = snap.docs.map((d) => ({ ...d.data(), id: d.id })); if (!snap.metadata.fromCache) done(c); else emit(); },
        (e) => { ST.status = 'error'; ST.statusNote = `Sync stopped (${e.code}). Reopen the app.`; emit(); });
    });
    db.doc('settings/main').onSnapshot((d) => { ST.settings = d.exists ? d.data() : {}; if (!d.metadata.fromCache) done('settings'); else emit(); }, () => {});
    G.addEventListener('online', flush); setInterval(flush, 20000); flush(); setInterval(drainAuditQ, 20000); drainAuditQ();
  }

  /* view = server rows merged with not-yet-synced local writes */
  ST.rows = (c) => {
    const pend = ST.outbox.filter((o) => o.coll === c);
    if (!pend.length) return ST.data[c];
    const m = new Map(ST.data[c].map((r) => [r.id, r]));
    pend.forEach((o) => m.set(o.id, { ...o.rec, _pending: true }));
    return [...m.values()];
  };
  ST.all = () => Object.fromEntries(COLLS.map((c) => [c, ST.rows(c)]));
  ST.get = (c, id) => ST.rows(c).find((r) => r.id === id);

  const canWrite = () => ST.db && ST.role !== 'viewer';
  function err(code, message) { const e = new Error(message); e.code = code; return e; }

  function diff(a, b) {
    const out = {}; const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    keys.forEach((k) => { if (['v', 'updatedAt', 'updatedBy', '_pending'].includes(k)) return; const x = JSON.stringify((a || {})[k]), y = JSON.stringify((b || {})[k]); if (x !== y) out[k] = [(a || {})[k] ?? null, (b || {})[k] ?? null]; });
    return out;
  }

  let auditChain = Promise.resolve();
  function audit(action, coll, id, before, after, note, snapOverride) {
    const e = { at: new Date().toISOString(), by: ST.me.id, action, coll, id, note: note || '', changes: action === 'edit' ? diff(before, after) : null, snap: snapOverride !== undefined ? snapOverride : (action === 'create' || action === 'purge' ? stripMeta(after || before) : null) };
    return appendAudit([e]);
  }
  /* one failed append must never block the ones after it; entries that cannot be written yet are queued
     (with their original time and details) and written as soon as the database is available */
  function appendAudit(list) {
    auditChain = auditChain.catch(() => {}).then(async () => {
      try {
        if (!ST.db) throw new Error('database not ready');
        const key = `${today()}_${safeSeg(ST.me.id || 'anon')}_${safeSeg(ST.device)}`;
        const ref = ST.db.doc('audit/' + key);
        const d = await ref.get();
        const entries = d.exists ? [...(d.data().entries || []), ...list] : [...list];
        await ref.set({ day: today(), by: ST.me.id, device: ST.device, entries });
      } catch (x) { const q = ls.get('ce.auditq', []); ls.set('ce.auditq', q.concat(list)); }
    });
    return auditChain;
  }
  function drainAuditQ() { if (!ST.db) return; const q = ls.get('ce.auditq', []); if (!q.length) return; ls.set('ce.auditq', []); appendAudit(q); }
  ST.drainAuditQ = drainAuditQ;
  const stripMeta = (r) => { if (!r) return r; const { _pending, ...rest } = r; return rest; };

  /* create or edit — versioned, conflict-checked, audited */
  async function save(coll, rec, before, note) {
    if (!canWrite()) throw err('readonly', 'You have view-only access.');
    const isNew = !before;
    const now = new Date().toISOString();
    const out = { ...stripMeta(before || {}), ...stripMeta(rec), v: ((before && before.v) || 0) + 1, updatedAt: now, updatedBy: ST.me.id };
    if (isNew) { out.createdAt = now; out.createdBy = ST.me.id; out.deleted = false; }
    const ref = ST.db.doc(`${coll}/${rec.id}`);
    try {
      const cur = await ref.get();
      if (isNew && cur.exists) throw err('duplicate', `A record with ID ${rec.id} already exists. Nothing was saved.`);
      if (!isNew && cur.exists && (cur.data().v || 0) !== (before.v || 0)) throw err('conflict', 'This record was changed on another device after you opened it. Close the form and open it again to see the latest version.');
      await ref.set(out);
    } catch (e) {
      if (e.code === 'duplicate' || e.code === 'conflict' || e.code === 'invalid_argument' || e.code === 'quota_exceeded' || e.code === 'storage_failed') throw e;
      if (G.ERP_HOST === 'local') throw e; /* device-local: there is no server to sync to later, so never park an entry in a temporary queue */
      if (!navigatorOnline() || e.code === 'unavailable' || e.code === 'resource_exhausted' || !e.code) { queue(coll, out, before, isNew ? 'create' : 'edit', note); return { pending: true }; }
      throw e;
    }
    audit(isNew ? 'create' : (rec.deleted && !before.deleted ? 'delete' : (!rec.deleted && before.deleted ? 'restore' : 'edit')), coll, rec.id, before, out, note);
    return { pending: false };
  }
  const navigatorOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

  function queue(coll, rec, before, action, note) {
    ST.outbox = ST.outbox.filter((o) => !(o.coll === coll && o.id === rec.id));
    ST.outbox.push({ coll, id: rec.id, rec, baseV: before ? before.v || 0 : 0, isNew: !before, action, note, at: Date.now() });
    ls.set('ce.outbox', ST.outbox); ST.status = 'pending'; emit();
  }
  let flushing = false;
  async function flush() {
    if (flushing || !ST.db || !ST.outbox.length || !navigatorOnline()) return;
    flushing = true;
    try {
      for (const o of [...ST.outbox]) {
        const ref = ST.db.doc(`${o.coll}/${o.id}`);
        try {
          const cur = await ref.get();
          const curV = cur.exists ? cur.data().v || 0 : 0;
          if ((o.isNew && cur.exists) || (!o.isNew && curV !== o.baseV)) {
            ST.conflicts = (ST.conflicts || []).concat([{ ...o, server: cur.exists ? cur.data() : null }]);
            ls.set('ce.conflicts', ST.conflicts);
          } else { await ref.set(o.rec); audit(o.action, o.coll, o.id, o.isNew ? null : cur.data(), o.rec, (o.note || '') + ' [synced from offline entry]'); }
          ST.outbox = ST.outbox.filter((x) => x !== o); ls.set('ce.outbox', ST.outbox);
        } catch (e) { if (e.code === 'invalid_argument') { ST.outbox = ST.outbox.filter((x) => x !== o); ls.set('ce.outbox', ST.outbox); } break; }
      }
      drainAuditQ();
    } finally { flushing = false; ST.status = ST.outbox.length ? 'pending' : (ST.ready ? 'live' : ST.status); emit(); }
  }
  ST.conflicts = ls.get('ce.conflicts', []);
  ST.clearConflicts = () => { ST.conflicts = []; ls.set('ce.conflicts', []); emit(); };

  const softDelete = (coll, rec, reason) => save(coll, { ...rec, deleted: true, deletedAt: new Date().toISOString(), deletedBy: ST.me.id, deleteReason: reason || '' }, rec, reason);
  const restore = (coll, rec) => save(coll, { ...rec, deleted: false, restoredAt: new Date().toISOString(), restoredBy: ST.me.id }, rec, 'restored');
  async function purge(coll, rec) {
    if (ST.role !== 'admin') throw err('forbidden', 'Only an admin can permanently delete.');
    if (!rec.deleted) throw err('forbidden', 'Move the record to Deleted Records first.');
    await ST.db.doc(`${coll}/${rec.id}`).delete();
    if (rec.attachmentId) { try { await ST.db.doc('attachments/' + rec.attachmentId).delete(); } catch (e) {} }
    await audit('purge', coll, rec.id, rec, null, 'permanent delete');
  }
  async function saveSettings(s) {
    if (ST.role !== 'admin') throw err('forbidden', 'Only an admin can change settings.');
    const before = ST.settings; const out = { ...before, ...s, v: (before.v || 0) + 1, updatedAt: new Date().toISOString(), updatedBy: ST.me.id };
    await ST.db.doc('settings/main').set(out); await audit('edit', 'settings', 'main', before, out);
  }
  async function exists(coll, id) { const d = await ST.db.doc(`${coll}/${id}`).get(); return d.exists; }

  async function auditLog(limit) { const s = await ST.db.collection('audit').orderBy('day', 'desc').limit(limit || 60).get(); return s.docs.map((d) => d.data()); }
  async function names(ids) {
    const need = [...new Set(ids.filter((i) => i && !(i in ST.names)))];
    if (need.length && ST.user && ST.user.profiles) { try { const ps = await ST.user.profiles(need); need.forEach((i) => { ST.names[i] = (ps[i] && ps[i].name) || 'Someone'; }); } catch (e) {} }
    return ST.names;
  }

  /* attachments: small images/PDFs kept as their own documents */
  async function putAttachment(file) {
    let data, type = file.type || '';
    if (type.startsWith('image/')) data = await shrinkImage(file);
    else { if (file.size > 170000) throw err('too_large', 'PDF/receipt files must be under 170 KB. Take a photo instead.'); data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); }); }
    const id = rid('A');
    await ST.db.doc('attachments/' + id).set({ name: file.name, type: type.startsWith('image/') ? 'image/jpeg' : type, data, at: new Date().toISOString(), by: ST.me.id });
    return id;
  }
  async function getAttachment(id) { const d = await ST.db.doc('attachments/' + id).get(); return d.exists ? d.data() : null; }
  async function shrinkImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      let max = 1400, q = 0.72, out = '';
      for (let t = 0; t < 5; t++) {
        const sc = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        out = c.toDataURL('image/jpeg', q); if (out.length < 190000) return out; max *= 0.75; q -= 0.08;
      }
      return out;
    } finally { URL.revokeObjectURL(url); }
  }

  /* backups */
  function backupObject() {
    return { app: 'chirag-erp', format: 1, createdAt: new Date().toISOString(), by: ST.me.id, settings: ST.settings, data: Object.fromEntries(COLLS.map((c) => [c, ST.data[c]])) };
  }
  /* ---- full backup file: records + settings + bill photos + audit trail, with a checksum ---- */
  function checksum(str) { /* two independent 32-bit FNV-1a style hashes → 16 hex chars; detects damaged or edited files */
    let h1 = 0x811c9dc5, h2 = 0x01000193 ^ str.length;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822507) ^ (h2 >>> 13); }
    return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
  }
  const bodyOf = (o) => JSON.stringify({ settings: o.settings || {}, data: o.data || {}, attachments: o.attachments || [], audit: o.audit || [] });
  ST.checksum = checksum;
  async function fullBackup() {
    const o = backupObject();
    const L = G.ERP_LOCAL;
    if (L && L.allIn) {
      o.attachments = (await L.allIn('attachments')).map((x) => ({ ...x.doc, id: x.id }));
      o.audit = (await L.allIn('audit')).map((x) => ({ ...x.doc, id: x.id }));
    } else { o.attachments = []; o.audit = []; }
    o.format = 2; o.appVersion = (L && L.version) || ''; o.device = (L && L.deviceId) || ST.device;
    o.backupId = 'B-' + o.createdAt.replace(/[^0-9]/g, '').slice(0, 14) + '-' + safeSeg(o.device);
    o.counts = Object.fromEntries(COLLS.map((c) => [c, (o.data[c] || []).length])); o.counts.attachments = o.attachments.length; o.counts.audit = o.audit.length;
    o.checksum = checksum(bodyOf(o));
    return o;
  }
  /* integrity check before any restore: nothing is written if the file is damaged */
  function verifyBackup(o) {
    const problems = [];
    if (!o || typeof o !== 'object' || o.app !== 'chirag-erp') return { ok: false, problems: ['This is not a Chirag ERP backup file.'] };
    if (!o.data || typeof o.data !== 'object') return { ok: false, problems: ['The backup has no data section.'] };
    let records = 0;
    COLLS.forEach((c) => {
      const a = o.data[c]; if (a == null) return;
      if (!Array.isArray(a)) { problems.push(`${c}: not a list`); return; }
      const ids = new Set();
      a.forEach((r, i) => { if (!r || typeof r !== 'object' || !r.id) problems.push(`${c} #${i + 1}: record has no ID`); else if (ids.has(r.id)) problems.push(`${c}: ID ${r.id} appears twice`); else ids.add(r.id); });
      records += a.length;
      if (o.counts && o.counts[c] != null && o.counts[c] !== a.length) problems.push(`${c}: file says ${o.counts[c]} records but contains ${a.length}`);
    });
    if (o.attachments != null && !Array.isArray(o.attachments)) problems.push('attachments: not a list');
    let checksumOk = null;
    if (o.checksum) { checksumOk = checksum(bodyOf(o)) === o.checksum; if (!checksumOk) problems.push('Checksum does not match: the file was damaged or edited after it was made.'); }
    return { ok: !problems.length, problems, records, checksumOk, attachments: (o.attachments || []).length, audit: (o.audit || []).length };
  }
  async function restoreLog() { try { const d = await ST.db.doc('settings/restoreLog').get(); return d.exists ? d.data().entries || [] : []; } catch (e) { return []; } }
  async function restoredBefore(o) { const key = o.backupId || o.checksum || o.createdAt; return (await restoreLog()).filter((x) => x.key === key); }
  const CHUNK = 110000;
  async function snapshot() {
    const s = JSON.stringify(backupObject()); const day = today(); const parts = Math.ceil(s.length / CHUNK) || 1;
    for (let i = 0; i < parts; i++) await ST.db.doc(`backups/${day}_${String(i).padStart(3, '0')}`).set({ day, part: i, parts, at: new Date().toISOString(), payload: s.slice(i * CHUNK, (i + 1) * CHUNK) });
    const all = await ST.db.collection('backups').get();
    const latest = {}; all.docs.forEach((d) => { const x = d.data(); if (x.day === day && x.part >= parts) d && ST.db.doc('backups/' + d.id).delete(); latest[x.day] = true; });
    const days = Object.keys(latest).sort().reverse(); const keep = new Set(days.slice(0, 7));
    for (const d of all.docs) if (!keep.has(d.data().day)) await ST.db.doc('backups/' + d.id).delete();
    await audit('backup', 'backups', day, null, null, `${parts} part(s), ${s.length} bytes`);
    ST.settings = { ...ST.settings }; return { day, parts, bytes: s.length };
  }
  async function snapshots() {
    const all = await ST.db.collection('backups').get(); const by = {};
    all.docs.forEach((d) => { const x = d.data(); const b = (by[x.day] = by[x.day] || { day: x.day, at: x.at, parts: x.parts, have: 0, size: 0 }); b.have++; b.size += (x.payload || '').length; });
    return Object.values(by).sort((a, b) => b.day.localeCompare(a.day));
  }
  async function loadSnapshot(day) {
    const all = await ST.db.collection('backups').where('day', '==', day).get();
    const ps = all.docs.map((d) => d.data()).sort((a, b) => a.part - b.part);
    if (!ps.length || ps.length !== ps[0].parts) throw err('incomplete', 'This snapshot is incomplete.');
    return JSON.parse(ps.map((p) => p.payload).join(''));
  }
  async function autoSnapshot() {
    if (ST.role !== 'admin' || !ST.ready) return null;
    try { const list = await snapshots(); if (list[0] && list[0].day === today()) return null; return await snapshot(); } catch (e) { console.warn('snapshot', e); return null; }
  }
  /* merge-restore: writes every record of the backup back (incl. its deleted flag); records created after the backup are kept */
  async function restoreBackup(obj, progress) {
    if (ST.role !== 'admin') throw err('forbidden', 'Only an admin can restore.');
    if (!obj || obj.app !== 'chirag-erp' || !obj.data) throw err('bad', 'This is not a Chirag ERP backup file.');
    const chk = verifyBackup(obj); if (!chk.ok) throw err('bad', 'Backup file failed the integrity check: ' + chk.problems.slice(0, 3).join('; '));
    let n = 0, total = COLLS.reduce((a, c) => a + ((obj.data[c] || []).length), 0);
    for (const c of COLLS) for (const r of obj.data[c] || []) {
      if (!r || !r.id) continue; const { id, _pending, ...body } = r; const cur = ST.data[c].find((x) => x.id === id);
      body.v = (cur ? cur.v || 0 : body.v || 0) + 1; body.restoredFromBackup = obj.createdAt;
      await ST.db.doc(`${c}/${safeSeg(id)}`).set(body); n++; if (progress) progress(n, total);
    }
    if (obj.settings && Object.keys(obj.settings).length) await ST.db.doc('settings/main').set({ ...obj.settings, v: (ST.settings.v || 0) + 1 });
    /* bill photos: added only if this device does not have them yet */
    let att = 0;
    for (const a of obj.attachments || []) { if (!a || !a.id) continue; const { id, ...body } = a; const ref = ST.db.doc('attachments/' + safeSeg(id)); const cur = await ref.get(); if (!cur.exists) { await ref.set(body); att++; } }
    /* audit trail: pages merged, never replaced, so history on this device is kept */
    for (const p of obj.audit || []) {
      if (!p || !p.id) continue; const { id, ...body } = p; const ref = ST.db.doc('audit/' + safeSeg(id)); const cur = await ref.get();
      if (!cur.exists) await ref.set(body);
      else { const have = cur.data(); const seen = new Set((have.entries || []).map((e) => e.at + '|' + e.action + '|' + e.id)); const add = (body.entries || []).filter((e) => !seen.has(e.at + '|' + e.action + '|' + e.id)); if (add.length) await ref.set({ ...have, entries: [...(have.entries || []), ...add].sort((a, b) => String(a.at).localeCompare(String(b.at))) }); }
    }
    const log = await restoreLog();
    await ST.db.doc('settings/restoreLog').set({ entries: [...log, { key: obj.backupId || obj.checksum || obj.createdAt, backupId: obj.backupId || '', createdAt: obj.createdAt, at: new Date().toISOString(), records: n, attachments: att }].slice(-200) });
    await audit('restore-backup', 'all', obj.createdAt, null, null, `${n} records restored${att ? `, ${att} attachments` : ''}${obj.backupId ? ' from ' + obj.backupId : ''}${obj.fromDrive ? ' (Google Drive file ' + obj.fromDrive + ')' : ''}`);
    return n;
  }

  /* sync, restore, conflict and key events from the Google Drive module (snap keeps a discarded version) */
  ST.logEvent = (action, note, snap) => audit(action, 'sync', '', null, null, note, snap === undefined ? null : snap);
  Object.assign(ST, { fullBackup, verifyBackup, restoredBefore, restoreLog, COLLS, init, save, softDelete, restore, purge, saveSettings, exists, auditLog, names, putAttachment, getAttachment, backupObject, snapshot, snapshots, loadSnapshot, autoSnapshot, restoreBackup, flush, canWrite, ls });
})(typeof window !== 'undefined' ? window : globalThis);
