/* =====================================================
   EDUQUEST BACHILLERATO — storage.js
   LocalStorage CRUD - Capa de persistencia de datos
   ===================================================== */

const EQ_Storage = (() => {

  const KEYS = {
    CURRENT_USER: 'eq_current_user',
    USERS:        'eq_users',
    SETTINGS:     'eq_settings',
  };

  /* ─── HELPERS ─── */
  const get = (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  };

  const set = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  };

  const remove = (key) => localStorage.removeItem(key);

  /* ─── USERS ─── */
  const getUsers = () => get(KEYS.USERS) || [];

  const saveUsers = (users) => set(KEYS.USERS, users);

  const findUser = (email) =>
    getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());

  const findUserById = (id) => getUsers().find(u => u.id === id);

  const createUser = (data) => {
    const users = getUsers();
    if (findUser(data.email)) return { ok: false, error: 'El correo ya está registrado.' };

    const newUser = {
      id:       crypto.randomUUID(),
      name:     data.name.trim(),
      email:    data.email.trim().toLowerCase(),
      password: data.password,
      avatar:   data.avatar || 0,
      xp:       0,
      level:    1,
      streak:   0,
      lastLogin: null,
      badges:   [],
      achievements: [],
      stats: {
        totalQuizzes:       0,
        totalQuestions:     0,
        totalCorrect:       0,
        perfectQuizzes:     0,
        fastCorrect:        0,
        totalXP:            0,
        xpBySubject:        { matematica: 0, lengua: 0, fisica: 0, quimica: 0, biologia: 0 },
        quizzesBySubject:   { matematica: 0, lengua: 0, fisica: 0, quimica: 0, biologia: 0 },
        progressBySubject:  { matematica: 0, lengua: 0, fisica: 0, quimica: 0, biologia: 0 },
      },
      history: [],
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);
    return { ok: true, user: newUser };
  };

  const updateUser = (id, patch) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    users[idx] = deepMerge(users[idx], patch);
    saveUsers(users);
    // Also update session if it's the current user
    const session = getSession();
    if (session && session.id === id) {
      set(KEYS.CURRENT_USER, users[idx]);
    }
    return users[idx];
  };

  const deleteUser = (id) => {
    const users = getUsers().filter(u => u.id !== id);
    saveUsers(users);
    const session = getSession();
    if (session?.id === id) clearSession();
  };

  /* ─── SESSION ─── */
  const getSession = () => get(KEYS.CURRENT_USER);

  const setSession = (user) => set(KEYS.CURRENT_USER, user);

  const clearSession = () => remove(KEYS.CURRENT_USER);

  const isLoggedIn = () => !!getSession();

  /* ─── SETTINGS ─── */
  const getSettings = () => get(KEYS.SETTINGS) || {
    theme: 'light',
    sounds: true,
    animations: true,
    language: 'es',
  };

  const saveSettings = (patch) => {
    const settings = { ...getSettings(), ...patch };
    set(KEYS.SETTINGS, settings);
    return settings;
  };

  /* ─── QUIZ HISTORY ─── */
  const addHistoryEntry = (userId, entry) => {
    return updateUser(userId, {
      history: [
        { ...entry, date: new Date().toISOString() },
        ...(findUserById(userId)?.history || []).slice(0, 49),
      ],
    });
  };

  /* ─── UTILITIES ─── */
  const deepMerge = (target, source) => {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  };

  /* ─── STREAK ─── */
  const updateStreak = (userId) => {
    const user = findUserById(userId);
    if (!user) return;

    const today = new Date().toDateString();
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let newStreak = user.streak;
    if (lastLogin === today) {
      // Ya inició sesión hoy, no cambiar racha
    } else if (lastLogin === yesterday) {
      newStreak = user.streak + 1;
    } else if (!lastLogin) {
      newStreak = 1;
    } else {
      newStreak = 1; // se rompió la racha
    }

    updateUser(userId, { streak: newStreak, lastLogin: new Date().toISOString() });
    return newStreak;
  };

  /* ─── EXPORT ─── */
  return {
    getUsers, saveUsers, findUser, findUserById,
    createUser, updateUser, deleteUser,
    getSession, setSession, clearSession, isLoggedIn,
    getSettings, saveSettings,
    addHistoryEntry, updateStreak,
  };
})();

window.EQ_Storage = EQ_Storage;
