/* CHIRAG ENTERPRISES ERP — start-up helpers (kept out of index.html so the page can run with a strict
   Content-Security-Policy that allows no inline scripts). */
(function () {
  'use strict';
  /* Phone layout: each table cell gets its column name, shown as a label when tables stack on narrow screens */
  new MutationObserver(function () {
    document.querySelectorAll('.stack td:not([data-l])').forEach(function (c) {
      var i = 0, p = c; while ((p = p.previousElementSibling)) i += p.colSpan;
      var h = c.closest('table').rows[0].cells[i]; c.dataset.l = h ? h.textContent : '';
    });
  }).observe(document, { childList: true, subtree: true });

  /* Offline app shell for http://localhost (Mac / Windows launcher) and https (phones) */
  if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  /* If something prevents the ERP from starting, show a simple message instead of a blank screen */
  setTimeout(function () {
    var b = document.getElementById('bootmsg');
    if (b) b.innerHTML = 'The ERP did not start. Please close this window and open it again with the launcher.<br>ERP शुरू नहीं हुआ। विंडो बंद करके launcher से दोबारा खोलें।<br><br><span style="opacity:.7">Use Chrome or Edge (Windows), Safari or Chrome (Mac), Safari (iPhone), Chrome (Android).</span>';
  }, 15000);
})();
