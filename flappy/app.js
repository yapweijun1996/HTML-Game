(function () {
  'use strict';

  /* ── DOM refs ── */
  var canvas       = document.getElementById('game-canvas');
  var ctx          = canvas.getContext('2d');
  var scoreEl      = document.getElementById('score-display');
  var bestEl       = document.getElementById('best-display');
  var finalScoreEl = document.getElementById('final-score');
  var finalBestEl  = document.getElementById('final-best');
  var startOverlay = document.getElementById('start-overlay');
  var deadOverlay  = document.getElementById('dead-overlay');
  var restartBtn   = document.getElementById('restart-btn');
  var menuBtn      = document.getElementById('menu-btn');
  var localeSelect = document.getElementById('locale');

  /* ── Game state ── */
  var gameState  = 'idle';   // 'idle' | 'playing' | 'dead'
  var score      = 0;
  var best       = 0;
  var pipes      = [];
  var pipeTimer  = 0;
  var pipeSpeed  = PIPE_SPEED_INIT;
  var groundOff  = 0;
  var idlePhase  = 0;
  var lastTs     = 0;

  /* ── Bird ── */
  var bird = { y: V_H / 2, vy: 0 };

  /* ── Stars (generated once) ── */
  var stars = [];
  (function initStars() {
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x:  Math.random() * V_W,
        y:  Math.random() * (V_H - GROUND_H),
        r:  0.4 + Math.random() * 1.2,
        op: 0.3 + Math.random() * 0.5
      });
    }
  })();

  /* ── Load best from storage ── */
  (function loadBest() {
    var saved = parseInt(localStorage.getItem(STORAGE_KEY_BEST), 10);
    if (!isNaN(saved) && saved > 0) best = saved;
    bestEl.textContent = best;
  })();

  /* ── Canvas resize ── */
  function resizeCanvas() {
    var wrap = document.getElementById('game-wrap');
    var wW = wrap.clientWidth;
    var wH = wrap.clientHeight;
    var ratio = V_W / V_H;
    var w, h;
    if (wW / wH > ratio) { h = wH; w = h * ratio; }
    else { w = wW; h = w / ratio; }
    w = Math.floor(w); h = Math.floor(h);
    canvas.width  = V_W;
    canvas.height = V_H;
    canvas.style.width    = w + 'px';
    canvas.style.height   = h + 'px';
    canvas.style.position = 'absolute';
    canvas.style.left     = Math.floor((wW - w) / 2) + 'px';
    canvas.style.top      = Math.floor((wH - h) / 2) + 'px';
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  /* ── i18n ── */
  function applyLocale() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = ft(key);
    });
    localeSelect.value = fbCurrentLocale;
  }

  localeSelect.value = fbCurrentLocale;
  localeSelect.addEventListener('change', function () {
    fbCurrentLocale = localeSelect.value;
    localStorage.setItem(STORAGE_KEY_LOCALE, fbCurrentLocale);
    applyLocale();
  });

  applyLocale();

  /* ── Pipe helpers ── */
  function spawnPipe() {
    var minGapTop = 60;
    var maxGapTop = V_H - GROUND_H - PIPE_GAP - 60;
    var gapTop = minGapTop + Math.random() * (maxGapTop - minGapTop);
    pipes.push({ x: V_W + 10, gapTop: gapTop, scored: false });
  }

  /* ── Collision detection ── */
  function isColliding() {
    var br = BIRD_R - 3; // forgiveness

    // Ground
    if (bird.y + br > V_H - GROUND_H) return true;
    // Ceiling
    if (bird.y - br < 2) return true;

    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      // Horizontal overlap?
      if (BIRD_X + br > p.x && BIRD_X - br < p.x + PIPE_W) {
        // In gap?
        if (bird.y - br < p.gapTop || bird.y + br > p.gapTop + PIPE_GAP) {
          return true;
        }
      }
    }
    return false;
  }

  /* ── State transitions ── */
  function startGame() {
    score     = 0;
    pipes     = [];
    pipeTimer = 0;
    pipeSpeed = PIPE_SPEED_INIT;
    bird.y    = V_H / 2;
    bird.vy   = 0;
    scoreEl.textContent = 0;
    startOverlay.hidden = true;
    deadOverlay.hidden  = true;
    gameState = 'playing';
  }

  function die() {
    gameState = 'dead';
    if (score > best) {
      best = score;
      localStorage.setItem(STORAGE_KEY_BEST, best);
      bestEl.textContent = best;
    }
    finalScoreEl.textContent = score;
    finalBestEl.textContent  = best;
    deadOverlay.hidden = false;
  }

  function restartGame() {
    deadOverlay.hidden  = true;
    startOverlay.hidden = false;
    bird.y  = V_H / 2;
    bird.vy = 0;
    gameState = 'idle';
  }

  /* ── Input ── */
  function onInput() {
    if (gameState === 'idle') {
      startGame();
      bird.vy = FLAP_VEL;
    } else if (gameState === 'playing') {
      bird.vy = FLAP_VEL;
    }
    // dead state: ignore tap — user must press restart button
  }

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    onInput();
  });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      onInput();
    }
  });

  restartBtn.addEventListener('click', function () {
    if (gameState === 'dead') restartGame();
    else if (gameState === 'idle') startGame();
  });

  menuBtn.addEventListener('click', function () {
    window.location.href = '../';
  });

  /* ── Update ── */
  function update(dt) {
    var t = dt / (1000 / 60); // normalize to 60fps factor

    // Ground always scrolls (idle & playing; stop on dead)
    if (gameState !== 'dead') {
      groundOff = (groundOff + GROUND_SPEED * t) % GROUND_TILE_W;
    }

    if (gameState === 'idle') {
      idlePhase += 0.05 * t;
      bird.y = V_H / 2 + Math.sin(idlePhase) * 8;
      return;
    }

    if (gameState === 'dead') return;

    // Bird physics
    bird.vy = Math.min(bird.vy + GRAVITY * t, MAX_FALL);
    bird.y += bird.vy * t;

    // Pipe timer
    pipeTimer += dt;
    if (pipeTimer >= PIPE_INTERVAL) {
      pipeTimer -= PIPE_INTERVAL;
      spawnPipe();
    }

    // Move pipes
    for (var i = 0; i < pipes.length; i++) {
      pipes[i].x -= pipeSpeed * t;
    }

    // Filter off-screen
    pipes = pipes.filter(function (p) { return p.x > -PIPE_W - 30; });

    // Score
    for (var j = 0; j < pipes.length; j++) {
      var p = pipes[j];
      if (!p.scored && p.x + PIPE_W < BIRD_X) {
        p.scored = true;
        score++;
        scoreEl.textContent = score;
        if (score % 5 === 0) {
          pipeSpeed = Math.min(pipeSpeed + 0.2, PIPE_SPEED_MAX);
        }
      }
    }

    // Collision
    if (isColliding()) die();
  }

  /* ── Draw helpers ── */
  function drawBackground() {
    var grad = ctx.createLinearGradient(0, 0, 0, V_H - GROUND_H);
    grad.addColorStop(0, '#060b18');
    grad.addColorStop(1, '#0f2040');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, V_W, V_H - GROUND_H);
  }

  function drawStars() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = s.op;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPipe(p) {
    var bodyColor = '#4c1d95';
    var capColor  = '#7c3aed';

    // Top pipe body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(p.x, 0, PIPE_W, p.gapTop - PIPE_CAP_H);

    // Top pipe cap
    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.rect(p.x - PIPE_CAP_OVH, p.gapTop - PIPE_CAP_H, PIPE_W + PIPE_CAP_OVH * 2, PIPE_CAP_H);
    ctx.fill();

    // Bottom pipe body
    var bottomStart = p.gapTop + PIPE_GAP + PIPE_CAP_H;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(p.x, bottomStart, PIPE_W, V_H - GROUND_H - bottomStart);

    // Bottom pipe cap
    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.rect(p.x - PIPE_CAP_OVH, p.gapTop + PIPE_GAP, PIPE_W + PIPE_CAP_OVH * 2, PIPE_CAP_H);
    ctx.fill();
  }

  function drawGround() {
    var groundY = V_H - GROUND_H;

    // Dark ground strip
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, groundY, V_W, GROUND_H);

    // Grass line (dark green, 8px)
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, groundY, V_W, 8);

    // Lighter grass highlight
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, groundY, V_W, 3);

    // Scrolling tile dashes
    ctx.fillStyle = '#132035';
    var off = -Math.floor(groundOff);
    for (var x = off; x < V_W; x += GROUND_TILE_W) {
      ctx.fillRect(x, groundY + 14, GROUND_TILE_W - 6, 6);
    }
  }

  function drawBird(bx, by, angle) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle);

    // Body glow
    ctx.shadowColor = 'rgba(251,191,36,0.5)';
    ctx.shadowBlur  = 10;

    // Body
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_R, BIRD_R * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Wing
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(-2, 5, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(2, 3, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(BIRD_R - 2, -2);
    ctx.lineTo(BIRD_R + 9, 0);
    ctx.lineTo(BIRD_R - 2, 5);
    ctx.closePath();
    ctx.fill();

    // Eye white
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5, -5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(7, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -5.5, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ── Render ── */
  function render() {
    ctx.clearRect(0, 0, V_W, V_H);

    drawBackground();
    drawStars();

    // Pipes
    for (var i = 0; i < pipes.length; i++) {
      drawPipe(pipes[i]);
    }

    drawGround();

    // Bird angle
    var angle = 0;
    if (gameState === 'playing' || gameState === 'dead') {
      angle = Math.max(-0.45, Math.min(1.3, bird.vy * 0.08));
    }

    drawBird(BIRD_X, bird.y, angle);
  }

  /* ── Game loop ── */
  function loop(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(ts - lastTs, 50);
    lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

})();
