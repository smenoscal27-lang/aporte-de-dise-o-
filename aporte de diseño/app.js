const DEFAULT_SERVICES = [
  { id: 'corte', name: 'Corte de cabello', duration: 30 },
  { id: 'barba', name: 'Afeitado / Barba', duration: 30 },
  { id: 'peinado', name: 'Peinado / Estilo', duration: 45 },
  { id: 'color', name: 'Color / Tinte', duration: 60 }
];

const DEFAULT_BARBERS = ['Alex', 'Nico', 'Martín', 'Sofía'];

const ADMIN_USER = {
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  name: 'Administrador',
  phone: ''
};

const STORAGE_KEY = 'sgcut_turnos';
const USERS_KEY = 'sgcut_usuarios';
const CONFIG_KEY = 'sgcut_config';
const API_BASE = '/api';
const PHONE_MIN_DIGITS = 8;
const PHONE_MAX_DIGITS = 11;

let serverOnline = false;
let services = [];
let barbers = [];
let registeredUsers = [];
let businessName = 'SGCUT';
let openTime = '09:00';
let closeTime = '18:00';
let slotInterval = 30;

const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const regName = document.getElementById('regName');
const regPhone = document.getElementById('regPhone');
const regPassword = document.getElementById('regPassword');
const logoutBtn = document.getElementById('logoutBtn');
const btnDashboard = document.getElementById('btn-dashboard');
const btnRegistro = document.getElementById('btn-registro');
const btnGestion = document.getElementById('btn-gestion');
const btnHistorial = document.getElementById('btn-historial');
const btnConfig = document.getElementById('btn-config');
const btnAbout = document.getElementById('btn-about');
const btnHowto = document.getElementById('btn-howto');
const userBadge = document.getElementById('userBadge');
const userNameLabel = document.getElementById('userName');
const userRoleLabel = document.getElementById('userRole');
const currentMonthLabel = document.getElementById('currentMonth');
const statsTotal = document.getElementById('stats-total');
const statsCaja = document.getElementById('stats-caja');
const calendarGrid = document.getElementById('calendarGrid');
const appointmentsList = document.getElementById('appointmentsList');
const historyList = document.getElementById('historyList');
const serviceSelect = document.getElementById('serviceSelect');
const barberSelect = document.getElementById('barberSelect');
const appointmentDate = document.getElementById('appointmentDate');
const clientPhone = document.getElementById('clientPhone');
const timeslotsContainer = document.getElementById('timeslots');
const periodSelect = document.getElementById('periodSelect');
const bookingForm = document.getElementById('bookingForm');
const authFeedback = document.getElementById('authFeedback');
const searchAppointments = document.getElementById('searchAppointments');
const downloadReportBtn = document.getElementById('downloadReportBtn');
const exportUsersExcelBtn = document.getElementById('exportUsersExcelBtn');
const exportTurnosExcelBtn = document.getElementById('exportTurnosExcelBtn');
const welcomeModal = document.getElementById('welcomeModal');
const closeWelcome = document.getElementById('closeWelcome');
const startBtn = document.getElementById('startBtn');
const aboutScreen = document.getElementById('aboutScreen');
const howtoScreen = document.getElementById('howtoScreen');
const backFromAbout = document.getElementById('backFromAbout');
const backFromHowto = document.getElementById('backFromHowto');
const configBarbers = document.getElementById('configBarbers');
const configServices = document.getElementById('configServices');
const saveBarbersBtn = document.getElementById('saveBarbersBtn');
const saveServicesBtn = document.getElementById('saveServicesBtn');
const saveBusinessBtn = document.getElementById('saveBusinessBtn');
const configBusinessName = document.getElementById('configBusinessName');
const configOpenTime = document.getElementById('configOpenTime');
const configCloseTime = document.getElementById('configCloseTime');
const configSlotInterval = document.getElementById('configSlotInterval');
const serverStatus = document.getElementById('serverStatus');
const resultModal = document.getElementById('resultModal');
const resultModalIcon = document.getElementById('resultModalIcon');
const resultModalTitle = document.getElementById('resultModalTitle');
const resultModalSubtitle = document.getElementById('resultModalSubtitle');
const resultModalBody = document.getElementById('resultModalBody');
const resultModalFooter = document.getElementById('resultModalFooter');
const resultModalBtn = document.getElementById('resultModalBtn');
const resultModalOverlay = document.getElementById('resultModalOverlay');

let turnos = [];
let resultModalCallback = null;
let historial = [];
let currentUser = null;
let selectedSlot = null;
let currentView = 'dashboard';

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
}

function validatePhone(phone) {
  const digits = normalizePhone(phone);
  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) {
    return {
      valid: false,
      message: `El teléfono debe tener entre ${PHONE_MIN_DIGITS} y ${PHONE_MAX_DIGITS} dígitos (solo números).`
    };
  }
  return { valid: true, phone: digits };
}

function bindPhoneInputs() {
  if (!regPhone) return;
  regPhone.addEventListener('input', () => {
    regPhone.value = normalizePhone(regPhone.value);
  });
}

function buildAppointmentTime(slot24) {
  const [h, m] = slot24.split(':').map(Number);
  const h12 = h % 12 || 12;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function showResultModal({ variant = 'success', title, subtitle, rows, footer, onClose }) {
  if (!resultModal) return;
  resultModalIcon.className = `result-modal-icon ${variant}`;
  resultModalIcon.textContent = variant === 'completed' ? '★' : '✓';
  resultModalTitle.textContent = title;
  resultModalSubtitle.textContent = subtitle || '';
  resultModalSubtitle.classList.toggle('hidden', !subtitle);
  resultModalBody.innerHTML = rows.map(([label, value, badgeClass]) => `
    <div class="result-modal-row">
      <span>${label}</span>
      <strong class="${badgeClass || ''}">${value}</strong>
    </div>
  `).join('');
  resultModalFooter.textContent = footer || '';
  resultModalFooter.classList.toggle('hidden', !footer);
  resultModalCallback = onClose || null;
  resultModal.classList.remove('hidden');
}

function closeResultModal() {
  resultModal?.classList.add('hidden');
  if (resultModalCallback) {
    const cb = resultModalCallback;
    resultModalCallback = null;
    cb();
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Error en el servidor');
    error.status = response.status;
    throw error;
  }
  return data;
}

function updateServerStatus(online) {
  serverOnline = online;
  if (!serverStatus) return;
  serverStatus.textContent = online
    ? 'Sistema conectado. Los datos se guardan automáticamente para el administrador.'
    : 'Modo local activo. Regístrate y reserva sin descargar archivos.';
  serverStatus.className = 'server-status online';
}

function sortUsersList(users) {
  return [...users].sort((a, b) => {
    const byName = (a.name || '').localeCompare(b.name || '', 'es');
    if (byName !== 0) return byName;
    return (a.phone || '').localeCompare(b.phone || '', 'es');
  });
}

function sortTurnosList(records) {
  const statusOrder = { pending: 0, completed: 1 };
  return [...records].sort((a, b) => {
    const byDate = String(a.date).localeCompare(String(b.date));
    if (byDate !== 0) return byDate;
    const byTime = String(a.time).localeCompare(String(b.time));
    if (byTime !== 0) return byTime;
    const byStatus = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
    if (byStatus !== 0) return byStatus;
    return String(a.clientName).localeCompare(String(b.clientName), 'es');
  });
}

function buildExcelWorkbook() {
  if (typeof XLSX === 'undefined') return null;
  const workbook = XLSX.utils.book_new();
  const userSheet = XLSX.utils.aoa_to_sheet([
    ['ID', 'Nombre', 'Teléfono', 'Contraseña', 'Rol', 'Fecha registro'],
    ...sortUsersList(registeredUsers).map((u) => [
      u.id,
      u.name,
      u.phone,
      u.password || '',
      u.role || 'user',
      u.createdAt ? new Date(u.createdAt).toLocaleString('es-ES') : ''
    ])
  ]);
  XLSX.utils.book_append_sheet(workbook, userSheet, 'Usuarios');

  const allTurnos = sortTurnosList([...turnos, ...historial]);
  const turnoSheet = XLSX.utils.aoa_to_sheet([
    ['ID', 'Cliente', 'Teléfono', 'Servicio', 'Duración', 'Barbero', 'Fecha', 'Hora', 'Creado por', 'Estado', 'Creado', 'Completado'],
    ...allTurnos.map((t) => {
      const service = services.find((s) => s.id === t.serviceId);
      return [
        t.id,
        t.clientName,
        t.clientPhone || '',
        service?.name || t.serviceId,
        `${t.duration || 0} min`,
        t.barber || '',
        t.date,
        t.time,
        t.createdBy || '',
        t.status === 'completed' ? 'Completado' : 'Pendiente',
        t.createdAt || '',
        t.completedAt || ''
      ];
    })
  ]);
  XLSX.utils.book_append_sheet(workbook, turnoSheet, 'Turnos');
  return workbook;
}

function downloadExcelForAdmin() {
  const workbook = buildExcelWorkbook();
  if (!workbook) return false;
  XLSX.writeFile(workbook, 'SGCUT_datos.xlsx');
  return true;
}

async function checkServer() {
  try {
    await apiRequest('/health');
    updateServerStatus(true);
    return true;
  } catch {
    updateServerStatus(false);
    return false;
  }
}

async function init() {
  bindEvents();
  await checkServer();
  if (serverOnline) {
    await loadConfigFromServer();
    await loadUsersFromServer();
    await loadTurnosFromServer();
    await migrateLocalToServer();
  } else {
    loadConfigLocal();
    loadRegisteredUsersLocal();
    loadStoredDataLocal();
  }
  populateServices();
  populateBarbers();
  setDateToday();
  renderTimeSlots();
}

function applyConfig(config) {
  services = config.services?.length ? config.services : [...DEFAULT_SERVICES];
  barbers = config.barbers?.length ? config.barbers : [...DEFAULT_BARBERS];
  businessName = config.businessName || 'SGCUT';
  openTime = config.openTime || '09:00';
  closeTime = config.closeTime || '18:00';
  slotInterval = Number(config.slotInterval) || 30;
}

function getConfigPayload() {
  return { services, barbers, businessName, openTime, closeTime, slotInterval };
}

function loadConfigLocal() {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) {
    applyConfig({
      services: DEFAULT_SERVICES,
      barbers: DEFAULT_BARBERS,
      businessName: 'SGCUT',
      openTime: '09:00',
      closeTime: '18:00',
      slotInterval: 30
    });
    localStorage.setItem(CONFIG_KEY, JSON.stringify(getConfigPayload()));
    return;
  }
  try {
    applyConfig(JSON.parse(stored));
  } catch {
    applyConfig({ services: DEFAULT_SERVICES, barbers: DEFAULT_BARBERS });
  }
}

async function loadConfigFromServer() {
  try {
    const config = await apiRequest('/config');
    applyConfig(config);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(getConfigPayload()));
  } catch {
    loadConfigLocal();
  }
}

async function saveConfig() {
  const payload = getConfigPayload();
  localStorage.setItem(CONFIG_KEY, JSON.stringify(payload));
  if (serverOnline) {
    try {
      await apiRequest('/config', { method: 'PUT', body: payload });
    } catch {
      serverOnline = false;
    }
  }
}

function loadRegisteredUsersLocal() {
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) {
    registeredUsers = [];
    return;
  }
  try {
    registeredUsers = JSON.parse(stored);
  } catch {
    registeredUsers = [];
  }
}

async function loadUsersFromServer() {
  try {
    const users = await apiRequest('/users');
    registeredUsers = users.map((u) => ({
      ...u,
      username: u.phone,
      password: u.password || ''
    }));
    localStorage.setItem(USERS_KEY, JSON.stringify(registeredUsers));
  } catch {
    loadRegisteredUsersLocal();
  }
}

function loadStoredDataLocal() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  try {
    const allRecords = JSON.parse(stored);
    turnos = allRecords.filter((item) => item.status === 'pending');
    historial = allRecords.filter((item) => item.status === 'completed');
  } catch {
    turnos = [];
    historial = [];
  }
}

async function loadTurnosFromServer() {
  try {
    const records = await apiRequest('/turnos');
    turnos = records.filter((item) => item.status === 'pending');
    historial = records.filter((item) => item.status === 'completed');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    loadStoredDataLocal();
  }
}

async function migrateLocalToServer() {
  try {
    const serverTurnos = await apiRequest('/turnos');
    const localStored = localStorage.getItem(STORAGE_KEY);
    if (localStored && serverTurnos.length === 0) {
      const localRecords = JSON.parse(localStored);
      if (localRecords.length) {
        await apiRequest('/turnos', { method: 'PUT', body: { records: localRecords } });
        await loadTurnosFromServer();
      }
    }
    const serverUsers = await apiRequest('/users');
    const localUsers = localStorage.getItem(USERS_KEY);
    if (localUsers && serverUsers.length === 0) {
      const parsed = JSON.parse(localUsers);
      for (const user of parsed) {
        try {
          await apiRequest('/users/register', {
            method: 'POST',
            body: { name: user.name, phone: user.phone, password: user.password }
          });
        } catch (err) {
          if (err.status !== 409) console.warn('Migración usuario:', err.message);
        }
      }
      await loadUsersFromServer();
    }
  } catch (err) {
    console.warn('Migración local:', err);
  }
}

async function saveStoredData() {
  const allRecords = sortTurnosList([...turnos, ...historial]);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
  if (serverOnline) {
    try {
      await apiRequest('/turnos', { method: 'PUT', body: { records: allRecords } });
    } catch {
      serverOnline = false;
      updateServerStatus(false);
    }
  }
}

function persistUsersLocal() {
  localStorage.setItem(USERS_KEY, JSON.stringify(sortUsersList(registeredUsers)));
}

function bindEvents() {
  bindPhoneInputs();
  resultModalBtn?.addEventListener('click', closeResultModal);
  resultModalOverlay?.addEventListener('click', closeResultModal);
  loginForm.addEventListener('submit', handleLogin);
  registerForm?.addEventListener('submit', handleRegister);
  tabLogin?.addEventListener('click', () => switchAuthTab('login'));
  tabRegister?.addEventListener('click', () => switchAuthTab('register'));
  logoutBtn.addEventListener('click', handleLogout);
  btnDashboard.addEventListener('click', () => showView('dashboard'));
  btnRegistro?.addEventListener('click', () => showView('registro'));
  btnGestion.addEventListener('click', () => showView('gestion'));
  btnHistorial.addEventListener('click', () => showView('historial'));
  btnConfig?.addEventListener('click', () => showView('config'));
  btnAbout?.addEventListener('click', showAboutScreen);
  btnHowto?.addEventListener('click', showHowtoScreen);
  closeWelcome?.addEventListener('click', closeWelcomeModal);
  startBtn?.addEventListener('click', closeWelcomeModal);
  backFromAbout?.addEventListener('click', hideAboutScreen);
  backFromHowto?.addEventListener('click', hideHowtoScreen);
  serviceSelect?.addEventListener('change', () => {
    selectedSlot = null;
    renderTimeSlots();
  });
  appointmentDate?.addEventListener('change', () => {
    selectedSlot = null;
    renderTimeSlots();
    renderCalendar();
  });
  searchAppointments?.addEventListener('input', renderAppointments);
  downloadReportBtn?.addEventListener('click', exportFullReportToPDF);
  exportUsersExcelBtn?.addEventListener('click', () => exportUsersToExcel(true));
  exportTurnosExcelBtn?.addEventListener('click', () => exportExcelAsAdmin('turnos'));
  saveBarbersBtn?.addEventListener('click', saveBarbersFromConfig);
  saveServicesBtn?.addEventListener('click', saveServicesFromConfig);
  saveBusinessBtn?.addEventListener('click', saveBusinessFromConfig);
  bookingForm?.addEventListener('submit', handleSubmit);
}

function switchAuthTab(mode) {
  const isLogin = mode === 'login';
  tabLogin?.classList.toggle('active', isLogin);
  tabRegister?.classList.toggle('active', !isLogin);
  loginForm?.classList.toggle('hidden', !isLogin);
  registerForm?.classList.toggle('hidden', isLogin);
  showAuthFeedback(null);
}

async function handleRegister(event) {
  event.preventDefault();
  const name = regName.value.trim();
  const phoneCheck = validatePhone(regPhone.value);
  const password = regPassword.value.trim();

  if (!name || !password) {
    showAuthFeedback('Completa nombre, teléfono y contraseña.', 'error');
    return;
  }
  if (!phoneCheck.valid) {
    showAuthFeedback(phoneCheck.message, 'error');
    return;
  }
  const phone = phoneCheck.phone;
  if (password.length < 4) {
    showAuthFeedback('La contraseña debe tener al menos 4 caracteres.', 'error');
    return;
  }

  try {
    let newUser;
    if (serverOnline) {
      newUser = await apiRequest('/users/register', {
        method: 'POST',
        body: { name, phone, password }
      });
      await loadUsersFromServer();
    } else {
      if (registeredUsers.some((u) => u.phone === phone)) {
        showAuthFeedback('Ese teléfono ya está registrado.', 'error');
        return;
      }
      newUser = {
        id: Date.now().toString(),
        name,
        phone,
        username: phone,
        password,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      registeredUsers.push(newUser);
      persistUsersLocal();
    }

    registerForm.reset();
    currentUser = { ...newUser, username: phone };
    showAuthFeedback('¡Registro exitoso! Bienvenido.', 'success');
    enterApp();
  } catch (err) {
    showAuthFeedback(err.message || 'No se pudo registrar.', 'error');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const inputRaw = loginUsername.value.trim();
  const input = inputRaw.toLowerCase();
  const password = loginPassword.value.trim();

  if (!inputRaw || !password) {
    showAuthFeedback('Completa teléfono/usuario y contraseña.', 'error');
    return;
  }

  try {
    let user = null;
    if (input === 'admin') {
      user = ADMIN_USER.password === password ? { ...ADMIN_USER } : null;
    } else {
      const phoneCheck = validatePhone(inputRaw);
      if (!phoneCheck.valid) {
        showAuthFeedback(phoneCheck.message, 'error');
        return;
      }
      if (serverOnline) {
        user = await apiRequest('/users/login', {
          method: 'POST',
          body: { username: phoneCheck.phone, password }
        });
      } else {
        user = registeredUsers.find(
          (item) => item.phone === phoneCheck.phone && item.password === password
        );
      }
    }

    if (!user) {
      showAuthFeedback('Teléfono/usuario o contraseña incorrectos.', 'error');
      return;
    }

    currentUser = { ...user, username: user.username || user.phone };
    showAuthFeedback(null);
    enterApp();
  } catch (err) {
    showAuthFeedback(err.message || 'No se pudo iniciar sesión.', 'error');
  }
}

function enterApp() {
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  renderUserHeader();
  prefillBookingForm();
  showView('dashboard');
  renderTimeSlots();
  if (currentUser.role === 'user') showWelcomeModal();
}

function prefillBookingForm() {
  const clientNameEl = document.getElementById('clientName');
  if (clientNameEl && currentUser?.name) clientNameEl.value = currentUser.name;
  if (clientPhone && currentUser?.phone) clientPhone.value = currentUser.phone;
}

function handleLogout() {
  currentUser = null;
  loginForm.reset();
  registerForm?.reset();
  switchAuthTab('login');
  loginScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}

function renderUserHeader() {
  userBadge.textContent = currentUser.role === 'admin' ? 'ADM' : 'USR';
  userNameLabel.textContent = currentUser.name;
  userRoleLabel.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Usuario';
  renderNavForRole();
}

function showAuthFeedback(message, type = 'info') {
  if (!authFeedback) return;
  if (!message) {
    authFeedback.textContent = '';
    authFeedback.className = 'auth-feedback hidden';
    return;
  }
  authFeedback.textContent = message;
  authFeedback.className = `auth-feedback ${type}`;
}

function renderNavForRole() {
  const isAdmin = currentUser.role === 'admin';
  btnHistorial.style.display = isAdmin ? 'block' : 'none';
  btnConfig.style.display = isAdmin ? 'block' : 'none';
  btnHowto.style.display = isAdmin ? 'none' : 'block';
  if (exportUsersExcelBtn) exportUsersExcelBtn.style.display = isAdmin ? 'inline-block' : 'none';
  if (exportTurnosExcelBtn) exportTurnosExcelBtn.style.display = isAdmin ? 'inline-block' : 'none';
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach((view) => view.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active-tab'));
  const viewEl = document.getElementById(`view-${viewId}`);
  const btnEl = document.getElementById(`btn-${viewId}`);
  if (viewEl) viewEl.classList.remove('hidden');
  if (btnEl) btnEl.classList.add('active-tab');
  currentView = viewId;

  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'registro') {
    prefillBookingForm();
    renderTimeSlots();
  }
  if (viewId === 'gestion') renderAppointments();
  if (viewId === 'historial') renderHistory();
  if (viewId === 'config') renderConfigPanel();
}

function renderDashboard() {
  statsTotal.textContent = turnos.length.toString();
  statsCaja.textContent = historial.length.toString();
  currentMonthLabel.textContent = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  renderCalendar();
}

function renderCalendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const bookedDays = new Set(turnos
    .filter((t) => t.date.startsWith(monthPrefix))
    .map((t) => Number(t.date.split('-')[2])));

  calendarGrid.innerHTML = '';
  ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach((label) => {
    const el = document.createElement('div');
    el.className = 'calendar-cell calendar-header';
    el.textContent = label;
    calendarGrid.appendChild(el);
  });

  for (let i = 1; i <= daysInMonth; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    cell.textContent = i;
    const dateString = `${monthPrefix}${String(i).padStart(2, '0')}`;
    const cellDate = new Date(year, month, i);
    cellDate.setHours(0, 0, 0, 0);
    const isPast = cellDate < today;

    if (isPast) {
      cell.classList.add('past');
    } else {
      cell.classList.add('available');
      if (bookedDays.has(i)) cell.classList.add('busy');
      cell.addEventListener('click', () => selectCalendarDate(dateString));
    }
    if (appointmentDate.value === dateString) {
      cell.classList.add('selected');
    }
    calendarGrid.appendChild(cell);
  }
}

function selectCalendarDate(dateString) {
  appointmentDate.value = dateString;
  selectedSlot = null;
  renderTimeSlots();
  renderCalendar();
  prefillBookingForm();
  showView('registro');
}

function populateServices() {
  if (!serviceSelect) return;
  serviceSelect.innerHTML = '';
  services.forEach((service) => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.name} (${service.duration} min)`;
    serviceSelect.appendChild(option);
  });
}

function populateBarbers() {
  if (!barberSelect) return;
  const current = barberSelect.value;
  barberSelect.innerHTML = '<option value="">Selecciona un barbero</option>';
  barbers.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    barberSelect.appendChild(option);
  });
  if (current && barbers.includes(current)) barberSelect.value = current;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function setDateToday() {
  if (appointmentDate.value) return;
  appointmentDate.value = formatDate(new Date());
}

function renderTimeSlots() {
  const selectedDate = appointmentDate.value;
  const selectedPeriod = periodSelect.value;
  const bookedTimes = turnos.filter((turno) => turno.date === selectedDate).map((turno) => turno.time);
  timeslotsContainer.innerHTML = '';
  if (!selectedDate) {
    timeslotsContainer.textContent = 'Selecciona una fecha para ver horarios.';
    return;
  }
  generateTimeSlots(openTime, closeTime, slotInterval).forEach((slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'timeslot';
    button.textContent = slot;
    const fullTime = `${slot} ${selectedPeriod}`;
    const conflict = bookedTimes.includes(fullTime);
    if (conflict) {
      button.classList.add('disabled');
      button.disabled = true;
    }
    if (selectedSlot === slot) button.classList.add('selected');
    button.addEventListener('click', () => {
      selectedSlot = slot;
      const [h] = slot.split(':').map(Number);
      if (periodSelect) periodSelect.value = h >= 12 ? 'PM' : 'AM';
      renderTimeSlots();
    });
    timeslotsContainer.appendChild(button);
  });
}

function generateTimeSlots(start, end, intervalMinutes) {
  const slots = [];
  const [hStart, mStart] = start.split(':').map(Number);
  const [hEnd, mEnd] = end.split(':').map(Number);
  const date = new Date();
  date.setHours(hStart, mStart, 0, 0);
  const endDate = new Date();
  endDate.setHours(hEnd, mEnd, 0, 0);
  while (date <= endDate) {
    slots.push(date.toTimeString().slice(0, 5));
    date.setMinutes(date.getMinutes() + intervalMinutes);
  }
  return slots.slice(0, -1);
}

async function handleSubmit(event) {
  event.preventDefault();
  const clientName = document.getElementById('clientName').value.trim();
  const clientPhoneValue = clientPhone?.value.trim() || currentUser?.phone || '';
  const serviceId = serviceSelect.value;
  const barber = barberSelect.value;
  const date = appointmentDate.value;
  const time = selectedSlot;
  const period = periodSelect.value;
  if (!clientName || !serviceId || !barber || !date || !time) {
    alert('Por favor completa todos los campos y selecciona un horario.');
    return;
  }
  const fullTime = buildAppointmentTime(time);
  const hasConflict = turnos.some((turno) => turno.date === date && turno.time === fullTime);
  if (hasConflict) {
    alert('El horario seleccionado ya está ocupado. Elige otro turno.');
    selectedSlot = null;
    renderTimeSlots();
    return;
  }
  const selectedService = services.find((svc) => svc.id === serviceId);
  const serviceName = selectedService?.name || serviceId;
  const newTurno = {
    id: Date.now().toString(),
    clientName,
    clientPhone: clientPhoneValue,
    serviceId,
    duration: selectedService?.duration || 0,
    barber,
    date,
    time: fullTime,
    createdBy: currentUser.username || currentUser.phone,
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  turnos.push(newTurno);
  await saveStoredData();
  selectedSlot = null;
  renderTimeSlots();
  renderCalendar();
  if (currentView === 'gestion') renderAppointments();

  showResultModal({
    variant: 'success',
    title: '¡Cita agendada!',
    subtitle: 'Tu turno quedó registrado correctamente',
    rows: [
      ['Cliente', clientName],
      ['Servicio', serviceName],
      ['Barbero', barber],
      ['Fecha', formatDateLabel(date)],
      ['Hora', fullTime],
      ['Estado', 'Pendiente', 'badge-pending']
    ],
    footer: 'Te esperamos en el local.',
    onClose: () => showView('gestion')
  });
}

function formatDateLabel(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function renderAppointments() {
  const query = searchAppointments?.value.trim().toLowerCase() || '';
  let visible = currentUser.role === 'admin'
    ? [...turnos]
    : turnos.filter((turno) => turno.createdBy === (currentUser.username || currentUser.phone));

  if (query) {
    visible = visible.filter((turno) => {
      const service = services.find((svc) => svc.id === turno.serviceId)?.name || turno.serviceId;
      return [turno.clientName, service, turno.time, turno.date, turno.barber]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }

  if (visible.length === 0) {
    appointmentsList.innerHTML = '<p>No hay turnos agendados aún.</p>';
    return;
  }

  appointmentsList.innerHTML = visible.map((turno) => {
    const service = services.find((svc) => svc.id === turno.serviceId);
    const serviceName = service?.name || turno.serviceId;
    const durationLabel = service?.duration ? `${service.duration} min` : `${turno.duration || 0} min`;
    const actions = currentUser.role === 'admin'
      ? `<button class="btn-secondary" onclick="finalizeAppointment('${turno.id}')">Finalizar</button>`
      : `<button class="btn-secondary" onclick="cancelAppointment('${turno.id}')">Cancelar</button>`;
    return `
      <article class="appointment-item">
        <h3>${turno.clientName}</h3>
        <p><strong>Teléfono:</strong> ${turno.clientPhone || '-'}</p>
        <p><strong>Servicio:</strong> ${serviceName}</p>
        <p><strong>Duración:</strong> ${durationLabel}</p>
        <p><strong>Barbero:</strong> ${turno.barber}</p>
        <p><strong>Fecha:</strong> ${turno.date} – <strong>Hora:</strong> ${turno.time}</p>
        <div class="action-row">${actions}</div>
      </article>
    `;
  }).join('');
}

function renderHistory() {
  const visibleHistory = currentUser.role === 'admin'
    ? historial
    : historial.filter((turno) => turno.createdBy === (currentUser.username || currentUser.phone));

  if (visibleHistory.length === 0) {
    historyList.innerHTML = '<tr><td colspan="7">No hay historial de citas finalizadas.</td></tr>';
    return;
  }

  historyList.innerHTML = visibleHistory.map((turno) => {
    const service = services.find((svc) => svc.id === turno.serviceId);
    const serviceName = service?.name || turno.serviceId;
    const durationLabel = service?.duration ? `${service.duration} min` : `${turno.duration || 0} min`;
    return `
      <tr>
        <td>${turno.clientName}</td>
        <td>${serviceName}</td>
        <td>${durationLabel}</td>
        <td>${turno.barber || '-'}</td>
        <td>${turno.date} ${turno.time}</td>
        <td>Completado</td>
        <td><button class="btn-secondary btn-small" onclick="repeatAppointment('${turno.id}')">Repetir</button></td>
      </tr>
    `;
  }).join('');
}

async function finalizeAppointment(id) {
  const index = turnos.findIndex((turno) => turno.id === id);
  if (index === -1) return;
  const [turno] = turnos.splice(index, 1);
  turno.status = 'completed';
  turno.completedAt = new Date().toISOString();
  historial.push(turno);
  await saveStoredData();
  const service = services.find((svc) => svc.id === turno.serviceId);
  const serviceName = service?.name || turno.serviceId;
  showResultModal({
    variant: 'completed',
    title: 'Cita completada',
    subtitle: 'El turno pasó al historial',
    rows: [
      ['Cliente', turno.clientName],
      ['Servicio', serviceName],
      ['Barbero', turno.barber],
      ['Fecha', formatDateLabel(turno.date)],
      ['Hora', turno.time],
      ['Estado', 'Completado', 'badge-done']
    ],
    footer: 'Datos actualizados para el administrador.'
  });
  renderAppointments();
  renderCalendar();
  if (currentView === 'dashboard') renderDashboard();
}

async function cancelAppointment(id) {
  const userKey = currentUser.username || currentUser.phone;
  const index = turnos.findIndex((turno) => turno.id === id && turno.createdBy === userKey);
  if (index === -1) return;
  turnos.splice(index, 1);
  await saveStoredData();
  renderAppointments();
  renderCalendar();
}

function repeatAppointment(id) {
  const turno = historial.find((item) => item.id === id);
  if (!turno) return;
  showView('registro');
  document.getElementById('clientName').value = turno.clientName;
  if (clientPhone) clientPhone.value = turno.clientPhone || currentUser?.phone || '';
  serviceSelect.value = turno.serviceId;
  barberSelect.value = turno.barber || '';
  appointmentDate.value = turno.date;
  const [timePart, periodPart] = turno.time.split(' ');
  selectedSlot = timePart;
  if (periodPart) periodSelect.value = periodPart;
  renderTimeSlots();
  renderCalendar();
}

function renderConfigPanel() {
  if (!configBarbers || !configServices) return;
  if (configBusinessName) configBusinessName.value = businessName;
  if (configOpenTime) configOpenTime.value = openTime;
  if (configCloseTime) configCloseTime.value = closeTime;
  if (configSlotInterval) configSlotInterval.value = slotInterval;
  configBarbers.value = barbers.join('\n');
  configServices.value = services
    .map((s) => `${s.id}|${s.name}|${s.duration}`)
    .join('\n');
}

async function saveBusinessFromConfig() {
  businessName = configBusinessName?.value.trim() || 'SGCUT';
  openTime = configOpenTime?.value || '09:00';
  closeTime = configCloseTime?.value || '18:00';
  slotInterval = Number(configSlotInterval?.value) || 30;
  if (openTime >= closeTime) {
    alert('La hora de apertura debe ser anterior a la de cierre.');
    return;
  }
  await saveConfig();
  renderTimeSlots();
  alert('Datos del local guardados correctamente.');
}

async function saveBarbersFromConfig() {
  const lines = configBarbers.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    alert('Agrega al menos un barbero.');
    return;
  }
  barbers = lines;
  await saveConfig();
  populateBarbers();
  alert(serverOnline ? 'Barberos guardados en el servidor.' : 'Barberos actualizados (modo local).');
}

async function saveServicesFromConfig() {
  const lines = configServices.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 3) {
      alert(`Línea inválida: ${line}\nUsa: id|nombre|duración`);
      return;
    }
    const [id, name, duration] = parts;
    parsed.push({
      id,
      name,
      duration: Number(duration) || 30
    });
  }
  if (!parsed.length) {
    alert('Agrega al menos un servicio.');
    return;
  }
  services = parsed;
  await saveConfig();
  populateServices();
  alert(serverOnline ? 'Servicios guardados en el servidor.' : 'Servicios actualizados (modo local).');
}

function exportExcelAsAdmin(type = 'all') {
  if (currentUser?.role !== 'admin') return;
  if (serverOnline) {
    if (type === 'usuarios') window.open('/api/download/usuarios', '_blank');
    else if (type === 'turnos') window.open('/api/download/turnos', '_blank');
    else {
      window.open('/api/download/usuarios', '_blank');
      window.open('/api/download/turnos', '_blank');
    }
    return;
  }
  if (downloadExcelForAdmin()) {
    showResultModal({
      variant: 'success',
      title: 'Excel generado',
      subtitle: 'Solo visible para administración',
      rows: [
        ['Archivo', 'SGCUT_datos.xlsx'],
        ['Usuarios', String(registeredUsers.length)],
        ['Turnos', String(turnos.length + historial.length)]
      ],
      footer: 'Revisa tu carpeta de Descargas.'
    });
  }
}

function exportUsersToExcel(showAlert = true) {
  exportExcelAsAdmin('usuarios');
  if (showAlert && serverOnline) {
    showResultModal({
      variant: 'success',
      title: 'Descarga iniciada',
      subtitle: 'Base de datos para administrador',
      rows: [['Archivo', 'usuarios.xlsx']],
      footer: 'También disponible en la carpeta data/ con el servidor.'
    });
  }
}

function exportFullReportToPDF() {
  if (typeof window.jspdf === 'undefined') {
    alert('La librería PDF no está disponible. Revisa tu conexión a internet.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateLabel = new Date().toLocaleString('es-ES');
  const allTurnos = [...turnos, ...historial];

  doc.setFontSize(16);
  doc.text('SGCUT - Reporte completo', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generado: ${dateLabel}`, 14, 22);
  doc.text(`Turnos activos: ${turnos.length} | Completados: ${historial.length} | Usuarios: ${registeredUsers.length}`, 14, 28);

  const tableData = allTurnos.map((turno) => {
    const service = services.find((svc) => svc.id === turno.serviceId);
    const serviceName = service?.name || turno.serviceId;
    const estado = turno.status === 'completed' ? 'Completado' : 'Pendiente';
    return [
      turno.clientName,
      turno.clientPhone || '-',
      serviceName,
      `${turno.duration || 0} min`,
      turno.barber || '-',
      turno.date,
      turno.time,
      estado
    ];
  });

  if (tableData.length === 0) {
    doc.text('No hay turnos registrados.', 14, 40);
  } else {
    doc.autoTable({
      startY: 34,
      head: [['Cliente', 'Teléfono', 'Servicio', 'Duración', 'Barbero', 'Fecha', 'Hora', 'Estado']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [182, 139, 0] }
    });
  }

  let finalY = doc.lastAutoTable?.finalY || 40;
  if (registeredUsers.length > 0) {
    finalY += 10;
    doc.setFontSize(12);
    doc.text('Usuarios registrados', 14, finalY);
    doc.autoTable({
      startY: finalY + 4,
      head: [['Nombre', 'Teléfono', 'Fecha registro']],
      body: registeredUsers.map((u) => [
        u.name,
        u.phone,
        u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-ES') : '-'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 100, 100] }
    });
  }

  doc.save(`sgcut_reporte_completo_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function showWelcomeModal() {
  welcomeModal?.classList.remove('hidden');
}

function closeWelcomeModal() {
  welcomeModal?.classList.add('hidden');
}

function showAboutScreen() {
  appScreen.classList.add('hidden');
  aboutScreen?.classList.remove('hidden');
}

function hideAboutScreen() {
  aboutScreen?.classList.add('hidden');
  appScreen.classList.remove('hidden');
}

function showHowtoScreen() {
  if (currentUser?.role === 'admin') return;
  appScreen.classList.add('hidden');
  howtoScreen?.classList.remove('hidden');
}

function hideHowtoScreen() {
  howtoScreen?.classList.add('hidden');
  appScreen.classList.remove('hidden');
}

function formatMoney(value) {
  return Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

window.renderAppointments = renderAppointments;
window.finalizeAppointment = finalizeAppointment;
window.cancelAppointment = cancelAppointment;
window.repeatAppointment = repeatAppointment;
window.exportFullReportToPDF = exportFullReportToPDF;
window.showAboutScreen = showAboutScreen;
window.hideAboutScreen = hideAboutScreen;
window.showHowtoScreen = showHowtoScreen;
window.hideHowtoScreen = hideHowtoScreen;

init();
