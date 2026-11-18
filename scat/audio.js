// Scat! — Retro Web Audio Sound Effects & Cozy Chiptune Music
class ScatAudio {
    constructor() {
        this.ctx = null;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.isPlayingMusic = false;
        this.musicTimer = null;
        this.stepIndex = 0;
        this.isNight = false;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setNightMode(isNight) {
        this.isNight = isNight;
    }

    toggleMusic(enabled) {
        this.musicEnabled = enabled;
        if (enabled) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
    }

    toggleSfx(enabled) {
        this.sfxEnabled = enabled;
    }

    startMusic() {
        this.init();
        if (!this.ctx || !this.musicEnabled || this.isPlayingMusic) return;
        this.isPlayingMusic = true;

        // Cozy relaxing retro chord/melody loop
        const dayNotes = [
            { m: 523.25, b: 261.63 }, // C5, C4
            { m: 659.25, b: 0 },      // E5
            { m: 587.33, b: 392.00 }, // D5, G4
            { m: 523.25, b: 0 },      // C5
            { m: 440.00, b: 220.00 }, // A4, A3
            { m: 523.25, b: 0 },      // C5
            { m: 493.88, b: 329.63 }, // B4, E4
            { m: 392.00, b: 0 },      // G4
            { m: 349.23, b: 174.61 }, // F4, F3
            { m: 440.00, b: 0 },      // A4
            { m: 523.25, b: 261.63 }, // C5, C4
            { m: 659.25, b: 0 },      // E5
            { m: 587.33, b: 293.66 }, // D5, D4
            { m: 493.88, b: 0 },      // B4
            { m: 523.25, b: 196.00 }, // C5, G3
            { m: 0,      b: 261.63 }  // rest, C4
        ];

        const nightNotes = [
            { m: 440.00, b: 220.00 }, // A4
            { m: 523.25, b: 0 },      // C5
            { m: 659.25, b: 329.63 }, // E5
            { m: 587.33, b: 0 },      // D5
            { m: 523.25, b: 261.63 }, // C5
            { m: 493.88, b: 0 },      // B4
            { m: 440.00, b: 196.00 }, // A4
            { m: 392.00, b: 0 },      // G4
            { m: 349.23, b: 174.61 }, // F4
            { m: 440.00, b: 0 },      // A4
            { m: 523.25, b: 261.63 }, // C5
            { m: 493.88, b: 0 },      // B4
            { m: 440.00, b: 220.00 }, // A4
            { m: 329.63, b: 0 },      // E4
            { m: 440.00, b: 220.00 }, // A4
            { m: 0,      b: 164.81 }  // E3
        ];

        const tick = () => {
            if (!this.isPlayingMusic || !this.musicEnabled) return;
            if (this.ctx.state === 'running') {
                const seq = this.isNight ? nightNotes : dayNotes;
                const step = seq[this.stepIndex % seq.length];
                const now = this.ctx.currentTime;

                if (step.m > 0) {
                    this.playTone(step.m, this.isNight ? 'sine' : 'triangle', 0.28, 0.035, now);
                }
                if (step.b > 0) {
                    this.playTone(step.b, 'sine', 0.42, 0.03, now);
                }
                this.stepIndex++;
            }
            const tempoMs = this.isNight ? 360 : 420;
            this.musicTimer = setTimeout(tick, tempoMs);
        };

        tick();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    playTone(freq, type, duration, gainVal, startTime) {
        if (!this.ctx) return;
        const t = startTime || this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(gainVal, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }

    // Happy soft cat meow
    playHappyMeow(pitchOffset = 1.0) {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520 * pitchOffset, now);
        osc.frequency.exponentialRampToValueAtTime(780 * pitchOffset, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(480 * pitchOffset, now + 0.34);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.11, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
    }

    // LOUD startled cat meow when Mom steps on a tail!
    playTailStepMeow() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Dual oscillator dramatic "MREEEOOOWW!!"
        [1, 1.03].forEach((detune) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(420 * detune, now);
            osc.frequency.exponentialRampToValueAtTime(1180 * detune, now + 0.14);
            osc.frequency.setValueAtTime(1120 * detune, now + 0.22);
            osc.frequency.exponentialRampToValueAtTime(540 * detune, now + 0.58);

            // Low-pass filter so it sounds like a retro cat yowl, not harsh static
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(950, now);
            filter.Q.setValueAtTime(2.5, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
            gain.gain.setValueAtTime(0.16, now + 0.28);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.64);
        });
    }

    // Pouring kibble into bowls
    playFeedSound() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [330, 440, 523.25, 659.25, 783.99];
        notes.forEach((n, i) => {
            this.playTone(n, 'triangle', 0.1, 0.08, now + i * 0.055);
        });
    }

    // Scooping litter box clean
    playScoopSound() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Little sweeping arpeggio + sparkle chime
        const notes = [293.66, 369.99, 440, 587.33, 880];
        notes.forEach((n, i) => {
            this.playTone(n, 'sine', 0.13, 0.09, now + i * 0.06);
        });
    }

    // Playing / Feather wand swish + purr chime
    playToySound() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((n, i) => {
            this.playTone(n, 'triangle', 0.12, 0.08, now + i * 0.05);
        });
    }

    // Gentle purr sound
    playPurrSound() {
        if (!this.sfxEnabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        for (let i = 0; i < 6; i++) {
            this.playTone(95 + (i % 2) * 12, 'triangle', 0.07, 0.06, now + i * 0.06);
        }
    }
}

window.scatAudio = new ScatAudio();
