import { Renderer } from './renderer.js';
import { LIBRARY, BY_ID } from './library.js';
import { findConcept, suggest } from './search.js';
import { mysteryConcept } from './mystery.js';
import { speech } from './speech.js';

const $ = (sel) => document.querySelector(sel);
const canvas = $('#stage');
const card = $('#card');
const form = $('#search');
const input = $('#q');
const starsEl = $('#stars');
const readToggle = $('#read-aloud');
const dialog = $('#celebrate');

// ---------- persistent progress (small, per-device; fine for a kids' game)
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode etc. */ } },
};
let stars = store.get('ww:stars', 0);
let learned = store.get('ww:learned', {});
readToggle.checked = store.get('ww:readAloud', true) && speech.supported;
if (!speech.supported) readToggle.closest('label').hidden = true;
readToggle.addEventListener('change', () => { store.set('ww:readAloud', readToggle.checked); if (!readToggle.checked) speech.stop(); });

// ---------- renderer
let renderer;
try {
  renderer = new Renderer(canvas);
} catch (err) {
  console.error(err);
  $('#nogl').hidden = false;
}

// ---------- state machine
const state = { mode: 'home', concept: null, fact: 0, quiz: 0, correct: 0, answered: false };

function say(text) {
  if (readToggle.checked) speech.speak(text);
}

function render(update) {
  // View Transitions API when available; plain update otherwise.
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(update);
  } else {
    update();
  }
}

function renderStars() {
  starsEl.textContent = stars;
  starsEl.closest('.stars').setAttribute('aria-label', `${stars} stars earned`);
}

function pickSuggestions(n = 6) {
  const pool = [...LIBRARY].sort(() => Math.random() - 0.5);
  return pool.slice(0, n);
}

function chip(c) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.innerHTML = `<span aria-hidden="true">${c.emoji}</span> ${c.name}`;
  b.addEventListener('click', () => load(c.name));
  return b;
}

function showHome() {
  state.mode = 'home';
  speech.stop();
  render(() => {
    card.className = 'card home';
    card.innerHTML = `
      <h2>What do you want to learn about?</h2>
      <p>Type a dinosaur, an animal, a planet, or a machine, then press <strong>Show me!</strong></p>
      <div class="chips" id="chips"></div>
      ${Object.keys(learned).length ? `<p class="sticker-title">My sticker book</p><div class="stickers">${Object.keys(learned).map((id) => `<span title="${BY_ID[id]?.name ?? id}">${BY_ID[id]?.emoji ?? '✨'}</span>`).join('')}</div>` : ''}
    `;
    const chips = $('#chips');
    pickSuggestions().forEach((c) => chips.append(chip(c)));
  });
  if (renderer) renderer.setModel(BY_ID.trex.build(), BY_ID.trex.scene);
}

function load(query) {
  const q = query.trim();
  if (!q) return;
  const concept = findConcept(q) || mysteryConcept(q);
  input.value = concept.mystery ? q : concept.name;
  const url = new URL(location.href);
  url.searchParams.set('q', concept.mystery ? q : concept.id);
  history.replaceState(null, '', url);
  state.concept = concept;
  state.fact = 0;
  state.quiz = 0;
  state.correct = 0;
  state.answered = false;
  if (renderer) renderer.setModel(concept.build(), concept.scene);
  showFact();
}

function showFact() {
  const c = state.concept;
  state.mode = 'learn';
  const fact = c.facts[state.fact];
  const last = state.fact === c.facts.length - 1;
  render(() => {
    card.className = 'card learn';
    card.innerHTML = `
      <div class="title">
        <span class="emoji" aria-hidden="true">${c.emoji}</span>
        <div><h2>${c.name}</h2><p class="cat">${c.category}</p></div>
      </div>
      <p class="fact" aria-live="polite">${fact}</p>
      <div class="dots" aria-label="Fact ${state.fact + 1} of ${c.facts.length}">
        ${c.facts.map((_, i) => `<span class="${i === state.fact ? 'on' : ''}${i < state.fact ? ' done' : ''}"></span>`).join('')}
      </div>
      <div class="actions">
        <button type="button" class="btn ghost" id="speak" ${speech.supported ? '' : 'hidden'}>🔊 Read it</button>
        ${state.fact > 0 ? '<button type="button" class="btn ghost" id="prev">◀ Back</button>' : ''}
        <button type="button" class="btn primary" id="next">${last ? '⭐ Quiz time!' : 'Next fact ▶'}</button>
      </div>
      ${c.mystery ? `<div class="did-you-mean">Did you mean: ${suggest(c.name, 3).map((s) => `<button type="button" class="link" data-id="${s.id}">${s.emoji} ${s.name}</button>`).join(' ')}</div>` : ''}
    `;
    $('#speak')?.addEventListener('click', () => speech.speak(fact));
    // Read live state rather than this closure: with View Transitions the DOM
    // can lag a frame behind, and little fingers tap fast.
    $('#prev')?.addEventListener('click', () => { if (state.mode === 'learn' && state.fact > 0) { state.fact--; showFact(); } });
    $('#next').addEventListener('click', () => {
      if (state.mode !== 'learn') return;
      if (state.fact >= c.facts.length - 1) showQuiz(); else { state.fact++; showFact(); }
    });
    card.querySelectorAll('.link').forEach((b) => b.addEventListener('click', () => load(BY_ID[b.dataset.id].name)));
  });
  say(state.fact === 0 ? `${c.name}. ${fact}` : fact);
}

function showQuiz() {
  const c = state.concept;
  state.mode = 'quiz';
  const q = c.quiz[state.quiz];
  render(() => {
    card.className = 'card quiz';
    card.innerHTML = `
      <div class="title"><span class="emoji" aria-hidden="true">🧠</span><div><h2>Quiz time!</h2><p class="cat">Question ${state.quiz + 1} of ${c.quiz.length}</p></div></div>
      <p class="fact" aria-live="polite">${q.q}</p>
      <div class="options">${q.options.map((o, i) => `<button type="button" class="btn option" data-i="${i}">${o}</button>`).join('')}</div>
      <p class="feedback" aria-live="assertive"></p>
    `;
    card.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => { if (state.mode === 'quiz' && !state.answered) answer(Number(b.dataset.i)); }));
  });
  say(`${q.q} ${q.options.join(', or ')}?`);
}

function answer(i) {
  const c = state.concept;
  const q = c.quiz[state.quiz];
  const fb = card.querySelector('.feedback');
  const buttons = card.querySelectorAll('.option');
  state.answered = true;
  buttons.forEach((b) => (b.disabled = true));
  if (i === q.answer) {
    buttons[i].classList.add('right');
    fb.textContent = ['Yes! You got it!', 'Super smart!', 'Hooray, that is right!'][Math.floor(Math.random() * 3)];
    state.correct++;
    stars++;
    store.set('ww:stars', stars);
    renderStars();
    confetti(18);
    say(fb.textContent);
  } else {
    buttons[i].classList.add('wrong');
    buttons[q.answer].classList.add('right');
    fb.textContent = `Good try! The answer is: ${q.options[q.answer]}.`;
    say(fb.textContent);
  }
  setTimeout(() => {
    state.quiz++;
    state.answered = false;
    if (state.quiz < c.quiz.length) showQuiz(); else finish();
  }, 1800);
}

function finish() {
  const c = state.concept;
  state.mode = 'done';
  if (!c.mystery) {
    learned[c.id] = Math.max(learned[c.id] || 0, state.correct);
    store.set('ww:learned', learned);
  }
  const total = c.quiz.length;
  $('#celebrate-text').textContent = state.correct === total
    ? `You learned all about the ${c.name} and got every question right!`
    : `You learned all about the ${c.name} and got ${state.correct} out of ${total} right!`;
  $('#celebrate-emoji').textContent = c.emoji;
  if (!c.mystery) $('#celebrate-sticker').textContent = 'New sticker added to your sticker book!';
  else $('#celebrate-sticker').textContent = '';
  dialog.showModal();
  confetti(40);
  say($('#celebrate-text').textContent);
}

$('#again').addEventListener('click', () => { dialog.close(); state.fact = 0; state.quiz = 0; state.correct = 0; showFact(); });
$('#another').addEventListener('click', () => { dialog.close(); input.value = ''; history.replaceState(null, '', location.pathname); showHome(); input.focus(); });
dialog.addEventListener('close', () => { if (state.mode === 'done') showHome(); });

function confetti(n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = $('#confetti');
  const colors = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.setProperty('--x', `${Math.random() * 100}vw`);
    s.style.setProperty('--d', `${0.9 + Math.random() * 0.8}s`);
    s.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    s.style.setProperty('--c', colors[i % colors.length]);
    s.style.setProperty('--w', `${6 + Math.random() * 8}px`);
    host.append(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

// ---------- wiring
const datalist = $('#names');
LIBRARY.forEach((c) => { const o = document.createElement('option'); o.value = c.name; datalist.append(o); });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  load(input.value);
  input.blur();
});
$('#home-btn').addEventListener('click', () => { input.value = ''; history.replaceState(null, '', location.pathname); showHome(); });
$('#surprise').addEventListener('click', () => load(pickSuggestions(1)[0].name));

renderStars();
const initial = new URL(location.href).searchParams.get('q');
if (initial) load(BY_ID[initial]?.name ?? initial); else showHome();

// Offline-first app shell
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
