// Web Audio API Procedural Sound Synthesizer
// Completely self-contained - zero external asset dependencies

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private isAmbientPlaying: boolean = false;

  private initCtx() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ---- Continuous loops (burner hiss, stirrer hum, centrifuge whine, bubbling, room tone) ----
  private loops = new Map<string, { gain: GainNode; stop: () => void }>();
  private noise: AudioBuffer | null = null;
  private bubbleTimer: ReturnType<typeof setInterval> | null = null;
  private bubbleLevel = 0;

  private noiseBuffer(ctx: AudioContext) {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private makeLoop(name: string, ctx: AudioContext) {
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    const nodes: AudioScheduledSourceNode[] = [];
    const noiseSrc = () => {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer(ctx);
      n.loop = true;
      nodes.push(n);
      return n;
    };
    if (name === 'burner' || name === 'burnerBlue') {
      const n = noiseSrc();
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = name === 'burner' ? 700 : 1600;
      band.Q.value = 0.6;
      n.connect(band).connect(out);
      if (name === 'burnerBlue') {
        // the roar of a fully aerated flame
        const n2 = noiseSrc();
        const low = ctx.createBiquadFilter();
        low.type = 'lowpass';
        low.frequency.value = 180;
        const g = ctx.createGain();
        g.gain.value = 2.5;
        n2.connect(low).connect(g).connect(out);
      }
    } else if (name === 'stirrer') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 118;
      const o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = 236;
      const g2 = ctx.createGain();
      g2.gain.value = 0.3;
      o.connect(out);
      o2.connect(g2).connect(out);
      nodes.push(o, o2);
    } else if (name === 'centrifuge') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 190;
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 900;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 4;
      lfo.connect(lfoGain).connect(o.frequency);
      o.connect(low).connect(out);
      nodes.push(o, lfo);
    } else if (name === 'ambience') {
      // ventilation / fume hood extract: soft low rumble
      const n = noiseSrc();
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 260;
      n.connect(low).connect(out);
    }
    nodes.forEach((n) => n.start());
    const loop = { gain: out, stop: () => nodes.forEach((n) => n.stop()) };
    this.loops.set(name, loop);
    return loop;
  }

  private static LOOP_VOLUME: Record<string, number> = { burner: 0.05, burnerBlue: 0.06, stirrer: 0.018, centrifuge: 0.02, ambience: 0.03 };

  /** Fade a continuous sound to `level` (0 = silent, 1 = full). Loops are created on first use. */
  public setLoop(name: 'burner' | 'burnerBlue' | 'stirrer' | 'centrifuge' | 'ambience' | 'bubbles', level: number) {
    if (name === 'bubbles') return this.setBubbles(level);
    const ctx = this.initCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {}); // browsers start audio only after a tap/click
    if (level <= 0 && !this.loops.has(name)) return;
    const loop = this.loops.get(name) ?? this.makeLoop(name, ctx);
    const target = this.isMuted ? 0 : level * (SoundEffectsManager.LOOP_VOLUME[name] ?? 0.03);
    loop.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.25);
  }

  /** Random small bubble blips (titration flask, reaction fizz) while level > 0. */
  private setBubbles(level: number) {
    this.bubbleLevel = this.isMuted ? 0 : level;
    if (this.bubbleLevel > 0 && !this.bubbleTimer) {
      this.bubbleTimer = setInterval(() => {
        const ctx = this.ctx;
        if (!ctx || this.bubbleLevel <= 0 || Math.random() > this.bubbleLevel) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        const f = 500 + Math.random() * 900;
        o.frequency.setValueAtTime(f, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(f * 1.8, ctx.currentTime + 0.05);
        g.gain.setValueAtTime(0.012, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + 0.06);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.07);
      }, 120);
    } else if (this.bubbleLevel <= 0 && this.bubbleTimer) {
      clearInterval(this.bubbleTimer);
      this.bubbleTimer = null;
    }
  }

  /** Silence and free all loops (leaving the lab). */
  public stopAllLoops() {
    this.loops.forEach((l) => l.stop());
    this.loops.clear();
    this.setBubbles(0);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.loops.forEach((l) => l.gain.gain.setValueAtTime(0, this.ctx!.currentTime));
      this.setBubbles(0);
    }
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.isMuted ? 0 : 0.025;
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playFootstep() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 20, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, ctx.currentTime);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  public playClick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  public playLensTurretClick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Double mechanical click
    [0, 0.04].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 0 ? 900 : 1400, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + delay + 0.025);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime + delay);
      filter.Q.setValueAtTime(3, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.09, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.025);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.03);
    });
  }

  public playKnobTick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800 + Math.random() * 200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.015);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  }

  public playSwitchToggle(on: boolean) {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(on ? 600 : 400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(on ? 1200 : 200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  public playBurnerIgnite() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Spark pop
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start();
  }

  public playDropLiquid() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  public playBeep() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.11);
  }

  public playSuccessChime() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);

      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.07);
      osc.stop(ctx.currentTime + i * 0.07 + 0.35);
    });
  }

  public playSitDown() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  }

  public playStandUp() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(70, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.21);
  }

  public playGlassSlide() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(3200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  public playCentrifugeSpin() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.3);
  }

  public startLabAmbience() {
    // Disabled continuous ambient drone per user preference
    this.isAmbientPlaying = false;
  }

  public stopLabAmbience() {
    if (this.ambientOsc1) {
      try { this.ambientOsc1.stop(); } catch { /* ignore */ }
      this.ambientOsc1 = null;
    }
    if (this.ambientOsc2) {
      try { this.ambientOsc2.stop(); } catch { /* ignore */ }
      this.ambientOsc2 = null;
    }
    this.isAmbientPlaying = false;
  }
}

export const soundFx = new SoundEffectsManager();
