class OnlineBattle {
  constructor(serverUrl) {
    this.socket = null;
    this.serverUrl = serverUrl;
    this.roomId = null;
    this.playerName = null;
    this.isHost = false;
    this.players = [];
    
    // Callbacks
    this.onRoomCreated = null;
    this.onRoomJoined = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onGameStart = null;
    this.onOpponentProgress = null;
    this.onBattleResults = null;
    this.onRoomList = null;
    this.onError = null;
  }

  async connect() {
    if (this.socket) return;
    
    // Dynamically load Socket.IO if not present
    if (typeof io === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    this.socket = io(this.serverUrl);

    this.socket.on('connect', () => {
      console.log('Connected to battle server');
    });

    this.socket.on('room-list', (rooms) => {
      if (this.onRoomList) this.onRoomList(rooms);
    });

    this.socket.on('room-created', (data) => {
      this.roomId = data.roomId;
      this.isHost = true;
      if (this.onRoomCreated) this.onRoomCreated(data);
    });

    this.socket.on('room-joined', (data) => {
      this.roomId = data.room.roomId;
      this.isHost = false;
      this.players = data.room.players;
      if (this.onRoomJoined) this.onRoomJoined(data);
    });

    this.socket.on('player-joined', (data) => {
      this.players = data.room.players;
      if (this.onPlayerJoined) this.onPlayerJoined(data);
    });

    this.socket.on('player-left', (data) => {
      this.players = data.room.players;
      // Update host status if host left
      const me = this.players.find(p => p.name === this.playerName);
      if (me && me.isHost) this.isHost = true;
      
      if (this.onPlayerLeft) this.onPlayerLeft(data);
    });

    this.socket.on('battle-started', (data) => {
      if (this.onGameStart) this.onGameStart(data);
    });

    this.socket.on('opponent-progress', (data) => {
      if (this.onOpponentProgress) this.onOpponentProgress(data);
    });

    this.socket.on('battle-results', (data) => {
      if (this.onBattleResults) this.onBattleResults(data);
    });

    this.socket.on('error', (err) => {
      if (this.onError) this.onError(err.message);
      else alert('Error: ' + err.message);
    });

    this.socket.on('spawn-wagyu', (wagyu) => {
      if (this.onSpawnWagyu) this.onSpawnWagyu(wagyu);
    });

    this.socket.on('wagyu-stolen', (data) => {
      if (this.onWagyuStolen) this.onWagyuStolen(data.winner);
    });

    this.socket.on('tug-of-war-update', (data) => {
      if (this.onTugOfWarUpdate) this.onTugOfWarUpdate(data);
    });

    this.socket.on('tug-of-war-win', (data) => {
      if (this.onTugOfWarWin) this.onTugOfWarWin(data);
    });
  }

  createRoom(playerName, difficulty, maxPlayers) {
    this.playerName = playerName;
    this.socket.emit('create-room', { playerName, difficulty, maxPlayers });
  }

  joinRoom(roomId, playerName) {
    this.playerName = playerName;
    this.socket.emit('join-room', { roomId, playerName });
  }

  startBattle() {
    if (this.isHost && this.roomId) {
      this.socket.emit('start-battle', { roomId: this.roomId });
    }
  }

  claimWagyu(wagyuId) {
    if (this.socket && this.roomId) {
      this.socket.emit('wagyu-claimed', { roomId: this.roomId, wagyuId });
    }
  }

  sendProgress(score, combo, wordsCompleted, accuracy) {
    if (this.roomId) {
      this.socket.emit('typing-progress', { roomId: this.roomId, score, combo, wordsCompleted, accuracy });
    }
  }

  sendFinished(results) {
    if (this.roomId) {
      this.socket.emit('game-finished', { roomId: this.roomId, results });
    }
  }

  leaveRoom() {
    if (this.roomId) {
      this.socket.emit('leave-room', { roomId: this.roomId });
      this.roomId = null;
      this.isHost = false;
      this.players = [];
    }
  }

  requestRoomList() {
    if (this.socket) {
      this.socket.emit('get-rooms');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const onlineBattle = new OnlineBattle('http://172.23.72.107:3019');
