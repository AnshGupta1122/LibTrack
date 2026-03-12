/* ═══════════════════════════════════════════════
   LIBTRACK — Smart Library Seat Management
   app.js  —  Frontend Logic (connects to Java API)
═══════════════════════════════════════════════ */

// ── API Base URL (Java Spring Boot) ──
const API = '/api';

// ── State ──
const state = {
  seats: [], rooms: [], slots: [],
  selectedSeat: null, selectedRoom: null,
  bookingFormData: {},
  recentBookings: [],
};

// ═══════════════════════════════════
// UTILITY
// ═══════════════════════════════════
const $ = id => document.getElementById(id);
const fmt = s => s ?? '—';
function today() { return new Date().toISOString().split('T')[0]; }
function nowTime() { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }

function toast(msg, type = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = 'toast', 3000);
}

async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Server error');
    }
    return await res.json();
  } catch (e) {
    // Fallback to mock data if API unreachable (for local preview)
    console.warn('API unreachable, using mock:', path);
    return mockFallback(path, opts);
  }
}

// ═══════════════════════════════════
// MOCK DATA (shown when backend offline)
// ═══════════════════════════════════
function mockFallback(path, opts) {
  if (path.includes('/seats') && !opts.method) return generateMockSeats();
  if (path.includes('/rooms') && !opts.method) return generateMockRooms();
  if (path.includes('/slots'))  return generateMockSlots();
  if (path.includes('/stats'))  return mockStats();
  if (path.includes('/bookings') && opts.method === 'POST') {
    return { bookingId: 'BK' + Math.random().toString(36).substr(2,8).toUpperCase(), status: 'CONFIRMED' };
  }
  if (path.includes('/bookings')) return [];
  return {};
}

function generateMockSeats() {
  const types  = ['QUIET','QUIET','QUIET','COMPUTER','COMPUTER','WINDOW'];
  const zones  = ['A','B','C','D'];
  const seats  = [];
  let id = 1;
  zones.forEach(z => {
    for (let n = 1; n <= 12; n++) {
      seats.push({
        id: id++,
        seatNumber: `${z}-${String(n).padStart(2,'0')}`,
        type: types[Math.floor(Math.random() * types.length)],
        status: Math.random() > 0.35 ? 'AVAILABLE' : 'OCCUPIED',
        zone: z,
      });
    }
  });
  return seats;
}

function generateMockRooms() {
  return [
    { id:1, roomNumber:'G-01', capacity:6,  status:'AVAILABLE', amenities:['Whiteboard','TV Screen','AC'], floor:'1st' },
    { id:2, roomNumber:'G-02', capacity:8,  status:'OCCUPIED',  amenities:['Whiteboard','AC'],             floor:'1st' },
    { id:3, roomNumber:'G-03', capacity:4,  status:'AVAILABLE', amenities:['Whiteboard'],                  floor:'2nd' },
    { id:4, roomNumber:'G-04', capacity:10, status:'AVAILABLE', amenities:['Projector','Whiteboard','AC'], floor:'2nd' },
    { id:5, roomNumber:'G-05', capacity:6,  status:'AVAILABLE', amenities:['Whiteboard','TV Screen'],      floor:'3rd' },
    { id:6, roomNumber:'G-06', capacity:8,  status:'OCCUPIED',  amenities:['AC','Whiteboard'],             floor:'3rd' },
  ];
}

function generateMockSlots() {
  const slots = [];
  const hours  = [9,10,11,12,13,14,15,16,17,18,19];
  const total  = 48;
  hours.forEach(h => {
    const occ = Math.floor(Math.random() * total);
    slots.push({
      id: h,
      startTime: `${String(h).padStart(2,'0')}:00`,
      endTime:   `${String(h+1).padStart(2,'0')}:00`,
      totalSeats: total,
      occupiedSeats: occ,
      availableSeats: total - occ,
    });
  });
  return slots;
}

function mockStats() {
  const total = 48, occ = 19, rooms = 6, roomsAvail = 4;
  return { totalSeats: total, occupiedSeats: occ, availableSeats: total - occ, totalRooms: rooms, availableRooms: roomsAvail };
}

// ═══════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════
const sections = {
  dashboard:  { title: 'Dashboard',          load: loadDashboard },
  seats:      { title: 'Seats & Availability', load: loadSeats   },
  book:       { title: 'Book a Seat',         load: loadBookPage },
  groups:     { title: 'Group Rooms',         load: loadGroups   },
  mybookings: { title: 'My Bookings',         load: () => {}     },
  slots:      { title: 'Time Slots',          load: loadSlots    },
};

function navigate(key) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $(`page-${key}`).classList.add('active');
  document.querySelector(`[data-section="${key}"]`).classList.add('active');
  $('topbar-title').textContent = sections[key].title;
  sections[key].load();
  if (window.innerWidth <= 800) $('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigate(item.dataset.section); });
});

$('hamburger').addEventListener('click', () => $('sidebar').classList.toggle('open'));

// ═══════════════════════════════════
// DATE CHIP & DEFAULTS
// ═══════════════════════════════════
function setDateDefaults() {
  const t = today();
  ['bk-date','seat-date','grp-date','slots-date'].forEach(id => {
    const el = $(id); if (el) el.value = t;
  });
  $('date-chip').textContent = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

// ═══════════════════════════════════
// POPULATE SLOT DROPDOWNS
// ═══════════════════════════════════
const SLOT_HOURS = [9,10,11,12,13,14,15,16,17,18,19];

function populateSlotDropdown(selectId) {
  const sel = $(selectId);
  if (!sel) return;
  sel.innerHTML = '';
  if (selectId !== 'seat-slot') sel.innerHTML = '<option value="">Select a slot</option>';
  else sel.innerHTML = '<option value="">Any slot</option>';
  SLOT_HOURS.forEach(h => {
    const opt = document.createElement('option');
    opt.value = `${String(h).padStart(2,'0')}:00`;
    opt.textContent = `${String(h).padStart(2,'0')}:00 – ${String(h+1).padStart(2,'0')}:00`;
    sel.appendChild(opt);
  });
}

function initSlotDropdowns() {
  ['bk-slot','seat-slot','grp-slot'].forEach(populateSlotDropdown);
}

// ═══════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════
async function loadDashboard() {
  const stats = await apiFetch('/stats');
  state.stats = stats;

  animCount('kpi-total', stats.totalSeats);
  animCount('kpi-avail', stats.availableSeats);
  animCount('kpi-occ',   stats.occupiedSeats);
  animCount('kpi-group', stats.availableRooms);

  const pct = Math.round((stats.occupiedSeats / stats.totalSeats) * 100);
  $('donut-pct').textContent = pct + '%';
  drawDonut(pct);

  renderHourlyChart();
  renderRecentBookings();
}

function animCount(id, target) {
  const el = $(id); let c = 0;
  const step = Math.max(1, Math.ceil(target / 20));
  const t = setInterval(() => {
    c = Math.min(c + step, target);
    el.textContent = c;
    if (c >= target) clearInterval(t);
  }, 35);
}

function drawDonut(pct) {
  const canvas = $('donutCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 80, cy = 80, r = 65, lw = 14;
  ctx.clearRect(0, 0, 160, 160);

  // BG ring
  ctx.beginPath(); ctx.arc(cx,cy,r, -Math.PI/2, Math.PI*1.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.stroke();

  // Fill
  const end = (-Math.PI/2) + (2*Math.PI * pct/100);
  ctx.beginPath(); ctx.arc(cx,cy,r, -Math.PI/2, end);
  const grad = ctx.createLinearGradient(0,0,160,160);
  grad.addColorStop(0, '#4f8ef7'); grad.addColorStop(1, '#7c5cfc');
  ctx.strokeStyle = grad; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.stroke();
}

function renderHourlyChart() {
  const chart = $('hourly-chart');
  chart.innerHTML = '';
  const data = SLOT_HOURS.map(h => ({ h, v: Math.floor(Math.random()*90)+10 }));
  const max  = Math.max(...data.map(d=>d.v));
  data.forEach(d => {
    const bar = document.createElement('div');
    bar.className = 'bar-item';
    bar.style.height = `${(d.v/max)*90}%`;
    bar.setAttribute('data-label', `${d.h}h`);
    bar.title = `${d.h}:00 — ${d.v}% occupied`;
    chart.appendChild(bar);
  });
}

function renderRecentBookings() {
  const list = $('recent-bookings-list');
  list.innerHTML = '';
  const data = [
    { type:'book',  name:'Rohan V.',   seat:'A-05', time: nowTime() },
    { type:'group', name:'Priya M.',   seat:'G-03', time: calcTime(-5) },
    { type:'book',  name:'Karan S.',   seat:'B-12', time: calcTime(-12) },
    { type:'cancel',name:'Neha P.',    seat:'C-07', time: calcTime(-18) },
    { type:'book',  name:'Aarav K.',   seat:'D-03', time: calcTime(-25) },
  ];
  data.forEach(d => {
    const item = document.createElement('div');
    item.className = 'recent-item';
    const label = d.type === 'group' ? 'Room' : d.type === 'cancel' ? 'Cancelled' : 'Booked';
    item.innerHTML = `
      <div class="recent-dot ${d.type}"></div>
      <div class="recent-info">
        <strong>${d.name}</strong>
        <span>${label} · ${d.seat}</span>
      </div>
      <div class="recent-time">${d.time}</div>`;
    list.appendChild(item);
  });
}

function calcTime(minOffset) {
  const d = new Date(); d.setMinutes(d.getMinutes() + minOffset);
  return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

// ═══════════════════════════════════
// SEATS PAGE
// ═══════════════════════════════════
async function loadSeats(type = 'ALL') {
  const path = type === 'ALL' ? '/seats' : `/seats?type=${type}`;
  state.seats = await apiFetch(path);
  renderSeatMap(state.seats);
}

function renderSeatMap(seats) {
  const map = $('seat-map');
  map.innerHTML = '';
  state.selectedSeat = null;
  $('seat-action-bar').style.display = 'none';

  seats.forEach(seat => {
    const btn = document.createElement('button');
    const cls = seat.status === 'AVAILABLE' ? 'available' : 'occupied';
    btn.className = `seat-btn ${cls}`;
    btn.innerHTML = `${seat.seatNumber}<small>${seat.type?.charAt(0) || '?'}</small>`;
    btn.title = `${seat.seatNumber} · ${seat.type} · ${seat.status}`;
    btn.disabled = seat.status !== 'AVAILABLE';

    btn.addEventListener('click', () => selectSeat(seat, btn));
    map.appendChild(btn);
  });
}

function selectSeat(seat, btn) {
  document.querySelectorAll('.seat-btn.selected').forEach(b => {
    b.classList.remove('selected'); b.classList.add('available');
  });
  btn.classList.remove('available'); btn.classList.add('selected');
  state.selectedSeat = seat;
  $('selected-seat-label').textContent = `${seat.seatNumber} (${seat.type}) selected`;
  $('seat-action-bar').style.display = 'flex';
}

$('quick-book-btn').addEventListener('click', () => {
  if (!state.selectedSeat) return;
  // Pre-fill book form and navigate
  $('bk-type').value = state.selectedSeat.type;
  $('bk-seat').value = state.selectedSeat.id;
  navigate('book');
});

// Seat type filter
document.querySelectorAll('.seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadSeats(btn.dataset.type);
  });
});

// ═══════════════════════════════════
// BOOK PAGE
// ═══════════════════════════════════
async function loadBookPage() {
  // Populate available seats in dropdown
  const seats = await apiFetch('/seats?status=AVAILABLE');
  const sel = $('bk-seat');
  sel.innerHTML = '<option value="">Auto-assign best available</option>';
  seats.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.seatNumber} — ${s.type}`;
    sel.appendChild(opt);
  });

  // Live summary update
  ['bk-name','bk-sid','bk-type','bk-seat','bk-date','bk-slot'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', updateBookingSummary);
  });
  document.querySelectorAll('input[name="dur"]').forEach(r => r.addEventListener('change', updateBookingSummary));
  updateBookingSummary();
}

function updateBookingSummary() {
  const name  = $('bk-name').value;
  const sid   = $('bk-sid').value;
  const type  = $('bk-type').value;
  const seatEl= $('bk-seat');
  const seatLabel = seatEl.options[seatEl.selectedIndex]?.text || 'Auto-assign';
  const date  = $('bk-date').value;
  const slot  = $('bk-slot').value;
  const dur   = document.querySelector('input[name="dur"]:checked')?.value || '—';
  const sid2  = $('sidebar-uid'); if (sid && sid2) sid2.textContent = `ID: ${sid}`;

  if (!name && !sid && !slot) return;

  const body = $('bk-summary');
  body.innerHTML = '';
  const rows = [
    ['Name',     name || '—'],
    ['Student ID', sid || '—'],
    ['Seat Type', type],
    ['Seat',     seatLabel],
    ['Date',     date || '—'],
    ['Time Slot', slot ? `${slot} (${dur}h)` : '—'],
  ];
  rows.forEach(([label, val]) => {
    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `<span class="s-label">${label}</span><span class="s-val">${val}</span>`;
    body.appendChild(row);
  });
}

// Booking form submission
$('booking-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name  = $('bk-name').value.trim();
  const sid   = $('bk-sid').value.trim();
  const type  = $('bk-type').value;
  const seatId= $('bk-seat').value;
  const date  = $('bk-date').value;
  const slot  = $('bk-slot').value;
  const dur   = document.querySelector('input[name="dur"]:checked')?.value;

  if (!name || !sid || !date || !slot) {
    toast('Please fill all required fields.', 'error'); return;
  }

  const fb = $('availability-feedback');
  fb.className = 'avail-feedback available';
  fb.textContent = '⏳ Checking availability & confirming…';

  const payload = { studentName: name, studentId: sid, seatType: type, seatId: seatId || null, date, startTime: slot, durationHours: parseInt(dur) };

  const res = await apiFetch('/bookings', { method: 'POST', body: JSON.stringify(payload) });

  fb.className = 'avail-feedback hidden';

  if (res.bookingId) {
    showModal(`Seat Confirmed!`, `Your seat has been reserved.`,
      `Booking ID : ${res.bookingId}\nName       : ${name}\nSeat       : ${res.seatNumber || 'Auto-assigned'}\nDate       : ${date}\nSlot       : ${slot}`);
    $('booking-form').reset(); setDateDefaults(); updateBookingSummary();
    toast('Booking confirmed! 🎉', 'success');
  } else {
    toast(res.message || 'Could not book. Please try again.', 'error');
  }
});

// ═══════════════════════════════════
// GROUP ROOMS
// ═══════════════════════════════════
async function loadGroups() {
  state.rooms = await apiFetch('/rooms');
  const grid = $('rooms-grid');
  grid.innerHTML = '';

  state.rooms.forEach(room => {
    const card = document.createElement('div');
    const cls  = room.status === 'AVAILABLE' ? 'available' : 'occupied';
    card.className = `room-card ${cls}`;
    card.innerHTML = `
      <div class="room-card-top">
        <div class="room-id">${room.roomNumber}</div>
        <div class="room-status-badge ${cls}">${room.status}</div>
      </div>
      <div class="room-details">
        <div class="room-detail-row"><span class="room-detail-icon">👥</span> Up to ${room.capacity} people</div>
        <div class="room-detail-row"><span class="room-detail-icon">🏢</span> Floor ${room.floor}</div>
        <div class="room-detail-row"><span class="room-detail-icon">✨</span> ${room.amenities.join(', ')}</div>
      </div>`;
    if (room.status === 'AVAILABLE') {
      card.addEventListener('click', () => openRoomBooking(room));
    }
    grid.appendChild(card);
  });
}

function openRoomBooking(room) {
  state.selectedRoom = room;
  $('room-form-title').textContent = `Book ${room.roomNumber} (up to ${room.capacity} people)`;
  populateSlotDropdown('grp-slot');
  $('grp-date').value = today();
  $('room-booking-form').style.display = 'block';
  $('room-booking-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

$('room-cancel-btn').addEventListener('click', () => {
  $('room-booking-form').style.display = 'none';
  state.selectedRoom = null;
});

$('room-confirm-btn').addEventListener('click', async () => {
  const name    = $('grp-name').value.trim();
  const sid     = $('grp-sid').value.trim();
  const date    = $('grp-date').value;
  const slot    = $('grp-slot').value;
  const people  = parseInt($('grp-people').value);

  if (!name || !sid || !date || !slot) { toast('Fill all fields.', 'error'); return; }
  if (!state.selectedRoom)             { toast('No room selected.', 'error'); return; }

  const payload = {
    studentName: name, studentId: sid, roomId: state.selectedRoom.id,
    date, startTime: slot, numberOfPeople: people,
  };

  const res = await apiFetch('/room-bookings', { method: 'POST', body: JSON.stringify(payload) });

  if (res.bookingId) {
    showModal('Room Booked!', `${state.selectedRoom.roomNumber} is reserved for your group.`,
      `Booking ID : ${res.bookingId}\nRoom       : ${state.selectedRoom.roomNumber}\nOrganiser  : ${name}\nDate       : ${date}\nSlot       : ${slot}\nPeople     : ${people}`);
    $('room-booking-form').style.display = 'none';
    toast('Room booked! 🚀', 'success');
    loadGroups();
  } else {
    toast(res.message || 'Failed to book room.', 'error');
  }
});

// ═══════════════════════════════════
// MY BOOKINGS
// ═══════════════════════════════════
$('lookup-btn').addEventListener('click', loadMyBookings);
$('lookup-sid').addEventListener('keypress', e => { if (e.key === 'Enter') loadMyBookings(); });

async function loadMyBookings() {
  const sid = $('lookup-sid').value.trim();
  if (!sid) { toast('Enter your Student ID.', 'error'); return; }
  $('sidebar-uid').textContent = `ID: ${sid}`;

  const container = $('my-bookings-container');
  container.innerHTML = '<div class="empty-state">Loading…</div>';

  const bookings = await apiFetch(`/bookings?studentId=${encodeURIComponent(sid)}`);

  if (!bookings.length) {
    container.innerHTML = '<div class="empty-state">No bookings found for this Student ID.</div>';
    return;
  }

  container.innerHTML = '';
  bookings.forEach(b => {
    const card = document.createElement('div');
    card.className = 'booking-card';
    const isRoom   = b.type === 'GROUP';
    const statusCls = b.status === 'ACTIVE' ? 'active' : b.status === 'UPCOMING' ? 'upcoming' : 'done';
    card.innerHTML = `
      <div class="booking-type-tag ${isRoom ? 'group' : 'seat'}">${isRoom ? 'Room' : 'Seat'}</div>
      <div class="booking-info">
        <strong>${isRoom ? b.roomNumber : b.seatNumber} · ${b.seatType || b.roomNumber}</strong>
        <span>${b.date} · ${b.startTime} · ${b.durationHours || 1}h</span>
      </div>
      <div class="booking-meta">
        <div class="booking-id">${b.bookingId}</div>
        <div class="booking-status ${statusCls}">${b.status}</div>
        ${b.status !== 'DONE' ? `<button class="cancel-booking-btn" data-id="${b.bookingId}">Cancel</button>` : ''}
      </div>`;
    container.appendChild(card);
  });

  // Cancel handlers
  container.querySelectorAll('.cancel-booking-btn').forEach(btn => {
    btn.addEventListener('click', () => cancelBooking(btn.dataset.id));
  });
}

async function cancelBooking(bookingId) {
  const res = await apiFetch(`/bookings/${bookingId}`, { method: 'DELETE' });
  toast(res.message || 'Booking cancelled.', 'info');
  loadMyBookings();
}

// ═══════════════════════════════════
// TIME SLOTS
// ═══════════════════════════════════
async function loadSlots() {
  const date = $('slots-date').value || today();
  const slots = await apiFetch(`/slots?date=${date}`);
  state.slots = slots;
  renderSlots(slots);
}

function renderSlots(slots) {
  const grid = $('slots-grid');
  grid.innerHTML = '';

  slots.forEach(slot => {
    const pct = Math.round((slot.occupiedSeats / slot.totalSeats) * 100);
    const barColor = pct < 40 ? 'var(--green)' : pct < 75 ? 'var(--amber)' : 'var(--red)';
    const card = document.createElement('div');
    card.className = 'slot-card';
    card.innerHTML = `
      <div class="slot-time">${slot.startTime} – ${slot.endTime}</div>
      <div class="slot-bar-wrap">
        <div class="slot-bar-fill" style="width:${pct}%;background:${barColor}"></div>
      </div>
      <div class="slot-counts">
        <span class="slot-avail-count">✓ ${slot.availableSeats} free</span>
        <span>${slot.occupiedSeats}/${slot.totalSeats} filled</span>
      </div>`;
    grid.appendChild(card);
  });
}

$('slots-load-btn').addEventListener('click', loadSlots);

// ═══════════════════════════════════
// MODAL
// ═══════════════════════════════════
function showModal(title, msg, detail = '') {
  $('modal-title').textContent = title;
  $('modal-msg').textContent   = msg;
  $('modal-detail').textContent = detail;
  $('modal-overlay').classList.add('open');
}

$('modal-close').addEventListener('click', () => $('modal-overlay').classList.remove('open'));
$('modal-overlay').addEventListener('click', e => {
  if (e.target === $('modal-overlay')) $('modal-overlay').classList.remove('open');
});

// ═══════════════════════════════════
// INIT
// ═══════════════════════════════════
function init() {
  setDateDefaults();
  initSlotDropdowns();
  navigate('dashboard');
}

init();
