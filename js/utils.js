/**
 * EduTrack — Utility Functions
 * Shared helpers: toast, clock, theme, chart helpers, export
 */

// ── Theme ────────────────────────────────────────────────
const Theme = {
  get()  { return localStorage.getItem('edutrack_theme') || 'light'; },
  set(t) { localStorage.setItem('edutrack_theme', t); document.documentElement.setAttribute('data-theme', t); },
  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },
  init() {
    this.set(this.get());
    const btn = document.getElementById('themeToggle');
    if (btn) {
      this.updateIcon(btn);
      btn.addEventListener('click', () => { this.toggle(); this.updateIcon(btn); });
    }
  },
  updateIcon(btn) {
    const isDark = this.get() === 'dark';
    btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  },
};

// ── Clock ────────────────────────────────────────────────
const Clock = {
  interval: null,
  start(el) {
    const tick = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const date = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      if (el) el.innerHTML = `<strong>${time}</strong>&nbsp;&nbsp;${date}`;
    };
    tick();
    this.interval = setInterval(tick, 1000);
  },
  stop() { if (this.interval) clearInterval(this.interval); },
};

// ── Toast ────────────────────────────────────────────────
const Toast = {
  container: null,
  init() {
    if (!document.getElementById('toastContainer')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toastContainer';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toastContainer');
    }
  },
  show(title, message = '', type = 'success', duration = 4000) {
    if (!this.container) this.init();
    const icons = { success: 'check', error: 'times', warning: 'exclamation', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon"><i class="fas fa-${icons[type] || 'info'}"></i></div>
      <div class="toast-body"><h5>${title}</h5>${message ? `<p>${message}</p>` : ''}</div>
      <button class="toast-close" onclick="Toast.remove(this.parentElement)">&times;</button>`;
    this.container.appendChild(toast);
    setTimeout(() => this.remove(toast), duration);
    return toast;
  },
  remove(el) {
    if (!el) return;
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  },
  success(title, msg)  { this.show(title, msg, 'success'); },
  error(title, msg)    { this.show(title, msg, 'error'); },
  warning(title, msg)  { this.show(title, msg, 'warning'); },
  info(title, msg)     { this.show(title, msg, 'info'); },
};

// ── Modal ────────────────────────────────────────────────
const Modal = {
  open(id)  {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); document.body.style.overflow = ''; }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.classList.add('hidden');
    });
    document.body.style.overflow = '';
  },
};

// ── Sidebar ──────────────────────────────────────────────
const Sidebar = {
  init() {
    const hamburger = document.getElementById('hamburger');
    const overlay   = document.getElementById('sidebarOverlay');
    const sidebar   = document.getElementById('sidebar');
    if (hamburger) hamburger.addEventListener('click', () => this.toggle());
    if (overlay)   overlay.addEventListener('click', () => this.close());
  },
  toggle() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebarOverlay')?.classList.toggle('open');
  },
  close() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('open');
  },
};

// ── Nav Tabs ─────────────────────────────────────────────
function initTabs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      container.querySelector(`#${target}`)?.classList.add('active');
    });
  });
}

// ── Format Date ──────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ── Initials ─────────────────────────────────────────────
function initials(name) {
  return (name || 'U').split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// ── Percentage color class ────────────────────────────────
function pctClass(pct) {
  if (pct >= 75) return 'high';
  if (pct >= 50) return 'mid';
  return 'low';
}

// ── Export CSV ───────────────────────────────────────────
function exportCSV(rows, filename) {
  if (!rows || rows.length === 0) { Toast.warning('No data', 'Nothing to export.'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r =>
    headers.map(h => {
      const val = String(r[h] ?? '').replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  )].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`;
  a.click(); URL.revokeObjectURL(url);
  Toast.success('Exported!', `${filename}.csv has been downloaded.`);
}

// ── Export PDF (print) ────────────────────────────────────
function exportPDF() {
  window.print();
}

// ── Auth guard ───────────────────────────────────────────
function requireAuth(type) {
  const session = DB.getSession();
  if (!session) { window.location.href = 'index.html'; return null; }
  if (session.type !== type) { window.location.href = 'index.html'; return null; }
  const user = DB.getCurrentUser();
  if (!user) { DB.clearSession(); window.location.href = 'index.html'; return null; }
  return user;
}

// ── Init sidebar navigation ──────────────────────────────
function initSidebarNav(activePage) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (!page) return;
      // Show corresponding section
      document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
      const section = document.getElementById(`section-${page}`);
      if (section) section.classList.remove('hidden');
      // Update active nav
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      // Update topbar title
      const topTitle = document.getElementById('topbarTitle');
      if (topTitle) topTitle.textContent = item.querySelector('span')?.textContent || '';
      Sidebar.close();
    });
  });
}
