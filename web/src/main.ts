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
  if (e.code === 'KeyM') game.sfx.toggleMute();
  if (e.code === 'KeyR' && (game.state === 'gameover' || game.state === 'playing')) game.reset();
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
