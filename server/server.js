import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables before Prisma
config();

// Log the database URL (masked for security)
const dbUrl = process.env.DATABASE_URL;
console.log('Database URL configured:', dbUrl ? 'Yes (length: ' + dbUrl.length + ')' : 'No');

// Dynamic import for Prisma client (needed for ES modules with Prisma 7)
const { PrismaClient } = await import('@prisma/client');

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
  }
});

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
  let userRole = 'student';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;

      // Get user's role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      if (user) {
        userRole = user.role;
      }
    } catch (e) {
      // Invalid token, continue as guest
    }
  }

  try {
    const session = await prisma.session.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true, role: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, role: true }
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

    // Check if user is the owner (teacher who created the session)
    const isOwner = userId && session.ownerId === userId;

    // Determine the role for this session
    // Only the owner can join as teacher, everyone else joins as student
    const sessionRole = isOwner ? 'teacher' : 'student';

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

    res.json({
      session,
      isOwner,
      sessionRole // 'teacher' if owner, 'student' otherwise
    });

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

// ============================================
// WORKSPACE ENDPOINTS (File Storage as JSON)
// ============================================

// Get user's workspace for a session (their files stored as JSON)
app.get('/sessions/:code/files', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { code } = req.params;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const session = await prisma.session.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get this user's workspace for this session
    const workspace = await prisma.sessionWorkspace.findUnique({
      where: {
        sessionId_createdById: {
          sessionId: session.id,
          createdById: userId
        }
      }
    });

    if (!workspace) {
      // No workspace saved yet
      return res.json({ files: [], fileContents: {} });
    }

    // Return the JSON data
    res.json(workspace.data);
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
});

// Get TEACHER's workspace for a session (session owner's files - for students to view)
app.get('/sessions/:code/files/teacher', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { code } = req.params;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET); // Just verify the token is valid

    // Find the session and get its owner (teacher)
    const session = await prisma.session.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        owner: {
          select: { id: true, name: true }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get teacher's workspace
    const workspace = await prisma.sessionWorkspace.findUnique({
      where: {
        sessionId_createdById: {
          sessionId: session.id,
          createdById: session.ownerId
        }
      }
    });

    if (!workspace) {
      // Teacher hasn't saved any files yet
      console.log(`📂 No teacher workspace found for session ${code}`);
      return res.json({
        files: [],
        fileContents: {},
        teacherId: session.ownerId,
        teacherName: session.owner.name
      });
    }

    console.log(`📂 Returning teacher workspace for session ${code} (owner: ${session.owner.name})`);
    res.json({
      ...workspace.data,
      teacherId: session.ownerId,
      teacherName: workspace.createdByName
    });
  } catch (error) {
    console.error('Get teacher workspace error:', error);
    res.status(500).json({ error: 'Failed to get teacher workspace' });
  }
});

// Save/update workspace (CTRL+S save - upserts the entire file tree as JSON)
app.post('/sessions/:code/files/bulk', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { code } = req.params;
  const { files, fileContents, fileTree } = req.body;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    // Get user info for caching the name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    const session = await prisma.session.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Prepare the workspace data as JSON
    // Supports both old format (files array) and new format (fileTree + fileContents)
    const workspaceData = fileTree ? {
      fileTree,
      fileContents: fileContents || {}
    } : {
      files: files || [],
      fileContents: fileContents || {}
    };

    // Upsert: Update existing record OR create new one
    // This ensures only ONE record per user-session combination
    const workspace = await prisma.sessionWorkspace.upsert({
      where: {
        sessionId_createdById: {
          sessionId: session.id,
          createdById: userId
        }
      },
      update: {
        data: workspaceData,
        createdByName: user?.name || 'Unknown'
      },
      create: {
        sessionId: session.id,
        createdById: userId,
        createdByName: user?.name || 'Unknown',
        data: workspaceData
      }
    });

    const fileCount = files?.length || Object.keys(fileContents || {}).length || 0;
    console.log(`💾 Saved workspace for session ${code} by ${user?.name || userId} (${fileCount} items)`);

    res.json({
      success: true,
      count: fileCount,
      message: `Workspace saved successfully`,
      workspaceId: workspace.id
    });
  } catch (error) {
    console.error('Save workspace error:', error);
    res.status(500).json({ error: 'Failed to save workspace' });
  }
});

// Delete workspace (optional - for cleanup)
app.delete('/sessions/:code/files', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { code } = req.params;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const session = await prisma.session.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete user's workspace for this session
    await prisma.sessionWorkspace.deleteMany({
      where: {
        sessionId: session.id,
        createdById: userId
      }
    });

    console.log(`🗑️ Deleted workspace for session ${code} by user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// ============================================
// CHAT ENDPOINTS
// ============================================

// Get chat messages for a session
app.get('/sessions/:code/messages', async (req, res) => {
  const { code } = req.params;
  const { limit = 50 } = req.query;

  try {
    const session = await prisma.session.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// ============================================
// SOCKET.IO - REAL-TIME COLLABORATION
// ============================================

// Track connected users per session
const sessionUsers = new Map(); // sessionCode -> Map<socketId, userInfo>

// Track user code files per session
// sessionCode -> Map<userId, { files: { fileId: { content, lastModified } }, currentFile: string }>
const sessionUserFiles = new Map();

// Verify JWT token for socket connections
const verifySocketToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  let currentSession = null;
  let currentUser = null;

  // Join a session room
  socket.on('join-session', async ({ sessionCode, token }) => {
    const decoded = verifySocketToken(token);
    if (!decoded) {
      socket.emit('error', { message: 'Invalid token' });
      return;
    }

    try {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, avatar: true, role: true }
      });

      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Verify session exists
      const session = await prisma.session.findUnique({
        where: { code: sessionCode.toUpperCase() }
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      currentSession = sessionCode.toUpperCase();
      currentUser = user;

      // Join the socket room
      socket.join(currentSession);

      // Track user in session - use user.id as key to prevent duplicates
      if (!sessionUsers.has(currentSession)) {
        sessionUsers.set(currentSession, new Map());
      }

      // Check if user already exists (reconnecting)
      const existingEntry = Array.from(sessionUsers.get(currentSession).entries())
        .find(([_, u]) => u.id === user.id);

      if (existingEntry) {
        // Update the existing entry with new socket id
        sessionUsers.get(currentSession).delete(existingEntry[0]);
      }

      sessionUsers.get(currentSession).set(socket.id, {
        ...user,
        socketId: socket.id,
        cursorPosition: null
      });

      // Get file data for all users in session
      const userFiles = sessionUserFiles.get(currentSession) || new Map();

      // Build participants with their file data
      const participantsWithFiles = Array.from(sessionUsers.get(currentSession).values()).map(u => ({
        ...u,
        files: userFiles.get(u.id)?.files || {},
        currentFile: userFiles.get(u.id)?.currentFile || null
      }));

      // Notify others that user joined
      socket.to(currentSession).emit('user-joined', {
        user,
        participants: participantsWithFiles
      });

      // Send current participants with their files to joining user
      socket.emit('session-joined', {
        sessionCode: currentSession,
        participants: participantsWithFiles
      });

      console.log(`👤 ${user.name} joined session ${currentSession}`);

    } catch (error) {
      console.error('Join session error:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // Code change event
  socket.on('code-change', ({ fileId, content, cursorPosition }) => {
    if (!currentSession || !currentUser) return;

    console.log(`code-change received from user=${currentUser?.name} userId=${currentUser?.id} session=${currentSession} fileId=${fileId}`);

    // Store the file content in memory
    if (!sessionUserFiles.has(currentSession)) {
      sessionUserFiles.set(currentSession, new Map());
    }
    const sessionFiles = sessionUserFiles.get(currentSession);

    if (!sessionFiles.has(currentUser.id)) {
      sessionFiles.set(currentUser.id, { files: {}, currentFile: null });
    }

    const userData = sessionFiles.get(currentUser.id);
    userData.files[fileId] = {
      content,
      lastModified: Date.now()
    };
    userData.currentFile = fileId;

    // Broadcast to all other users in the session
    socket.to(currentSession).emit('code-update', {
      fileId,
      content,
      userId: currentUser?.id,
      userName: currentUser?.name,
      cursorPosition
    });
  });

  // Cursor position update
  socket.on('cursor-move', ({ fileId, position, selection }) => {
    if (!currentSession || !currentUser) {
      console.log('📍 cursor-move BLOCKED - no session or user:', { currentSession, currentUser: currentUser?.name });
      return;
    }

    console.log('📍 cursor-move received:', {
      from: currentUser.name,
      userId: currentUser.id,
      fileId,
      position,
      session: currentSession
    });

    // Update user's cursor in tracking
    const users = sessionUsers.get(currentSession);
    if (users?.has(socket.id)) {
      users.get(socket.id).cursorPosition = { fileId, position, selection };
    }

    // Get list of sockets in the room
    const room = io.sockets.adapter.rooms.get(currentSession);
    console.log('📍 Broadcasting cursor-update to room:', currentSession, 'sockets in room:', room?.size || 0);

    socket.to(currentSession).emit('cursor-update', {
      userId: currentUser.id,
      userName: currentUser.name,
      fileId,
      position,
      selection
    });
  });

  // File operations
  socket.on('file-created', ({ file }) => {
    if (!currentSession) return;
    socket.to(currentSession).emit('file-created', { file, userId: currentUser?.id });
  });

  socket.on('file-deleted', ({ path }) => {
    if (!currentSession) return;
    socket.to(currentSession).emit('file-deleted', { path, userId: currentUser?.id });
  });

  socket.on('file-renamed', ({ oldPath, newPath, newName }) => {
    if (!currentSession) return;
    socket.to(currentSession).emit('file-renamed', { oldPath, newPath, newName, userId: currentUser?.id });
  });

  // Chat message
  socket.on('chat-message', async ({ content }) => {
    console.log('📨 Chat message received:', { content, currentSession, hasUser: !!currentUser });

    if (!currentSession || !currentUser) {
      console.error('❌ Cannot process message: No session or user', { currentSession, hasUser: !!currentUser });
      return;
    }

    try {
      // Get session ID
      const session = await prisma.session.findUnique({
        where: { code: currentSession }
      });

      if (!session) {
        console.error('❌ Session not found:', currentSession);
        return;
      }

      // Save message to database
      const message = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          senderId: currentUser.id,
          content
        },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true, role: true }
          }
        }
      });

      console.log('✅ Message saved, broadcasting to room:', currentSession);

      // Broadcast to all users in session (including sender)
      io.to(currentSession).emit('chat-message', {
        id: message.id,
        content: message.content,
        timestamp: message.timestamp,
        sender: message.sender
      });

    } catch (error) {
      console.error('Chat message error:', error);
    }
  });

  // Typing indicator
  socket.on('typing-start', () => {
    if (!currentSession || !currentUser) return;
    socket.to(currentSession).emit('user-typing', { userId: currentUser.id, userName: currentUser.name });
  });

  socket.on('typing-stop', () => {
    if (!currentSession || !currentUser) return;
    socket.to(currentSession).emit('user-stopped-typing', { userId: currentUser.id });
  });

  // ============================================
  // WEBRTC SIGNALING FOR VIDEO CALLS
  // ============================================

  // User wants to start/join the call
  socket.on('call-join', () => {
    if (!currentSession || !currentUser) return;
    console.log(`📞 ${currentUser.name} joining call in session ${currentSession}`);

    // Notify others that this user wants to join the call
    socket.to(currentSession).emit('call-user-joined', {
      userId: currentUser.id,
      userName: currentUser.name,
      socketId: socket.id
    });
  });

  // User leaving the call (but staying in session)
  socket.on('call-leave', () => {
    if (!currentSession || !currentUser) return;
    console.log(`📞 ${currentUser.name} leaving call in session ${currentSession}`);

    socket.to(currentSession).emit('call-user-left', {
      userId: currentUser.id,
      socketId: socket.id
    });
  });

  // WebRTC offer (initiating peer connection)
  socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
    if (!currentSession || !currentUser) return;
    console.log(`🔗 WebRTC offer from ${currentUser.name} to ${targetSocketId}`);

    io.to(targetSocketId).emit('webrtc-offer', {
      fromUserId: currentUser.id,
      fromUserName: currentUser.name,
      fromSocketId: socket.id,
      offer
    });
  });

  // WebRTC answer (responding to offer)
  socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
    if (!currentSession || !currentUser) return;
    console.log(`🔗 WebRTC answer from ${currentUser.name} to ${targetSocketId}`);

    io.to(targetSocketId).emit('webrtc-answer', {
      fromSocketId: socket.id,
      answer
    });
  });

  // ICE candidate exchange
  socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
    if (!currentSession) return;

    io.to(targetSocketId).emit('webrtc-ice-candidate', {
      fromSocketId: socket.id,
      candidate
    });
  });

  // Toggle media (mute/unmute, camera on/off)
  socket.on('call-media-toggle', ({ type, enabled }) => {
    if (!currentSession || !currentUser) return;

    socket.to(currentSession).emit('call-media-toggle', {
      userId: currentUser.id,
      socketId: socket.id,
      type, // 'audio' or 'video'
      enabled
    });
  });

  // Screen share started/stopped
  socket.on('call-screen-share', ({ enabled }) => {
    if (!currentSession || !currentUser) return;
    console.log(`🖥️ ${currentUser.name} ${enabled ? 'started' : 'stopped'} screen sharing`);

    socket.to(currentSession).emit('call-screen-share', {
      userId: currentUser.id,
      socketId: socket.id,
      enabled
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);

    if (currentSession && sessionUsers.has(currentSession)) {
      const users = sessionUsers.get(currentSession);
      const user = users.get(socket.id);
      users.delete(socket.id);

      // Notify others
      if (user) {
        socket.to(currentSession).emit('user-left', {
          userId: user.id,
          participants: Array.from(users.values())
        });
        console.log(`👤 ${user.name} left session ${currentSession}`);
      }

      // Clean up empty sessions
      if (users.size === 0) {
        sessionUsers.delete(currentSession);
      }
    }
  });
});

// ============================================
// START SERVER
// ============================================

httpServer.listen(PORT, () => {
  console.log(`🚀 CodeSync Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Features:');
  console.log(`  ✓ REST API for auth & sessions`);
  console.log(`  ✓ WebSocket for real-time collaboration`);
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
  console.log('Session endpoints:');
  console.log(`  POST /sessions      - Create session (teachers)`);
  console.log(`  POST /sessions/join - Join session by code`);
  console.log(`  GET  /sessions/:code - Get session info`);
  console.log(`  GET  /sessions/:code/files - Get session files`);
  console.log(`  PUT  /sessions/:code/files - Save file`);
  console.log('');
});
