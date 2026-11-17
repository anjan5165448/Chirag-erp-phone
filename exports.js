/* File writers with no external libraries: CSV, XLSX (zip, stored), A4 PDF invoice. */
(function (G) {
  'use strict';
  const enc = new TextEncoder();

  function csv(rows) {
    const q = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n');
  }

  /* ---- zip (store) ---- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const parts = [], central = []; let off = 0;
    files.forEach(({ name, data }) => {
      const nb = enc.encode(name), db = typeof data === 'string' ? enc.encode(data) : data, c = crc32(db);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint32(14, c, true); h.setUint32(18, db.length, true); h.setUint32(22, db.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, db);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint32(16, c, true); ch.setUint32(20, db.length, true); ch.setUint32(24, db.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), nb);
      off += 30 + nb.length + db.length;
    });
    const csize = central.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)]);
  }

  const x = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const col = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  /* sheets: [{name, rows:[[...]]}] first row bold header */
  function xlsx(sheets) {
    const files = [];
    const ws = sheets.map((sh, si) => {
      const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => {
        const ref = col(ci) + (ri + 1); const st = ri === 0 ? ' s="1"' : '';
        if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
        return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${x(v)}</t></is></c>`;
      }).join('') + '</row>').join('');
      const widths = (sh.rows[0] || []).map((_, ci) => { const w = Math.min(48, Math.max(8, ...sh.rows.slice(0, 200).map((r) => String(r[ci] == null ? '' : r[ci]).length + 2))); return `<col min="${ci + 1}" max="${ci + 1}" width="${w}" customWidth="1"/>`; }).join('');
      return { name: `xl/worksheets/sheet${si + 1}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${widths ? `<cols>${widths}</cols>` : ''}<sheetData>${rows}</sheetData></worksheet>` };
    });
    const names = sheets.map((s, i) => x(String(s.name).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Sheet${i + 1}`));
    files.push({ name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` });
    files.push({ name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` });
    files.push({ name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` });
    files.push({ name: 'xl/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>` });
    ws.forEach((w) => files.push(w));
    return zip(files);
  }

  /* ---- minimal PDF (Helvetica, WinAnsi) ---- */
  const W_HELV = { ' ': 278, '.': 278, ',': 278, '-': 333, '/': 278, '(': 333, ')': 333, ':': 278, '%': 889, 'R': 722, 's': 500, 'x': 500, '"': 355, 'I': 278, 'i': 222, 'l': 222, 'j': 222, 'f': 278, 't': 278, 'r': 333, 'm': 833, 'w': 722, 'M': 833, 'W': 944 };
  const tw = (s, size, bold) => [...String(s)].reduce((a, c) => a + (W_HELV[c] || (/[A-Z]/.test(c) ? 667 : 556)), 0) * size / 1000 * (bold ? 1.05 : 1);
  const pesc = (s) => String(s == null ? '' : s).replace(/₹/g, 'Rs.').replace(/[\u2013\u2014\u2212]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u00d7/g, 'x').replace(/[^\x20-\x7e]/g, '').replace(/([\\()])/g, '\\$1');
  function Pdf() {
    const pages = []; let cur = null;
    const api = {
      page() { cur = []; pages.push(cur); return api; },
      text(t, x0, y, o = {}) { const sz = o.size || 10; let xx = x0; const s = pesc(t); if (o.align === 'right') xx = x0 - tw(s, sz, o.bold); if (o.align === 'center') xx = x0 - tw(s, sz, o.bold) / 2; cur.push(`BT /${o.italic ? 'F3' : o.bold ? 'F2' : 'F1'} ${sz} Tf ${o.color || '0 0 0'} rg ${xx.toFixed(2)} ${(842 - y).toFixed(2)} Td (${s}) Tj ET`); return api; },
      line(x1, y1, x2, y2, w = 0.6, c = '0 0 0') { cur.push(`${c} RG ${w} w ${x1} ${842 - y1} m ${x2} ${842 - y2} l S`); return api; },
      poly(pts, w, c) { cur.push(`${c} RG ${w} w 1 J ` + pts.map(([x, y], i) => `${x.toFixed(2)} ${(842 - y).toFixed(2)} ${i ? 'l' : 'm'}`).join(' ') + ' S'); return api; },
      shape(pts, fill) { cur.push(`${fill} rg ` + pts.map(([x, y], i) => `${x.toFixed(2)} ${(842 - y).toFixed(2)} ${i ? 'l' : 'm'}`).join(' ') + ' h f'); return api; },
      rect(x0, y, w, h, fill) { cur.push(`${fill} rg ${x0} ${842 - y - h} ${w} ${h} re f`); return api; },
      width: tw,
      wrap(t, size, maxW) { const words = pesc(t).split(' '); const out = []; let line = ''; words.forEach((w) => { const tryL = line ? line + ' ' + w : w; if (tw(tryL, size) > maxW && line) { out.push(line); line = w; } else line = tryL; }); if (line) out.push(line); return out.map((l) => l.replace(/\\([\\()])/g, '$1')); },
      build() {
        const objs = []; const add = (s) => { objs.push(s); return objs.length; };
        const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
        const f3 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>');
        const pagesId = objs.length + 1; objs.push(null);
        const kids = [];
        pages.forEach((p) => {
          const body = p.join('\n'); const sid = add(`<< /Length ${enc.encode(body).length} >>\nstream\n${body}\nendstream`);
          kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${sid} 0 R >>`));
        });
        objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
        const cat = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
        let out = '%PDF-1.4\n'; const offs = [];
        objs.forEach((o, i) => { offs.push(enc.encode(out).length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
        const xref = enc.encode(out).length;
        out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
        out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
        return new Blob([enc.encode(out)], { type: 'application/pdf' });
      },
    };
    return api;
  }

  const inr = (n) => (Math.round((+n || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* GST invoice (A4). s = sale record, c = CE.saleCalc(s), co = seller profile (snapshot on the invoice, else settings),
     extra = {received, outstanding}. Layout follows CGST Rule 46 particulars. */
  function invoicePdf(s, c, co, extra, CE) {
    co = co || {};
    const pdf = Pdf().page(); const L = 36, R = 559, W = R - L;
    const GOLD = '0.86 0.66 0.22', CHAMP = '0.96 0.83 0.48', BLK = '0.05 0.045 0.035', GREY = '0.4 0.4 0.4', LINE = '0.8 0.78 0.74', TINT = '0.98 0.95 0.86';
    const cn = s.kind === 'return';
    const title = cn ? 'CREDIT NOTE' : !co.gstin ? 'INVOICE' : c.nonGst ? 'BILL OF SUPPLY' : 'TAX INVOICE';
    // ---- header band
    const addr = String(co.address || '').split(/\n|,\s*(?=[A-Z0-9])/).map((x) => x.trim()).filter(Boolean);
    const addrLines = []; let cur = '';
    addr.forEach((p) => { const t = cur ? cur + ', ' + p : p; if (pdf.width(t, 8) > 300 && cur) { addrLines.push(cur); cur = p; } else cur = t; }); if (cur) addrLines.push(cur);
    const bandH = 92 + Math.max(0, addrLines.length - 2) * 10;
    pdf.rect(0, 0, 595, bandH, BLK); pdf.rect(0, bandH, 595, 2.2, GOLD);
    const cx = 70, cy = 48, ex = 34, ey = 26; const ring = [];
    for (let a = -0.55; a <= 5.2; a += 0.08) ring.push([cx + ex * Math.cos(a + Math.PI / 2 + 1.2), cy - ey * Math.sin(a + Math.PI / 2 + 1.2)]);
    pdf.poly(ring, 4.5, GOLD); pdf.text('CE', cx + 2, cy + 11, { size: 30, italic: true, align: 'center', color: GOLD });
    const X = 122;
    pdf.text(co.name || 'CHIRAG ENTERPRISES', X, 32, { size: 19, bold: true, color: CHAMP });
    if (co.legalName) pdf.text(`Legal Name: ${co.legalName}${co.constitution ? ' (' + co.constitution + ')' : ''}`, X, 45, { size: 8.5, color: '0.93 0.89 0.82' });
    let hy = co.legalName ? 57 : 47;
    addrLines.forEach((t) => { pdf.text(t, X, hy, { size: 8, color: '0.85 0.8 0.72' }); hy += 10; });
    const idLine = [co.gstin && `GSTIN: ${co.gstin}`, co.state && `State: ${co.state}`, co.stateCode && `State Code: ${co.stateCode}`].filter(Boolean).join('   ');
    if (idLine) pdf.text(idLine, X, hy + 3, { size: 8.8, bold: true, color: GOLD });
    const ph = [co.phone && 'Ph: ' + co.phone, co.email].filter(Boolean).join('   '); if (ph) pdf.text(ph, X, hy + 14, { size: 8, color: '0.85 0.8 0.72' });
    pdf.text(title, R, 32, { size: 14, bold: true, align: 'right', color: GOLD });
    pdf.text('Original for Recipient', R, 45, { size: 7.5, align: 'right', color: '0.85 0.8 0.72' });
    const sec = co.section || ''; if (sec) { const sw = pdf.width(sec, 8, true) + 20; pdf.shape([[R - sw, 52], [R - 5, 52], [R, 58], [R - 5, 64], [R - sw, 64], [R - sw + 5, 58]], GOLD); pdf.text(sec, R - sw / 2 + 2, 61, { size: 8, bold: true, align: 'center', color: '0.1 0.07 0.02' }); }
    // ---- invoice details + bill to
    let y = bandH + 18;
    const box = (x, w, h) => { pdf.line(x, y - 11, x + w, y - 11, 0.5, LINE); pdf.line(x, y - 11 + h, x + w, y - 11 + h, 0.5, LINE); pdf.line(x, y - 11, x, y - 11 + h, 0.5, LINE); pdf.line(x + w, y - 11, x + w, y - 11 + h, 0.5, LINE); };
    const pos = s.placeOfSupply && CE.STATES[s.placeOfSupply] ? `${CE.STATES[s.placeOfSupply]} (${s.placeOfSupply})` : (co.state ? `${co.state} (${co.stateCode || ''})` : '-');
    const det = [[cn ? 'Credit Note No.' : 'Invoice No.', s.invoiceNo], [cn ? 'Date' : 'Invoice Date', fmtD(s.date)], ...(cn ? [['Against Invoice', s.refInvoiceNo], ['Reason', s.reason]] : []), ['Place of Supply', pos], ['Reverse Charge', s.reverseCharge === 'Y' ? 'Yes' : 'No'], ['Vehicle No.', s.vehicle], ['E-way Bill No.', s.ewayBill], ['Order / Ref.', s.poRef], ['Payment', s.payMode]].filter(([, v]) => v);
    const nameLines = pdf.wrap(s.customer || '', 10.5, 225); const cust = [...nameLines, ...(String(s.customerAddress || '').split('\n').flatMap((t) => pdf.wrap(t, 8.5, 230)))];
    const cg = CE.gstinCheck(s.customerGstin || '');
    const custState = cg.ok ? `${cg.state} (${cg.stateCode})` : (s.placeOfSupply && CE.STATES[s.placeOfSupply] ? `${CE.STATES[s.placeOfSupply]} (${s.placeOfSupply})` : '');
    const h = Math.max(det.length, cust.length + 2) * 11.5 + 14;
    box(L, 255, h); box(L + 262, W - 262, h);
    pdf.text('Bill To', L + 8, y, { size: 7.5, color: GREY });
    let by = y + 12; nameLines.forEach((t) => { pdf.text(t, L + 8, by, { size: 10.5, bold: true }); by += 12; });
    cust.slice(nameLines.length).forEach((t) => { pdf.text(t, L + 8, by, { size: 8.5 }); by += 10.5; });
    if (s.customerGstin) { pdf.text(`GSTIN: ${String(s.customerGstin).toUpperCase()}`, L + 8, by, { size: 8.5, bold: true }); by += 10.5; } else { pdf.text('Unregistered (B2C)', L + 8, by, { size: 8, color: GREY }); by += 10.5; }
    if (custState) pdf.text(`State: ${custState}`, L + 8, by, { size: 8.5 });
    det.forEach(([k, v], i) => { pdf.text(k, L + 270, y + i * 11.5, { size: 8, color: GREY }); pdf.text(String(v), L + 345, y + i * 11.5, { size: 8.5, bold: k === 'Invoice No.' || k === 'Credit Note No.' }); });
    y += h + 6;
    // ---- items
    const C = { n: L + 4, d: L + 20, hsn: 270, q: 352, rate: 408, gp: 452, amt: R - 4 };
    pdf.rect(L, y, W, 18, BLK); y += 12.5;
    [['#', C.n], ['Description of Goods', C.d], ['HSN', C.hsn]].forEach(([t, x]) => pdf.text(t, x, y, { size: 8, bold: true, color: GOLD }));
    [['Qty', C.q], ['Rate', C.rate], ['GST %', C.gp], ['Taxable Value', C.amt]].forEach(([t, x]) => pdf.text(t, x, y, { size: 8, bold: true, color: GOLD, align: 'right' }));
    y += 15;
    c.lines.forEach((l, i) => {
      if (y > 640) { pdf.page(); y = 50; }
      const desc = l.cat === 'door' ? `Flash Door ${+l.w}" x ${+l.h}" (${CE.r4(l.each)} sq ft each) x ${+l.pcs} pcs` : CE.LABEL[l.cat];
      const dl = pdf.wrap(desc, 8.5, 225); dl.forEach((t, j) => pdf.text(t, C.d, y + j * 10.5, { size: 8.5 }));
      if (l.lotId) pdf.text(`Lot ${l.lotId}`, C.d, y + dl.length * 10.5, { size: 7, color: GREY });
      pdf.text(String(i + 1), C.n, y, { size: 8.5 }); pdf.text(l.hsn || '-', C.hsn, y, { size: 8.5 });
      pdf.text(`${CE.r4(l.qty)} ${CE.UNIT[l.cat] === 'KG' ? 'kg' : 'sqft'}`, C.q, y, { size: 8.5, align: 'right' });
      pdf.text(inr(l.rate), C.rate, y, { size: 8.5, align: 'right' });
      pdf.text(l.mode === 'nongst' ? 'Non-GST' : `${+l.pct}%`, C.gp, y, { size: 8.5, align: 'right' });
      pdf.text(inr(l.amount), C.amt, y, { size: 8.5, align: 'right' });
      const yEnd = y + (dl.length - 1) * 10.5 + (l.lotId ? 10 : 0) + 5; pdf.line(L, yEnd, R, yEnd, 0.3, LINE); y = yEnd + 12;
    });
    // ---- tax summary (by rate) + totals
    y += 4; if (y > 600) { pdf.page(); y = 50; }
    const inter = c.interState; const T = inter ? [['Rate', L + 4], ['Taxable', L + 120], ['IGST', L + 200], ['Total Tax', L + 270]] : [['Rate', L + 4], ['Taxable', L + 105], ['CGST', L + 165], ['SGST', L + 225], ['Total Tax', L + 290]];
    const ty0 = y; pdf.rect(L, y, 300, 15, TINT); y += 10.5;
    T.forEach(([t, x], i) => pdf.text(t, x, y, { size: 7.5, bold: true, align: i ? 'right' : undefined }));
    y += 12;
    c.groups.forEach((g) => {
      const vals = inter ? [g.nonGst ? 'Non-GST' : `IGST ${g.pct}%`, inr(g.taxable), inr(g.igst), inr(g.gst)] : [g.nonGst ? 'Non-GST' : `${g.pct}% (${g.pct / 2}+${g.pct / 2})`, inr(g.taxable), inr(g.cgst), inr(g.sgst), inr(g.gst)];
      vals.forEach((v, i) => pdf.text(v, T[i][1], y, { size: 8, align: i ? 'right' : undefined })); y += 11;
    });
    pdf.line(L, y - 6, L + 300, y - 6, 0.5, LINE);
    const totVals = inter ? ['Total', inr(c.taxable), inr(c.igst), inr(c.gst)] : ['Total', inr(c.taxable), inr(c.cgst), inr(c.sgst), inr(c.gst)];
    totVals.forEach((v, i) => pdf.text(v, T[i][1], y + 2, { size: 8, bold: true, align: i ? 'right' : undefined }));
    let ry = ty0 + 10.5;
    const tot = (label, val, bold) => { pdf.text(label, 470, ry, { size: bold ? 10.5 : 9, bold, align: 'right' }); pdf.text(inr(val), R - 4, ry, { size: bold ? 10.5 : 9, bold, align: 'right' }); ry += bold ? 17 : 13; };
    tot('Taxable Value', c.taxable);
    if (inter) tot('IGST', c.igst); else { tot('CGST', c.cgst); tot('SGST', c.sgst); }
    pdf.line(360, ry - 7, R, ry - 7, 1.2, GOLD); ry += 3; tot('Invoice Total (Rs.)', c.total, true);
    if (extra) { tot('Received', extra.received); tot('Balance Due', extra.outstanding, true); }
    y = Math.max(y + 18, ry + 4);
    pdf.text('Amount in words:', L, y, { size: 8, color: GREY }); y += 11;
    pdf.wrap(CE.amountWords(c.total), 9, W).forEach((t) => { pdf.text(t, L, y, { size: 9, bold: true }); y += 11; });
    if (c.gst > 0) { y += 2; pdf.wrap('Tax amount: ' + CE.amountWords(c.gst), 8, W).forEach((t) => { pdf.text(t, L, y, { size: 8 }); y += 10; }); }
    if (s.notes) { y += 4; pdf.wrap('Note: ' + s.notes, 8, W).forEach((t) => { pdf.text(t, L, y, { size: 8 }); y += 10; }); }
    // ---- footer
    const fy = 712;
    pdf.line(L, fy - 14, R, fy - 14, 0.4, LINE);
    if (co.bank) { pdf.text('Bank details', L, fy, { size: 7.5, color: GREY }); pdf.wrap(co.bank, 8, 250).forEach((t, i) => pdf.text(t, L, fy + 11 + i * 10, { size: 8 })); }
    pdf.text('Declaration', L, fy + 46, { size: 7.5, color: GREY });
    pdf.wrap('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 7.5, 280).forEach((t, i) => pdf.text(t, L, fy + 56 + i * 9.5, { size: 7.5 }));
    pdf.text('For ' + (co.name || 'CHIRAG ENTERPRISES'), R, fy, { size: 9, bold: true, align: 'right' });
    if (co.legalName) pdf.text(`${co.legalName} (Proprietor)`, R, fy + 66, { size: 8, align: 'right' });
    pdf.text('Authorised Signatory', R, fy + 77, { size: 8, align: 'right' });
    pdf.rect(0, 826, 595, 16, BLK); pdf.rect(0, 824, 595, 2, GOLD);
    pdf.text('This is a computer-generated invoice.  Subject to Jamshedpur jurisdiction.'.replace('Jamshedpur', co.jurisdiction || 'Jamshedpur'), 297, 836, { size: 7, align: 'center', color: '0.85 0.8 0.72' });
    return pdf.build();
  }
  const fmtD = (d) => { const [y, m, dd] = String(d || '').split('-'); return d ? `${dd}-${m}-${y}` : ''; };

  G.EX = { csv, xlsx, zip, Pdf, invoicePdf, crc32, inr, fmtD };
})(typeof window !== 'undefined' ? window : globalThis);
