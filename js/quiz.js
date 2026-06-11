/* =====================================================
   EDUQUEST BACHILLERATO — quiz.js
   Motor de Juegos: Quiz, V/F, Completar, Asociar
   ===================================================== */

const EQ_Quiz = (() => {

  /* Estado del quiz */
  let state = {
    subject:      null,
    mode:         'quiz', // quiz | tf | fill | match
    questions:    [],
    current:      0,
    score:        0,
    correct:      0,
    wrong:        0,
    timeLeft:     20,
    timerInterval: null,
    fastCorrect:  0,
    answered:     false,
    startTime:    null,
    selectedLeft: null,  // for match mode
    matchedPairs: 0,
  };

  const TIMER_DEFAULT = 20;

  /* ─── INIT ─── */
  const init = () => {
    const params = new URLSearchParams(window.location.search);
    state.subject = params.get('subject') || 'matematica';
    state.mode    = params.get('mode')    || 'quiz';

    if (!EQ_Data.questions[state.subject]) {
      state.subject = 'matematica';
    }

    // Filter questions by mode
    let pool = EQ_DATA.questions[state.subject].filter(q => q.type === state.mode);
    if (pool.length === 0) pool = EQ_DATA.questions[state.subject].filter(q => q.type === 'quiz');

    // Shuffle & pick 10
    state.questions = shuffle(pool).slice(0, 10);
    state.current   = 0;
    state.score     = 0;
    state.correct   = 0;
    state.wrong     = 0;
    state.fastCorrect = 0;
    state.startTime = Date.now();

    renderQuestion();
  };

  /* ─── RENDER QUESTION ─── */
  const renderQuestion = () => {
    const q = state.questions[state.current];
    if (!q) { showResults(); return; }

    state.answered = false;

    updateHeader();
    renderQuestionCard(q);
    startTimer();
  };

  /* ─── HEADER ─── */
  const updateHeader = () => {
    const total = state.questions.length;
    const idx   = state.current;

    setText('quiz-question-num', `Pregunta ${idx + 1} de ${total}`);
    setText('quiz-score-display', `${state.score} pts`);
    setText('quiz-correct-count', state.correct);
    setText('quiz-wrong-count', state.wrong);

    const progressFill = document.getElementById('quiz-progress-fill');
    if (progressFill) progressFill.style.width = `${(idx / total) * 100}%`;

    const subjectInfo = EQ_DATA.subjects[state.subject];
    const subjectEl = document.getElementById('quiz-subject-name');
    if (subjectEl) subjectEl.textContent = `${subjectInfo?.icon || ''} ${subjectInfo?.name || ''}`;
  };

  /* ─── RENDER QUESTION CARD ─── */
  const renderQuestionCard = (q) => {
    const questionText = document.getElementById('quiz-question-text');
    const optionsArea  = document.getElementById('quiz-options-area');
    const explanation  = document.getElementById('quiz-explanation');

    if (questionText) questionText.textContent = q.q;
    if (explanation)  { explanation.textContent = ''; explanation.style.display = 'none'; }

    if (!optionsArea) return;
    optionsArea.innerHTML = '';

    if (q.type === 'quiz') renderQuizOptions(q, optionsArea);
    else if (q.type === 'tf') renderTFOptions(q, optionsArea);
    else if (q.type === 'fill') renderFillOption(q, optionsArea);
    else if (q.type === 'match') renderMatchOptions(q, optionsArea);
  };

  /* ─── QUIZ (Opción múltiple) ─── */
  const renderQuizOptions = (q, container) => {
    const letters = ['A', 'B', 'C', 'D'];
    const div = document.createElement('div');
    div.className = 'quiz-options';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.innerHTML = `<span class="quiz-option-letter">${letters[i]}</span>${opt}`;
      btn.addEventListener('click', () => handleQuizAnswer(i, q, div));
      div.appendChild(btn);
    });
    container.appendChild(div);
  };

  const handleQuizAnswer = (chosen, q, container) => {
    if (state.answered) return;
    state.answered = true;
    stopTimer();

    const options = container.querySelectorAll('.quiz-option');
    options.forEach(o => o.classList.add('disabled'));

    const isCorrect = chosen === q.answer;
    options[chosen].classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) options[q.answer].classList.add('correct');

    handleResult(isCorrect, q);
  };

  /* ─── VERDADERO O FALSO ─── */
  const renderTFOptions = (q, container) => {
    const div = document.createElement('div');
    div.className = 'tf-options';

    ['✅ Verdadero', '❌ Falso'].forEach((label, i) => {
      const btn = document.createElement('button');
      btn.className = `tf-btn ${i === 0 ? 'verdadero' : 'falso'}`;
      btn.textContent = label;
      const value = i === 0;
      btn.addEventListener('click', () => handleTFAnswer(value, q, div));
      div.appendChild(btn);
    });
    container.appendChild(div);
  };

  const handleTFAnswer = (chosen, q, container) => {
    if (state.answered) return;
    state.answered = true;
    stopTimer();

    const btns = container.querySelectorAll('.tf-btn');
    btns.forEach(b => b.classList.add('disabled'));

    const isCorrect = chosen === q.answer;
    const chosenIdx = chosen ? 0 : 1;
    const correctIdx = q.answer ? 0 : 1;
    btns[chosenIdx].classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) btns[correctIdx].classList.add('correct');

    handleResult(isCorrect, q);
  };

  /* ─── COMPLETAR PALABRAS ─── */
  const renderFillOption = (q, container) => {
    const div = document.createElement('div');
    div.className = 'fill-input-wrapper';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fill-input';
    input.placeholder = `Pista: ${q.hint}`;
    input.id = 'fill-answer-input';

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Responder';
    btn.addEventListener('click', () => handleFillAnswer(input.value, q, input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleFillAnswer(input.value, q, input);
    });

    div.appendChild(input);
    div.appendChild(btn);
    container.appendChild(div);

    setTimeout(() => input.focus(), 100);
  };

  const handleFillAnswer = (value, q, input) => {
    if (state.answered) return;
    const trimmed = value.trim().toLowerCase();
    const expected = q.answer.toLowerCase();
    const isCorrect = trimmed === expected || expected.includes(trimmed) && trimmed.length > 2;

    state.answered = true;
    stopTimer();

    input.disabled = true;
    input.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      const hint = document.createElement('p');
      hint.style.cssText = 'color:var(--secondary);font-weight:600;margin-top:8px;font-size:0.9rem;';
      hint.textContent = `Respuesta correcta: ${q.answer}`;
      input.parentNode.appendChild(hint);
    }

    handleResult(isCorrect, q);
  };

  /* ─── ASOCIAR CONCEPTOS ─── */
  const renderMatchOptions = (q, container) => {
    state.selectedLeft = null;
    state.matchedPairs = 0;

    const div = document.createElement('div');
    div.className = 'match-container';

    const leftCol  = document.createElement('div');
    leftCol.className = 'match-col';
    leftCol.id = 'match-left';

    const rightCol = document.createElement('div');
    rightCol.className = 'match-col';
    rightCol.id = 'match-right';

    const shuffledRight = shuffle([...q.pairs.map(p => p.right)]);

    q.pairs.forEach((pair, i) => {
      const left = document.createElement('div');
      left.className = 'match-item';
      left.textContent = pair.left;
      left.dataset.index = i;
      left.addEventListener('click', () => handleMatchLeft(left, q));
      leftCol.appendChild(left);
    });

    shuffledRight.forEach(right => {
      const rightItem = document.createElement('div');
      rightItem.className = 'match-item';
      rightItem.textContent = right;
      rightItem.dataset.value = right;
      rightItem.addEventListener('click', () => handleMatchRight(rightItem, q));
      rightCol.appendChild(rightItem);
    });

    div.appendChild(leftCol);
    div.appendChild(rightCol);
    container.appendChild(div);
  };

  const handleMatchLeft = (el, q) => {
    if (el.classList.contains('matched')) return;
    document.querySelectorAll('#match-left .match-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedLeft = el;
  };

  const handleMatchRight = (el, q) => {
    if (!state.selectedLeft || el.classList.contains('matched')) return;

    const leftIndex = parseInt(state.selectedLeft.dataset.index);
    const expectedRight = q.pairs[leftIndex].right;
    const chosenRight = el.dataset.value;

    if (chosenRight === expectedRight) {
      state.selectedLeft.classList.remove('selected');
      state.selectedLeft.classList.add('matched');
      el.classList.add('matched');
      state.matchedPairs++;
      state.selectedLeft = null;

      if (state.matchedPairs === q.pairs.length) {
        stopTimer();
        handleResult(true, q);
      }
    } else {
      state.selectedLeft.classList.add('wrong');
      el.classList.add('wrong');
      setTimeout(() => {
        state.selectedLeft?.classList.remove('wrong', 'selected');
        el.classList.remove('wrong');
        state.selectedLeft = null;
      }, 800);
      // Penalty: -2s
      state.timeLeft = Math.max(1, state.timeLeft - 2);
    }
  };

  /* ─── HANDLE RESULT ─── */
  const handleResult = (isCorrect, q) => {
    if (isCorrect) {
      const pts = calculatePoints();
      state.correct++;
      state.score += pts;
      if (state.timeLeft > 15) state.fastCorrect++;
    } else {
      state.wrong++;
    }

    // Show explanation
    const expEl = document.getElementById('quiz-explanation');
    if (expEl && q.explanation) {
      expEl.innerHTML = `<strong>${isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto.'}</strong> ${q.explanation}`;
      expEl.style.display = 'block';
      expEl.style.cssText = `
        display:block; padding:14px 18px; border-radius:12px; margin-top:16px;
        background:${isCorrect ? 'var(--secondary-light)' : 'var(--danger-light)'};
        color:${isCorrect ? 'var(--secondary-dark)' : '#991B1B'};
        font-size:0.9rem; line-height:1.5; animation: fadeInUp 0.3s ease;
      `;
    }

    setText('quiz-score-display', `${state.score} pts`);

    // Auto-advance after 1.8s
    setTimeout(() => {
      state.current++;
      renderQuestion();
    }, 1800);
  };

  /* ─── TIMER ─── */
  const startTimer = () => {
    state.timeLeft = TIMER_DEFAULT;
    updateTimerUI();

    state.timerInterval = setInterval(() => {
      state.timeLeft--;
      updateTimerUI();

      if (state.timeLeft <= 0) {
        stopTimer();
        if (!state.answered) {
          state.answered = true;
          state.wrong++;
          // Show correct answer hint
          const expEl = document.getElementById('quiz-explanation');
          if (expEl) {
            expEl.innerHTML = '⏰ <strong>¡Tiempo agotado!</strong> ' + (state.questions[state.current]?.explanation || '');
            expEl.style.cssText = 'display:block;padding:14px 18px;border-radius:12px;margin-top:16px;background:var(--warning-light);color:#92400E;font-size:0.9rem;';
          }
          setTimeout(() => { state.current++; renderQuestion(); }, 1800);
        }
      }
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  };

  const updateTimerUI = () => {
    const timerEl  = document.getElementById('quiz-timer-val');
    const circleEl = document.getElementById('quiz-timer-circle');
    const timerBox = document.getElementById('quiz-timer');

    if (timerEl) timerEl.textContent = state.timeLeft;

    if (circleEl) {
      const circumference = 220;
      const offset = circumference - (state.timeLeft / TIMER_DEFAULT) * circumference;
      circleEl.style.strokeDashoffset = offset;
      circleEl.style.stroke = state.timeLeft <= 5 ? 'var(--danger)' : 'var(--primary)';
    }

    if (timerBox) {
      timerBox.classList.toggle('urgent', state.timeLeft <= 5);
    }
  };

  /* ─── RESULTS ─── */
  const showResults = () => {
    stopTimer();
    const total = state.questions.length;
    const pct   = Math.round((state.correct / total) * 100);
    const isPerfect = state.correct === total;
    const elapsed = Math.round((Date.now() - state.startTime) / 1000);

    const user = EQ_Auth.getUser();
    let xpGained = 0;
    if (user) {
      xpGained = EQ_Gamification.recordQuizResult(user.id, {
        subject:   state.subject,
        score:     state.score,
        total,
        correct:   state.correct,
        isPerfect,
        fastCorrect: state.fastCorrect,
      });
    }

    const container = document.getElementById('quiz-main-area');
    if (!container) return;

    const grade = pct >= 90 ? '🌟 Excelente' : pct >= 70 ? '😊 Bien' : pct >= 50 ? '🙂 Regular' : '💪 Sigue Practicando';

    container.innerHTML = `
      <div class="quiz-results animate-scale-in">
        <div style="font-size:4rem;margin-bottom:12px">${isPerfect ? '🏆' : pct >= 70 ? '🎉' : '📚'}</div>
        <div class="results-grade">${grade}</div>
        <div class="results-score">${pct}%</div>
        <div class="results-stats">
          <div class="results-stat">
            <div class="results-stat-val" style="color:var(--secondary)">${state.correct}</div>
            <div class="results-stat-lbl">Correctas</div>
          </div>
          <div class="results-stat">
            <div class="results-stat-val" style="color:var(--danger)">${state.wrong}</div>
            <div class="results-stat-lbl">Incorrectas</div>
          </div>
          <div class="results-stat">
            <div class="results-stat-val">${state.score}</div>
            <div class="results-stat-lbl">Puntos</div>
          </div>
          <div class="results-stat">
            <div class="results-stat-val">${elapsed}s</div>
            <div class="results-stat-lbl">Tiempo</div>
          </div>
        </div>
        ${xpGained ? `<div class="xp-chip" style="font-size:1.1rem;padding:10px 20px;margin:16px auto;display:inline-flex">⭐ +${xpGained} XP ganados</div>` : ''}
        ${isPerfect ? '<div class="tag tag-warning" style="font-size:1rem;padding:8px 16px;margin:8px auto">🎯 ¡Quiz perfecto!</div>' : ''}
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px">
          <button class="btn btn-primary btn-lg" onclick="location.reload()">Jugar de nuevo 🔄</button>
          <button class="btn btn-ghost btn-lg" onclick="window.location.href='subjects.html'">Volver a Materias</button>
          <button class="btn btn-secondary btn-lg" onclick="window.location.href='dashboard.html'">Dashboard 🏠</button>
        </div>
      </div>
    `;

    if (isPerfect || pct >= 80) {
      setTimeout(EQ_Gamification.launchConfetti, 300);
    }
  };

  /* ─── HELPERS ─── */
  const calculatePoints = () => {
    const timeBonus = Math.floor(state.timeLeft * 2);
    return 10 + timeBonus;
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  return { init, shuffle };
})();

window.EQ_Quiz = EQ_Quiz;
