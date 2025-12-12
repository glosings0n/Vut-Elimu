// Simple synth using Web Audio API to avoid external dependencies and ensure offline functionality
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let isLocked = false;

function getContext() {
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

export const soundService = {
  setSoundEnabled: (enabled: boolean) => {
    if (isLocked) {
        soundEnabled = false;
        return;
    }
    soundEnabled = enabled;
  },

  setLocked: (locked: boolean) => {
      isLocked = locked;
      if (locked) soundEnabled = false;
  },

  isLocked: () => isLocked,

  playClick: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  },

  playCorrect: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      // Success Arpeggio (C Major)
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
        
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.3);
      });
    } catch (e) {
      console.error("Audio play failed", e);
    }
  },

  playIncorrect: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      // Error Buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  },

  playWin: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      const now = ctx.currentTime;
      // Victory Fanfare (Trumpet-ish square waves)
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
      const times = [0, 0.15, 0.3, 0.45, 0.6, 0.8];
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'square';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0.05, now + times[i]);
        gain.gain.exponentialRampToValueAtTime(0.001, now + times[i] + 0.3);
        
        osc.start(now + times[i]);
        osc.stop(now + times[i] + 0.3);
      });
    } catch (e) {
      console.error("Audio play failed", e);
    }
  },

  playLose: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      // Sad Trombone slide
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 1.5); // Slide down
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }
};