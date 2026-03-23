/* ══════════════════════════════════════════════════
   GymTracker v4 — app.js
   • Grafice sparkline per aparat în dashboard
   • Dată editabilă la log
   • Fără limită de aparate
   • Comprimare imagini (Canvas, max 800px, JPEG 72%)
   • Zero dependențe externe
══════════════════════════════════════════════════ */

const PHOTO_MAX_W  = 800;
const PHOTO_QUALITY = 0.72;
const STORE_AP  = 'gt_ap';
const STORE_ANT = 'gt_ant';

/* ── STORAGE ── */
const db = {
  get: (k, d = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
};
const getAp  = () => db.get(STORE_AP,  []);
const setAp  = v  => db.set(STORE_AP,  v);
const getAnt = () => db.get(STORE_ANT, []);
const setAnt = v  => db.set(STORE_ANT, v);

/* ── TOAST ── */
const $toast = document.getElementById('toast');
let _tt;
function toast(msg, type = '') {
  $toast.textContent = msg;
  $toast.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(_tt);
  _tt = setTimeout(() => { $toast.className = 'toast'; }, 2600);
}

/* ── NAV ── */
function showView(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  const tab = document.querySelector(`.nav-tab[onclick="showView('${name}')"]`);
  if (tab) tab.classList.add('active');
  if (name === 'dashboard')   renderDash();
  if (name === 'aparate')     renderAparate();
  if (name === 'antrenament') initLog();
}

/* ── DATE HELPERS ── */
const MO = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','nov','dec'];
const ZI = ['Dum','Lun','Mar','Mie','Joi','Vin','Sâm'];
function fmtShort(iso) {
  const d = new Date(iso);
  return d.getDate() + ' ' + MO[d.getMonth()];
}
function fmtFull(iso) {
  const d = new Date(iso);
  return ZI[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()] + ' ' + d.getFullYear();
}
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/* ══════════════════════════════════════
   SPARKLINE — mini inline canvas chart
   data: array of numbers, w/h in CSS px
══════════════════════════════════════ */
function drawSparkline(canvas, data) {
  if (!canvas || !data.length) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth  || 110;
  const H = canvas.offsetHeight || 56;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const PAD = { t: 4, r: 4, b: 4, l: 4 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;

  const xp = i  => PAD.l + (i / Math.max(data.length - 1, 1)) * cW;
  const yp = v  => PAD.t + cH - ((v - min) / rng) * cH;

  // area fill
  const grad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH);
  grad.addColorStop(0, 'rgba(15,15,15,.1)');
  grad.addColorStop(1, 'rgba(15,15,15,0)');
  ctx.beginPath();
  ctx.moveTo(xp(0), yp(data[0]));
  data.forEach((v, i) => { if (i) ctx.lineTo(xp(i), yp(v)); });
  ctx.lineTo(xp(data.length - 1), PAD.t + cH);
  ctx.lineTo(xp(0), PAD.t + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // line
  ctx.beginPath();
  ctx.strokeStyle = '#0f0f0f';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  data.forEach((v, i) => { i === 0 ? ctx.moveTo(xp(i), yp(v)) : ctx.lineTo(xp(i), yp(v)); });
  ctx.stroke();

  // last point dot
  if (data.length > 1) {
    const li = data.length - 1;
    ctx.beginPath();
    ctx.arc(xp(li), yp(data[li]), 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#0f0f0f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/* ══════════════════════════════════════
   DASHBOARD
══════════════════════════════════════ */
function renderDash() {
  const ap  = getAp();
  const ant = getAnt();

  // chips
  const vol = ant.reduce((s, a) =>
    s + a.sets.reduce((ss, st) =>
      ss + (parseFloat(st.val) || 0) * (parseInt(st.serii) || 1) * (parseInt(st.reps) || 1), 0), 0);
  document.getElementById('statsChips').innerHTML =
    `<div class="chip">Aparate: <strong>${ap.length}</strong></div>` +
    `<div class="chip">Sesiuni: <strong>${ant.length}</strong></div>` +
    `<div class="chip">Volum: <strong>${vol.toFixed(0)}</strong></div>`;

  const grid  = document.getElementById('dashGrid');
  const empty = document.getElementById('dashEmpty');
  if (!ap.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  grid.innerHTML = ap.map(a => {
    const sessions = ant.filter(x => x.apId === a.id).sort((x, y) => x.data.localeCompare(y.data));
    const last = sessions[sessions.length - 1];
    const maxV = last ? Math.max(...last.sets.map(s => parseFloat(s.val) || 0)) : null;
    const unit = last?.unit || 'kg';
    const sparkData = sessions.map(s => Math.max(...s.sets.map(x => parseFloat(x.val) || 0)));
    const hasChart = sparkData.length >= 2;

    const photoEl = a.photo
      ? `<img src="${a.photo}" alt="${a.nume}">`
      : '🏋️';

    return `<div class="ap-card" onclick="openDetaliu('${a.id}')">
      <div class="ap-actions">
        <button class="icon-btn" onclick="event.stopPropagation();openEdit('${a.id}')">✏</button>
        <button class="icon-btn del" onclick="event.stopPropagation();delAp('${a.id}')">✕</button>
      </div>
      <div class="ap-row">
        <div class="ap-photo-sm">${photoEl}</div>
        <div class="ap-info">
          ${a.grup ? `<div class="ap-grup-sm">${a.grup}</div>` : ''}
          <div class="ap-name">${a.nume}</div>
          <div class="ap-last">${last
            ? `${fmtShort(last.data)} · <strong>${maxV} ${unit}</strong>`
            : 'Niciun antrenament'}</div>
        </div>
        <div class="ap-spark">
          ${hasChart ? `<canvas id="spark-${a.id}" width="110" height="56"></canvas>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  // draw sparklines after DOM inserted
  requestAnimationFrame(() => {
    ap.forEach(a => {
      const sessions = ant.filter(x => x.apId === a.id).sort((x, y) => x.data.localeCompare(y.data));
      const sparkData = sessions.map(s => Math.max(...s.sets.map(x => parseFloat(x.val) || 0)));
      if (sparkData.length >= 2) {
        const c = document.getElementById('spark-' + a.id);
        if (c) drawSparkline(c, sparkData);
      }
    });
  });
}

/* ══════════════════════════════════════
   APARATE LIST
══════════════════════════════════════ */
function renderAparate() {
  const ap  = getAp();
  const ant = getAnt();
  const list  = document.getElementById('aparateList');
  const empty = document.getElementById('aparateEmpty');
  if (!ap.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  list.innerHTML = ap.map(a => {
    const cnt = ant.filter(x => x.apId === a.id).length;
    const thumbEl = a.photo ? `<div class="list-thumb"><img src="${a.photo}" alt="${a.nume}"></div>`
                             : `<div class="list-thumb">🏋️</div>`;
    return `<div class="list-row" onclick="openDetaliu('${a.id}')">
      ${thumbEl}
      <div class="list-info">
        <div class="list-name">${a.nume}</div>
        <div class="list-sub">${a.grup || 'Fără grupă'} · ${cnt} sesiuni</div>
      </div>
      <div class="list-acts">
        <button class="btn-sm" onclick="event.stopPropagation();openEdit('${a.id}')">✏</button>
        <button class="btn-sm del" onclick="event.stopPropagation();delAp('${a.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════
   MODAL APARAT
══════════════════════════════════════ */
let editId   = null;
let curPhoto = null;

document.getElementById('btnAdd').addEventListener('click', openAdd);
document.getElementById('mClose').addEventListener('click', closeModal);
document.getElementById('mCancel').addEventListener('click', closeModal);
document.getElementById('mSave').addEventListener('click', saveAp);
document.getElementById('photoDrop').addEventListener('click', () =>
  document.getElementById('photoFile').click());
document.getElementById('modalAp').addEventListener('click', e => {
  if (e.target === document.getElementById('modalAp')) closeModal();
});

document.getElementById('photoFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Imaginea e prea mare (max 5 MB)!', 'err'); return; }
  compressImage(file, PHOTO_MAX_W, PHOTO_QUALITY, dataUrl => {
    curPhoto = dataUrl;
    document.getElementById('photoPreview').src = dataUrl;
    document.getElementById('photoPreview').style.display = 'block';
    document.getElementById('photoHint').style.display = 'none';
  });
});

function compressImage(file, maxW, quality, cb) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function openAdd() {
  editId = null; curPhoto = null;
  document.getElementById('mTitle').textContent = 'Aparat nou';
  document.getElementById('mNume').value = '';
  document.getElementById('mGrup').value = '';
  document.getElementById('mNote').value = '';
  document.getElementById('photoFile').value = '';
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('photoHint').style.display = 'flex';
  document.getElementById('modalAp').style.display = 'flex';
}
function openEdit(id) {
  const a = getAp().find(x => x.id === id); if (!a) return;
  editId = id; curPhoto = a.photo || null;
  document.getElementById('mTitle').textContent = 'Editează aparat';
  document.getElementById('mNume').value  = a.nume;
  document.getElementById('mGrup').value  = a.grup || '';
  document.getElementById('mNote').value  = a.note || '';
  document.getElementById('photoFile').value = '';
  if (a.photo) {
    document.getElementById('photoPreview').src = a.photo;
    document.getElementById('photoPreview').style.display = 'block';
    document.getElementById('photoHint').style.display = 'none';
  } else {
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('photoHint').style.display = 'flex';
  }
  document.getElementById('modalAp').style.display = 'flex';
}
function closeModal() { document.getElementById('modalAp').style.display = 'none'; }

function saveAp() {
  const nume = document.getElementById('mNume').value.trim();
  if (!nume) { toast('Introdu denumirea!', 'err'); return; }
  const list = getAp();
  if (editId) {
    const i = list.findIndex(x => x.id === editId);
    if (i > -1) {
      list[i].nume = nume;
      list[i].grup = document.getElementById('mGrup').value;
      list[i].note = document.getElementById('mNote').value.trim();
      if (curPhoto) list[i].photo = curPhoto;
    }
    toast('Aparat actualizat', 'ok');
  } else {
    list.push({ id: db.uid(), nume,
      grup:  document.getElementById('mGrup').value,
      note:  document.getElementById('mNote').value.trim(),
      photo: curPhoto || null });
    toast('Aparat adăugat', 'ok');
  }
  setAp(list); closeModal(); renderAparate(); renderDash();
}
function delAp(id) {
  if (!confirm('Ștergi aparatul și tot istoricul?')) return;
  setAp(getAp().filter(x => x.id !== id));
  setAnt(getAnt().filter(x => x.apId !== id));
  toast('Șters'); renderAparate(); renderDash();
}

/* ══════════════════════════════════════
   LOG / ANTRENAMENT
══════════════════════════════════════ */
let selApId = null;
let sets    = [{ val: '', serii: '', reps: '' }];
let curUnit = 'kg';

function initLog() {
  selApId = null;
  sets = [{ val: '', serii: '', reps: '' }];
  curUnit = 'kg';
  document.getElementById('trainNote').value = '';

  // set today's date as default
  document.getElementById('trainDateInput').value = todayISO();

  // reset unit toggle
  document.querySelectorAll('.unit-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.unit === 'kg'));
  document.getElementById('colLabel').textContent = 'Greutate';

  // hide sub-sections
  ['setsCard', 'noteCard', 'saveWrap'].forEach(id =>
    document.getElementById(id).style.display = 'none');

  // render picker
  const ap = getAp();
  const pg = document.getElementById('pickerGrid');
  const pe = document.getElementById('pickerEmpty');
  if (!ap.length) {
    pg.innerHTML = ''; pg.style.display = 'none'; pe.style.display = 'block'; return;
  }
  pe.style.display = 'none'; pg.style.display = 'grid';
  pg.innerHTML = ap.map(a => `
    <div class="pc-card" id="pc-${a.id}" onclick="selAp('${a.id}')">
      <div class="pc-thumb">
        ${a.photo ? `<img src="${a.photo}" alt="${a.nume}">` : '🏋️'}
      </div>
      <div class="pc-name">${a.nume}</div>
    </div>`).join('');

  renderSets();
}

function selAp(id) {
  selApId = id;
  document.querySelectorAll('.pc-card').forEach(c => c.classList.remove('sel'));
  document.getElementById('pc-' + id)?.classList.add('sel');
  ['setsCard', 'noteCard', 'saveWrap'].forEach(el =>
    document.getElementById(el).style.display = '');
}

document.querySelectorAll('.unit-btn').forEach(b => {
  b.addEventListener('click', () => {
    curUnit = b.dataset.unit;
    document.querySelectorAll('.unit-btn').forEach(x => x.classList.toggle('active', x === b));
    document.getElementById('colLabel').textContent = curUnit === 'kg' ? 'Greutate' : 'Nivel';
    renderSets();
  });
});

function renderSets() {
  const step = curUnit === 'kg' ? '.5' : '1';
  const ph   = curUnit === 'kg' ? 'kg'  : 'niv';
  document.getElementById('setsList').innerHTML = sets.map((s, i) => `
    <div class="set-row">
      <div class="set-num">${i + 1}</div>
      <input type="number" min="0" step="${step}" placeholder="${ph}"
        value="${s.val}" oninput="sets[${i}].val=this.value" inputmode="decimal"/>
      <input type="number" min="1" step="1" placeholder="serii"
        value="${s.serii}" oninput="sets[${i}].serii=this.value" inputmode="numeric"/>
      <input type="number" min="1" step="1" placeholder="reps"
        value="${s.reps}" oninput="sets[${i}].reps=this.value" inputmode="numeric"/>
      <button class="btn-del-row" onclick="delSet(${i})">✕</button>
    </div>`).join('');
}

document.getElementById('btnAddSet').addEventListener('click', () => {
  sets.push({ val: '', serii: '', reps: '' }); renderSets();
});
function delSet(i) {
  if (sets.length === 1) { toast('Minimum o serie!', 'err'); return; }
  sets.splice(i, 1); renderSets();
}

document.getElementById('btnSaveTrain').addEventListener('click', () => {
  if (!selApId) { toast('Selectează un aparat!', 'err'); return; }
  const valid = sets.filter(s => s.val !== '' || s.serii !== '' || s.reps !== '');
  if (!valid.length) { toast('Completează cel puțin o serie!', 'err'); return; }

  // build ISO from selected date + current time
  const dateVal = document.getElementById('trainDateInput').value || todayISO();
  const [y, m, dd] = dateVal.split('-').map(Number);
  const now = new Date();
  const isoDate = new Date(y, m - 1, dd,
    now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();

  const ant = getAnt();
  ant.push({
    id: db.uid(), apId: selApId,
    data: isoDate, unit: curUnit,
    sets: valid.map(s => ({
      val:   parseFloat(s.val)  || 0,
      serii: parseInt(s.serii) || 1,
      reps:  parseInt(s.reps)  || 1,
    })),
    note: document.getElementById('trainNote').value.trim(),
  });
  setAnt(ant);
  toast('Antrenament salvat!', 'ok');
  initLog();
});

/* ══════════════════════════════════════
   DETALIU APARAT
══════════════════════════════════════ */
let detChartDrawn = false;

function openDetaliu(id) {
  const ap  = getAp().find(x => x.id === id); if (!ap) return;
  const ant = getAnt().filter(x => x.apId === id).sort((a, b) => a.data.localeCompare(b.data));

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-detaliu').classList.add('active');
  detChartDrawn = false;

  document.getElementById('detNume').textContent = ap.nume;
  const gb = document.getElementById('detGrup');
  if (ap.grup) { gb.textContent = ap.grup; gb.style.display = ''; }
  else gb.style.display = 'none';

  const dp = document.getElementById('detPhoto');
  dp.innerHTML = ap.photo ? `<img src="${ap.photo}" alt="${ap.nume}">` : '🏋️';

  document.getElementById('btnEditDet').onclick = () => openEdit(id);

  const allVals = ant.flatMap(a => a.sets.map(s => parseFloat(s.val) || 0));
  const maxV    = allVals.length ? Math.max(...allVals) : 0;
  const lu      = ant.length ? ant[ant.length - 1].unit : 'kg';
  document.getElementById('detMeta').innerHTML = `
    <div class="meta-box">
      <div class="meta-val">${ant.length}</div>
      <div class="meta-lbl">Sesiuni</div>
    </div>
    <div class="meta-box">
      <div class="meta-val">${maxV}<small style="font-size:.9rem"> ${lu}</small></div>
      <div class="meta-lbl">Record</div>
    </div>
    ${ap.note ? `<div class="meta-box" style="grid-column:1/-1;text-align:left">
      <div class="meta-lbl">Note</div>
      <div style="font-size:.9rem;margin-top:.3rem;color:var(--g600)">${ap.note}</div>
    </div>` : ''}`;

  renderDetChart(ant);
  renderHistory(ant);
}

document.getElementById('btnBack').addEventListener('click', () => showView('dashboard'));

/* ── DETALIU CHART (larger, with axes) ── */
function renderDetChart(ant) {
  const canvas = document.getElementById('progCanvas');
  const ph     = document.getElementById('chartEmpty');
  canvas.style.display = 'none'; ph.style.display = 'flex';
  if (!ant.length) return;
  canvas.style.display = 'block'; ph.style.display = 'none';

  const labels = ant.map(a => fmtShort(a.data));
  const data   = ant.map(a => Math.max(...a.sets.map(s => parseFloat(s.val) || 0)));

  requestAnimationFrame(() => {
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.parentElement.clientWidth - 2;
    const H   = 200;
    canvas.width  = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const PAD = { t: 16, r: 16, b: 38, l: 44 };
    const cW  = W - PAD.l - PAD.r;
    const cH  = H - PAD.t - PAD.b;
    const mn  = Math.min(...data);
    const mx  = Math.max(...data);
    const rng = mx - mn || 1;

    const xp = i => PAD.l + (i / Math.max(data.length - 1, 1)) * cW;
    const yp = v => PAD.t + cH - ((v - mn) / rng) * cH;

    // grid
    ctx.strokeStyle = '#ebebeb'; ctx.lineWidth = 1;
    [0, .25, .5, .75, 1].forEach(t => {
      const y = PAD.t + t * cH;
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + cW, y); ctx.stroke();
    });
    // y labels
    ctx.fillStyle = '#a3a3a3'; ctx.font = '11px -apple-system,sans-serif'; ctx.textAlign = 'right';
    [0, .5, 1].forEach(t => {
      const val = mn + t * rng;
      ctx.fillText(val.toFixed(0), PAD.l - 6, PAD.t + (1 - t) * cH + 4);
    });

    // area
    const grad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH);
    grad.addColorStop(0, 'rgba(15,15,15,.08)'); grad.addColorStop(1, 'rgba(15,15,15,0)');
    ctx.beginPath();
    ctx.moveTo(xp(0), yp(data[0]));
    data.forEach((v, i) => { if (i) ctx.lineTo(xp(i), yp(v)); });
    ctx.lineTo(xp(data.length - 1), PAD.t + cH);
    ctx.lineTo(xp(0), PAD.t + cH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // line
    ctx.beginPath(); ctx.strokeStyle = '#0f0f0f'; ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    data.forEach((v, i) => { i === 0 ? ctx.moveTo(xp(i), yp(v)) : ctx.lineTo(xp(i), yp(v)); });
    ctx.stroke();

    // dots
    data.forEach((v, i) => {
      ctx.beginPath(); ctx.arc(xp(i), yp(v), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#0f0f0f'; ctx.lineWidth = 1.8; ctx.stroke();
    });

    // x labels (max 6)
    ctx.fillStyle = '#a3a3a3'; ctx.textAlign = 'center'; ctx.font = '11px -apple-system,sans-serif';
    const step = Math.ceil(labels.length / 6);
    labels.forEach((lbl, i) => {
      if (i % step === 0 || i === labels.length - 1)
        ctx.fillText(lbl, xp(i), H - 10);
    });
  });
}

function renderHistory(ant) {
  const hl = document.getElementById('histList');
  if (!ant.length) { hl.innerHTML = ''; return; }
  hl.innerHTML = [...ant].reverse().map(a => {
    const mx = Math.max(...a.sets.map(s => parseFloat(s.val) || 0));
    return `<div class="h-entry">
      <div class="h-head">
        <div class="h-date">${fmtFull(a.data)}</div>
        <div class="h-max">max ${mx} ${a.unit || 'kg'}</div>
      </div>
      <div class="h-sets">
        ${a.sets.map((s, i) =>
          `<div class="set-tag">S${i+1} <strong>${s.val}${a.unit||'kg'}</strong> × ${s.serii}s × ${s.reps}r</div>`
        ).join('')}
      </div>
      ${a.note ? `<div class="h-note">${a.note}</div>` : ''}
    </div>`;
  }).join('');
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => showView('dashboard'));
