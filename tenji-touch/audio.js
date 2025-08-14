class AudioFeedback {
    constructor() {
        this.synth = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            await Tone.start();
            this.synth = new Tone.Synth().toDestination();
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }

    async playGestureSound(gesture) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.synth) return;

        const tones = {
            'SLIDE_UP': 'C4',
            'SLIDE_RIGHT': 'E4', 
            'SLIDE_DOWN': 'G4',
            'SLIDE_LEFT': 'B4',
            'TAP': 'C5'
        };

        const note = tones[gesture];
        if (note) {
            this.synth.triggerAttackRelease(note, '0.1s');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.audioFeedback = new AudioFeedback();
});