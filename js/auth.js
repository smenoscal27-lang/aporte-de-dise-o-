/* =====================================================
   EDUQUEST BACHILLERATO — auth.js
   Login, Registro, Sesión, Protección de rutas
   ===================================================== */

const EQ_Auth = (() => {

  /* Rutas protegidas (requieren login) */
  const PROTECTED = ['dashboard.html','profile.html','subjects.html','subject-detail.html','quiz.html','ranking.html','achievements.html','settings.html'];

  /* Rutas públicas (redirigen si ya hay sesión) */
  const PUBLIC_ONLY = ['login.html','register.html'];

  /* ─── GUARD ─── */
  const guard = () => {
    const page = window.location.pathname.split('/').pop();
    const loggedIn = EQ_Storage.isLoggedIn();

    if (PROTECTED.includes(page) && !loggedIn) {
      window.location.href = '../pages/login.html';
      return false;
    }
    if (PUBLIC_ONLY.includes(page) && loggedIn) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  };

  /* ─── REGISTER ─── */
  const register = (name, email, password, avatarIndex) => {
    if (!name || name.trim().length < 2)
      return { ok: false, error: 'El nombre debe tener al menos 2 caracteres.' };
    if (!email || !isValidEmail(email))
      return { ok: false, error: 'Ingresa un correo electrónico válido.' };
    if (!password || password.length < 6)
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };

    const result = EQ_Storage.createUser({ name, email, password, avatar: avatarIndex || 0 });
    if (!result.ok) return result;

    EQ_Storage.setSession(result.user);
    EQ_Storage.updateStreak(result.user.id);
    return { ok: true, user: result.user };
  };

  /* ─── LOGIN ─── */
  const login = (email, password) => {
    if (!email || !isValidEmail(email))
      return { ok: false, error: 'Correo electrónico inválido.' };
    if (!password)
      return { ok: false, error: 'Ingresa tu contraseña.' };

    const user = EQ_Storage.findUser(email);
    if (!user)
      return { ok: false, error: 'No existe una cuenta con ese correo.' };
    if (user.password !== password)
      return { ok: false, error: 'Contraseña incorrecta.' };

    EQ_Storage.setSession(user);
    EQ_Storage.updateStreak(user.id);
    return { ok: true, user };
  };

  /* ─── LOGOUT ─── */
  const logout = () => {
    EQ_Storage.clearSession();
    window.location.href = '../index.html';
  };

  /* ─── GET CURRENT ─── */
  const getUser = () => {
    const session = EQ_Storage.getSession();
    if (!session) return null;
    // Always get fresh data from storage
    return EQ_Storage.findUserById(session.id) || session;
  };

  /* ─── UPDATE PROFILE ─── */
  const updateProfile = (patch) => {
    const user = getUser();
    if (!user) return { ok: false, error: 'No hay sesión activa.' };
    const updated = EQ_Storage.updateUser(user.id, patch);
    if (!updated) return { ok: false, error: 'Error al actualizar perfil.' };
    return { ok: true, user: updated };
  };

  /* ─── CHANGE PASSWORD ─── */
  const changePassword = (currentPwd, newPwd) => {
    const user = getUser();
    if (!user) return { ok: false, error: 'Sin sesión.' };
    if (user.password !== currentPwd) return { ok: false, error: 'Contraseña actual incorrecta.' };
    if (newPwd.length < 6) return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    const updated = EQ_Storage.updateUser(user.id, { password: newPwd });
    return updated ? { ok: true } : { ok: false, error: 'Error al cambiar contraseña.' };
  };

  /* ─── DELETE ACCOUNT ─── */
  const deleteAccount = () => {
    const user = getUser();
    if (!user) return;
    EQ_Storage.deleteUser(user.id);
    window.location.href = '../index.html';
  };

  /* ─── RESET PROGRESS ─── */
  const resetProgress = () => {
    const user = getUser();
    if (!user) return;
    EQ_Storage.updateUser(user.id, {
      xp: 0, level: 1, streak: 0,
      badges: [], achievements: [],
      history: [],
      stats: {
        totalQuizzes: 0, totalQuestions: 0, totalCorrect: 0,
        perfectQuizzes: 0, fastCorrect: 0, totalXP: 0,
        xpBySubject:      { matematica: 0, lengua: 0, fisica: 0, quimica: 0, biologia: 0 },
        quizzesBySubject: { matematica: 0, lengua: 0, fisica: 0, quimica: 0, biologia: 0 },
        progressBySubject:{ matematica: 0, lengua: 0, fisica: 0, quimica: 0, biologia: 0 },
      },
    });
  };

  /* ─── UTILS ─── */
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  return {
    guard, register, login, logout,
    getUser, updateProfile, changePassword,
    deleteAccount, resetProgress,
  };
})();

window.EQ_Auth = EQ_Auth;

/* ─── AUTO GUARD on DOMContentLoaded ─── */
document.addEventListener('DOMContentLoaded', () => {
  EQ_Auth.guard();
});
