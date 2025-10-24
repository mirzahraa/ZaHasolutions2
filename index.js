const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { Parser } = require('json2csv');

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = 'KPDCL-CHADOORA-SECRET';

app.use(cors());
app.use(bodyParser.json());

const USERS_FILE = './users.json';
const DT_FILE = './dtcodes.json';

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function loadDTs() {
  if (!fs.existsSync(DT_FILE)) return [];
  return JSON.parse(fs.readFileSync(DT_FILE));
}
function saveDTs(dts) {
  fs.writeFileSync(DT_FILE, JSON.stringify(dts, null, 2));
}

// Register
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  let users = loadUsers();
  if (users.find(u => u.email === email)) return res.status(400).json({ error: "Email already exists" });
  const hash = bcrypt.hashSync(password, 8);
  users.push({ email, password: hash });
  saveUsers(users);
  res.json({ message: "Registered successfully" });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  let users = loadUsers();
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(400).json({ error: "Invalid credentials" });
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// Middleware: Auth
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Create DT code
app.post('/api/dtcodes', auth, (req, res) => {
  const dts = loadDTs();
  const data = { ...req.body, createdBy: req.user.email, createdAt: new Date().toISOString() };
  dts.push(data);
  saveDTs(dts);
  res.json({ message: "Saved", dt: data });
});

// List DT codes
app.get('/api/dtcodes', auth, (req, res) => {
  res.json(loadDTs());
});

// Export CSV
app.get('/api/dtcodes/export', auth, (req, res) => {
  const dts = loadDTs();
  const parser = new Parser();
  const csv = parser.parse(dts);
  res.header('Content-Type', 'text/csv');
  res.attachment('dtcodes.csv');
  res.send(csv);
});

app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));