/* ===== CONSTANTS ===== */
const STORAGE_KEY = 'cum-te-simti_state';

const MOODS = {
  5: { emoji: '😄', label: 'Excelent' },
  4: { emoji: '🙂', label: 'Bine' },
  3: { emoji: '😐', label: 'Neutru' },
  2: { emoji: '😕', label: 'Prost' },
  1: { emoji: '😞', label: 'Foarte prost' }
};

/* ===== STATE ===== */
const STATE = {
  entries: {},       // { 'YYYY-MM-DD': { mood: 1-5, note: '', ts: timestamp } }
  selectedMood: null,
  modalDate: null
};

/* ===== PERSISTENCE ===== */
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.entries === 'object') {
        STATE.entries = parsed.entries;
      }
    }
  } catch (e) {
    STATE.entries = {};
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: STATE.entries }));
  } catch (e) {
    // localStorage unavailable (e.g. private mode)
  }
}

/* ===== HELPERS ===== */
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateRO(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun',
                  'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return `${days[date.getDay()]}, ${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function formatDateShort(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun',
                  'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

/* ===== NAVIGATION ===== */
function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  if (screenId === 'screen-history') renderHistory();
  if (screenId === 'screen-stats') renderStats();
}

/* ===== CHECKIN SCREEN ===== */
function renderCheckin() {
  // Date label
  const label = document.getElementById('today-label');
  if (label) label.textContent = formatDateRO(todayKey());

  // Reset selected mood
  STATE.selectedMood = null;
  document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));

  // Note input
  const noteInput = document.getElementById('note-input');
  const charCount = document.getElementById('char-count');
  if (noteInput) {
    noteInput.value = '';
    noteInput.addEventListener('input', function () {
      charCount.textContent = `${this.value.length} / 500`;
    });
  }

  // Check if already saved today
  const today = todayKey();
  const existing = STATE.entries[today];
  const savedToday = document.getElementById('saved-today');
  const btnPrimary = document.querySelector('.btn-primary');

  if (existing) {
    if (savedToday) savedToday.style.display = 'block';
    if (btnPrimary) btnPrimary.style.display = 'none';
    renderSavedToday(existing);
  } else {
    if (savedToday) savedToday.style.display = 'none';
    if (btnPrimary) btnPrimary.style.display = 'block';
  }
}

function renderSavedToday(entry) {
  const display = document.getElementById('saved-mood-display');
  if (!display) return;
  const mood = MOODS[entry.mood] || MOODS[3];
  display.innerHTML = `<span style="font-size:36px">${mood.emoji}</span>
    <div style="font-weight:700;margin-top:6px">${mood.label}</div>
    ${entry.note ? `<div style="font-size:13px;color:#555;margin-top:6px;font-style:italic">${entry.note.substring(0, 80)}${entry.note.length > 80 ? '…' : ''}</div>` : ''}`;
}

function selectMood(value) {
  STATE.selectedMood = value;
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('selected', Number(btn.dataset.mood) === value);
  });
}

function saveCheckin() {
  if (!STATE.selectedMood) {
    alert('Selectează o stare înainte de a salva.');
    return;
  }
  const note = (document.getElementById('note-input').value || '').trim().substring(0, 500);
  const today = todayKey();

  STATE.entries[today] = {
    mood: STATE.selectedMood,
    note: note,
    ts: Date.now()
  };
  saveState();
  renderCheckin();
}

function editToday() {
  const today = todayKey();
  const existing = STATE.entries[today];
  if (!existing) return;

  const savedToday = document.getElementById('saved-today');
  const btnPrimary = document.querySelector('.btn-primary');
  if (savedToday) savedToday.style.display = 'none';
  if (btnPrimary) btnPrimary.style.display = 'block';

  // Pre-fill mood
  selectMood(existing.mood);

  // Pre-fill note
  const noteInput = document.getElementById('note-input');
  const charCount = document.getElementById('char-count');
  if (noteInput) {
    noteInput.value = existing.note || '';
    if (charCount) charCount.textContent = `${noteInput.value.length} / 500`;
  }

  // Temporarily remove today's entry so saveCheckin overwrites cleanly
  delete STATE.entries[today];
}

/* ===== HISTORY SCREEN ===== */
function renderHistory() {
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  if (!list || !empty) return;

  const keys = Object.keys(STATE.entries).sort().reverse();

  if (keys.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.style.display = 'flex';
  list.innerHTML = '';

  keys.forEach(dateKey => {
    const entry = STATE.entries[dateKey];
    if (!entry) return;
    const mood = MOODS[entry.mood] || MOODS[3];

    const item = document.createElement('div');
    item.className = 'history-item';
    item.setAttribute('onclick', `openModal('${dateKey}')`);

    item.innerHTML = `
      <span class="history-emoji">${mood.emoji}</span>
      <div class="history-info">
        <div class="history-date">${formatDateShort(dateKey)}</div>
        <div class="history-mood-label">${mood.label}</div>
        ${entry.note ? `<div class="history-note">${entry.note}</div>` : ''}
      </div>
      <span class="history-arrow">›</span>
    `;
    list.appendChild(item);
  });
}

/* ===== MODAL ===== */
function openModal(dateKey) {
  const entry = STATE.entries[dateKey];
  if (!entry) return;

  STATE.modalDate = dateKey;
  const mood = MOODS[entry.mood] || MOODS[3];

  document.getElementById('modal-date').textContent = formatDateRO(dateKey);
  document.getElementById('modal-mood').innerHTML = `
    <div>${mood.emoji}</div>
    <div style="font-size:18px;font-weight:700;margin-top:8px">${mood.label}</div>
  `;
  document.getElementById('modal-note').textContent = entry.note || '';
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  STATE.modalDate = null;
}

function deleteEntry() {
  if (!STATE.modalDate) return;
  if (!confirm('Ștergi această înregistrare?')) return;
  delete STATE.entries[STATE.modalDate];
  saveState();
  closeModal();
  renderHistory();
}

/* ===== STATS SCREEN ===== */
function renderStats() {
  const container = document.getElementById('stats-content');
  if (!container) return;

  const keys = Object.keys(STATE.entries);
  const total = keys.length;

  if (total === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nicio înregistrare încă.</p></div>';
    return;
  }

  // Compute counts
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  keys.forEach(k => {
    const mood = STATE.entries[k].mood;
    if (counts[mood] !== undefined) counts[mood]++;
    sum += mood;
  });
  const avg = (sum / total).toFixed(1);
  const maxCount = Math.max(...Object.values(counts));

  // Streak
  const streak = computeStreak();

  // Most frequent mood
  let bestMoodKey = 3;
  let bestCount = 0;
  for (const k in counts) {
    if (counts[k] > bestCount) { bestCount = counts[k]; bestMoodKey = Number(k); }
  }

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">${total}</span>
        <span class="stat-label">Zile înregistrate</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${avg}</span>
        <span class="stat-label">Medie stare</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${streak}</span>
        <span class="stat-label">Zile consecutive</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${MOODS[bestMoodKey].emoji}</span>
        <span class="stat-label">Starea dominantă</span>
      </div>
    </div>

    <p class="stats-section-label">Distribuție stări</p>
    <div class="mood-bars">
      ${[5, 4, 3, 2, 1].map(m => {
        const pct = maxCount > 0 ? Math.round((counts[m] / maxCount) * 100) : 0;
        return `<div class="mood-bar-row">
          <span class="mood-bar-emoji">${MOODS[m].emoji}</span>
          <span class="mood-bar-label">${MOODS[m].label}</span>
          <div class="mood-bar-track">
            <div class="mood-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="mood-bar-count">${counts[m]}</span>
        </div>`;
      }).join('')}
    </div>
  `;
}

function computeStreak() {
  const keys = Object.keys(STATE.entries).sort().reverse();
  if (keys.length === 0) return 0;

  let streak = 0;
  const today = todayKey();
  let cursor = today;

  for (const key of keys) {
    if (key === cursor) {
      streak++;
      // Move cursor back one day
      const d = new Date(cursor + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      cursor = `${y}-${m}-${day}`;
    } else if (key < cursor) {
      break;
    }
  }
  return streak;
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', function () {
  loadState();
  renderCheckin();
  show('screen-checkin');
});
