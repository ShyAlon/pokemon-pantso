'use strict';

// Recognizable, stylized star patterns rather than a seasonal sky simulation.
// Reference charts: https://iauarchive.eso.org/public/themes/constellations/
// The Big Dipper is an asterism within Ursa Major.
const CONSTELLATION_SKIES = {
  north: {
    name: 'Northern sky',
    patterns: [
      { id: 'big-dipper', name: 'Big Dipper (Ursa Major)', position: 'left',
        stars: [[20,52],[61,34],[104,43],[143,73],[204,61],[193,112],[151,118]],
        paths: [[0,1,2,3,4,5,6,3]] },
      { id: 'cassiopeia', name: 'Cassiopeia', position: 'right',
        stars: [[22,44],[65,106],[113,61],[159,111],[199,31]],
        paths: [[0,1,2,3,4]] },
      { id: 'cygnus', name: 'Cygnus',
        stars: [[114,18],[110,77],[105,143],[42,57],[176,96],[190,108]],
        paths: [[0,1,2],[3,1,4,5]] },
      { id: 'lyra', name: 'Lyra',
        stars: [[57,21],[99,53],[151,64],[126,131],[73,118]],
        paths: [[0,1,2,3,4,1]] },
      { id: 'cepheus', name: 'Cepheus',
        stars: [[107,18],[172,74],[150,139],[58,128],[39,66]],
        paths: [[0,1,2,3,4,0]] },
      { id: 'corona-borealis', name: 'Corona Borealis',
        stars: [[24,44],[43,90],[80,117],[121,127],[160,109],[190,75],[204,39]],
        paths: [[0,1,2,3,4,5,6]] },
    ],
  },
  south: {
    name: 'Southern sky',
    patterns: [
      { id: 'crux', name: 'Southern Cross (Crux)', position: 'left',
        stars: [[117,20],[109,144],[57,67],[160,59],[85,101]],
        paths: [[0,1],[2,3]] },
      { id: 'triangulum-australe', name: 'Southern Triangle (Triangulum Australe)', position: 'right',
        stars: [[34,31],[191,54],[117,141]],
        paths: [[0,1,2,0]] },
      { id: 'scorpius', name: 'Scorpius',
        stars: [[28,19],[52,33],[39,54],[64,67],[85,89],[93,119],[116,145],[153,144],[181,119],[177,94],[156,91]],
        paths: [[0,1,3,4,5,6,7,8,9,10],[2,3]] },
      { id: 'vela', name: 'Vela',
        stars: [[30,47],[107,25],[191,62],[152,139],[62,121]],
        paths: [[0,1,2,3,4,0]] },
      { id: 'carina', name: 'Carina',
        stars: [[17,31],[61,77],[98,59],[137,103],[172,77],[205,123],[156,143],[104,118]],
        paths: [[0,1,2,3,4,5,6,7,1]] },
      { id: 'pavo', name: 'Pavo',
        stars: [[29,30],[86,57],[154,45],[191,91],[149,133],[85,119]],
        paths: [[0,1,2,3,4,5,1]] },
    ],
  },
};

const STAR_COLORS = ['#e9f1ff', '#b6d5ff', '#ffe8b4', '#ffd0ad', '#fff9ef'];

function starAppearance(index) {
  return `--star-color:${STAR_COLORS[index % STAR_COLORS.length]};--twinkle-duration:${3.5 + index % 5}s;--twinkle-delay:-${(index * 1.7) % 9}s`;
}

function renderConstellations(hemisphere) {
  const stars = $('#night-stars');
  if (stars.dataset.hemisphere === hemisphere) return;
  const sky = CONSTELLATION_SKIES[hemisphere];
  stars.dataset.hemisphere = hemisphere;
  // A stable seed keeps every background star in place when the clock updates.
  const scatter = (index, salt) => {
    const value = Math.sin((index + 1) * salt + (hemisphere === 'south' ? 17 : 0)) * 43758.5453;
    return value - Math.floor(value);
  };
  const background = Array.from({ length: 180 }, (_, i) => {
    const size = i % 11 === 0 ? 2 : 1;
    return `<i class="ambient-star${i % 7 === 0 ? ' twinkle' : ''}" style="left:${scatter(i, 12.9898) * 100}%;top:${scatter(i, 78.233) * 100}%;width:${size}px;height:${size}px;--star-opacity:${0.2 + scatter(i, 39.425) * 0.5};${starAppearance(i)}"></i>`;
  }).join('');
  stars.innerHTML = background + sky.patterns.map((pattern, slot) => {
    const lines = pattern.paths.map(path => `<polyline points="${path.map(index => pattern.stars[index].join(',')).join(' ')}"/>`).join('');
    const points = pattern.stars.map(([x, y], index) => `<circle class="sky-star${(index + slot) % 4 === 0 ? ' twinkle' : ''}" style="${starAppearance(index + slot * 7)}" cx="${x}" cy="${y}" r="${index === 0 ? 3.8 : 2.8}"/>`).join('');
    return `<svg class="sky-constellation" style="left:${3 + (slot % 3) * 33}%;top:${30 + Math.floor(slot / 3) * 34}%" data-constellation="${pattern.id}" viewBox="0 0 225 165" xmlns="http://www.w3.org/2000/svg"><title>${pattern.name}</title><g class="constellation-lines">${lines}</g>${points}</svg>`;
  }).join('');
}

const MINUTES_PER_DAY = 1440;
const NOON = 720;
let clockAnchor = performance.now();
let clockTimer = null;
let clockSaveTimer = null;

// Use elapsed time, rather than timer ticks, so background throttling cannot slow time.
function getGameMinutes() {
  return (Game.gameMinutes + (performance.now() - clockAnchor) / 1000) % MINUTES_PER_DAY;
}

function resetGameClock(minutes = NOON) {
  Game.gameMinutes = Number.isFinite(minutes) && minutes >= 0 ? minutes % MINUTES_PER_DAY : NOON;
  clockAnchor = performance.now();
  renderGameTime();
}

function mixSkyColors(from, to, amount) {
  const rgb = color => color.startsWith('#')
    ? color.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16))
    : color.match(/\d+/g).map(Number);
  const a = rgb(from), b = rgb(to);
  return `rgb(${a.map((value, i) => Math.round(value + (b[i] - value) * amount)).join(', ')})`;
}

function renderGameTime() {
  const screen = $('#forest-screen');
  if (!screen) return;
  const minutes = getGameMinutes();
  const day = minutes >= 360 && minutes < 1080;
  const progress = day ? (minutes - 360) / 720 : ((minutes + 360) % MINUTES_PER_DAY) / 720;
  // Dawn and dusk blend into each region's own daytime palette.
  const daylight = Math.max(0, Math.min(1, (minutes - 300) / 120, (1140 - minutes) / 120));
  const twilight = Math.max(0, 1 - Math.min(Math.abs(minutes - 360), Math.abs(minutes - 1080)) / 90);
  const region = currentRegion();
  renderConstellations(region.hemisphere);
  screen.style.setProperty('--time-sky', mixSkyColors('#0a1235', region.sky, daylight));
  screen.style.setProperty('--time-horizon', mixSkyColors(mixSkyColors('#232950', region.horizon, daylight), '#e6a083', twilight * 0.65));
  screen.style.setProperty('--time-ground', mixSkyColors('#142b32', region.ground, daylight));
  screen.style.setProperty('--time-grass', mixSkyColors('#243d43', region.grass, daylight));
  screen.style.setProperty('--terrain-light', 0.65 + daylight * 0.35);
  screen.style.setProperty('--stars-opacity', 1 - daylight);
  screen.dataset.timeOfDay = day ? 'day' : 'night';
  const body = $('#sky-body');
  body.className = day ? 'sun' : 'moon';
  // Parametric half ellipse: rise from the horizon, crest at noon/midnight, set.
  const angle = Math.PI * progress;
  body.style.left = `${50 - Math.cos(angle) * 42}%`;
  body.style.top = `${92 - Math.sin(angle) * 64}%`;
  body.setAttribute('aria-label', day ? 'Sun' : 'Moon');
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(Math.floor(minutes % 60)).padStart(2, '0');
  const label = `${day ? '☀' : '☾'} ${hour}:${minute}`;
  const clock = $('#game-clock');
  if (clock.textContent !== label) {
    clock.textContent = label;
    clock.setAttribute('aria-label', `Game time ${hour}:${minute}, ${day ? 'day' : 'night'}`);
  }
}

function startGameClock() {
  clearInterval(clockTimer);
  clearInterval(clockSaveTimer);
  renderGameTime();
  clockTimer = setInterval(renderGameTime, 100);
  clockSaveTimer = setInterval(() => saveGame().catch(error => console.warn('[Bantso:time] Clock save failed', error)), 15000);
}

// Save when leaving the game as well as during normal gameplay.
window.addEventListener('pagehide', () => { saveGame().catch(() => {}); });
document.addEventListener('visibilitychange', () => {
  renderGameTime();
  if (document.hidden) saveGame().catch(() => {});
});
