/* =====================================================
   EDUQUEST BACHILLERATO — ranking.js
   Ranking global, por materia y posición del usuario
   ===================================================== */

const EQ_Ranking = (() => {

  /* ─── GET ALL ENTRIES ─── */
  const getAllEntries = () => {
    const realUsers = EQ_Storage.getUsers().map(u => ({
      id:     u.id,
      name:   u.name,
      avatar: EQ_DATA.avatars[u.avatar] || '🧑‍💻',
      xp:     u.xp,
      level:  u.level,
      streak: u.streak,
      isReal: true,
    }));

    const demo = EQ_DATA.demoUsers.map((u, i) => ({
      id:     `demo_${i}`,
      name:   u.name,
      avatar: u.avatar,
      xp:     u.xp,
      level:  u.level,
      streak: u.streak,
      isReal: false,
    }));

    // Merge: replace demo if real user has same or more XP
    const all = [...realUsers, ...demo];

    // Sort by XP desc
    all.sort((a, b) => b.xp - a.xp);

    // Add rank
    return all.map((u, i) => ({ ...u, rank: i + 1 }));
  };

  /* ─── RENDER RANKING ─── */
  const render = (containerId, currentUserId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entries = getAllEntries();
    container.innerHTML = '';

    entries.slice(0, 15).forEach(entry => {
      const isMe = entry.id === currentUserId;
      const levelInfo = EQ_Gamification.getLevelInfo(entry.xp);

      const card = document.createElement('div');
      card.className = `rank-card ${isMe ? 'is-me' : ''} will-animate`;
      card.style.animationDelay = `${(entry.rank - 1) * 0.06}s`;

      let rankClass = '';
      if (entry.rank === 1) rankClass = 'gold';
      else if (entry.rank === 2) rankClass = 'silver';
      else if (entry.rank === 3) rankClass = 'bronze';

      const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank;

      card.innerHTML = `
        <div class="rank-position ${rankClass}">${typeof medal === 'string' ? medal : '#' + medal}</div>
        <div class="rank-avatar">${entry.avatar}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-heading);font-weight:700;font-size:0.95rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${entry.name} ${isMe ? '<span class="tag tag-primary" style="font-size:0.68rem">Tú</span>' : ''}
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">
            ${levelInfo.icon} ${levelInfo.name} · 🔥 ${entry.streak} días
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="xp-chip">⭐ ${entry.xp.toLocaleString('es')}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">Nivel ${entry.level}</div>
        </div>
      `;

      container.appendChild(card);
    });

    // Show current user position if outside top 15
    const currentEntry = entries.find(e => e.id === currentUserId);
    if (currentEntry && currentEntry.rank > 15) {
      const sep = document.createElement('div');
      sep.innerHTML = '<div class="divider"></div><div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:8px">... más estudiantes ...</div><div class="divider"></div>';
      container.appendChild(sep);

      // Show current user
      const card = document.createElement('div');
      card.className = 'rank-card is-me will-animate';
      const levelInfo = EQ_Gamification.getLevelInfo(currentEntry.xp);
      card.innerHTML = `
        <div class="rank-position">#${currentEntry.rank}</div>
        <div class="rank-avatar">${currentEntry.avatar}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-heading);font-weight:700;font-size:0.95rem;color:var(--text-primary)">
            ${currentEntry.name} <span class="tag tag-primary" style="font-size:0.68rem">Tú</span>
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted)">${levelInfo.icon} ${levelInfo.name}</div>
        </div>
        <div style="text-align:right">
          <div class="xp-chip">⭐ ${currentEntry.xp.toLocaleString('es')}</div>
        </div>
      `;
      container.appendChild(card);
    }

    // Animate items
    requestAnimationFrame(() => {
      container.querySelectorAll('.will-animate').forEach(el => el.classList.add('animated'));
    });
  };

  /* ─── TOP 3 ─── */
  const renderPodium = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entries = getAllEntries().slice(0, 3);
    const medals  = ['🥇', '🥈', '🥉'];
    const heights  = ['160px', '130px', '110px'];
    const order    = [1, 0, 2]; // 2nd, 1st, 3rd

    container.innerHTML = `<div style="display:flex;align-items:flex-end;justify-content:center;gap:16px;padding:24px 0">
      ${order.map(i => {
        const e = entries[i];
        if (!e) return '';
        const levelInfo = EQ_Gamification.getLevelInfo(e.xp);
        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;animation:fadeInUp 0.5s ${i * 0.1}s ease both">
            <div style="font-size:2rem">${e.avatar}</div>
            <div style="font-family:var(--font-heading);font-weight:700;font-size:0.9rem;color:var(--text-primary);text-align:center;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.name}</div>
            <div class="xp-chip" style="font-size:0.8rem">⭐ ${e.xp.toLocaleString('es')}</div>
            <div style="
              width:80px;height:${heights[i]};
              background:${i===0 ? 'linear-gradient(180deg,#F59E0B,#D97706)' : i===1 ? 'linear-gradient(180deg,#94A3B8,#64748B)' : 'linear-gradient(180deg,#CD7F32,#B45309)'};
              border-radius:12px 12px 0 0;
              display:flex;align-items:center;justify-content:center;
              font-size:2rem;box-shadow:0 8px 24px rgba(0,0,0,0.2)">
              ${medals[i]}
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
  };

  return { getAllEntries, render, renderPodium };
})();

window.EQ_Ranking = EQ_Ranking;
