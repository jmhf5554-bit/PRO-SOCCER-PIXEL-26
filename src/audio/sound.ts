// Procedural Web Audio API sound engine

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(c: AudioContext, duration: number): AudioBuffer {
    const len = Math.floor(c.sampleRate * duration);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  playWhistle(type: 'kickoff' | 'foul' | 'goal' | 'fulltime' = 'kickoff') {
    const c = this.ensure();
    if (!c) return;
    const now = c.currentTime;
    const blasts = type === 'fulltime' ? [0, 0.24, 0.48] : [0];
    const baseDur = type === 'fulltime' ? 0.16 : type === 'kickoff' ? 0.34 : 0.22;

    blasts.forEach((offset, idx) => {
      const t = now + offset;
      const d = type === 'fulltime' && idx === 2 ? 0.42 : baseDur;
      const osc1 = c.createOscillator();
      const osc2 = c.createOscillator();
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      const master = c.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(2820, t);
      osc2.frequency.setValueAtTime(2970, t);

      lfo.frequency.setValueAtTime(42, t);
      lfoGain.gain.setValueAtTime(110, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);

      master.gain.setValueAtTime(0.001, t);
      master.gain.linearRampToValueAtTime(0.14, t + 0.02);
      master.gain.setValueAtTime(0.14, t + d - 0.04);
      master.gain.exponentialRampToValueAtTime(0.001, t + d);

      osc1.connect(master);
      osc2.connect(master);
      master.connect(c.destination);

      osc1.start(t);
      osc2.start(t);
      lfo.start(t);
      osc1.stop(t + d + 0.02);
      osc2.stop(t + d + 0.02);
      lfo.stop(t + d + 0.02);
    });
  }

  playKick(power = 0.4) {
    const c = this.ensure();
    if (!c) return;
    const t = c.currentTime;
    const p = Math.max(0.2, Math.min(1, power));

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125 + p * 65, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.09 + p * 0.06);
    gain.gain.setValueAtTime(0.22 + p * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12 + p * 0.06);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);

    const src = c.createBufferSource();
    src.buffer = this.createNoiseBuffer(c, 0.07);
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(900 + p * 700, t);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.12 + p * 0.16, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(filt);
    filt.connect(ng);
    ng.connect(c.destination);
    src.start(t);
  }

  playTackle() {
    const c = this.ensure();
    if (!c) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.createNoiseBuffer(c, 0.22);
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1400, t);
    filt.frequency.exponentialRampToValueAtTime(320, t + 0.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.21);
    src.connect(filt);
    filt.connect(g);
    g.connect(c.destination);
    src.start(t);
  }

  playPostClang() {
    const c = this.ensure();
    if (!c) return;
    const t = c.currentTime;
    [520, 815, 1340].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.14 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  playGoalCelebration() {
    const c = this.ensure();
    if (!c) return;
    const t = c.currentTime;

    const crowdSrc = c.createBufferSource();
    crowdSrc.buffer = this.createNoiseBuffer(c, 2.4);
    const crowdFilt = c.createBiquadFilter();
    crowdFilt.type = 'bandpass';
    crowdFilt.frequency.setValueAtTime(680, t);
    crowdFilt.Q.setValueAtTime(0.65, t);
    const crowdGain = c.createGain();
    crowdGain.gain.setValueAtTime(0.01, t);
    crowdGain.gain.linearRampToValueAtTime(0.24, t + 0.25);
    crowdGain.gain.setValueAtTime(0.22, t + 1.3);
    crowdGain.gain.exponentialRampToValueAtTime(0.001, t + 2.35);
    crowdSrc.connect(crowdFilt);
    crowdFilt.connect(crowdGain);
    crowdGain.connect(c.destination);
    crowdSrc.start(t);

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const nt = t + i * 0.11;
      const dur = i === notes.length - 1 ? 0.55 : 0.13;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, nt);
      g.gain.setValueAtTime(0.001, nt);
      g.gain.linearRampToValueAtTime(0.08, nt + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, nt + dur);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(nt);
      osc.stop(nt + dur + 0.02);
    });
  }

  playSelectBeep(high = true) {
    const c = this.ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(high ? 660 : 440, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playTargetHit() {
    const c = this.ensure();
    if (!c) return;
    const t = c.currentTime;
    [784, 1046.5, 1318.5].forEach((freq, i) => {
      const nt = t + i * 0.055;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, nt);
      g.gain.setValueAtTime(0.11, nt);
      g.gain.exponentialRampToValueAtTime(0.001, nt + 0.16);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(nt);
      osc.stop(nt + 0.18);
    });
  }

  setMuted(val: boolean) {
    this.muted = val;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}

export const AudioFX = new SoundEngine();
