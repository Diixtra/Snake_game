import { Problem, ProblemBank, Tier, TIER_TIME } from './problems';

/**
 * DOM overlay shown on death: solve the problem before the timer runs out
 * to earn a continue. One problem, one submission.
 */
export class QuizOverlay {
  private root: HTMLElement;
  private bank = new ProblemBank();
  private timerId: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  show(tier: Tier, onResult: (revived: boolean) => void): void {
    const problem = this.bank.draw(tier);
    const seconds = TIER_TIME[tier];
    this.root.innerHTML = `
      <div class="quiz-card">
        <h2>💀 YOU CRASHED</h2>
        <span class="quiz-tier">${tier.toUpperCase()} · ${problem.language} · ${seconds}s</span>
        <p class="quiz-prompt">Solve this to buy your life back. ${this.escape(problem.prompt)}</p>
        ${problem.code ? `<pre>${this.escape(problem.code)}</pre>` : ''}
        <div class="quiz-row">
          <input type="text" autocomplete="off" spellcheck="false" placeholder="your answer…" />
          <button type="button">SUBMIT</button>
        </div>
        <div class="quiz-feedback"></div>
        <div class="quiz-timer"><div></div></div>
        <div class="quiz-meta">
          <span>hint: ${this.escape(problem.hint)}</span>
          <button type="button" class="quiz-giveup">accept death</button>
        </div>
      </div>`;
    this.root.classList.add('visible');

    const input = this.root.querySelector('input')!;
    const submit = this.root.querySelector<HTMLButtonElement>('.quiz-row button')!;
    const giveUp = this.root.querySelector<HTMLButtonElement>('.quiz-giveup')!;
    const feedback = this.root.querySelector<HTMLElement>('.quiz-feedback')!;
    const bar = this.root.querySelector<HTMLElement>('.quiz-timer > div')!;
    input.focus();

    const deadline = performance.now() + seconds * 1000;
    let settled = false;

    const finish = (revived: boolean, message: string) => {
      if (settled) return;
      settled = true;
      if (this.timerId !== null) window.clearInterval(this.timerId);
      this.timerId = null;
      input.disabled = true;
      submit.disabled = true;
      feedback.textContent = message;
      feedback.className = `quiz-feedback ${revived ? 'ok' : 'bad'}`;
      window.setTimeout(() => {
        this.root.classList.remove('visible');
        this.root.innerHTML = '';
        onResult(revived);
      }, 1400);
    };

    this.timerId = window.setInterval(() => {
      const remaining = deadline - performance.now();
      bar.style.transform = `scaleX(${Math.max(0, remaining / (seconds * 1000))})`;
      if (remaining <= 0) finish(false, '⏱ Out of time. The serpent rests.');
    }, 100);

    const attempt = () => {
      if (settled) return;
      if (this.bank.check(problem, input.value)) {
        finish(true, '✅ Correct — life restored!');
      } else {
        finish(false, `❌ Wrong. Accepted answer: ${problem.answers[0]}`);
      }
    };
    submit.addEventListener('click', attempt);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attempt();
      e.stopPropagation(); // don't steer the dead snake while typing
    });
    giveUp.addEventListener('click', () => finish(false, 'Rest in peace, brave serpent.'));
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

export type { Problem };
