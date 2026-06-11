import { Effects } from './effects';
import { Sfx } from './audio';
import { tierForLength } from './problems';

export const COLS = 40;
export const ROWS = 30;
export const CELL = 20;
export const WIDTH = COLS * CELL;
export const HEIGHT = ROWS * CELL;

const BASE_TICKS_PER_SEC = 8;
const SPEED_TICKS_PER_SEC = 13;
const COMBO_WINDOW_TICKS = 32; // eat again within ~4s to keep the streak
const STAR_TTL_MS = 8000;

type Vec = { x: number; y: number };
export type FoodType = 'normal' | 'speed' | 'double' | 'invincible' | 'star';
export type GameState = 'title' | 'playing' | 'paused' | 'dying' | 'quiz' | 'gameover';

interface FoodItem {
  pos: Vec;
  type: FoodType;
  born: number;
}

const FOOD_COLOR: Record<FoodType, string> = {
  normal: '#ff4d6d',
  speed: '#5ad7ff',
  double: '#39ff88',
  invincible: '#ffd84d',
  star: '#ff9df5',
};

const FOOD_POINTS: Record<FoodType, number> = {
  normal: 10,
  speed: 10,
  double: 20,
  invincible: 10,
  star: 50,
};

export class Game {
  state: GameState = 'title';
  score = 0;
  revives = 0;
  snake: Vec[] = [];
  private dir: Vec = { x: 1, y: 0 };
  private dirQueue: Vec[] = [];
  private foods: FoodItem[] = [];
  private tickAcc = 0;
  private ticksPerSec = BASE_TICKS_PER_SEC;
  private powerUpTicks = 0;
  private invincible = false;
  private graceTicks = 0; // post-revive safety
  private combo = 1;
  private comboTicks = 0;
  private deathAt = 0;
  private hue = 0;

  readonly fx = new Effects();
  readonly sfx = new Sfx();

  /** Fired once the death animation finishes; main.ts opens the quiz. */
  onDeathSettled: () => void = () => {};

  constructor() {
    this.reset();
  }

  reset(): void {
    this.snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
    this.dir = { x: 1, y: 0 };
    this.dirQueue = [];
    this.score = 0;
    this.revives = 0;
    this.combo = 1;
    this.comboTicks = 0;
    this.ticksPerSec = BASE_TICKS_PER_SEC;
    this.powerUpTicks = 0;
    this.invincible = false;
    this.graceTicks = 0;
    this.foods = [];
    this.spawnFood('any');
    this.state = 'playing';
  }

  queueDirection(d: Vec): void {
    const last = this.dirQueue[this.dirQueue.length - 1] ?? this.dir;
    if (d.x === -last.x && d.y === -last.y) return; // no instant reversal
    if (d.x === last.x && d.y === last.y) return;
    if (this.dirQueue.length < 3) this.dirQueue.push(d);
  }

  togglePause(): void {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
  }

  /** The quiz was answered correctly: trim the snake as the price and resume. */
  revive(): void {
    this.revives++;
    const keep = Math.min(COLS - 2, Math.max(3, Math.floor(this.snake.length / 2)));
    this.snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
    for (let i = 1; i < keep; i++) {
      this.snake.push({ x: (this.snake[0].x - i + COLS) % COLS, y: this.snake[0].y });
    }
    this.dir = { x: 1, y: 0 };
    this.dirQueue = [];
    this.ticksPerSec = BASE_TICKS_PER_SEC;
    this.powerUpTicks = 0;
    this.invincible = false;
    this.graceTicks = BASE_TICKS_PER_SEC * 2; // 2s of mercy after respawn
    this.combo = 1;
    this.comboTicks = 0;
    this.foods = this.foods.filter((f) => !this.snake.some((s) => s.x === f.pos.x && s.y === f.pos.y));
    if (!this.foods.some((f) => f.type !== 'star')) this.spawnFood('any');
    this.fx.burst(this.headPx().x, this.headPx().y, '#39ff88', 30, 220);
    this.sfx.revive();
    this.state = 'playing';
  }

  gameOverFinal(): void {
    this.state = 'gameover';
  }

  update(dtMs: number, now: number): void {
    const dt = dtMs / 1000;
    this.fx.update(dt);
    this.hue = (this.hue + dt * 60) % 360;

    if (this.state === 'dying' && now - this.deathAt > 1100) {
      this.state = 'quiz';
      this.onDeathSettled();
    }
    if (this.state !== 'playing') return;

    // Star food expires.
    this.foods = this.foods.filter((f) => f.type !== 'star' || now - f.born < STAR_TTL_MS);

    this.tickAcc += dtMs;
    const interval = 1000 / this.ticksPerSec;
    while (this.tickAcc >= interval) {
      this.tickAcc -= interval;
      this.step(now);
      if (this.state !== 'playing') break;
    }
  }

  private step(now: number): void {
    const next = this.dirQueue.shift();
    if (next) this.dir = next;

    const head = this.snake[0];
    let nx = head.x + this.dir.x;
    let ny = head.y + this.dir.y;

    if (this.invincible || this.graceTicks > 0) {
      // Pass through walls while charmed.
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      this.die();
      return;
    }

    const newHead = { x: nx, y: ny };
    const selfHit = this.snake.some((s) => s.x === nx && s.y === ny);
    if (selfHit && !this.invincible && this.graceTicks === 0) {
      this.die();
      return;
    }

    this.snake.unshift(newHead);

    const eaten = this.foods.findIndex((f) => f.pos.x === nx && f.pos.y === ny);
    if (eaten >= 0) {
      this.eat(this.foods[eaten], now);
      this.foods.splice(eaten, 1);
      if (!this.foods.some((f) => f.type !== 'star')) this.spawnFood('regular');
      if (this.foods.length < 2 && Math.random() < 0.18) this.spawnFood('star');
    } else {
      this.snake.pop();
    }

    if (this.comboTicks > 0) {
      this.comboTicks--;
      if (this.comboTicks === 0) this.combo = 1;
    }
    if (this.powerUpTicks > 0) {
      this.powerUpTicks--;
      if (this.powerUpTicks === 0) {
        this.ticksPerSec = BASE_TICKS_PER_SEC;
        this.invincible = false;
      }
    }
    if (this.graceTicks > 0) this.graceTicks--;
  }

  private eat(food: FoodItem, now: number): void {
    const px = this.cellPx(food.pos);
    const gained = FOOD_POINTS[food.type] * this.combo;
    this.score += gained;
    this.fx.burst(px.x, px.y, FOOD_COLOR[food.type], food.type === 'star' ? 28 : 16);
    this.fx.floatText(px.x, px.y - 8, `+${gained}${this.combo > 1 ? ` ×${this.combo}` : ''}`, FOOD_COLOR[food.type]);
    this.fx.kick(food.type === 'star' ? 6 : 3);

    this.combo = Math.min(5, this.comboTicks > 0 ? this.combo + 1 : this.combo);
    this.comboTicks = COMBO_WINDOW_TICKS;

    switch (food.type) {
      case 'speed':
        this.ticksPerSec = SPEED_TICKS_PER_SEC;
        this.powerUpTicks = SPEED_TICKS_PER_SEC * 5;
        this.invincible = false;
        this.sfx.power();
        break;
      case 'invincible':
        this.invincible = true;
        this.powerUpTicks = this.ticksPerSec * 4;
        this.sfx.power();
        break;
      case 'star':
        this.sfx.star();
        break;
      default:
        this.sfx.eat(this.combo);
    }
    void now;
  }

  private die(): void {
    this.state = 'dying';
    this.deathAt = performance.now();
    this.sfx.death();
    this.fx.kick(18);
    for (const seg of this.snake) {
      const px = this.cellPx(seg);
      this.fx.burst(px.x, px.y, '#39ff88', 5, 200);
    }
  }

  private spawnFood(kind: 'any' | 'regular' | 'star'): void {
    const type: FoodType =
      kind === 'star'
        ? 'star'
        : (['normal', 'normal', 'normal', 'speed', 'double', 'invincible'] as FoodType[])[
            Math.floor(Math.random() * 6)
          ];
    for (let tries = 0; tries < 500; tries++) {
      const pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      const clash =
        this.snake.some((s) => s.x === pos.x && s.y === pos.y) ||
        this.foods.some((f) => f.pos.x === pos.x && f.pos.y === pos.y);
      if (!clash) {
        this.foods.push({ pos, type, born: performance.now() });
        return;
      }
    }
  }

  get quizTier() {
    return tierForLength(this.snake.length);
  }

  private cellPx(v: Vec): Vec {
    return { x: v.x * CELL + CELL / 2, y: v.y * CELL + CELL / 2 };
  }

  private headPx(): Vec {
    return this.cellPx(this.snake[0]);
  }

  // ---------------- rendering ----------------

  render(ctx: CanvasRenderingContext2D, now: number): void {
    ctx.save();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const [sx, sy] = this.fx.offset();
    ctx.translate(sx, sy);

    this.drawBackground(ctx, now);

    if (this.state !== 'gameover' && this.state !== 'title') {
      this.drawFood(ctx, now);
      if (this.state !== 'quiz') this.drawSnake(ctx, now);
    }

    this.fx.render(ctx);
    this.drawHud(ctx);

    if (this.state === 'title') this.drawCenterText(ctx, 'NEON SERPENT', 'swipe or press an arrow key to slither');
    if (this.state === 'paused') this.drawCenterText(ctx, 'PAUSED', 'tap or press P to resume');
    if (this.state === 'gameover')
      this.drawCenterText(
        ctx,
        `GAME OVER — ${this.score}`,
        `${this.revives} extra ${this.revives === 1 ? 'life' : 'lives'} earned by code · tap or press R to restart`
      );
    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, now: number): void {
    const pulse = 0.04 + 0.02 * Math.sin(now / 900);
    ctx.strokeStyle = `rgba(90, 215, 255, ${pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, HEIGHT);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(WIDTH, y * CELL);
    }
    ctx.stroke();
  }

  private drawFood(ctx: CanvasRenderingContext2D, now: number): void {
    for (const f of this.foods) {
      const cx = f.pos.x * CELL + CELL / 2;
      const cy = f.pos.y * CELL + CELL / 2;
      const pulse = 1 + 0.18 * Math.sin(now / 160 + f.pos.x);
      const r = (CELL / 2 - 3) * pulse;
      ctx.fillStyle = FOOD_COLOR[f.type];
      ctx.shadowColor = FOOD_COLOR[f.type];
      ctx.shadowBlur = 16;
      if (f.type === 'star') {
        this.drawStar(ctx, cx, cy, r + 2, now);
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, now: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(now / 600);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawSnake(ctx: CanvasRenderingContext2D, now: number): void {
    const n = this.snake.length;
    const flicker = this.graceTicks > 0 && Math.floor(now / 90) % 2 === 0;
    if (flicker) return;
    for (let i = n - 1; i >= 0; i--) {
      const seg = this.snake[i];
      const t = i / Math.max(1, n - 1);
      let color: string;
      if (this.invincible) {
        color = `hsl(${(this.hue * 4 + i * 14) % 360}, 100%, 60%)`;
      } else {
        color = `hsl(${140 - t * 45}, 90%, ${56 - t * 22}%)`;
      }
      const pad = 1.5 + t * 2;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = i === 0 ? 18 : 8;
      this.roundRect(ctx, seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 5);
    }
    ctx.shadowBlur = 0;
    // eyes on the head, looking where we're going
    const h = this.snake[0];
    const cx = h.x * CELL + CELL / 2;
    const cy = h.y * CELL + CELL / 2;
    const ex = this.dir.y !== 0 ? 4 : 0;
    const ey = this.dir.x !== 0 ? 4 : 0;
    ctx.fillStyle = '#04060c';
    ctx.beginPath();
    ctx.arc(cx - ex + this.dir.x * 3, cy - ey + this.dir.y * 3, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + ex + this.dir.x * 3, cy + ey + this.dir.y * 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#d7e4ff';
    ctx.fillText(`SCORE ${this.score}`, 12, 24);
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(215, 228, 255, 0.7)';
    ctx.fillText(`length ${this.snake.length} · quiz tier ${this.quizTier.toUpperCase()}`, 12, 42);
    if (this.combo > 1) {
      ctx.fillStyle = '#ffd84d';
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.fillText(`COMBO ×${this.combo}`, 12, 62);
    }
    if (this.invincible) {
      ctx.textAlign = 'right';
      ctx.fillStyle = `hsl(${this.hue * 4}, 100%, 65%)`;
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText('INVINCIBLE — walls are a suggestion', WIDTH - 12, 24);
    } else if (this.ticksPerSec > BASE_TICKS_PER_SEC) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#5ad7ff';
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText('SPEED BOOST', WIDTH - 12, 24);
    }
    if (this.revives > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(57, 255, 136, 0.8)';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText(`revives ${this.revives}`, WIDTH - 12, HEIGHT - 10);
    }
  }

  private drawCenterText(ctx: CanvasRenderingContext2D, big: string, small: string): void {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#39ff88';
    ctx.shadowColor = '#39ff88';
    ctx.shadowBlur = 22;
    ctx.font = 'bold 42px "Segoe UI", sans-serif';
    ctx.fillText(big, WIDTH / 2, HEIGHT / 2 - 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(215, 228, 255, 0.85)';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText(small, WIDTH / 2, HEIGHT / 2 + 24);
  }
}
