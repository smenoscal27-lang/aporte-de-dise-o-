const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'usuarios.xlsx');
const TURNOS_FILE = path.join(DATA_DIR, 'turnos.xlsx');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  businessName: 'SGCUT',
  openTime: '09:00',
  closeTime: '18:00',
  slotInterval: 30,
  services: [
    { id: 'corte', name: 'Corte de cabello', duration: 30 },
    { id: 'barba', name: 'Afeitado / Barba', duration: 30 },
    { id: 'peinado', name: 'Peinado / Estilo', duration: 45 },
    { id: 'color', name: 'Color / Tinte', duration: 60 }
  ],
  barbers: ['Alex', 'Nico', 'Martín', 'Sofía']
};

const USER_HEADERS = ['ID', 'Nombre', 'Teléfono', 'Contraseña', 'Rol', 'Fecha registro'];
const TURNO_HEADERS = [
  'ID', 'Cliente', 'Teléfono', 'Servicio', 'Duración', 'Barbero',
  'Fecha', 'Hora', 'Creado por', 'Estado', 'Creado', 'Completado'
];

function sortUsers(users) {
  return [...users].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB, 'es');
    return (a.phone || '').localeCompare(b.phone || '', 'es');
  });
}

function sortTurnos(records) {
  const statusOrder = { pending: 0, completed: 1 };
  return [...records].sort((a, b) => {
    const dateCmp = String(a.date).localeCompare(String(b.date));
    if (dateCmp !== 0) return dateCmp;
    const timeCmp = String(a.time).localeCompare(String(b.time));
    if (timeCmp !== 0) return timeCmp;
    const stA = statusOrder[a.status] ?? 2;
    const stB = statusOrder[b.status] ?? 2;
    if (stA !== stB) return stA - stB;
    return String(a.clientName).localeCompare(String(b.clientName), 'es');
  });
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function readSheet(filePath, headers) {
  if (!fs.existsSync(filePath)) return [];
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? '';
    });
    return obj;
  });
}

function writeSheet(filePath, sheetName, headers, dataRows) {
  const aoa = [headers, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filePath);
}

function readUsers() {
  const rows = readSheet(USERS_FILE, USER_HEADERS);
  return rows.map((row) => ({
    id: String(row.ID),
    name: String(row.Nombre),
    phone: normalizePhone(row.Teléfono),
    password: String(row.Contraseña),
    role: String(row.Rol || 'user'),
    createdAt: row['Fecha registro'] ? String(row['Fecha registro']) : ''
  })).filter((u) => u.phone);
}

function writeUsers(users) {
  const sorted = sortUsers(users);
  const dataRows = sorted.map((u) => [
    u.id,
    u.name,
    u.phone,
    u.password,
    u.role,
    u.createdAt ? new Date(u.createdAt).toLocaleString('es-ES') : ''
  ]);
  writeSheet(USERS_FILE, 'Usuarios', USER_HEADERS, dataRows);
}

function readTurnos() {
  const rows = readSheet(TURNOS_FILE, TURNO_HEADERS);
  return rows.map((row) => ({
    id: String(row.ID),
    clientName: String(row.Cliente),
    clientPhone: String(row.Teléfono),
    serviceId: String(row.Servicio),
    duration: Number(row.Duración) || 0,
    barber: String(row.Barbero),
    date: String(row.Fecha),
    time: String(row.Hora),
    createdBy: String(row['Creado por']),
    status: String(row.Estado || '').toLowerCase().includes('complet') ? 'completed' : 'pending',
    createdAt: row.Creado ? String(row.Creado) : null,
    completedAt: row.Completado ? String(row.Completado) : null
  })).filter((t) => t.id);
}

function writeTurnos(records) {
  const sorted = sortTurnos(records);
  const dataRows = sorted.map((t) => [
    t.id,
    t.clientName,
    t.clientPhone || '',
    t.serviceId,
    t.duration || 0,
    t.barber || '',
    t.date,
    t.time,
    t.createdBy || '',
    t.status === 'completed' ? 'Completado' : 'Pendiente',
    t.createdAt || '',
    t.completedAt || ''
  ]);
  writeSheet(TURNOS_FILE, 'Turnos', TURNO_HEADERS, dataRows);
}

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    writeConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function initDataFiles() {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) writeUsers([]);
  if (!fs.existsSync(TURNOS_FILE)) writeTurnos([]);
  if (!fs.existsSync(CONFIG_FILE)) writeConfig(DEFAULT_CONFIG);
}

initDataFiles();

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    dataPath: DATA_DIR,
    files: {
      usuarios: USERS_FILE,
      turnos: TURNOS_FILE,
      config: CONFIG_FILE
    }
  });
});

app.get('/api/users', (req, res) => {
  const users = readUsers().map(({ password, ...safe }) => safe);
  res.json(users);
});

app.post('/api/users/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password || '').trim();

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Completa nombre, teléfono y contraseña.' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
  }

  const users = readUsers();
  if (users.some((u) => u.phone === phone)) {
    return res.status(409).json({ error: 'Ese teléfono ya está registrado.' });
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    phone,
    password,
    role: 'user',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({
    ...safeUser,
    username: phone,
    message: 'Usuario guardado en data/usuarios.xlsx'
  });
});

app.post('/api/users/login', (req, res) => {
  const input = String(req.body.username || req.body.phone || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();
  const phone = normalizePhone(input);

  if (!input || !password) {
    return res.status(400).json({ error: 'Completa teléfono/usuario y contraseña.' });
  }

  if (input === 'admin' && password === 'admin123') {
    return res.json({
      id: 'admin',
      name: 'Administrador',
      username: 'admin',
      phone: '',
      role: 'admin'
    });
  }

  const user = readUsers().find((u) => u.phone === phone && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Teléfono/usuario o contraseña incorrectos.' });
  }

  const { password: _, ...safeUser } = user;
  res.json({ ...safeUser, username: user.phone });
});

app.get('/api/turnos', (req, res) => {
  res.json(readTurnos());
});

app.put('/api/turnos', (req, res) => {
  const records = Array.isArray(req.body.records) ? req.body.records : [];
  writeTurnos(records);
  res.json({ ok: true, count: records.length });
});

app.get('/api/config', (req, res) => {
  res.json(readConfig());
});

app.put('/api/config', (req, res) => {
  const { services, barbers, businessName, openTime, closeTime, slotInterval } = req.body;
  const config = readConfig();
  if (Array.isArray(services) && services.length) config.services = services;
  if (Array.isArray(barbers) && barbers.length) config.barbers = barbers;
  if (businessName !== undefined) config.businessName = String(businessName).trim() || 'SGCUT';
  if (openTime) config.openTime = openTime;
  if (closeTime) config.closeTime = closeTime;
  if (slotInterval) config.slotInterval = Number(slotInterval) || 30;
  writeConfig(config);
  res.json(config);
});

app.get('/api/download/usuarios', (req, res) => {
  if (!fs.existsSync(USERS_FILE)) initDataFiles();
  res.download(USERS_FILE, 'usuarios.xlsx');
});

app.get('/api/download/turnos', (req, res) => {
  if (!fs.existsSync(TURNOS_FILE)) initDataFiles();
  res.download(TURNOS_FILE, 'turnos.xlsx');
});

app.listen(PORT, () => {
  console.log('');
  console.log('  SGCUT - Servidor iniciado');
  console.log('  -------------------------');
  console.log(`  Abre en el navegador: http://localhost:${PORT}`);
  console.log(`  Carpeta de datos:     ${DATA_DIR}`);
  console.log('    - usuarios.xlsx');
  console.log('    - turnos.xlsx');
  console.log('    - config.json');
  console.log('');
});
