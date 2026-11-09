import { ROBO_SVG } from './robo';

const WIDTH = 28;
const HEIGHT = 40;
const SPEED = 430;
const GRAVITY = 2300;
const JUMP = 960;
const DOUBLE_JUMP = 800;
const MAX_FALL = 1200;
const FLY_SPEED = 520;
const FLY_DELAY = 0.2;
const SOLID = '.btn, .chip, .card-thumb-tag, [data-card], .game-floor, .scene-shelf, .shelf, .on-blue, footer';

const SHOT_SPEED = 760;
const SHOT_LIFE = 1.1;
const SHOT_COOLDOWN = 0.24;
const SHOT_WIDTH = 21;
const SHOT_HEIGHT = 18;
const SHOT_MUZZLE = 30;
const MAX_SHOTS = 5;
const SHOOTABLE = 'h1 span, h2, h3, p, img, .btn, .chip, .card-thumb-tag, header a, footer a, a.chip';
const NEVER_SHOOT = '.cookies, dialog, .game-hud, .game-trigger, [data-scene]';
// Durante o jogo o clique é tiro; só estes continuam sendo clique de verdade.
const STILL_CLICKABLE = '.game-hud, .cookies, dialog';

const HEART = ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
const HEART_COLORS: Record<string, string> = { r: '#e3172f', w: '#f2f2f2' };
const HEART_SVG =
  '<svg viewBox="0 0 7 6" shape-rendering="crispEdges" aria-hidden="true">' +
  HEART.flatMap((row, y) =>
    [...row].map((c, x) => (HEART_COLORS[c] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${HEART_COLORS[c]}"/>` : '')),
  ).join('') +
  '</svg>';

const SPARK_COLORS = ['#dbff2a', '#e3172f', '#f2f2f2', '#dbff2a'];
const PIXEL_SIZES = [3, 4, 6, 8];

// Mosaico feito com filtro SVG: suaviza para cada célula representar a média da região, amostra um ponto
// por célula, estica até preencher e reduz a paleta. O limiar baixo no alfa evita que letra fina suma.
const FILTERS =
  '<svg class="game-filters" width="0" height="0" aria-hidden="true">' +
  PIXEL_SIZES.map((cell) => {
    const dot = cell % 2 ? 1 : 2;
    const reach = (cell - dot) / 2;
    const levels = '<feFuncR type="discrete" tableValues="0 .25 .5 .75 1"/><feFuncG type="discrete" tableValues="0 .25 .5 .75 1"/><feFuncB type="discrete" tableValues="0 .25 .5 .75 1"/><feFuncA type="discrete" tableValues="0 1 1 1"/>';
    return (
      `<filter id="eightbit-${cell}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
      `<feGaussianBlur in="SourceGraphic" stdDeviation="${cell / 4}" result="soft"/>` +
      `<feFlood x="${reach}" y="${reach}" width="${dot}" height="${dot}"/>` +
      `<feComposite width="${cell}" height="${cell}"/>` +
      '<feTile result="dots"/>' +
      '<feComposite in="soft" in2="dots" operator="in"/>' +
      `<feMorphology operator="dilate" radius="${reach}"/>` +
      `<feComponentTransfer>${levels}</feComponentTransfer>` +
      '</filter>'
    );
  }).join('') +
  '</svg>';

interface Platform {
  el: Element;
  left: number;
  right: number;
  top: number;
}

interface Target {
  el: HTMLElement;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Shot {
  el: HTMLElement;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  age: number;
}

/** Transforma a página em fase: os botões viram plataformas, e o robô só pisa neles, sem clicar em nada. */
export function startGame(trigger: HTMLElement): void {
  const sprite = document.createElement('div');
  sprite.className = 'game-sprite';
  sprite.innerHTML = ROBO_SVG;

  const hud = document.createElement('div');
  hud.className = 'game-hud';
  hud.setAttribute('role', 'status');
  hud.innerHTML =
    '<span>Setas andam, ↑ pula, segure ↑ para voar, ↓ desce. Barra ou clique atira. Esc sai.</span>' +
    '<button type="button" class="chip">Sair</button>';

  const filters = document.createElement('div');
  filters.innerHTML = FILTERS;

  document.body.append(sprite, hud, filters);

  const origin = trigger.getBoundingClientRect();
  let x = origin.left + scrollX;
  let y = origin.bottom + scrollY - HEIGHT;
  // Só some de vista: o lugar dele continua reservado, para o topo da página não pular.
  trigger.style.visibility = 'hidden';
  (document.activeElement as HTMLElement | null)?.blur();

  const keys = { left: false, right: false, down: false };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vy = 0;
  let jumps = 0;
  let grounded = false;
  let wantsJump = false;
  let jumpHeld = false;
  let heldFor = 0;
  let caped = false;
  let idleClock = 0;
  let flutterClock = 0;
  let facing = 1;
  let platforms: Platform[] = [];
  let targets: Target[] = [];
  const shots: Shot[] = [];
  let firing = false;
  let keyQueued = false;
  let mouseHeld = false;
  let aimQueued = false;
  let pointerX = 0;
  let pointerY = 0;
  let cooldown = 0;
  let ground = 0;
  let last = performance.now();
  let walkClock = 0;
  let measureClock = 0;
  let frame = 0;

  const measure = () => {
    platforms = [...document.querySelectorAll(SOLID)]
      .filter((el) => el.getClientRects().length > 0 && !el.closest('.cookies, dialog, .game-hud'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return { el, left: rect.left + scrollX, right: rect.right + scrollX, top: rect.top + scrollY };
      });
    ground = document.documentElement.scrollHeight;
    targets = [...document.querySelectorAll<HTMLElement>(SHOOTABLE)]
      .filter((el) => el.getClientRects().length > 0 && !el.closest(NEVER_SHOOT) && !el.closest('.eightbit'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          el,
          left: rect.left + scrollX,
          right: rect.right + scrollX,
          top: rect.top + scrollY,
          bottom: rect.bottom + scrollY,
        };
      });
  };

  const removeShot = (index: number) => {
    shots[index].el.remove();
    shots.splice(index, 1);
  };

  // Com mira, o tiro sai do robô em direção ao ponteiro, e ele se vira para esse lado.
  const fire = (aimed: boolean) => {
    const el = document.createElement('div');
    el.className = 'game-shot';
    el.innerHTML = HEART_SVG;
    document.body.append(el);

    const centerX = x + WIDTH / 2;
    const centerY = y + 20;
    let dirX = facing;
    let dirY = 0;
    if (aimed) {
      const dx = pointerX + scrollX - centerX;
      const dy = pointerY + scrollY - centerY;
      const length = Math.hypot(dx, dy) || 1;
      dirX = dx / length;
      dirY = dy / length;
      if (dx !== 0) facing = Math.sign(dx);
    }

    shots.push({
      el,
      x: centerX - SHOT_WIDTH / 2 + dirX * SHOT_MUZZLE,
      y: centerY - SHOT_HEIGHT / 2 + dirY * SHOT_MUZZLE,
      dirX,
      dirY,
      age: 0,
    });
  };

  const sparkle = (centerX: number, centerY: number) => {
    if (reducedMotion) return;
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('div');
      const angle = (Math.PI * 2 * i) / 8;
      spark.className = 'game-spark';
      spark.style.left = `${centerX}px`;
      spark.style.top = `${centerY}px`;
      spark.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
      spark.style.setProperty('--dx', `${Math.round(Math.cos(angle) * 44)}px`);
      spark.style.setProperty('--dy', `${Math.round(Math.sin(angle) * 44)}px`);
      spark.addEventListener('animationend', () => spark.remove());
      document.body.append(spark);
    }
  };

  // Quanto maior o elemento, maior o pixel, para o título não virar borrão e o texto miúdo ainda dar para ler.
  const pixelSize = (el: HTMLElement) => {
    if (el.matches('img')) return 6;
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    if (fontSize >= 48) return 8;
    return fontSize >= 22 ? 4 : 3;
  };

  const transform = (target: Target) => {
    target.el.classList.add('eightbit');
    target.el.style.filter = `url(#eightbit-${pixelSize(target.el)})`;
    targets = targets.filter((t) => !t.el.closest('.eightbit'));
  };

  const updateShots = (dt: number) => {
    cooldown = Math.max(0, cooldown - dt);
    const aiming = mouseHeld || aimQueued;
    if ((firing || keyQueued || aiming) && cooldown === 0 && shots.length < MAX_SHOTS) {
      fire(aiming);
      cooldown = SHOT_COOLDOWN;
      keyQueued = false;
      aimQueued = false;
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const shot = shots[i];
      shot.age += dt;
      shot.x += shot.dirX * SHOT_SPEED * dt;
      shot.y += shot.dirY * SHOT_SPEED * dt;
      // A ondulação é sempre de lado em relação ao caminho do coração.
      const wobble = Math.round(Math.sin(shot.age * 22) * 1.5) * 3;
      const drawX = Math.round(shot.x - shot.dirY * wobble);
      const drawY = Math.round(shot.y + shot.dirX * wobble);
      shot.el.style.transform = `translate3d(${drawX}px, ${drawY}px, 0)`;

      const right = shot.x + SHOT_WIDTH;
      const bottom = shot.y + SHOT_HEIGHT;
      // Se o tiro pega vários ao mesmo tempo, transforma o mais específico.
      const hit = targets
        .filter((t) => right > t.left && shot.x < t.right && bottom > t.top && shot.y < t.bottom)
        .sort((a, b) => (a.right - a.left) * (a.bottom - a.top) - (b.right - b.left) * (b.bottom - b.top))[0];

      if (hit) {
        transform(hit);
        sparkle(shot.x + SHOT_WIDTH / 2, shot.y + SHOT_HEIGHT / 2);
        removeShot(i);
      } else if (
        shot.age > SHOT_LIFE ||
        shot.x < -SHOT_WIDTH ||
        shot.x > document.documentElement.clientWidth ||
        shot.y < -SHOT_HEIGHT ||
        shot.y > ground
      ) {
        removeShot(i);
      }
    }
  };

  const boing = (el: Element) => {
    if (!el.matches('.btn, .chip')) return;
    el.classList.add('game-boing');
    window.setTimeout(() => el.classList.remove('game-boing'), 180);
  };

  const step = (dt: number) => {
    const direction = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (direction) facing = direction;

    if (wantsJump && jumps < 2) {
      vy = -(jumps === 0 ? JUMP : DOUBLE_JUMP);
      jumps += 1;
      grounded = false;
    }
    wantsJump = false;

    if (jumpHeld) heldFor += dt;
    const flying = jumpHeld && heldFor > FLY_DELAY;

    x = Math.min(document.documentElement.clientWidth - WIDTH, Math.max(0, x + direction * SPEED * dt));
    if (flying) {
      vy += (-FLY_SPEED - vy) * Math.min(1, dt * 9);
      caped = true;
      jumps = 2;
    } else {
      vy = Math.min(MAX_FALL, vy + GRAVITY * dt);
    }
    const previousBottom = y + HEIGHT;
    y += vy * dt;
    if (y < 0) {
      y = 0;
      vy = Math.max(vy, 0);
    }
    const bottom = y + HEIGHT;

    // As plataformas só seguram quem vem de cima, então dá para atravessar pulando.
    let landing: Platform | undefined;
    if (vy >= 0 && !keys.down) {
      for (const p of platforms) {
        const overlaps = x + WIDTH > p.left && x < p.right;
        if (overlaps && previousBottom <= p.top + 1 && bottom >= p.top && (!landing || p.top < landing.top)) landing = p;
      }
    }

    if (!flying && (landing || bottom >= ground)) {
      y = (landing ? landing.top : ground) - HEIGHT;
      if (landing && !grounded) boing(landing.el);
      vy = 0;
      jumps = 0;
      grounded = true;
      caped = false;
    } else {
      grounded = false;
    }

    walkClock = direction && grounded ? walkClock + dt : 0;
    const legsApart = !grounded || Math.floor(walkClock / 0.12) % 2 === 1;
    idleClock = direction || !grounded ? 0 : idleClock + dt;
    flutterClock += dt;
    const robo = sprite.firstElementChild!.classList;
    robo.toggle('walk', legsApart);
    robo.toggle('flip', facing < 0);
    robo.toggle('caped', caped);
    robo.toggle('flutter', Math.floor(flutterClock / 0.09) % 2 === 1);
    robo.toggle('idle', idleClock > 2);
    sprite.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  };

  // A câmera sobe e desce com o robô, sempre com folga acima e abaixo dele.
  const followCamera = (dt: number) => {
    const margin = innerHeight * 0.3;
    let target = scrollY;
    if (y < scrollY + margin) target = y - margin;
    else if (y + HEIGHT > scrollY + innerHeight - margin) target = y + HEIGHT - innerHeight + margin;
    if (Math.abs(target - scrollY) < 1) return;
    const next = reducedMotion ? target : scrollY + (target - scrollY) * Math.min(1, dt * 10);
    window.scrollTo(0, next < scrollY ? Math.floor(next) : Math.ceil(next));
  };

  const loop = (now: number) => {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    measureClock += dt;
    if (measureClock > 0.5) {
      measureClock = 0;
      measure();
    }
    if (!document.querySelector('dialog[open]')) {
      step(dt);
      updateShots(dt);
      followCamera(dt);
    } else {
      releaseKeys();
    }
    frame = requestAnimationFrame(loop);
  };

  const onKey = (down: boolean) => (event: KeyboardEvent) => {
    if (document.querySelector('dialog[open]')) return;
    const { code } = event;
    if (code === 'Escape') return stop();
    if (code === 'ArrowLeft') keys.left = down;
    else if (code === 'ArrowRight') keys.right = down;
    else if (code === 'ArrowDown') keys.down = down;
    else if (code === 'Space') {
      firing = down;
      if (down && !event.repeat) keyQueued = true;
    } else if (code === 'ArrowUp') {
      if (down && !event.repeat) {
        wantsJump = true;
        jumpHeld = true;
        heldFor = 0;
      }
      if (!down) {
        jumpHeld = false;
        // Soltar a barra cedo faz um pulo curto.
        if (vy < -350) vy *= 0.55;
      }
    } else return;
    event.preventDefault();
  };

  const onKeyDown = onKey(true);
  const onKeyUp = onKey(false);

  const trackPointer = (event: PointerEvent) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  };

  const isRealClick = (event: Event) =>
    Boolean((event.target as Element | null)?.closest?.(STILL_CLICKABLE)) || Boolean(document.querySelector('dialog[open]'));

  // Tudo em captura, antes de o clique chegar em link, botão ou produto da gôndola.
  const onPointerDown = (event: PointerEvent) => {
    if (isRealClick(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || event.ctrlKey) return;
    trackPointer(event);
    mouseHeld = true;
    aimQueued = true;
  };

  const onPointerMove = (event: PointerEvent) => {
    trackPointer(event);
    if (!(event.buttons & 1)) mouseHeld = false;
  };

  const onPointerUp = () => {
    mouseHeld = false;
  };

  const blockMouse = (event: Event) => {
    if (isRealClick(event)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  function releaseKeys() {
    Object.assign(keys, { left: false, right: false, down: false });
    jumpHeld = false;
    firing = false;
    keyQueued = false;
    mouseHeld = false;
    aimQueued = false;
  }

  function stop() {
    cancelAnimationFrame(frame);
    removeEventListener('keydown', onKeyDown);
    removeEventListener('keyup', onKeyUp);
    removeEventListener('blur', releaseKeys);
    removeEventListener('resize', measure);
    removeEventListener('pointerdown', onPointerDown, true);
    removeEventListener('pointermove', onPointerMove);
    removeEventListener('pointerup', onPointerUp);
    removeEventListener('mousedown', blockMouse, true);
    removeEventListener('click', blockMouse, true);
    document.documentElement.classList.remove('game-on');
    sprite.remove();
    hud.remove();
    shots.forEach((shot) => shot.el.remove());
    document.querySelectorAll('.game-spark').forEach((spark) => spark.remove());
    // Ao sair, a página volta a ser o que era.
    document.querySelectorAll<HTMLElement>('.eightbit').forEach((el) => {
      el.classList.remove('eightbit');
      el.style.removeProperty('filter');
    });
    filters.remove();
    trigger.style.visibility = '';
    trigger.focus({ preventScroll: true });
  }

  hud.querySelector('button')!.addEventListener('click', stop);
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('blur', releaseKeys);
  addEventListener('resize', measure);
  addEventListener('pointerdown', onPointerDown, true);
  addEventListener('pointermove', onPointerMove);
  addEventListener('pointerup', onPointerUp);
  addEventListener('mousedown', blockMouse, true);
  addEventListener('click', blockMouse, true);
  document.documentElement.classList.add('game-on');

  measure();
  frame = requestAnimationFrame(loop);
}
