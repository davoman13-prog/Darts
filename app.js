const boardOrder = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

const state = {
  startScore: 501,
  activePlayer: 0,
  multiplier: 1,
  players: [createPlayer(501), createPlayer(501)],
  history: []
};

function createPlayer(startScore = 501) {
  return {
    score: startScore,
    darts: 0,
    pointsScored: 0
  };
}

const ui = {
  startScore: document.getElementById('startScore'),
  newGameBtn: document.getElementById('newGameBtn'),
  activePlayerLabel: document.getElementById('activePlayerLabel'),
  historyList: document.getElementById('historyList'),
  message: document.getElementById('message')
};

function setupBoardButtons() {
  const ring = document.getElementById('numberRing');
  boardOrder.forEach((number, idx) => {
    const angle = ((idx / boardOrder.length) * 2 * Math.PI) - Math.PI / 2;
    const radius = 45;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    const btn = document.createElement('button');
    btn.className = 'wedge-btn';
    btn.textContent = String(number);
    btn.style.left = `${x}%`;
    btn.style.top = `${y}%`;
    btn.addEventListener('click', () => registerDart(number * state.multiplier, number, state.multiplier));
    ring.appendChild(btn);
  });

  document.querySelectorAll('[data-special]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = Number(btn.dataset.special);
      const isDouble = value === 50;
      registerDart(value, value, isDouble ? 2 : 1, true);
    });
  });
}

function setMessage(text, isError = false) {
  ui.message.textContent = text;
  ui.message.classList.toggle('error', isError);
}

function registerDart(value, segment, multiplier, isBull = false) {
  const player = state.players[state.activePlayer];
  const proposed = player.score - value;
  const isDoubleFinish = multiplier === 2 || (isBull && value === 50);

  if (proposed < 0 || proposed === 1) {
    setMessage('Bust: score unchanged.', true);
    return;
  }

  if (proposed === 0 && !isDoubleFinish) {
    setMessage('Checkout requires a double.', true);
    return;
  }

  player.score = proposed;
  player.darts += 1;
  player.pointsScored += value;

  state.history.unshift({
    playerIndex: state.activePlayer,
    value,
    segment,
    multiplier,
    isBull
  });

  if (state.history.length > 30) {
    state.history.pop();
  }

  if (player.score === 0) {
    setMessage(`Player ${state.activePlayer + 1} wins! Start a new game to play again.`);
  } else {
    setMessage(`Player ${state.activePlayer + 1} scored ${describeHit(segment, multiplier, isBull)}.`);
  }

  render();
}

function describeHit(segment, multiplier, isBull) {
  if (isBull && segment === 25) return 'Outer Bull (25)';
  if (isBull && segment === 50) return 'Bullseye (50)';
  const prefix = multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S';
  return `${prefix}${segment}`;
}

function undoLastDart() {
  const last = state.history.shift();
  if (!last) {
    setMessage('No darts to undo.', true);
    return;
  }

  const player = state.players[last.playerIndex];
  player.score += last.value;
  player.darts = Math.max(0, player.darts - 1);
  player.pointsScored = Math.max(0, player.pointsScored - last.value);

  setMessage(`Undid Player ${last.playerIndex + 1} ${describeHit(last.segment, last.multiplier, last.isBull)}.`);
  render();
}

function computeAverage(player) {
  if (!player.darts) return '0.00';
  return ((player.pointsScored / player.darts) * 3).toFixed(2);
}

function getCheckoutSuggestion(score) {
  if (score <= 1 || score > 170) return '-';

  const singles = Array.from({ length: 20 }, (_, i) => ({ label: `S${i + 1}`, score: i + 1 }));
  const doubles = Array.from({ length: 20 }, (_, i) => ({ label: `D${i + 1}`, score: (i + 1) * 2, isDouble: true }));
  const trebles = Array.from({ length: 20 }, (_, i) => ({ label: `T${i + 1}`, score: (i + 1) * 3 }));
  const bulls = [{ label: 'SB', score: 25 }, { label: 'DB', score: 50, isDouble: true }];

  const throws = [...singles, ...doubles, ...trebles, ...bulls];
  const doublesOnly = [...doubles, bulls[1]];

  for (const d of doublesOnly) {
    if (d.score === score) return d.label;
  }

  for (const first of throws) {
    for (const last of doublesOnly) {
      if (first.score + last.score === score) {
        return `${first.label} ${last.label}`;
      }
    }
  }

  for (const first of throws) {
    for (const second of throws) {
      for (const last of doublesOnly) {
        if (first.score + second.score + last.score === score) {
          return `${first.label} ${second.label} ${last.label}`;
        }
      }
    }
  }

  return '-';
}

function startNewGame() {
  const parsed = Number(ui.startScore.value);
  if (!Number.isInteger(parsed) || parsed < 2) {
    setMessage('Please enter a valid starting score (2 or higher).', true);
    return;
  }

  state.startScore = parsed;
  state.players = [
    { score: parsed, darts: 0, pointsScored: 0 },
    { score: parsed, darts: 0, pointsScored: 0 }
  ];
  state.history = [];
  state.activePlayer = 0;

  setMessage(`New game started at ${parsed}.`);
  render();
}

function render() {
  state.players.forEach((player, idx) => {
    document.getElementById(`player${idx + 1}Score`).textContent = player.score;
    document.getElementById(`player${idx + 1}Darts`).textContent = String(player.darts);
    document.getElementById(`player${idx + 1}Average`).textContent = computeAverage(player);
    document.getElementById(`player${idx + 1}Checkout`).textContent = getCheckoutSuggestion(player.score);

    const activeBtn = document.querySelector(`.active-btn[data-player='${idx}']`);
    activeBtn.classList.toggle('active', state.activePlayer === idx);

    document.getElementById(`player${idx + 1}Card`).classList.toggle('active-card', state.activePlayer === idx);
  });

  ui.activePlayerLabel.textContent = `Active player: Player ${state.activePlayer + 1}`;

  ui.historyList.innerHTML = '';
  if (!state.history.length) {
    const li = document.createElement('li');
    li.textContent = 'No darts recorded yet.';
    ui.historyList.appendChild(li);
  } else {
    state.history.slice(0, 10).forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = `P${entry.playerIndex + 1}: ${describeHit(entry.segment, entry.multiplier, entry.isBull)} (${entry.value})`;
      ui.historyList.appendChild(li);
    });
  }
}

function wireEvents() {
  document.querySelectorAll('.multiplier').forEach((button) => {
    button.addEventListener('click', () => {
      state.multiplier = Number(button.dataset.multiplier);
      document.querySelectorAll('.multiplier').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });

  document.querySelectorAll('.active-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.activePlayer = Number(button.dataset.player);
      render();
    });
  });

  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      ui.startScore.value = button.dataset.preset;
    });
  });

  ui.newGameBtn.addEventListener('click', startNewGame);
  document.getElementById('undoBtn').addEventListener('click', undoLastDart);
}

setupBoardButtons();
wireEvents();
startNewGame();

