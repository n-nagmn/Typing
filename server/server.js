// =============================================================================
// Sushi Typing Game - Backend Server
// Express + Socket.IO server for rankings and multiplayer battle mode
// =============================================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3019;
const DATA_DIR = path.join(__dirname, 'data');
const OVERALL_FILE = path.join(DATA_DIR, 'rankings_overall.json');
const WEEKLY_FILE = path.join(DATA_DIR, 'rankings_weekly.json');
const MAX_OVERALL_ENTRIES = 500;
const MAX_RETURN_ENTRIES = 100;
const MAX_PLAYERS_PER_ROOM = 4;
const ROOM_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const VALID_DIFFICULTIES = ['easy', 'normal', 'hard'];
const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // UTC+9

// Import server-side word database
const wordDatabase = require('./words_server');

// ---------------------------------------------------------------------------
// Ensure data directory and files exist
// ---------------------------------------------------------------------------
function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('[INIT] Created data directory:', DATA_DIR);
  }
  if (!fs.existsSync(OVERALL_FILE)) {
    fs.writeFileSync(OVERALL_FILE, JSON.stringify({ entries: [] }, null, 2), 'utf8');
    console.log('[INIT] Created overall rankings file');
  }
  if (!fs.existsSync(WEEKLY_FILE)) {
    fs.writeFileSync(WEEKLY_FILE, JSON.stringify({ lastReset: new Date().toISOString(), entries: [] }, null, 2), 'utf8');
    console.log('[INIT] Created weekly rankings file');
  }
}

ensureDataFiles();

// ---------------------------------------------------------------------------
// JSON File I/O helpers (synchronous for atomicity)
// ---------------------------------------------------------------------------
function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[ERROR] Failed to read ${filePath}:`, err.message);
    if (filePath === OVERALL_FILE) {
      return { entries: [] };
    }
    return { lastReset: new Date().toISOString(), entries: [] };
  }
}

function writeJsonFile(filePath, data) {
  try {
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[ERROR] Failed to write ${filePath}:`, err.message);
    // Fallback: write directly if rename fails
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (fallbackErr) {
      console.error(`[ERROR] Fallback write also failed:`, fallbackErr.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Weekly Reset Logic (JST timezone)
// ---------------------------------------------------------------------------
function getNextMondayJST(fromDate) {
  // Convert to JST
  const jstTime = new Date(fromDate.getTime() + JST_OFFSET_MS);
  // Find next Monday 00:00 JST
  const dayOfWeek = jstTime.getUTCDay(); // 0=Sun, 1=Mon, ...
  let daysUntilMonday;
  if (dayOfWeek === 0) {
    daysUntilMonday = 1; // Sunday -> next day is Monday
  } else if (dayOfWeek === 1) {
    // If it's Monday, the next reset is next Monday (7 days)
    daysUntilMonday = 7;
  } else {
    daysUntilMonday = 8 - dayOfWeek;
  }
  const nextMonday = new Date(Date.UTC(
    jstTime.getUTCFullYear(),
    jstTime.getUTCMonth(),
    jstTime.getUTCDate() + daysUntilMonday,
    0, 0, 0, 0
  ));
  // Convert back from JST to UTC
  return new Date(nextMonday.getTime() - JST_OFFSET_MS);
}

function checkAndResetWeekly() {
  const data = readJsonFile(WEEKLY_FILE);
  const lastReset = new Date(data.lastReset || '2024-01-01T00:00:00.000Z');
  const now = new Date();
  const nextReset = getNextMondayJST(lastReset);

  if (now >= nextReset) {
    console.log('[WEEKLY] Resetting weekly rankings. Last reset:', lastReset.toISOString(), '| Next was:', nextReset.toISOString());
    // Archive old entries
    if (data.entries && data.entries.length > 0) {
      const archivePath = path.join(DATA_DIR, `rankings_weekly_archive_${lastReset.toISOString().replace(/[:.]/g, '-')}.json`);
      try {
        writeJsonFile(archivePath, { archivedAt: now.toISOString(), entries: data.entries });
        console.log('[WEEKLY] Archived', data.entries.length, 'entries to', archivePath);
      } catch (err) {
        console.error('[WEEKLY] Failed to archive:', err.message);
      }
    }
    // Reset
    const resetData = { lastReset: now.toISOString(), entries: [] };
    writeJsonFile(WEEKLY_FILE, resetData);
    console.log('[WEEKLY] Weekly rankings reset complete');
    return resetData;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Express App Setup
// ---------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// ---------------------------------------------------------------------------
// HTTP API Endpoints
// ---------------------------------------------------------------------------

// GET /api/rankings
app.get('/api/rankings', (req, res) => {
  try {
    const type = req.query.type || 'overall';
    const difficulty = req.query.difficulty || 'all';
    const mode = req.query.mode || 'all';

    // Check weekly reset
    if (type === 'weekly') {
      checkAndResetWeekly();
    }

    const filePath = type === 'weekly' ? WEEKLY_FILE : OVERALL_FILE;
    const data = readJsonFile(filePath);
    let entries = data.entries || [];

    // Filter by difficulty
    if (difficulty && difficulty !== 'all' && VALID_DIFFICULTIES.includes(difficulty)) {
      entries = entries.filter(e => e.difficulty === difficulty);
    }

    // Filter by mode
    if (mode && mode !== 'all') {
      // For old records without a mode, we assume 'normal'
      entries = entries.filter(e => (e.mode || 'normal') === mode);
    }

    // Sort by score descending, then by timestamp ascending (earlier is better for ties)
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    // Return top 100
    const result = entries.slice(0, MAX_RETURN_ENTRIES);

    res.json(result);
  } catch (err) {
    console.error('[ERROR] GET /api/rankings:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rankings
app.post('/api/rankings', (req, res) => {
  try {
    const { name, score, difficulty, mode, accuracy, maxCombo, wpm, missCount, wordsCompleted, platesTally } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length > 8) {
      return res.status(400).json({ error: 'Name must be 8 characters or less' });
    }
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Score must be a non-negative number' });
    }
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: 'Difficulty must be one of: easy, normal, hard' });
    }
    
    const validModes = ['normal', 'practice', 'accuracy', 'speed', 'sudden_death'];
    const safeMode = validModes.includes(mode) ? mode : 'normal';

    // Sanitize platesTally: only accept known price keys
    const validPrices = [300, 500, 800, 1000, 1500];
    const sanitizedTally = {};
    if (platesTally && typeof platesTally === 'object') {
      validPrices.forEach(p => {
        sanitizedTally[p] = typeof platesTally[p] === 'number' ? Math.floor(platesTally[p]) : 0;
      });
    }

    const entry = {
      id: uuidv4(),
      name: name.trim(),
      score: Math.floor(score),
      difficulty: difficulty,
      mode: safeMode,
      accuracy: typeof accuracy === 'number' ? Math.round(accuracy * 100) / 100 : 0,
      maxCombo: typeof maxCombo === 'number' ? Math.floor(maxCombo) : 0,
      wpm: typeof wpm === 'number' ? Math.round(wpm * 100) / 100 : 0,
      missCount: typeof missCount === 'number' ? Math.floor(missCount) : 0,
      wordsCompleted: typeof wordsCompleted === 'number' ? Math.floor(wordsCompleted) : 0,
      platesTally: sanitizedTally,
      timestamp: new Date().toISOString()
    };

    // Add to overall rankings
    const overallData = readJsonFile(OVERALL_FILE);
    overallData.entries.push(entry);
    overallData.entries.sort((a, b) => b.score - a.score);
    overallData.entries = overallData.entries.slice(0, MAX_OVERALL_ENTRIES);
    writeJsonFile(OVERALL_FILE, overallData);

    // Determine rank in overall
    const overallRank = overallData.entries.findIndex(e => e.id === entry.id) + 1;

    // Add to weekly rankings
    checkAndResetWeekly();
    const weeklyData = readJsonFile(WEEKLY_FILE);
    weeklyData.entries.push(entry);
    weeklyData.entries.sort((a, b) => b.score - a.score);
    weeklyData.entries = weeklyData.entries.slice(0, MAX_OVERALL_ENTRIES);
    writeJsonFile(WEEKLY_FILE, weeklyData);

    console.log(`[RANKING] New entry: ${entry.name} | Score: ${entry.score} | Difficulty: ${entry.difficulty} | Rank: ${overallRank}`);

    res.json({
      success: true,
      rank: overallRank > 0 ? overallRank : null,
      entry: entry
    });
  } catch (err) {
    console.error('[ERROR] POST /api/rankings:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rankings/stats
app.get('/api/rankings/stats', (req, res) => {
  try {
    const overallData = readJsonFile(OVERALL_FILE);
    const entries = overallData.entries || [];

    const uniquePlayers = new Set(entries.map(e => e.name));
    const totalGames = entries.length;
    const topScorer = entries.length > 0
      ? { name: entries[0].name, score: entries[0].score }
      : null;
    const averageScore = entries.length > 0
      ? Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length)
      : 0;

    res.json({
      totalPlayers: uniquePlayers.size,
      totalGames: totalGames,
      topScorer: topScorer,
      averageScore: averageScore
    });
  } catch (err) {
    console.error('[ERROR] GET /api/rankings/stats:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ---------------------------------------------------------------------------
// Socket.IO Setup
// ---------------------------------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// ---------------------------------------------------------------------------
// Room Management
// ---------------------------------------------------------------------------
const rooms = new Map(); // roomId -> Room object

function createRoom(hostSocketId, playerName, difficulty, maxPlayers) {
  const roomId = uuidv4().substring(0, 8).toUpperCase();
  const room = {
    roomId: roomId,
    host: playerName,
    hostSocketId: hostSocketId,
    difficulty: difficulty || 'normal',
    maxPlayers: Math.min(Math.max(maxPlayers || 4, 2), MAX_PLAYERS_PER_ROOM),
    status: 'waiting', // waiting, playing, finished
    players: new Map(),
    results: new Map(),
    words: [],
    timeLimit: 60,
    createdAt: Date.now(),
    lastActivity: Date.now()
  };

  // Add host as first player
  room.players.set(hostSocketId, {
    socketId: hostSocketId,
    name: playerName,
    isHost: true,
    score: 0,
    combo: 0,
    wordsCompleted: 0,
    accuracy: 0,
    finished: false
  });

  rooms.set(roomId, room);
  console.log(`[ROOM] Created room ${roomId} by ${playerName} (difficulty: ${difficulty})`);
  return room;
}

function getRoomPublicInfo(room) {
  const players = [];
  room.players.forEach(p => {
    players.push({
      name: p.name,
      isHost: p.isHost,
      score: p.score,
      combo: p.combo,
      wordsCompleted: p.wordsCompleted,
      accuracy: p.accuracy,
      finished: p.finished
    });
  });

  return {
    roomId: room.roomId,
    host: room.host,
    difficulty: room.difficulty,
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    status: room.status,
    players: players
  };
}

function getRoomListPublic() {
  const list = [];
  rooms.forEach(room => {
    if (room.status === 'waiting') {
      list.push({
        roomId: room.roomId,
        host: room.host,
        difficulty: room.difficulty,
        playerCount: room.players.size,
        maxPlayers: room.maxPlayers,
        status: room.status
      });
    }
  });
  return list;
}

function removePlayerFromRoom(socketId) {
  for (const [roomId, room] of rooms) {
    if (room.players.has(socketId)) {
      const player = room.players.get(socketId);
      const playerName = player.name;
      room.players.delete(socketId);
      room.lastActivity = Date.now();

      console.log(`[ROOM] Player ${playerName} left room ${roomId} (${room.players.size} remaining)`);

      // If room is empty, delete it
      if (room.players.size === 0) {
        rooms.delete(roomId);
        console.log(`[ROOM] Deleted empty room ${roomId}`);
        return { roomId, playerName, room: null, deleted: true };
      }

      // Transfer host if the leaving player was host
      if (player.isHost) {
        const newHost = room.players.values().next().value;
        if (newHost) {
          newHost.isHost = true;
          room.host = newHost.name;
          room.hostSocketId = newHost.socketId;
          console.log(`[ROOM] Host transferred to ${newHost.name} in room ${roomId}`);
        }
      }

      // If game is in progress and a player leaves, check if all remaining are finished
      if (room.status === 'playing') {
        checkBattleComplete(roomId);
      }

      return { roomId, playerName, room, deleted: false };
    }
  }
  return null;
}

function findRoomBySocketId(socketId) {
  for (const [roomId, room] of rooms) {
    if (room.players.has(socketId)) {
      return room;
    }
  }
  return null;
}

function generateBattleWords(difficulty, count) {
  const words = wordDatabase[difficulty] || wordDatabase.normal;
  const shuffled = [...words];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function checkBattleComplete(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'playing') return false;

  let allFinished = true;
  room.players.forEach(player => {
    if (!player.finished) {
      allFinished = false;
    }
  });

  if (allFinished) {
    finishBattle(roomId);
    return true;
  }
  return false;
}

function finishBattle(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.status = 'finished';
  room.lastActivity = Date.now();

  // Compile results
  const results = [];
  room.players.forEach(player => {
    const playerResult = room.results.get(player.socketId) || {};
    results.push({
      playerName: player.name,
      score: playerResult.score ?? player.score ?? 0,
      accuracy: playerResult.accuracy ?? player.accuracy ?? 0,
      combo: playerResult.maxCombo ?? player.maxCombo ?? player.combo ?? 0,
      wordsCompleted: playerResult.wordsCompleted ?? player.wordsCompleted ?? 0,
      wpm: playerResult.wpm ?? 0,
      missCount: playerResult.missCount ?? 0
    });
  });

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  const winner = results.length > 0 ? results[0].playerName : null;

  console.log(`[BATTLE] Room ${roomId} finished. Winner: ${winner}`);

  // Broadcast results to all players in the room
  io.to(roomId).emit('battle-results', { results, winner });

  // Reset room to waiting state after a short delay
  setTimeout(() => {
    const r = rooms.get(roomId);
    if (r && r.status === 'finished') {
      r.status = 'waiting';
      r.results.clear();
      r.words = [];
      if (r.wagyuInterval) {
        clearInterval(r.wagyuInterval);
        r.wagyuInterval = null;
      }
      r.players.forEach(p => {
        p.score = 0;
        p.combo = 0;
        p.wordsCompleted = 0;
        p.accuracy = 0;
        p.finished = false;
      });
      console.log(`[ROOM] Room ${roomId} reset to waiting state`);
      // Notify players
      io.to(roomId).emit('room-updated', getRoomPublicInfo(r));
      // Update room list
      io.emit('room-list', getRoomListPublic());
    }
  }, 5000);
}

// ---------------------------------------------------------------------------
// Room Cleanup Interval (every 60 seconds)
// ---------------------------------------------------------------------------
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  rooms.forEach((room, roomId) => {
    if (now - room.lastActivity > ROOM_TIMEOUT_MS) {
      // Notify remaining players
      io.to(roomId).emit('error', { message: 'Room closed due to inactivity' });
      // Remove all socket connections from the Socket.IO room
      room.players.forEach((player) => {
        const socket = io.sockets.sockets.get(player.socketId);
        if (socket) {
          socket.leave(roomId);
        }
      });
      rooms.delete(roomId);
      cleaned++;
    }
  });
  if (cleaned > 0) {
    console.log(`[CLEANUP] Removed ${cleaned} inactive room(s). Active rooms: ${rooms.size}`);
    io.emit('room-list', getRoomListPublic());
  }
}, 60000);

// ---------------------------------------------------------------------------
// Socket.IO Connection Handling
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // --- Get Room List ---
  socket.on('get-rooms', () => {
    socket.emit('room-list', getRoomListPublic());
  });

  // --- Create Room ---
  socket.on('create-room', (data) => {
    try {
      if (!data || !data.playerName || typeof data.playerName !== 'string') {
        socket.emit('error', { message: 'Player name is required' });
        return;
      }

      const playerName = data.playerName.trim().substring(0, 8);
      if (playerName.length === 0) {
        socket.emit('error', { message: 'Player name cannot be empty' });
        return;
      }

      const difficulty = VALID_DIFFICULTIES.includes(data.difficulty) ? data.difficulty : 'normal';
      const maxPlayers = data.maxPlayers || MAX_PLAYERS_PER_ROOM;

      // Check if player is already in a room
      const existingRoom = findRoomBySocketId(socket.id);
      if (existingRoom) {
        socket.emit('error', { message: 'You are already in a room. Leave it first.' });
        return;
      }

      const room = createRoom(socket.id, playerName, difficulty, maxPlayers);
      socket.join(room.roomId);

      socket.emit('room-created', {
        roomId: room.roomId,
        room: getRoomPublicInfo(room)
      });

      // Broadcast updated room list to everyone
      io.emit('room-list', getRoomListPublic());
    } catch (err) {
      console.error('[ERROR] create-room:', err.message);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // --- Join Room ---
  socket.on('join-room', (data) => {
    try {
      if (!data || !data.roomId || !data.playerName) {
        socket.emit('error', { message: 'Room ID and player name are required' });
        return;
      }

      const roomId = data.roomId.toUpperCase();
      const playerName = data.playerName.trim().substring(0, 8);

      if (playerName.length === 0) {
        socket.emit('error', { message: 'Player name cannot be empty' });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Game is already in progress' });
        return;
      }

      if (room.players.size >= room.maxPlayers) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // Check if player is already in another room
      const existingRoom = findRoomBySocketId(socket.id);
      if (existingRoom) {
        socket.emit('error', { message: 'You are already in a room. Leave it first.' });
        return;
      }

      // Check for duplicate names in the room
      let nameExists = false;
      room.players.forEach(p => {
        if (p.name === playerName) nameExists = true;
      });
      if (nameExists) {
        socket.emit('error', { message: 'A player with this name is already in the room' });
        return;
      }

      // Add player
      const player = {
        socketId: socket.id,
        name: playerName,
        isHost: false,
        score: 0,
        combo: 0,
        wordsCompleted: 0,
        accuracy: 0,
        finished: false
      };
      room.players.set(socket.id, player);
      room.lastActivity = Date.now();

      socket.join(roomId);

      console.log(`[ROOM] ${playerName} joined room ${roomId} (${room.players.size}/${room.maxPlayers})`);

      // Notify the joiner
      socket.emit('room-joined', { room: getRoomPublicInfo(room) });

      // Notify others in the room
      socket.to(roomId).emit('player-joined', {
        player: { name: playerName, isHost: false },
        room: getRoomPublicInfo(room)
      });

      // Broadcast updated room list
      io.emit('room-list', getRoomListPublic());
    } catch (err) {
      console.error('[ERROR] join-room:', err.message);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // --- Leave Room ---
  socket.on('leave-room', (data) => {
    try {
      const result = removePlayerFromRoom(socket.id);
      if (!result) {
        socket.emit('error', { message: 'You are not in any room' });
        return;
      }

      socket.leave(result.roomId);

      if (!result.deleted && result.room) {
        // Notify remaining players
        io.to(result.roomId).emit('player-left', {
          playerName: result.playerName,
          room: getRoomPublicInfo(result.room)
        });
      }

      // Broadcast updated room list
      io.emit('room-list', getRoomListPublic());
    } catch (err) {
      console.error('[ERROR] leave-room:', err.message);
      socket.emit('error', { message: 'Failed to leave room' });
    }
  });

  // --- Start Battle ---
  socket.on('start-battle', (data) => {
    try {
      if (!data || !data.roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      const roomId = data.roomId.toUpperCase();
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.hostSocketId !== socket.id) {
        socket.emit('error', { message: 'Only the host can start the battle' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Game is already in progress' });
        return;
      }

      if (room.players.size < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }

      // Generate shared word list without repeating in the same room session
      const wordCount = room.difficulty === 'easy' ? 30 : room.difficulty === 'hard' ? 50 : 40;
      
      if (!room.wordQueue || room.wordQueue.length < wordCount) {
        const fullDict = wordDatabase[room.difficulty] || wordDatabase.normal;
        const shuffled = [...fullDict];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        room.wordQueue = (room.wordQueue || []).concat(shuffled);
      }
      
      const words = room.wordQueue.splice(0, wordCount);

      room.status = 'playing';
      room.words = words;
      room.lastActivity = Date.now();
      room.results.clear();

      // Reset player states
      room.players.forEach(p => {
        p.score = 0;
        p.combo = 0;
        p.wordsCompleted = 0;
        p.accuracy = 0;
        p.finished = false;
      });

      // Determine time limit based on difficulty
      const timeLimits = { easy: 60, normal: 60, hard: 90 };
      room.timeLimit = timeLimits[room.difficulty] || 60;

      console.log(`[BATTLE] Room ${roomId} started! Difficulty: ${room.difficulty}, Words: ${words.length}, TimeLimit: ${room.timeLimit}s`);

      // Broadcast to all players in the room
      io.to(roomId).emit('battle-started', {
        words: words,
        difficulty: room.difficulty,
        timeLimit: room.timeLimit,
        is1v1: room.players.size === 2
      });

      // Wagyu feature has been removed

      // Set a safety timeout to auto-finish the battle
      const safetyTimeoutMs = (room.timeLimit + 30) * 1000; // timeLimit + 30s buffer
      setTimeout(() => {
        const r = rooms.get(roomId);
        if (r && r.status === 'playing') {
          console.log(`[BATTLE] Room ${roomId} safety timeout reached, forcing finish`);
          // Mark all unfinished players as finished
          r.players.forEach(p => {
            if (!p.finished) {
              p.finished = true;
            }
          });
          if (r.wagyuInterval) clearInterval(r.wagyuInterval);
          finishBattle(roomId);
        }
      }, safetyTimeoutMs);

      // Update room list (room is no longer joinable)
      io.emit('room-list', getRoomListPublic());
    } catch (err) {
      console.error('[ERROR] start-battle:', err.message);
      socket.emit('error', { message: 'Failed to start battle' });
    }
  });

  // --- Typing Progress ---
  socket.on('typing-progress', (data) => {
    try {
      if (!data || !data.roomId) return;

      const roomId = data.roomId.toUpperCase();
      const room = rooms.get(roomId);
      if (!room || room.status !== 'playing') return;

      const player = room.players.get(socket.id);
      if (!player) return;

      // Update player state
      player.score = typeof data.score === 'number' ? data.score : player.score;
      player.combo = typeof data.combo === 'number' ? data.combo : player.combo;
      // Track maxCombo: only update if the current combo exceeds the stored max
      if (typeof data.combo === 'number') {
        player.maxCombo = Math.max(player.maxCombo || 0, data.combo);
      }
      player.wordsCompleted = typeof data.wordsCompleted === 'number' ? data.wordsCompleted : player.wordsCompleted;
      player.accuracy = typeof data.accuracy === 'number' ? data.accuracy : player.accuracy;
      room.lastActivity = Date.now();

      // Broadcast to other players in the room
      socket.to(roomId).emit('opponent-progress', {
        playerName: player.name,
        score: player.score,
        combo: player.combo,
        wordsCompleted: player.wordsCompleted,
        accuracy: player.accuracy
      });

      // Tug of war logic (1v1)
      if (room.players.size === 2) {
        const pArr = Array.from(room.players.values());
        const p1 = pArr[0];
        const p2 = pArr[1];
        let diff = p1.score - p2.score;
        if (diff > 15000) diff = 15000;
        if (diff < -15000) diff = -15000;
        const p1Percent = 50 + (diff / 15000) * 50;

        io.to(roomId).emit('tug-of-war-update', {
          p1Name: p1.name,
          p2Name: p2.name,
          p1Percent: p1Percent
        });

        if (diff >= 15000 || diff <= -15000) {
          const winner = diff >= 15000 ? p1.name : p2.name;
          room.players.forEach(p => p.finished = true);
          if (room.wagyuInterval) clearInterval(room.wagyuInterval);
          io.to(roomId).emit('tug-of-war-win', { winnerName: winner });
          finishBattle(roomId);
        }
      }
    } catch (err) {
      // Silent fail for progress updates to avoid log spam
    }
  });

  // --- Wagyu Claimed ---
  socket.on('wagyu-claimed', (data) => {
    try {
      const room = rooms.get(data.roomId);
      if (!room || room.status !== 'playing') return;
      if (room.wagyuActive && room.wagyuId === data.wagyuId) {
        room.wagyuActive = false;
        const player = room.players.get(socket.id);
        io.to(data.roomId).emit('wagyu-stolen', { winner: player.name });
      }
    } catch (err) {}
  });

  // --- Game Finished ---
  socket.on('game-finished', (data) => {
    try {
      if (!data || !data.roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      const roomId = data.roomId.toUpperCase();
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const player = room.players.get(socket.id);
      if (!player) {
        socket.emit('error', { message: 'You are not in this room' });
        return;
      }

      if (player.finished) return; // Already finished, ignore duplicate

      player.finished = true;
      room.lastActivity = Date.now();

      // Store detailed results
      if (data.results && typeof data.results === 'object') {
        room.results.set(socket.id, {
          score: typeof data.results.score === 'number' ? data.results.score : player.score,
          accuracy: typeof data.results.accuracy === 'number' ? data.results.accuracy : player.accuracy,
          maxCombo: typeof data.results.maxCombo === 'number' ? data.results.maxCombo : (player.maxCombo || 0),
          wordsCompleted: typeof data.results.wordsCompleted === 'number' ? data.results.wordsCompleted : player.wordsCompleted,
          wpm: typeof data.results.wpm === 'number' ? data.results.wpm : 0,
          missCount: typeof data.results.missCount === 'number' ? data.results.missCount : 0
        });
      }

      console.log(`[BATTLE] Player ${player.name} finished in room ${roomId}`);

      // Check if all players are done
      checkBattleComplete(roomId);
    } catch (err) {
      console.error('[ERROR] game-finished:', err.message);
      socket.emit('error', { message: 'Failed to submit results' });
    }
  });

  // --- Disconnect ---
  socket.on('disconnect', (reason) => {
    console.log(`[SOCKET] Client disconnected: ${socket.id} (${reason})`);

    const result = removePlayerFromRoom(socket.id);
    if (result && !result.deleted && result.room) {
      io.to(result.roomId).emit('player-left', {
        playerName: result.playerName,
        room: getRoomPublicInfo(result.room)
      });
    }

    // Broadcast updated room list
    io.emit('room-list', getRoomListPublic());
  });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log('=============================================================================');
  console.log(`  🍣 Sushi Typing Game Server`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`  Data: ${DATA_DIR}`);
  console.log('=============================================================================');
  console.log('[SERVER] Ready and listening for connections');
});

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------
function gracefulShutdown(signal) {
  console.log(`\n[SERVER] Received ${signal}. Shutting down gracefully...`);

  // Stop accepting new connections
  clearInterval(cleanupInterval);

  // Notify all connected clients
  io.emit('error', { message: 'Server is shutting down' });

  // Close Socket.IO
  io.close(() => {
    console.log('[SERVER] Socket.IO closed');
  });

  // Close HTTP server
  server.close(() => {
    console.log('[SERVER] HTTP server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('[SERVER] Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
});
