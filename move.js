/* CHIRAG ENTERPRISES ERP v1.3.0 — one-time move of records on Windows from the old way of opening the ERP
 * (the file, "file://…/index.html") to the new way (http://localhost:8765, needed for Google sign-in).
 * Browsers keep these two as separate storage, so the records are handed over window-to-window on this PC.
 * Nothing leaves the computer. The old copy is never deleted: it stays as a fallback.
 */
(function () {
  'use strict';
  var L = window.ERP_LOCAL;
  var LOCALHOST = 'http://localhost:8765';
  var isFile = location.protocol === 'file:';
  var M = window.ERP_MOVE = { state: 'idle' };

  function overlay(html) {
    var o = document.getElementById('moveOverlay');
    if (!o) { o = document.createElement('div'); o.id = 'moveOverlay'; o.setAttribute('role', 'dialog'); o.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0b0a08;color:#f3e7c7;display:flex;align-items:center;justify-content:center;padding:20px;font:17px/1.6 system-ui,-apple-system,"Segoe UI","Nirmala UI",sans-serif'; document.body.appendChild(o); }
    o.innerHTML = '<div style="max-width:620px;background:#1a1712;border:1px solid #5a4a2a;border-radius:14px;padding:24px">' + html + '</div>';
    return o;
  }
  var btn = 'display:inline-block;margin:14px 10px 0 0;padding:12px 20px;border-radius:10px;border:0;font:600 17px system-ui;cursor:pointer;';
  function countBiz(rows) { var n = 0; rows.forEach(function (r) { if (/^(purchases|unloading|production|sales|mistri|expenses|payments|adjustments|parties)\//.test(r.path)) n++; }); return n; }

  /* ---------- side 1: the old file:// page ---------- */
  async function fromFile() {
    await L.ready;
    var up = null;
    try { var r = await fetch(LOCALHOST + '/lan.json', { cache: 'no-store' }); if (r.ok) up = await r.json(); } catch (e) { up = null; }
    if (!up) { M.state = 'no-server'; return; }   /* launcher's local server not running: keep working here as before */
    var rows = await L.dumpRows();
    var biz = countBiz(rows);
    var moved = await L.meta.get('movedToLocalhost');
    var maxSeq = await L.maxSeq();
    if (!biz || (moved && moved.seq >= maxSeq)) { M.state = 'redirect'; location.replace(LOCALHOST + '/'); return; }
    M.state = 'ask';
    var again = moved ? '<p style="color:#e3b35a">Some entries were made here after the last move. They will be added now.</p>' : '';
    var o = overlay('<h2 style="margin:0 0 8px;color:#e6c06a">New version is ready / नया वर्ज़न तैयार है</h2>' + again +
      '<p>Your <b>' + biz + ' records</b> are in the old version on this PC. Press the button to move them into the new version (needed for Google Drive backup). / अपने रिकॉर्ड नए वर्ज़न में ले जाने के लिए बटन दबाएँ।</p>' +
      '<p style="opacity:.75;font-size:15px">Nothing is deleted. The old copy stays on this PC as a safety copy.</p>' +
      '<button id="mvGo" style="' + btn + 'background:#d4a537;color:#1a1306">Move my records now</button><button id="mvLater" style="' + btn + 'background:#3a3326;color:#f3e7c7">Not now</button><div id="mvMsg" style="margin-top:12px"></div>');
    o.querySelector('#mvLater').onclick = function () { o.remove(); M.state = 'later'; };
    o.querySelector('#mvGo').onclick = function () { doMove(rows, maxSeq, o); };
  }
  function doMove(rows, maxSeq, o) {
    var msg = o.querySelector('#mvMsg'); msg.textContent = 'Opening the new version… / नया वर्ज़न खुल रहा है…';
    var w = window.open(LOCALHOST + '/#receive-move', 'chirag-erp-move');
    if (!w) { msg.innerHTML = '<b>The browser blocked the new window.</b> Allow pop-ups for this page and press the button again.'; return; }
    var payload = { type: 'move-data', from: L.deviceId, at: new Date().toISOString(), count: rows.length, rows: rows, check: L.hash(L.canon(rows)) };
    var sent = false;
    var onMsg = async function (e) {
      if (e.origin !== LOCALHOST || e.source !== w || !e.data) return;
      if (e.data.type === 'move-ready' && !sent) { sent = true; w.postMessage(payload, LOCALHOST); msg.textContent = 'Moving ' + rows.length + ' items…'; }
      if (e.data.type === 'move-done') {
        window.removeEventListener('message', onMsg);
        var r = e.data.result || {};
        var ok = r.received === rows.length && (r.added + r.same + r.kept) === rows.length;
        if (!ok) { msg.innerHTML = '<b style="color:#ff9b8a">The move did not complete (' + (r.error || 'count mismatch') + ').</b> Nothing was deleted. Close both windows and start the ERP again.'; return; }
        await L.meta.set('movedToLocalhost', { at: new Date().toISOString(), seq: maxSeq, sent: rows.length, added: r.added, same: r.same, kept: r.kept });
        o.innerHTML = '<div style="max-width:620px;background:#1a1712;border:1px solid #5a4a2a;border-radius:14px;padding:24px"><h2 style="margin:0 0 8px;color:#8fd18a">Done / हो गया</h2><p>' + rows.length + ' items checked: <b>' + r.added + ' moved</b>, ' + r.same + ' were already there' + (r.kept ? ', <b>' + r.kept + ' already existed with different content and were left as they are in the new version</b>' : '') + '.</p><p>The new version is open. This window will switch to it.</p></div>';
        try { w.postMessage({ type: 'move-close' }, LOCALHOST); } catch (x) { /* closed */ }
        setTimeout(function () { location.replace(LOCALHOST + '/'); }, 2500);
      }
    };
    window.addEventListener('message', onMsg);
  }

  /* ---------- side 2: the new http://localhost page, opened by side 1 ---------- */
  function receiver() {
    if (!window.opener || location.hash !== '#receive-move') return;
    history.replaceState(null, '', location.pathname + '#dashboard');
    var done = false;
    window.addEventListener('message', async function (e) {
      if (e.source !== window.opener || !e.data) return;
      if (e.data.type === 'move-close') { setTimeout(function () { window.close(); }, 300); return; }
      if (e.data.type !== 'move-data' || done) return;
      if (e.origin !== 'null' && e.origin !== 'file://') return;   /* only the ERP opened as a file on this PC */
      done = true;
      var result;
      try {
        var rows = e.data.rows || [];
        if (L.hash(L.canon(rows)) !== e.data.check || rows.length !== e.data.count) throw new Error('data check failed');
        /* the owner confirms here too, so no other web page can push records into the ERP */
        var biz = countBiz(rows);
        var yes = await new Promise(function (res) {
          var o = overlay('<h2 style="margin:0 0 8px;color:#e6c06a">Receive records? / रिकॉर्ड लें?</h2><p><b>' + biz + ' records</b> (' + rows.length + ' items with settings, photos and history) are coming from the old version of the ERP on this PC.</p><p style="opacity:.75;font-size:15px">Only accept if you just pressed “Move my records now”.</p><button id="mvYes" style="' + btn + 'background:#d4a537;color:#1a1306">Accept</button><button id="mvNo" style="' + btn + 'background:#3a3326;color:#f3e7c7">Cancel</button>');
          o.querySelector('#mvYes').onclick = function () { o.remove(); res(true); };
          o.querySelector('#mvNo').onclick = function () { o.remove(); res(false); };
        });
        if (!yes) throw new Error('cancelled on the new version');
        var r = await L.importRows(rows, 'moved from file:// version');
        result = { received: rows.length, added: r.added, same: r.same, kept: r.kept, keptList: r.keptList.slice(0, 50) };
        try { if (window.ST && ST.logEvent) await ST.logEvent('move-in', 'Records moved from the old file:// version on this PC: ' + r.added + ' added, ' + r.same + ' already present, ' + r.kept + ' left unchanged (different content)'); } catch (x) { /* audit never blocks */ }
      } catch (x) { result = { received: 0, added: 0, same: 0, kept: 0, error: x.message }; }
      window.opener.postMessage({ type: 'move-done', result: result }, '*');
    });
    L.ready.then(function () { window.opener.postMessage({ type: 'move-ready' }, '*'); });
  }

  if (isFile) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromFile); else fromFile(); }
  else if (location.origin === LOCALHOST) receiver();
})();
