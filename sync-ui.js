/* CHIRAG ENTERPRISES ERP v1.3.0 — screens for Google Drive backup & sync, conflicts and the upgrade report.
 * Loaded after app.js; uses its helpers (dialog, esc, toast, render, saveFile, confirmRestore, downloadBackup, route). */
{
'use strict';
const { $, esc, dialog, toast, render, saveFile, confirmRestore, downloadBackup, LOC, lastBackupFile, alerts } = window.ERPUI;
const ST = window.ST;
const SY = () => (window.ERP_SYNC ? ERP_SYNC.state() : { available: false });
const tm = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const hm = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');

/* ---------- top bar ---------- */
function syncLabel() {
  const s = SY();
  if (!s.connected) return `<span class="dot live"></span>Saved on this device`;
  if (s.busy || s.status === 'syncing') return `<span class="dot pending"></span>Saved on this device · Syncing…`;
  if (s.pending) return `<span class="dot pending"></span>Saved on this device · Waiting to sync (${s.pending})`;
  if (s.status === 'synced') return `<span class="dot live"></span>Synced to Google Drive · ${esc(hm(s.lastSync))}`;
  if (s.status === 'reauth') return `<span class="dot pending"></span>Saved on this device · Google sign-in needed`;
  if (s.status === 'error') return `<span class="dot err"></span>Saved on this device · Sync problem`;
  return `<span class="dot live"></span>Saved on this device`;
}

/* ---------- dashboard panel + banners ---------- */
function syncBanners(r) {
  let h = '';
  const s = SY();
  if (s.conflicts) h += `<div class="note bad" role="alert" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:200px"><b>${s.conflicts} record${s.conflicts > 1 ? 's were' : ' was'} changed on two devices.</b> Both versions are kept. Please choose which one is correct. / दो डिवाइस पर बदला गया — सही वाला चुनें।</span><button class="btn s p" data-act="sync-conflicts">Resolve now</button></div>`;
  const up = LOC().upgrade;
  if (r === 'dashboard' && up && up.from === '1.2.0-local' && !ST.ls.get('ce.upgradeSeen', false)) {
    const b = Object.values(up.before || {}).reduce((a, x) => a + x, 0), a = Object.values(up.after || {}).reduce((x, y) => x + y, 0);
    h += `<div class="note ${up.ok ? '' : 'bad'}" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:200px"><b>${up.ok ? 'Upgraded to v1.3.0 — all records kept.' : 'Upgrade problem.'}</b> Records before: ${b} · after: ${a}. A safety copy of the old database was made first. / अपग्रेड हो गया, सभी रिकॉर्ड सुरक्षित।</span><a class="btn s" href="#setup">Details</a><button class="btn s" data-act="sync-upseen">OK</button></div>`;
  }
  if (r === 'dashboard') h += `<div id="syncPanel">${syncPanel()}</div>`;
  return h;
}
function row(k, v) { return `<tr><td>${k}</td><td>${v}</td></tr>`; }
function syncPanel() {
  const s = SY();
  const title = `<h2>Google Drive backup &amp; sync <span class="mute" style="font-size:14px;font-weight:400">· गूगल ड्राइव बैकअप</span></h2>`;
  if (!s.available) return `<div class="card">${title}<p class="mute" style="margin:0">Google Drive works when the ERP is opened with its launcher (Windows / Mac) or its phone address (https). Right now your entries are saved on this device only.</p></div>`;
  if (!s.configured) return `<div class="card">${title}<p style="margin:0 0 10px">Not connected · <b>जुड़ा नहीं</b>. Entries are saved on this device only.</p><a class="btn p" href="#setup" data-act="sync-gosetup">Set up Google Drive</a></div>`;
  if (!s.connected) return `<div class="card">${title}<p style="margin:0 0 10px">Not connected · <b>जुड़ा नहीं</b>. Entries are saved on this device only.${s.error ? `<br><span class="neg">${esc(s.error)}</span>` : ''}</p><button class="btn p" data-act="sync-connect">Connect Google Drive / गूगल ड्राइव जोड़ें</button></div>`;
  let need = '';
  if (s.status === 'reauth') need = `<div class="note">Google sign-in has expired (this is normal after about an hour). Your entries are safe on this device. / गूगल से दोबारा जोड़ें।<br><button class="btn s p" data-act="sync-reconnect" style="margin-top:8px">Connect again</button></div>`;
  else if (s.needs === 'newkey') need = `<div class="note">One more step: create the <b>recovery key</b> that locks your backups. / रिकवरी की बनाएँ।<br><button class="btn s p" data-act="sync-newkey" style="margin-top:8px">Create recovery key</button></div>`;
  else if (s.needs === 'key') need = `<div class="note">This Google Drive already has ERP data. Enter the <b>recovery key</b> you wrote down on the first device. / पहले डिवाइस वाली रिकवरी की डालें।<br><button class="btn s p" data-act="sync-enterkey" style="margin-top:8px">Enter recovery key</button></div>`;
  else if (s.needs === 'merge') need = mergePanel(s.preview);
  const st = s.busy || s.status === 'syncing' ? 'Syncing… / सिंक हो रहा है' : s.pending ? `<b>Waiting to sync</b> (${s.pending}) / भेजना बाकी` : s.status === 'synced' ? '<b class="pos">Synced to Google Drive</b> / सिंक पूरा' : s.status === 'offline' ? 'No internet — will sync later / इंटरनेट नहीं' : s.status === 'error' ? '<b class="neg">Sync problem</b>' : s.status === 'reauth' ? 'Google sign-in needed' : 'Setting up…';
  const lb = s.lastBackup;
  return `<div class="card">${title}${need}<table><tbody>
    ${row('Status / स्थिति', st)}
    ${row('Google account', esc((s.account && s.account.email) || '—'))}
    ${row('Last successful sync', esc(tm(s.lastSync)))}
    ${row('Changes waiting', String(s.pending || 0))}
    ${s.error ? row('Problem', `<span class="neg">${esc(s.error)}</span>`) : ''}
    ${row('Last Drive backup', lb ? `${esc(tm(lb.at))} · ${lb.records} records` : '—')}
    ${s.conflicts ? row('Needs your decision', `<b class="neg">${s.conflicts}</b> <button class="btn s" data-act="sync-conflicts">Resolve</button>`) : ''}
    ${row('This device', `${esc(s.deviceId || '')}${s.deviceCode ? ` · number series <b>${esc(s.deviceCode)}</b>` : ''}`)}
  </tbody></table>
  <div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="btn p" data-act="sync-now" ${s.busy ? 'disabled' : ''}>Sync now / अभी सिंक करें</button><button class="btn" data-act="sync-restore">Restore from Drive</button><button class="btn" data-act="sync-backup">Backup to Drive now</button><button class="btn" data-act="sync-disconnect">Disconnect</button></div></div>`;
}
function mergePanel(p) {
  if (!p) return '';
  return `<div class="note bad"><b>This device and Google Drive both have records, and ${p.clashes} of them use the same number.</b> (This device: ${p.localRecords} records · Google Drive: ${p.driveRecords} records.)
  <p style="margin:8px 0">Nothing has been mixed yet. Choose one:</p>
  <div class="row" style="flex-wrap:wrap"><button class="btn s" data-act="sync-merge" data-c="separate">Keep this device separate (do not connect)</button><button class="btn s" data-act="sync-merge" data-c="resolve">Connect and decide each clash</button><button class="btn s d" data-act="sync-merge" data-c="replace">Use Google Drive data on this device</button></div>
  <details style="margin-top:8px"><summary>Show the clashing numbers</summary><p class="mute" style="font-size:13px">${p.clashList.map((c) => esc(c.path)).join(', ')}</p></details></div>`;
}

/* ---------- settings card ---------- */
function syncSetupCard() {
  const s = SY(); const L = LOC();
  const up = L.upgrade; const log = (s.log || []).slice(-12).reverse();
  const counts = (o) => Object.entries(o || {}).map(([k, v]) => `${esc(k)}: ${v}`).join(', ') || '—';
  return `<div class="card" id="syncSetup"><h2>Google Drive backup &amp; sync — setup</h2>
  ${!s.available ? '<p class="note">Open the ERP with its launcher (Windows / Mac) or its https phone address to use Google Drive. Opened from a file or a plain Wi-Fi address, sync is not possible.</p>' : ''}
  <p class="mute" style="font-size:14px">You choose Google Drive as the place where an <b>encrypted</b> copy of your records is kept and shared between your devices. Google stores the files; without your recovery key they cannot be opened. Only files made by this ERP are visible to it (Google permission “drive.file”).</p>
  <div class="grid">
    <label class="f full"><span>Google OAuth Client ID (from the setup guide)</span><input id="syncClient" value="${esc(s.clientId || '')}" placeholder="123456789-abc….apps.googleusercontent.com" autocomplete="off" spellcheck="false"></label>
    <label class="f full"><span>Address to add in Google Cloud (Authorized JavaScript origin + redirect URI)</span><input readonly value="${esc(s.redirectUri || '')}" id="syncRedir"></label>
    <label class="f"><span>Number series when sync is on</span><select id="syncSeries"><option value="device" ${!s.connected || (window.ERP_SYNC && ERP_SYNC.seriesCode()) || !s.deviceCode ? 'selected' : ''}>Each device its own letter (safe)</option><option value="single">One series (only if sales/lots are made on ONE device)</option></select></label>
  </div>
  <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn p" data-act="sync-saveclient">Save Client ID</button>${s.configured && !s.connected ? '<button class="btn" data-act="sync-connect">Connect Google Drive</button>' : ''}</div>
  ${s.devices && s.devices.length ? `<h3 style="margin-top:16px">Devices using this Google Drive</h3><table><tbody>${s.devices.map((d) => row(esc(d.name || d.dev), `${esc(d.dev)} · series <b>${esc(d.code || '')}</b> · seen ${esc(d.seen || '')}`)).join('')}</tbody></table>` : ''}
  ${log.length ? `<h3 style="margin-top:16px">Sync history (this device)</h3><table><tbody>${log.map((l) => row(esc(tm(l.at)), esc(l.msg))).join('')}</tbody></table>` : ''}
  </div>
  ${up && up.from === '1.2.0-local' ? `<div class="card"><h2>Upgrade from v1.2.0 — report</h2><table><tbody>
    ${row('Result', up.ok ? '<b class="pos">All records kept</b>' : `<b class="neg">${esc(up.error || 'Problem')}</b>`)}
    ${row('When', esc(tm(up.finishedAt || up.startedAt)))}
    ${row('Records before', counts(up.before))}
    ${row('Records after', counts(up.after))}
    ${row('Safety copy of old database', `${up.copyRows} rows in “${esc(up.copyDb)}” on this device`)}
  </tbody></table><div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="sync-precopy">Download safety copy as backup file</button><button class="btn d" data-act="sync-rollback">Undo upgrade</button></div>
  <p class="mute" style="font-size:13px">Undo puts back the old database exactly as it was before the upgrade. Entries made after the upgrade are first saved in a backup file. The v1.2.0 package can also open this device's data at any time.</p></div>` : ''}`;
}

/* ---------- actions ---------- */
async function syncAct(a, b) {
  const S = window.ERP_SYNC;
  try {
    if (a === 'sync-print') return window.print();
    if (a === 'sync-upseen') { ST.ls.set('ce.upgradeSeen', true); return render(); }
    if (a === 'sync-saveclient') { await S.setClientId($('#syncClient').value); await S.setSeries($('#syncSeries').value); toast('Saved. Now press Connect Google Drive.'); return render(); }
    if (a === 'sync-connect') {
      const ok = await dialog({ title: 'Connect Google Drive?', body: `<p>Google will ask you to choose your Google account and allow this ERP to <b>see and create only its own files</b> in your Drive.</p><p>Your records will then be copied, <b>encrypted</b>, into the folder <b>CHIRAG ENTERPRISES ERP BACKUP</b>, and shared with your other devices that use the same Google account.</p><p class="mute">Google stores the files. They are locked with your recovery key, which Google does not have.</p>`, ok: 'Continue to Google' });
      if (ok) await S.connect(); return;
    }
    if (a === 'sync-reconnect') return await S.reconnect();
    if (a === 'sync-disconnect') {
      const ok = await dialog({ title: 'Disconnect Google Drive?', body: '<p>This device stops syncing. All records stay on this device, and the files on Google Drive are not deleted.</p><p>To connect again later you will need the Client ID and the <b>recovery key</b>.</p>', ok: 'Disconnect' });
      if (ok) { await S.disconnect(); toast('Google Drive disconnected on this device'); } return;
    }
    if (a === 'sync-now') { b && (b.disabled = true); await S.syncNow('button'); const s = SY(); toast(s.status === 'synced' ? 'Synced to Google Drive' : s.error || 'Saved on this device · waiting to sync'); return; }
    if (a === 'sync-backup') { toast('Making an encrypted backup on Google Drive…'); const r = await S.backupNow(); toast(r ? `Backup saved on Google Drive · ${r.records} records` : 'Backup not made'); return; }
    if (a === 'sync-newkey') return await newKeyFlow();
    if (a === 'sync-enterkey') return await enterKeyFlow();
    if (a === 'sync-merge') return await mergeFlow(b.dataset.c);
    if (a === 'sync-conflicts') return await conflictsFlow();
    if (a === 'sync-restore') return await restoreFromDrive();
    if (a === 'sync-precopy') return await downloadPreCopy();
    if (a === 'sync-rollback') return await rollbackFlow();
  } catch (e) { toast(e.message || String(e)); await dialog({ title: 'Google Drive', body: `<p>${esc(e.message || String(e))}</p><p class="mute">Your entries are safe on this device.</p>`, cancel: '' }); }
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-act^="sync-"]'); if (!b || b.closest('#formModal')) return; e.preventDefault(); syncAct(b.dataset.act, b); });

async function newKeyFlow() {
  const go = await dialog({ title: 'Create recovery key', body: `<p>The ERP will now make a <b>recovery key</b> — 24 letters and numbers. It locks every backup on Google Drive.</p><ul><li>Write it on paper and keep it safe (not in WhatsApp or email).</li><li>You need it on every new device (iPhone, Android, new PC).</li><li>If you lose it, the Drive backups cannot be opened by anyone. Your records on your devices stay safe.</li></ul>`, ok: 'Create key' });
  if (!go) return;
  const rk = await ERP_SYNC.createKey();
  const last = rk.replace(/-/g, '').slice(-4);
  const ok = await dialog({ title: 'Your recovery key — write it down now', body: `<p class="note" style="font:600 22px/1.6 ui-monospace,Menlo,Consolas,monospace;letter-spacing:1px;text-align:center;word-break:break-all" id="rkShow">${esc(rk)}</p><p>रिकवरी की कागज़ पर लिखकर सुरक्षित रखें। यह दोबारा नहीं दिखेगी।</p><p class="mute" style="font-size:13px">It will not be shown again. The ERP does not keep it.</p><button class="btn s" data-act="sync-print">Print</button>`, input: true, inputLabel: `Type the LAST 4 characters (${'•'.repeat(4)}) to confirm you wrote it down`, ok: 'I have written it down', cancel: '', check: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '') === last });
  if (ok) { toast('Recovery key set. Syncing…'); await ERP_SYNC.syncNow('key'); }
}
async function enterKeyFlow() {
  const v = await dialog({ title: 'Enter recovery key', body: '<p>Type the 24-character recovery key you wrote down when Google Drive was first connected (dashes optional). / पहले डिवाइस वाली रिकवरी की डालें।</p>', input: true, inputLabel: 'Recovery key', ok: 'Unlock' });
  if (!v) return;
  await ERP_SYNC.enterKey(v); toast('Key correct. Syncing…'); await ERP_SYNC.syncNow('key');
}
async function mergeFlow(choice) {
  if (choice === 'replace') {
    const ok = await dialog({ title: 'Use Google Drive data on this device?', body: '<p>This device\'s own records will be <b>removed from this device</b> and the records from Google Drive will be used instead.</p><p>First, a complete <b>backup file of this device</b> will be downloaded so nothing is lost. Keep that file.</p>', input: true, inputLabel: 'Type REPLACE to continue', danger: true, ok: 'Download backup and replace', check: (v) => v === 'REPLACE' });
    if (ok !== 'REPLACE') return;
    await downloadBackup();
    if (!lastBackupFile() || Date.now() - new Date(lastBackupFile().at).getTime() > 120000) { toast('Backup file was not saved, nothing changed'); return; }
  }
  if (choice === 'resolve') { const ok = await dialog({ title: 'Connect and decide each clash?', body: '<p>Both sets of records will be shared. For every number used on both, you will see both versions and choose which one to keep. Nothing is lost: the version you do not choose is kept in the audit history.</p>', ok: 'Connect' }); if (!ok) return; }
  await ERP_SYNC.chooseJoin(choice); render();
  if (choice === 'resolve' && SY().conflicts) conflictsFlow();
}

/* ---------- conflicts ---------- */
const FIN = ['purchases', 'unloading', 'production', 'sales', 'mistri', 'expenses', 'payments', 'adjustments', 'settings'];
function recLabel(path, d) {
  const [c, id] = path.split('/'); d = d || {};
  const n = { purchases: 'Purchase / lot', unloading: 'Labour', production: 'Production batch', sales: 'Sale', mistri: 'Mistri payment', expenses: 'Expense', payments: 'Payment', adjustments: 'Adjustment', parties: 'Party', settings: 'Settings', attachments: 'Bill photo' }[c] || c;
  const k = d.lotId || d.invoiceNo || d.batchId || d.name || d.description || d.party || d.customer || d.supplier || id;
  return `${n} ${k}`;
}
const SKIP = { v: 1, updatedAt: 1, updatedBy: 1, createdBy: 1 };
function fieldDiff(a, b) {
  const keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].filter((k) => !SKIP[k]);
  return keys.filter((k) => JSON.stringify((a || {})[k]) !== JSON.stringify((b || {})[k])).map((k) => [k, (a || {})[k], (b || {})[k]]);
}
const show = (v) => (v === undefined || v === null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v).slice(0, 160) : String(v));
async function conflictsFlow() {
  const list = LOC().conflicts();
  if (!list.length) { toast('No conflicts'); return render(); }
  const c = list[0];
  const r = c.remotes[0];
  const diff = fieldDiff(c.local.doc, r.doc);
  const fin = FIN.includes(c.coll);
  const body = `<p><b>${esc(recLabel(c.path, c.local.doc || r.doc))}</b> was changed on two devices before they synced. ${fin ? 'This is a financial record, so the ERP will not choose for you.' : ''} (${list.length} to decide)</p>
  <table><thead><tr><th>Field</th><th>This device<br><span class="mute">${esc(tm(c.local.at))}</span></th><th>${esc(r.devName || r.dev)}<br><span class="mute">${esc(tm(r.at))}</span></th></tr></thead><tbody>
  ${c.local.del ? '<tr><td colspan="3"><b>Deleted on this device</b></td></tr>' : ''}${r.del ? '<tr><td colspan="3"><b>Deleted on the other device</b></td></tr>' : ''}
  ${diff.map(([k, x, y]) => `<tr><td>${esc(k)}</td><td>${esc(show(x))}</td><td>${esc(show(y))}</td></tr>`).join('')}</tbody></table>
  <p class="mute" style="font-size:13px">The version you do not keep is saved in the audit history, so it is never lost.</p>`;
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="Choose the correct version"><header><h2>Choose the correct version / सही वाला चुनें</h2></header><div>${body}</div><footer><button class="btn" data-r="later">Decide later</button><button class="btn p" data-r="local">Keep this device's version</button><button class="btn p" data-r="remote">Use ${esc(r.devName || 'other device')}'s version</button></footer></div>`;
  document.body.append(m);
  m.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const ch = b.dataset.r; m.remove(); if (ch === 'later') return;
    const out = await LOC().resolveConflict(c.path, ch === 'local' ? 'local' : r.rev);
    await ST.logEvent('conflict-resolved', `${recLabel(c.path, c.local.doc || r.doc)}: kept ${ch === 'local' ? 'this device\'s version' : 'the version from ' + (r.devName || r.dev)} (${c.path})`, { path: c.path, discarded: out.discarded });
    toast('Saved your choice'); ERP_SYNC.syncNow('resolve');
    if (LOC().conflictCount()) conflictsFlow(); else render();
  });
}

/* ---------- restore from Google Drive ---------- */
async function restoreFromDrive() {
  toast('Reading backups on Google Drive…');
  const list = await ERP_SYNC.listDriveBackups();
  if (!list.length) return dialog({ title: 'Restore from Google Drive', body: '<p>No backups on Google Drive yet.</p>', cancel: '' });
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="Restore from Google Drive"><header><h2>Restore from Google Drive</h2></header><div><p>Choose a backup. You will see what it contains before anything changes.</p><table><thead><tr><th>Made</th><th>Device</th><th>Records</th><th></th></tr></thead><tbody>${list.slice(0, 60).map((b, i) => `<tr><td>${esc(tm(b.at))}</td><td>${esc(b.device)}</td><td>${b.records}${b.ok ? ' ✓' : ''}</td><td><button class="btn s" data-i="${i}">Preview</button></td></tr>`).join('')}</tbody></table></div><footer><button class="btn" data-x="1">Close</button></footer></div>`;
  document.body.append(m);
  m.addEventListener('click', async (e) => {
    if (e.target.closest('[data-x]') || e.target === m) return m.remove();
    const b = e.target.closest('[data-i]'); if (!b) return;
    const item = list[+b.dataset.i]; m.remove();
    try { const o = await ERP_SYNC.readDriveBackup(item); await confirmRestore(o); }
    catch (x) { await dialog({ title: 'This backup cannot be used', body: `<p class="note bad">${esc(x.message)}</p><p>Nothing was changed. Choose an older backup.</p>`, cancel: '' }); restoreFromDrive(); }
  });
}

/* ---------- upgrade: safety copy and undo ---------- */
async function preCopyObject() {
  const rows = await LOC().preUpgradeCopy();
  const data = {}; ST.COLLS.forEach((c) => { data[c] = []; });
  let settings = {}; const attachments = [], audit = [];
  rows.forEach((r) => { const [c, ...rest] = r.path.split('/'); const id = rest.join('/'); if (r.path === 'settings/main') settings = r.doc; else if (data[c]) data[c].push({ ...r.doc, id: r.doc.id || id }); else if (c === 'attachments') attachments.push({ ...r.doc, id }); else if (c === 'audit') audit.push({ ...r.doc, id }); });
  const o = { app: 'chirag-erp', format: 2, createdAt: new Date().toISOString(), by: 'pre-upgrade-copy', settings, data, attachments, audit, device: LOC().deviceId, appVersion: '1.2.0-local (copy kept by 1.3.0)' };
  o.backupId = 'PRE13-' + LOC().deviceId; o.counts = Object.fromEntries(ST.COLLS.map((c) => [c, data[c].length])); o.counts.attachments = attachments.length; o.counts.audit = audit.length;
  o.checksum = ST.checksum(JSON.stringify({ settings: o.settings || {}, data: o.data || {}, attachments: o.attachments || [], audit: o.audit || [] }));
  return o;
}
async function downloadPreCopy() { const o = await preCopyObject(); await saveFile(`Chirag ERP before v1.3.0 upgrade ${LOC().deviceId}.json`, JSON.stringify(o, null, 1)); }
async function rollbackFlow() {
  const ok = await dialog({ title: 'Undo the upgrade?', body: '<p>The database on this device will be put back exactly as it was before v1.3.0.</p><p><b>First a backup file of everything as it is now will be downloaded</b> — keep it. Entries made after the upgrade are in that file.</p>', input: true, inputLabel: 'Type UNDO to continue', danger: true, ok: 'Download backup and undo', check: (v) => v === 'UNDO' });
  if (ok !== 'UNDO') return;
  await downloadBackup();
  const n = await LOC().rollbackUpgrade();
  await dialog({ title: 'Upgrade undone', body: `<p>${n} rows were put back from the safety copy. The ERP will now restart.</p>`, cancel: '' });
  location.reload();
}

/* keep the top bar and the panel current while sync runs */
if (window.ERP_SYNC) ERP_SYNC.onChange(() => {
  const sy = $('#sync'); if (sy && ST.status === 'live') sy.innerHTML = syncLabel();
  const p = $('#syncPanel'); if (p && ERPUI.route === 'dashboard') p.innerHTML = syncPanel();
  const ap = $('#bellN'); if (ap && ST.ready) { const n = alerts().length; ap.hidden = !n; ap.textContent = n; }
});

/* used by app.js */
Object.assign(window, { syncLabel, syncBanners, syncSetupCard });
/* the screen may already have been drawn before this file loaded: draw it once more with the Google Drive parts */
if (window.ST && ST.ready) { try { render(); } catch (e) { /* first draw happens later */ } }
}
