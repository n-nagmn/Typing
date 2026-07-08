class SushiGame {
  constructor() {
    this.difficulty = null;
    this.timeLimit = 0;
    this.timer = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.missCount = 0;
    this.wordsCompleted = 0;
    this.currentWord = null;
    this.currentCharIndex = 0;
    this.wordQueue = [];
    this.isRunning = false;
    this.intervalId = null;
    this.courseCost = 0;
    
    // Renda Meter & Tally
    this.rendaCount = 0;
    this.platesTally = { 300: 0, 500: 0, 800: 0, 1000: 0, 1500: 0 };

    // Romaji state machine
    this.validPaths = [];
    this.typedString = "";
    this.plateTimeout = null;

    // Callbacks
    this.onGameEnd = null;
    this.onScoreUpdate = null;
    this.onComboUpdate = null;
    this.onTimerUpdate = null;
    this.onWordComplete = null;
    this.onNewWord = null;
    this.onMiss = null;
    this.onCorrectKey = null;
    this.onRendaUpdate = null;
    this.onTallyUpdate = null;
    this.onTimeAdded = null;
    this.onPlateFlowsAway = null;
    this.onWagyuComplete = null;
  }

  static DIFFICULTY_CONFIG = {
    easy: { time: 60, cost: 3000, label: 'お手軽コース' },
    normal: { time: 90, cost: 5000, label: 'おすすめコース' },
    hard: { time: 120, cost: 10000, label: '高級コース' }
  };

  // Complex romaji mapping for flexible input
  static ROMAJI_MAP = {
    'あ':['a'], 'い':['i'], 'う':['u', 'wu'], 'え':['e'], 'お':['o'],
    'か':['ka','ca'], 'き':['ki'], 'く':['ku','cu','qu'], 'け':['ke'], 'こ':['ko','co'],
    'さ':['sa'], 'し':['shi','si','ci'], 'す':['su'], 'せ':['se','ce'], 'そ':['so'],
    'た':['ta'], 'ち':['chi','ti'], 'つ':['tsu','tu'], 'て':['te'], 'と':['to'],
    'な':['na'], 'に':['ni'], 'ぬ':['nu'], 'ね':['ne'], 'の':['no'],
    'は':['ha'], 'ひ':['hi'], 'ふ':['fu','hu'], 'へ':['he'], 'ほ':['ho'],
    'ま':['ma'], 'み':['mi'], 'む':['mu'], 'め':['me'], 'も':['mo'],
    'や':['ya'], 'ゆ':['yu'], 'よ':['yo'],
    'ら':['ra'], 'り':['ri'], 'る':['ru'], 'れ':['re'], 'ろ':['ro'],
    'わ':['wa'], 'を':['wo'], 'ん':['nn','n'],
    'が':['ga'], 'ぎ':['gi'], 'ぐ':['gu'], 'げ':['ge'], 'ご':['go'],
    'ざ':['za'], 'じ':['ji','zi'], 'ず':['zu'], 'ぜ':['ze'], 'ぞ':['zo'],
    'だ':['da'], 'ぢ':['di'], 'づ':['du'], 'で':['de'], 'ど':['do'],
    'ば':['ba'], 'び':['bi'], 'ぶ':['bu'], 'べ':['be'], 'ぼ':['bo'],
    'ぱ':['pa'], 'ぴ':['pi'], 'ぷ':['pu'], 'ぺ':['pe'], 'ぽ':['po'],
    'きゃ':['kya'], 'きゅ':['kyu'], 'きょ':['kyo'],
    'しゃ':['sha','sya'], 'しゅ':['shu','syu'], 'しょ':['sho','syo'],
    'ちゃ':['cha','tya','cya'], 'ちゅ':['chu','tyu','cyu'], 'ちょ':['cho','tyo','cyo'],
    'にゃ':['nya'], 'にゅ':['nyu'], 'にょ':['nyo'],
    'ひゃ':['hya'], 'ひゅ':['hyu'], 'ひょ':['hyo'],
    'みゃ':['mya'], 'みゅ':['myu'], 'みょ':['myo'],
    'りゃ':['rya'], 'りゅ':['ryu'], 'りょ':['ryo'],
    'ぎゃ':['gya'], 'ぎゅ':['gyu'], 'ぎょ':['gyo'],
    'じゃ':['ja','zya','jya'], 'じゅ':['ju','zyu','jyu'], 'じょ':['jo','zyo','jyo'],
    'びゃ':['bya'], 'びゅ':['byu'], 'びょ':['byo'],
    'ぴゃ':['pya'], 'ぴゅ':['pyu'], 'ぴょ':['pyo'],
    'ぁ':['la','xa'], 'ぃ':['li','xi'], 'ぅ':['lu','xu'], 'ぇ':['le','xe'], 'ぉ':['lo','xo'],
    'ゃ':['lya','xya'], 'ゅ':['lyu','xyu'], 'ょ':['lyo','xyo'], 'っ':['ltu','xtu','ltsu']
  };

  getComboMultiplier() {
    if (this.combo >= 30) return 2.5;
    if (this.combo >= 20) return 2.0;
    if (this.combo >= 10) return 1.5;
    if (this.combo >= 5) return 1.2;
    return 1.0;
  }

  init(difficulty, mode = 'normal', wordList = null) {
    this.difficulty = difficulty;
    this.mode = mode;
    this.isOnline = !!wordList;
    const config = SushiGame.DIFFICULTY_CONFIG[difficulty];
    this.timeLimit = config.time;
    this.timer = this.timeLimit;
    this.courseCost = config.cost;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.missCount = 0;
    this.wordsCompleted = 0;
    this.wordsSpawned = 0;
    this.rendaCount = 0;
    this._pendingComplete = false;
    this.platesTally = { 300: 0, 500: 0, 800: 0, 1000: 0, 1500: 0 };

    // Use provided wordList (for online) or default database
    if (wordList) {
      this.wordQueue = [...wordList];
    } else {
      if (!window.WORD_DATABASE) {
        console.error("WORD_DATABASE not loaded");
        this.wordQueue = [{japanese:"エラー", reading:"えらー", romaji:"era-", points:100}];
      } else {
        if (!SushiGame.sessionQueues) {
          SushiGame.sessionQueues = { easy: null, normal: null, hard: null };
        }
        if (!SushiGame.sessionQueues[difficulty] || SushiGame.sessionQueues[difficulty].length === 0) {
          SushiGame.sessionQueues[difficulty] = [...window.WORD_DATABASE[difficulty]];
          for (let i = SushiGame.sessionQueues[difficulty].length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [SushiGame.sessionQueues[difficulty][i], SushiGame.sessionQueues[difficulty][j]] = [SushiGame.sessionQueues[difficulty][j], SushiGame.sessionQueues[difficulty][i]];
          }
        }
        this.wordQueue = SushiGame.sessionQueues[difficulty];
      }
    }
  }

  shuffleWords() {
    for (let i = this.wordQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wordQueue[i], this.wordQueue[j]] = [this.wordQueue[j], this.wordQueue[i]];
    }
  }

  start() {
    this.isRunning = true;
    this.nextWord();
    
    if (this.onTimerUpdate) this.onTimerUpdate(this.timer);
    
    this.intervalId = setInterval(() => {
      this.timer--;
      if (this.onTimerUpdate) this.onTimerUpdate(this.timer);
      
      if (this.timer <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  // Generate all valid romaji paths for a reading
  _generatePaths(reading) {
    // Simple naive parser for small scale - real typing games have more complex parsers
    // For this implementation, we just use the pre-defined romaji in the word object
    // to keep it simple, but we can allow some flexibility.
    // Given the constraints, we will parse the default romaji from the DB.
    // A robust parser would parse `reading` into chunks.
    return [this.currentWord.romaji];
  }

  nextWord() {
    if (this.wordQueue.length === 0) {
      if (this.difficulty) {
        this.wordQueue = [...window.WORD_DATABASE[this.difficulty]];
        this.shuffleWords();
        if (SushiGame.sessionQueues) {
          SushiGame.sessionQueues[this.difficulty] = this.wordQueue;
        }
      }
    }
    
    this.currentWord = this.wordQueue.shift();
    this.currentCharIndex = 0;
    this.typedString = "";
    this.wordsSpawned++;
    
    // Calculate duration based on difficulty and text length
    let baseTime = 2500;
    let charTime = 300;
    
    if (this.difficulty === 'easy') {
      baseTime = 3500;
      charTime = 350;
    } else if (this.difficulty === 'normal') {
      baseTime = 2500;
      charTime = 280;
    } else if (this.difficulty === 'hard') {
      baseTime = 1800;
      charTime = 220;
    }
    
    let duration = baseTime + (this.currentWord.romaji.length * charTime);
    
    if (this.mode === 'practice') {
      duration *= 1.4; // Practice mode is slower
    }
    
    if (this.onNewWord) {
      this.onNewWord(this.currentWord, duration);
    }

    if (this.plateTimeout) clearTimeout(this.plateTimeout);
    this.plateTimeout = setTimeout(() => {
      this.onPlateTimeout();
    }, duration);
  }

  interruptWithWagyu(wagyu) {
    if (this.currentWord && !this.currentWord.isWagyu) {
      this.wordQueue.unshift(this.currentWord);
    }
    this.currentWord = wagyu;
    this.currentCharIndex = 0;
    this.typedString = "";
    this.wordsSpawned++;
    if (this.plateTimeout) clearTimeout(this.plateTimeout);
    
    if (this.onNewWord) this.onNewWord(this.currentWord, 6000);
    this.plateTimeout = setTimeout(() => {
      this.onPlateTimeout();
    }, 6000);
  }

  cancelWagyu() {
    if (this.currentWord && this.currentWord.isWagyu) {
      if (this.plateTimeout) clearTimeout(this.plateTimeout);
      this.nextWord();
    }
  }

  onPlateTimeout() {
    if (this.mode === 'speed' || this.mode === 'sudden_death') {
      this.endGame();
      return;
    }
    // Miss penalty (combo reset)
    this.combo = 0;
    this.rendaCount = 0;
    if (this.onComboUpdate) this.onComboUpdate(this.combo);
    if (this.onRendaUpdate) this.onRendaUpdate(this.rendaCount);
    
    if (this.onPlateFlowsAway) this.onPlateFlowsAway();
    
    this.nextWord();
  }

  applyFlexibleRomaji(inputChar) {
    const equivs = [["ka","ca"],["ku","cu"],["ko","co"],["se","ce"],["shi","si"],["shi","ci"],["si","ci"],["chi","ti"],["tsu","tu"],["fu","hu"],["ji","zi"],["nn","n"],["nn","xn"],["n","xn"],["sha","sya"],["shu","syu"],["sho","syo"],["she","sye"],["cha","tya"],["cha","cya"],["chu","tyu"],["chu","cyu"],["cho","tyo"],["cho","cyo"],["che","tye"],["che","cye"],["ja","zya"],["ja","jya"],["ju","zyu"],["ju","jyu"],["jo","zyo"],["jo","jyo"],["je","zye"],["je","jye"],["fa","hua"],["fa","fua"],["fa","huxa"],["fa","fuxa"],["fa","hula"],["fa","fula"],["fi","hui"],["fi","fui"],["fi","huxi"],["fi","fuxi"],["fi","huli"],["fi","fuli"],["fe","hue"],["fe","fue"],["fe","huxe"],["fe","fuxe"],["fe","hule"],["fe","fule"],["fo","huo"],["fo","fuo"],["fo","huxo"],["fo","fuxo"],["fo","hulo"],["fo","fulo"],["kya","kixya"],["kya","kilya"],["kyu","kixyu"],["kyu","kilyu"],["kyo","kixyo"],["kyo","kilyo"],["gya","gixya"],["gya","gilya"],["gyu","gixyu"],["gyu","gilyu"],["gyo","gixyo"],["gyo","gilyo"],["nya","nixya"],["nya","nilya"],["nyu","nixyu"],["nyu","nilyu"],["nyo","nixyo"],["nyo","nilyo"],["hya","hixya"],["hya","hilya"],["hyu","hixyu"],["hyu","hilyu"],["hyo","hixyo"],["hyo","hilyo"],["bya","bixya"],["bya","bilya"],["byu","bixyu"],["byu","bilyu"],["byo","bixyo"],["byo","bilyo"],["pya","pixya"],["pya","pilya"],["pyu","pixyu"],["pyu","pilyu"],["pyo","pixyo"],["pyo","pilyo"],["mya","mixya"],["mya","milya"],["myu","mixyu"],["myu","milyu"],["myo","mixyo"],["myo","milyo"],["rya","rixya"],["rya","rilya"],["ryu","rixyu"],["ryu","rilyu"],["ryo","rixyo"],["ryo","rilyo"],["sha","shixya"],["sha","shilya"],["sha","sixya"],["sha","silya"],["sya","shixya"],["sya","sixya"],["shu","shixyu"],["shu","shilyu"],["shu","sixyu"],["shu","silyu"],["syu","shixyu"],["syu","sixyu"],["sho","shixyo"],["sho","shilyo"],["sho","sixyo"],["sho","silyo"],["syo","shixyo"],["syo","sixyo"],["she","shixe"],["she","shile"],["she","sixe"],["she","sile"],["sye","shixe"],["sye","sixe"],["cha","chixya"],["cha","chilya"],["cha","tixya"],["cha","tilya"],["tya","tixya"],["cya","cixya"],["chu","chixyu"],["chu","chilyu"],["chu","tixyu"],["chu","tilyu"],["tyu","tixyu"],["cyu","cixyu"],["cho","chixyo"],["cho","chilyo"],["cho","tixyo"],["cho","tilyo"],["tyo","tixyo"],["cyo","cixyo"],["che","chixe"],["che","chile"],["che","tixe"],["che","tile"],["tye","tixe"],["cye","cixe"],["ja","jixya"],["ja","jilya"],["ja","zixya"],["ja","zilya"],["jya","jixya"],["zya","zixya"],["ju","jixyu"],["ju","jilyu"],["ju","zixyu"],["ju","zilyu"],["jyu","jixyu"],["zyu","zixyu"],["jo","jixyo"],["jo","jilyo"],["jo","zixyo"],["jo","zilyo"],["jyo","jixyo"],["zyo","zixyo"],["je","jixe"],["je","jile"],["je","zixe"],["je","zile"],["jye","jixe"],["zye","zixe"],["wi","ui"],["we","ue"],["wha","ufa"],["whi","ufi"],["whe","ufe"],["who","ufo"],["kwa","kua"],["kwi","kui"],["kwe","kue"],["kwo","kuo"],["gwa","gua"],["gwi","gui"],["gwe","gue"],["gwo","guo"],["tsa","tusa"],["tsi","tusi"],["tse","tuse"],["tso","tuso"],["tha","teya"],["thi","teyi"],["thu","teyu"],["the","teye"],["tho","teyo"],["dha","deya"],["dhi","deyi"],["dhu","deyu"],["dhe","deye"],["dho","deyo"],["twa","toa"],["twi","toi"],["twe","toe"],["two","too"],["dwa","doa"],["dwi","doi"],["dwe","doe"],["dwo","doo"],["vya","vixya"],["vyi","vixyi"],["vyu","vixyu"],["vye","vixye"],["vyo","vixyo"],["va","vua"],["vi","vui"],["vu","vuxu"],["ve","vue"],["vo","vuo"]];

    for (let i = 0; i < equivs.length; i++) {
      for (let dir = 0; dir < 2; dir++) {
        const from = equivs[i][dir];
        const to = equivs[i][1 - dir];
        
        // Find if the original romaji contains 'from' starting at some point that overlaps with what we've typed
        // Since we only diverge at the current keystroke, the divergence must happen such that:
        // typedSoFar + inputChar matches a prefix of 'to'
        // AND the original string starts with 'from' at the exact same start position!
        
        // Let's check overlap lengths from 0 to max possible
        for (let overlap = 0; overlap <= this.currentCharIndex; overlap++) {
          const startIdx = this.currentCharIndex - overlap;
          const origSub = this.currentWord.romaji.substring(startIdx);
          
          if (origSub.startsWith(from)) {
            const typedSub = this.typedString.substring(startIdx) + inputChar;
            const toAndRest = to + origSub.substring(from.length);
            if (toAndRest.startsWith(typedSub)) {
              // Match found! Replace 'from' with 'to' in currentWord.romaji
              this.currentWord.romaji = this.currentWord.romaji.substring(0, startIdx) + to + this.currentWord.romaji.substring(startIdx + from.length);
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  handleKeyPress(key) {
    if (!this.isRunning || !this.currentWord) return;

    // Ignore non-character keys
    if (key.length > 1) return;

    const inputChar = key.toLowerCase();

    // ── ん末尾バッファ処理 ──
    // 前の単語が n で終わり、単語完了を保留している状態
    if (this._pendingComplete) {
      this._pendingComplete = false;
      if (inputChar === 'n') {
        // nn 入力: 2個目の n を吸収してそのまま単語完了（コンボ継続）
        this.totalKeystrokes++;
        this.correctKeystrokes++;
        this._finishWord();
        return;
      } else {
        // n 以外: 今の単語を完了させてから、その文字を次の単語に回す
        this._finishWord();
        // 次の単語に対してこの文字を再処理（再帰）
        this.handleKeyPress(key);
        return;
      }
    }

    let targetChar = this.currentWord.romaji[this.currentCharIndex].toLowerCase();

    this.totalKeystrokes++;

    if (inputChar !== targetChar) {
      if (this.applyFlexibleRomaji(inputChar)) {
        // Flexible romaji matched and modified this.currentWord.romaji
        // Re-evaluate targetChar
        targetChar = this.currentWord.romaji[this.currentCharIndex].toLowerCase();
      }
    }

    if (inputChar === targetChar) {
      // Correct!
      this.correctKeystrokes++;
      this.currentCharIndex++;
      this.typedString += inputChar;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      
      // Renda Meter Logic
      this.rendaCount++;
      let timeAdded = 0;
      if (this.rendaCount === 15) timeAdded = 1;
      else if (this.rendaCount === 30) timeAdded = 1;
      else if (this.rendaCount === 45) timeAdded = 2;
      else if (this.rendaCount >= 60) {
        timeAdded = 3;
        this.rendaCount = 0;
      }
      if (timeAdded > 0 && !this.isOnline) {
        this.timer += timeAdded;
        if (this.onTimeAdded) this.onTimeAdded(timeAdded);
        if (this.onTimerUpdate) this.onTimerUpdate(this.timer);
      }
      if (this.onRendaUpdate) this.onRendaUpdate(this.rendaCount);

      if (this.onComboUpdate) this.onComboUpdate(this.combo);
      if (this.onCorrectKey) this.onCorrectKey(this.typedString, this.currentWord.romaji.substring(this.currentCharIndex));

      if (this.currentCharIndex >= this.currentWord.romaji.length) {
        // Word complete — but if the word ends with 'n', buffer completion
        // to absorb an optional 2nd 'n' (nn input) without breaking combo.
        if (this.currentWord.romaji.endsWith('n')) {
          this._pendingComplete = true;
          // Don't call nextWord yet — wait for next keypress
        } else {
          this._finishWord();
        }
      }
    } else {
      // Miss!
      if (this.mode === 'sudden_death') {
        this.endGame();
        return;
      }

      if (this.mode === 'accuracy') {
        // Plate reset!
        this.missCount++;
        this.combo = 0;
        this.rendaCount = 0;
        if (this.onRendaUpdate) this.onRendaUpdate(this.rendaCount);
        if (this.onComboUpdate) this.onComboUpdate(this.combo);
        if (this.onMiss) this.onMiss(inputChar, targetChar);
        
        if (this.plateTimeout) clearTimeout(this.plateTimeout);
        if (this.onPlateFlowsAway) this.onPlateFlowsAway();
        this.nextWord();
        return;
      }

      // Normal miss
      this.missCount++;
      this.combo = 0;
      this.rendaCount = 0;
      if (this.onRendaUpdate) this.onRendaUpdate(this.rendaCount);
      if (this.onComboUpdate) this.onComboUpdate(this.combo);
      if (this.onMiss) this.onMiss(inputChar, targetChar);
      
      // Penalty: subtract 0.5s equivalent (or just let combo break be penalty)
    }
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.intervalId);
    if (this.plateTimeout) clearTimeout(this.plateTimeout);
  }

  endGame() {
    if (!this.isRunning) return;
    this.stop();
    if (this.onGameEnd) {
      this.onGameEnd(this.getResults());
    }
  }

  _finishWord() {
    if (!this.currentWord) return;
    if (this.plateTimeout) clearTimeout(this.plateTimeout);
    if (this.currentWord.isWagyu) {
      if (this.onWagyuComplete) this.onWagyuComplete(this.currentWord.id);
    }

    const multiplier = this.getComboMultiplier();
    const earned = Math.floor(this.currentWord.points * multiplier);
    this.score += earned;
    this.wordsCompleted++;

    if (this.onScoreUpdate) this.onScoreUpdate(this.score, earned);
    if (this.onWordComplete) this.onWordComplete(this.currentWord);

    // Update Tally
    if (this.platesTally[this.currentWord.points] !== undefined) {
      this.platesTally[this.currentWord.points]++;
    }
    if (this.onTallyUpdate) this.onTallyUpdate(this.platesTally);

    this.nextWord();
  }

  calculateWPM() {
    const timeElapsed = (this.timeLimit - this.timer) || 1; // avoid /0
    const minutes = timeElapsed / 60;
    return Math.round((this.correctKeystrokes / 5) / minutes) || 0; // standard WPM is chars/5
  }

  getResults() {
    return {
      difficulty: this.difficulty,
      mode: this.mode,
      score: this.score,
      cost: this.courseCost,
      profit: this.score - this.courseCost,
      wordsCompleted: this.wordsCompleted,
      wordsSpawned: this.wordsSpawned,
      accuracy: this.totalKeystrokes > 0 ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100) : 0,
      maxCombo: this.maxCombo,
      wpm: this.calculateWPM(),
      missCount: this.missCount,
      keystrokes: this.totalKeystrokes,
      platesTally: this.platesTally
    };
  }
}
