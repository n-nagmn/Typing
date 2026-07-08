class App {
  constructor() {
    this.game = new SushiGame();
    this.currentScreen = 'title';
    this.isOnline = false;
    this.currentMode = 'normal';
    // Removed initParticles since ParticleSystem is not defined
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    this.setupGameCallbacks();
    this.setupOnlineCallbacks();
    
    const savedName = localStorage.getItem('sushiPlayerName');
    if (savedName) {
      this.els.playerName.value = savedName;
      this.els.roomPlayerName.value = savedName;
      this.els.joinPlayerName.value = savedName;
    }
  }

  bindElements() {
    this.els = {
      app: document.getElementById('app'),
      screens: {
        title: document.getElementById('screen-title'),
        difficulty: document.getElementById('screen-difficulty'),
        countdown: document.getElementById('screen-countdown'),
        game: document.getElementById('screen-game'),
        results: document.getElementById('screen-results'),
        ranking: document.getElementById('screen-ranking'),
        online: document.getElementById('screen-online'),
        waiting: document.getElementById('screen-waiting'),
        battle: document.getElementById('screen-battle'),
        battleResults: document.getElementById('screen-battle-results'),
        howto: document.getElementById('screen-howto')
      },
      // Title
      btnSingle: document.getElementById('btn-single'),
      btnOnline: document.getElementById('btn-online'),
      btnRanking: document.getElementById('btn-ranking'),
      btnHowto: document.getElementById('btn-howto'),
      soundToggle: document.getElementById('sound-toggle'),
      backBtns: document.querySelectorAll('.back-btn'),
      // Game
      timer: document.getElementById('timer'),
      score: document.getElementById('score'),
      combo: document.getElementById('combo'),
      conveyorBelt: document.getElementById('conveyor-belt'),
      sushiTrack: document.getElementById('sushi-track'),
      wordJp: document.getElementById('current-word-jp'),
      wordReading: document.getElementById('current-word-reading'),
      typedCorrect: document.getElementById('typed-correct'),
      typedCurrent: document.getElementById('typed-current'),
      typedRemaining: document.getElementById('typed-remaining'),
      typingArea: document.getElementById('typing-area'),
      inputFeedback: document.getElementById('input-feedback'),
      statKeystrokes: document.getElementById('stat-keystrokes'),
      statAccuracy: document.getElementById('stat-accuracy'),
      statMiss: document.getElementById('stat-miss'),
      // Renda & Tally
      rendaFill: document.getElementById('renda-fill'),
      rendaMarkers: [
        document.getElementById('renda-m1'),
        document.getElementById('renda-m2'),
        document.getElementById('renda-m3'),
        document.getElementById('renda-m4')
      ],
      tallyElements: {
        300: document.getElementById('tally-300'),
        500: document.getElementById('tally-500'),
        800: document.getElementById('tally-800'),
        1000: document.getElementById('tally-1000'),
        1500: document.getElementById('tally-1500')
      },
      // Results
      resTitle: document.getElementById('result-title'),
      resLabel: document.getElementById('result-label'),
      resAmount: document.getElementById('result-amount'),
      resCourse: document.getElementById('res-course'),
      resScore: document.getElementById('res-score'),
      resPlates: document.getElementById('res-plates'),
      resAccuracy: document.getElementById('res-accuracy'),
      resCombo: document.getElementById('res-combo'),
      resWpm: document.getElementById('res-wpm'),
      resMiss: document.getElementById('res-miss'),
      playerName: document.getElementById('player-name'),
      btnSubmitScore: document.getElementById('btn-submit-score'),
      btnRetry: document.getElementById('btn-retry'),
      btnBackTitle: document.getElementById('btn-back-title'),
      // Online
      roomPlayerName: document.getElementById('room-player-name'),
      roomDifficulty: document.getElementById('room-difficulty'),
      roomMaxPlayers: document.getElementById('room-max-players'),
      btnCreateRoom: document.getElementById('btn-create-room'),
      joinPlayerName: document.getElementById('join-player-name'),
      btnRefreshRooms: document.getElementById('btn-refresh-rooms'),
      roomList: document.getElementById('room-list'),
      waitingRoomId: document.getElementById('waiting-room-id'),
      waitingDifficulty: document.getElementById('waiting-difficulty'),
      playerList: document.getElementById('player-list'),
      btnStartBattle: document.getElementById('btn-start-battle'),
      btnLeaveRoom: document.getElementById('btn-leave-room'),
      battlePlayers: document.getElementById('battle-players'),
      battleTimer: document.getElementById('battle-timer'),
      battleSushiTrack: document.getElementById('battle-sushi-track'),
      battleWordJp: document.getElementById('battle-word-jp'),
      battleWordReading: document.getElementById('battle-word-reading'),
      battleTypedCorrect: document.getElementById('battle-typed-correct'),
      battleTypedCurrent: document.getElementById('battle-typed-current'),
      battleTypedRemaining: document.getElementById('battle-typed-remaining'),
      btnBattleBack: document.getElementById('btn-battle-back'),
      battleResultsList: document.getElementById('battle-results-list')
    };
  }

  setupEventListeners() {
    this.els.btnSingle.addEventListener('click', () => this.showScreen('difficulty'));
    this.els.btnOnline.addEventListener('click', async () => {
      await onlineBattle.connect();
      onlineBattle.requestRoomList();
      this.showScreen('online');
    });
    this.els.btnRanking.addEventListener('click', () => {
      this.showScreen('ranking');
      this.loadRankings();
    });
    this.els.btnHowto.addEventListener('click', () => this.showScreen('howto'));
    
    this.els.soundToggle.addEventListener('click', () => soundManager.toggle());

    this.els.backBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target.getAttribute('data-target');
        this.showScreen(target);
      });
    });

    document.querySelectorAll('.course-start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const difficulty = e.target.closest('.course-card').getAttribute('data-difficulty');
        this.startSinglePlayer(difficulty);
      });
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (this.game.isRunning) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          this.game.handleKeyPress(e.key);
          if(e.key.length === 1 && e.key !== ' ') e.preventDefault();
        }
      }
    });

    // Mode Selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentMode = e.target.getAttribute('data-mode');
      });
    });

    // Results
    this.els.btnRetry.addEventListener('click', () => this.startSinglePlayer(this.game.difficulty));
    this.els.btnBackTitle.addEventListener('click', () => this.showScreen('title'));
    
    this.els.btnSubmitScore.addEventListener('click', async () => {
      const name = this.els.playerName.value.trim() || '名無し';
      localStorage.setItem('sushiPlayerName', name);
      this.els.btnSubmitScore.disabled = true;
      this.els.btnSubmitScore.textContent = '送信中...';
      
      const results = this.game.getResults();
      await rankingManager.submitScore({
        name: name,
        score: results.score,
        difficulty: results.difficulty,
        accuracy: results.accuracy,
        maxCombo: results.maxCombo,
        wpm: results.wpm,
        missCount: results.missCount,
        wordsCompleted: results.wordsCompleted
      });
      
      this.els.btnSubmitScore.textContent = '登録完了！';
      setTimeout(() => {
        this.showScreen('ranking');
        this.loadRankings();
      }, 1000);
    });

    // Ranking tabs
    document.querySelectorAll('.rank-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.loadRankings();
      });
    });
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.loadRankings();
      });
    });

    // Online Lobby
    this.els.btnCreateRoom.addEventListener('click', () => {
      let name = this.els.roomPlayerName.value.trim() || 'Player';
      name = name.substring(0, 8);
      const diff = this.els.roomDifficulty.value;
      const max = this.els.roomMaxPlayers.value;
      localStorage.setItem('sushiPlayerName', name);
      onlineBattle.createRoom(name, diff, max);
    });

    this.els.btnRefreshRooms.addEventListener('click', () => {
      onlineBattle.requestRoomList();
    });

    this.els.btnLeaveRoom.addEventListener('click', () => {
      onlineBattle.leaveRoom();
      this.showScreen('online');
    });

    this.els.btnStartBattle.addEventListener('click', () => {
      onlineBattle.startBattle();
    });
    
    this.els.btnBattleBack.addEventListener('click', () => {
      this.showScreen('online');
      onlineBattle.requestRoomList();
    });
  }

  showScreen(screenId) {
    Object.values(this.els.screens).forEach(screen => screen.classList.remove('active'));
    if (this.els.screens[screenId]) {
      this.els.screens[screenId].classList.add('active');
    }
    this.currentScreen = screenId;
  }

  startSinglePlayer(difficulty) {
    this.isOnline = false;
    this.game.init(difficulty, this.currentMode);
    
    // Setup Single UI& Tally UI
    this.els.rendaFill.style.width = '0%';
    document.querySelectorAll('.renda-marker').forEach(m => m.classList.remove('reached'));
    Object.values(this.els.tallyElements).forEach(el => el.textContent = '00');
    
    this.startCountdown(() => {
      this.showScreen('game');
      this.game.start();
      soundManager.playStart();
    });
  }

  startCountdown(callback) {
    this.showScreen('countdown');
    const cdNum = document.getElementById('countdown-number');
    let count = 3;
    cdNum.textContent = count;
    soundManager.playCountdown();
    
    const iv = setInterval(() => {
      count--;
      if (count > 0) {
        cdNum.textContent = count;
        soundManager.playCountdown();
      } else if (count === 0) {
        cdNum.textContent = 'START!';
        soundManager.playStart();
      } else {
        clearInterval(iv);
        callback();
      }
    }, 1000);
  }

  setupGameCallbacks() {
    this.game.onTimerUpdate = (t) => {
      const target = this.isOnline ? this.els.battleTimer : this.els.timer;
      target.textContent = t;
      if (t <= 10) target.classList.add('warning');
      else target.classList.remove('warning');
    };

    this.game.onScoreUpdate = (score, earned) => {
      if (!this.isOnline) {
        this.els.score.innerHTML = `${score.toLocaleString()}<span class="yen">円</span>`;
        this.showScorePopup(earned);
      } else {
        const meScore = document.getElementById('bp-score-me');
        if(meScore) meScore.textContent = score;
      }
    };

    this.game.onComboUpdate = (c) => {
      if (!this.isOnline) {
        this.els.combo.textContent = c;
        if (c >= 10) this.els.combo.classList.add('combo-fire');
        else this.els.combo.classList.remove('combo-fire');
      } else {
        const meCombo = document.getElementById('bp-combo-me');
        if(meCombo) meCombo.textContent = c;
      }
    };

    this.game.onNewWord = (word, duration) => {
      this.createSushiPlate(word, duration);
      const jp = this.isOnline ? this.els.battleWordJp : this.els.wordJp;
      const reading = this.isOnline ? this.els.battleWordReading : this.els.wordReading;
      const tCor = this.isOnline ? this.els.battleTypedCorrect : this.els.typedCorrect;
      const tCur = this.isOnline ? this.els.battleTypedCurrent : this.els.typedCurrent;
      const tRem = this.isOnline ? this.els.battleTypedRemaining : this.els.typedRemaining;

      jp.textContent = word.japanese;
      reading.textContent = word.reading;
      tCor.textContent = '';
      tCur.textContent = word.romaji[0] || '';
      tRem.textContent = word.romaji.substring(1);
    };

    this.game.onCorrectKey = (typed, remaining) => {
      soundManager.playType();
      
      const tCor = this.isOnline ? this.els.battleTypedCorrect : this.els.typedCorrect;
      const tCur = this.isOnline ? this.els.battleTypedCurrent : this.els.typedCurrent;
      const tRem = this.isOnline ? this.els.battleTypedRemaining : this.els.typedRemaining;

      tCor.textContent = typed;
      tCur.textContent = remaining[0] || '';
      tRem.textContent = remaining.substring(1);

      if (!this.isOnline) {
        this.els.statKeystrokes.textContent = this.game.totalKeystrokes;
        this.els.statAccuracy.textContent = this.game.getResults().accuracy;
      }
      
      if (this.isOnline) {
        onlineBattle.sendProgress(this.game.score, this.game.combo, this.game.wordsSpawned || 0, this.game.getResults().accuracy);
      }
    };

    this.game.onMiss = () => {
      soundManager.playMiss();
      this.showInputFeedback(false);
      const area = this.isOnline ? document.getElementById('battle-typing-area') : this.els.typingArea;
      area.classList.remove('shake');
      void area.offsetWidth; // trigger reflow
      area.classList.add('shake');
      
      if (!this.isOnline) {
        this.els.statMiss.textContent = this.game.missCount;
        this.els.statKeystrokes.textContent = this.game.totalKeystrokes;
        this.els.statAccuracy.textContent = this.game.getResults().accuracy;
      }
    };

    this.game.onRendaUpdate = (count) => {
      if (this.isOnline) return;
      const percentage = (count / 60) * 100;
      this.els.rendaFill.style.width = `${percentage}%`;
      
      // Update markers
      if (count >= 15) this.els.rendaMarkers[0].parentElement.classList.add('reached'); else this.els.rendaMarkers[0].parentElement.classList.remove('reached');
      if (count >= 30) this.els.rendaMarkers[1].parentElement.classList.add('reached'); else this.els.rendaMarkers[1].parentElement.classList.remove('reached');
      if (count >= 45) this.els.rendaMarkers[2].parentElement.classList.add('reached'); else this.els.rendaMarkers[2].parentElement.classList.remove('reached');
    };

    this.game.onTimeAdded = (sec) => {
      if (this.isOnline) return;
      this.showScorePopup(sec, true);
    };

    this.game.onTallyUpdate = (tally) => {
      if (this.isOnline) return;
      for (const [price, count] of Object.entries(tally)) {
        if (this.els.tallyElements[price]) {
          this.els.tallyElements[price].textContent = count.toString().padStart(2, '0');
        }
      }
    };

    this.game.onWordComplete = (word) => {
      soundManager.playCorrect();
      if(this.game.combo > 0) soundManager.playCombo(this.game.combo);
      this.eatSushiPlate();
      this.showInputFeedback(true);
      
      if (this.isOnline) {
        onlineBattle.sendProgress(this.game.score, this.game.combo, this.game.wordsSpawned || 0, this.game.getResults().accuracy);
      }
    };

    this.game.onWagyuComplete = (id) => {
      onlineBattle.claimWagyu(id);
      this.showScorePopup(0, false, '和牛GET!', 'gold');
    };

    this.game.onPlateFlowsAway = () => {
      soundManager.playMiss();
      this.showInputFeedback(false);
      
      const tCor = this.isOnline ? this.els.battleTypedCorrect : this.els.typedCorrect;
      const tCur = this.isOnline ? this.els.battleTypedCurrent : this.els.typedCurrent;
      const tRem = this.isOnline ? this.els.battleTypedRemaining : this.els.typedRemaining;
      
      tCor.textContent = '';
      tCur.textContent = '';
      tRem.textContent = '見逃し...';
      tRem.style.color = 'var(--wrong)';
      
      setTimeout(() => { tRem.style.color = ''; }, 500);
    };

    this.game.onGameEnd = (results) => {
      if (this.isOnline) {
        onlineBattle.sendFinished(results);
        
        // Show waiting message
        const jpDisplay = document.getElementById('battle-word-jp');
        const readingDisplay = document.getElementById('battle-word-reading');
        const romajiDisplay = document.getElementById('battle-romaji-display');
        
        if (jpDisplay) jpDisplay.textContent = '終了！';
        if (readingDisplay) readingDisplay.textContent = '他のプレイヤーを待っています...';
        if (romajiDisplay) romajiDisplay.style.display = 'none';
        
        const track = document.getElementById('battle-sushi-track');
        if (track) track.innerHTML = '';
      } else {
        this.showResults(results);
      }
    };
  }

  // --- Visual Effects ---

  createParticles() {
    // Particles (falling emojis/words) removed based on user feedback,
    // but the background gradient div (#particles-bg) is kept in HTML.
  }

  createSushiPlate(word, duration = 5000) {
    const track = this.isOnline ? this.els.battleSushiTrack : this.els.sushiTrack;
    track.innerHTML = '';
    const plate = document.createElement('div');
    plate.className = `sushi-plate active ${this.game.difficulty}`;
    plate.id = 'current-plate';
    let emoji = '🥩';
    if(word.points < 400) emoji = '🥓';
    else if(word.points > 800) emoji = '🍖';
    
    if (word.isWagyu) {
      emoji = '✨🥩✨';
      plate.style.boxShadow = '0 0 20px gold';
      plate.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.5), rgba(255,140,0,0.5))';
    }
    
    plate.innerHTML = `<span class="sushi-emoji-plate">${emoji}</span>`;
    // Update animation to use the provided duration
    plate.style.animation = `plate-move ${duration}ms linear forwards`;
    track.appendChild(plate);
  }

  eatSushiPlate() {
    const plate = document.getElementById('current-plate');
    if (plate) {
      // Get current computed X position so it eats in place instead of jumping
      const style = window.getComputedStyle(plate);
      const matrix = new WebKitCSSMatrix(style.transform);
      plate.style.left = style.left;
      plate.style.animation = 'plate-eat 0.5s ease forwards';
    }
  }

  showScorePopup(amount, isTime = false, customText = null, customColor = null) {
    const container = document.getElementById('score-popups');
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    
    if (customText) {
      popup.textContent = customText;
      if (customColor) popup.style.color = customColor;
      popup.style.fontSize = '2rem';
    } else {
      popup.textContent = isTime ? `+${amount}秒` : `+${amount}円`;
      if (isTime) {
        popup.style.color = '#4ecdc4'; // Cyan for time
        popup.style.fontSize = '2rem';
      }
    }
    
    // Random position near center
    const x = window.innerWidth / 2 + (Math.random() * 100 - 50);
    const y = window.innerHeight / 2 - 100 + (Math.random() * 50);
    
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    
    container.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);
  }

  showInputFeedback(isCorrect) {
    this.els.inputFeedback.textContent = isCorrect ? '〇' : '✕';
    this.els.inputFeedback.className = isCorrect ? 'feedback-maru' : 'feedback-batsu';
  }

  // --- UI Updates ---

  showResults(results) {
    soundManager.playResult();
    this.showScreen('results');
    
    this.els.resCourse.textContent = SushiGame.DIFFICULTY_CONFIG[results.difficulty].label;
    this.els.resScore.textContent = `${results.score.toLocaleString()}円`;
    this.els.resPlates.textContent = `${results.wordsCompleted}枚`;
    this.els.resAccuracy.textContent = `${results.accuracy}%`;
    this.els.resCombo.textContent = results.maxCombo;
    this.els.resWpm.textContent = results.wpm;
    this.els.resMiss.textContent = results.missCount;

    this.els.resAmount.textContent = `${Math.abs(results.profit).toLocaleString()}円`;
    this.els.resAmount.className = 'result-big-number';
    
    if (results.profit > 0) {
      this.els.resTitle.textContent = 'お得でした！';
      this.els.resLabel.textContent = 'コース料金より';
      this.els.resAmount.classList.add('profit');
      this.els.resAmount.textContent += ' お得';
    } else if (results.profit < 0) {
      this.els.resTitle.textContent = '損しました...';
      this.els.resLabel.textContent = 'コース料金より';
      this.els.resAmount.classList.add('loss');
      this.els.resAmount.textContent += ' 損';
    } else {
      this.els.resTitle.textContent = 'ぴったり！';
      this.els.resLabel.textContent = '損得ゼロ';
      this.els.resAmount.classList.add('even');
    }

    this.els.btnSubmitScore.disabled = false;
    this.els.btnSubmitScore.textContent = 'ランキング登録';
  }

  async loadRankings() {
    const activeTab = document.querySelector('.rank-tab.active').getAttribute('data-tab');
    const activeDiff = document.querySelector('.filter-btn.active').getAttribute('data-difficulty');
    
    document.getElementById('ranking-loading').classList.remove('hidden');
    document.getElementById('ranking-table').classList.add('hidden');
    document.getElementById('ranking-empty').classList.add('hidden');

    const data = await rankingManager.fetchRankings(activeTab, activeDiff);
    
    document.getElementById('ranking-loading').classList.add('hidden');
    rankingManager.renderRankings(data, document.getElementById('ranking-body'));
  }

  // --- Online Callbacks ---
  setupOnlineCallbacks() {
    onlineBattle.onRoomList = (rooms) => {
      this.els.roomList.innerHTML = '';
      if (rooms.length === 0) {
        this.els.roomList.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:1rem;">部屋がありません</div>';
        return;
      }
      rooms.forEach(r => {
        const div = document.createElement('div');
        div.className = 'room-item';
        div.innerHTML = `
          <div class="room-info-text">
            <strong>${r.host} の部屋</strong>
            <span style="font-size:0.9rem; color:var(--secondary);">${SushiGame.DIFFICULTY_CONFIG[r.difficulty].label}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span>${r.playerCount}/${r.maxPlayers}</span>
            <button class="room-join-btn" data-id="${r.roomId}" ${r.playerCount >= r.maxPlayers || r.status !== 'waiting' ? 'disabled' : ''}>参加</button>
          </div>
        `;
        this.els.roomList.appendChild(div);
      });
      
      document.querySelectorAll('.room-join-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          let name = this.els.joinPlayerName.value.trim() || 'Player';
          name = name.substring(0, 8);
          localStorage.setItem('sushiPlayerName', name);
          onlineBattle.joinRoom(e.target.getAttribute('data-id'), name);
        });
      });
    };

    onlineBattle.onRoomCreated = (data) => this.enterWaitingRoom(data.room);
    onlineBattle.onRoomJoined = (data) => this.enterWaitingRoom(data.room);
    
    onlineBattle.onPlayerJoined = (data) => this.updateWaitingPlayers();
    onlineBattle.onPlayerLeft = (data) => this.updateWaitingPlayers();

    onlineBattle.onGameStart = (data) => {
      this.isOnline = true;
      this.game.init(data.difficulty, 'normal', data.words);
      this.setupBattleUI();
      
      const towContainer = document.getElementById('tug-of-war-container');
      if (data.is1v1) {
        if (towContainer) towContainer.style.display = 'block';
        const towBar = document.getElementById('tow-bar');
        if (towBar) towBar.style.width = '50%';
        
        const towLeft = document.getElementById('tow-left-name');
        const towRight = document.getElementById('tow-right-name');
        
        let opponentName = '';
        onlineBattle.players.forEach(p => {
          if (p.name !== onlineBattle.playerName) opponentName = p.name;
        });
        
        if (towLeft) towLeft.textContent = `自分 (${onlineBattle.playerName})`;
        if (towRight) towRight.textContent = `相手 (${opponentName})`;
        
      } else {
        if (towContainer) towContainer.style.display = 'none';
      }
      
      this.startCountdown(() => {
        this.showScreen('battle');
        const romajiDisplay = document.getElementById('battle-romaji-display');
        if (romajiDisplay) romajiDisplay.style.display = 'inline-block';
        this.game.start();
        soundManager.playStart();
      });
    };

    onlineBattle.onOpponentProgress = (data) => {
      const safeId = escapeHtml(data.playerName).replace(/\s+/g, '_');
      const scoreEl = document.getElementById(`bp-score-${safeId}`);
      const comboEl = document.getElementById(`bp-combo-${safeId}`);
      if(scoreEl) scoreEl.textContent = data.score;
      if(comboEl) comboEl.textContent = data.combo;
      
      // Update opponent plate visual
      const track = document.getElementById(`bp-track-${safeId}`);
      if (track) {
        if (!this.oppWords[data.playerName]) this.oppWords[data.playerName] = 0;
        if (data.wordsCompleted > this.oppWords[data.playerName]) {
          this.oppWords[data.playerName] = data.wordsCompleted;
          // Eat current plate
          const current = track.querySelector('.sushi-plate');
          if (current) {
            const style = window.getComputedStyle(current);
            current.style.left = style.left;
            current.style.animation = 'plate-eat 0.5s ease forwards';
            setTimeout(() => current.remove(), 500);
          }
          // Spawn next plate
          this.spawnOpponentPlate(data.playerName);
        }
      }
    };

    onlineBattle.onBattleResults = (data) => {
      this.game.stop();
      this.showScreen('battleResults');
      soundManager.playResult();
      
      const list = this.els.battleResultsList;
      list.innerHTML = '';
      
      if (data.results.length === 0) return;
      
      // Sort by score
      data.results.sort((a,b) => b.score - a.score);
      
      data.results.forEach((r, i) => {
        const item = document.createElement('div');
        item.style.padding = '1.5rem';
        item.style.background = 'rgba(0,0,0,0.5)';
        item.style.borderRadius = '8px';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        if (i === 0) item.style.border = '2px solid gold';
        
        item.innerHTML = `
          <div style="font-size:1.5rem; font-weight:bold;">
            ${i+1}位: ${escapeHtml(r.playerName)}
          </div>
          <div style="text-align:right;">
            <div style="font-family:'Orbitron'; font-size:2rem; color:var(--secondary);">${r.score}円</div>
            <div style="color:var(--text-muted);">${r.wordsCompleted}枚 / ${r.accuracy}% / ${r.combo} MaxCombo</div>
          </div>
        `;
        list.appendChild(item);
      });
    };

    onlineBattle.onSpawnWagyu = (wagyu) => {
      soundManager.playStart();
      this.game.interruptWithWagyu(wagyu);
    };

    onlineBattle.onWagyuStolen = (winnerName) => {
      if (winnerName !== onlineBattle.playerName) {
        soundManager.playMiss();
        this.game.cancelWagyu();
        this.showScorePopup(0, false, '横取りされた！', 'var(--wrong)');
      }
    };

    onlineBattle.onTugOfWarUpdate = (data) => {
      const p1 = document.getElementById('tow-left-name');
      const p2 = document.getElementById('tow-right-name');
      const bar = document.getElementById('tow-bar');
      
      let percent = data.p1Percent;
      
      // If the current player is P2, flip the perspective so "I" am always on the left
      if (data.p2Name === onlineBattle.playerName) {
        if (p1) p1.textContent = "自分 (" + data.p2Name + ")";
        if (p2) p2.textContent = "相手 (" + data.p1Name + ")";
        percent = 100 - data.p1Percent;
      } else {
        if (p1) p1.textContent = "自分 (" + data.p1Name + ")";
        if (p2) p2.textContent = "相手 (" + data.p2Name + ")";
      }
      
      if (bar) bar.style.width = percent + '%';
    };

    onlineBattle.onTugOfWarWin = (data) => {
      // The server automatically finishes the battle, so onBattleResults will be triggered.
      // We can just show a small toast or wait for results.
    };
  }

  enterWaitingRoom(room) {
    this.showScreen('waiting');
    this.els.waitingRoomId.textContent = room.id.substring(0,6);
    this.els.waitingDifficulty.textContent = SushiGame.DIFFICULTY_CONFIG[room.difficulty].label;
    this.updateWaitingPlayers();
  }

  updateWaitingPlayers() {
    this.els.playerList.innerHTML = '';
    onlineBattle.players.forEach(p => {
      const div = document.createElement('div');
      div.className = `player-card ${p.isHost ? 'host' : ''}`;
      div.textContent = p.name;
      this.els.playerList.appendChild(div);
    });

    if (onlineBattle.isHost && onlineBattle.players.length > 1) {
      this.els.btnStartBattle.classList.remove('hidden');
      document.getElementById('waiting-status').textContent = '全員揃ったら対戦開始を押してください';
    } else {
      this.els.btnStartBattle.classList.add('hidden');
      document.getElementById('waiting-status').textContent = '他のプレイヤーを待っています...';
    }
  }

  setupBattleUI() {
    this.oppWords = {};
    const opponentsArea = document.getElementById('battle-opponents-area');
    opponentsArea.innerHTML = '';
    
    onlineBattle.players.forEach(p => {
      if (p.name === onlineBattle.playerName) return; // Skip myself
      
      // Sanitize p.name for ID to prevent issues with spaces
      const safeId = escapeHtml(p.name).replace(/\s+/g, '_');
      
      this.oppWords[p.name] = 1;
      const div = document.createElement('div');
      div.className = 'glass-panel';
      div.style.padding = '0.5rem';
      div.style.marginBottom = '0.5rem';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="font-weight: bold;">${escapeHtml(p.name)}</div>
          <div style="font-size: 0.9rem;">スコア: <span id="bp-score-${safeId}" style="color:var(--secondary);">0</span>円 | <span id="bp-combo-${safeId}">0</span>コンボ</div>
        </div>
        <div style="width: 100%; height: 80px; background: #111; position: relative; overflow: hidden; border-radius: 4px;" id="bp-track-${safeId}"></div>
      `;
      opponentsArea.appendChild(div);
      this.spawnOpponentPlate(p.name);
    });
  }

  spawnOpponentPlate(playerName) {
    const safeId = escapeHtml(playerName).replace(/\s+/g, '_');
    const track = document.getElementById(`bp-track-${safeId}`);
    if (!track) return;
    
    const plate = document.createElement('div');
    plate.className = `sushi-plate`;
    // Scale down plate for opponent view
    plate.style.width = '60px';
    plate.style.height = '60px';
    plate.style.animation = `plate-move 6000ms linear forwards`; // Match normal mode roughly
    plate.innerHTML = `<span style="font-size:1.5rem;">🥩</span>`;
    track.appendChild(plate);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
