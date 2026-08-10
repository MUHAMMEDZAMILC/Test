require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

// ---- Mock OTP auth (test credentials) ----
const TEST_PHONE = '9876543210';
const TEST_OTP = '123456';

// ---- Mock "database" ----
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
    phone: idx === 0 ? TEST_PHONE : `9${String(1000000000 + idx).slice(0, 9)}`,
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
      sendOtp: 'POST /api/send-otp',
      verifyOtp: 'POST /api/verify-otp',
      profile: 'GET /api/profile (requires Bearer token)',
      updateProfile: 'PATCH /api/profile (requires Bearer token)',
      users: 'GET /api/users?page=1&limit=10 (requires Bearer token)',
    },
  });
});

// POST /api/send-otp
app.post('/api/send-otp', (req, res) => {
  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }
  // Mock: always "sends" successfully. Use phone 9876543210 with OTP 123456 to verify.
  res.json({ success: true, message: 'OTP sent successfully' });
});

// POST /api/verify-otp
app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body || {};
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
  }
  if (phone !== TEST_PHONE || otp !== TEST_OTP) {
    return res.status(401).json({ success: false, message: 'Invalid phone number or OTP' });
  }
  const user = users.find((u) => u.phone === phone);
  const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user });
});

// GET /api/profile
app.get('/api/profile', authenticate, (req, res) => {
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

// PATCH /api/profile
app.patch('/api/profile', authenticate, (req, res) => {
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const { name, email, phone, avatar } = req.body || {};

  if (email !== undefined) {
    const emailTaken = users.some(
      (u) => u.id !== user.id && u.email.toLowerCase() === String(email).toLowerCase()
    );
    if (emailTaken) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    user.email = email;
  }
  if (phone !== undefined) {
    const phoneTaken = users.some((u) => u.id !== user.id && u.phone === phone);
    if (phoneTaken) {
      return res.status(409).json({ success: false, message: 'Phone number already in use' });
    }
    user.phone = phone;
  }
  if (name !== undefined) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;

  res.json({ success: true, user });
});

// GET /api/users
app.get('/api/users', authenticate, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
  const total = users.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const pageUsers = users.slice(start, start + limit);

  res.json({
    success: true,
    users: pageUsers,
    pagination: { page, limit, total, totalPages },
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
