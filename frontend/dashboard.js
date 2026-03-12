/* ══════════════════════════════════════════════════
   LibTrack Dashboard — Full App Logic
   Connects to Spring Boot API at localhost:8080
══════════════════════════════════════════════════ */

const API = '/api';

// ── Auth guard ──
const user = JSON.parse(sessionStorage.getItem('user') || 'null');
if (!user) window.location.href = 'index.html';

// ── User info ──
document.getElementById('user-name').textContent = user.name;
document.getElementById('user-id-label').textContent = user.studentId;
document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();

// ── Date chip ──
document.getElementById('date-chip').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });

// ── Logout ──
function logout() {
  sessionStorage.removeItem('user');
  window.location.href = 'index.html';
}

// ── Hamburger ──
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Toast ──
function toast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = 'toast', 3200);
}

// ── API helper ──
async function api(path, opts = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' }, ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Server error');
    return data;
  } catch (e) {
    console.warn('API error:', path, e.message);
    throw e;
  }
}

// ── Modal ──
function showModal(title, msg, detail = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').textContent   = msg;
  document.getElementById('modal-detail').textContent = detail;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ══════════════════════════════════
// NAVIGATION
// ══════════════════════════════════
const pages = {
  dashboard:  { title: 'Dashboard',       render: renderDashboard },
  seats:      { title: 'Seat Map',         render: renderSeats     },
  book:       { title: 'Book a Seat',      render: renderBook      },
  rooms:      { title: 'Group Rooms',      render: renderRooms     },
  mybookings: { title: 'My Bookings',      render: renderMyBookings},
  slots:      { title: 'Time Slots',       render: renderSlots     },
};

let currentPage = null;

function navigate(key) {
  if (currentPage === key) return;
  currentPage = key;
  document.getElementById('topbar-title').textContent = pages[key].title;
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === key);
  });
  if (window.innerWidth <= 700) document.getElementById('sidebar').classList.remove('open');
  const c = document.getElementById('content');
  c.innerHTML = `<div class="page active" id="page-${key}"></div>`;
  pages[key].render(document.getElementById(`page-${key}`));
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});

// ══════════════════════════════════
// DASHBOARD
// ══════════════════════════════════
async function renderDashboard(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Good ${greeting()}, ${user.name.split(' ')[0]} 👋</h1>
      <p class="page-sub">Here's what's happening in the library right now.</p>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card blue">
        <div class="kpi-label">Total Seats</div>
        <div class="kpi-value" id="kpi-total">—</div>
        <div class="kpi-sub">Across all zones</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">Available</div>
        <div class="kpi-value" id="kpi-avail">—</div>
        <div class="kpi-sub">Open right now</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-label">Occupied</div>
        <div class="kpi-value" id="kpi-occ">—</div>
        <div class="kpi-sub">Currently in use</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-label">Rooms Free</div>
        <div class="kpi-value" id="kpi-rooms">—</div>
        <div class="kpi-sub">Group rooms available</div>
      </div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Occupancy Rate</div>
        <div class="donut-wrap">
          <div class="donut-center">
            <canvas id="donutCanvas" width="120" height="120"></canvas>
            <div class="donut-pct" id="donut-pct">—</div>
          </div>
          <div class="donut-legend">
            <div class="legend-row"><div class="legend-dot" style="background:var(--red)"></div> Occupied</div>
            <div class="legend-row"><div class="legend-dot" style="background:var(--green)"></div> Available</div>
          </div>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Hourly Demand (Today)</div>
        <div class="bar-chart-wrap">
          <div class="bar-chart" id="bar-chart"></div>
        </div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Recent Activity</div>
      <div class="recent-list" id="recent-list">
        <div class="empty">Loading recent bookings…</div>
      </div>
    </div>`;

  try {
    const stats = await api('/stats');
    animCount('kpi-total', stats.totalSeats);
    animCount('kpi-avail', stats.availableSeats);
    animCount('kpi-occ',   stats.occupiedSeats);
    animCount('kpi-rooms', stats.availableRooms);
    const pct = Math.round((stats.occupiedSeats / stats.totalSeats) * 100) || 0;
    document.getElementById('donut-pct').textContent = pct + '%';
    drawDonut(pct);
  } catch { toast('Could not load stats', 'error'); }

  renderBarChart();
  loadRecentActivity();
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function animCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let c = 0; const step = Math.max(1, Math.ceil(target / 25));
  const t = setInterval(() => { c = Math.min(c + step, target); el.textContent = c; if (c >= target) clearInterval(t); }, 30);
}

function drawDonut(pct) {
  const canvas = document.getElementById('donutCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const [cx, cy, r, lw] = [60, 60, 48, 11];
  ctx.clearRect(0, 0, 120, 120);
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, Math.PI * 1.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
  const end = -Math.PI/2 + (2 * Math.PI * pct / 100);
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, end);
  const g = ctx.createLinearGradient(0, 0, 120, 120);
  g.addColorStop(0, '#ef4444'); g.addColorStop(1, '#f59e0b');
  ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}

function renderBarChart() {
  const chart = document.getElementById('bar-chart');
  if (!chart) return;
  chart.innerHTML = '';
  const hours = [9,10,11,12,13,14,15,16,17,18,19];
  const data  = hours.map(h => ({ h, v: Math.floor(Math.random() * 85) + 10 }));
  const max   = Math.max(...data.map(d => d.v));
  data.forEach(d => {
    const bar = document.createElement('div');
    bar.className = 'bar-item';
    bar.style.height = `${(d.v / max) * 100}%`;
    bar.setAttribute('data-label', `${d.h}h`);
    bar.title = `${d.h}:00 — ${d.v}% demand`;
    chart.appendChild(bar);
  });
}

async function loadRecentActivity() {
  const list = document.getElementById('recent-list');
  if (!list) return;
  try {
    const bookings = await api(`/bookings?studentId=${user.studentId}`);
    if (!bookings.length) { list.innerHTML = '<div class="empty">No recent activity</div>'; return; }
    list.innerHTML = '';
    bookings.slice(0, 6).forEach(b => {
      const row = document.createElement('div');
      row.className = 'recent-row';
      const isGroup = b.type === 'GROUP';
      const dot = b.status === 'CANCELLED' ? 'cancel' : isGroup ? 'group' : 'book';
      row.innerHTML = `
        <div class="recent-dot ${dot}"></div>
        <div class="recent-text">
          <strong>${isGroup ? b.roomNumber : b.seatNumber} · ${isGroup ? 'Group Room' : b.seatType}</strong>
          <span>${b.date} · ${b.startTime} · ${b.durationHours}h</span>
        </div>
        <div class="recent-time">${b.status}</div>`;
      list.appendChild(row);
    });
  } catch { list.innerHTML = '<div class="empty">Could not load activity</div>'; }
}

// ══════════════════════════════════
// SEAT MAP
// ══════════════════════════════════
let selectedSeat = null;

async function renderSeats(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Seat Map</h1>
      <p class="page-sub">Click an available seat to select it, then book directly.</p>
    </div>
    <div class="filter-row">
      <button class="seg-btn active" data-type="ALL">All</button>
      <button class="seg-btn" data-type="QUIET">Quiet</button>
      <button class="seg-btn" data-type="COMPUTER">Computer</button>
      <button class="seg-btn" data-type="WINDOW">Window</button>
    </div>
    <div class="seat-legend">
      <div class="legend-item"><div class="legend-swatch available"></div> Available</div>
      <div class="legend-item"><div class="legend-swatch occupied"></div> Occupied</div>
      <div class="legend-item"><div class="legend-swatch selected"></div> Selected</div>
    </div>
    <div id="seat-map-area"></div>
    <div class="action-bar hidden" id="action-bar">
      <span class="selected-label">Selected: <strong id="selected-label">—</strong></span>
      <div style="display:flex;gap:8px">
        <button class="btn-ghost" onclick="clearSeatSelection()">Clear</button>
        <button class="btn-primary" onclick="goBookSelected()">Book This Seat →</button>
      </div>
    </div>`;

  el.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSeatMap(btn.dataset.type);
    });
  });

  await loadSeatMap('ALL');
}

async function loadSeatMap(type = 'ALL') {
  const area = document.getElementById('seat-map-area');
  if (!area) return;
  area.innerHTML = '<div class="empty">Loading seats…</div>';
  selectedSeat = null;
  const bar = document.getElementById('action-bar');
  if (bar) bar.classList.add('hidden');

  try {
    const path = type === 'ALL' ? '/seats' : `/seats?type=${type}`;
    const seats = await api(path);
    const zones = [...new Set(seats.map(s => s.zone))].sort();
    area.innerHTML = '';
    zones.forEach(zone => {
      const sec = document.createElement('div');
      sec.className = 'zone-section';
      sec.innerHTML = `<div class="zone-label">Zone ${zone}</div><div class="seat-grid" id="zone-${zone}"></div>`;
      area.appendChild(sec);
      const grid = document.getElementById(`zone-${zone}`);
      seats.filter(s => s.zone === zone).forEach(seat => {
        const btn = document.createElement('button');
        const cls = seat.status === 'AVAILABLE' ? 'available' : 'occupied';
        btn.className = `seat-btn ${cls}`;
        btn.innerHTML = `${seat.seatNumber}<small>${seat.type?.charAt(0) || '?'}</small>`;
        btn.title = `${seat.seatNumber} · ${seat.type} · ${seat.status}`;
        btn.disabled = seat.status !== 'AVAILABLE';
        btn.addEventListener('click', () => selectSeatBtn(seat, btn));
        grid.appendChild(btn);
      });
    });
  } catch { area.innerHTML = '<div class="empty">Could not load seats</div>'; }
}

function selectSeatBtn(seat, btn) {
  document.querySelectorAll('.seat-btn.selected').forEach(b => {
    b.classList.remove('selected'); b.classList.add('available');
  });
  btn.classList.remove('available'); btn.classList.add('selected');
  selectedSeat = seat;
  const label = document.getElementById('selected-label');
  if (label) label.textContent = `${seat.seatNumber} (${seat.type})`;
  const bar = document.getElementById('action-bar');
  if (bar) bar.classList.remove('hidden');
}

function clearSeatSelection() {
  document.querySelectorAll('.seat-btn.selected').forEach(b => {
    b.classList.remove('selected'); b.classList.add('available');
  });
  selectedSeat = null;
  const bar = document.getElementById('action-bar');
  if (bar) bar.classList.add('hidden');
}

function goBookSelected() {
  if (!selectedSeat) return;
  sessionStorage.setItem('preselectSeat', JSON.stringify(selectedSeat));
  navigate('book');
}

// ══════════════════════════════════
// BOOK A SEAT
// ══════════════════════════════════
async function renderBook(el) {
  const preselect = JSON.parse(sessionStorage.getItem('preselectSeat') || 'null');
  sessionStorage.removeItem('preselectSeat');

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Book a Seat</h1>
      <p class="page-sub">Reserve your spot in the library.</p>
    </div>
    <div class="form-card">
      <form id="book-form">
        <div class="form-section-title">Your Details</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="bk-name" value="${user.name}" required/>
          </div>
          <div class="form-group">
            <label>Student ID</label>
            <input type="text" id="bk-sid" value="${user.studentId}" required/>
          </div>
        </div>

        <div class="form-section-title" style="margin-top:20px">Seat Preferences</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Seat Type</label>
            <select id="bk-type">
              <option value="QUIET">Quiet Zone</option>
              <option value="COMPUTER">Computer</option>
              <option value="WINDOW">Window</option>
            </select>
          </div>
          <div class="form-group">
            <label>Specific Seat (optional)</label>
            <select id="bk-seat">
              <option value="">Auto-assign best available</option>
            </select>
          </div>
        </div>

        <div class="form-section-title" style="margin-top:20px">Booking Time</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="bk-date" required/>
          </div>
          <div class="form-group">
            <label>Start Time</label>
            <select id="bk-slot" required>
              <option value="">Select time slot</option>
            </select>
          </div>
          <div class="form-group full">
            <label>Duration</label>
            <div class="dur-pills">
              <input type="radio" name="dur" id="d1" value="1" checked class="dur-pill"><label for="d1">1 hour</label>
              <input type="radio" name="dur" id="d2" value="2" class="dur-pill"><label for="d2">2 hours</label>
              <input type="radio" name="dur" id="d3" value="3" class="dur-pill"><label for="d3">3 hours</label>
              <input type="radio" name="dur" id="d4" value="4" class="dur-pill"><label for="d4">4 hours</label>
            </div>
          </div>
        </div>

        <div id="book-error" style="color:var(--red);font-size:0.82rem;margin-top:8px;"></div>
        <div style="display:flex;gap:10px;margin-top:22px">
          <button type="submit" class="btn-primary" id="book-btn">
            <span id="book-btn-text">Confirm Booking</span>
            <div class="spinner hidden" id="book-spin"></div>
          </button>
        </div>
      </form>
    </div>`;

  // Set today as default date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('bk-date').value = today;
  document.getElementById('bk-date').min   = today;

  // Populate time slots
  const slotSel = document.getElementById('bk-slot');
  [9,10,11,12,13,14,15,16,17,18,19].forEach(h => {
    const opt = document.createElement('option');
    opt.value = `${String(h).padStart(2,'0')}:00`;
    opt.textContent = `${String(h).padStart(2,'0')}:00 – ${String(h+1).padStart(2,'0')}:00`;
    slotSel.appendChild(opt);
  });

  // Populate available seats
  try {
    const seats = await api('/seats?status=AVAILABLE');
    const sel = document.getElementById('bk-seat');
    seats.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.seatNumber} — ${s.type}`;
      if (preselect && preselect.id === s.id) opt.selected = true;
      sel.appendChild(opt);
    });
    if (preselect) {
      document.getElementById('bk-type').value = preselect.type;
    }
  } catch {}

  // Form submit
  document.getElementById('book-form').addEventListener('submit', submitBooking);
}

async function submitBooking(e) {
  e.preventDefault();
  const name  = document.getElementById('bk-name').value.trim();
  const sid   = document.getElementById('bk-sid').value.trim();
  const type  = document.getElementById('bk-type').value;
  const seatId = document.getElementById('bk-seat').value;
  const date  = document.getElementById('bk-date').value;
  const slot  = document.getElementById('bk-slot').value;
  const dur   = document.querySelector('input[name="dur"]:checked')?.value;
  const errEl = document.getElementById('book-error');
  const btn   = document.getElementById('book-btn');
  const spin  = document.getElementById('book-spin');

  errEl.textContent = '';
  if (!slot) { errEl.textContent = 'Please select a time slot.'; return; }

  btn.disabled = true; spin.classList.remove('hidden');
  document.getElementById('book-btn-text').textContent = 'Booking…';

  try {
    const data = await api('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        studentName: name, studentId: sid,
        seatType: type, seatId: seatId ? parseInt(seatId) : null,
        date, startTime: slot, durationHours: parseInt(dur),
      }),
    });
    showModal('Seat Booked! 🎉', 'Your seat is confirmed.',
      `Booking ID : ${data.bookingId}\nSeat       : ${data.seatNumber || 'Auto-assigned'}\nDate       : ${date}\nTime       : ${slot}\nDuration   : ${dur}h\nStudent    : ${sid}`);
    toast('Booking confirmed!', 'success');
    e.target.reset();
    document.getElementById('bk-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('bk-name').value = user.name;
    document.getElementById('bk-sid').value  = user.studentId;
  } catch(err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false; spin.classList.add('hidden');
    document.getElementById('book-btn-text').textContent = 'Confirm Booking';
  }
}

// ══════════════════════════════════
// GROUP ROOMS
// ══════════════════════════════════
let selectedRoom = null;

async function renderRooms(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Group Rooms</h1>
      <p class="page-sub">Book a study room for your team. Click an available room to book.</p>
    </div>
    <div class="rooms-grid" id="rooms-grid">
      <div class="empty">Loading rooms…</div>
    </div>
    <div id="room-form-wrap" style="display:none;margin-top:24px">
      <div class="form-card">
        <h3 id="room-form-title" style="font-family:'DM Serif Display',serif;font-size:1.1rem;margin-bottom:20px">Book Room</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Your Name</label>
            <input type="text" id="rm-name" value="${user.name}"/>
          </div>
          <div class="form-group">
            <label>Student ID</label>
            <input type="text" id="rm-sid" value="${user.studentId}"/>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="rm-date"/>
          </div>
          <div class="form-group">
            <label>Time Slot</label>
            <select id="rm-slot">
              <option value="">Select slot</option>
            </select>
          </div>
          <div class="form-group">
            <label>Number of People</label>
            <input type="number" id="rm-people" min="1" max="20" value="2"/>
          </div>
          <div class="form-group">
            <label>Duration (hours)</label>
            <select id="rm-dur">
              <option value="1">1 hour</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
            </select>
          </div>
        </div>
        <div id="room-error" style="color:var(--red);font-size:0.82rem;margin-top:10px"></div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn-primary" onclick="submitRoomBooking()">Confirm Room</button>
          <button class="btn-ghost" onclick="closeRoomForm()">Cancel</button>
        </div>
      </div>
    </div>`;

  await loadRoomsGrid();
}

async function loadRoomsGrid() {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;
  try {
    const rooms = await api('/rooms');
    grid.innerHTML = '';
    rooms.forEach(room => {
      const card = document.createElement('div');
      const cls  = room.status === 'AVAILABLE' ? 'available' : 'occupied';
      card.className = `room-card ${cls}`;
      card.innerHTML = `
        <div class="room-card-top">
          <div class="room-id">${room.roomNumber}</div>
          <div class="room-badge ${cls}">${room.status}</div>
        </div>
        <div class="room-details">
          <div class="room-detail">👥 Up to ${room.capacity} people</div>
          <div class="room-detail">🏢 Floor ${room.floor}</div>
          <div class="room-detail">✨ ${(room.amenities || []).join(', ')}</div>
        </div>`;
      if (room.status === 'AVAILABLE') {
        card.addEventListener('click', () => openRoomForm(room));
      }
      grid.appendChild(card);
    });
  } catch { grid.innerHTML = '<div class="empty">Could not load rooms</div>'; }
}

function openRoomForm(room) {
  selectedRoom = room;
  document.getElementById('room-form-title').textContent =
    `Book ${room.roomNumber} — up to ${room.capacity} people`;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('rm-date').value = today;
  document.getElementById('rm-date').min   = today;
  document.getElementById('rm-people').max = room.capacity;
  const slotSel = document.getElementById('rm-slot');
  slotSel.innerHTML = '<option value="">Select slot</option>';
  [9,10,11,12,13,14,15,16,17,18,19].forEach(h => {
    const opt = document.createElement('option');
    opt.value = `${String(h).padStart(2,'0')}:00`;
    opt.textContent = `${String(h).padStart(2,'0')}:00 – ${String(h+1).padStart(2,'0')}:00`;
    slotSel.appendChild(opt);
  });
  document.getElementById('room-form-wrap').style.display = 'block';
  document.getElementById('room-form-wrap').scrollIntoView({ behavior: 'smooth' });
}

function closeRoomForm() {
  document.getElementById('room-form-wrap').style.display = 'none';
  selectedRoom = null;
}

async function submitRoomBooking() {
  const name    = document.getElementById('rm-name').value.trim();
  const sid     = document.getElementById('rm-sid').value.trim();
  const date    = document.getElementById('rm-date').value;
  const slot    = document.getElementById('rm-slot').value;
  const people  = parseInt(document.getElementById('rm-people').value);
  const dur     = parseInt(document.getElementById('rm-dur').value);
  const errEl   = document.getElementById('room-error');

  errEl.textContent = '';
  if (!slot || !date) { errEl.textContent = 'Fill all fields.'; return; }

  try {
    const data = await api('/room-bookings', {
      method: 'POST',
      body: JSON.stringify({
        studentName: name, studentId: sid, roomId: selectedRoom.id,
        date, startTime: slot, numberOfPeople: people, durationHours: dur,
      }),
    });
    showModal('Room Booked! 🏠', `${selectedRoom.roomNumber} is reserved.`,
      `Booking ID : ${data.bookingId}\nRoom       : ${selectedRoom.roomNumber}\nDate       : ${date}\nTime       : ${slot}\nDuration   : ${dur}h\nPeople     : ${people}`);
    toast('Room booked!', 'success');
    closeRoomForm();
    await loadRoomsGrid();
  } catch(err) { errEl.textContent = err.message; }
}

// ══════════════════════════════════
// MY BOOKINGS
// ══════════════════════════════════
async function renderMyBookings(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">My Bookings</h1>
      <p class="page-sub">All your seat and room reservations.</p>
    </div>
    <div class="bookings-list" id="bookings-list">
      <div class="empty">Loading your bookings…</div>
    </div>`;

  await loadBookings();
}

async function loadBookings() {
  const list = document.getElementById('bookings-list');
  if (!list) return;
  try {
    const bookings = await api(`/bookings?studentId=${user.studentId}`);
    if (!bookings.length) { list.innerHTML = '<div class="empty">No bookings yet. Go book a seat!</div>'; return; }
    list.innerHTML = '';
    bookings.forEach(b => {
      const card = document.createElement('div');
      card.className = 'booking-card';
      const isGroup = b.type === 'GROUP';
      const canCancel = b.status === 'UPCOMING' || b.status === 'ACTIVE';
      card.innerHTML = `
        <div class="booking-type-tag ${isGroup ? 'group' : 'seat'}">${isGroup ? 'Room' : 'Seat'}</div>
        <div class="booking-info">
          <strong>${isGroup ? b.roomNumber : b.seatNumber} · ${isGroup ? 'Group Room' : b.seatType}</strong>
          <span>${b.date} · ${b.startTime} · ${b.durationHours}h</span>
        </div>
        <div class="booking-meta">
          <span class="booking-id">${b.bookingId}</span>
          <span class="booking-status ${b.status}">${b.status}</span>
          ${canCancel ? `<button class="cancel-btn" data-id="${b.bookingId}">Cancel</button>` : ''}
        </div>`;
      list.appendChild(card);
    });
    list.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => cancelBooking(btn.dataset.id));
    });
  } catch { list.innerHTML = '<div class="empty">Could not load bookings</div>'; }
}

async function cancelBooking(id) {
  if (!confirm(`Cancel booking ${id}?`)) return;
  try {
    const res = await api(`/bookings/${id}`, { method: 'DELETE' });
    toast(res.message || 'Booking cancelled.', 'info');
    await loadBookings();
  } catch(err) { toast(err.message, 'error'); }
}

// ══════════════════════════════════
// TIME SLOTS
// ══════════════════════════════════
async function renderSlots(el) {
  const today = new Date().toISOString().split('T')[0];
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Time Slots</h1>
      <p class="page-sub">See seat availability across all time slots for a given day.</p>
    </div>
    <div class="controls-row">
      <input type="date" id="slots-date" class="date-input" value="${today}"/>
      <button class="btn-primary" onclick="loadSlotData()">Load Slots</button>
    </div>
    <div class="slots-grid" id="slots-grid">
      <div class="empty">Select a date and click Load Slots.</div>
    </div>`;

  await loadSlotData();
}

async function loadSlotData() {
  const date = document.getElementById('slots-date')?.value;
  const grid = document.getElementById('slots-grid');
  if (!grid || !date) return;
  grid.innerHTML = '<div class="empty">Loading…</div>';
  try {
    const slots = await api(`/slots?date=${date}`);
    grid.innerHTML = '';
    slots.forEach(slot => {
      const pct = Math.round((slot.occupiedSeats / slot.totalSeats) * 100) || 0;
      const color = pct < 40 ? 'var(--green)' : pct < 75 ? 'var(--amber)' : 'var(--red)';
      const card = document.createElement('div');
      card.className = 'slot-card';
      card.innerHTML = `
        <div class="slot-time">${slot.startTime} – ${slot.endTime}</div>
        <div class="slot-bar-wrap">
          <div class="slot-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="slot-counts">
          <span class="slot-avail" style="color:${color}">✓ ${slot.availableSeats} free</span>
          <span style="color:var(--text2)">${slot.occupiedSeats}/${slot.totalSeats}</span>
        </div>`;
      grid.appendChild(card);
    });
  } catch { grid.innerHTML = '<div class="empty">Could not load slots</div>'; }
}

// ── INIT ──
navigate('dashboard');
