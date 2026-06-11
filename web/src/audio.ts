// All sound is synthesized with WebAudio — no asset files to ship.

export class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  /** Browsers require a user gesture before audio can start. */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as any).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'square',
    gain = 0.06,
    slideTo?: number
  ): void {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  eat(combo: number): void {
    // Pitch climbs with the combo so streaks are audible.
    this.tone(330 + combo * 90, 0.09, 'square');
  }

  power(): void {
    this.tone(440, 0.1, 'sawtooth', 0.05, 880);
    this.tone(660, 0.18, 'sawtooth', 0.04, 1320);
  }

  star(): void {
    this.tone(880, 0.08, 'sine', 0.06, 1760);
    this.tone(1320, 0.2, 'sine', 0.05, 2640);
  }

  death(): void {
    this.tone(220, 0.5, 'sawtooth', 0.08, 40);
  }

  revive(): void {
    this.tone(262, 0.12, 'triangle', 0.07);
    this.tone(392, 0.12, 'triangle', 0.07, 523);
    this.tone(523, 0.3, 'triangle', 0.07, 784);
  }

  wrong(): void {
    this.tone(140, 0.3, 'square', 0.07, 90);
  }

  ui(): void {
    this.tone(600, 0.05, 'sine', 0.04);
  }
}
