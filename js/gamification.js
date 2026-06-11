/* =====================================================
   EDUQUEST BACHILLERATO — gamification.js
   XP, Niveles, Insignias, Logros, Confetti, Level Up
   ===================================================== */

const EQ_Gamification = (() => {

  /* ─── NIVEL ─── */
  const getLevelInfo = (xp) => {
    const levels = EQ_DATA.levels;
    let current = levels[0];
    for (const l of levels) {
      if (xp >= l.minXP) current = l;
    }
    const idx = levels.indexOf(current);
    const next = levels[idx + 1] || null;
    const progress = next
      ? ((xp - current.minXP) / (next.minXP - current.minXP)) * 100
      : 100;
    return { ...current, nextLevel: next, progress: Math.min(100, progress), xpInLevel: xp - current.minXP, xpToNext: next ? next.minXP - xp : 0 };
  };

  /* ─── AÑADIR XP ─── */
  const addXP = (userId, amount, subject) => {
    const user = EQ_Storage.findUserById(userId);
    if (!user) return null;

    const oldLevel = getLevelInfo(user.xp);
    const newXP = user.xp + amount;
    const newLevel = getLevelInfo(newXP);

    // Update stats
    const patch = {
      xp: newXP,
      level: newLevel.level,
      stats: {
        totalXP: (user.stats?.totalXP || 0) + amount,
        xpBySubject: {
          ...user.stats.xpBySubject,
          [subject]: (user.stats.xpBySubject[subject] || 0) + amount,
        },
      },
    };

    const updated = EQ_Storage.updateUser(userId, patch);

    // Show XP animation
    showXPFloat(amount);

    // Check level up
    if (newLevel.level > oldLevel.level) {
      setTimeout(() => showLevelUp(newLevel), 800);
    }

    // Check achievements
    setTimeout(() => checkAchievements(userId), 500);

    return updated;
  };

  /* ─── REGISTRAR QUIZ ─── */
  const recordQuizResult = (userId, { subject, score, total, correct, isPerfect, fastCorrect }) => {
    const user = EQ_Storage.findUserById(userId);
    if (!user) return;

    const xpGained = calculateXP(correct, total, isPerfect, fastCorrect);

    // Update stats
    EQ_Storage.updateUser(userId, {
      stats: {
        totalQuizzes:   (user.stats.totalQuizzes || 0) + 1,
        totalQuestions: (user.stats.totalQuestions || 0) + total,
        totalCorrect:   (user.stats.totalCorrect || 0) + correct,
        perfectQuizzes: (user.stats.perfectQuizzes || 0) + (isPerfect ? 1 : 0),
        fastCorrect:    (user.stats.fastCorrect || 0) + fastCorrect,
        quizzesBySubject: {
          ...user.stats.quizzesBySubject,
          [subject]: (user.stats.quizzesBySubject[subject] || 0) + 1,
        },
        progressBySubject: {
          ...user.stats.progressBySubject,
          [subject]: Math.min(100, (user.stats.progressBySubject[subject] || 0) + (correct / total * 10)),
        },
      },
    });

    // Add history
    EQ_Storage.addHistoryEntry(userId, {
      subject, score, total, correct, isPerfect, xpGained,
      mode: 'quiz',
      subjectName: EQ_DATA.subjects[subject]?.name || subject,
    });

    // Add XP
    addXP(userId, xpGained, subject);

    return xpGained;
  };

  /* ─── CALCULAR XP ─── */
  const calculateXP = (correct, total, isPerfect, fastCorrect) => {
    let base = correct * 20;
    let bonus = 0;
    if (isPerfect) bonus += 50;
    if (fastCorrect > 0) bonus += fastCorrect * 5;
    const accuracy = correct / total;
    if (accuracy >= 0.8) bonus += 20;
    return base + bonus;
  };

  /* ─── VERIFICAR LOGROS ─── */
  const checkAchievements = (userId) => {
    const user = EQ_Storage.findUserById(userId);
    if (!user) return;

    const stats = { ...user.stats, level: user.level, streak: user.streak, totalXP: user.xp };
    const unlocked = [];

    for (const ach of EQ_DATA.achievements) {
      if (user.achievements.includes(ach.id)) continue;
      try {
        if (ach.condition(stats)) {
          unlocked.push(ach);
        }
      } catch {}
    }

    if (unlocked.length > 0) {
      const newAchievements = [...user.achievements, ...unlocked.map(a => a.id)];
      EQ_Storage.updateUser(userId, { achievements: newAchievements });
      unlocked.forEach((a, i) => {
        setTimeout(() => showAchievementToast(a), i * 2000);
      });
    }
  };

  /* ─── XP FLOAT ANIMATION ─── */
  const showXPFloat = (amount) => {
    const el = document.createElement('div');
    el.className = 'xp-float-indicator';
    el.innerHTML = `⭐ +${amount} XP`;
    el.style.left = (window.innerWidth / 2 - 60) + 'px';
    el.style.top = (window.innerHeight / 2) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  };

  /* ─── LEVEL UP OVERLAY ─── */
  const showLevelUp = (levelInfo) => {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    overlay.innerHTML = `
      <div class="level-up-card">
        <div class="level-up-stars">⭐</div>
        <div class="level-up-badge">${levelInfo.level}</div>
        <div class="level-up-title">¡Subiste de nivel!</div>
        <div class="level-up-name">${levelInfo.icon} ${levelInfo.name}</div>
        <button class="btn btn-primary" onclick="this.closest('.level-up-overlay').remove(); launchConfetti();">
          ¡Increíble! 🎉
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    launchConfetti();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  };

  /* ─── ACHIEVEMENT TOAST ─── */
  const showAchievementToast = (ach) => {
    EQ_UI.showToast({
      type: 'xp',
      icon: ach.icon,
      title: `¡Logro desbloqueado!`,
      message: ach.name,
      duration: 4000,
    });
  };

  /* ─── CONFETTI ─── */
  const launchConfetti = () => {
    const canvas = document.getElementById('confetti-canvas') || createConfettiCanvas();
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -10,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      r: Math.random() * Math.PI * 2,
      vy: Math.random() * 4 + 2,
      vx: (Math.random() - 0.5) * 3,
      vr: (Math.random() - 0.5) * 0.2,
      color: ['#2563EB','#7C3AED','#10B981','#F59E0B','#EF4444','#EC4899','#60A5FA'][Math.floor(Math.random()*7)],
    }));

    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (particles.some(p => p.y < canvas.height)) {
        frame = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    draw();
    setTimeout(() => { cancelAnimationFrame(frame); ctx.clearRect(0,0,canvas.width,canvas.height); }, 4000);
  };

  const createConfettiCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    return canvas;
  };

  /* ─── FORMAT XP ─── */
  const formatXP = (xp) => xp >= 1000 ? `${(xp/1000).toFixed(1)}k` : xp.toString();

  /* ─── ACCURACY ─── */
  const getAccuracy = (user) => {
    const { totalQuestions, totalCorrect } = user.stats;
    if (!totalQuestions) return 0;
    return Math.round((totalCorrect / totalQuestions) * 100);
  };

  return {
    getLevelInfo, addXP, recordQuizResult,
    calculateXP, checkAchievements,
    showXPFloat, showLevelUp, launchConfetti,
    formatXP, getAccuracy,
  };
})();

window.EQ_Gamification = EQ_Gamification;
window.launchConfetti = EQ_Gamification.launchConfetti;
