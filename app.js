/* CHIRAG ENTERPRISES — Flash Door ERP: screens, forms and rules. */
{
'use strict';
const { CE, EX, ST } = window;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = CE.num;
const inr = (n, d = 2) => { const v = Math.round((+n || 0) * 100) / 100; return (v < 0 ? '−₹' : '₹') + Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }); };
const inr0 = (n) => inr(n, 0);
const qf = (n, dp = 2) => (Math.round((+n || 0) * 10 ** dp) / 10 ** dp).toLocaleString('en-IN', { maximumFractionDigits: dp });
const qty = (n, k) => `${qf(n, CE.UNIT[k] === 'SQ FT' ? 4 : 2)} ${CE.UNIT[k] === 'SQ FT' ? 'sq ft' : 'kg'}`;
const dd = (d) => EX.fmtD(d);
const LOCAL = window.ERP_HOST === 'local';
const LOC = () => window.ERP_LOCAL || {};
const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);
const lastBackupFile = () => ST.ls.get('ce.lastBackupFile', null);
const strip = (h) => String(h == null ? '' : h).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/* ---------- icons ---------- */
const P = {
  dashboard: 'M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z', purchase: 'M3 7h13l-1 9H4zM16 9h3l2 4v3h-5M7 19a2 2 0 1 0 0 .1M17 19a2 2 0 1 0 0 .1',
  unloading: 'M12 3v12m0 0-4-4m4 4 4-4M4 19h16', production: 'M4 20V9l5 3V9l5 3V5h6v15zM8 16h2m4 0h2', doors: 'M6 3h12v18H6zM14 12h1', firewood: 'M4 17 18 7M6 21l14-10M3 12l7-5',
  bhushi: 'M5 19c2-6 12-6 14 0M8 15c1-3 7-3 8 0M12 5v4', jabra: 'M3 6h18v4H3zM3 14h18v4H3z', sales: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5', mistri: 'M14 6l4 4-9 9H5v-4zM12 8l4 4',
  machine: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2m10-10 2-2', electricity: 'M13 2 4 14h7l-1 8 9-12h-7z',
  inventory: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10', parties: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 1 0 0-6M22 20c0-3-2-5-5-5',
  payments: 'M2 6h20v12H2zM2 10h20M6 15h4', pnl: 'M4 20V10m6 10V4m6 16v-7m4 7H2', reports: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8', setup: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-2V4h-4v2L9 8 7 7l-2 4 2 1v0l-2 1 2 4 2-1 2 2v2h4v-2l2-2 2 1 2-4z',
  deleted: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14', more: 'M5 12h.01M12 12h.01M19 12h.01', menu: 'M4 6h16M4 12h16M4 18h16', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0', help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01', coins: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v4c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 10v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4M4 14v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6', pie: 'M12 3v9h9A9 9 0 1 1 12 3zM15 3.5A9 9 0 0 1 20.5 9H15z', expense: 'M4 4h16v16H4zM4 9h16M9 14h6', plus: 'M12 5v14M5 12h14',
};
P.accounts = P.coins;
const ic = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[k] || P.more}"/></svg>`;
const NAV = [['dashboard', 'Dashboard'], ['purchase', 'Wood Purchase'], ['unloading', 'Labour & Processing'], ['production', 'Flash Door Production'], ['doors', 'Flash Door Inventory'], ['firewood', 'Firewood'], ['bhushi', 'Bhushi'], ['jabra', 'Jabra'], ['sales', 'Sales & Returns'], ['mistri', 'Mistri Payments'], ['machine', 'Expenses'], ['electricity', 'Electricity'], ['inventory', 'Godown & Stock'], ['parties', 'Parties'], ['payments', 'Payments'], ['accounts', 'Cash & Bank'], ['pnl', 'Profit & Loss'], ['reports', 'Reports'], ['setup', 'Settings'], ['deleted', 'Deleted Records']];
const BNAV = [['dashboard', 'Home'], ['inventory', 'Stock']];

/* ---------- settings ---------- */
const DEF = { company: { name: 'CHIRAG ENTERPRISES', legalName: '', constitution: 'Proprietorship', section: 'BOARD SECTION', tagline: 'Flash Door Manufacturing ERP', address: '', phone: '', email: '', gstin: '', regType: 'Regular', state: '', stateCode: '', liabilityDate: '', jurisdiction: 'Jamshedpur', bank: '' }, defaultGst: '18', tax: { raw: { hsn: '', mode: '' }, door: { hsn: '', mode: '' }, firewood: { hsn: '', mode: '' }, bhushi: { hsn: '', mode: '' }, jabra: { hsn: '', mode: '' } }, invoicePrefix: 'CE', fyStart: 4, gstClaimable: true, allocShared: true, low: { raw: 0, door: 0, firewood: 0, bhushi: 0, jabra: 0 }, payModes: ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'Credit'], materials: CE.MATERIALS, accounts: CE.DEF_ACCOUNTS, lockDate: '' };
const S = () => { const s = ST.settings || {}; return { ...DEF, ...s, company: { ...DEF.company, ...(s.company || {}) }, tax: Object.fromEntries(Object.keys(DEF.tax).map((k) => [k, { ...DEF.tax[k], ...((s.tax || {})[k] || {}) }])), low: { ...DEF.low, ...(s.low || {}) }, payModes: s.payModes && s.payModes.length ? s.payModes : DEF.payModes, materials: s.materials && s.materials.length ? s.materials : DEF.materials, accounts: s.accounts && s.accounts.length ? s.accounts : DEF.accounts }; };
/* books closed up to S().lockDate: nobody but an admin can add, change or delete entries dated on/before it */
const MONEY_COLLS = ['purchases', 'unloading', 'production', 'sales', 'mistri', 'expenses', 'payments', 'adjustments'];
const locked = (r) => !!(S().lockDate && r && r.date && String(r.date) <= S().lockDate);
const acctOpts = () => [['', 'Auto (from payment mode)'], ...S().accounts.map((a) => [a.id, `${a.name} (${a.type === 'cash' ? 'cash' : 'bank'})`])];
const acctName = (id) => (S().accounts.find((a) => a.id === id) || { name: id || '' }).name;
let M = null, mv = -1;
const model = () => { if (mv !== ST.ver) { M = CE.build(ST.all(), S()); mv = ST.ver; } return M; };

/* ---------- date range ---------- */
const UI = ST.ls.get('ce.ui', {});
const R = { mode: UI.mode || 'fy', from: UI.from || '', to: UI.to || '' };
const ranges = () => {
  const t = ST.today(), fy = CE.fyOf(t, S().fyStart), lfy = CE.fyOf(fy.start.slice(0, 4) - 1 + fy.start.slice(4), S().fyStart);
  return { today: [t, t, 'Today'], month: [t.slice(0, 8) + '01', t, 'This month'], fy: [fy.start, fy.end, 'FY ' + fy.label], lfy: [lfy.start, lfy.end, 'FY ' + lfy.label], all: ['', '', 'All time'], custom: [R.from, R.to, 'Custom'] };
};
const rng = () => { const r = ranges()[R.mode] || ranges().fy; return { from: r[0], to: r[1], label: r[2] }; };
const inR = (d) => { const r = rng(); return CE.inRange(d || '', r.from, r.to); };

/* ---------- toast / dialogs ---------- */
let toastT;
function toast(msg) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3800); }
function dialog({ title, body, ok = 'OK', cancel = 'Cancel', danger, input, inputLabel, check }) {
  return new Promise((res) => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="dlg sm" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2></header><div>${body || ''}</div>${input ? `<label class="f"><span>${esc(inputLabel || '')}</span><input id="dlgIn" autocomplete="off"></label>` : ''}<footer>${cancel ? `<button class="btn" data-r="0">${esc(cancel)}</button>` : ''}<button class="btn ${danger ? 'd' : 'p'}" data-r="1">${esc(ok)}</button></footer></div>`;
    document.body.append(m);
    const inp = $('#dlgIn', m); if (inp) inp.focus(); else $('[data-r="1"]', m).focus();
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]'); if (!b) { if (e.target === m && cancel) { m.remove(); res(null); } return; }
      if (b.dataset.r === '1') { if (check && inp && !check(inp.value)) { inp.style.borderColor = 'var(--bad)'; return; } m.remove(); res(inp ? inp.value : true); } else { m.remove(); res(null); }
    });
  });
}
async function saveFile(name, data) {
  if (!ST.downloads) { await dialog({ title: 'Downloads unavailable', body: '<p>This view cannot save files. Open the app from claude.ai in a browser or the Claude app to download.</p>', cancel: '' }); return false; }
  try { await ST.downloads.save({ filename: name, data }); toast('Saved ' + name); return true; } catch (e) { if (e.code !== 'declined') toast('Could not save file: ' + (e.message || e.code)); return false; }
}

/* ---------- tables ---------- */
function table(cols, rows, o = {}) {
  if (!rows.length) return `<div class="empty">${o.empty || 'No entries in this period yet.'}</div>`;
  const tot = cols.some((c) => c.sum) ? `<tr class="tot">${cols.map((c, i) => `<td class="${c.n ? 'n' : ''}">${c.sum ? (c.fmt || inr)(rows.reduce((a, r) => a + num(c.sum(r)), 0)) : i === 0 ? `Total (${rows.length})` : ''}</td>`).join('')}${o.acts ? '<td></td>' : ''}</tr>` : '';
  return `<div class="scroll"><table class="stack"><thead><tr>${cols.map((c) => `<th class="${c.n ? 'n' : ''}">${esc(c.t)}</th>`).join('')}${o.acts ? '<th></th>' : ''}</tr></thead><tbody>${rows.map((r) => `<tr class="${r.deleted ? 'del' : ''}">${cols.map((c) => `<td class="${c.n ? 'n' : ''}">${c.v(r)}</td>`).join('')}${o.acts ? `<td class="acts">${o.acts(r)}</td>` : ''}</tr>`).join('')}${tot}</tbody></table></div>`;
}
const exportRows = (cols, rows) => [cols.map((c) => c.t), ...rows.map((r) => cols.map((c) => { const v = c.x ? c.x(r) : strip(c.v(r)); return v; }))];
const EXP = {};
function exportBtns(key, title, cols, rows) {
  EXP[key] = { title, cols, rows };
  return `<button class="btn s" data-act="csv" data-k="${key}">CSV</button><button class="btn s" data-act="xlsx" data-k="${key}">Excel</button>`;
}
const canW = () => ST.canWrite();
const isAdmin = () => ST.role === 'admin';
const rowActs = (coll) => (r) => canW() && !r.deleted ? `<button class="btn s" data-act="edit" data-c="${coll}" data-id="${esc(r.id)}">Edit</button> <button class="btn s d" data-act="del" data-c="${coll}" data-id="${esc(r.id)}">Delete</button>` : (r._pending ? '<span class="tag o">pending sync</span>' : '');
function toolbar(o) {
  const F = (PF[o.key] = PF[o.key] || {});
  const lots = o.lot ? [...new Set(model().purchRows.map((l) => l.id))] : [];
  return `<div class="tbar"><input type="search" id="q_${o.key}" data-f="q" data-key="${o.key}" placeholder="Search ${esc(o.what || 'entries')}…" value="${esc(F.q || '')}">${o.lot ? `<select data-f="lot" data-key="${o.key}" aria-label="Lot"><option value="">All lots</option>${lots.map((l) => `<option ${F.lot === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}${o.extra || ''}<span class="sp"></span>${o.add && canW() ? `<button class="btn p" data-act="new" data-c="${o.add}"${o.addType ? ` data-type="${o.addType}"` : ''}>+ ${esc(o.addLabel || 'New entry')}</button>` : ''}</div>`;
}
const PF = {};
const match = (key, r, lotOf) => { const F = PF[key] || {}; if (F.lot && !(lotOf ? lotOf(r) : [r.lotId]).includes(F.lot)) return false; if (F.q) { const s = JSON.stringify(r).toLowerCase(); if (!F.q.toLowerCase().split(/\s+/).every((w) => s.includes(w))) return false; } return true; };
const act = (c) => ST.rows(c).filter((r) => !r.deleted);
const byDate = (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
const kpi = (l, v, s, hi) => `<div class="kpi${hi ? ' hi' : ''}"><div class="l">${esc(l)}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
const pay = (r) => esc(r.payMode || '');

/* ======================================================================
   FORMS
   ====================================================================== */
const opts = (arr, cur) => arr.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(t)}</option>`; }).join('');
const GST_OPTS = [['18', '18%'], ['5', '5%'], ['0', '0% (nil-rated)'], ['nongst', 'Non-GST / exempt'], ['custom', 'Custom %']];
const STATE_OPTS = () => [['', '— select state —'], ...Object.entries(CE.STATES).map(([c, n]) => [c, `${c} · ${n}`])];
const sellerCode = (r) => (r && r.seller && r.seller.stateCode) || S().company.stateCode || '';
const isInter = (r) => (r.placeOfSupply ? !!sellerCode(r) && r.placeOfSupply !== sellerCode(r) : !!r.igst);
const sellerSnapshot = () => { const c = S().company; return { name: c.name, legalName: c.legalName, constitution: c.constitution, gstin: c.gstin, regType: c.regType, state: c.state, stateCode: c.stateCode, address: c.address, phone: c.phone, email: c.email, bank: c.bank, section: c.section, jurisdiction: c.jurisdiction }; };
const taxFor = (cat) => (S().tax || {})[cat] || {};
const partyNames = () => { const s = new Set(); act('parties').forEach((p) => s.add(p.name)); Object.values(model().parties).forEach((p) => s.add(p.name)); return [...s].filter(Boolean).sort(); };
const lotOpts = (cur) => { const m = model(); return [['', '— select lot —'], ...Object.values(m.lots).sort((a, b) => String(b.rec.date).localeCompare(a.rec.date)).map((L) => [L.id, `${L.id} · ${L.material} · ${L.rec.supplier || ''} · ${qf(L.rawLeft)} kg raw left`])]; };
const batchOpts = (lot) => [['', lot ? '— whole lot / none —' : '— none —'], ...Object.values(model().batches).filter((b) => !lot || b.lotId === lot).sort((a, b) => String(b.date).localeCompare(a.date)).map((b) => [b.id, `${b.id} · ${dd(b.date)} · ${b.pc.doorPcs} doors`])];

function fieldHtml(f, r) {
  if (f.show && !f.show(r)) return '';
  const v = r[f.k] == null ? '' : r[f.k];
  const lab = `<span>${esc(f.t)}</span>`;
  const cls = `f${f.req ? ' req' : ''}${f.full ? ' full' : ''}`;
  const id = `fld_${f.k}`;
  if (f.type === 'sec') return `<div class="sec full">${esc(f.t)}</div>`;
  if (f.type === 'html') return `<div class="full">${f.html(r)}</div>`;
  if (f.type === 'calc') return `<label class="${cls}">${lab}<input id="${id}" readonly tabindex="-1" data-calc="${f.k}" value="${esc(f.calc(r))}"></label>`;
  if (['select', 'gst', 'lot', 'batch', 'pay', 'acct', 'material'].includes(f.type)) {
    const o = f.type === 'gst' ? GST_OPTS : f.type === 'lot' ? lotOpts(v) : f.type === 'batch' ? batchOpts(r.lotId) : f.type === 'pay' ? ['', ...S().payModes] : f.type === 'acct' ? acctOpts() : f.type === 'material' ? [['', '— select material —'], ...[...new Set([...S().materials, ...(v ? [v] : [])])]] : typeof f.opts === 'function' ? f.opts(r) : f.opts;
    return `<label class="${cls}">${lab}<select id="${id}" data-k="${f.k}" ${f.re ? 'data-re="1"' : ''}>${opts(o, v)}</select></label>`;
  }
  if (f.type === 'party') return `<label class="${cls}">${lab}<input id="${id}" data-k="${f.k}" list="dl_party" value="${esc(v)}" autocomplete="off"></label>`;
  if (f.type === 'area') return `<label class="${cls} full">${lab}<textarea id="${id}" data-k="${f.k}">${esc(v)}</textarea></label>`;
  if (f.type === 'check') return `<label class="${cls}" style="grid-auto-flow:column;justify-content:start;align-items:center;gap:8px"><input type="checkbox" id="${id}" data-k="${f.k}" ${v ? 'checked' : ''} ${f.re ? 'data-re="1"' : ''}>${lab}</label>`;
  if (f.type === 'file') return `<label class="${cls}">${lab}<input type="file" id="${id}" data-file="${f.k}" accept="image/*,application/pdf">${r[f.k] ? '<span class="tag g">attached — choose a file to replace</span>' : ''}</label>`;
  if (f.type === 'custom') return f.render(r);
  const t = f.type === 'num' ? 'number' : f.type === 'date' ? 'date' : 'text';
  return `<label class="${cls}">${lab}<input id="${id}" type="${t}" data-k="${f.k}" ${t === 'number' ? `inputmode="decimal" step="any" ${f.min != null ? `min="${f.min}"` : ''}` : ''} value="${esc(v)}" ${f.ro ? 'readonly' : ''} ${f.re ? 'data-re="1"' : ''} autocomplete="off"></label>`;
}

let FORM = null;
function openForm(spec, rec) {
  const isNew = !rec;
  const r = rec ? JSON.parse(JSON.stringify(rec)) : { date: ST.today(), ...(spec.defaults ? spec.defaults() : {}) };
  FORM = { spec, r, before: rec || null, isNew, files: {} };
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'formModal';
  document.body.append(m);
  drawForm();
  m.addEventListener('input', onFormInput); m.addEventListener('change', onFormChange); m.addEventListener('click', onFormClick);
  { const f = m.querySelector('input:not([readonly]),select'); if (f && !('ontouchstart' in window)) f.focus(); }
}
function drawForm() {
  const m = $('#formModal'); if (!m || !FORM) return;
  const { spec, r, isNew } = FORM;
  const act0 = document.activeElement && document.activeElement.id;
  const title = (isNew ? 'New ' : 'Edit ') + spec.title + (r.id && !isNew ? ` · ${r.id}` : '');
  m.innerHTML = `<form class="dlg" novalidate role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2><button type="button" class="btn s" data-x="close" aria-label="Close">✕</button></header>
  <datalist id="dl_party">${partyNames().map((p) => `<option value="${esc(p)}">`).join('')}</datalist>
  <div class="grid">${spec.fields.map((f) => fieldHtml(f, r)).join('')}</div>
  <div id="formSum">${spec.summary ? spec.summary(r, FORM) : ''}</div><div id="formErr"></div>
  <footer>${!isNew && spec.pdf ? '<button type="button" class="btn" data-x="pdf">PDF invoice</button>' : ''}<button type="button" class="btn" data-x="close">Cancel</button><button class="btn p" data-x="save" type="submit">${isNew ? 'Save entry' : 'Save changes'}</button></footer></form>`;
  if (act0) { const e = document.getElementById(act0); if (e) { e.focus(); if (e.setSelectionRange && e.type === 'text') try { e.setSelectionRange(e.value.length, e.value.length); } catch (x) {} } }
  $('form', m).addEventListener('submit', (e) => { e.preventDefault(); submitForm(); });
}
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach((k) => { if (o[k] == null) o[k] = /^\d+$/.test(k) ? [] : {}; o = o[k]; }); o[ks[ks.length - 1]] = val; }
function onFormInput(e) {
  const el = e.target; const k = el.dataset.k; if (!k || !FORM) return;
  const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
  setPath(FORM.r, k, v);
  if (el.dataset.re && el.type !== 'text') return; // selects/checkboxes redraw on change; text keeps typing, redraws on change
  $('#formSum').innerHTML = FORM.spec.summary ? FORM.spec.summary(FORM.r, FORM) : '';
  document.querySelectorAll('#formModal [data-calc]').forEach((c) => { const f = FORM.spec.fields.find((x) => x.k === c.dataset.calc); if (f) c.value = f.calc(FORM.r); });
  document.querySelectorAll('#formModal [data-lcalc]').forEach((c) => { c.textContent = FORM.spec.lineCalc(FORM.r, c.dataset.lcalc); });
  if (FORM.spec.onInput) FORM.spec.onInput(FORM.r, k, el);
}
function onFormChange(e) {
  const el = e.target;
  if (el.dataset.file) { FORM.files[el.dataset.file] = el.files[0]; return; }
  if (el.dataset.k && el.dataset.re) { onFormInput({ target: { ...el, dataset: { k: el.dataset.k }, type: el.type, value: el.value, checked: el.checked } }); if (FORM.spec.onChange) FORM.spec.onChange(FORM.r, el.dataset.k); drawForm(); }
}
function onFormClick(e) {
  const b = e.target.closest('[data-x]'); if (!b) { if (e.target.id === 'formModal') {} return; }
  const x = b.dataset.x;
  if (x === 'close') { closeForm(); return; }
  if (x === 'pdf') { pdfFor(FORM.before); return; }
  if (x === 'addline') { const k = b.dataset.l; FORM.r[k] = FORM.r[k] || []; FORM.r[k].push(FORM.spec.newLine(k, FORM.r)); drawForm(); return; }
  if (x === 'rmline') { FORM.r[b.dataset.l].splice(+b.dataset.i, 1); drawForm(); return; }
}
function closeForm() { const m = $('#formModal'); if (m) m.remove(); FORM = null; render(); }
function syncFromDom() {
  document.querySelectorAll('#formModal [data-k]').forEach((el) => { if (!el.isConnected) return; const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value; setPath(FORM.r, el.dataset.k, v); });
}
async function submitForm() {
  syncFromDom();
  const { spec, r, before, isNew } = FORM; const errBox = $('#formErr');
  const errs = (spec.fields.filter((f) => f.req && (!f.show || f.show(r)) && (r[f.k] === '' || r[f.k] == null)).map((f) => `${f.t} is required`)).concat(spec.validate ? spec.validate(r, FORM) : []);
  if (errs.length) { errBox.innerHTML = `<div class="note bad">${errs.map(esc).join('<br>')}</div>`; errBox.scrollIntoView({ block: 'nearest' }); return; }
  if (MONEY_COLLS.includes(spec.coll) && (locked(r) || (before && locked(before))) && !isAdmin()) { errBox.innerHTML = `<div class="note bad">Books are closed up to ${esc(dd(S().lockDate))}. Only an admin can add or change entries in a closed period.</div>`; return; }
  let note = '';
  if (MONEY_COLLS.includes(spec.coll) && (!isNew || locked(r))) {
    note = await dialog({ title: isNew ? 'Entry in a closed period' : 'Reason for this change', body: `<p>${isNew ? `Books are closed up to <b>${esc(dd(S().lockDate))}</b>.` : 'Financial entries are never changed silently.'} The reason is saved with the entry and in the audit history.</p>${!isNew && spec.coll === 'sales' && before && before.kind !== 'return' ? '<p class="mute" style="font-size:13px">To take back goods or reduce an issued invoice, use <b>Return</b> (credit note) instead of editing.</p>' : ''}`, ok: 'Save with reason', input: true, inputLabel: 'Reason (required)', check: (v) => v.trim().length > 2 });
    if (!note) return;
  }
  const btn = $('[data-x="save"]'); btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const out = { ...r };
    if (note) out.editReason = note;
    if (spec.coll === 'expenses') { if (isNew || !isAdmin()) { const ok = isAdmin(); out.status = ok ? 'approved' : 'pending'; out.approvedBy = ok ? ST.me.id : ''; out.approvedAt = ok ? new Date().toISOString() : ''; } }
    if (isNew) out.id = await spec.makeId(out);
    if (spec.prepare) spec.prepare(out);
    // stock guard
    const imp = stockImpact(spec.coll, out, before);
    if (imp.length) {
      const list = imp.map((n) => `${CE.LABEL[n.k]} ${n.lot !== '—' ? 'lot ' + n.lot : ''}: would be ${qty(n.qty, n.k)}`).join('<br>');
      if (!isAdmin()) throw Object.assign(new Error(''), { html: `<div class="note bad"><b>Not enough stock.</b><br>${list}<br>Only an admin can approve an exception.</div>` });
      const why = await dialog({ title: 'Stock would go negative', body: `<p class="note bad">${list}</p><p>Approve as an exceptional adjustment? Your reason is saved in the audit log.</p>`, ok: 'Approve and save', danger: true, input: true, inputLabel: 'Reason (required)', check: (v) => v.trim().length > 2 });
      if (!why) { btn.disabled = false; btn.textContent = 'Save'; return; }
      out.stockOverride = { by: ST.me.id, at: new Date().toISOString(), reason: why };
    }
    for (const [k, file] of Object.entries(FORM.files)) if (file) out[k] = await ST.putAttachment(file);
    const res = await ST.save(spec.coll, out, before, note || undefined);
    const m = $('#formModal'); if (m) m.remove(); FORM = null;
    toast(res.pending ? 'Saved on this device — will sync when online' : `${spec.title} ${isNew ? 'saved' : 'updated'} · ${out.lotId && spec.coll === 'purchases' ? 'Lot ' + out.lotId : out.id}`);
    render();
  } catch (e) {
    if (!['duplicate', 'conflict', 'readonly', 'invalid_argument', 'quota_exceeded'].includes(e.code) && !e.html) console.error(e); errBox.innerHTML = e.html || `<div class="note bad">${esc(e.message || 'Could not save.')}</div>`; btn.disabled = false; btn.textContent = isNew ? 'Save entry' : 'Save changes';
  }
}

/* stock simulation: negatives a change would newly create */
function stockImpact(coll, rec, before) {
  if (!['purchases', 'production', 'sales', 'adjustments'].includes(coll)) return [];
  const base = ST.all();
  const after = { ...base, [coll]: base[coll].filter((x) => x.id !== rec.id).concat([rec]) };
  const m0 = model(), m1 = CE.build(after, S());
  const b0 = new Map(m0.stockRows.map((s) => [s.k + '|' + s.lot, s.qty]));
  return m1.negatives.filter((n) => n.qty < (b0.has(n.k + '|' + n.lot) ? Math.min(0, b0.get(n.k + '|' + n.lot)) : 0) - 1e-6);
}

/* id generators (business keys double as document ids → no duplicates) */
const ymd = (d) => String(d || ST.today()).replace(/-/g, '').slice(2);
async function seqId(coll, prefix, field, pad = 2) {
  const dc = window.ERP_SYNC && ERP_SYNC.seriesCode ? ERP_SYNC.seriesCode() : ''; if (dc) prefix += dc;
  const used = new Set(ST.rows(coll).map((r) => r[field]));
  for (let n = 1; n < 10000; n++) { const id = prefix + String(n).padStart(pad, '0'); if (!used.has(id) && !(await ST.exists(coll, ST.safeSeg(id)))) return id; }
  throw new Error('No free number');
}

/* ---------- specs ---------- */
const SPEC = {};
const live = (r, f) => f(r);
SPEC.purchases = {
  coll: 'purchases', title: 'wood purchase', defaults: () => ({ gstMode: '18', payMode: '' }),
  fields: [
    { k: 'date', t: 'Purchase date', type: 'date', req: true }, { k: 'supplier', t: 'Supplier / company', type: 'party', req: true }, { k: 'doNo', t: 'DO / invoice no.' },
    { k: 'material', t: 'Material type', type: 'material', req: true },
    { type: 'sec', t: 'Truck' }, { k: 'vehicle', t: 'Truck / vehicle no.' }, { k: 'driver', t: 'Driver name & phone' }, { k: 'transporter', t: 'Transporter' },
    { type: 'sec', t: 'Weight & rate' },
    { k: 'kg', t: 'Billed weight (KG)', type: 'num', req: true, min: 0 }, { k: 'receivedKg', t: 'Received at godown (KG, blank = same)', type: 'num', min: 0 }, { k: 'rate', t: 'Rate per KG (₹)', type: 'num', req: true, min: 0 },
    { k: 'value', t: 'Material value', type: 'calc', calc: (r) => inr(CE.purchaseCalc(r).value) },
    { k: 'gstMode', t: 'GST', type: 'gst', re: true }, { k: 'gstPct', t: 'Custom GST %', type: 'num', show: (r) => r.gstMode === 'custom' },
    { k: 'gstAmt', t: 'GST amount', type: 'calc', calc: (r) => inr(CE.purchaseCalc(r).gst) },
    { k: 'loading', t: 'Loading charges', type: 'num' }, { k: 'lifting', t: 'Lifting charges', type: 'num' }, { k: 'transport', t: 'Transportation', type: 'num' }, { k: 'other', t: 'Other expenses', type: 'num' },
    { k: 'paid', t: 'Amount paid now', type: 'num' }, { k: 'payMode', t: 'Payment mode', type: 'pay' }, { k: 'account', t: 'Paid from account', type: 'acct' }, { k: 'notes', t: 'Notes', type: 'area' },
  ],
  summary: (r, F) => { const c = CE.purchaseCalc(r); const later = F && F.before ? (model().purchRows.find((l) => l.id === F.before.lotId)?.paidTotal || 0) - num(F.before.paid) : 0; return `<div class="sum"><div>Material value<b>${inr(c.value)}</b></div><div>GST<b>${inr(c.gst)}</b></div><div>Expenses<b>${inr(c.extras)}</b></div><div>Total landed cost<b>${inr(c.total)}</b></div>${num(r.receivedKg) > 0 ? `<div>Short / excess at godown<b class="${num(r.kg) - num(r.receivedKg) > 0 ? 'neg' : ''}">${qf(num(r.kg) - num(r.receivedKg))} kg</b></div>` : ''}<div>Outstanding<b class="${c.total - num(r.paid) - later > 0 ? 'neg' : ''}">${inr(c.total - num(r.paid) - later)}</b></div>${!F || F.isNew ? '<div>Lot ID<b>auto on save</b></div>' : ''}</div>`; },
  validate: (r) => { const e = []; if (num(r.kg) <= 0) e.push('Weight must be more than 0'); if (r.receivedKg !== '' && r.receivedKg != null && num(r.receivedKg) < 0) e.push('Received weight cannot be negative'); if (num(r.rate) < 0) e.push('Rate cannot be negative'); if (r.doNo && act('purchases').some((p) => p.id !== r.id && p.doNo && p.doNo.trim().toLowerCase() === r.doNo.trim().toLowerCase() && CE.pkey(p.supplier) === CE.pkey(r.supplier))) e.push(`DO/invoice ${r.doNo} is already entered for ${r.supplier} — duplicate blocked`); return e; },
  makeId: async (r) => { const id = await seqId('purchases', 'L' + ymd(r.date) + '-', 'lotId'); r.lotId = id; return id; },
};
const LAB_T = Object.entries(CE.LABOUR);
SPEC.unloading = {
  coll: 'unloading', title: 'labour entry', defaults: () => ({ labourType: 'unloading' }),
  fields: [{ k: 'labourType', t: 'Labour type', type: 'select', opts: LAB_T, req: true, re: true }, { k: 'date', t: 'Work date', type: 'date', req: true }, { k: 'lotId', t: 'Lot / truck', type: 'lot', re: true }, { k: 'batchId', t: 'Production batch', type: 'batch', re: true, show: (r) => r.labourType === 'production' || r.labourType === 'other' },
    { k: 'vehicle', t: 'Vehicle no.', show: (r) => r.labourType === 'unloading' }, { k: 'team', t: 'Labour / team name', type: 'party', req: true },
    { k: 'kg', t: 'Weight handled (KG, optional)', type: 'num' }, { k: 'amount', t: 'Wages earned (₹) — any amount', type: 'num', req: true, min: 0 }, { k: 'paid', t: 'Paid now', type: 'num' },
    { k: 'bal', t: 'Balance payable', type: 'calc', calc: (r) => inr(num(r.amount) - num(r.paid)) }, { k: 'payMode', t: 'Payment mode', type: 'pay' }, { k: 'account', t: 'Paid from account', type: 'acct' }, { k: 'notes', t: 'Notes', type: 'area' }],
  summary: (r) => `<p class="mute" style="font-size:13px;margin:0">Wages earned are the cost (counted once, on the work date). What you pay only reduces the balance owed — it is not a second expense. ${r.batchId ? 'Charged to that production batch.' : r.lotId ? "Added to this lot's raw-material cost." : 'Not linked: counted as overhead.'}</p>`,
  onChange: (r, k) => { if (k === 'lotId' && r.lotId) { const L = model().lots[r.lotId]; if (L) { if (!r.vehicle) r.vehicle = L.rec.vehicle || ''; if (!r.kg && r.labourType === 'unloading') r.kg = L.kg; } } if (k === 'batchId' && r.batchId) { const b = model().batches[r.batchId]; if (b) r.lotId = b.lotId; } },
  validate: (r) => { const e = []; if (num(r.paid) > num(r.amount)) e.push('Paid is more than the wages earned'); if (['unloading', 'nail', 'sorting'].includes(r.labourType) && !r.lotId) e.push(`${CE.LABOUR[r.labourType]} must be linked to its lot / truck`); if (r.labourType === 'production' && !r.batchId) e.push('Production labour must be linked to its batch'); return e; },
  makeId: async () => ST.rid('U'),
};
/* production */
const doorLineCalc = (l) => { const d = CE.productionCalc({ doors: [l] }); return `${CE.r4(CE.sqftOf(l.w, l.h))} sq ft each · ${CE.r4(d.doorSqft)} sq ft`; };
SPEC.production = {
  coll: 'production', title: 'production batch', defaults: () => ({ doors: [{ w: '', h: '', t: '', pcs: '' }], allocMethod: 'rsv', manual: {} }),
  newLine: () => ({ w: '', h: '', t: '', pcs: '' }),
  lineCalc: (r, i) => doorLineCalc(r.doors[+i] || {}),
  fields: [
    { k: 'date', t: 'Production date', type: 'date', req: true }, { k: 'lotId', t: 'Lot ID', type: 'lot', req: true, re: true }, { k: 'material', t: 'Raw material type' },
    { k: 'inputKg', t: 'Input weight (KG)', type: 'num', req: true, min: 0 }, { k: 'operator', t: 'Machine / operator' }, { k: 'hours', t: 'Machine hours (optional)', type: 'num' },
    { type: 'sec', t: 'A · Flash Doors (sizes in inches)' },
    { type: 'custom', render: (r) => `<div class="full lines">${(r.doors || []).map((l, i) => `<div class="ln"><label class="f"><span>Width in</span><input type="number" step="any" inputmode="decimal" id="dw${i}" data-k="doors.${i}.w" value="${esc(l.w)}"></label><label class="f"><span>Height in</span><input type="number" step="any" inputmode="decimal" id="dh${i}" data-k="doors.${i}.h" value="${esc(l.h)}"></label><label class="f"><span>Thick (opt)</span><input id="dt${i}" data-k="doors.${i}.t" value="${esc(l.t)}"></label><label class="f"><span>No. of doors</span><input type="number" step="1" inputmode="numeric" id="dp${i}" data-k="doors.${i}.pcs" value="${esc(l.pcs)}"></label><span class="calc" data-lcalc="${i}">${doorLineCalc(l)}</span><button type="button" class="btn s d" data-x="rmline" data-l="doors" data-i="${i}" aria-label="Remove size">✕</button></div>`).join('')}<div><button type="button" class="btn s" data-x="addline" data-l="doors">+ Add door size</button></div></div>` },
    { k: 'doorKg', t: 'Door output weight KG (for reconciliation)', type: 'num' }, { k: 'doorRate', t: 'Door selling rate ₹/sq ft (for cost split)', type: 'num' },
    { type: 'sec', t: 'B · Firewood (KG)' }, { k: 'firewoodKg', t: 'Firewood KG', type: 'num' }, { k: 'firewoodRate', t: 'Rate ₹/KG', type: 'num' },
    { type: 'sec', t: 'C · Bhushi (KG)' }, { k: 'bhushiKg', t: 'Bhushi KG', type: 'num' }, { k: 'bhushiRate', t: 'Rate ₹/KG', type: 'num' },
    { type: 'sec', t: 'D · Jabra (SQ FT)' }, { k: 'jabraSqft', t: 'Jabra SQ FT', type: 'num' }, { k: 'jabraRate', t: 'Rate ₹/SQ FT', type: 'num' }, { k: 'jabraKg', t: 'Jabra weight KG (for reconciliation)', type: 'num' },
    { type: 'sec', t: 'By-product cost allocation' },
    { k: 'allocMethod', t: 'Method', type: 'select', re: true, opts: [['rsv', 'Relative sales value (default)'], ['manual', 'Manual % split']] },
    { type: 'custom', render: (r) => r.allocMethod === 'manual' ? `<div class="full grid">${CE.PRODUCTS.map((k) => `<label class="f"><span>${CE.LABEL[k]} %</span><input type="number" step="any" id="ma_${k}" data-k="manual.${k}" value="${esc((r.manual || {})[k] ?? '')}"></label>`).join('')}</div>` : '' },
    { k: 'notes', t: 'Production notes', type: 'area' },
  ],
  summary: (r, F) => {
    const c = CE.productionCalc(r); const L = model().lots[r.lotId];
    const prevIn = F && F.before && F.before.lotId === r.lotId ? num(F.before.inputKg) : 0;
    const left = L ? L.rawLeft + prevIn : null;
    return `<div class="sum"><div>Doors<b>${c.doorPcs} pcs</b></div><div>Finished door area<b>${qf(c.doorSqft, 4)} sq ft</b></div><div>Firewood<b>${qf(c.out.firewood)} kg</b></div><div>Bhushi<b>${qf(c.out.bhushi)} kg</b></div><div>Jabra<b>${qf(c.out.jabra, 4)} sq ft</b></div>
    <div>Input<b>${qf(c.inputKg)} kg</b></div><div>Outputs weighed<b>${qf(c.accountedKg)} kg</b></div><div>Unaccounted<b class="${c.unaccountedKg < 0 ? 'neg' : ''}">${qf(c.unaccountedKg)} kg (${qf(c.unaccountedPct, 1)}%)</b></div>${L ? `<div>Raw left in lot<b class="${left - num(r.inputKg) < 0 ? 'neg' : ''}">${qf(left - num(r.inputKg))} kg</b></div>` : ''}</div>
    ${c.missing.length ? `<p class="note">Reconciliation needs: ${c.missing.join(', ')}. KG and SQ FT are never mixed.</p>` : ''}${c.unaccountedKg < 0 ? '<p class="note bad">Outputs weigh more than the input. Check the weights.</p>' : ''}`;
  },
  validate: (r) => { const e = []; if (num(r.inputKg) <= 0) e.push('Input weight must be more than 0'); (r.doors || []).forEach((l, i) => { if (num(l.pcs) > 0 && (num(l.w) <= 0 || num(l.h) <= 0)) e.push(`Door size line ${i + 1}: width and height are needed`); if (num(l.pcs) % 1) e.push(`Door line ${i + 1}: number of doors must be whole`); }); if (r.allocMethod === 'manual') { const s = CE.PRODUCTS.reduce((a, k) => a + num((r.manual || {})[k]), 0); if (Math.abs(s - 100) > 0.01) e.push(`Manual allocation adds to ${qf(s)}% — must be 100%`); } return e; },
  prepare: (r) => { r.doors = (r.doors || []).filter((l) => num(l.pcs) > 0 || num(l.w) > 0); },
  makeId: async (r) => { const id = await seqId('production', 'B' + ymd(r.date) + '-', 'batchId'); r.batchId = id; return id; },
};
/* sales */
const CAT = [['door', 'Flash Door (SQ FT)'], ['raw', 'Raw scrap wood (KG)'], ['firewood', 'Firewood (KG)'], ['bhushi', 'Bhushi (KG)'], ['jabra', 'Jabra (SQ FT)']];
const saleLineCalc = (l) => { const c = CE.saleLine(l); return l.cat === 'door' ? `${CE.r4(c.each)} sq ft/door · ${CE.r4(c.qty)} sq ft · ${inr(c.amount)}` : `${inr(c.amount)}`; };
function availFor(cat, lot, exceptSaleId) {
  const m = model(); const rows = m.stockRows.filter((s) => s.k === cat && (!lot || s.lot === lot));
  let q = rows.reduce((a, s) => a + s.qty, 0);
  if (exceptSaleId) { const s = m.saleRows.find((x) => x.rec.id === exceptSaleId); if (s) s.lines.forEach((l) => { if (l.cat === cat && (!lot || l.lotId === lot)) q += l.qty; }); }
  return q;
}
SPEC.sales = {
  coll: 'sales', title: 'sales invoice', pdf: true,
  defaults: () => ({ gstMode: S().defaultGst || '18', lines: [SPEC.sales.newLine()], payMode: '', payDate: ST.today(), placeOfSupply: S().company.stateCode || '', reverseCharge: 'N' }),
  newLine: (k, r, cat = 'door') => ({ cat, lotId: '', w: '', h: '', pcs: '', qty: '', rate: '', gstMode: taxFor(cat).mode || '', hsn: taxFor(cat).hsn || '' }),
  lineCalc: (r, i) => saleLineCalc(r.lines[+i] || {}),
  onChange: (r, k) => {
    const m = /^lines\.(\d+)\.cat$/.exec(k); if (m) { const l = r.lines[+m[1]]; const t = taxFor(l.cat); l.gstMode = t.mode || ''; l.hsn = t.hsn || ''; }
    if (k === 'customerGstin') { const g = CE.gstinCheck(r.customerGstin); if (g.ok) { r.customerGstin = g.gstin; r.placeOfSupply = g.stateCode; } }
  },
  fields: [
    { k: 'invoiceNo', t: 'Invoice no. (blank = auto)' }, { k: 'date', t: 'Invoice date', type: 'date', req: true }, { k: 'customer', t: 'Customer / party', type: 'party', req: true },
    { k: 'customerGstin', t: 'Customer GSTIN (blank = unregistered)', re: true }, { k: 'customerAddress', t: 'Customer address', type: 'area' },
    { k: 'placeOfSupply', t: 'Place of supply (state)', type: 'select', re: true, opts: STATE_OPTS },
    { type: 'html', html: (r) => { const g = CE.gstinCheck(r.customerGstin); const inter = isInter(r); const sc = sellerCode(r);
      return `<div class="note" style="font-size:13.5px">${r.customerGstin ? (g.ok ? `✓ Customer GSTIN valid · ${esc(g.state)} (${g.stateCode})` : `<b class="neg">✗ ${esc(g.msg)}</b>`) + ' · ' : 'Unregistered customer (B2C) · '}${!sc ? '<b class="warn">Company GST state not set in Settings</b>' : inter ? `<b>Inter-state supply → IGST</b> (seller state ${sc}, place of supply ${esc(r.placeOfSupply || '')})` : `<b>Intra-state supply → CGST + SGST</b> (state ${sc})`}</div>`; } },
    { k: 'reverseCharge', t: 'Reverse charge', type: 'select', opts: [['N', 'No'], ['Y', 'Yes']] }, { k: 'vehicle', t: 'Vehicle no.' }, { k: 'ewayBill', t: 'E-way bill no.' }, { k: 'poRef', t: 'Order / reference no.' },
    { type: 'sec', t: 'Items' },
    { type: 'custom', render: (r) => `<div class="full lines">${(r.lines || []).map((l, i) => { const lot = lotOpts(); return `<div class="ln"><label class="f"><span>Product</span><select id="lc${i}" data-k="lines.${i}.cat" data-re="1">${opts(CAT, l.cat)}</select></label><label class="f"><span>Lot</span><select id="ll${i}" data-k="lines.${i}.lotId" data-re="1">${opts([['', '— any lot —'], ...lot.slice(1)], l.lotId)}</select></label>${l.cat === 'door' ? `<label class="f"><span>Width in</span><input type="number" step="any" id="lw${i}" data-k="lines.${i}.w" value="${esc(l.w)}"></label><label class="f"><span>Height in</span><input type="number" step="any" id="lh${i}" data-k="lines.${i}.h" value="${esc(l.h)}"></label><label class="f"><span>No. of doors</span><input type="number" step="1" id="lp${i}" data-k="lines.${i}.pcs" value="${esc(l.pcs)}"></label>` : `<label class="f"><span>Qty ${CE.UNIT[l.cat] === 'KG' ? 'KG' : 'SQ FT'}</span><input type="number" step="any" id="lq${i}" data-k="lines.${i}.qty" value="${esc(l.qty)}"></label>`}<label class="f"><span>Rate ₹/${CE.UNIT[l.cat] === 'KG' ? 'kg' : 'sq ft'}</span><input type="number" step="any" id="lr${i}" data-k="lines.${i}.rate" value="${esc(l.rate)}"></label><label class="f"><span>GST</span><select id="lgst${i}" data-k="lines.${i}.gstMode" data-re="1">${opts([['', `Invoice default (${(GST_OPTS.find((o) => o[0] === r.gstMode) || ['', r.gstMode])[1]})`], ...GST_OPTS], l.gstMode || '')}</select></label>${l.gstMode === 'custom' ? `<label class="f"><span>GST %</span><input type="number" step="any" id="lgp${i}" data-k="lines.${i}.gstPct" value="${esc(l.gstPct)}"></label>` : ''}<label class="f"><span>HSN</span><input id="lh2${i}" data-k="lines.${i}.hsn" value="${esc(l.hsn)}" inputmode="numeric"></label><span class="calc" data-lcalc="${i}">${saleLineCalc(l)}</span><button type="button" class="btn s d" data-x="rmline" data-l="lines" data-i="${i}" aria-label="Remove item">✕</button><div class="full mute" style="grid-column:1/-1;font-size:12.5px">In stock${l.lotId ? ' (lot ' + esc(l.lotId) + ')' : ''}: ${qty(availFor(l.cat, l.lotId, FORM && FORM.before && FORM.before.id), l.cat)}</div></div>`; }).join('')}<div><button type="button" class="btn s" data-x="addline" data-l="lines">+ Add item</button></div></div>` },
    { k: 'gstMode', t: 'Invoice default GST', type: 'gst', re: true }, { k: 'gstPct', t: 'Custom GST %', type: 'num', show: (r) => r.gstMode === 'custom' },
    { k: 'received', t: 'Received now (₹)', type: 'num' }, { k: 'payMode', t: 'Payment mode (Credit = not paid)', type: 'pay' }, { k: 'account', t: 'Received into account', type: 'acct' }, { k: 'payDate', t: 'Payment date', type: 'date' }, { k: 'notes', t: 'Notes (printed)', type: 'area' },
  ],
  summary: (r) => { const c = CE.saleCalc({ ...r, igst: isInter(r) }); return `<div class="sum"><div>Taxable value<b>${inr(c.taxable)}</b></div>${c.interState ? `<div>IGST<b>${inr(c.igst)}</b></div>` : `<div>CGST<b>${inr(c.cgst)}</b></div><div>SGST<b>${inr(c.sgst)}</b></div>`}<div>Invoice total<b>${inr(c.total)}</b></div><div>Outstanding<b class="${c.total - num(r.received) > 0 ? 'neg' : ''}">${inr(c.total - num(r.received))}</b></div><div>Tax rates<b style="font-size:14px">${c.groups.map((g) => (g.nonGst ? 'Non-GST' : g.pct + '%') + ' on ' + inr0(g.taxable)).join(' · ') || '—'}</b></div></div>${c.nonGst ? '<p class="mute" style="font-size:13px;margin:6px 0 0">All items non-GST → prints as a <b>Bill of Supply</b>.</p>' : ''}`; },
  validate: (r) => { const e = []; const ls = (r.lines || []); if (!ls.length) e.push('Add at least one item'); ls.forEach((l, i) => { const c = CE.saleLine(l); if (c.qty <= 0) e.push(`Item ${i + 1}: quantity is 0`); if (num(l.rate) <= 0) e.push(`Item ${i + 1}: selling rate is needed`); if (l.cat === 'door' && num(l.pcs) % 1) e.push(`Item ${i + 1}: number of doors must be whole`); if (l.gstMode === 'custom' && !(num(l.gstPct) >= 0 && num(l.gstPct) <= 28)) e.push(`Item ${i + 1}: custom GST % must be 0–28`); }); if (r.customerGstin && !CE.gstinCheck(r.customerGstin).ok) e.push('Customer GSTIN: ' + CE.gstinCheck(r.customerGstin).msg); if (S().company.gstin && !r.placeOfSupply) e.push('Select the place of supply'); if (r.invoiceNo && act('sales').some((s) => s.id !== r.id && String(s.invoiceNo).trim().toLowerCase() === String(r.invoiceNo).trim().toLowerCase())) e.push(`Invoice ${r.invoiceNo} already exists — duplicate blocked`); return e; },
  prepare: (r) => { if (r.customerGstin) r.customerGstin = String(r.customerGstin).trim().toUpperCase(); if (!r.seller && S().company.gstin) r.seller = sellerSnapshot(); r.igst = isInter(r); },
  makeId: async (r) => {
    if (!r.invoiceNo) { const fy = CE.fyOf(r.date, S().fyStart).label; r.invoiceNo = await seqId('sales', `${S().invoicePrefix}/${fy}/`, 'invoiceNo', 4); }
    const id = ST.safeSeg(r.invoiceNo); if (await ST.exists('sales', id)) throw new Error(`Invoice ${r.invoiceNo} already exists — duplicate blocked`); return id;
  },
};
/* sale return = credit note. Goods go back to the lot they came from; revenue, GST, cost of sales
   and the customer's balance are reversed. The original invoice is never edited. */
const retLeft = (r) => model().returnable(r.refInvoice, r.id) || [];
SPEC.returns = {
  coll: 'sales', title: 'sale return (credit note)', pdf: true,
  fields: [
    { type: 'html', html: (r) => { const o = ST.get('sales', r.refInvoice); return `<div class="note">Credit note against invoice <b>${esc(o ? o.invoiceNo : r.refInvoice)}</b> · ${esc(r.customer || '')} · dated ${esc(o ? dd(o.date) : '')}. Rates and GST are those of the original invoice.</div>`; } },
    { k: 'date', t: 'Return date', type: 'date', req: true }, { k: 'reason', t: 'Reason for return / correction', req: true },
    { type: 'sec', t: 'Items returned' },
    { type: 'custom', render: (r) => { const left = retLeft(r); return `<div class="full lines">${(r.lines || []).map((l, i) => { const t = left[num(l.srcLine)] || {}; const max = l.cat === 'door' ? t.pcs : t.qty; return `<div class="ln"><span class="calc" style="min-width:220px">${CE.LABEL[l.cat]}${l.cat === 'door' ? ` ${+l.w}×${+l.h}″` : ''}${l.lotId ? ` · lot ${esc(l.lotId)}` : ''} @ ${inr(l.rate)}</span>${l.cat === 'door' ? `<label class="f"><span>Doors returned (max ${qf(max, 0)})</span><input type="number" step="1" id="rp${i}" data-k="lines.${i}.pcs" value="${esc(l.pcs)}"></label>` : `<label class="f"><span>Qty returned (max ${qf(max, 4)})</span><input type="number" step="any" id="rq${i}" data-k="lines.${i}.qty" value="${esc(l.qty)}"></label>`}<span class="calc" data-lcalc="${i}">${saleLineCalc(l)}</span></div>`; }).join('')}</div>`; } },
    { k: 'received', t: 'Refund paid now (₹)', type: 'num' }, { k: 'payMode', t: 'Refund mode', type: 'pay' }, { k: 'account', t: 'Paid from account', type: 'acct' }, { k: 'notes', t: 'Notes (printed)', type: 'area' },
  ],
  lineCalc: (r, i) => saleLineCalc(r.lines[+i] || {}),
  summary: (r) => { const c = CE.saleCalc({ ...r, lines: (r.lines || []).filter((l) => CE.saleLine(l).qty > 0) }); return `<div class="sum"><div>Taxable value reversed<b>${inr(c.taxable)}</b></div>${c.interState ? `<div>IGST reversed<b>${inr(c.igst)}</b></div>` : `<div>CGST reversed<b>${inr(c.cgst)}</b></div><div>SGST reversed<b>${inr(c.sgst)}</b></div>`}<div>Credit note total<b>${inr(c.total)}</b></div><div>Reduces customer balance by<b>${inr(c.total - num(r.received))}</b></div></div>`; },
  validate: (r) => { const e = []; const left = retLeft(r); const ls = (r.lines || []).filter((l) => CE.saleLine(l).qty > 0); if (!ls.length) e.push('Enter the quantity returned for at least one item');
    (r.lines || []).forEach((l, i) => { const t = left[num(l.srcLine)]; if (!t) { e.push(`Item ${i + 1} is not on the original invoice`); return; } const q = l.cat === 'door' ? num(l.pcs) : num(l.qty); const max = l.cat === 'door' ? t.pcs : t.qty; if (q < 0) e.push(`Item ${i + 1}: quantity cannot be negative`); if (q > max + 1e-6) e.push(`Item ${i + 1}: only ${qf(max, 4)} can still be returned`); if (l.cat === 'door' && q % 1) e.push(`Item ${i + 1}: doors must be whole`); });
    const c = CE.saleCalc({ ...r, lines: ls }); if (num(r.received) > c.total + 0.005) e.push('Refund is more than the credit note'); return e; },
  prepare: (r) => { r.lines = (r.lines || []).filter((l) => CE.saleLine(l).qty > 0); r.kind = 'return'; const o = ST.get('sales', r.refInvoice); r.refInvoiceNo = o ? o.invoiceNo : ''; },
  makeId: async (r) => { const fy = CE.fyOf(r.date, S().fyStart).label; r.invoiceNo = await seqId('sales', `CN/${fy}/`, 'invoiceNo', 4); const id = ST.safeSeg(r.invoiceNo); if (await ST.exists('sales', id)) throw new Error(`Credit note ${r.invoiceNo} already exists — duplicate blocked`); return id; },
};
function openReturn(id) {
  const o = ST.get('sales', id); if (!o || o.kind === 'return') return;
  const left = model().returnable(id) || [];
  if (!left.some((l) => (l.cat === 'door' ? l.pcs : l.qty) > 1e-6)) return dialog({ title: 'Nothing left to return', body: `<p>Everything on invoice ${esc(o.invoiceNo)} has already been returned.</p>`, cancel: '' });
  openForm(SPEC.returns, null);
  Object.assign(FORM.r, { kind: 'return', refInvoice: id, customer: o.customer, customerGstin: o.customerGstin || '', customerAddress: o.customerAddress || '', placeOfSupply: o.placeOfSupply || '', gstMode: o.gstMode, gstPct: o.gstPct, igst: !!o.igst, seller: o.seller, reverseCharge: o.reverseCharge || 'N',
    lines: left.map((l, i) => ({ srcLine: i, cat: l.cat, lotId: l.lotId, w: l.w, h: l.h, rate: l.rate, gstMode: l.gstMode, gstPct: l.gstPct, hsn: l.hsn, pcs: '', qty: '' })) });
  drawForm();
}
SPEC.mistri = {
  coll: 'mistri', title: 'mistri payment', defaults: () => ({}),
  fields: [{ k: 'date', t: 'Date', type: 'date', req: true }, { k: 'mistri', t: 'Mistri name', type: 'party', req: true }, { k: 'lotId', t: 'Lot ID', type: 'lot', re: true }, { k: 'batchId', t: 'Production batch', type: 'batch', re: true },
    { k: 'size', t: 'Door size', type: 'select', opts: (r) => { const b = model().batches[r.batchId]; const s = b ? b.pc.doors.map((d) => d.key.replace('x', ' × ') + ' in') : []; return [['', '— any / mixed —'], ...[...new Set(s)]]; } },
    { k: 'pcs', t: 'Number of doors', type: 'num', req: true, min: 0 }, { k: 'rate', t: 'Rate per door (₹)', type: 'num', req: true, min: 0 },
    { k: 'tot', t: 'Total making charges', type: 'calc', calc: (r) => inr(CE.mistriTotal(r)) }, { k: 'advance', t: 'Advance paid', type: 'num' }, { k: 'paid', t: 'Final paid', type: 'num' },
    { k: 'bal', t: 'Balance', type: 'calc', calc: (r) => inr(CE.mistriTotal(r) - num(r.advance) - num(r.paid)) }, { k: 'payMode', t: 'Payment mode', type: 'pay' }, { k: 'account', t: 'Paid from account', type: 'acct' }, { k: 'notes', t: 'Work details / measurements', type: 'area' }],
  onChange: (r, k) => { if (k === 'batchId' && r.batchId) { const b = model().batches[r.batchId]; if (b) { r.lotId = b.lotId; if (!r.pcs) r.pcs = b.pc.doorPcs; } } },
  validate: (r) => (num(r.pcs) % 1 ? ['Number of doors must be whole'] : []),
  makeId: async () => ST.rid('M'),
};
const EXP_T = [['repair', 'Machine repair'], ['blade', 'Blade sharpening'], ['electricity', 'Electricity'], ['consumable', 'Flash door consumables'], ['other', 'Other expense']];
SPEC.expenses = {
  coll: 'expenses', title: 'expense', defaults: () => ({ type: 'repair', nature: 'business' }),
  fields: [
    { k: 'type', t: 'Expense type', type: 'select', opts: EXP_T, re: true, req: true }, { k: 'date', t: 'Date / bill date', type: 'date', req: true },
    { k: 'machine', t: 'Machine details', show: (r) => r.type === 'repair' }, { k: 'problem', t: 'Problem description', show: (r) => r.type === 'repair' }, { k: 'technician', t: 'Technician', type: 'party', show: (r) => r.type === 'repair' },
    { k: 'blades', t: 'Number of blades', type: 'num', show: (r) => r.type === 'blade' }, { k: 'perBlade', t: 'Cost per blade', type: 'num', show: (r) => r.type === 'blade' },
    { k: 'period', t: 'Billing period', show: (r) => r.type === 'electricity' }, { k: 'units', t: 'Units (kWh, optional)', type: 'num', show: (r) => r.type === 'electricity' },
    { k: 'item', t: 'Item', type: 'select', opts: ['Nails', 'Fasteners', 'Glue', 'Other consumables'], show: (r) => r.type === 'consumable' }, { k: 'qty', t: 'Quantity', type: 'num', show: (r) => r.type === 'consumable' }, { k: 'unitRate', t: 'Unit rate', type: 'num', show: (r) => r.type === 'consumable' },
    { k: 'description', t: 'Description', show: (r) => r.type === 'other' || r.type === 'consumable' }, { k: 'category', t: 'Category', show: (r) => r.type === 'other' },
    { k: 'amount', t: 'Amount (₹, excl. GST)', type: 'num', req: true, show: (r) => !['blade', 'consumable'].includes(r.type) },
    { k: 'tot', t: 'Total', type: 'calc', calc: (r) => inr(CE.expenseAmount(r)), show: (r) => ['blade', 'consumable'].includes(r.type) },
    { k: 'gstAmt', t: 'GST on the bill (claimable)', type: 'num' },
    { k: 'payStatus', t: 'Has this been paid?', type: 'select', req: true, re: true, opts: [['', '— choose —'], ['paid', 'Yes — paid now'], ['unpaid', 'No — not paid yet (pay later from Payments)']] },
    { k: 'payMode', t: 'Paid by', type: 'pay', show: (r) => r.payStatus === 'paid' }, { k: 'payDate', t: 'Payment date (blank = bill date)', type: 'date', show: (r) => r.payStatus === 'paid' }, { k: 'account', t: 'Paid from account', type: 'acct', show: (r) => r.payStatus === 'paid' },
    { k: 'nature', t: 'Business or personal', type: 'select', opts: [['business', 'Business expense'], ['personal', 'Personal (owner drawings — not a business cost)']] }, { k: 'vendor', t: 'Paid to (vendor)', type: 'party' }, { k: 'refNo', t: 'Supporting reference (bill / receipt no.)' },
    { k: 'lotId', t: 'Related lot (optional)', type: 'lot', re: true }, { k: 'batchId', t: 'Related batch (optional)', type: 'batch' },
    { k: 'attachmentId', t: 'Invoice / receipt', type: 'file', show: (r) => r.type === 'repair' || r.type === 'other' || r.type === 'electricity' },
    { k: 'notes', t: 'Notes', type: 'area' },
  ],
  summary: (r) => `<p class="mute" style="font-size:13px;margin:0">${isAdmin() ? 'Saved as <b>approved</b> (you are an admin).' : 'Saved as <b>waiting for admin approval</b> — it is not counted in profit until approved.'} ${r.payStatus === 'paid' ? '<b>Paid:</b> cash / bank goes down now, whatever the approval status; approving later does not take the money out again.' : r.payStatus === 'unpaid' ? '<b>Not paid:</b> no money moves now. Once approved it is shown as owed; pay it from Payments.' : ''} ${r.nature === 'personal' ? 'Personal: shown as owner drawings, never as a business cost.' : ''} ${r.batchId ? 'Charged to that batch.' : r.lotId ? 'Spread over the lot\'s batches by input KG.' : CE.MFG_EXP.includes(r.type) && S().allocShared ? 'Not linked: shared over all batches produced in the same month by input KG; if none, it counts as overhead.' : 'Counted as general overhead in net profit.'}${r.type === 'consumable' ? ' Consumables are charged to Flash Doors only.' : ''}</p>`,
  validate: (r) => { const e = []; if (CE.expenseAmount(r) <= 0) e.push('Amount must be more than 0'); if (r.payStatus === 'paid' && (!r.payMode || /credit/i.test(r.payMode))) e.push('Choose how it was paid (Cash, UPI, Bank transfer or Cheque) — or choose "not paid yet"'); return e; },
  makeId: async () => ST.rid('E'),
};
const notT = (r) => r.direction !== 'transfer';
SPEC.payments = {
  coll: 'payments', title: 'payment', defaults: () => ({ direction: 'in' }),
  fields: [{ k: 'date', t: 'Date', type: 'date', req: true }, { k: 'direction', t: 'Type', type: 'select', re: true, opts: [['in', 'Receipt (money in)'], ['out', 'Payment (money out)'], ['transfer', 'Transfer between cash / bank']] }, { k: 'party', t: 'Party', type: 'party', req: true, re: true, show: notT },
    { k: 'refId', t: 'Against', type: 'select', re: true, show: notT, opts: (r) => { const m = model(); const pk = CE.pkey(r.party); const list = r.direction === 'out' ? m.purchRows.filter((L) => (!pk || CE.pkey(L.rec.supplier) === pk) && (L.outstanding > 0.005 || L.rec.id === r.refId)).map((L) => [L.rec.id, `Lot ${L.id} · due ${inr(L.outstanding)}`]).concat(m.saleRows.filter((s) => s.ret && (!pk || CE.pkey(s.rec.customer) === pk) && (s.outstanding < -0.005 || s.rec.id === r.refId)).map((s) => [s.rec.id, `Refund on ${s.rec.invoiceNo} · due ${inr(-s.outstanding)}`])) : m.saleRows.filter((s) => !s.ret && (!pk || CE.pkey(s.rec.customer) === pk) && (s.outstanding > 0.005 || s.rec.id === r.refId)).map((s) => [s.rec.id, `${s.rec.invoiceNo} · due ${inr(s.outstanding)}`]); const ex = m.expRows.filter((x) => (!pk || CE.pkey(x.rec.vendor || '') === pk || !x.rec.vendor) && (r.direction === 'out' ? x.outstanding > 0.005 : x.recoverable > 0.005) || x.rec.id === r.refId).map((x) => [x.rec.id, r.direction === 'out' ? `Expense ${CE.expLabel(x.rec)} · ${dd(x.rec.date)} · due ${inr(x.outstanding)}` : `Refund of rejected expense ${CE.expLabel(x.rec)} · ${inr(x.recoverable)}`]); return [['', 'On account / advance / opening balance'], ...list, ...ex]; } },
    { k: 'fromAccount', t: 'From account', type: 'select', req: true, show: (r) => !notT(r), opts: () => [['', '—'], ...S().accounts.map((a) => [a.id, a.name])] }, { k: 'toAccount', t: 'To account', type: 'select', req: true, show: (r) => !notT(r), opts: () => [['', '—'], ...S().accounts.map((a) => [a.id, a.name])] },
    { k: 'amount', t: 'Amount paid / received (₹)', type: 'num', req: true, min: 0 }, { k: 'tds', t: 'TDS deducted (₹, if any)', type: 'num', min: 0, show: notT }, { k: 'mode', t: 'Mode', type: 'pay', show: notT }, { k: 'account', t: 'Account', type: 'acct', show: notT }, { k: 'notes', t: 'Notes / reference', type: 'area' }],
  summary: (r) => (notT(r) && num(r.tds) ? `<p class="mute" style="font-size:13px;margin:0">Settles ${inr(num(r.amount) + num(r.tds))} of the bill: ${inr(r.amount)} money + ${inr(r.tds)} TDS (${r.direction === 'out' ? 'you deducted — deposit it with the government' : 'customer deducted — claim it as TDS credit'}).</p>` : ''),
  onChange: (r, k) => { if (k === 'refId' && r.refId && !r.amount) { const m = model(); const e = m.expRows.find((y) => y.rec.id === r.refId); if (e) { r.amount = CE.r2(r.direction === 'out' ? e.outstanding : e.recoverable); if (!r.party && e.rec.vendor) r.party = e.rec.vendor; return; } const x = m.purchRows.find((L) => L.rec.id === r.refId) || m.saleRows.find((s) => s.rec.id === r.refId); if (x) r.amount = CE.r2(Math.abs(x.outstanding)); } },
  validate: (r) => { const e = []; if (num(r.amount) <= 0) e.push('Amount must be more than 0'); if (!notT(r) && r.fromAccount && r.fromAccount === r.toAccount) e.push('From and to account must be different'); if (num(r.tds) < 0) e.push('TDS cannot be negative'); return e; },
  makeId: async () => ST.rid('P'),
};
SPEC.adjustments = {
  coll: 'adjustments', title: 'stock adjustment',
  fields: [{ k: 'date', t: 'Date', type: 'date', req: true }, { k: 'product', t: 'Product', type: 'select', req: true, opts: [['', '—'], ['raw', 'Raw scrap wood (KG, choose the lot)'], ['door', 'Flash Door (SQ FT)'], ['firewood', 'Firewood (KG)'], ['bhushi', 'Bhushi (KG)'], ['jabra', 'Jabra (SQ FT)']] },
    { k: 'lotId', t: 'Lot', type: 'lot' }, { k: 'qty', t: 'Quantity (+ add / − remove)', type: 'num', req: true }, { k: 'reason', t: 'Reason (required)', type: 'area', req: true }],
  validate: (r) => (!isAdmin() ? ['Only an admin can adjust stock'] : num(r.qty) === 0 ? ['Quantity cannot be 0'] : []),
  makeId: async () => ST.rid('J'),
};
SPEC.parties = {
  coll: 'parties', title: 'party', defaults: () => ({ type: 'Customer', openingSide: 'receivable' }),
  fields: [{ k: 'name', t: 'Name', req: true }, { k: 'type', t: 'Type', type: 'select', opts: ['Customer', 'Supplier', 'Mistri', 'Labour', 'Technician', 'Other'] }, { k: 'phone', t: 'Phone' }, { k: 'gstin', t: 'GSTIN' }, { k: 'address', t: 'Address', type: 'area' },
    { type: 'sec', t: 'Opening balance (when you start using the ERP)' }, { k: 'opening', t: 'Opening balance (₹)', type: 'num', min: 0 }, { k: 'openingSide', t: 'Side', type: 'select', opts: [['receivable', 'They owe us'], ['payable', 'We owe them']] }, { k: 'openingDate', t: 'As on date', type: 'date' }],
  validate: (r) => (act('parties').some((p) => p.id !== r.id && CE.pkey(p.name) === CE.pkey(r.name)) ? ['A party with this name exists'] : []),
  makeId: async () => ST.rid('T'),
};

/* ---------- linked-record integrity ---------- */
function children(coll, rec) {
  const out = []; const A = (c) => act(c);
  const push = (c, list, why) => list.forEach((r) => out.push({ c, r, why }));
  if (coll === 'purchases') { const L = rec.lotId; ['unloading', 'production', 'mistri', 'expenses', 'adjustments'].forEach((c) => push(c, A(c).filter((r) => r.lotId === L), 'uses lot ' + L)); push('sales', A('sales').filter((s) => (s.lines || []).some((l) => l.lotId === L)), 'sells from lot ' + L); push('payments', A('payments').filter((p) => p.refId === rec.id), 'paid against it'); }
  if (coll === 'expenses') push('payments', A('payments').filter((p) => p.refId === rec.id), 'paid or refunded against it');
  if (coll === 'production') { ['mistri', 'expenses'].forEach((c) => push(c, A(c).filter((r) => r.batchId === rec.batchId), 'linked to batch ' + rec.batchId)); }
  if (coll === 'sales') { push('payments', A('payments').filter((p) => p.refId === rec.id), rec.kind === 'return' ? 'refund against it' : 'received against it'); push('sales', A('sales').filter((s) => s.kind === 'return' && s.refInvoice === rec.id), 'credit note against it'); }
  return out;
}
function missingParents(coll, rec) {
  const lots = new Set(act('purchases').map((p) => p.lotId)); const bs = new Set(act('production').map((b) => b.batchId)); const miss = [];
  if (rec.lotId && !lots.has(rec.lotId) && coll !== 'purchases') miss.push('lot ' + rec.lotId);
  (rec.lines || []).forEach((l) => { if (l.lotId && !lots.has(l.lotId)) miss.push('lot ' + l.lotId); });
  if (rec.batchId && coll !== 'production' && !bs.has(rec.batchId)) miss.push('batch ' + rec.batchId);
  if (rec.refId && !act('sales').concat(act('purchases'), act('expenses')).some((x) => x.id === rec.refId)) miss.push('linked invoice / purchase / expense');
  if (rec.kind === 'return' && !act('sales').some((x) => x.id === rec.refInvoice)) miss.push('original invoice');
  return [...new Set(miss)];
}
const label = (c, r) => ({ purchases: `Purchase lot ${r.lotId} · ${r.supplier || ''}`, unloading: `${CE.LABOUR[r.labourType] || CE.LABOUR.unloading} ${dd(r.date)} · ${r.team || ''} · ${inr(r.amount)}`, production: `Batch ${r.batchId}`, sales: `${r.kind === 'return' ? 'Credit note' : 'Invoice'} ${r.invoiceNo} · ${r.customer || ''}`, mistri: `Mistri ${r.mistri || ''} · ${dd(r.date)}`, expenses: `${CE.expLabel(r)} · ${dd(r.date)}`, payments: r.direction === 'transfer' ? `Transfer ${acctName(r.fromAccount)} → ${acctName(r.toAccount)} · ${inr(r.amount)}` : `${r.direction === 'out' ? 'Payment to' : 'Receipt from'} ${r.party || ''} · ${inr(r.amount)}`, adjustments: `Stock adjustment ${CE.LABEL[r.product] || ''} ${r.qty}`, parties: `Party ${r.name}` }[c] || r.id);

async function doDelete(coll, id) {
  const rec = ST.get(coll, id); if (!rec) return;
  if (MONEY_COLLS.includes(coll) && locked(rec) && !isAdmin()) { await dialog({ title: 'Books are closed', body: `<p>Entries dated on or before ${esc(dd(S().lockDate))} can only be changed by an admin.</p>`, cancel: '' }); return; }
  const kids = children(coll, rec);
  if (kids.length) { await dialog({ title: 'Linked entries exist', body: `<p>${esc(label(coll, rec))} cannot be deleted while these entries depend on it. Delete or change them first, so nothing is left orphaned:</p><ul>${kids.slice(0, 12).map((k) => `<li>${esc(label(k.c, k.r))} — ${esc(k.why)}</li>`).join('')}</ul>`, cancel: '' }); return; }
  const imp = stockImpact(coll, { ...rec, deleted: true }, rec);
  if (imp.length && !isAdmin()) { await dialog({ title: 'Stock would go negative', body: `<p class="note bad">${imp.map((n) => `${CE.LABEL[n.k]} lot ${esc(n.lot)} → ${qty(n.qty, n.k)}`).join('<br>')}</p><p>Sales already used this stock. Only an admin can approve.</p>`, cancel: '' }); return; }
  const why = await dialog({ title: 'Move to Deleted Records?', body: `<p><b>${esc(label(coll, rec))}</b></p>${imp.length ? `<p class="note bad">Stock goes negative: ${imp.map((n) => `${CE.LABEL[n.k]} lot ${esc(n.lot)} → ${qty(n.qty, n.k)}`).join(', ')}</p>` : ''}<p>All totals, stock and balances are recalculated. You can restore it from Deleted Records.</p>`, ok: 'Delete', danger: true, input: true, inputLabel: imp.length ? 'Reason (required for stock exception)' : 'Reason (optional)', check: (v) => !imp.length || v.trim().length > 2 });
  if (why === null) return;
  try { await ST.softDelete(coll, rec, why); toast('Moved to Deleted Records'); } catch (e) { toast(e.message); }
}
async function doRestore(coll, id) {
  const rec = ST.get(coll, id); const miss = missingParents(coll, rec);
  if (miss.length) { await dialog({ title: 'Cannot restore yet', body: `<p>This entry depends on ${esc(miss.join(', '))}, which is deleted. Restore that first.</p>`, cancel: '' }); return; }
  const imp = stockImpact(coll, { ...rec, deleted: false }, rec);
  if (imp.length) { if (!isAdmin()) { toast('Restoring would make stock negative — admin approval needed'); return; } const ok = await dialog({ title: 'Stock goes negative', body: `<p class="note bad">${imp.map((n) => `${CE.LABEL[n.k]} lot ${esc(n.lot)} → ${qty(n.qty, n.k)}`).join('<br>')}</p>`, ok: 'Restore anyway', danger: true }); if (!ok) return; }
  try { await ST.restore(coll, rec); toast('Restored'); } catch (e) { toast(e.message); }
}
async function doPurge(coll, id) {
  const rec = ST.get(coll, id);
  const anyKids = (() => { const all = ST.all(); const L = rec.lotId; if (coll === 'purchases') return Object.entries(all).some(([c, rs]) => c !== 'purchases' && rs.some((r) => r.lotId === L || (r.lines || []).some((l) => l.lotId === L) || r.refId === rec.id)); if (coll === 'production') return ['mistri', 'expenses'].some((c) => all[c].some((r) => r.batchId === rec.batchId)); if (coll === 'expenses') return all.payments.some((p) => p.refId === rec.id); if (coll === 'sales') return all.payments.some((p) => p.refId === rec.id) || all.sales.some((x) => x.kind === 'return' && x.refInvoice === rec.id); return false; })();
  if (anyKids) { await dialog({ title: 'Linked entries exist', body: '<p>Other entries (active or deleted) still point to this one. Permanently delete those first.</p>', cancel: '' }); return; }
  const v = await dialog({ title: 'Permanently delete?', body: `<p><b>${esc(label(coll, rec))}</b> will be erased from the ${LOCAL ? 'database on this device' : 'cloud database'}. This cannot be undone. Its audit history stays.</p>`, ok: 'Erase forever', danger: true, input: true, inputLabel: 'Type DELETE to confirm', check: (x) => x === 'DELETE' });
  if (!v) return; try { await ST.purge(coll, rec); toast('Permanently deleted'); } catch (e) { toast(e.message); }
}

async function pdfFor(rec) {
  const s = model().saleRows.find((x) => x.rec.id === rec.id); const c = CE.saleCalc(rec);
  const blob = EX.invoicePdf(rec, c, { ...S().company, ...(rec.seller || {}) }, s ? { received: s.received, outstanding: s.outstanding } : null, CE);
  await saveFile(`Invoice ${String(rec.invoiceNo).replace(/[\\/:*?"<>|]/g, '-')}.pdf`, blob);
}

/* ======================================================================
   CHARTS (SVG drawn at real size)
   ====================================================================== */
const CH = {};
function chart(id, spec) { CH[id] = spec; return `<div class="fig" id="${id}"><svg role="img" aria-label="${esc(spec.title || '')}"></svg></div>${spec.series ? `<div class="legend">${spec.series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : ''}`; }
const ro = new ResizeObserver((es) => es.forEach((e) => drawChart(e.target)));
function drawChart(el) {
  const sp = CH[el.id]; const s = el.querySelector('svg'); if (!sp || !s) return;
  const W = s.clientWidth, H = s.clientHeight; if (!W || !H) return;
  const pad = { l: W < 520 ? 44 : 64, r: 8, t: 10, b: 26 };
  const all = sp.series.flatMap((x) => x.vals); const max = Math.max(0, ...all), min = Math.min(0, ...all);
  const span = max - min || 1; const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / span);
  const n = sp.labels.length; const bw = (W - pad.l - pad.r) / Math.max(1, n);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = min + (span * i) / 4; g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--mute)">${sp.fmt ? sp.fmt(v) : qf(v)}</text>`; }
  const every = Math.ceil(n / Math.max(1, Math.floor((W - pad.l) / 46)));
  sp.labels.forEach((l, i) => { if (i % every === 0) g += `<text x="${pad.l + bw * (i + 0.5)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--mute)">${esc(l)}</text>`; });
  const line = (se) => { const pts = se.vals.map((v, i) => `${pad.l + bw * (i + 0.5)},${y(v)}`).join(' '); return `<polyline points="${pts}" fill="none" stroke="${se.color}" stroke-width="2.5"/>${se.vals.map((v, i) => `<circle cx="${pad.l + bw * (i + 0.5)}" cy="${y(v)}" r="3.5" fill="${se.color}" stroke="#0b0a08"><title>${esc(se.name)} ${esc(sp.labels[i])}: ${sp.fmt ? sp.fmt(v) : qf(v)}</title></circle>`).join('')}`; };
  if (sp.type === 'combo') { const se = sp.series[0]; const w = Math.min(bw * 0.6, 34); se.vals.forEach((v, i) => { const x = pad.l + bw * (i + 0.5) - w / 2; const y0 = y(Math.max(0, v)), y1 = y(Math.min(0, v)); g += `<rect x="${x}" y="${y0}" width="${w}" height="${Math.max(0.5, y1 - y0)}" rx="2" fill="url(#cg)"><title>${esc(se.name)} ${esc(sp.labels[i])}: ${sp.fmt ? sp.fmt(v) : qf(v)}</title></rect>`; }); g += line(sp.series[1]); }
  else if (sp.type === 'line') sp.series.forEach((se) => { const pts = se.vals.map((v, i) => `${pad.l + bw * (i + 0.5)},${y(v)}`).join(' '); g += `<polyline points="${pts}" fill="none" stroke="${se.color}" stroke-width="2.5"/>${se.vals.map((v, i) => `<circle cx="${pad.l + bw * (i + 0.5)}" cy="${y(v)}" r="3" fill="${se.color}"><title>${esc(sp.labels[i])}: ${sp.fmt ? sp.fmt(v) : qf(v)}</title></circle>`).join('')}`; });
  else { const k = sp.series.length; const gw = Math.min(bw * 0.78, 18 * k + 8); const w = gw / k; sp.series.forEach((se, j) => se.vals.forEach((v, i) => { const x = pad.l + bw * (i + 0.5) - gw / 2 + j * w; const y0 = y(Math.max(0, v)), y1 = y(Math.min(0, v)); g += `<rect x="${x}" y="${y0}" width="${Math.max(1, w - 2)}" height="${Math.max(0.5, y1 - y0)}" rx="2" fill="${se.color}"><title>${esc(se.name)} ${esc(sp.labels[i])}: ${sp.fmt ? sp.fmt(v) : qf(v)}</title></rect>`; })); }
  g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--mute)"/>`;
  s.innerHTML = `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe39a"/><stop offset="1" stop-color="#b8861f"/></linearGradient></defs>` + g;
}
const kfmt = (v) => { const a = Math.abs(v); return (v < 0 ? '-' : '') + (a >= 1e7 ? qf(a / 1e7, 1) + 'Cr' : a >= 1e5 ? qf(a / 1e5, 1) + 'L' : a >= 1e3 ? qf(a / 1e3, 1) + 'k' : qf(a, 0)); };
const hbars = (rows, fmt) => { const mx = Math.max(1e-9, ...rows.map((r) => Math.abs(r[1]))); return rows.length ? `<div class="bars">${rows.map(([l, v, s]) => `<div class="bar"><span>${esc(l)}</span><span><i class="${v < 0 ? 'n' : ''}" style="width:${Math.max(1, (Math.abs(v) / mx) * 100)}%"></i></span><span class="${v < 0 ? 'neg' : ''}" style="white-space:nowrap">${(fmt || inr0)(v)}${s ? ` <span class="mute">${s}</span>` : ''}</span></div>`).join('')}</div>` : '<div class="empty">No data yet.</div>'; };
function months() { const r = rng(); let from = r.from, to = r.to || ST.today(); if (!from) { const ds = ST.all().sales.concat(ST.all().purchases).map((x) => x.date).filter(Boolean).sort(); from = ds[0] || ST.today(); } const out = []; let [y, m] = from.split('-').map(Number); const [ty, tm] = to.split('-').map(Number); while ((y < ty || (y === ty && m <= tm)) && out.length < 36) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } } return out; }
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mlabel = (k) => MN[+k.slice(5) - 1] + (k.slice(5) === '01' || k.slice(5) === '04' ? " '" + k.slice(2, 4) : '');

/* ======================================================================
   PAGES
   ====================================================================== */
const PAGES = {};
/* ---------- brand art ---------- */
let LGI = 0;
const LOGO = (w = 64) => { const id = 'lg' + (LGI++); return `<svg viewBox="0 0 120 92" width="${w}" height="${Math.round(w * 92 / 120)}" role="img" aria-label="CE monogram"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".42" stop-color="#e8bb4c"/><stop offset=".56" stop-color="#a87618"/><stop offset="1" stop-color="#f3d277"/></linearGradient></defs><path d="M98 20 C 82 4, 30 2, 13 30 C 0 54, 22 82, 58 84 C 80 85, 98 76, 108 62" fill="none" stroke="url(#${id})" stroke-width="8" stroke-linecap="round"/><path d="M98 20 C 104 26, 108 30, 110 36" fill="none" stroke="url(#${id})" stroke-width="4" stroke-linecap="round"/><text x="62" y="66" text-anchor="middle" font-family="'Barlow Condensed','Arial Narrow',sans-serif" font-weight="800" font-style="italic" font-size="56" letter-spacing="-2" fill="url(#${id})" stroke="#4a3208" stroke-width="1.2" paint-order="stroke">CE</text></svg>`; };
const WOOD = { raw: '<svg viewBox="0 0 44 30" aria-hidden="true">' + [[8, 22], [20, 22], [32, 22], [14, 11], [26, 11]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#c98a3e" stroke="#7a4a17"/><circle cx="${x}" cy="${y}" r="3.4" fill="none" stroke="#f1c27d"/>`).join('') + '</svg>',
  door: '<svg viewBox="0 0 44 30" aria-hidden="true"><rect x="13" y="1" width="18" height="28" rx="1.5" fill="#b8742c" stroke="#f1c27d"/><rect x="16" y="4" width="12" height="9" fill="none" stroke="#e7a95b"/><rect x="16" y="16" width="12" height="10" fill="none" stroke="#e7a95b"/><circle cx="27" cy="15" r="1.2" fill="#f3d27a"/></svg>',
  firewood: '<svg viewBox="0 0 44 30" aria-hidden="true"><path d="M4 22 L30 10 L36 16 L10 28Z" fill="#b5763a" stroke="#6e4116"/><path d="M10 16 L36 6 L40 11 L14 21Z" fill="#d39552" stroke="#6e4116"/><ellipse cx="38" cy="8.5" rx="2.5" ry="3" fill="#f1c27d"/></svg>',
  bhushi: '<svg viewBox="0 0 44 30" aria-hidden="true"><path d="M3 27 C 10 10, 34 10, 41 27Z" fill="#e2b56c"/><path d="M10 27 C 15 16, 29 16, 34 27Z" fill="#f0cd8c"/>' + [[12, 22], [20, 17], [27, 21], [33, 24], [18, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#9c6a2a"/>`).join('') + '</svg>',
  jabra: '<svg viewBox="0 0 44 30" aria-hidden="true"><path d="M3 18 L27 6 L41 12 L17 24Z" fill="#e7b46a" stroke="#8a5a20"/><path d="M3 18 L17 24 L17 27 L3 21Z" fill="#a8702e"/><path d="M17 24 L41 12 L41 15 L17 27Z" fill="#c48a45"/><path d="M9 17 L31 8M13 19 L35 10" stroke="#c88d45" stroke-width=".6"/></svg>',
  truck: '<svg viewBox="0 0 58 40" aria-hidden="true"><rect x="3" y="10" width="32" height="18" rx="2" fill="#e7a63c"/><path d="M35 15h10l7 7v6H35z" fill="#d19129"/><rect x="38" y="17" width="7" height="5" fill="#2a2015"/><circle cx="13" cy="31" r="4" fill="#222" stroke="#f3d27a"/><circle cx="44" cy="31" r="4" fill="#222" stroke="#f3d27a"/></svg>',
  saw: '<svg viewBox="0 0 58 40" aria-hidden="true"><rect x="2" y="26" width="54" height="8" rx="1" fill="#b8742c"/><g transform="translate(29 22)"><polygon points="' + Array.from({ length: 32 }, (_, i) => { const a = (i * Math.PI) / 16, r = i % 2 ? 13 : 16; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(' ') + '" fill="#e6c160"/><circle r="8" fill="#c9cdd2"/><circle r="2.5" fill="#333"/></g></svg>',
  logs: '<svg viewBox="0 0 58 40" aria-hidden="true">' + [[14, 30], [29, 30], [44, 30], [21, 17], [36, 17]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#c98a3e" stroke="#7a4a17"/><circle cx="${x}" cy="${y}" r="4.2" fill="none" stroke="#f1c27d"/>`).join('') + '</svg>',
};
const pic = (k, big) => WOOD[k].replace('<svg ', `<svg class="${big ? 'pi' : ''}" `);
function heroArt() {
  let planks = '';
  for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { const x = 20 + c * 30 + (r % 2) * 6, y = 210 - (r + 1) * 22; if (x > 250 - r * 22) continue; planks += `<rect x="${x}" y="${y}" width="28" height="20" rx="1.5" fill="url(#pw)" stroke="#6b3f14" stroke-width="1"/><path d="M${x + 4} ${y + 6}h20M${x + 4} ${y + 12}h16" stroke="#a96b2c" stroke-width="1" opacity=".7"/>`; }
  const teeth = Array.from({ length: 48 }, (_, i) => { const a = (i * Math.PI) / 24, rr = i % 2 ? 62 : 70; return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
  return `<svg class="art" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
  <radialGradient id="hg1" cx=".18" cy=".6" r=".5"><stop offset="0" stop-color="#7a4a14" stop-opacity=".75"/><stop offset="1" stop-color="#0c0a07" stop-opacity="0"/></radialGradient>
  <radialGradient id="hg2" cx=".88" cy=".45" r=".42"><stop offset="0" stop-color="#8a5718" stop-opacity=".7"/><stop offset="1" stop-color="#0c0a07" stop-opacity="0"/></radialGradient>
  <linearGradient id="pw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4c983"/><stop offset="1" stop-color="#c48640"/></linearGradient>
  <linearGradient id="dw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8c4f1c"/><stop offset=".5" stop-color="#c7823e"/><stop offset="1" stop-color="#8c4f1c"/></linearGradient>
  <radialGradient id="bl" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f2f3f5"/><stop offset=".7" stop-color="#9ea4ab"/><stop offset="1" stop-color="#5d636a"/></radialGradient>
  <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d10"/><stop offset="1" stop-color="#0c0a07"/></linearGradient></defs>
  <rect width="1200" height="220" fill="#0c0a07"/><rect width="1200" height="220" fill="url(#hg1)"/><rect width="1200" height="220" fill="url(#hg2)"/>
  <rect y="208" width="1200" height="12" fill="url(#fl)"/><line x1="0" y1="208" x2="1200" y2="208" stroke="#d4a537" stroke-opacity=".35"/>
  ${planks}
  <g transform="translate(975 150)"><g class="blade"><polygon points="${teeth}" fill="url(#bl)"/><circle r="40" fill="none" stroke="#7b8188" stroke-width="2"/><circle r="10" fill="#3a3d42" stroke="#c9cdd2"/></g></g>
  <rect x="922" y="196" width="140" height="14" fill="#6b4520"/>
  <rect x="1062" y="18" width="128" height="192" fill="#3a2410" stroke="#d4a537" stroke-opacity=".5"/>
  <g transform="translate(1074 28)"><rect width="104" height="182" fill="url(#dw)"/><rect x="12" y="14" width="80" height="62" fill="none" stroke="#e8a85e" stroke-width="3"/><rect x="12" y="92" width="80" height="78" fill="none" stroke="#e8a85e" stroke-width="3"/><circle cx="88" cy="88" r="4" fill="#f3d27a"/></g>
  <rect x="1062" y="18" width="128" height="192" fill="none" stroke="#ffd98a" stroke-opacity=".25" stroke-width="6"/>
  </svg>`;
}
function donut(parts, centre, sub) {
  const tot = parts.reduce((a, p) => a + Math.max(0, p.v), 0); let off = 0; const C = 2 * Math.PI * 44;
  const arcs = tot > 0 ? parts.filter((p) => p.v > 0).map((p) => { const len = (p.v / tot) * C; const s = `<circle cx="60" cy="60" r="44" fill="none" stroke="${p.c}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"><title>${esc(p.l)}: ${inr0(p.v)}</title></circle>`; off += len; return s; }).join('') : '<circle cx="60" cy="60" r="44" fill="none" stroke="#2a251b" stroke-width="16"/>';
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Sales by product">${arcs}<circle cx="60" cy="60" r="35" fill="#0f0d09"/><text x="60" y="58" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="700" font-size="${centre.length > 10 ? 12 : 14}" fill="#f4ede0">${esc(centre)}</text><text x="60" y="72" text-anchor="middle" font-size="8" fill="#a99f8b">${esc(sub)}</text></svg>`;
}
const PCOL = { raw: '#c98a3e', door: '#e2b13c', firewood: '#f08a2c', bhushi: '#3fbf6f', jabra: '#a46ee6' };
const tile = (cls, icon, l, v, s) => `<div class="tk ${cls}"><div class="ic">${ic(icon)}</div><div><div class="l">${l}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div></div>`;
PAGES.dashboard = () => {
  const m = model(), t = ST.today(), r = rng(), p = m.pnl(r.from, r.to), pt = m.pnl(t, t);
  const tp = act('purchases').filter((x) => x.date === t), tb = Object.values(m.batches).filter((b) => b.date === t), ts = m.saleRows.filter((s) => s.rec.date === t);
  const st = m.stockTotals, low = S().low;
  const lowOf = (k) => (num(low[k]) > 0 && st[k].qty < num(low[k]) ? ' <span class="tag r">low</span>' : '');
  const cust = Object.values(m.parties).reduce((a, x) => a + Math.max(0, x.receivable), 0);
  const sup = Object.values(m.parties).reduce((a, x) => a + Math.max(0, x.payable), 0);
  const ms = months(); const sv = ms.map((k) => m.pnl(k + '-01', k + '-31'));
  const prodM = ms.map((k) => Object.values(m.batches).filter((b) => CE.month(b.date) === k).reduce((a, b) => a + b.pc.doorSqft, 0));
  const effM = ms.map((k) => { const bs = Object.values(m.batches).filter((b) => CE.month(b.date) === k); const i = bs.reduce((a, b) => a + b.pc.inputKg, 0); return i ? (bs.reduce((a, b) => a + b.pc.doorSqft, 0) / i) * 100 : 0; });
  const lots = Object.values(m.lots).map((L) => lotPnl(m, L)).filter((x) => x.revenue || x.cost).sort((a, b) => b.profit - a.profit).slice(0, 10);
  const todayExp = pt.spend.unloading + pt.spend.mistri + pt.spend.expenses;
  const purchP = m.purchRows.filter((L) => inR(L.rec.date)).reduce((a, L) => a + L.total, 0);
  const expP = p.spend.unloading + p.spend.mistri + p.spend.expenses;
  const yr = CE.fyOf(t, S().fyStart), py = m.pnl(yr.start, yr.end);
  const empty = !act('purchases').length && !act('sales').length;
  const salesT = CE.SALE_CATS.reduce((a, k) => a + Math.max(0, p.byProduct[k].revenue), 0);
  const qa = canW() ? `<div class="qa"><button class="g" data-act="new" data-c="purchases">${ic('purchase')}New<br>Purchase</button><button class="b" data-act="new" data-c="production">${ic('production')}New<br>Production</button><button class="p" data-act="new" data-c="sales">${ic('sales')}New Sale /<br>Invoice</button><button class="o" data-act="new" data-c="mistri">${ic('mistri')}Mistri<br>Payment</button><button class="r" data-act="new" data-c="expenses" data-type="other">${ic('expense')}Add<br>Expense</button></div>` : '<p class="mute">View-only access.</p>';
  return `<section class="hero hide-m">${heroArt()}<div class="plate">${LOGO(124)}<span class="vr"></span><div class="t"><h1 class="gold">${esc(S().company.name)}</h1><span class="ribbon">${esc(S().company.section || 'BOARD SECTION')}</span><span class="sub">Flash Door Manufacturing ERP</span></div></div></section>
  <div class="mbrand">${LOGO(70)}<div><b class="gold">${esc(S().company.name)}</b><span class="ribbon">${esc(S().company.section || 'BOARD SECTION')}</span><div class="mute" style="font-size:12.5px;margin-top:3px">Flash Door Manufacturing ERP</div></div></div>
  ${empty ? `<div class="note"><b>Your ERP is ready and empty.</b> Start with a Wood Purchase — a Lot ID is created automatically — then Unloading, Production and Sales. Every figure here is calculated from your saved entries.${canW() ? ' <button class="btn s p" data-act="new" data-c="purchases">+ First wood purchase</button>' : ''}</div>` : ''}
  <div class="mtiles"><a class="g" href="#purchase">${ic('purchase')}Purchase</a><a class="b" href="#production">${ic('production')}Production</a><a class="p" href="#sales">${ic('sales')}Sales</a><a class="o" href="#inventory">${ic('inventory')}Inventory</a><a class="k" href="#reports">${ic('reports')}Reports</a><a class="k" href="#pnl">${ic('trend')}P&amp;L</a></div>
  <div class="tks">${tile('g', 'purchase', "Today's Purchase", inr0(tp.reduce((a, x) => a + CE.purchaseCalc(x).total, 0)), qf(tp.reduce((a, x) => a + num(x.kg), 0)) + ' KG')}${tile('b', 'production', "Today's Production", qf(tb.reduce((a, b) => a + b.pc.doorSqft, 0), 1) + '<small style="font-size:.6em"> SQ FT</small>', 'Flash Door: ' + tb.reduce((a, b) => a + b.pc.doorPcs, 0) + ' Pcs')}${tile('p', 'sales', "Today's Sales", inr0(ts.reduce((a, s) => a + s.total, 0)), qf(ts.reduce((a, s) => a + s.lines.filter((l) => l.cat === 'door').reduce((b, l) => b + l.qty, 0), 0), 2) + ' SQ FT doors')}${tile('o', 'coins', "Today's Expenses", inr0(todayExp), 'labour · mistri · machine')}${tile('gp', 'trend', "Today's Profit", `<span class="${pt.net < 0 ? 'neg' : ''}">${inr0(pt.net)}</span>`, pt.revenue ? `${pt.net >= 0 ? '↑' : '↓'} ${qf((pt.net / pt.revenue) * 100, 1)}% margin` : 'no sales today')}</div>
  <div class="tks">${tile('g', 'coins', 'Cash &amp; Bank', inr0(m.cash.total), `cash ${inr0(m.cash.cashTotal)} · bank ${inr0(m.cash.bankTotal)}`)}${tile('p', 'parties', 'Receivables', inr0(cust), 'customers owe us')}${tile('o', 'parties', 'Payables', inr0(sup), 'suppliers, labour, mistri')}${tile('b', 'inventory', 'Stock value', inr0(Object.values(st).reduce((a, x) => a + x.value, 0)), 'raw + finished, at cost')}${tile('gp', 'help', 'Waiting approval', String(m.pendingExp.length), m.pendingExp.length ? inr0(m.pendingExp.reduce((a, e) => a + CE.expenseAmount(e), 0)) + ' of expenses' : 'nothing pending')}</div>
  ${m.negatives.length ? `<div class="note bad"><b>Negative stock:</b> ${m.negatives.map((n) => `${CE.LABEL[n.k]} lot ${esc(n.lot)} ${qty(n.qty, n.k)}`).join(' · ')}</div>` : ''}
  <div class="cols3"><div class="card"><div class="ch">${ic('inventory')}<h2>Current Stock <span class="mute" style="font-size:15px">(Inventory)</span></h2><a href="#inventory" aria-label="Open inventory">›</a></div><div class="sl">${[['raw', 'Raw Wood (Scrap)', 'inventory'], ['door', 'Flash Door (Finished)', 'doors'], ['firewood', 'Firewood', 'firewood'], ['bhushi', 'Bhushi (Wood Dust)', 'bhushi'], ['jabra', 'Jabra', 'jabra']].map(([k, l, h]) => `<a href="#${h}">${WOOD[k]}<span>${l}${lowOf(k)}<br><span class="mute" style="font-size:12px">${inr0(st[k].value)} at cost</span></span><b class="${st[k].qty < 0 ? 'neg' : ''}">${qf(st[k].qty, CE.UNIT[k] === 'KG' ? 0 : 2)}<small>${CE.UNIT[k]}</small></b></a>`).join('')}</div></div>
  <div class="card"><div class="ch">${ic('pnl')}<h2>Monthly Sales &amp; Profit</h2></div>${chart('c_m', { type: 'combo', labels: ms.map(mlabel), fmt: kfmt, series: [{ name: 'Sales (₹)', color: '#e2b13c', vals: sv.map((x) => x.revenue) }, { name: 'Net profit (₹)', color: '#3fbf6f', vals: sv.map((x) => x.net) }] })}</div>
  <div class="card"><div class="ch">${ic('pie')}<h2>Sales by Product <span class="mute" style="font-size:15px">(${esc(r.label)})</span></h2><a href="#sales" aria-label="Open sales">›</a></div><div class="dn">${donut(CE.SALE_CATS.map((k) => ({ l: CE.LABEL[k], v: p.byProduct[k].revenue, c: PCOL[k] })), inr0(salesT), 'Total Sales')}<div class="dl">${CE.SALE_CATS.map((k) => `<div><i style="background:${PCOL[k]}"></i><span>${CE.LABEL[k]}</span><b>${salesT ? qf((p.byProduct[k].revenue / salesT) * 100, 0) : 0}%</b></div>`).join('')}</div></div></div></div>
  <div class="cols2b"><div class="card"><div class="ch">${ic('electricity')}<h2>Quick Actions</h2></div>${qa}</div>
  <div class="card"><div class="ch">${ic('pnl')}<h2>Key Summary <span class="mute" style="font-size:15px">(${esc(r.label)})</span></h2></div><div class="ks"><div><span>Total Purchase</span><b>${inr0(purchP)}</b></div><div><span>Total Sales</span><b>${inr0(p.revenue)}</b></div><div><span>Total Expenses</span><b>${inr0(expP)}</b></div><div><span>Gross Profit</span><b class="${p.gross < 0 ? 'neg' : ''}">${inr0(p.gross)}</b></div><div class="np"><span>Net Profit</span><b>${inr0(p.net)}</b></div></div>
  <div class="row" style="margin-top:6px;font-size:13px;gap:16px"><span class="mute">This FY ${esc(yr.label)}: sales <b style="color:var(--gold2)">${inr0(py.revenue)}</b> · net profit <b style="color:var(--gold2)">${inr0(py.net)}</b></span>${p.returns ? `<span class="mute">Returns <b style="color:var(--gold2)">${inr0(p.returns)}</b></span>` : ''}${p.drawings ? `<span class="mute">Owner drawings <b style="color:var(--gold2)">${inr0(p.drawings)}</b></span>` : ''}</div>
  <div class="row" style="margin-top:10px;font-size:13px;gap:16px"><span class="mute">Customer outstanding <b style="color:var(--gold2)">${inr0(cust)}</b></span><span class="mute">Supplier &amp; labour outstanding <b style="color:var(--gold2)">${inr0(sup)}</b></span><span class="mute">Overhead <b style="color:var(--gold2)">${inr0(p.overhead)}</b></span></div></div></div>
  <nav class="card flow" aria-label="Process flow">${[['purchase', 'logs', 'Purchase', '(KG)'], ['unloading', 'truck', 'Unloading', '(Labour)'], ['production', 'saw', 'Processing', '& Cutting'], ['doors', 'door', 'Flash Door', '(SQ FT)'], ['firewood', 'firewood', 'Firewood', '(KG)'], ['bhushi', 'bhushi', 'Bhushi', '(KG)'], ['jabra', 'jabra', 'Jabra', '(SQ FT)']].map(([h, k, l, s], i) => `${i ? '<span class="ar" aria-hidden="true">➜</span>' : ''}<a href="#${h}">${pic(k, true)}${l}<small>${s}</small></a>`).join('')}</nav>
  <div class="cols2"><div class="card"><div class="ch">${ic('doors')}<h2>Flash Door Production (sq ft)</h2></div>${chart('c_d', { labels: ms.map(mlabel), series: [{ name: 'Door sq ft', color: '#e2b13c', vals: prodM }] })}</div>
  <div class="card"><div class="ch">${ic('trend')}<h2>Production Efficiency</h2></div><p class="mute" style="margin:0 0 6px;font-size:13px">Door sq ft made per 100 kg of raw wood input</p>${chart('c_e', { type: 'line', labels: ms.map(mlabel), series: [{ name: 'Sq ft / 100 kg', color: '#a46ee6', vals: effM }] })}</div></div>
  <div class="card"><div class="ch">${ic('pnl')}<h2>Lot-wise Profitability (realised on sales)</h2></div>${hbars(lots.map((x) => [x.id, x.profit, `on ${inr0(x.revenue)} sales`]))}</div>`;
};

function lotPnl(m, L) {
  let revenue = 0, cogs = 0;
  m.saleRows.forEach((s) => s.lines.forEach((l) => {
    if (l.lotId === L.id) { revenue += l.amount; cogs += l.cogs; }
    else if (!l.lotId && l.fifo) l.fifo.forEach((f) => { if (f.lot === L.id && l.qty) { revenue += (l.amount * f.qty) / l.qty; cogs += f.qty * m.unitCost(L.id, l.cat); } });
  }));
  const cost = L.batches.reduce((a, b) => a + b.total, 0);
  const stockVal = m.stockRows.filter((s) => s.lot === L.id).reduce((a, s) => a + s.value, 0);
  return { id: L.id, revenue, cogs, profit: revenue - cogs, cost, stockVal, L };
}

PAGES.purchase = () => {
  const m = model();
  const rows = m.purchRows.filter((L) => inR(L.rec.date) && match('purchase', L.rec)).sort((a, b) => byDate(a.rec, b.rec));
  const cols = [{ t: 'Date', v: (L) => dd(L.rec.date), x: (L) => L.rec.date }, { t: 'Lot ID', v: (L) => `<b>${esc(L.id)}</b>${L.rec._pending ? ' <span class="tag o">pending</span>' : ''}` }, { t: 'Supplier', v: (L) => esc(L.rec.supplier) }, { t: 'DO / Inv', v: (L) => esc(L.rec.doNo) }, { t: 'Material', v: (L) => esc(L.material) }, { t: 'Truck', v: (L) => esc([L.rec.vehicle, L.rec.driver].filter(Boolean).join(' · ')) },
    { t: 'Billed kg', n: 1, v: (L) => qf(L.billedKg), x: (L) => L.billedKg, sum: (L) => L.billedKg, fmt: qf }, { t: 'Received kg', n: 1, v: (L) => `${qf(L.receivedKg)}${Math.abs(L.shortKg) > 1e-6 ? ` <span class="tag ${L.shortKg > 0 ? 'r' : 'o'}">${L.shortKg > 0 ? 'short' : 'excess'} ${qf(Math.abs(L.shortKg))}</span>` : ''}`, x: (L) => L.receivedKg, sum: (L) => L.receivedKg, fmt: qf }, { t: 'Rate/kg', n: 1, v: (L) => inr(L.rec.rate), x: (L) => num(L.rec.rate) }, { t: 'Material value', n: 1, v: (L) => inr(L.value), x: (L) => L.value, sum: (L) => L.value }, { t: 'GST', n: 1, v: (L) => inr(L.gst), x: (L) => L.gst, sum: (L) => L.gst },
    { t: 'Expenses', n: 1, v: (L) => inr(L.extras), x: (L) => L.extras, sum: (L) => L.extras }, { t: 'Total', n: 1, v: (L) => `<b>${inr(L.total)}</b>`, x: (L) => L.total, sum: (L) => L.total }, { t: 'Paid', n: 1, v: (L) => inr(L.paidTotal), x: (L) => L.paidTotal, sum: (L) => L.paidTotal },
    { t: 'Outstanding', n: 1, v: (L) => `<span class="${L.outstanding > 0.005 ? 'neg' : ''}">${inr(L.outstanding)}</span>`, x: (L) => L.outstanding, sum: (L) => L.outstanding }, { t: 'Raw left kg', n: 1, v: (L) => qf(L.rawLeft), x: (L) => L.rawLeft }];
  return `<div class="card">${toolbar({ key: 'purchase', add: 'purchases', addLabel: 'Wood purchase', what: 'supplier, lot, vehicle, DO' })}</div><div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Wood purchases · ${esc(rng().label)}</h2>${exportBtns('purchase', 'Wood purchases', cols, rows)}</div>${table(cols, rows, { acts: (L) => rowActs('purchases')(L.rec) })}</div>`;
};
PAGES.unloading = () => {
  const F = PF.unloading || {}; const lt = (r) => (CE.LABOUR[r.labourType] ? r.labourType : 'unloading');
  const rows = act('unloading').filter((r) => inR(r.date) && match('unloading', r) && (!F.lt || lt(r) === F.lt)).sort(byDate);
  const by = LAB_T.map(([k, l]) => [l, act('unloading').filter((r) => inR(r.date) && lt(r) === k).reduce((a, r) => a + num(r.amount), 0)]);
  const extra = `<select data-f="lt" data-key="unloading" aria-label="Labour type"><option value="">All labour types</option>${opts(LAB_T, F.lt || '')}</select>`;
  const cols = [{ t: 'Date', v: (r) => dd(r.date), x: (r) => r.date }, { t: 'Type', v: (r) => esc(CE.LABOUR[lt(r)]), x: (r) => CE.LABOUR[lt(r)] }, { t: 'Lot / batch', v: (r) => esc([r.lotId, r.batchId].filter(Boolean).join(' / ') || 'overhead') }, { t: 'Vehicle', v: (r) => esc(r.vehicle) }, { t: 'Labour / team', v: (r) => esc(r.team) }, { t: 'Unloaded kg', n: 1, v: (r) => qf(r.kg), x: (r) => num(r.kg), sum: (r) => r.kg, fmt: qf },
    { t: 'Amount', n: 1, v: (r) => inr(r.amount), x: (r) => num(r.amount), sum: (r) => r.amount }, { t: 'Paid', n: 1, v: (r) => inr(r.paid), x: (r) => num(r.paid), sum: (r) => r.paid }, { t: 'Balance', n: 1, v: (r) => `<span class="${num(r.amount) - num(r.paid) > 0 ? 'neg' : ''}">${inr(num(r.amount) - num(r.paid))}</span>`, x: (r) => num(r.amount) - num(r.paid), sum: (r) => num(r.amount) - num(r.paid) }, { t: 'Mode', v: pay }, { t: 'Notes', v: (r) => esc(r.notes) }];
  return `<div class="kpis">${by.map(([l, v]) => kpi(l, inr0(v), rng().label)).join('')}</div><div class="card">${toolbar({ key: 'unloading', add: 'unloading', addLabel: 'Labour entry', lot: 1, extra, what: 'team, lot' })}</div><div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Labour &amp; processing · ${esc(rng().label)}</h2>${exportBtns('unloading', 'Labour and processing', cols, rows)}</div>${table(cols, rows, { acts: rowActs('unloading') })}<p class="mute" style="font-size:13px">Every labour type is kept separate. Any amount is accepted — no fixed rate. Wages earned are the cost (added to the lot's raw-material cost, or to the batch for production labour); payments only settle the balance and are never a second expense.</p></div>`;
};
PAGES.production = () => {
  const m = model();
  const rows = Object.values(m.batches).filter((b) => inR(b.date) && match('production', b.rec)).sort((a, b) => byDate(a.rec, b.rec));
  const cols = [{ t: 'Date', v: (b) => dd(b.date), x: (b) => b.date }, { t: 'Batch', v: (b) => `<b>${esc(b.id)}</b>` }, { t: 'Lot', v: (b) => esc(b.lotId) }, { t: 'Input kg', n: 1, v: (b) => qf(b.pc.inputKg), x: (b) => b.pc.inputKg, sum: (b) => b.pc.inputKg, fmt: qf },
    { t: 'Door sizes', v: (b) => b.pc.doors.map((d) => `${esc(d.key.replace('x', '×'))}″ × ${d.pcs}`).join('<br>'), x: (b) => b.pc.doors.map((d) => `${d.key} x ${d.pcs}`).join('; ') }, { t: 'Doors', n: 1, v: (b) => b.pc.doorPcs, x: (b) => b.pc.doorPcs, sum: (b) => b.pc.doorPcs, fmt: (v) => qf(v, 0) },
    { t: 'Door sq ft', n: 1, v: (b) => qf(b.pc.doorSqft, 4), x: (b) => CE.r4(b.pc.doorSqft), sum: (b) => b.pc.doorSqft, fmt: (v) => qf(v, 4) }, { t: 'Firewood kg', n: 1, v: (b) => qf(b.pc.out.firewood), x: (b) => b.pc.out.firewood, sum: (b) => b.pc.out.firewood, fmt: qf }, { t: 'Bhushi kg', n: 1, v: (b) => qf(b.pc.out.bhushi), x: (b) => b.pc.out.bhushi, sum: (b) => b.pc.out.bhushi, fmt: qf },
    { t: 'Jabra sq ft', n: 1, v: (b) => qf(b.pc.out.jabra, 4), x: (b) => b.pc.out.jabra, sum: (b) => b.pc.out.jabra, fmt: (v) => qf(v, 4) }, { t: 'Unaccounted kg', n: 1, v: (b) => `<span class="${b.pc.unaccountedKg < 0 ? 'neg' : ''}">${qf(b.pc.unaccountedKg)}</span>${b.pc.missing.length ? ' <span class="tag o" title="' + esc(b.pc.missing.join(', ')) + ' missing">partial</span>' : ''}`, x: (b) => b.pc.unaccountedKg },
    { t: 'Batch cost', n: 1, v: (b) => inr0(b.total), x: (b) => CE.r2(b.total), sum: (b) => b.total }, { t: 'Cost/sq ft', n: 1, v: (b) => b.pc.doorSqft ? inr(b.unit.door) : '—', x: (b) => CE.r2(b.unit.door) }, { t: 'Operator', v: (b) => esc(b.rec.operator) }];
  return `<div class="card">${toolbar({ key: 'production', add: 'production', addLabel: 'Production batch', lot: 1 })}</div><div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Production batches · ${esc(rng().label)}</h2>${exportBtns('production', 'Production', cols, rows)}</div>${table(cols, rows, { acts: (b) => rowActs('production')(b.rec) })}<p class="mute" style="font-size:13px">Door area = width × height ÷ 144 per door. Unaccounted = input kg − weighed outputs (door and jabra weights are optional; KG and SQ FT are never mixed). Full cost breakdown: Profit &amp; Loss.</p></div>`;
};
function productPage(k) {
  const m = model(); const st = m.stockTotals[k];
  const rows = m.stockRows.filter((s) => s.k === k && (Math.abs(s.qty) > 1e-6 || s.in)).sort((a, b) => b.qty - a.qty);
  const prod = m.prodCost; const avg = Object.values(prod).reduce((a, x) => { const y = x[k] || { qty: 0, cost: 0 }; return { q: a.q + y.qty, c: a.c + y.cost }; }, { q: 0, c: 0 });
  const sl = m.saleRows.filter((s) => inR(s.rec.date)).flatMap((s) => s.lines.filter((l) => l.cat === k).map((l) => ({ ...l, s }))).filter((l) => match(k, l.s.rec)).sort((a, b) => byDate(a.s.rec, b.s.rec));
  const sq = sl.reduce((a, l) => a + l.qty, 0), sa = sl.reduce((a, l) => a + l.amount, 0);
  const cols = [{ t: 'Lot', v: (s) => esc(s.lot) }, { t: 'Produced', n: 1, v: (s) => qty(s.in, k), x: (s) => s.in, sum: (s) => s.in, fmt: (v) => qty(v, k) }, { t: 'Sold', n: 1, v: (s) => qty(s.out, k), x: (s) => s.out, sum: (s) => s.out, fmt: (v) => qty(v, k) }, { t: 'Adjusted', n: 1, v: (s) => qf(s.adj, 4), x: (s) => s.adj }, { t: 'Remaining', n: 1, v: (s) => `<b class="${s.qty < 0 ? 'neg' : ''}">${qty(s.qty, k)}</b>`, x: (s) => s.qty, sum: (s) => s.qty, fmt: (v) => qty(v, k) }, { t: 'Cost / unit', n: 1, v: (s) => inr(s.unitCost), x: (s) => CE.r2(s.unitCost) }, { t: 'Stock value', n: 1, v: (s) => inr0(s.value), x: (s) => CE.r2(s.value), sum: (s) => s.value }];
  const scol = [{ t: 'Date', v: (l) => dd(l.s.rec.date), x: (l) => l.s.rec.date }, { t: 'Invoice', v: (l) => esc(l.s.rec.invoiceNo) }, { t: 'Customer', v: (l) => esc(l.s.rec.customer) }, { t: 'Lot', v: (l) => esc(l.lotId) }, ...(k === 'door' ? [{ t: 'Size', v: (l) => `${+l.w}×${+l.h}″ × ${l.pcs}`, x: (l) => `${l.w}x${l.h} x ${l.pcs}` }] : []), { t: 'Qty', n: 1, v: (l) => qty(l.qty, k), x: (l) => CE.r4(l.qty), sum: (l) => l.qty, fmt: (v) => qty(v, k) }, { t: 'Rate', n: 1, v: (l) => inr(l.rate), x: (l) => num(l.rate) }, { t: 'Amount', n: 1, v: (l) => inr(l.amount), x: (l) => l.amount, sum: (l) => l.amount }, { t: 'Cost', n: 1, v: (l) => inr(l.cogs), x: (l) => CE.r2(l.cogs), sum: (l) => l.cogs }];
  const sizes = k === 'door' ? Object.entries(m.sizes).sort((a, b) => (b[1].made - b[1].sold) - (a[1].made - a[1].sold)) : [];
  return `<div class="kpis">${kpi('In stock', qty(st.qty, k), `value ${inr0(st.value)}`, true)}${kpi('Produced (all time)', qty(st.in, k))}${kpi('Sold (all time)', qty(st.out, k))}${kpi('Avg production cost', avg.q ? inr(avg.c / avg.q) + ' / ' + (CE.UNIT[k] === 'KG' ? 'kg' : 'sq ft') : '—')}${kpi('Sold · ' + rng().label, qty(sq, k), inr0(sa) + (sq ? ' · avg ' + inr(sa / sq) : ''))}</div>
  ${k === 'door' ? `<div class="card"><h2>Door stock by size</h2>${table([{ t: 'Size (in)', v: ([s]) => s.replace('x', ' × ') }, { t: 'Sq ft / door', n: 1, v: ([, x]) => qf(x.each, 4) }, { t: 'Made', n: 1, v: ([, x]) => x.made, sum: ([, x]) => x.made, fmt: (v) => qf(v, 0) }, { t: 'Sold', n: 1, v: ([, x]) => x.sold, sum: ([, x]) => x.sold, fmt: (v) => qf(v, 0) }, { t: 'In stock (pcs)', n: 1, v: ([, x]) => `<b class="${x.made - x.sold < 0 ? 'neg' : ''}">${x.made - x.sold}</b>`, sum: ([, x]) => x.made - x.sold, fmt: (v) => qf(v, 0) }, { t: 'In stock sq ft', n: 1, v: ([, x]) => qf((x.made - x.sold) * x.each, 4) }], sizes, { empty: 'No doors produced yet.' })}</div>` : ''}
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Lot-wise stock</h2>${exportBtns('st_' + k, CE.LABEL[k] + ' stock', cols, rows)}</div>${table(cols, rows, { empty: 'Nothing produced yet.' })}</div>
  <div class="card">${toolbar({ key: k, add: 'sales', addLabel: 'Sales invoice', what: 'invoice, customer' })}<div class="row" style="margin:10px 0 8px"><h2 class="sp">${CE.LABEL[k]} sales · ${esc(rng().label)}</h2>${exportBtns('sl_' + k, CE.LABEL[k] + ' sales', scol, sl)}</div>${table(scol, sl)}</div>`;
}
PAGES.doors = () => productPage('door'); PAGES.firewood = () => productPage('firewood'); PAGES.bhushi = () => productPage('bhushi'); PAGES.jabra = () => productPage('jabra');

PAGES.sales = () => {
  const m = model(); const F = PF.sales || {};
  const rows = m.saleRows.filter((s) => inR(s.rec.date) && match('sales', s.rec, (r) => (r.lines || []).map((l) => l.lotId)) && (!F.cat || s.lines.some((l) => l.cat === F.cat)) && (!F.due || s.outstanding > 0.005)).sort((a, b) => byDate(a.rec, b.rec));
  const cols = [{ t: 'Date', v: (s) => dd(s.rec.date), x: (s) => s.rec.date }, { t: 'Invoice', v: (s) => `<b>${esc(s.rec.invoiceNo)}</b>${s.ret ? `<br><span class="tag r">Credit note</span> <span class="mute">vs ${esc((ST.get('sales', s.rec.refInvoice) || {}).invoiceNo || '')}</span>` : ''}`, x: (s) => s.rec.invoiceNo }, { t: 'Customer', v: (s) => esc(s.rec.customer) }, { t: 'Items', v: (s) => s.lines.map((l) => `${CE.LABEL[l.cat]} ${l.cat === 'door' ? `${+l.w}×${+l.h}″×${l.pcs} = ` : ''}${qty(l.qty, l.cat)} @ ${inr(l.rate)}${l.lotId ? ` <span class="mute">${esc(l.lotId)}</span>` : ''}`).join('<br>'), x: (s) => s.lines.map((l) => `${CE.LABEL[l.cat]} ${CE.r4(l.qty)} ${CE.UNIT[l.cat]} @ ${l.rate}`).join('; ') },
    { t: 'Taxable', n: 1, v: (s) => inr(s.taxable), x: (s) => s.taxable, sum: (s) => s.taxable }, { t: 'GST', n: 1, v: (s) => `${inr(s.gst)} <span class="mute">${s.nonGst ? 'non-GST' : s.mixed ? 'mixed' : qf(s.pct) + '%'} · ${s.interState ? 'IGST' : 'C+S'}</span>`, x: (s) => s.gst, sum: (s) => s.gst }, { t: 'Invoice total', n: 1, v: (s) => `<b>${inr(s.total)}</b>`, x: (s) => s.total, sum: (s) => s.total },
    { t: 'Received', n: 1, v: (s) => inr(s.received), x: (s) => s.received, sum: (s) => s.received }, { t: 'Outstanding', n: 1, v: (s) => `<span class="${s.outstanding > 0.005 ? 'neg' : ''}">${inr(s.outstanding)}</span>`, x: (s) => s.outstanding, sum: (s) => s.outstanding }, { t: 'Mode', v: (s) => esc(s.rec.payMode) }];
  const extra = `<select data-f="cat" data-key="sales" aria-label="Product"><option value="">All products</option>${opts(CAT, F.cat || '')}</select><label class="row" style="gap:6px;font-size:14px"><input type="checkbox" data-f="due" data-key="sales" ${F.due ? 'checked' : ''}> Unpaid only</label>`;
  return `<div class="card">${toolbar({ key: 'sales', add: 'sales', addLabel: 'Sales invoice', lot: 1, what: 'invoice, customer', extra })}</div><div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Sales invoices · ${esc(rng().label)}</h2>${exportBtns('sales', 'Sales', cols, rows)}</div>${table(cols, rows, { acts: (s) => `<button class="btn s" data-act="pdf" data-id="${esc(s.rec.id)}">PDF</button> ${canW() ? (s.ret ? (s.outstanding < -0.005 ? `<button class="btn s" data-act="refund" data-id="${esc(s.rec.id)}">Refund</button> ` : '') : `${s.outstanding > 0.005 ? `<button class="btn s" data-act="receive" data-id="${esc(s.rec.id)}">Receive</button> ` : ''}<button class="btn s" data-act="return" data-id="${esc(s.rec.id)}">Return</button> `) : ''}${rowActs('sales')(s.rec)}` })}<p class="mute" style="font-size:13px">Goods taken back or an invoice reduced? Use <b>Return</b> — it issues a credit note, puts stock back and reverses GST. Issued invoices are not silently edited.</p></div>`;
};
PAGES.mistri = () => {
  const rows = act('mistri').filter((r) => inR(r.date) && match('mistri', r)).sort(byDate);
  const cols = [{ t: 'Date', v: (r) => dd(r.date), x: (r) => r.date }, { t: 'Mistri', v: (r) => esc(r.mistri) }, { t: 'Lot', v: (r) => esc(r.lotId) }, { t: 'Batch', v: (r) => esc(r.batchId) }, { t: 'Size', v: (r) => esc(r.size) }, { t: 'Doors', n: 1, v: (r) => qf(r.pcs, 0), x: (r) => num(r.pcs), sum: (r) => r.pcs, fmt: (v) => qf(v, 0) }, { t: 'Rate/door', n: 1, v: (r) => inr(r.rate), x: (r) => num(r.rate) },
    { t: 'Making charges', n: 1, v: (r) => inr(CE.mistriTotal(r)), x: (r) => CE.mistriTotal(r), sum: (r) => CE.mistriTotal(r) }, { t: 'Advance', n: 1, v: (r) => inr(r.advance), x: (r) => num(r.advance), sum: (r) => r.advance }, { t: 'Final paid', n: 1, v: (r) => inr(r.paid), x: (r) => num(r.paid), sum: (r) => r.paid }, { t: 'Balance', n: 1, v: (r) => { const b = CE.mistriTotal(r) - num(r.advance) - num(r.paid); return `<span class="${b > 0.005 ? 'neg' : ''}">${inr(b)}</span>`; }, x: (r) => CE.mistriTotal(r) - num(r.advance) - num(r.paid), sum: (r) => CE.mistriTotal(r) - num(r.advance) - num(r.paid) }, { t: 'Mode', v: pay }];
  return `<div class="card">${toolbar({ key: 'mistri', add: 'mistri', addLabel: 'Mistri payment', lot: 1, what: 'mistri, batch' })}</div><div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Mistri / door making · ${esc(rng().label)}</h2>${exportBtns('mistri', 'Mistri payments', cols, rows)}</div>${table(cols, rows, { acts: rowActs('mistri') })}<p class="mute" style="font-size:13px">Making charges are charged to Flash Door cost of the linked batch (or spread over the lot's batches by door sq ft).</p></div>`;
};
function expensePage(types, key, title, addType) {
  const F = PF[key] || {};
  const rows = act('expenses').filter((r) => types.includes(r.type) && (!F.type || r.type === F.type) && inR(r.date) && match(key, r)).sort(byDate);
  const cols = [{ t: 'Date', v: (r) => dd(r.date), x: (r) => r.date }, { t: 'Type', v: (r) => (EXP_T.find((t) => t[0] === r.type) || [, ''])[1] }, { t: 'Details', v: (r) => esc([r.machine, r.problem, r.technician, r.period, r.item, r.description, r.category, r.type === 'blade' ? `${r.blades} × ${inr(r.perBlade)}` : '', r.type === 'consumable' ? `${r.qty} × ${inr(r.unitRate)}` : ''].filter(Boolean).join(' · ')) },
    { t: 'Lot / batch', v: (r) => esc([r.lotId, r.batchId].filter(Boolean).join(' / ') || (CE.MFG_EXP.includes(r.type) ? 'shared' : 'overhead')) }, { t: 'Amount', n: 1, v: (r) => inr(CE.expenseAmount(r)), x: (r) => CE.expenseAmount(r), sum: (r) => CE.expenseAmount(r) }, { t: 'GST', n: 1, v: (r) => inr(r.gstAmt), x: (r) => num(r.gstAmt), sum: (r) => r.gstAmt }, { t: 'Payment', v: (r) => { const x = model().expRows.find((y) => y.rec.id === r.id); if (!x) return ''; return x.recoverable > 0.005 ? `<span class="tag r">paid ${inr0(x.recoverable)} · to recover</span>` : x.outstanding > 0.005 ? `<span class="tag o">unpaid ${inr0(x.outstanding)}</span>` : `<span class="tag g">paid${r.payMode ? ' · ' + esc(r.payMode) : ''}</span>`; }, x: (r) => { const x = model().expRows.find((y) => y.rec.id === r.id); return x ? (x.outstanding > 0.005 ? 'unpaid ' + x.outstanding : x.recoverable > 0.005 ? 'to recover ' + x.recoverable : 'paid') : ''; } }, { t: 'Status', v: (r) => { const st = r.status || 'approved'; return `<span class="tag ${st === 'approved' ? 'g' : st === 'pending' ? 'o' : 'r'}">${st === 'approved' ? 'Approved' : st === 'pending' ? 'Waiting approval' : 'Rejected'}</span>${r.nature === 'personal' ? ' <span class="tag">Personal</span>' : ''}`; }, x: (r) => (r.status || 'approved') + (r.nature === 'personal' ? ' / personal' : '') }, { t: 'Ref', v: (r) => esc(r.refNo) }, { t: 'Receipt', v: (r) => (r.attachmentId ? `<button class="btn s" data-act="att" data-id="${esc(r.attachmentId)}">View</button>` : ''), x: (r) => (r.attachmentId ? 'yes' : '') }];
  const extra = types.length > 1 ? `<select data-f="type" data-key="${key}" aria-label="Type"><option value="">All types</option>${opts(EXP_T.filter((t) => types.includes(t[0])), F.type || '')}</select>` : '';
  const okE = (r) => (r.status || 'approved') === 'approved' && r.nature !== 'personal';
  const sumBy = types.map((t) => [EXP_T.find((x) => x[0] === t)[1], act('expenses').filter((r) => r.type === t && inR(r.date) && okE(r)).reduce((a, r) => a + CE.expenseAmount(r), 0)]);
  return `${types.length > 1 ? `<div class="kpis">${sumBy.map(([l, v]) => kpi(l, inr0(v), rng().label)).join('')}</div>` : ''}<div class="card">${toolbar({ key, add: 'expenses', addType, addLabel: title, lot: 1, extra })}</div><div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">${esc(title)} · ${esc(rng().label)}</h2>${exportBtns(key, title, cols, rows)}</div>${table(cols, rows, { acts: (r) => `${isAdmin() && r.status === 'pending' ? `<button class="btn s p" data-act="approve" data-id="${esc(r.id)}">Approve</button> <button class="btn s d" data-act="reject" data-id="${esc(r.id)}">Reject</button> ` : ''}${rowActs('expenses')(r)}` })}<p class="mute" style="font-size:13px">Approval and payment are separate. Only <b>approved business</b> expenses count in costs and profit. Cash and bank change only when money is actually paid — at entry, or later from Payments — never again on approval. Entries by operators wait for an admin's approval; personal spending is shown as owner drawings.</p></div>`;
}
PAGES.machine = () => expensePage(['repair', 'blade', 'consumable', 'other'], 'machine', 'Machine & factory expense', 'repair');
PAGES.electricity = () => expensePage(['electricity'], 'electricity', 'Electricity bill', 'electricity');

PAGES.inventory = () => {
  const m = model(); const F = PF.inventory || {};
  const ks = ['raw', ...CE.PRODUCTS];
  const lots = Object.values(m.lots).filter((L) => match('inventory', L.rec, () => [L.id])).sort((a, b) => String(b.rec.date).localeCompare(a.rec.date));
  const gcols = [{ t: 'Lot / truck', v: (L) => `<b>${esc(L.id)}</b><br><span class="mute">${esc([L.rec.vehicle, dd(L.rec.date)].filter(Boolean).join(' · '))}</span>`, x: (L) => L.id }, { t: 'Material', v: (L) => esc(L.material) }, { t: 'Supplier', v: (L) => esc(L.rec.supplier) },
    { t: 'Purchased kg', n: 1, v: (L) => qf(L.billedKg), x: (L) => L.billedKg, sum: (L) => L.billedKg, fmt: qf }, { t: 'Received kg', n: 1, v: (L) => qf(L.receivedKg), x: (L) => L.receivedKg, sum: (L) => L.receivedKg, fmt: qf }, { t: 'To processing kg', n: 1, v: (L) => qf(L.processedKg), x: (L) => L.processedKg, sum: (L) => L.processedKg, fmt: qf },
    { t: 'Sold raw kg', n: 1, v: (L) => qf(L.soldKg), x: (L) => L.soldKg, sum: (L) => L.soldKg, fmt: qf }, { t: 'Adjusted kg', n: 1, v: (L) => qf(L.adjKg), x: (L) => L.adjKg }, { t: 'Available kg', n: 1, v: (L) => `<b class="${L.rawLeft < -1e-6 ? 'neg' : ''}">${qf(L.rawLeft)}</b>`, x: (L) => L.rawLeft, sum: (L) => L.rawLeft, fmt: qf },
    { t: 'Cost / kg', n: 1, v: (L) => inr(L.rawPerKg), x: (L) => CE.r2(L.rawPerKg) }, { t: 'Value', n: 1, v: (L) => inr0(L.rawLeftValue), x: (L) => CE.r2(L.rawLeftValue), sum: (L) => L.rawLeftValue }];
  const mats = {}; Object.values(m.lots).forEach((L) => { const x = (mats[L.material] = mats[L.material] || { kg: 0, value: 0 }); x.kg += L.rawLeft; x.value += L.rawLeftValue; });
  const rows = m.stockRows.filter((s) => (!F.k || s.k === F.k) && match('inventory', s, (s) => [s.lot])).sort((a, b) => a.k.localeCompare(b.k) || String(b.lot).localeCompare(a.lot));
  const cols = [{ t: 'Product', v: (s) => CE.LABEL[s.k] }, { t: 'Lot', v: (s) => esc(s.lot) }, { t: 'In', n: 1, v: (s) => qty(s.in, s.k), x: (s) => s.in }, { t: 'Out / sold', n: 1, v: (s) => qty(s.out, s.k), x: (s) => s.out }, { t: 'Adjusted', n: 1, v: (s) => qf(s.adj, 4), x: (s) => s.adj }, { t: 'Remaining', n: 1, v: (s) => `<b class="${s.qty < 0 ? 'neg' : ''}">${qty(s.qty, s.k)}</b>`, x: (s) => s.qty }, { t: 'Unit cost', n: 1, v: (s) => inr(s.unitCost), x: (s) => CE.r2(s.unitCost) }, { t: 'Value', n: 1, v: (s) => inr0(s.value), x: (s) => CE.r2(s.value), sum: (s) => s.value }];
  const mv = m.moves.filter((x) => (!F.k || x.k === F.k) && inR(x.date) && match('inventory', x, (x) => [x.lot])).slice(0, 400);
  const mcols = [{ t: 'Date', v: (x) => dd(x.date), x: (x) => x.date }, { t: 'Product', v: (x) => CE.LABEL[x.k] }, { t: 'Lot', v: (x) => esc(x.lot) }, { t: 'Movement', n: 1, v: (x) => `<span class="${x.qty < 0 ? 'neg' : 'pos'}">${x.qty > 0 ? '+' : ''}${qty(x.qty, x.k)}</span>`, x: (x) => x.qty }, { t: 'Reference', v: (x) => esc(x.ref) }];
  const adj = act('adjustments').sort(byDate);
  const extra = `<select data-f="k" data-key="inventory" aria-label="Product"><option value="">All products</option>${opts(ks.map((k) => [k, CE.LABEL[k]]), F.k || '')}</select>`;
  return `<div class="kpis">${ks.map((k) => kpi(CE.LABEL[k], qty(m.stockTotals[k].qty, k), 'value ' + inr0(m.stockTotals[k].value) + (num(S().low[k]) > 0 && m.stockTotals[k].qty < num(S().low[k]) ? ' · <b class="neg">LOW</b>' : ''), k === 'door')).join('')}</div>
  ${m.negatives.length ? `<div class="note bad"><b>Negative stock needs attention:</b> ${m.negatives.map((n) => `${CE.LABEL[n.k]} lot ${esc(n.lot)} ${qty(n.qty, n.k)}`).join(' · ')}</div>` : ''}
  <div class="card">${toolbar({ key: 'inventory', lot: 1, extra, what: 'lot' })}</div>
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Godown — raw material by lot / truck</h2>${exportBtns('godown', 'Godown lot-wise', gcols, lots)}</div>${Object.keys(mats).length ? `<div class="kpis" style="margin-bottom:10px">${Object.entries(mats).map(([k, x]) => kpi(k, qf(x.kg) + ' kg', 'value ' + inr0(x.value))).join('')}</div>` : ''}${table(gcols, lots, { empty: 'No purchases yet. Stock is only created by a saved purchase.' })}<p class="mute" style="font-size:13px">Stock comes in at the weight received at the godown. Available = received − sent to processing − sold as raw ± admin adjustments. Nothing is created without a transaction.</p></div>
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Lot-wise stock (current)</h2>${exportBtns('inv', 'Stock', cols, rows)}</div>${table(cols, rows, { empty: 'No stock yet.' })}</div>
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Stock movement history · ${esc(rng().label)}</h2>${exportBtns('mov', 'Stock movements', mcols, mv)}</div>${table(mcols, mv)}</div>
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Stock adjustments (admin)</h2>${isAdmin() ? '<button class="btn" data-act="new" data-c="adjustments">+ Adjustment</button>' : ''}</div>${table([{ t: 'Date', v: (r) => dd(r.date) }, { t: 'Product', v: (r) => CE.LABEL[r.product] }, { t: 'Lot', v: (r) => esc(r.lotId) }, { t: 'Qty', n: 1, v: (r) => qf(r.qty, 4) }, { t: 'Reason', v: (r) => esc(r.reason) }], adj, { acts: (r) => (isAdmin() ? rowActs('adjustments')(r) : ''), empty: 'No adjustments.' })}</div>`;
};
PAGES.parties = () => {
  const m = model(); const master = act('parties'); const F = PF.parties || {};
  const all = new Map(Object.entries(m.parties)); master.forEach((p) => { const k = CE.pkey(p.name); if (!all.has(k)) all.set(k, { name: p.name, roles: new Set([p.type]), receivable: 0, payable: 0, sales: 0, purchases: 0 }); });
  const rows = [...all.entries()].map(([k, p]) => ({ k, ...p, m: master.find((x) => CE.pkey(x.name) === k) })).filter((p) => (!F.q || (p.name + ' ' + [...p.roles].join(' ')).toLowerCase().includes(F.q.toLowerCase())) && (!F.role || p.roles.has(F.role) || (p.m && p.m.type === F.role))).sort((a, b) => (b.receivable + b.payable) - (a.receivable + a.payable));
  const cols = [{ t: 'Name', v: (p) => `<b>${esc(p.name)}</b>${p.m && p.m.phone ? `<br><span class="mute">${esc(p.m.phone)}</span>` : ''}` , x: (p) => p.name }, { t: 'Role', v: (p) => [...new Set([...(p.roles || []), p.m && p.m.type].filter(Boolean))].map((r) => `<span class="tag">${esc(r)}</span>`).join(' '), x: (p) => [...p.roles].join(', ') }, { t: 'GSTIN', v: (p) => esc(p.m && p.m.gstin) }, { t: 'Opening', n: 1, v: (p) => (p.opening ? `${inr(Math.abs(p.opening))} ${p.opening > 0 ? 'Dr' : 'Cr'}` : ''), x: (p) => CE.r2(p.opening || 0) }, { t: 'Sales', n: 1, v: (p) => inr0(p.sales), x: (p) => CE.r2(p.sales), sum: (p) => p.sales }, { t: 'Purchases', n: 1, v: (p) => inr0(p.purchases), x: (p) => CE.r2(p.purchases), sum: (p) => p.purchases },
    { t: 'They owe us', n: 1, v: (p) => `<span class="${p.receivable > 0.005 ? 'neg' : ''}">${inr(p.receivable)}</span>`, x: (p) => CE.r2(p.receivable), sum: (p) => p.receivable }, { t: 'We owe them', n: 1, v: (p) => inr(p.payable), x: (p) => CE.r2(p.payable), sum: (p) => p.payable }];
  const extra = `<select data-f="role" data-key="parties" aria-label="Role"><option value="">All roles</option>${opts(['Customer', 'Supplier', 'Mistri', 'Labour', 'Technician', 'Other'], F.role || '')}</select>`;
  return `<div class="card">${toolbar({ key: 'parties', add: 'parties', addLabel: 'Party', extra, what: 'name' })}</div><div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Parties &amp; balances (all time)</h2>${exportBtns('parties', 'Parties', cols, rows)}</div>${table(cols, rows, { acts: (p) => `<button class="btn s" data-act="ledger" data-k="${esc(p.name)}">Ledger</button>${p.m ? ' ' + rowActs('parties')(p.m) : ''}`, empty: 'Parties appear here as soon as you enter purchases, sales, labour or mistri payments.' })}<p class="mute" style="font-size:13px">Negative “they owe us” means an advance received. Labour and mistri balances are included in “we owe them”.</p></div>`;
};
PAGES.payments = () => {
  const m = model();
  const rows = act('payments').filter((r) => inR(r.date) && match('payments', r)).sort(byDate);
  const refL = (r) => { if (!r.refId) return 'On account'; const s = m.saleRows.find((x) => x.rec.id === r.refId); if (s) return 'Inv ' + s.rec.invoiceNo; const L = m.purchRows.find((x) => x.rec.id === r.refId); if (L) return 'Lot ' + L.id; const e = m.expRows.find((x) => x.rec.id === r.refId); return e ? 'Expense: ' + CE.expLabel(e.rec) : '(deleted)'; };
  const cols = [{ t: 'Date', v: (r) => dd(r.date), x: (r) => r.date }, { t: 'Type', v: (r) => (r.direction === 'out' ? '<span class="tag r">Paid out</span>' : '<span class="tag g">Received</span>'), x: (r) => (r.direction === 'out' ? 'Paid out' : 'Received') }, { t: 'Party', v: (r) => esc(r.party) }, { t: 'Against', v: (r) => esc(refL(r)) }, { t: 'Amount', n: 1, v: (r) => inr(r.amount), x: (r) => num(r.amount) }, { t: 'Mode', v: (r) => esc(r.mode) }, { t: 'Notes', v: (r) => esc(r.notes) }];
  const rin = rows.filter((r) => r.direction !== 'out').reduce((a, r) => a + num(r.amount), 0), rout = rows.filter((r) => r.direction === 'out').reduce((a, r) => a + num(r.amount), 0);
  const recvAtSale = m.saleRows.filter((s) => inR(s.rec.date)).reduce((a, s) => a + num(s.rec.received), 0);
  const paidAtEntry = act('purchases').filter((p) => inR(p.date)).reduce((a, p) => a + num(p.paid), 0) + act('unloading').filter((p) => inR(p.date)).reduce((a, p) => a + num(p.paid), 0) + act('mistri').filter((p) => inR(p.date)).reduce((a, p) => a + num(p.advance) + num(p.paid), 0) + m.expRows.filter((x) => x.paidAtEntry && inR(x.rec.payDate || x.rec.date)).reduce((a, x) => a + x.total, 0);
  return `<div class="kpis">${kpi('Money in · ' + rng().label, inr0(rin + recvAtSale), `${inr0(recvAtSale)} at invoice + ${inr0(rin)} later`, true)}${kpi('Money out', inr0(rout + paidAtEntry), `${inr0(paidAtEntry)} at entry + ${inr0(rout)} later`)}${kpi('Customer outstanding', inr0(Object.values(m.parties).reduce((a, p) => a + Math.max(0, p.receivable), 0)))}${kpi('Supplier & labour outstanding', inr0(Object.values(m.parties).reduce((a, p) => a + Math.max(0, p.payable), 0)))}</div>
  <div class="card">${toolbar({ key: 'payments', add: 'payments', addLabel: 'Payment / receipt', what: 'party' })}</div><div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Later payments &amp; receipts · ${esc(rng().label)}</h2>${exportBtns('payments', 'Payments', cols, rows)}</div>${table(cols, rows, { acts: rowActs('payments') })}<p class="mute" style="font-size:13px">Amounts paid at the time of purchase, invoice, labour or mistri entry are kept on those entries; record anything paid later here — against a specific invoice/lot or as an advance.</p></div>`;
};
PAGES.accounts = () => {
  const m = model(), r = rng(), F = PF.accounts || {};
  const A = m.cash.accounts; const sel = F.acct || '';
  const pick = (x) => !sel || x.acct === sel;
  const before = A.filter((a) => !sel || a.id === sel).reduce((a, x) => a + x.opening, 0) + m.cash.moves.filter((x) => pick(x) && r.from && x.date < r.from).reduce((a, x) => a + (x.dir === 'in' ? x.amt : -x.amt), 0);
  let bal = before; const rows = m.cash.moves.filter((x) => pick(x) && inR(x.date)).map((x) => { bal = CE.addM(bal, x.dir === 'in' ? x.amt : -x.amt); return { ...x, bal }; });
  const cols = [{ t: 'Date', v: (x) => dd(x.date), x: (x) => x.date }, { t: 'Account', v: (x) => esc(acctName(x.acct)) }, { t: 'Particulars', v: (x) => esc(x.ref) }, { t: 'Party', v: (x) => esc(x.party) }, { t: 'Mode', v: (x) => esc(x.mode) },
    { t: 'Money in', n: 1, v: (x) => (x.dir === 'in' ? inr(x.amt) : ''), x: (x) => (x.dir === 'in' ? x.amt : 0), sum: (x) => (x.dir === 'in' ? x.amt : 0) }, { t: 'Money out', n: 1, v: (x) => (x.dir === 'out' ? inr(x.amt) : ''), x: (x) => (x.dir === 'out' ? x.amt : 0), sum: (x) => (x.dir === 'out' ? x.amt : 0) }, { t: 'Balance', n: 1, v: (x) => `<b class="${x.bal < 0 ? 'neg' : ''}">${inr(x.bal)}</b>`, x: (x) => x.bal }];
  const ua = m.cash.unassigned;
  const extra = `<select data-f="acct" data-key="accounts" aria-label="Account"><option value="">All accounts</option>${opts(A.map((a) => [a.id, a.name]), sel)}</select>`;
  return `<div class="kpis">${A.map((a) => kpi(a.name, `<span class="${a.balance < 0 ? 'neg' : ''}">${inr0(a.balance)}</span>`, `${a.type === 'cash' ? 'Cash' : 'Bank'} · opening ${inr0(a.opening)}`, a.type === 'cash')).join('')}${kpi('Total cash + bank', inr0(m.cash.total), '', true)}</div>
  ${ua.length ? `<div class="note bad"><b>${ua.length} payment${ua.length > 1 ? 's have' : ' has'} no payment mode</b> (${inr0(ua.reduce((a, x) => a + num(x.amt), 0))}). They are not in any balance until you set the mode: ${ua.slice(0, 6).map((x) => esc(`${dd(x.date)} ${x.ref}`)).join(' · ')}${ua.length > 6 ? ' …' : ''}</div>` : ''}
  <div class="card">${toolbar({ key: 'accounts', add: 'payments', addLabel: 'Receipt / payment / transfer', extra, what: 'party, reference' })}</div>
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Cash &amp; bank book · ${esc(r.label)}</h2>${exportBtns('cashbook', 'Cash and bank book', cols, rows)}</div><p class="mute" style="margin:0 0 8px;font-size:13px">Balance brought forward: <b>${inr(before)}</b></p>${table(cols, rows, { empty: 'No money moved in this period.' })}<p class="mute" style="font-size:13px">Every rupee comes from a saved entry: money paid with a purchase, labour, mistri, approved expense, money received with an invoice, refunds, and later receipts / payments / transfers. Opening balances are set in Settings. Credit sales and unpaid wages move no money.</p></div>`;
};
PAGES.pnl = () => {
  const m = model(), r = rng(), p = m.pnl(r.from, r.to);
  const line = (l, v, cls) => `<tr class="${cls || ''}"><td>${l}</td><td class="n">${inr(v)}</td></tr>`;
  const lots = Object.values(m.lots).map((L) => lotPnl(m, L)).sort((a, b) => String(b.L.rec.date).localeCompare(a.L.rec.date));
  const lcols = [{ t: 'Lot', v: (x) => `<b>${esc(x.id)}</b><br><span class="mute">${esc(x.L.rec.supplier)}</span>`, x: (x) => x.id }, { t: 'Raw cost/kg', n: 1, v: (x) => inr(x.L.rawPerKg), x: (x) => CE.r2(x.L.rawPerKg) }, { t: 'Processed kg', n: 1, v: (x) => `${qf(x.L.processedKg)} / ${qf(x.L.kg)}`, x: (x) => x.L.processedKg }, { t: 'Production cost', n: 1, v: (x) => inr0(x.cost), x: (x) => CE.r2(x.cost), sum: (x) => x.cost }, { t: 'Sales', n: 1, v: (x) => inr0(x.revenue), x: (x) => CE.r2(x.revenue), sum: (x) => x.revenue }, { t: 'Cost of sold', n: 1, v: (x) => inr0(x.cogs), x: (x) => CE.r2(x.cogs), sum: (x) => x.cogs }, { t: 'Gross profit', n: 1, v: (x) => `<b class="${x.profit < 0 ? 'neg' : 'pos'}">${inr0(x.profit)}</b>`, x: (x) => CE.r2(x.profit), sum: (x) => x.profit }, { t: 'Stock left (cost)', n: 1, v: (x) => inr0(x.stockVal), x: (x) => CE.r2(x.stockVal), sum: (x) => x.stockVal }];
  const bs = Object.values(m.batches).filter((b) => inR(b.date)).sort((a, b) => byDate(a.rec, b.rec));
  return `<div class="cols2"><div class="card"><h2>Profit &amp; loss · ${esc(r.label)}</h2><table><tbody>
  ${CE.SALE_CATS.filter((k) => k !== 'raw' || p.byProduct.raw.qty).map((k) => line(`Sales — ${CE.LABEL[k]} <span class="mute">${qty(p.byProduct[k].qty, k)} (net of returns)</span>`, p.byProduct[k].revenue)).join('')}
  ${line('<b>Total sales (excl. GST, after returns)</b>', p.revenue, 'tot')}${p.returns ? line('<span class="mute">of which sale returns (credit notes) deducted</span>', -p.returns) : ''}${line('Less: cost of goods sold <span class="mute">(wood, unloading, processing, mistri, consumables allocated to what was sold)</span>', -p.cogs)}
  ${line('<b>Gross profit</b>', p.gross, 'tot')}${line('Less: overhead not absorbed in production', -p.overhead)}${line('<b>Net profit</b>', p.net, 'tot')}
  </tbody></table>${p.drawings ? `<p class="mute" style="font-size:13px">Owner drawings (personal, not a business cost): <b>${inr(p.drawings)}</b>.</p>` : ''}${p.pendingExp.length ? `<p class="note" style="font-size:13px">${p.pendingExp.length} expense${p.pendingExp.length > 1 ? 's' : ''} (${inr(p.pendingExpAmt)}) waiting for admin approval — not included above.</p>` : ''}<p class="mute" style="font-size:13px">Costs of unsold stock stay in inventory value (not expensed) so nothing is counted twice. Margin ${p.revenue ? qf((p.net / p.revenue) * 100, 1) + '%' : '—'}.</p></div>
  <div class="card"><h2>GST · ${esc(r.label)}</h2><table><tbody>${line('Output GST on sales (payable)', p.gstOut)}${line('Input GST on purchases & expenses (receivable)', S().gstClaimable ? p.gstIn : 0)}${line('<b>Net GST ' + (p.gstOut - (S().gstClaimable ? p.gstIn : 0) >= 0 ? 'payable' : 'credit') + '</b>', Math.abs(p.gstOut - (S().gstClaimable ? p.gstIn : 0)), 'tot')}</tbody></table><p class="mute" style="font-size:13px">GST is kept out of revenue and costs${S().gstClaimable ? '' : ' (input GST set as not claimable: added to wood cost)'}.</p>
  <h3 style="margin-top:14px">Spending in period</h3><table><tbody>${line('Wood (ex-GST incl. loading/transport)', p.spend.wood)}${LAB_T.map(([k, l]) => (p.spend.labourBy[k] ? line(l + ' labour', p.spend.labourBy[k]) : '')).join('')}${line('Mistri making charges', p.spend.mistri)}${line('Machine, blade, power, consumables, other', p.spend.expenses)}</tbody></table></div></div>
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Lot-wise costing &amp; profitability (all time)</h2>${exportBtns('lots', 'Lot profitability', lcols, lots)}</div>${table(lcols, lots, { empty: 'No lots yet.' })}</div>
  <div class="card"><h2>Batch costing breakdown · ${esc(r.label)}</h2>${bs.length ? bs.map((b) => batchCard(b)).join('') : '<div class="empty">No production in this period.</div>'}</div>
  <div class="card"><h2>Overhead in net profit · ${esc(r.label)}</h2>${table([{ t: 'Date', v: (o) => dd(o.date) }, { t: 'Item', v: (o) => esc(o.label) }, { t: 'Why here', v: (o) => esc(o.reason) }, { t: 'Amount', n: 1, v: (o) => inr(o.amount), sum: (o) => o.amount }], p.overheadRows, { empty: 'No overhead — every expense was absorbed into production.' })}</div>
  ${m.warn.length ? `<div class="card"><h2>Costing notes</h2><ul>${[...new Set(m.warn)].slice(0, 40).map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}`;
};
function batchCard(b) {
  const L = b.lotId; const ks = CE.PRODUCTS.filter((k) => b.pc.out[k] > 0);
  return `<details style="border-top:1px solid var(--line);padding:8px 0"><summary>${esc(b.id)} · ${dd(b.date)} · lot ${esc(L)} · cost ${inr0(b.total)} · ${b.pc.doorPcs} doors</summary>
  <div class="cols2" style="margin-top:8px"><table><tbody>
  <tr><td>Raw wood ${qf(b.pc.inputKg)} kg × ${inr(b.raw / (b.pc.inputKg || 1))}/kg</td><td class="n">${inr(b.raw)}</td></tr>
  ${b.expLines.map((e) => `<tr><td>${esc(e.label)}</td><td class="n">${inr(e.amount)}</td></tr>`).join('')}
  <tr class="tot"><td>Joint cost to split</td><td class="n">${inr(b.joint)}</td></tr><tr><td>Mistri (doors only)</td><td class="n">${inr(b.mistri)}</td></tr>
  <tr class="tot"><td>Total batch cost</td><td class="n">${inr(b.total)}</td></tr></tbody></table>
  <table><thead><tr><th>Output</th><th class="n">Qty</th><th class="n">Share</th><th class="n">Cost</th><th class="n">Per unit</th></tr></thead><tbody>
  ${ks.map((k) => `<tr><td>${CE.LABEL[k]}</td><td class="n">${qty(b.pc.out[k], k)}</td><td class="n">${qf(b.alloc.shares[k] * 100, 1)}%</td><td class="n">${inr(b.cost[k])}</td><td class="n">${inr(b.unit[k])}</td></tr>`).join('')}
  ${b.perDoor.map((d) => `<tr><td class="mute">Door ${esc(d.key.replace('x', '×'))}″</td><td class="n">${d.pcs} pcs</td><td></td><td></td><td class="n">${inr(d.cost)}/door</td></tr>`).join('')}
  </tbody></table></div><p class="mute" style="font-size:13px;margin:6px 0 0">Method: <b>${esc(b.alloc.method)}</b>${b.alloc.method === 'Relative sales value' ? ` — output qty × the rates entered on the batch (${CE.PRODUCTS.map((k) => `${CE.LABEL[k]} ${inr(b.pc.rates[k])}`).join(', ')})` : ''}. ${esc(b.alloc.note || '')}</p></details>`;
}
PAGES.reports = () => {
  const m = model(), r = rng(), p = m.pnl(r.from, r.to);
  const gstRows = m.saleRows.filter((s) => inR(s.rec.date)).sort((a, b) => byDate(a.rec, b.rec));
  const gcols = [{ t: 'Date', v: (s) => dd(s.rec.date), x: (s) => s.rec.date }, { t: 'Invoice', v: (s) => esc(s.rec.invoiceNo) }, { t: 'Customer', v: (s) => esc(s.rec.customer) }, { t: 'GSTIN', v: (s) => esc(s.rec.customerGstin || 'B2C') }, { t: 'Place of supply', v: (s) => esc(s.rec.placeOfSupply ? `${CE.STATES[s.rec.placeOfSupply] || ''} (${s.rec.placeOfSupply})` : '') }, { t: 'Taxable', n: 1, v: (s) => inr(s.taxable), x: (s) => s.taxable, sum: (s) => s.taxable }, { t: 'Rate', n: 1, v: (s) => (s.nonGst ? 'Non-GST' : s.mixed ? 'mixed' : qf(s.pct) + '%'), x: (s) => (s.mixed ? 'mixed' : s.nonGst ? 'Non-GST' : s.pct) }, { t: 'CGST', n: 1, v: (s) => inr(s.cgst), x: (s) => s.cgst, sum: (s) => s.cgst }, { t: 'SGST', n: 1, v: (s) => inr(s.sgst), x: (s) => s.sgst, sum: (s) => s.sgst }, { t: 'IGST', n: 1, v: (s) => inr(s.igst), x: (s) => s.igst, sum: (s) => s.igst }, { t: 'Total GST', n: 1, v: (s) => inr(s.gst), x: (s) => s.gst, sum: (s) => s.gst }, { t: 'Invoice total', n: 1, v: (s) => inr(s.total), x: (s) => s.total, sum: (s) => s.total }];
  const byRate = {}; const byHsn = {}; const b2 = { B2B: { n: 0, taxable: 0, gst: 0 }, B2C: { n: 0, taxable: 0, gst: 0 } };
  gstRows.forEach((s) => { s.groups.forEach((g) => { const x = (byRate[g.key] = byRate[g.key] || { key: g.key, pct: g.pct, nonGst: g.nonGst, inv: new Set(), taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0 }); x.inv.add(s.rec.id); ['taxable', 'cgst', 'sgst', 'igst', 'gst'].forEach((k) => { x[k] += g[k]; }); });
    const t = s.rec.customerGstin ? b2.B2B : b2.B2C; t.n++; t.taxable += s.taxable; t.gst += s.gst;
    s.lines.forEach((l) => { const k = (l.hsn || '—') + '|' + l.cat + '|' + (l.mode === 'nongst' ? 'nongst' : l.pct); const h = (byHsn[k] = byHsn[k] || { hsn: l.hsn || '—', cat: l.cat, rate: l.mode === 'nongst' ? 'Non-GST' : l.pct + '%', qty: 0, taxable: 0 }); h.qty += l.qty; h.taxable += l.amount; }); });
  const rateRows = Object.values(byRate).sort((a, b) => b.pct - a.pct);
  const rcols = [{ t: 'GST rate', v: (x) => (x.nonGst ? 'Non-GST / exempt' : x.pct + '%'), x: (x) => (x.nonGst ? 'Non-GST' : x.pct) }, { t: 'Invoices', n: 1, v: (x) => x.inv.size, x: (x) => x.inv.size }, { t: 'Taxable sales', n: 1, v: (x) => inr(x.taxable), x: (x) => CE.r2(x.taxable), sum: (x) => x.taxable }, { t: 'CGST', n: 1, v: (x) => inr(x.cgst), x: (x) => CE.r2(x.cgst), sum: (x) => x.cgst }, { t: 'SGST', n: 1, v: (x) => inr(x.sgst), x: (x) => CE.r2(x.sgst), sum: (x) => x.sgst }, { t: 'IGST', n: 1, v: (x) => inr(x.igst), x: (x) => CE.r2(x.igst), sum: (x) => x.igst }, { t: 'Total GST', n: 1, v: (x) => inr(x.gst), x: (x) => CE.r2(x.gst), sum: (x) => x.gst }];
  const hcols = [{ t: 'HSN', v: (h) => esc(h.hsn) }, { t: 'Product', v: (h) => CE.LABEL[h.cat] }, { t: 'Rate', v: (h) => h.rate }, { t: 'Quantity', n: 1, v: (h) => qty(h.qty, h.cat), x: (h) => CE.r4(h.qty) }, { t: 'UQC', v: (h) => (CE.UNIT[h.cat] === 'KG' ? 'KGS' : 'SQF') }, { t: 'Taxable value', n: 1, v: (h) => inr(h.taxable), x: (h) => CE.r2(h.taxable), sum: (h) => h.taxable }];
  const co = S().company; const gin = (S().gstClaimable ? p.gstIn : 0);
  const gstSummary = `<div class="card"><div class="row" style="margin-bottom:6px"><h2 class="sp">GST summary · ${esc(r.label)}</h2>${exportBtns('gstr', 'GST summary by rate', rcols, rateRows)}</div>
  <p class="mute" style="font-size:13px;margin:0 0 10px">${esc(co.name)}${co.legalName ? ' · ' + esc(co.legalName) : ''}${co.gstin ? ' · GSTIN ' + esc(co.gstin) + ' · State ' + esc(co.state) + ' (' + esc(co.stateCode) + ')' : ' · <b class="warn">GSTIN not set in Settings</b>'}</p>
  <div class="kpis" style="margin-bottom:12px">${kpi('Taxable sales', inr0(gstRows.reduce((a, s) => a + s.taxable, 0)), gstRows.length + ' invoices', true)}${kpi('CGST', inr(gstRows.reduce((a, s) => a + s.cgst, 0)))}${kpi('SGST', inr(gstRows.reduce((a, s) => a + s.sgst, 0)))}${kpi('IGST', inr(gstRows.reduce((a, s) => a + s.igst, 0)))}${kpi('Total output GST', inr(p.gstOut), '', true)}${kpi('Input GST (purchases + expenses)', inr(gin))}${kpi(p.gstOut - gin >= 0 ? 'Net GST payable' : 'Net GST credit', inr(Math.abs(p.gstOut - gin)), '', true)}</div>
  ${table(rcols, rateRows, { empty: 'No sales in this period.' })}
  <div class="cols2" style="margin-top:12px"><div><h3 style="margin-bottom:6px">B2B / B2C</h3>${table([{ t: 'Type', v: ([k]) => (k === 'B2B' ? 'B2B (customer has GSTIN)' : 'B2C (unregistered)') }, { t: 'Invoices', n: 1, v: ([, x]) => x.n }, { t: 'Taxable', n: 1, v: ([, x]) => inr(x.taxable) }, { t: 'GST', n: 1, v: ([, x]) => inr(x.gst) }], Object.entries(b2))}</div>
  <div><div class="row" style="margin-bottom:6px"><h3 class="sp">HSN-wise summary</h3>${exportBtns('hsn', 'HSN summary', hcols, Object.values(byHsn))}</div>${table(hcols, Object.values(byHsn), { empty: 'No sales.' })}</div></div></div>`;
  const icol = [{ t: 'Date', v: (L) => dd(L.rec.date), x: (L) => L.rec.date }, { t: 'Lot', v: (L) => esc(L.id) }, { t: 'Supplier', v: (L) => esc(L.rec.supplier) }, { t: 'DO/Inv', v: (L) => esc(L.rec.doNo) }, { t: 'Taxable', n: 1, v: (L) => inr(L.value), x: (L) => L.value, sum: (L) => L.value }, { t: 'GST', n: 1, v: (L) => inr(L.gst), x: (L) => L.gst, sum: (L) => L.gst }];
  const inRows = m.purchRows.filter((L) => inR(L.rec.date));
  const F = PF.reports || {}; const grp = F.grp || 'month';
  const wk = (d) => { const x = new Date(d + 'T00:00:00Z'); const day = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - day); return x.toISOString().slice(0, 10); };
  const keyOf = (d) => (grp === 'day' ? d : grp === 'week' ? wk(d) : grp === 'year' ? CE.fyOf(d, S().fyStart).label : String(d).slice(0, 7));
  const per = {}; gstRows.forEach((s) => { const k = keyOf(s.rec.date); const x = (per[k] = per[k] || { k, inv: 0, ret: 0, taxable: 0, gst: 0, total: 0, cogs: 0 }); s.ret ? x.ret++ : x.inv++; x.taxable += s.taxable; x.gst += s.gst; x.total += s.total; x.cogs += s.cogs; });
  const perRows = Object.values(per).sort((a, b) => String(b.k).localeCompare(a.k));
  const pcols = [{ t: grp === 'day' ? 'Day' : grp === 'week' ? 'Week from' : grp === 'year' ? 'Financial year' : 'Month', v: (x) => esc(grp === 'day' || grp === 'week' ? dd(x.k) : grp === 'month' ? mlabel(x.k) + ' ' + x.k.slice(0, 4) : 'FY ' + x.k), x: (x) => x.k }, { t: 'Invoices', n: 1, v: (x) => x.inv, x: (x) => x.inv }, { t: 'Returns', n: 1, v: (x) => x.ret, x: (x) => x.ret }, { t: 'Taxable sales', n: 1, v: (x) => inr(x.taxable), x: (x) => CE.r2(x.taxable), sum: (x) => x.taxable }, { t: 'GST', n: 1, v: (x) => inr(x.gst), x: (x) => CE.r2(x.gst), sum: (x) => x.gst }, { t: 'Invoice value', n: 1, v: (x) => inr(x.total), x: (x) => CE.r2(x.total), sum: (x) => x.total }, { t: 'Cost of sales', n: 1, v: (x) => inr(x.cogs), x: (x) => CE.r2(x.cogs), sum: (x) => x.cogs }, { t: 'Gross profit', n: 1, v: (x) => `<b class="${x.taxable - x.cogs < 0 ? 'neg' : ''}">${inr(x.taxable - x.cogs)}</b>`, x: (x) => CE.r2(x.taxable - x.cogs), sum: (x) => x.taxable - x.cogs }];
  const matR = {}; Object.values(m.lots).forEach((L) => { const lp = lotPnl(m, L); const x = (matR[L.material] = matR[L.material] || { mat: L.material, lots: 0, kg: 0, recv: 0, left: 0, stock: 0, revenue: 0, cogs: 0 }); x.lots++; x.kg += L.billedKg; x.recv += L.receivedKg; x.left += L.rawLeft; x.stock += lp.stockVal; x.revenue += lp.revenue; x.cogs += lp.cogs; });
  const mcols = [{ t: 'Material', v: (x) => `<b>${esc(x.mat)}</b>`, x: (x) => x.mat }, { t: 'Lots', n: 1, v: (x) => x.lots, x: (x) => x.lots }, { t: 'Purchased kg', n: 1, v: (x) => qf(x.kg), x: (x) => x.kg, sum: (x) => x.kg, fmt: qf }, { t: 'Received kg', n: 1, v: (x) => qf(x.recv), x: (x) => x.recv }, { t: 'Raw left kg', n: 1, v: (x) => qf(x.left), x: (x) => x.left }, { t: 'Stock value (raw + finished)', n: 1, v: (x) => inr0(x.stock), x: (x) => CE.r2(x.stock), sum: (x) => x.stock }, { t: 'Sales', n: 1, v: (x) => inr0(x.revenue), x: (x) => CE.r2(x.revenue), sum: (x) => x.revenue }, { t: 'Cost of sales', n: 1, v: (x) => inr0(x.cogs), x: (x) => CE.r2(x.cogs), sum: (x) => x.cogs }, { t: 'Gross profit', n: 1, v: (x) => `<b class="${x.revenue - x.cogs < 0 ? 'neg' : 'pos'}">${inr0(x.revenue - x.cogs)}</b>`, x: (x) => CE.r2(x.revenue - x.cogs), sum: (x) => x.revenue - x.cogs }];
  const pr = Object.values(m.parties);
  const ocols = (f) => [{ t: 'Party', v: (x) => esc(x.name), x: (x) => x.name }, { t: 'Role', v: (x) => esc([...x.roles].join(', ')), x: (x) => [...x.roles].join(', ') }, { t: 'Outstanding', n: 1, v: (x) => `<b>${inr(x[f])}</b>`, x: (x) => CE.r2(x[f]), sum: (x) => x[f] }];
  const recv = pr.filter((x) => x.receivable > 0.005).sort((a, b) => b.receivable - a.receivable), payb = pr.filter((x) => x.payable > 0.005).sort((a, b) => b.payable - a.payable);
  const grpSel = `<select data-f="grp" data-key="reports" aria-label="Group by" style="width:auto">${opts([['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly (FY)']], grp)}</select>`;
  const more = `<div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Sales by period · ${esc(r.label)}</h2>${grpSel}${exportBtns('per', 'Sales by period', pcols, perRows)}</div>${table(pcols, perRows, { empty: 'No sales in this period.' })}</div>
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Material-wise stock &amp; profitability (all time)</h2>${exportBtns('matp', 'Material-wise profitability', mcols, Object.values(matR))}</div>${table(mcols, Object.values(matR), { empty: 'No purchases yet.' })}</div>
  <div class="cols2"><div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Customer outstanding</h2>${exportBtns('rcv', 'Customer outstanding', ocols('receivable'), recv)}</div>${table(ocols('receivable'), recv, { empty: 'Nobody owes you money.' })}</div>
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">Supplier, labour &amp; mistri outstanding</h2>${exportBtns('pyb', 'Supplier outstanding', ocols('payable'), payb)}</div>${table(ocols('payable'), payb, { empty: 'You owe nobody.' })}</div></div>
  <div class="cols2"><div class="card"><h2>Cash &amp; bank summary (today)</h2>${table([{ t: 'Account', v: (a) => esc(a.name) }, { t: 'Opening', n: 1, v: (a) => inr(a.opening) }, { t: 'In', n: 1, v: (a) => inr(a.in) }, { t: 'Out', n: 1, v: (a) => inr(a.out) }, { t: 'Balance', n: 1, v: (a) => `<b>${inr(a.balance)}</b>`, sum: (a) => a.balance }], m.cash.accounts)}<p><a href="#accounts">Open the cash &amp; bank book ›</a></p></div>
  <div class="card"><h2>Labour, TDS &amp; expenses · ${esc(r.label)}</h2><table><tbody>${LAB_T.map(([k, l]) => `<tr><td>${esc(l)} labour (wages earned)</td><td class="n">${inr(p.spend.labourBy[k])}</td></tr>`).join('')}<tr><td>Mistri making charges</td><td class="n">${inr(p.spend.mistri)}</td></tr><tr><td>Approved business expenses</td><td class="n">${inr(p.spend.expenses)}</td></tr><tr><td>Owner drawings (personal)</td><td class="n">${inr(p.drawings)}</td></tr><tr><td>Expenses waiting for approval</td><td class="n">${inr(p.pendingExpAmt)}</td></tr><tr><td class="mute">— of which already paid (all time)</td><td class="n">${inr(m.expSum.pendingPaid)}</td></tr><tr><td>Approved expenses not yet paid (all time)</td><td class="n">${inr(m.expSum.approvedUnpaid)}</td></tr><tr><td>Rejected expenses already paid — to recover</td><td class="n">${inr(m.expSum.rejectedPaid)}</td></tr><tr class="tot"><td>TDS deducted by customers (claim as credit)</td><td class="n">${inr(m.tds.receivable)}</td></tr><tr class="tot"><td>TDS you deducted (deposit with government)</td><td class="n">${inr(m.tds.payable)}</td></tr></tbody></table><p class="mute" style="font-size:13px">TDS totals are all-time. Have your CA confirm TDS rates and sections.</p></div></div>`;
  return `<div class="card"><h2>Full workbook</h2><p>One Excel file with every module for <b>${esc(r.label)}</b> (purchases, unloading, production, sales lines, mistri, expenses, payments, stock, lots, parties).</p><div class="row"><button class="btn p" data-act="workbook">Download Excel workbook</button></div></div>
  ${more}
  ${gstSummary}
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">GST outward register (invoice-wise) · ${esc(r.label)}</h2>${exportBtns('gsto', 'GST outward', gcols, gstRows)}</div>${table(gcols, gstRows)}</div>
  <div class="card"><div class="row" style="margin-bottom:8px"><h2 class="sp">GST inward (purchases) · ${esc(r.label)}</h2>${exportBtns('gsti', 'GST inward', icol, inRows)}</div>${table(icol, inRows)}<p>Net GST ${p.gstOut - p.gstIn >= 0 ? 'payable' : 'credit'}: <b>${inr(Math.abs(p.gstOut - (S().gstClaimable ? p.gstIn : 0)))}</b> (expense GST included in input).</p></div>
  <div class="card" id="bk"><h2>Backup &amp; recovery</h2>
  ${LOCAL ? localBackupText() : `<p>Your data lives in this app's cloud database and is shared by every device you open it on. Two kinds of backup:</p>
  <ul><li><b>Cloud snapshots</b> — a full copy kept inside the same database. One is taken automatically the first time an admin opens the app each day; the last 7 days are kept.</li><li><b>Backup file</b> — a JSON file you keep on your phone or computer (off-site). Do this weekly.</li></ul>`}
  <div class="row"><button class="btn p" data-act="backupfile">Download backup file</button>${isAdmin() ? `<button class="btn" data-act="snapnow">${LOCAL ? 'Take automatic backup now' : 'Take cloud snapshot now'}</button><label class="btn">Restore from file<input type="file" accept=".json,application/json" data-act="restorefile" hidden></label>` : ''}</div>
  <div id="snaps" style="margin-top:12px"><button class="btn s" data-act="listsnaps">${LOCAL ? 'Show automatic backups on this device' : 'Show cloud snapshots'}</button></div></div>`;
};
function localBackupText() {
  const L = LOC(); const lb = lastBackupFile(); const ds = daysSince(lb && lb.at);
  return `<p>Your data is stored <b>only on this device, in this browser</b> (${esc(L.backend === 'indexeddb' ? 'device database' : 'older browser storage')}). It is not sent anywhere and is <b>not shared</b> with your other devices. If this browser's data is cleared or the device is lost, only a backup file can bring the records back.</p>
  <ul><li><b>Backup file</b> — one file with every record, setting, bill photo and the audit history. Save it outside this device (pen drive, email to yourself, Google Drive, iCloud). <b>Do this at least once a week.</b></li><li><b>Automatic backups</b> — a full copy kept inside this browser, taken the first time the ERP opens each day; the last 7 days are kept. They protect against mistakes, not against losing the device.</li></ul>
  <p class="note ${ds == null || ds > 7 ? 'bad' : ''}" id="lastBk">${lb ? `Last backup file: <b>${esc(lb.name)}</b> · ${esc(new Date(lb.at).toLocaleString('en-IN'))} (${ds === 0 ? 'today' : ds + ' day' + (ds > 1 ? 's' : '') + ' ago'})` : 'No backup file has been downloaded on this device yet.'}</p>`;
}
function storageCard() {
  const L = LOC(); if (!LOCAL) return '';
  return `<div class="card"><h2>This device's database</h2><table><tbody><tr><td>Storage</td><td>${L.backend === 'indexeddb' ? 'Device database (IndexedDB) — recommended' : '<b class="neg">Older browser storage (limited, about 5 MB)</b>'}</td></tr><tr><td>Device ID</td><td>${esc(L.deviceId || '')}</td></tr><tr><td>Protected from automatic clean-up</td><td>${L.persisted === true ? 'Yes' : L.persisted === false ? 'Not granted by the browser — keep backup files' : 'Not available in this browser — keep backup files'}</td></tr><tr><td>Opened from</td><td>${esc(location.protocol === 'file:' ? 'File on this computer' : location.host)}</td></tr>${L.migrated && L.migrated.copied ? `<tr><td>Earlier Windows records</td><td>${L.migrated.copied} copied into the device database on ${esc(new Date(L.migrated.at).toLocaleString('en-IN'))}</td></tr>` : ''}<tr><td>Version</td><td>${esc(L.version || '')}</td></tr></tbody></table><p class="mute" style="font-size:13px;margin:10px 0 0">Always open the ERP the same way on this device (same launcher, same browser). A different browser, or a different address on iPhone, starts with an empty database.</p></div>`;
}
PAGES.setup = () => {
  const s = S(); const ro = !isAdmin() ? 'disabled' : '';
  const f = (k, l, v, t = 'text', readonly) => `<label class="f"><span>${esc(l)}</span><input ${ro} ${readonly ? 'readonly tabindex="-1"' : `data-s="${k}"`} type="${t}" value="${esc(v)}"></label>`;
  const ta = (k, l, v) => `<label class="f full"><span>${esc(l)}</span><textarea ${ro} data-s="${k}" rows="3">${esc(v)}</textarea></label>`;
  const sel = (k, l, v, o) => `<label class="f"><span>${esc(l)}</span><select ${ro} data-s="${k}">${opts(o, v)}</select></label>`;
  return `<div class="card"><h2>Your access</h2><p>Signed in as <b>${esc(ST.me.name || 'you')}</b> · role <span class="tag o">${ST.role === 'admin' ? 'Admin' : ST.role === 'operator' ? 'Operator' : 'View only'}</span></p><p class="mute" style="font-size:14px">${LOCAL ? 'Local mode: this device has one owner account with full Admin rights. Expenses you enter are saved as approved (you are the admin); every change, delete and restore is still recorded in the audit history.</p><p class="mute" style="font-size:14px;display:none">' : ''}${window.ERP_HOST === 'supabase' ? 'Every new account, including the very first one, starts as <b>pending</b> and sees nothing. Nobody becomes admin automatically: the owner assigns the first admin by hand in Supabase → <b>SQL Editor</b>, and gives other people the operator or viewer role the same way (README, setup step 6). Nobody can change their own role.' : 'Roles follow this app\'s Share settings on claude.ai: the owner and anyone shared as <b>Editor</b> are Admins'} — Admins: settings, stock adjustments, permanent delete, restore backups, approve stock exceptions. Operators (${window.ERP_HOST === 'supabase' ? 'role operator' : 'shared as <b>Contributor</b>'}): add, edit, delete to recycle bin. Viewers: read-only.</p></div>
  <div class="card"><h2>Company profile</h2><div class="grid">${f('company.name', 'Trade name (business display name)', s.company.name)}${f('company.legalName', 'Legal name (registered proprietor)', s.company.legalName)}${sel('company.constitution', 'Constitution of business', s.company.constitution, ['Proprietorship', 'Partnership', 'LLP', 'Private Limited Company', 'Other'])}${f('company.section', 'Section / division (ribbon)', s.company.section)}${f('company.tagline', 'Tagline', s.company.tagline)}${f('company.phone', 'Phone', s.company.phone)}${f('company.email', 'Email', s.company.email)}${f('company.jurisdiction', 'Jurisdiction (invoice footer)', s.company.jurisdiction)}${ta('company.bank', 'Bank details (printed)', s.company.bank)}</div></div>
  <div class="card"><h2>GST registration</h2>${(() => { const g = CE.gstinCheck(s.company.gstin); return s.company.gstin ? `<p class="note" style="margin:0 0 12px">${g.ok ? `✓ GSTIN valid · state ${esc(g.state)} (${g.stateCode}) · PAN ${esc(g.pan)}` : `<b class="neg">✗ ${esc(g.msg)}</b>`}</p>` : '<p class="note" style="margin:0 0 12px">Enter the GSTIN from the registration certificate (Form GST REG-06).</p>'; })()}
  <div class="grid">${f('company.gstin', 'GSTIN', s.company.gstin)}${sel('company.regType', 'Registration type', s.company.regType, ['Regular', 'Composition', 'Unregistered'])}${f('company.state', 'State (from GSTIN)', s.company.state + (s.company.stateCode ? '' : ''), 'text', true)}${f('company.stateCode', 'State code (from GSTIN)', s.company.stateCode, 'text', true)}${f('company.liabilityDate', 'Date of liability', s.company.liabilityDate, 'date')}${ta('company.address', 'Registered address — principal place of business (printed on invoices)', s.company.address)}</div>
  <p class="mute" style="font-size:13px;margin:10px 0 0">State and state code are taken from the GSTIN automatically. Sales to the same state are charged CGST + SGST; to another state, IGST. Each invoice keeps a copy of these details as they were on the day it was issued.</p></div>
  <div class="card"><h2>Tax classification by product</h2><p class="mute" style="font-size:13px;margin:0 0 10px">HSN code and default GST rate for each product. New invoice lines pick these up; every line can still be changed. Confirm the HSN and rate for each product with your CA.</p>
  <div class="grid">${CE.SALE_CATS.map((k) => f('tax.' + k + '.hsn', `${CE.LABEL[k]} · HSN`, s.tax[k].hsn) + sel('tax.' + k + '.mode', `${CE.LABEL[k]} · default GST`, s.tax[k].mode, [['', 'Use invoice default'], ...GST_OPTS.filter((o) => o[0] !== 'custom')])).join('')}${sel('defaultGst', 'Invoice default GST (when product has none)', s.defaultGst, GST_OPTS.filter((o) => o[0] !== 'custom'))}</div></div>
  <div class="card"><h2>Rules</h2><div class="grid">${f('invoicePrefix', 'Invoice prefix', s.invoicePrefix)}${f('fyStart', 'Financial year starts (month 1–12)', s.fyStart, 'number')}${f('payModes', 'Payment modes (comma separated)', s.payModes.join(', '))}
  <label class="f" style="grid-auto-flow:column;justify-content:start;gap:8px;align-items:center"><input type="checkbox" ${ro} data-s="gstClaimable" ${s.gstClaimable ? 'checked' : ''}><span>Purchase GST is claimable (input credit)</span></label>
  <label class="f" style="grid-auto-flow:column;justify-content:start;gap:8px;align-items:center"><input type="checkbox" ${ro} data-s="allocShared" ${s.allocShared ? 'checked' : ''}><span>Spread unlinked machine/power costs over the month's batches</span></label></div></div>
  <div class="card"><h2>Material types &amp; closing the books</h2><div class="grid">${f('materials', 'Material types (comma separated)', s.materials.join(', '))}${f('lockDate', 'Books closed up to (blank = open)', s.lockDate || '', 'date')}</div><p class="mute" style="font-size:13px;margin:10px 0 0">After you close the books up to a date (for example after filing GST), only an admin can add, change or delete entries dated on or before it — and must give a reason, which is saved in the audit history.</p></div>
  <div class="card"><h2>Cash &amp; bank accounts</h2><p class="mute" style="font-size:13px;margin:0 0 10px">Enter each account's balance on the day you start using the ERP. Clear a name to remove an unused account.</p>${[...s.accounts, { id: '', name: '', type: 'bank', opening: 0 }].map((a, i) => `<div class="grid" style="margin-bottom:8px"><input type="hidden" data-s="accounts.${i}.id" value="${esc(a.id)}">${f(`accounts.${i}.name`, i === s.accounts.length ? 'New account name' : 'Account name', a.name)}${sel(`accounts.${i}.type`, 'Type', a.type, [['cash', 'Cash'], ['bank', 'Bank']])}${f(`accounts.${i}.opening`, 'Opening balance (₹)', a.opening, 'number')}</div>`).join('')}</div>
  <div class="card"><h2>Low-stock alerts (0 = off)</h2><div class="grid">${['raw', ...CE.PRODUCTS].map((k) => f('low.' + k, `${CE.LABEL[k]} (${CE.UNIT[k]})`, s.low[k], 'number')).join('')}</div></div>
  ${isAdmin() ? '<div class="row"><button class="btn p" data-act="savesettings">Save settings</button></div>' : '<p class="mute">Only an admin can change settings.</p>'}
  ${LOCAL ? (typeof syncSetupCard === 'function' ? syncSetupCard() : '') + storageCard() + `<div class="card"><h2>Install on your phone or computer</h2><p style="font-size:14px"><b>Windows:</b> double-click <b>START-CHIRAG-ERP</b>. <b>MacBook:</b> double-click <b>Start Chirag ERP</b>. <b>iPhone:</b> start the ERP on the MacBook (or the Windows PC), open the iPhone address shown there in Safari on the same Wi-Fi, then Share → <b>Add to Home Screen</b>. Each device keeps its own separate records.</p>${lanInfo()}</div>` : `<div class="card"><h2>Install on your phone or computer</h2><p style="font-size:14px">Open this app's link in Safari (iPhone) → Share → <b>Add to Home Screen</b>. On Android Chrome: menu → <b>Add to Home screen</b>. On Mac/Windows: bookmark it or use the Claude desktop app. Everything you enter is saved to the same cloud database for all devices.</p></div>`}`;
};
let LAN = null;
function lanInfo() {
  if (location.protocol === 'file:') return '';
  if (LAN === null) { LAN = false; fetch('lan.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.urls && j.urls.length) { LAN = j; if (route === 'setup') render(); } }).catch(() => {}); }
  return LAN ? `<p style="font-size:14px">iPhone address (same Wi-Fi): ${LAN.urls.map((u) => `<b>${esc(u)}</b>`).join(' or ')}</p>` : '';
}
PAGES.deleted = () => {
  const items = []; ST.COLLS.forEach((c) => ST.rows(c).filter((r) => r.deleted).forEach((r) => items.push({ c, r })));
  items.sort((a, b) => String(b.r.deletedAt).localeCompare(String(a.r.deletedAt)));
  const F = PF.deleted || {}; const shown = items.filter((x) => !F.q || JSON.stringify(x.r).toLowerCase().includes(F.q.toLowerCase()));
  ST.names(items.map((x) => x.r.deletedBy)).then((n) => { document.querySelectorAll('[data-uid]').forEach((e) => { e.textContent = n[e.dataset.uid] || e.textContent; }); });
  const cols = [{ t: 'Deleted', v: (x) => esc(String(x.r.deletedAt || '').replace('T', ' ').slice(0, 16)) }, { t: 'Entry', v: (x) => esc(label(x.c, x.r)) }, { t: 'Entry date', v: (x) => dd(x.r.date) }, { t: 'By', v: (x) => `<span data-uid="${esc(x.r.deletedBy)}">${esc(ST.names[x.r.deletedBy] || '…')}</span>` }, { t: 'Reason', v: (x) => esc(x.r.deleteReason) }];
  return `<div class="card">${toolbar({ key: 'deleted', what: 'deleted entries' })}</div><div class="card"><h2>Recycle bin (${items.length})</h2>${table(cols, shown, { empty: 'Nothing deleted.', acts: (x) => canW() ? `<button class="btn s" data-act="restore" data-c="${x.c}" data-id="${esc(x.r.id)}">Restore</button>${isAdmin() ? ` <button class="btn s d" data-act="purge" data-c="${x.c}" data-id="${esc(x.r.id)}">Erase</button>` : ''}` : '' })}</div>
  ${ST.conflicts && ST.conflicts.length ? `<div class="card"><h2>Offline entries that clashed</h2><p class="note">These were entered offline but the record was changed elsewhere first. The cloud version was kept. Re-enter if needed.</p><ul>${ST.conflicts.map((c) => `<li>${esc(label(c.coll, c.rec))} · ${new Date(c.at).toLocaleString('en-IN')}</li>`).join('')}</ul><button class="btn s" data-act="clearconf">Dismiss</button></div>` : ''}
  <div class="card"><div class="row"><h2 class="sp">Audit history</h2><button class="btn s" data-act="audit">Load recent audit log</button></div><div id="auditBox" class="mute" style="font-size:14px">Every create, edit, delete, restore and erase is recorded with who and when.</div></div>`;
};

/* ======================================================================
   SHELL & EVENTS
   ====================================================================== */
let route = (location.hash || '').slice(1) || 'dashboard';
if (!PAGES[route]) route = 'dashboard';
function shell() {
  (document.getElementById('erp-root') || document.body).innerHTML = (window.ERP_ENV === 'TEST' ? '<div class="envbar" role="status">TEST COPY · separate test database · not your live business data</div>' : '') + `<div class="app"><aside class="rail" aria-label="Main navigation"><a href="#dashboard" class="brand" style="color:inherit;text-decoration:none">${LOGO(108)}<b>CHIRAG</b><b>ENTERPRISES</b><span class="ribbon" id="brSec">BOARD SECTION</span><span id="brG" style="font-size:11px;color:var(--mute);margin-top:4px"></span></a><nav class="nav" id="nav"></nav></aside>
  <div class="main"><header class="top"><button class="hamb" data-act="more" aria-label="Open menu">${ic('menu')}</button><h1 id="ttl"></h1><div class="gs" role="search">${ic('search')}<input id="gsq" type="search" placeholder="Search (Lot ID, Party, Invoice, etc…)" autocomplete="off" aria-label="Search everything"><div class="gsr" id="gsr" hidden></div></div><select id="rng" aria-label="Period" style="width:auto;min-height:38px;font-size:14px"></select><span id="cust"></span><span class="sync" id="sync"><span class="dot"></span>Connecting…</span><span style="position:relative"><button class="ibtn" id="bell" data-act="bell" aria-label="Alerts">${ic('bell')}<i id="bellN" hidden></i></button></span><button class="ibtn" data-act="help" aria-label="Help">${ic('help')}</button><span class="who"><span class="avatar" id="av">··</span><span><b id="whoN"></b><span id="whoR" class="mute"></span></span></span></header><main class="page" id="page" tabindex="-1"></main></div>
  <nav class="bnav" id="bnav" aria-label="Quick navigation"></nav></div>`;
}
function needBackup() {
  if (!LOCAL) return null;
  const n = ST.COLLS.reduce((a, c) => a + ST.rows(c).length, 0); if (!n) return null;
  const lb = lastBackupFile(); const d = daysSince(lb && lb.at);
  /* with a checked Google Drive backup from the last 2 days, a pen-drive copy is still asked for, but monthly */
  const sy = window.ERP_SYNC && ERP_SYNC.state ? ERP_SYNC.state() : null; const drive = sy && sy.connected && sy.lastBackup && daysSince(sy.lastBackup.at) <= 2;
  const lim = drive ? 30 : 7;
  if (d != null && d <= lim) return null;
  return drive ? (d == null ? 'Google Drive has your backup. Also keep one backup file on a pen drive' : `Pen-drive backup file is ${d} days old (Google Drive backup is up to date)`) : (d == null ? 'No backup file downloaded yet' : `Last backup file was ${d} days ago`);
}
function localBanners() {
  if (!LOCAL) return '';
  let h = '';
  if (LOC().error) h += `<div class="note bad" role="alert">${esc(LOC().error)}</div>`;
  if (typeof syncBanners === 'function') h += syncBanners(route);
  const nb = needBackup(); if (nb && ['dashboard', 'reports'].includes(route)) h += `<div class="note bad" role="alert" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:200px"><b>${esc(nb)}.</b> Your records are only on this device. Download a backup file and keep it somewhere safe.</span><button class="btn s p" data-act="backupfile">Download backup now</button></div>`;
  return h;
}
function alerts() {
  const m = model(), out = [], low = S().low;
  m.negatives.forEach((n) => out.push(['inventory', `Negative stock: ${CE.LABEL[n.k]} lot ${n.lot} ${qty(n.qty, n.k)}`]));
  ['raw', ...CE.PRODUCTS].forEach((k) => { if (num(low[k]) > 0 && m.stockTotals[k].qty < num(low[k])) out.push(['inventory', `Low stock: ${CE.LABEL[k]} ${qty(m.stockTotals[k].qty, k)}`]); });
  const due = m.saleRows.filter((s) => s.outstanding > 0.005); if (due.length) out.push(['sales', `${due.length} invoice(s) unpaid · ${inr0(due.reduce((a, s) => a + s.outstanding, 0))}`]);
  if (m.pendingExp.length) out.push(['machine', `${m.pendingExp.length} expense${m.pendingExp.length > 1 ? 's' : ''} waiting for approval`]);
  if (m.expSum.rejectedPaid > 0.005) out.push(['machine', `Rejected expenses already paid: ${inr0(m.expSum.rejectedPaid)} to recover`]);
  if (m.cash.unassigned.length) out.push(['accounts', `${m.cash.unassigned.length} payment(s) without a payment mode`]);
  const nb = needBackup(); if (nb) out.push(['reports', nb + ' — download a backup']);
  if (ST.outbox.length) out.push(['dashboard', `${ST.outbox.length} entr${ST.outbox.length > 1 ? 'ies' : 'y'} waiting to sync`]);
  if (ST.conflicts && ST.conflicts.length) out.push(['deleted', `${ST.conflicts.length} offline entr${ST.conflicts.length > 1 ? 'ies' : 'y'} clashed`]);
  return out;
}
function gsearch(q) {
  const box = $('#gsr'); q = q.trim().toLowerCase(); if (!q) { box.hidden = true; return; }
  const m = model(), res = [];
  const hit = (...xs) => xs.some((x) => String(x || '').toLowerCase().includes(q));
  m.purchRows.forEach((L) => { if (hit(L.id, L.rec.supplier, L.rec.doNo, L.rec.vehicle, L.rec.material)) res.push(['purchase', 'Lot', `${L.id} · ${L.rec.supplier || ''}`, `${dd(L.rec.date)} · ${qf(L.kg)} kg · ${inr0(L.total)}`, L.id]); });
  Object.values(m.batches).forEach((b) => { if (hit(b.id, b.lotId, b.rec.operator)) res.push(['production', 'Batch', `${b.id} · lot ${b.lotId}`, `${dd(b.date)} · ${b.pc.doorPcs} doors · ${qf(b.pc.doorSqft, 2)} sq ft`, b.id]); });
  m.saleRows.forEach((s) => { if (hit(s.rec.invoiceNo, s.rec.customer, ...s.lines.map((l) => l.lotId))) res.push(['sales', 'Invoice', `${s.rec.invoiceNo} · ${s.rec.customer || ''}`, `${dd(s.rec.date)} · ${inr0(s.total)} · due ${inr0(s.outstanding)}`, s.rec.invoiceNo]); });
  Object.values(m.parties).forEach((p) => { if (hit(p.name)) res.push(['parties', 'Party', p.name, `owes us ${inr0(p.receivable)} · we owe ${inr0(p.payable)}`, p.name]); });
  box.innerHTML = res.length ? res.slice(0, 14).map(([h, t, a, b, k]) => `<a href="#${h}" data-gs="${esc(h)}" data-q="${esc(k)}"><span class="tag o">${t}</span><span>${esc(a)}</span><small>${esc(b)}</small></a>`).join('') : '<div class="empty" style="padding:14px">No matches</div>';
  box.hidden = false;
}
function render() {
  if (!$('#page')) shell();
  const r = ranges();
  $('#nav').innerHTML = NAV.map(([k, t]) => `<a href="#${k}" class="${k === route ? 'on' : ''}" ${k === route ? 'aria-current="page"' : ''}>${ic(k)}${esc(t)}</a>`).join('');
  $('#bnav').innerHTML = BNAV.map(([k, t]) => `<a href="#${k}" class="${k === route ? 'on' : ''}">${ic(k)}${t}</a>`).join('') + `<a href="#" class="plus" data-act="plus" aria-label="New entry"><span>+</span></a><a href="#reports" class="${route === 'reports' ? 'on' : ''}">${ic('reports')}Reports</a><a href="#" data-act="more" class="${['dashboard', 'inventory', 'reports'].includes(route) ? '' : 'on'}">${ic('menu')}Menu</a>`;
  const nm = ST.me.name || 'User'; $('#av').textContent = (nm.match(/[A-Za-z]+/g) || ['U']).map((w) => w[0]).join('').slice(0, 2).toUpperCase(); $('#whoN').textContent = nm; $('#whoR').textContent = ST.role === 'admin' ? 'Admin' : ST.role === 'operator' ? 'Operator' : 'Viewer';
  $('#brSec').textContent = S().company.section || 'BOARD SECTION'; $('#brG').textContent = S().company.gstin ? 'GSTIN ' + S().company.gstin : '';
  if (ST.ready) { const n = alerts().length; const bn = $('#bellN'); bn.hidden = !n; bn.textContent = n; }
  $('#ttl').textContent = (NAV.find((n) => n[0] === route) || [, ''])[1];
  $('#rng').innerHTML = Object.entries(r).map(([k, v]) => `<option value="${k}" ${R.mode === k ? 'selected' : ''}>${esc(v[2])}</option>`).join('');
  $('#cust').innerHTML = R.mode === 'custom' ? `<span class="row" style="gap:6px"><input type="date" id="rf" value="${esc(R.from)}" style="width:auto;min-height:38px"><input type="date" id="rt" value="${esc(R.to)}" style="width:auto;min-height:38px"></span>` : '';
  const st = ST.status; const sy = $('#sync');
  if (LOCAL && st === 'live' && typeof syncLabel === 'function') sy.innerHTML = syncLabel(); else sy.innerHTML = `<span class="dot ${st === 'live' ? 'live' : st === 'pending' ? 'pending' : st === 'error' || st === 'nodb' ? 'err' : ''}"></span>${st === 'live' ? (LOCAL ? 'Saved on this device' : 'Cloud synced') : st === 'pending' ? `${ST.outbox.length} waiting to sync` : st === 'nodb' ? 'No cloud access' : st === 'error' ? 'Sync stopped' : st === 'slow' ? 'Still connecting…' : 'Connecting…'}`;
  sy.title = ST.statusNote || (ST.role === 'viewer' ? 'View only' : '');
  const page = $('#page');
  const ae = document.activeElement; const aid = ae && ae.id; const sel = ae && ae.selectionStart;
  if (!ST.ready && ST.status !== 'nodb') { page.innerHTML = `<div class="card empty">${ST.status === 'slow' ? esc(ST.statusNote) : (LOCAL ? 'Opening the database on this device…' : 'Loading your data from the cloud…')}</div>`; return; }
  if (ST.status === 'nodb' && LOCAL) { page.innerHTML = `<div class="card"><h2>The ERP could not open its database</h2><p>${esc(LOC().error || 'This browser blocked storage.')}</p><p>Close this window and start the ERP again with the launcher. If it keeps happening, do not use private / incognito browsing, and restore your latest backup file.</p></div>`; return; }
  if (ST.status === 'nodb') { page.innerHTML = `<div class="card"><h2>Cloud database not available here</h2><p>${esc(ST.statusNote)}</p><p class="mute">No sample or temporary data is shown. Nothing can be entered until the cloud database connects.</p></div>`; return; }
  Object.keys(CH).forEach((k) => delete CH[k]);
  /* keep what the owner is typing on this screen when it is re-drawn (e.g. records arriving from another device) */
  const typed = {}; page.querySelectorAll('input:not([type=file]),select,textarea').forEach((el) => { const k = el.id ? '#' + el.id : el.dataset.s ? 's:' + el.dataset.s : ''; if (!k) return; const dirty = el.type === 'checkbox' ? el.checked !== el.defaultChecked : el.tagName === 'SELECT' ? [...el.options].some((o) => o.selected !== o.defaultSelected) : el.value !== el.defaultValue; if (dirty) typed[k] = el.type === 'checkbox' ? el.checked : el.value; });
  try { page.innerHTML = (ST.role === 'viewer' ? '<div class="note">View-only access: you can see everything but not change it.</div>' : '') + localBanners() + PAGES[route](); }
  catch (e) { console.error(e); page.innerHTML = `<div class="card note bad">This screen hit an error: ${esc(e.message)}</div>`; }
  page.querySelectorAll('.fig').forEach((f) => { ro.observe(f); drawChart(f); });
  Object.entries(typed).forEach(([k, v]) => { const el = k[0] === '#' ? page.querySelector(k) : page.querySelector(`[data-s="${CSS.escape(k.slice(2))}"]`); if (el) { if (el.type === 'checkbox') el.checked = v; else el.value = v; } });
  if (aid) { const e = document.getElementById(aid); if (e && e !== document.body) { e.focus(); try { if (sel != null) e.setSelectionRange(sel, sel); } catch (x) {} } }
}
ST.onChange(() => render());
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (PAGES[h]) { route = h; $('.more') && $('.more').remove(); render(); scrollTo(0, 0); } });

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'rng') { R.mode = t.value; if (R.mode === 'custom' && !R.from) { R.from = ST.today().slice(0, 8) + '01'; R.to = ST.today(); } ST.ls.set('ce.ui', R); mv = -1; render(); return; }
  if (t.id === 'rf' || t.id === 'rt') { R[t.id === 'rf' ? 'from' : 'to'] = t.value; ST.ls.set('ce.ui', R); render(); return; }
  if (t.dataset.f && t.dataset.key && t.tagName === 'SELECT') { (PF[t.dataset.key] = PF[t.dataset.key] || {})[t.dataset.f] = t.value; render(); return; }
  if (t.dataset.f && t.type === 'checkbox') { (PF[t.dataset.key] = PF[t.dataset.key] || {})[t.dataset.f] = t.checked; render(); return; }
  if (t.dataset.act === 'restorefile') { const f = t.files[0]; t.value = ''; if (f) restoreFromFile(f); }
});
let qT;
document.addEventListener('input', (e) => { const t = e.target; if (t.id === 'gsq') { gsearch(t.value); return; } if (t.dataset.f === 'q' && t.dataset.key) { (PF[t.dataset.key] = PF[t.dataset.key] || {}).q = t.value; clearTimeout(qT); qT = setTimeout(render, 180); } });
document.addEventListener('click', async (e) => {
  const g = e.target.closest('[data-gs]'); if (g) { const k = g.dataset.gs; (PF[k] = PF[k] || {}).q = g.dataset.q; $('#gsr').hidden = true; $('#gsq').value = ''; if (route === k) render(); return; }
  if (!e.target.closest('.gs')) { const r0 = $('#gsr'); if (r0) r0.hidden = true; }
  if (!e.target.closest('#bell') && !e.target.closest('.pop')) document.querySelectorAll('.pop').forEach((x) => x.remove());
  const b = e.target.closest('[data-act]'); if (!b || b.closest('#formModal')) return;
  const a = b.dataset.act, c = b.dataset.c, id = b.dataset.id;
  if (a === 'more' || a === 'plus') { e.preventDefault(); const m = document.createElement('div'); m.className = 'more';
    m.innerHTML = a === 'more' ? `<div class="sheet"><h3>CHIRAG ENTERPRISES · Menu</h3>${NAV.map(([k, t]) => `<a href="#${k}" class="${k === route ? 'on' : ''}">${ic(k)}${esc(t)}</a>`).join('')}</div>` : `<div class="sheet"><h3>New entry</h3>${canW() ? [['purchases', 'purchase', 'Wood Purchase'], ['unloading', 'unloading', 'Labour'], ['production', 'production', 'Production'], ['sales', 'sales', 'Sale / Invoice'], ['mistri', 'mistri', 'Mistri Payment'], ['expenses', 'machine', 'Machine Expense', 'repair'], ['expenses', 'electricity', 'Electricity', 'electricity'], ['payments', 'payments', 'Payment / Receipt'], ['payments', 'accounts', 'Cash ⇄ Bank', 'transfer'], ['expenses', 'expense', 'Other Expense', 'other']].map(([c, i, t, ty]) => `<button data-act="new" data-c="${c}"${ty ? ` data-type="${ty}"` : ''}>${ic(i)}${t}</button>`).join('') : '<p class="full mute">View-only access.</p>'}</div>`;
    m.addEventListener('click', (ev) => { if (ev.target === m || ev.target.closest('a,button')) m.remove(); }); document.body.append(m); return; }
  if (a === 'bell') { const host = b.parentElement; const old = host.querySelector('.pop'); if (old) { old.remove(); return; } const al = alerts(); const pp = document.createElement('div'); pp.className = 'pop'; pp.innerHTML = al.length ? al.map(([h, t]) => `<a href="#${h}">${esc(t)}</a>`).join('') : '<div class="mute" style="padding:8px">No alerts. Stock and payments look fine.</div>'; host.append(pp); pp.addEventListener('click', () => pp.remove()); return; }
  if (a === 'help') { dialog({ title: 'How to use the ERP', cancel: '', ok: 'Got it', body: '<ol style="padding-left:18px;line-height:1.7"><li><b>Wood Purchase</b> — enter KG, rate, GST. A Lot ID is made automatically.</li><li><b>Labour &amp; Processing</b> — unloading, nail removal, sorting, production labour; any amount, linked to the lot or batch.</li><li><b>Production</b> — input KG, door sizes in inches (sq ft is automatic), firewood, bhushi, jabra.</li><li><b>Mistri</b> — per-door making charges for the batch.</li><li><b>Sales</b> — FLASH DOOR, raw scrap wood and by-products; PDF invoice. Goods back? Use <b>Return</b> (credit note).</li><li><b>Cash &amp; Bank</b> — balances from every payment and receipt.</li><li><b>Expenses</b> — repair, blades, electricity, nails; link to a lot/batch or leave shared.</li><li><b>Profit &amp; Loss</b> — full costing per batch and lot.</li></ol><p class="mute">Use the search bar for any Lot ID, invoice or party. The bell shows low stock, negative stock and unpaid invoices.</p>' }); return; }
  if (a === 'new') { const sp = SPEC[c]; openForm(sp, null); if (b.dataset.type) { if (c === 'payments') FORM.r.direction = b.dataset.type; else FORM.r.type = b.dataset.type; drawForm(); } return; }
  if (a === 'edit') { const r = ST.get(c, id); if (!r) return; if (MONEY_COLLS.includes(c) && locked(r) && !isAdmin()) { dialog({ title: 'Books are closed', body: `<p>Entries dated on or before ${esc(dd(S().lockDate))} can only be changed by an admin.</p>`, cancel: '' }); return; } openForm(c === 'sales' && r.kind === 'return' ? SPEC.returns : SPEC[c], r); return; }
  if (a === 'return') return openReturn(id);
  if (a === 'refund') { const s = model().saleRows.find((x) => x.rec.id === id); openForm(SPEC.payments, null); Object.assign(FORM.r, { direction: 'out', party: s.rec.customer, refId: id, amount: CE.r2(Math.max(0, -s.outstanding)) }); drawForm(); return; }
  if (a === 'approve' || a === 'reject') { const r = ST.get('expenses', id); if (!r || !isAdmin()) return; const why = a === 'reject' ? await dialog({ title: 'Reject this expense?', body: `<p>${esc(label('expenses', r))}</p><p class="mute">${(() => { const x = model().expRows.find((y) => y.rec.id === id); return x && x.paid > 0.005 ? `It was already paid (${inr(x.paid)}). Rejecting does not bring the money back: it is shown as <b>money to recover</b> from ${esc(r.vendor || 'the person paid')}. When it is returned, record a <b>Receipt</b> against this expense.` : 'Nothing was paid, so no money moves.'; })()}</p>`, ok: 'Reject', danger: true, input: true, inputLabel: 'Reason (required)', check: (v) => v.trim().length > 2 }) : await dialog({ title: 'Approve this expense?', body: `<p>${esc(label('expenses', r))} · ${esc(r.nature === 'personal' ? 'personal (drawings)' : 'business')}</p><p class="mute">It will count in costs and profit from now on. ${(() => { const x = model().expRows.find((y) => y.rec.id === id); return x && x.paid > 0.005 ? `It was already paid (${inr(x.paid)}) — approving does <b>not</b> take money out again.` : 'It has not been paid yet — approving does not move money. Pay it from Payments.'; })()}</p>`, ok: 'Approve' }); if (!why) return; try { await ST.save('expenses', { ...r, status: a === 'approve' ? 'approved' : 'rejected', approvedBy: ST.me.id, approvedAt: new Date().toISOString(), ...(a === 'reject' ? { rejectReason: why } : {}) }, r, a === 'approve' ? 'approved' : 'rejected: ' + why); toast(a === 'approve' ? 'Expense approved' : 'Expense rejected'); } catch (x) { toast(x.message); } return; }
  if (a === 'del') return doDelete(c, id);
  if (a === 'restore') return doRestore(c, id);
  if (a === 'purge') return doPurge(c, id);
  if (a === 'pdf') { const r = ST.get('sales', id); if (r) pdfFor(r); return; }
  if (a === 'receive') { const s = model().saleRows.find((x) => x.rec.id === id); openForm(SPEC.payments, null); Object.assign(FORM.r, { direction: 'in', party: s.rec.customer, refId: id, amount: CE.r2(Math.max(0, s.outstanding)) }); drawForm(); return; }
  if (a === 'csv' || a === 'xlsx') { const x = EXP[b.dataset.k]; const rows = exportRows(x.cols, x.rows); const nm = `${x.title} ${rng().label}`.replace(/[^\w\- ]+/g, ''); if (a === 'csv') saveFile(nm + '.csv', EX.csv(rows)); else saveFile(nm + '.xlsx', EX.xlsx([{ name: x.title, rows }])); return; }
  if (a === 'workbook') return workbook();
  if (a === 'att') { const d = await ST.getAttachment(id); if (!d) return toast('Attachment not found'); if (d.type.startsWith('image/')) dialog({ title: d.name || 'Receipt', body: `<img src="${d.data}" alt="Receipt" style="max-width:100%;border-radius:8px">`, cancel: '' }); else { const bin = atob(d.data.split(',')[1]); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); saveFile(d.name || 'receipt.pdf', u); } return; }
  if (a === 'ledger') return ledger(b.dataset.k);
  if (a === 'savesettings') return saveSettingsUI();
  if (a === 'backupfile') return downloadBackup(b);
  if (a === 'snapnow') { b.disabled = true; try { const r = await ST.snapshot(); toast(`${LOCAL ? 'Automatic backup' : 'Snapshot'} saved: ${r.day}, ${qf(r.bytes / 1024, 0)} KB`); } catch (x) { toast('Snapshot failed: ' + x.message); } b.disabled = false; return; }
  if (a === 'listsnaps') { const box = $('#snaps'); box.textContent = 'Loading…'; try { const l = await ST.snapshots(); box.innerHTML = l.length ? table([{ t: 'Day', v: (s) => dd(s.day) }, { t: 'Taken', v: (s) => esc(String(s.at).replace('T', ' ').slice(0, 16)) }, { t: 'Size', n: 1, v: (s) => qf(s.size / 1024, 0) + ' KB' }, { t: 'Complete', v: (s) => (s.have === s.parts ? '<span class="tag g">yes</span>' : '<span class="tag r">no</span>') }], l, { acts: (s) => `<button class="btn s" data-act="snapdl" data-id="${s.day}">Download</button>${isAdmin() ? ` <button class="btn s d" data-act="snaprestore" data-id="${s.day}">Restore</button>` : ''}` }) : `<p class="mute">${LOCAL ? 'No automatic backups yet.' : 'No cloud snapshots yet.'}</p>`; } catch (x) { box.textContent = 'Could not load: ' + x.message; } return; }
  if (a === 'snapdl') { const o = await ST.loadSnapshot(id); return saveFile(`Chirag ERP snapshot ${id}.json`, JSON.stringify(o, null, 1)); }
  if (a === 'snaprestore') { const o = await ST.loadSnapshot(id); return confirmRestore(o); }
  if (a === 'audit') return showAudit();
  if (a === 'clearconf') { ST.clearConflicts(); return; }
});
async function saveSettingsUI() {
  const s = JSON.parse(JSON.stringify(S()));
  document.querySelectorAll('[data-s]').forEach((el) => { let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value; if (el.dataset.s === 'payModes' || el.dataset.s === 'materials') v = String(v).split(',').map((x) => x.trim()).filter(Boolean); setPath(s, el.dataset.s, v); });
  const used = new Set(); s.accounts = (s.accounts || []).filter((a) => String(a.name || '').trim()).map((a) => { let id = a.id || String(a.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'acct'; while (used.has(id)) id += '2'; used.add(id); return { id, name: String(a.name).trim(), type: a.type === 'cash' ? 'cash' : 'bank', opening: CE.r2(num(a.opening)) }; });
  if (!s.accounts.length) return toast('Keep at least one cash or bank account');
  if (!s.materials.length) return toast('Enter at least one material type');
  if (!(s.fyStart >= 1 && s.fyStart <= 12)) return toast('Financial year month must be 1–12');
  s.company.gstin = String(s.company.gstin || '').trim().toUpperCase();
  if (s.company.gstin) { const g = CE.gstinCheck(s.company.gstin); if (!g.ok) return dialog({ title: 'GSTIN not saved', body: `<p>${esc(g.msg)}</p>`, cancel: '' }); s.company.stateCode = g.stateCode; s.company.state = g.state; }
  else if (s.company.regType === 'Regular') return dialog({ title: 'GSTIN needed', body: '<p>A Regular GST registration needs the GSTIN. Enter it, or set Registration type to Unregistered.</p>', cancel: '' });
  else { s.company.stateCode = ''; s.company.state = ''; }
  if (!String(s.company.name || '').trim()) return toast('Trade name is required');
  try { await ST.saveSettings(s); toast('Settings saved'); } catch (e) { toast(e.message); }
}
async function downloadBackup(b) {
  if (b) b.disabled = true;
  try {
    const o = await ST.fullBackup();
    const t = new Date(); const pad = (x) => String(x).padStart(2, '0');
    const name = `Chirag ERP backup ${ST.today()} ${pad(t.getHours())}${pad(t.getMinutes())}${o.device ? ' ' + o.device : ''}.json`;
    const ok = await saveFile(name, JSON.stringify(o, null, 1));
    if (ok) { ST.ls.set('ce.lastBackupFile', { at: new Date().toISOString(), name, records: ST.COLLS.reduce((x, c) => x + (o.data[c] || []).length, 0), checksum: o.checksum }); render(); }
  } catch (e) { toast('Backup failed: ' + (e.message || e)); }
  if (b) b.disabled = false;
}
async function restoreFromFile(f) { try { const o = JSON.parse(await f.text()); confirmRestore(o); } catch (e) { toast('Not a valid backup file'); } }
async function confirmRestore(o) {
  if (!o || o.app !== 'chirag-erp') return toast('This is not a Chirag ERP backup.');
  const chk = ST.verifyBackup(o);
  if (!chk.ok) { await dialog({ title: 'This backup file cannot be restored', body: `<p class="note bad">The file failed the safety check, so nothing was changed.</p><ul>${chk.problems.slice(0, 8).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p>Try an older backup file.</p>`, cancel: '' }); return; }
  const n = ST.COLLS.map((c) => `${c}: ${(o.data[c] || []).length}`).join(', ');
  const prev = await ST.restoredBefore(o);
  const dup = prev.length ? `<p class="note bad"><b>This same backup was already restored on ${esc(new Date(prev[prev.length - 1].at).toLocaleString('en-IN'))}.</b> Restoring it again will undo any changes made to those records since then. No duplicate entries are created.</p>` : '';
  const ok = await dialog({ title: 'Restore this backup?', body: `${dup}<p>Backup taken <b>${esc(LOCAL ? new Date(o.createdAt).toLocaleString('en-IN') : String(o.createdAt).replace('T', ' ').slice(0, 16))}</b>${o.device ? ` on device <b>${esc(o.device)}</b>` : ''}.</p><p class="mute" style="font-size:13px">${esc(n)}${chk.attachments ? ` · bill photos: ${chk.attachments}` : ''}</p><p class="mute" style="font-size:13px">Integrity check: ${chk.checksumOk === true ? '✓ checksum OK' : 'older backup format without checksum — structure checked'} · ${chk.records} records</p><p>Every record in the backup is written back as it was (including its deleted/active state). Records created after the backup are kept. Download a backup of the current data first if unsure.</p>`, ok: 'Restore', danger: true, input: true, inputLabel: 'Type RESTORE to confirm', check: (v) => v === 'RESTORE' });
  if (!ok) return;
  toast('Restoring…'); try { const k = await ST.restoreBackup(o, (i, t) => { if (i % 25 === 0) toast(`Restoring ${i}/${t}…`); }); toast(`Restored ${k} records`); if (LOCAL) await dialog({ title: 'Restore finished', body: `<p>${k} records were restored from the backup taken ${esc(LOCAL ? new Date(o.createdAt).toLocaleString('en-IN') : String(o.createdAt).replace('T', ' ').slice(0, 16))}.</p><p>Check the Dashboard, Godown &amp; Stock and Parties totals now.</p>`, cancel: '' }); } catch (e) { toast('Restore failed: ' + e.message); }
}
async function showAudit() {
  const box = $('#auditBox'); box.textContent = 'Loading…';
  try {
    const days = await ST.auditLog(30); const es = days.flatMap((d) => d.entries || []).sort((a, b) => String(b.at).localeCompare(a.at)).slice(0, 400);
    const n = await ST.names(es.map((e) => e.by));
    box.innerHTML = table([{ t: 'When', v: (e) => esc(new Date(e.at).toLocaleString('en-IN')) }, { t: 'Who', v: (e) => esc(n[e.by] || 'Someone') }, { t: 'Action', v: (e) => `<span class="tag ${e.action === 'delete' || e.action === 'purge' ? 'r' : e.action === 'create' ? 'g' : ''}">${esc(e.action)}</span>` }, { t: 'Record', v: (e) => esc(`${e.coll} · ${e.id}`) }, { t: 'Changes', v: (e) => (e.changes ? Object.entries(e.changes).slice(0, 8).map(([k, [a, b]]) => `${esc(k)}: ${esc(JSON.stringify(a))} → ${esc(JSON.stringify(b))}`).join('<br>') : esc(e.note || '')) }], es, { empty: 'No audit entries yet.' });
  } catch (e) { box.textContent = 'Could not load audit log: ' + e.message; }
}
function ledger(name) {
  const m = model(), k = CE.pkey(name); const ent = [];
  act('parties').filter((x) => CE.pkey(x.name) === k && num(x.opening)).forEach((x) => ent.push({ d: x.openingDate || '0000-00-00', t: 'Opening balance', dr: x.openingSide === 'payable' ? 0 : num(x.opening), cr: x.openingSide === 'payable' ? num(x.opening) : 0 }));
  m.saleRows.filter((s) => CE.pkey(s.rec.customer) === k).forEach((s) => { if (s.ret) { ent.push({ d: s.rec.date, t: `Credit note ${s.rec.invoiceNo} (return)`, dr: 0, cr: -s.total }); if (num(s.rec.received)) ent.push({ d: s.rec.payDate || s.rec.date, t: `Refund paid ${s.rec.invoiceNo}`, dr: num(s.rec.received), cr: 0 }); return; } ent.push({ d: s.rec.date, t: `Invoice ${s.rec.invoiceNo}`, dr: s.total, cr: 0 }); if (num(s.rec.received)) ent.push({ d: s.rec.payDate || s.rec.date, t: `Received with ${s.rec.invoiceNo}`, dr: 0, cr: num(s.rec.received) }); });
  m.purchRows.filter((L) => CE.pkey(L.rec.supplier) === k).forEach((L) => { ent.push({ d: L.rec.date, t: `Purchase lot ${L.id}`, dr: 0, cr: L.total }); if (num(L.rec.paid)) ent.push({ d: L.rec.date, t: `Paid with lot ${L.id}`, dr: num(L.rec.paid), cr: 0 }); });
  act('unloading').filter((u) => CE.pkey(u.team) === k).forEach((u) => { ent.push({ d: u.date, t: `Unloading lot ${u.lotId}`, dr: 0, cr: num(u.amount) }); if (num(u.paid)) ent.push({ d: u.date, t: 'Paid', dr: num(u.paid), cr: 0 }); });
  act('mistri').filter((x) => CE.pkey(x.mistri) === k).forEach((x) => { ent.push({ d: x.date, t: `Making ${x.pcs} doors ${x.batchId || ''}`, dr: 0, cr: CE.mistriTotal(x) }); if (num(x.advance) + num(x.paid)) ent.push({ d: x.date, t: 'Advance + paid', dr: num(x.advance) + num(x.paid), cr: 0 }); });
  const expMap = new Map(m.expRows.map((x) => [x.rec.id, x]));
  m.expRows.filter((x) => CE.pkey(x.rec.vendor || 'Expense vendor (not named)') === k).forEach((x) => { const e = x.rec; if (x.status === 'approved') { ent.push({ d: e.date, t: `Expense bill ${CE.expLabel(e)}${e.refNo ? ' · ' + e.refNo : ''}`, dr: 0, cr: x.total }); if (x.paidAtEntry) ent.push({ d: e.payDate || e.date, t: `Paid with expense${e.payMode ? ' · ' + e.payMode : ''}`, dr: x.total, cr: 0 }); } else if (x.status === 'rejected' && x.paidAtEntry) ent.push({ d: e.payDate || e.date, t: `Paid for rejected expense ${CE.expLabel(e)} — to recover`, dr: x.total, cr: 0 }); });
  act('payments').filter((p) => p.direction !== 'transfer' && CE.pkey(p.party) === k && !(expMap.has(p.refId) && expMap.get(p.refId).status === 'pending')).forEach((p) => { const o = p.direction === 'out'; ent.push({ d: p.date, t: (o ? 'Payment made' : 'Receipt') + (p.mode ? ' · ' + p.mode : ''), dr: o ? num(p.amount) : 0, cr: o ? 0 : num(p.amount) }); if (num(p.tds)) ent.push({ d: p.date, t: o ? 'TDS deducted by us' : 'TDS deducted by customer', dr: o ? num(p.tds) : 0, cr: o ? 0 : num(p.tds) }); });
  ent.sort((a, b) => String(a.d).localeCompare(b.d)); let bal = 0; ent.forEach((e) => { bal = CE.addM(bal, e.dr, -e.cr); e.bal = bal; });
  const cols = [{ t: 'Date', v: (e) => (e.d === '0000-00-00' ? 'Opening' : dd(e.d)), x: (e) => e.d }, { t: 'Particulars', v: (e) => esc(e.t) }, { t: 'Debit', n: 1, v: (e) => (e.dr ? inr(e.dr) : ''), x: (e) => e.dr, sum: (e) => e.dr }, { t: 'Credit', n: 1, v: (e) => (e.cr ? inr(e.cr) : ''), x: (e) => e.cr, sum: (e) => e.cr }, { t: 'Balance', n: 1, v: (e) => `${inr(Math.abs(e.bal))} ${e.bal >= 0 ? 'Dr' : 'Cr'}`, x: (e) => CE.r2(e.bal) }];
  EXP.ledger = { title: 'Ledger ' + name, cols, rows: ent };
  dialog({ title: 'Ledger — ' + name, body: `<p class="mute" style="font-size:13px">Dr = they owe us · Cr = we owe them</p>${table(cols, ent, { empty: 'No entries.' })}<div class="row" style="margin-top:10px"><button class="btn s" data-act="csv" data-k="ledger">CSV</button><button class="btn s" data-act="xlsx" data-k="ledger">Excel</button></div>`, cancel: '', ok: 'Close' });
}
function workbook() {
  const m = model(); const r = rng(); const f = (d) => inR(d);
  const sheets = [
    { name: 'Purchases', rows: [['Date', 'Lot ID', 'Supplier', 'DO/Inv', 'Material', 'Vehicle', 'Driver', 'Billed KG', 'Received KG', 'Rate/KG', 'Material value', 'GST %', 'GST', 'Loading', 'Lifting', 'Transport', 'Other', 'Total landed', 'Paid', 'Outstanding', 'Mode', 'Notes'], ...m.purchRows.filter((L) => f(L.rec.date)).map((L) => [L.rec.date, L.id, L.rec.supplier, L.rec.doNo, L.material, L.rec.vehicle, L.rec.driver, L.billedKg, L.receivedKg, num(L.rec.rate), L.value, CE.gstPct(L.rec), L.gst, num(L.rec.loading), num(L.rec.lifting), num(L.rec.transport), num(L.rec.other), L.total, L.paidTotal, L.outstanding, L.rec.payMode, L.rec.notes])] },
    { name: 'Labour', rows: [['Date', 'Type', 'Lot', 'Batch', 'Vehicle', 'Team', 'KG', 'Wages earned', 'Paid', 'Balance', 'Mode'], ...act('unloading').filter((u) => f(u.date)).map((u) => [u.date, CE.LABOUR[u.labourType] || CE.LABOUR.unloading, u.lotId, u.batchId, u.vehicle, u.team, num(u.kg), num(u.amount), num(u.paid), num(u.amount) - num(u.paid), u.payMode])] },
    { name: 'Production', rows: [['Date', 'Batch', 'Lot', 'Input KG', 'Doors', 'Door sq ft', 'Firewood KG', 'Bhushi KG', 'Jabra sq ft', 'Unaccounted KG', 'Batch cost', 'Door cost/sq ft', 'Firewood cost/kg', 'Bhushi cost/kg', 'Jabra cost/sq ft', 'Allocation'], ...Object.values(m.batches).filter((b) => f(b.date)).map((b) => [b.date, b.id, b.lotId, b.pc.inputKg, b.pc.doorPcs, CE.r4(b.pc.doorSqft), b.pc.out.firewood, b.pc.out.bhushi, b.pc.out.jabra, b.pc.unaccountedKg, CE.r2(b.total), CE.r2(b.unit.door), CE.r2(b.unit.firewood), CE.r2(b.unit.bhushi), CE.r2(b.unit.jabra), b.alloc.method])] },
    { name: 'Door sizes', rows: [['Batch', 'Width in', 'Height in', 'Sq ft each', 'Pieces', 'Sq ft', 'Cost per door'], ...Object.values(m.batches).filter((b) => f(b.date)).flatMap((b) => b.perDoor.map((d) => [b.id, +d.key.split('x')[0], +d.key.split('x')[1], CE.r4(d.sqft), d.pcs, CE.r4(d.sqft * d.pcs), CE.r2(d.cost)]))] },
    { name: 'Sales lines', rows: [['Date', 'Invoice', 'Customer', 'Product', 'HSN', 'Lot', 'Width', 'Height', 'Doors', 'Qty', 'Unit', 'Rate', 'Taxable', 'GST %', 'Cost'], ...m.saleRows.filter((s) => f(s.rec.date)).flatMap((s) => s.lines.map((l) => [s.rec.date, s.rec.invoiceNo, s.rec.customer, CE.LABEL[l.cat], l.hsn || '', l.lotId, l.cat === 'door' ? num(l.w) : '', l.cat === 'door' ? num(l.h) : '', l.cat === 'door' ? l.pcs : '', CE.r4(l.qty), CE.UNIT[l.cat], num(l.rate), l.amount, l.mode === 'nongst' ? 'Non-GST' : l.pct, CE.r2(l.cogs)]))] },
    { name: 'Invoices', rows: [['Date', 'Type', 'Invoice', 'Customer', 'Customer GSTIN', 'Place of supply', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total GST', 'Total', 'Received', 'Outstanding'], ...m.saleRows.filter((s) => f(s.rec.date)).map((s) => [s.rec.date, s.ret ? 'Credit note' : 'Invoice', s.rec.invoiceNo, s.rec.customer, s.rec.customerGstin || '', s.rec.placeOfSupply || '', s.taxable, s.cgst, s.sgst, s.igst, s.gst, s.total, s.received, s.outstanding])] },
    { name: 'Mistri', rows: [['Date', 'Mistri', 'Lot', 'Batch', 'Size', 'Doors', 'Rate', 'Total', 'Advance', 'Paid', 'Balance'], ...act('mistri').filter((x) => f(x.date)).map((x) => [x.date, x.mistri, x.lotId, x.batchId, x.size, num(x.pcs), num(x.rate), CE.mistriTotal(x), num(x.advance), num(x.paid), CE.mistriTotal(x) - num(x.advance) - num(x.paid)])] },
    { name: 'Expenses', rows: [['Date', 'Type', 'Details', 'Business/personal', 'Status', 'Ref no.', 'Lot', 'Batch', 'Amount', 'GST', 'Mode'], ...act('expenses').filter((x) => f(x.date)).map((x) => [x.date, x.type, CE.expLabel(x), x.nature === 'personal' ? 'Personal' : 'Business', x.status || 'approved', x.refNo || '', x.lotId, x.batchId, CE.expenseAmount(x), num(x.gstAmt), x.payMode])] },
    { name: 'Payments', rows: [['Date', 'Direction', 'Party', 'Against', 'Amount', 'TDS', 'Mode', 'Account', 'Notes'], ...act('payments').filter((x) => f(x.date)).map((x) => [x.date, x.direction === 'out' ? 'Paid' : x.direction === 'transfer' ? `Transfer ${acctName(x.fromAccount)} → ${acctName(x.toAccount)}` : 'Received', x.party, x.refId || 'On account', num(x.amount), num(x.tds), x.mode, acctName(x.account), x.notes])] },
    { name: 'Cash book', rows: [['Date', 'Account', 'Particulars', 'Party', 'Mode', 'In', 'Out'], ...m.cash.moves.filter((x) => f(x.date)).map((x) => [x.date, acctName(x.acct), x.ref, x.party || '', x.mode, x.dir === 'in' ? x.amt : 0, x.dir === 'out' ? x.amt : 0])] },
    { name: 'Stock', rows: [['Product', 'Lot', 'In', 'Out', 'Adjusted', 'Remaining', 'Unit', 'Unit cost', 'Value'], ...m.stockRows.map((s) => [CE.LABEL[s.k], s.lot, s.in, s.out, s.adj, CE.r4(s.qty), CE.UNIT[s.k], CE.r2(s.unitCost), CE.r2(s.value)])] },
    { name: 'Parties', rows: [['Name', 'Roles', 'Sales', 'Purchases', 'Receivable', 'Payable'], ...Object.values(m.parties).map((p) => [p.name, [...p.roles].join(', '), CE.r2(p.sales), CE.r2(p.purchases), CE.r2(p.receivable), CE.r2(p.payable)])] },
  ];
  saveFile(`Chirag ERP ${r.label}.xlsx`.replace(/[^\w\- .]+/g, ''), EX.xlsx(sheets));
}

/* boot */
shell(); render();
const use = (n) => (window.claude && window.claude.use ? window.claude.use(n) : Promise.resolve(null));
const boot = () => ST.init(use).then(() => { let n = 0; const w = setInterval(() => { n++; if (ST.ready || n > 30) { clearInterval(w); if (ST.ready) ST.autoSnapshot().then((r) => { if (r) toast(`Daily ${LOCAL ? 'automatic backup' : 'cloud snapshot'} saved (${r.day})`); }); } }, 2000); });
/* the few helpers the Google Drive screens (erp/sync-ui.js) use */
window.ERPUI = { $, esc, dialog, toast, render: () => render(), saveFile, confirmRestore, downloadBackup, LOC, lastBackupFile, alerts, get route() { return route; } };
if (window.claude && window.claude.use) boot();
else { let tries = 0; const t = setInterval(() => { tries++; if ((window.claude && window.claude.use) || tries > 20) { clearInterval(t); boot(); } }, 250); }
}
