'use strict';

// ============================================================
//  js/effects.js — Visual effects, animations, particles
// ============================================================

function flashScreen(duration = 250) {
  const el = $('#flash');
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), duration);
}

function showCheckmark(duration = 1200) {
  const el = $('#checkmark');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function showCrossMark(duration = 800) {
  const el = $('#cross-mark');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function showSlash(duration = 300) {
  const el = $('#slash-effect');
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), duration);
}

function spawnConfetti(count = 50) {
  const layer = $('#effects-layer');
  const colors = ['#FF0000','#FFD700','#00FF00','#0088FF','#FF8800','#FF00FF','#00FFFF','#FF4488'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.top = -(Math.random() * 30 + 5) + 'px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (Math.random() * 1.5 + 1) + 's';
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.width = (Math.random() * 8 + 6) + 'px';
    piece.style.height = (Math.random() * 8 + 6) + 'px';
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 2500);
  }
}

function spawnHealSparkles(element) {
  const rect = element.getBoundingClientRect();
  const gameRect = $('#game').getBoundingClientRect();
  const cx = rect.left + rect.width/2 - gameRect.left;
  const cy = rect.top + rect.height/2 - gameRect.top;
  const symbols = ['✨','💚','⭐','💛'];
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('div');
    s.className = 'heal-sparkle';
    s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    s.style.left = (cx + (Math.random() - 0.5) * 80) + 'px';
    s.style.top = (cy + (Math.random() - 0.5) * 60) + 'px';
    s.style.animationDelay = Math.random() * 0.3 + 's';
    $('#game').appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}

function shakeSprite(selector) {
  const el = $(selector);
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

function showCatchAnimation(success) {
  const ball = $('#pokeball-anim');
  ball.classList.add('show');

  if (success) {
    setTimeout(() => { ball.classList.add('shake1'); }, 300);
    setTimeout(() => { ball.classList.remove('shake1'); ball.classList.add('shake2'); }, 600);
    setTimeout(() => { ball.classList.remove('shake2'); ball.classList.add('shake3'); }, 900);
    setTimeout(() => { ball.classList.remove('shake3', 'show'); }, 1200);
    setTimeout(() => {
      const cs = $('#catch-success');
      cs.textContent = '✅';
      cs.classList.add('show');
      Game.audio.play('catchSuccess');
      spawnConfetti(40);
      setTimeout(() => cs.classList.remove('show'), 1500);
    }, 1300);
  } else {
    setTimeout(() => { ball.classList.add('shake1'); }, 300);
    setTimeout(() => { ball.classList.remove('shake1'); ball.classList.add('shake2'); }, 600);
    setTimeout(() => {
      ball.classList.remove('shake2', 'show');
      Game.audio.play('catchFail');
      showCrossMark(800);
    }, 900);
  }
}

function stepDust() {
  const area = $('#game-area');
  const dust = document.createElement('div');
  dust.className = 'step-dust';
  dust.textContent = '💨';
  area.appendChild(dust);
  setTimeout(() => dust.remove(), 700);
}

// ============================================================
//  Sprite rendering helpers
// ============================================================
function setSpriteImage(imgId, emojiId, speciesId) {
  const imgEl = $(`#${imgId}`);
  const emojiEl = $(`#${emojiId}`);
  const species = getSpecies(speciesId);
  const url = getSpriteUrl(speciesId);

  if (emojiEl) {
    emojiEl.textContent = species.emoji;
    emojiEl.classList.add('show');
  }
  if (imgEl) {
    imgEl.style.display = 'none';
    imgEl.src = url;
  }
}
