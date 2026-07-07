class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initAudioOnFirstInteraction = this.initAudioOnFirstInteraction.bind(this);
    document.addEventListener('click', this.initAudioOnFirstInteraction, { once: true });
    document.addEventListener('keydown', this.initAudioOnFirstInteraction, { once: true });
  }

  initAudioOnFirstInteraction() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    const btn = document.getElementById('sound-toggle');
    if (btn) {
      if (this.enabled) {
        btn.classList.remove('muted');
        btn.textContent = '🔊';
      } else {
        btn.classList.add('muted');
        btn.textContent = '🔇';
      }
    }
    return this.enabled;
  }

  _playOscillator(type, frequency, duration, volume = 0.1) {
    if (!this.enabled || !this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playType() {
    // Short, percussive pop for typing
    this._playOscillator('sine', 800, 0.05, 0.05);
  }

  playCorrect() {
    // Chime for completing a word
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.1, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  }

  playMiss() {
    // Low, dull buzz for missing
    this._playOscillator('sawtooth', 150, 0.2, 0.1);
  }

  playCombo(combo) {
    // Pitch goes up slightly as combo increases
    const baseFreq = 440; // A4
    const freq = baseFreq + (Math.min(combo, 50) * 10);
    this._playOscillator('sine', freq, 0.1, 0.1);
  }

  playCountdown() {
    this._playOscillator('square', 600, 0.1, 0.1);
  }

  playStart() {
    this._playOscillator('square', 1200, 0.3, 0.15);
  }

  playResult() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + (i * 0.15));
      gain.gain.setValueAtTime(0.1, now + (i * 0.15));
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.15) + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + (i * 0.15));
      osc.stop(now + (i * 0.15) + 0.5);
    });
  }
}

const soundManager = new SoundManager();
