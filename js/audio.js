'use strict';

// ============================================================
//  js/audio.js — Web Audio API sound engine
// ============================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[Bantso:audio] AudioContext created, state:', this.ctx.state);
    } catch(e) {
      this.enabled = false;
      console.warn('[Bantso:audio] AudioContext not available:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(type) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    switch(type) {
      case 'encounter': this._encounter(); break;
      case 'attack': this._attack(); break;
      case 'victory': this._victory(); break;
      case 'catchFail': this._catchFail(); break;
      case 'catchSuccess': this._catchSuccess(); break;
      case 'click': this._click(); break;
      case 'levelUp': this._levelUp(); break;
      case 'arenaWin': this._arenaWin(); break;
    }
  }

  _tone(freq, duration, type='square', volume=0.15, startTime=0) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  _noise(duration, volume=0.1, startTime=0) {
    const bufSize = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(this.ctx.currentTime + startTime);
  }

  _encounter() {
    this._tone(200, 0.15, 'sawtooth', 0.12, 0);
    this._tone(300, 0.15, 'sawtooth', 0.12, 0.1);
    this._tone(450, 0.25, 'sawtooth', 0.15, 0.2);
  }

  _attack() {
    this._noise(0.1, 0.12, 0);
    this._tone(150, 0.08, 'square', 0.08, 0.02);
  }

  _victory() {
    this._tone(523, 0.15, 'square', 0.12, 0);
    this._tone(659, 0.15, 'square', 0.12, 0.1);
    this._tone(784, 0.15, 'square', 0.12, 0.2);
    this._tone(1047, 0.3, 'square', 0.15, 0.3);
  }

  _arenaWin() {
    this._tone(440, 0.15, 'square', 0.1, 0);
    this._tone(554, 0.12, 'square', 0.1, 0.12);
    this._tone(659, 0.12, 'square', 0.1, 0.24);
    this._tone(880, 0.12, 'square', 0.1, 0.36);
    this._tone(1047, 0.3, 'square', 0.12, 0.48);
  }

  _catchFail() {
    this._tone(300, 0.15, 'triangle', 0.1, 0);
    this._tone(200, 0.2, 'triangle', 0.1, 0.2);
  }

  _catchSuccess() {
    this._tone(600, 0.1, 'square', 0.1, 0);
    this._tone(800, 0.1, 'square', 0.08, 0.08);
    this._tone(1000, 0.2, 'square', 0.12, 0.15);
  }

  _click() {
    this._tone(800, 0.05, 'square', 0.06, 0);
  }

  _levelUp() {
    this._tone(400, 0.12, 'square', 0.1, 0);
    this._tone(600, 0.12, 'square', 0.1, 0.08);
    this._tone(800, 0.12, 'square', 0.1, 0.16);
    this._tone(1000, 0.25, 'square', 0.12, 0.24);
  }
}
