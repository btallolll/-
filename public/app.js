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
  targetScreen.scrollTop = 0;
  window.scrollTo(0, 0);

  const bgExplainer = document.getElementById('bgMotionExplainer');
  const bgAmbiance = document.getElementById('bgAmbiance');

  if (targetScreen === welcomeScreen) {
    document.body.classList.remove('is-in-game', 'is-in-lobby');
    if (bgExplainer) bgExplainer.style.display = 'block';
    if (bgAmbiance) bgAmbiance.style.display = 'none';
    if (typeof startBgExplainer === 'function') startBgExplainer();
  } else if (targetScreen === lobbyScreen) {
    document.body.classList.remove('is-in-game');
    document.body.classList.add('is-in-lobby');
    if (bgExplainer) bgExplainer.style.display = 'none';
    if (bgAmbiance) bgAmbiance.style.display = 'block';
    if (typeof stopBgExplainer === 'function') stopBgExplainer();
  } else {
    document.body.classList.remove('is-in-lobby');
    document.body.classList.add('is-in-game');
    if (bgExplainer) bgExplainer.style.display = 'none';
    if (bgAmbiance) bgAmbiance.style.display = 'block';
    if (typeof stopBgExplainer === 'function') stopBgExplainer();
  }
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

socket.on('timer_tick', (data) => {
  if (timerText && data && data.timeLeft !== undefined) {
    timerText.textContent = data.timeLeft;
  }
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

const ROLE_NAMES = {
  mafia: 'عضو مافيا 😈',
  doctor: 'الدكتور 💉',
  detective: 'المحقق 🔍',
  citizen: 'مواطن صالح 👥'
};

const ROLE_DETAILS = {
  mafia: {
    name: 'عضو عصابة المافيا 😈',
    tagClass: 'tag-mafia',
    glowClass: 'glow-mafia',
    emoji: '😈',
    desc: 'تتعاون سرّاً مع عصابتك في الليل لاغتيال الأبرياء، وتتنكر في النهار كأحد السكان لتضلل الجميع وتفلت من العقاب!'
  },
  doctor: {
    name: 'طبيب المدينة (الدكتور) 💉',
    tagClass: 'tag-doctor',
    glowClass: 'glow-doctor',
    emoji: '💉',
    desc: 'تختار في كل ليلة لاعباً واحداً لتمنحه درع الحماية، وإذا حاولت المافيا اغتياله ستنقذه من الموت المحقق!'
  },
  detective: {
    name: 'المحقق الذكي 🔍',
    tagClass: 'tag-detective',
    glowClass: 'glow-detective',
    emoji: '🔍',
    desc: 'تفحص هوية مشتبه به في كل ليلة سرّاً لتكشف هل ينتمي لعصابة المافيا أم أنه مواطن بريء للمساعدة في كشفهم!'
  },
  citizen: {
    name: 'مواطن صالح بريء 👥',
    tagClass: 'tag-citizen',
    glowClass: 'glow-citizen',
    emoji: '👥',
    desc: 'سلاحك الأقوى هو ذكاؤك ونقاشك في النهار! حلل أقوال المشتبه بهم وصوّت لإقصاء الخونة وحماية مدينتك!'
  }
};

const myRoleCardImg = document.getElementById('myRoleCardImg');
const myRoleCaptionBar = document.getElementById('myRoleCaptionBar');
const inspectCardImg = document.getElementById('inspectCardImg');

let dealAnimationPlayed = false;
let isMyCardFlipped = false;
let cardsDealtTo = new Set();

// Fullscreen Reveal Controllers ("البطاقة تصير ملء الشاشة وتنقلب وتعود للطاولة تلقائياً")
let fsRevealActive = false;
let fsCountdownInterval = null;
let fsFlipTimeout = null;

function triggerFullscreenCardReveal(roleKey) {
  const overlay = document.getElementById('fullscreenCardRevealOverlay');
  const card3D = document.getElementById('fsCard3D');
  const cardInner = document.getElementById('fsCardInner');
  const roleImg = document.getElementById('fsCardRoleImg');
  const details = document.getElementById('fsRoleDetails');
  const title = document.getElementById('fsRevealTitle');
  const ambientGlow = document.getElementById('fsAmbientGlow');
  const badgeTag = document.getElementById('fsRoleBadgeTag');
  const emojiEl = document.getElementById('fsRoleEmoji');
  const nameEl = document.getElementById('fsRoleNameText');
  const descEl = document.getElementById('fsRoleDesc');
  const countdownEl = document.getElementById('fsCountdownNum');
  const progressFill = document.getElementById('fsProgressFill');
  const confirmBtn = document.getElementById('fsConfirmBtn');

  if (!overlay || !card3D || !cardInner || !roleImg) return;

  clearFullscreenRevealTimers();
  fsRevealActive = true;

  const roleInfo = ROLE_DETAILS[roleKey] || ROLE_DETAILS.citizen;
  roleImg.src = ROLE_CARDS[roleKey] || '/cards/citizen.png';
  if (emojiEl) emojiEl.textContent = roleInfo.emoji;
  if (nameEl) nameEl.textContent = roleInfo.name;
  if (descEl) descEl.textContent = roleInfo.desc;

  if (ambientGlow) ambientGlow.className = `fs-reveal-ambient-glow ${roleInfo.glowClass}`;
  if (badgeTag) badgeTag.className = `fs-role-badge-tag ${roleInfo.tagClass}`;

  // Reset initial presentation: card starts faced down!
  overlay.classList.remove('hidden', 'closing');
  card3D.classList.remove('fs-returning-to-table');
  cardInner.classList.remove('flipped');
  details.classList.remove('visible');
  title.textContent = 'وصلت بطاقتك! اكشف هويتك...';
  if (progressFill) progressFill.style.width = '100%';
  if (countdownEl) countdownEl.textContent = '4';

  // Allow clicking on the 3D card to flip immediately
  card3D.onclick = () => {
    if (!cardInner.classList.contains('flipped')) {
      doFlipAction();
    }
  };

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      closeFullscreenCardReveal();
    };
  }

  // After 500ms suspense, automatically flip the card in 3D:
  // "و يقلبها ملى الشاشه لما تنقلب الشخص يعرف بطاقته"
  fsFlipTimeout = setTimeout(() => {
    doFlipAction();
  }, 500);

  function doFlipAction() {
    if (cardInner.classList.contains('flipped')) return;
    cardInner.classList.add('flipped');

    if (window.soundManager && typeof window.soundManager.playCardFlip === 'function') {
      window.soundManager.playCardFlip();
    }

    title.textContent = `أنت: ${roleInfo.name}`;
    details.classList.add('visible');

    // Start auto-return countdown: "تلقائي ترجع للطاولة"
    let secondsLeft = 4;
    if (countdownEl) countdownEl.textContent = secondsLeft;

    const startTime = Date.now();
    const duration = 4000;

    if (fsCountdownInterval) clearInterval(fsCountdownInterval);
    fsCountdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.max(0, 1 - (elapsed / duration));
      if (progressFill) progressFill.style.width = `${progress * 100}%`;

      const sec = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      if (countdownEl) countdownEl.textContent = sec;

      if (elapsed >= duration) {
        clearInterval(fsCountdownInterval);
        fsCountdownInterval = null;
        closeFullscreenCardReveal();
      }
    }, 50);
  }
}

function clearFullscreenRevealTimers() {
  if (fsFlipTimeout) { clearTimeout(fsFlipTimeout); fsFlipTimeout = null; }
  if (fsCountdownInterval) { clearInterval(fsCountdownInterval); fsCountdownInterval = null; }
}

function closeFullscreenCardRevealInstant() {
  fsRevealActive = false;
  clearFullscreenRevealTimers();
  const overlay = document.getElementById('fullscreenCardRevealOverlay');
  const card3D = document.getElementById('fsCard3D');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('closing');
  }
  if (card3D) {
    card3D.classList.remove('fs-returning-to-table');
  }
}

function closeFullscreenCardReveal() {
  if (!fsRevealActive) return;
  fsRevealActive = false;
  clearFullscreenRevealTimers();

  const overlay = document.getElementById('fullscreenCardRevealOverlay');
  const card3D = document.getElementById('fsCard3D');

  // Trigger smooth card return to table animation
  if (card3D) {
    card3D.classList.add('fs-returning-to-table');
  }
  if (overlay) {
    overlay.classList.add('closing');
  }

  if (window.soundManager && typeof window.soundManager.playDeal === 'function') {
    window.soundManager.playDeal();
  }

  // Once return animation completes (420ms):
  setTimeout(() => {
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('closing');
    }
    if (card3D) {
      card3D.classList.remove('fs-returning-to-table');
    }

    // Mark card as revealed on local player's seat
    isMyCardFlipped = true;
    if (currentGameState) {
      renderTableSeats(currentGameState);
    }

    showToast('🃏 بطاقتك الآن على مقعدك في الطاولة! (يمكنك النقر عليها لإخفائها أو كشفها بأي وقت) 🤫');
  }, 440);
}

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
    if (data.players && (!cardsDealtTo || cardsDealtTo.size === 0)) {
      cardsDealtTo = new Set(data.players.map(p => p.id));
    }
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

let activeDealTimeouts = [];

function stopAndClearDealingSequence() {
  // Clear all pending timeouts so dealing stops immediately
  if (activeDealTimeouts && activeDealTimeouts.length > 0) {
    activeDealTimeouts.forEach(t => clearTimeout(t));
    activeDealTimeouts = [];
  }

  // Remove any stray flying deal cards in the DOM
  document.querySelectorAll('.flying-deal-card').forEach(el => el.remove());

  // Close any active fullscreen card reveal instantly
  closeFullscreenCardRevealInstant();

  // Stop central shuffling deck immediately
  if (shufflingDeck) {
    shufflingDeck.classList.remove('deal-finished');
    shufflingDeck.classList.add('hidden');
    const caption = shufflingDeck.querySelector('.shuffle-caption');
    if (caption) caption.textContent = 'جاري خبص الطبايق...';
  }
}

function handlePhaseTransition(newPhase, oldPhase, data) {
  // Always stop and clear any ongoing dealing sequence when leaving SHUFFLING
  if (oldPhase === 'SHUFFLING' || newPhase !== 'SHUFFLING') {
    stopAndClearDealingSequence();
  }

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

// Dynamic Card Dealing Sequence Animation ("توزيع وخبص الطبايق بدقة وهدوء من عند المنشئ لليسار")
function triggerCardDealingSequence(data) {
  if (!data || !data.players || dealAnimationPlayed) return;
  dealAnimationPlayed = true;

  // Clean slate before starting
  stopAndClearDealingSequence();
  dealAnimationPlayed = true;
  cardsDealtTo.clear();
  isMyCardFlipped = false; // Card starts strictly faced down!

  // Re-render empty seats on table initially: "الداوبه تبدا فارغه بس الاسما فيها"
  renderTableSeats(data);

  if (shufflingDeck) {
    shufflingDeck.classList.remove('hidden', 'deal-finished');
    const caption = shufflingDeck.querySelector('.shuffle-caption');
    if (caption) caption.textContent = 'جاري خبص وتجهيز الطبايق...';
  }

  window.soundManager.playShuffle();

  const total = data.players.length;
  const myPlayer = data.myPlayer;

  // Determine starting point: Creator/Host of game ("منشاء اللعبه يبدا اول بطاقه يستلمها")
  let hostIdx = data.players.findIndex(p => p.isHost);
  if (hostIdx === -1) hostIdx = 0;

  // Dealing order starts from host and moves to the left around the circle ("من عند المنشاء الى اليسار ختى يخلص عدد الي استلم"):
  const dealOrder = [];
  for (let step = 0; step < total; step++) {
    const playerIndex = (hostIdx + step) % total;
    dealOrder.push(data.players[playerIndex]);
  }

  // Pacing: Start initial deal after 950ms of central shuffle
  // Slower, dignified deal: 750ms interval between cards ("طريقه التوزيع التوزيع يصير ابطاء ... لا تنساء يكون بشكل ابطاء")
  dealOrder.forEach((p, step) => {
    const dealTimeout = setTimeout(() => {
      // Find the seat element for player p
      const seatEl = document.getElementById(`seat-${p.id}`);
      if (!seatEl) return;

      const targetSlot = seatEl.querySelector('.empty-card-slot') || seatEl.querySelector('.seat-card-container');
      const tableRect = roundTable.getBoundingClientRect();
      if (!targetSlot || !tableRect.width || !tableRect.height) return;

      const slotRect = targetSlot.getBoundingClientRect();

      // Exact coordinates of target slot center relative to roundTable (%):
      const exactTargetX = ((slotRect.left + (slotRect.width / 2) - tableRect.left) / tableRect.width) * 100;
      const exactTargetY = ((slotRect.top + (slotRect.height / 2) - tableRect.top) / tableRect.height) * 100;

      // Create the flying card directly from center deck (50%, 50%)
      const flyingCard = document.createElement('div');
      flyingCard.className = 'flying-deal-card';
      flyingCard.innerHTML = '<img src="/cards/card_back.png" class="seat-real-card-img" alt="ورقة">';
      flyingCard.style.left = '50%';
      flyingCard.style.top = '50%';
      flyingCard.style.transform = 'translate(-50%, -50%) scale(0.35) rotate(0deg)';
      roundTable.appendChild(flyingCard);

      window.soundManager.playDeal();

      // Launch flight to the player's slot (520ms smooth flight)
      setTimeout(() => {
        flyingCard.style.left = `${exactTargetX}%`;
        flyingCard.style.top = `${exactTargetY}%`;
        flyingCard.style.transform = 'translate(-50%, -50%) scale(1) rotate(0deg)';
      }, 20);

      // Card lands on player's seat (after 520ms)
      const landTimeout = setTimeout(() => {
        flyingCard.remove();
        
        // Mark player as having received their card
        cardsDealtTo.add(p.id);
        
        // Re-render table seats so this seat transitions to showing their face-down card ("اول ما يصتلمها يجي الي هي البطاقه من الخلف مجهول")
        renderTableSeats(currentGameState || data);
        
        // Add landing snap animation to the newly landed card
        const landedSeat = document.getElementById(`seat-${p.id}`);
        const cardCont = landedSeat ? landedSeat.querySelector('.seat-card-container') : null;
        if (cardCont) {
          cardCont.classList.add('card-just-landed');
        }

        if (window.soundManager && typeof window.soundManager.playCardFlip === 'function') {
          window.soundManager.playCardFlip();
        }

        // If this is the current player, launch cinematic fullscreen card reveal!
        // "ياخي وقت استلم البطاقه البطاقه تصير مل الشاشه و يقلبها ملى الشاشه لما تنقلب الشخص يعرف بطاقته تلقائي ترحع للطعاوله"
        if (p.id === myPlayer.id) {
          triggerFullscreenCardReveal(myPlayer.role);
        }

        // When the LAST player in dealOrder receives their card:
        if (step === total - 1) {
          finishDealingSequence();
        }
      }, 540);
      activeDealTimeouts.push(landTimeout);

    }, 950 + step * 750);
    activeDealTimeouts.push(dealTimeout);
  });
}

function finishDealingSequence() {
  // 1. Mark dealing finished on central deck
  if (shufflingDeck) {
    shufflingDeck.classList.add('deal-finished');
    const caption = shufflingDeck.querySelector('.shuffle-caption');
    if (caption) caption.textContent = '✓ اكتمل توزيع الطبايق';
  }

  // 2. Hide central deck cleanly after a brief 700ms confirmation ("بعدها يروح التوزيعي")
  const fadeOutTimeout = setTimeout(() => {
    if (shufflingDeck) {
      shufflingDeck.classList.add('hidden');
    }
    if (centerContent && currentGameState && currentGameState.state === 'SHUFFLING') {
      centerContent.classList.remove('hidden');
      centerSymbol.textContent = '🌙';
      centerText.textContent = 'الليل يقترب... اكشفوا بطاقاتكم!';
    }
  }, 700);
  activeDealTimeouts.push(fadeOutTimeout);
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
    // For other players: revealed only if eliminated or game over
    const isEliminatedRevealed = !isMe && Boolean(p.revealedRole);
    // User requirement: Card lands faced down (unknown/back), must click on it to flip!
    const isFlipped = isMe ? isMyCardFlipped : (isEliminatedRevealed || (data.state === 'GAME_OVER'));

    const seat = document.createElement('div');
    seat.id = `seat-${p.id}`;
    seat.className = `seat ${!p.alive ? 'dead' : ''} ${isMe ? 'is-me' : ''} ${isFlipped ? 'flipped' : ''}`;
    seat.style.left = `${x}%`;
    seat.style.top = `${y}%`;

    // Role card image if revealed or if self
    const roleToShow = isMe ? myPlayer.role : p.revealedRole;
    const cardImgSrc = roleToShow ? ROLE_CARDS[roleToShow] : null;

    // Has this seat received its card yet?
    // "الداوبه تبدا فارغه بس الاسما فيها"
    const hasCard = (data.state !== 'SHUFFLING') || cardsDealtTo.has(p.id);

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

    let cardAreaHtml = '';
    if (!hasCard) {
      // Empty card slot on the table before the card is dealt: "الداوبه تبدا فارغه بس الاسما فيها"
      cardAreaHtml = `
        <div class="empty-card-slot" id="card-slot-${p.id}" title="بانتظار وصول الورقة من الموزع">
          <span>🂠</span>
        </div>
      `;
    } else {
      // Card has landed on this player's seat (faced down by default)
      cardAreaHtml = `
        <div class="seat-card-container ${isMe ? 'clickable-card' : ''}" id="card-container-${p.id}" ${isMe ? 'onclick="toggleMyCardFlip()"' : ''}>
          ${innocentBadgeHtml}
          ${votesHtml}
          <div class="seat-card-inner">
            <div class="seat-card-face back">
              <img src="/cards/card_back.png" class="seat-real-card-img" alt="مجهول">
            </div>
            <div class="seat-card-face front">
              ${cardImgSrc ? `<img src="${cardImgSrc}" class="seat-real-card-img" alt="${roleToShow}">` : '<img src="/cards/card_back.png" class="seat-real-card-img" alt="مجهول">'}
              <div class="card-shine-effect"></div>
            </div>
          </div>
          ${!p.alive ? '<div class="dead-stamp">مستبعد ☠️</div>' : ''}
          ${isMe ? `<div class="flip-interactive-pill ${isMyCardFlipped ? 'is-flipped' : ''}">${isMyCardFlipped ? '👁️ إخفاء الهوية' : '👆 اكشف دورك'}</div>` : ''}
        </div>
      `;
    }

    seat.innerHTML = `
      ${cardAreaHtml}
      <div class="seat-name-tag">${p.isBot ? '🤖 ' : ''}${escapeHtml(p.name)}${isMe ? ' (أنت)' : ''}</div>
      ${actionBtnHtml}
    `;

    tableSeats.appendChild(seat);
  });
}

// Interactive 3D Card Flip Handler ("قلب الورقة عبر النقر عليها بأنيميشن احترافي")
window.toggleMyCardFlip = function() {
  if (!currentGameState || !currentGameState.myPlayer) return;

  if (currentGameState.state === 'SHUFFLING' && !cardsDealtTo.has(currentGameState.myPlayer.id)) {
    showToast('انتظر حتى تصلك بطاقتك من الموزع أولاً! 🃏');
    return;
  }

  isMyCardFlipped = !isMyCardFlipped;

  if (window.soundManager && typeof window.soundManager.playCardFlip === 'function') {
    window.soundManager.playCardFlip();
  }

  const roleKey = currentGameState.myPlayer.role;
  const roleName = ROLE_NAMES[roleKey] || roleKey;

  if (isMyCardFlipped) {
    showToast(`🃏 بطاقتك السرية: (${roleName}) - احتفظ بسرك! 🤫`);
  } else {
    showToast('🔒 تم إخفاء بطاقتك عن الأعين');
  }

  renderTableSeats(currentGameState);
};

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

// ==========================================
// 12. BACKGROUND MOTION EXPLAINER CONTROLLER
// ==========================================
let currentBgPhase = 0;
let bgExplainerInterval = null;
const BG_PHASE_DURATION = 6000; // 6 seconds per phase

const ribbonPhases = [
  document.getElementById('ribbonPhase0'),
  document.getElementById('ribbonPhase1'),
  document.getElementById('ribbonPhase2'),
  document.getElementById('ribbonPhase3')
];

const stageLayers = [
  document.getElementById('layerDeal'),
  document.getElementById('layerNight'),
  document.getElementById('layerDay'),
  document.getElementById('layerVote')
];

const explainerSky = document.getElementById('explainerSky');
const skyClasses = ['sky-deal', 'sky-night', 'sky-day', 'sky-vote'];

function setBgPhase(phaseIndex) {
  currentBgPhase = (phaseIndex + 4) % 4;

  ribbonPhases.forEach((ribbon, idx) => {
    if (ribbon) {
      const isActive = (idx === currentBgPhase);
      ribbon.classList.toggle('active', isActive);
      const bar = ribbon.querySelector('.rp-bar');
      if (bar) {
        bar.style.animation = 'none';
        void bar.offsetWidth; // trigger CSS reflow to restart animation
        if (isActive) {
          bar.style.animation = `phaseBarGrow ${BG_PHASE_DURATION / 1000}s linear forwards`;
        }
      }
    }
  });

  stageLayers.forEach((layer, idx) => {
    if (layer) layer.classList.toggle('active', idx === currentBgPhase);
  });

  if (explainerSky) {
    explainerSky.className = 'explainer-sky ' + skyClasses[currentBgPhase];
  }
}

function startBgExplainer() {
  stopBgExplainer();
  setBgPhase(currentBgPhase);
  bgExplainerInterval = setInterval(() => {
    setBgPhase(currentBgPhase + 1);
  }, BG_PHASE_DURATION);
}

function stopBgExplainer() {
  if (bgExplainerInterval) {
    clearInterval(bgExplainerInterval);
    bgExplainerInterval = null;
  }
}

// Click on ribbon items to jump to that phase
ribbonPhases.forEach((btn, idx) => {
  if (btn) {
    btn.addEventListener('click', () => {
      setBgPhase(idx);
      startBgExplainer();
    });
  }
});

// Start initially on welcome screen
startBgExplainer();

