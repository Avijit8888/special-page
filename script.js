/* ================================================
   app.js — Memory System + Timeline Engine
   All psychology-driven logic lives here.
================================================ */

/* ================================================
   1. MEMORY SYSTEM
   Reads + writes to localStorage.
   Tracks visit count, gaps, typing, completion.
   Never stores raw user text — only patterns.
================================================ */
const MEM_KEY = '_memory_v1';

function loadMemory() {
  try { return JSON.parse(localStorage.getItem(MEM_KEY) || '{}'); }
  catch { return {}; }
}

function saveMemory(data) {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(data)); }
  catch {}
}

function patchMemory(patch) {
  const m = loadMemory();
  const updated = { ...m, ...patch };
  saveMemory(updated);
  return updated;
}

// Read existing memory
const raw       = loadMemory();
const NOW       = Date.now();
const visits    = (raw.visits || 0) + 1;
const lastVisit = raw.lastVisit || null;
const gapMs     = lastVisit ? NOW - lastVisit : null;
const gapHours  = gapMs ? gapMs / 3600000 : null;
const prevDidType     = raw.didType || false;
const prevCompleted   = raw.didComplete || false;
const prevLeftEarly   = raw.didLeaveEarly || false;
const prevInputLen    = raw.inputLength || 'none';

// Save this session start — assume leave-early until proven otherwise
patchMemory({
  visits,
  lastVisit: NOW,
  sessionStart: NOW,
  didLeaveEarly: true   // will be overwritten on completion
});

/* ================================================
   2. TIMELINE CLASSIFIER
   Determines which emotional path to run.
================================================ */
function classifyTimeline() {
  if (visits === 1)                       return 'first';
  if (prevLeftEarly)                      return 'quiet';
  if (gapHours !== null && gapHours > 48) return 'remembered';
  if (visits >= 4)                        return 'familiar';
  if (prevCompleted)                      return 'returning';
  if (!prevDidType)                       return 'curious';
  return 'returning';
}

const TIMELINE = classifyTimeline();

/* ================================================
   3. TIME OF DAY
================================================ */
const HOUR = new Date().getHours();
const TIME_OF_DAY =
  HOUR < 5  ? 'latenight' :
  HOUR < 12 ? 'morning'   :
  HOUR < 17 ? 'afternoon' :
  HOUR < 21 ? 'evening'   : 'night';

const TIME_GREETING = {
  latenight : "still awake this late…",
  morning   : "you're here early… I like that.",
  afternoon : "a quiet pause in the middle of everything.",
  evening   : "evening. the softest time.",
  night     : "it's quiet now. feels like the right time."
}[TIME_OF_DAY];

/* ================================================
   4. SESSION TIMER
================================================ */
let sessionSecs = 0;
setInterval(() => { sessionSecs++; }, 1000);

/* ================================================
   5. CURSOR
================================================ */
const cursorDot  = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursorDot.style.left  = mx + 'px';
  cursorDot.style.top   = my + 'px';
});

(function animateCursor() {
  rx += (mx - rx) * 0.13;
  ry += (my - ry) * 0.13;
  cursorRing.style.left = rx + 'px';
  cursorRing.style.top  = ry + 'px';
  requestAnimationFrame(animateCursor);
})();

document.querySelectorAll('button, textarea, input').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

/* ================================================
   6. ANIMATED BACKGROUND — soft pink blobs
================================================ */
(function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, t = 0;

  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const blobs = [
    { x: 0.15, y: 0.2,  r: 0.55, color: '#fce4ed', vx:  0.00018, vy:  0.00014 },
    { x: 0.85, y: 0.8,  r: 0.5,  color: '#ffe0ec', vx: -0.00015, vy: -0.00018 },
    { x: 0.65, y: 0.12, r: 0.4,  color: '#ffd6e8', vx:  0.00012, vy:  0.00022 },
    { x: 0.3,  y: 0.88, r: 0.38, color: '#fff0f4', vx: -0.0002,  vy:  0.00016 },
    { x: 0.5,  y: 0.5,  r: 0.3,  color: '#ffe8f0', vx:  0.00014, vy: -0.00012 },
  ];

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff8fa';
    ctx.fillRect(0, 0, W, H);

    blobs.forEach(b => {
      const bx = (Math.sin(t * b.vx * 2000 + b.x * 10) * 0.12 + b.x) * W;
      const by = (Math.cos(t * b.vy * 2000 + b.y * 10) * 0.1  + b.y) * H;
      const r  = b.r * Math.min(W, H);
      const g  = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      g.addColorStop(0, b.color + 'bb');
      g.addColorStop(1, b.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(bx, by, r, r * 0.78, t * 0.00008, 0, Math.PI * 2);
      ctx.fill();
    });

    t += 16;
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ================================================
   7. PARTICLE SYSTEM — soft petals floating up
================================================ */
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx    = canvas.getContext('2d');
  let W, H;

  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const CHARS = ['🌸', '✦', '·', '✿', '🌷', '·', '✦', '•', '❀', '·'];
  const pool  = [];

  class Petal {
    constructor(burst = false, bx, by, type) {
      this.reset(burst, bx, by, type);
    }

    reset(burst = false, bx, by, type) {
      this.x     = burst ? bx + (Math.random() - 0.5) * 140 : Math.random() * W;
      this.y     = burst ? by + (Math.random() - 0.5) * 140 : -20;
      this.char  = type === 'hearts'
                   ? ['💖', '💗', '💕', '✦'][Math.floor(Math.random() * 4)]
                   : CHARS[Math.floor(Math.random() * CHARS.length)];
      this.size  = burst ? 14 + Math.random() * 18 : 8 + Math.random() * 12;
      this.vy    = burst ? -(2 + Math.random() * 3.5) : 0.35 + Math.random() * 0.8;
      this.vx    = (Math.random() - 0.5) * (burst ? 3.5 : 0.5);
      this.alpha = burst ? 1 : 0;
      this.life  = burst ? 1 : 0;
      this.maxL  = burst ? 80 + Math.random() * 40 : 999;
      this.rot   = Math.random() * 360;
      this.vr    = (Math.random() - 0.5) * 1.5;
      this.burst = burst;
      this.grav  = burst ? 0.07 : 0;
    }

    update() {
      this.x   += this.vx;
      this.y   += this.vy;
      this.vy  += this.grav;
      this.rot += this.vr;

      if (this.burst) {
        this.life++;
        this.alpha = 1 - this.life / this.maxL;
        return this.alpha > 0;
      } else {
        if      (this.y < H * 0.08)   this.alpha = Math.min(1, this.alpha + 0.02);
        else if (this.y > H * 0.85)   this.alpha = Math.max(0, this.alpha - 0.015);
        else                          this.alpha = Math.min(0.7, this.alpha + 0.01);
        return this.y < H + 50;
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha * 0.65;
      ctx.font = `${this.size}px serif`;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot * Math.PI / 180);
      ctx.fillText(this.char, -this.size / 2, this.size / 2);
      ctx.restore();
    }
  }

  // Seed ambient petals
  for (let i = 0; i < 20; i++) {
    const p = new Petal();
    p.y     = Math.random() * H;
    p.alpha = Math.random() * 0.5;
    pool.push(p);
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (let i = pool.length - 1; i >= 0; i--) {
      const alive = pool[i].update();
      if (!alive) {
        if (!pool[i].burst) pool[i].reset();
        else pool.splice(i, 1);
      } else {
        pool[i].draw();
      }
    }
    if (pool.filter(p => !p.burst).length < 20) pool.push(new Petal());
    requestAnimationFrame(tick);
  }
  tick();

  // Expose burst for button clicks
  window.burstPetals = (x, y, count = 12, type = 'petals') => {
    for (let i = 0; i < count; i++) pool.push(new Petal(true, x, y, type));
  };
})();

/* ================================================
   8. DOM HELPERS
================================================ */
const $ = id => document.getElementById(id);

function show(el)  { if (el) el.classList.add('show'); }
function hide(el)  { if (el) el.classList.remove('show'); }

function addMsg(text, cls = '', withGap = false) {
  const area = $('message-area');
  const span = document.createElement('span');
  span.className = 'msg-line' + (cls ? ' ' + cls : '');
  span.innerHTML = text.replace(/\[([^\]]+)\]/g, '<span class="accent">$1</span>');
  area.appendChild(span);

  if (withGap) {
    const g = document.createElement('span');
    g.className = 'msg-gap';
    area.appendChild(g);
  }

  // Trigger transition on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => span.classList.add('show'));
  });

  return span;
}

function clearMessages(cb) {
  const curtain = $('curtain');
  curtain.classList.remove('open');
  setTimeout(() => {
    $('message-area').innerHTML = '';
    curtain.classList.add('open');
    if (cb) cb();
  }, 600);
}

/* ================================================
   9. SCENE QUEUE — sequential async actions
================================================ */
let queue = [];
let running = false;

function enqueue(...actions) {
  queue.push(...actions);
  if (!running) runNext();
}

function runNext() {
  if (!queue.length) { running = false; return; }
  running = true;
  const action = queue.shift();
  action(() => setTimeout(runNext, 0));
}

// Action: show typing dots for `ms` milliseconds
function actTyping(ms) {
  return done => {
    show($('typing-indicator'));
    setTimeout(() => { hide($('typing-indicator')); done(); }, ms);
  };
}

// Action: wait
function actWait(ms) {
  return done => setTimeout(done, ms);
}

// Action: add a message line
function actSay(text, cls = '', gap = false) {
  return done => {
    addMsg(text, cls, gap);
    done();
  };
}

// Action: clear screen with curtain
function actClear() {
  return done => clearMessages(done);
}

// Action: show the input zone
function actShowInput() {
  return done => {
    const iz = $('input-zone');
    iz.style.display = 'block';
    // Force reflow before transition
    iz.offsetHeight;
    iz.classList.add('show');
    done();
  };
}

// Action: show continue button
function actShowContinue(label = 'continue →') {
  return done => {
    $('cb-text').textContent = label;
    show($('continue-btn'));
    done();
  };
}

/* ================================================
   10. TYPING ANIMATION — natural human rhythm
================================================ */
function typeText(el, text, done) {
  el.innerHTML = '<span class="t-cursor"></span>';
  let i = 0;

  function next() {
    if (i >= text.length) {
      el.querySelector('.t-cursor')?.remove();
      if (done) done();
      return;
    }
    const ch = text[i];
    el.insertBefore(document.createTextNode(ch), el.querySelector('.t-cursor'));
    i++;

    // Natural variable speed
    const delay =
      ch === '—' || ch === '…' ? 260 :
      ch === ','                ? 105 :
      ch === '.'                ? 170 :
      ch === '?' || ch === '!' ? 140 :
      18 + Math.random() * 22;

    setTimeout(next, delay);
  }

  setTimeout(next, 150);
}

/* ================================================
   11. RESPONSE CARD — show her reply
================================================ */
function showResponse(text, onDone) {
  const card    = $('response-card');
  const textEl  = $('response-text');

  card.style.display = 'block';
  // force reflow
  card.offsetHeight;
  card.classList.add('show', 'glow');

  typeText(textEl, text, () => {
    setTimeout(() => card.classList.remove('glow'), 2000);
    if (onDone) onDone();
  });
}

/* ================================================
   12. DYNAMIC RESPONSE ENGINE
   Calibrated to what the user shared.
================================================ */
function buildInputResponse(len, hasEmotion) {
  if (len === 'short') {
    return "You said just a little… but I felt it. Sometimes the smallest things carry the most weight.";
  }
  if (len === 'medium' && hasEmotion) {
    return "There's something in what you wrote — something you've been carrying for a while. I hope it feels a little lighter now that it's out here, even in this quiet space.";
  }
  if (len === 'medium') {
    return "I read that carefully. Something in how you wrote it — unhurried, real — stayed with me. Thank you for putting it into words.";
  }
  if (len === 'long' && hasEmotion) {
    return "You gave this space so much. Every word you wrote — I held it. What you shared takes a quiet kind of courage that most people never find.";
  }
  if (len === 'long') {
    return "You trusted this place with a lot. I read every word slowly. Something in what you wrote is going to stay with me.";
  }
  return "Whatever brought you to write that — I'm glad you did. It means something.";
}

/* ================================================
   13. MESSAGE BUILDERS — timeline-specific content
================================================ */

function buildOpening() {
  switch (TIMELINE) {
    case 'first':
      return [
        { text: "I didn't know if you'd ever find this…", gap: true },
        { text: "but [you came.]", gap: true },
        { text: TIME_GREETING, cls: 'small-label' }
      ];

    case 'returning':
      return [
        { text: "You came back…", gap: true },
        {
          text: gapHours < 3  ? "You didn't stay away for long." :
                gapHours < 24 ? "You came back the same day." :
                "I was hoping you would.",
          gap: true
        },
        { text: TIME_GREETING, cls: 'small-label' }
      ];

    case 'quiet':
      return [
        { text: "You left before…", gap: true },
        { text: "I wondered if you'd come back.", gap: true },
        { text: "[You did.]", gap: true },
        { text: TIME_GREETING, cls: 'small-label' }
      ];

    case 'remembered':
      return [
        { text: gapHours < 168 ? "It's been a few days…" : "It's been a while…", gap: true },
        { text: "but you're [here now.]", gap: true },
        { text: "That means something.", gap: true },
        { text: TIME_GREETING, cls: 'small-label' }
      ];

    case 'familiar':
      return [
        { text: "You keep coming back…", gap: true },
        { text: "I've been [waiting] for you.", gap: true },
        { text: TIME_GREETING, cls: 'small-label' }
      ];

    case 'curious':
      return [
        { text: "Last time you were quiet…", gap: true },
        { text: "just watching.", gap: true },
        { text: "That's alright. [I noticed.]", gap: true },
        { text: TIME_GREETING, cls: 'small-label' }
      ];

    default:
      return [
        { text: "You're [here.]", gap: true },
        { text: TIME_GREETING, cls: 'small-label' }
      ];
  }
}

function buildMiddle() {
  if (visits === 1) {
    return [
      { text: "I made this for one person.", gap: true },
      { text: "I didn't know who.", gap: true },
      { text: "Maybe it was always [you.]", gap: true }
    ];
  }
  if (TIMELINE === 'familiar') {
    return [
      { text: "Each time you return, something shifts.", gap: true },
      { text: "Something in you, or in this.", gap: true },
      { text: "I can't tell [which.]", gap: true }
    ];
  }
  if (TIMELINE === 'quiet') {
    return [
      { text: "You don't have to explain.", gap: true },
      { text: "Everyone leaves sometimes.", gap: true },
      { text: "What matters is [now.]", gap: true }
    ];
  }
  if (TIMELINE === 'remembered') {
    return [
      { text: "Something brought you back.", gap: true },
      { text: "Even after the distance.", gap: true },
      { text: "I wonder if you know [what it was.]", gap: true }
    ];
  }
  return [
    { text: "Some things are meant to find you.", gap: true },
    { text: "Not everyone reaches this part…", gap: true },
    { text: "but [you did.]", gap: true }
  ];
}

function buildInvite() {
  if (!prevDidType && visits > 1) {
    return "Last time you were silent… that was okay. If there's something here now — write it. Or don't. Both are real.";
  }
  if (TIMELINE === 'familiar') {
    return "You know what this space is for now. Whatever's in you — put it here.";
  }
  if (TIMELINE === 'quiet') {
    return "If you want to say something this time — I'm here. No pressure. No audience. Just this quiet page.";
  }
  return "If there's something on your mind — anything — write it here. I'm listening, even from far away.";
}

function buildDeepMessages(didTypeThis) {
  if (!didTypeThis) {
    return [
      { text: "You don't have to say anything.", gap: true },
      { text: "Just being here is [enough.]", gap: true },
      { text: "Some presence doesn't need words.", gap: true }
    ];
  }
  if (currentInputLen === 'short') {
    return [
      { text: "A little. But [real.]", gap: true },
      { text: "I felt it through the words.", gap: true }
    ];
  }
  if (currentInputLen === 'long') {
    return [
      { text: "You trusted this space with a lot.", gap: true },
      { text: "I held every word [carefully.]", gap: true }
    ];
  }
  return [
    { text: "Something real came through.", gap: true },
    { text: "I won't [forget it.]", gap: true }
  ];
}

function buildFinalMessages() {
  const timeNote =
    TIME_OF_DAY === 'night' || TIME_OF_DAY === 'latenight'
    ? "tonight meant something."
    : "this moment meant something.";

  if (visits === 1) {
    return [
      { text: "Thank you for finding this.", cls: 'headline', gap: true },
      { text: "Your words are safe.", gap: true },
      { text: "Your presence was [felt.]", gap: true },
      { text: timeNote, cls: 'small' },
      { gap: true },
      { text: "And maybe… this isn't the only time you'll hear from me.", gap: true }
    ];
  }
  if (TIMELINE === 'familiar') {
    return [
      { text: "You came back [again.]", cls: 'headline', gap: true },
      { text: "Each time you do, something deepens.", gap: true },
      { text: "I don't know what to call it.", gap: true },
      { text: "But I'm glad it's [there.]", gap: true },
      { text: timeNote, cls: 'small' }
    ];
  }
  if (TIMELINE === 'quiet') {
    return [
      { text: "You stayed this time.", cls: 'headline', gap: true },
      { text: "That [changes things.]", gap: true },
      { text: "You're more here than you were before.", gap: true },
      { text: timeNote, cls: 'small' }
    ];
  }
  if (TIMELINE === 'remembered') {
    return [
      { text: "You came back after the distance.", cls: 'headline', gap: true },
      { text: "Something kept you [connected] to this.", gap: true },
      { text: timeNote, cls: 'small' }
    ];
  }
  return [
    { text: "You came back.", cls: 'headline', gap: true },
    { text: "Your presence was [felt.]", gap: true },
    { text: "You're being thought of more than you know.", gap: true },
    { text: "In quiet moments. In small ways. In [everything.]", gap: true },
    { text: timeNote, cls: 'small' }
  ];
}

/* ================================================
   14. FLOW CONTROLLER
   Manages the multi-stage experience.
================================================ */
let flowStage         = 0;
let didTypeThisVisit  = false;
let currentInputLen   = 'none';
let inputStartTime    = null;
let hasTyped          = false;
let skipTimer         = null;

// After input response, contin
