/* CHIRAG ENTERPRISES ERP — calculation & costing engine (pure, no I/O).
   Every figure in the app is derived from stored transactions by build().
   Nothing here holds rates, GST %, sizes or labour amounts: all come from records. */
(function (G) {
  'use strict';
  const num = (x) => { const n = parseFloat(x); return isFinite(n) ? n : 0; };
  const r2 = (x) => Math.round((num(x) + Number.EPSILON) * 100) / 100;
  const r4 = (x) => Math.round((num(x) + Number.EPSILON) * 10000) / 10000;
  const sqftOf = (w, h) => (num(w) * num(h)) / 144;
  /* money is added in whole paise (integers) so long sums never drift: 0.1 + 0.2 is exactly 0.30 */
  const paise = (x) => Math.round((num(x) + (num(x) < 0 ? -Number.EPSILON : Number.EPSILON)) * 100);
  const sumM = (arr, f) => (arr || []).reduce((a, x) => a + paise(f ? f(x) : x), 0) / 100;
  const addM = (...xs) => xs.reduce((a, x) => a + paise(x), 0) / 100;
  const gstPct = (rec) => (rec.gstMode === 'custom' ? num(rec.gstPct) : num(rec.gstMode));
  const month = (d) => String(d || '').slice(0, 7);
  const PRODUCTS = ['door', 'firewood', 'bhushi', 'jabra'];
  const SALE_CATS = ['raw', 'door', 'firewood', 'bhushi', 'jabra'];
  const MATERIALS = ['Rej Hardwood', 'Rej Pinewood', 'Rej Firewood', 'Rej Popular Wood', 'Rej Plywood'];
  const LABOUR = { unloading: 'Truck unloading', nail: 'Nail removal', sorting: 'Material sorting', production: 'Production labour', other: 'Other processing' };
  const UNIT = { raw: 'KG', door: 'SQ FT', firewood: 'KG', bhushi: 'KG', jabra: 'SQ FT' };
  const LABEL = { raw: 'Raw scrap wood', door: 'Flash Door', firewood: 'Firewood', bhushi: 'Bhushi', jabra: 'Jabra' };
  const MFG_EXP = ['repair', 'blade', 'electricity', 'consumable'];

  function purchaseCalc(p) {
    const value = num(p.kg) * num(p.rate);
    const gst = (value * gstPct(p)) / 100;
    const extras = addM(p.loading, p.lifting, p.transport, p.other);
    const v = r2(value), g = r2(gst);
    return { value: v, gst: g, extras, total: addM(v, g, extras) };
  }

  function doorLine(l) {
    const each = sqftOf(l.w, l.h);
    const pcs = num(l.pcs);
    return { each, pcs, sqft: each * pcs, key: sizeKey(l.w, l.h) };
  }
  const sizeKey = (w, h) => `${num(w)}x${num(h)}`;

  function productionCalc(b) {
    const doors = (b.doors || []).filter((l) => num(l.pcs) > 0).map(doorLine);
    const doorPcs = doors.reduce((s, d) => s + d.pcs, 0);
    const doorSqft = doors.reduce((s, d) => s + d.sqft, 0);
    const out = { door: doorSqft, firewood: num(b.firewoodKg), bhushi: num(b.bhushiKg), jabra: num(b.jabraSqft) };
    const kgParts = { door: b.doorKg === '' || b.doorKg == null ? null : num(b.doorKg), firewood: num(b.firewoodKg), bhushi: num(b.bhushiKg), jabra: b.jabraKg === '' || b.jabraKg == null ? null : num(b.jabraKg) };
    const missing = [];
    if (doorSqft > 0 && kgParts.door == null) missing.push('Flash Door weight');
    if (out.jabra > 0 && kgParts.jabra == null) missing.push('Jabra weight');
    const accountedKg = (kgParts.door || 0) + kgParts.firewood + kgParts.bhushi + (kgParts.jabra || 0);
    const inputKg = num(b.inputKg);
    const unaccountedKg = inputKg - accountedKg;
    const rates = { door: num(b.doorRate), firewood: num(b.firewoodRate), bhushi: num(b.bhushiRate), jabra: num(b.jabraRate) };
    const value = {}; PRODUCTS.forEach((k) => { value[k] = out[k] * rates[k]; });
    return { doors, doorPcs, doorSqft, out, rates, value, inputKg, accountedKg, unaccountedKg, unaccountedPct: inputKg ? (unaccountedKg / inputKg) * 100 : 0, missing };
  }

  function saleLine(l) {
    if (l.cat === 'door') { const d = doorLine(l); return { qty: d.sqft, pcs: d.pcs, each: d.each, key: d.key, amount: r2(d.sqft * num(l.rate)) }; }
    return { qty: num(l.qty), pcs: 0, amount: r2(num(l.qty) * num(l.rate)) };
  }
  /* ---------- GST ---------- */
  const STATES = { '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other Territory' };
  const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  /* GSTIN: 15 chars, format + official mod-36 check digit + valid state code */
  function gstinCheck(g) {
    g = String(g || '').trim().toUpperCase();
    if (!g) return { ok: false, empty: true, msg: '' };
    if (!GSTIN_RE.test(g)) return { ok: false, msg: 'GSTIN format is wrong (15 characters, e.g. 20ABCDE1234F1Z5)' };
    if (!STATES[g.slice(0, 2)]) return { ok: false, msg: `GSTIN state code ${g.slice(0, 2)} is not a valid state` };
    let sum = 0;
    for (let i = 0; i < 14; i++) { const p = B36.indexOf(g[i]) * (i % 2 ? 2 : 1); sum += Math.floor(p / 36) + (p % 36); }
    if (B36[(36 - (sum % 36)) % 36] !== g[14]) return { ok: false, msg: 'GSTIN check digit does not match — please re-check the number' };
    return { ok: true, gstin: g, stateCode: g.slice(0, 2), state: STATES[g.slice(0, 2)], pan: g.slice(2, 12) };
  }
  const lineMode = (l, s) => (l.gstMode == null || l.gstMode === '' ? s.gstMode : l.gstMode);
  const linePct = (l, s) => { const m = lineMode(l, s); return m === 'custom' ? num(l.gstMode === 'custom' ? l.gstPct : s.gstPct) : m === 'nongst' ? 0 : num(m); };
  /* Sale invoice. Tax is computed per rate group (lines may carry different rates).
     Intra-state: CGST = half (rounded), SGST = rest, so CGST+SGST always equals the GST.
     Inter-state (s.igst true — set from place of supply ≠ seller's state): IGST = full GST. */
  function saleCalc(s) {
    const lines = (s.lines || []).map((l) => ({ ...l, ...saleLine(l), pct: linePct(l, s), mode: lineMode(l, s) }));
    const groups = {};
    lines.forEach((l) => { const k = l.mode === 'nongst' ? 'nongst' : String(l.pct); const g = (groups[k] = groups[k] || { key: k, pct: l.pct, nonGst: l.mode === 'nongst', taxable: 0 }); g.taxable += l.amount; });
    const inter = !!s.igst;
    const gl = Object.values(groups).sort((a, b) => b.pct - a.pct).map((g) => {
      const taxable = r2(g.taxable), gst = r2((taxable * g.pct) / 100);
      const cgst = inter ? 0 : r2(gst / 2), sgst = inter ? 0 : r2(gst - cgst), igst = inter ? gst : 0;
      return { ...g, taxable, gst, cgst, sgst, igst };
    });
    const sum = (k) => sumM(gl, (g) => g[k]);
    const taxable = sumM(lines, (l) => l.amount), gst = sum('gst');
    const rates = [...new Set(lines.map((l) => l.pct))];
    return { lines, groups: gl, taxable, gst, cgst: sum('cgst'), sgst: sum('sgst'), igst: sum('igst'), pct: rates.length === 1 ? rates[0] : null, mixed: rates.length > 1, interState: inter,
      nonGst: lines.length > 0 && lines.every((l) => l.mode === 'nongst'), total: addM(taxable, gst) };
  }

  function expenseAmount(e) {
    if (e.type === 'blade') return r2(num(e.blades) * num(e.perBlade));
    if (e.type === 'consumable') return r2(num(e.qty) * num(e.unitRate));
    return r2(num(e.amount));
  }
  const mistriTotal = (m) => r2(num(m.pcs) * num(m.rate));

  /* Split joint batch cost across products. Returns {shares:{door..}, method, note} */
  function allocate(b, pc, jointCost) {
    const shares = { door: 0, firewood: 0, bhushi: 0, jabra: 0 };
    let note = '';
    if (b.allocMethod === 'manual') {
      const m = b.manual || {};
      const sum = PRODUCTS.reduce((s, k) => s + num(m[k]), 0);
      if (Math.abs(sum - 100) > 0.01) note = `Manual % add to ${r2(sum)} (must be 100) — fell back to relative sales value`;
      else { PRODUCTS.forEach((k) => { shares[k] = num(m[k]) / 100; }); return { shares, method: 'Manual %', note }; }
    }
    const tot = PRODUCTS.reduce((s, k) => s + pc.value[k], 0);
    if (tot > 0) PRODUCTS.forEach((k) => { shares[k] = pc.value[k] / tot; });
    else {
      const has = PRODUCTS.filter((k) => pc.out[k] > 0);
      if (has.length) has.forEach((k) => { shares[k] = 1 / has.length; });
      note = (note ? note + '; ' : '') + 'No output rates entered — cost split equally across outputs';
    }
    return { shares, method: 'Relative sales value', note };
  }

  /* ---------- the full model ---------- */
  function build(D, S) {
    S = S || {};
    const act = (a) => (a || []).filter((r) => !r.deleted);
    const purchases = act(D.purchases), unloading = act(D.unloading), production = act(D.production);
    const sales = act(D.sales), mistri = act(D.mistri), payments = act(D.payments), adjustments = act(D.adjustments);
    /* expenses: only APPROVED BUSINESS expenses are costs. Personal = owner's drawings (not a cost).
       Pending approval and rejected entries are kept but never counted. Old entries have no status = approved. */
    const expAll = act(D.expenses);
    const expStatus = (e) => e.status || 'approved';
    const expenses = expAll.filter((e) => expStatus(e) === 'approved' && e.nature !== 'personal');
    const drawings = expAll.filter((e) => expStatus(e) === 'approved' && e.nature === 'personal');
    const pendingExp = expAll.filter((e) => expStatus(e) === 'pending');
    /* APPROVAL (does it count as a cost?) and PAYMENT (did money leave cash / bank?) are separate.
       Paid at entry = payStatus 'paid'. Entries saved before payStatus existed: paid when a payment
       mode other than Credit was chosen (the earlier design). Later payments / refunds are Payments
       linked to the expense. Approving never moves money; rejecting never un-pays money. */
    const expPaidAtEntry = (e) => (e.payStatus ? e.payStatus === 'paid' : !!e.payMode && !/credit/i.test(String(e.payMode)));
    const claimable = S.gstClaimable !== false;
    const warn = [];

    const lots = {};
    purchases.forEach((p) => {
      const c = purchaseCalc(p);
      /* stock comes in at the RECEIVED weight (godown weighbridge) when entered; otherwise the billed weight */
      const billed = num(p.kg), recv = num(p.receivedKg) > 0 ? num(p.receivedKg) : billed;
      lots[p.lotId] = { id: p.lotId, rec: p, ...c, kg: recv, billedKg: billed, receivedKg: recv, shortKg: billed - recv, material: String(p.material || '').trim() || 'Unspecified',
        unloading: 0, labour: Object.fromEntries(Object.keys(LABOUR).map((k) => [k, 0])), unloadingPaid: 0, processedKg: 0, batches: [], mistriLot: 0, expLot: 0, paidLater: 0 };
    });
    /* labour: wages earned are the cost (on the work date); what is paid only settles the payable */
    const labourType = (u) => (LABOUR[u.labourType] ? u.labourType : 'unloading');
    const labourLater = [];
    const overhead = []; // {date, amount, label, reason}
    unloading.forEach((u) => {
      const amt = num(u.amount), t = labourType(u);
      if (u.batchId) { labourLater.push(u); return; }
      const L = lots[u.lotId];
      if (L) { L.unloading += amt; L.labour[t] += amt; return; }
      if (u.lotId) warn.push(`Labour ${u.id} points to missing lot ${u.lotId}`);
      overhead.push({ date: u.date, amount: amt, label: `${LABOUR[t]} — ${u.team || ''}`, reason: u.lotId ? 'Its lot is missing' : 'Not linked to a lot or batch' });
    });
    Object.values(lots).forEach((L) => {
      L.rawCost = L.value + L.extras + L.unloading + (claimable ? 0 : L.gst);
      L.rawPerKg = L.kg ? L.rawCost / L.kg : 0;
    });

    const batches = {};
    production.forEach((b) => {
      const L = lots[b.lotId];
      const pc = productionCalc(b);
      const B = { id: b.batchId, rec: b, lotId: b.lotId, date: b.date, pc, raw: L ? pc.inputKg * L.rawPerKg : 0, mistri: 0, consumable: 0, jointExp: 0, expLines: [] };
      if (!L) warn.push(`Batch ${b.batchId} points to missing lot ${b.lotId}`);
      else { L.processedKg += pc.inputKg; L.batches.push(B); }
      batches[b.batchId] = B;
    });

    labourLater.forEach((u) => {
      const amt = num(u.amount), t = labourType(u), B = batches[u.batchId];
      if (B) { B.jointExp += amt; B.expLines.push({ label: `${LABOUR[t]} — ${u.team || ''}`, amount: amt }); if (lots[B.lotId]) lots[B.lotId].labour[t] += amt; return; }
      warn.push(`Labour ${u.id} points to missing batch ${u.batchId}`);
      overhead.push({ date: u.date, amount: amt, label: `${LABOUR[t]} — ${u.team || ''}`, reason: 'Its batch is missing' });
    });
    const spread = (list, weightFn, amount, apply) => {
      const tot = list.reduce((s, x) => s + weightFn(x), 0);
      if (!list.length) return false;
      list.forEach((x) => apply(x, tot > 0 ? (amount * weightFn(x)) / tot : amount / list.length));
      return true;
    };

    mistri.forEach((m) => {
      const amt = mistriTotal(m);
      if (m.batchId && batches[m.batchId]) { batches[m.batchId].mistri += amt; return; }
      const L = lots[m.lotId];
      if (L && spread(L.batches, (x) => x.pc.doorSqft, amt, (x, a) => { x.mistri += a; })) return;
      overhead.push({ date: m.date, amount: amt, label: `Mistri — ${m.mistri || ''}`, reason: 'Not linked to a production batch' });
    });

    const monthPool = {};
    expenses.forEach((e) => {
      const amt = expenseAmount(e);
      const direct = e.type === 'consumable';
      const lbl = expLabel(e);
      const put = (B, a) => { if (direct) B.consumable += a; else B.jointExp += a; B.expLines.push({ label: lbl, amount: a }); };
      if (e.batchId && batches[e.batchId]) { put(batches[e.batchId], amt); return; }
      const L = lots[e.lotId];
      if (L && spread(L.batches, (x) => x.pc.inputKg, amt, put)) return;
      if (MFG_EXP.includes(e.type) && S.allocShared !== false) { (monthPool[month(e.date)] = monthPool[month(e.date)] || []).push({ e, amt, put, lbl }); return; }
      overhead.push({ date: e.date, amount: amt, label: lbl, reason: e.type === 'other' ? 'General expense' : 'Not linked to production' });
    });
    Object.entries(monthPool).forEach(([mo, items]) => {
      const bs = Object.values(batches).filter((B) => month(B.date) === mo);
      items.forEach((it) => {
        if (!spread(bs, (x) => x.pc.inputKg, it.amt, (x, a) => it.put(x, a)))
          overhead.push({ date: it.e.date, amount: it.amt, label: it.lbl, reason: `No production in ${mo} to absorb it` });
      });
    });

    /* batch costing */
    const prodCost = {}; // lot -> product -> {qty, cost}
    const global = {}; PRODUCTS.forEach((k) => { global[k] = { qty: 0, cost: 0 }; });
    Object.values(batches).forEach((B) => {
      B.joint = B.raw + B.jointExp;
      const al = allocate(B.rec, B.pc, B.joint);
      B.alloc = al;
      if (al.note) warn.push(`Batch ${B.id}: ${al.note}`);
      B.cost = {}; B.unit = {};
      PRODUCTS.forEach((k) => {
        let c = B.joint * al.shares[k];
        if (k === 'door') c += B.mistri + B.consumable;
        B.cost[k] = c; B.unit[k] = B.pc.out[k] ? c / B.pc.out[k] : 0;
      });
      if (B.pc.doorSqft === 0 && B.mistri + B.consumable > 0) { B.cost.door = 0; warn.push(`Batch ${B.id}: mistri/consumables but no door output`); }
      B.total = PRODUCTS.reduce((s, k) => s + B.cost[k], 0);
      B.perDoor = B.pc.doors.map((d) => ({ key: d.key, pcs: d.pcs, sqft: d.each, cost: d.each * B.unit.door }));
      const pl = (prodCost[B.lotId] = prodCost[B.lotId] || {});
      PRODUCTS.forEach((k) => { const x = (pl[k] = pl[k] || { qty: 0, cost: 0 }); x.qty += B.pc.out[k]; x.cost += B.cost[k]; global[k].qty += B.pc.out[k]; global[k].cost += B.cost[k]; });
    });
    const rawAll = Object.values(lots).reduce((a, L) => ({ c: a.c + L.rawCost, q: a.q + L.kg }), { c: 0, q: 0 });
    const unitCost = (lotId, k) => {
      if (k === 'raw') return lots[lotId] ? lots[lotId].rawPerKg : rawAll.q ? rawAll.c / rawAll.q : 0;
      const x = prodCost[lotId] && prodCost[lotId][k];
      if (x && x.qty > 0) return x.cost / x.qty;
      return global[k].qty > 0 ? global[k].cost / global[k].qty : 0;
    };

    /* payments against documents */
    const paidAgainst = {};
    const onAccount = {}; // party -> {in, out}
    const tds = { receivable: 0, payable: 0, rows: [] };
    payments.forEach((p) => {
      if (p.direction === 'transfer') return;
      const t = num(p.tds); const amt = addM(p.amount, t); // TDS deducted also settles the bill
      if (t) { tds[p.direction === 'out' ? 'payable' : 'receivable'] = addM(tds[p.direction === 'out' ? 'payable' : 'receivable'], t); tds.rows.push(p); }
      if (p.refId) paidAgainst[p.refId] = (paidAgainst[p.refId] || 0) + amt;
      else { const k = pkey(p.party); const o = (onAccount[k] = onAccount[k] || { in: 0, out: 0, name: p.party }); o[p.direction === 'out' ? 'out' : 'in'] += amt; }
    });

    /* sales */
    /* A sale return (credit note) is stored like an invoice with kind 'return'. All its figures are
       turned negative here, so it reverses revenue, GST, cost of sales and stock exactly. */
    const neg = (c) => { ['taxable', 'gst', 'cgst', 'sgst', 'igst', 'total'].forEach((k) => { c[k] = -c[k]; }); c.groups.forEach((g) => ['taxable', 'gst', 'cgst', 'sgst', 'igst'].forEach((k) => { g[k] = -g[k]; })); c.lines.forEach((l) => { l.qty = -l.qty; l.pcs = -l.pcs; l.amount = -l.amount; }); return c; };
    const expIds = new Set(expAll.map((e) => e.id)); const expLater = {};
    payments.forEach((p) => { if (p.refId && expIds.has(p.refId) && p.direction !== 'transfer') expLater[p.refId] = addM(expLater[p.refId] || 0, p.direction === 'out' ? addM(p.amount, p.tds) : -addM(p.amount, p.tds)); });
    const expRows = expAll.map((e) => {
      const total = addM(expenseAmount(e), e.gstAmt), st = expStatus(e);
      const paid = addM(expPaidAtEntry(e) ? total : 0, expLater[e.id] || 0);
      return { rec: e, status: st, total, paid, paidAtEntry: expPaidAtEntry(e),
        outstanding: st === 'rejected' ? 0 : addM(total, -paid),   // still to pay (approved or pending)
        recoverable: st === 'rejected' ? paid : 0 };               // paid but rejected: to be recovered
    });
    const saleRows = sales.map((s) => {
      const ret = s.kind === 'return';
      const c = ret ? neg(saleCalc(s)) : saleCalc(s);
      let cogs = 0;
      c.lines.forEach((l) => { l.unitCost = unitCost(l.lotId, l.cat); l.cogs = l.qty * l.unitCost; cogs += l.cogs; if (!l.unitCost) warn.push(`${ret ? 'Credit note' : 'Invoice'} ${s.invoiceNo}: ${LABEL[l.cat]} has no cost yet`); });
      const money = addM(s.received, paidAgainst[s.id] || 0);
      const received = ret ? -money : money; // for a return, money paid back to the customer
      return { rec: s, ret, ...c, cogs, received, outstanding: addM(c.total, -received) };
    });
    const purchRows = purchases.map((p) => {
      const L = lots[p.lotId]; const paid = addM(p.paid, paidAgainst[p.id] || 0);
      L.paidTotal = paid; L.outstanding = addM(L.total, -paid);
      return L;
    });

    /* stock */
    const stock = {}; // product -> lot -> {in, out, adj}
    const bump = (k, lot, f, q) => { const a = (stock[k] = stock[k] || {}); const x = (a[lot || '—'] = a[lot || '—'] || { in: 0, out: 0, adj: 0 }); x[f] += q; };
    const moves = [];
    Object.values(lots).forEach((L) => { bump('raw', L.id, 'in', L.kg); moves.push({ date: L.rec.date, k: 'raw', lot: L.id, qty: L.kg, ref: `Purchase ${L.id}`, src: 'purchases', id: L.rec.id }); });
    Object.values(batches).forEach((B) => {
      bump('raw', B.lotId, 'out', B.pc.inputKg); moves.push({ date: B.date, k: 'raw', lot: B.lotId, qty: -B.pc.inputKg, ref: `Production ${B.id}`, src: 'production', id: B.rec.id });
      PRODUCTS.forEach((k) => { if (B.pc.out[k]) { bump(k, B.lotId, 'in', B.pc.out[k]); moves.push({ date: B.date, k, lot: B.lotId, qty: B.pc.out[k], ref: `Production ${B.id}`, src: 'production', id: B.rec.id }); } });
    });
    adjustments.forEach((a) => { bump(a.product, a.lotId, 'adj', num(a.qty)); moves.push({ date: a.date, k: a.product, lot: a.lotId || '—', qty: num(a.qty), ref: `Adjustment: ${a.reason || ''}`, src: 'adjustments', id: a.id }); });
    const pending = [];
    saleRows.forEach((s) => s.lines.forEach((l) => { if (l.lotId || s.ret) { bump(l.cat, l.lotId, 'out', l.qty); moves.push({ date: s.rec.date, k: l.cat, lot: l.lotId, qty: -l.qty, ref: `Invoice ${s.rec.invoiceNo}`, src: 'sales', id: s.rec.id }); } else pending.push({ s, l }); }));
    /* lines sold without a lot are taken from the oldest lots that still have stock (FIFO) */
    const lotDate = (id) => (lots[id] ? String(lots[id].rec.date) + id : '~' + id);
    pending.sort((a, b) => String(a.s.rec.date).localeCompare(String(b.s.rec.date))).forEach(({ s, l }) => {
      let left = l.qty; l.fifo = [];
      const byLot = stock[l.cat] || {};
      Object.keys(byLot).filter((k) => k !== '—').sort((a, b) => lotDate(a).localeCompare(lotDate(b))).forEach((lot) => {
        if (left <= 1e-9) return; const x = byLot[lot]; const avail = x.in - x.out + x.adj; if (avail <= 1e-9) return;
        const take = Math.min(avail, left); x.out += take; left -= take; l.fifo.push({ lot, qty: take });
        moves.push({ date: s.rec.date, k: l.cat, lot, qty: -take, ref: `Invoice ${s.rec.invoiceNo} (auto lot)`, src: 'sales', id: s.rec.id });
      });
      if (left > 1e-9) { bump(l.cat, '—', 'out', left); l.fifo.push({ lot: '—', qty: left }); moves.push({ date: s.rec.date, k: l.cat, lot: '—', qty: -left, ref: `Invoice ${s.rec.invoiceNo}`, src: 'sales', id: s.rec.id }); }
      if (l.fifo.length) { l.cogs = l.fifo.reduce((a, f) => a + f.qty * (f.lot === '—' ? unitCost('', l.cat) : unitCost(f.lot, l.cat)), 0); s.cogs = s.lines.reduce((a, y) => a + y.cogs, 0); l.unitCost = l.qty ? l.cogs / l.qty : 0; }
    });
    moves.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const stockRows = [];
    const stockTotals = {};
    Object.entries(stock).forEach(([k, byLot]) => {
      Object.entries(byLot).forEach(([lot, x]) => {
        const qty = x.in - x.out + x.adj;
        const uc = k === 'raw' ? (lots[lot] ? lots[lot].rawPerKg : 0) : unitCost(lot, k);
        stockRows.push({ k, lot, material: lots[lot] ? lots[lot].material : '', in: x.in, out: x.out, adj: x.adj, qty, unitCost: uc, value: qty * uc });
        const t = (stockTotals[k] = stockTotals[k] || { in: 0, out: 0, adj: 0, qty: 0, value: 0 });
        t.in += x.in; t.out += x.out; t.adj += x.adj; t.qty += qty; t.value += qty * uc;
      });
    });
    SALE_CATS.forEach((k) => { stockTotals[k] = stockTotals[k] || { in: 0, out: 0, adj: 0, qty: 0, value: 0 }; });
    const negatives = stockRows.filter((r) => r.qty < -1e-6);
    /* godown view per lot: received, sent to processing, sold as raw, adjusted, left */
    Object.values(lots).forEach((L) => { const x = (stock.raw || {})[L.id] || { in: 0, out: 0, adj: 0 }; L.rawOut = x.out; L.soldKg = x.out - L.processedKg; L.adjKg = x.adj; L.rawLeft = x.in - x.out + x.adj; L.rawLeftValue = L.rawLeft * L.rawPerKg; });

    /* door stock by size */
    const sizes = {};
    Object.values(batches).forEach((B) => B.pc.doors.forEach((d) => { const s = (sizes[d.key] = sizes[d.key] || { made: 0, sold: 0, each: d.each }); s.made += d.pcs; }));
    saleRows.forEach((s) => s.lines.forEach((l) => { if (l.cat === 'door') { const z = (sizes[l.key] = sizes[l.key] || { made: 0, sold: 0, each: l.each }); z.sold += l.pcs; } }));

    /* parties */
    const parties = {};
    const P = (name, role) => { const k = pkey(name); return (parties[k] = parties[k] || { name: String(name || '').trim() || '(no name)', roles: new Set(), receivable: 0, payable: 0, sales: 0, purchases: 0, opening: 0 }); };
    const plus = (p, f, v) => { p[f] = addM(p[f], v); };
    act(D.parties).forEach((pm) => { const o = num(pm.opening); if (!o) return; const p = P(pm.name); p.opening = pm.openingSide === 'payable' ? -o : o; plus(p, pm.openingSide === 'payable' ? 'payable' : 'receivable', o); });
    saleRows.forEach((s) => { const p = P(s.rec.customer); p.roles.add('Customer'); plus(p, 'sales', s.total); plus(p, 'receivable', s.outstanding); });
    purchRows.forEach((L) => { const p = P(L.rec.supplier); p.roles.add('Supplier'); plus(p, 'purchases', L.total); plus(p, 'payable', L.outstanding); });
    unloading.forEach((u) => { const p = P(u.team); p.roles.add('Labour'); plus(p, 'payable', addM(u.amount, -num(u.paid))); });
    mistri.forEach((m) => { const p = P(m.mistri); p.roles.add('Mistri'); plus(p, 'payable', addM(mistriTotal(m), -num(m.advance), -num(m.paid))); });
    Object.entries(onAccount).forEach(([k, o]) => { const p = P(o.name); plus(p, 'receivable', -o.in); plus(p, 'payable', -o.out); });
    /* an APPROVED expense not yet paid is owed to its vendor; a REJECTED expense that was paid is owed back to us */
    expRows.forEach((x) => { const nm = x.rec.vendor || 'Expense vendor (not named)';
      if (x.status === 'approved' && x.outstanding > 0.005) { const p = P(nm); p.roles.add('Expense vendor'); plus(p, 'payable', x.outstanding); }
      if (x.recoverable > 0.005) { const p = P(nm); p.roles.add('Expense vendor'); plus(p, 'receivable', x.recoverable); } });
    const expSum = { pendingUnpaid: sumM(expRows.filter((x) => x.status === 'pending'), (x) => x.outstanding), pendingPaid: sumM(expRows.filter((x) => x.status === 'pending'), (x) => x.paid),
      approvedUnpaid: sumM(expRows.filter((x) => x.status === 'approved'), (x) => x.outstanding), rejectedPaid: sumM(expRows, (x) => x.recoverable) };

    /* cash & bank: every rupee that actually moved, by account */
    const cash = cashBook(S, { purchases, unloading, mistri, expenses: expAll.filter(expPaidAtEntry), saleRows, payments });

    /* gst */
    const gst = { output: 0, input: 0 };
    saleRows.forEach((s) => { gst.output += s.gst; });
    if (claimable) purchRows.forEach((L) => { gst.input += L.gst; });
    expenses.forEach((e) => { gst.input += num(e.gstAmt); });

    const model = { lots, batches, saleRows, purchRows, stockRows, stockTotals, negatives, moves, sizes, parties, overhead, gst, warn, unitCost, prodCost, cash, tds, drawings, pendingExp, expRows, expSum };
    /* how much of each line of an invoice can still be returned (doors by pieces, others by qty) */
    model.returnable = (saleId, exceptId) => {
      const o = saleRows.find((x) => x.rec.id === saleId && !x.ret); if (!o) return null;
      const left = o.lines.map((l) => ({ cat: l.cat, lotId: l.lotId || (l.fifo && l.fifo[0] ? l.fifo[0].lot : ''), w: l.w, h: l.h, rate: l.rate, gstMode: l.gstMode, gstPct: l.gstPct, hsn: l.hsn, pcs: num(l.pcs), qty: l.qty }));
      saleRows.filter((x) => x.ret && x.rec.refInvoice === saleId && x.rec.id !== exceptId).forEach((x) => (x.rec.lines || []).forEach((l) => { const t = left[num(l.srcLine)]; if (!t) return; if (l.cat === 'door') t.pcs -= num(l.pcs); else t.qty -= num(l.qty); }));
      return left;
    };
    model.pnl = (from, to) => pnl(model, D, { purchases, unloading, production, sales, mistri, expenses, drawings, pendingExp }, from, to);
    return model;
  }

  const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

  const DEF_ACCOUNTS = [{ id: 'cash', name: 'Cash in hand', type: 'cash', opening: 0 }, { id: 'bank', name: 'Bank account', type: 'bank', opening: 0 }];
  /* Which account did the money go through? An account chosen on the entry wins; otherwise Cash mode →
     the cash account, UPI / bank transfer / cheque → the first bank account. Blank or "Credit" with an
     amount is listed as "mode not set" — never guessed into an account. */
  function cashBook(S, A) {
    const accts = (S.accounts && S.accounts.length ? S.accounts : DEF_ACCOUNTS).map((a) => ({ ...a, opening: num(a.opening), in: 0, out: 0 }));
    const byId = Object.fromEntries(accts.map((a) => [a.id, a]));
    const first = (t) => accts.find((a) => a.type === t);
    const pick = (mode, acct) => { if (acct && byId[acct]) return byId[acct]; const m = String(mode || '').toLowerCase(); if (!m || m.includes('credit')) return null; if (m.includes('cash')) return first('cash') || null; return first('bank') || null; };
    const moves = [], unassigned = [];
    const mv = (date, mode, acct, amt, dir, ref, party, src, id) => { amt = num(amt); if (!amt) return; const a = pick(mode, acct); const row = { date, amt, dir, ref, party, src, id, mode: mode || '', acct: a ? a.id : '' }; if (!a) { unassigned.push(row); return; } a[dir] = addM(a[dir], amt); moves.push(row); };
    A.purchases.forEach((p) => mv(p.date, p.payMode, p.account, p.paid, 'out', `Purchase lot ${p.lotId}`, p.supplier, 'purchases', p.id));
    A.unloading.forEach((u) => mv(u.date, u.payMode, u.account, u.paid, 'out', `${LABOUR[u.labourType] || LABOUR.unloading} ${u.lotId || u.batchId || ''}`, u.team, 'unloading', u.id));
    A.mistri.forEach((m) => mv(m.date, m.payMode, m.account, addM(m.advance, m.paid), 'out', `Mistri ${m.batchId || m.lotId || ''}`, m.mistri, 'mistri', m.id));
    A.expenses.forEach((e) => mv(e.payDate || e.date, e.payMode, e.account, addM(expenseAmount(e), e.gstAmt), 'out', (e.nature === 'personal' ? 'Personal: ' : '') + expLabel(e) + ((e.status || 'approved') === 'approved' ? '' : e.status === 'rejected' ? ' (rejected)' : ' (awaiting approval)'), e.technician || e.vendor || '', 'expenses', e.id));
    A.saleRows.forEach((s) => { const r = s.rec; if (num(r.received)) mv(r.payDate || r.date, r.payMode, r.account, r.received, s.ret ? 'out' : 'in', `${s.ret ? 'Refund on credit note' : 'Received with invoice'} ${r.invoiceNo}`, r.customer, 'sales', r.id); });
    A.payments.forEach((p) => {
      if (p.direction === 'transfer') { const f = byId[p.fromAccount], t = byId[p.toAccount]; const amt = num(p.amount); if (!f || !t || f === t || !amt) { unassigned.push({ date: p.date, amt, dir: 'transfer', ref: 'Transfer with unknown account', src: 'payments', id: p.id }); return; } f.out = addM(f.out, amt); t.in = addM(t.in, amt); moves.push({ date: p.date, amt, dir: 'out', ref: `Transfer to ${t.name}`, src: 'payments', id: p.id, acct: f.id, mode: 'Transfer' }, { date: p.date, amt, dir: 'in', ref: `Transfer from ${f.name}`, src: 'payments', id: p.id, acct: t.id, mode: 'Transfer' }); return; }
      mv(p.date, p.mode, p.account, p.amount, p.direction === 'out' ? 'out' : 'in', p.direction === 'out' ? 'Payment made' : 'Receipt', p.party, 'payments', p.id);
    });
    accts.forEach((a) => { a.balance = addM(a.opening, a.in, -a.out); });
    moves.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return { accounts: accts, moves, unassigned, total: sumM(accts, (a) => a.balance), cashTotal: sumM(accts.filter((a) => a.type === 'cash'), (a) => a.balance), bankTotal: sumM(accts.filter((a) => a.type !== 'cash'), (a) => a.balance) };
  }

  function pnl(M, D, A, from, to) {
    const sr = M.saleRows.filter((s) => inRange(s.rec.date, from, to));
    const revenue = sr.reduce((a, s) => a + s.taxable, 0);
    const cogs = sr.reduce((a, s) => a + s.cogs, 0);
    const oh = M.overhead.filter((o) => inRange(o.date, from, to));
    const overhead = oh.reduce((a, o) => a + o.amount, 0);
    const byProduct = {}; SALE_CATS.forEach((k) => { byProduct[k] = { qty: 0, revenue: 0, cogs: 0 }; });
    sr.forEach((s) => s.lines.forEach((l) => { const x = byProduct[l.cat]; x.qty += l.qty; x.revenue += l.amount; x.cogs += l.cogs; }));
    const spend = {
      wood: A.purchases.filter((p) => inRange(p.date, from, to)).reduce((a, p) => a + M.lots[p.lotId].value + M.lots[p.lotId].extras, 0),
      unloading: A.unloading.filter((u) => inRange(u.date, from, to)).reduce((a, u) => a + num(u.amount), 0),
      labourBy: Object.fromEntries(Object.keys(LABOUR).map((k) => [k, A.unloading.filter((u) => inRange(u.date, from, to) && (LABOUR[u.labourType] ? u.labourType : 'unloading') === k).reduce((a, u) => a + num(u.amount), 0)])),
      mistri: A.mistri.filter((m) => inRange(m.date, from, to)).reduce((a, m) => a + mistriTotal(m), 0),
      expenses: A.expenses.filter((e) => inRange(e.date, from, to)).reduce((a, e) => a + expenseAmount(e), 0),
    };
    const gstOut = sr.reduce((a, s) => a + s.gst, 0);
    const gstIn = A.purchases.filter((p) => inRange(p.date, from, to)).reduce((a, p) => a + M.lots[p.lotId].gst, 0) + A.expenses.filter((e) => inRange(e.date, from, to)).reduce((a, e) => a + num(e.gstAmt), 0);
    const returns = sr.filter((s) => s.ret).reduce((a, s) => a - s.taxable, 0);
    const drawings = A.drawings.filter((e) => inRange(e.date, from, to)).reduce((a, e) => a + expenseAmount(e) + num(e.gstAmt), 0);
    const pendingExp = A.pendingExp.filter((e) => inRange(e.date, from, to));
    return { revenue, cogs, gross: revenue - cogs, overhead, overheadRows: oh, net: revenue - cogs - overhead, byProduct, spend, gstOut, gstIn, invoices: sr.filter((s) => !s.ret).length, returns, drawings, pendingExp, pendingExpAmt: pendingExp.reduce((a, e) => a + expenseAmount(e), 0) };
  }

  function expLabel(e) {
    const t = { repair: 'Machine repair', blade: 'Blade sharpening', electricity: 'Electricity', consumable: 'Consumables', other: 'Other' }[e.type] || 'Expense';
    const d = e.machine || e.item || e.description || e.period || '';
    return d ? `${t} — ${d}` : t;
  }
  const pkey = (n) => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');

  function fyOf(d, startMonth) {
    const sm = startMonth || 4; const [y, m] = String(d).split('-').map(Number);
    const s = m >= sm ? y : y - 1; return { start: `${s}-${String(sm).padStart(2, '0')}-01`, end: endOfFy(s, sm), label: `${s}-${String((s + 1) % 100).padStart(2, '0')}` };
  }
  function endOfFy(s, sm) { const e = new Date(Date.UTC(s + 1, sm - 1, 0)); return e.toISOString().slice(0, 10); }

  function amountWords(n) {
    n = Math.round(num(n) * 100) / 100;
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = (x) => (x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : ''));
    const three = (x) => (x >= 100 ? ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x));
    const words = (x) => {
      if (!x) return 'Zero';
      const parts = []; const cr = Math.floor(x / 1e7); x %= 1e7; const la = Math.floor(x / 1e5); x %= 1e5; const th = Math.floor(x / 1e3); x %= 1e3;
      if (cr) parts.push(words(cr) + ' Crore'); if (la) parts.push(two(la) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (x) parts.push(three(x));
      return parts.join(' ');
    };
    const rupees = Math.floor(n), paise = Math.round((n - rupees) * 100);
    return 'Rupees ' + words(rupees) + (paise ? ' and ' + two(paise) + ' Paise' : '') + ' Only';
  }

  G.CE = { SALE_CATS, MATERIALS, LABOUR, DEF_ACCOUNTS, paise, sumM, addM, cashBook, STATES, gstinCheck, num, r2, r4, sqftOf, gstPct, purchaseCalc, productionCalc, saleCalc, saleLine, expenseAmount, mistriTotal, build, fyOf, amountWords, pkey, sizeKey, PRODUCTS, UNIT, LABEL, MFG_EXP, expLabel, inRange, month };
})(typeof window !== 'undefined' ? window : globalThis);
