require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

// ---- Mock "database" ----
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('password123', 8);

const FIRST_NAMES = [
  'John', 'Jane', 'Mike', 'Emily', 'Chris', 'Sarah', 'David', 'Laura',
  'James', 'Anna', 'Robert', 'Maria', 'William', 'Linda', 'Daniel', 'Sophia',
  'Matthew', 'Olivia', 'Andrew', 'Emma', 'Joseph', 'Ava', 'Ryan', 'Mia',
  'Brandon', 'Grace', 'Justin', 'Chloe', 'Kevin', 'Ella', 'Aaron', 'Zoe',
  'Nathan', 'Lily', 'Tyler', 'Hannah', 'Jacob', 'Natalie', 'Ethan', 'Victoria',
];
const LAST_NAMES = [
  'Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
];

function buildSeedUsers(count) {
  const seeded = [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' },
    { name: 'Mike Johnson', email: 'mike@example.com' },
  ];
  for (let i = seeded.length; i < count; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    seeded.push({
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
    });
  }
  return seeded.map((u, idx) => ({
    id: idx + 1,
    name: u.name,
    email: u.email,
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: `https://i.pravatar.cc/150?img=${(idx % 70) + 1}`,
  }));
}

const SEED_USER_COUNT = Number(process.env.SEED_USER_COUNT) || 50;
const users = buildSeedUsers(SEED_USER_COUNT);

// ---- Auth middleware ----
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ---- Routes ----
app.get('/', (req, res) => {
  res.json({
    message: 'Flutter Test API is running',
    endpoints: {
      login: 'POST /api/login',
      profile: 'GET /api/profile (requires Bearer token)',
      users: 'GET /api/users (requires Bearer token)',
    },
  });
});

// POST /api/login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash, ...userSafe } = user;
  res.json({ success: true, token, user: userSafe });
});

// GET /api/profile
app.get('/api/profile', authenticate, (req, res) => {
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const { passwordHash, ...userSafe } = user;
  res.json({ success: true, user: userSafe });
});

// GET /api/users
app.get('/api/users', authenticate, (req, res) => {
  const usersSafe = users.map(({ passwordHash, ...u }) => u);
  res.json({ success: true, users: usersSafe });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
