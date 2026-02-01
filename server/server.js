import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

// Load environment variables before Prisma
config();

// Log the database URL (masked for security)
const dbUrl = process.env.DATABASE_URL;
console.log('Database URL configured:', dbUrl ? 'Yes (length: ' + dbUrl.length + ')' : 'No');

// Dynamic import for Prisma client (needed for ES modules with Prisma 7)
const { PrismaClient } = await import('@prisma/client');

const app = express();
// Prisma Postgres with Accelerate requires accelerateUrl
const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL
});
const PORT = process.env.PORT || 3001;

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'codesync-secret-key-change-in-production';

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Helper to generate session code
function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ============================================
// GITHUB OAUTH
// ============================================

app.get('/auth/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  
  if (!clientId) {
    return res.status(500).json({ error: 'GitHub OAuth not configured' });
  }
  
  const redirectUri = `${process.env.SERVER_URL || 'http://localhost:3001'}/auth/github/callback`;
  const scope = 'read:user user:email';
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  
  res.redirect(githubAuthUrl);
});

app.get('/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  if (!code) {
    return res.redirect(`${frontendUrl}?error=no_code`);
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('GitHub token error:', tokenData);
      return res.redirect(`${frontendUrl}?error=token_error`);
    }
    
    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const githubUser = await userResponse.json();
    
    // Get user email
    let email = githubUser.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      const emails = await emailResponse.json();
      const primaryEmail = emails.find(e => e.primary);
      email = primaryEmail?.email || emails[0]?.email;
    }
    
    // Create or update user in database
    const user = await prisma.user.upsert({
      where: {
        provider_providerId: {
          provider: 'github',
          providerId: githubUser.id.toString()
        }
      },
      update: {
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
        email: email
      },
      create: {
        email: email,
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
        provider: 'github',
        providerId: githubUser.id.toString(),
        role: 'student'
      }
    });
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=github`);
    
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${frontendUrl}?error=oauth_error`);
  }
});

// ============================================
// EMAIL/PASSWORD AUTH
// ============================================

// Register with email/password
app.post('/auth/register', async (req, res) => {
  const { email, password, name, role = 'student' } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        provider: 'email'
      }
    });
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      },
      token
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login with email/password
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if user has password (not OAuth-only)
    if (!user.password) {
      return res.status(401).json({ 
        error: `This account uses ${user.provider} login. Please sign in with ${user.provider}.` 
      });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================
// USER ENDPOINTS
// ============================================

// Get current user
app.get('/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        provider: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update user role
app.patch('/auth/role', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { role } = req.body;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true
      }
    });
    
    // Issue new token with updated role
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ user, token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  res.json({ success: true });
});

// ============================================
// SESSION ENDPOINTS
// ============================================

// Create a new session (teachers only)
app.post('/sessions', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { title, description } = req.body;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can create sessions' });
    }
    
    // Generate unique session code
    let code;
    let exists = true;
    while (exists) {
      code = generateSessionCode();
      const existing = await prisma.session.findUnique({ where: { code } });
      exists = !!existing;
    }
    
    const session = await prisma.session.create({
      data: {
        code,
        title: title || 'Untitled Session',
        description,
        ownerId: decoded.userId
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });
    
    res.json({ session });
    
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Join a session by code
app.post('/sessions/join', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Session code is required' });
  }
  
  // Allow joining without auth (guest mode)
  let userId = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (e) {
      // Invalid token, continue as guest
    }
  }
  
  try {
    const session = await prisma.session.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (!session.isActive) {
      return res.status(400).json({ error: 'This session has ended' });
    }
    
    // Add user as participant if logged in
    if (userId) {
      await prisma.sessionParticipant.upsert({
        where: {
          sessionId_userId: {
            sessionId: session.id,
            userId: userId
          }
        },
        update: {},
        create: {
          sessionId: session.id,
          userId: userId
        }
      });
    }
    
    res.json({ session });
    
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

// Get session by code
app.get('/sessions/:code', async (req, res) => {
  const { code } = req.params;
  
  try {
    const session = await prisma.session.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ session });
    
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 CodeSync Auth Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('OAuth endpoints:');
  if (process.env.GITHUB_CLIENT_ID) {
    console.log(`  ✓ GitHub: http://localhost:${PORT}/auth/github`);
  } else {
    console.log(`  ✗ GitHub: Not configured`);
  }
  console.log('');
  console.log('Auth endpoints:');
  console.log(`  POST /auth/register - Create account with email/password`);
  console.log(`  POST /auth/login    - Login with email/password`);
  console.log(`  GET  /auth/me       - Get current user`);
  console.log('');
});
