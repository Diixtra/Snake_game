import { Game, WIDTH, HEIGHT } from './game';
import { QuizOverlay } from './quiz';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext('2d')!;

const game = new Game();
game.state = 'title';
const quiz = new QuizOverlay(document.getElementById('overlay')!);

game.onDeathSettled = () => {
  quiz.show(game.quizTier, (revived) => {
    if (revived) game.revive();
    else {
      game.sfx.wrong();
      game.gameOverFinal();
    }
  });
};

const DIRS: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

const muteBtn = document.getElementById('btn-mute')!;
const toggleMute = () => {
  muteBtn.textContent = game.sfx.toggleMute() ? '🔇' : '🔊';
};
// Never restart out from under the death animation or an open quiz.
const canRestart = () =>
  game.state === 'gameover' || game.state === 'playing' || game.state === 'paused';

window.addEventListener('keydown', (e) => {
  game.sfx.unlock();
  const dir = DIRS[e.code];
  if (dir) {
    e.preventDefault();
    if (game.state === 'title') game.reset();
    game.queueDirection(dir);
    return;
  }
  if (e.code === 'KeyP') game.togglePause();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyR' && canRestart()) game.reset();
});

muteBtn.addEventListener('click', () => {
  game.sfx.unlock();
  toggleMute();
});
document.getElementById('btn-restart')!.addEventListener('click', () => {
  game.sfx.unlock();
  if (game.state === 'title') game.reset();
  else if (canRestart()) game.reset();
});

// ---- touch: swipe anywhere on the canvas to steer, tap to start/pause ----
const SWIPE_PX = 24;
let anchor: { x: number; y: number } | null = null;
let swiped = false;

canvas.addEventListener(
  'touchstart',
  (e) => {
    game.sfx.unlock();
    const t = e.touches[0];
    anchor = { x: t.clientX, y: t.clientY };
    swiped = false;
  },
  { passive: true }
);

canvas.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
    if (!anchor) return;
    const t = e.touches[0];
    const dx = t.clientX - anchor.x;
    const dy = t.clientY - anchor.y;
    if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) return;
    const dir =
      Math.abs(dx) > Math.abs(dy)
        ? { x: Math.sign(dx), y: 0 }
        : { x: 0, y: Math.sign(dy) };
    if (game.state === 'title') game.reset();
    game.queueDirection(dir);
    // Re-anchor so a finger can chain turns without lifting.
    anchor = { x: t.clientX, y: t.clientY };
    swiped = true;
  },
  { passive: false }
);

canvas.addEventListener('touchend', () => {
  if (!swiped && anchor) {
    if (game.state === 'title' || game.state === 'gameover') game.reset();
    else if (game.state === 'playing' || game.state === 'paused') game.togglePause();
  }
  anchor = null;
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(100, now - last);
  last = now;
  game.update(dt, now);
  game.render(ctx, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
