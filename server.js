const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Store active rooms
const rooms = new Map();

// Helper: Generate 4-letter room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

// Bot names in Arabic
const BOT_NAMES = ['فيصل', 'سارة', 'عبدالله', 'نورة', 'طارق', 'ريما', 'سلطان', 'منى', 'ماجد', 'هند', 'بدر', 'لمى'];

function getAvailableBotName(existingPlayers) {
  const taken = existingPlayers.map(p => p.name);
  const available = BOT_NAMES.filter(n => !taken.includes(n));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return `لاعب آلي ${Math.floor(Math.random() * 100)}`;
}

// Broadcast sanitized room state to players
function broadcastRoomState(room) {
  room.players.forEach(player => {
    if (player.isBot) return;

    // Build personalized player list
    const sanitizedPlayers = room.players.map(p => {
      const isSelf = p.id === player.id;
      const isFellowMafia = player.role === 'mafia' && p.role === 'mafia';
      const isGameOver = room.state === 'GAME_OVER';
      const isRevealed = p.revealed;

      return {
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isBot: p.isBot,
        seatIndex: p.seatIndex,
        alive: p.alive,
        hasInnocentBadge: p.hasInnocentBadge || false, // سيف/درع البراءة والحماية
        revealedRole: (isSelf || isFellowMafia || isGameOver || isRevealed) ? p.role : null,
        votesAgainst: Object.values(room.dayVotes || {}).filter(targetId => targetId === p.id).length
      };
    });

    const payload = {
      code: room.code,
      state: room.state,
      settings: room.settings,
      phaseTimeLeft: room.phaseTimeLeft || 0,
      phaseMessage: room.phaseMessage || '',
      players: sanitizedPlayers,
      myPlayer: {
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        role: player.role,
        alive: player.alive,
        seatIndex: player.seatIndex,
        hasInnocentBadge: player.hasInnocentBadge || false
      },
      winner: room.winner,
      nightLog: room.nightLog || null,
      detectiveInspection: player.role === 'detective' ? room.lastDetectiveInspection : null
    };

    io.to(player.id).emit('room_update', payload);
  });
}

function clearRoomTimer(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
}

function startTimer(room, durationSec, onTick, onComplete) {
  clearRoomTimer(room);
  room.phaseTimeLeft = durationSec;
  room.timer = setInterval(() => {
    room.phaseTimeLeft--;
    if (onTick) onTick(room.phaseTimeLeft);
    
    // Send lightweight timer tick to all connected players (low bandwidth, zero lag!)
    io.to(room.code).emit('timer_tick', { timeLeft: room.phaseTimeLeft });

    if (room.phaseTimeLeft <= 0) {
      clearRoomTimer(room);
      if (onComplete) onComplete();
    }
  }, 1000);
}

// Check Win Conditions
function checkWinCondition(room) {
  const alivePlayers = room.players.filter(p => p.alive);
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
  const aliveCitizens = alivePlayers.filter(p => p.role !== 'mafia');

  if (aliveMafia.length === 0) {
    // Citizens win!
    room.state = 'GAME_OVER';
    room.winner = 'CITIZENS';
    room.phaseMessage = '🎉 انتصار الأبرياء والمواطنين! تم القضاء على جميع أفراد المافيا!';
    clearRoomTimer(room);
    broadcastRoomState(room);
    return true;
  }

  if (aliveMafia.length >= aliveCitizens.length) {
    // Mafia wins!
    room.state = 'GAME_OVER';
    room.winner = 'MAFIA';
    room.phaseMessage = '😈 انتصار عصابة المافيا! لقد سيطروا على المدينة بالكامل!';
    clearRoomTimer(room);
    broadcastRoomState(room);
    return true;
  }

  return false;
}

// Bot Decision Helpers
function handleBotNightActions(room) {
  const alivePlayers = room.players.filter(p => p.alive);
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
  const aliveDoctor = alivePlayers.find(p => p.role === 'doctor');
  const aliveDetective = alivePlayers.find(p => p.role === 'detective');

  // Mafia Bot
  const botMafia = aliveMafia.filter(p => p.isBot);
  if (botMafia.length > 0 && !room.nightActions.mafiaTarget) {
    const nonMafiaAlive = alivePlayers.filter(p => p.role !== 'mafia');
    if (nonMafiaAlive.length > 0) {
      const chosen = nonMafiaAlive[Math.floor(Math.random() * nonMafiaAlive.length)];
      room.nightActions.mafiaTarget = chosen.id;
    }
  }

  // Doctor Bot
  if (aliveDoctor && aliveDoctor.isBot && !room.nightActions.doctorTarget) {
    const chosen = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    room.nightActions.doctorTarget = chosen.id;
  }

  // Detective Bot
  if (aliveDetective && aliveDetective.isBot && !room.nightActions.detectiveTarget) {
    const others = alivePlayers.filter(p => p.id !== aliveDetective.id);
    if (others.length > 0) {
      const chosen = others[Math.floor(Math.random() * others.length)];
      room.nightActions.detectiveTarget = chosen.id;
    }
  }
}

// Start Night Cycle
function startNight(room) {
  room.nightActions = {
    mafiaTarget: null,
    doctorTarget: null,
    detectiveTarget: null,
    mafiaLocked: false,
    doctorLocked: false,
    detectiveLocked: false
  };
  room.lastDetectiveInspection = null;

  // Step 1: Mafia Phase
  room.state = 'NIGHT_MAFIA';
  room.phaseMessage = '🌙 حلّ الليل... دور عصابة المافيا لاختيار الضحية!';
  broadcastRoomState(room);

  // Trigger any bot mafia action after a short realistic delay
  setTimeout(() => {
    handleBotNightActions(room);
  }, 2000);

  startTimer(room, 20, null, () => {
    transitionToDoctor(room);
  });
}

function transitionToDoctor(room) {
  room.state = 'NIGHT_DOCTOR';
  room.phaseMessage = '💉 دور الدكتور لاختيار لاعب لحمايته هذه الليلة!';
  broadcastRoomState(room);

  setTimeout(() => {
    handleBotNightActions(room);
  }, 1500);

  startTimer(room, 15, null, () => {
    transitionToDetective(room);
  });
}

function transitionToDetective(room) {
  room.state = 'NIGHT_DETECTIVE';
  room.phaseMessage = '🔍 دور المحقق لفحص هوية أحد المشتبه بهم!';
  broadcastRoomState(room);

  setTimeout(() => {
    handleBotNightActions(room);
  }, 1500);

  startTimer(room, 15, null, () => {
    resolveNight(room);
  });
}

// Resolve Night Results
function resolveNight(room) {
  const { mafiaTarget, doctorTarget } = room.nightActions;
  let nightResultMsg = '';
  let killedPlayer = null;
  let protectedPlayer = null;

  if (doctorTarget) {
    protectedPlayer = room.players.find(p => p.id === doctorTarget);
  }

  if (mafiaTarget) {
    const targetPlayer = room.players.find(p => p.id === mafiaTarget);

    if (targetPlayer) {
      if (doctorTarget === mafiaTarget) {
        // Saved by doctor!
        // User requirement: "اذا حمى المقتول ما ينقتل ويجي على المحمي سيف/درع للكن عشان ينعرف انه بريئ"
        targetPlayer.hasInnocentBadge = true; // علامة البراءة والسيف
        nightResultMsg = `🛡️ تمت محاولة اغتيال اللاعب (${targetPlayer.name}) ولكن تدخّل الدكتور في الوقت المناسب وأنقذ حياته! وبذلك ثبتت براءته وحصل على شارة الحماية! ⚔️`;
      } else {
        // Player is killed
        targetPlayer.alive = false;
        killedPlayer = targetPlayer;
        nightResultMsg = `⚰️ استيقظت المدينة على خبر مفجع! تم العثور على اللاعب (${targetPlayer.name}) مقتولاً بعد هجوم المافيا!`;
      }
    }
  } else {
    nightResultMsg = '🕊️ مرت الليلة بسلام وأمان دون أي جرائم قتل!';
  }

  room.nightLog = nightResultMsg;
  room.state = 'DAY_ANNOUNCE';
  room.phaseMessage = nightResultMsg;
  broadcastRoomState(room);

  // Check game over
  if (checkWinCondition(room)) return;

  // After 6 seconds of showing night results, move to day discussion
  setTimeout(() => {
    if (room.state !== 'DAY_ANNOUNCE') return;
    startDayDiscussion(room);
  }, 6000);
}

function startDayDiscussion(room) {
  room.state = 'DAY_DISCUSSION';
  room.phaseMessage = '☀️ حل الصباح! حان وقت النقاش والبحث عن المافيا بينكم.';
  broadcastRoomState(room);

  startTimer(room, 45, null, () => {
    startVoting(room);
  });
}

function startVoting(room) {
  room.state = 'DAY_VOTING';
  room.dayVotes = {}; // voterId: targetId
  room.phaseMessage = '⚖️ بدأت جلسة التصويت! اختر اللاعب الذي تشك أنه من المافيا لإقصائه.';
  broadcastRoomState(room);

  // Bot voting simulation
  setTimeout(() => {
    simulateBotVotes(room);
  }, 3000);

  startTimer(room, 30, null, () => {
    resolveVoting(room);
  });
}

function simulateBotVotes(room) {
  if (room.state !== 'DAY_VOTING') return;

  const alivePlayers = room.players.filter(p => p.alive);
  const botPlayers = alivePlayers.filter(p => p.isBot);

  botPlayers.forEach(bot => {
    if (!room.dayVotes[bot.id]) {
      // Pick another alive player
      const candidates = alivePlayers.filter(p => p.id !== bot.id);
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        room.dayVotes[bot.id] = target.id;
      }
    }
  });

  broadcastRoomState(room);

  // If everyone alive voted, resolve immediately
  const aliveIds = alivePlayers.map(p => p.id);
  const allVoted = aliveIds.every(id => room.dayVotes[id]);
  if (allVoted) {
    clearRoomTimer(room);
    resolveVoting(room);
  }
}

function resolveVoting(room) {
  const alivePlayers = room.players.filter(p => p.alive);
  const voteCounts = {};

  alivePlayers.forEach(p => {
    voteCounts[p.id] = 0;
  });

  Object.values(room.dayVotes).forEach(targetId => {
    if (voteCounts[targetId] !== undefined) {
      voteCounts[targetId]++;
    }
  });

  let maxVotes = 0;
  let candidateId = null;
  let isTie = false;

  for (const [id, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidateId = id;
      isTie = false;
    } else if (count === maxVotes && count > 0) {
      isTie = true;
    }
  }

  let resultMsg = '';
  if (maxVotes === 0 || isTie || !candidateId) {
    resultMsg = '⚖️ تساوت الأصوات أو امتنع الأغلبية عن التصويت! لم يتم إقصاء أحد اليوم.';
  } else {
    const eliminated = room.players.find(p => p.id === candidateId);
    if (eliminated) {
      eliminated.alive = false;
      // User requirement: "الي يجي عليه تصويت اكثر يطلع بدون ما تنكشف اوراقه او تنكشف اوراقه تتحدد من انشاء الغرفة"
      if (room.settings.revealOnVote) {
        eliminated.revealed = true;
        const roleAr = {
          mafia: 'مافيا 👿',
          doctor: 'دكتور 💉',
          detective: 'محقق 🔍',
          citizen: 'مواطن بريء 👤'
        }[eliminated.role];
        resultMsg = `⚖️ بأغلبية ${maxVotes} أصوات، قررت المدينة إقصاء اللاعب (${eliminated.name})! وقد تبيّن أنه: [${roleAr}]!`;
      } else {
        resultMsg = `⚖️ بأغلبية ${maxVotes} أصوات، قررت المدينة إقصاء اللاعب (${eliminated.name})! خرج من اللعبة وبقيت هويته سرّاً غامضاً!`;
      }
    }
  }

  room.state = 'VOTE_RESULT';
  room.phaseMessage = resultMsg;
  broadcastRoomState(room);

  // Check Game Over
  if (checkWinCondition(room)) return;

  // Move back to Night after 6 seconds
  setTimeout(() => {
    if (room.state !== 'VOTE_RESULT') return;
    startNight(room);
  }, 6000);
}

// Start Game and Shuffle Cards
function startGame(room) {
  room.state = 'SHUFFLING';
  room.phaseMessage = '🃏 جاري خبص وتوزيع الطبايق على الطاولة الدائرية...';
  room.winner = null;
  room.nightLog = null;
  room.lastDetectiveInspection = null;

  // Prepare roles
  const count = room.players.length;
  const mafiaCount = Math.min(room.settings.mafiaCount || 1, Math.floor(count / 2));
  
  let roles = [];
  for (let i = 0; i < mafiaCount; i++) roles.push('mafia');
  roles.push('doctor');
  roles.push('detective');

  while (roles.length < count) {
    roles.push('citizen');
  }

  // Shuffle roles using Fisher-Yates
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  // Assign to players
  room.players.forEach((p, idx) => {
    p.role = roles[idx];
    p.alive = true;
    p.revealed = false;
    p.hasInnocentBadge = false;
    p.seatIndex = idx;
  });

  broadcastRoomState(room);

  // Dynamic shuffle & dealing timer so cards deal smoothly one by one and allow fullscreen card reveal
  const shuffleSeconds = Math.max(10, Math.ceil(room.players.length * 0.8) + 5);
  startTimer(room, shuffleSeconds, null, () => {
    startNight(room);
  });
}

// Reset Game to Lobby or Play Again
function resetGame(room) {
  clearRoomTimer(room);
  room.state = 'LOBBY';
  room.winner = null;
  room.nightLog = null;
  room.lastDetectiveInspection = null;
  room.dayVotes = {};
  room.nightActions = {};

  room.players.forEach(p => {
    p.role = null;
    p.alive = true;
    p.revealed = false;
    p.hasInnocentBadge = false;
  });

  broadcastRoomState(room);
}

// Socket.io Events
io.on('connection', (socket) => {
  let currentRoomCode = null;

  // Create Room
  socket.on('create_room', (data, callback) => {
    const playerName = (data.playerName || '').trim();
    if (!playerName) {
      return callback({ success: false, message: 'يجب إدخال اسمك أولاً!' });
    }

    const totalPlayers = Math.max(4, Math.min(12, parseInt(data.totalPlayers) || 6));
    const mafiaCount = Math.max(1, Math.min(3, parseInt(data.mafiaCount) || 1));
    const revealOnVote = Boolean(data.revealOnVote);

    const code = generateRoomCode();
    const room = {
      code,
      hostId: socket.id,
      state: 'LOBBY',
      settings: {
        totalPlayers,
        mafiaCount,
        revealOnVote
      },
      players: [
        {
          id: socket.id,
          name: playerName,
          isHost: true,
          isBot: false,
          seatIndex: 0,
          role: null,
          alive: true,
          revealed: false,
          hasInnocentBadge: false
        }
      ],
      timer: null
    };

    rooms.set(code, room);
    currentRoomCode = code;
    socket.join(code);

    callback({ success: true, roomCode: code });
    broadcastRoomState(room);
  });

  // Join Room
  socket.on('join_room', (data, callback) => {
    const playerName = (data.playerName || '').trim();
    const roomCode = (data.roomCode || '').trim().toUpperCase();

    if (!playerName) {
      return callback({ success: false, message: 'يجب إدخال اسمك أولاً قبل إدخال الرمز!' });
    }

    if (!roomCode) {
      return callback({ success: false, message: 'يرجى إدخال رمز الغرفة!' });
    }

    const room = rooms.get(roomCode);
    if (!room) {
      return callback({ success: false, message: 'الغرفة غير موجودة! تحقق من الرمز.' });
    }

    if (room.state !== 'LOBBY') {
      return callback({ success: false, message: 'العبة بدأت بالفعل في هذه الغرفة!' });
    }

    if (room.players.length >= room.settings.totalPlayers) {
      return callback({ success: false, message: 'الغرفة ممتلئة بالكامل!' });
    }

    // Add player
    const newPlayer = {
      id: socket.id,
      name: playerName,
      isHost: false,
      isBot: false,
      seatIndex: room.players.length,
      role: null,
      alive: true,
      revealed: false,
      hasInnocentBadge: false
    };

    room.players.push(newPlayer);
    currentRoomCode = roomCode;
    socket.join(roomCode);

    callback({ success: true, roomCode });
    broadcastRoomState(room);
  });

  // Add Bot Player (for easy solo testing or filling empty spots)
  socket.on('add_bot', (data, callback) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

    if (room.players.length >= room.settings.totalPlayers) {
      if (callback) callback({ success: false, message: 'الغرفة ممتلئة!' });
      return;
    }

    const botName = getAvailableBotName(room.players);
    const botPlayer = {
      id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: botName,
      isHost: false,
      isBot: true,
      seatIndex: room.players.length,
      role: null,
      alive: true,
      revealed: false,
      hasInnocentBadge: false
    };

    room.players.push(botPlayer);
    if (callback) callback({ success: true });
    broadcastRoomState(room);
  });

  // Remove Bot
  socket.on('remove_bot', (data, callback) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

    const botIdx = room.players.map(p => p.isBot).lastIndexOf(true);
    if (botIdx !== -1) {
      room.players.splice(botIdx, 1);
      // Re-index seats
      room.players.forEach((p, idx) => p.seatIndex = idx);
      broadcastRoomState(room);
      if (callback) callback({ success: true });
    }
  });

  // Host starts game
  socket.on('start_game', (data, callback) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    if (room.players.length < 4) {
      if (callback) callback({ success: false, message: 'الحد الأدنى لبدء اللعبة 4 لاعبين (يمكنك إضافة لاعبين آليين بالتجربة)!' });
      return;
    }

    startGame(room);
    if (callback) callback({ success: true });
  });

  // Mafia Night Kill Target (Once per night)
  socket.on('mafia_kill', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'NIGHT_MAFIA') return;

    if (room.nightActions.mafiaLocked) {
      return socket.emit('action_error', { message: 'تم اختيار هدف الاغتيال لهذه الليلة بالفعل!' });
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.alive || player.role !== 'mafia') return;

    const target = room.players.find(p => p.id === data.targetId && p.alive && p.role !== 'mafia');
    if (target) {
      room.nightActions.mafiaTarget = target.id;
      room.nightActions.mafiaLocked = true;
      // Inform fellow mafia
      room.players.filter(p => p.role === 'mafia' && !p.isBot).forEach(m => {
        io.to(m.id).emit('mafia_vote_update', { targetId: target.id, targetName: target.name });
      });
    }
  });

  // Doctor Protect Target (Once per night)
  socket.on('doctor_protect', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'NIGHT_DOCTOR') return;

    if (room.nightActions.doctorLocked) {
      return socket.emit('action_error', { message: 'لقد حميت لاعباً بالفعل لهذه الليلة!' });
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.alive || player.role !== 'doctor') return;

    const target = room.players.find(p => p.id === data.targetId && p.alive);
    if (target) {
      room.nightActions.doctorTarget = target.id;
      room.nightActions.doctorLocked = true;
      socket.emit('doctor_protect_confirmed', { targetId: target.id, targetName: target.name });
    }
  });

  // Detective Inspect Target (Once per round only!)
  socket.on('detective_inspect', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'NIGHT_DETECTIVE') return;

    if (room.nightActions.detectiveLocked) {
      return socket.emit('action_error', { message: 'لقد فحصت ورقة أحد المشتبه بهم بالفعل لهذه الليلة!' });
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.alive || player.role !== 'detective') return;

    const target = room.players.find(p => p.id === data.targetId && p.alive);
    if (target) {
      room.nightActions.detectiveTarget = target.id;
      room.nightActions.detectiveLocked = true;
      const isMafia = target.role === 'mafia';
      room.lastDetectiveInspection = {
        targetId: target.id,
        targetName: target.name,
        isMafia,
        role: target.role
      };
      socket.emit('detective_result', room.lastDetectiveInspection);
    }
  });

  // Skip discussion to voting (Host action)
  socket.on('skip_to_vote', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('action_error', { message: 'فقط مضيف الغرفة يمكنه تقديم وقت التصويت!' });
      return;
    }
    if (room.state !== 'DAY_DISCUSSION' && room.state !== 'DAY_ANNOUNCE') {
      socket.emit('action_error', { message: 'لا يمكن بدء التصويت إلا أثناء وقت النهار!' });
      return;
    }
    console.log(`[ROOM ${room.code}] Host requested skip_to_vote. Starting voting!`);
    clearRoomTimer(room);
    startVoting(room);
  });

  // Cast Day Vote
  socket.on('cast_vote', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'DAY_VOTING') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.alive) return;

    const target = room.players.find(p => p.id === data.targetId && p.alive);
    if (target) {
      room.dayVotes[socket.id] = target.id;
    } else if (data.targetId === null) {
      // Abstain / skip
      delete room.dayVotes[socket.id];
    }

    broadcastRoomState(room);

    // If all alive humans have voted and bots voted, resolve immediately
    const alivePlayers = room.players.filter(p => p.alive);
    const aliveIds = alivePlayers.map(p => p.id);
    const allVoted = aliveIds.every(id => room.dayVotes[id]);
    if (allVoted) {
      clearRoomTimer(room);
      resolveVoting(room);
    }
  });

  // Chat message
  socket.on('send_chat', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const text = (data.message || '').trim().slice(0, 150);
    if (!text) return;

    io.to(room.code).emit('chat_message', {
      senderName: player.name,
      senderRole: (room.state === 'GAME_OVER') ? player.role : null,
      alive: player.alive,
      isSelf: false,
      text,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Play Again (العب مجدداً)
  socket.on('play_again', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    // Reset and restart
    resetGame(room);
  });

  // Leave / Exit Room (خروج)
  socket.on('leave_room', () => {
    if (!currentRoomCode) return;
    handleDisconnectOrLeave(socket, currentRoomCode);
    currentRoomCode = null;
    socket.emit('left_room');
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      handleDisconnectOrLeave(socket, currentRoomCode);
    }
  });
});

function handleDisconnectOrLeave(socket, code) {
  const room = rooms.get(code);
  if (!room) return;

  const idx = room.players.findIndex(p => p.id === socket.id);
  if (idx !== -1) {
    const wasHost = room.players[idx].isHost;
    room.players.splice(idx, 1);

    if (room.players.filter(p => !p.isBot).length === 0) {
      // Room empty of real humans, cleanup
      clearRoomTimer(room);
      rooms.delete(code);
      return;
    }

    // Reassign host if host left
    if (wasHost && room.players.length > 0) {
      const nextHuman = room.players.find(p => !p.isBot) || room.players[0];
      nextHuman.isHost = true;
      room.hostId = nextHuman.id;
    }

    // Re-index seats
    room.players.forEach((p, i) => p.seatIndex = i);

    if (room.state !== 'LOBBY' && room.state !== 'GAME_OVER') {
      checkWinCondition(room);
    }

    broadcastRoomState(room);
  }
}

// Get Local Network IP for convenient mobile connections
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`\n======================================================`);
  console.log(`🎭 Mafia Game Server is running!`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 Network: http://${localIP}:${PORT} (Open from phone on same Wi-Fi!)`);
  console.log(`======================================================\n`);
});
