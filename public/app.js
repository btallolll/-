// Mafia Game Frontend Client Logic
const socket = io();

// State
let myPlayerName = localStorage.getItem('mafia_player_name') || '';
let currentRoom = null;
let currentGameState = null;
let peekCard = true;
let unreadChatCount = 0;
let lastPhase = null;

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');

const playerNameInput = document.getElementById('playerNameInput');
const nameStatus = document.getElementById('nameStatus');
const nameWarningText = document.getElementById('nameWarningText');
const createRoomBtnCard = document.getElementById('createRoomBtnCard');
const joinRoomBtnCard = document.getElementById('joinRoomBtnCard');
const openCreateModalBtn = document.getElementById('openCreateModalBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');

// Modals
const createRoomModal = document.getElementById('createRoomModal');
const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
const totalPlayersRange = document.getElementById('totalPlayersRange');
const totalPlayersVal = document.getElementById('totalPlayersVal');
const mafiaCountSelect = document.getElementById('mafiaCountSelect');
const mafiaCountVal = document.getElementById('mafiaCountVal');
const previewMafia = document.getElementById('previewMafia');
const previewCitizens = document.getElementById('previewCitizens');
const revealOnVoteToggle = document.getElementById('revealOnVoteToggle');
const confirmCreateRoomBtn = document.getElementById('confirmCreateRoomBtn');

// Lobby Elements
const displayRoomCode = document.getElementById('displayRoomCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const shareLinkBtn = document.getElementById('shareLinkBtn');
const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
const lobbyPlayersGrid = document.getElementById('lobbyPlayersGrid');
const lobbyPlayersCount = document.getElementById('lobbyPlayersCount');
const lobbyMaxPlayers = document.getElementById('lobbyMaxPlayers');
const lobbyCurrentCount = document.getElementById('lobbyCurrentCount');
const lobbyMafiaCount = document.getElementById('lobbyMafiaCount');
const lobbyRevealPill = document.getElementById('lobbyRevealPill');
const hostControls = document.getElementById('hostControls');
const guestControls = document.getElementById('guestControls');
const startGameBtn = document.getElementById('startGameBtn');
const hostStartHint = document.getElementById('hostStartHint');
const hostBotActions = document.getElementById('hostBotActions');
const addBotBtn = document.getElementById('addBotBtn');
const removeBotBtn = document.getElementById('removeBotBtn');

// Game Arena Elements
const phaseIndicator = document.getElementById('phaseIndicator');
const phaseIcon = document.getElementById('phaseIcon');
const phaseTitle = document.getElementById('phaseTitle');
const phaseSubtitle = document.getElementById('phaseSubtitle');
const timerText = document.getElementById('timerText');
const nightEventBanner = document.getElementById('nightEventBanner');
const roundTable = document.getElementById('roundTable');
const tableSeats = document.getElementById('tableSeats');
const shufflingDeck = document.getElementById('shufflingDeck');
const centerContent = document.getElementById('centerContent');
const centerSymbol = document.getElementById('centerSymbol');
const centerText = document.getElementById('centerText');

// Game Controls
const skipToVoteBtn = document.getElementById('skipToVoteBtn');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const unreadCount = document.getElementById('unreadCount');
let hasActedThisRound = false;

// Chat Drawer
const chatDrawer = document.getElementById('chatDrawer');
const closeChatBtn = document.getElementById('closeChatBtn');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

// Modals: Detective & Game Over
const detectiveModal = document.getElementById('detectiveModal');
const closeDetectiveModalBtn = document.getElementById('closeDetectiveModalBtn');
const inspectAvatar = document.getElementById('inspectAvatar');
const inspectTargetName = document.getElementById('inspectTargetName');
const inspectStamp = document.getElementById('inspectStamp');
const inspectDetailsText = document.getElementById('inspectDetailsText');
const confirmDetectiveBtn = document.getElementById('confirmDetectiveBtn');

const gameOverModal = document.getElementById('gameOverModal');
const winnerTrophy = document.getElementById('winnerTrophy');
const winnerTeamText = document.getElementById('winnerTeamText');
const winnerDesc = document.getElementById('winnerDesc');
const finalRolesGrid = document.getElementById('finalRolesGrid');
const playAgainBtn = document.getElementById('playAgainBtn');
const exitGameBtn = document.getElementById('exitGameBtn');

// Sound Toggle
const soundToggleBtn = document.getElementById('soundToggleBtn');
const playerBadge = document.getElementById('playerBadge');
const navPlayerName = document.getElementById('navPlayerName');

// Toast Function
function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// 1. NAME GATE VALIDATION
function validateName() {
  const name = playerNameInput.value.trim();
  myPlayerName = name;

  if (name.length >= 2) {
    localStorage.setItem('mafia_player_name', name);
    document.querySelector('.name-gate-card').classList.add('valid');
    nameStatus.textContent = '✓ جاهز';
    nameStatus.className = 'input-status valid';
    nameWarningText.style.opacity = '0';

    createRoomBtnCard.classList.remove('disabled');
    joinRoomBtnCard.classList.remove('disabled');
    openCreateModalBtn.disabled = false;
    roomCodeInput.disabled = false;
    joinRoomBtn.disabled = false;

    playerBadge.classList.remove('hidden');
    navPlayerName.textContent = name;
    return true;
  } else {
    document.querySelector('.name-gate-card').classList.remove('valid');
    nameStatus.textContent = '⚠️ مطلوب';
    nameStatus.className = 'input-status';
    nameWarningText.style.opacity = '1';

    createRoomBtnCard.classList.add('disabled');
    joinRoomBtnCard.classList.add('disabled');
    openCreateModalBtn.disabled = true;
    roomCodeInput.disabled = true;
    joinRoomBtn.disabled = true;

    playerBadge.classList.add('hidden');
    return false;
  }
}

playerNameInput.addEventListener('input', validateName);

// Check URL Params for direct room invite link (?room=ABCD)
window.addEventListener('DOMContentLoaded', () => {
  if (myPlayerName) {
    playerNameInput.value = myPlayerName;
    validateName();
  }

  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    roomCodeInput.value = roomParam.toUpperCase().slice(0, 4);
    if (!myPlayerName) {
      showToast('يرجى كتابة اسمك أولاً ثم الضغط على دخول!');
      playerNameInput.focus();
    }
  }
});

// Sound Toggle Button
soundToggleBtn.addEventListener('click', () => {
  const isEnabled = window.soundManager.toggle();
  soundToggleBtn.textContent = isEnabled ? '🔊' : '🔇';
  showToast(isEnabled ? 'تم تشغيل الأصوات 🔊' : 'تم كتم الأصوات 🔇');
});

// 2. CREATE ROOM MODAL CONTROLS
openCreateModalBtn.addEventListener('click', () => {
  if (!validateName()) {
    showToast('يجب إدخال اسمك أولاً!');
    playerNameInput.focus();
    return;
  }
  createRoomModal.classList.remove('hidden');
  updateRolesPreview();
});

closeCreateModalBtn.addEventListener('click', () => {
  createRoomModal.classList.add('hidden');
});

function updateRolesPreview() {
  const total = parseInt(totalPlayersRange.value);
  totalPlayersVal.textContent = `${total} لاعبين`;

  let mafia = parseInt(mafiaCountSelect.value);
  const maxAllowedMafia = Math.floor((total - 2) / 2);
  if (mafia > maxAllowedMafia) {
    mafia = Math.max(1, maxAllowedMafia);
    mafiaCountSelect.value = mafia;
  }

  mafiaCountVal.textContent = `${mafia} مافيا`;
  previewMafia.textContent = mafia;
  const citizens = total - mafia - 2; // 1 doctor, 1 detective
  previewCitizens.textContent = Math.max(0, citizens);
}

totalPlayersRange.addEventListener('input', updateRolesPreview);
mafiaCountSelect.addEventListener('change', updateRolesPreview);

confirmCreateRoomBtn.addEventListener('click', () => {
  if (!validateName()) return;

  const totalPlayers = parseInt(totalPlayersRange.value);
  const mafiaCount = parseInt(mafiaCountSelect.value);
  const revealOnVote = revealOnVoteToggle.checked;

  socket.emit('create_room', {
    playerName: myPlayerName,
    totalPlayers,
    mafiaCount,
    revealOnVote
  }, (res) => {
    if (res.success) {
      createRoomModal.classList.add('hidden');
      switchScreen(lobbyScreen);
    } else {
      showToast(res.message);
    }
  });
});

// 3. JOIN ROOM
joinRoomBtn.addEventListener('click', () => {
  if (!validateName()) {
    showToast('يجب إدخال اسمك أولاً!');
    playerNameInput.focus();
    return;
  }

  const roomCode = roomCodeInput.value.trim().toUpperCase();
  if (!roomCode) {
    showToast('يرجى إدخال رمز الغرفة!');
    return;
  }

  socket.emit('join_room', {
    playerName: myPlayerName,
    roomCode
  }, (res) => {
    if (res.success) {
      switchScreen(lobbyScreen);
    } else {
      showToast(res.message);
    }
  });
});

// Screen switcher
function switchScreen(targetScreen) {
  [welcomeScreen, lobbyScreen, gameScreen].forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  targetScreen.classList.remove('hidden');
  targetScreen.classList.add('active');
}

// 4. LOBBY CONTROLS
copyCodeBtn.addEventListener('click', () => {
  const code = displayRoomCode.textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast(`تم نسخ رمز الغرفة: ${code}`);
  });
});

shareLinkBtn.addEventListener('click', () => {
  const code = displayRoomCode.textContent;
  const shareUrl = `${window.location.origin}/?room=${code}`;
  if (navigator.share) {
    navigator.share({
      title: 'لعبة المافيا الملكية 🃏',
      text: `انضم معي لطاولة المافيا! رمز الغرفة: ${code}`,
      url: shareUrl
    }).catch(() => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('📋 تم نسخ رابط الغرفة المباشر!');
      });
    });
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('📋 تم نسخ رابط الغرفة المباشر!');
    });
  }
});

leaveLobbyBtn.addEventListener('click', () => {
  socket.emit('leave_room');
  switchScreen(welcomeScreen);
});

addBotBtn.addEventListener('click', () => {
  socket.emit('add_bot');
});

removeBotBtn.addEventListener('click', () => {
  socket.emit('remove_bot');
});

startGameBtn.addEventListener('click', () => {
  socket.emit('start_game', {}, (res) => {
    if (!res.success) {
      showToast(res.message);
    }
  });
});

// 5. SOCKET: ROOM UPDATE (STATE MACHINE)
socket.on('room_update', (data) => {
  currentGameState = data;
  currentRoom = data.code;

  if (data.state === 'LOBBY') {
    renderLobby(data);
  } else {
    renderGame(data);
  }
});

socket.on('left_room', () => {
  switchScreen(welcomeScreen);
});

// Render Lobby UI
function renderLobby(data) {
  if (lobbyScreen.classList.contains('hidden')) {
    switchScreen(lobbyScreen);
  }

  displayRoomCode.textContent = data.code;
  lobbyPlayersCount.textContent = data.players.length;
  lobbyMaxPlayers.textContent = data.settings.totalPlayers;
  lobbyCurrentCount.textContent = data.players.length;
  lobbyMafiaCount.textContent = data.settings.mafiaCount;
  lobbyRevealPill.textContent = data.settings.revealOnVote ? '👁️ كشف الهوية: مفعّل' : '🔒 كشف الهوية: مخفي';

  // Render players grid
  lobbyPlayersGrid.innerHTML = '';
  data.players.forEach(p => {
    const card = document.createElement('div');
    card.className = `lobby-player-card ${p.isHost ? 'is-host' : ''}`;
    card.innerHTML = `
      ${p.isHost ? '<span class="host-crown" title="مضيف الغرفة">👑</span>' : ''}
      <div class="p-avatar">${p.isBot ? '🤖' : '👤'}</div>
      <div class="p-name">${escapeHtml(p.name)}</div>
      <div class="p-role-tag">${p.isBot ? 'لاعب آلي (بوت)' : (p.isHost ? 'مضيف' : 'لاعب')}</div>
    `;
    lobbyPlayersGrid.appendChild(card);
  });

  const isHost = data.myPlayer.isHost;
  if (isHost) {
    hostControls.classList.remove('hidden');
    guestControls.classList.add('hidden');
    hostBotActions.classList.remove('hidden');

    if (data.players.length >= 4) {
      startGameBtn.disabled = false;
      hostStartHint.textContent = `جاهز للبدء (${data.players.length} لاعبين جاهزين)!`;
    } else {
      startGameBtn.disabled = true;
      hostStartHint.textContent = `متبقي ${4 - data.players.length} لاعبين على الأقل للبدء (يمكنك إضافة بوتات للتجربة!)`;
    }
  } else {
    hostControls.classList.add('hidden');
    guestControls.classList.remove('hidden');
    hostBotActions.classList.add('hidden');
  }
}

// Role Card PNG Paths
const ROLE_CARDS = {
  mafia: '/cards/mafia.png',
  doctor: '/cards/doctor.png',
  detective: '/cards/detective.png',
  citizen: '/cards/citizen.png'
};

const myRoleCardImg = document.getElementById('myRoleCardImg');
const myRoleCaptionBar = document.getElementById('myRoleCaptionBar');
const inspectCardImg = document.getElementById('inspectCardImg');

let dealAnimationPlayed = false;

// 6. RENDER GAME & CIRCULAR TABLE
function renderGame(data) {
  if (gameScreen.classList.contains('hidden')) {
    switchScreen(gameScreen);
  }

  // Handle phase change
  if (lastPhase !== data.state) {
    hasActedThisRound = false; // Reset action lock on every new phase!
    handlePhaseTransition(data.state, lastPhase, data);
    lastPhase = data.state;
  }

  // Update Header Timer & Info
  timerText.textContent = data.phaseTimeLeft || '--';
  updatePhaseInfo(data);

  // Update Body ambiance
  if (data.state.startsWith('NIGHT')) {
    document.body.classList.add('night-mode');
  } else {
    document.body.classList.remove('night-mode');
  }

  // Shuffling animation center
  if (data.state === 'SHUFFLING') {
    shufflingDeck.classList.remove('hidden');
    centerContent.classList.add('hidden');
  } else {
    shufflingDeck.classList.add('hidden');
    centerContent.classList.remove('hidden');
  }

  // Host skip to vote button
  if (skipToVoteBtn) {
    if (data.myPlayer && data.myPlayer.isHost && (data.state === 'DAY_DISCUSSION' || data.state === 'DAY_ANNOUNCE')) {
      skipToVoteBtn.classList.remove('hidden');
    } else {
      skipToVoteBtn.classList.add('hidden');
    }
  }

  // Render Round Table Seats (Always Player At Bottom)
  renderTableSeats(data);

  // Check Game Over Modal
  if (data.state === 'GAME_OVER') {
    showGameOverModal(data);
  } else {
    gameOverModal.classList.add('hidden');
  }
}

function handlePhaseTransition(newPhase, oldPhase, data) {
  if (newPhase === 'SHUFFLING') {
    dealAnimationPlayed = false;
    triggerCardDealingSequence(data);
  } else if (newPhase === 'NIGHT_MAFIA') {
    window.soundManager.playNight();
    showToast('🌙 حلّ الظلام على المدينة... اغلقت الأبواب ونام السكان.');
  } else if (newPhase === 'DAY_ANNOUNCE' || newPhase === 'DAY_DISCUSSION') {
    window.soundManager.playDeal();
  } else if (newPhase === 'DAY_VOTING') {
    window.soundManager.playGavel();
    showToast('⚖️ بدأت جلسة التصويت ومحاكمة المتهمين!');
  } else if (newPhase === 'GAME_OVER') {
    window.soundManager.playVictory();
  }
}

// Dynamic Card Dealing Sequence Animation ("توزيع وخبص الطبايق")
function triggerCardDealingSequence(data) {
  if (!data || !data.players || dealAnimationPlayed) return;
  dealAnimationPlayed = true;

  window.soundManager.playShuffle();

  // Hide seats' cards initially during shuffle
  setTimeout(() => {
    const cards = document.querySelectorAll('.seat-card-container');
    cards.forEach(c => c.style.opacity = '0');
  }, 100);

  const total = data.players.length;
  const myPlayer = data.myPlayer;
  const myIndex = data.players.findIndex(p => p.id === myPlayer.id);
  const rect = roundTable.getBoundingClientRect();
  const isMobile = window.innerWidth <= 768;
  const padX = isMobile ? 0.72 : 0.76;
  const padY = isMobile ? 0.74 : 0.76;
  const radiusX = (rect.width / 2) * padX;
  const radiusY = (rect.height / 2) * padY;

  // Staggered deal outwards after 1.4s of shuffling
  data.players.forEach((p, idx) => {
    setTimeout(() => {
      const relativeIndex = (idx - myIndex + total) % total;
      const angle = (Math.PI / 2) + (relativeIndex / total) * 2 * Math.PI;
      const targetX = 50 + ((radiusX * Math.cos(angle)) / (rect.width / 2)) * 50;
      const targetY = 50 + ((radiusY * Math.sin(angle)) / (rect.height / 2)) * 50;

      // Create flying deal card with mystery card back
      const flyingCard = document.createElement('div');
      flyingCard.className = 'flying-deal-card';
      flyingCard.innerHTML = '<img src="/cards/card_back.png" class="seat-real-card-img" alt="مجهول">';
      flyingCard.style.left = '50%';
      flyingCard.style.top = '50%';
      roundTable.appendChild(flyingCard);

      window.soundManager.playDeal();

      // Animate flight to seat
      requestAnimationFrame(() => {
        flyingCard.style.left = `${targetX}%`;
        flyingCard.style.top = `${targetY}%`;
        flyingCard.style.transform = `translate(-50%, -50%) scale(1) rotate(${360 + (angle * 180 / Math.PI)}deg)`;
      });

      // Landing on seat
      setTimeout(() => {
        flyingCard.remove();
        const seatCard = document.querySelector(`#seat-${p.id} .seat-card-container`);
        if (seatCard) {
          seatCard.style.opacity = '1';
          seatCard.style.animation = 'popIn 0.35s ease';
        }
        if (p.id === myPlayer.id) {
          window.soundManager.playInspect();
        }
      }, 650);

    }, 1400 + idx * 260);
  });
}

function updatePhaseInfo(data) {
  const { state, phaseMessage } = data;

  switch (state) {
    case 'SHUFFLING':
      phaseIcon.textContent = '🃏';
      phaseTitle.textContent = 'خبص وتوزيع الطبايق';
      phaseSubtitle.textContent = 'توزيع الطبايق على الطاولة الدائرية سرّاً...';
      centerSymbol.textContent = '🃏';
      centerText.textContent = 'تجهيز الطبايق';
      break;

    case 'NIGHT_MAFIA':
      phaseIcon.textContent = '😈';
      phaseTitle.textContent = 'ليل المدينة - دور المافيا';
      phaseSubtitle.textContent = 'المافيا يستيقظون لاختيار ضحيتهم القادمة...';
      centerSymbol.textContent = '🌙';
      centerText.textContent = 'المافيا تختار الهدف';
      break;

    case 'NIGHT_DOCTOR':
      phaseIcon.textContent = '💉';
      phaseTitle.textContent = 'ليل المدينة - دور الدكتور';
      phaseSubtitle.textContent = 'الدكتور يختار لاعباً لحمايته من الاغتيال...';
      centerSymbol.textContent = '💉';
      centerText.textContent = 'الدكتور يحمي ضحية';
      break;

    case 'NIGHT_DETECTIVE':
      phaseIcon.textContent = '🔍';
      phaseTitle.textContent = 'ليل المدينة - دور المحقق';
      phaseSubtitle.textContent = 'المحقق يفحص أوراق أحد المشتبه بهم...';
      centerSymbol.textContent = '🔍';
      centerText.textContent = 'المحقق يفحص الهوية';
      break;

    case 'DAY_ANNOUNCE':
      phaseIcon.textContent = '☀️';
      phaseTitle.textContent = 'بزوغ الفجر - تقرير الليلة';
      phaseSubtitle.textContent = phaseMessage;
      centerSymbol.textContent = '☀️';
      centerText.textContent = 'نتائج الليلة الماضية';
      nightEventBanner.classList.remove('hidden');
      nightEventBanner.innerHTML = phaseMessage;
      break;

    case 'DAY_DISCUSSION':
      phaseIcon.textContent = '🗣️';
      phaseTitle.textContent = 'جلسة النقاش والتشاور';
      phaseSubtitle.textContent = 'حللوا التصرفات واكتشفوا من القاتل بينكم!';
      centerSymbol.textContent = '💬';
      centerText.textContent = 'النقاش وتبادل الشكوك';
      nightEventBanner.classList.add('hidden');
      break;

    case 'DAY_VOTING':
      phaseIcon.textContent = '⚖️';
      phaseTitle.textContent = 'جلسة التصويت والمحاكمة';
      phaseSubtitle.textContent = 'صوّت على اللاعب الذي تريد إقصاءه من الطاولة';
      centerSymbol.textContent = '⚖️';
      centerText.textContent = 'التصويت العلني';
      break;

    case 'VOTE_RESULT':
      phaseIcon.textContent = '📜';
      phaseTitle.textContent = 'قرار المحكمة والنتيجة';
      phaseSubtitle.textContent = phaseMessage;
      centerSymbol.textContent = '📜';
      centerText.textContent = 'نتيجة التصويت';
      nightEventBanner.classList.remove('hidden');
      nightEventBanner.innerHTML = phaseMessage;
      break;

    case 'GAME_OVER':
      phaseIcon.textContent = '🏆';
      phaseTitle.textContent = 'نهاية اللعبة';
      phaseSubtitle.textContent = phaseMessage;
      centerSymbol.textContent = '👑';
      centerText.textContent = 'انتهت المعركة!';
      break;
  }
}

// 8. RENDER RADIAL SEATS (USER IS ALWAYS AT THE BOTTOM CENTER!)
function renderTableSeats(data) {
  tableSeats.innerHTML = '';
  const total = data.players.length;
  const myPlayer = data.myPlayer;

  // Find index of current player (me)
  const myIndex = data.players.findIndex(p => p.id === myPlayer.id);

  // Compute radius based on table dimensions
  const rect = roundTable.getBoundingClientRect();
  const isMobile = window.innerWidth <= 768;
  const padX = isMobile ? 0.72 : 0.76;
  const padY = isMobile ? 0.74 : 0.76;
  const radiusX = (rect.width / 2) * padX;
  const radiusY = (rect.height / 2) * padY;

  data.players.forEach((p, idx) => {
    // Relative offset so current player (me) is always relativeIndex = 0
    const relativeIndex = (idx - myIndex + total) % total;

    // Angle: relativeIndex = 0 is at bottom center: Math.PI / 2 (90 deg)
    // Other players spaced clockwise around the table!
    const angle = (Math.PI / 2) + (relativeIndex / total) * 2 * Math.PI;

    const x = 50 + ((radiusX * Math.cos(angle)) / (rect.width / 2)) * 50;
    const y = 50 + ((radiusY * Math.sin(angle)) / (rect.height / 2)) * 50;

    const isMe = p.id === myPlayer.id;
    const isRevealed = Boolean(p.revealedRole || isMe);

    const seat = document.createElement('div');
    seat.id = `seat-${p.id}`;
    seat.className = `seat ${!p.alive ? 'dead' : ''} ${isMe ? 'is-me' : ''} ${isRevealed ? 'revealed' : ''}`;
    seat.style.left = `${x}%`;
    seat.style.top = `${y}%`;

    // Role card image if revealed or if self
    const roleToShow = isMe ? myPlayer.role : p.revealedRole;
    const cardImgSrc = roleToShow ? ROLE_CARDS[roleToShow] : null;

    // User requirement: "ويجي على المحمي سيف للكن عشان ينعرف انه بريئ"
    // Display glowing Sword / Shield badge if player has innocent badge!
    const innocentBadgeHtml = p.hasInnocentBadge ? `
      <div class="innocent-shield-badge" title="محمي وحاصل على سيف البراءة! ⚔️🛡️">
        ⚔️
      </div>
    ` : '';

    // Action button inside seat based on current phase and role (ONLY IF NOT ACTED THIS ROUND)
    let actionBtnHtml = '';
    if (!hasActedThisRound && myPlayer.alive && p.alive) {
      if (data.state === 'NIGHT_MAFIA' && myPlayer.role === 'mafia' && p.role !== 'mafia') {
        actionBtnHtml = `<button class="seat-action-btn" onclick="executeMafiaKill('${p.id}')">اغتيال 🎯</button>`;
      } else if (data.state === 'NIGHT_DOCTOR' && myPlayer.role === 'doctor') {
        actionBtnHtml = `<button class="seat-action-btn doctor-btn" onclick="executeDoctorProtect('${p.id}')">حماية 🛡️</button>`;
      } else if (data.state === 'NIGHT_DETECTIVE' && myPlayer.role === 'detective' && p.id !== myPlayer.id) {
        actionBtnHtml = `<button class="seat-action-btn detective-btn" onclick="executeDetectiveInspect('${p.id}')">فحص 🔍</button>`;
      } else if (data.state === 'DAY_VOTING') {
        actionBtnHtml = `<button class="seat-action-btn vote-btn" onclick="executeVote('${p.id}')">تصويت 🗳️</button>`;
      }
    }

    // Votes against badge (Pinned to top-left of the card container so it never overlaps the name or button!)
    const votesHtml = (data.state === 'DAY_VOTING' && p.votesAgainst > 0) ? `
      <div class="seat-vote-count" title="عدد الأصوات ضد هذا اللاعب">🗳️ ${p.votesAgainst} ${p.votesAgainst === 1 ? 'صوت' : (p.votesAgainst === 2 ? 'صوتان' : 'أصوات')}</div>
    ` : '';

    seat.innerHTML = `
      <div class="seat-card-container">
        ${innocentBadgeHtml}
        ${votesHtml}
        <div class="seat-card-inner">
          <div class="seat-card-face back">
            <img src="/cards/card_back.png" class="seat-real-card-img" alt="مجهول">
          </div>
          <div class="seat-card-face front">
            ${cardImgSrc ? `<img src="${cardImgSrc}" class="seat-real-card-img" alt="${roleToShow}">` : '<img src="/cards/card_back.png" class="seat-real-card-img" alt="مجهول">'}
          </div>
        </div>
        ${!p.alive ? '<div class="dead-stamp">مستبعد ☠️</div>' : ''}
      </div>
      <div class="seat-name-tag">${p.isBot ? '🤖 ' : ''}${escapeHtml(p.name)}${isMe ? ' (أنت)' : ''}</div>
      ${actionBtnHtml}
    `;

    tableSeats.appendChild(seat);
  });
}

// Window resize updates radial positions
window.addEventListener('resize', () => {
  if (currentGameState && currentGameState.state !== 'LOBBY') {
    renderTableSeats(currentGameState);
  }
});

// 9. ACTION HANDLERS (STRICTLY ONE ACTION PER ROUND!)
window.executeMafiaKill = function(targetId) {
  if (hasActedThisRound) return;
  hasActedThisRound = true;
  socket.emit('mafia_kill', { targetId });
  showToast('🎯 تم اختيار الهدف وتثبيته لهذه الليلة!');
  window.soundManager.playInspect();
  if (currentGameState) renderTableSeats(currentGameState);
};

window.executeDoctorProtect = function(targetId) {
  if (hasActedThisRound) return;
  hasActedThisRound = true;
  socket.emit('doctor_protect', { targetId });
  showToast('🛡️ تم اختيار اللاعب لحمايته، تم تثبيت اختيارك!');
  window.soundManager.playHeal();
  if (currentGameState) renderTableSeats(currentGameState);
};

window.executeDetectiveInspect = function(targetId) {
  if (hasActedThisRound) return;
  hasActedThisRound = true;
  socket.emit('detective_inspect', { targetId });
  showToast('🔍 تم إرسال طلب الفحص، انتظر النتيجة!');
  window.soundManager.playInspect();
  if (currentGameState) renderTableSeats(currentGameState);
};

window.executeVote = function(targetId) {
  socket.emit('cast_vote', { targetId });
  showToast('🗳️ تم تسجيل صوتك بنجاح!');
  window.soundManager.playGavel();
};

socket.on('action_error', (data) => {
  showToast(data.message || 'حدث خطأ!');
});

// Detective secret inspection result modal
socket.on('detective_result', (data) => {
  inspectTargetName.textContent = `اللاعب: ${data.targetName}`;
  if (inspectCardImg) {
    inspectCardImg.src = ROLE_CARDS[data.role] || ROLE_CARDS.citizen;
  }

  if (data.isMafia) {
    inspectStamp.textContent = 'مافيا 👿 مجرم';
    inspectStamp.className = 'inspect-stamp mafia';
    inspectDetailsText.textContent = '⚠️ تحذير: هذا الشخص من عصابة المافيا الخطيرة!';
  } else {
    inspectStamp.textContent = 'بريء 🛡️ مواطن';
    inspectStamp.className = 'inspect-stamp innocent';
    inspectDetailsText.textContent = '✅ اطمئن: هذا الشخص بريء وليس عضواً في المافيا.';
  }
  detectiveModal.classList.remove('hidden');
});

closeDetectiveModalBtn.addEventListener('click', () => {
  detectiveModal.classList.add('hidden');
});
confirmDetectiveBtn.addEventListener('click', () => {
  detectiveModal.classList.add('hidden');
});

// Skip discussion to vote button (Host action)
if (skipToVoteBtn) {
  skipToVoteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('⚡ Host clicked skipToVoteBtn');
    socket.emit('skip_to_vote');
    skipToVoteBtn.classList.add('hidden');
    showToast('⚡ جاري بدء مرحلة التصويت مباشرة...');
    window.soundManager.playGavel();
  });
}

// 10. GAME OVER MODAL (PLAY AGAIN & EXIT)
function showGameOverModal(data) {
  const isCitizens = data.winner === 'CITIZENS';
  winnerTrophy.textContent = isCitizens ? '🎉👑' : '😈🗡️';
  winnerTeamText.textContent = isCitizens ? 'فاز المواطنون والأبرياء!' : 'فازت عصابة المافيا!';
  winnerTeamText.className = `winner-team-text ${isCitizens ? 'citizens' : 'mafia'}`;
  winnerDesc.textContent = data.phaseMessage;

  // Reveal all roles in grid with real card images
  finalRolesGrid.innerHTML = '';
  data.players.forEach(p => {
    const role = p.revealedRole || p.role || 'citizen';
    const cardEl = document.createElement('div');
    cardEl.className = `final-role-card ${role}`;
    const roleNameAr = {
      mafia: 'مافيا 👿',
      doctor: 'دكتور 💉',
      detective: 'محقق 🔍',
      citizen: 'مواطن 👤'
    }[role] || 'مواطن';

    cardEl.innerHTML = `
      <img src="${ROLE_CARDS[role] || ROLE_CARDS.citizen}" class="final-card-img-thumb" alt="${role}">
      <div class="final-player-name">${escapeHtml(p.name)}</div>
      <div class="final-role-name">${roleNameAr}</div>
    `;
    finalRolesGrid.appendChild(cardEl);
  });

  gameOverModal.classList.remove('hidden');
}

// Two mandatory end game buttons: "العب مجدداً" & "خروج"
playAgainBtn.addEventListener('click', () => {
  socket.emit('play_again');
  gameOverModal.classList.add('hidden');
});

exitGameBtn.addEventListener('click', () => {
  socket.emit('leave_room');
  gameOverModal.classList.add('hidden');
  switchScreen(welcomeScreen);
});

// 11. CHAT DRAWER & MESSAGES
chatToggleBtn.addEventListener('click', () => {
  chatDrawer.classList.toggle('hidden');
  unreadChatCount = 0;
  unreadCount.textContent = '0';
});

closeChatBtn.addEventListener('click', () => {
  chatDrawer.classList.add('hidden');
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  socket.emit('send_chat', { message: text });
  chatInput.value = '';
});

socket.on('chat_message', (msg) => {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.innerHTML = `
    <div class="c-header">
      <strong>${escapeHtml(msg.senderName)}</strong>
      <span>${msg.time}</span>
    </div>
    <div class="c-text">${escapeHtml(msg.text)}</div>
  `;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (chatDrawer.classList.contains('hidden')) {
    unreadChatCount++;
    unreadCount.textContent = unreadChatCount;
  }
});

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
