'use strict';

// ============================================================
//  js/menu.js — Menu dropdown, restart, new game
// ============================================================

function toggleMenu() {
  const dropdown = $('#menu-dropdown');
  const isOpen = dropdown.classList.toggle('active');
  $('#menu-btn').setAttribute('aria-expanded', isOpen);
  console.log('[Bantso:menu] Toggle menu | now:', dropdown.classList.contains('active') ? 'open' : 'closed');
  Game.audio.play('click');
}

function closeMenu() {
  $('#menu-dropdown').classList.remove('active');
  $('#menu-btn').setAttribute('aria-expanded', 'false');
}

function setupManual() {
  const dialog = $('#manual-dialog');
  const tabList = dialog.querySelector('.manual-tabs');
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];

  function selectTab(activeTab) {
    for (const tab of tabs) {
      const selected = tab === activeTab;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    }
  }

  $('#menu-manual').addEventListener('click', () => {
    closeMenu();
    dialog.showModal();
  });
  dialog.addEventListener('close', () => $('#menu-btn').focus());

  tabList.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) selectTab(tab);
  });
  tabList.addEventListener('keydown', event => {
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    const targets = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    const tab = tabs[targets[event.key]];
    selectTab(tab);
    tab.focus();
  });
}

function showConfirm(title, msg, onYes) {
  console.log('[Bantso:menu] Confirm dialog:', title);
  $('#confirm-title').textContent = title;
  $('#confirm-msg').textContent = msg;
  $('#confirm-modal').style.display = 'flex';
  $('#confirm-yes').onclick = () => {
    console.log('[Bantso:menu] User confirmed:', title);
    $('#confirm-modal').style.display = 'none';
    onYes();
  };
  $('#confirm-no').onclick = () => {
    console.log('[Bantso:menu] User cancelled:', title);
    $('#confirm-modal').style.display = 'none';
  };
}

async function doRestart() {
  if (Game.busy && Game.screen === 'forest') return;
  closeMenu();
  Game.audio.play('click');
  console.log('[Bantso:menu] === RESTARTING GAME ===');
  Game.pendingEvolution = null;
  Game.stones = {};
  Game.caughtCount = 1;
  Game.caughtSpecies = ['pikachu'];
  Game.level = 1;
  Game.leagueUnlocked = false;
  Game.leagueWins = 0;
  Game.battle = null;
  Game.leagueBattle = null;
  Game.busy = false;
  Game.scrollOffset = 0;

  const starter = Game.collection.find(p => (p.baseSpeciesId || p.speciesId) === 'pikachu');
  if (starter) {
    Game.collection = [starter];
    starter.speciesId = 'pikachu';
    starter.baseSpeciesId = 'pikachu';
    starter.name = 'Pikachu';
    starter.currentHp = getSpecies('pikachu').baseHp;
    starter.hardCooldown = 0;
    starter.fightsSinceRest = 0;
    Game.activePokemonId = starter.id;
  } else {
    const newStarter = {
      id: 'pikachu_01',
      speciesId: 'pikachu',
      baseSpeciesId: 'pikachu',
      name: 'Pikachu',
      currentHp: getSpecies('pikachu').baseHp,
      hardCooldown: 0,
      fightsSinceRest: 0,
    };
    Game.collection = [newStarter];
    Game.activePokemonId = newStarter.id;
  }

  if (Game.db) await dbClear(Game.db, 'collection');
  await saveGame();
  healAllPokemon();
  await saveGame();

  showScreen('forest');
  renderForestScreen();
  updateProgressBar();
  console.log('[Bantso:menu] Restart complete');
}

async function doNewGame(hardMode = false) {
  if (Game.busy && Game.screen === 'forest') return;
  closeMenu();
  Game.audio.play('click');
  console.log('[Bantso:menu] === NEW GAME (full wipe) ===');
  await clearAllData();

  Game.pendingEvolution = null;
  Game.stones = {};
  Game.caughtCount = 1;
  Game.caughtSpecies = ['pikachu'];
  Game.level = 1;
  Game.leagueUnlocked = false;
  Game.leagueWins = 0;
  Game.battle = null;
  Game.leagueBattle = null;
  Game.busy = false;
  Game.scrollOffset = 0;
  Game.hardMode = hardMode;
  Game.collection = [{
    id: 'pikachu_01',
    speciesId: 'pikachu',
    baseSpeciesId: 'pikachu',
    name: 'Pikachu',
    currentHp: getSpecies('pikachu').baseHp,
    hardCooldown: 0,
    fightsSinceRest: 0,
  }];
  Game.activePokemonId = 'pikachu_01';

  healAllPokemon();
  await saveGame();

  showScreen('forest');
  renderForestScreen();
  updateProgressBar();
  console.log('[Bantso:menu] New game complete');
}
