// ============================================================
// Synthesized sound cues via Web Audio API — no asset files.
// Terminal "blips" for clicks, raises, challenges, win/lose, etc.
// Respects a persisted mute toggle.
// ============================================================

let ctx = null;
let muted = localStorage.getItem('lp_muted') === '1';

const getCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

const tone = (freq, dur, { type = 'sine', gain = 0.06, delay = 0, sweep = 0 } = {}) => {
  const ac = getCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + sweep), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
};

export const sounds = {
  click:  () => tone(520, 0.06, { type: 'square', gain: 0.04 }),
  tick:   () => tone(880, 0.04, { type: 'square', gain: 0.025 }),
  join:   () => { tone(440, 0.08, { type: 'triangle' }); tone(660, 0.1, { type: 'triangle', delay: 0.07 }); },
  bet:    () => { tone(330, 0.07, { type: 'sawtooth', gain: 0.05 }); tone(495, 0.09, { type: 'sawtooth', gain: 0.05, delay: 0.06 }); },
  raise:  () => { tone(392, 0.07, { type: 'square', gain: 0.045 }); tone(587, 0.1, { type: 'square', gain: 0.045, delay: 0.06 }); },
  challenge: () => { tone(180, 0.18, { type: 'sawtooth', gain: 0.07, sweep: -80 }); tone(120, 0.22, { type: 'sawtooth', gain: 0.05, delay: 0.05 }); },
  reveal: () => { tone(220, 0.05, { type: 'square', gain: 0.04 }); tone(220, 0.05, { type: 'square', gain: 0.04, delay: 0.12 }); tone(220, 0.05, { type: 'square', gain: 0.04, delay: 0.24 }); },
  win:    () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'triangle', gain: 0.07, delay: i * 0.1 })); },
  lose:   () => { [392, 311, 233].forEach((f, i) => tone(f, 0.22, { type: 'sawtooth', gain: 0.06, delay: i * 0.13 })); },
  error:  () => tone(160, 0.18, { type: 'square', gain: 0.05, sweep: -40 }),
};

export const isMuted = () => muted;

export const toggleMute = () => {
  muted = !muted;
  localStorage.setItem('lp_muted', muted ? '1' : '0');
  if (!muted) sounds.click();
  return muted;
};
