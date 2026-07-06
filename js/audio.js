'use strict';

// ============================================================
//  js/audio.js — Web Audio API sound engine + procedural music
// ============================================================

// Note frequencies (A4 = 440Hz)
const N = {
  A2:110,
  C3:131, D3:147, E3:165, F3:175, G3:196, A3:220, B3:247,
  C4:262, D4:294, E4:330, F4:349, G4:392, A4:440, B4:494,
  C5:523, D5:587, E5:659, G5:784, A5:880,
};

// Forest theme — calm pentatonic melody (C major) + bass
// dur units: 1=quarter, 2=half, 3=dotted-half, 4=whole
const FOREST_MELODY = [
  {f:N.E4,d:2},{f:N.G4,d:1},{f:N.A4,d:1},{f:N.G4,d:2},{f:N.E4,d:2},{f:N.D4,d:1},{f:N.C4,d:1},{f:N.D4,d:2},
  {f:N.E4,d:2},{f:N.G4,d:2},{f:N.A4,d:2},{f:N.G4,d:1},{f:N.E4,d:1},{f:N.D4,d:2},{f:N.C4,d:4},
  {f:N.G4,d:1},{f:N.A4,d:1},{f:N.C5,d:2},{f:N.A4,d:2},{f:N.G4,d:2},{f:N.E4,d:2},{f:N.D4,d:2},{f:N.C4,d:4},
  {f:N.D4,d:1},{f:N.E4,d:1},{f:N.G4,d:2},{f:N.E4,d:2},{f:N.D4,d:2},{f:N.C4,d:1},{f:N.D4,d:1},{f:N.E4,d:4},
  {f:N.C4,d:2},{f:N.D4,d:2},{f:N.E4,d:1},{f:N.G4,d:1},{f:N.A4,d:2},{f:N.G4,d:2},{f:N.E4,d:2},{f:N.C4,d:4},
  {f:N.G3,d:2},{f:N.C4,d:2},{f:N.E4,d:2},{f:N.D4,d:2},{f:N.C4,d:4},
  {f:N.E4,d:2},{f:N.D4,d:1},{f:N.C4,d:1},{f:N.A3,d:2},{f:N.C4,d:2},{f:N.E4,d:2},{f:N.D4,d:2},{f:N.C4,d:4},
];

const FOREST_BASS = [
  {f:N.C3,d:4},{f:N.G3,d:4},{f:N.C3,d:4},{f:N.G3,d:4},
  {f:N.F3,d:4},{f:N.C4,d:4},{f:N.G3,d:4},{f:N.C3,d:4},
  {f:N.A2,d:4},{f:N.C3,d:4},{f:N.G3,d:4},{f:N.C3,d:4},
  {f:N.F3,d:4},{f:N.C3,d:4},{f:N.G3,d:4},{f:N.C3,d:4},
];

// Battle theme — faster, minor-key (A minor), more intense
const BATTLE_MELODY = [
  {f:N.A4,d:1},{f:N.G4,d:1},{f:N.A4,d:1},{f:N.C5,d:1},{f:N.A4,d:2},{f:N.G4,d:1},{f:N.E4,d:1},{f:N.D4,d:2},
  {f:N.A4,d:1},{f:N.G4,d:1},{f:N.A4,d:2},{f:N.E4,d:1},{f:N.D4,d:1},{f:N.C4,d:2},{f:N.D4,d:1},{f:N.E4,d:2},
  {f:N.A4,d:1},{f:N.G4,d:1},{f:N.F4,d:1},{f:N.E4,d:1},{f:N.D4,d:2},{f:N.C4,d:2},{f:N.D4,d:1},{f:N.E4,d:1},
  {f:N.D4,d:1},{f:N.C4,d:1},{f:N.A3,d:2},{f:N.C4,d:2},{f:N.D4,d:2},{f:N.E4,d:2},
  {f:N.E4,d:1},{f:N.F4,d:1},{f:N.G4,d:2},{f:N.A4,d:1},{f:N.G4,d:1},{f:N.F4,d:2},{f:N.E4,d:2},{f:N.D4,d:2},
  {f:N.C5,d:1},{f:N.A4,d:1},{f:N.G4,d:2},{f:N.A4,d:1},{f:N.G4,d:1},{f:N.E4,d:4},
  {f:N.A4,d:1},{f:N.C5,d:1},{f:N.A4,d:1},{f:N.G4,d:1},{f:N.A4,d:2},{f:N.E4,d:2},{f:N.G4,d:2},{f:N.A4,d:2},
  {f:N.G4,d:1},{f:N.E4,d:1},{f:N.D4,d:1},{f:N.C4,d:1},{f:N.D4,d:2},{f:N.E4,d:2},{f:N.C4,d:4},
];

const BATTLE_BASS = [
  {f:N.A2,d:2},{f:N.E3,d:2},{f:N.A2,d:2},{f:N.E3,d:2},
  {f:N.D3,d:2},{f:N.A2,d:2},{f:N.E3,d:2},{f:N.A2,d:2},
  {f:N.F3,d:2},{f:N.C3,d:2},{f:N.G3,d:2},{f:N.D3,d:2},
  {f:N.A2,d:2},{f:N.E3,d:2},{f:N.A2,d:2},{f:N.E3,d:2},
];

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._musicTimeouts = [];
    this._musicActive = false;
    this._currentMusic = null;
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

  // ---- SFX ----
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

  // ---- Music ----
  playMusic(type) {
    if (!this.enabled || !this.ctx) return;
    if (this._currentMusic === type) return;
    this.resume();
    this.stopMusic();
    this._musicActive = true;
    this._currentMusic = type;
    console.log('[Bantso:audio] Starting music:', type);

    switch(type) {
      case 'forest':
        this._startMelody(FOREST_MELODY, 110, 'triangle', 0.06);
        this._startMelody(FOREST_BASS, 110, 'sine', 0.05);
        break;
      case 'battle':
        this._startMelody(BATTLE_MELODY, 155, 'square', 0.07);
        this._startMelody(BATTLE_BASS, 155, 'sawtooth', 0.04);
        break;
    }
  }

  stopMusic() {
    this._musicActive = false;
    this._currentMusic = null;
    this._musicTimeouts.forEach(clearTimeout);
    this._musicTimeouts = [];
    console.log('[Bantso:audio] Music stopped');
  }

  _startMelody(notes, bpm, voiceType, volume) {
    const beatMs = 60000 / bpm;
    const playStep = (idx) => {
      if (!this._musicActive) return;
      const note = notes[idx % notes.length];
      if (!note || !isFinite(note.f) || !isFinite(note.d)) {
        console.warn('[Bantso:audio] Bad note at index', idx, note);
        return;
      }
      const durSec = note.d * beatMs / 1000;
      this._tone(note.f, durSec * 0.85, voiceType, volume);
      const tid = setTimeout(() => playStep(idx + 1), durSec * 1000);
      this._musicTimeouts.push(tid);
    };
    playStep(0);
  }

  // ---- Tone generators ----
  _tone(freq, duration, type='square', volume=0.15, startTime=0) {
    if (!this.ctx) return;
    if (!isFinite(freq) || !isFinite(duration) || !isFinite(volume) || !isFinite(startTime)) {
      console.warn('[Bantso:audio] _tone skipped — non-finite param', {freq, duration, volume, startTime});
      return;
    }
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
    if (!this.ctx) return;
    if (!isFinite(duration) || !isFinite(volume) || !isFinite(startTime)) return;
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
