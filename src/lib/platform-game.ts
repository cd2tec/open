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
const SOLID = '.btn, .chip, .card-thumb-tag, [data-card], .price-tag, .shelf, .on-blue, footer';

interface Platform {
  el: Element;
  left: number;
  right: number;
  top: number;
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
    '<span>Setas andam, ↓ desce, barra pula. Segure a barra para voar. Esc sai.</span>' +
    '<button type="button" class="chip">Sair</button>';

  document.body.append(sprite, hud);

  const origin = trigger.getBoundingClientRect();
  let x = origin.left + scrollX;
  let y = origin.bottom + scrollY - HEIGHT;
  trigger.hidden = true;
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
    else if (code === 'Space' || code === 'ArrowUp') {
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

  function releaseKeys() {
    Object.assign(keys, { left: false, right: false, down: false });
    jumpHeld = false;
  }

  function stop() {
    cancelAnimationFrame(frame);
    removeEventListener('keydown', onKeyDown);
    removeEventListener('keyup', onKeyUp);
    removeEventListener('blur', releaseKeys);
    removeEventListener('resize', measure);
    sprite.remove();
    hud.remove();
    trigger.hidden = false;
    trigger.focus({ preventScroll: true });
  }

  hud.querySelector('button')!.addEventListener('click', stop);
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('blur', releaseKeys);
  addEventListener('resize', measure);

  measure();
  frame = requestAnimationFrame(loop);
}
