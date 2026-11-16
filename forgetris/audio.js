(() => {
    const NOTE_FREQ = {
        E2: 82.41, A2: 110.00, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81,
        "G#2": 103.83, "G#3": 207.65,
        A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
        "G#4": 415.30, A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33,
        E5: 659.25, F5: 698.46, G5: 783.99, "G#5": 830.61, A5: 880.00
    };

    // Korobeiniki-inspired 8-bit loop: [melodyNote, bassNote, beats]
    const SEQUENCE = [
        // Part A1
        ["E5", "E3", 1], ["B4", "E2", 0.5], ["C5", "E3", 0.5], ["D5", "E2", 1], ["C5", "E3", 0.5], ["B4", "E2", 0.5],
        ["A4", "A2", 1], ["A4", "A3", 0.5], ["C5", "A2", 0.5], ["E5", "A3", 1], ["D5", "A2", 0.5], ["C5", "A3", 0.5],
        ["B4", "G#2", 1.5], ["C5", "E3", 0.5], ["D5", "E2", 1], ["E5", "E3", 1],
        ["C5", "A2", 1], ["A4", "A3", 1], ["A4", "A2", 2],
        // Part A2
        [null, "D3", 0.5], ["D5", "D3", 1], ["F5", "A3", 0.5], ["A5", "D3", 1], ["G5", "A3", 0.5], ["F5", "D3", 0.5],
        ["E5", "C3", 1.5], ["C5", "G3", 0.5], ["E5", "C3", 1], ["D5", "C3", 0.5], ["C5", "C3", 0.5],
        ["B4", "B2", 1], ["B4", "E3", 0.5], ["C5", "E2", 0.5], ["D5", "E3", 1], ["E5", "E2", 1],
        ["C5", "A2", 1], ["A4", "A3", 1], ["A4", "A2", 2],
        // Part B
        ["E5", "A2", 2], ["C5", "E3", 2],
        ["D5", "G#2", 2], ["B4", "E3", 2],
        ["C5", "A2", 2], ["A4", "E3", 2],
        ["G#4", "E2", 2], ["B4", "E3", 1], [null, "E2", 1],
        ["E5", "A2", 2], ["C5", "E3", 2],
        ["D5", "G#2", 2], ["B4", "E3", 2],
        ["C5", "A2", 1], ["E5", "A3", 1], ["A5", "A2", 2],
        ["G#5", "E2", 3], [null, "E3", 1]
    ];

    let audioCtx = null;
    let masterGain = null;
    let isPlaying = false;
    let enabled = true;
    let stepIndex = 0;
    let nextNoteTime = 0;
    let timerId = null;
    let tempoScale = 1;

    const BASE_BPM = 144;
    const LOOKAHEAD_MS = 40;
    const SCHEDULE_AHEAD_SEC = 0.14;

    function ensureContext() {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return false;
            audioCtx = new Ctx();
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.16;
            masterGain.connect(audioCtx.destination);
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        return true;
    }

    function playTone(freq, startTime, duration, type, volume) {
        if (!freq || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        const attack = 0.008;
        const release = Math.min(0.05, duration * 0.25);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(volume, startTime + attack);
        gain.gain.setValueAtTime(volume, Math.max(startTime + attack, startTime + duration - release));
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
    }

    function scheduler() {
        if (!isPlaying || !enabled || !audioCtx) return;
        const beatSec = 60 / (BASE_BPM * tempoScale);

        while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_SEC) {
            const [melody, bass, beats] = SEQUENCE[stepIndex];
            const dur = beats * beatSec;

            if (melody && NOTE_FREQ[melody]) {
                playTone(NOTE_FREQ[melody], nextNoteTime, dur * 0.9, "square", 0.35);
            }
            if (bass && NOTE_FREQ[bass]) {
                playTone(NOTE_FREQ[bass], nextNoteTime, dur * 0.92, "triangle", 0.45);
            }

            nextNoteTime += dur;
            stepIndex = (stepIndex + 1) % SEQUENCE.length;
        }
    }

    window.ForgetrisAudio = {
        setEnabled(val) {
            enabled = Boolean(val);
            if (!enabled) {
                this.pause();
            }
        },
        setLevel(level) {
            tempoScale = Math.min(1.35, 1 + (Math.max(1, level) - 1) * 0.03);
        },
        start(reset = false) {
            if (reset) stepIndex = 0;
            if (!enabled || isPlaying) return;
            if (!ensureContext()) return;
            isPlaying = true;
            nextNoteTime = audioCtx.currentTime + 0.05;
            timerId = setInterval(scheduler, LOOKAHEAD_MS);
        },
        pause() {
            isPlaying = false;
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
        },
        stop() {
            this.pause();
            stepIndex = 0;
        }
    };
})();
