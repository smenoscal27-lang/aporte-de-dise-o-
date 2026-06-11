const GAME_LIBRARY = {
  wordsearch: {
    title: 'Sopa de letras',
    kicker: 'Palabras ocultas',
    copy: 'Haz clic en letras consecutivas para formar la palabra correcta.',
    words: ['ENERGÍA', 'BIOLOGÍA', 'QUÍMICA', 'MATEMÁTICA'],
    board: [
      ['E','N','E','R','G','I','A','R'],
      ['Q','U','I','M','I','C','A','L'],
      ['B','I','O','L','O','G','I','A'],
      ['M','A','T','E','M','A','T','I'],
      ['C','A','L','O','R','I','A','S'],
      ['T','R','A','B','A','J','O','N'],
      ['A','P','R','E','N','D','E','R'],
      ['S','C','I','E','N','C','I','A'],
    ],
    found: [],
    selected: []
  },
  crossword: {
    title: 'Crucigrama',
    kicker: 'Pistas académicas',
    copy: 'Completa las respuestas para desbloquear cada pista del tablero.',
    clues: [
      { clue: 'Proceso de transformación de energía en movimiento.', answer: 'MECANICA' },
      { clue: 'Elemento que se combina con oxígeno en la combustión.', answer: 'COMBUSTIBLE' },
      { clue: 'La célula más pequeña de la vida.', answer: 'CELULA' },
    ],
    answers: {}
  },
  memory: {
    title: 'Memoria de conceptos',
    kicker: 'Parejas visuales',
    copy: 'Encuentra las parejas correctas de ciencia, matemáticas y lenguaje.',
    cards: [
      { id: 1, emoji: '🧪', label: 'Reacción' },
      { id: 2, emoji: '📐', label: 'Ángulo' },
      { id: 3, emoji: '📚', label: 'Texto' },
      { id: 4, emoji: '🧪', label: 'Reacción' },
      { id: 5, emoji: '📐', label: 'Ángulo' },
      { id: 6, emoji: '📚', label: 'Texto' }
    ],
    flipped: [],
    matched: []
  }
};

let ACTIVE_GAME = null;
let SOUND_CTX = null;

function ensureAudio() {
  if (!SOUND_CTX) SOUND_CTX = new (window.AudioContext || window.webkitAudioContext)();
  if (SOUND_CTX.state === 'suspended') SOUND_CTX.resume();
}

function playTone(freq, duration = 0.08, type = 'sine', volume = 0.03) {
  try {
    ensureAudio();
    const osc = SOUND_CTX.createOscillator();
    const gain = SOUND_CTX.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(SOUND_CTX.destination);
    osc.start();
    setTimeout(() => { gain.gain.exponentialRampToValueAtTime(0.0001, SOUND_CTX.currentTime + duration); osc.stop(SOUND_CTX.currentTime + duration); }, 0);
  } catch (e) {}
}

function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ÁÀÄÂÃ]/g, 'A')
    .replace(/[ÉÈËÊ]/g, 'E')
    .replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[ÓÒÖÔÕ]/g, 'O')
    .replace(/[ÚÙÜÛ]/g, 'U')
    .replace(/[ÝŸ]/g, 'Y')
    .toUpperCase();
}

function isAdjacent(a, b) {
  const [ya, xa] = a.split('-').map(Number);
  const [yb, xb] = b.split('-').map(Number);
  return Math.max(Math.abs(ya - yb), Math.abs(xa - xb)) === 1;
}

function showFeedback(message, tone = 'info') {
  const box = document.getElementById('game-feedback');
  box.className = `feedback ${tone === 'info' ? '' : tone}`;
  box.textContent = message;
}

function resetGame() {
  if (!ACTIVE_GAME) {
    showFeedback('Primero elige un juego para reiniciarlo.', 'info');
    renderGame();
    return;
  }

  const current = GAME_LIBRARY[ACTIVE_GAME];
  if (ACTIVE_GAME === 'wordsearch') {
    current.found = [];
    current.selected = [];
    showFeedback('Selecciona letras para encontrar las palabras ocultas.', 'info');
  }
  if (ACTIVE_GAME === 'crossword') {
    current.answers = {};
    showFeedback('Completa las pistas para avanzar en el crucigrama.', 'info');
  }
  if (ACTIVE_GAME === 'memory') {
    current.flipped = [];
    current.matched = [];
    current.cards = [...current.cards].sort(() => Math.random() - 0.5);
    showFeedback('Encuentra las 3 parejas en el menor tiempo posible.', 'info');
  }
  renderGame();
}

function setActiveGame(key) {
  ACTIVE_GAME = key;
  renderSelector();
  renderGame();
}

function renderSelector() {
  const container = document.getElementById('game-selector');
  container.innerHTML = Object.entries(GAME_LIBRARY).map(([key, game]) => `
    <button class="game-option ${ACTIVE_GAME === key ? 'active' : ''}" type="button" data-game="${key}">
      <span class="game-option-icon">${key === 'wordsearch' ? '🔎' : key === 'crossword' ? '🧩' : '🧠'}</span>
      <span>
        <strong>${game.title}</strong>
        <small>${game.kicker}</small>
      </span>
    </button>
  `).join('');

  container.querySelectorAll('[data-game]').forEach(btn => {
    btn.addEventListener('click', () => {
      playTone(660, 0.04, 'square');
      setActiveGame(btn.dataset.game);
    });
  });
}

function renderGame() {
  const board = document.getElementById('active-game');

  if (!ACTIVE_GAME) {
    document.getElementById('stage-kicker').textContent = 'Elige un modo';
    document.getElementById('stage-title').textContent = 'Juegos educativos';
    document.getElementById('stage-copy').textContent = 'Selecciona uno de los juegos para comenzar. Cada opción está organizada para que elijas con claridad.';
    board.innerHTML = `
      <div class="empty-state-card">
        <h3>Elige tu juego</h3>
        <p>Haz clic en una tarjeta para abrir ese modo y empezar a jugar.</p>
        <div class="choice-grid">${Object.entries(GAME_LIBRARY).map(([key, game]) => `
          <button class="choice-card" type="button" data-quick-game="${key}">
            <span class="choice-icon">${key === 'wordsearch' ? '🔎' : key === 'crossword' ? '🧩' : '🧠'}</span>
            <strong>${game.title}</strong>
            <small>${game.kicker}</small>
          </button>
        `).join('')}</div>
      </div>
    `;
    board.querySelectorAll('[data-quick-game]').forEach(btn => {
      btn.addEventListener('click', () => setActiveGame(btn.dataset.quickGame));
    });
    showFeedback('Selecciona un juego para empezar.', 'info');
    return;
  }

  const game = GAME_LIBRARY[ACTIVE_GAME];
  document.getElementById('stage-kicker').textContent = game.kicker;
  document.getElementById('stage-title').textContent = game.title;
  document.getElementById('stage-copy').textContent = game.copy;

  if (ACTIVE_GAME === 'wordsearch') {
    board.innerHTML = `
      <div class="wordsearch-layout">
        <div class="word-list-card">
          <h3>Palabras a encontrar</h3>
          <ul>${game.words.map(word => `<li class="word-pill ${game.found.includes(word) ? 'found' : ''}">${word}</li>`).join('')}</ul>
        </div>
        <div class="word-grid">${game.board.flatMap((row, y) => row.map((char, x) => `<button class="letter-btn ${game.selected.includes(`${y}-${x}`) ? 'selected' : ''}" type="button" data-letter="${y}-${x}">${char}</button>`)).join('')}</div>
      </div>
      <div class="game-actions">
        <button id="verify-word" class="game-btn">Verificar palabra</button>
        <button id="clear-selection" class="game-btn secondary">Limpiar selección</button>
      </div>
    `;

    board.querySelectorAll('[data-letter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.letter;
        if (!game.selected.length) {
          game.selected.push(key);
          renderGame();
          playTone(520, 0.03, 'sine');
          return;
        }
        if (game.selected.includes(key)) return;
        const last = game.selected[game.selected.length - 1];
        if (!isAdjacent(last, key)) {
          showFeedback('La letra debe tocar la anterior para formar la palabra.', 'bad');
          playTone(220, 0.08, 'sawtooth');
          return;
        }
        game.selected.push(key);
        renderGame();
        playTone(520, 0.03, 'sine');
      });
    });

    document.getElementById('verify-word').addEventListener('click', () => {
      const word = game.selected.map(k => {
        const [y, x] = k.split('-').map(Number);
        return game.board[y][x];
      }).join('');
      if (!word) return showFeedback('Primero elige una secuencia de letras.', 'bad');
      const normalizedWord = normalizeText(word);
      const matched = game.words.find(w => normalizeText(w) === normalizedWord);
      if (matched && !game.found.includes(matched)) {
        game.found.push(matched);
        showFeedback(`✅ Encontraste ${matched}. Excelente trabajo.`, 'good');
        playTone(880, 0.08, 'triangle');
      } else {
        showFeedback('❌ Esa palabra no coincide. Intenta otra ruta.', 'bad');
        playTone(220, 0.08, 'sawtooth');
      }
      game.selected = [];
      renderGame();
    });

    document.getElementById('clear-selection').addEventListener('click', () => {
      game.selected = [];
      renderGame();
    });

  } else if (ACTIVE_GAME === 'crossword') {
    board.innerHTML = `
      <div class="clue-grid">
        ${game.clues.map((item, index) => `
          <article class="clue-card">
            <p class="clue-label">Pista ${index + 1}</p>
            <h3>${item.clue}</h3>
            <div class="input-line">
              <input id="clue-${index}" type="text" placeholder="Escribe la respuesta" value="${game.answers[index] || ''}" />
              <button class="game-btn clue-check" data-index="${index}">Comprobar</button>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    board.querySelectorAll('.clue-check').forEach(button => {
      button.addEventListener('click', () => {
        const idx = Number(button.dataset.index);
        const input = document.getElementById(`clue-${idx}`);
        const answer = input.value.trim().toUpperCase();
        const correct = answer === game.clues[idx].answer;
        game.answers[idx] = input.value.trim();
        showFeedback(correct ? `✅ Correcto: ${game.clues[idx].answer}.` : '❌ Revisa la pista y vuelve a intentarlo.', correct ? 'good' : 'bad');
        playTone(correct ? 700 : 260, 0.08, correct ? 'triangle' : 'sawtooth');
        renderGame();
      });
    });

  } else {
    board.innerHTML = `
      <div class="memory-grid">${game.cards.map((card, index) => {
        const flipped = game.flipped.includes(index) || game.matched.includes(card.id);
        return `<button class="memory-card ${flipped ? 'revealed' : ''}" type="button" data-index="${index}">${flipped ? `<span class="memory-emoji">${card.emoji}</span><span class="memory-label">${card.label}</span>` : '<span class="memory-back">?</span>'}</button>`;
      }).join('')}</div>
    `;

    board.querySelectorAll('[data-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        if (game.flipped.includes(idx) || game.matched.includes(game.cards[idx].id)) return;
        game.flipped.push(idx);
        if (game.flipped.length === 2) {
          const [a, b] = game.flipped;
          const first = game.cards[a];
          const second = game.cards[b];
          if (first.label === second.label) {
            game.matched.push(first.id);
            showFeedback('✅ Pareja encontrada. Muy bien.', 'good');
            playTone(880, 0.06, 'triangle');
          } else {
            showFeedback('❌ Esa pareja no coincide. Sigue intentando.', 'bad');
            playTone(220, 0.06, 'sawtooth');
          }
          setTimeout(() => {
            game.flipped = [];
            renderGame();
          }, 650);
        } else {
          playTone(560, 0.03, 'sine');
        }
        renderGame();
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderSelector();
  renderGame();
  document.getElementById('reset-game').addEventListener('click', () => {
    resetGame();
    playTone(420, 0.05, 'square');
  });
});
