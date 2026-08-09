const CAT_WIDTH = 48;

const ATTRACT = {
  nearTrackY: 280,
  nearTrackX: 160,
  fadeMs: 700,
  arriveDist: 3,
  strengthHero: 1.35,
  strengthNear: 0.9,
  speedBase: 24,
  speedDistFactor: 0.28,
  speedMax: 52,
  urgencyHero: 1.35,
  urgencyNear: 1.05,
};

/** @param {number} min @param {number} max */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

/** @param {number} value @param {number} min @param {number} max */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {'idle' | 'walk' | 'look' | 'sit'} next
 * @param {object} ctx
 */
function scheduleNext(next, ctx) {
  const roll = Math.random();

  if (next === 'after-idle') {
    if (roll < 0.12) return 'look';
    if (roll < 0.2) return 'sit';
    return 'walk';
  }

  if (next === 'after-walk') {
    if (roll < 0.22) return 'look';
    if (roll < 0.5) return 'idle';
    if (roll < 0.62) return 'sit';
    return 'walk';
  }

  if (next === 'after-look') {
    ctx.direction *= -1;
    return roll < 0.45 ? 'walk' : 'idle';
  }

  return 'idle';
}

export function initStatsCat() {
  const hero = document.querySelector('.page-hero-screen');
  const track = document.querySelector('.stats-cat-track');
  const walker = track?.querySelector('.stats-cat__walker');
  const sprite = walker?.querySelector('.stats-cat__sprite');
  if (!track || !walker || !sprite) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    walker.style.left = '50%';
    walker.style.transform = 'translateX(-50%)';
    return;
  }

  const ctx = {
    x: 0,
    direction: Math.random() < 0.5 ? 1 : -1,
    targetX: 0,
    walkSpeed: 20,
    state: 'idle',
    stateUntil: 0,
    lastTime: performance.now(),
    pointerX: null,
    pointerInHero: false,
    pointerNearTrack: false,
    resumeAutonomousAt: 0,
  };

  const bounds = () => ({
    min: 0,
    max: Math.max(0, track.clientWidth - CAT_WIDTH),
  });

  const setFacing = () => {
    sprite.style.transform = ctx.direction === 1 ? 'scaleX(1)' : 'scaleX(-1)';
  };

  const setPosition = () => {
    walker.style.left = `${ctx.x}px`;
  };

  const pointerTargetX = () => {
    if (ctx.pointerX === null) return null;
    const { min, max } = bounds();
    return clamp(ctx.pointerX, min, max);
  };

  const updatePointer = (clientX, clientY) => {
    const trackRect = track.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();

    ctx.pointerX = clientX - trackRect.left - CAT_WIDTH / 2;

    const inHero = Boolean(
      heroRect
      && clientX >= heroRect.left
      && clientX <= heroRect.right
      && clientY >= heroRect.top
      && clientY <= heroRect.bottom
    );

    const nearTrack = Math.abs(clientY - trackRect.top) < ATTRACT.nearTrackY
      && clientX >= trackRect.left - ATTRACT.nearTrackX
      && clientX <= trackRect.right + ATTRACT.nearTrackX;

    ctx.pointerInHero = inHero;
    ctx.pointerNearTrack = nearTrack;

    if (inHero || nearTrack) {
      ctx.resumeAutonomousAt = 0;
    }
  };

  const clearPointer = () => {
    ctx.pointerInHero = false;
    ctx.pointerNearTrack = false;
    ctx.resumeAutonomousAt = performance.now() + ATTRACT.fadeMs;
  };

  const isAttracted = () => {
    if (ctx.pointerInHero || ctx.pointerNearTrack) return true;
    if (ctx.resumeAutonomousAt && performance.now() < ctx.resumeAutonomousAt) return true;
    return false;
  };

  const attractionStrength = () => {
    if (ctx.pointerInHero) return ATTRACT.strengthHero;
    if (ctx.pointerNearTrack) return ATTRACT.strengthNear;
    if (ctx.resumeAutonomousAt) {
      const remaining = ctx.resumeAutonomousAt - performance.now();
      return clamp(remaining / ATTRACT.fadeMs, 0, 0.55) * 0.75;
    }
    return 0;
  };

  const pickTarget = () => {
    const { min, max } = bounds();
    const span = max - min;
    if (span <= 0) {
      ctx.targetX = 0;
      return;
    }

    if (Math.random() < 0.4) {
      const stroll = rand(36, Math.min(140, span * 0.35));
      ctx.targetX = clamp(ctx.x + ctx.direction * stroll, min, max);
    } else {
      ctx.targetX = rand(min + span * 0.08, max - span * 0.08);
    }

    ctx.direction = ctx.targetX >= ctx.x ? 1 : -1;
    ctx.walkSpeed = rand(10, 18);
    setFacing();
  };

  const enterIdle = (ms = rand(900, 2400)) => {
    ctx.state = 'idle';
    ctx.stateUntil = performance.now() + ms;
    sprite.classList.remove('stats-cat__sprite--walking');
    walker.classList.remove('stats-cat__walker--curious');
  };

  const enterSit = () => {
    ctx.state = 'sit';
    ctx.stateUntil = performance.now() + rand(2800, 5200);
    sprite.classList.remove('stats-cat__sprite--walking');
    walker.classList.add('stats-cat__walker--sit');
    walker.classList.remove('stats-cat__walker--curious');
  };

  const enterLook = () => {
    ctx.state = 'look';
    ctx.stateUntil = performance.now() + rand(500, 1100);
    sprite.classList.remove('stats-cat__sprite--walking');
    walker.classList.remove('stats-cat__walker--curious');
  };

  const enterWalk = () => {
    pickTarget();
    ctx.state = 'walk';
    sprite.classList.add('stats-cat__sprite--walking');
    walker.classList.remove('stats-cat__walker--sit');
    walker.classList.remove('stats-cat__walker--curious');
  };

  const clampX = () => {
    const { min, max } = bounds();
    ctx.x = clamp(ctx.x, min, max);
    setPosition();
  };

  /** @param {number} dt @returns {boolean} */
  const applyPointerPull = (dt) => {
    if (!isAttracted()) return false;

    const target = pointerTargetX();
    if (target === null) return false;

    const strength = attractionStrength();
    if (strength <= 0) return false;

    const dist = target - ctx.x;
    ctx.direction = dist >= 0 ? 1 : -1;
    setFacing();

    walker.classList.remove('stats-cat__walker--sit');

    if (Math.abs(dist) < ATTRACT.arriveDist) {
      ctx.state = 'curious';
      ctx.stateUntil = performance.now() + 1e9;
      sprite.classList.remove('stats-cat__sprite--walking');
      walker.classList.add('stats-cat__walker--curious');
      setPosition();
      return true;
    }

    ctx.state = 'attract';
    ctx.stateUntil = performance.now() + 1e9;
    const urgency = ctx.pointerInHero ? ATTRACT.urgencyHero : ATTRACT.urgencyNear;
    const speed = (
      ATTRACT.speedBase + Math.min(Math.abs(dist) * ATTRACT.speedDistFactor, ATTRACT.speedMax)
    ) * strength * urgency;
    const pace = speed * dt;
    let step = dist > 0 ? Math.min(pace, dist) : Math.max(-pace, dist);
    if (Math.abs(step) < 1.2) step = dist > 0 ? Math.min(1.2, dist) : Math.max(-1.2, dist);
    ctx.x += step;

    const { min, max } = bounds();
    ctx.x = clamp(ctx.x, min, max);

    sprite.classList.add('stats-cat__sprite--walking');
    walker.classList.remove('stats-cat__walker--curious');
    setPosition();
    return true;
  };

  const tick = (now) => {
    const dt = Math.min((now - ctx.lastTime) / 1000, 0.05);
    ctx.lastTime = now;

    if (applyPointerPull(dt)) {
      requestAnimationFrame(tick);
      return;
    }

    if (ctx.state === 'attract' || ctx.state === 'curious') {
      enterIdle(rand(500, 1200));
    }

    walker.classList.remove('stats-cat__walker--curious');

    switch (ctx.state) {
      case 'idle':
      case 'sit':
      case 'curious':
        if (now >= ctx.stateUntil) {
          walker.classList.remove('stats-cat__walker--sit');
          const next = scheduleNext('after-idle', ctx);
          if (next === 'look') enterLook();
          else if (next === 'sit') enterSit();
          else enterWalk();
        }
        break;

      case 'look':
        if (now >= ctx.stateUntil) {
          const next = scheduleNext('after-look', ctx);
          setFacing();
          if (next === 'walk') enterWalk();
          else enterIdle(rand(400, 1000));
        }
        break;

      case 'walk':
      case 'attract': {
        const dist = ctx.targetX - ctx.x;
        if (Math.abs(dist) < 1.5) {
          ctx.x = ctx.targetX;
          setPosition();
          const next = scheduleNext('after-walk', ctx);
          if (next === 'look') enterLook();
          else if (next === 'sit') enterSit();
          else if (next === 'walk') enterWalk();
          else enterIdle();
          break;
        }

        const pace = ctx.walkSpeed * dt * rand(0.92, 1.08);
        ctx.x += dist > 0 ? pace : -pace;

        const { min, max } = bounds();
        if (ctx.x <= min || ctx.x >= max) {
          ctx.x = clamp(ctx.x, min, max);
          setPosition();
          ctx.direction *= -1;
          setFacing();
          enterIdle(rand(700, 1800));
          break;
        }

        setPosition();
        break;
      }

      default:
        break;
    }

    requestAnimationFrame(tick);
  };

  const { max } = bounds();
  ctx.x = rand(0, max);
  setFacing();
  setPosition();
  enterIdle(rand(1200, 2200));

  window.addEventListener('resize', clampX);

  document.addEventListener('pointermove', (e) => {
    updatePointer(e.clientX, e.clientY);
  }, { passive: true });

  hero?.addEventListener('pointerleave', clearPointer);
  document.addEventListener('pointerleave', clearPointer);

  requestAnimationFrame(tick);
}
