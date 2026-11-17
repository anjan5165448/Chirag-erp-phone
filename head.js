/* Home Screen manifest only when served over http(s); browsers block it for files opened directly */
if (location.protocol !== 'file:') { var mf = document.createElement('link'); mf.rel = 'manifest'; mf.href = 'manifest.webmanifest'; document.head.appendChild(mf); }
