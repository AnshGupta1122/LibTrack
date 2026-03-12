const API = '/api';

// ── Toast ──
const toastEl = Object.assign(document.createElement('div'), { id: 'toast', className: 'toast' });
document.body.appendChild(toastEl);
function toast(msg, type = 'info') {
  toastEl.textContent = msg;
  toastEl.className = `toast ${type} show`;
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.className = 'toast', 3200);
}

// ── Tab switching ──
function showTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('register-form').classList.toggle('hidden', isLogin);
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('tab-slider').style.transform = isLogin ? 'translateX(0)' : 'translateX(100%)';
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
}

// ── Password toggle ──
function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.5';
}

// ── API helper ──
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Server error');
  return data;
}

// ── LOGIN ──
async function handleLogin(e) {
  e.preventDefault();
  const sid  = document.getElementById('l-sid').value.trim();
  const pass = document.getElementById('l-pass').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');
  const spin  = document.getElementById('login-spin');

  errEl.textContent = '';
  btn.disabled = true;
  spin.classList.remove('hidden');

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ studentId: sid, password: pass }),
    });

    // Store session
    sessionStorage.setItem('user', JSON.stringify({
      studentId: data.studentId,
      name:      data.name,
      email:     data.email,
      course:    data.course,
    }));

    toast(`Welcome back, ${data.name}! 👋`, 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 800);
  } catch (err) {
    errEl.textContent = err.message;
    btn.disabled = false;
    spin.classList.add('hidden');
  }
}

// ── REGISTER ──
async function handleRegister(e) {
  e.preventDefault();
  const name   = document.getElementById('r-name').value.trim();
  const sid    = document.getElementById('r-sid').value.trim();
  const email  = document.getElementById('r-email').value.trim();
  const phone  = document.getElementById('r-phone').value.trim();
  const course = document.getElementById('r-course').value.trim();
  const pass   = document.getElementById('r-pass').value;
  const errEl  = document.getElementById('register-error');
  const btn    = document.getElementById('register-btn');
  const spin   = document.getElementById('register-spin');

  errEl.textContent = '';

  if (pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (!/^\d{10}$/.test(phone)) { errEl.textContent = 'Enter a valid 10-digit phone number.'; return; }

  btn.disabled = true;
  spin.classList.remove('hidden');

  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, studentId: sid, email, phone, course, password: pass }),
    });
    toast('Account created! Please sign in.', 'success');
    setTimeout(() => showTab('login'), 1200);
    document.getElementById('register-form').reset();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    spin.classList.add('hidden');
  }
}
