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
const users = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: bcrypt.hashSync('password123', 8),
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    passwordHash: bcrypt.hashSync('password123', 8),
    avatar: 'https://i.pravatar.cc/150?img=2',
  },
  {
    id: 3,
    name: 'Mike Johnson',
    email: 'mike@example.com',
    passwordHash: bcrypt.hashSync('password123', 8),
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
];

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
