/* =====================================================
   EDUQUEST BACHILLERATO — ui.js
   Sidebar, Topbar, Toast, Navegación, Tema, Animaciones UI
   ===================================================== */

const EQ_UI = (() => {

  /* ─── TOAST ─── */
  const showToast = ({ type = 'info', icon, title, message, duration = 3000 }) => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icon || getToastIcon(type)}</span>
      <div class="toast-text">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  const getToastIcon = (type) => {
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️', xp:'⭐' };
    return icons[type] || '📢';
  };

  /* ─── SIDEBAR ─── */
  const initSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger-btn');

    if (!sidebar) return;

    hamburger?.addEventListener('click', () => toggleSidebar());
    overlay?.addEventListener('click', () => closeSidebar());

    // Active link
    const page = window.location.pathname.split('/').pop();
    const links = sidebar.querySelectorAll('.nav-item[data-page]');
    links.forEach(link => {
      if (link.dataset.page === page) link.classList.add('active');
    });

    // Touch swipe to close
    let touchStartX = 0;
    sidebar.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
    sidebar.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientX - touchStartX < -80) closeSidebar();
    });
  };

  const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
  };

  const closeSidebar = () => {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  };

  /* ─── POPULATE SIDEBAR USER ─── */
  const populateSidebar = (user) => {
    if (!user) return;
    const levelInfo = EQ_Gamification.getLevelInfo(user.xp);

    const nameEl  = document.getElementById('sb-user-name');
    const levelEl = document.getElementById('sb-user-level');
    const xpEl    = document.getElementById('sb-user-xp');
    const avatarEl = document.getElementById('sb-user-avatar');
    const xpFill  = document.getElementById('sb-xp-fill');
    const xpVal   = document.getElementById('sb-xp-val');
    const xpText  = document.getElementById('sb-xp-text');

    if (nameEl)  nameEl.textContent  = user.name;
    if (levelEl) levelEl.textContent = `Nivel ${levelInfo.level} · ${levelInfo.name}`;
    if (xpEl)    xpEl.textContent    = `${user.xp} XP`;
    if (avatarEl) avatarEl.textContent = EQ_DATA.avatars[user.avatar] || '🧑‍💻';
    if (xpFill) xpFill.style.width   = `${levelInfo.progress}%`;
    if (xpVal)  xpVal.textContent    = `${user.xp} XP`;
    if (xpText) xpText.textContent   = levelInfo.nextLevel
      ? `Nivel ${levelInfo.level + 1} en ${levelInfo.xpToNext} XP`
      : '¡Nivel máximo alcanzado!';
  };

  /* ─── POPULATE TOPBAR ─── */
  const populateTopbar = (user) => {
    if (!user) return;
    const xpChip    = document.getElementById('topbar-xp');
    const streakChip = document.getElementById('topbar-streak');
    if (xpChip)    xpChip.textContent    = `⭐ ${user.xp} XP`;
    if (streakChip) streakChip.textContent = `🔥 ${user.streak} días`;
  };

  /* ─── THEME ─── */
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('eq_theme', theme);
  };

  const loadTheme = () => {
    const settings = EQ_Storage.getSettings();
    applyTheme(settings.theme || 'light');
  };

  /* ─── ANIMATE ON SCROLL ─── */
  const initScrollReveal = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.will-animate').forEach(el => observer.observe(el));
  };

  /* ─── STAGGER CHILDREN ─── */
  const staggerChildren = (parentSelector, childSelector = '.card, .stat-card, .subject-card, .achievement-card') => {
    const parent = document.querySelector(parentSelector);
    if (!parent) return;
    const children = parent.querySelectorAll(childSelector);
    children.forEach((child, i) => {
      child.style.animationDelay = `${i * 0.08}s`;
      child.classList.add('will-animate');
    });
    // Trigger immediately
    requestAnimationFrame(() => {
      children.forEach(child => child.classList.add('animated'));
    });
  };

  /* ─── RIPPLE ─── */
  const addRipple = (el) => {
    el.classList.add('ripple-container');
    el.addEventListener('click', (e) => {
      const rect = el.getBoundingClientRect();
      const r = document.createElement('span');
      r.className = 'ripple-effect';
      const size = Math.max(rect.width, rect.height);
      r.style.width = r.style.height = size + 'px';
      r.style.left = (e.clientX - rect.left - size / 2) + 'px';
      r.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
      el.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  };

  /* ─── PROGRESS BAR ─── */
  const animateProgress = (el, pct, delay = 0) => {
    if (!el) return;
    el.style.width = '0%';
    setTimeout(() => { el.style.width = pct + '%'; }, delay + 100);
  };

  /* ─── COUNTER ─── */
  const animateCounter = (el, target, duration = 1000) => {
    if (!el) return;
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      el.textContent = Math.round(target * eased).toLocaleString('es');
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  };

  /* ─── MODAL ─── */
  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };
  const closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };
  const initModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });
    document.querySelectorAll('[data-open-modal]').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.openModal));
    });
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
      }
    });
  };

  /* ─── CONFIRM DIALOG ─── */
  const confirm = (message, onConfirm) => {
    const existing = document.getElementById('eq-confirm-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'eq-confirm-modal';
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-title">⚠️ Confirmar acción</div>
        <p class="modal-desc">${message}</p>
        <div style="display:flex;gap:12px;justify-content:flex-end">
          <button class="btn btn-ghost" id="eq-confirm-cancel">Cancelar</button>
          <button class="btn btn-danger" id="eq-confirm-ok">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('eq-confirm-cancel').onclick = () => modal.remove();
    document.getElementById('eq-confirm-ok').onclick = () => { modal.remove(); onConfirm(); };
  };

  /* ─── LOGOUT BUTTON ─── */
  const initLogout = () => {
    document.querySelectorAll('[data-logout]').forEach(btn => {
      btn.addEventListener('click', () => {
        confirm('¿Seguro que deseas cerrar sesión?', () => EQ_Auth.logout());
      });
    });
  };

  /* ─── INIT ALL ─── */
  const init = (user) => {
    loadTheme();
    initSidebar();
    initModals();
    initLogout();
    initScrollReveal();
    if (user) {
      populateSidebar(user);
      populateTopbar(user);
    }
    // Ripple on all .btn
    document.querySelectorAll('.btn').forEach(addRipple);
  };

  return {
    showToast, initSidebar, toggleSidebar, closeSidebar,
    populateSidebar, populateTopbar,
    applyTheme, loadTheme,
    initScrollReveal, staggerChildren, animateProgress, animateCounter,
    addRipple, openModal, closeModal, initModals, confirm, initLogout,
    init,
  };
})();

window.EQ_UI = EQ_UI;
